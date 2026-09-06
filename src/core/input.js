import { BUILDABLE, erase, isMovable, place, relocate, removalIntent } from '../buildings/buildings.js';
import { TOOLS, clamp } from './constants.js';
import { getBuildingDefinition } from '../buildings/registry.js';
import { S } from './state.js';
import { isPaintTool, isTextEntryTarget, RESERVED_SHORTCUT_KEYS, TOUCH_DRAG_THRESHOLD, TOUCH_PAINT_HOLD_MS } from './input-policy.js';
import { toggleMap } from '../rendering/minimap.js';
import { carrying, hover, pickUp, putDown } from '../rendering/interaction-state.js';
import { cv } from '../rendering/terrain.js';
import { recompute } from '../simulation/mood.js';
import { checkWishes } from '../simulation/wishes.js';
import { askConfirm } from '../ui/confirm.js';
import { hint } from '../ui/notify.js';
import { closeLook, inspect } from '../ui/panels.js';
import { inspectCityHall } from '../ui/city-hall.js';
import { toggleLedgerChip, toggleSound, toggleSpeed } from '../ui/hud.js';
import { postcard } from '../ui/postcard.js';
import { pickTool, paintActiveTool } from '../ui/toolbar.js';
import { rotateView, screen2world, setViewRotation, world2screen } from '../world/map.js';
import { facilityRootAt } from '../world/tiles.js';
import { paintWater } from '../world/landscaping.js';

/* ============================================================
   INPUT — touch navigation is always the safe default.
   Tap places. Immediate drag pans. Paint/destructive drag requires a hold.
   Building tools remain armed after successful placement until explicitly
   cancelled or replaced.
   ============================================================ */
export const ptrs=new Map();
export let dragged=false, lastPinch=0, painted=new Set();
let paintSkipNoticed=false;
let pendingTap=null, pinchActive=false, paintActive=false, holdTimer=0;
// Null until two fingers are down, so the first twist frame sets a baseline
// instead of spinning the city by whatever the absolute finger angle is.
let lastTwist=null;
// A jump larger than this between frames is a finger being swapped, not a
// wrist turning; applying it would flip the city instantly.
const TWIST_MAX_STEP=Math.PI/4;

function diagnostic(name){ if(S.diagnostics) S.diagnostics[name]=(S.diagnostics[name]||0)+1; }
function setInputState(state){ if(S.diagnostics) S.diagnostics.inputState=state; }
function clearHold(){ if(holdTimer){ clearTimeout(holdTimer); holdTimer=0; } }

export function toGrid(e){
  const w=screen2world(e.clientX,e.clientY);
  return {x:Math.floor(w.x+0.5),y:Math.floor(w.y+0.5)};
}
function buildingName(type){ return getBuildingDefinition(type)?.name||'facility'; }

// The confirmation is asynchronous, so the removal runs after the answer
// instead of blocking the pointer path. Simulation code stays synchronous and
// never learns that a dialog exists.
async function askRemoval(gp,intent){
  const ok=await askConfirm({title:intent.title,body:intent.body,confirmLabel:intent.confirmLabel,tone:'danger'});
  if(!ok) return;
  if(erase(gp.x,gp.y,{confirmed:true})){ recompute(); checkWishes(); paintActiveTool(); }
}

