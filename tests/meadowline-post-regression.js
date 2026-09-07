import * as postMod from '../src/simulation/post.js';
import { MAX_ARCHIVE, RELIABILITY, composeIssue, currentIssue, packPost, postArchive, publishIssue, restorePost, whispers } from '../src/simulation/post.js';
import { MAX_LEDGER, ledger, publicEvents, record } from '../src/simulation/ledger.js';
import { evaluateOrganisations, organisations } from '../src/simulation/organisations.js';
import { evaluateEnforcement } from '../src/simulation/enforcement.js';
import { SURNAMES, evaluateFamilies, families, familyMembers } from '../src/simulation/families.js';
import { evaluateCareers } from '../src/simulation/careers.js';
import { evaluateDistrictIdentities, invalidateDistricts, recomputeDistricts } from '../src/simulation/districts.js';
import { spawnMunicipalIncident, updateMunicipal } from '../src/simulation/municipal.js';
import { erase, place, relocate } from '../src/buildings/buildings.js';
import { S } from '../src/core/state.js';
import { resetProgression } from '../src/progression/city-growth.js';
import { recompute } from '../src/simulation/mood.js';
import { genWorld } from '../src/world/map.js';
import { idx } from '../src/world/tiles.js';
import { issueHtml, openPost } from '../src/ui/post.js';

const checks=[];
const check=(name,value,detail)=>checks.push({name,pass:Boolean(value),...(detail===undefined?{}:{detail})});
const notes=[]; const note=t=>notes.push(t);
const BARRED=/\bmafia\b|\bmob\b|crime family|syndicate|\bboss\b|\bfront\b/i;

/* The enforcement fixture: a street, businesses, an open crime, a market, and
   no police - everything that grows an organisation. */
function town(seed=20260907,opts={}){
  genWorld(seed); resetProgression('legacy-open'); S.cityProgress.stage=4; S.coins=9e6; S.day=1; S.dayT=.3;
  S.citizens=[]; S.incidents=[]; S.serviceVehicles=[]; notes.length=0; S.ledger=[]; S.history=[]; S.log=[];
  S.post={issue:null,archive:[],lastIssueDay:0,unread:false};
  S.social={districts:[],nextId:0,families:[],nextFamilyId:0,firsts:{},organisations:[],nextOrgId:0,orgMemory:{},fame:[]};
  for(let y=30;y<60;y++) for(let x=30;x<80;x++){ const i=idx(x,y); S.terr[i]=0; S.natTree[i]=0; S.grid[i]=null; }
  for(let x=39;x<70;x++) place('road',x,42);
  for(let x=40;x<70;x++){ if(place('house',x,41)){ const h=S.grid[idx(x,41)]; h.pop=5; h.mood=60; h.state.housingTier=1; h.state.desirability=30; h.state.education=30; } }
  for(const [t,x] of [['cafe',44],['bakery',48],['cafe',52],['market',60],['cafe',64]]) place(t,x,43);
  if(opts.crime) S.incidents=[{id:1,kind:'crime',resolved:false,target:{x:50,y:41},age:0,status:'REPORTED'}];
  S.ledger=[]; // placement itself is not yesterday's news in these scenes
  recompute(); invalidateDistricts(); evaluateDistrictIdentities();
}
const text=issue=>JSON.stringify(issue);
// The words the paper printed, and only those: headlines, bodies, quotes and
// whispers. JSON keys such as "arrests" are not prose.
const prose=issue=>[issue.lead.headline,issue.lead.body,...issue.sections.flatMap(s=>s.items.flatMap(i=>[i.headline,i.body])),...issue.readers.map(r=>r.text+' '+r.who),...issue.whispers.map(w=>w.text)].join('\n');
const seenHidden=new Set();
/* Headlines are upper-cased, so a case-sensitive search for "Fern Hollow Crew"
   sails straight past "FERN HOLLOW CREW". Every leak check goes through here. */
