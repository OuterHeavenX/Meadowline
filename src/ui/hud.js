import { clamp } from '../core/constants.js';
import { S } from '../core/state.js';
import { WISH_TYPES, moodName, shortTime, timeName } from '../simulation/economy.js';
import { seasonName } from '../world/seasons.js';
import { weatherName } from '../world/weather.js';

export const S_day=document.getElementById("s-day"), S_time=document.getElementById("s-time"),
      S_coins=document.getElementById("s-coins"), S_pop=document.getElementById("s-pop"),
      S_mood=document.getElementById("s-mood");
export let uiT=0;
export function paintHud(){
  S_day.textContent="Day "+S.day;
  const tight=innerWidth<=430;
  S_time.textContent=seasonName()+" \u00b7 "+
    (S.wx.amt>0.3 ? weatherName() : (tight?shortTime():timeName()));
  S_coins.textContent=Math.floor(S.coins);
  S_pop.textContent=S.pop;
  S_mood.textContent=moodName();
}

/* ---------- wishes panel ---------- */
export const elWishes=document.getElementById("wishes");
export let wishSig="";
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
