import { lerp } from '../core/constants.js';
import { S } from '../core/state.js';
import { findPath } from '../transport/pathfinding.js';
import { connectedRoadComponents, roadDegree, roadTiles, validRoadTile } from '../transport/roads.js';
import { idx, isRoadRailCrossing, isType } from '../world/tiles.js';

const TYPES=['car','pickup','van'];
const COLORS=['#b75f55','#5e7f96','#c8a454','#718b68','#8b6f8c','#d7d0bd'];
let networkVersion=1;
const routeCache=new Map();

function diag(name,delta=1){ if(S.diagnostics) S.diagnostics[name]=(S.diagnostics[name]||0)+delta; }
function key(x,y){ return x+','+y; }
function cacheKey(a,b){ return networkVersion+':'+key(a.x,a.y)+'>'+key(b.x,b.y); }
function passable(x,y){ return isType(x,y,'road'); }

export function invalidateMobility(){
  networkVersion++;
  routeCache.clear();
  diag('roadNetworkInvalidations');
  for(const v of S.vehicles||[]) v.routeVersion=0;
}

export function railCrossingCount(){
  let n=0;
  for(const b of S.grid||[]) if(isRoadRailCrossing(b)) n++;
  return n;
}

export function mobilitySnapshot(){
  const comps=connectedRoadComponents();
  return {
    roadTiles:roadTiles().length,
    components:comps.length,
    crossings:railCrossingCount(),
    vehicles:(S.vehicles||[]).length,
    activeRoutes:(S.vehicles||[]).filter(v=>v.route&&v.route.length).length,
    networkVersion
  };
}

export function vehicleCap(){
  const roads=roadTiles().length;
  if(roads<8||S.pop<8) return 0;
  const stage=Math.max(1,Math.min(4,Number(S.cityProgress?.stage)||1));
  const stageCap=[0,3,5,8,12][stage];
  return Math.min(stageCap,Math.max(1,Math.floor((S.pop||0)/12)),Math.max(1,Math.floor(roads/10)));
}

function routeBetween(a,b){
  const ck=cacheKey(a,b);
  const cached=routeCache.get(ck);
  if(cached) return cached.map(p=>[p[0],p[1]]);
  diag('vehicleRouteSearches');
  const route=findPath(a.x,a.y,b.x,b.y,passable,4000);
  if(route&&route.length){
    routeCache.set(ck,route.map(p=>[p[0],p[1]]));
    if(routeCache.size>96) routeCache.delete(routeCache.keys().next().value);
  }
  return route;
}

function chooseTrip(){
  const comps=connectedRoadComponents().filter(c=>c.length>=5);
  if(!comps.length) return null;
  const comp=comps[Math.min(comps.length-1,(Math.random()*Math.min(3,comps.length))|0)];
  for(let tries=0;tries<12;tries++){
    const a=comp[(Math.random()*comp.length)|0];
    const b=comp[(Math.random()*comp.length)|0];
    if(!a||!b||Math.abs(a.x-b.x)+Math.abs(a.y-b.y)<4) continue;
    const route=routeBetween(a,b);
    if(route&&route.length) return {a,b,route};
  }
  return null;
}

function spawnVehicle(){
  const trip=chooseTrip();
  if(!trip){ diag('vehicleRouteFailures'); return false; }
  const first=trip.route.shift();
  if(!first) return false;
  const type=TYPES[(Math.random()*TYPES.length)|0];
  S.vehicles.push({
    id:(S.vehicleSerial=(S.vehicleSerial||0)+1),type,
    x:trip.a.x,y:trip.a.y,px:trip.a.x,py:trip.a.y,nx:first[0],ny:first[1],p:0,
    route:trip.route,ri:0,routeVersion:networkVersion,
    sp:type==='van'?0.54:type==='pickup'?0.62:0.66,
    color:COLORS[(Math.random()*COLORS.length)|0],wait:0,age:0,failed:0
  });
  return true;
}

