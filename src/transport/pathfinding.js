import { DIRS } from '../core/constants.js';
import { isType } from '../world/tiles.js';

/* The no-backtracking step rule: prefer any exit that is not the way you came,
   and only reverse at a dead end. Trains, citizens and boats all share it —
   they differ only in what counts as passable. */
export function stepWhere(x,y,px,py,passable){
  const opts=[],back=[];
  for(const[dx,dy]of DIRS){
    const nx=x+dx,ny=y+dy;
    if(!passable(nx,ny)) continue;
    if(nx===px&&ny===py) back.push([nx,ny]); else opts.push([nx,ny]);
  }
  const pool=opts.length?opts:back;
  if(!pool.length) return null;
  return pool[(Math.random()*pool.length)|0];
}

export function stepFrom(x,y,px,py,type){
  return stepWhere(x,y,px,py,(nx,ny)=>isType(nx,ny,type));
}
