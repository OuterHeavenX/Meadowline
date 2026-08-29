/* ---------- who goes where on a street ----------
   Roads & Mobility 2.0 states that one tile reads as

       sidewalk / curb -> vehicle carriageway -> curb / sidewalk

   and that pedestrians take "a stable side-of-street offset perpendicular to
   travel direction". Only the Canvas renderer ever did it, and only for people:
   it nudged them in screen space after projection. The GPU renderer — the one
   Auto selects — placed every citizen and every vehicle on the raw tile centre,
   so pedestrians and cars walked and drove down the same middle line, and cars
   never even turned to face where they were going.

   These offsets are world tiles, so both renderers put an actor in the same
   place, and they match the art: the GPU road lays its sidewalk strips at ±0.44
   on any exposed edge and keeps the carriageway in the middle. */

export const SIDEWALK_OFFSET=0.42;
export const LANE_OFFSET=0.18;

/* Unit vector of travel. Falls back to the step just taken when an actor is
   paused mid-tile, and to east when it has never moved, so a stationary
   citizen still stands on a pavement rather than in the road. */
export function headingOf(a){
  let dx=(Number(a?.nx)||0)-(Number(a?.x)||0);
  let dy=(Number(a?.ny)||0)-(Number(a?.y)||0);
  if(!dx&&!dy){
    dx=(Number(a?.x)||0)-(Number(a?.px ?? a?.x)||0);
    dy=(Number(a?.y)||0)-(Number(a?.py ?? a?.y)||0);
  }
  if(!dx&&!dy) dx=1;
  const len=Math.hypot(dx,dy)||1;
  return {x:dx/len,y:dy/len};
}

/* Perpendicular to travel, on the citizen's stable side. */
export function sidewalkOffset(c){
  if(c?.facilityLocal) return {x:0,y:0};
  const h=headingOf(c),side=c?.side||1;
  return {x:-h.y*SIDEWALK_OFFSET*side,y:h.x*SIDEWALK_OFFSET*side};
}

/* Perpendicular too, but always the same hand relative to travel — which is
   what makes opposing cars pass on opposite sides of the centre line instead
   of driving through each other. */
export function laneOffset(v){
  const h=headingOf(v);
  return {x:-h.y*LANE_OFFSET,y:h.x*LANE_OFFSET};
}

/* Rotation about the vertical axis that points a mesh's local +X along travel.
   World Y is the GPU scene's Z, hence the negated term. */
export function headingAngle(a){
  const h=headingOf(a);
  return Math.atan2(-h.y,h.x);
}
