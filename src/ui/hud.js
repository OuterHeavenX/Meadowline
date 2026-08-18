import { ambientStart, ambientStop, blip } from '../audio/audio.js';
import { save } from '../core/save.js';
import { S } from '../core/state.js';
import { toggleMap } from '../rendering/minimap.js';
import { moodName, recompute } from '../simulation/mood.js';
import { rollWishes, setMileHit } from '../simulation/wishes.js';
import { genWorld } from '../world/map.js';
import { refreshPalette, seasonName } from '../world/seasons.js';
import { shortTime, timeName } from '../world/time.js';
import { weatherName } from '../world/weather.js';
import { toast } from './notify.js';
import { closeLook } from './panels.js';
import { postcard } from './postcard.js';
import { pickTool } from './toolbar.js';

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

/* ---------- corner chips ---------- */
export const bSpeed=document.getElementById("b-speed"), bSound=document.getElementById("b-sound"),
      bMap=document.getElementById("b-map"), bShot=document.getElementById("b-shot"),
      bNew=document.getElementById("b-new");
bMap.addEventListener("click",toggleMap);
bShot.addEventListener("click",postcard);
export function toggleSpeed(){ S.speed=S.speed===1?2:S.speed===2?4:1; bSpeed.textContent=S.speed+"\u00d7"; }
export function toggleSound(){
  S.muted=!S.muted;
  bSound.classList.toggle("off",S.muted);
  if(S.muted) ambientStop();
  else { blip(520,0.08); ambientStart(); }
}
bSpeed.addEventListener("click",toggleSpeed);
bSound.addEventListener("click",toggleSound);
bSound.classList.add("off");
bNew.addEventListener("click",()=>{
  if(confirm("Start a brand new valley? This clears the town you've built.")){
    genWorld((Math.random()*1e9)|0); setMileHit(0); S.granted=0; refreshPalette(); recompute(); rollWishes(); closeLook(); save(); toast("A fresh valley");
  }
});
document.getElementById("b-start").addEventListener("click",()=>{
  document.getElementById("veil").classList.add("hide");
  pickTool("road");
});
