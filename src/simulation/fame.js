import { hash2 } from '../core/constants.js';
import { S } from '../core/state.js';
import { activeFestival } from '../world/festivals.js';
import { emitFeedback } from './feedback.js';
import { CAREERS, PERFORMING } from './careers.js';
import { MAX_MEMBERS, SOCIAL_INTERVAL, families, familyMembers } from './families.js';
import { invalidateDistricts } from './districts.js';
import { record } from './ledger.js';

/* ============================================================
   FAME — the names the valley knows for the right reasons

   The same fabric that grows a crew nobody built grows a musician everybody
   has heard of, and by the same rules: nothing here is a button, and nothing
   here is a verdict. Fame accrues to a person who performs - a musician at a
   café, a street performer at a market, an artist at a landmark, which are
   real careers at real buildings from careers.js - in proportion to their
   talent (creativity and charisma, the person's own leanings), the crowd the
   venue actually draws (homes within reach of it), and the occasion (a
   festival day is worth three ordinary ones). It fades when they stop.

   What fame does not read: the household's desirability, its tier, its
   standing, its education, its surname, or anything about organisations. An
   affluent district does not manufacture celebrities; a café street with
   someone playing in it does. The regression checks the source of the gain
   function for those words and runs the rich, quiet town to prove nothing
   happens there.

   Renown is a number 0..3 and the valley's words for it are a ladder:
   getting known, locally famous, known across the valley. It is stored on its
   own list, bounded, and validated on load like everything else here.
   ============================================================ */

export const STAGES=['','getting known','locally famous','known across the valley'];
export const MAX_FAME=8;
export const FAME_INTERVAL=SOCIAL_INTERVAL*2;
// How far a venue draws a crowd from, in tiles.
const CROWD_REACH=6;
// How far a person will go to their venue, careers.js's reach.
const REACH=11;
const GAIN=0.012, DECAY=0.03;
const WHAT={musician:'evenings',performer:'shows',artist:'work'};

function ensureSocial(){
  if(!S.social||typeof S.social!=='object') S.social={districts:[],nextId:0,families:[],nextFamilyId:0,firsts:{}};
  if(!Array.isArray(S.social.fame)) S.social.fame=[];
  return S.social;
}
export function fame(){ return ensureSocial().fame; }
function houseOf(f){ for(const h of S.ctx?.houses||[]) if((h.seed>>>0)===(f.homeSeed>>>0)) return h; return null; }
function isPerforming(career){ return PERFORMING.includes(career); }

/* The person's venue: the nearest building of their trade's kind within
   reach of home. A café street has several; the nearest is theirs. */
export function venueOf(f,index){
  const career=f?.careers?.[index]; if(!isPerforming(career)) return null;
  const home=houseOf(f); if(!home) return null;
  let best=null,bestD=REACH+1;
  const lists=[S.ctx?.cafes,S.ctx?.markets,S.ctx?.wonders];
  for(const list of lists) for(const b of list||[]){
    if(!CAREERS[career].at.includes(b.type)) continue;
    const d=Math.max(Math.abs(b.x-home.x),Math.abs(b.y-home.y));
    if(d<bestD){ bestD=d; best=b; }
  }
  return best;
}
function crowd(venue){
  let n=0;
  for(const h of S.ctx?.houses||[]) if((h.pop|0)>0&&Math.max(Math.abs(h.x-venue.x),Math.abs(h.y-venue.y))<=CROWD_REACH) n++;
  return Math.min(1,n/10);
}
/* What a pass adds to a performer's renown. Talent, crowd and occasion; the
   whole input, and the regression reads the source to keep it so. */
export function gain(traits,crowdShare,festival){
  const talent=((traits.creativity??50)+(traits.charisma??50))/200;
  return GAIN*talent*crowdShare*(festival?3:1);
}

