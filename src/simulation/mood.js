import { CAFE_MOOD } from '../buildings/cafes.js';
import { CROWD } from '../buildings/houses.js';
import { LAMP_MOOD } from '../buildings/lamps.js';
import { PARK_MOOD } from '../buildings/parks.js';
import { STATION_MOOD } from '../buildings/stations.js';
import { GREEN } from '../buildings/trees.js';
import { MILL_MOOD } from '../buildings/windmills.js';
import { MARKET_MOOD } from '../buildings/markets.js';
import { BAKERY_MOOD } from '../buildings/bakeries.js';
import { SCHOOL_MOOD } from '../buildings/schools.js';
import { DOCK_MOOD } from '../buildings/docks.js';
import { FARM_MOOD } from '../buildings/farms.js';
import { SAW_MOOD } from '../buildings/sawmills.js';
import { SHOP_MOOD } from '../buildings/workshops.js';
import { INN_MOOD } from '../buildings/inns.js';
import { CLINIC_MOOD, CLINIC_R, CLINIC_RELIEF } from '../buildings/clinics.js';
import { WELL_MOOD } from '../buildings/wells.js';
import { IS_WONDER, WONDERS } from '../buildings/wonders.js';
import { tallyWork } from './economics.js';
import { isCrossroads, signalAt } from '../transport/signals.js';
import { DIRS, clamp } from '../core/constants.js';
import { services } from '../core/services.js';
import { S } from '../core/state.js';
import { PAL, seasonName } from '../world/seasons.js';
import { activeFestival } from '../world/festivals.js';
import { idx, inBounds, isType } from '../world/tiles.js';
import { darkness } from '../world/time.js';

/* ---------- simulation ---------- */
export let simT=0;

