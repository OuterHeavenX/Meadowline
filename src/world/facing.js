import { getBuildingDefinition } from '../buildings/registry.js';
import { footprintCells, isType } from './tiles.js';

/* ---------- which way a building faces ----------
   Every model in the valley was laid down pointing the same way, so a house
   on the south side of a street presented its back door to it and a station
   opened onto a meadow. Nothing in the save says which way a building faces
   and nothing needs to: the street does. A building turns to the side with
   the most road along it, and turns again by itself when the street network
   changes around it.

   Authored meshes carry their door, their windows, the cafe's tables and the
   station's platform on +z - the +y side of the tile grid - so that side is
   the front, and a plot with its street there needs no turn at all. */
const SIDES=[[0,-1],[1,0],[0,1],[-1,0]];
const ANGLES=[Math.PI,Math.PI/2,0,-Math.PI/2];
/* Ways, planting and the things that already answer to something other than a
   street: rail and roads have their own geometry, a tree or a lamp has no
   front, and a dock is turned by the water it stands in. */
const UNTURNED=new Set(['road','rail','tree','lamp','dock']);

export function facingAngle(b){
  if(!b||UNTURNED.has(b.type)) return 0;
  const fp=getBuildingDefinition(b.type)?.placement?.footprint||[1,1];
  // A quarter turn swaps the footprint's width and depth, so an oblong like
  // the 2x3 Fire Station would hang over its neighbours. Those buildings keep
  // the two orientations that fit the ground they were placed on.
  const square=fp[0]===fp[1];
  const counts=[0,0,0,0];
  for(const c of footprintCells(b.type,b.x,b.y))
    for(let d=0;d<4;d++) if(isType(c.x+SIDES[d][0],c.y+SIDES[d][1],'road')) counts[d]++;
  let best=-1,most=0;
  for(let d=0;d<4;d++){
    if(!square&&(d===1||d===3)) continue;
    // Strictly greater, so a corner plot with equal frontage on two sides
    // settles on the first and does not flip between them from frame to frame.
    if(counts[d]>most){ most=counts[d]; best=d; }
  }
  return most?ANGLES[best]:0;
}
