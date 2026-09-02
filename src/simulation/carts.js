import { clamp, lerp } from '../core/constants.js';
import { S } from '../core/state.js';
import { findPath } from '../transport/pathfinding.js';
import { roadNear } from '../transport/roads.js';
import { stoppedBy } from '../transport/signals.js';
import { isType } from '../world/tiles.js';

/* ---------- carts ----------
   Goods do not teleport to market any more. A cart leaves a producer, drives
   the roads to a market, and drives home again; each delivery pays a little.
   They use the same road graph as the citizens, and they stop at red. */

export const CART_COLOURS=[["#a8613f","#7d4529"],["#5d7f8c","#44606b"],["#7d7f4a","#5c5e33"]];
export const DELIVERY_PAY=4;
const PRODUCERS=["farm","mill","bakery","sawmill","workshop"];
const walkable=(x,y)=>isType(x,y,"road");

function producers(){ return S.ctx.all.filter(b=>PRODUCERS.includes(b.type)); }

function launch(){
  const from=producers();
  if(!from.length||!S.ctx.markets.length) return null;
  const src=from[(Math.random()*from.length)|0];
  const dst=S.ctx.markets[(Math.random()*S.ctx.markets.length)|0];
  const a=roadNear(src.x,src.y), b=roadNear(dst.x,dst.y);
  if(!a||!b) return null;
  const path=findPath(a.x,a.y,b.x,b.y,walkable);
  if(!path||!path.length) return null;
  return {
    x:a.x,y:a.y,px:a.x,py:a.y,nx:path[0][0],ny:path[0][1],p:0,
    sp:0.55+Math.random()*0.25, hue:(Math.random()*CART_COLOURS.length)|0,
    path,pi:1, home:{x:a.x,y:a.y}, target:{x:b.x,y:b.y}, laden:true, wait:0
  };
}

export function updateCarts(dt){
  const want=clamp(Math.min(producers().length,S.ctx.markets.length*3),0,12);
  if(S.carts.length<want&&Math.random()<dt*0.9){
    const c=launch(); if(c) S.carts.push(c);
  }
  while(S.carts.length>want) S.carts.pop();

  for(let i=S.carts.length-1;i>=0;i--){
    const c=S.carts[i];
    // a cart already on a tile with a red light for its heading waits there
    const axis=(c.nx!==c.x)?"x":"y";
    if(c.p<0.02&&stoppedBy(c.x,c.y,axis)){ c.wait+=dt; continue; }
    c.wait=0;
    c.p+=dt*c.sp;
    let lost=false;
    while(c.p>=1){
      c.p-=1;
      c.px=c.x; c.py=c.y; c.x=c.nx; c.y=c.ny;
      if(!walkable(c.x,c.y)){ lost=true; break; }
      if(c.pi<c.path.length){
        const n=c.path[c.pi++];
        if(Math.abs(n[0]-c.x)+Math.abs(n[1]-c.y)!==1){ lost=true; break; }
        c.nx=n[0]; c.ny=n[1];
      } else {
        // arrived: pay for the load, then turn around and go home
        if(c.laden){ S.coins+=DELIVERY_PAY; S.econ.delivered=(S.econ.delivered||0)+1; }
        const back=c.laden?c.home:c.target;
        const path=findPath(c.x,c.y,back.x,back.y,walkable);
        if(!path||!path.length){ lost=true; break; }
        c.laden=!c.laden; c.path=path; c.pi=1;
        c.nx=path[0][0]; c.ny=path[0][1];
      }
    }
    if(lost){ S.carts.splice(i,1); continue; }
    c.fx=lerp(c.x,c.nx,c.p); c.fy=lerp(c.y,c.ny,c.p);
  }
}
