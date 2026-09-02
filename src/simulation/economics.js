import { BAKERY_MILL_R } from '../buildings/bakeries.js';
import { CAFE_TRADE } from '../buildings/cafes.js';
import { FARM_FIELD_NEED, FARM_FIELD_R, FARM_YIELD } from '../buildings/farms.js';
import { INN_TRAVEL_CAP, INN_TRAVEL_R, INN_YIELD } from '../buildings/inns.js';
import { MARKET_TRADE } from '../buildings/markets.js';
import { SAW_WOOD_NEED, SAW_WOOD_R, SAW_YIELD } from '../buildings/sawmills.js';
import { MILL_BASE } from '../buildings/windmills.js';
import { SHOP_MARKET_R, SHOP_YIELD } from '../buildings/workshops.js';
import { WONDERS } from '../buildings/wonders.js';
import { clamp } from '../core/constants.js';
import { S } from '../core/state.js';
import { PAL } from '../world/seasons.js';
import { idx, inBounds, isType } from '../world/tiles.js';

/* ============================================================
   THE BALANCE SHEET

   Mood radii live with each building, because that is how a building feels.
   These two tables live together, because an economy is balanced by reading
   all of its numbers at once.
   ============================================================ */

export const JOBS={
  cafe:4, market:8, bakery:5, mill:4, farm:6, sawmill:5, workshop:7, inn:6,
  school:6, clinic:5, station:5, dock:3, park:1,
  clocktower:2, lighthouse:2, library:4, statue:0
};

export const UPKEEP={
  road:0.05, rail:0.2, house:1, tree:0, lamp:0.4, well:0.3, park:2,
  cafe:3, market:6, bakery:4, mill:4, farm:3, sawmill:4, workshop:5, inn:6,
  school:7, clinic:8, station:6, dock:3,
  statue:6, clocktower:10, lighthouse:12, library:16
};

const anyWithin=(list,x,y,r)=>list.some(b=>Math.abs(b.x-x)<=r&&Math.abs(b.y-y)<=r);
const countWithin=(list,x,y,r)=>list.reduce((n,b)=>n+(Math.abs(b.x-x)<=r&&Math.abs(b.y-y)<=r?1:0),0);

// open, unbuilt, dry ground around a farm — its fields
function fieldsAround(b){
  let n=0;
  for(let dy=-FARM_FIELD_R;dy<=FARM_FIELD_R;dy++)for(let dx=-FARM_FIELD_R;dx<=FARM_FIELD_R;dx++){
    const x=b.x+dx, y=b.y+dy;
    if(!inBounds(x,y)) continue;
    const i=idx(x,y);
    if(S.terr[i]!==1&&!S.grid[i]) n++;
  }
  return n;
}
function woodAround(b){
  let n=0;
  for(let dy=-SAW_WOOD_R;dy<=SAW_WOOD_R;dy++)for(let dx=-SAW_WOOD_R;dx<=SAW_WOOD_R;dx++){
    const x=b.x+dx, y=b.y+dy;
    if(!inBounds(x,y)) continue;
    if(S.natTree[idx(x,y)]||isType(x,y,"tree")) n++;
  }
  return n;
}

/* How well a producer is supplied, 0..1. The chain is farm -> windmill ->
   bakery: each link runs at half output without the one before it. */
export function supplyOf(b){
  const c=S.ctx;
  switch(b.type){
    case "farm":     return clamp(fieldsAround(b)/FARM_FIELD_NEED,0,1);
    case "mill":     return anyWithin(c.farms,b.x,b.y,6)?1:0.5;
    case "bakery":   return anyWithin(c.mills,b.x,b.y,BAKERY_MILL_R)?1:0.5;
    case "sawmill":  return clamp(woodAround(b)/SAW_WOOD_NEED,0,1);
    case "workshop": return anyWithin(c.markets,b.x,b.y,SHOP_MARKET_R)?1:0.5;
    case "inn":      return clamp(countWithin(c.stations.concat(c.docks),b.x,b.y,INN_TRAVEL_R)/INN_TRAVEL_CAP,0,1);
    default:         return 1;
  }
}

// what one building brings in per day before staffing and market lift
export function grossOf(b){
  switch(b.type){
    case "cafe":     return CAFE_TRADE;
    case "farm":     return FARM_YIELD*supplyOf(b);
    case "mill":     return (MILL_BASE+(PAL.yield||0))*supplyOf(b);
    case "bakery":   return 16*supplyOf(b);
    case "sawmill":  return SAW_YIELD*supplyOf(b);
    case "workshop": return SHOP_YIELD*2*supplyOf(b);
    case "inn":      return INN_YIELD*INN_TRAVEL_CAP*supplyOf(b);
    default:         return 0;
  }
}

/* Work: every trade offers jobs, every resident wants one. Too few jobs and
   the mood suffers; too few residents and the trades run short-handed. */
export function tallyWork(){
  let jobs=0;
  for(const b of S.ctx.all) jobs+=JOBS[b.type]||0;
  const workers=S.pop;
  const employed=Math.min(jobs,workers);
  S.econ.jobs=jobs;
  S.econ.employed=employed;
  S.econ.idle=Math.max(0,workers-employed);
  S.econ.unemployment=workers>0?(workers-employed)/workers:0;
  S.econ.staffing=jobs>0?clamp(employed/jobs,0,1):1;
  return S.econ;
}

export function upkeepTotal(){
  let up=0;
  for(const b of S.ctx.all) up+=UPKEEP[b.type]||0;
  return up;
}

// the clock tower makes every trade in the valley a little more productive
export function wonderOutputBonus(){
  return S.ctx.wonders.some(w=>w.type==="clocktower")?WONDERS.clocktower.output:0;
}
