import { S } from '../core/state.js';
import { g, lights } from './terrain.js';

export function drawSchoolUpgradeDetails(b,p,dark){
  const level=Math.max(1,Math.floor(Number(b?.state?.level)||1));
  if(level<2) return;
  const z=S.cam.z;
  // A wider classroom wing and a small clock crest make Level 2 readable at phone scale
  // without changing the one-tile footprint or replacing the original School silhouette.
  g.fillStyle="#d8ccae";
  g.fillRect(p.x-19*z,p.y-12*z,10*z,7*z);
  g.fillRect(p.x+9*z,p.y-12*z,10*z,7*z);
  g.fillStyle="#7c6288";
  g.fillRect(p.x-20*z,p.y-14*z,12*z,3*z);
  g.fillRect(p.x+8*z,p.y-14*z,12*z,3*z);
  for(const ox of [-15,13]){
    g.fillStyle="rgba(120,145,158,.68)";
    g.fillRect(p.x+ox*z,p.y-10*z,3*z,3.8*z);
    if(dark>0.12) lights.push({x:p.x+ox*z,y:p.y-10*z,w:3*z,h:3.8*z});
  }
  g.fillStyle="#f0e8d5";
  g.beginPath(); g.arc(p.x,p.y-31*z,3.1*z,0,Math.PI*2); g.fill();
  g.strokeStyle="#6b5b68"; g.lineWidth=.8*z;
  g.beginPath(); g.moveTo(p.x,p.y-31*z); g.lineTo(p.x,p.y-33*z); g.moveTo(p.x,p.y-31*z); g.lineTo(p.x+1.8*z,p.y-30*z); g.stroke();
}
