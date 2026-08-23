import { DIRS, H, W } from '../core/constants.js';
import { services } from '../core/services.js';
import { S } from '../core/state.js';
import { isBuildingUnlocked, isTileUnlocked } from '../progression/city-growth.js';
import { schoolStats } from './civic-services.js';
import { note } from './chronicle.js';
import { countBridges } from '../transport/bridges.js';
import { countType, inBounds, isWater, idx } from '../world/tiles.js';

export function ladder(cur,steps){ for(const v of steps) if(v>cur) return v; return Math.round(steps[steps.length-1]*1.6); }
const stage=()=>Math.max(1,Math.min(4,S.cityProgress?.stage||1));
const count=t=>countType(t);
const homes=()=>S.ctx?.houses?.length||0;
const occupied=()=>S.ctx?.houses?.filter(h=>(h.pop||0)>0).length||0;
const townHomes=()=>S.ctx?.houses?.filter(h=>(h.state?.housingTier||1)>=2).length||0;
const established=()=>S.ctx?.houses?.filter(h=>(h.state?.housingTier||1)>=3).length||0;
const avgEducation=()=>S.ctx?.houses?.length?Math.round(S.ctx.houses.reduce((n,h)=>n+(Number(h.state?.education)||0),0)/S.ctx.houses.length):0;
const avgDesirability=()=>S.ctx?.houses?.length?Math.round(S.ctx.houses.reduce((n,h)=>n+(Number(h.state?.desirability)||0),0)/S.ctx.houses.length):0;
const studentsServed=()=>S.services?.education?.metrics?.served||0;
const openedParcels=()=>S.cityProgress?.mode==='legacy-open'?9:(S.cityProgress?.unlockedParcels?.length||1);
const schoolL2=()=>S.ctx?.schools?.filter(s=>(s.state?.level||1)>=2).length||0;

export function hasUsableUnlockedWaterfront(){
  if(!isBuildingUnlocked('dock')) return false;
  for(let y=0;y<H;y++) for(let x=0;x<W;x++){
    if(!isTileUnlocked(x,y)||isWater(x,y)||S.grid[idx(x,y)]) continue;
    for(const[dx,dy]of DIRS){ const nx=x+dx,ny=y+dy; if(inBounds(nx,ny)&&isWater(nx,ny)&&isTileUnlocked(nx,ny)) return true; }
  }
  return false;
}
export function hasFunctionalRailRoute(){ return (S.trains?.length||0)>0 || (count('rail')>=6&&count('station')>=1); }
export function maritimeReady(){ return count('dock')>0; }

function fixed(id,label,at,target,reward,eligible=()=>true){ return {id,label,at,target,reward,eligible}; }
function dynamic(id,make,eligible=()=>true){ return {id,make,eligible}; }

