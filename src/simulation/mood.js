import { CAFE_MOOD } from '../buildings/cafes.js';
import { CROWD } from '../buildings/houses.js';
import { LAMP_MOOD } from '../buildings/lamps.js';
import { STATION_MOOD } from '../buildings/stations.js';
import { GREEN } from '../buildings/trees.js';
import { MILL_MOOD } from '../buildings/windmills.js';
import { MARKET_MOOD } from '../buildings/markets.js';
import { BAKERY_MOOD } from '../buildings/bakeries.js';
import { SCHOOL_MOOD } from '../buildings/schools.js';
import { DOCK_MOOD } from '../buildings/docks.js';
import { getBuildingDefinition } from '../buildings/registry.js';
import { DIRS, clamp } from '../core/constants.js';
import { services } from '../core/services.js';
import { S } from '../core/state.js';
import { recreationStatus, recomputeRecreation } from './recreation.js';
import { PAL, seasonName } from '../world/seasons.js';
import { activeFestival } from '../world/festivals.js';
import { idx, inBounds, isFacilityPart, isType } from '../world/tiles.js';
import { darkness } from '../world/time.js';

/* ---------- simulation ---------- */
export let simT=0;

function recreationMood(h,out){
  const r=recreationStatus(h);
  let v=0;
  if(r.satisfaction>=90) v=12;
  else if(r.satisfaction>=65) v=9;
  else if(r.satisfaction>=35) v=5;
  else if(r.satisfaction>0) v=2;
  // The documented ceiling of +12 is unchanged; a bigger, better public space
  // is simply what earns it. A household served only by a Pocket Green tops
  // out lower than one served by a Town Park.
  v=Math.round(v*(r.qualityFactor??1));
  if(v&&out) out.push([r.label,v]);
  return v;
}

