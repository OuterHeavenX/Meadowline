import { S } from '../core/state.js';
import { LAND_PARCELS, isLegacyOpen, isTileUnlocked, parcelStatus } from '../progression/city-growth.js';
import { H, W } from '../core/constants.js';
import { proj, screen2world } from '../world/map.js';
import { diamond, g } from './terrain.js';

function visibleBounds(){
  const c0=screen2world(0,0),c1=screen2world(innerWidth,0),c2=screen2world(0,innerHeight),c3=screen2world(innerWidth,innerHeight);
  return {
    minX:Math.max(0,Math.floor(Math.min(c0.x,c1.x,c2.x,c3.x))-1),
    maxX:Math.min(W-1,Math.ceil(Math.max(c0.x,c1.x,c2.x,c3.x))+1),
    minY:Math.max(0,Math.floor(Math.min(c0.y,c1.y,c2.y,c3.y))-1),
    maxY:Math.min(H-1,Math.ceil(Math.max(c0.y,c1.y,c2.y,c3.y))+1)
  };
}

function parcelPath(p){
  const a=proj(p.x-0.5,p.y-0.5),b=proj(p.x+p.w-0.5,p.y-0.5),c=proj(p.x+p.w-0.5,p.y+p.h-0.5),d=proj(p.x-0.5,p.y+p.h-0.5);
  g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.lineTo(c.x,c.y);g.lineTo(d.x,d.y);g.closePath();
}

export function drawLandAccess(){
  if(isLegacyOpen()) return;
  const v=visibleBounds();
  for(let y=v.minY;y<=v.maxY;y++) for(let x=v.minX;x<=v.maxX;x++){
    if(isTileUnlocked(x,y)) continue;
    const p=proj(x,y);
    diamond(p.x,p.y,1.015);
    g.fillStyle='rgba(38,47,42,.12)';
    g.fill();
  }
  for(const p of LAND_PARCELS){
    const st=parcelStatus(p.id);
    if(!st||st.state==='unlocked') continue;
    parcelPath(p);
    g.lineWidth=(st.state==='available'?1.8:1.1)*S.cam.z;
    g.strokeStyle=st.state==='available'?'rgba(171,208,143,.62)':'rgba(236,230,211,.20)';
    g.stroke();
    if(st.state==='available'){
      parcelPath(p);
      g.fillStyle='rgba(151,190,125,.035)';
      g.fill();
    }
  }
}
