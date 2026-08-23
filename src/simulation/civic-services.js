import { clamp } from '../core/constants.js';
import { S } from '../core/state.js';
import { BUILDINGS, getBuildingDefinition } from '../buildings/registry.js';

export const SERVICE_TYPES=Object.freeze(["education","safety","healthcare","fireProtection","recreation","employment","transit","sanitation"]);
const HOUSE_KEY=h=>h.x+","+h.y;
const PROVIDER_KEY=b=>b.x+","+b.y;
let dirty=true;

function distance(a,b){ return Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y)); }
function ensureState(b){
  if(!b.state||typeof b.state!=="object") b.state={};
  return b.state;
}
function educationDemand(h){ return Math.max(0,Math.ceil((h.pop||0)*0.5)); }
function providerDefinition(b){
  const def=getBuildingDefinition(b.type);
  if(!def||!def.service) return null;
  const level=Math.max(1,Number(ensureState(b).level)||1);
  const upgrade=(def.upgrades||[]).find(u=>u.level===level);
  return {...def.service,...(upgrade||{})};
}

export function invalidateServices(){ dirty=true; }

export function providersFor(type){
  const out=[];
  for(const b of S.grid||[]){
    if(!b) continue;
    const service=providerDefinition(b);
    if(service&&service.type===type) out.push(b);
  }
  return out.sort((a,b)=>a.y-b.y||a.x-b.x);
}

export function recomputeServices(force=false){
  if(!force&&!dirty) return S.services;
  if(!S.services||typeof S.services!=="object") S.services={};
  const providers=providersFor("education");
  const houses=(S.ctx&&S.ctx.houses?S.ctx.houses:[]).slice().sort((a,b)=>a.y-b.y||a.x-b.x);
  const remaining=new Map();
  const providerStats={};
  let totalCapacity=0,totalDemand=0,totalServed=0;

  for(const p of providers){
    const cfg=providerDefinition(p);
    const cap=Math.max(0,Number(cfg.capacity)||0);
    remaining.set(PROVIDER_KEY(p),cap);
    providerStats[PROVIDER_KEY(p)]={provider:p,capacity:cap,demand:0,served:0,homesCovered:0,radius:cfg.radius||0,level:Number(ensureState(p).level)||1};
    totalCapacity+=cap;
  }

  const assignments={};
  for(const h of houses){
    ensureState(h);
    if(!Number.isFinite(h.state.education)) h.state.education=0;
    h.state.education=clamp(h.state.education,0,100);
    const demand=educationDemand(h);
    totalDemand+=demand;
    if(!demand){ assignments[HOUSE_KEY(h)]={status:"noDemand",demand:0,served:0,ratio:0,provider:null}; continue; }

    const candidates=providers.map(p=>({p,cfg:providerDefinition(p),d:distance(h,p)}))
      .filter(c=>c.d<=c.cfg.radius)
      .sort((a,b)=>a.d-b.d||a.p.y-b.p.y||a.p.x-b.p.x);
    if(!candidates.length){ assignments[HOUSE_KEY(h)]={status:"uncovered",demand,served:0,ratio:0,provider:null}; continue; }

    for(const c of candidates) providerStats[PROVIDER_KEY(c.p)].demand+=demand;
    let chosen=null;
    for(const c of candidates){ if((remaining.get(PROVIDER_KEY(c.p))||0)>=demand){ chosen=c; break; } }
    if(!chosen) chosen=candidates.slice().sort((a,b)=>(remaining.get(PROVIDER_KEY(b.p))||0)-(remaining.get(PROVIDER_KEY(a.p))||0)||a.d-b.d)[0];
    const key=PROVIDER_KEY(chosen.p);
    const avail=remaining.get(key)||0;
    const served=Math.min(demand,avail);
    remaining.set(key,avail-served);
    providerStats[key].served+=served;
    providerStats[key].homesCovered++;
    totalServed+=served;
    assignments[HOUSE_KEY(h)]={status:served>=demand?"served":served>0?"partial":"capacity",demand,served,ratio:demand?served/demand:0,provider:key,distance:chosen.d};
  }

  for(const key of Object.keys(providerStats)){
    const st=providerStats[key];
    st.utilization=st.capacity?Math.round(st.served/st.capacity*100):0;
    st.overloaded=st.demand>st.capacity;
  }
  const educated=houses.length?Math.round(houses.reduce((n,h)=>n+(Number(h.state&&h.state.education)||0),0)/houses.length):0;
  S.services.education={providers:providerStats,assignments,metrics:{average:educated,demand:totalDemand,served:totalServed,capacity:totalCapacity,utilization:totalCapacity?Math.round(totalServed/totalCapacity*100):0}};
  S.services.lastRecompute=S.t||0;
  S.services.recomputes=(S.services.recomputes||0)+1;
  dirty=false;
  return S.services;
}

