import { S } from '../core/state.js';
import { roadDegree } from './roads.js';
import { H, W } from '../core/constants.js';
import { isType } from '../world/tiles.js';

/* ---------- traffic signals ----------
   A crossroads gets lights; nothing else does. There is no tool for them and
   nothing to pay: a town that has grown a four-way junction has grown the
   traffic that needs managing, and the lights arriving on their own is the
   town maturing rather than another thing to remember to place.

   The cycle is deliberately short. Watching a car wait is only pleasant for a
   couple of seconds, and a long red on a quiet street reads as a stuck car
   rather than a considerate one. */
export const SIGNAL_DEGREE=4;        // a full crossroads, not a tee
export const SIGNAL_PERIOD=9;        // seconds for both axes to take a turn
export const SIGNAL_AMBER=1.1;       // the tail of each green

export function isSignalled(x,y){ return isType(x,y,'road')&&roadDegree(x,y)>=SIGNAL_DEGREE; }

/* Which axis is running, and how far through its turn it is. The phase is
   offset by position so a grid of junctions does not blink in unison, which
   looks mechanical from above. */
export function signalPhase(x,y){
  const half=SIGNAL_PERIOD/2;
  const offset=(x*7+y*13)%SIGNAL_PERIOD;
  const t=((S.t||0)+offset)%SIGNAL_PERIOD;
  const eastWest=t<half;
  const local=eastWest?t:t-half;
  return {axis:eastWest?'ew':'ns', local, half, amber:local>=half-SIGNAL_AMBER};
}

/* Whether a vehicle about to enter (x,y) from (fromX,fromY) has to wait. A
   vehicle already standing on the junction is never asked - shouldWait() tests
   the tile ahead - so a light changing under a car does not strand it. */
export function signalStops(x,y,fromX,fromY){
  if(!isSignalled(x,y)) return false;
  const travellingEW=fromY===y&&fromX!==x;
  const travellingNS=fromX===x&&fromY!==y;
  if(!travellingEW&&!travellingNS) return false;
  const ph=signalPhase(x,y);
  return ph.axis!==(travellingEW?'ew':'ns');
}

// The junctions themselves, cached: the renderer wants this every frame and
// the road network only changes when a road is laid or lifted.
let cache=null;
export function invalidateSignals(){ cache=null; }
export function signalJunctions(){
  if(cache) return cache;
  const out=[];
  for(let y=0;y<H;y++) for(let x=0;x<W;x++) if(isSignalled(x,y)) out.push({x,y});
  cache=out;
  if(S.diagnostics) S.diagnostics.signalJunctions=out.length;
  return out;
}
