import { BUILDABLE } from '../buildings/buildings.js';
import { S } from './state.js';
import { H, LEGACY_W, W } from './constants.js';
import { SPANS } from '../transport/bridges.js';
import { addSignal } from '../transport/signals.js';
import { recompute } from '../simulation/mood.js';
import { WISH_TYPES, mileHit, rollWishes, setMileHit } from '../simulation/wishes.js';
import { toast } from '../ui/notify.js';
import { centreCamera, genWorld } from '../world/map.js';
import { refreshPalette } from '../world/seasons.js';
import { idx, inBounds } from '../world/tiles.js';

/* ============================================================
   SAVE / LOAD  (guarded — falls back to a session-only game)
   ============================================================ */
export const KEY="meadowline.v3", KEY_PREV="meadowline.v2", KEY_OLD="meadowline.v1";
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
    v:3,w:W,h:H,seed:S.seed,coins:Math.floor(S.coins),day:S.day,dayT:S.dayT,b,woods,
    mile:mileHit,granted:S.granted||0,
    wishes:S.wishes.map(w=>({k:w.k,t:w.t,g:w.g,r:w.r})),
    log:S.log.slice(0,40), history:S.history.slice(-40),
    signals:S.signals.map(g=>[g.x,g.y])
  }));
}
export function applySave(d){
  genWorld(d.seed);                        // rebuilds terrain from the same seed
  // A save from before the valley grew was laid out on a 44x44 grid. Drop that
  // town into the middle of the new map rather than losing it.
  const savedW=d.w||(typeof d.woods==="string"&&d.woods.length===LEGACY_W*LEGACY_W?LEGACY_W:W);
  const off=savedW===W?0:Math.round((W-savedW)/2);
  S.coins=d.coins; S.day=d.day; S.dayT=d.dayT;
  setMileHit(d.mile||0);
  S.granted=d.granted||0;
  S.log=Array.isArray(d.log)?d.log.filter(e=>e&&typeof e.text==="string").slice(0,60):[];
  S.history=Array.isArray(d.history)?d.history.filter(h=>h&&typeof h.day==="number").slice(-40):[];
  if(typeof d.woods==="string"&&d.woods.length===S.natTree.length){
    for(let i=0;i<d.woods.length;i++) S.natTree[i]=d.woods[i]==="1"?1:0;
  }
  for(const[type,x,y,pop] of d.b){
    const nx=x+off, ny=y+off;
    if(!inBounds(nx,ny)) continue;
    if(!BUILDABLE[type]) continue;         // skip anything a later version dropped
    const i=idx(nx,ny);
    // a rebuilt town must not come back underwater; spans may stay over water
    if(S.terr[i]===1&&!SPANS[type]) S.terr[i]=0;
    S.natTree[i]=0;
    S.grid[i]={type,x:nx,y:ny,seed:((nx*73856093)^(ny*19349663))>>>0,pop:pop||0,grow:0,mood:50,linked:false};
  }
  // signals sit on roads, so they can only go back once the roads are down
  S.signals.length=0;
  if(Array.isArray(d.signals)) for(const g of d.signals){
    if(Array.isArray(g)&&inBounds(g[0]+off,g[1]+off)) addSignal(g[0]+off,g[1]+off);
  }
  if(off) centreCamera();                  // look at where the town actually is
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
  if(!raw){ raw=store.get(KEY_PREV); old=true; }
  if(!raw){ raw=store.get(KEY_OLD); old=true; }
  if(!raw) return false;
  try{
    const d=JSON.parse(raw);
    if(!d||!Array.isArray(d.b)) return false;
    if(d.v!==1&&d.v!==2&&d.v!==3) return false;
    applySave(d);
    if(old) toast("Your valley carried over");
    return true;
  }catch(e){ return false; }
}
export let saveT=0, lookT=0, miniT=0;
addEventListener("visibilitychange",()=>{ if(document.hidden) save(); });
addEventListener("pagehide",save);
