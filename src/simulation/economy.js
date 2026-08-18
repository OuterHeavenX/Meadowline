import { CAFE_TRADE } from '../buildings/cafes.js';
import { MILL_BASE } from '../buildings/windmills.js';
import { services } from '../core/services.js';
import { S } from '../core/state.js';
import { PAL } from '../world/seasons.js';

/* ---------- economy & clock ---------- */
export function payday(){
  const tax=Math.round(S.pop*2.6*(0.55+S.mood/140));
  const trade=(S._cafes||0)*CAFE_TRADE;
  // windmills grind steadily, and best of all at harvest
  const mills=S.ctx.mills.length;
  const milled=Math.round(mills*(MILL_BASE+(PAL.yield||0)));
  const grant=18;
  const total=tax+trade+milled+grant;
  S.coins+=total;
  S.lastPay={tax,trade,milled,grant,total};
  services.toast("Day "+S.day+" \u00b7 +"+total+" coins","gold");
  services.blip(660,0.2,"triangle");
  if(mills&&(PAL.yield||0)>=MILL_BASE) services.toast("A good harvest at the mill");
}
// next rung of a ladder that's still ahead of where you already are
