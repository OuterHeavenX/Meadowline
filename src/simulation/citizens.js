import { FIRSTS } from '../buildings/houses.js';
import { TAU, clamp } from '../core/constants.js';
import { S } from '../core/state.js';
import { educationProvider } from './civic-services.js';
import { crossingBlockedByTrain } from './mobility.js';
import { findPath, stepFrom } from '../transport/pathfinding.js';
import { roadNear } from '../transport/roads.js';
import { idx, isType } from '../world/tiles.js';
import { darkness } from '../world/time.js';

export const SHIRTS=["#e8735f","#5d8fc4","#e0b451","#6fae7c","#c273a8","#e9e2cf","#7a6fb5"];
const walkable=(x,y)=>isType(x,y,"road");

/* ---------- where someone is headed, and why ----------
   The day has a shape: out to work/school in the morning, out to the café or
   park in the afternoon, home at dusk, indoors overnight. */
export function errand(){
  const t=S.dayT;
  if(t<0.16||t>0.80) return "home";
  if(t<0.46) return "work";
  if(t<0.68) return "leisure";
  return "home";
}

function pool(kind){
  const c=S.ctx;
  if(kind==="work")    return [...c.mills,...c.bakeries,...c.markets,...c.schools,...c.stations,...c.cafes];
  if(kind==="leisure") return [...c.cafes,...c.parks,...c.markets,...c.docks];
  return [];
}

function schoolDestination(c){
  if(!c.home||Math.random()>=0.38) return null; // visible hint, not one agent per student
  const h=S.grid[idx(c.home.x,c.home.y)];
  if(!h||h.type!=="house") return null;
  const p=educationProvider(h);
  return p&&p.provider?p.provider:null;
}

function chooseDest(c){
  const kind=errand();
  c.doing=kind;
  let b=null;
  if(kind==="work"){
    b=schoolDestination(c);
    if(b) c.doing="school";
  }
  const options=pool(kind);
  if(!b&&options.length) b=options[(Math.random()*options.length)|0];
  if(!b){
    const r=c.homeRoad;
    if(r&&(r.x!==c.x||r.y!==c.y)) return r;
    c.linger=3+Math.random()*7;
    return null;
  }
  const r=roadNear(b.x,b.y);
  if(!r) return null;
  c.carry=(b.type==="market"||b.type==="bakery")?1:0;
  c.at=b.type;
  return r;
}

function nextStep(c){
  if(c.path&&c.pi<c.path.length){
    const n=c.path[c.pi++];
    if(Math.abs(n[0]-c.x)+Math.abs(n[1]-c.y)===1&&walkable(n[0],n[1])) return n;
    c.path=null;
  }
  if(c.path){ c.path=null; c.linger=1.5+Math.random()*4; }
  const dest=chooseDest(c);
  if(dest){
    const path=findPath(c.x,c.y,dest.x,dest.y,walkable);
    if(path&&path.length){ c.path=path; c.pi=0; return c.path[c.pi++]; }
  }
  if(!c.linger) c.linger=1+Math.random()*3;
  const wander=stepFrom(c.x,c.y,c.px,c.py,"road");
  return wander||[c.x,c.y];
}

export function outFrom(hx,hy){
  let n=0;
  for(const c of S.citizens) if(c.home&&c.home.x===hx&&c.home.y===hy) n++;
  const h=S.grid&&S.grid[idx(hx,hy)];
  const pop=h&&h.type==="house"?Math.max(0,h.pop|0):0;
  return Math.min(n,pop);
}

export function spawnCitizen(){
  const homes=S.ctx.houses;
  if(!homes.length) return;
  const h=homes[(Math.random()*homes.length)|0];
  if(!h.linked||h.pop<=0||outFrom(h.x,h.y)>=h.pop) return;
  const r=roadNear(h.x,h.y); if(!r) return;
  S.citizens.push({
    x:r.x,y:r.y,px:r.x,py:r.y,nx:r.x,ny:r.y,p:1,
    sp:0.42+Math.random()*0.3,
    col:SHIRTS[(Math.random()*SHIRTS.length)|0],
    bob:Math.random()*TAU, happy:h.mood,
    home:{x:h.x,y:h.y}, homeRoad:{x:r.x,y:r.y},
    name:FIRSTS[(Math.random()*FIRSTS.length)|0],
    side:Math.random()<0.5?-1:1,
    path:null, pi:0, linger:0, carry:0, doing:"home", at:null, waitingTrain:0
  });
}

function trimHouseholdRepresentatives(){
  const kept=new Map();
  for(let i=S.citizens.length-1;i>=0;i--){
    const c=S.citizens[i];
    if(!c.home) continue;
    const h=S.grid[idx(c.home.x,c.home.y)];
    const cap=h&&h.type==="house"?Math.max(0,h.pop|0):0;
    const key=c.home.x+","+c.home.y;
    const n=kept.get(key)||0;
    if(n>=cap) S.citizens.splice(i,1);
    else kept.set(key,n+1);
  }
}

export function updateCitizens(dt){
  trimHouseholdRepresentatives();
  const shelter=1-0.55*clamp(S.wx.amt,0,1);
  const abed=1-0.72*clamp((darkness()-0.26)/0.28,0,1);
  const want=Math.round(clamp(S.pop,0,150)*shelter*abed);
  if(S.citizens.length<want&&Math.random()<dt*3) spawnCitizen();
  while(S.citizens.length>want+4) S.citizens.pop();

  for(let i=S.citizens.length-1;i>=0;i--){
    const c=S.citizens[i];
    if(c.linger>0){ c.linger-=dt; continue; }
    if(crossingBlockedByTrain(c.nx,c.ny)){
      c.waitingTrain=Math.min(5,(c.waitingTrain||0)+dt);
      continue;
    }
    c.waitingTrain=0;
    c.p+=dt*c.sp;
    while(c.p>=1){
      c.p-=1;
      c.px=c.x; c.py=c.y; c.x=c.nx; c.y=c.ny;
      if(!walkable(c.x,c.y)){ S.citizens.splice(i,1); break; }
      const n=nextStep(c);
      if(!n){ S.citizens.splice(i,1); break; }
      c.nx=n[0]; c.ny=n[1];
      if(Math.random()<0.25) c.sp=0.36+Math.random()*0.34;
    }
  }
}
