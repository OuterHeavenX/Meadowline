import { hash2 } from '../core/constants.js';
import { S } from '../core/state.js';
import { getBuildingDefinition } from '../buildings/registry.js';
import { celebrities, venueOf } from './fame.js';
import { darkness } from '../world/time.js';
import { inBounds, isType } from '../world/tiles.js';

/* ============================================================
   BUSKERS — who turns up, and why

   A Busker's Pitch is the player's half: somewhere to perform, and a street
   performer's trade can be held there, so the fame system treats it as a venue
   like a café or a market. Who actually stands on it is not the player's half.

   Entertainers turn up where a street is already worth standing on — homes
   within earshot, trade to draw a crowd, and above all somebody famous playing
   nearby, which is the point of the whole thing: a musician the valley knows
   pulls jugglers and puppeteers onto the pavement outside their venue without
   the player doing anything at all. A pitch on a dead street stays empty, and
   a lively street gets buskers with no pitch on it, only fewer.

   They are transient. The list is rebuilt from a seeded roll on the same slot
   clock everything else here uses, so the same day in the same town produces
   the same street, and none of it is saved — tomorrow is its own day. They go
   home when it gets dark.
   ============================================================ */

export const ACTS=[
  {id:'juggler',    name:'juggler',      doing:'keeping five balls up'},
  {id:'clown',      name:'clown',        doing:'making a nuisance of himself'},
  {id:'fiddler',    name:'fiddler',      doing:'playing for coins'},
  {id:'puppeteer',  name:'puppeteer',    doing:'running a puppet show'},
  {id:'chalkArtist',name:'chalk artist', doing:'chalking the pavement'}
];
export const MAX_BUSKERS=10;
// How far a busker is heard from, and how far the draws that bring one reach.
export const BUSKER_MOOD_R=3;
const HOME_R=4, TRADE_R=3, STAR_R=4;
// A street this lively is worth standing on at all.
const THRESHOLD=6;
// Past this it is dark and everyone has gone home.
const NIGHT=0.34;

export function buskers(){ if(!Array.isArray(S.buskers)) S.buskers=[]; return S.buskers; }
const isPitch=b=>!!getBuildingDefinition(b?.type)?.performance;
export function pitches(){ return (S.ctx?.stages||[]).filter(isPitch); }

/* Where somebody might stand: on a pitch, or on the pavement outside a trade
   that draws people past it. Deriving the spots from the draws rather than
   walking every road tile keeps this bounded by what is built. */
function spots(){
  const out=new Map();
  const add=(x,y,pitch)=>{ if(!inBounds(x,y)) return; const k=x+','+y;
    if(!out.has(k)) out.set(k,{x,y,pitch:!!pitch}); else if(pitch) out.get(k).pitch=true; };
  for(const b of pitches()) add(b.x,b.y,true);
  for(const list of [S.ctx?.cafes,S.ctx?.markets,S.ctx?.shops,S.ctx?.bakeries])
    for(const b of list||[])
      for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])
        if(isType(b.x+dx,b.y+dy,'road')) add(b.x+dx,b.y+dy,false);
  return [...out.values()];
}

/* Who is famous and playing within earshot of this spot. This is the tie the
   whole feature hangs on, so it reads the fame list rather than guessing from
   how nice the street is. */
function starsNear(x,y){
  const out=[];
  for(const c of celebrities()){
    const v=venueOf(c.family,c.index); if(!v) continue;
    if(Math.max(Math.abs(v.x-x),Math.abs(v.y-y))<=STAR_R) out.push(c);
  }
  return out;
}

/* How worth standing on a spot is. Homes to hear it, trade to bring people
   past, a pitch to stand on and a name to stand near. Each part is capped, so
   no one of them alone makes a street a fairground. */
export function liveliness(x,y){
  let homes=0;
  for(const h of S.ctx?.houses||[])
    if((h.pop|0)>0&&Math.max(Math.abs(h.x-x),Math.abs(h.y-y))<=HOME_R) homes++;
  let trade=0;
  for(const list of [S.ctx?.cafes,S.ctx?.markets,S.ctx?.shops,S.ctx?.bakeries])
    for(const b of list||[]) if(Math.max(Math.abs(b.x-x),Math.abs(b.y-y))<=TRADE_R) trade++;
  const stars=starsNear(x,y);
  let star=0; for(const c of stars) star+=c.renown>=3?6:4;
  return {value:Math.min(6,homes)+Math.min(8,trade*2)+Math.min(12,star),
    homes,trade,stars};
}

/* One deterministic pass. Same day, same slot, same town, same street. */
export function evaluateBuskers(){
  const list=buskers(); list.length=0;
  if(darkness()>NIGHT) return list;
  const slot=Math.floor((S.dayT||0)*8), day=S.day||1;
  const ranked=spots().map(s=>({...s,live:liveliness(s.x,s.y)}))
    .filter(s=>s.live.value+(s.pitch?5:0)>=THRESHOLD)
    .sort((a,b)=>(b.live.value+(b.pitch?5:0))-(a.live.value+(a.pitch?5:0))||a.x-b.x||a.y-b.y);
  for(const s of ranked){
    if(list.length>=MAX_BUSKERS) break;
    const score=s.live.value+(s.pitch?5:0);
    const roll=hash2(s.x*31+s.y,day*8+slot,S.seed>>>0);
    /* A pitch is a place somebody is meant to stand, so it fills readily; the
       pavement outside a café is a maybe. Neither is a certainty, because a
       street that always has a clown on it stops being a street. */
    if(roll>Math.min(s.pitch?0.95:0.7,score/16)) continue;
    const act=ACTS[Math.floor(hash2(s.y*17+s.x,day,(S.seed>>>0)+11)*ACTS.length)%ACTS.length];
    list.push({x:s.x,y:s.y,act:act.id,pitch:s.pitch,
      drawnBy:s.live.stars.length?s.live.stars[0].name:null,
      seed:((s.x*73856093)^(s.y*19349663))>>>0});
  }
  if(S.diagnostics) S.diagnostics.buskers=list.length;
  return list;
}

let clock=0;
export function advanceBuskers(dt){
  clock+=dt;
  if(clock<2) return;
  clock=0;
  evaluateBuskers();
}

// What a household hears from its window: capped, so a pavement full of
// jugglers is worth about what one good one is.
export function buskerMood(h){
  let n=0;
  for(const b of buskers())
    if(Math.max(Math.abs(b.x-h.x),Math.abs(b.y-h.y))<=BUSKER_MOOD_R) n++;
  return {n,value:Math.min(6,n*3)};
}
export function buskersAt(x,y){ return buskers().filter(b=>b.x===x&&b.y===y); }
export function actOf(id){ return ACTS.find(a=>a.id===id)||ACTS[0]; }
