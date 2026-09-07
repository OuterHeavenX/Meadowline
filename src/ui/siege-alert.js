import { S } from '../core/state.js';
import { POINTS, fromPhrase, siegeWarning } from '../simulation/siege.js';

/* ============================================================
   THE WARNING

   A night is the one thing in Meadowline that happens *to* the player rather
   than because of them, and the map is bigger than the screen — so being told
   which way they are coming is not decoration, it is the whole of the decision
   about where to look and what to do with the seconds you have.

   It is DOM rather than anything drawn into the scene, on purpose: it has to
   look identical whichever renderer is running, it has to sit above both of
   them, and an arrow pointing off the edge of the screen is a thing about the
   screen and not about the valley.

   The pulse is on a timer that stops. A red edge that never goes away stops
   being a warning within about a minute and becomes the colour of the game.
   ============================================================ */

const FLASH=6.5;                 // seconds of the loud version
const ARROW_ROOM=0.5;            // how far in from the edge the arrows sit, as a fraction

let root=null,flash=null,band=null,arrows=new Map(),shownFor=-1;

function build(){
  if(root||typeof document==='undefined') return root;
  root=document.createElement('div');
  root.id='siege-alert'; root.setAttribute('aria-hidden','true'); root.hidden=true;
  flash=document.createElement('div'); flash.className='siege-flash';
  band=document.createElement('div'); band.className='siege-band';
  root.append(flash,band);
  for(const p of POINTS){
    const a=document.createElement('div');
    a.className='siege-arrow siege-'+p;
    a.innerHTML='<span class="siege-head">▲</span>';
    a.hidden=true;
    arrows.set(p,a); root.appendChild(a);
  }
  (document.body||document.documentElement).appendChild(root);
  return root;
}

/* Called from the same clock that paints the rest of the HUD. It reads the
   siege and owns nothing: there is no way to raise an alarm from here, which
   is the point — the warning cannot be more or less alarming than the night. */
export function paintSiegeAlert(){
  const w=siegeWarning();
  const el=build(); if(!el) return;
  if(!w){
    if(!el.hidden){ el.hidden=true; el.classList.remove('siege-loud','siege-surge'); shownFor=-1; }
    return;
  }
  el.hidden=false;
  const loud=w.age<FLASH;
  el.classList.toggle('siege-loud',loud);
  el.classList.toggle('siege-surge',!!w.surge);
  // The band only says what it is; the arrows say where.
  if(shownFor!==w.dirs.length||band.dataset.n!==String(w.size)){
    band.dataset.n=String(w.size);
    /* The directions are their own span so a narrow screen can drop them and
       keep the count, rather than truncating the sentence mid-word. The arrows
       are saying the same thing anyway, and there are more of them than there
       is room for words. */
    band.textContent='';
    band.append((w.surge?'A dark night \u00b7 ':'')+w.size+' coming ');
    const where=document.createElement('span');
    where.className='siege-where'; where.textContent=fromPhrase(w.dirs);
    band.appendChild(where);
    shownFor=w.dirs.length;
  }
  for(const [p,a] of arrows) a.hidden=!w.dirs.includes(p);
}
