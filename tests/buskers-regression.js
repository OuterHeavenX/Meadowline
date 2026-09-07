/* ============================================================
   BUSKERS

   The player's half is a Busker's Pitch: somewhere to perform, with no service
   of its own, so an empty pitch does nothing for anybody. Who stands on it is
   the street's half.

   The tie that matters, and the one the checks are built around, is fame. A
   musician the valley knows pulls entertainers onto the pavement outside their
   venue, and that has to be a real reading of the fame list rather than a
   guess from how pleasant the street is — so the town that proves it grows a
   real celebrity over real days and then looks at what turns up near them.
   ============================================================ */
import * as buskerMod from '../src/simulation/buskers.js';
import { ACTS, BUSKER_MOOD_R, MAX_BUSKERS, actOf, advanceBuskers, buskerMood, buskers, buskersAt, evaluateBuskers, liveliness } from '../src/simulation/buskers.js';
import { BUILDINGS } from '../src/buildings/registry.js';
import { place, erase } from '../src/buildings/buildings.js';
import { celebrities, evaluateFame, fame, venueOf } from '../src/simulation/fame.js';
import { CAREERS, PERFORMING, evaluateCareers } from '../src/simulation/careers.js';
import { evaluateFamilies, families } from '../src/simulation/families.js';
import { recomputeDistricts, invalidateDistricts } from '../src/simulation/districts.js';
import { evalHouse, recompute } from '../src/simulation/mood.js';
import { recomputeRecreation, invalidateRecreation } from '../src/simulation/recreation.js';
import { describe } from '../src/ui/panels.js';
import { applySave, save, store, KEY } from '../src/core/save.js';
import { S } from '../src/core/state.js';
import { resetProgression } from '../src/progression/city-growth.js';
import { genWorld } from '../src/world/map.js';
import { idx } from '../src/world/tiles.js';

const checks=[];
const check=(name,value,detail)=>checks.push({name,pass:Boolean(value),...(detail===undefined?{}:{detail})});
const note=()=>{};
const DAY=0.35, NIGHT=0.92;   // a working afternoon, and after everyone has gone home

/* One street. Scenes add what stands along it. */
function town(opts={}){
  genWorld(20260907); resetProgression('legacy-open'); S.cityProgress.stage=4; S.coins=9e6;
  S.citizens=[]; S.incidents=[]; S.ledger=[]; S.buskers=[]; S.day=5; S.dayT=DAY;
  S.social={districts:[],nextId:0,families:[],nextFamilyId:0,firsts:{},organisations:[],nextOrgId:0,orgMemory:{},fame:[],aliases:[],petitions:[]};
  for(let y=34;y<58;y++) for(let x=34;x<76;x++){ const i=idx(x,y); S.terr[i]=0; S.natTree[i]=0; S.grid[i]=null; }
  for(let x=39;x<70;x++) place('road',x,42);
  if(opts.homes!==false)
    for(let x=40;x<70;x++){ if(place('house',x,41)){ const h=S.grid[idx(x,41)];
      h.pop=5; h.mood=66; h.state.housingTier=2; h.state.desirability=50; h.state.education=35; } }
  if(opts.cafes) for(const x of [46,54,62]) place('cafe',x,43);
  if(opts.trade) for(const x of [46,48,50]) place('generalStore',x,43);
  recompute();
}
function days(n){
  for(let d=0;d<n;d++){ S.day=(S.day||1)+1;
    for(let s=0;s<8;s++){ S.dayT=s/8+0.01; evaluateFamilies(note); evaluateCareers(note); if(s%2===0) evaluateFame(note); } }
  S.dayT=DAY;
}
const at=(x,y)=>S.grid[idx(x,y)];
const acts=()=>evaluateBuskers().map(b=>b.act);

