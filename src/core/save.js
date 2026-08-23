import { BUILDABLE } from '../buildings/buildings.js';
import { defaultBuildingState } from '../buildings/registry.js';
import { S } from './state.js';
import { recompute } from '../simulation/mood.js';
import { invalidateServices, recomputeServices } from '../simulation/civic-services.js';
import { WISH_TYPES, mileHit, rollWishes, setMileHit } from '../simulation/wishes.js';
import { toast } from '../ui/notify.js';
import { genWorld } from '../world/map.js';
import { refreshPalette } from '../world/seasons.js';
import { idx, inBounds } from '../world/tiles.js';

/* ============================================================
   SAVE / LOAD  (guarded — falls back to a session-only game)
   ============================================================ */
export const KEY="meadowline.v3", KEY_V2="meadowline.v2", KEY_OLD="meadowline.v1";
export const store={
  get(k){try{return localStorage.getItem(k);}catch(e){return null;}},
  set(k,v){try{localStorage.setItem(k,v);}catch(e){}}
};

// V3 deliberately preserves small JSON-safe unknown fields so future systems can
// add optional building metadata without forcing a schema bump for every property.
// The bounds keep a corrupt save from exploding localStorage or recursive parsing.
function safeStateValue(v,depth=0){
  if(v===null||typeof v==="string"||typeof v==="boolean") return v;
  if(typeof v==="number") return Number.isFinite(v)?v:undefined;
  if(depth>=2) return undefined;
  if(Array.isArray(v)){
    const out=[];
    for(const item of v.slice(0,16)){
      const clean=safeStateValue(item,depth+1);
      if(clean!==undefined) out.push(clean);
    }
    return out;
  }
  if(v&&typeof v==="object"){
    const out={}; let count=0;
    for(const[k,item]of Object.entries(v)){
      if(count++>=16) break;
      const clean=safeStateValue(item,depth+1);
      if(clean!==undefined) out[k]=clean;
    }
    return out;
  }
  return undefined;
}
function cleanState(type,state){
  const out=defaultBuildingState(type);
  if(!state||typeof state!=="object"||Array.isArray(state)) return out;
  for(const[k,v]of Object.entries(state)){
    const clean=safeStateValue(v);
    if(clean!==undefined) out[k]=clean;
  }
  if(type==="house") out.education=Number.isFinite(state.education)?Math.max(0,Math.min(100,state.education)):Math.max(0,Math.min(100,Number(out.education)||0));
  if(type==="school") out.level=Number.isFinite(state.level)?Math.max(1,Math.floor(state.level)):Math.max(1,Math.floor(Number(out.level)||1));
  return out;
}
function packBuilding(x){
  const out={type:x.type,x:x.x,y:x.y};
  if(x.type==="house") out.pop=Math.max(0,Math.floor(Number(x.pop)||0));
  const state=cleanState(x.type,x.state);
  if(Object.keys(state).length) out.state=state;
  return out;
}

export function save(){
  const b=[];
  for(let i=0;i<S.grid.length;i++){
    const x=S.grid[i]; if(!x) continue;
    b.push(packBuilding(x));
  }
  let woods="";
  for(let i=0;i<S.natTree.length;i++) woods+=S.natTree[i]?"1":"0";
  const payload=JSON.stringify({
    v:3,seed:S.seed,coins:Math.floor(S.coins),day:S.day,dayT:S.dayT,b,woods,
    mile:mileHit,granted:S.granted||0,
    wishes:S.wishes.map(w=>({k:w.k,t:w.t,g:w.g,r:w.r})),
    log:S.log.slice(0,40), history:S.history.slice(-40)
  });
  if(S.diagnostics) S.diagnostics.saveBytes=payload.length;
  store.set(KEY,payload);
}

function unpackEntry(entry){
  if(Array.isArray(entry)){
    const[type,x,y,pop]=entry;
    return {type,x,y,pop,state:defaultBuildingState(type)};
  }
  if(!entry||typeof entry!=="object") return null;
  return {type:entry.type,x:entry.x,y:entry.y,pop:entry.pop,state:cleanState(entry.type,entry.state)};
}

export function applySave(d){
  genWorld(Number.isFinite(d.seed)?d.seed:S.seed); // rebuild terrain from the same seed
  S.coins=Number.isFinite(d.coins)?d.coins:340;
  S.day=Number.isFinite(d.day)?Math.max(1,Math.floor(d.day)):1;
  S.dayT=Number.isFinite(d.dayT)?Math.max(0,Math.min(1,d.dayT)):0.24;
  setMileHit(d.mile||0);
  S.granted=d.granted||0;
  S.log=Array.isArray(d.log)?d.log.filter(e=>e&&typeof e.text==="string").slice(0,60):[];
  S.history=Array.isArray(d.history)?d.history.filter(h=>h&&typeof h.day==="number").slice(-40):[];
  if(typeof d.woods==="string"&&d.woods.length===S.natTree.length){
    for(let i=0;i<d.woods.length;i++) S.natTree[i]=d.woods[i]==="1"?1:0;
  }
  for(const raw of d.b||[]){
    const e=unpackEntry(raw); if(!e) continue;
    const{type,x,y}=e;
    if(typeof type!=="string"||!Number.isInteger(x)||!Number.isInteger(y)) continue;
    if(!inBounds(x,y)||!BUILDABLE[type]) continue;
    S.natTree[idx(x,y)]=0;
    S.grid[idx(x,y)]={type,x,y,seed:((x*73856093)^(y*19349663))>>>0,pop:Math.max(0,Math.floor(Number(e.pop)||0)),grow:0,mood:50,linked:false,state:cleanState(type,e.state)};
  }
  refreshPalette();
  recompute();
  invalidateServices();
  recomputeServices(true);
  // saved wishes come back as they were; anything unrecognised is re-rolled
  S.wishes=(d.wishes||[]).filter(w=>w&&WISH_TYPES[w.k]&&w.g>0)
                         .map(w=>({k:w.k,t:String(w.t),g:w.g,r:w.r|0}))
                         .slice(0,2);
  rollWishes();
}

export function load(){
  let raw=store.get(KEY), source=3;
  if(!raw){ raw=store.get(KEY_V2); source=2; }
  if(!raw){ raw=store.get(KEY_OLD); source=1; }
  if(!raw) return false;
  try{
    const d=JSON.parse(raw);
    if(!d||!Array.isArray(d.b)) return false;
    if(d.v!==1&&d.v!==2&&d.v!==3) return false;
    applySave(d);
    if(source<3) toast("Your valley carried over");
    return true;
  }catch(e){ return false; }
}
export let saveT=0, lookT=0, miniT=0;
addEventListener("visibilitychange",()=>{ if(document.hidden) save(); });
addEventListener("pagehide",save);
