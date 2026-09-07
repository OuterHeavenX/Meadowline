import { getBuildingDefinition } from '../buildings/registry.js';
import { clamp, hash2 } from '../core/constants.js';
import { S } from '../core/state.js';
import { getEducationLevel } from './civic-services.js';
import { MAX_MEMBERS, SOCIAL_INTERVAL, families, familyKnownFor, familyMembers } from './families.js';
import { housingTierIndex } from './housing.js';
import { districtAt, invalidateDistricts } from './districts.js';
import { record } from './ledger.js';
import { isFacilityPart } from '../world/tiles.js';

/* ============================================================
   CAREERS AND STANDING — what the people the valley knows do, and how
   they are getting on

   A career is a real job at a real workplace the player built, within reach of
   the family's home. There is no career the city has no building for: nobody
   is a baker in a town with no bakery, and nobody is a teacher until there is a
   school to teach in. Which job a person takes is weighed from the jobs
   actually standing nearby (the registry's `jobs` per building, never
   invented), the household's education where the job needs it, the person's
   leanings, and a seeded roll - and once taken it is kept until the workplace
   goes or, rarely, something changes. Careers evolve; they are not dealt once.

   Standing - struggling, working class, middle class, affluent, elite - is
   derived every time it is read from the household's real condition: its
   housing tier, its education, its home's desirability, how many of its people
   are in work, and how long it has been here. Nothing stores it except the
   last reading, so a change can be noticed. It moves both ways. The labels
   are the brief's, and they describe a condition; none of them is a verdict.

   The anti-stereotype rules, as mechanics:
     - Education gates the jobs that genuinely need it (doctor, teacher) and
       nothing else. A farmer can hold a doctorate. A doctor cannot practise
       without the schooling.
     - Standing reads conditions, never career: a farming family and a family
       of doctors with the same home, schooling and work are the same class.
     - No career, standing or trait carries any consequence for crime here.
       That system (organisations.js) reads its own conditions.
     - Culture tilts, slightly and only toward the positive: a district known
       for entertainment draws performers a little more, a farm belt farmers.
       No identity draws anyone toward anything else.
   ============================================================ */

// How far a person will go to work, in tiles, as a Chebyshev distance.
const REACH=11;
// Chance per social pass that a settled person reconsiders. Careers evolve on
// the scale of a life, not a week.
const RECONSIDER=0.02;

/* Which building offers which job. `edu` is the household education a job
   needs; the two that carry one are the two that genuinely do. `lean` names
   the trait that tilts a person toward it, and by how much - a tilt, never a
   requirement. */
export const CAREERS={
  farmer:        {at:['farm'],           label:'farmer',           lean:['discipline',.5]},
  millWorker:    {at:['mill'],           label:'mill worker',      lean:['discipline',.4]},
  baker:         {at:['bakery'],         label:'baker',            lean:['creativity',.4]},
  marketTrader:  {at:['market'],         label:'market trader',    lean:['sociability',.6]},
  cafeOwner:     {at:['cafe'],           label:'café owner',       lean:['entrepreneurship',.9],owner:true},
  cafeWorker:    {at:['cafe'],           label:'café worker',      lean:['sociability',.4]},
  teacher:       {at:['school','greatLibrary'],label:'teacher',    lean:['compassion',.5],edu:35},
  doctor:        {at:['clinic','hospital'],label:'doctor',         lean:['discipline',.5],edu:60},
  nurse:         {at:['clinic','hospital'],label:'nurse',          lean:['compassion',.6]},
  policeOfficer: {at:['policeStation'],  label:'police officer',   lean:['leadership',.4]},
  firefighter:   {at:['fireStation'],    label:'firefighter',      lean:['riskTolerance',.5]},
  railWorker:    {at:['station'],        label:'rail worker',      lean:['discipline',.3]},
  dockWorker:    {at:['dock'],           label:'dock worker',      lean:['riskTolerance',.3]},
  civilServant:  {at:['cityHall'],       label:'civil servant',    lean:['caution',.5]},
  keeper:        {at:['lighthouse','clockTower','statue'],label:'keeper',lean:['caution',.4]},
  // Entertainment is work like any other: a seat at a real building. A café
  // has room for someone who plays; a market for someone who performs; a
  // landmark for someone who makes things worth looking at.
  musician:      {at:['cafe'],           label:'musician',         lean:['creativity',.8]},
  performer:     {at:['market'],         label:'street performer', lean:['charisma',.8]},
  artist:        {at:['greatLibrary','statue','clockTower'],label:'artist',lean:['creativity',.7]}
};
export const PERFORMING=['musician','performer','artist'];
/* The culture feedback loop, kept slight and kept positive. A district that has
   become known for something tilts the people living in it a little toward
   the work that made it so - an entertainment district draws musicians, a farm
   belt draws farmers - as a probability, never a lock, and never toward
   anything a district should not be known for. districts.js reads none of
   this back, so the loop cannot close on itself. */
