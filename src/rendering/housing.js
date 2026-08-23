import { P, TAU, TH, TW, clamp, hash2, shade } from '../core/constants.js';
import { S } from '../core/state.js';
import { housingTierIndex } from '../simulation/housing.js';
import { box, g, lights } from './terrain.js';
import { PAL } from '../world/seasons.js';
import { activeFestival, festivalGlow } from '../world/festivals.js';

function groundShadow(sx,sy,rx,ry,alpha){
  g.fillStyle="rgba(30,50,40,"+(alpha||0.16)+")";
  g.beginPath(); g.ellipse(sx,sy+1*S.cam.z,rx,ry,0,0,TAU); g.fill();
}

function growthMark(b,p,topY,peak){
  const progress=clamp(Number(b.state&&b.state.upgradeProgress)||0,0,1);
  if(progress<=0.02) return;
  const z=S.cam.z;
  const pulse=0.48+0.20*Math.sin(S.t*3+b.seed);
  const y=topY-peak-10*z;
  g.globalAlpha=Math.min(0.9,pulse+progress*0.3);
  g.strokeStyle="rgba(115,201,128,.95)";
  g.lineWidth=1.8*z;
  g.beginPath();
  g.moveTo(p.x-5*z,y+4*z); g.lineTo(p.x,y-1*z); g.lineTo(p.x+5*z,y+4*z);
  g.stroke();
  g.globalAlpha=1;
}

export function drawHousingHouse(b,p,dark){
  const z=S.cam.z, r=hash2(b.seed,1,3);
  const tier=housingTierIndex(b);
  const scale=tier===1?0.60:tier===2?0.72:0.84;
  const hgt=tier===1?(16+r*3):tier===2?(23+r*3):(30+r*3);
  const shadow=tier===1?17:tier===2?20:23;
  groundShadow(p.x,p.y,shadow*z,(7+tier)*z,0.16+tier*0.015);

  const wall=P.wall[(hash2(b.seed,2,4)*3)|0];
  const roof=P.roof[(hash2(b.seed,5,6)*P.roof.length)|0];
  const topY=box(p.x,p.y,scale,hgt,shade(wall,6+tier*2),shade(wall,-34),shade(wall,-14));
  const hw=TW/2*scale*z, hh=TH/2*scale*z, peak=(7+tier*2+r*3)*z;

  // Gable roof. Tier is expressed mostly through silhouette so it reads on phone.
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

  const lit=b.pop>0;
  const wy=p.y-hgt*z*0.48;
  const glass=lit?"rgba(90,110,120,.55)":"rgba(70,86,92,.42)";
  g.fillStyle=glass;
  g.fillRect(p.x-hw*0.62,wy,3.4*z,4.2*z);
  g.fillRect(p.x+hw*0.30,wy,3.4*z,4.2*z);
  if(tier>=2) g.fillRect(p.x-hw*0.10,wy-6*z,3.4*z,4.2*z);
  if(tier>=3){
    g.fillRect(p.x-hw*0.58,wy-9*z,3.4*z,4.2*z);
    g.fillRect(p.x+hw*0.36,wy-9*z,3.4*z,4.2*z);
  }
  if(lit&&dark>0.12){
    lights.push({x:p.x-hw*0.62,y:wy,w:3.4*z,h:4.2*z});
    lights.push({x:p.x+hw*0.30,y:wy,w:3.4*z,h:4.2*z});
    if(tier>=2) lights.push({x:p.x-hw*0.10,y:wy-6*z,w:3.4*z,h:4.2*z});
  }

  // Tier 2+ gets a visible dormer; Tier 3 gets a little garden/fence edge.
  if(tier>=2){
    const dx=p.x-hw*0.12,dy=topY-hh*0.16-peak*0.43;
    g.fillStyle=shade(wall,2);
    g.fillRect(dx-4*z,dy-2*z,8*z,6*z);
    g.fillStyle=shade(roof,6);
    g.beginPath(); g.moveTo(dx-5*z,dy-2*z); g.lineTo(dx,dy-6*z); g.lineTo(dx+5*z,dy-2*z); g.closePath(); g.fill();
    g.fillStyle=glass; g.fillRect(dx-1.5*z,dy,3*z,3*z);
  }
  if(tier>=3){
    g.strokeStyle="rgba(116,96,68,.72)"; g.lineWidth=1.2*z;
    g.beginPath(); g.moveTo(p.x-hw*0.95,p.y+4*z); g.lineTo(p.x-hw*0.45,p.y+8*z); g.stroke();
    g.beginPath(); g.moveTo(p.x+hw*0.48,p.y+8*z); g.lineTo(p.x+hw*0.98,p.y+4*z); g.stroke();
    for(let i=0;i<3;i++){
      g.fillStyle=["#e9e5d6","#e0b45a","#d3897c"][i];
      g.beginPath(); g.arc(p.x-hw*0.70+i*3*z,p.y+5*z,1.1*z,0,TAU); g.fill();
    }
  }

  // chimney smoke on cold or dark evenings
  if(lit){
    const cold=Math.max(PAL.snow||0,dark>0.35?1:0);
    if(cold>0.05){
      const cx=p.x+hw*0.42,cy=topY-peak*0.45;
      g.fillStyle=shade(roof,-30);
      g.fillRect(cx-1.5*z,cy-5*z,3*z,5.5*z);
      for(let i=0;i<3;i++){
        const t=((S.t*0.5+i*0.33+(b.seed%10)/10)%1),a=(1-t)*0.30*cold;
        if(a<=0.01) continue;
        g.fillStyle="rgba(226,228,224,"+a.toFixed(3)+")";
        g.beginPath(); g.arc(cx+Math.sin(t*3+b.seed)*3*z,cy-5*z-t*16*z,(1.6+t*3.4)*z,0,TAU); g.fill();
      }
    }
  }

  const fest=activeFestival();
  if(fest){
    const gl=festivalGlow(),fy=topY-peak-2*z,fx=p.x;
    g.strokeStyle="rgba(70,60,50,.8)"; g.lineWidth=0.9*z;
    g.beginPath(); g.moveTo(fx,fy); g.lineTo(fx,fy-9*z); g.stroke();
    g.fillStyle=fest.flag; g.globalAlpha=Math.max(0.35,gl);
    const wave=Math.sin(S.t*3+b.seed)*1.6*z;
    g.beginPath(); g.moveTo(fx,fy-9*z); g.lineTo(fx+7*z,fy-6.5*z+wave); g.lineTo(fx,fy-4.5*z); g.closePath(); g.fill();
    g.globalAlpha=1;
  }

  growthMark(b,p,topY,peak);

  if(!b.linked){
    const yy=p.y-(hgt+peak/z+13)*z+Math.sin(S.t*2.4+b.seed%7)*2*z;
    g.fillStyle="rgba(29,43,38,.85)";
    g.beginPath(); g.arc(p.x,yy,7*z,0,TAU); g.fill();
    g.fillStyle=P.warm;
    g.fillRect(p.x-0.9*z,yy-4*z,1.8*z,5*z);
    g.fillRect(p.x-0.9*z,yy+2.2*z,1.8*z,1.8*z);
  }
}
