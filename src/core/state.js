/* ---------- state ---------- */
export const S={
  seed:(Math.random()*1e9)|0,
  terr:null, natTree:null, grid:null,
  coins:340, day:1, dayT:0.24, t:0,
  speed:1, muted:true, running:true,
  tool:"move",
  citizens:[], trains:[], boats:[], puffs:[],
  pop:0, mood:0, homes:0,
  ctx:{parks:[],cafes:[],stations:[],houses:[],lamps:[],mills:[]},
  wx:{k:"clear",amt:0,target:0,next:70},
  wishes:[], log:[], history:[],
  econ:{jobs:0,employed:0,idle:0,unemployment:0,staffing:1,upkeep:0,gross:0,net:0,broke:false},
  cam:{x:0,y:0,z:1}
};

export const reduceMotion=(function(){
  try{ return matchMedia("(prefers-reduced-motion: reduce)").matches; }catch(e){ return false; }
})();