export function applyTool(gp,{touch=false,paint=false}={}){
  const key=gp.x+','+gp.y;
  if(painted.has(key)) return false;
  painted.add(key);
  let changed=false;
  if(S.tool==='look'){
    const root=facilityRootAt(gp.x,gp.y),x=root?.x??gp.x,y=root?.y??gp.y;
    if(!inspectCityHall(x,y)) inspect(x,y);
    return true;
  }
  /* Move: the first tap picks a building up, the second sets it down. Two
     taps rather than a drag because a drag on the map is already a pan on
     touch, and because a building the size of a hospital needs to be aimed
     rather than flung. */
  if(S.tool==='relocate'){
    const root=facilityRootAt(gp.x,gp.y);
    if(!carrying.on){
      if(!root){ hint('Tap a building to pick it up.',true); return false; }
      if(!isMovable(root)){ hint('Ways are laid and cleared rather than carried about.',true); return false; }
      pickUp(root.x,root.y);
      hint('Carrying the '+buildingName(root.type)+'. Tap where it should go.');
      paintActiveTool();
      return true;
    }
    const held=facilityRootAt(carrying.x,carrying.y);
    if(!held){ putDown(); hint('That building is no longer there.',true); paintActiveTool(); return false; }
    const moved=relocate(held,gp.x,gp.y);
    if(!moved.ok) return false;
    putDown();
    if(S.pick&&S.pick.x===moved.from.x&&S.pick.y===moved.from.y) S.pick={x:gp.x,y:gp.y};
    recompute(); checkWishes(); paintActiveTool();
    return true;
  }
  if(S.tool==='erase'){
    const intent=removalIntent(gp.x,gp.y);
    if(intent.ok&&intent.needsConfirm){
      // Remove is a paint tool: a dialog mid-drag would be worse than the bug.
      // A hold-and-drag sweep skips anything valuable and says so once.
      if(paint){
        if(!paintSkipNoticed){ paintSkipNoticed=true; hint('Tap it on its own to remove the '+(intent.root?.type?buildingName(intent.root.type):'facility')+'.',true); }
        return false;
      }
      askRemoval(gp,intent);
      return false;
    }
    changed=erase(gp.x,gp.y);
  }
  else if(S.tool==='water'){
    const r=paintWater(gp.x,gp.y); changed=r.ok; if(!r.ok&&r.why) hint(r.why,true);
  }
  else if(BUILDABLE[S.tool]) changed=place(S.tool,gp.x,gp.y);
  if(changed){
    recompute();
    checkWishes();
    if(touch&&!paint) paintActiveTool();
  }
  return changed;
}

cv.addEventListener('pointerdown',e=>{
  cv.setPointerCapture(e.pointerId);
  ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,down:performance.now(),type:e.pointerType});
  if(ptrs.size===1){
    dragged=false; pinchActive=false; paintActive=false; painted.clear(); paintSkipNoticed=false; clearHold();
    pendingTap=(S.tool!=='move'&&e.button!==1)?{pointerId:e.pointerId,gp:toGrid(e),type:e.pointerType}:null;
    setInputState(S.tool==='move'?'NAVIGATING':(isPaintTool(S.tool)?'PAINT_HOLD_PENDING':'TAP_BUILD_ARMED'));
    if(e.pointerType==='touch'&&isPaintTool(S.tool)){
      holdTimer=setTimeout(()=>{
        const p=ptrs.get(e.pointerId);
        if(!p||ptrs.size!==1||pinchActive||dragged) return;
        paintActive=true; pendingTap=null; painted.clear();
        applyTool(toGrid({clientX:p.x,clientY:p.y}),{touch:true,paint:true});
        setInputState('PAINTING'); diagnostic('paintActivations'); paintActiveTool();
      },TOUCH_PAINT_HOLD_MS);
    }
  } else {
    clearHold(); pendingTap=null; pinchActive=true; paintActive=false; dragged=true;
    setInputState('PINCHING'); diagnostic('cancelledBuildByPinch');
  }
});

cv.addEventListener('pointermove',e=>{
  const gp=toGrid(e);
  hover.x=gp.x; hover.y=gp.y; hover.on=true;
  const p=ptrs.get(e.pointerId); if(!p) return;
  const dx=e.clientX-p.x, dy=e.clientY-p.y;
  p.x=e.clientX; p.y=e.clientY;
  const movedPx=Math.hypot(e.clientX-p.sx,e.clientY-p.sy);
  const moved=movedPx>TOUCH_DRAG_THRESHOLD;

  if(ptrs.size>=2){
    clearHold(); pendingTap=null; pinchActive=true; paintActive=false; dragged=true; setInputState('PINCHING');
    const a=[...ptrs.values()];
    const d=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);
    const mx=(a[0].x+a[1].x)/2, my=(a[0].y+a[1].y)/2;
    if(lastPinch) zoomAt(mx,my,d/lastPinch);
    // Twisting two fingers turns the city, alongside the pinch that zooms it.
    // Tracked as a delta between frames rather than against the angle the
    // gesture started at, so it survives a finger being lifted and replaced.
    const angle=Math.atan2(a[1].y-a[0].y,a[1].x-a[0].x);
    if(lastTwist!==null){
      let spin=angle-lastTwist;
      while(spin>Math.PI) spin-=Math.PI*2;
      while(spin<-Math.PI) spin+=Math.PI*2;
      if(Math.abs(spin)<TWIST_MAX_STEP) setViewRotation((S.cam.rot||0)+spin);
    }
    lastTwist=angle;
    lastPinch=d; S.cam.x+=dx/2; S.cam.y+=dy/2; return;
  }

  if(e.pointerType==='touch'){
    if(paintActive){ if(e.buttons) applyTool(gp,{touch:true,paint:true}); return; }
    if(moved){
      clearHold();
      if(pendingTap){ pendingTap=null; diagnostic('cancelledBuildByDrag'); }
      dragged=true; setInputState('NAVIGATING'); diagnostic('touchPans');
      S.cam.x+=dx; S.cam.y+=dy; return;
    }
    return;
  }

  if(S.tool==='move'||e.buttons===4){ dragged=moved||dragged; S.cam.x+=dx; S.cam.y+=dy; return; }
  if(e.buttons&&moved&&isPaintTool(S.tool)){
    dragged=true;
    if(pendingTap){ applyTool(pendingTap.gp,{paint:true}); pendingTap=null; }
    applyTool(gp,{paint:true});
  }
});

