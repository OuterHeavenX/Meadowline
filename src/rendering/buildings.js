import { P, TAU, TH, TW, clamp, hash2, shade } from '../core/constants.js';
import { S, reduceMotion } from '../core/state.js';
import { box, diamond, drawTree, g, lights, snowCap } from './terrain.js';
import { PAL } from '../world/seasons.js';
import { activeFestival, festivalGlow } from '../world/festivals.js';


// a soft contact shadow so a building sits on the ground instead of floating
export function groundShadow(sx,sy,rx,ry,alpha){
  const sun=Math.sin((S.dayT||0)*TAU),z=S.cam.z,off=Math.max(-5,Math.min(5,sun*4))*z;
  g.fillStyle="rgba(25,40,34,"+(alpha||0.18)+")";
  g.beginPath(); g.ellipse(sx+off,sy+2*z,rx*1.08,ry,off*.025,0,TAU); g.fill();
}

export function drawHouse(b,p,dark){
  const z=S.cam.z, r=hash2(b.seed,1,3);
  groundShadow(p.x,p.y,17*z,8*z);
  const storeys=b.pop>=3?2:1;
  const hgt=(11+storeys*5+r*3);
  const wall=P.wall[(hash2(b.seed,2,4)*3)|0];
  const roof=P.roof[(hash2(b.seed,5,6)*P.roof.length)|0];
  const topY=box(p.x,p.y,0.62,hgt,shade(wall,6),shade(wall,-34),shade(wall,-14));
  // gable roof
  const hw=TW/2*0.62*z, hh=TH/2*0.62*z, peak=(7+r*3)*z;
  g.fillStyle=shade(roof,-18);
  g.beginPath();
  g.moveTo(p.x-hw,topY); g.lineTo(p.x,topY+hh); g.lineTo(p.x,topY+hh-peak*0.5); g.lineTo(p.x-hw,topY-peak);
  g.closePath(); g.fill();
  g.fillStyle=roof;
  g.beginPath();
  g.moveTo(p.x+hw,topY); g.lineTo(p.x,topY+hh); g.lineTo(p.x,topY+hh-peak*0.5); g.lineTo(p.x+hw,topY-peak);
  g.closePath(); g.fill();
  g.fillStyle=shade(roof,14);
  g.beginPath();
  g.moveTo(p.x,topY-hh); g.lineTo(p.x+hw,topY-peak); g.lineTo(p.x,topY+hh-peak*0.5); g.lineTo(p.x-hw,topY-peak);
  g.closePath(); g.fill();
  if(PAL.snow>0.03){
    g.fillStyle="rgba(250,252,255,"+(PAL.snow*0.82)+")";
    g.beginPath();
    g.moveTo(p.x,topY-hh); g.lineTo(p.x+hw,topY-peak); g.lineTo(p.x,topY+hh-peak*0.5); g.lineTo(p.x-hw,topY-peak);
    g.closePath(); g.fill();
  }
  // windows / door
  const lit=b.pop>0;
  const wy=p.y-hgt*z*0.52;
  g.fillStyle=lit?"rgba(90,110,120,.55)":"rgba(70,86,92,.42)";
  g.fillRect(p.x-hw*0.62,wy,3.4*z,4.2*z);
  g.fillRect(p.x+hw*0.30,wy,3.4*z,4.2*z);
  if(lit&&dark>0.12){
    lights.push({x:p.x-hw*0.62,y:wy,w:3.4*z,h:4.2*z});
    lights.push({x:p.x+hw*0.30,y:wy,w:3.4*z,h:4.2*z});
  }
  // chimney smoke on cold or dark evenings, once someone is home to light a fire
  if(lit){
    const cold=Math.max(PAL.snow||0, dark>0.35?1:0);
    if(cold>0.05){
      const cx=p.x+hw*0.42, cy=topY-peak*0.45;
      g.fillStyle=shade(roof,-30);
      g.fillRect(cx-1.5*z,cy-5*z,3*z,5.5*z);
      for(let i=0;i<3;i++){
        const t=((S.t*0.5+i*0.33+(b.seed%10)/10)%1);
        const a=(1-t)*0.30*cold;
        if(a<=0.01) continue;
        g.fillStyle="rgba(226,228,224,"+a.toFixed(3)+")";
        g.beginPath();
        g.arc(cx+Math.sin(t*3+b.seed)*3*z, cy-5*z-t*16*z, (1.6+t*3.4)*z, 0, TAU);
        g.fill();
      }
    }
  }

  // a pennant on the ridge for the day of the festival
  const fest=activeFestival();
  if(fest){
    const gl=festivalGlow();
    const fy=topY-peak-2*z, fx=p.x;
    g.strokeStyle="rgba(70,60,50,.8)"; g.lineWidth=0.9*z;
    g.beginPath(); g.moveTo(fx,fy); g.lineTo(fx,fy-9*z); g.stroke();
    g.fillStyle=fest.flag; g.globalAlpha=Math.max(0.35,gl);
    const wave=Math.sin(S.t*3+b.seed)*1.6*z;
    g.beginPath();
    g.moveTo(fx,fy-9*z); g.lineTo(fx+7*z,fy-6.5*z+wave); g.lineTo(fx,fy-4.5*z);
    g.closePath(); g.fill();
    g.globalAlpha=1;
  }

  // unconnected marker
  if(!b.linked){
    const yy=p.y-(hgt+peak/z+13)*z+Math.sin(S.t*2.4+b.seed%7)*2*z;
    g.fillStyle="rgba(29,43,38,.85)";
    g.beginPath(); g.arc(p.x,yy,7*z,0,TAU); g.fill();
    g.fillStyle=P.warm;
    g.fillRect(p.x-0.9*z,yy-4*z,1.8*z,5*z);
    g.fillRect(p.x-0.9*z,yy+2.2*z,1.8*z,1.8*z);
  }
}

