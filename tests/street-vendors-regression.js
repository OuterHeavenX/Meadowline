/* ============================================================
   STREET VENDORS

   One building, three things it can turn out to be. The player puts down a
   pitch and the street decides what sets up on it — a flower stall beside a
   green, a newsstand where people read, a food cart everywhere else — and
   changes its mind when the street changes.

   Two things are worth testing hardest. The first is that the decision is the
   street's and not the seed's: the same pitch in two different places must
   settle differently, and the same pitch must move when its surroundings do.
   The second is that the variety is real rather than decorative — it has to
   reach the till and the street's desirability, or it is only paint.
   ============================================================ */
import { BUILDINGS } from '../src/buildings/registry.js';
import { VENDOR_GREEN_R, VENDOR_LEARN_R, VENDOR_VARIETIES } from '../src/buildings/vendors.js';
import { place, erase } from '../src/buildings/buildings.js';
import { tradeYield, tradePresence, varietyOf, varietyReason } from '../src/simulation/trade.js';
import { payday } from '../src/simulation/economy.js';
import { desirabilityDetails } from '../src/simulation/housing.js';
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
const note=()=>{};

function town(){
  genWorld(20260907); resetProgression('legacy-open'); S.cityProgress.stage=4; S.coins=9e6;
  S.citizens=[]; S.incidents=[]; S.ledger=[];
  S.social={districts:[],nextId:0,families:[],nextFamilyId:0,firsts:{},organisations:[],nextOrgId:0,orgMemory:{},fame:[],aliases:[],petitions:[]};
  for(let y=32;y<58;y++) for(let x=34;x<74;x++){ const i=idx(x,y); S.terr[i]=0; S.natTree[i]=0; S.grid[i]=null; }
  for(let x=39;x<70;x++) place('road',x,42);
  recompute();
}
const at=(x,y)=>S.grid[idx(x,y)];
const variety=(x,y)=>at(x,y)?.state?.variety;
const take=()=>{ payday(); return S.lastPay.trade; };
const V=id=>VENDOR_VARIETIES.find(v=>v.id===id);

/* ---------- what a pitch is ---------- */
{
  const d=BUILDINGS.vendor;
  check('a vendor is a trade building with somebody working it',
    d&&d.category==='trade'&&d.jobs===1&&d.cost>0,d&&[d.category,d.jobs,d.cost].join('/'));
  check('and it is cheap enough to be a pitch rather than a premises',
    d.cost<BUILDINGS.generalStore.cost/2,d.cost+' vs '+BUILDINGS.generalStore.cost);
  check('it takes no keyboard shortcut, because none is free',!d.key,JSON.stringify(d.key));
  check('it declares its varieties, so nothing has to name them',
    d.varieties===VENDOR_VARIETIES&&VENDOR_VARIETIES.length===3);
  check('each variety says what it takes and what a street feels of it',
    VENDOR_VARIETIES.every(v=>v.id&&v.name&&v.sells&&v.yield>0&&v.presence>0),
    VENDOR_VARIETIES.map(v=>v.id+':'+v.yield+'/'+v.presence).join(' '));
  check('and each is a different thing to look at',
    new Set(VENDOR_VARIETIES.map(v=>visualDescriptor({type:'vendor',seed:1,state:{variety:v.id}}).archetype)).size===3,
    VENDOR_VARIETIES.map(v=>visualDescriptor({type:'vendor',seed:1,state:{variety:v.id}}).archetype).join(','));
  /* The GPU renderer rebuilds the world from a signature over the grid. If the
     variety is not in that signature a food cart that became a flower stall
     keeps its barrow until something else on the map happens to change. */
  const src=await (await fetch('../src/rendering/three-renderer.js')).text();
  const sig=src.slice(src.indexOf('function signature('),src.indexOf('function rebuild('));
  check('the GPU world signature carries the variety, or the mesh never changes',
    /variety/.test(sig),sig.slice(0,40));
}

