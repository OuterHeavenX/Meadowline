/* ============================================================
   SHOPS

   Three new trades — a General Store, a Tea House and a Bookshop — added
   through one mechanism rather than three special cases. A shop declares
   `trade:{yield}` in the registry; economy.js sums that over whatever is
   standing, housing.js counts shops within reach toward a street's
   desirability, and nothing else has to know they exist. The test that
   matters most is therefore the generic one: a shop the registry declares
   must reach the till without anybody naming it.

   The Bookshop additionally declares an education service, which is the whole
   reason it is interesting — a street with no school can start learning, and
   learning is what the two new housing rungs ask for.
   ============================================================ */
import { BUILDINGS } from '../src/buildings/registry.js';
import { place, erase } from '../src/buildings/buildings.js';
import { payday } from '../src/simulation/economy.js';
import { desirabilityDetails } from '../src/simulation/housing.js';
import { getEducationLevel, educationAssignment, recomputeServices, advanceEducation } from '../src/simulation/civic-services.js';
import { recomputeDistricts, invalidateDistricts } from '../src/simulation/districts.js';
import { CAREERS, evaluateCareers } from '../src/simulation/careers.js';
import { evaluateFamilies, families } from '../src/simulation/families.js';
import { ledger } from '../src/simulation/ledger.js';
import { visualDescriptor } from '../src/rendering/three-world-art.js';
import { describe } from '../src/ui/panels.js';
import { applySave, save, store, KEY } from '../src/core/save.js';
import { S } from '../src/core/state.js';
import { resetProgression } from '../src/progression/city-growth.js';
import { recompute } from '../src/simulation/mood.js';
import { genWorld } from '../src/world/map.js';
import { idx } from '../src/world/tiles.js';

const checks=[];
const check=(name,value,detail)=>checks.push({name,pass:Boolean(value),...(detail===undefined?{}:{detail})});
const SHOPS=['generalStore','teaHouse','bookshop'];
const note=()=>{};

function town(){
  genWorld(20260907); resetProgression('legacy-open'); S.cityProgress.stage=4; S.coins=9e6;
  S.citizens=[]; S.incidents=[]; S.ledger=[];
  S.social={districts:[],nextId:0,families:[],nextFamilyId:0,firsts:{},organisations:[],nextOrgId:0,orgMemory:{},fame:[],aliases:[],petitions:[]};
  for(let y=36;y<56;y++) for(let x=36;x<72;x++){ const i=idx(x,y); S.terr[i]=0; S.natTree[i]=0; S.grid[i]=null; }
  for(let x=39;x<70;x++) place('road',x,42);
  recompute();
}
const at=(x,y)=>S.grid[idx(x,y)];
const trade=()=>{ payday(); return S.lastPay.trade; };

/* ---------- what a shop is ---------- */
{
  for(const id of SHOPS){
    const d=BUILDINGS[id];
    check(id+' is a trade building with people working in it',
      d&&d.category==='trade'&&d.jobs>0&&d.cost>0,d&&[d.category,d.jobs,d.cost].join('/'));
    check('and declares what it takes, so the till needs no special case',
      d&&d.trade&&d.trade.yield>0,d&&JSON.stringify(d.trade));
  }
  check('none of them claims a keyboard shortcut, since none is free',
    SHOPS.every(id=>!BUILDINGS[id].key),SHOPS.map(id=>BUILDINGS[id].key).join(','));
  check('and each has a look of its own',
    new Set(SHOPS.map(id=>visualDescriptor({type:id,seed:1,state:{}}).archetype)).size===3);
}

/* ---------- the till ---------- */
{
  town();
  const bare=trade();
  check('an empty street takes nothing',bare===0,bare);
  place('generalStore',44,41); recompute();
  const one=trade();
  check('a shop takes what its registry entry says',one===BUILDINGS.generalStore.trade.yield,one);
  place('teaHouse',46,41); place('bookshop',48,41); recompute();
  const all=trade();
  const expected=SHOPS.reduce((n,id)=>n+BUILDINGS[id].trade.yield,0);
  check('and three shops take the sum of the three',all===expected,all+' vs '+expected);
  // A market lifts the trades around it, and must lift these too.
  place('market',52,41); recompute();
  check('a market lifts shop takings the way it lifts every other trade',trade()>all,trade()+' vs '+all);
  /* The point of the generic mechanism: a shop nothing has been told about
     still reaches the till. This invents one at runtime rather than adding a
     real building, so it proves the sum is over the registry and not a list. */
  town(); recompute();                       // no market, so no lift to reason about
  BUILDINGS.invented={...BUILDINGS.generalStore,id:'invented',trade:{yield:5}};
  const before=trade();
  S.ctx.shops.push({type:'invented',x:1,y:1});
  check('a shop the till has never heard of still reaches it',trade()===before+5,trade()+' vs '+(before+5));
  delete BUILDINGS.invented;
}