// Player-facing Town Goals. `WISH_TYPES` remains exported as a compatibility alias
// so old V3 saves and older tests can be sanitized without a schema bump.
export const GOAL_TYPES={
  roads:fixed('roads','Lay <b>6</b> road tiles',()=>count('road'),()=>6,36,()=>stage()===1),
  homes:fixed('homes','Build <b>3</b> homes',homes,()=>3,42,()=>stage()===1),
  pop:dynamic('pop',slot=>{ const steps=stage()===1?[8,16]:stage()===2?[24,30]:stage()===3?[40,48]:[64,92,130]; const n=ladder(S.pop,steps); return {t:'Grow to <b>'+n+'</b> residents',g:n,r:Math.min(150,28+n*2),at:()=>S.pop}; }),
  mood:dynamic('mood',()=>{ const n=Math.min(ladder(S.mood,[52,68,82]),82); return {t:'Lift the valley to <b>'+(n>=82?'Blissful':n>=68?'Content':'Settled')+'</b>',g:n,r:70,at:()=>S.mood}; },()=>occupied()>=3&&S.mood<82),
  cafe:fixed('cafe','Open your first <b>café</b>',()=>count('cafe'),()=>1,48,()=>isBuildingUnlocked('cafe')&&count('cafe')<1),
  park:fixed('park','Lay out your first <b>park</b>',()=>count('park'),()=>1,48,()=>isBuildingUnlocked('park')&&count('park')<1),
  school:fixed('school','Open your first <b>School</b>',()=>count('school'),()=>1,95,()=>stage()>=2&&isBuildingUnlocked('school')&&count('school')<1),
  students:fixed('students','Serve <b>6</b> students',studentsServed,()=>6,95,()=>stage()>=2&&count('school')>0&&studentsServed()<6),
  education:dynamic('education',()=>{ const n=stage()===2?8:stage()===3?18:25; return {t:'Raise average Education to <b>'+n+'</b>',g:n,r:110,at:avgEducation}; },()=>stage()>=2&&count('school')>0),
  townhome:dynamic('townhome',()=>{ const n=stage()===2?2:4; return {t:'Develop <b>'+n+'</b> Town Home'+(n>1?'s':''),g:n,r:120,at:townHomes}; },()=>stage()>=2),
  desirability:dynamic('desirability',()=>{ const n=stage()===2?42:50; return {t:'Raise average Desirability to <b>'+n+'</b>',g:n,r:95,at:avgDesirability}; },()=>stage()>=2),
  expansion:dynamic('expansion',()=>{ const n=Math.min(9,openedParcels()+1); return {t:'Open another <b>development parcel</b>',g:n,r:100,at:openedParcels}; },()=>S.cityProgress?.mode!=='legacy-open'&&stage()>=2&&openedParcels()<9),
  market:fixed('market','Open a <b>Market</b>',()=>count('market'),()=>1,90,()=>stage()>=2&&isBuildingUnlocked('market')&&count('market')<1),
  bakery:fixed('bakery','Get a <b>Bakery</b> going',()=>count('bakery'),()=>1,80,()=>stage()>=2&&isBuildingUnlocked('bakery')&&count('bakery')<1),
  school2:fixed('school2','Expand a School to <b>Level 2</b>',schoolL2,()=>1,160,()=>stage()>=3&&count('school')>0&&schoolL2()<1),
  rail:fixed('rail','Lay <b>6</b> rail tiles',()=>count('rail'),()=>6,100,()=>stage()>=3&&isBuildingUnlocked('rail')&&count('rail')<6),
  station:fixed('station','Build your first <b>Station</b>',()=>count('station'),()=>1,115,()=>stage()>=3&&isBuildingUnlocked('station')&&count('rail')>=1&&count('station')<1),
  train:fixed('train','Get your first <b>train</b> running',()=>S.trains.length,()=>1,140,()=>stage()>=3&&hasFunctionalRailRoute()&&S.trains.length<1),
  mill:fixed('mill','Raise a <b>Windmill</b>',()=>count('mill'),()=>1,95,()=>stage()>=3&&isBuildingUnlocked('mill')&&count('mill')<1),
  established:fixed('established','Develop an <b>Established Home</b>',established,()=>1,150,()=>stage()>=3&&established()<1),
  dock:fixed('dock','Build your first <b>Dock</b>',()=>count('dock'),()=>1,135,()=>stage()>=4&&isBuildingUnlocked('dock')&&count('dock')<1&&hasUsableUnlockedWaterfront()),
  boats:fixed('boats','Put a <b>boat</b> on the water',()=>S.boats.length,()=>1,135,()=>stage()>=4&&maritimeReady()&&S.boats.length<1),
  lamp:dynamic('lamp',()=>{ const n=ladder(count('lamp'),[4,10,20]); return {t:'Light the streets with <b>'+n+'</b> lamps',g:n,r:30+n*5,at:()=>count('lamp')}; },()=>occupied()>=3&&isBuildingUnlocked('lamp')),
  tree:dynamic('tree',()=>{ const n=ladder(count('tree'),[6,12,24]); return {t:'Plant <b>'+n+'</b> trees',g:n,r:30+n*3,at:()=>count('tree')}; },()=>isBuildingUnlocked('tree')),
  purse:dynamic('purse',()=>{ const n=ladder(Math.floor(S.coins),[250,600,1200]); return {t:'Put by <b>'+n+'</b> coins',g:n,r:Math.round(n*.12),at:()=>Math.floor(S.coins)}; },()=>S.day>=2)
};
export const WISH_TYPES=GOAL_TYPES;

const PRIMARY_BY_STAGE={
  1:['roads','homes','pop','park','cafe'],
  2:['school','students','townhome','education','desirability','expansion','pop'],
  3:['school2','townhome','established','rail','station','train','expansion','pop'],
  4:['dock','boats','expansion','education','desirability','pop']
};
const OPTIONAL_BY_STAGE={
  1:['park','cafe','tree','mood'],
  2:['market','bakery','park','tree','lamp','mood','purse'],
  3:['mill','market','bakery','park','tree','lamp','mood','purse'],
  4:['dock','boats','park','tree','lamp','mood','purse']
};

