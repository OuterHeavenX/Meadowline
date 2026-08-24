import { S, reduceMotion } from '../core/state.js';
import { g } from './terrain.js';
import { proj } from '../world/map.js';
export function drawFeedback(){
  g.textAlign='center';g.textBaseline='middle';g.font='700 12px system-ui';
  for(const f of S.feedback||[]){
    const p=proj(f.x,f.y),t=f.age/f.life,ease=reduceMotion?1:Math.min(1,f.age/.18),rise=reduceMotion?8:f.age*15,y=p.y-28*S.cam.z-rise*S.cam.z,alpha=Math.max(0,Math.min(1,ease*(1-t)*1.7)),text=f.kind==='coin'?'● '+f.text:f.text,w=Math.max(34,g.measureText(text).width+14),h=20;
    g.save();g.globalAlpha=alpha;g.translate(p.x,y);g.scale(.88+.12*ease,.88+.12*ease);g.fillStyle=f.kind==='coin'?'rgba(67,55,28,.82)':f.kind==='upgrade'?'rgba(74,61,36,.86)':'rgba(35,48,44,.82)';g.beginPath();g.roundRect(-w/2,-h/2,w,h,8);g.fill();g.strokeStyle=f.kind==='coin'?'rgba(255,226,155,.55)':f.kind==='upgrade'?'rgba(255,242,189,.58)':'rgba(245,242,232,.35)';g.lineWidth=1;g.stroke();g.fillStyle=f.kind==='coin'?'#ffe29b':f.kind==='upgrade'?'#fff2bd':'#f5f2e8';g.fillText(text,0,1);g.restore();
  }
  g.globalAlpha=1;g.textBaseline='alphabetic';
}
