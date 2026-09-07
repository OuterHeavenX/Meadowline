import { getBuildingDefinition } from '../buildings/registry.js';
import { VENDOR_GREEN_R, VENDOR_LEARN_R, VENDOR_VARIETIES } from '../buildings/vendors.js';
import { S } from '../core/state.js';

/* What a trade takes, and how much a street feels it.

   Both read the registry rather than naming buildings, so a shop or a stall
   added later is picked up by the till and by desirability without either
   being told. A definition may declare `varieties`, in which case the one the
   building settled on overrides the base numbers — that is the whole of the
   special handling street vendors need. */
export function tradeYield(b){
  const def=getBuildingDefinition(b?.type);
  if(!def?.trade) return 0;
  const v=varietyOf(b);
  return Number.isFinite(v?.yield)?v.yield:(Number(def.trade.yield)||0);
}
export function tradePresence(b){
  const def=getBuildingDefinition(b?.type);
  if(!def?.trade) return 0;
  const v=varietyOf(b);
  if(Number.isFinite(v?.presence)) return v.presence;
  return Number.isFinite(def.trade.presence)?def.trade.presence:2;
}
export function varietyOf(b){
  const def=getBuildingDefinition(b?.type);
  if(!def?.varieties?.length) return null;
  return def.varieties.find(v=>v.id===b?.state?.variety)||def.varieties[0];
}

const near=(list,b,r)=>{
  let n=0;
  for(const o of list||[]) if(Math.max(Math.abs(o.x-b.x),Math.abs(o.y-b.y))<=r) n++;
  return n;
};
// Anywhere people read: a school, a bookshop, anything declaring education.
function learningNear(b,r){
  let n=0;
  for(const list of [S.ctx?.schools,S.ctx?.shops])
    for(const o of list||[])
      if(getBuildingDefinition(o.type)?.service?.type==='education'
        &&Math.max(Math.abs(o.x-b.x),Math.abs(o.y-b.y))<=r) n++;
  return n;
}

/* The street's decision, in order. Flowers win over newspapers where a pitch
   sits between a green and a school, because the people passing a green are
   already out for the walk. Nothing else qualifying leaves a food cart, which
   is what a pitch on an ordinary street becomes. */
export function decideVendorVariety(b){
  if(near(S.ctx?.parks,b,VENDOR_GREEN_R)+near(S.ctx?.recreation,b,VENDOR_GREEN_R)>0) return 'flowerStall';
  if(learningNear(b,VENDOR_LEARN_R)>0) return 'newsstand';
  return 'foodCart';
}

/* Run at the end of every recompute, over anything the registry says has
   varieties. A pitch is not frozen at the moment it was placed: build a green
   beside a food cart and it is a flower stall the same day. */
export function settleVarieties(){
  for(const b of S.ctx?.shops||[]){
    if(!getBuildingDefinition(b.type)?.varieties?.length) continue;
    const chosen=decideVendorVariety(b);
    if(b.state&&b.state.variety!==chosen) b.state.variety=chosen;
  }
}
/* Why this pitch is what it is, in the words the rule above is written in.
   The player never chose it, so the Look card has to be able to say. */
export function varietyReason(b){
  if(!getBuildingDefinition(b?.type)?.varieties?.length) return '';
  const id=b?.state?.variety;
  if(id==='flowerStall') return 'A green within '+VENDOR_GREEN_R+' tiles is why it sells flowers.';
  if(id==='newsstand') return 'Somewhere people read, within '+VENDOR_LEARN_R+' tiles, is why it sells papers.';
  return 'Nothing nearby has claimed this pitch, so it sells hot food. Open a green beside it and it will be a flower stall by tomorrow.';
}
export const VARIETY_IDS=VENDOR_VARIETIES.map(v=>v.id);