export function drawCafe(b,p,dark){
  const z=S.cam.z;
  groundShadow(p.x,p.y,18*z,8*z);
  const topY=box(p.x,p.y,0.66,13,"#f0e7d4","#c9b294","#ddcbaa");
  snowCap(p.x,topY,0.66);
  const hw=TW/2*0.66*z;
  // striped awning
  for(let i=0;i<5;i++){
    g.fillStyle=i%2?"#d3897c":"#f4ece0";
    g.fillRect(p.x-hw+ i*(hw*2/5), p.y-9*z, hw*2/5, 3.4*z);
  }
  // little umbrella table out front
  g.fillStyle="#8d7a5f";
  g.fillRect(p.x+hw*0.5,p.y-1*z,1.3*z,5*z);
  g.fillStyle="#e0b45a";
  g.beginPath();
  g.moveTo(p.x+hw*0.55-6*z,p.y-1*z); g.lineTo(p.x+hw*0.55+6*z,p.y-1*z); g.lineTo(p.x+hw*0.55,p.y-7*z);
  g.closePath(); g.fill();
  g.fillStyle="rgba(120,140,150,.5)";
  g.fillRect(p.x-hw*0.5,topY+6*z,5*z,5*z);
  if(dark>0.12) lights.push({x:p.x-hw*0.5,y:topY+6*z,w:5*z,h:5*z});
}

export function drawPark(b,p){
  const z=S.cam.z;
  diamond(p.x,p.y,0.98); g.fillStyle=P.parkGrass; g.fill();
  g.strokeStyle=P.path; g.lineWidth=3*z;
  g.beginPath(); g.moveTo(p.x-14*z,p.y+1*z); g.lineTo(p.x+14*z,p.y-1*z); g.stroke();
  // bench
  g.fillStyle="#9a7d59";
  g.fillRect(p.x-3*z,p.y+4*z,6*z,1.6*z);
  g.fillRect(p.x-3*z,p.y+2.4*z,6*z,1.2*z);
  const r=hash2(b.seed,4,8);
  drawTree(p.x-9*z,p.y-3*z,b.seed+1,0.82);
  drawTree(p.x+8*z,p.y+3*z,b.seed+2,r>0.5?0.95:0.7);
  // flowers
  for(let i=0;i<5;i++){
    const a=hash2(b.seed,i,12)*TAU;
    g.fillStyle=["#e56f8a","#efc75e","#e9e5d6"][i%3];
    g.beginPath(); g.arc(p.x+Math.cos(a)*11*z,p.y+Math.sin(a)*5*z+3*z,1.3*z,0,TAU); g.fill();
  }
}

