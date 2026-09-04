import { CATEGORIES,COST,ICONS,TOOLS } from '../core/constants.js';
import { buildingThumbnail } from '../rendering/thumbnails.js';
import { landmarkKey } from '../rendering/landmark-assets.js';
import { getBuildingDefinition } from '../buildings/registry.js';
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
const buildDetail=document.getElementById('build-detail');
export let category=CATEGORIES[0].id;

function toolDef(id){return TOOLS.find(t=>t.id===id);}
function footprintLabel(id){
  const fp=getBuildingDefinition(id)?.placement?.footprint;
  return fp?fp[0]+'×'+fp[1]:'';
}
function button(t,compact){
  const locked=t.cat!=='mode'&&!isBuildingUnlocked(t.id); const b=document.createElement('button');
  b.className='tool'+(t.id===S.tool?' on':'')+(locked?' locked':''); b.dataset.id=t.id; b.disabled=locked;
  const unlock=locked?' · unlocks at '+CITY_STAGES[buildingUnlockStage(t.id)-1].name:'';
  const fp=t.cat==='mode'?'':footprintLabel(t.id);
  b.title=t.name+(fp?' · '+fp:'')+(t.cost?' · '+t.cost:'')+unlock+(t.key?' ('+(t.key!==t.key.toLowerCase()?'Shift+'+t.key:t.key.toUpperCase())+')':''); b.setAttribute('aria-label',b.title); b.setAttribute('aria-pressed',t.id===S.tool?'true':'false');
  /* A picture of the actual building where there is one. A wall of similar
     line glyphs told the player almost nothing about what they were choosing
     between; the mesh does. Anything without an authored model - roads, trees,
     lamps, the park lots - keeps its glyph. */
  const art=compact?null:buildingThumbnail(landmarkKey({type:t.id,state:{}}));
  const face=art
    ? '<span class="tool-art"><img src="'+art+'" alt="" draggable="false"></span>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'+ICONS[t.id]+'</svg>';
  const chips=locked
    ? '<u class="tool-locked">At '+CITY_STAGES[buildingUnlockStage(t.id)-1].name+'</u>'
    : '<u>'+(t.cost?'<span class="chip-cost">'+t.cost+'</span>':'<span class="chip-cost">Free</span>')
      +(fp?'<span class="chip-fp">'+fp+'</span>':'')+'</u>';
  b.innerHTML=face+(compact?'<i>'+t.name+'</i>':'<i>'+t.name+'</i>'+chips);
  b.addEventListener('click',()=>pickTool(t.id)); return b;
}
const CAT_ICON={
  ways:'<path d="M7 21 4.5 3M17 21l2.5-18M12 4.5v3M12 11v3M12 17.5v3"/>',
  homes:'<path d="M3.5 11.5 12 4l8.5 7.5M6 10.5V20h12v-9.5M10 20v-5h4v5"/>',
  civic:'<path d="M3 9.5 12 4l9 5.5M5 10h14M6.5 10v8M10 10v8M14 10v8M17.5 10v8M4 20h16"/>',
  trade:'<path d="M4 9.5h16l-1.2-4H5.2L4 9.5ZM5.5 9.5V20h13V9.5M3 20h18"/>',
  recreation:'<path d="M4 19h16M6 16c2-4 3-8 6-11 3 3 4 7 6 11M12 7v12"/>',
  green:'<path d="M12 3.5c3 0 5.2 2.4 5.2 5.2S15 13.5 12 13.5 6.8 11.5 6.8 8.7 9 3.5 12 3.5ZM12 13.5V20M8 20h8"/>',
  wonder:'<path d="M12 3a1.6 1.6 0 1 1 0 3.2A1.6 1.6 0 0 1 12 3ZM12 6.2v7M12 8l-3.2 2M12 8l3.2 2M10.5 13.2 9.5 18M13.5 13.2l1 4.8M6.5 18h11l1 3h-13Z"/>',
  safety:'<path d="M12 3 20 7v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4Z"/>',
  health:'<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3Z"/>',
  landscaping:'<path d="M12 3C9 7 5.5 10.5 5.5 14.5a6.5 6.5 0 0 0 13 0C18.5 10.5 15 7 12 3Z"/>'
};
function renderCats(){ if(!elCats)return; elCats.replaceChildren(); CATEGORIES.forEach(c=>{
  const b=document.createElement('button');b.className='cat'+(c.id===category?' on':'');b.dataset.cat=c.id;
  b.innerHTML=(CAT_ICON[c.id]?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+CAT_ICON[c.id]+'</svg>':'')+'<i>'+c.name+'</i>';
  b.addEventListener('click',()=>showCategory(c.id));elCats.appendChild(b);}); }
