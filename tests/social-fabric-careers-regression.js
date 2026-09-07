import * as car from '../src/simulation/careers.js';
import { CAREERS, LOOKING, STANDINGS, advanceCareers, careerSnapshot, evaluateCareers, familyStanding, familyTrades,
  memberCareer, packCareers, restoreCareers, sanitiseFamilyCareers } from '../src/simulation/careers.js';
import { SOCIAL_INTERVAL, evaluateFamilies, families, familyMembers, packFamilies, restoreFamilies } from '../src/simulation/families.js';
import { erase, place } from '../src/buildings/buildings.js';
import { S } from '../src/core/state.js';
import { resetProgression } from '../src/progression/city-growth.js';
import { evaluateDistrictIdentities, invalidateDistricts } from '../src/simulation/districts.js';
import { recompute } from '../src/simulation/mood.js';
import { describe } from '../src/ui/panels.js';
import { genWorld } from '../src/world/map.js';
import { idx } from '../src/world/tiles.js';
import { getBuildingDefinition } from '../src/buildings/registry.js';

const checks=[];
const check=(name,value,detail)=>checks.push({name,pass:Boolean(value),...(detail===undefined?{}:{detail})});
const notes=[]; const note=t=>notes.push(t);

/* One street of homes; the workplaces vary per scene so a career can only come
   from what is actually standing nearby. */
function town(seed=20260907,fill={}){
  genWorld(seed); resetProgression('legacy-open'); S.cityProgress.stage=4; S.coins=9e6;
  S.citizens=[]; S.incidents=[]; S.social={districts:[],nextId:0,families:[],nextFamilyId:0,firsts:{}}; notes.length=0;
  for(let y=38;y<54;y++) for(let x=38;x<70;x++){ const i=idx(x,y); S.terr[i]=0; S.natTree[i]=0; S.grid[i]=null; }
  for(let x=39;x<68;x++) place('road',x,42);
  for(let x=41;x<64;x+=2){ if(place('house',x,41)){ const h=S.grid[idx(x,41)]; h.pop=4; h.mood=72;
    h.state.housingTier=fill.tier??2; h.state.education=fill.education??30; h.state.desirability=fill.desirability??50; } }
  recompute(); invalidateDistricts(); evaluateDistrictIdentities();
}
function settle(){ recompute(); invalidateDistricts(); }
function days(n){ for(let d=0;d<n;d++){ S.day=(S.day||1)+1; for(let s=0;s<8;s++){ S.dayT=s/8+0.01; evaluateFamilies(note); evaluateCareers(note); } } }
const allCareers=()=>families().flatMap(f=>Object.values(f.careers||{}));
const held=()=>allCareers().filter(c=>c!==LOOKING);

/* ---------- no way in from outside ---------- */
{
  const setters=Object.keys(car).filter(k=>/^(set|assign|make|create|force|declare|promote|give)/i.test(k));
  check('the careers module exports no way to assign an outcome',setters.length===0,setters.join(',')||'none');
  check('every career is a job at a real building type',Object.values(CAREERS).every(c=>Array.isArray(c.at)&&c.at.length>0));
  check('only the jobs that genuinely need schooling carry an education gate',
    Object.entries(CAREERS).filter(([,c])=>c.edu).map(([k])=>k).sort().join(',')==='doctor,teacher');
}

/* ---------- a career comes from a workplace within reach, or it is nothing ---------- */
{
  town(); days(80);
  check('with no workplaces standing, everyone is looking for work',families().length>0&&held().length===0,allCareers().join(','));
  // A farm belt appears next door. Farming is now a thing a person can do.
  for(let y=44;y<50;y+=3) for(let x=41;x<60;x+=3) place('farm',x,y);
  settle(); days(6);
  check('when farms are built, farmers appear',held().includes('farmer'),held().join(','));
  check('and nobody has a job there is no building for',held().every(c=>c==='farmer'),held().join(','));
  const firstLine=notes.find(t=>/first farmer/.test(t));
  check('the first of a trade reaches the Chronicle, by name',!!firstLine,firstLine);
  check('and is recorded exactly once',notes.filter(t=>/first farmer/.test(t)).length===1);
}