export function endPtr(e){
  clearHold();
  const wasLast=ptrs.size===1&&ptrs.has(e.pointerId);
  if(wasLast&&!pinchActive&&!dragged&&!paintActive&&pendingTap&&pendingTap.pointerId===e.pointerId){
    if(applyTool(pendingTap.gp,{touch:e.pointerType==='touch'})) diagnostic('tapPlacements');
  }
  ptrs.delete(e.pointerId); pendingTap=null;
  if(ptrs.size<2) lastPinch=0;
  if(ptrs.size===0){
    pinchActive=false; dragged=false; paintActive=false; painted.clear(); setInputState('IDLE'); paintActiveTool();
    lastTwist=null;
    if(e.pointerType==='touch') hover.on=false;
  }
}
cv.addEventListener('pointerup',endPtr);
cv.addEventListener('pointercancel',e=>{ clearHold(); pendingTap=null; pinchActive=true; endPtr(e); });
cv.addEventListener('pointerleave',e=>{ if(ptrs.size===0) hover.on=false; if(ptrs.has(e.pointerId)) endPtr(e); });

export function zoomAt(sx,sy,f){
  const anchor=screen2world(sx,sy);
  S.cam.z=clamp(S.cam.z*f,0.34,2.6);
  const w=world2screen(anchor.x,anchor.y);
  S.cam.x=sx-w.x*S.cam.z; S.cam.y=sy-w.y*S.cam.z;
}
cv.addEventListener('wheel',e=>{ e.preventDefault(); zoomAt(e.clientX,e.clientY,e.deltaY<0?1.12:1/1.12); },{passive:false});

addEventListener('keydown',e=>{
  if(e.metaKey||e.ctrlKey||e.altKey) return;
  if(isTextEntryTarget(e.target)) return;
  const k=e.key.toLowerCase();
  // Shell shortcuts are resolved first so a future tool key can never shadow
  // one silently; conflictingToolKeys() keeps the two sets disjoint in CI.
  // A tool declaring an uppercase key lives on the Shift layer, so it is
  // matched against the untouched e.key before the unshifted tools are.
  const shifted=e.shiftKey?TOOLS.find(t=>t.key&&t.key===e.key&&t.key!==t.key.toLowerCase()):null;
  const t=shifted||(RESERVED_SHORTCUT_KEYS.has(k)?null:TOOLS.find(t=>t.key&&t.key===k));
  if(t){ pickTool(t.id); return; }
  if(k==='m') toggleSound(); if(k==='s') toggleSpeed(); if(k==='b') toggleMap(); if(k==='p') postcard(); if(k==='l') toggleLedgerChip();
  if(k==='escape'){ closeLook(); putDown(); pickTool('move'); }
  if(k===' '){ e.preventDefault(); S.running=!S.running; hint(S.running?'Resumed':'Paused',true); }
  // Quarter turns, which both renderers can show: the fallback snaps rotation
  // to quarters because its tiles are drawn as fixed diamonds, so a smaller
  // step would appear to do nothing there until it crossed the halfway point.
  if(k===',') rotateView(-Math.PI/2);
  if(k==='.') rotateView(Math.PI/2);
  const pan=60;
  if(k==='arrowleft') S.cam.x+=pan; if(k==='arrowright') S.cam.x-=pan; if(k==='arrowup') S.cam.y+=pan; if(k==='arrowdown') S.cam.y-=pan;
});
