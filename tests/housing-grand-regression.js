/* ============================================================
   MANSIONS AND ESTATES

   Two more rungs on the housing ladder, and two ways to get one: a
   neighbourhood can grow into them, or the player can buy one outright. A
   bought mansion is not a building type of its own — it places an ordinary
   house that starts at the top of the ladder — which is the whole reason it
   needs no simulation: it is schooled, taxed, made desirable, counted by its
   district and noticed by the Social Fabric exactly like any other home.

   The two things most likely to go wrong quietly are the ones this leans on:
   money in both directions, and everything that assumed there were only ever
   three rungs.
   ============================================================ */
import { BUILDINGS, defaultBuildingState } from '../src/buildings/registry.js';
import { buildingValue, costOf, erase, place, removalIntent } from '../src/buildings/buildings.js';
import { RESIDENTIAL_TIERS, advanceHousing, desirabilityDetails, evaluateHousingReadiness, getDesirability,
  housingCapacity, housingTier, housingTierIndex, housingTaxMultiplier, nextHousingTier } from '../src/simulation/housing.js';
import { recomputeServices } from '../src/simulation/civic-services.js';
import { recomputeRecreation } from '../src/simulation/recreation.js';
import { upkeepOf, upkeepTotal } from '../src/simulation/upkeep.js';
import { visualDescriptor } from '../src/rendering/three-world-art.js';
import { applySave, save, store, KEY } from '../src/core/save.js';
import { S } from '../src/core/state.js';
import { resetProgression } from '../src/progression/city-growth.js';
import { recompute } from '../src/simulation/mood.js';
import { genWorld } from '../src/world/map.js';
import { idx } from '../src/world/tiles.js';

const checks=[];
const check=(name,value,detail)=>checks.push({name,pass:Boolean(value),...(detail===undefined?{}:{detail})});

function town(){
  genWorld(20260907); resetProgression('legacy-open'); S.cityProgress.stage=4; S.coins=9e6;
  S.citizens=[]; S.incidents=[];
  for(let y=36;y<56;y++) for(let x=36;x<72;x++){ const i=idx(x,y); S.terr[i]=0; S.natTree[i]=0; S.grid[i]=null; }
  for(let x=39;x<70;x++) place('road',x,42);
  recompute();
}
const at=(x,y)=>S.grid[idx(x,y)];

/* ---------- the ladder ---------- */
{
  check('there are five rungs now',RESIDENTIAL_TIERS.length===5,RESIDENTIAL_TIERS.map(t=>t.name).join(' → '));
  check('and the last two are the Mansion and the Estate',
    RESIDENTIAL_TIERS[3].name==='Mansion'&&RESIDENTIAL_TIERS[4].name==='Estate');
  const rising=(f)=>RESIDENTIAL_TIERS.every((t,i)=>i===0||f(t)>f(RESIDENTIAL_TIERS[i-1]));
  check('every rung houses more people than the one below',rising(t=>t.capacity),RESIDENTIAL_TIERS.map(t=>t.capacity).join(','));
  check('and pays more tax',rising(t=>t.taxMultiplier),RESIDENTIAL_TIERS.map(t=>t.taxMultiplier).join(','));
  check('and takes longer to reach',RESIDENTIAL_TIERS.slice(1).every((t,i)=>i===0||t.upgradeSeconds>RESIDENTIAL_TIERS[i].upgradeSeconds),
    RESIDENTIAL_TIERS.map(t=>t.upgradeSeconds).join(','));
  // Steeper on every axis, so a grand home is a good neighbourhood's reward.
  for(const k of ['mood','education','desirability'])
    check('the '+k+' a home must reach rises all the way up the ladder',
      RESIDENTIAL_TIERS.slice(1).every((t,i)=>i===0||(t.requirements[k]||0)>(RESIDENTIAL_TIERS[i].requirements[k]||0)),
      RESIDENTIAL_TIERS.map(t=>t.requirements[k]??'-').join(','));
}

