import { SEASON_DAYS } from '../core/constants.js';
import { S } from '../core/state.js';
import { seasonState } from './seasons.js';

/* ---------- festivals ----------
   One per season, on the third day, lasting that single day. A festival lifts
   every home's mood, adds a cut to the day's takings, and visibly dresses the
   valley: pennants on the roofs, confetti by day, lanterns after dark. */

export const FESTIVAL_DAY=2;                    // third day of the season, 0-indexed
export const FESTIVALS=[
  {name:"Spring Fair",   mood:8,  purse:0.15, flag:"#e7b4c6", lantern:"#ffd3e0"},
  {name:"Midsummer",     mood:8,  purse:0.15, flag:"#efc75e", lantern:"#ffe9a8"},
  {name:"Harvest Home",  mood:10, purse:0.25, flag:"#e0ae4e", lantern:"#ffc879"},
  {name:"Winter Lights", mood:10, purse:0.20, flag:"#a9d4de", lantern:"#c6e9f5"}
];

export function dayInSeason(){ return (((S.day-1)%SEASON_DAYS)+SEASON_DAYS)%SEASON_DAYS; }

export function activeFestival(){
  if(dayInSeason()!==FESTIVAL_DAY) return null;
  return FESTIVALS[seasonState().i];
}

export function festivalName(){ const f=activeFestival(); return f?f.name:""; }

// how far through the festival day we are, for fading the dressing in and out
export function festivalGlow(){
  return activeFestival() ? Math.sin(Math.PI*Math.min(Math.max(S.dayT,0),1)) : 0;
}
