import { S } from '../core/state.js';

/* ---------- trains ---------- */
export function railTiles(){
  const out=[];
  for(let i=0;i<S.grid.length;i++){const b=S.grid[i]; if(b&&b.type==="rail") out.push(b);}
  return out;
}
