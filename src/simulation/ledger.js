import { S } from '../core/state.js';

/* ============================================================
   LEDGER — what happened today, as facts

   Every system that does something worth telling appends a small structured
   event here as it happens: a family settled, a bakery opened, a crime was
   reported, a cruiser caught someone, a case was made. The Meadowline Post
   reads yesterday's entries once, at the turn of the day, ranks them and
   writes its issue - it never walks the city to reconstruct a day, and it
   never invents an entry the ledger does not hold.

   Entries are transient and bounded: only today's and yesterday's are kept,
   and never more than MAX_LEDGER. They are not saved; what the paper decides
   is worth remembering goes to its own archive.

   `hidden:true` marks an entry the simulation knows but the public does not -
   an organisation forming, a boss being named, a front opening. The paper
   never reads those. What it may say about such things comes from the public
   entries the police produce when they act, and from rumour anchored in what
   is actually observable. This is the knowledge boundary, as data.
   ============================================================ */

export const MAX_LEDGER=300;

export function ledger(){ if(!Array.isArray(S.ledger)) S.ledger=[]; return S.ledger; }

export function record(type,fields={}){
  const list=ledger();
  const day=S.day||1;
  // The event's type and day always win over whatever a caller passes.
  list.push({...fields,type,day});
  // Keep today and yesterday; the paper drains yesterday when it prints.
  while(list.length&&list[0].day<day-1) list.shift();
  if(list.length>MAX_LEDGER) list.splice(0,list.length-MAX_LEDGER);
  if(S.diagnostics) S.diagnostics.ledgerEvents=(S.diagnostics.ledgerEvents||0)+1;
}

/* Everything the public could know about a given day. Hidden entries stay out. */
export function publicEvents(day){ return ledger().filter(e=>e.day===day&&!e.hidden); }

export function ledgerSnapshot(){
  const list=ledger(); const byType={};
  for(const e of list) byType[e.type]=(byType[e.type]||0)+1;
  return {entries:list.length,hidden:list.filter(e=>e.hidden).length,byType};
}
