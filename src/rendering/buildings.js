import { P, TAU, TH, TW, clamp, hash2, shade } from '../core/constants.js';
import { S, reduceMotion } from '../core/state.js';
import { box, diamond, drawTree, g, lights, snowCap } from './terrain.js';
import { PAL } from '../world/seasons.js';
import { proj } from '../world/map.js';
import { drawSprite, houseSprite } from './sprites.js';
import { activeFestival, festivalGlow } from '../world/festivals.js';


// a soft contact shadow so a building sits on the ground instead of floating
export function groundShadow(sx,sy,rx,ry,alpha){
  g.fillStyle="rgba(30,50,40,"+(alpha||0.16)+")";
  g.beginPath(); g.ellipse(sx,sy+1*S.cam.z,rx,ry,0,0,TAU); g.fill();
}


/* The parts of a house that move or change: smoke when a fire is lit, a
   festival pennant, and the marker for a home no road has reached yet. Offsets
   are relative to the tile centre so they sit correctly on the rendered sprite. */
export function houseExtras(b,p,dark,z){
  const lit=b.pop>0;
  if(lit){
    const cold=Math.max(PAL.snow||0, dark>0.35?1:0);
    if(cold>0.05){
      for(let i=0;i<3;i++){
        const t=((S.t*0.5+i*0.33+(b.seed%10)/10)%1);
        const a=(1-t)*0.30*cold;
        if(a<=0.01) continue;
        g.fillStyle="rgba(226,228,224,"+a.toFixed(3)+")";
        g.beginPath();
        g.arc(p.x+13*z+Math.sin(t*3+b.seed)*3*z, p.y-40*z-t*16*z, (1.6+t*3.4)*z, 0, TAU);
        g.fill();
      }
    }
  }
  const fest=activeFestival();
  if(fest){
    const gl=festivalGlow(), fy=p.y-40*z;
    g.strokeStyle="rgba(70,60,50,.8)"; g.lineWidth=0.9*z;
    g.beginPath(); g.moveTo(p.x,fy); g.lineTo(p.x,fy-9*z); g.stroke();
    g.fillStyle=fest.flag; g.globalAlpha=Math.max(0.35,gl);
    const wave=Math.sin(S.t*3+b.seed)*1.6*z;
    g.beginPath();
    g.moveTo(p.x,fy-9*z); g.lineTo(p.x+7*z,fy-6.5*z+wave); g.lineTo(p.x,fy-4.5*z);
    g.closePath(); g.fill();
    g.globalAlpha=1;
  }
  if(!b.linked){
    const yy=p.y-52*z+Math.sin(S.t*2.4+b.seed%7)*2*z;
    g.fillStyle="rgba(29,43,38,.85)";
    g.beginPath(); g.arc(p.x,yy,7*z,0,TAU); g.fill();
    g.fillStyle=P.warm;
    g.fillRect(p.x-0.9*z,yy-4*z,1.8*z,5*z);
    g.fillRect(p.x-0.9*z,yy+2.2*z,1.8*z,1.8*z);
  }
}