/* ---------- the street decides, not the seed ---------- */
{
  town();
  place('vendor',44,41); recompute();
  check('a pitch on an ordinary street sells hot food',variety(44,41)==='foodCart',variety(44,41));
  place('school',50,44); place('vendor',50,41); recompute();
  check('a pitch where people read sells papers',variety(50,41)==='newsstand',variety(50,41));
  place('picnicGreen',56,38); place('vendor',57,41); recompute();
  check('a pitch beside a green sells flowers',variety(57,41)==='flowerStall',variety(57,41));
  check('fixture: the green is genuinely in reach and the school is not',
    Math.abs(56-57)<=VENDOR_GREEN_R&&Math.abs(38-41)<=VENDOR_GREEN_R
    &&Math.max(Math.abs(50-57),Math.abs(44-41))>VENDOR_LEARN_R);
  /* Three pitches, three different answers, and nothing about them differs but
     where they stand. If the variety ever came off the seed this fails. */
  check('the same building settles differently in three different places',
    new Set([variety(44,41),variety(50,41),variety(57,41)]).size===3);
  // A bookshop is somewhere people read too, and the rule never names one.
  town(); place('bookshop',45,41); place('vendor',44,41); recompute();
  check('a bookshop counts as somewhere people read, though the rule names no building',
    variety(44,41)==='newsstand',variety(44,41));
  // Where both apply, flowers win, and that is a decision rather than an accident.
  town(); place('picnicGreen',44,38); place('school',45,43); place('vendor',44,41); recompute();
  check('fixture: both a green and a school are in reach of this pitch',
    Math.max(Math.abs(44-44),Math.abs(38-41))<=VENDOR_GREEN_R
    &&Math.max(Math.abs(45-44),Math.abs(43-41))<=VENDOR_LEARN_R);
  check('where both apply the green wins',variety(44,41)==='flowerStall',variety(44,41));
  // And distance is real in both directions.
  town(); place('picnicGreen',44,30); place('vendor',44,41); recompute();
  check('a green too far away decides nothing',variety(44,41)==='foodCart',variety(44,41));
}

/* ---------- a pitch is not frozen the day it is laid ---------- */
{
  town();
  place('vendor',44,41); recompute();
  check('fixture: it starts as a food cart',variety(44,41)==='foodCart');
  place('picnicGreen',44,38); recompute();
  check('open a green beside it and it is a flower stall',variety(44,41)==='flowerStall',variety(44,41));
  erase(44,38,{confirmed:true}); recompute();
  check('take the green away and it goes back to selling food',variety(44,41)==='foodCart',variety(44,41));
  check('and the card can say why, since the player never chose it',
    /green/i.test(varietyReason(at(44,41)))||/nothing nearby/i.test(varietyReason(at(44,41))),
    varietyReason(at(44,41)));
}

/* ---------- the variety reaches the till ---------- */
{
  town();
  const bare=take();
  check('an empty street takes nothing',bare===0,bare);
  place('vendor',44,41); recompute();
  check('a food cart takes what a food cart takes, not the base figure',
    take()===V('foodCart').yield&&V('foodCart').yield!==BUILDINGS.vendor.trade.yield,
    take()+' vs '+V('foodCart').yield+' (base '+BUILDINGS.vendor.trade.yield+')');
  place('picnicGreen',44,38); recompute();
  check('and the same pitch takes the flower stall’s figure once it is one',
    take()===V('flowerStall').yield,take()+' vs '+V('flowerStall').yield);
  check('tradeYield reads the variety, and a shop with none keeps its own',
    tradeYield(at(44,41))===V('flowerStall').yield
    &&(()=>{ town(); place('generalStore',44,41); recompute(); return tradeYield(at(44,41))===BUILDINGS.generalStore.trade.yield; })());
  // Pulling one down stops its takings, whichever it had become.
  town(); place('vendor',44,41); recompute();
  const before=take(); erase(44,41,{confirmed:true}); recompute();
  check('pulling a pitch down stops what it took',take()===before-V('foodCart').yield,
    take()+' vs '+(before-V('foodCart').yield));
}

/* ---------- what a street feels of one ---------- */
{
  town();
  place('house',44,41); recompute();
  const plain=desirabilityDetails(at(44,41));
  check('fixture: a home with nothing around it',!plain.rows.some(r=>r.label==='Shops nearby'));
  place('vendor',46,41); recompute();
  const cart=desirabilityDetails(at(44,41)).rows.find(r=>r.label==='Shops nearby');
  check('a pitch nearby lifts a street',cart&&cart.value===V('foodCart').presence,cart&&cart.value);
  /* A shop is a building and a pitch is a barrow, and the street knows the
     difference. Without this a ring of 28-coin stalls buys the same
     desirability as the shops they sit outside. */
  town(); place('house',44,41); place('generalStore',46,41); recompute();
  const shop=desirabilityDetails(at(44,41)).rows.find(r=>r.label==='Shops nearby');
  check('a shop is worth more to a street than a pitch is',shop.value>cart.value,
    shop.value+' vs '+cart.value);
  check('and tradePresence is where that difference lives',
    tradePresence(at(46,41))>tradePresence({type:'vendor',state:{variety:'foodCart'}}),
    tradePresence(at(46,41))+' vs '+tradePresence({type:'vendor',state:{variety:'foodCart'}}));
  check('a flower stall is worth more to a street than a food cart',
    V('flowerStall').presence>V('foodCart').presence);
  /* Enough pitches genuinely in reach that the cap has something to do — with
     too few, capped and uncapped agree and the check proves nothing. */
  town(); place('house',44,41);
  for(const x of [40,41,42,43,45,46,47]) place('vendor',x,40);
  recompute();
  const inReach=(S.ctx.shops||[]).filter(v=>Math.max(Math.abs(v.x-44),Math.abs(v.y-41))<=5);
  let uncapped=0; for(const v of inReach) uncapped+=tradePresence(v);
  check('fixture: more pitches are in reach than the cap allows for',uncapped>6,uncapped);
  const many=desirabilityDetails(at(44,41)).rows.find(r=>r.label==='Shops nearby');
  check('but a pavement full of them is capped like any other trade',many&&many.value<=6,many&&many.value);
}

