import * as org from '../src/simulation/organisations.js';
import { MAX_ORGANISATIONS, NEED, ORG_INTERVAL, STAGES, TYPES, advanceOrganisations, conditions, conditionsMet,
  evaluateOrganisations, involvementWeight, organisationOf, organisations, packOrganisations, restoreOrganisations } from '../src/simulation/organisations.js';
import { SURNAMES, evaluateFamilies, families, familyMembers, packFamilies, restoreFamilies } from '../src/simulation/families.js';
import { LOOKING, evaluateCareers } from '../src/simulation/careers.js';
import { IDENTITIES, districtIdentityCandidates, evaluateDistrictIdentities, invalidateDistricts, isCriminalIdentity, recomputeDistricts } from '../src/simulation/districts.js';
import { erase, place } from '../src/buildings/buildings.js';
import { S } from '../src/core/state.js';
import { resetProgression } from '../src/progression/city-growth.js';
import { recompute } from '../src/simulation/mood.js';
import { genWorld } from '../src/world/map.js';
import { idx } from '../src/world/tiles.js';
import { describe } from '../src/ui/panels.js';
import { renderCityHall } from '../src/ui/city-hall.js';

const checks=[];
const check=(name,value,detail)=>checks.push({name,pass:Boolean(value),...(detail===undefined?{}:{detail})});
const notes=[]; const note=t=>notes.push(t);

/* A dense street of homes with no work and no recreation, a police station in
   reach, and whatever else a scene adds. The base scene deliberately meets
   exactly two conditions - low opportunity and poor access - so every test of
   "one more" starts from below the line. Scenes take the police away with
   noPolice, and add work with jobs: three rows of farms, enough for everyone. */
function town(seed=20260907,opts={}){
  genWorld(seed); resetProgression('legacy-open'); S.cityProgress.stage=4; S.coins=9e6;
  S.citizens=[]; S.incidents=[]; notes.length=0;
  S.social={districts:[],nextId:0,families:[],nextFamilyId:0,firsts:{},organisations:[],nextOrgId:0,orgMemory:{}};
  for(let y=36;y<60;y++) for(let x=36;x<76;x++){ const i=idx(x,y); S.terr[i]=0; S.natTree[i]=0; S.grid[i]=null; }
  for(let x=39;x<70;x++) place('road',x,42);
  for(let x=40;x<70;x+=(opts.sparse?3:1)){ if(place('house',x,41)){ const h=S.grid[idx(x,41)]; h.pop=5; h.mood=60; h.state.housingTier=opts.tier??1; h.state.desirability=opts.desirability??30; h.state.education=30; } }
  if(!opts.noPolice) check('fixture: police station placed',place('policeStation',52,38));
  if(opts.jobs) for(const y of [45,49,53]) for(let x=40;x<=68;x+=4) check('fixture: farm placed at '+x+','+y,place('farm',x,y));
  if(opts.market) place('market',60,43);
  if(opts.docks){ for(let y=36;y<60;y++) S.terr[idx(72,y)]=1; place('dock',71,41); }
  if(opts.crime) S.incidents=[{id:1,kind:'crime',resolved:false,target:{x:50,y:41},age:0,status:'REPORTED'}];
  recompute(); invalidateDistricts(); evaluateDistrictIdentities();
}
function days(n){
  for(let d=0;d<n;d++){ S.day=(S.day||1)+1; for(let s=0;s<8;s++){ S.dayT=s/8+0.01; evaluateFamilies(note); evaluateCareers(note); if(s%3===0) evaluateOrganisations(note); } }
}
const district=()=>recomputeDistricts()[0];

/* ---------- nothing in from outside ---------- */
{
  const setters=Object.keys(org).filter(k=>/^(set|assign|make|create|force|declare|promote|found|spawn)/i.test(k));
  check('the organisations module exports no way to make one',setters.length===0,setters.join(',')||'none');
  check('formation needs at least three conditions at once',NEED>=3,NEED);
  check('every organisation type is named for a shape, never a person',Object.values(TYPES).every(t=>/^[A-Z][a-z]+$/.test(t.word)));
}

/* ---------- what is, and is not, an input ---------- */
{
  town();
  const src=String(conditions);
  check('formation reads no desirability, tier, standing, education or surname',
    !/desirab|housingTier|standing|education|surname|SURNAMES/i.test(src),src.slice(0,80));
  const c=conditions(district());
  check('the base scene meets exactly two conditions, below the line',conditionsMet(district())===2,JSON.stringify(c));
  check('and those two are opportunity and access, not poverty',c.lowOpportunity&&c.poorAccess);
}

