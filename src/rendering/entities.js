import { TAU, lerp, shade } from '../core/constants.js';
import { S } from '../core/state.js';
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

export function drawCitizen(c){
  const z=S.cam.z;
  const fx=lerp(c.x,c.nx,c.p), fy=lerp(c.y,c.ny,c.p);
  const p=proj(fx,fy);
  const off=((c.bob*7)%1-0.5)*10*z;   // spread walkers across the road width
  const bob=Math.abs(Math.sin(S.t*6+c.bob))*1.6*z;
  g.fillStyle="rgba(30,44,38,.18)";
  g.beginPath(); g.ellipse(p.x+off,p.y+2*z,2.6*z,1.3*z,0,0,TAU); g.fill();
  g.fillStyle=c.col;
  g.fillRect(p.x+off-1.5*z,p.y-5.4*z-bob,3*z,4*z);
  g.fillStyle="#f0d9bd";
  g.beginPath(); g.arc(p.x+off,p.y-6.8*z-bob,1.7*z,0,TAU); g.fill();
}

// fireflies drift over the parks on summer nights
