import { DIRS } from '../core/constants.js';
import { S } from '../core/state.js';
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

/* Shortest walk between two tiles over whatever counts as passable. Breadth
   first: the grid is 44x44, so a full sweep is a couple of thousand steps and
   a citizen only re-plans when they arrive somewhere. */
export function findPath(sx,sy,tx,ty,passable,limit=4000){
  if(S.diagnostics&&S.diagnostics.enabled) S.diagnostics.pathSearches++;
  if(sx===tx&&sy===ty) return [];
  const seen=new Map(), q=[[sx,sy]];
  seen.set(sx+','+sy,null);
  for(let head=0; head<q.length && head<limit; head++){
    const[x,y]=q[head];
    for(const[dx,dy] of DIRS){
      const nx=x+dx, ny=y+dy, k=nx+','+ny;
      if(seen.has(k)||!passable(nx,ny)) continue;
      seen.set(k,[x,y]);
      if(nx===tx&&ny===ty){
        const out=[]; let cur=[nx,ny];
        while(cur){ out.push(cur); cur=seen.get(cur[0]+','+cur[1]); }
        out.pop();
        return out.reverse();
      }
      q.push([nx,ny]);
    }
  }
  return null;
}
