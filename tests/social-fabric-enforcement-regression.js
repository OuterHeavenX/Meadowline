import * as enf from '../src/simulation/enforcement.js';
import * as org from '../src/simulation/organisations.js';
import { NOTICE_REACH, advanceEnforcement, caseChance, evaluateEnforcement, investigating, noticeChance } from '../src/simulation/enforcement.js';
import { BOSS_STAGE, FRONT_STAGE, FRONT_TYPES, MAX_FRONTS, ORG_INTERVAL, bossOf, bossWeight, frontAt, frontsOf, evaluateOrganisations,
  organisations, packOrganisations, restoreOrganisations } from '../src/simulation/organisations.js';
import { SURNAMES, evaluateFamilies, families, familyMembers, packFamilies, restoreFamilies } from '../src/simulation/families.js';
import { evaluateCareers } from '../src/simulation/careers.js';
import { evaluateDistrictIdentities, invalidateDistricts, recomputeDistricts } from '../src/simulation/districts.js';
import { payday } from '../src/simulation/economy.js';
import { recomputeEmployment } from '../src/simulation/employment.js';
import { getBuildingDefinition } from '../src/buildings/registry.js';
import { place } from '../src/buildings/buildings.js';
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

/* The organisations fixture, with a row of businesses along the street so there
   is somewhere for a front to be. Everything that grows an organisation is
   held: no police in reach, a market, an open crime. Scenes add the police. */
function town(seed=20260907,opts={}){
  genWorld(seed); resetProgression('legacy-open'); S.cityProgress.stage=4; S.coins=9e6;
  S.citizens=[]; S.incidents=[]; S.serviceVehicles=[]; notes.length=0;
  S.social={districts:[],nextId:0,families:[],nextFamilyId:0,firsts:{},organisations:[],nextOrgId:0,orgMemory:{}};
  for(let y=36;y<60;y++) for(let x=36;x<76;x++){ const i=idx(x,y); S.terr[i]=0; S.natTree[i]=0; S.grid[i]=null; }
  for(let x=39;x<70;x++) place('road',x,42);
  for(let x=40;x<70;x++){ if(place('house',x,41)){ const h=S.grid[idx(x,41)]; h.pop=5; h.mood=60; h.state.housingTier=1; h.state.desirability=30; h.state.education=30; } }
  for(const [t,x] of [['cafe',44],['bakery',48],['cafe',52],['market',60],['cafe',64]]) check('fixture: '+t+' placed',place(t,x,43));
  if(opts.police) check('fixture: police placed',place('policeStation',opts.police[0],opts.police[1]));
  if(!opts.calm) S.incidents=[{id:1,kind:'crime',resolved:false,target:{x:50,y:41},age:0,status:'REPORTED'}];
  recompute(); invalidateDistricts(); evaluateDistrictIdentities();
}
function days(n,{police=true}={}){
  for(let d=0;d<n;d++){ S.day=(S.day||1)+1; for(let s=0;s<8;s++){ S.dayT=s/8+0.01; evaluateFamilies(note); evaluateCareers(note); if(s%3===0){ evaluateOrganisations(note); if(police) evaluateEnforcement(note); } } }
}
const district=()=>recomputeDistricts()[0];
const businesses=()=>[...S.ctx.cafes,...S.ctx.bakeries,...S.ctx.markets];

