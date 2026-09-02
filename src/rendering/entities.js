import { TAU, lerp, shade } from '../core/constants.js';
import { S } from '../core/state.js';
import { HULLS } from '../simulation/boats.js';
import { CART_COLOURS } from '../simulation/carts.js';
import { greenAxis } from '../transport/signals.js';
import { box, g, lights } from './terrain.js';
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
    // windows
    g.fillStyle="rgba(120,150,165,.75)";
    g.fillRect(p.x-5*z,p.y-11*z,3.2*z,3*z);
    g.fillRect(p.x+1.6*z,p.y-11*z,3.2*z,3*z);
    if(k===0){
      // chimney puff
      g.fillStyle=c[1];
      g.fillRect(p.x-1.2*z,topY-3*z,2.4*z,3*z);
      const ph=(S.t*1.5)%1;
      g.fillStyle="rgba(244,240,226,"+(0.35*(1-ph))+")";
      g.beginPath(); g.arc(p.x,topY-6*z-ph*12*z,(2+ph*4)*z,0,TAU); g.fill();
    }
  }
}

const SKINS=["#f0d9bd","#e0bb95","#c69a70","#a97b52","#7d5636"];
const HAIRS=["#3a2b20","#5c4230","#8a6a3f","#c9a35e","#2b2b2b","#7d4a2e"];

/* A citizen is about seven pixels tall at normal zoom, so the thing that makes
   them read is motion and silhouette rather than detail: legs that stride,
   arms that swing, and a body that leans the way it is going. */
export function drawCitizen(c){
  const z=S.cam.z;
  const fx=lerp(c.x,c.nx,c.p), fy=lerp(c.y,c.ny,c.p);
  const p=proj(fx,fy);
  const off=((c.bob*7)%1-0.5)*10*z;      // spread walkers across the road width
  const moving=(c.nx!==c.x||c.ny!==c.y)&&!c.linger;
  const gait=moving?Math.sin(S.t*7.5+c.bob*6):0;
  const bob=moving?Math.abs(Math.sin(S.t*7.5+c.bob*6))*1.1*z:0;
  const x=p.x+off, y=p.y-bob;
  // which way they face on screen, so they lean into the walk
  const dir=(c.nx-c.x)-(c.ny-c.y);
  const lean=moving?(dir>0?0.55:dir<0?-0.55:0)*z:0;
  const skin=SKINS[(c.bob*997|0)%SKINS.length];
  const hair=HAIRS[(c.bob*613|0)%HAIRS.length];

  g.fillStyle="rgba(30,44,38,.18)";
  g.beginPath(); g.ellipse(x,p.y+2*z,2.8*z,1.3*z,0,0,TAU); g.fill();

  // legs
  g.strokeStyle="#3f4a52"; g.lineWidth=1.15*z; g.lineCap="round";
  g.beginPath();
  g.moveTo(x,y-2.4*z); g.lineTo(x+gait*1.5*z,y+0.4*z); g.stroke();
  g.beginPath();
  g.moveTo(x,y-2.4*z); g.lineTo(x-gait*1.5*z,y+0.4*z); g.stroke();

  // body, leaning into the direction of travel
  g.fillStyle=c.col;
  g.save(); g.translate(x,y-2.4*z); g.rotate(lean*0.12);
  g.beginPath();
  g.moveTo(-1.7*z,0); g.lineTo(1.7*z,0); g.lineTo(1.45*z,-4.1*z); g.lineTo(-1.45*z,-4.1*z);
  g.closePath(); g.fill();
  // arms swinging opposite the legs
  g.strokeStyle=c.col; g.lineWidth=1*z;
  g.beginPath(); g.moveTo(1.4*z,-3.4*z); g.lineTo(1.9*z-gait*1.3*z,-0.7*z); g.stroke();
  g.beginPath(); g.moveTo(-1.4*z,-3.4*z); g.lineTo(-1.9*z+gait*1.3*z,-0.7*z); g.stroke();
  g.restore();

  // head, with hair on top
  const hy=y-7.4*z;
  g.fillStyle=skin;
  g.beginPath(); g.arc(x+lean*0.5,hy,1.75*z,0,TAU); g.fill();
  g.fillStyle=hair;
  g.beginPath(); g.arc(x+lean*0.5,hy-0.45*z,1.75*z,Math.PI*1.03,Math.PI*2.0); g.fill();

  // a basket, on the way back from the market or the bakery
  if(c.carry){
    g.fillStyle="#b98d5c";
    g.fillRect(x+1.9*z,y-3.2*z,2.4*z,2*z);
    g.strokeStyle="#8d6a42"; g.lineWidth=0.6*z;
    g.beginPath(); g.arc(x+3.1*z,y-3.2*z,1.2*z,Math.PI,0); g.stroke();
  }
}

// fireflies drift over the parks on summer nights