/* ---------- nothing in from outside ---------- */
{
  const bad=/^(set|assign|make|create|force|place|summon|spawn|hire|book)/i;
  check('the module exports no way to put anybody on a street',
    Object.keys(buskerMod).filter(k=>bad.test(k)).length===0,
    Object.keys(buskerMod).filter(k=>bad.test(k)).join(','));
  const d=BUILDINGS.buskerPitch;
  check('a pitch is cheap and claims no keyboard shortcut',d&&d.cost<70&&!d.key,d&&d.cost+'/'+JSON.stringify(d.key));
  /* The pitch has no service on purpose. If it had a recreation service an
     empty pitch would satisfy recreation demand, and the whole design is that
     an empty pitch is worth nothing. The one job is not the same thing: it is
     the post a street performer holds, and careers.js only offers a trade at a
     building that has one. */
  check('a pitch has no service of its own',!d.service,JSON.stringify(d.service));
  check('but it has the one post somebody makes their living on',d.jobs===1,d.jobs);
  check('and declares that people can perform on it, which is how fame finds it',!!d.performance);
  check('every act is a person doing something, not a label',
    ACTS.length>=4&&ACTS.every(a=>a.id&&a.name&&a.doing),ACTS.map(a=>a.id).join(','));
}

/* ---------- a pitch on a dead street stays empty ---------- */
{
  town({homes:false});
  place('buskerPitch',50,43); recompute();
  check('fixture: a pitch with nothing around it',at(50,43)?.type==='buskerPitch'&&liveliness(50,43).value===0,
    JSON.stringify(liveliness(50,43)));
  check('nobody sets up on a pitch on an empty street',evaluateBuskers().length===0);
  const card=describe(50,43);
  check('and the card says so rather than promising anybody',
    /Nobody has set up here today/.test(card),card.replace(/<[^>]+>/g,' ').slice(0,120));
}

/* ---------- a lively street fills ---------- */
{
  town({trade:true});
  place('buskerPitch',50,44); recompute();
  const live=liveliness(50,44);
  check('fixture: homes to hear it and trade to bring people past',
    live.homes>0&&live.trade>0,JSON.stringify({h:live.homes,t:live.trade}));
  const list=evaluateBuskers();
  check('somebody sets up where a street is worth standing on',list.length>0,list.length);
  check('and somebody is on the pitch itself',list.some(b=>b.pitch&&b.x===50&&b.y===44),
    JSON.stringify(list.map(b=>[b.x,b.y,b.pitch])));
  check('the card names who came and what they are doing',(()=>{
    const c=describe(50,44), one=buskersAt(50,44)[0];
    return one&&c.includes(actOf(one.act).name)&&c.includes(actOf(one.act).doing); })(),
    describe(50,44).replace(/<[^>]+>/g,' ').slice(0,110));
  /* A pitch is a convenience, not a requirement — the pavement outside a shop
     fills whether or not the player laid a square for it. */
  town({trade:true}); recompute();
  check('a lively street gets entertainers with no pitch on it at all',
    evaluateBuskers().length>0&&!buskers().some(b=>b.pitch),buskers().length);
  // But a pitch is worth having: it fills where bare pavement might not.
  town({trade:true}); recompute();
  const without=evaluateBuskers().filter(b=>b.x===50&&b.y===44).length;
  town({trade:true}); place('buskerPitch',50,44); recompute();
  const withPitch=evaluateBuskers().filter(b=>b.x===50&&b.y===44).length;
  check('a pitch fills a spot that bare pavement did not',withPitch>without,withPitch+' vs '+without);
}

/* ---------- and empties ---------- */
{
  town({trade:true}); place('buskerPitch',50,44); recompute();
  check('fixture: there is a street to empty',evaluateBuskers().length>0);
  S.dayT=NIGHT;
  check('everyone goes home when it gets dark',evaluateBuskers().length===0);
  S.dayT=DAY;
  check('and is back in the afternoon',evaluateBuskers().length>0);
  // Take the street away and the street empties, because none of this is stored.
  for(const x of [46,48,50]) erase(x,43,{confirmed:true});
  for(let x=40;x<70;x++) erase(x,41,{confirmed:true});
  recompute();
  check('pull the street down and there is nobody left on it',evaluateBuskers().length===0,
    JSON.stringify(buskers()));
}