const CULTURE={entertainment:PERFORMING,nightlife:PERFORMING,agricultural:['farmer','millWorker'],academic:['teacher'],waterfront:['dockWorker']};
const CULTURE_TILT=1.25;
function cultureTilt(home,id){
  const held=districtAt(home.x,home.y)?.identities||[];
  return held.some(h=>CULTURE[h.id]?.includes(id))?CULTURE_TILT:1;
}
export const LOOKING='looking for work';

export const STANDINGS=['struggling','working class','middle class','affluent','elite'];

function ensureSocial(){
  if(!S.social||typeof S.social!=='object') S.social={districts:[],nextId:0,families:[],nextFamilyId:0};
  if(!S.social.firsts||typeof S.social.firsts!=='object') S.social.firsts={};
  return S.social;
}
function houseOf(f){ for(const h of S.ctx?.houses||[]) if((h.seed>>>0)===(f.homeSeed>>>0)) return h; return null; }

/* ---------- the jobs standing within reach of a home ----------
   One pass over the grid per social tick, shared by every family, so the cost
   is O(buildings) once and not O(buildings × people). */
function workplaces(){
  const out=[];
  for(const b of S.grid||[]){
    if(!b||isFacilityPart(b)) continue;
    const def=getBuildingDefinition(b.type);
    if(!def?.jobs) continue;
    out.push({b,type:b.type,jobs:def.jobs,taken:0});
  }
  return out;
}
function reachable(home,places){
  return places.filter(p=>Math.max(Math.abs(p.b.x-home.x),Math.abs(p.b.y-home.y))<=REACH);
}
// Whether the job a person holds still exists within reach. The seat itself is
// theirs already - counted in the pre-pass - so a full workplace does not
// dismiss its own staff.
function still(home,places,career){
  const spec=CAREERS[career]; if(!spec) return false;
  return reachable(home,places).some(p=>spec.at.includes(p.type));
}

/* Weigh every job a person could take from where they live. */
function choose(home,places,traits,education,key){
  const near=reachable(home,places);
  let best=null,bestScore=0;
  for(const [id,spec] of Object.entries(CAREERS)){
    if(spec.edu&&education<spec.edu) continue;
    const open=near.filter(p=>spec.at.includes(p.type)&&p.taken<p.jobs);
    if(!open.length) continue;
    const nearest=Math.min(...open.map(p=>Math.max(Math.abs(p.b.x-home.x),Math.abs(p.b.y-home.y))));
    const [trait,tilt]=spec.lean;
    const lean=1+((traits[trait]??50)-50)/100*tilt;
    // Owning the place wants a real leaning toward it, or it is just a job.
    if(spec.owner&&(traits.entrepreneurship??0)<62) continue;
    const score=(open.reduce((n,p)=>n+p.jobs-p.taken,0))*lean*(1.4-nearest/(REACH*1.6))
      *cultureTilt(home,id)*(0.8+0.4*hash2(key,Object.keys(CAREERS).indexOf(id),S.seed>>>0));
    if(score>bestScore){ bestScore=score; best={id,open}; }
  }
  if(!best) return null;
  // Take a seat at the nearest open workplace, so a school does not employ
  // more teachers than it has posts.
  best.open.sort((a,b)=>Math.max(Math.abs(a.b.x-home.x),Math.abs(a.b.y-home.y))-Math.max(Math.abs(b.b.x-home.x),Math.abs(b.b.y-home.y)));
  best.open[0].taken++;
  return best.id;
}