const names=(text,name)=>text.toLowerCase().includes(String(name).toLowerCase());
function days(n,{police=true,social=true}={}){
  for(let d=0;d<n;d++){ S.day=(S.day||1)+1; S.history.push({day:S.day,pop:S.pop,coins:0,mood:S.mood}); if(S.history.length>40) S.history.shift();
    for(let s=0;s<8;s++){ S.dayT=s/8+0.01; if(social){ evaluateFamilies(note); evaluateCareers(note); if(s%3===0){ evaluateOrganisations(note); if(police) evaluateEnforcement(note); } } }
    for(const e of ledger()) if(e.hidden) seenHidden.add(e.type);
    /* The paper is composed for the day that just ended, while its events are
       still in the ledger. Composing it later reads an empty ledger and asserts
       nothing - which is exactly how a leak got through this test once. Every
       day's prose is kept so the leak check has something real to read. */
    issuesSeen.push({day:S.day,prose:prose(composeIssue(S.day))}); }
}
const issuesSeen=[];
// Run day by day until yesterday's ledger holds an event of the type, since
// the ledger forgets anything older than yesterday as the days go by.
function untilEvent(type,maxDays,opts){ for(let d=0;d<maxDays;d++){ days(1,opts); const e=ledger().find(x=>x.type===type&&x.day===S.day); if(e) return e; } return null; }
const district=()=>recomputeDistricts()[0];

/* ---------- the paper decides nothing ---------- */
{
  const bad=/^(set|assign|make|create|force|declare|promote|found|spawn|arrest|kill|invent|add|name)/i;
  const setters=Object.keys(postMod).filter(k=>bad.test(k));
  check('the post module exports no way to make anything happen',setters.length===0,setters.join(','));
  check('reliability has the four classes',RELIABILITY.join()==='weak,plausible,strong,confirmed');
  const src=await (await fetch('../src/simulation/post.js')).text();
  check('the generator never writes to the grid, the families, the organisations or the incidents',!/S\.grid\[[^\]]*\]\s*=(?!=)|S\.incidents\.push|families\(\)\.push|organisations\(\)\.push|\.stage\s*=(?!=)|\.exposed\s*=(?!=)|S\.pop\s*=(?!=)/.test(src));
}

/* ---------- one issue a day, from the ledger, and never invented ---------- */
{
  town(); S.day=2;
  check('nothing happened, so the paper says so',(()=>{ const i=composeIssue(1); return i.lead.quiet&&/QUIET|CALM|NOTHING MUCH/.test(i.lead.headline)&&i.sections.length===0; })(),JSON.stringify(composeIssue(1).lead));
  const quiet=composeIssue(1);
  check('a quiet day invents no arrest, no death and no move',!/arrest|died|death|funeral|moved|relocat/i.test(prose(quiet)),prose(quiet));
  check('and its numbers are the city\'s: population and homes match state',quiet.brief.population===S.pop&&quiet.brief.homes===S.ctx.houses.length);
  check('publish writes yesterday\'s edition once',publishIssue()&&currentIssue().day===1&&publishIssue()===false&&S.post.lastIssueDay===1);
  check('the edition is flagged unread until read',S.post.unread===true);
  /* Something must have been printed for "drained" to mean anything: an empty
     ledger satisfies every() trivially, which is how a publish that drained
     nothing once passed this. */
  check('the ledger is drained of what was printed',(()=>{
    S.post.lastIssueDay=0; S.day=8;
    record('crime_incident',{}); record('arrest',{}); record('building_opened',{cls:'business',type:'bakery',name:'Bakery',jobs:6,district:'X'});
    const before=ledger().filter(e=>e.day===8).length;
    S.day=9; publishIssue();
    return before===3&&ledger().filter(e=>e.day<=8).length===0;
  })(),JSON.stringify(ledger()));
  check('the first day before any day has ended prints nothing',(()=>{ S.post.lastIssueDay=0; S.day=1; return publishIssue()===false; })());
  check('and a day already printed is never printed twice',(()=>{ S.day=12; S.post.lastIssueDay=11; return publishIssue()===false; })());
}

