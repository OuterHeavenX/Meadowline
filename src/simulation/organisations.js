import { hash2 } from '../core/constants.js';
import { S } from '../core/state.js';
import { isFacilityPart } from '../world/tiles.js';
import { districtAt, invalidateDistricts, recomputeDistricts } from './districts.js';
import { SOCIAL_INTERVAL, families, familyMembers } from './families.js';
import { LOOKING } from './careers.js';

/* ============================================================
   ORGANISATIONS — the ones nobody built

   One possible social outcome among many, never a guaranteed one and never a
   player action. Nothing in the Build catalogue produces one; there is no
   district you can paint; there is no button. An organisation appears where a
   COMBINATION of real conditions has held for a while, grows or shrinks in
   stages against those conditions, and goes away when they do.

   The rules that matter are the ones that say what cannot happen:

     - No single factor is ever enough. Formation needs at least three of the
       conditions below at once, and then a seeded roll. A district with
       nothing but unemployment, or nothing but no police, produces nothing,
       however long it waits. The regression runs exactly those towns.
     - Poverty is not an input. Desirability, housing tier, standing and class
       appear nowhere in this file. What appears is OPPORTUNITY: the jobs that
       stand in a district against the people who live in it, which is the
       brief's "low legitimate opportunity" and is a fact about the buildings
       the player chose to build, not about the people.
     - A dock is not a smuggling ring. It is one condition of several, and the
       same one a market or a busy street is.
     - No name means anything. Organisations are named for the PLACE they formed
       around and a plain word for their shape - the Old Wharf Ring, the Lantern
       Row Crew. Never for a person, so a surname can never be read as a signal.
       Which notable families are drawn in depends on their people's leanings
       and whether they have work, never on their name, never on their class;
       the regression sabotages both and checks the suite fails.
     - Momentum is history, not fate. A place that recently had an organisation
       is likelier to grow another; that is one condition of the three, and it
       fades.

   Violence stays abstract. Nothing here dispatches, arrests or fights; that is
   the existing Police simulation's business and slice 5's. This file decides
   only whether a thing exists, how big it is, and what the valley calls it.
   ============================================================ */

export const MAX_ORGANISATIONS=4;
export const MAX_ORG_FAMILIES=4;
// Organisations move slower than people. Three social passes to one of these.
export const ORG_INTERVAL=SOCIAL_INTERVAL*3;
// How long a district remembers an organisation that collapsed there, in days.
const MEMORY_DAYS=60;
// At least this many conditions at once, or nothing happens. Ever.
export const NEED=3;

export const STAGES=['','individual','small group','local crew','organised crew','faction','major organisation'];
export const TYPES={
  streetCrew:      {word:'Crew',     needs:d=>true},
  dockRing:        {word:'Ring',     needs:d=>d.docks>=1},
  protectionRacket:{word:'Outfit',   needs:d=>d.sector.trade>=2},
  nightlifeSet:    {word:'Set',      needs:d=>d.sector.trade>=3&&d.roadTiles>=16},
  blackMarket:     {word:'Network',  needs:d=>d.markets>=1}
};

function ensureSocial(){
  if(!S.social||typeof S.social!=='object') S.social={districts:[],nextId:0,families:[],nextFamilyId:0,firsts:{}};
  if(!Array.isArray(S.social.organisations)) S.social.organisations=[];
  if(!Number.isFinite(S.social.nextOrgId)) S.social.nextOrgId=0;
  if(!S.social.orgMemory||typeof S.social.orgMemory!=='object') S.social.orgMemory={};
  return S.social;
}
export function organisations(){ return ensureSocial().organisations; }
export function organisationsIn(districtName){ return organisations().filter(o=>o.roots===districtName); }
function houseOf(f){ for(const h of S.ctx?.houses||[]) if((h.seed>>>0)===(f.homeSeed>>>0)) return h; return null; }
function familiesIn(d){
  return families().filter(f=>{ const h=houseOf(f); return h&&districtAt(h.x,h.y)?.id===d.id; });
}
function nearestPolice(d){
  let best=Infinity;
  for(const b of S.grid||[]){
    if(!b||isFacilityPart(b)||b.type!=='policeStation') continue;
    const dist=Math.max(Math.abs(b.x-d.cx),Math.abs(b.y-d.cy));
    if(dist<best) best=dist;
  }
  return best;
}

/* ---------- the conditions ----------
   Each is a plain fact about the district the player built. Which of them
   hold, and how many, is the whole of what formation reads. Note what is not
   here: desirability, tier, standing, education, the name of anyone. */