export function drawHouse(b,p,dark){
  const z=S.cam.z, r=hash2(b.seed,1,3);
  groundShadow(p.x,p.y,17*z,8*z);
  if(drawSprite(houseSprite(b),p,dark)){
    houseExtras(b,p,dark,z);
    return;
  }
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
  groundShadow(p.x,p.y,18*S.cam.z,8*S.cam.z);
  if(drawSprite("cafe",p,dark===undefined?0:dark)) return;
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
  groundShadow(p.x,p.y,18*S.cam.z,8*S.cam.z);
  if(drawSprite("mill",p,dark)){
    // the sails keep turning over the rendered tower
    const z=S.cam.z, hy=p.y-46*z;
    const a=S.t*(reduceMotion?0.1:0.55)+(b.seed%64)/10;
    g.save(); g.translate(p.x,hy);
    for(let k=0;k<4;k++){
      g.save(); g.rotate(a+k*TAU/4);
      g.fillStyle="#7a5c43"; g.fillRect(-0.8*z,-20*z,1.6*z,20*z);
      g.fillStyle=PAL.snow>0.5?"rgba(246,249,251,.95)":"rgba(246,242,229,.93)";
      g.fillRect(1.1*z,-19*z,5.2*z,13.5*z);
      g.restore();
    }
    g.restore();
    return;
  }
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
  groundShadow(p.x,p.y,18*S.cam.z,8*S.cam.z);
  if(drawSprite("station",p,dark===undefined?0:dark)) return;
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
  groundShadow(p.x,p.y,18*S.cam.z,8*S.cam.z);
  if(drawSprite("market",p,dark===undefined?0:dark)) return;
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
  groundShadow(p.x,p.y,18*S.cam.z,8*S.cam.z);
  if(drawSprite("bakery",p,dark)){
    // the oven never stops
    const z=S.cam.z;
    for(let i=0;i<3;i++){
      const t=((S.t*0.42+i*0.34+(b.seed%9)/9)%1);
      g.fillStyle="rgba(232,228,220,"+((1-t)*0.34).toFixed(3)+")";
      g.beginPath(); g.arc(p.x+11*z+Math.sin(t*3+b.seed)*3*z,p.y-34*z-t*15*z,(1.5+t*3.2)*z,0,TAU); g.fill();
    }
    return;
  }
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
  groundShadow(p.x,p.y,18*S.cam.z,8*S.cam.z);
  if(drawSprite("school",p,dark===undefined?0:dark)) return;
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
  groundShadow(p.x,p.y,18*S.cam.z,8*S.cam.z);
  if(drawSprite("dock",p,dark===undefined?0:dark)) return;
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

/* ---------- farm: a barn with its fields ---------- */
export function drawFarm(b,p,dark){
  groundShadow(p.x,p.y,18*S.cam.z,8*S.cam.z);
  if(drawSprite("farm",p,dark===undefined?0:dark)) return;
  const z=S.cam.z;
  groundShadow(p.x,p.y,18*z,8*z);
  // ploughed rows on the tile itself
  diamond(p.x,p.y,0.98); g.fillStyle=PAL.snow>0.4?"#d8dcd4":"#a98b5f"; g.fill();
  g.strokeStyle=PAL.snow>0.4?"#c6ccc4":"#8e7048"; g.lineWidth=1*z;
  for(let i=-2;i<=2;i++){
    const a=proj(b.x-0.45+i*0.18,b.y-0.45), c2=proj(b.x+0.45+i*0.18,b.y+0.45);
    g.beginPath(); g.moveTo(a.x,a.y); g.lineTo(c2.x,c2.y); g.stroke();
  }
  const topY=box(p.x-6*z,p.y-2*z,0.44,13,"#c2624f","#8d4436","#a95443");
  const hw=TW/2*0.44*z, hh=TH/2*0.44*z;
  g.fillStyle="#e9dfc9";                                   // pale barn roof
  g.beginPath();
  g.moveTo(p.x-6*z,topY-hh); g.lineTo(p.x-6*z+hw,topY); g.lineTo(p.x-6*z,topY+hh); g.lineTo(p.x-6*z-hw,topY);
  g.closePath(); g.fill();
  snowCap(p.x-6*z,topY,0.44);
  g.fillStyle="#5a3b2a"; g.fillRect(p.x-7.5*z,p.y-8*z,3*z,5*z);
  // stooks of grain
  for(let i=0;i<3;i++){
    g.fillStyle=PAL.snow>0.4?"#e8ece4":"#d9b455";
    g.beginPath();
    g.moveTo(p.x+4*z+i*4*z,p.y+1*z); g.lineTo(p.x+6*z+i*4*z,p.y+1*z); g.lineTo(p.x+5*z+i*4*z,p.y-6*z);
    g.closePath(); g.fill();
  }
  if(dark>0.12) lights.push({x:p.x-7.5*z,y:p.y-8*z,w:3*z,h:3*z});
}

/* ---------- sawmill: an open shed, a blade and a log pile ---------- */
export function drawSawmill(b,p,dark){
  groundShadow(p.x,p.y,18*S.cam.z,8*S.cam.z);
  if(drawSprite("sawmill",p,dark)){
    // the blade keeps spinning
    const z=S.cam.z, bx=p.x+17*z, by=p.y-19*z, br=4.6*z;
    g.save(); g.translate(bx,by); g.rotate(reduceMotion?0:S.t*2.2);
    g.fillStyle="#b9c2c9"; g.beginPath(); g.arc(0,0,br,0,TAU); g.fill();
    g.strokeStyle="#7f8b93"; g.lineWidth=0.9*z;
    for(let i=0;i<8;i++){ const q=i*TAU/8; g.beginPath();
      g.moveTo(Math.cos(q)*br*0.55,Math.sin(q)*br*0.55); g.lineTo(Math.cos(q)*br,Math.sin(q)*br); g.stroke(); }
    g.restore();
    return;
  }
  const z=S.cam.z;
  groundShadow(p.x,p.y,18*z,8*z);
  const topY=box(p.x,p.y,0.66,12,"#c9ae84","#8f7550","#ad9267");
  const hw=TW/2*0.66*z, hh=TH/2*0.66*z;
  g.fillStyle="#6f6157";
  g.beginPath();
  g.moveTo(p.x,topY-hh); g.lineTo(p.x+hw,topY); g.lineTo(p.x,topY+hh); g.lineTo(p.x-hw,topY);
  g.closePath(); g.fill();
  snowCap(p.x,topY,0.66);
  // circular blade, turning
  const bx=p.x-hw*0.5, by=p.y-7*z, br=4.2*z;
  g.save(); g.translate(bx,by); g.rotate(reduceMotion?0:S.t*2.2);
  g.fillStyle="#b9c2c9"; g.beginPath(); g.arc(0,0,br,0,TAU); g.fill();
  g.strokeStyle="#7f8b93"; g.lineWidth=0.9*z;
  for(let i=0;i<8;i++){ const a=i*TAU/8; g.beginPath(); g.moveTo(Math.cos(a)*br*0.6,Math.sin(a)*br*0.6); g.lineTo(Math.cos(a)*br,Math.sin(a)*br); g.stroke(); }
  g.restore();
  // stacked logs
  for(let i=0;i<3;i++){
    g.fillStyle=i%2?"#8b6742":"#7a5a3a";
    g.beginPath(); g.ellipse(p.x+hw*0.45,p.y-2*z-i*3*z,3.2*z,1.8*z,0,0,TAU); g.fill();
  }
}

/* ---------- workshop: a working shed with a smoking flue ---------- */
export function drawWorkshop(b,p,dark){
  groundShadow(p.x,p.y,18*S.cam.z,8*S.cam.z);
  if(drawSprite("workshop",p,dark)){
    const z=S.cam.z;
    for(let i=0;i<2;i++){
      const t=((S.t*0.4+i*0.5+(b.seed%7)/7)%1);
      g.fillStyle="rgba(190,190,185,"+((1-t)*0.28).toFixed(3)+")";
      g.beginPath(); g.arc(p.x+13*z,p.y-36*z-t*13*z,(1.4+t*3)*z,0,TAU); g.fill();
    }
    return;
  }
  const z=S.cam.z;
  groundShadow(p.x,p.y,18*z,8*z);
  const topY=box(p.x,p.y,0.7,14,"#d9d2c4","#9d9484","#bcb3a1");
  const hw=TW/2*0.7*z;
  g.fillStyle="#6d7f86";                                   // corrugated roof
  g.beginPath();
  g.moveTo(p.x,topY-TH/2*0.7*z); g.lineTo(p.x+hw,topY); g.lineTo(p.x,topY+TH/2*0.7*z); g.lineTo(p.x-hw,topY);
  g.closePath(); g.fill();
  g.strokeStyle="#5b6b72"; g.lineWidth=0.7*z;
  for(let i=-2;i<=2;i++){ g.beginPath(); g.moveTo(p.x+i*hw*0.35,topY-TH/2*0.7*z*0.6); g.lineTo(p.x+i*hw*0.35+hw*0.5,topY+2*z); g.stroke(); }
  snowCap(p.x,topY,0.7);
  g.fillStyle="#8a7a66"; g.fillRect(p.x+hw*0.5,topY-8*z,2.6*z,8*z);
  for(let i=0;i<2;i++){
    const t=((S.t*0.4+i*0.5+(b.seed%7)/7)%1);
    g.fillStyle="rgba(190,190,185,"+((1-t)*0.28).toFixed(3)+")";
    g.beginPath(); g.arc(p.x+hw*0.5+1.3*z,topY-8*z-t*13*z,(1.4+t*3)*z,0,TAU); g.fill();
  }
  // lit doorway
  g.fillStyle=dark>0.2?"#ffb765":"rgba(90,110,120,.5)";
  g.fillRect(p.x-2*z,p.y-9*z,4.4*z,6*z);
  lights.push({x:p.x-2*z,y:p.y-9*z,w:4.4*z,h:6*z});
}

/* ---------- inn: two storeys and a hanging sign ---------- */
export function drawInn(b,p,dark){
  groundShadow(p.x,p.y,18*S.cam.z,8*S.cam.z);
  if(drawSprite("inn",p,dark===undefined?0:dark)) return;
  const z=S.cam.z;
  groundShadow(p.x,p.y,19*z,8*z);
  const topY=box(p.x,p.y,0.72,22,"#f0e7d6","#b09878","#d2c1a3");
  const hw=TW/2*0.72*z, hh=TH/2*0.72*z, peak=8*z;
  g.fillStyle="#8a5a4a";
  g.beginPath(); g.moveTo(p.x-hw,topY); g.lineTo(p.x,topY+hh); g.lineTo(p.x,topY+hh-peak*0.5); g.lineTo(p.x-hw,topY-peak); g.closePath(); g.fill();
  g.fillStyle="#9c6858";
  g.beginPath(); g.moveTo(p.x+hw,topY); g.lineTo(p.x,topY+hh); g.lineTo(p.x,topY+hh-peak*0.5); g.lineTo(p.x+hw,topY-peak); g.closePath(); g.fill();
  g.fillStyle="#ab7565";
  g.beginPath(); g.moveTo(p.x,topY-hh); g.lineTo(p.x+hw,topY-peak); g.lineTo(p.x,topY+hh-peak*0.5); g.lineTo(p.x-hw,topY-peak); g.closePath(); g.fill();
  if(PAL.snow>0.03){
    g.fillStyle="rgba(250,252,255,"+(PAL.snow*0.8)+")";
    g.beginPath(); g.moveTo(p.x,topY-hh); g.lineTo(p.x+hw,topY-peak); g.lineTo(p.x,topY+hh-peak*0.5); g.lineTo(p.x-hw,topY-peak); g.closePath(); g.fill();
  }
  // two rows of windows
  for(let row=0;row<2;row++) for(let i=0;i<2;i++){
    const wx=p.x-hw*0.5+i*hw*0.7, wy=p.y-(9+row*7)*z;
    g.fillStyle=dark>0.15?"#ffd28a":"rgba(120,145,158,.55)";
    g.fillRect(wx,wy,3.2*z,4*z);
    if(dark>0.12) lights.push({x:wx,y:wy,w:3.2*z,h:4*z});
  }
  // sign on a bracket
  g.strokeStyle="#5a4a3a"; g.lineWidth=0.9*z;
  g.beginPath(); g.moveTo(p.x+hw*0.75,p.y-16*z); g.lineTo(p.x+hw*1.15,p.y-16*z); g.stroke();
  g.fillStyle="#3f6f52";
  g.fillRect(p.x+hw*0.95,p.y-15.6*z,5*z,4*z);
  g.fillStyle="#e0ae4e";
  g.beginPath(); g.arc(p.x+hw*0.95+2.5*z,p.y-13.6*z,1.1*z,0,TAU); g.fill();
}

/* ---------- clinic: white walls, a green cross ---------- */
export function drawClinic(b,p,dark){
  groundShadow(p.x,p.y,18*S.cam.z,8*S.cam.z);
  if(drawSprite("clinic",p,dark===undefined?0:dark)) return;
  const z=S.cam.z;
  groundShadow(p.x,p.y,20*z,9*z);
  const topY=box(p.x,p.y,0.78,17,"#fbf7ee","#c3bfb2","#e4dfd2");
  snowCap(p.x,topY,0.78);
  const hw=TW/2*0.78*z;
  g.fillStyle="#dfe6e2";
  diamond(p.x,topY,0.78); g.fill();
  // cross on the front wall
  g.fillStyle="#5fa46f";
  g.fillRect(p.x-1.3*z,p.y-13*z,2.6*z,7.4*z);
  g.fillRect(p.x-3.7*z,p.y-10.6*z,7.4*z,2.6*z);
  for(let i=0;i<2;i++){
    const wx=p.x+(i?hw*0.42:-hw*0.66);
    g.fillStyle=dark>0.15?"#dff0ff":"rgba(120,145,158,.5)";
    g.fillRect(wx,p.y-8*z,3.4*z,4.2*z);
    if(dark>0.12) lights.push({x:wx,y:p.y-8*z,w:3.4*z,h:4.2*z});
  }
}

/* ---------- well: a stone ring under a little roof ---------- */
export function drawWell(b,p,dark){
  groundShadow(p.x,p.y,18*S.cam.z,8*S.cam.z);
  if(drawSprite("well",p,dark===undefined?0:dark)) return;
  const z=S.cam.z;
  groundShadow(p.x,p.y,9*z,4*z);
  g.fillStyle="#a9a396";
  g.beginPath(); g.ellipse(p.x,p.y-2*z,6*z,3*z,0,0,TAU); g.fill();
  g.fillStyle="#8d887c";
  g.beginPath(); g.ellipse(p.x,p.y-3.4*z,4.4*z,2.2*z,0,0,TAU); g.fill();
  g.fillStyle="#3d4a52";
  g.beginPath(); g.ellipse(p.x,p.y-3.6*z,3.2*z,1.6*z,0,0,TAU); g.fill();
  g.fillStyle="#7a5c43";
  g.fillRect(p.x-4.6*z,p.y-13*z,1.4*z,10*z);
  g.fillRect(p.x+3.2*z,p.y-13*z,1.4*z,10*z);
  g.fillStyle="#9c6858";
  g.beginPath();
  g.moveTo(p.x-6.4*z,p.y-12.6*z); g.lineTo(p.x+6.4*z,p.y-12.6*z); g.lineTo(p.x,p.y-17.5*z);
  g.closePath(); g.fill();
  if(PAL.snow>0.05){
    g.fillStyle="rgba(250,252,255,"+(PAL.snow*0.75)+")";
    g.beginPath(); g.moveTo(p.x-6.4*z,p.y-12.6*z); g.lineTo(p.x+6.4*z,p.y-12.6*z); g.lineTo(p.x,p.y-17.5*z); g.closePath(); g.fill();
  }
}

/* ============================================================
   WONDERS — one of each, ever, so they are worth drawing properly
   ============================================================ */

export function drawStatue(b,p,dark){
  groundShadow(p.x,p.y,18*S.cam.z,8*S.cam.z);
  if(drawSprite("statue",p,dark===undefined?0:dark)) return;
  const z=S.cam.z;
  groundShadow(p.x,p.y,15*z,7*z);
  const topY=box(p.x,p.y,0.62,9,"#cfc8b6","#9c968a","#b9b2a2");   // plinth
  const hw=TW/2*0.62*z;
  g.fillStyle="#ded7c6"; diamond(p.x,topY,0.62); g.fill();
  // bronze figure, arm raised
  const fy=topY-2*z;
  g.fillStyle="#8d7a4e";
  g.fillRect(p.x-1.8*z,fy-13*z,3.6*z,13*z);
  g.beginPath(); g.arc(p.x,fy-15*z,2.4*z,0,TAU); g.fill();
  g.lineWidth=1.8*z; g.strokeStyle="#8d7a4e"; g.lineCap="round";
  g.beginPath(); g.moveTo(p.x+1.2*z,fy-11*z); g.lineTo(p.x+5.5*z,fy-19*z); g.stroke();
  g.beginPath(); g.moveTo(p.x-1.2*z,fy-11*z); g.lineTo(p.x-4*z,fy-5*z); g.stroke();
  g.fillStyle="#a8945f";
  g.beginPath(); g.arc(p.x+5.5*z,fy-19*z,1.6*z,0,TAU); g.fill();
  snowCap(p.x,topY,0.62);
  if(dark>0.15){
    lights.push({x:p.x-3*z,y:topY-4*z,w:6*z,h:2*z,big:true});
  }
}

export function drawClockTower(b,p,dark){
  groundShadow(p.x,p.y,18*S.cam.z,8*S.cam.z);
  if(drawSprite("clocktower",p,dark)){
    // the hands keep the valley's time
    const z=S.cam.z, cy=p.y-72*z;
    const hr=S.dayT*TAU*2, mn=S.dayT*TAU*24;
    g.strokeStyle="#3b4a44"; g.lineCap="round"; g.lineWidth=1.5*z;
    g.beginPath(); g.moveTo(p.x,cy); g.lineTo(p.x+Math.sin(hr)*3*z,cy-Math.cos(hr)*3*z); g.stroke();
    g.lineWidth=1*z;
    g.beginPath(); g.moveTo(p.x,cy); g.lineTo(p.x+Math.sin(mn)*4.4*z,cy-Math.cos(mn)*4.4*z); g.stroke();
    return;
  }
  const z=S.cam.z;
  groundShadow(p.x,p.y,17*z,8*z);
  const topY=box(p.x,p.y,0.5,44,"#efe7d6","#b3a88e","#d5cab0");
  const hw=TW/2*0.5*z;
  // belfry
  g.fillStyle="#c9bda2";
  g.fillRect(p.x-hw*1.15,topY-4*z,hw*2.3,4*z);
  g.fillStyle="#5f7f8c";
  g.beginPath();
  g.moveTo(p.x-hw*1.15,topY-4*z); g.lineTo(p.x+hw*1.15,topY-4*z); g.lineTo(p.x,topY-18*z);
  g.closePath(); g.fill();
  g.fillStyle="#e0ae4e";
  g.beginPath(); g.arc(p.x,topY-19.5*z,1.7*z,0,TAU); g.fill();
  // clock face with hands that keep the valley's time
  const cy=p.y-34*z;
  g.fillStyle="#f7f3e6"; g.beginPath(); g.arc(p.x,cy,5.4*z,0,TAU); g.fill();
  g.strokeStyle="#3b4a44"; g.lineWidth=1*z;
  g.beginPath(); g.arc(p.x,cy,5.4*z,0,TAU); g.stroke();
  const hr=S.dayT*TAU*2, mn=S.dayT*TAU*24;
  g.lineCap="round"; g.lineWidth=1.4*z;
  g.beginPath(); g.moveTo(p.x,cy); g.lineTo(p.x+Math.sin(hr)*2.8*z,cy-Math.cos(hr)*2.8*z); g.stroke();
  g.lineWidth=0.9*z;
  g.beginPath(); g.moveTo(p.x,cy); g.lineTo(p.x+Math.sin(mn)*4.2*z,cy-Math.cos(mn)*4.2*z); g.stroke();
  if(dark>0.1) lights.push({x:p.x-5.4*z,y:cy-5.4*z,w:10.8*z,h:10.8*z,big:true});
  for(let i=0;i<2;i++){
    g.fillStyle=dark>0.15?"#ffd9a0":"rgba(120,145,158,.5)";
    g.fillRect(p.x-1.8*z,p.y-(14+i*9)*z,3.6*z,5*z);
    if(dark>0.12) lights.push({x:p.x-1.8*z,y:p.y-(14+i*9)*z,w:3.6*z,h:5*z});
  }
}

export function drawLighthouse(b,p,dark){
  groundShadow(p.x,p.y,18*S.cam.z,8*S.cam.z);
  if(drawSprite("lighthouse",p,dark)){
    // the beam sweeps out over the water
    const z=S.cam.z, ly=p.y-92*z;
    if(dark>0.18&&!reduceMotion){
      const a=S.t*0.9;
      g.save(); g.globalCompositeOperation="lighter";
      const gr=g.createLinearGradient(p.x,ly,p.x+Math.cos(a)*150*z,ly+Math.sin(a)*70*z);
      gr.addColorStop(0,"rgba(255,240,200,"+(0.30*clamp((dark-0.18)/0.3,0,1)).toFixed(3)+")");
      gr.addColorStop(1,"rgba(255,240,200,0)");
      g.fillStyle=gr; g.beginPath(); g.moveTo(p.x,ly);
      g.lineTo(p.x+Math.cos(a-0.13)*150*z, ly+Math.sin(a-0.13)*70*z);
      g.lineTo(p.x+Math.cos(a+0.13)*150*z, ly+Math.sin(a+0.13)*70*z);
      g.closePath(); g.fill(); g.restore();
    }
    return;
  }
  const z=S.cam.z;
  groundShadow(p.x,p.y,16*z,7*z);
  // tapered tower, drawn as a stack of shrinking boxes
  let y=p.y;
  for(let i=0;i<5;i++){
    const f=0.62-i*0.075;
    box(p.x,y,f,10,i%2?"#f4efe2":"#d9564e",i%2?"#b9b2a2":"#a03a34",i%2?"#ddd6c6":"#c04a43");
    y-=9.4*z;
  }
  const lampY=y+2*z;
  g.fillStyle="#3f4c52";
  g.fillRect(p.x-4.4*z,lampY-6*z,8.8*z,6*z);
  const beam=0.4+0.6*Math.abs(Math.sin(S.t*0.9));
  g.fillStyle="rgba(255,238,190,"+beam.toFixed(2)+")";
  g.fillRect(p.x-3.2*z,lampY-5*z,6.4*z,4.2*z);
  g.fillStyle="#5f7f8c";
  g.beginPath();
  g.moveTo(p.x-5*z,lampY-6*z); g.lineTo(p.x+5*z,lampY-6*z); g.lineTo(p.x,lampY-12*z);
  g.closePath(); g.fill();
  // the sweeping beam itself, once it is dark enough to see
  if(dark>0.18&&!reduceMotion){
    const a=S.t*0.9;
    g.save();
    g.globalCompositeOperation="lighter";
    const gr=g.createLinearGradient(p.x,lampY-3*z,p.x+Math.cos(a)*150*z,lampY-3*z+Math.sin(a)*70*z);
    gr.addColorStop(0,"rgba(255,240,200,"+(0.30*clamp((dark-0.18)/0.3,0,1)).toFixed(3)+")");
    gr.addColorStop(1,"rgba(255,240,200,0)");
    g.fillStyle=gr;
    g.beginPath();
    g.moveTo(p.x,lampY-3*z);
    g.lineTo(p.x+Math.cos(a-0.13)*150*z, lampY-3*z+Math.sin(a-0.13)*70*z);
    g.lineTo(p.x+Math.cos(a+0.13)*150*z, lampY-3*z+Math.sin(a+0.13)*70*z);
    g.closePath(); g.fill();
    g.restore();
  }
  lights.push({x:p.x-3.2*z,y:lampY-5*z,w:6.4*z,h:4.2*z,big:true});
}

export function drawLibrary(b,p,dark){
  groundShadow(p.x,p.y,18*S.cam.z,8*S.cam.z);
  if(drawSprite("library",p,dark===undefined?0:dark)) return;
  const z=S.cam.z;
  groundShadow(p.x,p.y,24*z,11*z);
  const topY=box(p.x,p.y,0.92,20,"#f2ecdb","#b6ac93","#d8cfb6");
  const hw=TW/2*0.92*z, hh=TH/2*0.92*z;
  // colonnade across the front
  g.fillStyle="#e8e0cb";
  for(let i=-2;i<=2;i++) g.fillRect(p.x+i*hw*0.34-1.3*z,p.y-16*z,2.6*z,13*z);
  g.fillStyle="#d6cbb0";
  g.fillRect(p.x-hw,p.y-18.5*z,hw*2,2.6*z);
  // pediment and dome
  g.fillStyle="#8f9ea6";
  g.beginPath();
  g.moveTo(p.x,topY-hh); g.lineTo(p.x+hw,topY); g.lineTo(p.x,topY+hh); g.lineTo(p.x-hw,topY);
  g.closePath(); g.fill();
  snowCap(p.x,topY,0.92);
  g.fillStyle="#6f8fae";
  g.beginPath(); g.arc(p.x,topY-3*z,7*z,Math.PI,0); g.fill();
  g.fillStyle="#e0ae4e";
  g.beginPath(); g.arc(p.x,topY-11*z,1.5*z,0,TAU); g.fill();
  for(let i=-1;i<=1;i++){
    g.fillStyle=dark>0.15?"#ffe3ad":"rgba(120,145,158,.5)";
    g.fillRect(p.x+i*hw*0.5-2*z,p.y-13*z,4*z,5*z);
    if(dark>0.12) lights.push({x:p.x+i*hw*0.5-2*z,y:p.y-13*z,w:4*z,h:5*z,big:true});
  }
}