/* ---------- families: arrivals, departures, moves, from real events ---------- */
{
  town(); const e=untilEvent('family_arrival',120,{police:false});
  const arrivals=ledger().filter(x=>x.type==='family_arrival');
  check('families settling write themselves to the ledger',!!e,S.day);
  S.day=e.day+1;
  const issue=composeIssue(e.day);
  check('the paper welcomes a family by its real surname and district',text(issue).includes(e.surname)&&(!e.district||text(issue).includes(e.district)),JSON.stringify(issue.sections.map(s=>s.id)));
  check('and does not welcome a family that did not arrive that day',!SURNAMES.filter(n=>!arrivals.filter(a=>a.day===e.day).some(a=>a.surname===n)&&!families().some(f=>f.surname===n)).some(n=>text(issue).includes(n)));
  // A household carried across town is a move, and only across town.
  const f=families()[0]; const home=S.ctx.houses.find(h=>(h.seed>>>0)===(f.homeSeed>>>0));
  for(let x=30;x<40;x++) place('road',x,50); for(let x=31;x<39;x+=1) place('house',x,49);
  recompute(); invalidateDistricts(); const before=f.roots; S.ledger=[];
  const moved=relocate(home,35,51); recompute(); invalidateDistricts();
  const mv=ledger().find(e=>e.type==='family_move');
  check('fixture: the home was carried to another neighbourhood',moved.ok&&recomputeDistricts().length>=2,JSON.stringify([moved,recomputeDistricts().map(d=>d.name)]));
  check('a house moved to another district is a family move, with the right family',!!mv&&mv.familyId===f.id&&mv.from!==mv.to,JSON.stringify(mv));
  check('the family record now says where it lives',f.roots===mv?.to&&f.roots!==before,f.roots);
  S.day=(S.day|0)+1; const paper=composeIssue(S.day-1);
  check('the paper reports the move by name and destination',text(paper).includes(f.surname)&&text(paper).includes(mv.to)&&/MOVES TO/.test(text(paper)));
  S.ledger=[]; relocate(home,36,51);
  check('a move within the same street is not a story',!ledger().some(e=>e.type==='family_move'));
}

/* ---------- business: real openings and closings, real jobs ---------- */
{
  town(); S.ledger=[]; S.day=5;
  check('fixture: a bakery opens',place('bakery',56,43));
  const open=ledger().find(e=>e.type==='building_opened');
  check('a bakery opening is a ledger fact with the registry\'s jobs',!!open&&open.building==='bakery'&&open.jobs===6,JSON.stringify(open));
  const issue=composeIssue(5);
  check('and the paper reports it with those jobs, in its district',/NEW BAKERY OPENS/.test(text(issue))&&text(issue).includes('6 jobs')&&(!open.district||text(issue).includes(open.district)));
  S.ledger=[]; erase(56,43,{confirmed:true});
  check('closing it is a closure story',/BAKERY CLOSES/.test(text(composeIssue(5))));
  S.ledger=[]; place('road',38,42); place('lamp',39,40);
  check('a road or a lamp is not news',ledger().length===0);
}

/* ---------- crime: counts from the dispatcher, never rounded ---------- */
{
  town(); S.ledger=[]; S.day=8;
  check('fixture: a station with a road at its door',place('policeStation',50,43));
  const inc=spawnMunicipalIncident('crime',S.grid[idx(56,41)]);
  check('fixture: a robbery was reported and a cruiser sent',!!inc&&inc.dispatched,JSON.stringify(inc?.status));
  /* The dispatcher raises incidents of its own from an unseeded roll once the
     town is big enough, so driving it for six hundred ticks would sometimes
     produce a second robbery and sometimes not - and "the paper says exactly
     what happened" cannot be tested against a number that changes between
     runs. Below the population threshold it dispatches and resolves what is
     already reported and starts nothing new, which is the scene this wants. */
  const pop=S.pop; S.pop=0;
  for(let i=0;i<600&&!inc.resolved;i++) updateMunicipal(0.25);
  S.pop=pop;
  check('fixture: the suspect was caught, and nothing else happened',inc.resolved&&S.incidents.filter(x=>!x.resolved).length===0,JSON.stringify([inc.resolved,S.incidents.length]));
  const issue=composeIssue(8);
  check('one incident, one arrest: the paper says exactly that',issue.brief.incidents===1&&issue.brief.arrests===1&&/1 ARREST AFTER 1 REPORTED INCIDENT/.test(text(issue)),JSON.stringify([issue.brief.incidents,issue.brief.arrests,issue.lead.headline]));
  check('a safety story leads when nothing bigger happened',issue.lead.headline.includes('ARREST'));
  check('and it uses none of the barred words',!BARRED.test(prose(issue)),prose(issue).match(BARRED)?.[0]);
}

