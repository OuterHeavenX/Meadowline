import { getBuildingDefinition } from '../buildings/registry.js';
import { DIRS } from '../core/constants.js';
import { S } from '../core/state.js';
import { findPath } from '../transport/pathfinding.js';
import { crossingBlockedByTrain } from './mobility.js';
import { recomputeEmployment } from './employment.js';
import { idx, isFacilityPart, isType } from '../world/tiles.js';

const SERVICE={crime:{facility:'policeStation',vehicle:'police',color:'#356da0'},fire:{facility:'fireStation',vehicle:'fireEngine',color:'#c74f43'},medical:{facility:null,vehicle:'ambulance',color:'#e5e6df'}};
function roots(type){ return (S.grid||[]).filter(b=>b&&!isFacilityPart(b)&&b.type===type); }
function entry(b){ for(const[dx,dy]of DIRS) if(isType(b.x+dx,b.y+dy,'road')) return {x:b.x+dx,y:b.y+dy}; return null; }
function nearestRoad(b){ return entry(b); }
function capacity(types){ return types.reduce((n,t)=>n+roots(t).reduce((a,b)=>a+(getBuildingDefinition(b.type)?.service?.capacity||0),0),0); }
function targetBuilding(){ const pool=(S.grid||[]).filter(b=>b&&!isFacilityPart(b)&&['house','cafe','market','bakery'].includes(b.type)&&nearestRoad(b)); return pool[(Math.random()*pool.length)|0]||null; }
function dispatch(incident){
  const types=incident.kind==='medical'?['clinic','hospital']:[SERVICE[incident.kind].facility];
  const facilities=types.flatMap(roots).filter(nearestRoad),target=nearestRoad(incident.target);
  if(!facilities.length||!target) return false;
  const home=facilities.sort((a,b)=>Math.abs(a.x-incident.target.x)+Math.abs(a.y-incident.target.y)-Math.abs(b.x-incident.target.x)-Math.abs(b.y-incident.target.y))[0];
  const start=nearestRoad(home),route=findPath(start.x,start.y,target.x,target.y,(x,y)=>isType(x,y,'road'),4000);
  if(!route) return false;
  const first=route.shift()||[start.x,start.y];
  S.serviceVehicles.push({id:++S.vehicleSerial,type:SERVICE[incident.kind].vehicle,color:SERVICE[incident.kind].color,incidentId:incident.id,home,x:start.x,y:start.y,nx:first[0],ny:first[1],p:0,route,ri:0,sp:.9,state:'responding'});
  incident.dispatched=true; return true;
}
function resolve(v){ const inc=S.incidents.find(i=>i.id===v.incidentId); if(inc){ inc.resolved=true; inc.age=0; S.municipal[inc.kind==='crime'?'safety':inc.kind==='fire'?'fire':'healthcare'].resolved++; } v.done=true; }
function updateVehicles(dt){
  for(let i=S.serviceVehicles.length-1;i>=0;i--){ const v=S.serviceVehicles[i]; if(v.done){S.serviceVehicles.splice(i,1);continue;} if(crossingBlockedByTrain(v.nx,v.ny)) continue; v.p+=dt*v.sp; if(v.p<1)continue; v.p-=1;v.x=v.nx;v.y=v.ny; const n=v.route[v.ri++]; if(n){v.nx=n[0];v.ny=n[1];}else resolve(v); }
}
function spawn(kind){ const target=targetBuilding(); if(!target)return; const inc={id:++S.incidentSerial,kind,target,age:0,resolved:false,dispatched:false}; S.incidents.push(inc); dispatch(inc); }
export function updateMunicipal(dt){
  recomputeEmployment();
  const pop=S.pop||0,emp=S.municipal.employment;
  const police=capacity(['policeStation']),fireCap=capacity(['fireStation']),health=capacity(['clinic','hospital']);
  const active=k=>S.incidents.filter(i=>i.kind===k&&!i.resolved).length;
  const crimePressure=Math.max(0,Math.min(100,pop*.28+emp.unemployed*.4-police*10));
  const fireRisk=Math.max(0,Math.min(100,pop*.16-fireCap*9));
  const healthDemand=Math.round(Math.max(0,pop*(S.wx.k==='snow'?.16:.1)));
  Object.assign(S.municipal.safety,{pressure:Math.round(crimePressure),capacity:police,active:active('crime')});
  Object.assign(S.municipal.fire,{risk:Math.round(fireRisk),capacity:fireCap,active:active('fire')});
  Object.assign(S.municipal.healthcare,{demand:healthDemand,capacity:health,patients:Math.max(0,healthDemand-health)});
  if(pop>=18&&active('crime')<1&&Math.random()<dt*crimePressure/2600) spawn('crime');
  if(pop>=35&&active('fire')<1&&Math.random()<dt*fireRisk/4200) spawn('fire');
  if(pop>=28&&active('medical')<1&&healthDemand>0&&Math.random()<dt*healthDemand/3500) spawn('medical');
  for(const inc of S.incidents){inc.age+=dt;if(!inc.dispatched&&!inc.resolved)dispatch(inc);}
  S.incidents=S.incidents.filter(i=>!i.resolved||i.age<3).slice(-12);
  updateVehicles(dt);
}
