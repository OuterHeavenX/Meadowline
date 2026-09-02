import { TAU, TH, lerp, shade } from '../core/constants.js';
import { laneOffset } from '../transport/lanes.js';
import { S } from '../core/state.js';
import { g } from './terrain.js';
import { proj } from '../world/map.js';
import { signalPhase } from '../transport/signals.js';

function pointOnVehicle(v){
  const t=Math.max(0,Math.min(1,v.p||0)),lane=laneOffset(v);
  // Cars used to ride the centre line, in the same place as the pedestrians.
  // The lane is perpendicular to travel, so oncoming traffic passes properly.
  return {x:lerp(v.x,v.nx,t)+lane.x,y:lerp(v.y,v.ny,t)+lane.y};
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

/* ---------- traffic signals ----------
   Two heads on one pole, one facing each axis, so a glance at the junction
   tells you which way is running without having to work out which lamp
   belongs to which street. The pole stands on the corner of the tile rather
   than in the middle of it, where the cars are. */
export function drawSignal(x,y,dark){
  const z=S.cam.z, p=proj(x,y);
  const ph=signalPhase(x,y);
  const RED='#d1493f', AMBER='#e2a63b', GREEN='#5fb262', OFF='#3d443f';
  const LAMPS=[RED,AMBER,GREEN];
  const GLOW=['rgba(232,88,74,','rgba(240,178,70,','rgba(120,214,124,'];
  // The corner nearest the camera, so the pole never stands in front of the
  // junction it is signalling.
  const bx=p.x, by=p.y+TH/2*0.62*z;
  const h=13*z;
  g.fillStyle='rgba(30,44,38,.2)';
  g.beginPath(); g.ellipse(bx,by+1*z,2.4*z,1.2*z,0,0,TAU); g.fill();
  g.fillStyle='#41474a';
  g.fillRect(bx-0.7*z,by-h,1.4*z,h);
  for(const axis of['ew','ns']){
    const green=ph.axis===axis;
    // the two heads sit either side of the pole, each turned down its street
    const hx=bx+(axis==='ew'?-3.4*z:3.4*z), hy=by-h+1*z;
    g.fillStyle='#2f3538';
    g.fillRect(hx-1.5*z,hy-1*z,3*z,7.4*z);
    for(let k=0;k<3;k++){
      const on=(k===0&&!green)||(k===1&&green&&ph.amber)||(k===2&&green&&!ph.amber);
      const ly=hy+0.9*z+k*2.4*z;
      g.fillStyle=on?LAMPS[k]:OFF;
      g.beginPath(); g.arc(hx,ly,0.85*z,0,TAU); g.fill();
      // A signal makes its own halo rather than joining the warm street-lamp
      // pass, because that pass paints everything amber - which turns a red
      // light into a yellow one the moment it gets dark.
      if(on&&dark>0.08){
        g.save(); g.globalCompositeOperation='lighter';
        const rg=g.createRadialGradient(hx,ly,0,hx,ly,4.5*z);
        rg.addColorStop(0,GLOW[k]+(0.8*Math.min(1,dark*1.6)).toFixed(2)+')');
        rg.addColorStop(1,GLOW[k]+'0)');
        g.fillStyle=rg;
        g.beginPath(); g.arc(hx,ly,4.5*z,0,TAU); g.fill();
        g.restore();
      }
    }
  }
}
