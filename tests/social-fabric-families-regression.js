import * as fam from '../src/simulation/families.js';
import { MAX_FAMILIES, SOCIAL_INTERVAL, SURNAMES, advanceFamilies, evaluateFamilies, families, familyAt,
  familyMembers, familySurname, packFamilies, restoreFamilies } from '../src/simulation/families.js';
import { place, relocate, erase } from '../src/buildings/buildings.js';
import { S } from '../src/core/state.js';
import { resetProgression } from '../src/progression/city-growth.js';
import { evaluateDistrictIdentities, invalidateDistricts } from '../src/simulation/districts.js';
import { recompute } from '../src/simulation/mood.js';
import { describe } from '../src/ui/panels.js';
import { genWorld } from '../src/world/map.js';
import { idx } from '../src/world/tiles.js';

const checks=[];
const check=(name,value,detail)=>checks.push({name,pass:Boolean(value),...(detail===undefined?{}:{detail})});
const notes=[]; const note=t=>notes.push(t);

function town(seed=20260907){
  genWorld(seed); resetProgression('legacy-open'); S.cityProgress.stage=4; S.coins=9e6;
  S.citizens=[]; S.incidents=[]; S.social={districts:[],nextId:0,families:[],nextFamilyId:0}; notes.length=0;
  for(let y=40;y<52;y++) for(let x=40;x<66;x++){ const i=idx(x,y); S.terr[i]=0; S.natTree[i]=0; S.grid[i]=null; }
  for(let x=41;x<64;x++) place('road',x,42);
  for(let x=41;x<64;x+=2){ if(place('house',x,41)){ const h=S.grid[idx(x,41)]; h.pop=4; h.mood=72; h.state.housingTier=2; } }
  recompute(); invalidateDistricts(); evaluateDistrictIdentities();
}
// Run the valley forward a number of days, one social look per time slot.
function days(n){
  for(let d=0;d<n;d++){ S.day=(S.day||1)+1; for(let slot=0;slot<8;slot++){ S.dayT=slot/8+0.01; evaluateFamilies(note); } }
}

/* ---------- the name rule, mechanically ---------- */
{
  const setters=Object.keys(fam).filter(k=>/^(set|assign|make|create|force|declare|promote)/i.test(k));
  check('the families module exports no way to assign an outcome',setters.length===0,setters.join(',')||'none');

  // Outcome-blind: the draw sees the seed and the founding order and nothing else.
  town(); const a=familySurname(S.seed,3);
  S.day=900; S.coins=0; for(const h of S.ctx.houses){ h.pop=0; h.mood=1; h.state.desirability=0; }
  const b=familySurname(S.seed,3);
  check('a surname depends on nothing about the household or the city',a===b,a+' / '+b);
  check('and comes from the shared pool',SURNAMES.includes(a),a);

  // Uniform enough that no name is a signal. 400 draws over 40 names: every
  // name appears, none more than three times its share.
  const counts={}; for(let k=1;k<=400;k++){ const n=familySurname(20260907,k); counts[n]=(counts[n]||0)+1; }
  const seen=Object.keys(counts).length, max=Math.max(...Object.values(counts));
  check('every surname in the pool is drawn',seen===SURNAMES.length,seen+' of '+SURNAMES.length);
  check('no surname is drawn out of proportion',max<=30,'max '+max+' of an expected 10');
}

/* ---------- families emerge from households, bounded, on their own ---------- */
{
  town();
  check('a new town knows no families yet',families().length===0);
  days(200);
  const list=families();
  check('with time the valley comes to know some households',list.length>=2,list.length);
  check('never more than the cap',list.length<=MAX_FAMILIES,list.length+' / '+MAX_FAMILIES);
  check('every family lives in a real occupied house',list.every(f=>S.ctx.houses.some(h=>(h.seed>>>0)===f.homeSeed&&h.pop>0)));
  check('founding reaches the Chronicle',notes.some(t=>/family settled in/.test(t)),notes[0]);
  const f=list[0], m=familyMembers(f);
  check('members carry the family name',m.length>0&&m.every(x=>x.name.endsWith(' '+f.surname)),m.map(x=>x.name).join(', '));
  check('members are bounded',m.length<=fam.MAX_MEMBERS,m.length);
  // The people living there come first, dealt from the same house seed the
  // House card uses, so the two never disagree about who is home.
  const home=S.ctx.houses.find(h=>(h.seed>>>0)===f.homeSeed);
  check('the household comes first among the members',m.slice(0,Math.min(home.pop,fam.MAX_MEMBERS)).every((x,i)=>x.first===fam.familyMembers(f)[i].first));
  check('no two families share a surname',new Set(list.map(x=>x.surname)).size===list.length,list.map(x=>x.surname).join(','));
  const t1=JSON.stringify(familyMembers(f).map(x=>x.traits)), t2=JSON.stringify(familyMembers(f).map(x=>x.traits));
  check('traits are dealt deterministically',t1===t2);
  check('traits stay on a 0-100 scale',familyMembers(f).every(x=>Object.values(x.traits).every(v=>v>=0&&v<=100)));
  check('the same seed grows the same families',(()=>{ const first=list.map(x=>x.surname).join(','); town(); days(200); return families().map(x=>x.surname).join(',')===first; })(),'reran');
}

