import { S } from '../core/state.js';
import { at, isWater } from '../world/tiles.js';

export const SPANS={road:1,rail:1};        // only these two can reach across water

export function isBridge(x,y){ const b=at(x,y); return !!b&&SPANS[b.type]&&isWater(x,y); }

export function countBridges(){
  let n=0;
  for(let i=0;i<S.grid.length;i++){
    const b=S.grid[i];
    if(b&&SPANS[b.type]&&S.terr[i]===1) n++;
  }
  return n;
}
