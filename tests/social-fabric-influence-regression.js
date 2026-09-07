import * as inf from '../src/simulation/influence.js';
import { HEARD, INFLUENCE_INTERVAL, MAX_PETITIONS, advanceInfluence, evaluateInfluence, influenceOf, isHeard,
  packInfluence, petitionWant, petitions, restoreInfluence, voices, voicesIn } from '../src/simulation/influence.js';
import { evaluateFamilies, families, familyMembers, packFamilies, restoreFamilies } from '../src/simulation/families.js';
import { evaluateCareers } from '../src/simulation/careers.js';
import { evaluateDistrictIdentities, invalidateDistricts, recomputeDistricts } from '../src/simulation/districts.js';
import { composeIssue } from '../src/simulation/post.js';
import { ledger, record } from '../src/simulation/ledger.js';
import { place } from '../src/buildings/buildings.js';
import { S } from '../src/core/state.js';
import { resetProgression } from '../src/progression/city-growth.js';
import { recompute } from '../src/simulation/mood.js';
import { genWorld } from '../src/world/map.js';
import { idx } from '../src/world/tiles.js';
import { renderCityHall } from '../src/ui/city-hall.js';

const checks=[];
const check=(name,value,detail)=>checks.push({name,pass:Boolean(value),...(detail===undefined?{}:{detail})});
const notes=[]; const note=t=>notes.push(t);
const prose=i=>[i.lead.headline,i.lead.body,...i.sections.flatMap(s=>s.items.flatMap(x=>[x.headline,x.body])),...i.readers.map(r=>r.text+' '+r.who)].join('\n');

function town(seed=20260907,opts={}){
  genWorld(seed); resetProgression('legacy-open'); S.cityProgress.stage=4; S.coins=9e6;
  S.citizens=[]; S.incidents=[]; notes.length=0; S.day=1;
  S.social={districts:[],nextId:0,families:[],nextFamilyId:0,firsts:{},organisations:[],nextOrgId:0,orgMemory:{},fame:[],aliases:[],petitions:[]};
  S.post={issue:null,archive:[],lastIssueDay:0,unread:false};
  for(let y=30;y<62;y++) for(let x=30;x<80;x++){ const i=idx(x,y); S.terr[i]=0; S.natTree[i]=0; S.grid[i]=null; }
  for(let x=39;x<70;x++) place('road',x,42);
  for(let x=40;x<70;x++){ if(place('house',x,41)){ const h=S.grid[idx(x,41)]; h.pop=5; h.mood=66;
    h.state.housingTier=opts.tier??1; h.state.desirability=opts.desirability??30; h.state.education=opts.education??40; } }
  if(opts.jobs) for(const y of [45,49]) for(let x=40;x<=68;x+=4) place('farm',x,y);
  if(opts.school) place('school',56,44);
  S.ledger=[];
  recompute(); invalidateDistricts(); evaluateDistrictIdentities();
}
function days(n){
  for(let d=0;d<n;d++){ S.day=(S.day||1)+1;
    for(let s=0;s<8;s++){ S.dayT=s/8+0.01; evaluateFamilies(note); evaluateCareers(note); if(s%3===0) evaluateInfluence(note); } }
}
const district=()=>recomputeDistricts()[0];

/* ---------- the player is not in this ---------- */
{
  const bad=/^(set|assign|make|create|force|declare|promote|grant|elect|vote|appoint|file|raise|dismiss|resolve)/i;
  const setters=Object.keys(inf).filter(k=>bad.test(k));
  check('the influence module exports no way to grant anyone a say',setters.length===0,setters.join(',')||'none');
  check('nor any way to file or dismiss a petition',!Object.keys(inf).some(k=>/petitionFor|addPetition|clearPetition/i.test(k)));
  check('being listened to is not a majority of anything',HEARD>0&&HEARD<1,HEARD);
}

/* ---------- wealth is not a voice ----------
   The rule this whole system exists to hold. Two identical households, one
   affluent and one not: the same hearing. */
{
  const src=String(influenceOf);
  check('the measure reads no tier, no desirability and no standing',
    !/housingTier|desirab|standing|coins|wealth|tax/i.test(src),src.slice(0,120));
  /* One town, one set of households, and the money changed underneath them.
     Growing two towns at different desirabilities does not isolate anything -
     desirability feeds which households become notable in the first place, so
     the two towns end up with different families and the comparison is
     meaningless. This is the same street, made poor and then made rich. */
  town(20260907,{jobs:true,tier:1,desirability:12}); days(200);
  const poor=families().map(f=>({k:f.homeSeed>>>0,v:influenceOf(f)})).sort((a,b)=>a.k-b.k);
  for(const h of S.ctx.houses){ h.state.housingTier=3; h.state.desirability=95; }
  recompute(); invalidateDistricts();
  const rich=families().map(f=>({k:f.homeSeed>>>0,v:influenceOf(f)})).sort((a,b)=>a.k-b.k);
  check('fixture: it is the same street, now wealthy',poor.length>0&&poor.length===rich.length&&poor.every((p,i)=>p.k===rich[i].k),
    JSON.stringify([poor.length,rich.length]));
  check('making every household rich changes nobody\'s hearing',
    poor.every((p,i)=>Math.abs(p.v-rich[i].v)<1e-9),JSON.stringify([poor.slice(0,3),rich.slice(0,3)]));
  check('and somebody in that street was genuinely listened to while it was poor',poor.some(p=>p.v>=HEARD),
    JSON.stringify(poor.map(p=>p.v.toFixed(2))));
}

