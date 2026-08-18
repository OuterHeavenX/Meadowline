import { H, W, clamp, hash2 } from '../core/constants.js';
import { S } from '../core/state.js';
import { SPANS } from '../transport/bridges.js';
import { screen2world, world2screen } from '../world/map.js';
import { PAL } from '../world/seasons.js';
import { idx } from '../world/tiles.js';

/* ---------- minimap ---------- */
export const elMini=document.getElementById("mini"), mm=document.getElementById("mm"), mg=mm.getContext("2d");
const bMap=document.getElementById("b-map");
export const MS=mm.width/W;
export const MINI_COL={road:"#cfc3a6",rail:"#8a7c63",house:"#d9897a",cafe:"#e0b45a",
                market:"#e5645c",bakery:"#d9a463",school:"#8a6f96",dock:"#a98d68",
                park:"#7bb268",tree:"#5f9350",lamp:"#efd79a",mill:"#efe6d3",station:"#6f8fae"};
export function drawMini(){
  if(elMini.classList.contains("hide")) return;
  mg.fillStyle="#243530"; mg.fillRect(0,0,mm.width,mm.height);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const i=idx(x,y), b=S.grid[i];
    let c;
    if(b) c=(S.terr[i]===1&&SPANS[b.type])?"#e0d2ae":MINI_COL[b.type]||"#cfc3a6";
    else if(S.terr[i]===1) c=PAL.water;
    else if(S.natTree[i]) c="#5f9350";
    else c=PAL.grass[(hash2(x,y,17)*4)|0];
    mg.fillStyle=c;
    mg.fillRect(x*MS,y*MS,MS,MS);
  }
  const cs=[screen2world(0,0),screen2world(innerWidth,0),
            screen2world(innerWidth,innerHeight),screen2world(0,innerHeight)];
  mg.strokeStyle="rgba(244,240,226,.9)"; mg.lineWidth=1.4;
  mg.beginPath();
  cs.forEach((c,i)=>{
    const X=(c.x+0.5)*MS, Y=(c.y+0.5)*MS;
    if(i) mg.lineTo(X,Y); else mg.moveTo(X,Y);
  });
  mg.closePath(); mg.stroke();
}
mm.addEventListener("pointerdown",e=>{
  const r=mm.getBoundingClientRect();
  const x=clamp((e.clientX-r.left)/r.width*W,0,W-1), y=clamp((e.clientY-r.top)/r.height*H,0,H-1);
  const w=world2screen(x,y);
  S.cam.x=innerWidth/2-w.x*S.cam.z;
  S.cam.y=innerHeight/2-w.y*S.cam.z;
  drawMini();
});
export function toggleMap(){
  elMini.classList.toggle("hide");
  bMap.classList.toggle("off",elMini.classList.contains("hide"));
  drawMini();
}
