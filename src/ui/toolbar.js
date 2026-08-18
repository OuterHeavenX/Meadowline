import { COST, ICONS, TOOLS } from '../core/constants.js';
import { services } from '../core/services.js';
import { S } from '../core/state.js';
import { hint } from './notify.js';

/* ============================================================
   UI
   ============================================================ */
export const elTools=document.getElementById("tools");
TOOLS.forEach(t=>{
  const b=document.createElement("button");
  b.className="tool"+(t.id===S.tool?" on":"");
  b.dataset.id=t.id;
  b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'+ICONS[t.id]+'</svg>'+
              '<i>'+t.name+'</i><u>'+(t.cost?t.cost:"&nbsp;")+'</u>';
  b.addEventListener("click",()=>pickTool(t.id));
  elTools.appendChild(b);
});
export function pickTool(id){
  if(id!=="look"&&S.tool==="look") services.closeLook();
  S.tool=id;
  for(const b of elTools.children) b.classList.toggle("on",b.dataset.id===id);
  const t=TOOLS.find(t=>t.id===id);
  hint(t.desc);
  services.blip(430,0.05,"triangle");
}
export function paintTools(){
  for(const b of elTools.children){
    const c=COST[b.dataset.id];
    b.classList.toggle("broke",c>0&&S.coins<c);
  }
  elDock.classList.toggle("more",
    elTools.scrollLeft+elTools.clientWidth < elTools.scrollWidth-2);
}
export const elDock=document.querySelector(".dock");
elTools.addEventListener("scroll",paintTools);
addEventListener("resize",paintTools);