/* ---------- what does earn a hearing ---------- */
{
  town(20260907,{jobs:true}); days(90);
  const f=families()[0];
  check('fixture: a household to test',!!f);
  const base=influenceOf(f);
  // Rooted.
  const gen=f.generation; f.generation=(gen||1)+2;
  check('a household that has been here for generations is heard more',influenceOf(f)>base,influenceOf(f)+' vs '+base);
  f.generation=gen;
  // Public work.
  const careers=JSON.stringify(f.careers);
  f.careers={0:'teacher',1:'nurse'};
  const service=influenceOf(f);
  f.careers={0:'cafeOwner',1:'cafeWorker'};
  const trade=influenceOf(f);
  check('work the town depends on is heard more than work that does not',service>trade,service+' vs '+trade);
  check('but a household in ordinary work is still heard somewhat',trade>0,trade);
  f.careers=JSON.parse(careers);
  // Out of work.
  f.careers={};
  check('a household with nobody in work is heard least of all',influenceOf(f)<trade,influenceOf(f)+' vs '+trade);
  f.careers=JSON.parse(careers);
  check('nobody is ever heard more than completely',families().every(x=>influenceOf(x)<=1));
}

/* ---------- a petition is a real lack, asked for by someone real ---------- */
{
  // A street with work but no school and no green.
  town(20260907,{jobs:true}); days(200);
  const raised=petitions();
  check('a district that lacks something, with somebody listened to in it, asks',raised.length>=1,JSON.stringify(raised));
  check('and never asks for more than the cap',raised.length<=MAX_PETITIONS);
  check('each petition names a need this build actually has',raised.every(p=>!!petitionWant(p)),JSON.stringify(raised.map(p=>p.need)));
  check('each is attributed to a household that exists and lives there',raised.every(p=>{
    const f=families().find(x=>x.id===p.familyId); return f&&f.roots===p.district; }));
  check('and to one the valley genuinely listens to',raised.every(p=>{
    const f=families().find(x=>x.id===p.familyId); return f&&isHeard(f); }));
  check('the district really does lack the thing it is asking for',raised.every(p=>{
    const m=recomputeDistricts().find(d=>d.name===p.district)?.measured||{};
    return p.need==='school'?m.schools===0:p.need==='recreation'?m.recreationReach===0:
           p.need==='work'?m.jobs<m.workers*0.5:p.need==='safety'?m.unresolvedCrime>=1:m.stations===0; }),
    JSON.stringify(raised.map(p=>p.need)));
  check('the Chronicle says the neighbourhood began asking',notes.some(t=>/have begun asking for/.test(t)),notes.slice(-3).join(' | '));
  check('one district asks for one thing at a time',new Set(raised.map(p=>p.district)).size===raised.length);
  /* And a street that already has the thing never asks for it. Without this,
     "the district really does lack it" above passes trivially in a town that
     lacks everything, and a petition generator that ignored the need
     altogether would go unnoticed. */
  town(20260907,{jobs:true,school:true}); days(200);
  check('fixture: the school really is standing and in reach',district().measured.schools>=1,district().measured.schools);
  /* Read what was SAID over the whole run, not what is still standing: a
     petition for something the district already has would be marked met on the
     very next pass and vanish, so the current list is exactly where such a bug
     hides. */
  check('a district that already has a school never asks for one',
    !notes.some(t=>/begun asking for a school/.test(t)),notes.filter(t=>/begun asking/.test(t)).join(' | '));
  check('and it does ask for the thing it genuinely lacks',
    notes.some(t=>/begun asking for somewhere to gather/.test(t)),notes.filter(t=>/begun asking/.test(t)).join(' | '));
}

/* ---------- nobody listened to, nobody asking ---------- */
{
  town(20260907,{jobs:true}); days(6);
  check('fixture: too new for anybody to be listened to yet',voices().length===0,voices().length);
  days(20);
  const early=petitions().length;
  check('a brand new street asks for nothing, however much it lacks',early===0,early);
}