/* ---------- boats ---------- */
export function drawBoat(t){
  const z=S.cam.z;
  const p=proj(t.fx!==undefined?t.fx:t.x, t.fy!==undefined?t.fy:t.y);
  const c=HULLS[t.hue];
  const bob=Math.sin(S.t*1.8+t.bob)*1.3*z;

  // wake, oldest first so it fades away behind the hull
  for(let i=t.wake.length-1;i>=1;i--){
    const w=proj(t.wake[i].x,t.wake[i].y);
    const a=(1-i/t.wake.length)*0.30;
    g.fillStyle="rgba(255,255,255,"+a.toFixed(3)+")";
    g.beginPath(); g.ellipse(w.x,w.y+2*z,(6-i*0.3)*z,(2.4-i*0.12)*z,0,0,TAU); g.fill();
  }

  g.fillStyle="rgba(24,54,64,.22)";
  g.beginPath(); g.ellipse(p.x,p.y+3*z,9*z,4*z,0,0,TAU); g.fill();

  // hull
  const y=p.y+bob;
  g.fillStyle=c[1];
  g.beginPath();
  g.moveTo(p.x-9*z,y-1*z); g.lineTo(p.x+9*z,y-1*z);
  g.lineTo(p.x+6*z,y+3.4*z); g.lineTo(p.x-6*z,y+3.4*z);
  g.closePath(); g.fill();
  g.fillStyle=c[0];
  g.fillRect(p.x-9*z,y-3*z,18*z,2.2*z);

  // mast and sail
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

/* ---------- carts ---------- */
export function drawCart(c){
  const z=S.cam.z;
  const p=proj(c.fx!==undefined?c.fx:c.x, c.fy!==undefined?c.fy:c.y);
  const col=CART_COLOURS[c.hue];
  const roll=c.wait>0?0:S.t*7;
  g.fillStyle="rgba(30,44,38,.20)";
  g.beginPath(); g.ellipse(p.x,p.y+2*z,7*z,3*z,0,0,TAU); g.fill();
  // bed and sideboards
  g.fillStyle=col[1];
  g.fillRect(p.x-6*z,p.y-6*z,12*z,4.2*z);
  g.fillStyle=col[0];
  g.fillRect(p.x-6*z,p.y-8.4*z,12*z,2.6*z);
  // a load, if it is carrying one
  if(c.laden){
    g.fillStyle="#d2b070";
    g.fillRect(p.x-4*z,p.y-11*z,8*z,3*z);
    g.fillStyle="#bd9a58";
    g.fillRect(p.x-2*z,p.y-13*z,4*z,2.2*z);
  }
  // wheels that turn while it is moving
  g.strokeStyle="#4a3a2a"; g.lineWidth=1.1*z;
  for(const wx of [-4,4]){
    g.beginPath(); g.arc(p.x+wx*z,p.y-1.6*z,2.4*z,0,TAU); g.stroke();
    g.beginPath();
    g.moveTo(p.x+wx*z-Math.cos(roll)*2.2*z,p.y-1.6*z-Math.sin(roll)*2.2*z);
    g.lineTo(p.x+wx*z+Math.cos(roll)*2.2*z,p.y-1.6*z+Math.sin(roll)*2.2*z);
    g.stroke();
  }
  // the horse in front
  g.fillStyle="#8a6a4a";
  g.fillRect(p.x+6.5*z,p.y-8*z,5*z,3.4*z);
  g.beginPath(); g.arc(p.x+11.5*z,p.y-9*z,1.9*z,0,TAU); g.fill();
}

/* ---------- traffic signals ---------- */
export function drawSignal(sig,dark){
  const z=S.cam.z;
  const p=proj(sig.x,sig.y);
  const axis=greenAxis(sig);
  g.fillStyle="rgba(30,44,38,.20)";
  g.beginPath(); g.ellipse(p.x,p.y+1*z,3.4*z,1.6*z,0,0,TAU); g.fill();
  g.fillStyle="#46524b";
  g.fillRect(p.x-0.9*z,p.y-15*z,1.8*z,15*z);
  g.fillStyle="#2f3a34";
  g.fillRect(p.x-2.8*z,p.y-23*z,5.6*z,8.4*z);
  const on="#ff6b52", off="#4a2b26", onG="#7fe08a", offG="#2c4a31";
  const xGreen=axis==="x";
  g.fillStyle=xGreen?off:on;
  g.beginPath(); g.arc(p.x,p.y-20.6*z,1.5*z,0,TAU); g.fill();
  g.fillStyle=xGreen?onG:offG;
  g.beginPath(); g.arc(p.x,p.y-17*z,1.5*z,0,TAU); g.fill();
  if(dark>0.08){
    lights.push(xGreen
      ? {x:p.x-1.5*z,y:p.y-18.5*z,w:3*z,h:3*z}
      : {x:p.x-1.5*z,y:p.y-22.1*z,w:3*z,h:3*z});
  }
}