/* ---------- nothing in from outside ---------- */
{
  const bad=/^(set|assign|make|create|force|declare|promote|found|spawn|raid|investigate|arrest|dispatch|target|close|press|order)/i;
  const e=Object.keys(enf).filter(k=>bad.test(k)), o=Object.keys(org).filter(k=>bad.test(k));
  check('the enforcement module exports no way to order anything',e.length===0,e.join(','));
  check('the organisations module still exports no way to make, raid or close anything',o.length===0,o.join(','));
  // The UI may read these modules and never do anything else with them.
  const READ=new Set(['organisations','organisationOf','stageWord','bossOf','isBoss','frontAt','frontsOf','underInvestigation','investigating','STAGES','TYPES','FRONT_TYPES']);
  const offending=[];
  // Every UI module there is, read off the directory, so a new one cannot slip past.
  const listing=await (await fetch('../src/ui/')).text();
  const uiFiles=[...listing.matchAll(/href="([^"]+\.js)"/g)].map(m=>m[1]);
  check('the UI directory could be read for the import audit',uiFiles.includes('panels.js')&&uiFiles.includes('city-hall.js'),uiFiles.join(','));
  for(const file of uiFiles){
    const res=await fetch('../src/ui/'+file); if(!res.ok) continue;
    const src=await res.text();
    for(const m of src.matchAll(/import\s*\{([^}]*)\}\s*from\s*'\.\.\/simulation\/(organisations|enforcement)\.js'/g))
      for(const name of m[1].split(',').map(x=>x.trim().split(/\s+as\s+/)[0]).filter(Boolean)) if(!READ.has(name)) offending.push(file+':'+name);
  }
  check('the UI imports only readings from organisations and enforcement',offending.length===0,offending.join(','));
  check('a boss needs a local crew, a front an organised crew',BOSS_STAGE>=3&&FRONT_STAGE>BOSS_STAGE);
}

/* ---------- a boss is a citizen, not an invention ---------- */
{
  check('who runs it reads leanings only',!/surname|standing|desirab|housingTier|SURNAMES|education|career|name/i.test(String(bossWeight)),String(bossWeight));
  check('leadership weighs more than nerve, and nerve more than ambition',bossWeight({leadership:90,riskTolerance:10,ambition:10})>bossWeight({leadership:10,riskTolerance:90,ambition:10})&&bossWeight({leadership:10,riskTolerance:90,ambition:10})>bossWeight({leadership:10,riskTolerance:10,ambition:90}));
  town(); days(200,{police:false});
  const o=organisations()[0];
  check('an organisation grew',!!o&&o.stage>=BOSS_STAGE,o?.stage);
  const boss=o&&bossOf(o);
  if(o&&o.families.length){
    check('a crew has someone people say runs it',!!boss,o.families.length+' families');
    check('and that person is a member of an involved family, by name',!!boss&&o.families.includes(boss.family.id)&&familyMembers(boss.family).some(m=>m.name===boss.name),boss?.name);
    check('the Chronicle says so, and where',notes.some(t=>t==='Around '+o.roots+', people say '+boss?.name+' runs the '+o.name));
    check('the family record carries the rumour',(boss?.family.notes||[]).some(n=>/runs the/.test(n.text)));
  } else check('with no family involved there is no boss, and none is invented',!boss);
  check('no organisation carries a boss below the stage',organisations().every(x=>x.stage>=BOSS_STAGE||!x.boss));
  // Across seeds, boss surnames look like the pool, not like a subset of it.
  const names={}; for(const seed of [3,17,29,43,61,79]){ town(seed); days(200,{police:false}); for(const x of organisations()){ const b=bossOf(x); if(b) names[b.family.surname]=(names[b.family.surname]||0)+1; } }
  const counts=Object.values(names), total=counts.reduce((a,b)=>a+b,0);
  check('bosses were named across the seeded towns',total>=3,total);
  check('no surname dominates the bosses',(counts.length?Math.max(...counts):0)<=Math.max(2,Math.ceil(total*0.4)),JSON.stringify(names));
  check('every boss surname is a pool name drawn like any other',Object.keys(names).every(n=>SURNAMES.includes(n)));
}

