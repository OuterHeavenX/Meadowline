import { S } from '../core/state.js'; import { g } from './terrain.js'; import { proj } from '../world/map.js';
export function drawFeedback(){
  g.textAlign='center'; g.font='700 12px system-ui';
  for(const f of S.feedback||[]){const p=proj(f.x,f.y),t=f.age/f.life,y=p.y-28*S.cam.z-f.age*15*S.cam.z;g.globalAlpha=Math.max(0,1-t);g.fillStyle=f.kind==='coin'?'#ffe29b':f.kind==='upgrade'?'#fff2bd':'#f5f2e8';g.strokeStyle='rgba(30,42,37,.65)';g.lineWidth=3;g.strokeText(f.text,p.x,y);g.fillText(f.text,p.x,y);}g.globalAlpha=1;
}