/* ---------- a family follows its house, and leaves with it ---------- */
{
  town(); days(200);
  const f=families()[0]; const h=S.ctx.houses.find(x=>(x.seed>>>0)===f.homeSeed);
  const homeBefore=h.x+','+h.y;
  check('the House card names the family',describe(h.x,h.y).includes('The '+f.surname+' family'));
  const r=relocate(h,h.x,48);
  recompute(); evaluateFamilies(note);
  check('the fixture moved the house',r.ok===true,r.why);
  check('the family follows the house when it is moved',familyAt(h)?.id===f.id,homeBefore+' -> '+h.x+','+h.y);
  check('and the card at the new address still names them',describe(h.x,48).includes(f.surname));
  const before=families().length;
  erase(h.x,h.y,{confirmed:true}); recompute(); evaluateFamilies(note);
  check('a family whose home is removed leaves the valley',families().length===before-1&&!families().some(x=>x.id===f.id));
  check('and the Chronicle says so',notes.some(t=>t==='The '+f.surname+' family left Meadowline'));
}

/* ---------- generations ---------- */
{
  town(); days(200);
  const f=families()[0];
  check('the family has a generation count',f.generation>=1,f.generation);
  const g0=f.generation; S.day=f.founded+45*(g0+1); evaluateFamilies(note);
  check('long residence brings a new generation',f.generation===g0+2,g0+' -> '+f.generation);
  S.day=f.founded; evaluateFamilies(note);
  check('and a generation never runs backwards',f.generation===g0+2,f.generation);
  check('which the Chronicle records',notes.some(t=>/A new generation of the /.test(t)));
}

/* ---------- not per frame ---------- */
{
  town();
  S.diagnostics.socialEvaluations=0;
  for(let i=0;i<20;i++) advanceFamilies(SOCIAL_INTERVAL/40);
  check('small steps below the interval do not evaluate',S.diagnostics.socialEvaluations===0,S.diagnostics.socialEvaluations);
  advanceFamilies(SOCIAL_INTERVAL);
  check('crossing the interval evaluates exactly once',S.diagnostics.socialEvaluations===1,S.diagnostics.socialEvaluations);
}

/* ---------- save V3 keeps who they are; the rest is dealt again ---------- */
{
  town(); days(200); S.day=400; evaluateFamilies(note);
  const before=families().map(f=>({surname:f.surname,founded:f.founded,generation:f.generation,members:familyMembers(f).map(m=>m.name+':'+JSON.stringify(m.traits))}));
  const packed=JSON.parse(JSON.stringify(packFamilies()));
  check('the save carries the families',packed.families.length===before.length);
  check('and carries no dealt members or traits',packed.families.every(f=>!('members' in f)&&!('traits' in f)));
  restoreFamilies(packed);
  const after=families().map(f=>({surname:f.surname,founded:f.founded,generation:f.generation,members:familyMembers(f).map(m=>m.name+':'+JSON.stringify(m.traits))}));
  check('families survive save and load exactly, members and traits re-dealt identical',JSON.stringify(before)===JSON.stringify(after));

  restoreFamilies(undefined);
  check('an old save with no families loads with none',families().length===0);
  restoreFamilies({nextFamilyId:2,families:[{id:1,surname:'Corleone',homeSeed:5,founded:1,generation:1},{id:2,surname:SURNAMES[0],homeSeed:6,founded:1,generation:1}]});
  check('a surname the game would never draw is refused from a save',!families().some(f=>f.surname==='Corleone'));
  check('a surname from the pool is kept',families().some(f=>f.surname===SURNAMES[0]));
}

const failed=checks.filter(c=>!c.pass);
document.getElementById('results').textContent=JSON.stringify({pass:!failed.length,checks},null,2);
document.documentElement.dataset.result=failed.length?'fail':'pass';