/* ---------- a street with shops on it ---------- */
{
  town();
  place('house',44,41); recompute();
  const plain=desirabilityDetails(at(44,41));
  check('fixture: a home with nothing around it',!plain.rows.some(r=>r.label==='Shops nearby'),
    plain.rows.map(r=>r.label).join(', '));
  place('generalStore',46,41); recompute();
  const withOne=desirabilityDetails(at(44,41));
  check('a shop nearby makes a street more desirable',withOne.value>plain.value&&withOne.rows.some(r=>r.label==='Shops nearby'),
    plain.value+' -> '+withOne.value);
  /* Enough of them genuinely within reach that the cap has something to do:
     with only three in range, capped and uncapped both come to six and the
     check proves nothing. */
  for(const x of [40,41,42,43,45]) place('teaHouse',x,40);
  recompute();
  const many=desirabilityDetails(at(44,41));
  const row=many.rows.find(r=>r.label==='Shops nearby');
  check('fixture: more shops are in reach than the cap allows for',
    (S.ctx.shops||[]).filter(sh=>Math.max(Math.abs(sh.x-44),Math.abs(sh.y-41))<=5).length>=4,
    (S.ctx.shops||[]).filter(sh=>Math.max(Math.abs(sh.x-44),Math.abs(sh.y-41))<=5).length);
  check('but a parade of them is capped, so shops alone cannot make a mansion',row&&row.value<=6,row&&row.value);
  check('and a shop far away does not count',(()=>{
    town(); place('house',44,41); place('generalStore',60,41); recompute();
    return !desirabilityDetails(at(44,41)).rows.some(r=>r.label==='Shops nearby'); })());
}

/* ---------- the bookshop teaches ---------- */
{
  town();
  place('house',44,41); at(44,41).pop=5;      // students, or nothing is taught
  recompute(); recomputeServices(true);
  check('fixture: a street with no school is uncovered',
    (educationAssignment(at(44,41))||{}).status==='uncovered',JSON.stringify(educationAssignment(at(44,41))));
  place('bookshop',45,41); recompute(); recomputeServices(true);
  const st=educationAssignment(at(44,41));
  check('a bookshop teaches the street around it',st&&st.status!=='uncovered',JSON.stringify(st));
  for(let i=0;i<400;i++) advanceEducation(1);
  check('and households near one actually learn',getEducationLevel(at(44,41))>0,getEducationLevel(at(44,41)));
  check('its reach is smaller than a school\'s, so it supplements rather than replaces',
    BUILDINGS.bookshop.service.radius<BUILDINGS.school.service.radius&&BUILDINGS.bookshop.service.capacity<BUILDINGS.school.service.capacity,
    [BUILDINGS.bookshop.service.radius,BUILDINGS.school.service.radius].join(' vs '));
  check('a home out of its reach is taught nothing by it',(()=>{
    town(); place('house',44,41); at(44,41).pop=5; place('bookshop',60,41); recompute(); recomputeServices(true);
    return (educationAssignment(at(44,41))||{}).status==='uncovered'; })());
}

/* ---------- they take their place in the town ---------- */
{
  town();
  for(const [i,id] of SHOPS.entries()) place(id,44+i*2,41);
  for(let x=40;x<56;x+=2) place('house',x,43);
  recompute(); invalidateDistricts();
  const d=recomputeDistricts()[0];
  check('a district counts them among its trade',d&&d.measured.sector.trade>=3,d&&d.measured.sector.trade);
  check('and among the jobs standing in it',d&&d.measured.jobs>=SHOPS.reduce((n,id)=>n+BUILDINGS[id].jobs,0),
    d&&d.measured.jobs);
  // Opening one is news the paper can print.
  S.ledger=[]; place('teaHouse',56,41);
  const e=ledger().find(x=>x.type==='building_opened'&&x.building==='teaHouse');
  check('opening one reaches the day\'s ledger as a business',e&&e.cls==='business'&&e.jobs===BUILDINGS.teaHouse.jobs,
    JSON.stringify(e));
  // And there are trades to work in them.
  check('there is a shopkeeper\'s trade, and a bookseller\'s',
    CAREERS.shopkeeper&&CAREERS.bookseller&&CAREERS.shopkeeper.at.includes('generalStore')&&CAREERS.bookseller.at.includes('bookshop'));
  for(const h of S.ctx.houses){ h.pop=5; h.mood=70; h.state.education=40; h.state.desirability=55; }
  recompute();
  for(let day=0;day<80;day++){ S.day=(S.day||1)+1;
    for(let s=0;s<8;s++){ S.dayT=s/8+0.01; evaluateFamilies(note); evaluateCareers(note); } }
  const held=families().flatMap(f=>Object.values(f.careers||{}));
  check('and people take them once the shops are standing',
    held.some(c=>c==='shopkeeper'||c==='bookseller'),[...new Set(held)].join(','));
}

/* ---------- the card, and the save ---------- */
{
  town();
  for(const [i,id] of SHOPS.entries()) place(id,44+i*2,41);
  recompute();
  for(const [i,id] of SHOPS.entries()){
    const card=describe(44+i*2,41);
    check(id+' reads as a business when tapped',/Business/.test(card)&&/Jobs filled/.test(card),card.slice(0,80));
  }
  save();
  const raw=JSON.parse(store.get(KEY));
  applySave(raw);
  check('shops survive a save',SHOPS.every((id,i)=>at(44+i*2,41)?.type===id),
    SHOPS.map((id,i)=>at(44+i*2,41)?.type).join(','));
  recompute();
  check('and are still taking money afterwards',trade()>0,trade());
  // Removing one stops its takings.
  const before=trade();
  erase(44,41,{confirmed:true}); recompute();
  check('pulling one down stops what it took',trade()===before-BUILDINGS.generalStore.trade.yield,
    trade()+' vs '+(before-BUILDINGS.generalStore.trade.yield));
}

const failed=checks.filter(c=>!c.pass);
document.getElementById('results').textContent=JSON.stringify({pass:!failed.length,checks},null,2);
document.documentElement.dataset.result=failed.length?'fail':'pass';