export function drawLamp(b,p,dark){
  const z=S.cam.z;
  g.fillStyle="rgba(30,50,30,.16)";
  g.beginPath(); g.ellipse(p.x,p.y+1*z,4*z,2*z,0,0,TAU); g.fill();
  g.fillStyle="#4d5c54";
  g.fillRect(p.x-0.9*z,p.y-16*z,1.8*z,16*z);
  g.fillStyle="#3f4c45";
  g.beginPath();
  g.moveTo(p.x-3.4*z,p.y-17.6*z); g.lineTo(p.x+3.4*z,p.y-17.6*z);
  g.lineTo(p.x+2.1*z,p.y-21*z);  g.lineTo(p.x-2.1*z,p.y-21*z);
  g.closePath(); g.fill();
  const lit=clamp(dark/0.24,0,1);
  g.fillStyle=lit>0.05?"#ffdd9f":"rgba(206,216,208,.8)";
  g.fillRect(p.x-2.2*z,p.y-17.4*z,4.4*z,2.8*z);
  if(lit>0.05) lights.push({x:p.x-2.2*z,y:p.y-17.4*z,w:4.4*z,h:2.8*z,big:true});
}

export function drawWindmill(b,p,dark){
  const z=S.cam.z;
  groundShadow(p.x,p.y,13*z,6*z);
  const topY=box(p.x,p.y,0.46,27,"#efe6d3","#bcac8b","#dbcdac");
  snowCap(p.x,topY,0.46);
  const hw=TW/2*0.46*z;
  g.fillStyle="#8b5f4c";
  g.beginPath();
  g.moveTo(p.x-hw,topY); g.lineTo(p.x+hw,topY); g.lineTo(p.x,topY-9*z);
  g.closePath(); g.fill();
  // sails, turning with the day
  const hy=topY-3.5*z;
  const a=S.t*(reduceMotion?0.1:0.55)+(b.seed%64)/10;
  g.save(); g.translate(p.x,hy);
  for(let k=0;k<4;k++){
    g.save(); g.rotate(a+k*TAU/4);
    g.fillStyle="#7a5c43"; g.fillRect(-0.8*z,-18*z,1.6*z,18*z);
    g.fillStyle="rgba(246,242,229,.93)"; g.fillRect(1.1*z,-17*z,4.8*z,12.5*z);
    g.restore();
  }
  g.restore();
  g.fillStyle="#6f5643";
  g.beginPath(); g.arc(p.x,hy,1.9*z,0,TAU); g.fill();
  g.fillStyle="rgba(120,140,150,.5)";
  g.fillRect(p.x-1.7*z,p.y-15*z,3.4*z,3.8*z);
  if(dark>0.12) lights.push({x:p.x-1.7*z,y:p.y-15*z,w:3.4*z,h:3.8*z});
}

export function drawStation(b,p,dark){
  const z=S.cam.z;
  groundShadow(p.x,p.y,21*z,9*z);
  const topY=box(p.x,p.y,0.78,10,"#e9dfc9","#a89577","#c6b493");
  const hw=TW/2*0.78*z, hh=TH/2*0.78*z;
  // overhanging roof
  g.fillStyle="#6f8fae";
  g.beginPath();
  g.moveTo(p.x,topY-hh-4*z); g.lineTo(p.x+hw+3*z,topY-4*z); g.lineTo(p.x,topY+hh-4*z); g.lineTo(p.x-hw-3*z,topY-4*z);
  g.closePath(); g.fill();
  g.fillStyle="#5d7b98";
  g.fillRect(p.x-hw-3*z,topY-4*z,(hw+3*z)*2,2*z);
  snowCap(p.x,topY-4*z,0.86);
  // platform clock, hung on the front wall
  const cy=p.y-6*z;
  g.fillStyle="#f4f0e2";
  g.beginPath(); g.arc(p.x,cy,3.4*z,0,TAU); g.fill();
  g.strokeStyle="#2b3d36"; g.lineWidth=1*z;
  g.beginPath(); g.moveTo(p.x,cy); g.lineTo(p.x,cy-2.4*z); g.stroke();
  g.beginPath(); g.moveTo(p.x,cy); g.lineTo(p.x+2*z,cy+0.4*z); g.stroke();
  // warm platform lamp
  g.fillStyle="rgba(150,160,150,.55)";
  g.fillRect(p.x-hw*0.55,p.y-7*z,4*z,5*z);
  if(dark>0.1) lights.push({x:p.x-hw*0.55,y:p.y-7*z,w:4*z,h:5*z,big:true});
}

