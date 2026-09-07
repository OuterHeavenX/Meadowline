import { BUILDING_UPKEEP, getBuildingDefinition } from '../buildings/registry.js';
import { S } from '../core/state.js';
import { isFacilityPart } from '../world/tiles.js';

/* ---------- upkeep ----------
   Every payday the town pays to keep what it has built. This is what stops a
   valley from being filled in an afternoon: land is cheap and one-off, but a
   service you cannot afford to run is a service you should not have built
   yet. Roads, trees and lamps are free to keep — the fabric of the town is
   not a line on its budget.

   An upgraded building costs more to run than the one it replaced, so a Level
   2 School or a City Hall is a commitment rather than a free improvement. */
export function upkeepOf(b){
  if(!b||isFacilityPart(b)) return 0;
  /* A home is free to keep until it is a grand one. Cottages through
     Established Homes cost the town nothing; a Mansion and an Estate are a
     standing bill, which is what stops a valley from simply being paved in
     them once it can afford the first. The figure lives on the tier in the
     registry beside the tax it pays, so the two are read together. */
  if(b.type==='house'){
    const tiers=getBuildingDefinition('house')?.housing?.tiers||[];
    const tier=tiers[Math.max(0,Math.min(tiers.length-1,(Math.floor(Number(b.state?.housingTier)||1))-1))];
    return Math.max(0,Math.floor(Number(tier?.upkeep)||0));
  }
  const base=BUILDING_UPKEEP[b.type]||0;
  if(!base) return 0;
  const def=getBuildingDefinition(b.type);
  if(!def?.upgrades?.length) return base;
  const level=Math.max(1,Math.floor(Number(b.state?.level)||1));
  // Each rung above the first adds a third again, which keeps the curve legible
  // without every upgrade needing its own number to maintain.
  return Math.round(base*(1+(Math.min(level,def.upgrades.length)-1)*0.34));
}

export function upkeepTotal(){
  let total=0;
  for(const b of S.grid||[]) total+=upkeepOf(b);
  return Math.round(total);
}

// The same total, split the way the Finances panel reads it back.
export function upkeepBreakdown(){
  const by={};
  let total=0;
  for(const b of S.grid||[]){
    const u=upkeepOf(b); if(!u) continue;
    const cat=getBuildingDefinition(b.type)?.category||'other';
    by[cat]=(by[cat]||0)+u; total+=u;
  }
  return {total:Math.round(total),by};
}
