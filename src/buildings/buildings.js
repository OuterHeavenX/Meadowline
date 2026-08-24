import { note } from '../simulation/chronicle.js';
import { DIRS } from '../core/constants.js';
import { services } from '../core/services.js';
import { S } from '../core/state.js';
import { invalidateServices } from '../simulation/civic-services.js';
import { invalidateCitySummary } from '../simulation/city-summary.js';
import { invalidateMobility } from '../simulation/mobility.js';
import { invalidateRecreation } from '../simulation/recreation.js';
import { BUILDABLE, BUILDING_COST, defaultBuildingState, getBuildingDefinition } from './registry.js';
import { SPANS } from '../transport/bridges.js';
import { facilityRootAt, footprintCells, idx, inBounds, isFacilityPart, isType, isWater, isRoadRailCrossing } from '../world/tiles.js';
import { cityStage, isBuildingUnlocked, isFootprintUnlocked, parcelAt } from '../progression/city-growth.js';

export { BUILDABLE } from './registry.js';

/* ---------- building placement ---------- */
export function costOf(kind,x,y){ return BUILDING_COST[kind]*(SPANS[kind]&&isWater(x,y)?3:1); }
function canMakeRoadRailCrossing(kind,cur){
  return !!cur&&!isFacilityPart(cur)&&!isRoadRailCrossing(cur)&&((kind==='road'&&cur.type==='rail')||(kind==='rail'&&cur.type==='road'));
}
function axisAt(type,x,y){
  const ew=isType(x-1,y,type)||isType(x+1,y,type);
  const ns=isType(x,y-1,type)||isType(x,y+1,type);
  if(ew&&!ns) return 'ew';
  if(ns&&!ew) return 'ns';
  return null;
}
function cleanCrossingGeometry(kind,x,y,cur){
  const baseAxis=axisAt(cur.type,x,y);
  const overlayAxis=axisAt(kind,x,y);
  return !!baseAxis&&!!overlayAxis&&baseAxis!==overlayAxis;
}
function footprintIssue(kind,x,y){
  const def=getBuildingDefinition(kind);
  const fp=def?.placement?.footprint||[1,1];
  if(!isFootprintUnlocked(x,y,fp[0],fp[1])){
    const parcel=parcelAt(x,y);
    return parcel?'This facility must fit entirely on opened land.':'This facility would extend outside the development area.';
  }
  for(const c of footprintCells(kind,x,y)){
    if(!inBounds(c.x,c.y)) return 'The complete facility must fit inside Meadowline.';
    const i=idx(c.x,c.y);
    if(S.terr[i]===1&&!SPANS[kind]) return 'The complete facility needs dry land.';
    if(S.grid[i]) return "Something's already inside this footprint — clear the full area first.";
  }
  return '';
}
export function canPlace(kind,x,y){
  if(!BUILDABLE[kind]) return {ok:false};
  if(!inBounds(x,y)) return {ok:false};
  if(!isBuildingUnlocked(kind)){
    const def=getBuildingDefinition(kind);
    return {ok:false,why:(def?.name||'This building')+' unlocks as Meadowline grows beyond '+cityStage().name+'.'};
  }
  const def=getBuildingDefinition(kind);
  if(def?.unique&&(S.grid||[]).some(b=>b?.type===kind)){
    return {ok:false,why:kind==='cityHall'?'Meadowline already has a civic center.':'Only one of these may be active.'};
  }
  const fp=def?.placement?.footprint||[1,1];

  // Road/Rail overlay conversion remains a one-tile special case and keeps
  // its production dual-network semantics.
  if(fp[0]===1&&fp[1]===1){
    if(!isFootprintUnlocked(x,y,1,1)){
      const parcel=parcelAt(x,y);
      return {ok:false,why:parcel?'This land has not been opened yet.':'This land is outside the development area.'};
    }
    const i=idx(x,y),cur=S.grid[i];
    if(cur&&canMakeRoadRailCrossing(kind,cur)){
      if(S.terr[i]===1) return {ok:false,why:'Road and Rail crossings must be built on land.'};
      if(!cleanCrossingGeometry(kind,x,y,cur)) return {ok:false,why:'Road and Rail need to cross cleanly here.'};
      const c=costOf(kind,x,y);
      if(S.coins<c) return {ok:false,why:'Not enough coins yet — wait for the next payday.'};
      return {ok:true,crossing:true};
    }
  }

  const issue=footprintIssue(kind,x,y);
  if(issue) return {ok:false,why:issue};

  if(kind==="station"){
    let touching=false;
    for(const[dx,dy]of DIRS) if(isType(x+dx,y+dy,"rail")) touching=true;
    if(!touching) return {ok:false,why:"Stations have to touch a rail tile."};
  }
  if(kind==="dock"){
    let touching=false;
    for(const[dx,dy]of DIRS) if(isWater(x+dx,y+dy)) touching=true;
    if(!touching) return {ok:false,why:"A dock has to stand at the water's edge."};
  }
  const c=costOf(kind,x,y);
  if(S.coins<c){
    return {ok:false,why:S.terr[idx(x,y)]===1
      ? "A bridge across costs "+c+" — not enough coins yet."
      : "Not enough coins yet — wait for the next payday."};
  }
  return {ok:true};
}

