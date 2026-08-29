import { BUILDINGS } from '../buildings/registry.js';
import { clamp, hash2 } from '../core/constants.js';
import { services } from '../core/services.js';
import { S } from '../core/state.js';
import { educationAssignment, getEducationLevel, invalidateServices } from './civic-services.js';
import { recreationStatus } from './recreation.js';
import { idx, inBounds, isType } from '../world/tiles.js';
import { emitFeedback } from './feedback.js';

const HOUSE_DEF=BUILDINGS.house;
export const RESIDENTIAL_TIERS=Object.freeze((HOUSE_DEF.housing&&HOUSE_DEF.housing.tiers)||[]);

function stateFor(h){
  if(!h.state||typeof h.state!=="object"||Array.isArray(h.state)) h.state={};
  if(!Number.isFinite(h.state.education)) h.state.education=0;
  if(!Number.isFinite(h.state.housingTier)) h.state.housingTier=1;
  h.state.housingTier=clamp(Math.floor(h.state.housingTier),1,RESIDENTIAL_TIERS.length||1);
  if(!Number.isFinite(h.state.upgradeProgress)) h.state.upgradeProgress=0;
  h.state.upgradeProgress=clamp(h.state.upgradeProgress,0,1);
  if(!Number.isFinite(h.state.desirability)) h.state.desirability=0;
  h.state.desirability=clamp(h.state.desirability,0,100);
  if(!Number.isFinite(h.state.recreationSatisfaction)) h.state.recreationSatisfaction=0;
  h.state.recreationSatisfaction=clamp(h.state.recreationSatisfaction,0,100);
  return h.state;
}

export function housingTier(h){
  const st=stateFor(h);
  return RESIDENTIAL_TIERS[st.housingTier-1]||RESIDENTIAL_TIERS[0]||{id:1,name:"Cottage",capacity:4,taxMultiplier:1};
}

export function housingTierIndex(h){ return stateFor(h).housingTier; }
export function housingBaseCapacity(h){ return Math.max(0,Number(housingTier(h).capacity)||4); }

// Housing tiers are now authoritative. Existing School-boosted households are
// grandfathered: nobody is evicted just because Housing 2.0 removed the legacy
// +2 School capacity perk, but no new residents arrive above the tier capacity.
export function housingCapacity(h){ return Math.max(housingBaseCapacity(h),Math.max(0,Math.floor(Number(h&&h.pop)||0))); }
export function housingTaxMultiplier(h){ return Math.max(0.5,Number(housingTier(h).taxMultiplier)||1); }

function countNear(list,h,r){
  let n=0;
  for(const b of list||[]) if(Math.max(Math.abs(b.x-h.x),Math.abs(b.y-h.y))<=r) n++;
  return n;
}

function greenScore(h){
  let score=0;
  for(let dy=-3;dy<=3;dy++) for(let dx=-3;dx<=3;dx++){
    const x=h.x+dx,y=h.y+dy;
    if(!inBounds(x,y)) continue;
    const i=idx(x,y);
    if(S.natTree&&S.natTree[i]) score+=0.75;
    if(isType(x,y,"tree")) score+=1;
    if(S.terr&&S.terr[i]===1) score+=0.35;
  }
  return Math.min(8,Math.round(score));
}

export function desirabilityDetails(h){
  stateFor(h);
  const c=S.ctx||{};
  const a=educationAssignment(h);
  const edu=getEducationLevel(h);
  const rows=[];
  let total=12;
  rows.push({label:"A place to build on",value:12});

  if(h.linked){ total+=18; rows.push({label:"Road access",value:18}); }
  else rows.push({label:"No road access",value:0});

  const mood=Math.round(clamp(Number(h.mood)||0,0,100)*0.22);
  total+=mood; rows.push({label:"Current mood",value:mood});

  let coverage=0;
  if(a){
    if(a.status==="served") coverage=12;
    else if(a.status==="partial") coverage=7;
    else if(a.status==="capacity") coverage=4;
  }
  if(coverage){ total+=coverage; rows.push({label:"Education access",value:coverage}); }

  const knowledge=Math.round(edu*0.10);
  if(knowledge){ total+=knowledge; rows.push({label:"Household education",value:knowledge}); }

  // Recreation is a modest neighborhood-quality input. Its larger effect is
  // already visible through Mood, so this direct contribution stays bounded.
  const rec=recreationStatus(h);
  const recValue=Math.round(clamp(rec.satisfaction,0,100)*0.06*(rec.qualityFactor??1));
  if(recValue){ total+=recValue; rows.push({label:rec.label,value:recValue}); }

  const cafes=countNear(c.cafes,h,5), cafe=Math.min(6,cafes*2);
  if(cafe){ total+=cafe; rows.push({label:"Cafés nearby",value:cafe}); }

  const stations=countNear(c.stations,h,6);
  if(stations){ total+=8; rows.push({label:"Station access",value:8}); }

  const lamps=countNear(c.lamps,h,2), lamp=Math.min(4,lamps*2);
  if(lamp){ total+=lamp; rows.push({label:"Street lighting",value:lamp}); }

  const green=greenScore(h);
  if(green){ total+=green; rows.push({label:"Trees and water",value:green}); }

  let crowd=0;
  for(const other of c.houses||[]) if(Math.max(Math.abs(other.x-h.x),Math.abs(other.y-h.y))<=2) crowd++;
  if(crowd>7){
    const penalty=Math.min(9,(crowd-7)*3);
    total-=penalty; rows.push({label:"Crowding",value:-penalty});
  }

  return {value:clamp(Math.round(total),0,100),rows};
}