function renderModes(){ if(!elModes)return; elModes.replaceChildren(...['look','move','erase','road'].map(toolDef).filter(Boolean).map(t=>button(t,true))); }
/* The hint bar sits above the dock, which is where the catalogue's category
   row lands when the tray is open. The tray's height depends on its contents
   and the viewport, so it is measured and published rather than guessed at in
   CSS, and the hint rides above whatever the tray actually is. */
function publishTrayHeight(open){
  const h=open&&buildTray?Math.round(buildTray.getBoundingClientRect().height):0;
  document.documentElement.style.setProperty('--tray-h',h+'px');
}
export function toggleBuildTray(force){ if(!buildTray)return false; const open=typeof force==='boolean'?force:!buildTray.classList.contains('open'); buildTray.classList.toggle('open',open); elDock?.classList.toggle('catalog-open',open); buildToggle?.classList.toggle('on',open); requestAnimationFrame(()=>publishTrayHeight(open)); buildToggle?.setAttribute('aria-expanded',open?'true':'false'); return open; }
export function showCategory(id){ category=id; renderCats(); if(elTools) elTools.replaceChildren(...TOOLS.filter(t=>t.cat===id).map(t=>button(t,false))); paintTools(); }
export function pickTool(id){
  const t=toolDef(id); if(!t)return;
  if(t.cat!=='mode'&&!isBuildingUnlocked(id)){ hint(t.name+' unlocks at '+CITY_STAGES[buildingUnlockStage(id)-1].name+'.',true); return; }
  if(id!=='look'&&S.tool==='look') services.closeLook();
  S.tool=id;
  if(t.cat!=='mode'&&t.cat!==category) showCategory(t.cat);
  paintTools(); hint(t.desc); services.blip(430,.05,'triangle');
}
function paintBuildDetail(){
  if(!buildDetail)return;
  const t=toolDef(S.tool),d=t&&getBuildingDefinition(t.id);
  if(!t||t.cat==='mode'){buildDetail.innerHTML='<b>Choose a building</b><p>Select a card to see its real cost, footprint and unlock stage.</p>';return;}
  const fp=footprintLabel(t.id)||'1×1',stage=CITY_STAGES[buildingUnlockStage(t.id)-1]?.name||'Settlement';
  buildDetail.innerHTML='<b>'+t.name+'</b><span>'+t.cost+' coins · '+fp+' · '+stage+'</span><p>'+(d?.description||t.desc)+'</p>';
}
export function paintActiveTool(){
  if(!active)return;
  const t=toolDef(S.tool);
  const show=!!t&&S.tool!=='move'&&S.tool!=='look';
  active.classList.toggle('show',show); active.classList.toggle('danger',S.tool==='erase');
  if(!show)return;
  const fp=footprintLabel(S.tool);
  if(activeName)activeName.textContent=t.name+(fp&&fp!=='1×1'?' · '+fp:'')+(t.cost?' · '+t.cost+' coins':'');
  if(activeMeta)activeMeta.textContent=isPaintTool(S.tool)?'Tap once · Hold + drag to paint':(fp&&fp!=='1×1'?'Tap anchor to place full footprint · Drag to move':'Tap to place · Drag to move');
}
export function paintTools(){
  if(elTools){ const expected=TOOLS.filter(t=>t.cat===category); const ids=[...elTools.children].map(b=>b.dataset.id); if(ids.join('|')!==expected.map(t=>t.id).join('|')) elTools.replaceChildren(...expected.map(t=>button(t,false))); }
  for(const b of [...(elTools?.children||[]),...(elModes?.children||[])]){ const c=COST[b.dataset.id]; b.classList.toggle('broke',!b.disabled&&c>0&&S.coins<c); b.classList.toggle('on',b.dataset.id===S.tool); b.setAttribute('aria-pressed',b.dataset.id===S.tool?'true':'false'); }
  elDock?.classList.toggle('building',toolDef(S.tool)?.cat!=='mode'); paintActiveTool();
  paintBuildDetail();
}
buildToggle?.addEventListener('click',()=>toggleBuildTray());
document.getElementById('build-close')?.addEventListener('click',()=>toggleBuildTray(false));
activeConfirm?.addEventListener('click',()=>{ toggleBuildTray(false); paintActiveTool(); });
activeCancel?.addEventListener('click',()=>{ pickTool('move'); toggleBuildTray(false); });
renderCats(); renderModes(); showCategory(category); addEventListener('resize',paintTools);