/* ---------- the knowledge boundary ---------- */
{
  town(20260907,{crime:true}); days(200,{police:false});
  const o=organisations()[0];
  check('fixture: an organisation nobody exposed',!!o&&!o.exposed&&o.stage>=3,o?.stage);
  const hidden=[...seenHidden];
  check('what it did is in the ledger, hidden',hidden.length>=1&&hidden.every(t=>/^org_|^boss_|^front_opened/.test(t)),JSON.stringify(hidden));
  check('public events carry none of it',publicEvents(S.day).every(e=>!e.hidden));
  /* Every issue as it was actually printed, over the whole growth of the
     thing. The count guard is the point: composing these after the fact reads
     an empty ledger, so a leak check that finds nothing to read would pass
     while the paper was shouting the name. */
  const printed=issuesSeen.filter(i=>i.prose.trim().length>0);
  check('the growth of it actually produced editions to inspect',printed.length>=20,printed.length+' of '+issuesSeen.length);
  /* And the paper was actively covering the very neighbourhood the thing grew
     in - arrivals, trades, what the place became - all the while. A paper that
     never mentioned the district would not be evidence of anything. */
  const covered=issuesSeen.filter(i=>i.prose.includes(o.roots));
  check('and those editions were covering the neighbourhood it grew in',covered.length>=3,covered.length+' of '+printed.length);
  const leaked=issuesSeen.find(i=>names(i.prose,o.name)||BARRED.test(i.prose));
  check('no issue ever named the organisation or used a barred word before exposure',!leaked,JSON.stringify(leaked&&{day:leaked.day,t:leaked.prose.slice(0,200)}));
  const boss=o.boss&&families().find(f=>f.id===o.boss.familyId); const bossName=boss&&familyMembers(boss).find(m=>m.index===o.boss.index)?.name;
  check('the boss\'s name does not appear as a boss anywhere',!bossName||!names(prose(composeIssue(S.day)),bossName)||!/runs|leads|boss/i.test(prose(composeIssue(S.day))),bossName);
  // Whispers exist, and only as whispers.
  const w=whispers(S.day);
  check('the paper whispers about what a neighbour could see',w.length>=1&&w.every(x=>RELIABILITY.includes(x.reliability)&&x.reliability!=='confirmed'),JSON.stringify(w));
  check('no whisper names the group, a person or a business',w.every(x=>!names(x.text,o.name)&&!(bossName&&names(x.text,bossName))&&!BARRED.test(x.text)));
  // The police arrive; the world exposes it.
  check('fixture: a station within reach',place('policeStation',66,36)); recompute(); invalidateDistricts();
  S.diagnostics.casesMade=0;
  for(let d=0;d<400&&(S.diagnostics.casesMade||0)===0&&organisations().includes(o);d++) days(1);
  check('fixture: a case was made',(S.diagnostics.casesMade||0)>=1&&o.exposed,JSON.stringify([S.diagnostics.casesMade,o.exposed]));
  /* The dangerous window: the police are openly looking into it and the paper
     is reporting the inquiry, but the world has not exposed it yet. Those
     editions may say where officers are asking and may not say who they think
     is behind it. Nothing before this ran that story at all - the growth scene
     has no police - so without this the inquiry prose was never inspected. */
  const exposedOn=(ledger().find(e=>e.type==='case_made')||{}).day||S.day;
  const before=issuesSeen.filter(i=>i.day<exposedOn);
  const inquiries=before.filter(i=>/LOOKING INTO|SEARCH|INQUIRY/i.test(i.prose));
  check('the paper did report the inquiry while it was still unexposed',inquiries.length>=1,inquiries.length+' of '+before.length+' editions');
  const window=before.find(i=>names(i.prose,o.name)||BARRED.test(i.prose));
  check('and no edition in that window named the group',!window,JSON.stringify(window&&{day:window.day,t:window.prose.slice(0,220)}));
  const made=ledger().find(e=>e.type==='case_made')||S.ledger.find(e=>e.type==='case_made');
  const dayOf=made?made.day:S.day;
  const issue=composeIssue(dayOf);
  check('the day the case was made, the paper prints the name investigators use',names(prose(issue),o.name)&&/POLICE NAME|POLICE MOVE/.test(prose(issue)),issue.lead.headline);
  check('attributed to investigators, still never the barred words',/investigators|put a name to|Police moved again/i.test(prose(issue))&&!BARRED.test(prose(issue)),prose(issue).slice(0,300));
  check('an exposed group is news, not a whisper',!whispers(S.day).some(x=>x.text.includes(o.roots)&&x.reliability!=='confirmed')||whispers(S.day).every(x=>!x.text.includes(o.name)));
  // Rumour needs evidence: no organisation, no whisper.
  town(); check('with no organisation and nobody famous, there is nothing to whisper',whispers(S.day).length===0);
}

