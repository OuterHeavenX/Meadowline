import * as aliasMod from '../src/simulation/aliases.js';
import { ALIAS_INTERVAL, MAX_ALIASES, VISIBILITY, advanceAliases, aliasOf, aliasRank, aliases, displayName,
  evaluateAliases, knownAlias, packAliases, publicName, restoreAliases } from '../src/simulation/aliases.js';
import { SURNAMES, evaluateFamilies, families, familyMembers, packFamilies, restoreFamilies } from '../src/simulation/families.js';
import { evaluateCareers } from '../src/simulation/careers.js';
import { evaluateOrganisations, organisations } from '../src/simulation/organisations.js';
import { evaluateEnforcement } from '../src/simulation/enforcement.js';
import { evaluateFame } from '../src/simulation/fame.js';
import { evaluateDistrictIdentities, invalidateDistricts, recomputeDistricts } from '../src/simulation/districts.js';
import { composeIssue } from '../src/simulation/post.js';
import { ledger, record } from '../src/simulation/ledger.js';
import { place } from '../src/buildings/buildings.js';
import { S } from '../src/core/state.js';
import { resetProgression } from '../src/progression/city-growth.js';
import { recompute } from '../src/simulation/mood.js';
import { genWorld } from '../src/world/map.js';
import { idx } from '../src/world/tiles.js';
import { describe } from '../src/ui/panels.js';

const checks=[];
const check=(name,value,detail)=>checks.push({name,pass:Boolean(value),...(detail===undefined?{}:{detail})});
const notes=[]; const note=t=>notes.push(t);
const prose=i=>[i.lead.headline,i.lead.body,...i.sections.flatMap(s=>s.items.flatMap(x=>[x.headline,x.body])),...i.readers.map(r=>r.text),...i.whispers.map(w=>w.text)].join('\n');
const has=(text,s)=>text.toLowerCase().includes(String(s).toLowerCase());

function town(seed=20260907,opts={}){
  genWorld(seed); resetProgression('legacy-open'); S.cityProgress.stage=4; S.coins=9e6;
  S.citizens=[]; S.incidents=[]; S.serviceVehicles=[]; notes.length=0; S.day=1;
  S.social={districts:[],nextId:0,families:[],nextFamilyId:0,firsts:{},organisations:[],nextOrgId:0,orgMemory:{},fame:[],aliases:[]};
  S.post={issue:null,archive:[],lastIssueDay:0,unread:false};
  for(let y=30;y<62;y++) for(let x=30;x<80;x++){ const i=idx(x,y); S.terr[i]=0; S.natTree[i]=0; S.grid[i]=null; }
  for(let x=39;x<70;x++) place('road',x,42);
  for(let x=40;x<70;x++){ if(place('house',x,41)){ const h=S.grid[idx(x,41)]; h.pop=5; h.mood=60; h.state.housingTier=1; h.state.desirability=30; h.state.education=30; } }
  /* A calm town is one where none of the conditions an organisation needs can
     line up: work for everyone, a station in the middle of the street, a green
     within reach, and no trade edge to be worth anything. */
  if(!opts.calm) for(const [t,x] of [['cafe',44],['bakery',48],['cafe',52],['market',60],['cafe',64]]) place(t,x,43);
  if(opts.calm){
    place('policeStation',52,44); place('picnicGreen',56,44);
    for(const h of S.ctx.houses||[]) h.state.recreationSatisfaction=90;
  }
  if(opts.farms) for(const y of [45,49]) for(let x=40;x<=68;x+=4) place('farm',x,y);
  if(opts.police) place('policeStation',66,36);
  if(opts.crime) S.incidents=[{id:1,kind:'crime',resolved:false,target:{x:50,y:41},age:0,status:'REPORTED'}];
  S.ledger=[];
  recompute(); invalidateDistricts(); evaluateDistrictIdentities();
}
function days(n,{police=false}={}){
  for(let d=0;d<n;d++){ S.day=(S.day||1)+1;
    for(let s=0;s<8;s++){ S.dayT=s/8+0.01; evaluateFamilies(note); evaluateCareers(note);
      if(s%3===0){ evaluateOrganisations(note); if(police) evaluateEnforcement(note); }
      if(s%2===0) evaluateFame(note);
      if(s===0) evaluateAliases(note); } }
}
const everyone=()=>families().flatMap(f=>familyMembers(f).map(m=>({f,m})));