/* ---------- market: an open awning over trestle tables ---------- */
export function drawMarket(b,p,dark){
  const z=S.cam.z;
  groundShadow(p.x,p.y,20*z,9*z);
  const hw=TW/2*0.82*z, hh=TH/2*0.82*z;
  // four posts
  g.fillStyle="#8d7a5f";
  for(const[ox,oy] of [[-1,0],[1,0],[0,-1],[0,1]])
    g.fillRect(p.x+ox*hw*0.8-0.9*z, p.y+oy*hh*0.8-11*z, 1.8*z, 11*z);
  // trestle tables with produce
  g.fillStyle="#b79a72";
  g.fillRect(p.x-hw*0.7,p.y-5*z,hw*1.4,2.4*z);
  for(let i=0;i<5;i++){
    g.fillStyle=["#d3897c","#e0b45a","#7fa887","#c273a8","#8fc4d6"][i%5];
    g.beginPath(); g.arc(p.x-hw*0.55+i*(hw*0.28), p.y-6.4*z, 1.5*z, 0, TAU); g.fill();
  }
  // striped canopy
  const ry=p.y-12*z;
  for(let i=0;i<6;i++){
    g.fillStyle=i%2?"#e5645c":"#f4ece0";
    g.beginPath();
    g.moveTo(p.x-hw+i*(hw*2/6), ry);
    g.lineTo(p.x-hw+(i+1)*(hw*2/6), ry);
    g.lineTo(p.x-hw+(i+1)*(hw*2/6), ry-3.4*z);
    g.lineTo(p.x-hw+i*(hw*2/6), ry-3.4*z);
    g.closePath(); g.fill();
  }
  g.fillStyle="#c9524b";
  g.beginPath();
  g.moveTo(p.x,ry-3.4*z-hh*0.5); g.lineTo(p.x+hw,ry-3.4*z); g.lineTo(p.x,ry-3.4*z+hh*0.5); g.lineTo(p.x-hw,ry-3.4*z);
  g.closePath(); g.fill();
  snowCap(p.x,ry-3.4*z,0.82);
  if(dark>0.12) lights.push({x:p.x-3*z,y:p.y-8*z,w:6*z,h:3*z,big:true});
}

/* ---------- bakery: a squat oven house with a hot mouth ---------- */
export function drawBakery(b,p,dark){
  const z=S.cam.z;
  groundShadow(p.x,p.y,17*z,8*z);
  const topY=box(p.x,p.y,0.6,12,"#f0e5cf","#c2a883","#dcc9a4");
  snowCap(p.x,topY,0.6);
  const hw=TW/2*0.6*z;
  // chimney, always going
  g.fillStyle="#b08a63";
  g.fillRect(p.x+hw*0.45,topY-7*z,3*z,7*z);
  for(let i=0;i<3;i++){
    const t=((S.t*0.42+i*0.34+(b.seed%9)/9)%1);
    g.fillStyle="rgba(232,228,220,"+((1-t)*0.34).toFixed(3)+")";
    g.beginPath();
    g.arc(p.x+hw*0.45+1.5*z+Math.sin(t*3+b.seed)*3*z, topY-7*z-t*15*z, (1.5+t*3.2)*z, 0, TAU);
    g.fill();
  }
  // oven mouth glowing
  g.fillStyle="#5a3b2a";
  g.beginPath(); g.arc(p.x,p.y-5*z,3.4*z,Math.PI,0); g.fill();
  g.fillStyle="#ffb15e";
  g.beginPath(); g.arc(p.x,p.y-5*z,2.2*z,Math.PI,0); g.fill();
  lights.push({x:p.x-2.2*z,y:p.y-7*z,w:4.4*z,h:2.2*z});
  // awning of loaves on a shelf
  g.fillStyle="#c9a074";
  g.fillRect(p.x-hw*0.8,p.y-11*z,hw*1.6,1.6*z);
  for(let i=0;i<3;i++){
    g.fillStyle="#d9a463";
    g.beginPath(); g.ellipse(p.x-hw*0.5+i*hw*0.5,p.y-12.2*z,2.1*z,1.3*z,0,0,TAU); g.fill();
  }
}

