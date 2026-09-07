import * as fameMod from '../src/simulation/fame.js';
import { FAME_INTERVAL, MAX_FAME, STAGES, advanceFame, celebrities, evaluateFame, fame, fameOf, fameWord, gain, packFame, restoreFame, venueFame, venueOf } from '../src/simulation/fame.js';
import { CAREERS, PERFORMING, evaluateCareers, memberCareer } from '../src/simulation/careers.js';
import { SURNAMES, evaluateFamilies, families, familyMembers, packFamilies, restoreFamilies } from '../src/simulation/families.js';
import { IDENTITIES, districtIdentityCandidates, evaluateDistrictIdentities, invalidateDistricts, recomputeDistricts } from '../src/simulation/districts.js';
import { conditions } from '../src/simulation/organisations.js';
import { noticeChance } from '../src/simulation/enforcement.js';
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

/* One street of homes. Scenes add what stands along it: cafés and a green
   (somewhere to play and somewhere to gather), or nothing but money. */
function town(seed=20260907,opts={}){
  genWorld(seed); resetProgression('legacy-open'); S.cityProgress.stage=4; S.coins=9e6;
  S.citizens=[]; S.incidents=[]; S.serviceVehicles=[]; notes.length=0;
  S.social={districts:[],nextId:0,families:[],nextFamilyId:0,firsts:{},organisations:[],nextOrgId:0,orgMemory:{},fame:[]};
  for(let y=36;y<60;y++) for(let x=36;x<76;x++){ const i=idx(x,y); S.terr[i]=0; S.natTree[i]=0; S.grid[i]=null; }
  for(let x=39;x<70;x++) place('road',x,42);
  for(let x=40;x<70;x++){ if(place('house',x,41)){ const h=S.grid[idx(x,41)]; h.pop=5; h.mood=66; h.state.housingTier=opts.tier??2; h.state.desirability=opts.desirability??50; h.state.education=opts.education??35; } }
  if(opts.cafes) for(const x of [46,54,62]) check('fixture: café at '+x,place('cafe',x,43));
  if(opts.green) check('fixture: a green',place('picnicGreen',50,45));
  if(opts.lamps) for(const x of [44,50,56,62,68]) place('lamp',x,40);
  if(opts.farms) for(let x=40;x<=68;x+=4) place('farm',x,45);
  recompute(); invalidateDistricts(); evaluateDistrictIdentities();
}
function days(n){
  for(let d=0;d<n;d++){ S.day=(S.day||1)+1; for(let s=0;s<8;s++){ S.dayT=s/8+0.01; evaluateFamilies(note); evaluateCareers(note); if(s%2===0) evaluateFame(note); } }
}
const district=()=>recomputeDistricts()[0];
const performers=()=>families().flatMap(f=>Object.entries(f.careers||{}).filter(([,c])=>PERFORMING.includes(c)).map(([i])=>({f,index:Number(i)})));

/* ---------- nothing in from outside ---------- */
{
  const bad=/^(set|assign|make|create|force|declare|promote|found|spawn|crown|star|give|grant)/i;
  const setters=Object.keys(fameMod).filter(k=>bad.test(k));
  check('the fame module exports no way to make anyone famous',setters.length===0,setters.join(','));
  const listing=await (await fetch('../src/ui/')).text();
  const uiFiles=[...listing.matchAll(/href="([^"]+\.js)"/g)].map(m=>m[1]);
  const READ=new Set(['fameWord','venueFame','celebrities','fameOf','STAGES','fame']);
  const offending=[];
  for(const file of uiFiles){
    const res=await fetch('../src/ui/'+file); if(!res.ok) continue;
    for(const m of (await res.text()).matchAll(/import\s*\{([^}]*)\}\s*from\s*'\.\.\/simulation\/fame\.js'/g))
      for(const name of m[1].split(',').map(x=>x.trim()).filter(Boolean)) if(!READ.has(name)) offending.push(file+':'+name);
  }
  check('the UI imports only readings from fame',offending.length===0,offending.join(','));
  check('every performing trade is a real career at a real building',PERFORMING.every(c=>CAREERS[c]&&CAREERS[c].at.length));
  check('no performing trade carries an education gate',PERFORMING.every(c=>!CAREERS[c].edu));
  // The culture tilt in careers points only at what a place should be known for.
  const careersSrc=await (await fetch('../src/simulation/careers.js')).text();
  const cultureLine=careersSrc.split('\n').find(l=>/^const CULTURE=/.test(l))||'';
  check('the culture tilt names no criminal or struggling identity',cultureLine.length>0&&!/criminal|stronghold|struggling/i.test(cultureLine),cultureLine.slice(0,120));
}

