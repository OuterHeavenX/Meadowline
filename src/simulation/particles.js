import { S } from '../core/state.js';

/* ---------- little particles ---------- */
export function puff(x,y){ for(let i=0;i<7;i++) S.puffs.push({x,y,vx:(Math.random()-.5)*.5,vy:(Math.random()-.5)*.5,z:Math.random()*6,life:1,kind:0}); }

export function hearts(x,y){ for(let i=0;i<3;i++) S.puffs.push({x,y,vx:(Math.random()-.5)*.2,vy:(Math.random()-.5)*.2,z:8+i*4,life:1,kind:1}); }

export function updatePuffs(dt){
  for(let i=S.puffs.length-1;i>=0;i--){
    const p=S.puffs[i];
    p.x+=p.vx*dt; p.y+=p.vy*dt; p.z+=dt*(p.kind?14:9); p.life-=dt*(p.kind?0.7:1.5);
    if(p.life<=0) S.puffs.splice(i,1);
  }
}