/* ---------- what makes them expensive to keep ---------- */
{
  town();
  const home=(x,tier)=>{ place('house',x,41); const h=at(x,41); h.state.housingTier=tier; return h; };
  const cottage=home(44,1), established=home(46,3), mansion=home(48,4), estate=home(50,5);
  check('an ordinary home is free to keep, as it always was',
    upkeepOf(cottage)===0&&upkeepOf(established)===0,[upkeepOf(cottage),upkeepOf(established)].join(','));
  check('a mansion is a standing bill',upkeepOf(mansion)>0,upkeepOf(mansion));
  check('and an estate a larger one',upkeepOf(estate)>upkeepOf(mansion),upkeepOf(estate));
  check('which reaches the town budget',upkeepTotal()>=upkeepOf(mansion)+upkeepOf(estate),upkeepTotal());
  check('they house more and pay more, so the bill is a trade rather than a tax',
    housingCapacity(estate)>housingCapacity(established)&&housingTaxMultiplier(estate)>housingTaxMultiplier(established),
    [housingCapacity(estate),housingTaxMultiplier(estate)].join(' / '));
}

/* ---------- buying one ---------- */
{
  town();
  const before=S.coins;
  check('fixture: a mansion goes up',place('mansion',44,41));
  const b=at(44,41);
  check('what stands there is an ordinary home',b&&b.type==='house',b&&b.type);
  check('starting at the Mansion rung',housingTierIndex(b)===4&&housingTier(b).name==='Mansion',housingTier(b)?.name);
  check('and the treasury paid the mansion price, not a cottage price',
    before-S.coins===BUILDINGS.mansion.cost,before-S.coins);
  check('an estate is dearer still',BUILDINGS.estate.cost>BUILDINGS.mansion.cost,
    BUILDINGS.mansion.cost+' vs '+BUILDINGS.estate.cost);
  check('fixture: an estate too',place('estate',48,41)&&housingTierIndex(at(48,41))===5);
  // Being a house is the point: everything that reads homes must see them.
  recompute();
  check('the town counts them among its homes',(S.ctx.houses||[]).filter(h=>h.x===44||h.x===48).length===2,
    (S.ctx.houses||[]).length);
  check('and they carry the ordinary house state a home needs',
    ['education','desirability','recreationSatisfaction','upgradeProgress'].every(k=>k in b.state),Object.keys(b.state).join(','));
}

/* ---------- money back, in both directions ---------- */
{
  town();
  place('mansion',44,41);
  const bought=at(44,41);
  check('a bought mansion remembers what it cost',buildingValue(bought)===BUILDINGS.mansion.cost,buildingValue(bought));
  const before=S.coins;
  erase(44,41,{confirmed:true});
  check('so pulling it down refunds half of that, not half of a cottage',
    S.coins-before===Math.floor(BUILDINGS.mansion.cost/2),S.coins-before);
  check('and it is dear enough to ask first',(()=>{ place('estate',46,41);
    return removalIntent(46,41).needsConfirm===true; })());
  /* The other direction is the one that would print money: a home the valley
     grew into an estate by itself was only ever paid for once, at cottage
     prices, and must refund on that basis. */
  town();
  place('house',44,41);
  const grown=at(44,41); grown.state.housingTier=5;
  check('a home that GREW into an estate is still worth what was paid for it',
    buildingValue(grown)===BUILDINGS.house.cost,buildingValue(grown)+' vs '+BUILDINGS.house.cost);
  const coins=S.coins;
  erase(44,41,{confirmed:true});
  check('so growing one and bulldozing it cannot print money',
    S.coins-coins===Math.floor(BUILDINGS.house.cost/2),S.coins-coins);
  // An old save has no record of a price and must behave as it always did.
  town(); place('house',44,41);
  const legacy=at(44,41); delete legacy.state.paid;
  check('a home from before any of this refunds the way it used to',
    buildingValue(legacy)===costOf('house',44,41),buildingValue(legacy));
}

