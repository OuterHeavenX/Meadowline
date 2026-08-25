/* ---------- state ---------- */
export const S={
  seed:(Math.random()*1e9)|0, terr:null,natTree:null,grid:null,
  coins:340,day:1,dayT:.24,t:0,speed:1,muted:true,running:true,tool:'move',
  citizens:[],vehicles:[],serviceVehicles:[],trains:[],boats:[],puffs:[],feedback:[],incidents:[],pop:0,mood:0,homes:0,vehicleSerial:0,incidentSerial:0,
  ctx:{parks:[],recreation:[],cafes:[],stations:[],houses:[],lamps:[],mills:[],markets:[],bakeries:[],schools:[],docks:[]},
  services:{
    education:{providers:{},assignments:{},metrics:{average:0,demand:0,served:0,capacity:0,utilization:0}},
    recreation:{providers:{},assignments:{},metrics:{facilities:0,demand:0,served:0,capacity:0,underserved:0,activeVisitors:0}},
    recomputes:0,lastRecompute:0
  },
  cityProgress:{mode:'legacy-open',stage:4,unlockedParcels:[],claimedMilestones:[]},
  diagnostics:{enabled:false,frames:0,fps:0,frameMs:0,simMs:0,renderMs:0,pathSearches:0,saveBytes:0,housingEvaluations:0,housingUpgrades:0,desirabilityRecomputes:0,progressionRecomputes:0,milestoneEvaluations:0,parcelUnlocks:0,buildingUnlocks:0,schoolUpgrades:0,goalRecomputes:0,goalReplacements:0,primaryGoal:'',optionalGoal:'',inputState:'IDLE',touchPans:0,tapPlacements:0,paintActivations:0,cancelledBuildByDrag:0,cancelledBuildByPinch:0,roadNetworkInvalidations:0,vehicleRouteSearches:0,vehicleRouteFailures:0,vehicleReroutes:0,vehicleDespawns:0,vehiclesWaitingAtRail:0,recreationRecomputes:0,recreationRouteSearches:0,recreationRouteFailures:0,recreationFacilities:0,recreationDemand:0,recreationServed:0,recreationVisitors:0,multiTileFacilities:0,occupiedFacilityTiles:0,invalidFacilityCleanup:0},
  municipal:{employment:{workers:0,jobs:0,employed:0,unemployed:0,prosperity:50},safety:{pressure:0,capacity:0,active:0,resolved:0},fire:{risk:0,capacity:0,active:0,resolved:0},healthcare:{demand:0,capacity:0,patients:0,recovered:0}},
  tutorial:{completed:false,skipped:false,step:0},quality:'auto',rendererMode:'auto',
  wx:{k:'clear',amt:0,target:0,next:70}, wishes:[],log:[],history:[],cam:{x:0,y:0,z:1}
};
export const reduceMotion=(function(){try{return matchMedia('(prefers-reduced-motion: reduce)').matches;}catch(e){return false;}})();
