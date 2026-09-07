import { hash2 } from '../core/constants.js';
import { S } from '../core/state.js';
import { SOCIAL_INTERVAL, families, familyMembers } from './families.js';
import { CAREERS, LOOKING } from './careers.js';
import { fameOf } from './fame.js';
import { recomputeDistricts } from './districts.js';
import { record } from './ledger.js';

/* ============================================================
   INFLUENCE — who the valley listens to, and what they ask for

   The milestone deferred political influence, and the reason it was worth
   deferring is that "politics" in a city builder usually means a government
   the player operates: policy sliders, elections, approval bars. Meadowline
   does not have a government and is not getting one. What it can have is the
   thing underneath politics — some households come to have a say, and what
   they say is a real need of the place they live in.

   So influence is a VOICE, never a control. There is no vote to hold, no
   policy to set and no petition the player can file. A district raises one
   when it genuinely lacks something and somebody there is listened to; the
   player may build the thing or may not, and nothing punishes them either way.
   City Hall and the Post report petitions the same way they report everything
   else: as something the city did on its own.

   WHAT INFLUENCE IS NOT MADE OF

   This is the whole design, and it is the milestone's anti-stereotype rule
   applied to the one system where it matters most. Being listened to is NOT
   wealth. Housing tier, desirability and social standing appear nowhere in
   this file, and the regression reads its source to keep them out and runs
   two households side by side — one affluent, one working, identical in
   everything else — and asserts they are heard exactly alike.

   What it IS made of is what actually earns a hearing anywhere: how long a
   household has been in the valley, whether its people do work the public
   depends on, whether the place knows their name, and whether they are in
   work at all. A third-generation family of farmers outranks a rich household
   that arrived last week, and that is the point.
   ============================================================ */

export const MAX_PETITIONS=4;
export const INFLUENCE_INTERVAL=SOCIAL_INTERVAL*3;
// A household is listened to above this. Deliberately not a majority.
export const HEARD=0.45;
// How long a petition stands before the valley stops repeating it.
const PATIENCE=90;

/* Work the public depends on. Not "good jobs" and not well-paid ones - a
   nurse, a teacher and a firefighter are here; a café owner is not, and that
   is a statement about who the town relies on, not about who matters. */
const PUBLIC_WORK=new Set(['teacher','doctor','nurse','policeOfficer','firefighter','civilServant','railWorker']);

const NEEDS=[
  {id:'school',   want:'a school',            when:d=>d.homes>=6&&d.schools===0},
  {id:'recreation',want:'somewhere to gather', when:d=>d.homes>=6&&d.recreationReach===0},
  {id:'work',     want:'work within reach',   when:d=>d.homes>=6&&d.jobs<d.workers*0.5},
  {id:'safety',   want:'a police station',    when:d=>d.homes>=8&&d.unresolvedCrime>=1},
  {id:'transport',want:'a way out of the valley',when:d=>d.homes>=10&&d.stations===0&&d.roadTiles>=18}
];

function ensureSocial(){
  if(!S.social||typeof S.social!=='object') S.social={districts:[],nextId:0,families:[],nextFamilyId:0,firsts:{}};
  if(!Array.isArray(S.social.petitions)) S.social.petitions=[];
  return S.social;
}
export function petitions(){ return ensureSocial().petitions; }
export function petitionsIn(name){ return petitions().filter(p=>p.district===name); }

/* ---------- how much of a hearing a household gets ----------
   Four terms, all of them things the household did or has been. Read the list
   for what is missing: nothing here asks what their home is worth. */
export function influenceOf(f){
  if(!f) return 0;
  const members=familyMembers(f);
  if(!members.length) return 0;
  // Rooted: generations in the valley, to a ceiling.
  const rooted=Math.min(1,((f.generation||1)-1)/2);
  // Public work: how much of the household serves the town.
  const careers=Object.values(f.careers||{}).filter(c=>c&&c!==LOOKING);
  const service=careers.filter(c=>PUBLIC_WORK.has(c)).length/members.length;
  // Known: the best renown anybody in the household has reached.
  const known=Math.min(1,members.reduce((n,m)=>Math.max(n,fameOf(f,m.index)?.renown||0),0)/3);
  // In work at all, which is a plain fact about the household.
  const working=careers.length/members.length;
  return Math.min(1,rooted*0.34+service*0.3+known*0.24+working*0.12);
}
export function isHeard(f){ return influenceOf(f)>=HEARD; }
/* The households a district actually listens to, loudest first. */
export function voicesIn(name){
  return families().filter(f=>f.roots===name&&isHeard(f)).sort((a,b)=>influenceOf(b)-influenceOf(a));
}
export function voices(){ return families().filter(isHeard).sort((a,b)=>influenceOf(b)-influenceOf(a)); }