/* ---------- growing into one ---------- */
{
  /* A genuinely excellent street, because desirability is recomputed from what
     actually stands nearby and cannot be simply asserted. This doubles as the
     proof that the two new rungs are reachable at all: a tier nobody can climb
     would be a worse bug than a tier that renders badly. */
  town();
  place('house',44,41);
  place('school',47,44); place('picnicGreen',41,44);
  // The Estate rung wants very nearly everything a street can have, a station
  // included. That is the point of the top rung, and it is what makes it a
  // mature city's reward rather than something a rich player simply waits for.
  for(let x=40;x<52;x++) S.grid[idx(x,38)]={type:'rail',x,y:38,seed:x*211+38};
  place('station',46,39);
  for(const x of [42,46,50]) place('cafe',x,40);
  for(const x of [43,45]) place('lamp',x,40);
  for(const [x,y] of [[40,39],[48,39],[52,40]]) place('tree',x,y);
  const h=at(44,41); h.pop=8; h.mood=100;
  h.state.housingTier=3; h.state.education=100;
  recompute(); recomputeServices(true); recomputeRecreation(true);
  h.state.recreationSatisfaction=100;
  const reading=getDesirability(h);
  check('fixture: the street really is one of the best in the valley',reading>=88,
    reading+' — '+desirabilityDetails(h).rows.map(r=>r.label+' '+r.value).join(', '));
  const next=nextHousingTier(h);
  check('an established home in a very good street has somewhere further to go',
    next&&next.name==='Mansion',next&&next.name);
  check('and is ready for it',evaluateHousingReadiness(h).ready===true,JSON.stringify(evaluateHousingReadiness(h)));
  // Drive it up the last two rungs.
  for(let i=0;i<4000&&housingTierIndex(h)<5;i++) advanceHousing(1);
  check('given time, the valley grows its own estates',housingTierIndex(h)===5,housingTierIndex(h));
  check('and stops there, with nothing above it',nextHousingTier(h)===null&&evaluateHousingReadiness(h).complete===true,
    JSON.stringify(evaluateHousingReadiness(h)));
  // A poor street goes nowhere near them.
  town(); place('house',50,41);
  const poor=at(50,41); poor.pop=4; poor.mood=60;
  poor.state.housingTier=3; poor.state.education=20;
  recompute();
  for(let i=0;i<2000;i++) advanceHousing(1);
  check('a street that has not earned it never sees a mansion',housingTierIndex(poor)===3,housingTierIndex(poor));
}

/* ---------- nothing still thinks there are three rungs ---------- */
{
  town();
  const seen=new Set();
  for(const tier of [1,2,3,4,5]){
    place('house',40+tier*2,41);
    const h=at(40+tier*2,41); h.state.housingTier=tier;
    const d=visualDescriptor(h);
    check('rung '+tier+' has a look of its own',!!d&&!!d.archetype&&!seen.has(d.archetype),d&&d.archetype);
    seen.add(d&&d.archetype);
  }
  check('so all five are visually distinct',seen.size===5,[...seen].join(','));
}

/* ---------- saving them ---------- */
{
  town();
  place('mansion',44,41); place('estate',46,41); place('house',48,41);
  at(48,41).state.housingTier=4;
  const before=[44,46,48].map(x=>housingTierIndex(at(x,41))).join(',');
  save();
  const raw=JSON.parse(store.get(KEY));
  applySave(raw);
  const after=[44,46,48].map(x=>at(x,41)&&housingTierIndex(at(x,41))).join(',');
  check('the grand rungs survive a save exactly',after===before,before+' -> '+after);
  check('and what comes back is still an ordinary house',[44,46,48].every(x=>at(x,41)?.type==='house'));
  check('with the price it was bought for intact',at(44,41).state.paid===BUILDINGS.mansion.cost,at(44,41).state.paid);
  // A save claiming a rung that does not exist is clamped, not trusted.
  const mangled=JSON.parse(JSON.stringify(raw));
  for(const b of mangled.b) if(b.type==='house'&&b.state) b.state.housingTier=99;
  applySave(mangled);
  check('a rung this build does not have is brought back to the top of the ladder',
    (S.ctx.houses||[]).every(h=>housingTierIndex(h)<=5)&&(S.ctx.houses||[]).some(h=>housingTierIndex(h)===5),
    (S.ctx.houses||[]).map(h=>housingTierIndex(h)).join(','));
  // And an old save that never heard of them still loads.
  const legacy=JSON.parse(JSON.stringify(raw));
  for(const b of legacy.b) if(b.type==='house'&&b.state){ b.state.housingTier=2; delete b.state.paid; }
  applySave(legacy);
  check('an old save loads untouched, at the rung it recorded',
    (S.ctx.houses||[]).every(h=>housingTierIndex(h)===2),(S.ctx.houses||[]).map(h=>housingTierIndex(h)).join(','));
}

const failed=checks.filter(c=>!c.pass);
document.getElementById('results').textContent=JSON.stringify({pass:!failed.length,checks},null,2);
document.documentElement.dataset.result=failed.length?'fail':'pass';