let clock=0;
export function advanceFame(dt,note){
  clock+=dt;
  if(clock<FAME_INTERVAL) return;
  clock=0;
  evaluateFame(note);
}
export function evaluateFame(note=()=>{}){
  const social=ensureSocial();
  const list=social.fame;
  const day=S.day||1;
  const fest=activeFestival();
  if(S.diagnostics) S.diagnostics.fameEvaluations=(S.diagnostics.fameEvaluations||0)+1;
  const seen=new Set();
  // Everyone performing gains; a record is opened the first time it matters.
  for(const f of families()){
    for(const [i,career] of Object.entries(f.careers||{})){
      const index=Number(i); if(!isPerforming(career)) continue;
      const venue=venueOf(f,index); if(!venue) continue;
      const m=familyMembers(f).find(x=>x.index===index); if(!m) continue;
      let r=list.find(x=>x.familyId===f.id&&x.index===index);
      if(!r){ if(list.length>=MAX_FAME) continue; r={familyId:f.id,index,renown:0,career,since:day,peak:0}; list.push(r); }
      r.career=career; seen.add(r);
      const before=Math.floor(r.renown);
      r.renown=Math.min(3,r.renown+gain(m.traits,crowd(venue),!!fest));
      r.peak=Math.max(r.peak,r.renown);
      const after=Math.floor(r.renown);
      if(after>before){
        if(S.diagnostics) S.diagnostics.renownRises=(S.diagnostics.renownRises||0)+1;
        if(after===2) invalidateDistricts(); // the district now has a celebrity
        const label=CAREERS[career].label;
        record('renown_rise',{familyId:f.id,index,name:m.name,label,district:f.roots,stage:after,first:after===3&&!social.fameFirst});
        if(after===1) note(m.name+' is getting known around '+(f.roots||'Meadowline')+' as a '+label);
        else if(after===2) note('Local '+label+' '+m.name+' became locally famous');
        else if(!social.fameFirst){ social.fameFirst={day,who:m.name}; note('Local '+label+' '+m.name+' became Meadowline’s first widely known performer'); }
        else note('Local '+label+' '+m.name+' became known across the valley');
      }
      // A festival is an occasion: a full house, once, and a note of music.
      if(fest&&r.renown>=2&&r.lastFestival!==day){
        r.lastFestival=day;
        note(m.name+' played to a full house at '+fest.name);
        record('full_house',{familyId:f.id,index,name:m.name,label:CAREERS[career].label,festival:fest.name,district:f.roots});
        emitFeedback(venue.x,venue.y,'service','♪');
      }
    }
  }
  // Everyone else fades. Below the first rung the valley stops talking.
  for(let i=list.length-1;i>=0;i--){
    const r=list[i]; if(seen.has(r)) continue;
    const before=Math.floor(r.renown);
    r.renown=Math.max(0,r.renown-DECAY);
    const after=Math.floor(r.renown);
    if(after<before){
      if(S.diagnostics) S.diagnostics.renownFalls=(S.diagnostics.renownFalls||0)+1;
      if(after===1) invalidateDistricts(); // and now it does not
      const f=families().find(x=>x.id===r.familyId), m=f&&familyMembers(f).find(x=>x.index===r.index);
      if(m&&after===0){ note(m.name+' faded from view'); record('renown_faded',{familyId:f.id,index:r.index,name:m.name,district:f.roots}); }
      else if(m&&after===2) note(m.name+' slipped out of the limelight');
    }
    if(r.renown<=0) list.splice(i,1);
  }
}

/* ---------- reading ---------- */
export function fameOf(f,index){ return fame().find(r=>r.familyId===f?.id&&r.index===index)||null; }
export function fameWord(f,index){ const r=fameOf(f,index); return r?STAGES[Math.floor(r.renown)]||'':''; }
export function celebrities(){
  const out=[];
  for(const r of fame()){
    if(r.renown<2) continue;
    const f=families().find(x=>x.id===r.familyId); if(!f) continue;
    const m=familyMembers(f).find(x=>x.index===r.index); if(!m) continue;
    out.push({name:m.name,first:m.first,label:CAREERS[r.career]?.label||r.career,roots:f.roots,renown:r.renown,word:STAGES[Math.floor(r.renown)],since:r.since,family:f,index:r.index});
  }
  return out.sort((a,b)=>b.renown-a.renown);
}
export function venueFame(b){
  if(!b) return [];
  return celebrities().filter(c=>venueOf(c.family,c.index)===b).map(c=>({...c,what:WHAT[c.family.careers[c.index]]||'work'}));
}
export function fameSnapshot(){
  let performers=0; for(const f of families()) for(const c of Object.values(f.careers||{})) if(isPerforming(c)) performers++;
  return {performers,tracked:fame().length,celebrities:fame().filter(r=>r.renown>=2).length};
}

/* ---------- save ---------- */
export function packFame(){
  const s=ensureSocial();
  return {
    fameFirst:s.fameFirst?{day:Math.max(1,s.fameFirst.day|0),who:String(s.fameFirst.who||'').slice(0,60)}:null,
    fame:s.fame.slice(0,MAX_FAME).map(r=>({familyId:r.familyId|0,index:r.index|0,renown:Math.max(0,Math.min(3,Number(r.renown)||0)),career:r.career,since:Math.max(1,r.since|0),peak:Math.max(0,Math.min(3,Number(r.peak)||0))}))
  };
}
export function restoreFame(raw){
  const s=ensureSocial(); s.fame=[]; s.fameFirst=null; clock=0;
  if(!raw||typeof raw!=='object') return;
  if(raw.fameFirst&&typeof raw.fameFirst==='object') s.fameFirst={day:Math.max(1,Math.floor(Number(raw.fameFirst.day)||1)),who:String(raw.fameFirst.who||'').slice(0,60)};
  const known=new Set(families().map(f=>f.id));
  for(const r of (Array.isArray(raw.fame)?raw.fame:[]).slice(0,MAX_FAME)){
    if(!r||typeof r!=='object') continue;
    const familyId=Math.floor(Number(r.familyId)||0),index=Math.floor(Number(r.index)||0);
    // A name the valley knows must be a person the valley has, in a trade that performs.
    if(!known.has(familyId)||index<0||index>=MAX_MEMBERS||!isPerforming(r.career)) continue;
    const renown=Math.max(0,Math.min(3,Number(r.renown)||0)); if(renown<=0) continue;
    s.fame.push({familyId,index,renown,career:r.career,since:Math.max(1,Math.floor(Number(r.since)||1)),peak:Math.max(renown,Math.min(3,Number(r.peak)||0))});
  }
  invalidateDistricts();
}
