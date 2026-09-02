import { grossOf, upkeepTotal, wonderOutputBonus } from './economics.js';
import { MARKET_TRADE } from '../buildings/markets.js';
import { services } from '../core/services.js';
import { S } from '../core/state.js';
import { activeFestival } from '../world/festivals.js';

/* ---------- economy & clock ---------- */
export function payday(){
  const e=S.econ;
  const tax=Math.round(S.pop*2.6*(0.55+S.mood/140));

  // markets lift what the trades around them take, and the clock tower lifts
  // everything a little; short-handed trades produce less
  const markets=S.ctx.markets.length;
  const lift=1+Math.min(markets*MARKET_TRADE,MARKET_TRADE*3)+wonderOutputBonus();
  let gross=0;
  for(const b of S.ctx.all) gross+=grossOf(b);
  const trade=Math.round(gross*lift*e.staffing);

  const grant=18;
  const fest=activeFestival();
  const feast=fest?Math.round((tax+trade)*fest.purse):0;
  const upkeep=Math.round(upkeepTotal());

  const income=tax+trade+grant+feast;
  const total=income-upkeep;
  S.coins+=total;
  e.upkeep=upkeep; e.income=income; e.net=total;
  if(S.coins<0){ S.coins=0; e.broke=true; } else e.broke=false;

  S.lastPay={tax,trade,grant,feast,upkeep,total};
  services.toast("Day "+S.day+" \u00b7 "+(total>=0?"+":"\u2212")+Math.abs(total)+" coins",total>=0?"gold":"");
  services.blip(total>=0?660:220,0.2,"triangle");
  if(e.broke) services.toast("The treasury is empty \u2014 upkeep outruns the takings");
  else if(fest&&feast) services.toast(fest.name+" put "+feast+" extra through the tills");
}
// next rung of a ladder that's still ahead of where you already are