/* ---------- the pass ---------- */
let clock=0;
export function advanceCareers(dt,note){
  clock+=dt;
  if(clock<SOCIAL_INTERVAL) return;
  clock=0;
  evaluateCareers(note);
}
export function evaluateCareers(note=()=>{}){
  const social=ensureSocial();
  const places=workplaces();
  const slot=Math.floor((S.dayT||0)*8);
  // Seats already held are taken first, so nobody is bumped by a newcomer.
  for(const f of families()){
    const home=houseOf(f); if(!home) continue;
    f.careers=f.careers||{};
    for(const [i,career] of Object.entries(f.careers)){
      const spec=CAREERS[career]; if(!spec) continue;
      const seat=reachable(home,places).find(p=>spec.at.includes(p.type)&&p.taken<p.jobs);
      if(seat) seat.taken++;
    }
  }
  for(const f of families()){
    const home=houseOf(f); if(!home) continue;
    const members=familyMembers(f);
    const education=getEducationLevel(home);
    f.careers=f.careers||{};
    for(const m of members.slice(0,MAX_MEMBERS)){
      const current=f.careers[m.index];
      const key=f.id*97+m.index;
      const roll=hash2((S.day|0)*8+slot,key,S.seed>>>0);
      // Keep what you have while the workplace stands, barring the rare rethink.
      if(current&&current!==LOOKING&&still(home,places,current)&&roll>=RECONSIDER) continue;
      const next=choose(home,places,m.traits,education,key)||LOOKING;
      if(next===current) continue;
      f.careers[m.index]=next;
      if(S.diagnostics) S.diagnostics.careerChanges=(S.diagnostics.careerChanges||0)+1;
      // Districts count who performs in them; a person taking up or leaving
      // that work is a change there. Rare, and rebuilt on the next read.
      if(PERFORMING.includes(next)||PERFORMING.includes(current)) invalidateDistricts();
      if(next!==LOOKING){
        const label=CAREERS[next].label;
        if(!social.firsts[next]){
          // Keyed by who they are, not by how their name prints: matching on
          // the string pulled the surname into every reader of this record.
          social.firsts[next]={day:S.day||1,who:m.name,familyId:f.id,index:m.index};
          note(m.name+' became Meadowline’s first '+label);
          record('career_first',{familyId:f.id,index:m.index,name:m.name,career:next,label,district:f.roots});
          if(S.diagnostics) S.diagnostics.careerFirsts=(S.diagnostics.careerFirsts||0)+1;
        }
      }
    }
    // Standing is read fresh; only a change is worth a line.
    const standing=familyStanding(f);
    if(f.standing&&f.standing!==standing){
      const up=STANDINGS.indexOf(standing)>STANDINGS.indexOf(f.standing);
      note('The '+f.surname+' family '+(up?'rose to':'slipped to')+' '+standing);
      record('standing_change',{familyId:f.id,surname:f.surname,district:f.roots,up,standing});
      if(S.diagnostics) S.diagnostics.standingChanges=(S.diagnostics.standingChanges||0)+1;
    }
    f.standing=standing;
  }
  if(S.diagnostics) S.diagnostics.careerEvaluations=(S.diagnostics.careerEvaluations||0)+1;
}

