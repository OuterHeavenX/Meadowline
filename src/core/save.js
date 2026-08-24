import { BUILDABLE, restoreFacilityOccupancy } from '../buildings/buildings.js';
import { BUILDINGS, defaultBuildingState, getBuildingDefinition } from '../buildings/registry.js';
import { S } from './state.js';
import { recompute } from '../simulation/mood.js';
import { invalidateServices, recomputeServices } from '../simulation/civic-services.js';
import { invalidateCitySummary } from '../simulation/city-summary.js';
import { invalidateRecreation, recomputeRecreation } from '../simulation/recreation.js';
import { mileHit, rollWishes, sanitizeGoals, setMileHit } from '../simulation/wishes.js';
import { toast } from '../ui/notify.js';
import { genWorld } from '../world/map.js';
import { refreshPalette } from '../world/seasons.js';
import { idx, inBounds, isFacilityPart } from '../world/tiles.js';
import { isFootprintUnlocked, sanitizeProgression } from '../progression/city-growth.js';
import { packTerrain, restoreTerrain } from '../world/landscaping.js';

export const KEY='meadowline.v3', KEY_V2='meadowline.v2', KEY_OLD='meadowline.v1';
export const store={get(k){try{return localStorage.getItem(k);}catch(e){return null;}},set(k,v){try{localStorage.setItem(k,v);}catch(e){}}};
function safeStateValue(v,depth=0){
  if(v===null||typeof v==='string'||typeof v==='boolean') return v;
  if(typeof v==='number') return Number.isFinite(v)?v:undefined;
  if(depth>=2) return undefined;
  if(Array.isArray(v)){ const out=[]; for(const item of v.slice(0,16)){ const clean=safeStateValue(item,depth+1); if(clean!==undefined) out.push(clean); } return out; }
  if(v&&typeof v==='object'){ const out={}; let count=0; for(const[k,item]of Object.entries(v)){ if(count++>=16) break; const clean=safeStateValue(item,depth+1); if(clean!==undefined) out[k]=clean; } return out; }
}
function cleanState(type,state){
  const out=defaultBuildingState(type); if(!state||typeof state!=='object'||Array.isArray(state)) return out;
  for(const[k,v]of Object.entries(state)){ const clean=safeStateValue(v); if(clean!==undefined) out[k]=clean; }
  if(type==='house'){
    const tierCount=BUILDINGS.house.housing?.tiers?.length||1;
    out.education=Number.isFinite(state.education)?Math.max(0,Math.min(100,state.education)):Math.max(0,Math.min(100,Number(out.education)||0));
    out.housingTier=Number.isFinite(state.housingTier)?Math.max(1,Math.min(tierCount,Math.floor(state.housingTier))):1;
    out.upgradeProgress=Number.isFinite(state.upgradeProgress)?Math.max(0,Math.min(1,state.upgradeProgress)):0;
    out.desirability=Number.isFinite(state.desirability)?Math.max(0,Math.min(100,state.desirability)):0;
    out.recreationSatisfaction=Number.isFinite(state.recreationSatisfaction)?Math.max(0,Math.min(100,state.recreationSatisfaction)):0;
  }
  if(type==='school') out.level=Number.isFinite(state.level)?Math.max(1,Math.min(2,Math.floor(state.level))):1;
  if(type==='cityHall') out.level=Number.isFinite(state.level)?Math.max(1,Math.min(4,Math.floor(state.level))):1;
  return out;
}
function packBuilding(x){ const out={type:x.type,x:x.x,y:x.y}; if(x.type==='house') out.pop=Math.max(0,Math.floor(Number(x.pop)||0)); const state=cleanState(x.type,x.state); if(Object.keys(state).length) out.state=state; return out; }
export function save(){
  // Footprint markers are derived occupancy. Only authoritative facility roots
  // enter Save V3, so a 4×4 Town Park is still one saved building.
  const b=[]; for(const x of S.grid||[]) if(x&&!isFacilityPart(x)&&BUILDABLE[x.type]) b.push(packBuilding(x));
  let woods=''; for(let i=0;i<S.natTree.length;i++) woods+=S.natTree[i]?'1':'0';
  const payload=JSON.stringify({v:3,seed:S.seed,coins:Math.floor(S.coins),day:S.day,dayT:S.dayT,b,woods,terrain:packTerrain(),tutorial:S.tutorial,municipal:S.municipal,quality:S.quality,rendererMode:S.rendererMode,cityProgress:sanitizeProgression(S.cityProgress,false),mile:mileHit,granted:S.granted||0,wishes:S.wishes.map(w=>({k:w.k,slot:w.slot,t:w.t,g:w.g,r:w.r})),log:S.log.slice(0,40),history:S.history.slice(-40)});
  if(S.diagnostics) S.diagnostics.saveBytes=payload.length; store.set(KEY,payload);
}
function unpackEntry(entry){ if(Array.isArray(entry)){ const[type,x,y,pop]=entry; return {type,x,y,pop,state:defaultBuildingState(type)}; } if(!entry||typeof entry!=='object') return null; return {type:entry.type,x:entry.x,y:entry.y,pop:entry.pop,state:cleanState(entry.type,entry.state)}; }
export function applySave(d){
  genWorld(Number.isFinite(d.seed)?d.seed:S.seed); S.coins=Number.isFinite(d.coins)?d.coins:340; S.day=Number.isFinite(d.day)?Math.max(1,Math.floor(d.day)):1; S.dayT=Number.isFinite(d.dayT)?Math.max(0,Math.min(1,d.dayT)):.24;
  restoreTerrain(d.terrain); S.tutorial=d.tutorial&&typeof d.tutorial==='object'?{completed:!!d.tutorial.completed,skipped:!!d.tutorial.skipped,step:Math.max(0,Math.floor(d.tutorial.step||0))}:{completed:false,skipped:false,step:0};
  if(d.municipal&&typeof d.municipal==='object') S.municipal={...S.municipal,...d.municipal};
  if(['auto','high','balanced','battery'].includes(d.quality)) S.quality=d.quality;
  if(['auto','gpu','compatibility'].includes(d.rendererMode)) S.rendererMode=d.rendererMode;
  S.cityProgress=sanitizeProgression(d.cityProgress,!d.cityProgress); setMileHit(d.mile||0); S.granted=d.granted||0;
  S.log=Array.isArray(d.log)?d.log.filter(e=>e&&typeof e.text==='string').slice(0,60):[]; S.history=Array.isArray(d.history)?d.history.filter(h=>h&&typeof h.day==='number').slice(-40):[];
  if(typeof d.woods==='string'&&d.woods.length===S.natTree.length) for(let i=0;i<d.woods.length;i++) S.natTree[i]=d.woods[i]==='1'?1:0;
  let cityHallSeen=false;
  for(const raw of d.b||[]){
    const e=unpackEntry(raw); if(!e) continue; const{type,x,y}=e;
    if(typeof type!=='string'||!Number.isInteger(x)||!Number.isInteger(y)||!inBounds(x,y)||!BUILDABLE[type]) continue;
    if(type==='cityHall'){ if(cityHallSeen) continue; cityHallSeen=true; }
    const def=getBuildingDefinition(type),fp=def?.placement?.footprint||[1,1];
    if(!isFootprintUnlocked(x,y,fp[0],fp[1])){ if(S.diagnostics) S.diagnostics.invalidFacilityCleanup=(S.diagnostics.invalidFacilityCleanup||0)+1; continue; }
    const root={type,x,y,seed:((x*73856093)^(y*19349663))>>>0,pop:Math.max(0,Math.floor(Number(e.pop)||0)),grow:0,mood:50,linked:false,state:cleanState(type,e.state)};
    if(fp[0]===1&&fp[1]===1){
      // Historical V1/V2/V3 single-tile saves were authoritative about the
      // building position even when regenerated terrain classifications were
      // awkward. Keep that compatibility rule exactly: first saved object wins,
      // no charge, no relocation, and no forced rebuild.
      const i=idx(x,y);
      if(S.grid[i]){ if(S.diagnostics) S.diagnostics.invalidFacilityCleanup=(S.diagnostics.invalidFacilityCleanup||0)+1; continue; }
      S.grid[i]=root; S.natTree[i]=0;
      continue;
    }
    // New multi-tile facilities are stricter: the complete derived footprint
    // must reconstruct safely on valid terrain without overlap.
    if(!restoreFacilityOccupancy(root)){ if(S.diagnostics) S.diagnostics.invalidFacilityCleanup=(S.diagnostics.invalidFacilityCleanup||0)+1; continue; }
  }
  refreshPalette(); invalidateRecreation(); recompute(); recomputeRecreation(true); invalidateServices(); recomputeServices(true); invalidateCitySummary();
  if(!d.tutorial&&(S.grid||[]).some(Boolean)) S.tutorial={completed:false,skipped:true,step:0};
  // Old sandbox Wishes are treated as untrusted hints. Stage/geography-ineligible
  // Train/Boat/etc goals are discarded and replaced by coherent Town Goals.
  S.wishes=sanitizeGoals(d.wishes||[]); rollWishes();
}
export function load(){ let raw=store.get(KEY),source=3; if(!raw){raw=store.get(KEY_V2);source=2;} if(!raw){raw=store.get(KEY_OLD);source=1;} if(!raw) return false; try{ const d=JSON.parse(raw); if(!d||!Array.isArray(d.b)||![1,2,3].includes(d.v)) return false; applySave(d); if(source<3) toast('Your valley carried over'); return true; }catch(e){ return false; } }
export let saveT=0,lookT=0,miniT=0;
addEventListener('visibilitychange',()=>{if(document.hidden)save();}); addEventListener('pagehide',save);
