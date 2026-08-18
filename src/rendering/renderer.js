import { SPANS, canPlace } from '../buildings/buildings.js';
import { H, W, clamp, lerp, mix } from '../core/constants.js';
import { S, idx, inBounds } from '../core/state.js';
import { drawCafe, drawHouse, drawLamp, drawPark, drawStation, drawWindmill } from './buildings.js';
import { drawBirds, drawCitizen, drawCloudShadows, drawFireflies, drawPuff, drawTrain, drawWeather } from './entities.js';
import { diamond, drawGround, drawSpan, drawTree, g, lights } from './terrain.js';
import { darkness } from '../simulation/economy.js';
import { proj } from '../world/map.js';
import { PAL } from '../world/seasons.js';

/* ---------- hover ghost ---------- */
export let hover={x:-1,y:-1,on:false};
export function drawGhost(){
  if(!hover.on||S.tool==="move"||S.tool==="look") return;
  const{x,y}=hover;
  if(!inBounds(x,y)) return;
  const p=proj(x,y);
  const ok=S.tool==="erase"?(!!S.grid[idx(x,y)]||!!S.natTree[idx(x,y)]):canPlace(S.tool,x,y).ok;
  diamond(p.x,p.y,1.02);
  g.fillStyle=ok?"rgba(244,240,226,.34)":"rgba(214,96,80,.34)";
  g.fill();
  g.strokeStyle=ok?"rgba(244,240,226,.85)":"rgba(214,96,80,.9)";
  g.lineWidth=1.6*S.cam.z; g.stroke();
  // radius preview for mood buildings
  const rad=S.tool==="park"?4:S.tool==="cafe"?5:S.tool==="station"?6:S.tool==="lamp"?2:S.tool==="mill"?3:0;
  if(rad){
    g.strokeStyle="rgba(244,240,226,.26)"; g.lineWidth=1.4*S.cam.z;
    const c=[[-rad,-rad],[rad+1,-rad],[rad+1,rad+1],[-rad,rad+1]].map(o=>proj(x+o[0]-0.5,y+o[1]-0.5));
    g.beginPath(); g.moveTo(c[0].x,c[0].y);
    for(let i=1;i<4;i++) g.lineTo(c[i].x,c[i].y);
    g.closePath(); g.stroke();
  }
}

export function drawPick(){
  if(!S.pick) return;
  const p=proj(S.pick.x,S.pick.y);
  const z=S.cam.z, pulse=0.55+0.25*Math.sin(S.t*3);
  diamond(p.x,p.y,1.02);
  g.strokeStyle="rgba(224,174,78,"+pulse.toFixed(3)+")";
  g.lineWidth=2.2*z; g.stroke();
}

/* ---------- frame ---------- */
export function render(){
  const dark=darkness();
  // sky-ish backdrop: this season's daylight, faded toward its own night
  const sky=g.createLinearGradient(0,0,0,innerHeight);
  const k=clamp(dark/0.62,0,1);
  const topC=mix(PAL.skyTop,PAL.nightTop,k);
  const botC=mix(PAL.skyBot,PAL.nightBot,k);
  sky.addColorStop(0,topC); sky.addColorStop(1,botC);
  g.fillStyle=sky; g.fillRect(0,0,innerWidth,innerHeight);

  lights.length=0;
  drawGround();
  drawCloudShadows();
  drawPick();
  drawGhost();

  // depth-sorted pass for everything with height
  const items=[];
  for(let i=0;i<S.grid.length;i++){
    const b=S.grid[i];
    if(!b) continue;
    if(S.terr[i]===1&&SPANS[b.type]) items.push({d:b.x+b.y-0.05,k:5,b});
    else if(b.type!=="road"&&b.type!=="rail") items.push({d:b.x+b.y,k:0,b});
  }
  for(let y=0;y<H;y++)for(let x=0;x<W;x++) if(S.natTree[idx(x,y)]) items.push({d:x+y,k:1,x,y});
  for(const c of S.citizens) items.push({d:lerp(c.x,c.nx,c.p)+lerp(c.y,c.ny,c.p)+0.05,k:2,c});
  for(const t of S.trains) items.push({d:(t.fx||t.x)+(t.fy||t.y)+0.1,k:3,t});
  for(const p of S.puffs) items.push({d:p.x+p.y+0.2,k:4,p});
  items.sort((a,b)=>a.d-b.d);

  for(const it of items){
    if(it.k===0){
      const p=proj(it.b.x,it.b.y);
      if(p.x<-120||p.x>innerWidth+120||p.y<-160||p.y>innerHeight+120) continue;
      const t=it.b.type;
      if(t==="house") drawHouse(it.b,p,dark);
      else if(t==="park") drawPark(it.b,p);
      else if(t==="cafe") drawCafe(it.b,p,dark);
      else if(t==="station") drawStation(it.b,p,dark);
      else if(t==="lamp") drawLamp(it.b,p,dark);
      else if(t==="mill") drawWindmill(it.b,p,dark);
      else if(t==="tree") drawTree(p.x,p.y,it.b.seed,1);
    } else if(it.k===1){
      const p=proj(it.x,it.y);
      if(p.x<-100||p.x>innerWidth+100||p.y<-140||p.y>innerHeight+100) continue;
      drawTree(p.x,p.y,idx(it.x,it.y),0.9);
    } else if(it.k===2) drawCitizen(it.c);
    else if(it.k===3) drawTrain(it.t);
    else if(it.k===5){
      const p=proj(it.b.x,it.b.y);
      if(p.x<-120||p.x>innerWidth+120||p.y<-160||p.y>innerHeight+120) continue;
      drawSpan(it.b,p);
    }
    else drawPuff(it.p);
  }

  drawBirds(dark);

  // a grey wash under the rain
  if(S.wx.amt>0.02&&S.wx.k==="rain"){
    g.fillStyle="rgba(58,76,86,"+(0.17*S.wx.amt).toFixed(3)+")";
    g.fillRect(0,0,innerWidth,innerHeight);
  }

  // night tint + warm windows
  if(dark>0.02){
    g.fillStyle="rgba(26,38,64,"+dark+")";
    g.fillRect(0,0,innerWidth,innerHeight);
    g.globalCompositeOperation="lighter";
    for(const L of lights){
      const a=clamp(dark*1.5,0,1);
      const rg=g.createRadialGradient(L.x+L.w/2,L.y+L.h/2,0,L.x+L.w/2,L.y+L.h/2,(L.big?16:11)*S.cam.z);
      rg.addColorStop(0,"rgba(255,204,130,"+(0.75*a)+")");
      rg.addColorStop(1,"rgba(255,190,120,0)");
      g.fillStyle=rg;
      g.fillRect(L.x-16*S.cam.z,L.y-16*S.cam.z,(L.w+32*S.cam.z),(L.h+32*S.cam.z));
      g.fillStyle="rgba(255,214,150,"+(0.85*a)+")";
      g.fillRect(L.x,L.y,L.w,L.h);
    }
    g.globalCompositeOperation="source-over";
  }

  drawFireflies(dark);
  drawWeather();
}