/* ---------- no single factor is ever enough ---------- */
{
  // Only unemployment: full recreation access, police next door, but no work.
  town(20260907); for(const h of S.ctx.houses) h.state.recreationSatisfaction=90; recompute(); invalidateDistricts();
  days(240);
  check('unemployment alone, for 240 days, produces nothing',organisations().length===0,organisations().map(o=>o.name).join());
  // Only weak enforcement: jobs for everyone, recreation, no police.
  town(20260907,{noPolice:true,jobs:true}); for(const h of S.ctx.houses) h.state.recreationSatisfaction=90; recompute(); invalidateDistricts();
  check('the fixture really has only one condition',conditionsMet(district())<=1,JSON.stringify(conditions(district())));
  days(240);
  check('no police alone, for 240 days, produces nothing',organisations().length===0);
  // Poverty alone: the poorest homes imaginable, with jobs, police, access.
  town(20260907,{jobs:true,tier:1,desirability:2}); for(const h of S.ctx.houses) h.state.recreationSatisfaction=90; recompute(); invalidateDistricts();
  days(240);
  check('poverty alone produces nothing at all',organisations().length===0);
}

/* ---------- a combination, held, can ---------- */
{
  town(20260907,{noPolice:true,market:true,crime:true}); days(240);
  check('the fixture meets the line',conditionsMet(district())>=NEED,JSON.stringify(conditions(district())));
  check('with several conditions held, an organisation forms on its own',organisations().length>=1,organisations().length);
  const o=organisations()[0];
  check('and is named for the place, not for anyone',!!o&&o.name.startsWith(o.roots)&&!SURNAMES.some(sn=>o.name.includes(sn)),o?.name);
  check('the Chronicle says where it appeared',notes.some(t=>t==='The '+o?.name+' first appeared around '+o?.roots));
  check('stages stay on the ladder',organisations().every(x=>x.stage>=1&&x.stage<STAGES.length));
  check('the count stays inside its cap',organisations().length<=MAX_ORGANISATIONS);
  // The district's criminal identities become reachable only now.
  evaluateDistrictIdentities();
  const ids=districtIdentityCandidates(district().measured).map(i=>i.id);
  check('with an organisation present, Criminal Influence becomes a reading the district can hold',ids.some(isCriminalIdentity),ids.join(','));
  check('the same seed grows the same organisations',(()=>{ const first=organisations().map(x=>x.name+x.stage).join(); town(20260907,{noPolice:true,market:true,crime:true}); days(240); return organisations().map(x=>x.name+x.stage).join()===first; })());
}

/* ---------- prosperity and enforcement are causes of decline ---------- */
{
  town(20260907,{noPolice:true,market:true,crime:true}); days(240);
  const before=organisations()[0]; const stage=before?.stage||0;
  check('there is an organisation to weaken',!!before);
  check('fixture: police arrives',place('policeStation',50,38)); for(const y of [45,49,53]) for(let x=40;x<=68;x+=4) place('farm',x,y); S.incidents=[];
  recompute(); invalidateDistricts(); days(160);
  const after=organisations().find(o=>o.id===before.id);
  check('police and work nearby weaken it or end it',!after||after.stage<stage,(after?after.stage:'gone')+' from '+stage);
  check('a collapse is remembered in the Chronicle when it happens',!after?notes.some(t=>t==='The '+before.name+' broke up'):true);
}

/* ---------- who is drawn in: leanings and work, never name or class ---------- */
{
  const src=String(involvementWeight);
  check('involvement reads leanings and employment only',!/surname|standing|desirab|housingTier|SURNAMES|education/i.test(src));
  const bold=[{index:0,traits:{riskTolerance:90,ambition:80,caution:10}}], careful=[{index:0,traits:{riskTolerance:10,ambition:20,caution:90}}];
  check('bold leanings weigh more than careful ones',involvementWeight(bold,{})>involvementWeight(careful,{}));
  check('being out of work weighs more than being in it',involvementWeight(bold,{0:LOOKING})>involvementWeight(bold,{0:'farmer'}));
  // Surnames among involved families look like the pool, not like a subset of it.
  const involved={}; let seeds=0;
  for(const seed of [11,23,37,41,59,67]){ town(seed,{noPolice:true,market:true,crime:true,docks:true}); days(200); seeds++;
    for(const o of organisations()) for(const fid of o.families){ const f=families().find(x=>x.id===fid); if(f) involved[f.surname]=(involved[f.surname]||0)+1; } }
  const counts=Object.values(involved), max=counts.length?Math.max(...counts):0, total=counts.reduce((a,b)=>a+b,0);
  check('some families were drawn in across the seeded towns',total>=3,total);
  check('no surname dominates the involved families',max<=Math.max(2,Math.ceil(total*0.4)),JSON.stringify(involved));
  check('every involved surname is a pool name drawn like any other',Object.keys(involved).every(n=>SURNAMES.includes(n)));
}

