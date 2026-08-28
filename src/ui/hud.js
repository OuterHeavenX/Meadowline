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
import { cityStage, nextStageProgress, resetProgression } from '../progression/city-growth.js';
import { askConfirm } from './confirm.js';
import { toast } from './notify.js';
import { closeLook } from './panels.js';
import { postcard } from './postcard.js';
import { toggleLedger } from './ledger.js';
import { pickTool } from './toolbar.js';
import { paintGrowthPanel } from './growth.js';

export const S_day=document.getElementById("s-day"), S_time=document.getElementById("s-time"),
      S_coins=document.getElementById("s-coins"), S_pop=document.getElementById("s-pop"),
      S_mood=document.getElementById("s-mood");
const S_stage=document.getElementById('s-stage'),S_stageProgress=document.getElementById('s-stage-progress'),
  S_dateSub=document.getElementById('s-date-sub'),S_weather=document.getElementById('s-weather');
export let uiT=0;
export function paintHud(){
  S_day.textContent="Day "+S.day;
  const tight=innerWidth<=430;
  S_time.textContent=tight?shortTime():timeName();
  S_dateSub.textContent=seasonName();
  S_weather.textContent=S.wx.amt>0.3?weatherName():'Clear';
  S_coins.textContent=Math.floor(S.coins);
  S_pop.textContent=S.pop;
  S_mood.textContent=moodName();
  const stage=cityStage(),next=nextStageProgress();
  S_stage.textContent=stage.name;
  let pct=100;
  if(next){
    const rows=[...next.progress.required,...next.progress.any.flatMap(g=>g.items)];
    pct=rows.length?Math.round(rows.filter(r=>r.met).length/rows.length*100):0;
  }
  S_stageProgress?.style.setProperty('--stage-progress',pct+'%');
  // paintHud runs five times a second; a missing element must skip a label,
  // not throw and take the whole frame loop down with it.
  const setText=(id,value)=>{ const el=document.getElementById(id); if(el) el.textContent=value; };
  setText('menu-pop',S.pop);
  setText('menu-stage',stage.name);
  setText('menu-residents',S.pop);
  setText('menu-day',S.day);
}

export const bSpeed=document.getElementById("b-speed"), bSound=document.getElementById("b-sound"),
      bMap=document.getElementById("b-map"), bShot=document.getElementById("b-shot"),
      bLedger=document.getElementById("b-ledger"), bNew=document.getElementById("b-new");
bMap.addEventListener("click",toggleMap);
bShot.addEventListener("click",postcard);
bLedger.addEventListener("click",()=>toggleLedgerChip());
export function toggleLedgerChip(){ bLedger.classList.toggle("off",!toggleLedger()); }
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
bLedger.classList.add("off");
bNew.addEventListener("click",async()=>{
  const ok=await askConfirm({title:'Start a brand new valley?',
    body:"The town you've built is cleared and replaced with fresh land. This cannot be undone.",
    confirmLabel:'New valley',tone:'danger'});
  if(ok){
    resetProgression('parcel');
    genWorld((Math.random()*1e9)|0); setMileHit(0); S.granted=0; refreshPalette(); recompute(); rollWishes(); closeLook(); save(); paintGrowthPanel(); toast("A fresh valley");
  }
});
document.getElementById("b-start").addEventListener("click",()=>{
  document.getElementById("veil").classList.add("hide");
  document.body.classList.remove('menu-open');
  pickTool("move");
});
document.getElementById('b-stage')?.addEventListener('click',()=>document.getElementById('b-growth')?.click());
document.getElementById('menu-new')?.addEventListener('click',()=>bNew.click());
document.getElementById('menu-save')?.addEventListener('click',()=>{save();toast('City saved','gold');});
document.getElementById('menu-settings')?.addEventListener('click',()=>document.querySelector('.settings-toggle')?.click());
const credits=document.getElementById('credits-dialog');
document.getElementById('menu-credits')?.addEventListener('click',()=>credits?.showModal());
credits?.querySelector('button')?.addEventListener('click',()=>credits.close());

function paintMenuPresentation(){
  document.querySelectorAll('[data-menu-renderer]').forEach(b=>b.classList.toggle('on',b.dataset.menuRenderer===(S.rendererMode||'auto')));
  document.querySelectorAll('[data-menu-quality]').forEach(b=>b.classList.toggle('on',b.dataset.menuQuality===(S.quality||'auto')));
}
document.querySelectorAll('[data-menu-renderer]').forEach(b=>b.addEventListener('click',()=>{
  const select=document.querySelector('[data-renderer]'); if(!select)return;
  select.value=b.dataset.menuRenderer;select.dispatchEvent(new Event('change'));paintMenuPresentation();
}));
document.querySelectorAll('[data-menu-quality]').forEach(b=>b.addEventListener('click',()=>{
  const select=document.querySelector('[data-quality]'); if(!select)return;
  select.value=b.dataset.menuQuality;select.dispatchEvent(new Event('change'));paintMenuPresentation();
}));
paintMenuPresentation();
document.body.classList.add('menu-open');