/* ---------- petitions ---------- */
function needOf(d){ return NEEDS.find(n=>n.when(d.measured||{}))||null; }

let clock=0;
export function advanceInfluence(dt,note){
  clock+=dt;
  if(clock<INFLUENCE_INTERVAL) return;
  clock=0;
  evaluateInfluence(note);
}
export function evaluateInfluence(note=()=>{}){
  const social=ensureSocial();
  const list=social.petitions;
  const day=S.day||1, slot=Math.floor((S.dayT||0)*8);
  if(S.diagnostics) S.diagnostics.influenceEvaluations=(S.diagnostics.influenceEvaluations||0)+1;
  const districts=recomputeDistricts();
  const byName=new Map(districts.map(d=>[d.name,d]));

  // Standing petitions: met when the thing is there, dropped when the district
  // is gone or the valley has repeated itself long enough.
  for(let i=list.length-1;i>=0;i--){
    const p=list[i];
    const d=byName.get(p.district);
    if(!d){ list.splice(i,1); continue; }
    const need=NEEDS.find(n=>n.id===p.need);
    if(need&&!need.when(d.measured||{})){
      note(p.district+' got '+need.want+', which it had been asking for');
      record('petition_met',{district:p.district,need:p.need,want:need.want,days:day-p.since});
      if(S.diagnostics) S.diagnostics.petitionsMet=(S.diagnostics.petitionsMet||0)+1;
      list.splice(i,1); continue;
    }
    if(day-p.since>PATIENCE){ list.splice(i,1); if(S.diagnostics) S.diagnostics.petitionsLapsed=(S.diagnostics.petitionsLapsed||0)+1; }
  }
  if(list.length>=MAX_PETITIONS) return;

  // New ones: a real lack, and somebody there the district listens to.
  for(const d of districts){
    if(list.length>=MAX_PETITIONS) break;
    if(petitionsIn(d.name).length) continue;
    const need=needOf(d); if(!need) continue;
    const heard=voicesIn(d.name); if(!heard.length) continue;
    // Not the instant the need appears: a while of it, then a seeded roll.
    if(hash2(day*8+slot,d.id*457,S.seed>>>0)>=0.12) continue;
    const lead=heard[0];
    list.push({district:d.name,need:need.id,since:day,familyId:lead.id});
    note('Households in '+d.name+' have begun asking for '+need.want);
    record('petition_raised',{district:d.name,need:need.id,want:need.want,surname:lead.surname,familyId:lead.id});
    if(S.diagnostics) S.diagnostics.petitionsRaised=(S.diagnostics.petitionsRaised||0)+1;
  }
}

/* ---------- reading ---------- */
export function petitionWant(p){ return NEEDS.find(n=>n.id===p?.need)?.want||''; }
export function influenceSnapshot(){
  return {heard:voices().length,petitions:petitions().length,
    raised:S.diagnostics?.petitionsRaised||0,met:S.diagnostics?.petitionsMet||0};
}

/* ---------- save ---------- */
export function packInfluence(){
  return {petitions:petitions().slice(0,MAX_PETITIONS).map(p=>({district:String(p.district).slice(0,40),
    need:p.need,since:Math.max(1,p.since|0),familyId:p.familyId|0}))};
}
export function restoreInfluence(raw){
  const s=ensureSocial(); s.petitions=[]; clock=0;
  if(!raw||typeof raw!=='object') return;
  const known=new Set(families().map(f=>f.id));
  for(const p of (Array.isArray(raw.petitions)?raw.petitions:[]).slice(0,MAX_PETITIONS)){
    if(!p||typeof p!=='object') continue;
    // A need this build does not have, or a household this save does not have,
    // is not something the valley can be asking for.
    if(!NEEDS.some(n=>n.id===p.need)) continue;
    const familyId=Math.floor(Number(p.familyId)||0); if(!known.has(familyId)) continue;
    const district=String(p.district||'').slice(0,40); if(!district) continue;
    if(s.petitions.some(x=>x.district===district)) continue;
    s.petitions.push({district,need:p.need,since:Math.max(1,Math.floor(Number(p.since)||1)),familyId});
  }
}