/* ---------- nobody hands out a name ---------- */
{
  const bad=/^(set|assign|make|create|force|declare|promote|give|rename|name|coin)/i;
  const setters=Object.keys(aliasMod).filter(k=>bad.test(k));
  check('the alias module exports no way to give anyone a nickname',setters.length===0,setters.join(',')||'none');
  check('the ladder is the five states, in order',VISIBILITY.join()==='private,associates,district,police,public');
  // The whole file, not one function: no branch anywhere may read a surname.
  const src=[...Object.values(aliasMod)].filter(v=>typeof v==='function').map(String).join('\n');
  check('nothing in the module reads a surname to build a name',!/\bsurname\b/i.test(src.replace(/f\.surname/g,'CANONICAL')),(src.match(/surname/gi)||[]).length);
}

/* ---------- a name is earned, and takes a while ---------- */
{
  town(); days(3);
  check('a brand new valley has nobody with a nickname',aliases().length===0,aliases().length);
  town(20260907,{farms:true}); days(120);
  check('given time and something to be, names appear',aliases().length>=1,aliases().length);
  check('and never more than the cap',aliases().length<=MAX_ALIASES);
  check('every alias belongs to somebody who exists',aliases().every(a=>{
    const f=families().find(x=>x.id===a.familyId); return f&&familyMembers(f).some(m=>m.index===a.index); }));
  check('nobody has two of them',new Set(aliases().map(a=>a.familyId+':'+a.index)).size===aliases().length);
  check('no two people answer to the same name',new Set(aliases().map(a=>a.alias)).size===aliases().length);
  check('every origin is one the simulation can account for',aliases().every(a=>['career','place','reputation','habit','event'].includes(a.origin)),JSON.stringify(aliases().map(a=>a.origin)));
}

/* ---------- the canonical person is untouched ---------- */
{
  town(20260907,{farms:true}); days(120);
  const a=aliases()[0];
  const f=families().find(x=>x.id===a.familyId), m=familyMembers(f).find(x=>x.index===a.index);
  check('there is somebody with a name to show',!!a&&!!m,a?.alias);
  check('their canonical name is unchanged and still first plus surname',m.name===m.first+' '+f.surname,m.name);
  check('the family still owns them at the same index',familyMembers(f).filter(x=>x.index===a.index).length===1);
  check('the display form inserts the alias and keeps both real names',(()=>{
    const shown=displayName(f,a.index,{atLeast:a.visibility});
    return shown.includes(m.first)&&shown.includes(f.surname)&&shown.includes(a.alias); })(),displayName(f,a.index,{atLeast:a.visibility}));
  check('and a person with no alias is shown plainly',(()=>{
    const plain=everyone().find(({f:ff,m:mm})=>!aliasOf(ff.id,mm.index));
    return !plain||displayName(plain.f,plain.m.index)===plain.m.name; })());
}

/* ---------- a name comes from history, never from a surname ---------- */
{
  // Same seed, same person, but a different pool position for the surname:
  // the alias must not move. Surnames are re-dealt by renaming the family.
  /* Both maps are coined from the SAME instant of the same world - clear,
     evaluate, read; rotate every surname; clear, evaluate, read. Comparing
     names grown over 120 days against names coined all at once would differ
     for reasons that have nothing to do with surnames, which is what this
     check first did and why it failed while the code was right. */
  town(20260907,{farms:true}); days(120);
  const coinNow=()=>{ S.social.aliases=[]; evaluateAliases(note);
    return aliases().map(a=>a.familyId+':'+a.index+'='+a.alias).sort().join('|'); };
  const beforeMap=coinNow();
  const surnamesBefore=families().map(f=>f.surname);
  for(const f of families()) f.surname=SURNAMES[(SURNAMES.indexOf(f.surname)+7)%SURNAMES.length];
  const afterMap=coinNow();
  check('fixture: the surnames really did change',families().map(f=>f.surname).join()!==surnamesBefore.join());
  check('changing every surname changes nobody\'s nickname',beforeMap===afterMap,beforeMap.slice(0,120)+' vs '+afterMap.slice(0,120));
  // And across seeded towns, the surnames carrying a nickname look like the pool.
  const carrying={}; let total=0;
  for(const seed of [11,23,37,41,59,67]){ town(seed,{farms:true}); days(120);
    for(const a of aliases()){ const f=families().find(x=>x.id===a.familyId); if(f){ carrying[f.surname]=(carrying[f.surname]||0)+1; total++; } } }
  const counts=Object.values(carrying);
  check('nicknames were earned across the seeded towns',total>=6,total);
  check('and no surname carries a disproportionate share of them',(counts.length?Math.max(...counts):0)<=Math.max(2,Math.ceil(total*0.35)),JSON.stringify(carrying));
  check('every one of those surnames is a pool name like any other',Object.keys(carrying).every(n=>SURNAMES.includes(n)));
}

