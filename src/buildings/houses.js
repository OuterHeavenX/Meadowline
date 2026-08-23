import { hash2 } from '../core/constants.js';
import { services } from '../core/services.js';
import { S } from '../core/state.js';
import { invalidateServices } from '../simulation/civic-services.js';
import { housingCapacity } from '../simulation/housing.js';

// Housing 2.0 makes the residential tier authoritative. Existing households
// above the new tier cap are grandfathered by housingCapacity, so nobody is
// evicted during migration and growth simply waits for the home to improve.
export function capFor(h){ return housingCapacity(h); }

export function growth(dt){
  for(const h of S.ctx.houses){
    const cap=capFor(h);
    if(!h.linked){
      h.grow=0;
      if(h.pop>0&&Math.random()<dt*0.05){ h.pop--; invalidateServices(); }
      continue;
    }
    if(h.pop<cap&&h.mood>=62){
      h.grow+=dt*(h.mood-55)/60;
      if(h.grow>=6){ h.grow=0; h.pop++; invalidateServices(); services.hearts(h.x,h.y); }
    } else if(h.mood<32&&h.pop>0){
      h.grow-=dt*0.4;
      if(h.grow<-8){ h.grow=0; h.pop--; invalidateServices(); }
    } else h.grow*=(1-dt*0.1);
  }
}

// how tightly homes may be packed before they start to grate
export const CROWD={r:2, limit:7, per:4};

/* ---------- who lives here ---------- */
export const FIRSTS=["Ada","Rowan","Juno","Maple","Bo","Wren","Otto","Sage","Iris","Fen",
              "Clover","Bram","Nell","Pip","Hazel","Tam","Marlow","Ivy","Cass","Linnet"];

export const HOUSE_NAMES=["Bramble Cottage","Willow End","The Old Bakehouse","Hollyhock","Number Four",
                   "Thistledown","Sparrow House","The Green Gate","Cobb Cottage","Fern Row",
                   "Larkspur","The Quiet Corner","Pennywort","Damson House","Yarrow Lodge"];

export function residents(h){
  const out=[];
  for(let i=0;i<h.pop;i++){
    let n="",k=0;
    do{ n=FIRSTS[(hash2(h.seed,i*11+k,313)*FIRSTS.length)|0]; k++; }
    while(out.indexOf(n)>=0&&k<14);
    out.push(n);
  }
  return out;
}