/* ---------- the police act on something still secret ----------
   The growth scene above can only reach the paths the dice reach: if the first
   raid makes its case, the paper never has to write about police acting on a
   group the world has not exposed. That is the most dangerous story there is,
   so it is put to the writer directly, with a ledger built by hand. */
{
  town(20260907,{crime:true}); days(120,{police:false});
  const o=organisations()[0];
  check('fixture: a secret organisation with a name to leak',!!o&&!o.exposed,o?.name);
  const day=S.day+1; S.day=day; S.ledger=[];
  // Exactly what enforcement.js writes when officers act and the case fails.
  record('raid',{orgId:o.id,district:o.roots,kind:'café',exposed:false,name:null});
  record('case_dropped',{orgId:o.id,district:o.roots,exposed:false,name:null});
  record('investigation_opened',{orgId:o.id,district:o.roots,exposed:false,name:null});
  const secret=prose(composeIssue(day));
  check('a raid on a secret group is reported without naming it',/SEARCH|SEARCHED/i.test(secret)&&!names(secret,o.name),secret.slice(0,200));
  check('a dropped case is reported without naming it',/WITHOUT CHARGES|ended an inquiry/i.test(secret)&&!names(secret,o.name));
  check('and none of the barred words appear',!BARRED.test(secret),secret.match(BARRED)?.[0]);
  check('the district is named, because that part is public',secret.includes(o.roots));
  // And a questioning while the group is still secret names the person only.
  const boss=o.boss&&families().find(f=>f.id===o.boss.familyId);
  const bossName=boss&&familyMembers(boss).find(m=>m.index===o.boss.index)?.name;
  if(bossName){
    S.ledger=[]; record('questioned',{orgId:o.id,district:o.roots,familyId:boss.id,index:o.boss.index,name:bossName,orgName:o.name});
    const q=prose(composeIssue(day));
    check('a questioning names the person but not the secret group',q.includes(bossName)&&!names(q,o.name),q.slice(0,200));
    check('and still uses none of the barred words',!BARRED.test(q),q.match(BARRED)?.[0]);
  }
}

