import { clamp } from '../core/constants.js';
import { S } from '../core/state.js';
import { goalAt } from '../simulation/wishes.js';
import { cityStage } from '../progression/city-growth.js';

export let wishSig='';
export const elWishes=document.getElementById('wishes');
const title=document.querySelector('#wish-panel h2');
if(title) title.textContent='Town Goals';

function card(w){
  const primary=w.slot==='primary';
  return '<div class="wish '+(primary?'primary':'optional')+'">'+
    '<div class="goal-kind">'+(primary?'NEXT STEP':'OPTIONAL')+'</div>'+
    '<div class="row"><span>'+w.t+'</span><u>+'+w.r+'</u></div><div class="bar"><i></i></div></div>';
}
export function paintWishes(){
  if(!elWishes) return;
  const sig=cityStage().id+'|'+S.wishes.map(w=>w.slot+':'+w.k+':'+w.g).join('|');
  if(sig!==wishSig){
    wishSig=sig;
    elWishes.innerHTML='<div class="goal-stage">'+cityStage().name+'</div>'+S.wishes.map(card).join('');
  }
  const bars=elWishes.querySelectorAll('.bar i');
  S.wishes.forEach((w,i)=>{ if(bars[i]) bars[i].style.width=Math.round(clamp(goalAt(w)/w.g,0,1)*100)+'%'; });
}