/* ---------- it belongs to everyone, not only to criminals ---------- */
{
  town(20260907,{farms:true}); days(140);
  /* The point is not that the town is spotless - it is that people with no
     connection to anything criminal get names too, which is what stops the
     whole system reading as a mark of guilt. */
  const clean=aliases().filter(a=>!organisations().some(o=>o.families.includes(a.familyId)));
  check('people with no connection to any organisation have nicknames too',clean.length>=1,
    clean.length+' of '+aliases().length+' (orgs: '+organisations().length+')');
  /* And a town where nothing criminal can take hold at all - work for
     everyone, police on the corner - still names its people. Without this the
     whole system could quietly become a mark of guilt and the suite would not
     notice, because every other scene here has an organisation somewhere in it. */
  town(20260907,{farms:true,calm:true}); recompute(); invalidateDistricts(); days(140,{police:true});
  check('fixture: nothing criminal ever took hold here',organisations().length===0,organisations().length);
  check('and the valley still gave people names',aliases().length>=1,aliases().length);
  check('drawn from ordinary working life',aliases().every(a=>['career','place','reputation','habit','event'].includes(a.origin)),
    JSON.stringify(aliases().map(a=>a.alias+' ('+a.origin+')')));
  const origins=new Set(aliases().map(a=>a.origin));
  check('and they come from ordinary life',[...origins].every(o=>['career','place','reputation','habit','event'].includes(o)),[...origins].join());
}

/* ---------- how far it has travelled, and never backwards ---------- */
{
  town(20260907,{crime:true}); days(200);
  const inOrg=aliases().find(a=>{ const f=families().find(x=>x.id===a.familyId); return f&&organisations().some(o=>o.families.includes(f.id)); });
  check('somebody drawn into a group has a name that reached at least their associates',!inOrg||aliasRank(inOrg)>=1,inOrg&&inOrg.visibility);
  // Rank never falls, whatever happens next.
  const before=aliases().map(a=>({k:a.familyId+':'+a.index,r:aliasRank(a)}));
  days(60);
  const fell=before.find(b=>{ const now=aliases().find(a=>a.familyId+':'+a.index===b.k); return now&&aliasRank(now)<b.r; });
  check('a name that has travelled never travels back',!fell,JSON.stringify(fell));
  /* Waiting for the world to take a reason away is waiting on dice, so it is
     taken away by hand: strip every reason a name could have travelled for and
     evaluate again. A name that has got out cannot be called back. */
  const risen=aliases().find(a=>aliasRank(a)>=1);
  check('fixture: somebody whose name got out',!!risen,risen&&risen.visibility);
  if(risen){
    const was=risen.visibility, wasReason=risen.reason;
    S.social.fame=[]; S.social.organisations=[]; S.social.firsts={};
    evaluateAliases(note);
    const now=aliasOf(risen.familyId,risen.index);
    check('with every reason gone, the name is still as far along as it got',now&&now.visibility===was,
      JSON.stringify([was,now&&now.visibility]));
    check('and it still remembers why it travelled',now&&now.reason===wasReason,now&&now.reason);
  }
  /* Read against the high-water mark, not against today: a name goes public
     because somebody was widely known at the time, and stays public after the
     fame fades. Checking current renown would call that unjustified. */
  /* The reason is written down when the name travels, not inferred afterwards.
     Fame fades and groups break up, so by now the evidence for a name that
     went public a season ago may be gone entirely - which is exactly why the
     record has to carry it. */
  const travelled=aliases().filter(a=>a.visibility!=='private');
  check('every name that travelled says why it did',travelled.length>=1&&travelled.every(a=>a.reason&&a.reason.length>3),
    JSON.stringify(travelled.map(a=>a.visibility+':'+a.reason)));
  check('and a public one names a reason the simulation actually has',
    aliases().filter(a=>a.visibility==='public').every(a=>['widely known','their group was exposed'].includes(a.reason)),
    JSON.stringify(aliases().filter(a=>a.visibility==='public').map(a=>a.reason)));
}

