import { WONDERS } from '../buildings/wonders.js';
import { DOCK_BOATS } from '../buildings/docks.js';
import { DIRS, clamp, lerp } from '../core/constants.js';
import { S } from '../core/state.js';
import { stepWhere } from '../transport/pathfinding.js';
import { isWater } from '../world/tiles.js';

/* Boats sail open water the same way trains ride rails: the same step rule,
   with "passable" meaning a water tile rather than a rail tile. They put out
   from docks, so no dock means no boats. */
const sailable=(x,y)=>isWater(x,y);

const HULLS=[["#c96a5c","#a8503f"],["#5d8fa8","#4a7389"],["#e6dcc6","#c3b590"],["#7fa887","#5f8b6a"]];

function launchPoint(){
  const docks=S.ctx.docks;
  if(!docks.length) return null;
  const d=docks[(Math.random()*docks.length)|0];
  const open=[];
  for(const[dx,dy] of DIRS) if(sailable(d.x+dx,d.y+dy)) open.push([d.x+dx,d.y+dy]);
  if(!open.length) return null;
  return open[(Math.random()*open.length)|0];
}

export function updateBoats(dt){
  const beacon=S.ctx.wonders.some(w=>w.type==="lighthouse")?WONDERS.lighthouse.boats:0;
  const want=clamp(S.ctx.docks.length*DOCK_BOATS+beacon,0,10);
  if(S.boats.length<want&&Math.random()<dt*1.1){
    const start=launchPoint();
    if(start){
      const n=stepWhere(start[0],start[1],-9,-9,sailable);
      if(n) S.boats.push({
        x:start[0],y:start[1],px:start[0],py:start[1],nx:n[0],ny:n[1],p:0,
        sp:0.30+Math.random()*0.22, hue:(Math.random()*HULLS.length)|0,
        bob:Math.random()*6.283, wake:[]
      });
    }
  }
  while(S.boats.length>want) S.boats.pop();

  for(let i=S.boats.length-1;i>=0;i--){
    const t=S.boats[i];
    let aground=false;
    t.p+=dt*t.sp;
    while(t.p>=1){
      t.p-=1;
      t.px=t.x; t.py=t.y; t.x=t.nx; t.y=t.ny;
      if(!sailable(t.x,t.y)){ aground=true; break; }
      const n=stepWhere(t.x,t.y,t.px,t.py,sailable);
      if(!n){ aground=true; break; }
      t.nx=n[0]; t.ny=n[1];
    }
    if(aground){ S.boats.splice(i,1); continue; }
    t.fx=lerp(t.x,t.nx,t.p); t.fy=lerp(t.y,t.ny,t.p);
    // wake is sampled by distance, so it keeps its spacing at any speed
    const head=t.wake[0];
    if(!head||Math.hypot(head.x-t.fx,head.y-t.fy)>0.08){
      t.wake.unshift({x:t.fx,y:t.fy});
      if(t.wake.length>14) t.wake.length=14;
    }
  }
}

export { HULLS };
