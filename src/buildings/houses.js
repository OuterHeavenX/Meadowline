import { services } from '../core/services.js';
import { S } from '../core/state.js';

export function growth(dt){
  for(const h of S.ctx.houses){
    const cap=4;
    if(!h.linked){ h.grow=0; if(h.pop>0&&Math.random()<dt*0.05) h.pop--; continue; }
    if(h.pop<cap&&h.mood>=62){
      h.grow+=dt*(h.mood-55)/60;
      if(h.grow>=6){ h.grow=0; h.pop++; services.hearts(h.x,h.y); }
    } else if(h.mood<32&&h.pop>0){
      h.grow-=dt*0.4;
      if(h.grow<-8){ h.grow=0; h.pop--; }
    } else h.grow*=(1-dt*0.1);
  }
}

// how tightly homes may be packed before they start to grate
export const CROWD={r:2, limit:7, per:4};
