import { canPlace } from '../buildings/buildings.js';
import { getBuildingDefinition } from '../buildings/registry.js';
import { H, W, clamp, lerp, mix } from '../core/constants.js';
import { S } from '../core/state.js';
import { drawBakery, drawCafe, drawDock, drawLamp, drawMarket, drawPark, drawSchool, drawStation, drawWindmill } from './buildings.js';
import { drawRecreationFacility } from './recreation.js';
import { drawCityHall } from './city-hall.js';
import { drawHousingHouse } from './housing.js';
import { drawCivicPlacementPreview } from './service-overlays.js';
import { drawLandAccess } from './land-overlays.js';
import { drawSchoolUpgradeDetails } from './school-upgrades.js';
import { drawBirds, drawCloudShadows, drawFireflies, drawLanterns, drawMotes, drawPuff, drawWeather } from './effects.js';
import { drawBoat, drawCitizen, drawTrain } from './entities.js';
import { drawVehicle } from './vehicles.js';
import { diamond, drawGround, drawSpan, drawTree, g, lights } from './terrain.js';
import { SPANS } from '../transport/bridges.js';
import { proj, viewDepth } from '../world/map.js';
import { PAL } from '../world/seasons.js';
import { facilityFootprint, footprintCells, idx, inBounds, isFacilityPart } from '../world/tiles.js';
import { darkness } from '../world/time.js';
import { drawIncident, drawMunicipalBuilding } from './municipal.js';
import { drawFeedback } from './feedback.js';
import { presentFrame } from './backend.js';
import { renderThreeScene } from './three-renderer.js';
import { clearJuiceOverlay, drawJuiceOverlay } from './overlay.js';
import { hover } from './interaction-state.js';

