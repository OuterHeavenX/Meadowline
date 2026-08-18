import { H, W } from './constants.js';

/* ---------- state ---------- */
export const S={
  seed:(Math.random()*1e9)|0,
  terr:null, natTree:null, grid:null,
  coins:340, day:1, dayT:0.24, t:0,
  speed:1, muted:true, running:true,
  tool:"move",
  citizens:[], trains:[], puffs:[],
  pop:0, mood:0, homes:0,
  ctx:{parks:[],cafes:[],stations:[],houses:[],lamps:[],mills:[]},
  wx:{k:"clear",amt:0,target:0,next:70},
  wishes:[],
  cam:{x:0,y:0,z:1}
};

export const reduceMotion=(function(){
  try{ return matchMedia("(prefers-reduced-motion: reduce)").matches; }catch(e){ return false; }
})();

export function idx(x,y){return y*W+x;}
export function inBounds(x,y){return x>=0&&y>=0&&x<W&&y<H;}
export function at(x,y){return inBounds(x,y)?S.grid[idx(x,y)]:null;}
export function isType(x,y,t){const b=at(x,y);return !!b&&b.type===t;}
