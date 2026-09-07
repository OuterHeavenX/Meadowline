import { FIRSTS, residents } from '../buildings/houses.js';
import { clamp, hash2 } from '../core/constants.js';
import { S } from '../core/state.js';
import { housingCapacity } from './housing.js';
import { districtAt } from './districts.js';
import { record } from './ledger.js';

/* ============================================================
   FAMILIES — the households the valley comes to know by name

   Meadowline has always had residents, twenty first names dealt out from a
   house's seed. It has never had anyone you could follow: nobody arrived, nobody
   stayed, nobody's children took over the bakery. A city with no one in it
   worth remembering has no history, however many days it has been running.

   A family is a household the valley has come to notice. Which households, and
   when, is decided by seeded probability weighted by the real condition of the
   home - how long it has stood, how full it is, how it is doing - and never by
   the player. There is no button that makes a family notable, and there is no
   way to give one a name.

   The rules that matter most are about names, because of the milestone's
   PART 27 and the contradiction with its own worked examples that
   docs/SOCIAL_FABRIC.md records. Every family draws its surname from ONE
   shared pool, and the draw takes nothing but the world seed and the founding
   order. It happens when the family is founded, which is before it has a
   trade, a class, a fortune or any involvement in anything at all. A surname
   therefore cannot carry information about an outcome that did not exist when
   it was drawn - and the regression asserts the draw's inputs stay that way.
   ============================================================ */

// Bounded, per the milestone's performance rules. Tens, not thousands.
export const MAX_FAMILIES=12;
export const MAX_MEMBERS=5;
// How often the valley looks around, in simulated seconds. Not per frame.
export const SOCIAL_INTERVAL=12;
// A generation is a long stretch of days; a family that stays that long has
// someone new to talk about.
const GENERATION_DAYS=45;
const MAX_NOTES=6;

/* One pool for everyone. Culturally mixed on purpose, and drawn uniformly, so
   no name means anything about what a family goes on to become. A farming
   family, a wealthy one and, in a later slice, a criminal one are all named
   from here in exactly the same way. */
export const SURNAMES=['Bennett','Okafor','Lindqvist','Moreau','Tanaka','Alvarez','Nakamura','Whitfield',
  'Osei','Kowalski','Haddad','Brennan','Castellano','Nguyen','Abernathy','Ferreira','Sato','Petrov',
  'Delgado','Achebe','Marsh','Holloway','Iversen','Rahman','Kimura','Vance','Oyelaran','Dubois',
  'Reyes','Fairweather','Adeyemi','Novak','Hartley','Mendes','Sandoval','Ellery','Baptiste','Quinlan',
  'Thorne','Larkin'];

/* The draw. Its whole input is the world seed and how many families came
   before - nothing about the house, the district, the household or anything
   that could later be an outcome. Exported so the regression can check that
   this function is pure and outcome-blind, not just that it is documented. */
export function familySurname(seed,foundingIndex,taken=new Set()){
  const start=Math.floor(hash2(foundingIndex|0,7919,seed>>>0)*SURNAMES.length)%SURNAMES.length;
  // Two Quinlans in a twelve-family town is a hash collision, not a dynasty.
  // Step to the first name not already in use; the set of names in use is not
  // an outcome, so the draw stays blind to what any family became.
  for(let i=0;i<SURNAMES.length;i++){ const n=SURNAMES[(start+i)%SURNAMES.length]; if(!taken.has(n)) return n; }
  return SURNAMES[start];
}

/* ---------- traits ----------
   Ten leanings on a 0-100 scale, dealt from the family and the member's place
   in it. They shift probabilities in later slices; nothing here or anywhere
   reads one as a verdict. The words are for the Look card, and they are kept
   plain: "steady", not "disciplined", "bold", not "reckless". */
export const TRAITS=[
  ['ambition','ambitious'],['charisma','charismatic'],['discipline','steady'],['riskTolerance','bold'],
  ['sociability','sociable'],['entrepreneurship','enterprising'],['leadership','a natural leader'],
  ['creativity','creative'],['compassion','kind'],['caution','careful']
];
export function memberTraits(familyId,memberIndex){
  const out={};
  TRAITS.forEach(([key],i)=>{ out[key]=Math.round(hash2(familyId*31+memberIndex,i*977,S.seed>>>0)*100); });
  return out;
}
export function traitWords(traits,count=2){
  return Object.entries(traits).sort((a,b)=>b[1]-a[1]).slice(0,count)
    .map(([key])=>TRAITS.find(t=>t[0]===key)?.[1]||key);
}