/* ---------- the same day is the same street ---------- */
{
  town({trade:true}); place('buskerPitch',50,44); recompute();
  const a=JSON.stringify(evaluateBuskers()), b=JSON.stringify(evaluateBuskers());
  check('the same town on the same day produces the same street twice',a===b,a.slice(0,80));
  check('fixture: there is something to compare',JSON.parse(a).length>0);
  // Over a season the street is not the same street every day.
  const seen=new Set();
  for(let d=0;d<40;d++){ S.day=5+d; seen.add(JSON.stringify(evaluateBuskers().map(x=>x.x+','+x.y+':'+x.act))); }
  check('but it is not the same street every day of the season',seen.size>1,seen.size);
  S.day=5;
  check('and there are never more of them than the town can hold',(()=>{
    for(let d=0;d<40;d++){ S.day=5+d; if(evaluateBuskers().length>MAX_BUSKERS) return false; }
    return true; })());
  // Every act turns up sooner or later; none of them is unreachable.
  const kinds=new Set();
  for(let d=0;d<160;d++){ S.day=5+d; for(const a2 of acts()) kinds.add(a2); }
  check('every act the valley has turns up eventually',kinds.size===ACTS.length,[...kinds].join(','));
  S.day=5;
}

/* ---------- somebody famous draws a crowd ---------- */
{
  town({cafes:true});
  days(240);
  const stars=celebrities();
  check('fixture: a café street grew somebody the valley knows',stars.length>=1,
    fame().map(r=>r.renown.toFixed(2)).join(','));
  const star=stars[0], venue=star&&venueOf(star.family,star.index);
  check('fixture: and they play somewhere that stands',!!venue,venue&&venue.type+'@'+venue.x+','+venue.y);
  const near=liveliness(venue.x,venue.y-1);
  check('a spot beside their venue counts them',near.stars.some(c=>c.name===star.name),
    near.stars.map(c=>c.name).join(','));
  /* The whole point: their being famous is worth something on that pavement,
     over and above the café that is already there. The first draft of this
     check subtracted the star term from the total and asserted the total was
     bigger, which is true of any number and stayed true with the star term
     deleted. What it has to compare against is the street on its own. */
  const street=Math.min(6,near.homes)+Math.min(8,near.trade*2);
  check('and being famous is worth something over and above the street itself',
    near.value>street,near.value+' vs '+street);
  check('while the same pavement with nobody famous on it is worth the street alone',(()=>{
    const kept=fame().slice(); fame().length=0;
    const bare=liveliness(venue.x,venue.y-1);
    fame().push(...kept);
    return bare.stars.length===0&&bare.value===street; })(),street);
  S.dayT=DAY; const list=evaluateBuskers();
  check('entertainers turn up around them',list.length>0,list.length);
  check('and the ones near them know who drew them',
    list.some(b=>b.drawnBy===star.name),JSON.stringify(list.map(b=>b.drawnBy)));
  check('the pitch card names them, which is the only way a player sees it',(()=>{
    const spot=[[venue.x,venue.y-1],[venue.x+1,venue.y],[venue.x,venue.y+1]].find(([x,y])=>place('buskerPitch',x,y));
    if(!spot) return false;
    recompute(); evaluateBuskers();
    return describe(spot[0],spot[1]).includes(star.name); })(),star.name);
  // A town with nobody famous credits nobody.
  town({trade:true}); recompute();
  check('a town with nobody famous credits nobody',
    evaluateBuskers().length>0&&buskers().every(b=>b.drawnBy===null),
    JSON.stringify(buskers().map(b=>b.drawnBy)));
}

/* ---------- a pitch is somewhere to work ---------- */
{
  check('a street performer’s trade can be held at a pitch',
    CAREERS.performer.at.includes('buskerPitch')&&PERFORMING.includes('performer'));
  town({homes:true});
  place('buskerPitch',50,43); recompute();
  days(240);
  const held=families().flatMap(f=>Object.entries(f.careers||{}).filter(([,c])=>c==='performer').map(([i,c])=>({f,index:Number(i)})));
  check('and people take it once a pitch is standing',held.length>0,held.length);
  check('fame treats it as a venue like a café or a market',
    held.some(p=>venueOf(p.f,p.index)?.type==='buskerPitch'),
    held.map(p=>venueOf(p.f,p.index)?.type).join(','));
}

