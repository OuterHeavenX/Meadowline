import { TAU, lerp, shade } from '../core/constants.js';
import { S } from '../core/state.js';
import { HULLS } from '../simulation/boats.js';
import { box, g } from './terrain.js';
import { proj } from '../world/map.js';

export function drawTrain(t){
  const z=S.cam.z;
  const cols=[["#c96a5c","#a8503f"],["#5d8fa8","#4a7389"],["#d0a94e","#ac8836"]];
  const c=cols[t.hue];
  const carAt=(k)=>{
    if(k===0) return {x:t.fx,y:t.fy};
    const i=Math.min(t.hist.length-1,k*9);
    return t.hist[i];
  };
  for(let k=2;k>=0;k--){
    const h=carAt(k);
    if(!h) continue;
    const p=proj(h.x,h.y);
    g.fillStyle="rgba(30,44,38,.20)";
    g.beginPath(); g.ellipse(p.x,p.y+2*z,11*z,5*z,0,0,TAU); g.fill();
    const body=k===0?c[0]:"#e6dcc6";
    const topY=box(p.x,p.y-3*z,0.5,k===0?11:9,shade(body,10),shade(body,-38),shade(body,-16));
    g.fillStyle="rgba(120,150,165,.75)";
    g.fillRect(p.x-5*z,p.y-11*z,3.2*z,3*z);
    g.fillRect(p.x+1.6*z,p.y-11*z,3.2*z,3*z);
    if(k===0){
      g.fillStyle=c[1];
      g.fillRect(p.x-1.2*z,topY-3*z,2.4*z,3*z);
      const ph=(S.t*1.5)%1;
      g.fillStyle="rgba(244,240,226,"+(0.35*(1-ph))+")";
      g.beginPath(); g.arc(p.x,topY-6*z-ph*12*z,(2+ph*4)*z,0,TAU); g.fill();
    }
  }
}

function sidewalkOffset(c,fx,fy){
  const z=S.cam.z;
  let dx=(c.nx-c.x),dy=(c.ny-c.y);
  if(!dx&&!dy){ dx=c.x-c.px; dy=c.y-c.py; }
  if(!dx&&!dy) dx=1;
  const p=proj(fx,fy), q=proj(fx+dx*0.3,fy+dy*0.3);
  let sx=q.x-p.x,sy=q.y-p.y,len=Math.hypot(sx,sy)||1; sx/=len;sy/=len;
  return {x:-sy*7*z*(c.side||1),y:sx*7*z*(c.side||1)};
}

export function drawCitizen(c){
  const z=S.cam.z;
  const fx=lerp(c.x,c.nx,c.p), fy=lerp(c.y,c.ny,c.p);
  const p=proj(fx,fy), side=sidewalkOffset(c,fx,fy);
  const bob=Math.abs(Math.sin(S.t*6+c.bob))*1.6*z;
  const px=p.x+side.x,py=p.y+side.y;
  g.fillStyle="rgba(30,44,38,.18)";
  g.beginPath(); g.ellipse(px,py+2*z,2.6*z,1.3*z,0,0,TAU); g.fill();
  g.fillStyle=c.col;
  g.fillRect(px-1.5*z,py-5.4*z-bob,3*z,4*z);
  g.fillStyle="#f0d9bd";
  g.beginPath(); g.arc(px,py-6.8*z-bob,1.7*z,0,TAU); g.fill();
  if(c.carry){
    g.fillStyle="#b98d5c";
    g.fillRect(px+1.6*z,py-3.4*z-bob,2.4*z,2*z);
    g.strokeStyle="#8d6a42"; g.lineWidth=0.6*z;
    g.beginPath(); g.arc(px+2.8*z,py-3.4*z-bob,1.2*z,Math.PI,0); g.stroke();
  }
}

/* ---------- boats ---------- */
export function drawBoat(t){
  const z=S.cam.z;
  const p=proj(t.fx!==undefined?t.fx:t.x, t.fy!==undefined?t.fy:t.y);
  const c=HULLS[t.hue];
  const bob=Math.sin(S.t*1.8+t.bob)*1.3*z;
  for(let i=t.wake.length-1;i>=1;i--){
    const w=proj(t.wake[i].x,t.wake[i].y);
    const a=(1-i/t.wake.length)*0.30;
    g.fillStyle="rgba(255,255,255,"+a.toFixed(3)+")";
    g.beginPath(); g.ellipse(w.x,w.y+2*z,(6-i*0.3)*z,(2.4-i*0.12)*z,0,0,TAU); g.fill();
  }
  g.fillStyle="rgba(24,54,64,.22)";
  g.beginPath(); g.ellipse(p.x,p.y+3*z,9*z,4*z,0,0,TAU); g.fill();
  const y=p.y+bob;
  g.fillStyle=c[1];
  g.beginPath();
  g.moveTo(p.x-9*z,y-1*z); g.lineTo(p.x+9*z,y-1*z);
  g.lineTo(p.x+6*z,y+3.4*z); g.lineTo(p.x-6*z,y+3.4*z);
  g.closePath(); g.fill();
  g.fillStyle=c[0];
  g.fillRect(p.x-9*z,y-3*z,18*z,2.2*z);
  g.strokeStyle="#7a5c43"; g.lineWidth=1.2*z;
  g.beginPath(); g.moveTo(p.x,y-3*z); g.lineTo(p.x,y-17*z); g.stroke();
  g.fillStyle="rgba(248,244,232,.95)";
  g.beginPath();
  g.moveTo(p.x+0.8*z,y-16.5*z);
  g.quadraticCurveTo(p.x+9*z,y-11*z,p.x+1*z,y-4.5*z);
  g.closePath(); g.fill();
  g.fillStyle="rgba(214,205,186,.9)";
  g.beginPath();
  g.moveTo(p.x-0.8*z,y-16.5*z);
  g.quadraticCurveTo(p.x-6*z,y-11.5*z,p.x-1*z,y-6*z);
  g.closePath(); g.fill();
}