/* ---------- it takes its place in the town ---------- */
{
  town();
  for(const x of [44,45,46]) place('vendor',x,41);
  for(let x=40;x<56;x+=2) place('house',x,43);
  recompute(); invalidateDistricts();
  const d=recomputeDistricts()[0];
  check('a district counts pitches among its trade',d&&d.measured.sector.trade>=3,d&&d.measured.sector.trade);
  S.ledger=[]; place('vendor',48,41);
  const e=ledger().find(x=>x.type==='building_opened'&&x.building==='vendor');
  check('opening one reaches the day’s ledger as a business',e&&e.cls==='business',JSON.stringify(e));
  check('there is a street vendor’s trade to hold',
    CAREERS.streetVendor&&CAREERS.streetVendor.at.includes('vendor'));
  for(const h of S.ctx.houses){ h.pop=5; h.mood=70; h.state.education=40; h.state.desirability=55; }
  recompute();
  for(let day=0;day<80;day++){ S.day=(S.day||1)+1;
    for(let s=0;s<8;s++){ S.dayT=s/8+0.01; evaluateFamilies(note); evaluateCareers(note); } }
  const held=families().flatMap(f=>Object.values(f.careers||{}));
  check('and people take it once the pitches are standing',held.includes('streetVendor'),
    [...new Set(held)].join(','));
}

/* ---------- the card, and the save ---------- */
{
  town();
  place('picnicGreen',44,38); place('vendor',44,41); place('vendor',50,41);
  recompute();
  const card=describe(44,41);
  check('a pitch reads as what it became, not as a generic vendor',
    /Flower stall/.test(card)&&/Street Vendor/.test(card),card.replace(/<[^>]+>/g,' ').slice(0,90));
  check('and the card says why, because the player did not choose it',
    /green/i.test(card),card.replace(/<[^>]+>/g,' ').slice(0,160));
  check('it still reads as a business, with the jobs and the upkeep',
    /Jobs filled/.test(card)&&/Upkeep/.test(card));
  save();
  const raw=JSON.parse(store.get(KEY));
  const saved=raw.b.filter(x=>x.type==='vendor');
  check('what a pitch became is written down',
    saved.length===2&&saved.some(x=>x.state?.variety==='flowerStall'),JSON.stringify(saved.map(x=>x.state?.variety)));
  applySave(raw);
  check('and a loaded town has the pitches it had',
    variety(44,41)==='flowerStall'&&variety(50,41)==='foodCart',[variety(44,41),variety(50,41)].join(','));
  check('and they are still taking money afterwards',take()>0,take());
  /* A save naming something that is not a variety. There is deliberately no
     clamp in save.js for this: applySave recomputes before it returns, so the
     street settles the pitch and a clamp there could never be observed to work
     — a safeguard nothing can reach reads like protection while protecting
     nothing. What does the work is varietyOf(), which every reader goes
     through, and that is reachable and is what is checked here. */
  const mangled=JSON.parse(store.get(KEY));
  for(const b of mangled.b) if(b.type==='vendor') b.state.variety='funnel-cake-truck';
  applySave(mangled);
  check('a save naming a variety that does not exist settles on a real one',
    VENDOR_VARIETIES.some(v=>v.id===variety(44,41)),variety(44,41));
  const nonsense={type:'vendor',x:1,y:1,state:{variety:'funnel-cake-truck'}};
  check('and nothing reading a pitch is ever handed a variety that is not one',
    VENDOR_VARIETIES.includes(varietyOf(nonsense))
    &&tradeYield(nonsense)>0&&tradePresence(nonsense)>0,
    JSON.stringify(varietyOf(nonsense))+' / '+tradeYield(nonsense));
}

const failed=checks.filter(c=>!c.pass);
document.getElementById('results').textContent=JSON.stringify({pass:!failed.length,checks},null,2);
document.documentElement.dataset.result=failed.length?'fail':'pass';
