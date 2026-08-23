import { TAU, clamp } from '../core/constants.js';
import { S } from '../core/state.js';

export function shortTime(){
  const t=S.dayT;
  if(t<0.22) return "Dawn";
  if(t<0.42) return "Morn";
  if(t<0.60) return "Noon";
  if(t<0.74) return "Dusk";
  return "Night";
}

export function timeName(){
  const t=S.dayT;
  if(t<0.22) return "Dawn";
  if(t<0.42) return "Morning";
  if(t<0.60) return "Afternoon";
  if(t<0.74) return "Dusk";
  return "Night";
}

/* ---------- night curve ---------- */
export function darkness(){
  const t=S.dayT;
  // 0 at midday (dayT 0.48), rising to ~0.62 in the small hours
  const d=0.5-Math.cos((t-0.48)*TAU)*0.5;
  return Math.pow(clamp(d,0,1),1.6)*0.62;
}
