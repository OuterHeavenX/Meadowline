import { CATEGORIES, COST, ICONS, TOOLS } from '../core/constants.js';
import { services } from '../core/services.js';
import { S } from '../core/state.js';
import { buildingUnlockStage, isBuildingUnlocked, CITY_STAGES } from '../progression/city-growth.js';
import { hint } from './notify.js';

export const elDock=document.querySelector(".dock");
export const elTools=document.getElementById("tools");
export const elModes=document.getElementById("modes");
export const elCats=document.getElementById("cats");
export let category=CATEGORIES[0].id;

function button(t,compact){
  const locked=t.cat!=="mode"&&!isBuildingUnlocked(t.id);
  const b=document.createElement("button");
  b.className="tool"+(t.id===S.tool?" on":"")+(locked?" locked":"");
  b.dataset.id=t.id;
  b.disabled=locked;
  const unlock=locked?" · unlocks at "+CITY_STAGES[buildingUnlockStage(t.id)-1].name:"";
  b.title=t.name+(t.cost?" · "+t.cost:"")+unlock+" ("+t.key.toUpperCase()+")";
  b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'+ICONS[t.id]+'</svg>'+
              (compact?'':'<i>'+t.name+'</i><u>'+(locked?'Locked':(t.cost?t.cost:"&nbsp;"))+'</u>');
  b.addEventListener("click",()=>pickTool(t.id));
  return b;
}

CATEGORIES.forEach(c=>{
  const b=document.createElement("button");
  b.className="cat"+(c.id===category?" on":"");
  b.dataset.cat=c.id;
  b.textContent=c.name;
  b.addEventListener("click",()=>showCategory(c.id));
  elCats.appendChild(b);
});
TOOLS.filter(t=>t.cat==="mode").forEach(t=>elModes.appendChild(button(t,true)));

export function showCategory(id){
  category=id;
  for(const b of elCats.children) b.classList.toggle("on",b.dataset.cat===id);
  elTools.replaceChildren(...TOOLS.filter(t=>t.cat===id).map(t=>button(t,false)));
  paintTools();
}

export function pickTool(id){
  const t=TOOLS.find(t=>t.id===id);
  if(!t) return;
  if(t.cat!=="mode"&&!isBuildingUnlocked(id)){
    hint(t.name+' unlocks at '+CITY_STAGES[buildingUnlockStage(id)-1].name+'.',true);
    return;
  }
  if(id!=="look"&&S.tool==="look") services.closeLook();
  S.tool=id;
  if(t.cat!=="mode"&&t.cat!==category) showCategory(t.cat);
  for(const b of [...elTools.children,...elModes.children]) b.classList.toggle("on",b.dataset.id===id);
  hint(t.desc);
  services.blip(430,0.05,"triangle");
}

export function paintTools(){
  // Rebuild the visible category if a stage change may have unlocked tools.
  const expected=TOOLS.filter(t=>t.cat===category);
  const ids=[...elTools.children].map(b=>b.dataset.id);
  const should=expected.map(t=>t.id);
  const unlockChanged=expected.some(t=>{
    const b=[...elTools.children].find(x=>x.dataset.id===t.id);
    return b&&b.disabled===isBuildingUnlocked(t.id);
  });
  if(ids.join('|')!==should.join('|')||unlockChanged){
    elTools.replaceChildren(...expected.map(t=>button(t,false)));
  }
  for(const b of [...elTools.children,...elModes.children]){
    const c=COST[b.dataset.id];
    b.classList.toggle("broke",!b.disabled&&c>0&&S.coins<c);
    b.classList.toggle("on",b.dataset.id===S.tool);
  }
  elDock.classList.toggle("more",elTools.scrollLeft+elTools.clientWidth < elTools.scrollWidth-2);
}

showCategory(category);
elTools.addEventListener("scroll",paintTools);
addEventListener("resize",paintTools);
