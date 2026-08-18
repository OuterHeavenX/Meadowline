import { TAU, clamp } from '../core/constants.js';
import { S } from '../core/state.js';
import { stepFrom } from '../transport/pathfinding.js';
import { roadNear } from '../transport/roads.js';
import { isType } from '../world/tiles.js';

export const SHIRTS=["#e8735f","#5d8fc4","#e0b451","#6fae7c","#c273a8","#e9e2cf","#7a6fb5"];

export function spawnCitizen(){
  const homes=S.ctx.houses;
  if(!homes.length) return;
  const h=homes[(Math.random()*homes.length)|0];
  if(!h.linked||h.pop<=0) return;
  const r=roadNear(h.x,h.y); if(!r) return;
  S.citizens.push({
    x:r.x,y:r.y,px:r.x,py:r.y,nx:r.x,ny:r.y,p:1,
    sp:0.42+Math.random()*0.3,
    col:SHIRTS[(Math.random()*SHIRTS.length)|0],
    bob:Math.random()*TAU, happy:h.mood
  });
}
export function updateCitizens(dt){
  // fewer people out and about in a downpour
  const shelter=1-0.55*clamp(S.wx.amt,0,1);
  const want=Math.round(clamp(S.pop,0,150)*shelter);
  if(S.citizens.length<want&&Math.random()<dt*3) spawnCitizen();
  while(S.citizens.length>want+4) S.citizens.pop();
  for(let i=S.citizens.length-1;i>=0;i--){
    const c=S.citizens[i];
    c.p+=dt*c.sp;
    while(c.p>=1){
      c.p-=1;
      c.px=c.x; c.py=c.y; c.x=c.nx; c.y=c.ny;
      if(!isType(c.x,c.y,"road")){ S.citizens.splice(i,1); break; }
      const n=stepFrom(c.x,c.y,c.px,c.py,"road");
      if(!n){ S.citizens.splice(i,1); break; }
      c.nx=n[0]; c.ny=n[1];
      if(Math.random()<0.25) c.sp=0.36+Math.random()*0.34;
    }
  }
}