export function advanceEducation(dt){
  recomputeServices();
  const edu=S.services&&S.services.education;
  if(!edu) return;
  for(const h of (S.ctx&&S.ctx.houses)||[]){
    ensureState(h);
    const a=edu.assignments[HOUSE_KEY(h)];
    if(!a||a.ratio<=0) continue;
    h.state.education=clamp((Number(h.state.education)||0)+dt*0.04*a.ratio,0,100);
  }
  if(edu.metrics){
    const homes=(S.ctx&&S.ctx.houses)||[];
    edu.metrics.average=homes.length?Math.round(homes.reduce((n,h)=>n+(Number(h.state&&h.state.education)||0),0)/homes.length):0;
  }
}

export function getEducationLevel(h){ return clamp(Number(h&&h.state&&h.state.education)||0,0,100); }
export function getEducationFactor(h){ return getEducationLevel(h)/100; }
export function getCityEducationAverage(){ recomputeServices(); return S.services.education.metrics.average||0; }
export function educationTier(v){
  v=clamp(Number(v)||0,0,100);
  if(v>=85) return "Highly Educated";
  if(v>=70) return "Well Educated";
  if(v>=50) return "Educated";
  if(v>=25) return "Basic";
  return "Learning";
}
export function educationAssignment(h){ recomputeServices(); return S.services.education.assignments[HOUSE_KEY(h)]||null; }
export function educationProvider(h){
  const a=educationAssignment(h); if(!a||!a.provider) return null;
  return S.services.education.providers[a.provider]||null;
}
export function schoolStats(school){ recomputeServices(); return S.services.education.providers[PROVIDER_KEY(school)]||{capacity:0,demand:0,served:0,utilization:0,homesCovered:0,overloaded:false}; }
export function educationStatus(h){
  const a=educationAssignment(h);
  if(!a) return {label:"Not enrolled",detail:"Education is waiting for service data."};
  if(a.status==="served") return {label:"Education improving",detail:"This home has a place at a nearby school."};
  if(a.status==="partial") return {label:"Education improving slowly",detail:"The nearby school can only serve part of this household's demand."};
  if(a.status==="capacity") return {label:"Waiting for school space",detail:"A school is close enough, but its available places are full."};
  if(a.status==="uncovered") return {label:"No school coverage",detail:"Build a school closer to let education begin improving."};
  return {label:"No current student demand",detail:"Education already gained is kept."};
}

export function previewEducationAt(x,y){
  const def=BUILDINGS.school.service;
  const candidates=((S.ctx&&S.ctx.houses)||[]).map(h=>({h,d:Math.max(Math.abs(h.x-x),Math.abs(h.y-y)),demand:educationDemand(h)}))
    .filter(c=>c.d<=def.radius&&c.demand>0)
    .sort((a,b)=>a.d-b.d||a.h.y-b.h.y||a.h.x-b.h.x);
  let remaining=def.capacity;
  return candidates.map(c=>{
    const current=educationAssignment(c.h);
    if(current&&current.ratio>=1) return {house:c.h,state:"neutral",demand:c.demand,served:0};
    const served=Math.min(c.demand,remaining); remaining-=served;
    return {house:c.h,state:served>=c.demand?"green":served>0?"yellow":"yellow",demand:c.demand,served};
  });
}

export function evaluateUpgradeReadiness(h){
  return {
    road:{met:!!h.linked,label:"Road access"},
    mood:{met:(h.mood||0)>=65,label:"Mood 65+"},
    education:{met:getEducationLevel(h)>=50,label:"Education 50+"}
  };
}