const NOTED={};
const NOTE_NAMES={cafe:"The first café opened",park:"The first pocket green was laid out",
  pocketPark:"The first Pocket Park opened",playground:"The first Playground opened",picnicGreen:"The first Picnic Green opened",sportsCourt:"The first Sports Court opened",townPark:"Meadowline opened its first Town Park",
  station:"The first station opened",mill:"The first windmill turned",
  market:"The first market day",bakery:"The first bakery lit its oven",
  school:"The first school took pupils",cityHall:"Meadowline established its civic center",dock:"The first dock was built",
  rail:"The first rail was laid",house:"The first house went up"};

function rootObject(kind,x,y){
  return {type:kind,x,y,seed:((x*73856093)^(y*19349663))>>>0,pop:0,grow:0,mood:50,linked:false,state:defaultBuildingState(kind)};
}

export function restoreFacilityOccupancy(root){
  if(!root||!BUILDABLE[root.type]||!Number.isInteger(root.x)||!Number.isInteger(root.y)) return false;
  const cells=footprintCells(root.type,root.x,root.y);
  for(const c of cells){
    if(!inBounds(c.x,c.y)) return false;
    if(S.terr[idx(c.x,c.y)]===1&&!SPANS[root.type]) return false;
    const cur=S.grid[idx(c.x,c.y)];
    if(cur&&cur!==root) return false;
  }
  for(const c of cells){
    const i=idx(c.x,c.y); S.natTree[i]=0;
    if(c.dx===0&&c.dy===0) S.grid[i]=root;
    else S.grid[i]={type:'facilityPart',rootX:root.x,rootY:root.y};
  }
  return true;
}

function clearFacility(root){
  const cells=footprintCells(root.type,root.x,root.y);
  for(const c of cells){
    if(!inBounds(c.x,c.y)) continue;
    const i=idx(c.x,c.y),cur=S.grid[i];
    if(cur===root||(isFacilityPart(cur)&&cur.rootX===root.x&&cur.rootY===root.y)) S.grid[i]=null;
  }
}

export function place(kind,x,y){
  const r=canPlace(kind,x,y);
  if(!r.ok){ if(r.why) services.hint(r.why,true); return false; }
  const i=idx(x,y);
  if(r.crossing){
    const cur=S.grid[i];
    S.coins-=costOf(kind,x,y);
    cur.state={...(cur.state||{}),roadRailCrossing:true,crossingBase:cur.type};
    invalidateServices(); invalidateCitySummary(); invalidateMobility(); invalidateRecreation();
    services.puff(x,y); services.blip(360);
    if(S.diagnostics) S.diagnostics.railCrossings=(S.diagnostics.railCrossings||0)+1;
    return true;
  }

  const root=rootObject(kind,x,y);
  S.coins-=costOf(kind,x,y);
  if(!restoreFacilityOccupancy(root)){
    S.coins+=costOf(kind,x,y);
    services.hint('That facility could not be placed safely.',true);
    return false;
  }
  invalidateServices(); invalidateCitySummary(); invalidateRecreation();
  if(kind==='road'||kind==='rail') invalidateMobility();
  if(NOTE_NAMES[kind]&&!NOTED[kind]){ NOTED[kind]=1; note(NOTE_NAMES[kind]); }
  services.puff(x,y);
  services.blip(kind==="house"?520:(getBuildingDefinition(kind)?.service?.type==='recreation'?400:340));
  return true;
}

export function erase(x,y){
  if(!inBounds(x,y)) return false;
  if(!isFootprintUnlocked(x,y,1,1)){ services.hint("Open this land before developing it.",true); return false; }
  const i=idx(x,y);
  const picked=S.grid[i];
  if(!picked){
    if(S.natTree[i]){ S.natTree[i]=0; services.puff(x,y); services.blip(240); return true; }
    return false;
  }
  const b=facilityRootAt(x,y);
  if(!b){
    // Defensive cleanup for a malformed orphan footprint marker.
    if(isFacilityPart(picked)){ S.grid[i]=null; if(S.diagnostics) S.diagnostics.invalidFacilityCleanup=(S.diagnostics.invalidFacilityCleanup||0)+1; return true; }
    return false;
  }
  if(b.type==='cityHall'&&!confirm('Remove Meadowline’s civic center? City Growth, Town Goals and opened land will remain.')) return false;
  const fp=getBuildingDefinition(b.type)?.placement?.footprint||[1,1];
  if(fp[0]*fp[1]>=9&&!confirm('Remove the entire '+(getBuildingDefinition(b.type)?.name||'facility')+'?')) return false;
  if(isRoadRailCrossing(b)){
    const overlay=b.type==='rail'?'road':'rail';
    S.coins+=Math.floor((BUILDING_COST[overlay]||0)/2);
    b.state={...(b.state||{})}; delete b.state.roadRailCrossing; delete b.state.crossingBase;
    invalidateServices(); invalidateCitySummary(); invalidateMobility(); invalidateRecreation();
    services.puff(b.x,b.y); services.blip(230);
    return true;
  }
  S.coins+=Math.floor(costOf(b.type,b.x,b.y)/2);
  clearFacility(b);
  // Visitors hold only soft references and Recreation invalidation causes them
  // to choose a new normal destination safely on their next route decision.
  for(const c of S.citizens||[]){
    if(c.recreationRoot&&c.recreationRoot.x===b.x&&c.recreationRoot.y===b.y){ c.recreationRoot=null; c.recreationEntry=null; c.facilityLocal=null; c.path=null; c.linger=0; c.at=null; }
  }
  invalidateServices(); invalidateCitySummary(); invalidateRecreation();
  if(b.type==='road'||b.type==='rail') invalidateMobility();
  services.puff(b.x,b.y);
  services.blip(220);
  return true;
}
