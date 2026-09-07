import { hash2 } from '../core/constants.js';
import { S } from '../core/state.js';
import { isFacilityPart } from '../world/tiles.js';
import { recomputeDistricts } from './districts.js';
import { ORG_INTERVAL, bossOf, frontsOf, organisations } from './organisations.js';
import { spawnMunicipalIncident } from './municipal.js';
import { familyNote } from './families.js';
import { record } from './ledger.js';

/* ============================================================
   ENFORCEMENT — the police decide

   The player builds stations and improves the city. What the police notice,
   what they look into and when they act is decided here, and only here. There
   is no unit to command, no target to pick, no button; this module exports a
   clock and readings, and the regression checks that nothing in src/ui imports
   anything else from it.

   The shape is the Police simulation's own. A station within reach of a
   district NOTICES an organisation there with a chance that grows with how
   visible it is - its stage, its fronts, the crimes left open around it - and
   with how many stations are near. An INVESTIGATION then runs for a while on
   its own clock. When it is ready the police ACT: a cruiser goes out through
   the same dispatcher a robbery uses, and the outcome is settled by a seeded
   roll that favours the police when stations are many and the organisation is
   small. Success closes a front, takes the boss in for questioning and puts a
   point of pressure on the organisation; organisations.js reads that as a
   stage lost. Failure is remembered too, and the next look comes slower.

   Nothing here is a fight. A raid is a cruiser, a toast, a search and a line in
   the Chronicle. Nobody is hurt, no building is lost, and the café that was a
   front is a café tomorrow, as it was all along.
   ============================================================ */

// How far from a district's centre a station counts as covering it.
export const NOTICE_REACH=14;
// How long the police stay off a case they could not make, in days.
const COOL_OFF=20;

function stationsNear(d){
  const out=[];
  for(const b of S.grid||[]){
    if(!b||isFacilityPart(b)||b.type!=='policeStation') continue;
    if(Math.max(Math.abs(b.x-d.cx),Math.abs(b.y-d.cy))<=NOTICE_REACH) out.push(b);
  }
  return out;
}
function openCrimes(d){
  let n=0;
  for(const inc of S.incidents||[]) if(!inc.resolved&&inc.kind==='crime'&&!inc.tag&&inc.target&&
    inc.target.x>=d.bounds.minX&&inc.target.x<=d.bounds.maxX&&inc.target.y>=d.bounds.minY&&inc.target.y<=d.bounds.maxY) n++;
  return n;
}

/* How likely the police are to open a case this pass. Visibility and coverage,
   nothing else: no name, no class, no district identity, no desirability. */
export function noticeChance(o,stations,crimes){
  if(!stations) return 0;
  let p=0.004*o.stage+(o.stage>=3?0.02:0)+0.03*(o.fronts||[]).length+0.015*crimes;
  p*=Math.min(3,stations);
  if(o.lastInvestigated&&(S.day||1)-o.lastInvestigated<=COOL_OFF) p*=0.25;
  return Math.min(0.5,p);
}
/* How likely the case is made once they act. */
export function caseChance(o,stations){
  return Math.max(0.2,Math.min(0.85,0.35+0.12*Math.min(3,stations)-0.05*(o.stage-3)));
}

function target(o){
  const front=frontsOf(o)[0]; if(front) return front;
  const boss=bossOf(o);
  if(boss){ for(const h of S.ctx?.houses||[]) if((h.seed>>>0)===(boss.family.homeSeed>>>0)) return h; }
  return null;
}

