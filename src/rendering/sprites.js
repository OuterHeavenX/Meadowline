import { TW } from '../core/constants.js';
import { S } from '../core/state.js';
import { PAL } from '../world/seasons.js';
import { g } from './terrain.js';

/* ---------- rendered building sprites ----------
   The buildings are modelled and lit in Blender (see tools/) and rendered from
   the same 2:1 dimetric angle the canvas uses, so a sprite drops straight onto
   the tile grid. Three passes per building: daylight, winter, and the emissive
   parts alone, which are added back after the night tint.

   Everything here is optional. If the manifest or an image fails to load the
   game carries on drawing the buildings by hand, exactly as before. Trees,
   parks and lamps are deliberately not sprites: they carry the season's colour
   and are re-tinted every frame. */

const BASE="assets/sprites/";
export const atlas={ ready:false, tile:128, w:256, h:256, entries:{} };
export const litQueue=[];              // drawn after the night tint, additively

export function loadSprites(){
  fetch(BASE+"manifest.json").then(r=>{
    if(!r.ok) throw new Error("no manifest");
    return r.json();
  }).then(m=>{
    atlas.tile=m.tile||128;
    atlas.w=(m.size&&m.size[0])||256;
    atlas.h=(m.size&&m.size[1])||256;
    let pending=0, loaded=0;
    for(const name of Object.keys(m.sprites||{})){
      const rec=m.sprites[name], imgs={};
      for(const which of (rec.passes||["base"])){
        pending++;
        const im=new Image();
        im.onload=()=>{ if(++loaded>=pending) atlas.ready=true; };
        im.onerror=()=>{ imgs[which]=null; if(++loaded>=pending) atlas.ready=true; };
        im.src=BASE+name+"-"+which+".png";
        imgs[which]=im;
      }
      atlas.entries[name]={anchor:rec.anchor||[atlas.w/2,atlas.h*0.65],imgs};
    }
    if(!pending) atlas.ready=false;
  }).catch(()=>{ atlas.ready=false; });   // hand-drawn buildings carry on
}

export function hasSprite(name){
  return atlas.ready&&!!atlas.entries[name]&&!!atlas.entries[name].imgs.base;
}

const ok=(im)=>im&&im.complete&&im.naturalWidth>0;

/* Draw a building from its sprite. Returns false if there isn't one, so the
   caller can fall back to drawing it by hand. */
export function drawSprite(name,p,dark){
  const e=atlas.entries[name];
  if(!atlas.ready||!e||!ok(e.imgs.base)) return false;
  const k=(TW*S.cam.z)/atlas.tile;                 // sprite px -> screen px
  const dw=atlas.w*k, dh=atlas.h*k;
  const dx=p.x-e.anchor[0]*k, dy=p.y-e.anchor[1]*k;

  g.drawImage(e.imgs.base,dx,dy,dw,dh);

  const snow=PAL.snow||0;
  if(snow>0.02&&ok(e.imgs.snow)){
    g.globalAlpha=Math.min(1,snow);
    g.drawImage(e.imgs.snow,dx,dy,dw,dh);
    g.globalAlpha=1;
  }
  if(dark>0.06&&ok(e.imgs.lit)){
    litQueue.push({im:e.imgs.lit,dx,dy,dw,dh,a:Math.min(0.82,dark/0.62)});
  }
  return true;
}

// windows glowing through the night tint
export function drawLitSprites(){
  if(!litQueue.length) return;
  g.globalCompositeOperation="lighter";
  for(const q of litQueue){
    g.globalAlpha=q.a;
    g.drawImage(q.im,q.dx,q.dy,q.dw,q.dh);
  }
  g.globalAlpha=1;
  g.globalCompositeOperation="source-over";
  litQueue.length=0;
}

// the three roof colours a house can have, chosen the same way as before
export function houseSprite(b){
  return ["house_a","house_b","house_c"][(b.seed>>>3)%3];
}

