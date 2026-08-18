import { DIRS, clamp } from '../core/constants.js';
import { services } from '../core/services.js';
import { S, idx, inBounds, isType } from '../core/state.js';
import { darkness } from './economy.js';
import { PAL, seasonName } from '../world/seasons.js';

/* ---------- simulation ---------- */
export let simT=0;

// One home's mood, in full. Pass an array as `out` and it also writes down
// its reasoning, which is what the Look tool reads back to you.
export function evalHouse(h,out){
  const c=S.ctx;
  let onRoad=false;
  for(const[dx,dy]of DIRS) if(isType(h.x+dx,h.y+dy,"road")) onRoad=true;
  h.linked=onRoad;
  if(!onRoad){                        // nothing else matters until a road reaches it
    if(out) out.push(["A roof, but no road",14]);
    return 14;
  }
  let m=66;
  if(out) out.push(["A road at the door",66]);

  const near=(list,r,per,cap)=>{
    let v=0,n=0;
    for(const b of list) if(Math.abs(b.x-h.x)<=r&&Math.abs(b.y-h.y)<=r){ v+=per; n++; }
    return {v:Math.min(v,cap),n};
  };
  const park=near(c.parks,4,13,26);    if(park.v){ m+=park.v; if(out) out.push([park.n+" park"+(park.n>1?"s":"")+" nearby",park.v]); }
  const cafe=near(c.cafes,5,10,20);    if(cafe.v){ m+=cafe.v; if(out) out.push([cafe.n+" caf\u00e9"+(cafe.n>1?"s":"")+" on the street",cafe.v]); }
  const stn =near(c.stations,6,16,16); if(stn.v){  m+=stn.v;  if(out) out.push(["A station within reach",stn.v]); }
  const mill=near(c.mills,3,4,8);      if(mill.v){ m+=mill.v; if(out) out.push(["A windmill on the skyline",mill.v]); }

  // lamps are worth twice as much once the light goes
  const lampMul=1+clamp(darkness()/0.62,0,1);
  const lamp=near(c.lamps,2,3,9);
  const lampV=Math.round(lamp.v*lampMul);
  if(lampV){ m+=lampV; if(out) out.push([lamp.n+" lamp"+(lamp.n>1?"s":"")+(lampMul>1.4?" lit":""),lampV]); }

  let green=0;
  for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){
    const x=h.x+dx,y=h.y+dy; if(!inBounds(x,y)) continue;
    const i2=idx(x,y);
    if(S.natTree[i2]||isType(x,y,"tree")) green+=1.5;
    if(S.terr[i2]===1) green+=1;
  }
  green=Math.min(green,12);
  if(green>=1){ m+=green; if(out) out.push(["Trees and water about",Math.round(green)]); }

  let crowd=0;
  for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++) if(isType(h.x+dx,h.y+dy,"house")) crowd++;
  if(crowd>7){ const pen=(crowd-7)*4; m-=pen; if(out) out.push(["Rather crowded round here",-pen]); }

  const sm=Math.round(PAL.moodShift||0);
  if(sm){ m+=sm; if(out) out.push([seasonName()+" air",sm]); }

  return clamp(Math.round(m),0,100);
}

export function recompute(){
  const parks=[],cafes=[],stations=[],houses=[],lamps=[],mills=[];
  for(let i=0;i<S.grid.length;i++){
    const b=S.grid[i]; if(!b) continue;
    if(b.type==="park") parks.push(b);
    else if(b.type==="cafe") cafes.push(b);
    else if(b.type==="station") stations.push(b);
    else if(b.type==="house") houses.push(b);
    else if(b.type==="lamp") lamps.push(b);
    else if(b.type==="mill") mills.push(b);
  }
  S.ctx={parks,cafes,stations,houses,lamps,mills};
  let pop=0,moodSum=0;
  for(const h of houses){
    h.mood=evalHouse(h,null);
    pop+=h.pop; moodSum+=h.mood;
  }
  S.homes=houses.length;
  S.pop=pop;
  S.mood=houses.length?Math.round(moodSum/houses.length):0;
  S._cafes=cafes.length; S._houses=houses;
  services.paintTools();
}

export function growth(dt){
  for(const h of S.ctx.houses){
    const cap=4;
    if(!h.linked){ h.grow=0; if(h.pop>0&&Math.random()<dt*0.05) h.pop--; continue; }
    if(h.pop<cap&&h.mood>=62){
      h.grow+=dt*(h.mood-55)/60;
      if(h.grow>=6){ h.grow=0; h.pop++; services.hearts(h.x,h.y); }
    } else if(h.mood<32&&h.pop>0){
      h.grow-=dt*0.4;
      if(h.grow<-8){ h.grow=0; h.pop--; }
    } else h.grow*=(1-dt*0.1);
  }
}