/* ---------- the paper is the last to know ---------- */
{
  town(20260907,{crime:true}); days(200);
  const secret=aliases().filter(a=>a.visibility!=='public');
  check('there are names the street uses that are not public yet',secret.length>=1,JSON.stringify(aliases().map(a=>a.alias+':'+a.visibility)));
  // Compose an issue on a day carrying every kind of person-naming story.
  const day=S.day+1; S.day=day; S.ledger=[];
  for(const a of aliases()){
    const f=families().find(x=>x.id===a.familyId), m=familyMembers(f).find(x=>x.index===a.index);
    record('questioned',{orgId:0,district:f.roots,familyId:a.familyId,index:a.index,name:m.name,orgName:'x'});
    record('career_first',{familyId:a.familyId,index:a.index,name:m.name,career:'baker',label:'baker',district:f.roots});
  }
  const text=prose(composeIssue(day));
  const leaked=secret.find(a=>has(text,a.alias));
  check('the paper prints no nickname the public does not have',!leaked,leaked&&leaked.alias+' at '+leaked.visibility);
  check('but it does print the people, by their real names',aliases().every(a=>{
    const f=families().find(x=>x.id===a.familyId), m=familyMembers(f).find(x=>x.index===a.index);
    return has(text,m.name)||has(text,m.first); }));
  // The player's own card may know sooner. That difference is the design.
  const one=secret[0]; const f=families().find(x=>x.id===one.familyId);
  const home=S.ctx.houses.find(h=>(h.seed>>>0)===(f.homeSeed>>>0));
  if(home){
    const card=describe(home.x,home.y);
    check('the Look card shows a name the paper may not print',has(card,one.alias),one.alias);
    check('and says how far it has actually travelled',/only at home|among associates|around the neighbourhood|known to the police|known all over/.test(card));
  }
  check('publicName withholds it and displayName at that reach does not',
    publicName(f,one.index)===familyMembers(f).find(m=>m.index===one.index).name&&displayName(f,one.index,{atLeast:one.visibility}).includes(one.alias));
  check('knownAlias returns nothing until it is public',knownAlias(f,one.index)===null);
}

/* ---------- once it is public, the paper may use it ---------- */
{
  town(20260907,{crime:true}); days(200);
  const a=aliases()[0];
  check('fixture: somebody with a name',!!a,a?.alias);
  a.visibility='public';
  const f=families().find(x=>x.id===a.familyId), m=familyMembers(f).find(x=>x.index===a.index);
  const day=S.day+1; S.day=day; S.ledger=[];
  record('questioned',{orgId:0,district:f.roots,familyId:a.familyId,index:a.index,name:m.name,orgName:'x'});
  const issue=composeIssue(day), text=prose(issue);
  check('a public nickname reaches print',has(text,a.alias),text.slice(0,200));
  check('alongside the canonical name, never instead of it',has(text,m.name),text.slice(0,200));
  check('and the headline is the name the street uses',has(issue.lead.headline,a.alias)||issue.sections.some(s=>s.items.some(i=>has(i.headline,a.alias))));
  // The surfacing story itself.
  S.ledger=[]; record('nickname_public',{familyId:a.familyId,index:a.index,name:m.name,alias:a.alias,origin:a.origin,district:f.roots});
  const surfaced=prose(composeIssue(day));
  check('a name surfacing is a story that explains where it came from',has(surfaced,a.alias)&&/it comes from/.test(surfaced),surfaced.slice(0,200));
  check('and it is not presented as anything criminal',!/\bmafia\b|\bmob\b|crime family|syndicate|\bboss\b/i.test(surfaced));
}

/* ---------- it is not per frame ---------- */
{
  town(); S.diagnostics.aliasEvaluations=0;
  for(let i=0;i<20;i++) advanceAliases(ALIAS_INTERVAL/40);
  check('small steps below the interval do not evaluate',S.diagnostics.aliasEvaluations===0);
  advanceAliases(ALIAS_INTERVAL);
  check('crossing the interval evaluates exactly once',S.diagnostics.aliasEvaluations===1);
}

/* ---------- save ---------- */
{
  town(20260907,{farms:true}); days(120);
  const before=JSON.stringify(aliases());
  check('fixture: there is something to save',aliases().length>=1);
  const social={...JSON.parse(JSON.stringify(packFamilies())),...JSON.parse(JSON.stringify(packAliases()))};
  restoreFamilies(social); restoreAliases(social);
  check('nicknames survive save and load exactly',JSON.stringify(aliases())===before,JSON.stringify(aliases()).slice(0,160));
  restoreAliases(undefined);
  check('an old save with none loads with none, and no error',aliases().length===0);
  const realId=families()[0]?.id;
  restoreAliases({aliases:[
    {familyId:99999,index:0,alias:'Ghost',origin:'career',since:1,visibility:'public'},
    {familyId:realId,index:99,alias:'Nobody',origin:'career',since:1,visibility:'public'},
    {familyId:realId,index:0,alias:'Ropes',origin:'career',since:1,visibility:'nonsense'},
    {familyId:realId,index:1,alias:'Ropes',origin:'career',since:1,visibility:'public'}]});
  check('a nickname for a family that does not exist is refused',!aliases().some(a=>a.alias==='Ghost'));
  check('a seat past the member cap is refused',!aliases().some(a=>a.alias==='Nobody'));
  check('a visibility off the ladder falls back to private',aliases().find(a=>a.index===0)?.visibility==='private');
  check('and the same name twice is taken only once',aliases().filter(a=>a.alias==='Ropes').length===1);
}

const failed=checks.filter(c=>!c.pass);
document.getElementById('results').textContent=JSON.stringify({pass:!failed.length,checks},null,2);
document.documentElement.dataset.result=failed.length?'fail':'pass';