/* ---------- reading a family ---------- */
export function memberCareer(f,index){
  const c=f?.careers?.[index];
  return !c||c===LOOKING?LOOKING:(CAREERS[c]?.label||LOOKING);
}
/* Standing is a reading of the household, taken whenever it is asked for. It
   is a function of conditions alone: the tier the home has grown to, what the
   household knows, the neighbourhood it stands in, how many of its people are
   in work, and how long it has been here. It does not look at which jobs those
   are. A family of farmers and a family of doctors in the same circumstances
   stand exactly the same. */
export function familyStanding(f){
  const home=houseOf(f); if(!home) return f?.standing||STANDINGS[1];
  const tier=housingTierIndex(home);                           // 1..3
  const edu=getEducationLevel(home)/100;                       // 0..1
  const des=clamp(Number(home.state?.desirability)||0,0,100)/100;
  const people=familyMembers(f).length||1;
  const working=Object.values(f.careers||{}).filter(c=>c&&c!==LOOKING).length/people;
  const rooted=Math.min(1,((f.generation||1)-1)/3);
  const score=(tier-1)/2*0.34+edu*0.22+des*0.22+working*0.16+rooted*0.06;  // 0..1
  return score<0.18?STANDINGS[0]:score<0.38?STANDINGS[1]:score<0.6?STANDINGS[2]:score<0.8?STANDINGS[3]:STANDINGS[4];
}
export function familyTrades(f){
  const counts={};
  for(const c of Object.values(f.careers||{})) if(c&&c!==LOOKING) counts[c]=(counts[c]||0)+1;
  return Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([c])=>CAREERS[c]?.label||c);
}
/* What a family is known for: its trades, once it has any; the district and
   its leanings until then. */
export function knownFor(f){
  const trades=familyTrades(f);
  if(!trades.length) return familyKnownFor(f);
  return trades.length===1?trades[0]+' work':trades.slice(0,2).join(' and ');
}
export function careerSnapshot(){
  let employed=0,looking=0;
  for(const f of families()) for(const c of Object.values(f.careers||{})) (c&&c!==LOOKING)?employed++:looking++;
  const standings={}; for(const f of families()) standings[f.standing||'?']=(standings[f.standing||'?']||0)+1;
  return {employed,looking,firsts:Object.keys(ensureSocial().firsts).length,standings};
}

/* ---------- save ---------- */
export function packCareers(){
  const s=ensureSocial();
  const firsts={};
  for(const [k,v] of Object.entries(s.firsts)) if(CAREERS[k]) firsts[k]={day:Math.max(1,v.day|0),who:String(v.who||'').slice(0,60),familyId:v.familyId|0,index:v.index|0};
  return {firsts};
}
export function restoreCareers(raw){
  const s=ensureSocial(); s.firsts={}; clock=0;
  const f=raw&&typeof raw==='object'&&raw.firsts&&typeof raw.firsts==='object'?raw.firsts:{};
  for(const [k,v] of Object.entries(f)) if(CAREERS[k]&&v&&typeof v==='object') s.firsts[k]={day:Math.max(1,Math.floor(Number(v.day)||1)),who:String(v.who||'').slice(0,60),familyId:Math.max(0,Math.floor(Number(v.familyId)||0)),index:Math.max(0,Math.floor(Number(v.index)||0))};
}
/* The per-family fields ride inside each family record, which families.js
   packs as plain data without knowing what a career is. This sweep, run after
   the families are restored, keeps only careers this build has a workplace
   for and standings from the list - an edited save cannot invent either. */
export function sanitiseFamilyCareers(){
  for(const f of families()){
    const careers={};
    if(f.careers&&typeof f.careers==='object') for(const [i,c] of Object.entries(f.careers)){
      const n=Number(i); if(Number.isInteger(n)&&n>=0&&n<MAX_MEMBERS&&(CAREERS[c]||c===LOOKING)) careers[n]=c;
    }
    f.careers=careers;
    if(!STANDINGS.includes(f.standing)) delete f.standing;
  }
}
