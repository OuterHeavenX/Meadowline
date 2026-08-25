import { S, reduceMotion } from '../core/state.js';
export const FEEDBACK_LIMIT=24;
export function emitFeedback(x,y,kind,text){
  if(!Number.isFinite(x)||!Number.isFinite(y)) return null;
  const nearby=(S.feedback||[]).find(f=>f.kind===kind&&Math.abs(f.x-x)<2&&Math.abs(f.y-y)<2&&f.age<.7);
  if(nearby&&kind==='coin'){ nearby.amount=(nearby.amount||0)+(Number(text)||0); nearby.text='+'+nearby.amount; return nearby; }
  const f={x,y,kind,text:String(text||''),age:0,life:reduceMotion?1.1:1.8}; S.feedback.push(f);
  if(S.feedback.length>FEEDBACK_LIMIT) S.feedback.splice(0,S.feedback.length-FEEDBACK_LIMIT); return f;
}
export function updateFeedback(dt){ for(const f of S.feedback)f.age+=dt; S.feedback=S.feedback.filter(f=>f.age<f.life); }
