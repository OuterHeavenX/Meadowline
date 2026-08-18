import { ambientStart, ambientStop, blip } from '../audio/audio.js';
import { save } from '../core/save.js';
import { S } from '../core/state.js';
import { toggleMap } from '../rendering/minimap.js';
import { hover, render } from '../rendering/renderer.js';
import { DPR, cv } from '../rendering/terrain.js';
import { moodName, rollWishes, setMileHit } from '../simulation/economy.js';
import { recompute } from '../simulation/mood.js';
import { closeLook } from './panels.js';
import { pickTool, toast } from './toolbar.js';
import { genWorld } from '../world/map.js';
import { seasonName } from '../world/seasons.js';
import { refreshPalette } from '../world/seasons.js';

/* ---------- postcard ---------- */
export function postcard(){
  hover.on=false;
  const wasPick=S.pick; S.pick=null;
  render();
  S.pick=wasPick;
  const pad=Math.round(58*DPR);
  const o=document.createElement("canvas");
  o.width=cv.width; o.height=cv.height+pad;
  const og=o.getContext("2d");
  og.fillStyle="#1d2b26"; og.fillRect(0,0,o.width,o.height);
  og.drawImage(cv,0,0);
  const fam='800 %spx "Nunito","Quicksand",ui-rounded,"Trebuchet MS",system-ui,sans-serif';
  og.fillStyle="#f4f0e2";
  og.font=fam.replace("%s",Math.round(21*DPR));
  og.fillText("Meadowline",Math.round(22*DPR),cv.height+Math.round(26*DPR));
  og.fillStyle="#e0ae4e";
  og.font=fam.replace("%s",Math.round(12.5*DPR));
  og.fillText("Day "+S.day+"  \u00b7  "+seasonName()+"  \u00b7  "+S.pop+" citizens  \u00b7  "+moodName(),
              Math.round(22*DPR),cv.height+Math.round(45*DPR));
  const done=(url,revoke)=>{
    const a=document.createElement("a");
    a.href=url; a.download="meadowline-day"+S.day+".png";
    document.body.appendChild(a); a.click(); a.remove();
    if(revoke) setTimeout(()=>URL.revokeObjectURL(url),5000);
    toast("Postcard saved");
  };
  if(o.toBlob) o.toBlob(bl=>{ if(bl) done(URL.createObjectURL(bl),true); });
  else done(o.toDataURL("image/png"),false);
}

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
