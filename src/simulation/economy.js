import { MARKET_TRADE } from '../buildings/markets.js';
import { BAKERY_MILL_R, BAKERY_YIELD } from '../buildings/bakeries.js';
import { CAFE_TRADE } from '../buildings/cafes.js';
import { MILL_BASE } from '../buildings/windmills.js';
import { services } from '../core/services.js';
import { S } from '../core/state.js';
import { PAL } from '../world/seasons.js';
import { activeFestival } from '../world/festivals.js';

/* ---------- economy & clock ---------- */
export function payday(){
  const tax=Math.round(S.pop*2.6*(0.55+S.mood/140));
  // markets lift what the trades around them take
  const markets=S.ctx.markets.length;
  const lift=1+Math.min(markets*MARKET_TRADE,MARKET_TRADE*3);
  const cafeTake=(S._cafes||0)*CAFE_TRADE;
  // a bakery only runs at full tilt with a windmill within reach of it
  let bakeTake=0;
  for(const bk of S.ctx.bakeries){
    const supplied=S.ctx.mills.some(w=>Math.abs(w.x-bk.x)<=BAKERY_MILL_R&&Math.abs(w.y-bk.y)<=BAKERY_MILL_R);
    bakeTake+=supplied?BAKERY_YIELD:Math.round(BAKERY_YIELD/2);
  }
  const trade=Math.round((cafeTake+bakeTake)*lift);
  // windmills grind steadily, and best of all at harvest
  const mills=S.ctx.mills.length;
  const milled=Math.round(mills*(MILL_BASE+(PAL.yield||0)));
  const grant=18;
  // a festival puts a little extra through every till
  const fest=activeFestival();
  const feast=fest?Math.round((tax+trade+milled)*fest.purse):0;
  const total=tax+trade+milled+grant+feast;
  S.coins+=total;
  S.lastPay={tax,trade,milled,grant,feast,total};
  services.toast("Day "+S.day+" \u00b7 +"+total+" coins","gold");
  services.blip(660,0.2,"triangle");
  if(mills&&(PAL.yield||0)>=MILL_BASE) services.toast("A good harvest at the mill");
}
// next rung of a ladder that's still ahead of where you already are
