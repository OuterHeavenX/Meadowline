import { DIRS } from '../core/constants.js';
import { isType } from '../world/tiles.js';

export function stepFrom(x,y,px,py,type){
  const opts=[],back=[];
  for(const[dx,dy]of DIRS){
    const nx=x+dx,ny=y+dy;
    if(!isType(nx,ny,type)) continue;
    if(nx===px&&ny===py) back.push([nx,ny]); else opts.push([nx,ny]);
  }
  const pool=opts.length?opts:back;
  if(!pool.length) return null;
  return pool[(Math.random()*pool.length)|0];
}
