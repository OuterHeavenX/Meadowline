import { clamp, lerp } from '../core/constants.js';
import { services } from '../core/services.js';
import { S, isType } from '../core/state.js';
import { stepFrom } from './citizens.js';

/* ---------- trains ---------- */
export function railTiles(){
  const out=[];
  for(let i=0;i<S.grid.length;i++){const b=S.grid[i]; if(b&&b.type==="rail") out.push(b);}
  return out;
}
export function updateTrains(dt){
  const rails=railTiles();
  const want=rails.length>=6?clamp(Math.floor(rails.length/13),1,5):0;
  if(S.trains.length<want&&Math.random()<dt*1.2){
    for(let k=0;k<10;k++){
      const r=rails[(Math.random()*rails.length)|0];
      const n=stepFrom(r.x,r.y,-9,-9,"rail");
      if(n){
        S.trains.push({x:r.x,y:r.y,px:r.x,py:r.y,nx:n[0],ny:n[1],p:0,
          sp:0.9+Math.random()*0.35,hist:[],hue:(Math.random()*3)|0,whistle:2+Math.random()*20});
        break;
      }
    }
  }
  while(S.trains.length>want) S.trains.pop();
  for(let i=S.trains.length-1;i>=0;i--){
    const t=S.trains[i];
    let derailed=false;
    t.p+=dt*t.sp;
    while(t.p>=1){
      t.p-=1;
      t.px=t.x; t.py=t.y; t.x=t.nx; t.y=t.ny;
      if(!isType(t.x,t.y,"rail")){ derailed=true; break; }
      const n=stepFrom(t.x,t.y,t.px,t.py,"rail");
      if(!n){ derailed=true; break; }
      t.nx=n[0]; t.ny=n[1];
    }
    if(derailed){ S.trains.splice(i,1); continue; }
    const fx=lerp(t.x,t.nx,t.p), fy=lerp(t.y,t.ny,t.p);
    t.fx=fx; t.fy=fy;
    // trail is sampled by distance travelled, not by frame, so carriages
    // keep their spacing at any speed or frame rate
    const head=t.hist[0];
    if(!head||Math.hypot(head.x-fx,head.y-fy)>0.05){
      t.hist.unshift({x:fx,y:fy});
      if(t.hist.length>60) t.hist.length=60;
    }
    t.whistle-=dt;
    if(t.whistle<=0){ t.whistle=16+Math.random()*26; services.blip(300,0.16,"sine"); }
  }
}

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