export function getDesirability(h){
  const st=stateFor(h);
  const d=desirabilityDetails(h).value;
  st.desirability=d;
  if(S.diagnostics) S.diagnostics.desirabilityRecomputes=(S.diagnostics.desirabilityRecomputes||0)+1;
  return d;
}

export function desirabilityLabel(v){
  v=clamp(Number(v)||0,0,100);
  if(v>=85) return "Highly Desirable";
  if(v>=65) return "Desirable";
  if(v>=45) return "Pleasant";
  if(v>=25) return "Developing";
  return "Quiet Start";
}

export function nextHousingTier(h){
  const current=housingTierIndex(h);
  return RESIDENTIAL_TIERS[current]||null;
}

export function evaluateHousingReadiness(h){
  const current=housingTierIndex(h);
  const next=nextHousingTier(h);
  if(!next) return {complete:true,current:housingTier(h),next:null,requirements:[],ready:false};
  const req=next.requirements||{};
  const desirability=getDesirability(h);
  const education=getEducationLevel(h);
  const requirements=[
    {id:"road",label:"Road access",met:req.road===false||!!h.linked},
    {id:"mood",label:"Mood "+(req.mood||0)+"+",met:(Number(h.mood)||0)>=(req.mood||0)},
    {id:"education",label:"Education "+(req.education||0)+"+",met:education>=(req.education||0)},
    {id:"desirability",label:"Desirability "+(req.desirability||0)+"+",met:desirability>=(req.desirability||0)}
  ];
  return {complete:false,current:housingTier(h),next,requirements,ready:requirements.every(r=>r.met),desirability,education};
}

function upgradeDuration(h,next){
  const base=Math.max(10,Number(next.upgradeSeconds)||60);
  const wobble=0.86+hash2(h.seed,next.id,991)*0.28;
  return base*wobble;
}

export function advanceHousing(dt){
  const homes=(S.ctx&&S.ctx.houses)||[];
  if(S.diagnostics) S.diagnostics.housingEvaluations=(S.diagnostics.housingEvaluations||0)+homes.length;
  for(const h of homes){
    const st=stateFor(h);
    const readiness=evaluateHousingReadiness(h);
    if(readiness.complete){ st.upgradeProgress=0; continue; }
    if(!readiness.ready) continue; // cozy rule: progress pauses; it never falls away.
    st.upgradeProgress=clamp(st.upgradeProgress+dt/upgradeDuration(h,readiness.next),0,1);
    if(st.upgradeProgress<1) continue;
    st.housingTier=Math.min(RESIDENTIAL_TIERS.length,st.housingTier+1);
    st.upgradeProgress=0;
    getDesirability(h);
    invalidateServices();
    if(S.diagnostics) S.diagnostics.housingUpgrades=(S.diagnostics.housingUpgrades||0)+1;
    services.puff(h.x,h.y);
    services.hearts(h.x,h.y);
    emitFeedback(h.x,h.y,'upgrade','★ '+housingTier(h).name);
    services.toast("A home grew into a "+housingTier(h).name,"gold");
  }
}

export function housingMetrics(){
  const homes=(S.ctx&&S.ctx.houses)||[];
  const tiers=RESIDENTIAL_TIERS.map(()=>0);
  let desirability=0,ready=0;
  for(const h of homes){
    const i=housingTierIndex(h)-1;
    if(tiers[i]!==undefined) tiers[i]++;
    desirability+=getDesirability(h);
    if(evaluateHousingReadiness(h).ready) ready++;
  }
  return {tiers,averageDesirability:homes.length?Math.round(desirability/homes.length):0,ready,total:homes.length};
}