/* ---------- what the player is shown, and not shown ----------
   City Hall reports; it never offers. A town with nothing to report never sees
   the word. The House card hints at a family's ties only once the thing is a
   crew or larger, and names the organisation, never a deed. */
{
  const hallHtml=()=>{ check('fixture: a City Hall stands',place('cityHall',40,38)); S.pick={x:40,y:38}; renderCityHall(); const t=document.getElementById('look-body').innerHTML; S.pick=null; return t; };
  town(); const quiet=hallHtml();
  check('a town with no organisation never sees the card',!/Word around town/.test(quiet));
  check('the City Hall page offers no button about any of this',!/[Cc]reate (a )?(crew|gang|mafia|organisation)|[Dd]isband|[Mm]ake .*boss/.test(quiet));
  town(20260907,{noPolice:true,market:true,crime:true}); days(240);
  const o=organisations()[0]; const html=hallHtml();
  check('with one present, City Hall reports it by place and shape',!!o&&html.includes('Word around town')&&html.includes('The '+o.name),o?.name);
  check('and still offers no button about it',!/[Cc]reate (a )?(crew|gang|mafia|organisation)|[Dd]isband|[Mm]ake .*boss/.test(html));
  const inv=families().find(f=>o&&o.families.includes(f.id)); const h=inv&&S.ctx.houses.find(x=>(x.seed>>>0)===(inv.homeSeed>>>0));
  if(h){ const card=describe(h.x,h.y);
    check('the House card of an involved family hints once the crew is real',o.stage>=3?card.includes('Said to have ties to <b>the '+o.name+'</b>'):!card.includes('Said to have ties'),String(o.stage));
    check('and says nothing anyone did',!/arrest|murder|kill|stole|extort/i.test(card)); }
  const outsider=families().find(f=>!organisationOf(f)); const oh=outsider&&S.ctx.houses.find(x=>(x.seed>>>0)===(outsider.homeSeed>>>0));
  if(oh) check('a family not involved carries no rumour',!describe(oh.x,oh.y).includes('Said to have ties'));
}

/* ---------- not per frame ---------- */
{
  town(); S.diagnostics.organisationEvaluations=0;
  for(let i=0;i<20;i++) advanceOrganisations(ORG_INTERVAL/40);
  check('small steps below the interval do not evaluate',S.diagnostics.organisationEvaluations===0);
  advanceOrganisations(ORG_INTERVAL);
  check('crossing the interval evaluates exactly once',S.diagnostics.organisationEvaluations===1);
}

/* ---------- save V3 ---------- */
{
  town(20260907,{noPolice:true,market:true,crime:true}); days(240);
  const before=JSON.stringify(organisations());
  const social={...JSON.parse(JSON.stringify(packFamilies())),...JSON.parse(JSON.stringify(packOrganisations()))};
  restoreFamilies(social); restoreOrganisations(social);
  check('organisations survive save and load exactly',JSON.stringify(organisations())===before);
  restoreOrganisations(undefined);
  check('an old save with none loads with none',organisations().length===0);
  restoreOrganisations({nextOrgId:3,organisations:[
    {id:1,type:'cartel',name:'X',roots:'Y',founded:1,stage:2,families:[]},
    {id:2,type:'streetCrew',name:'Lantern Row Crew',roots:'Lantern Row',founded:1,stage:9,families:[]},
    {id:3,type:'streetCrew',name:'Lantern Row Crew',roots:'Lantern Row',founded:1,stage:2,families:[999]}]});
  check('a type this game does not have is refused from a save',!organisations().some(o=>o.type==='cartel'));
  check('a stage off the ladder is refused',!organisations().some(o=>o.stage===9));
  check('a family that does not exist is dropped from membership',organisations().every(o=>!o.families.includes(999)));
}

const failed=checks.filter(c=>!c.pass);
document.getElementById('results').textContent=JSON.stringify({pass:!failed.length,checks},null,2);
document.documentElement.dataset.result=failed.length?'fail':'pass';