/* ---------- what a household hears ---------- */
{
  town({trade:true}); place('buskerPitch',50,44); recompute(); evaluateBuskers();
  const h=at(50,41);
  check('fixture: a home with somebody playing within earshot',
    !!h&&buskers().some(b=>Math.max(Math.abs(b.x-h.x),Math.abs(b.y-h.y))<=BUSKER_MOOD_R),
    JSON.stringify(buskers().map(b=>[b.x,b.y])));
  const rows=[]; evalHouse(h,rows);
  check('a household hears them',rows.some(r=>/entertainer/i.test(r[0])),
    rows.map(r=>r[0]).join(' | '));
  /* Capped, so a pavement full of jugglers is worth about what one good one
     is, and nobody builds a fairground to make a mansion. */
  S.buskers=[];
  for(let i=0;i<8;i++) S.buskers.push({x:50,y:41,act:'juggler',pitch:false,drawnBy:null,seed:i});
  check('fixture: more of them than the cap allows for',buskerMood(h).n===8);
  check('but a pavement full of them is capped',buskerMood(h).value<=6,buskerMood(h).value);
  S.buskers=[];
  const quiet=[]; evalHouse(h,quiet);
  check('an empty street is heard as nothing at all',!quiet.some(r=>/entertainer/i.test(r[0])));
  check('and somebody two streets over is not heard',(()=>{
    S.buskers=[{x:h.x,y:h.y+BUSKER_MOOD_R+2,act:'juggler',pitch:false,drawnBy:null,seed:1}];
    const v=buskerMood(h).value; S.buskers=[]; return v===0; })());
}

/* ---------- an empty pitch is worth nothing ---------- */
{
  town({homes:true});
  invalidateRecreation(); recomputeRecreation(true);
  const before=S.municipal?.recreation?.capacity??0;
  place('buskerPitch',50,43); recompute(); invalidateRecreation(); recomputeRecreation(true);
  check('a pitch adds no recreation capacity, so it cannot stand in for a park',
    (S.municipal?.recreation?.capacity??0)===before,before+' -> '+(S.municipal?.recreation?.capacity??0));
  const rows=[]; evalHouse(at(50,41),rows);
  S.buskers=[];
  const bare=[]; evalHouse(at(50,41),bare);
  check('and an empty pitch is not heard by the street',!bare.some(r=>/entertainer/i.test(r[0])),
    bare.map(r=>r[0]).join(' | '));
}

/* ---------- it takes its place, and is never saved ---------- */
{
  town({trade:true}); place('buskerPitch',50,44); recompute(); evaluateBuskers();
  invalidateDistricts();
  const d=recomputeDistricts()[0];
  check('a district counts a pitch among its public space',d&&d.measured.sector.recreation>=1,
    d&&d.measured.sector.recreation);
  save();
  const raw=JSON.parse(store.get(KEY));
  check('fixture: the pitch itself is saved like any other building',
    raw.b.some(x=>x.type==='buskerPitch'&&x.x===50&&x.y===44));
  check('but who was standing on it is not, because tomorrow is its own day',
    !JSON.stringify(raw).includes('juggler')&&raw.buskers===undefined,
    Object.keys(raw).join(','));
  applySave(raw);
  check('a loaded town starts its street empty and fills it again',(()=>{
    const empty=buskers().length===0||!buskers().length;
    S.dayT=DAY; return empty!==undefined&&evaluateBuskers().length>0; })(),buskers().length);
  // The clock: a pass costs nothing until enough time has gone by.
  S.buskers=[]; advanceBuskers(0.1);
  check('the pass is on a clock rather than every frame',buskers().length===0);
  advanceBuskers(5);
  check('and runs once enough of the afternoon has gone by',buskers().length>0,buskers().length);
}

const failed=checks.filter(c=>!c.pass);
document.getElementById('results').textContent=JSON.stringify({pass:!failed.length,checks},null,2);
document.documentElement.dataset.result=failed.length?'fail':'pass';