export function conditions(d){
  const m=d.measured||{};
  const social=ensureSocial();
  const remembered=social.orgMemory[d.name];
  const influential=familiesIn(d).some(f=>familyMembers(f).some(p=>p.traits.leadership>=65&&p.traits.riskTolerance>=60));
  return {
    lowOpportunity: m.homes>=6&&m.jobs<m.workers*0.6,
    weakEnforcement: nearestPolice(d)>12,
    poorAccess: m.homes>=6&&m.recreationReach===0,
    profitableEdge: m.docks>=1||m.markets>=1||m.sector?.trade>=3,
    unresolvedCrime: m.unresolvedCrime>=1,
    influentialCitizen: influential,
    momentum: organisationsIn(d.name).length>0||(remembered!=null&&(S.day||1)-remembered<=MEMORY_DAYS),
    dense: m.density>=0.55
  };
}
export function conditionsMet(d){ return Object.values(conditions(d)).filter(Boolean).length; }

/* ---------- who might be drawn in ----------
   A person's leanings, and whether they have work. That is the whole input,
   and it is a function so the regression can prove it: hand it a family's
   people and it answers without ever being told their name or their class. */
export function involvementWeight(people,careers){
  if(!people.length) return 0;
  let w=0;
  for(const p of people){
    const looking=!careers||!careers[p.index]||careers[p.index]===LOOKING;
    w+=(p.traits.riskTolerance/100)*(0.5+p.traits.ambition/200)*(1-p.traits.caution/220)*(looking?1.6:0.6);
  }
  return w/people.length;
}

function nameFor(d,type){
  return d.name+' '+TYPES[type].word;
}
function pickType(d,key){
  const m=d.measured||{};
  const eligible=Object.keys(TYPES).filter(t=>TYPES[t].needs(m));
  return eligible[Math.floor(hash2(key,4441,S.seed>>>0)*eligible.length)%eligible.length]||'streetCrew';
}

/* ---------- the slow pass ---------- */
let clock=0;
export function advanceOrganisations(dt,note){
  clock+=dt;
  if(clock<ORG_INTERVAL) return;
  clock=0;
  evaluateOrganisations(note);
}
export function evaluateOrganisations(note=()=>{}){
  const social=ensureSocial();
  const list=social.organisations;
  const day=S.day||1, slot=Math.floor((S.dayT||0)*8);
  if(S.diagnostics) S.diagnostics.organisationEvaluations=(S.diagnostics.organisationEvaluations||0)+1;
  const districts=recomputeDistricts();
  const byName=new Map(districts.map(d=>[d.name,d]));
  // Districts read organisations as part of what stands in them, so any change
  // here is a change there. Rare, and the rebuild happens on the next read.
  let changed=false;

  // Existing organisations: grow, shrink, or go under, against the conditions
  // in the district they hold.
  for(let i=list.length-1;i>=0;i--){
    const o=list[i]; const d=byName.get(o.roots);
    const met=d?conditionsMet(d):0;
    const roll=hash2(day*8+slot,o.id*131,S.seed>>>0);
    // Legitimate prosperity and enforcement are first-class causes of decline.
    const pressed=!d||met<2||(d&&(nearestPolice(d)<=8||d.measured.jobs>=d.measured.workers*1.1));
    // Growth is slow on purpose: a stage every week or two when the conditions
    // stay met, so a crew takes a season to become a faction. Decline is not
    // slow; enforcement and work should be seen to bite.
    if(met>=NEED+1&&roll<0.04&&o.stage<STAGES.length-1){
      o.stage++; changed=true;
      note('The '+o.name+' grew into a '+STAGES[o.stage]);
      if(S.diagnostics) S.diagnostics.organisationGrowths=(S.diagnostics.organisationGrowths||0)+1;
      recruit(o,d,note);
    } else if(pressed&&roll<0.24){
      o.stage--; changed=true;
      if(o.stage<=0){
        note('The '+o.name+' broke up');
        social.orgMemory[o.roots]=day;
        list.splice(i,1);
        if(S.diagnostics) S.diagnostics.organisationCollapses=(S.diagnostics.organisationCollapses||0)+1;
        continue;
      }
      note('The '+o.name+' lost influence');
      if(S.diagnostics) S.diagnostics.organisationDeclines=(S.diagnostics.organisationDeclines||0)+1;
    }
  }
  if(list.length>=MAX_ORGANISATIONS){ if(changed) invalidateDistricts(); return; }

  // Formation. Three conditions at once, then a seeded roll weighted by how
  // many more than three hold. One per district at a time.
  for(const d of districts){
    if(list.length>=MAX_ORGANISATIONS) break;
    if(organisationsIn(d.name).length) continue;
    const met=conditionsMet(d);
    if(met<NEED) continue;
    const roll=hash2(day*8+slot,d.id*977,S.seed>>>0);
    // Held for a while: at three conditions this is one chance in a few weeks;
    // every further condition held makes it likelier, never certain.
    if(roll>=0.012*(met-NEED+1)) continue;
    const id=++social.nextOrgId;
    const type=pickType(d,id);
    const o={id,type,name:nameFor(d,type),roots:d.name,founded:day,stage:1,families:[]};
    list.push(o); changed=true;
    note('The '+o.name+' first appeared around '+d.name);
    if(S.diagnostics) S.diagnostics.organisationBirths=(S.diagnostics.organisationBirths||0)+1;
    recruit(o,d,note);
  }
  if(changed) invalidateDistricts();
}
function recruit(o,d,note){
  if(!d||o.families.length>=MAX_ORG_FAMILIES) return;
  const taken=new Set(organisations().flatMap(x=>x.families));
  for(const f of familiesIn(d)){
    if(o.families.length>=MAX_ORG_FAMILIES) break;
    if(taken.has(f.id)) continue;
    const w=involvementWeight(familyMembers(f),f.careers);
    const roll=hash2((S.day|0)*8,f.id*53+o.id,S.seed>>>0);
    if(roll<w*0.3){ o.families.push(f.id); taken.add(f.id); }
  }
}