// One home's mood, in full. Pass an array as `out` and it also writes down
// its reasoning, which is what the Look tool reads back to you.
// Every building that cheers (or grates on) a home, in one table. Radius and
// strength live with the building; this only says what to call it.
const NEIGHBOURS=[
  ["parks",    PARK_MOOD,    n=>n+" park"+(n>1?"s":"")+" nearby"],
  ["cafes",    CAFE_MOOD,    n=>n+" caf\u00e9"+(n>1?"s":"")+" on the street"],
  ["stations", STATION_MOOD, ()=>"A station within reach"],
  ["mills",    MILL_MOOD,    ()=>"A windmill on the skyline"],
  ["markets",  MARKET_MOOD,  n=>n>1?n+" markets nearby":"A market nearby"],
  ["bakeries", BAKERY_MOOD,  ()=>"The smell of baking"],
  ["schools",  SCHOOL_MOOD,  ()=>"A school within reach"],
  ["docks",    DOCK_MOOD,    ()=>"Boats at the dock"],
  ["farms",    FARM_MOOD,    ()=>"Fields at the edge of town"],
  ["workshops",SHOP_MOOD,    ()=>"A workshop in the lane"],
  ["inns",     INN_MOOD,     ()=>"An inn to sit in"],
  ["clinics",  CLINIC_MOOD,  ()=>"A clinic close by"],
  ["wells",    WELL_MOOD,    n=>n>1?n+" wells":"A well on the corner"],
  ["sawmills", SAW_MOOD,     ()=>"A sawmill within earshot"]
];

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

  // a cap can be negative (a sawmill is a nuisance), so clamp toward zero
  const near=(list,r,per,cap)=>{
    let v=0,n=0;
    for(const b of list) if(Math.abs(b.x-h.x)<=r&&Math.abs(b.y-h.y)<=r){ v+=per; n++; }
    return {v:cap>=0?Math.min(v,cap):Math.max(v,cap),n};
  };

  for(const[key,spec,label] of NEIGHBOURS){
    const r=near(c[key]||[],spec.r,spec.per,spec.cap);
    if(r.v){ m+=r.v; if(out) out.push([label(r.n),r.v]); }
  }

  // lamps are worth twice as much once the light goes
  const lampMul=1+clamp(darkness()/0.62,0,1);
  const lamp=near(c.lamps,LAMP_MOOD.r,LAMP_MOOD.per,LAMP_MOOD.cap);
  const lampV=Math.round(lamp.v*lampMul);
  if(lampV){ m+=lampV; if(out) out.push([lamp.n+" lamp"+(lamp.n>1?"s":"")+(lampMul>1.4?" lit":""),lampV]); }

  // wonders reach much further than anything else, and each is one of a kind
  for(const w of c.wonders){
    const spec=WONDERS[w.type]; if(!spec) continue;
    const r=near([w],spec.mood.r,spec.mood.per,spec.mood.cap);
    if(r.v){ m+=r.v; if(out) out.push([spec.name,r.v]); }
  }

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
  if(crowd>CROWD.limit){
    let pen=(crowd-CROWD.limit)*CROWD.per;
    // a clinic takes the edge off a crowded street
    const cared=c.clinics.some(k=>Math.abs(k.x-h.x)<=CLINIC_R&&Math.abs(k.y-h.y)<=CLINIC_R);
    if(cared) pen=Math.round(pen*(1-CLINIC_RELIEF));
    m-=pen; if(out) out.push([cared?"Crowded, but the clinic helps":"Rather crowded round here",-pen]);
  }

  // a busy crossroads with nothing directing it is no fun next door
  let chaos=0;
  for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){
    const x=h.x+dx,y=h.y+dy;
    if(isCrossroads(x,y)&&!signalAt(x,y)) chaos++;
  }
  if(chaos){ const pen=Math.min(chaos*4,10); m-=pen; if(out) out.push(["An unsignalled crossroads",-pen]); }

  // work: nobody is content in a town with nothing to do
  const idle=S.econ.unemployment||0;
  if(idle>0.05){
    // the first few residents manage without an employer; the pressure comes on
    // as the town grows into one that needs work for everybody
    const bite=clamp((S.pop-6)/10,0,1);
    const pen=Math.round(idle*18*bite);
    if(pen){ m-=pen; if(out) out.push(["Not enough work to go round",-pen]); }
  }
  if(S.econ.broke){ m-=6; if(out) out.push(["The town cannot pay its way",-6]); }

  const fest=activeFestival();
  if(fest){ m+=fest.mood; if(out) out.push([fest.name,fest.mood]); }

  const sm=Math.round(PAL.moodShift||0);
  if(sm){ m+=sm; if(out) out.push([seasonName()+" air",sm]); }

  return clamp(Math.round(m),0,100);
}

export function recompute(){
  const bins={parks:[],cafes:[],stations:[],houses:[],lamps:[],mills:[],markets:[],
              bakeries:[],schools:[],docks:[],farms:[],sawmills:[],workshops:[],
              inns:[],clinics:[],wells:[],wonders:[],all:[]};
  const BIN={park:"parks",cafe:"cafes",station:"stations",house:"houses",lamp:"lamps",
             mill:"mills",market:"markets",bakery:"bakeries",school:"schools",dock:"docks",
             farm:"farms",sawmill:"sawmills",workshop:"workshops",inn:"inns",
             clinic:"clinics",well:"wells"};
  for(let i=0;i<S.grid.length;i++){
    const b=S.grid[i]; if(!b) continue;
    bins.all.push(b);
    if(IS_WONDER[b.type]) bins.wonders.push(b);
    else if(BIN[b.type]) bins[BIN[b.type]].push(b);
  }
  S.ctx=bins;
  tallyWork();
  let pop=0,moodSum=0;
  for(const h of bins.houses){
    h.mood=evalHouse(h,null);
    pop+=h.pop; moodSum+=h.mood;
  }
  S.homes=bins.houses.length;
  S.pop=pop;
  if(pop>S.peakPop) S.peakPop=pop;   // unlocks never take themselves back
  S.mood=bins.houses.length?Math.round(moodSum/bins.houses.length):0;
  S._cafes=bins.cafes.length; S._houses=bins.houses;
  tallyWork();                      // population may have moved since the first pass
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
