import { H, W } from '../core/constants.js';
import { S } from '../core/state.js';
import { idx, isType } from '../world/tiles.js';

/* ---------- trains ---------- */
export function railTiles(){
  const out=[];
  for(let y=0;y<H;y++) for(let x=0;x<W;x++) if(isType(x,y,'rail')){
    const b=S.grid[idx(x,y)];
    out.push({x,y,b});
  }
  return out;
}