function ensureSocial(){
  if(!S.social||typeof S.social!=='object') S.social={districts:[],nextId:0};
  if(!Array.isArray(S.social.families)) S.social.families=[];
  if(!Number.isFinite(S.social.nextFamilyId)) S.social.nextFamilyId=0;
  return S.social;
}
export function families(){ return ensureSocial().families; }

// A family follows its house by the house's seed, which the Move tool keeps,
// rather than by its coordinates, which it does not.
function houseBySeed(seed){
  for(const h of S.ctx?.houses||[]) if((h.seed>>>0)===(seed>>>0)) return h;
  return null;
}
export function familyAt(h){
  if(!h) return null;
  const seed=h.seed>>>0;
  return families().find(f=>(f.homeSeed>>>0)===seed)||null;
}

/* ---------- what a family is, for anyone looking ----------
   Everything below is derived. The record holds only who they are, where they
   settled and when; the people, their leanings and what they are known for are
   worked out from that and the city as it stands. */
export function familyMembers(f){
  const h=houseBySeed(f.homeSeed);
  const firsts=h?residents(h).slice(0,MAX_MEMBERS):[];
  // A family that has been here for generations has a name or two its founders
  // did not: each generation deals one more from the same house seed.
  for(let g=1;g<(f.generation||1)&&firsts.length<MAX_MEMBERS;g++){
    const n=FIRSTS[Math.floor(hash2(f.homeSeed>>>0,g*53,S.seed>>>0)*FIRSTS.length)];
    if(!firsts.includes(n)) firsts.push(n);
  }
  return firsts.map((first,i)=>({name:first+' '+f.surname,first,traits:memberTraits(f.id,i),index:i}));
}
export function familyKnownFor(f){
  const h=houseBySeed(f.homeSeed);
  const d=h?districtAt(h.x,h.y):null;
  const place=d?.identities?.[0]?.label;
  const lead=familyMembers(f)[0];
  const lean=lead?traitWords(lead.traits,1)[0]:null;
  const parts=[];
  if(place) parts.push(place.toLowerCase()+' life');
  if(lean) parts.push('being '+lean);
  return parts.length?parts.join(' and '):'settling in';
}

/* Something the valley says about a family, from another system. A remark on
   the record, never an outcome: nothing about the family changes but its
   notes, which is why this and not a setter is what is exported. */
export function familyNote(f,text){ if(f) addNote(f,String(text).slice(0,80)); }
function addNote(f,text){
  f.notes=f.notes||[];
  f.notes.unshift({day:S.day,text});
  if(f.notes.length>MAX_NOTES) f.notes.length=MAX_NOTES;
}

/* ---------- the slow look around ----------
   Every SOCIAL_INTERVAL simulated seconds, not every frame. Each pass does
   three things: notices families that have left, marks a generation passing,
   and considers whether any household has become one the valley knows. */
let clock=0;
export function advanceFamilies(dt,note){
  clock+=dt;
  if(clock<SOCIAL_INTERVAL) return;
  clock=0;
  evaluateFamilies(note);
}

export function evaluateFamilies(note=()=>{}){
  const social=ensureSocial();
  const list=social.families;
  if(S.diagnostics) S.diagnostics.socialEvaluations=(S.diagnostics.socialEvaluations||0)+1;

  // Families whose home is gone have left. Remembered, then let go.
  for(let i=list.length-1;i>=0;i--){
    const f=list[i];
    if(houseBySeed(f.homeSeed)) continue;
    note('The '+f.surname+' family left Meadowline');
    // This loop is only reached when the home is gone, so that is the reason.
    record('family_departure',{familyId:f.id,surname:f.surname,district:f.roots,days:(S.day||1)-(f.founded||1),reason:'home gone'});
    list.splice(i,1);
    if(S.diagnostics) S.diagnostics.familyDepartures=(S.diagnostics.familyDepartures||0)+1;
  }
  // Long residence brings a new generation.
  for(const f of list){
    const due=1+Math.floor(Math.max(0,(S.day||1)-f.founded)/GENERATION_DAYS);
    if(due>(f.generation||1)){
      f.generation=due;
      addNote(f,'A new generation of the family');
      record('generation_change',{familyId:f.id,surname:f.surname,district:f.roots,generation:f.generation});
      note('A new generation of the '+f.surname+' family in '+(f.roots||'Meadowline'));
      if(S.diagnostics) S.diagnostics.generationChanges=(S.diagnostics.generationChanges||0)+1;
    }
  }
  if(list.length>=MAX_FAMILIES) return;

  /* Who gets noticed. The roll is seeded from game time and the house, so the
     same city on the same day makes the same choice, and it is weighted by the
     real condition of the household. A full, settled, contented home is the
     likeliest; a home that has simply been here a long time is next, however
     it is doing - a valley notices its stalwarts, not only its successes. A
     household not yet on a street is not noticed at all. */
  const slot=Math.floor((S.dayT||0)*8);
  const claimed=new Set(list.map(f=>f.homeSeed>>>0));
  const candidates=(S.ctx?.houses||[]).filter(h=>(h.pop|0)>0&&h.linked&&!claimed.has(h.seed>>>0));
  for(const h of candidates){
    if(list.length>=MAX_FAMILIES) break;
    const cap=housingCapacity(h)||1;
    const full=(h.pop|0)/cap;
    const tier=Math.max(1,Math.min(3,Math.floor(Number(h.state?.housingTier)||1)));
    const weight=clamp(0.35+full*0.9+(tier-1)*0.35+((Number(h.mood)||0)-50)/120,0.2,2.6);
    const roll=hash2((S.day|0)*8+slot,h.seed>>>0,S.seed>>>0);
    if(roll>=0.0006*weight) continue;
    found(h,note);
  }
}