/* ---------- build the thing and the asking stops ---------- */
{
  town(20260907,{jobs:true}); days(200);
  const p=petitions()[0];
  check('fixture: something is being asked for',!!p,p&&p.need);
  if(p){
    // Give the district exactly what it asked for.
    if(p.need==='school') place('school',56,44);
    else if(p.need==='recreation'){ place('picnicGreen',56,44); for(const h of S.ctx.houses) h.state.recreationSatisfaction=90; }
    else if(p.need==='work') for(const y of [53,57]) for(let x=40;x<=68;x+=4) place('farm',x,y);
    else if(p.need==='safety'){ S.incidents=[]; }
    else if(p.need==='transport') place('station',56,44);
    recompute(); invalidateDistricts(); S.ledger=[];
    evaluateInfluence(note);
    check('the petition ends when the thing is there',!petitions().some(x=>x.district===p.district&&x.need===p.need),
      JSON.stringify(petitions()));
    check('and the Chronicle says the valley got what it asked for',notes.some(t=>/which it had been asking for/.test(t)));
    check('the ledger carries it as a public fact',ledger().some(e=>e.type==='petition_met'&&!e.hidden));
  }
}

/* ---------- it reaches the paper and City Hall, as reporting ---------- */
{
  town(20260907,{jobs:true}); days(200);
  const p=petitions()[0];
  check('fixture: a standing petition',!!p);
  const day=S.day+1; S.day=day; S.ledger=[];
  const f=families().find(x=>x.id===p.familyId);
  record('petition_raised',{district:p.district,need:p.need,want:petitionWant(p),surname:f.surname,familyId:p.familyId});
  const text=prose(composeIssue(day));
  check('the paper reports the neighbourhood asking, by district and household',
    text.includes(p.district)&&text.includes(f.surname),text.slice(0,220));
  check('and says plainly that City Hall has promised nothing',/no commitment/i.test(text));
  check('a standing petition also speaks in the readers column',
    composeIssue(day).readers.some(r=>r.who.includes(p.district)),JSON.stringify(composeIssue(day).readers));
  // City Hall reports and offers nothing to press.
  check('fixture: a City Hall stands',place('cityHall',40,38));
  S.pick={x:40,y:38}; renderCityHall();
  const html=document.getElementById('look-body').innerHTML; S.pick=null;
  check('City Hall lists what the neighbourhoods are asking for',html.includes('asking for')&&html.includes(p.district),
    html.slice(0,160));
  check('and offers no way to grant, refuse or dismiss any of it',
    !/<button[^>]*>(\s*)(Grant|Approve|Refuse|Dismiss|Deny|Reject)/i.test(html));
  check('and says the player is not obliged',/nothing here obliges you/i.test(html));
}

/* ---------- not per frame ---------- */
{
  town(); S.diagnostics.influenceEvaluations=0;
  for(let i=0;i<20;i++) advanceInfluence(INFLUENCE_INTERVAL/40);
  check('small steps below the interval do not evaluate',S.diagnostics.influenceEvaluations===0);
  advanceInfluence(INFLUENCE_INTERVAL);
  check('crossing the interval evaluates exactly once',S.diagnostics.influenceEvaluations===1);
}

/* ---------- save ---------- */
{
  town(20260907,{jobs:true}); days(200);
  const before=JSON.stringify(petitions());
  check('fixture: there is something to save',petitions().length>=1);
  const social={...JSON.parse(JSON.stringify(packFamilies())),...JSON.parse(JSON.stringify(packInfluence()))};
  restoreFamilies(social); restoreInfluence(social);
  check('petitions survive save and load exactly',JSON.stringify(petitions())===before,JSON.stringify(petitions()).slice(0,140));
  restoreInfluence(undefined);
  check('an old save with none loads with none, and no error',petitions().length===0);
  const realId=families()[0]?.id;
  restoreInfluence({petitions:[
    {district:'A',need:'moonbase',since:1,familyId:realId},
    {district:'B',need:'school',since:1,familyId:99999},
    {district:'C',need:'school',since:1,familyId:realId},
    {district:'C',need:'recreation',since:1,familyId:realId}]});
  check('a need this build does not have is refused',!petitions().some(p=>p.need==='moonbase'));
  check('a household this save does not have is refused',!petitions().some(p=>p.district==='B'));
  check('and one district cannot be asking for two things at once',petitions().filter(p=>p.district==='C').length===1);
}

const failed=checks.filter(c=>!c.pass);
document.getElementById('results').textContent=JSON.stringify({pass:!failed.length,checks},null,2);
document.documentElement.dataset.result=failed.length?'fail':'pass';
