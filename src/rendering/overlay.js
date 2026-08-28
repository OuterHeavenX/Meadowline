/* ---------- the juice layer ----------
   Coin payouts, housing-upgrade stars, municipal outcomes and every placement
   puff live in `S.feedback` and `S.puffs`, and the Canvas renderer draws them
   inside the scene so they sort correctly against buildings.

   The Three.js path never drew them at all: render() returns as soon as the GPU
   scene draws, and the GPU scene has no equivalent. Auto picks WebGL2 wherever
   it is available, so on the renderer most players get, the entire feedback
   layer was invisible — the reward existed in state and nobody ever saw it.

   This is one 2D layer above the GPU canvas, reusing the same drawing code and
   the same projection. The Canvas path keeps drawing them in-scene, where depth
   ordering is better than an overlay can be. */
import { S } from '../core/state.js';
import { cv } from './terrain.js';
import { drawPuff } from './effects.js';
import { drawFeedback } from './feedback.js';

let canvas=null,ctx=null,painted=false;

function ensure(){
  if(canvas) return canvas;
  try{
    canvas=document.createElement('canvas');
    canvas.id='juice-layer';
    canvas.setAttribute('aria-hidden','true');
    canvas.style.pointerEvents='none';
    // Above both world canvases, below the HUD, which starts at z-index 5.
    canvas.style.zIndex='2';
    document.body.appendChild(canvas);
    ctx=canvas.getContext('2d');
  }catch(e){ canvas=null; ctx=null; }
  return canvas;
}

/* Called on the Canvas path, where the scene already carries these. Without it
   a fallback mid-session would leave the last GPU frame's badges frozen on
   screen. Cheap: it does nothing until the layer has actually been used. */
export function clearJuiceOverlay(){
  if(!canvas||!ctx||!painted) return;
  // Reset first: clearRect honours the drawing transform, so clearing under a
  // device-pixel-ratio scale wipes only part of the backing store and leaves
  // the rest of the last frame on screen.
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,canvas.width,canvas.height);
  painted=false;
}

export function drawJuiceOverlay(){
  const items=(S.feedback?.length||0)+(S.puffs?.length||0);
  // Nothing to say and nothing left over: skip the layer entirely.
  if(!items&&!painted) return;
  if(!ensure()||!ctx) return;
  // Matches the world canvas exactly, so proj() lands in the same place. The
  // transform is reset on resize because changing width clears it.
  if(canvas.width!==cv.width||canvas.height!==cv.height){
    canvas.width=cv.width; canvas.height=cv.height;
  }
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const dpr=innerWidth?cv.width/innerWidth:1;
  ctx.setTransform(dpr,0,0,dpr,0,0);
  for(const p of S.puffs||[]) drawPuff(p,ctx);
  drawFeedback(ctx);
  painted=items>0;
}

export function resetJuiceOverlay(){
  if(canvas) canvas.remove();
  canvas=null; ctx=null; painted=false;
}
