import { note } from '../simulation/chronicle.js';
import { DIRS } from '../core/constants.js';
import { services } from '../core/services.js';
import { S } from '../core/state.js';
import { invalidateServices } from '../simulation/civic-services.js';
import { invalidateCitySummary } from '../simulation/city-summary.js';
import { invalidateMobility } from '../simulation/mobility.js';
import { BUILDABLE, BUILDING_COST, defaultBuildingState, getBuildingDefinition } from './registry.js';
import { SPANS } from '../transport/bridges.js';
import { idx, inBounds, isType, isWater, isRoadRailCrossing } from '../world/tiles.js';
import { cityStage, isBuildingUnlocked, isFootprintUnlocked, parcelAt } from '../progression/city-growth.js';

export { BUILDABLE } from './registry.js';

/* ---------- building placement ---------- */
export function costOf(kind,x,y){ return BUILDING_COST[kind]*(SPANS[kind]&&isWater(x,y)?3:1); }
function canMakeRoadRailCrossing(kind,cur){
  return !!cur&&!isRoadRailCrossing(cur)&&((kind==='road'&&cur.type==='rail')||(kind==='rail'&&cur.type==='road'));
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
  if(!isFootprintUnlocked(x,y,fp[0],fp[1])){
    const parcel=parcelAt(x,y);
    return {ok:false,why:parcel?'This land has not been opened yet.':'This land is outside the development area.'};
  }
  const i=idx(x,y);
  if(S.terr[i]===1&&!SPANS[kind]) return {ok:false,why:"Only roads and rails can cross the water."};
  const cur=S.grid[i];
  if(cur){
    if(canMakeRoadRailCrossing(kind,cur)){
      if(S.terr[i]===1) return {ok:false,why:'Road and Rail crossings must be built on land.'};
      const c=costOf(kind,x,y);
      if(S.coins<c) return {ok:false,why:'Not enough coins yet — wait for the next payday.'};
      return {ok:true,crossing:true};
    }
    if(cur.type===kind||isType(x,y,kind)) return {ok:false};
    return {ok:false,why:"Something's already there — remove it first."};
  }
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
    return {ok:false,why:S.terr[i]===1
      ? "A bridge across costs "+c+" — not enough coins yet."
      : "Not enough coins yet — wait for the next payday."};
  }
  return {ok:true};
}

const NOTED={};
const NOTE_NAMES={cafe:"The first café opened",park:"The first park was laid out",
  station:"The first station opened",mill:"The first windmill turned",
  market:"The first market day",bakery:"The first bakery lit its oven",
  school:"The first school took pupils",cityHall:"Meadowline established its civic center",dock:"The first dock was built",
  rail:"The first rail was laid",house:"The first house went up"};

export function place(kind,x,y){
  const r=canPlace(kind,x,y);
  if(!r.ok){ if(r.why) services.hint(r.why,true); return false; }
  const i=idx(x,y);
  if(r.crossing){
    const cur=S.grid[i];
    S.coins-=costOf(kind,x,y);
    cur.state={...(cur.state||{}),roadRailCrossing:true,crossingBase:cur.type};
    invalidateServices(); invalidateCitySummary(); invalidateMobility();
    services.puff(x,y); services.blip(360);
    if(S.diagnostics) S.diagnostics.railCrossings=(S.diagnostics.railCrossings||0)+1;
    return true;
  }
  S.coins-=costOf(kind,x,y);
  S.natTree[i]=0;
  S.grid[i]={type:kind,x,y,seed:((x*73856093)^(y*19349663))>>>0,pop:0,grow:0,mood:50,linked:false,state:defaultBuildingState(kind)};
  invalidateServices(); invalidateCitySummary();
  if(kind==='road'||kind==='rail') invalidateMobility();
  if(NOTE_NAMES[kind]&&!NOTED[kind]){ NOTED[kind]=1; note(NOTE_NAMES[kind]); }
  services.puff(x,y);
  services.blip(kind==="house"?520:kind==="park"?400:kind==="mill"?300:340);
  return true;
}

export function erase(x,y){
  if(!inBounds(x,y)) return false;
  if(!isFootprintUnlocked(x,y,1,1)){ services.hint("Open this land before developing it.",true); return false; }
  const i=idx(x,y);
  const b=S.grid[i];
  if(!b){
    if(S.natTree[i]){ S.natTree[i]=0; services.puff(x,y); services.blip(240); return true; }
    return false;
  }
  if(b.type==='cityHall'&&!confirm('Remove Meadowline’s civic center? City Growth, Town Goals and opened land will remain.')) return false;
  if(isRoadRailCrossing(b)){
    const overlay=b.type==='rail'?'road':'rail';
    S.coins+=Math.floor((BUILDING_COST[overlay]||0)/2);
    b.state={...(b.state||{})}; delete b.state.roadRailCrossing; delete b.state.crossingBase;
    invalidateServices(); invalidateCitySummary(); invalidateMobility();
    services.puff(x,y); services.blip(230);
    return true;
  }
  S.coins+=Math.floor(costOf(b.type,x,y)/2);
  S.grid[i]=null;
  invalidateServices(); invalidateCitySummary();
  if(b.type==='road'||b.type==='rail') invalidateMobility();
  services.puff(x,y);
  services.blip(220);
  return true;
}
