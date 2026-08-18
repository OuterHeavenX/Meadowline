import { COST, DIRS } from '../core/constants.js';
import { services } from '../core/services.js';
import { S, at, idx, inBounds, isType } from '../core/state.js';

/* ---------- building placement ---------- */
export const BUILDABLE={road:1,rail:1,house:1,cafe:1,park:1,tree:1,lamp:1,mill:1,station:1};
export const SPANS={road:1,rail:1};        // only these two can reach across water

export function isWater(x,y){ return inBounds(x,y)&&S.terr[idx(x,y)]===1; }
export function isBridge(x,y){ const b=at(x,y); return !!b&&SPANS[b.type]&&isWater(x,y); }
// A span over water costs three times what it does on dry ground.
export function costOf(kind,x,y){ return COST[kind]*(SPANS[kind]&&isWater(x,y)?3:1); }

export function canPlace(kind,x,y){
  if(!inBounds(x,y)) return {ok:false};
  const i=idx(x,y);
  if(S.terr[i]===1&&!SPANS[kind]) return {ok:false,why:"Only roads and rails can cross the water."};
  const cur=S.grid[i];
  if(cur){
    if(cur.type===kind) return {ok:false};
    return {ok:false,why:"Something's already there \u2014 remove it first."};
  }
  if(kind==="station"){
    let touching=false;
    for(const[dx,dy]of DIRS) if(isType(x+dx,y+dy,"rail")) touching=true;
    if(!touching) return {ok:false,why:"Stations have to touch a rail tile."};
  }
  const c=costOf(kind,x,y);
  if(S.coins<c){
    return {ok:false,why:S.terr[i]===1
      ? "A bridge across costs "+c+" \u2014 not enough coins yet."
      : "Not enough coins yet \u2014 wait for the next payday."};
  }
  return {ok:true};
}

export function place(kind,x,y){
  const r=canPlace(kind,x,y);
  if(!r.ok){ if(r.why) services.hint(r.why,true); return false; }
  const i=idx(x,y);
  S.coins-=costOf(kind,x,y);
  S.natTree[i]=0;
  S.grid[i]={type:kind,x,y,seed:((x*73856093)^(y*19349663))>>>0,pop:0,grow:0,mood:50,linked:false};
  services.puff(x,y);
  services.blip(kind==="house"?520:kind==="park"?400:kind==="mill"?300:340);
  return true;
}

export function erase(x,y){
  if(!inBounds(x,y)) return false;
  const i=idx(x,y);
  const b=S.grid[i];
  if(!b){
    if(S.natTree[i]){ S.natTree[i]=0; services.puff(x,y); services.blip(240); return true; }
    return false;
  }
  S.coins+=Math.floor(costOf(b.type,x,y)/2);
  S.grid[i]=null;
  services.puff(x,y);
  services.blip(220);
  return true;
}