/* ---------- education gates the jobs that need it, and only those ---------- */
{
  town(20260907,{education:10}); place('clinic',50,44); place('school',56,44); settle(); days(80);
  check('a household with little schooling holds no doctor or teacher',!held().some(c=>c==='doctor'||c==='teacher'),held().join(','));
  check('but its people still work where they can',held().some(c=>c==='nurse'),held().join(','));
  town(20260907,{education:80}); place('clinic',50,44); place('school',56,44); settle(); days(80);
  check('a well-schooled household can hold a doctor or a teacher',held().some(c=>c==='doctor'||c==='teacher'),held().join(','));
  // The anti-stereotype rule the brief names outright: farmers are not the uneducated.
  town(20260907,{education:90}); for(let y=44;y<50;y+=3) for(let x=41;x<60;x+=3) place('farm',x,y); settle(); days(80);
  check('a highly educated household farms when farming is what there is',held().includes('farmer'),held().join(','));
}

/* ---------- careers evolve; they are not dealt once ---------- */
{
  town(); for(let y=44;y<50;y+=3) for(let x=41;x<60;x+=3) place('farm',x,y); settle(); days(80);
  const farmers=held().filter(c=>c==='farmer').length;
  check('the fixture has farmers to lose',farmers>0,farmers);
  for(let y=44;y<50;y+=3) for(let x=41;x<60;x+=3){ const b=S.grid[idx(x,y)]; if(b?.type==='farm') erase(x,y,{confirmed:true}); }
  settle(); days(3);
  check('when the farms go, the farmers are no longer farmers',!held().includes('farmer'),held().join(','));
  place('bakery',50,44); place('bakery',54,44); settle(); days(6);
  check('and take up what replaces them',held().includes('baker'),held().join(','));
}

/* ---------- standing reads conditions, never careers; and it moves both ways ---------- */
{
  town(20260907,{tier:1,education:5,desirability:15}); days(60);
  const f=families()[0]; const h=S.ctx.houses.find(x=>(x.seed>>>0)===f.homeSeed);
  check('a modest household reads as struggling or working class',['struggling','working class'].includes(familyStanding(f)),familyStanding(f));
  h.state.housingTier=3; h.state.education=90; h.state.desirability=92; for(const g of S.ctx.houses){} settle(); days(2);
  check('as the household prospers its standing rises',['affluent','elite'].includes(familyStanding(f)),familyStanding(f));
  check('and the Chronicle records the rise',notes.some(t=>t.startsWith('The '+f.surname+' family rose to')),notes.filter(t=>t.includes(f.surname)).join(' | '));
  h.state.housingTier=1; h.state.education=5; h.state.desirability=15; settle(); days(2);
  check('and falls again when it does not',['struggling','working class'].includes(familyStanding(f)),familyStanding(f));
  check('which the Chronicle also records',notes.some(t=>t.startsWith('The '+f.surname+' family slipped to')));
  // Same circumstances, different trades: the same standing. The household is
  // held exactly still and only the names of the jobs change, because that is
  // the rule - standing reads conditions, including whether people are in
  // work, and never which work it is.
  town(20260907,{tier:2,education:70,desirability:60}); days(60);
  const same=families()[0]; const seats=familyMembers(same).map(m=>m.index);
  same.careers=Object.fromEntries(seats.map(i=>[i,'farmer']));   const sFarm=familyStanding(same);
  same.careers=Object.fromEntries(seats.map(i=>[i,'doctor']));   const sDoc=familyStanding(same);
  same.careers=Object.fromEntries(seats.map(i=>[i,'dockWorker']));const sDock=familyStanding(same);
  check('a farming family, a medical family and a dock family in the same circumstances stand the same',
    sFarm===sDoc&&sDoc===sDock,sFarm+' / '+sDoc+' / '+sDock);
  same.careers=Object.fromEntries(seats.map(i=>[i,LOOKING]));      const sNone=familyStanding(same);
  check('but being out of work is a condition, and it shows',STANDINGS.indexOf(sNone)<=STANDINGS.indexOf(sFarm),sNone+' vs '+sFarm);
  check('every standing is one of the five plain labels',families().every(f=>STANDINGS.includes(familyStanding(f))));
}

