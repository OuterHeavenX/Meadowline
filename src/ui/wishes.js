import { clamp } from '../core/constants.js';
import { S } from '../core/state.js';
import { WISH_TYPES } from '../simulation/wishes.js';

export let wishSig="";

/* ---------- wishes panel ---------- */
export const elWishes=document.getElementById("wishes");

export function paintWishes(){
  const sig=S.wishes.map(w=>w.k+":"+w.g).join("|");
  if(sig!==wishSig){
    wishSig=sig;
    if(!S.wishes.length){
      elWishes.innerHTML='<div class="wish" style="opacity:.72">Nothing left to wish for \u2014 the valley is content.</div>';
    } else {
      let h="";
      for(const w of S.wishes){
        h+='<div class="wish"><div class="row"><span>'+w.t+'</span><u>+'+w.r+'</u></div>'+
           '<div class="bar"><i></i></div></div>';
      }
      elWishes.innerHTML=h;
    }
  }
  const bars=elWishes.querySelectorAll(".bar i");
  S.wishes.forEach((w,i)=>{
    if(!bars[i]) return;
    const type=WISH_TYPES[w.k];
    bars[i].style.width=Math.round(clamp((type?type.at():0)/w.g,0,1)*100)+"%";
  });
}
