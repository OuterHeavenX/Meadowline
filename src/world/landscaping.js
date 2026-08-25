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

export function packTerrain(){ let out=''; for(const v of S.terr||[]) out+=v?'1':'0'; return out; }
export function restoreTerrain(value){
  if(typeof value!=='string'||value.length!==S.terr?.length) return false;
  for(let i=0;i<value.length;i++) S.terr[i]=value[i]==='1'?1:0;
  return true;
}
