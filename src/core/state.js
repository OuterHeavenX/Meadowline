/* ---------- state ---------- */
export const S={
  seed:(Math.random()*1e9)|0,
  terr:null, natTree:null, grid:null,
  coins:340, day:1, dayT:0.24, t:0,
  speed:1, muted:true, running:true,
  tool:"move",
  citizens:[], trains:[], boats:[], puffs:[],
  pop:0, mood:0, homes:0,
  ctx:{parks:[],cafes:[],stations:[],houses:[],lamps:[],mills:[],markets:[],bakeries:[],schools:[],docks:[]},
  services:{education:{providers:{},assignments:{},metrics:{average:0,demand:0,served:0,capacity:0,utilization:0}},recomputes:0,lastRecompute:0},
  diagnostics:{enabled:false,frames:0,fps:0,frameMs:0,simMs:0,renderMs:0,pathSearches:0,saveBytes:0},
  wx:{k:"clear",amt:0,target:0,next:70},
  wishes:[], log:[], history:[],
  cam:{x:0,y:0,z:1}
};

export const reduceMotion=(function(){
  try{ return matchMedia("(prefers-reduced-motion: reduce)").matches; }catch(e){ return false; }
})();