/* ---------- a front is a business ---------- */
{
  town(); 
  check('a café in a town with no organisation is a café',businesses().every(b=>!frontAt(b)));
  days(240,{police:false});
  const o=organisations()[0]; const fronts=o?frontsOf(o):[];
  check('an organised crew took up behind a business or two',!!o&&o.stage>=FRONT_STAGE&&fronts.length>=1&&fronts.length<=MAX_FRONTS,fronts.length);
  check('every front is an ordinary business type inside the district',fronts.every(b=>FRONT_TYPES[b.type]&&b.x>=district().bounds.minX&&b.x<=district().bounds.maxX));
  check('the Chronicle names the kind of place and the street, never the business',fronts.length?notes.some(t=>/^The .* took up quietly behind a (café|bakery|market stall) on /.test(t)):true);
  check('no organisation has a front below the stage',organisations().every(x=>x.stage>=FRONT_STAGE||!(x.fronts||[]).length));
  // The front keeps paying, keeps its jobs, and keeps its card.
  if(fronts.length){
    const f=fronts[0], def=getBuildingDefinition(f.type);
    recomputeEmployment(); const jobsWith=S.municipal.employment.jobs;
    const coins=S.coins; payday(); const payWith=S.lastPay.trade+S.lastPay.income; S.coins=coins;
    const saved=o.fronts.slice(); o.fronts=[];
    recomputeEmployment(); const jobsWithout=S.municipal.employment.jobs;
    payday(); const payWithout=S.lastPay.trade+S.lastPay.income; S.coins=coins; o.fronts=saved;
    check('a front pays exactly what the same business pays',payWith===payWithout,payWith+' vs '+payWithout);
    check('a front fills exactly the jobs the registry says',jobsWith===jobsWithout&&def.jobs>0,jobsWith+' vs '+jobsWithout);
    const card=describe(f.x,f.y);
    check('its card is a business card',/Business/.test(card)&&/Jobs filled/.test(card));
    check('and says nothing about a front while nobody is asking',!/front|police|crew|asking/i.test(card));
    check('the economy does not know the word',!/front/i.test(String(payday)));
  }
}

/* ---------- the police decide ---------- */
{
  check('what the police notice reads visibility and coverage only',!/surname|standing|desirab|housingTier|identit|education|name/i.test(String(noticeChance)),String(noticeChance).slice(0,60));
  check('no station in reach, no chance at all',noticeChance({stage:6,fronts:[1,2]},0,5)===0);
  check('more stations, better odds of making the case',caseChance({stage:4},3)>caseChance({stage:4},1));
  check('a bigger organisation is harder to bring down',caseChance({stage:6},2)<caseChance({stage:3},2));
  // No police: nothing is ever looked into, however visible.
  town(); S.diagnostics.investigationsOpened=0; S.diagnostics.raids=0; days(240);
  check('with no station in reach nothing is investigated',(S.diagnostics.investigationsOpened||0)===0&&organisations().length>=1,S.diagnostics.investigationsOpened);
  // Let it grow, then the player builds a station nearby and does nothing else.
  town(); days(200,{police:false});
  const o=organisations()[0]; const stage=o?.stage||0, hadBoss=!!o?.boss, hadFronts=(o?.fronts||[]).length;
  check('there is something to look into',!!o&&stage>=FRONT_STAGE&&hadFronts>=1,stage+' / '+hadFronts+' fronts');
  // Within the police's reach, but not so close that the slice 4 proximity
  // decline does the work before a case can: what weakens it here is the case.
  check('fixture: a station arrives within reach, but not next door',place('policeStation',66,36)&&(()=>{ recompute(); invalidateDistricts(); const dist=Math.max(Math.abs(66-district().cx),Math.abs(36-district().cy)); return dist<=NOTICE_REACH&&dist>8; })(),JSON.stringify([district().cx,district().cy]));
  recompute(); invalidateDistricts();
  S.diagnostics.investigationsOpened=0; S.diagnostics.raids=0; S.diagnostics.casesMade=0; S.diagnostics.casesDropped=0;
    let seenCard=false, seenBusiness=false, seenHall=false;
  for(let d=0;d<160&&(S.diagnostics.raids||0)===0;d++){
    days(1);
    if(o.investigation){
      seenCard=seenCard||/Looking into/.test(describe(66,36))&&investigating(S.grid[idx(66,36)])===o;
      const f=frontsOf(o)[0]; if(f) seenBusiness=seenBusiness||/asking questions/.test(describe(f.x,f.y));
      if(place('cityHall',40,38)){ S.pick={x:40,y:38}; renderCityHall(); seenHall=seenHall||/looking into it/.test(document.getElementById('look-body').innerHTML); S.pick=null; }
    }
  }
  check('the police opened a case on their own',(S.diagnostics.investigationsOpened||0)>=1,S.diagnostics.investigationsOpened);
  check('the station card said what it was looking into, while it was',seenCard);
  check('the front card said the police were asking, while they were',seenBusiness);
  check('City Hall reported the case without owning it',seenHall);
  check('the Chronicle records the case being opened',notes.some(t=>t==='The police began looking into the '+o.name));
  check('and the police acted',(S.diagnostics.raids||0)>=1);
  const raid=S.incidents.find(i=>i.tag==='raid');
  check('a raid went out through the ordinary dispatcher, tagged as the police\'s own',!!raid&&raid.kind==='crime'&&raid.target&&FRONT_TYPES[raid.target.type],raid?.status);
  check('a raid does not count as a crime nobody resolved',recomputeDistricts()[0].measured.unresolvedCrime===1);
  // Keep going until a case is made, then see what it did.
  for(let d=0;d<240&&(S.diagnostics.casesMade||0)===0&&organisations().includes(o);d++) days(1);
  const after=organisations().find(x=>x.id===o.id);
  check('a case was made in time',(S.diagnostics.casesMade||0)>=1,S.diagnostics.casesMade+' made / '+S.diagnostics.casesDropped+' dropped');
  check('and the organisation is weaker for it: gone, a stage down, boss taken or front closed',!after||after.stage<stage||(hadBoss&&!after.boss)||(after.fronts||[]).length<hadFronts,after?after.stage+' boss '+!!after.boss+' fronts '+after.fronts.length:'gone');
  check('the Chronicle says who was taken in or what was closed',notes.some(t=>/ was taken in for questioning$/.test(t)||/^The police closed the /.test(t)||/broke up after the police/.test(t)));
  check('the café that was a front is still a café',businesses().length===5&&businesses().every(b=>FRONT_TYPES[b.type]));
  check('nobody was removed from the valley',families().every(f=>familyMembers(f).length>=1));
}

