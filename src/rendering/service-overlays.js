import { S } from '../core/state.js';
import { getServiceDefinition } from '../buildings/registry.js';
import { previewEducationAt, serviceBoundaryGeometry } from '../simulation/civic-services.js';
import { proj } from '../world/map.js';
import { diamond, g } from './terrain.js';

const THEMES={
  green:{fill:"rgba(73,166,96,.075)",stroke:"rgba(116,217,137,.86)",strong:"rgba(78,168,104,.30)",strongStroke:"rgba(119,214,139,.86)"}
};

function serviceTheme(def){
  const key=def&&def.visual&&def.visual.boundary;
  return THEMES[key]||THEMES.green;
}

export function drawServiceBoundary(tool,x,y){
  const geo=serviceBoundaryGeometry(tool,x,y);
  if(!geo) return false;
  const theme=serviceTheme(geo.def);
  const corners=[
    proj(geo.minX-0.5,geo.minY-0.5),
    proj(geo.maxX+0.5,geo.minY-0.5),
    proj(geo.maxX+0.5,geo.maxY+0.5),
    proj(geo.minX-0.5,geo.maxY+0.5)
  ];
  g.beginPath(); g.moveTo(corners[0].x,corners[0].y);
  for(let i=1;i<corners.length;i++) g.lineTo(corners[i].x,corners[i].y);
  g.closePath();
  g.fillStyle=theme.fill; g.fill();
  g.strokeStyle=theme.stroke; g.lineWidth=1.7*S.cam.z; g.stroke();
  return true;
}

function drawEducationBenefits(x,y){
  const theme=THEMES.green;
  for(const p of previewEducationAt(x,y)){
    if(p.state==="neutral") continue;
    const q=proj(p.house.x,p.house.y);
    diamond(q.x,q.y,0.74);
    const strong=p.state==="green";
    g.fillStyle=strong?theme.strong:"rgba(220,177,74,.27)";
    g.fill();
    g.strokeStyle=strong?theme.strongStroke:"rgba(239,202,103,.86)";
    g.lineWidth=1.45*S.cam.z;
    g.stroke();
  }
}

export function drawCivicPlacementPreview(tool,x,y){
  const def=getServiceDefinition(tool);
  if(!def) return false;
  drawServiceBoundary(tool,x,y);
  if(def.type==="education") drawEducationBenefits(x,y);
  return true;
}
