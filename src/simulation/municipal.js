import { getBuildingDefinition } from '../buildings/registry.js';
import { DIRS } from '../core/constants.js';
import { services } from '../core/services.js';
import { S } from '../core/state.js';
import { findPath } from '../transport/pathfinding.js';
import { emitFeedback } from './feedback.js';
import { crossingBlockedByTrain } from './mobility.js';
import { recomputeEmployment } from './employment.js';
import { isFacilityPart, isType } from '../world/tiles.js';

const SERVICE={crime:{facility:'policeStation',vehicle:'police',color:'#356da0',work:2.8,label:'Police'},fire:{facility:'fireStation',vehicle:'fireEngine',color:'#c74f43',work:5.2,label:'Fire crew'},medical:{facility:null,vehicle:'ambulance',color:'#e5e6df',work:4.1,label:'Ambulance'}};
const INCIDENT_LIMIT=12,SERVICE_VEHICLE_LIMIT=6;
function roots(type){return(S.grid||[]).filter(b=>b&&!isFacilityPart(b)&&b.type===type);}
function entry(b){const fp=getBuildingDefinition(b.type)?.placement?.footprint||[1,1];for(let y=b.y;y<b.y+fp[1];y++)for(let x=b.x;x<b.x+fp[0];x++)for(const[dx,dy]of DIRS)if(isType(x+dx,y+dy,'road'))return{x:x+dx,y:y+dy};return null;}
function capacity(types){return types.reduce((n,t)=>n+roots(t).reduce((a,b)=>a+(getBuildingDefinition(b.type)?.service?.capacity||0),0),0);}
function targetBuilding(){const pool=(S.grid||[]).filter(b=>b&&!isFacilityPart(b)&&['house','cafe','market','bakery'].includes(b.type)&&entry(b));return pool[(Math.random()*pool.length)|0]||null;}
function path(a,b){return a&&b?findPath(a.x,a.y,b.x,b.y,(x,y)=>isType(x,y,'road'),4000):null;}
function setRoute(v,route){if(!route)return false;const first=route.shift()||[v.x,v.y];v.nx=first[0];v.ny=first[1];v.route=route;v.ri=0;v.p=0;return true;}
function dispatch(incident){
  if(S.serviceVehicles.length>=SERVICE_VEHICLE_LIMIT)return false;const spec=SERVICE[incident.kind],types=incident.kind==='medical'?['clinic','hospital']:[spec.facility],target=entry(incident.target),facilities=types.flatMap(roots).filter(entry);if(!facilities.length||!target)return false;
  const home=facilities.sort((a,b)=>Math.abs(a.x-incident.target.x)+Math.abs(a.y-incident.target.y)-Math.abs(b.x-incident.target.x)-Math.abs(b.y-incident.target.y))[0],start=entry(home),route=path(start,target);if(!route)return false;
  const v={id:++S.vehicleSerial,type:spec.vehicle,color:spec.color,incidentId:incident.id,home,homeRoad:start,targetRoad:target,x:start.x,y:start.y,nx:start.x,ny:start.y,p:0,route:[],ri:0,sp:.88,state:'DISPATCHED',work:0,failed:0};setRoute(v,route);v.state='EN_ROUTE';S.serviceVehicles.push(v);incident.dispatched=true;incident.status='EN_ROUTE';services.toast(spec.label+' dispatched');services.siren(incident.kind);return true;
}
function completeWork(v,inc){
  if(!inc){v.state='FAILED';v.done=true;return;}
  inc.resolved=true;inc.status='RESOLVED';inc.resolvedAge=0;const key=inc.kind==='crime'?'safety':inc.kind==='fire'?'fire':'healthcare';S.municipal[key].resolved=(S.municipal[key].resolved||0)+1;
  emitFeedback(inc.target.x,inc.target.y,'service',inc.kind==='crime'?'✓ CAUGHT':inc.kind==='fire'?'✓ EXTINGUISHED':'✓ RECOVERING');services.toast(inc.kind==='crime'?'Suspect caught':inc.kind==='fire'?'Fire extinguished':'Patient receiving care','gold');
  const route=path({x:v.x,y:v.y},v.homeRoad);if(setRoute(v,route)){v.state='RETURNING';inc.status='RETURNING';}else{v.state='FAILED';v.done=true;}
}
function reroute(v){const destination=v.state==='RETURNING'?v.homeRoad:v.targetRoad,route=path({x:v.x,y:v.y},destination);if(setRoute(v,route)){v.failed=0;return true;}v.failed++;if(v.failed>1){v.state='FAILED';v.done=true;const inc=S.incidents.find(i=>i.id===v.incidentId);if(inc&&!inc.resolved){inc.dispatched=false;inc.status='REPORTED';}return false;}return true;}
function arrive(v){const inc=S.incidents.find(i=>i.id===v.incidentId);if(v.state==='RETURNING'){v.state='IDLE';v.done=true;if(inc)inc.status='CLEARED';return;}if(!inc||inc.resolved){v.state='RETURNING';reroute(v);return;}v.state='ARRIVED';inc.status='ARRIVED';v.work=0;}
function updateVehicles(dt){
  for(let i=S.serviceVehicles.length-1;i>=0;i--){const v=S.serviceVehicles[i];if(v.done){S.serviceVehicles.splice(i,1);continue;}const inc=S.incidents.find(x=>x.id===v.incidentId);
    if(v.state==='ARRIVED'){v.state='WORKING';if(inc)inc.status='WORKING';}
    if(v.state==='WORKING'){v.work+=dt;if(v.work>=SERVICE[inc?.kind||'medical'].work)completeWork(v,inc);continue;}
    if(v.state!=='EN_ROUTE'&&v.state!=='RETURNING')continue;if(!isType(v.x,v.y,'road')||!isType(v.nx,v.ny,'road')){reroute(v);continue;}if(crossingBlockedByTrain(v.nx,v.ny)){v.waitingForTrain=true;continue;}v.waitingForTrain=false;v.p+=dt*v.sp;if(v.p<1)continue;v.p-=1;v.x=v.nx;v.y=v.ny;const n=v.route[v.ri++];if(n){v.nx=n[0];v.ny=n[1];}else arrive(v);
  }
}
export function spawnMunicipalIncident(kind,target=targetBuilding()){if(!SERVICE[kind]||!target||S.incidents.length>=INCIDENT_LIMIT)return null;const inc={id:++S.incidentSerial,kind,target,age:0,resolvedAge:0,resolved:false,dispatched:false,status:'REPORTED'};S.incidents.push(inc);services.toast(kind==='crime'?'Robbery reported':kind==='fire'?'Fire reported':'Medical call reported');dispatch(inc);return inc;}
export function municipalSnapshot(){return{incidents:S.incidents.length,serviceVehicles:S.serviceVehicles.length,states:Object.fromEntries(['DISPATCHED','EN_ROUTE','ARRIVED','WORKING','RETURNING','FAILED'].map(k=>[k,S.serviceVehicles.filter(v=>v.state===k).length]))};}
export function updateMunicipal(dt){
  recomputeEmployment();const pop=S.pop||0,emp=S.municipal.employment,police=capacity(['policeStation']),fireCap=capacity(['fireStation']),health=capacity(['clinic','hospital']),active=k=>S.incidents.filter(i=>i.kind===k&&!i.resolved).length;
  const crimePressure=Math.max(0,Math.min(100,pop*.28+emp.unemployed*.4-police*10)),fireRisk=Math.max(0,Math.min(100,pop*.16-fireCap*9)),healthDemand=Math.round(Math.max(0,pop*(S.wx.k==='snow'?.16:.1)));
  Object.assign(S.municipal.safety,{pressure:Math.round(crimePressure),capacity:police,active:active('crime')});Object.assign(S.municipal.fire,{risk:Math.round(fireRisk),capacity:fireCap,active:active('fire')});Object.assign(S.municipal.healthcare,{demand:healthDemand,capacity:health,patients:Math.max(0,healthDemand-health)});
  if(pop>=18&&active('crime')<1&&Math.random()<dt*crimePressure/2600)spawnMunicipalIncident('crime');if(pop>=35&&active('fire')<1&&Math.random()<dt*fireRisk/4200)spawnMunicipalIncident('fire');if(pop>=28&&active('medical')<1&&healthDemand>0&&Math.random()<dt*healthDemand/3500)spawnMunicipalIncident('medical');
  for(const inc of S.incidents){inc.age+=dt;if(inc.resolved)inc.resolvedAge+=dt;if(!inc.dispatched&&!inc.resolved)dispatch(inc);}updateVehicles(dt);S.incidents=S.incidents.filter(i=>i.status!=='CLEARED'&&(!i.resolved||i.resolvedAge<12)).slice(-INCIDENT_LIMIT);
}