/* ---------- not per frame ---------- */
{
  town(); S.diagnostics.enforcementEvaluations=0;
  for(let i=0;i<20;i++) advanceEnforcement(ORG_INTERVAL/40);
  check('small steps below the interval do not evaluate',S.diagnostics.enforcementEvaluations===0);
  advanceEnforcement(ORG_INTERVAL);
  check('crossing the interval evaluates exactly once',S.diagnostics.enforcementEvaluations===1);
}

/* ---------- save V3 ---------- */
{
  town(); days(240,{police:false});
  const o=organisations()[0];
  if(o){ o.investigation={since:S.day,progress:0.4,station:12345}; o.taken=[o.families[0]*8+1]; o.pressure=1; }
  const before=JSON.stringify(organisations());
  const social={...JSON.parse(JSON.stringify(packFamilies())),...JSON.parse(JSON.stringify(packOrganisations()))};
  restoreFamilies(social); restoreOrganisations(social);
  check('bosses, fronts, cases and pressure survive save and load exactly',JSON.stringify(organisations())===before);
  const fam=families()[0]?.id;
  restoreOrganisations({nextOrgId:2,organisations:[
    {id:1,type:'streetCrew',name:'X Crew',roots:'X',founded:1,stage:4,families:[fam],boss:{familyId:999,index:0},fronts:[0,'abc',77],pressure:99},
    {id:2,type:'streetCrew',name:'Y Crew',roots:'Y',founded:1,stage:4,families:[fam],boss:{familyId:fam,index:1},fronts:[]}]});
  const [a,b]=organisations();
  check('a boss from a family that does not exist is not a boss',a&&a.boss===null);
  check('a boss from an involved family is kept',b&&b.boss&&b.boss.familyId===fam&&b.boss.index===1);
  check('front seeds are cleaned to positive integers',a&&a.fronts.length===1&&a.fronts[0]===77,JSON.stringify(a?.fronts));
  check('pressure is bounded',a&&a.pressure<=6);
}

const failed=checks.filter(c=>!c.pass);
document.getElementById('results').textContent=JSON.stringify({pass:!failed.length,checks},null,2);
document.documentElement.dataset.result=failed.length?'fail':'pass';
