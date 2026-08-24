import { H, W } from '../core/constants.js';
import { S } from '../core/state.js';

export function idx(x,y){return y*W+x;}

export function inBounds(x,y){return x>=0&&y>=0&&x<W&&y<H;}

export function at(x,y){return inBounds(x,y)?S.grid[idx(x,y)]:null;}

export function isRoadRailCrossing(b){ return !!b&&!!b.state?.roadRailCrossing&&(b.type==='road'||b.type==='rail'); }

export function isType(x,y,t){
  const b=at(x,y);
  if(!b) return false;
  if(b.type===t) return true;
  return isRoadRailCrossing(b)&&(t==='road'||t==='rail');
}

export function isWater(x,y){ return inBounds(x,y)&&S.terr[idx(x,y)]===1; }

/* ---------- wishes: gentle goals, never a deadline ---------- */
export function countType(t){
  let n=0;
  for(let i=0;i<S.grid.length;i++){
    const b=S.grid[i];
    if(!b) continue;
    if(b.type===t||(isRoadRailCrossing(b)&&(t==='road'||t==='rail'))) n++;
  }
  return n;
}

export function hasWater(){
  for(let i=0;i<S.terr.length;i++) if(S.terr[i]===1) return true;
  return false;
}
