import { BUILDABLE, erase, place } from '../buildings/buildings.js';
import { TOOLS, clamp } from './constants.js';
import { S } from './state.js';
import { toggleMap } from '../rendering/minimap.js';
import { hover } from '../rendering/renderer.js';
import { cv } from '../rendering/terrain.js';
import { recompute } from '../simulation/mood.js';
import { checkWishes } from '../simulation/wishes.js';
import { hint } from '../ui/notify.js';
import { closeLook, inspect } from '../ui/panels.js';
import { toggleLedgerChip, toggleSound, toggleSpeed } from '../ui/hud.js';
import { postcard } from '../ui/postcard.js';
import { pickTool } from '../ui/toolbar.js';
import { screen2world, world2screen } from '../world/map.js';

/* ============================================================
   INPUT
   ============================================================ */
export const ptrs=new Map();
export let dragged=false, lastPinch=0, painted=new Set();
let pendingTap=null, pinchActive=false;
const PAINT_TOOLS=new Set(["road","rail","tree","erase"]);

export function toGrid(e){
  const w=screen2world(e.clientX,e.clientY);
  return {x:Math.floor(w.x+0.5),y:Math.floor(w.y+0.5)};
}
export function applyTool(gp){
  const key=gp.x+","+gp.y;
  if(painted.has(key)) return;
  painted.add(key);
  if(S.tool==="look"){ inspect(gp.x,gp.y); return; }
  if(S.tool==="erase") erase(gp.x,gp.y);
  else if(BUILDABLE[S.tool]) place(S.tool,gp.x,gp.y);
  recompute();
  checkWishes();
}

cv.addEventListener("pointerdown",e=>{
  cv.setPointerCapture(e.pointerId);
  ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY});
  if(ptrs.size===1){
    dragged=false; pinchActive=false; painted.clear();
    pendingTap=(S.tool!=="move"&&e.button!==1)?{pointerId:e.pointerId,gp:toGrid(e)}:null;
  } else {
    // A second finger always wins over a build tap. Nothing is committed until
    // pointerup, so pinch/zoom can never accidentally place the pending building.
    pendingTap=null;
    pinchActive=true;
    dragged=true;
  }
});
cv.addEventListener("pointermove",e=>{
  const gp=toGrid(e);
  hover.x=gp.x; hover.y=gp.y; hover.on=true;
  const p=ptrs.get(e.pointerId);
  if(!p) return;
  const dx=e.clientX-p.x, dy=e.clientY-p.y;
  p.x=e.clientX; p.y=e.clientY;
  const moved=Math.hypot(e.clientX-p.sx,e.clientY-p.sy)>6;
  if(moved) dragged=true;

  if(ptrs.size>=2){
    pendingTap=null; pinchActive=true;
    const a=[...ptrs.values()];
    const d=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);
    const mx=(a[0].x+a[1].x)/2, my=(a[0].y+a[1].y)/2;
    if(lastPinch){
      const f=d/lastPinch;
      zoomAt(mx,my,f);
    }
    lastPinch=d;
    S.cam.x+=dx/2; S.cam.y+=dy/2;
    return;
  }
  if(S.tool==="move"||e.buttons===4){ S.cam.x+=dx; S.cam.y+=dy; return; }
  if(e.buttons&&moved&&PAINT_TOOLS.has(S.tool)){
    if(pendingTap){ applyTool(pendingTap.gp); pendingTap=null; }
    applyTool(gp);
  }
});
export function endPtr(e){
  const wasLast=ptrs.size===1&&ptrs.has(e.pointerId);
  if(wasLast&&!pinchActive&&!dragged&&pendingTap&&pendingTap.pointerId===e.pointerId){
    applyTool(pendingTap.gp);
  }
  ptrs.delete(e.pointerId);
  pendingTap=null;
  if(ptrs.size<2) lastPinch=0;
  if(ptrs.size===0){
    pinchActive=false; dragged=false; painted.clear();
    if(e.pointerType==="touch") hover.on=false;
  }
}
cv.addEventListener("pointerup",endPtr);
cv.addEventListener("pointercancel",e=>{ pendingTap=null; pinchActive=true; endPtr(e); });
cv.addEventListener("pointerleave",e=>{ if(ptrs.size===0) hover.on=false; if(ptrs.has(e.pointerId)) endPtr(e); });

export function zoomAt(sx,sy,f){
  const anchor=screen2world(sx,sy);          // world point under the cursor
  S.cam.z=clamp(S.cam.z*f,0.34,2.6);
  const w=world2screen(anchor.x,anchor.y);   // keep it pinned there
  S.cam.x=sx-w.x*S.cam.z;
  S.cam.y=sy-w.y*S.cam.z;
}
cv.addEventListener("wheel",e=>{
  e.preventDefault();
  zoomAt(e.clientX,e.clientY,e.deltaY<0?1.12:1/1.12);
},{passive:false});

addEventListener("keydown",e=>{
  if(e.metaKey||e.ctrlKey||e.altKey) return;
  const k=e.key.toLowerCase();
  const t=TOOLS.find(t=>t.key===k);
  if(t){ pickTool(t.id); return; }
  if(k==="m") toggleSound();
  if(k==="s") toggleSpeed();
  if(k==="b") toggleMap();
  if(k==="p") postcard();
  if(k==="l") toggleLedgerChip();
  if(k==="escape") closeLook();
  if(k===" "){ e.preventDefault(); S.running=!S.running; hint(S.running?"Resumed":"Paused",true); }
  const pan=60;
  if(k==="arrowleft") S.cam.x+=pan;
  if(k==="arrowright") S.cam.x-=pan;
  if(k==="arrowup") S.cam.y+=pan;
  if(k==="arrowdown") S.cam.y-=pan;
});
