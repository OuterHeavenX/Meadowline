import { TAU, lerp, shade } from '../core/constants.js';
import { S, reduceMotion } from '../core/state.js';
import { HULLS } from '../simulation/boats.js';
import { box, g } from './terrain.js';
import { proj } from '../world/map.js';
import { sidewalkOffset } from '../transport/lanes.js';

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


/* ---------- citizens ----------
   A citizen is about seven pixels tall at the usual zoom, so the whole job is
   choosing which handful of marks read as a person walking. Legs that stride
   and arms that swing against them do nearly all of it - a body that only
   bobbed up and down read as a jitter rather than a walk. Everything is drawn
   from one phase so the parts stay in step with each other and with the speed
   the citizen is actually moving at.

   The seed is the citizen's own bob, which is already unique and already
   saved, so hair and skin vary from person to person without the citizen
   record growing a field. */
const SKIN=["#f0d9bd","#e6c39c","#c99a6f","#9c6b45","#7a5133"];
const HAIR=["#3a2c22","#6b4a2f","#2b2b30","#8a6a3e","#4a3550","#d8cfc0"];

export function drawCitizen(c){
  const z=S.cam.z;
  const local=c.facilityLocal;
  const fx=local?local.x:lerp(c.x,c.nx,c.p), fy=local?local.y:lerp(c.y,c.ny,c.p);
  // Offset in world tiles before projecting, so the pavement a citizen walks on
  // is the one the road art draws, and both renderers agree on where that is.
  const side=sidewalkOffset(c);
  const p=proj(fx+side.x,fy+side.y);
  const px=p.x,py=p.y;

  // One phase drives the whole body. Standing still, it settles rather than
  // marching on the spot: a citizen lingering outside a café should look like
  // they are lingering.
  // Reduced motion keeps people where they are going without the gait: the
  // stride is what would flicker, so it is the part that goes.
  const moving=!local&&!reduceMotion&&(c.nx!==c.x||c.ny!==c.y);
  const rate=moving?7.4*(c.sp||0.5)*2:1.6;
  const phase=S.t*rate+(c.bob||0);
  const stride=moving?Math.sin(phase):0;
  const bob=reduceMotion?0:Math.abs(Math.cos(phase))*(moving?1.1:0.35)*z;
  const lean=moving?0.5*z:0;

  const seed=Math.abs(Math.round((c.bob||0)*1000));
  const skin=SKIN[seed%SKIN.length];
  const hair=HAIR[(seed>>3)%HAIR.length];
  const trouser=shade(c.col,-46);

  g.fillStyle="rgba(30,44,38,.18)";
  g.beginPath(); g.ellipse(px,py+2*z,2.8*z,1.4*z,0,0,TAU); g.fill();

  const hip=py-4.2*z-bob;
  // legs: one forward, one back, crossing at the hip
  g.strokeStyle=trouser; g.lineWidth=1.25*z; g.lineCap="round";
  for(const dir of[1,-1]){
    const swing=stride*dir;
    g.beginPath();
    g.moveTo(px,hip);
    g.lineTo(px+swing*1.7*z,py+bob*0.15);
    g.stroke();
  }
  // torso, leaning into the walk
  g.strokeStyle=c.col; g.lineWidth=2.6*z;
  g.beginPath();
  g.moveTo(px,hip+0.4*z);
  g.lineTo(px+lean,hip-3.6*z);
  g.stroke();
  // arms swing against the legs
  g.strokeStyle=shade(c.col,-18); g.lineWidth=1*z;
  for(const dir of[1,-1]){
    const swing=-stride*dir;
    g.beginPath();
    g.moveTo(px+lean*0.6,hip-3*z);
    g.lineTo(px+swing*1.4*z,hip-0.6*z);
    g.stroke();
  }
  g.lineCap="butt";
  // head, then hair over the back of it
  const hy=hip-5.2*z;
  g.fillStyle=skin;
  g.beginPath(); g.arc(px+lean,hy,1.65*z,0,TAU); g.fill();
  g.fillStyle=hair;
  g.beginPath(); g.arc(px+lean,hy-0.35*z,1.65*z,Math.PI*1.08,Math.PI*2.05); g.fill();

  if(c.carry&&!local){
    g.fillStyle="#b98d5c";
    g.fillRect(px+1.7*z,hip-1.6*z,2.4*z,2*z);
    g.strokeStyle="#8d6a42"; g.lineWidth=0.6*z;
    g.beginPath(); g.arc(px+2.9*z,hip-1.6*z,1.2*z,Math.PI,0); g.stroke();
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