/* ---------- what fame reads, and does not ---------- */
{
  const src=String(gain);
  check('renown reads talent, crowd and occasion only',!/desirab|housingTier|standing|education|surname|SURNAMES|organisation|boss|stage/i.test(src),src.slice(0,80));
  check('more talent, more renown',gain({creativity:90,charisma:90},1,false)>gain({creativity:20,charisma:20},1,false));
  check('no crowd, no renown',gain({creativity:90,charisma:90},0,false)===0);
  check('a festival is worth three ordinary days',Math.abs(gain({creativity:60,charisma:60},1,true)/gain({creativity:60,charisma:60},1,false)-3)<1e-9);
  check('organisations read nothing about fame or culture',!/fame|renown|perform|celebr|entertain|identit/i.test(String(conditions)));
  check('the police read nothing about fame or culture',!/fame|renown|perform|celebr|entertain/i.test(String(noticeChance)));
}

/* ---------- an affluent street with nowhere to play stays quiet ---------- */
{
  town(20260907,{tier:3,desirability:88,education:75,lamps:true}); days(240);
  check('the richest, best-schooled street in the valley, with nowhere to perform, produces nobody famous',fame().length===0&&performers().length===0,fame().length+' / '+performers().length);
  const ids=districtIdentityCandidates(district().measured).map(i=>i.id);
  check('and is not an entertainment district for being rich',!ids.includes('entertainment')&&!ids.includes('nightlife'),ids.join(','));
}

/* ---------- a café street with a green grows a name ---------- */
{
  town(20260907,{cafes:true,green:true}); days(240);
  check('cafés on a street make musicians of some of the people on it',performers().length>=1,performers().length);
  check('every performer holds a performing career at a building that stands',performers().every(p=>venueOf(p.f,p.index)&&CAREERS[p.f.careers[p.index]].at.includes(venueOf(p.f,p.index).type)));
  const stars=celebrities();
  check('someone became locally famous or better',stars.length>=1,fame().map(r=>r.renown.toFixed(2)).join(','));
  const star=stars[0];
  check('the celebrity is a real member of a real family, by name',!!star&&familyMembers(star.family).some(m=>m.name===star.name),star?.name);
  check('and holds a performing career, not a title',!!star&&PERFORMING.includes(star.family.careers[star.index]),star&&memberCareer(star.family,star.index));
  check('the Chronicle followed the rise',notes.some(t=>/ is getting known around /.test(t))&&notes.some(t=>/^Local .* became locally famous$/.test(t)));
  check('the first to be known across the valley is recorded as such, once',(()=>{ const l=notes.filter(t=>/first widely known performer/.test(t)); return l.length<=1&&(l.length===1)===fame().some(r=>r.renown>=3); })(),notes.filter(t=>/widely known|across the valley/.test(t)).join(' | '));
  check('renown stays on the ladder and inside its bound',fame().every(r=>r.renown>=0&&r.renown<=3)&&fame().length<=MAX_FAME);
  const m=district().measured;
  check('the district counts its performers and celebrities',m.performers>=1&&m.celebrities>=1,m.performers+' / '+m.celebrities);
  const ids=districtIdentityCandidates(m).map(i=>i.id);
  check('Entertainment becomes a reading the district can hold',ids.includes('entertainment'),ids.join(','));
  // What the player is shown.
  if(star){
    const home=S.ctx.houses.find(h=>(h.seed>>>0)===(star.family.homeSeed>>>0));
    const card=describe(home.x,home.y);
    check('the House card says the word beside the person',card.includes(star.name)&&card.includes(fameWord(star.family,star.index)),fameWord(star.family,star.index));
    const venue=venueOf(star.family,star.index);
    check('the venue card knows who it is known for',/Known (locally|across the valley) for <b>/.test(describe(venue.x,venue.y))&&describe(venue.x,venue.y).includes(star.name));
    check('and the venue is still a business card',/Jobs filled/.test(describe(venue.x,venue.y)));
    check('fixture: a City Hall',place('cityHall',40,38)); S.pick={x:40,y:38}; renderCityHall(); const hall=document.getElementById('look-body').innerHTML; S.pick=null;
    check('City Hall lists the names the valley knows',hall.includes('Names the valley knows')&&hall.includes(star.name));
    check('and offers no button about any of it',!/[Cc]reate (a )?celebr|[Mm]ake .*famous|[Pp]romote/.test(hall));
  }
  // Same seed, same story.
  const story=fame().map(r=>r.familyId+':'+r.index+':'+r.renown.toFixed(4)).join();
  town(20260907,{cafes:true,green:true}); days(240);
  check('the same seed grows the same names',fame().map(r=>r.familyId+':'+r.index+':'+r.renown.toFixed(4)).join()===story);
}

