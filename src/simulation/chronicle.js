import { S } from '../core/state.js';

/* The valley's own record: a day-by-day series for the graphs, and a log of
   the things worth remembering. Both live on state so the UI only reads. */
export const HISTORY_DAYS=40;
export const LOG_ENTRIES=60;

export function note(text){
  const last=S.log[0];
  if(last&&last.day===S.day&&last.text===text) return;   // don't repeat within a day
  S.log.unshift({day:S.day,text});
  if(S.log.length>LOG_ENTRIES) S.log.length=LOG_ENTRIES;
}

export function recordDay(){
  S.history.push({day:S.day,pop:S.pop,coins:Math.floor(S.coins),mood:S.mood});
  if(S.history.length>HISTORY_DAYS) S.history.shift();
}

export function series(key){ return S.history.map(h=>h[key]); }
