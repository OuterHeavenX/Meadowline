import { P, SEASONS, SEASON_DAYS, clamp, lerp, mix, smooth } from '../core/constants.js';
import { S } from '../core/state.js';

/* ============================================================
   SEASONS, SKY AND WEATHER
   ============================================================ */

// Where we are in the year, as a blend of two seasons. The crossfade only
// happens over the last third of a season so most days sit in a settled hue.
export function seasonState(){
  const elapsed=(S.day-1)+clamp(S.dayT,0,1);
  const f=(elapsed/SEASON_DAYS)%4;
  const i=Math.floor(f), t=f-i;
  const bt=t<0.66?0:(t-0.66)/0.34;
  return {a:SEASONS[i%4], b:SEASONS[(i+1)%4], t:smooth(clamp(bt,0,1)), i:i%4};
}

// PAL is the palette for *this* moment: season-blended and ready to shade.
export const PAL={};
export function refreshPalette(){
  const q=seasonState();
  const m=(k)=>mix(q.a[k],q.b[k],q.t);
  PAL.q=q;
  PAL.grass=[0,1,2,3].map(k=>mix(q.a.grass[k],q.b.grass[k],q.t));
  PAL.grassDark=m("dark");
  PAL.leaf=m("leaf"); PAL.leafHi=m("leafHi");
  PAL.skyTop=m("skyTop"); PAL.skyBot=m("skyBot");
  PAL.nightTop=m("nightTop"); PAL.nightBot=m("nightBot");
  PAL.snow=lerp(q.a.snow,q.b.snow,q.t);
  PAL.bloom=lerp(q.a.bloom,q.b.bloom,q.t);
  PAL.fall=lerp(q.a.fall,q.b.fall,q.t);
  PAL.moodShift=lerp(q.a.mood,q.b.mood,q.t);
  PAL.yield=lerp(q.a.yield,q.b.yield,q.t);
  PAL.water=mix(P.water,"#c3dae0",PAL.snow*0.72);
  PAL.waterEdge=mix(P.waterEdge,"#e4eef0",PAL.snow*0.72);
  PAL.name=q.t>0.5?q.b.name:q.a.name;
}
export function seasonName(){ return PAL.name||"Spring"; }
