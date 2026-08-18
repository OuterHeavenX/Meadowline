import { BUILDABLE } from '../buildings/buildings.js';
import { S, idx, inBounds } from './state.js';
import { WISH_TYPES, mileHit, rollWishes, setMileHit } from '../simulation/economy.js';
import { recompute } from '../simulation/mood.js';
import { toast } from '../ui/toolbar.js';
import { genWorld } from '../world/map.js';
import { refreshPalette } from '../world/seasons.js';

/* ============================================================
   SAVE / LOAD  (guarded — falls back to a session-only game)
   ============================================================ */
export const KEY="meadowline.v2", KEY_OLD="meadowline.v1";
export const store={
  get(k){try{return localStorage.getItem(k);}catch(e){return null;}},
  set(k,v){try{localStorage.setItem(k,v);}catch(e){}}
};
export function save(){
  const b=[];
  for(let i=0;i<S.grid.length;i++){
    const x=S.grid[i]; if(!x) continue;
    b.push([x.type,x.x,x.y,x.pop]);
  }
  let woods="";
  for(let i=0;i<S.natTree.length;i++) woods+=S.natTree[i]?"1":"0";
  store.set(KEY,JSON.stringify({
    v:2,seed:S.seed,coins:Math.floor(S.coins),day:S.day,dayT:S.dayT,b,woods,
    mile:mileHit,granted:S.granted||0,
    wishes:S.wishes.map(w=>({k:w.k,t:w.t,g:w.g,r:w.r}))
  }));
}
export function applySave(d){
  genWorld(d.seed);                        // rebuilds terrain from the same seed
  S.coins=d.coins; S.day=d.day; S.dayT=d.dayT;
  setMileHit(d.mile||0);
  S.granted=d.granted||0;
  if(typeof d.woods==="string"&&d.woods.length===S.natTree.length){
    for(let i=0;i<d.woods.length;i++) S.natTree[i]=d.woods[i]==="1"?1:0;
  }
  for(const[type,x,y,pop] of d.b){
    if(!inBounds(x,y)) continue;
    if(!BUILDABLE[type]) continue;         // skip anything a later version dropped
    S.natTree[idx(x,y)]=0;
    S.grid[idx(x,y)]={type,x,y,seed:((x*73856093)^(y*19349663))>>>0,pop:pop||0,grow:0,mood:50,linked:false};
  }
  refreshPalette();
  recompute();
  // saved wishes come back as they were; anything unrecognised is re-rolled
  S.wishes=(d.wishes||[]).filter(w=>w&&WISH_TYPES[w.k]&&w.g>0)
                         .map(w=>({k:w.k,t:String(w.t),g:w.g,r:w.r|0}))
                         .slice(0,2);
  rollWishes();
}
export function load(){
  let raw=store.get(KEY), old=false;
  if(!raw){ raw=store.get(KEY_OLD); old=true; }
  if(!raw) return false;
  try{
    const d=JSON.parse(raw);
    if(!d||!Array.isArray(d.b)) return false;
    if(d.v!==1&&d.v!==2) return false;
    applySave(d);
    if(old) toast("Your valley carried over");
    return true;
  }catch(e){ return false; }
}
export let saveT=0, lookT=0, miniT=0;
addEventListener("visibilitychange",()=>{ if(document.hidden) save(); });
addEventListener("pagehide",save);
