import { lerp, shade } from '../core/constants.js';
import { S } from '../core/state.js';
import { g } from './terrain.js';
import { proj } from '../world/map.js';

function pointOnVehicle(v){
  const t=Math.max(0,Math.min(1,v.p||0));
  return {x:lerp(v.x,v.nx,t),y:lerp(v.y,v.ny,t)};
}

export function drawVehicle(v){
  const z=S.cam.z;
  const w=pointOnVehicle(v), p=proj(w.x,w.y), q=proj(w.x+(v.nx-v.x)*0.35,w.y+(v.ny-v.y)*0.35);
  let dx=q.x-p.x,dy=q.y-p.y,len=Math.hypot(dx,dy)||1; dx/=len;dy/=len;
  const nx=-dy,ny=dx;
  const emergency=['police','fireEngine','ambulance'].includes(v.type),responding=v.state==='EN_ROUTE'||v.state==='DISPATCHED';
  const long=(v.type==='fireEngine'?10:v.type==='ambulance'||v.type==='van'?8.4:v.type==='pickup'?7.8:7.0)*z;
  const half=3.0*z;
  const noseX=p.x+dx*long*0.55,noseY=p.y+dy*long*0.55;
  const tailX=p.x-dx*long*0.45,tailY=p.y-dy*long*0.45;
  const lift=2.4*z;

  g.fillStyle='rgba(26,37,35,.20)';
  g.beginPath(); g.ellipse(p.x,p.y+3.4*z,long*0.62,2.2*z,0,0,Math.PI*2); g.fill();

  g.fillStyle=shade(v.color||'#7a8590',-28);
  g.beginPath();
  g.moveTo(noseX+nx*half,noseY+ny*half+lift);
  g.lineTo(noseX-nx*half,noseY-ny*half+lift);
  g.lineTo(tailX-nx*half,tailY-ny*half+lift);
  g.lineTo(tailX+nx*half,tailY+ny*half+lift);
  g.closePath(); g.fill();

  const roof=v.type==='van'?0.72:0.58;
  g.fillStyle=v.color||'#7a8590';
  g.beginPath();
  g.moveTo(p.x+dx*long*0.28+nx*half*roof,p.y+dy*long*0.28+ny*half*roof-lift);
  g.lineTo(p.x+dx*long*0.28-nx*half*roof,p.y+dy*long*0.28-ny*half*roof-lift);
  g.lineTo(p.x-dx*long*0.26-nx*half*roof,p.y-dy*long*0.26-ny*half*roof-lift);
  g.lineTo(p.x-dx*long*0.26+nx*half*roof,p.y-dy*long*0.26+ny*half*roof-lift);
  g.closePath(); g.fill();

  g.strokeStyle='rgba(190,219,228,.8)'; g.lineWidth=1.15*z;
  g.beginPath();
  g.moveTo(p.x+dx*long*0.2+nx*half*0.52,p.y+dy*long*0.2+ny*half*0.52-lift);
  g.lineTo(p.x+dx*long*0.2-nx*half*0.52,p.y+dy*long*0.2-ny*half*0.52-lift); g.stroke();

  g.fillStyle='#2e3433';
  for(const s of [-1,1]){
    const wx=p.x+nx*half*0.92*s, wy=p.y+ny*half*0.92*s+1.6*z;
    g.beginPath(); g.arc(wx,wy,1.15*z,0,Math.PI*2); g.fill();
  }
  if(emergency){g.fillStyle=v.type==='fireEngine'?'#d34d43':v.type==='ambulance'?'#f0efe8':'#315f91';g.fillRect(p.x-long*.3,p.y-lift,long*.6,2*z);if(v.type==='ambulance'){g.fillStyle='#c9494f';g.fillRect(p.x-1*z,p.y-lift-2*z,2*z,5*z);g.fillRect(p.x-3*z,p.y-lift,6*z,2*z);}if(responding){const flash=Math.sin(S.t*4+v.id)>0;g.fillStyle=flash?'rgba(238,70,65,.9)':'rgba(75,135,235,.9)';g.beginPath();g.arc(p.x,p.y-5*z,1.7*z,0,Math.PI*2);g.fill();}}
}