/* ---------- school: a hall with a little bell tower ---------- */
export function drawSchool(b,p,dark){
  const z=S.cam.z;
  groundShadow(p.x,p.y,21*z,9*z);
  const topY=box(p.x,p.y,0.8,15,"#f2ecdc","#b9ac8c","#d8ccae");
  const hw=TW/2*0.8*z, hh=TH/2*0.8*z;
  // pitched roof
  g.fillStyle="#8a6f96";
  g.beginPath();
  g.moveTo(p.x,topY-hh); g.lineTo(p.x+hw,topY); g.lineTo(p.x,topY+hh); g.lineTo(p.x-hw,topY);
  g.closePath(); g.fill();
  snowCap(p.x,topY,0.8);
  // bell tower
  g.fillStyle="#e7dcc4";
  g.fillRect(p.x-2.6*z,topY-13*z,5.2*z,10*z);
  g.fillStyle="#7c6288";
  g.beginPath();
  g.moveTo(p.x-3.6*z,topY-13*z); g.lineTo(p.x+3.6*z,topY-13*z); g.lineTo(p.x,topY-19*z);
  g.closePath(); g.fill();
  g.fillStyle="#e0ae4e";
  g.beginPath(); g.arc(p.x,topY-10*z,1.5*z,0,TAU); g.fill();
  // windows in a row
  for(let i=0;i<3;i++){
    const wx=p.x-hw*0.55+i*hw*0.55;
    g.fillStyle="rgba(120,145,158,.6)";
    g.fillRect(wx-1.6*z,p.y-11*z,3.2*z,4.4*z);
    if(dark>0.12) lights.push({x:wx-1.6*z,y:p.y-11*z,w:3.2*z,h:4.4*z});
  }
}

/* ---------- dock: planks out over the water with a lamp on the post ------- */
export function drawDock(b,p,dark){
  const z=S.cam.z;
  groundShadow(p.x,p.y,16*z,7*z);
  const hw=TW/2*z, hh=TH/2*z;
  // decking
  g.fillStyle="#a98d68";
  diamond(p.x,p.y-2*z,0.94); g.fill();
  g.strokeStyle="#8d7350"; g.lineWidth=0.9*z;
  for(let i=-2;i<=2;i++){
    g.beginPath();
    g.moveTo(p.x-hw*0.9+i*hw*0.3, p.y-2*z+hh*0.5);
    g.lineTo(p.x+i*hw*0.3, p.y-2*z-hh*0.45);
    g.stroke();
  }
  // mooring posts
  g.fillStyle="#7a6446";
  g.fillRect(p.x-hw*0.62,p.y-9*z,2.2*z,8*z);
  g.fillRect(p.x+hw*0.42,p.y-7*z,2.2*z,6*z);
  // a coil of rope and a crate
  g.strokeStyle="#c8b088"; g.lineWidth=1.1*z;
  g.beginPath(); g.arc(p.x+hw*0.1,p.y-2*z,2.4*z,0,TAU); g.stroke();
  g.fillStyle="#b08f63";
  g.fillRect(p.x-hw*0.15,p.y-7.5*z,5*z,4.6*z);
  // lamp on the tall post
  const lit=clamp(dark/0.24,0,1);
  g.fillStyle=lit>0.05?"#ffdd9f":"rgba(206,216,208,.8)";
  g.fillRect(p.x-hw*0.62-0.8*z,p.y-12*z,3.8*z,3*z);
  if(lit>0.05) lights.push({x:p.x-hw*0.62-0.8*z,y:p.y-12*z,w:3.8*z,h:3*z,big:true});
}
