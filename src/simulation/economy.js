import { MARKET_TRADE } from '../buildings/markets.js';
import { BAKERY_MILL_R, BAKERY_YIELD } from '../buildings/bakeries.js';
import { CAFE_TRADE } from '../buildings/cafes.js';
import { MILL_BASE } from '../buildings/windmills.js';
import { FARM_MILL_R, FARM_YIELD } from '../buildings/farms.js';
import { DOCK_YIELD } from '../buildings/docks.js';
import { wonderDockLift, wonderTradeLift } from '../buildings/wonders.js';
import { upkeepTotal } from './upkeep.js';
import { services } from '../core/services.js';
import { S } from '../core/state.js';
import { housingTaxMultiplier } from './housing.js';
import { PAL } from '../world/seasons.js';
import { activeFestival } from '../world/festivals.js';
import { emitFeedback } from './feedback.js';

/* ---------- economy & clock ---------- */
export function payday(){
  // Tier 1 preserves the old tax curve exactly. Improved homes contribute a
  // modest multiplier, so residential evolution matters without exploding income.
  const weightedResidents=(S.ctx.houses||[]).reduce((n,h)=>n+(h.pop||0)*housingTaxMultiplier(h),0);
  const tax=Math.round(weightedResidents*2.6*(0.55+S.mood/140));
  // Markets lift the trades around them; a Clock Tower lifts every till in the
  // valley on top of that.
  const markets=S.ctx.markets.length;
  const lift=(1+Math.min(markets*MARKET_TRADE,MARKET_TRADE*3))*wonderTradeLift(S.ctx);
  const cafeTake=(S._cafes||0)*CAFE_TRADE;
  // a bakery only runs at full tilt with a windmill within reach of it
  let bakeTake=0;
  for(const bk of S.ctx.bakeries){
    const supplied=S.ctx.mills.some(w=>Math.abs(w.x-bk.x)<=BAKERY_MILL_R&&Math.abs(w.y-bk.y)<=BAKERY_MILL_R);
    bakeTake+=supplied?BAKERY_YIELD:Math.round(BAKERY_YIELD/2);
  }
  const trade=Math.round((cafeTake+bakeTake)*lift);
  // The chain runs farm to windmill to bakery. A windmill grinds steadily, and
  // best of all at harvest, but on bought-in grain at half yield unless a farm
  // is within reach of it — the same rule the bakery has always had about
  // mills, now with something standing behind it.
  const mills=S.ctx.mills.length;
  let milled=0;
  for(const w of S.ctx.mills){
    const supplied=(S.ctx.farms||[]).some(f=>Math.abs(f.x-w.x)<=FARM_MILL_R&&Math.abs(f.y-w.y)<=FARM_MILL_R);
    const yield_=MILL_BASE+(PAL.yield||0);
    milled+=supplied?yield_:yield_/2;
  }
  // Farms take their own share of the harvest bonus: a bad season is felt at
  // the top of the chain first.
  const grown=Math.round((S.ctx.farms||[]).length*(FARM_YIELD+(PAL.yield||0)));
  milled=Math.round(milled);
  // Docks are worth working once the boats can find their way in.
  const harbour=Math.round((S.ctx.docks||[]).length*DOCK_YIELD*wonderDockLift(S.ctx));
  const grant=18;
  // a festival puts a little extra through every till
  const fest=activeFestival();
  const feast=fest?Math.round((tax+trade+milled+grown+harbour)*fest.purse):0;
  // What the town pays to keep what it has built.
  const upkeep=upkeepTotal();
  const income=tax+trade+milled+grown+harbour+grant+feast;
  let total=income-upkeep;
  // A town that cannot meet its upkeep would otherwise spiral with no way back,
  // so the county covers the shortfall exactly - loudly, and never a coin more,
  // so the treasury sits at zero until the player fixes what is wrong.
  const relief=Math.max(0,Math.round(-(S.coins+total)));
  total+=relief;
  S.coins+=total;
  S.lastPay={tax,trade,milled,grown,harbour,grant,feast,upkeep,relief,income,total};
  // Payday used to raise one coin badge on one rotating house, which read as a
  // stray blip rather than the town being paid. A handful of homes light up,
  // and the window walks the city so a different street pays each day.
  const homes=(S.ctx.houses||[]).filter(h=>h.pop>0);
  if(homes.length&&tax){
    const each=Math.max(1,Math.round(tax/homes.length)),shown=Math.min(homes.length,5);
    for(let i=0;i<shown;i++){
      const h=homes[(S.day*shown+i)%homes.length];
      emitFeedback(h.x,h.y,'coin',each);
    }
  }
  services.toast("Day "+S.day+" · "+(total<0?"":"+")+total+" coins","gold");
  services.blip(660,0.2,"triangle");
  if(relief) services.toast("The county covered "+relief+" coins of upkeep","warn");
  else if(upkeep>income*0.8) services.toast("Upkeep is eating the town's income");
  if(mills&&(PAL.yield||0)>=MILL_BASE) services.toast("A good harvest at the mill");
}
// next rung of a ladder that's still ahead of where you already are