let clock=0;
export function advanceEnforcement(dt,note){
  clock+=dt;
  if(clock<ORG_INTERVAL) return;
  clock=0;
  evaluateEnforcement(note);
}
export function evaluateEnforcement(note=()=>{}){
  const day=S.day||1, slot=Math.floor((S.dayT||0)*8);
  if(S.diagnostics) S.diagnostics.enforcementEvaluations=(S.diagnostics.enforcementEvaluations||0)+1;
  const byName=new Map(recomputeDistricts().map(d=>[d.name,d]));
  for(const o of organisations()){
    const d=byName.get(o.roots); if(!d) continue;
    const stations=stationsNear(d);
    if(!o.investigation){
      if(!stations.length) continue;
      const roll=hash2(day*8+slot,o.id*613,S.seed>>>0);
      if(roll>=noticeChance(o,stations.length,openCrimes(d))) continue;
      const station=stations.sort((a,b)=>Math.abs(a.x-d.cx)+Math.abs(a.y-d.cy)-Math.abs(b.x-d.cx)-Math.abs(b.y-d.cy))[0];
      o.investigation={since:day,progress:0,station:station.seed>>>0};
      note('The police began looking into the '+o.name);
      record('investigation_opened',{orgId:o.id,district:o.roots,exposed:!!o.exposed,name:o.exposed?o.name:null});
      if(S.diagnostics) S.diagnostics.investigationsOpened=(S.diagnostics.investigationsOpened||0)+1;
      continue;
    }
    // A case with no station left to work it is dropped, not finished.
    if(!stations.length){ o.investigation=null; continue; }
    // A case takes a week or two with one station, less with more.
    o.investigation.progress+=0.04+0.02*Math.min(3,stations.length);
    if(o.investigation.progress<1) continue;
    act(o,d,stations.length,note,day,slot);
  }
}
function act(o,d,stations,note,day,slot){
  o.investigation=null; o.lastInvestigated=day;
  const made=hash2(day*8+slot,o.id*829,S.seed>>>0)<caseChance(o,stations);
  const at=target(o);
  if(at) spawnMunicipalIncident('crime',at,{tag:'raid',toast:'Police moving on the '+o.name});
  record('raid',{orgId:o.id,district:o.roots,kind:at&&({cafe:'café',bakery:'bakery',market:'market stall',house:'home'})[at.type]||null,exposed:!!o.exposed,name:o.exposed?o.name:null});
  if(S.diagnostics) S.diagnostics.raids=(S.diagnostics.raids||0)+1;
  if(!made){
    note('The police looked into the '+o.name+' and found nothing they could use');
    record('case_dropped',{orgId:o.id,district:o.roots,exposed:!!o.exposed,name:o.exposed?o.name:null});
    if(S.diagnostics) S.diagnostics.casesDropped=(S.diagnostics.casesDropped||0)+1;
    return;
  }
  if(S.diagnostics) S.diagnostics.casesMade=(S.diagnostics.casesMade||0)+1;
  // A made case is the world exposing the organisation: from here the public,
  // and the paper, may know it by the name investigators use.
  const firstExposure=!o.exposed; o.exposed=true;
  record('case_made',{orgId:o.id,district:o.roots,name:o.name,stage:o.stage,firstExposure});
  const front=frontsOf(o)[0];
  if(front){
    o.fronts=o.fronts.filter(seed=>(seed>>>0)!==(front.seed>>>0));
    note('The police closed the '+o.name+' out of a '+({cafe:'café',bakery:'bakery',market:'market stall'})[front.type]+' on '+o.roots);
    record('front_closed',{orgId:o.id,district:o.roots,kind:({cafe:'café',bakery:'bakery',market:'market stall'})[front.type],name:o.name});
    if(S.diagnostics) S.diagnostics.frontsClosed=(S.diagnostics.frontsClosed||0)+1;
  }
  const boss=bossOf(o);
  if(boss){
    o.taken=(o.taken||[]).concat(o.boss.familyId*8+o.boss.index).slice(-40);
    o.boss=null;
    note(boss.name+' was taken in for questioning');
    record('questioned',{orgId:o.id,district:o.roots,familyId:boss.family.id,index:boss.index,name:boss.name,orgName:o.name});
    familyNote(boss.family,boss.first+' was taken in for questioning');
    if(S.diagnostics) S.diagnostics.bossesTaken=(S.diagnostics.bossesTaken||0)+1;
  }
  o.pressure=(o.pressure|0)+1;
}

/* ---------- reading ---------- */
export function investigating(station){
  if(!station) return null;
  return organisations().find(o=>o.investigation&&(o.investigation.station>>>0)===(station.seed>>>0))||null;
}
export function underInvestigation(o){ return !!o?.investigation; }
export function enforcementSnapshot(){
  const list=organisations();
  return {investigations:list.filter(o=>o.investigation).length,raids:S.diagnostics?.raids||0,casesMade:S.diagnostics?.casesMade||0};
}
