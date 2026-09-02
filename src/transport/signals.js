import { DIRS } from '../core/constants.js';
import { S } from '../core/state.js';
import { idx, isType } from '../world/tiles.js';

/* ---------- traffic signals ----------
   A signal is not a building: it sits on top of a road tile, so the road
   underneath still carries traffic. They are kept in their own list because
   the grid holds one thing per tile. */

export const SIGNAL_COST=25;
export const SIGNAL_UPKEEP=0.5;
export const SIGNAL_PERIOD=7;        // seconds for a full red/green cycle

export function signalAt(x,y){
  return S.signals.find(s=>s.x===x&&s.y===y)||null;
}

export function addSignal(x,y){
  if(!isType(x,y,"road")||signalAt(x,y)) return false;
  S.signals.push({x,y,seed:(idx(x,y)*2654435761)>>>0});
  return true;
}

export function removeSignal(x,y){
  const i=S.signals.findIndex(s=>s.x===x&&s.y===y);
  if(i<0) return false;
  S.signals.splice(i,1);
  return true;
}

// Which axis has green right now. Signals are offset from each other so a
// street does not blink in unison.
export function greenAxis(sig){
  const phase=((S.t/SIGNAL_PERIOD)+(sig.seed%1000)/1000)%1;
  return phase<0.5?"x":"y";
}

// True when something travelling along `axis` must wait here.
export function stoppedBy(x,y,axis){
  const sig=signalAt(x,y);
  return !!sig&&greenAxis(sig)!==axis;
}

// A crossroads is a road tile with roads on all four sides. Busy ones are
// unpleasant to live beside until somebody puts a signal on them.
export function isCrossroads(x,y){
  if(!isType(x,y,"road")) return false;
  let n=0;
  for(const[dx,dy] of DIRS) if(isType(x+dx,y+dy,"road")) n++;
  return n===4;
}

export function unsignalledCrossroads(){
  const out=[];
  for(const b of S.ctx.all){
    if(b.type!=="road") continue;
    if(isCrossroads(b.x,b.y)&&!signalAt(b.x,b.y)) out.push(b);
  }
  return out;
}