function found(h,note){
  const social=ensureSocial();
  const id=++social.nextFamilyId;
  // The one place a surname is decided. Nothing about h reaches it.
  const surname=familySurname(S.seed,id,new Set(social.families.map(f=>f.surname)));
  const d=districtAt(h.x,h.y);
  const f={id,surname,homeSeed:h.seed>>>0,founded:S.day||1,generation:1,roots:d?.name||null,notes:[]};
  addNote(f,'Settled in '+(f.roots||'Meadowline'));
  record('family_arrival',{familyId:f.id,surname:f.surname,district:f.roots});
  social.families.push(f);
  note('The '+surname+' family settled in '+(f.roots||'Meadowline'));
  if(S.diagnostics) S.diagnostics.familyFoundings=(S.diagnostics.familyFoundings||0)+1;
  return f;
}

export function familySnapshot(){
  const list=families();
  return {families:list.length,members:list.reduce((n,f)=>n+familyMembers(f).length,0),
    generations:list.reduce((n,f)=>Math.max(n,f.generation||1),0)};
}

/* ---------- save ----------
   Only who they are and where they settled. Members, traits and what they are
   known for are dealt again from the same seeds on load. */
export function packFamilies(){
  const social=ensureSocial();
  return {
    nextFamilyId:social.nextFamilyId|0,
    families:social.families.slice(0,MAX_FAMILIES).map(f=>({
      id:f.id|0,surname:String(f.surname).slice(0,32),homeSeed:f.homeSeed>>>0,founded:Math.max(1,f.founded|0),
      generation:Math.max(1,f.generation|0),roots:f.roots?String(f.roots).slice(0,40):null,
      notes:(f.notes||[]).slice(0,MAX_NOTES).map(n=>({day:Math.max(1,n.day|0),text:String(n.text).slice(0,80)})),
      // Careers and standing are plain strings here; careers.js validates them
      // after load, so this module need not know what a career is.
      careers:Object.fromEntries(Object.entries(f.careers||{}).slice(0,MAX_MEMBERS).map(([i,c])=>[i,String(c).slice(0,32)])),
      standing:f.standing?String(f.standing).slice(0,24):undefined
    }))
  };
}
export function restoreFamilies(raw){
  const social=ensureSocial();
  social.families=[]; social.nextFamilyId=0; clock=0;
  if(!raw||typeof raw!=='object') return;
  social.nextFamilyId=Math.max(0,Math.floor(Number(raw.nextFamilyId)||0));
  const pool=new Set(SURNAMES);
  for(const f of (Array.isArray(raw.families)?raw.families:[]).slice(0,MAX_FAMILIES)){
    if(!f||typeof f!=='object'||!Number.isFinite(f.homeSeed)) continue;
    // A surname not from the pool is not trusted: an edited save cannot give a
    // family a name this game would never have drawn.
    if(!pool.has(f.surname)) continue;
    social.families.push({
      id:Math.max(0,Math.floor(Number(f.id)||0)),surname:f.surname,homeSeed:Number(f.homeSeed)>>>0,
      founded:Math.max(1,Math.floor(Number(f.founded)||1)),generation:Math.max(1,Math.floor(Number(f.generation)||1)),
      roots:f.roots?String(f.roots).slice(0,40):null,
      notes:(Array.isArray(f.notes)?f.notes:[]).slice(0,MAX_NOTES).filter(n=>n&&typeof n.text==='string')
        .map(n=>({day:Math.max(1,Math.floor(Number(n.day)||1)),text:n.text.slice(0,80)})),
      careers:f.careers&&typeof f.careers==='object'?{...f.careers}:{},
      standing:typeof f.standing==='string'?f.standing:undefined
    });
  }
}
