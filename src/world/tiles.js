import { H, W } from '../core/constants.js';
import { S } from '../core/state.js';
import { getBuildingDefinition } from '../buildings/registry.js';

export function idx(x,y){return y*W+x;}

export function inBounds(x,y){return x>=0&&y>=0&&x<W&&y<H;}

export function at(x,y){return inBounds(x,y)?S.grid[idx(x,y)]:null;}

export function isFacilityPart(b){ return !!b&&b.type==='facilityPart'&&Number.isInteger(b.rootX)&&Number.isInteger(b.rootY); }

export function facilityRootAt(x,y){
  const b=at(x,y);
  if(!b) return null;
  if(!isFacilityPart(b)) return b;
  const root=at(b.rootX,b.rootY);
  if(!root||isFacilityPart(root)) return null;
  const fp=getBuildingDefinition(root.type)?.placement?.footprint||[1,1];
  if(x<root.x||y<root.y||x>=root.x+fp[0]||y>=root.y+fp[1]) return null;
  return root;
}

export function footprintCells(type,x,y){
  const fp=getBuildingDefinition(type)?.placement?.footprint||[1,1];
  const out=[];
  for(let dy=0;dy<fp[1];dy++) for(let dx=0;dx<fp[0];dx++) out.push({x:x+dx,y:y+dy,dx,dy});
  return out;
}

export function facilityFootprint(b){
  if(!b||isFacilityPart(b)) return [1,1];
  return getBuildingDefinition(b.type)?.placement?.footprint||[1,1];
}

export function isRoadRailCrossing(b){ return !!b&&!!b.state?.roadRailCrossing&&(b.type==='road'||b.type==='rail'); }

export function isType(x,y,t){
  const b=at(x,y);
  if(!b||isFacilityPart(b)) return false;
  if(b.type===t) return true;
  return isRoadRailCrossing(b)&&(t==='road'||t==='rail');
}

export function isWater(x,y){ return inBounds(x,y)&&S.terr[idx(x,y)]===1; }

/* ---------- wishes: gentle goals, never a deadline ---------- */
export function countType(t){
  let n=0;
  for(let i=0;i<S.grid.length;i++){
    const b=S.grid[i];
    if(!b||isFacilityPart(b)) continue;
    if(b.type===t||(isRoadRailCrossing(b)&&(t==='road'||t==='rail'))) n++;
  }
  return n;
}

export function hasWater(){
  for(let i=0;i<S.terr.length;i++) if(S.terr[i]===1) return true;
  return false;
}