/* ---------- readers' voices follow real conditions ---------- */
{
  town(); S.day=3; recompute();
  const noSchool=composeIssue(2);
  check('a street with no recreation hears about it',noSchool.readers.some(r=>r.need==='recreation'&&/park|play/.test(r.text)&&/Resident, /.test(r.who)),JSON.stringify(noSchool.readers));
  check('nobody complains about a packed school when there is no school',!noSchool.readers.some(r=>r.need==='school'));
  check('the jobs complaint appears only where jobs are short',noSchool.readers.some(r=>r.need==='jobs')===(S.municipal.employment.unemployed>S.municipal.employment.workers*0.25));
  place('road',70,42); check('fixture: a green at the end of the street, on the road',place('picnicGreen',70,43)); recompute(); invalidateDistricts();
  const rec=composeIssue(2).readers;
  check('give them a green and the complaint goes',!rec.some(r=>r.need==='recreation'),JSON.stringify(rec));
  check('never more than three voices',rec.length<=3);
}

/* ---------- the page ---------- */
{
  town(); S.day=2; S.ledger=[]; record('building_opened',{cls:'business',building:'cafe',name:'Café',jobs:5,district:district()?.name||null}); publishIssue();
  const html=issueHtml(currentIssue());
  check('the paper has a masthead, a dateline and a lead',/THE MEADOWLINE POST/.test(html)&&/Valley.s Daily Record/.test(html)&&/Day 1/.test(html)&&/post-lead/.test(html));
  check('HTML in a headline cannot escape the page',!/<script/i.test(issueHtml({...currentIssue(),lead:{headline:'<script>x</script>',body:'',quiet:false}})));
  const stateBefore=JSON.stringify([S.grid.filter(Boolean).length,S.social.families.length,S.pop]);
  openPost();
  check('opening the paper marks it read and changes nothing else',S.post.unread===false&&document.getElementById('look').classList.contains('post-open')&&stateBefore===JSON.stringify([S.grid.filter(Boolean).length,S.social.families.length,S.pop]));
  check('the corner chip exists and has an unread dot to show',!!document.querySelector('#b-post .dot'));
}

/* ---------- bounded, saved, and kind to old saves ---------- */
{
  town(); S.day=2;
  for(let i=0;i<MAX_LEDGER+50;i++) record('crime_incident',{incidentId:i,x:1,y:1});
  check('the ledger is bounded',ledger().length<=MAX_LEDGER);
  S.ledger=[]; record('x',{}); S.day=9; record('y',{});
  check('the ledger forgets anything older than yesterday',!ledger().some(e=>e.type==='x'));
  S.post={issue:null,archive:[],lastIssueDay:0,unread:false};
  for(let d=1;d<=MAX_ARCHIVE+10;d++){ S.day=d+1; S.ledger=[{type:'stage_change',day:d,stage:'Village '+d}]; publishIssue(); }
  check('the archive is bounded',postArchive().length<=MAX_ARCHIVE&&postArchive().length>=MAX_ARCHIVE-1,postArchive().length);
  check('and keeps the newest',postArchive()[postArchive().length-1].headline.includes('VILLAGE '+(MAX_ARCHIVE+10)));
  const before=JSON.stringify(packPost());
  restorePost(JSON.parse(JSON.stringify(packPost())));
  check('the paper survives save and load exactly',JSON.stringify(packPost())===before);
  check('the saved paper is small',before.length<12000,before.length);
  restorePost(undefined);
  check('an old save without a paper loads with none, and no error',currentIssue()===null&&postArchive().length===0&&S.post.lastIssueDay===0);
  restorePost({archive:[{day:'x',headline:42},{day:3,headline:'KEPT',kind:'lead'}],issue:{lead:{headline:'H',body:'B'},sections:[{id:'crime',items:[{headline:'I',body:'J'},{nope:1}]},null]}});
  check('a mangled save is cleaned rather than trusted',postArchive().length===1&&postArchive()[0].headline==='KEPT'&&currentIssue().sections.length===1&&currentIssue().sections[0].items.length===1);
}

const failed=checks.filter(c=>!c.pass);
document.getElementById('results').textContent=JSON.stringify({pass:!failed.length,checks},null,2);
document.documentElement.dataset.result=failed.length?'fail':'pass';