function buildGoal(id,slot){
  const def=GOAL_TYPES[id]; if(!def||!def.eligible()) return null;
  const made=def.make?def.make(slot):{t:def.label,g:def.target(),r:def.reward,at:def.at};
  if(!made||!(made.g>0)) return null;
  return {k:id,slot,t:made.t,g:made.g,r:made.r|0};
}
export function goalAt(goal){ const def=GOAL_TYPES[goal?.k]; if(!def) return 0; if(def.make){ const made=def.make(goal.slot); return made.at?made.at():0; } return def.at?def.at():0; }
export function isGoalEligible(goal){
  const def=GOAL_TYPES[goal?.k];
  return !!def&&def.eligible()&&goalAt(goal)<goal.g;
}
export function getEligibleGoals(slot='optional'){
  const list=(slot==='primary'?PRIMARY_BY_STAGE:OPTIONAL_BY_STAGE)[stage()]||[];
  return list.filter(id=>GOAL_TYPES[id]?.eligible()).filter(id=>{ const g=buildGoal(id,slot); return g&&goalAt(g)<g.g; });
}
export function getPrimaryDevelopmentGoal(){ const id=getEligibleGoals('primary')[0]||'pop'; return buildGoal(id,'primary'); }

function chooseOptional(exclude){
  const ids=getEligibleGoals('optional').filter(id=>id!==exclude);
  if(!ids.length) return buildGoal('pop','optional')||buildGoal('purse','optional');
  const id=ids[(Math.random()*ids.length)|0]; return buildGoal(id,'optional');
}
export function sanitizeGoals(list){
  const keep=[];
  for(const raw of Array.isArray(list)?list:[]){
    if(!raw||!GOAL_TYPES[raw.k]) continue;
    const goal={k:raw.k,slot:raw.slot==='primary'?'primary':'optional',t:String(raw.t||''),g:Number(raw.g)||0,r:Number(raw.r)||0};
    if(goal.g>0&&isGoalEligible(goal)&&!keep.some(x=>x.slot===goal.slot)) keep.push(goal);
  }
  return keep.slice(0,2);
}
export function rollWishes(){
  S.wishes=sanitizeGoals(S.wishes);
  let primary=S.wishes.find(w=>w.slot==='primary');
  if(!primary){ primary=getPrimaryDevelopmentGoal(); if(primary) S.wishes.unshift(primary); }
  let optional=S.wishes.find(w=>w.slot==='optional');
  if(!optional){ optional=chooseOptional(primary?.k); if(optional) S.wishes.push(optional); }
  S.wishes=S.wishes.slice(0,2);
  if(S.diagnostics){ S.diagnostics.goalRecomputes=(S.diagnostics.goalRecomputes||0)+1; S.diagnostics.primaryGoal=primary?.k||''; S.diagnostics.optionalGoal=optional?.k||''; }
  services.paintWishes();
}
export function checkWishes(){
  let granted=false;
  for(let i=S.wishes.length-1;i>=0;i--){
    const w=S.wishes[i];
    if(!GOAL_TYPES[w.k]||!isGoalEligible(w)){ S.wishes.splice(i,1); if(S.diagnostics) S.diagnostics.goalReplacements=(S.diagnostics.goalReplacements||0)+1; continue; }
    if(goalAt(w)>=w.g){
      S.wishes.splice(i,1); S.coins+=w.r; S.granted=(S.granted||0)+1;
      services.toast('Town goal complete · +'+w.r+' coins','gold');
      note('Town goal: '+w.t.replace(/<[^>]+>/g,'')); services.blip(784,.16,'triangle'); granted=true;
    }
  }
  if(granted||S.wishes.length<2) rollWishes(); else services.paintWishes();
}

export const MILES=[10,25,50,100,175];
export let mileHit=0;
export function setMileHit(value){ mileHit=value; }
export function checkMiles(){ while(mileHit<MILES.length&&S.pop>=MILES[mileHit]){ services.toast(MILES[mileHit]+' citizens call this home'); note(MILES[mileHit]+' citizens call this home'); mileHit++; } }