/* ---------- fame is reversible ---------- */
{
  town(20260907,{cafes:true,green:true}); days(240);
  const had=fame().length; const star=celebrities()[0];
  check('there is fame to lose',had>=1&&!!star);
  for(const x of [46,54,62]) erase(x,43);
  recompute(); invalidateDistricts(); days(80);
  check('with the cafés gone the musicians are out of work',performers().length===0,performers().length);
  check('and the names fade',fame().length===0,fame().map(r=>r.renown.toFixed(2)).join(','));
  check('the Chronicle says so',notes.some(t=>/ faded from view$/.test(t)));
  check('Entertainment is no longer a reading the district can hold',!districtIdentityCandidates(district().measured).map(i=>i.id).includes('entertainment'));
}

/* ---------- the quiet town with no cafés: nothing ---------- */
{
  town(20260907,{farms:true}); days(160);
  check('a farm belt with no venue grows no performer',performers().length===0&&fame().length===0);
}

/* ---------- who becomes famous: leanings and a crowd, never a name ---------- */
{
  const names={};
  for(const seed of [5,19,31,47,53,71]){ town(seed,{cafes:true,green:true}); days(200); for(const c of celebrities()) names[c.family.surname]=(names[c.family.surname]||0)+1; }
  const counts=Object.values(names), total=counts.reduce((a,b)=>a+b,0);
  check('names were made across the seeded towns',total>=3,total);
  check('no surname dominates the famous',(counts.length?Math.max(...counts):0)<=Math.max(2,Math.ceil(total*0.4)),JSON.stringify(names));
  check('every famous surname is a pool name drawn like any other',Object.keys(names).every(n=>SURNAMES.includes(n)));
}

/* ---------- not per frame ---------- */
{
  town(); S.diagnostics.fameEvaluations=0;
  for(let i=0;i<20;i++) advanceFame(FAME_INTERVAL/40);
  check('small steps below the interval do not evaluate',S.diagnostics.fameEvaluations===0);
  advanceFame(FAME_INTERVAL);
  check('crossing the interval evaluates exactly once',S.diagnostics.fameEvaluations===1);
}

/* ---------- save V3 ---------- */
{
  town(20260907,{cafes:true,green:true}); days(200);
  const before=JSON.stringify(fame().map(({lastFestival,...r})=>r));
  const social={...JSON.parse(JSON.stringify(packFamilies())),...JSON.parse(JSON.stringify(packFame()))};
  restoreFamilies(social); restoreFame(social);
  check('fame survives save and load exactly',JSON.stringify(fame())===before);
  restoreFame(undefined);
  check('an old save with none loads with none',fame().length===0);
  const fid=families()[0]?.id;
  restoreFame({fame:[
    {familyId:999,index:0,renown:2,career:'musician',since:1},
    {familyId:fid,index:9,renown:2,career:'musician',since:1},
    {familyId:fid,index:0,renown:2,career:'farmer',since:1},
    {familyId:fid,index:1,renown:99,career:'musician',since:1}]});
  check('a name from a family that does not exist is refused',!fame().some(r=>r.familyId===999));
  check('a seat past the member cap is refused',!fame().some(r=>r.index===9));
  check('a farmer cannot be loaded as famous for farming',!fame().some(r=>r.career==='farmer'));
  check('renown is clamped to the ladder',fame().length===1&&fame()[0].renown===3,JSON.stringify(fame()));
}

const failed=checks.filter(c=>!c.pass);
document.getElementById('results').textContent=JSON.stringify({pass:!failed.length,checks},null,2);
document.documentElement.dataset.result=failed.length?'fail':'pass';
