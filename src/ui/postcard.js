import { S } from '../core/state.js';
import { hover, render } from '../rendering/renderer.js';
import { DPR, cv } from '../rendering/terrain.js';
import { moodName } from '../simulation/mood.js';
import { seasonName } from '../world/seasons.js';
import { toast } from './notify.js';

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
