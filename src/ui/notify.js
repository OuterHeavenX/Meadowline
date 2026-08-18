export const elHint=document.getElementById("hint");

export let hintT=0;

export function tickHint(dt){
  if(hintT>0){ hintT-=dt; if(hintT<=0) elHint.classList.remove("show"); }
}

export function hint(text,quick){
  elHint.textContent=text;
  elHint.classList.add("show");
  hintT=quick?2.4:4.2;
}

export const elToasts=document.getElementById("toasts");

export function toast(text,cls){
  const d=document.createElement("div");
  d.className="toast"+(cls?" "+cls:"");
  d.textContent=text;
  elToasts.appendChild(d);
  setTimeout(()=>d.classList.add("out"),2600);
  setTimeout(()=>d.remove(),3300);
}