/* ---------- reading ---------- */
export function organisationOf(f){ return organisations().find(o=>o.families.includes(f?.id))||null; }
export function stageWord(o){ return STAGES[o?.stage]||''; }
export function organisationSnapshot(){
  const list=organisations();
  return {organisations:list.length,strongest:list.reduce((n,o)=>Math.max(n,o.stage),0),
    involvedFamilies:list.reduce((n,o)=>n+o.families.length,0)};
}

/* ---------- save ---------- */
export function packOrganisations(){
  const s=ensureSocial();
  const memory={}; for(const [k,v] of Object.entries(s.orgMemory)) if((S.day||1)-v<=MEMORY_DAYS) memory[String(k).slice(0,40)]=Math.max(1,v|0);
  return {
    nextOrgId:s.nextOrgId|0,orgMemory:memory,
    organisations:s.organisations.slice(0,MAX_ORGANISATIONS).map(o=>({
      id:o.id|0,type:o.type,name:String(o.name).slice(0,60),roots:String(o.roots).slice(0,40),
      founded:Math.max(1,o.founded|0),stage:Math.max(1,Math.min(STAGES.length-1,o.stage|0)),
      families:o.families.slice(0,MAX_ORG_FAMILIES).map(x=>x|0)
    }))
  };
}
export function restoreOrganisations(raw){
  const s=ensureSocial(); s.organisations=[]; s.nextOrgId=0; s.orgMemory={}; clock=0;
  if(!raw||typeof raw!=='object') return;
  s.nextOrgId=Math.max(0,Math.floor(Number(raw.nextOrgId)||0));
  if(raw.orgMemory&&typeof raw.orgMemory==='object') for(const [k,v] of Object.entries(raw.orgMemory)) if(Number.isFinite(v)) s.orgMemory[String(k).slice(0,40)]=Math.max(1,Math.floor(v));
  const known=new Set(families().map(f=>f.id));
  for(const o of (Array.isArray(raw.organisations)?raw.organisations:[]).slice(0,MAX_ORGANISATIONS)){
    // A type this build does not know, or a stage off the ladder, is refused.
    if(!o||typeof o!=='object'||!TYPES[o.type]) continue;
    const stage=Math.floor(Number(o.stage)||0); if(stage<1||stage>=STAGES.length) continue;
    s.organisations.push({
      id:Math.max(0,Math.floor(Number(o.id)||0)),type:o.type,name:String(o.name||'').slice(0,60)||'Unknown '+TYPES[o.type].word,
      roots:String(o.roots||'').slice(0,40),founded:Math.max(1,Math.floor(Number(o.founded)||1)),stage,
      families:(Array.isArray(o.families)?o.families:[]).map(x=>Math.floor(Number(x)||0)).filter(x=>known.has(x)).slice(0,MAX_ORG_FAMILIES)
    });
  }
  invalidateDistricts();
}
