import { S, reduceMotion } from '../core/state.js';
import { g } from './terrain.js';
import { proj } from '../world/map.js';
export function drawFeedback(ctx=g){
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='700 12px system-ui';
  for(const f of S.feedback||[]){
    const p=proj(f.x,f.y),t=f.age/f.life,ease=reduceMotion?1:Math.min(1,f.age/.18),rise=reduceMotion?8:f.age*15,y=p.y-28*S.cam.z-rise*S.cam.z,alpha=Math.max(0,Math.min(1,ease*(1-t)*1.7)),text=f.kind==='coin'?'● '+f.text:f.text,w=Math.max(34,ctx.measureText(text).width+14),h=20;
    ctx.save();ctx.globalAlpha=alpha;ctx.translate(p.x,y);ctx.scale(.88+.12*ease,.88+.12*ease);ctx.fillStyle=f.kind==='coin'?'rgba(67,55,28,.82)':f.kind==='upgrade'?'rgba(74,61,36,.86)':'rgba(35,48,44,.82)';ctx.beginPath();ctx.roundRect(-w/2,-h/2,w,h,8);ctx.fill();ctx.strokeStyle=f.kind==='coin'?'rgba(255,226,155,.55)':f.kind==='upgrade'?'rgba(255,242,189,.58)':'rgba(245,242,232,.35)';ctx.lineWidth=1;ctx.stroke();ctx.fillStyle=f.kind==='coin'?'#ffe29b':f.kind==='upgrade'?'#fff2bd':'#f5f2e8';ctx.fillText(text,0,1);ctx.restore();
  }
  ctx.globalAlpha=1;ctx.textBaseline='alphabetic';
}
