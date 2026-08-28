import { S } from '../core/state.js';
import { invalidateMobility } from '../simulation/mobility.js';
import { invalidateRecreation } from '../simulation/recreation.js';
import { invalidateCitySummary } from '../simulation/city-summary.js';
import { isFootprintUnlocked } from '../progression/city-growth.js';
import { idx, inBounds } from './tiles.js';

export const WATER_COST=6;

export function canPaintWater(x,y){
  if(!inBounds(x,y)) return {ok:false,why:'That is outside Meadowline.'};
  if(!isFootprintUnlocked(x,y,1,1)) return {ok:false,why:'Open this land before shaping it.'};
  const i=idx(x,y);
  if(S.terr[i]===1) return {ok:false,why:'This tile is already water.'};
  if(S.grid[i]) return {ok:false,why:'Clear buildings, Roads and Rail before adding water.'};
  if(S.coins<WATER_COST) return {ok:false,why:'Not enough coins to shape this pond.'};
  return {ok:true};
}

export function paintWater(x,y){
  const result=canPaintWater(x,y);
  if(!result.ok) return result;
  const i=idx(x,y); S.coins-=WATER_COST; S.terr[i]=1; S.natTree[i]=0;
  invalidateMobility(); invalidateRecreation(); invalidateCitySummary();
  return {ok:true,cost:WATER_COST};
}

/* ---------- undoing a pond ----------
   Water was a one-way mutation: paint is a hold-and-drag tool, so one slipped
   gesture flooded a run of opened land permanently, on ground the player may
   have paid hundreds of coins to open. Generated ponds stay authoritative
   terrain; only what the player added is theirs to take back.

   `S.natWater` is the seed's own water, snapshotted by genWorld. It needs no
   save field because the seed regenerates the same natural terrain on load,
   and restoreTerrain then replays the player's edits over the top. */
export function playerWaterAt(x,y){
  if(!inBounds(x,y)) return false;
  const i=idx(x,y);
  if(S.terr?.[i]!==1) return false;
  if(!S.natWater||S.natWater.length!==S.terr.length) return false;
  return !S.natWater[i];
}

export function removePlayerWater(x,y){
  if(!playerWaterAt(x,y)) return {ok:false,why:'This water is part of the valley itself.'};
  if(!isFootprintUnlocked(x,y,1,1)) return {ok:false,why:'Open this land before reshaping it.'};
  const i=idx(x,y);
  S.terr[i]=0;
  S.coins+=Math.floor(WATER_COST/2);
  invalidateMobility(); invalidateRecreation(); invalidateCitySummary();
  return {ok:true,refund:Math.floor(WATER_COST/2)};
}

export function packTerrain(){ let out=''; for(const v of S.terr||[]) out+=v?'1':'0'; return out; }
export function restoreTerrain(value){
  if(typeof value!=='string'||value.length!==S.terr?.length) return false;
  for(let i=0;i<value.length;i++) S.terr[i]=value[i]==='1'?1:0;
  return true;
}
