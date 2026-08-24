import { CATEGORIES,COST,ICONS,TOOLS } from '../core/constants.js';
import { services } from '../core/services.js';
import { S } from '../core/state.js';
import { isPaintTool } from '../core/input-policy.js';
import { buildingUnlockStage,isBuildingUnlocked,CITY_STAGES } from '../progression/city-growth.js';
import { hint } from './notify.js';

export const elDock=document.querySelector('.dock');
export const elTools=document.getElementById('tools');
export const elModes=document.getElementById('modes');
export const elCats=document.getElementById('cats');
const buildTray=document.getElementById('build-tray');
const buildToggle=document.getElementById('b-build');
const active=document.getElementById('active-tool');
const activeName=document.getElementById('active-tool-name');
const activeMeta=document.getElementById('active-tool-meta');
const activeConfirm=document.getElementById('active-tool-confirm');
const activeCancel=document.getElementById('active-tool-cancel');
export let category=CATEGORIES[0].id;

function toolDef(id){return TOOLS.find(t=>t.id===id);}
function button(t,compact){
  const locked=t.cat!=='mode'&&!isBuildingUnlocked(t.id); const b=document.createElement('button');
  b.className='tool'+(t.id===S.tool?' on':'')+(locked?' locked':''); b.dataset.id=t.id; b.disabled=locked;
  const unlock=locked?' · unlocks at '+CITY_STAGES[buildingUnlockStage(t.id)-1].name:'';
  b.title=t.name+(t.cost?' · '+t.cost:'')+unlock+' ('+t.key.toUpperCase()+')'; b.setAttribute('aria-label',b.title); b.setAttribute('aria-pressed',t.id===S.tool?'true':'false');
  b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'+ICONS[t.id]+'</svg>'+(compact?'':'<i>'+t.name+'</i><u>'+(locked?'At '+CITY_STAGES[buildingUnlockStage(t.id)-1].name:(t.cost?t.cost:'Free'))+'</u>');
  b.addEventListener('click',()=>pickTool(t.id)); return b;
}
function renderCats(){ if(!elCats)return; elCats.replaceChildren(); CATEGORIES.forEach(c=>{const b=document.createElement('button');b.className='cat'+(c.id===category?' on':'');b.dataset.cat=c.id;b.textContent=c.name;b.addEventListener('click',()=>showCategory(c.id));elCats.appendChild(b);}); }
function renderModes(){ if(!elModes)return; elModes.replaceChildren(...TOOLS.filter(t=>t.cat==='mode').map(t=>button(t,true))); }
export function toggleBuildTray(force){ if(!buildTray)return false; const open=typeof force==='boolean'?force:!buildTray.classList.contains('open'); buildTray.classList.toggle('open',open); buildToggle?.classList.toggle('on',open); buildToggle?.setAttribute('aria-expanded',open?'true':'false'); return open; }
export function showCategory(id){ category=id; renderCats(); if(elTools) elTools.replaceChildren(...TOOLS.filter(t=>t.cat===id).map(t=>button(t,false))); paintTools(); }
export function pickTool(id){
  const t=toolDef(id); if(!t)return;
  if(t.cat!=='mode'&&!isBuildingUnlocked(id)){ hint(t.name+' unlocks at '+CITY_STAGES[buildingUnlockStage(id)-1].name+'.',true); return; }
  if(id!=='look'&&S.tool==='look') services.closeLook();
  S.tool=id;
  if(t.cat!=='mode'&&t.cat!==category) showCategory(t.cat);
  // Selecting a building no longer closes the tray. The player explicitly
  // chooses ✓ to keep the tool and return map focus, or × to cancel it.
  paintTools(); hint(t.desc); services.blip(430,.05,'triangle');
}
export function paintActiveTool(){
  if(!active)return;
  const t=toolDef(S.tool);
  // Look is a lightweight inspection mode and should never obscure the build catalog.
  const show=!!t&&S.tool!=='move'&&S.tool!=='look';
  active.classList.toggle('show',show); active.classList.toggle('danger',S.tool==='erase');
  if(!show)return;
  if(activeName)activeName.textContent=t.name+(t.cost?' · '+t.cost+' coins':'');
  if(activeMeta)activeMeta.textContent=isPaintTool(S.tool)?'Tap once · Hold + drag to paint':'Tap to place · Drag to move';
}
export function paintTools(){
  if(elTools){ const expected=TOOLS.filter(t=>t.cat===category); const ids=[...elTools.children].map(b=>b.dataset.id); if(ids.join('|')!==expected.map(t=>t.id).join('|')) elTools.replaceChildren(...expected.map(t=>button(t,false))); }
  for(const b of [...(elTools?.children||[]),...(elModes?.children||[])]){ const c=COST[b.dataset.id]; b.classList.toggle('broke',!b.disabled&&c>0&&S.coins<c); b.classList.toggle('on',b.dataset.id===S.tool); b.setAttribute('aria-pressed',b.dataset.id===S.tool?'true':'false'); }
  elDock?.classList.toggle('building',toolDef(S.tool)?.cat!=='mode'); paintActiveTool();
}
buildToggle?.addEventListener('click',()=>toggleBuildTray());
activeConfirm?.addEventListener('click',()=>{ toggleBuildTray(false); paintActiveTool(); });
activeCancel?.addEventListener('click',()=>{ pickTool('move'); toggleBuildTray(false); });
renderCats(); renderModes(); showCategory(category); addEventListener('resize',paintTools);