export { hover };
export function drawGhost(){
  if(!hover.on||S.tool==="move"||S.tool==="look") return;
  const{x,y}=hover;
  if(!inBounds(x,y)) return;
  const result=S.tool==="erase"||S.tool==='water'?null:canPlace(S.tool,x,y);
  const ok=S.tool==="erase"?(!!S.grid[idx(x,y)]||!!S.natTree[idx(x,y)]):S.tool==='water'?(!S.grid[idx(x,y)]&&S.terr[idx(x,y)]!==1):result.ok;
  const servicePreview=S.tool==='erase'?false:drawCivicPlacementPreview(S.tool,x,y);
  const def=getBuildingDefinition(S.tool),cells=def?footprintCells(S.tool,x,y):[{x,y}];
  for(const c of cells){
    if(!inBounds(c.x,c.y)) continue;
    const p=proj(c.x,c.y);
    diamond(p.x,p.y,1.02);
    g.fillStyle=ok?"rgba(244,240,226,.30)":"rgba(214,96,80,.34)"; g.fill();
    g.strokeStyle=ok?"rgba(244,240,226,.88)":"rgba(214,96,80,.92)";
    g.lineWidth=1.5*S.cam.z; g.stroke();
  }
  const fallback={park:4,cafe:5,station:6,lamp:2,mill:3,market:5,bakery:4,dock:4};
  const rad=servicePreview?0:(def?.service?.type==='recreation'?(def.service.radius||0):(fallback[S.tool]||0));
  if(rad){
    const fp=def?.placement?.footprint||[1,1],cx=x+(fp[0]-1)/2,cy=y+(fp[1]-1)/2;
    g.strokeStyle="rgba(244,240,226,.24)"; g.lineWidth=1.2*S.cam.z;
    const c=[[-rad,-rad],[rad+1,-rad],[rad+1,rad+1],[-rad,rad+1]].map(o=>proj(cx+o[0]-0.5,cy+o[1]-0.5));
    g.beginPath(); g.moveTo(c[0].x,c[0].y); for(let i=1;i<4;i++) g.lineTo(c[i].x,c[i].y); g.closePath(); g.stroke();
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

export function render(){
  // The GPU scene has no feedback or particle layer of its own, so the juice
  // that state already carries is drawn above it. The Canvas path below keeps
  // drawing both in-scene, where they sort correctly against buildings.
  if(renderThreeScene()){ drawJuiceOverlay(); return; }
  clearJuiceOverlay();
  const dark=darkness();
  const sky=g.createLinearGradient(0,0,0,innerHeight);
  const k=clamp(dark/0.62,0,1);
  const topC=mix(PAL.skyTop,PAL.nightTop,k), botC=mix(PAL.skyBot,PAL.nightBot,k);
  sky.addColorStop(0,topC); sky.addColorStop(1,botC);
  g.fillStyle=sky; g.fillRect(0,0,innerWidth,innerHeight);

  lights.length=0;
  drawGround();
  drawLandAccess();
  drawCloudShadows();
  drawPick();
  drawGhost();

  const items=[];
  for(let i=0;i<S.grid.length;i++){
    const b=S.grid[i]; if(!b||isFacilityPart(b)) continue;
    if(S.terr[i]===1&&SPANS[b.type]) items.push({d:viewDepth(b.x,b.y)-0.05,k:5,b});
    else if(b.type!=="road"&&b.type!=="rail"){
      const fp=facilityFootprint(b);
      items.push({d:viewDepth(b.x,b.y)+(fp[0]+fp[1]-2)*0.48,k:0,b});
    }
  }
  for(let y=0;y<H;y++)for(let x=0;x<W;x++) if(S.natTree[idx(x,y)]) items.push({d:viewDepth(x,y),k:1,x,y});
  for(const c of S.citizens){
    const fx=c.facilityLocal?.x??lerp(c.x,c.nx,c.p),fy=c.facilityLocal?.y??lerp(c.y,c.ny,c.p);
    items.push({d:viewDepth(fx,fy)+0.05,k:2,c});
  }
  for(const v of S.vehicles||[]) items.push({d:viewDepth(lerp(v.x,v.nx,v.p),lerp(v.y,v.ny,v.p))+0.075,k:7,v});
  for(const v of S.serviceVehicles||[]) items.push({d:viewDepth(lerp(v.x,v.nx,v.p),lerp(v.y,v.ny,v.p))+0.08,k:7,v});
  for(const t of S.trains) items.push({d:viewDepth(t.fx||t.x,t.fy||t.y)+0.1,k:3,t});
  for(const t of S.boats) items.push({d:viewDepth(t.fx||t.x,t.fy||t.y)+0.08,k:6,t});
  for(const p of S.puffs) items.push({d:viewDepth(p.x,p.y)+0.2,k:4,p});
  items.sort((a,b)=>a.d-b.d);

  for(const it of items){
    if(it.k===0){
      const p=proj(it.b.x,it.b.y);
      if(p.x<-220||p.x>innerWidth+220||p.y<-260||p.y>innerHeight+180) continue;
      const t=it.b.type;
      if(t==="house") drawHousingHouse(it.b,p,dark);
      else if(t==="park") drawPark(it.b,p);
      else if(getBuildingDefinition(t)?.service?.type==='recreation') drawRecreationFacility(it.b,dark);
      else if(t==="cafe") drawCafe(it.b,p,dark);
      else if(t==="station") drawStation(it.b,p,dark);
      else if(t==="lamp") drawLamp(it.b,p,dark);
      else if(t==="mill") drawWindmill(it.b,p,dark);
      else if(t==="market") drawMarket(it.b,p,dark);
      else if(t==="bakery") drawBakery(it.b,p,dark);
      else if(t==="school"){ drawSchool(it.b,p,dark); drawSchoolUpgradeDetails(it.b,p,dark); }
      else if(t==="cityHall") drawCityHall(it.b,p,dark);
      else if(t==="dock") drawDock(it.b,p,dark);
      else if(['policeStation','fireStation','clinic','hospital'].includes(t)) drawMunicipalBuilding(it.b,dark);
      else if(t==="tree") drawTree(p.x,p.y,it.b.seed,1);
    } else if(it.k===1){
      const p=proj(it.x,it.y);
      if(p.x<-100||p.x>innerWidth+100||p.y<-140||p.y>innerHeight+100) continue;
      drawTree(p.x,p.y,idx(it.x,it.y),0.9);
    } else if(it.k===2) drawCitizen(it.c);
    else if(it.k===3) drawTrain(it.t);
    else if(it.k===6) drawBoat(it.t);
    else if(it.k===7) drawVehicle(it.v);
    else if(it.k===5){
      const p=proj(it.b.x,it.b.y);
      if(p.x<-120||p.x>innerWidth+120||p.y<-160||p.y>innerHeight+120) continue;
      drawSpan(it.b,p);
    } else drawPuff(it.p);
  }

  drawBirds(dark);
  if(S.wx.amt>0.02&&S.wx.k==="rain"){
    g.fillStyle="rgba(58,76,86,"+(0.17*S.wx.amt).toFixed(3)+")"; g.fillRect(0,0,innerWidth,innerHeight);
  }
  if(dark>0.02){
    g.fillStyle="rgba(26,38,64,"+dark+")"; g.fillRect(0,0,innerWidth,innerHeight);
    g.globalCompositeOperation="lighter";
    for(const L of lights){
      const a=clamp(dark*1.5,0,1);
      const rg=g.createRadialGradient(L.x+L.w/2,L.y+L.h/2,0,L.x+L.w/2,L.y+L.h/2,(L.big?16:11)*S.cam.z);
      rg.addColorStop(0,"rgba(255,204,130,"+(0.75*a)+")"); rg.addColorStop(1,"rgba(255,190,120,0)");
      g.fillStyle=rg; g.fillRect(L.x-16*S.cam.z,L.y-16*S.cam.z,(L.w+32*S.cam.z),(L.h+32*S.cam.z));
      g.fillStyle="rgba(255,214,150,"+(0.85*a)+")"; g.fillRect(L.x,L.y,L.w,L.h);
    }
    g.globalCompositeOperation="source-over";
  }
  drawFireflies(dark); drawLanterns(dark); drawMotes(); drawWeather();
  for(const inc of S.incidents||[]) drawIncident(inc);
  drawFeedback();
  presentFrame();
}