function reroute(v){
  if(!validRoadTile(v.x,v.y)) return false;
  const tiles=roadTiles();
  for(let tries=0;tries<10;tries++){
    const d=tiles[(Math.random()*tiles.length)|0];
    if(!d||Math.abs(v.x-d.x)+Math.abs(v.y-d.y)<3) continue;
    const route=routeBetween({x:v.x,y:v.y},d);
    if(route&&route.length){
      const first=route.shift();
      v.nx=first[0]; v.ny=first[1]; v.route=route; v.ri=0; v.p=0; v.routeVersion=networkVersion; v.failed=0;
      diag('vehicleReroutes');
      return true;
    }
  }
  v.failed=(v.failed||0)+1; diag('vehicleRouteFailures');
  return false;
}

export function crossingBlockedByTrain(x,y){
  const b=S.grid?.[idx(x,y)];
  if(!isRoadRailCrossing(b)) return false;
  for(const t of S.trains||[]){
    const fx=Number.isFinite(t.fx)?t.fx:lerp(t.x,t.nx,t.p||0);
    const fy=Number.isFinite(t.fy)?t.fy:lerp(t.y,t.ny,t.p||0);
    if(Math.hypot(fx-x,fy-y)<1.35) return true;
  }
  return false;
}

function pedestrianConflict(x,y){
  if(!isType(x,y,'road')) return false;
  const b=S.grid?.[idx(x,y)];
  const protectedTile=roadDegree(x,y)>=3||isRoadRailCrossing(b);
  if(!protectedTile) return false;
  for(const c of S.citizens||[]){
    const fx=lerp(c.x,c.nx,c.p||0), fy=lerp(c.y,c.ny,c.p||0);
    if(Math.hypot(fx-x,fy-y)<0.48) return true;
  }
  return false;
}

function vehicleAhead(v){
  for(const o of S.vehicles||[]){
    if(o===v) continue;
    if(o.x===v.x&&o.y===v.y&&o.nx===v.nx&&o.ny===v.ny&&o.p>v.p&&o.p-v.p<0.42) return true;
    if(o.x===v.nx&&o.y===v.ny&&o.p<0.32) return true;
  }
  return false;
}

function shouldWait(v){
  if(crossingBlockedByTrain(v.nx,v.ny)){
    diag('vehiclesWaitingAtRail');
    return true;
  }
  if(pedestrianConflict(v.nx,v.ny)) return true;
  return vehicleAhead(v);
}

function finishSegment(v){
  v.px=v.x; v.py=v.y; v.x=v.nx; v.y=v.ny;
  if(!validRoadTile(v.x,v.y)) return false;
  if(v.routeVersion!==networkVersion) return reroute(v);
  if(v.ri<v.route.length){
    const n=v.route[v.ri++];
    if(Math.abs(n[0]-v.x)+Math.abs(n[1]-v.y)!==1||!validRoadTile(n[0],n[1])) return reroute(v);
    v.nx=n[0]; v.ny=n[1]; return true;
  }
  return reroute(v);
}

export function updateMobility(dt){
  if(!S.vehicles) S.vehicles=[];
  const want=vehicleCap();
  if(S.vehicles.length<want&&Math.random()<dt*0.9) spawnVehicle();
  while(S.vehicles.length>want){ S.vehicles.pop(); diag('vehicleDespawns'); }

  for(let i=S.vehicles.length-1;i>=0;i--){
    const v=S.vehicles[i]; v.age+=dt;
    if(v.routeVersion!==networkVersion&&!reroute(v)){
      if(v.failed>1){ S.vehicles.splice(i,1); diag('vehicleDespawns'); }
      continue;
    }
    if(!validRoadTile(v.x,v.y)||!validRoadTile(v.nx,v.ny)){
      if(!reroute(v)){ S.vehicles.splice(i,1); diag('vehicleDespawns'); }
      continue;
    }
    if(shouldWait(v)){ v.wait=Math.min(6,(v.wait||0)+dt); continue; }
    v.wait=0;
    v.p+=dt*v.sp;
    while(v.p>=1){
      v.p-=1;
      if(!finishSegment(v)){
        S.vehicles.splice(i,1); diag('vehicleDespawns'); break;
      }
    }
  }
}