/* ---------- seats are finite: a school does not employ more teachers than it has posts ---------- */
{
  town(20260907,{education:80}); place('school',50,44); settle(); days(80);
  const teachers=held().filter(c=>c==='teacher').length;
  const posts=getBuildingDefinition('school').jobs;
  check('a school employs no more teachers than its registry jobs allow',teachers<=posts,teachers+' teachers, '+posts+' posts');
}

/* ---------- the card ---------- */
{
  town(); for(let y=44;y<50;y+=3) for(let x=41;x<60;x+=3) place('farm',x,y); settle(); days(80);
  const f=families()[0]; const h=S.ctx.houses.find(x=>(x.seed>>>0)===f.homeSeed);
  const card=describe(h.x,h.y);
  check('the House card names a member’s trade',card.includes('farmer')||card.includes(LOOKING),card.slice(card.indexOf('family'),card.indexOf('family')+200));
  check('and the family’s standing',STANDINGS.some(s=>card.toLowerCase().includes(s)));
}

/* ---------- not per frame ---------- */
{
  town(); S.diagnostics.careerEvaluations=0;
  for(let i=0;i<20;i++) advanceCareers(SOCIAL_INTERVAL/40);
  check('small steps below the interval do not evaluate',S.diagnostics.careerEvaluations===0,S.diagnostics.careerEvaluations);
  advanceCareers(SOCIAL_INTERVAL);
  check('crossing the interval evaluates exactly once',S.diagnostics.careerEvaluations===1,S.diagnostics.careerEvaluations);
}

/* ---------- save V3 ---------- */
{
  town(); for(let y=44;y<50;y+=3) for(let x=41;x<60;x+=3) place('farm',x,y); place('school',56,44); settle(); days(80);
  const before=families().map(f=>f.surname+':'+JSON.stringify(f.careers)+':'+f.standing).join('|');
  const firstsBefore=JSON.stringify(packCareers().firsts);
  const social={...JSON.parse(JSON.stringify(packFamilies())),...JSON.parse(JSON.stringify(packCareers()))};
  restoreFamilies(social); restoreCareers(social); sanitiseFamilyCareers();
  const after=families().map(f=>f.surname+':'+JSON.stringify(f.careers)+':'+f.standing).join('|');
  check('careers and standing survive save and load',before===after);
  check('so do the town’s firsts',JSON.stringify(packCareers().firsts)===firstsBefore&&firstsBefore!=='{}');
  restoreCareers(undefined); sanitiseFamilyCareers();
  check('an old save with no careers loads with none recorded',Object.keys(packCareers().firsts).length===0);
  // An edited save cannot invent a trade or a class.
  families()[0].careers={0:'assassin',1:'farmer',9:'baker'}; families()[0].standing='aristocrat';
  sanitiseFamilyCareers();
  check('a career this game has no workplace for is refused from a save',!Object.values(families()[0].careers).includes('assassin'));
  check('a valid career is kept and an out-of-range seat dropped',families()[0].careers[1]==='farmer'&&!(9 in families()[0].careers));
  check('a standing not on the list is refused',families()[0].standing===undefined);
}

const failed=checks.filter(c=>!c.pass);
document.getElementById('results').textContent=JSON.stringify({pass:!failed.length,checks},null,2);
document.documentElement.dataset.result=failed.length?'fail':'pass';