// One home's mood, in full. Pass an array as `out` and it also writes down
// its reasoning, which is what the Look tool reads back to you.
export function evalHouse(h,out){
  const c=S.ctx;
  let onRoad=false;
  for(const[dx,dy]of DIRS) if(isType(h.x+dx,h.y+dy,"road")) onRoad=true;
  h.linked=onRoad;
  if(!onRoad){
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

  // Recreation 2.0 replaces the old geometric Park mood stack. Public space
  // now contributes through real access + finite capacity, so no household can
  // double-dip Park adjacency and Recreation satisfaction.
  m+=recreationMood(h,out);

  const cafe=near(c.cafes,CAFE_MOOD.r,CAFE_MOOD.per,CAFE_MOOD.cap);    if(cafe.v){ m+=cafe.v; if(out) out.push([cafe.n+" café"+(cafe.n>1?"s":"")+" on the street",cafe.v]); }
  const stn =near(c.stations,STATION_MOOD.r,STATION_MOOD.per,STATION_MOOD.cap); if(stn.v){  m+=stn.v;  if(out) out.push(["A station within reach",stn.v]); }
  const mill=near(c.mills,MILL_MOOD.r,MILL_MOOD.per,MILL_MOOD.cap);      if(mill.v){ m+=mill.v; if(out) out.push(["A windmill on the skyline",mill.v]); }
  const mkt =near(c.markets,MARKET_MOOD.r,MARKET_MOOD.per,MARKET_MOOD.cap); if(mkt.v){ m+=mkt.v; if(out) out.push([mkt.n>1?mkt.n+" markets nearby":"A market nearby",mkt.v]); }
  const bake=near(c.bakeries,BAKERY_MOOD.r,BAKERY_MOOD.per,BAKERY_MOOD.cap); if(bake.v){ m+=bake.v; if(out) out.push(["The smell of baking",bake.v]); }
  const sch =near(c.schools,SCHOOL_MOOD.r,SCHOOL_MOOD.per,SCHOOL_MOOD.cap); if(sch.v){ m+=sch.v; if(out) out.push(["A school within reach",sch.v]); }
  const dock=near(c.docks,DOCK_MOOD.r,DOCK_MOOD.per,DOCK_MOOD.cap);         if(dock.v){ m+=dock.v; if(out) out.push(["Boats at the dock",dock.v]); }

  const lampMul=1+clamp(darkness()/0.62,0,1);
  const lamp=near(c.lamps,LAMP_MOOD.r,LAMP_MOOD.per,LAMP_MOOD.cap);
  const lampV=Math.round(lamp.v*lampMul);
  if(lampV){ m+=lampV; if(out) out.push([lamp.n+" lamp"+(lamp.n>1?"s":"")+(lampMul>1.4?" lit":""),lampV]); }

  let green=0;
  for(let dy=-GREEN.r;dy<=GREEN.r;dy++)for(let dx=-GREEN.r;dx<=GREEN.r;dx++){
    const x=h.x+dx,y=h.y+dy; if(!inBounds(x,y)) continue;
    const i2=idx(x,y);
    if(S.natTree[i2]||isType(x,y,"tree")) green+=GREEN.perTree;
    if(S.terr[i2]===1) green+=GREEN.perWater;
  }
  green=Math.min(green,GREEN.cap);
  if(green>=1){ m+=green; if(out) out.push(["Trees and water about",Math.round(green)]); }

  let crowd=0;
  for(let dy=-CROWD.r;dy<=CROWD.r;dy++)for(let dx=-CROWD.r;dx<=CROWD.r;dx++) if(isType(h.x+dx,h.y+dy,"house")) crowd++;
  if(crowd>CROWD.limit){ const pen=(crowd-CROWD.limit)*CROWD.per; m-=pen; if(out) out.push(["Rather crowded round here",-pen]); }

  const fest=activeFestival();
  if(fest){ m+=fest.mood; if(out) out.push([fest.name,fest.mood]); }

  const sm=Math.round(PAL.moodShift||0);
  if(sm){ m+=sm; if(out) out.push([seasonName()+" air",sm]); }

  return clamp(Math.round(m),0,100);
}

export function recompute(){
  const parks=[],recreation=[],cafes=[],stations=[],houses=[],lamps=[],mills=[],markets=[],bakeries=[],schools=[],docks=[];
  for(let i=0;i<S.grid.length;i++){
    const b=S.grid[i]; if(!b||isFacilityPart(b)) continue;
    const rec=getBuildingDefinition(b.type)?.service?.type==='recreation';
    if(rec) recreation.push(b);
    if(b.type==="park") parks.push(b);
    else if(b.type==="cafe") cafes.push(b);
    else if(b.type==="station") stations.push(b);
    else if(b.type==="house") houses.push(b);
    else if(b.type==="lamp") lamps.push(b);
    else if(b.type==="mill") mills.push(b);
    else if(b.type==="market") markets.push(b);
    else if(b.type==="bakery") bakeries.push(b);
    else if(b.type==="school") schools.push(b);
    else if(b.type==="dock") docks.push(b);
  }
  S.ctx={parks,recreation,cafes,stations,houses,lamps,mills,markets,bakeries,schools,docks};

  // Population/demand is authoritative at households. Establish the real
  // household totals first, then compute Recreation assignment, then Mood.
  let pop=0; for(const h of houses) pop+=h.pop;
  S.homes=houses.length; S.pop=pop;
  recomputeRecreation();

  let moodSum=0;
  for(const h of houses){
    h.mood=evalHouse(h,null);
    moodSum+=h.mood;
  }
  S.mood=houses.length?Math.round(moodSum/houses.length):0;
  S._cafes=cafes.length; S._houses=houses;
  services.paintTools();
}

export function moodName(){
  if(!S.homes) return "—";
  const m=S.mood;
  if(m>=82) return "Blissful";
  if(m>=68) return "Content";
  if(m>=50) return "Settled";
  if(m>=32) return "Restless";
  return "Glum";
}
