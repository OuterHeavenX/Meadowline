import { BUILDINGS } from '../src/buildings/registry.js';
import { canPlace, erase, place, restoreFacilityOccupancy } from '../src/buildings/buildings.js';
import { touchIntent } from '../src/core/input-policy.js';
import { applySave, KEY, KEY_OLD, KEY_V2, load, save, store, legacyShift } from '../src/core/save.js';
import { S } from '../src/core/state.js';
import { resetProgression } from '../src/progression/city-growth.js';
import { evalHouse, recompute } from '../src/simulation/mood.js';
import { RESIDENTIAL_TIERS, desirabilityDetails } from '../src/simulation/housing.js';
import { RECREATION_QUALITY_FLOOR, invalidateRecreation, recreationAssignment, recreationFacilityStats, recreationQualityFactor, recreationSnapshot, recreationStatus, recomputeRecreation } from '../src/simulation/recreation.js';
import { GOAL_TYPES } from '../src/simulation/wishes.js';
import { genWorld } from '../src/world/map.js';
import { facilityRootAt, footprintCells, idx, isFacilityPart } from '../src/world/tiles.js';

const checks=[];
const check=(name,value,detail='')=>checks.push({name,pass:Boolean(value),...(detail?{detail}:{})});
function root(type,x,y,pop=0){
  const b={type,x,y,seed:1,pop,grow:0,mood:50,linked:false,state:type==='house'?{education:0,housingTier:1,upgradeProgress:0,desirability:0,recreationSatisfaction:0}:{}};
  if(type==='house') S.grid[idx(x,y)]=b;
  else restoreFacilityOccupancy(b);
  return b;
}
function road(x,y){ S.terr[idx(x,y)]=0; S.grid[idx(x,y)]={type:'road',x,y,seed:1,pop:0,grow:0,mood:50,linked:false,state:{}}; }
function dryRect(x,y,w,h){ for(let dy=0;dy<h;dy++)for(let dx=0;dx<w;dx++){S.terr[idx(x+dx,y+dy)]=0;S.natTree[idx(x+dx,y+dy)]=0;} }
function reset(){
  genWorld(97531); resetProgression('legacy-open'); S.cityProgress.stage=4; S.coins=5000; S.citizens=[]; S.vehicles=[]; S.trains=[]; S.boats=[]; invalidateRecreation(); recompute();
}

reset();
check('legacy Park remains exactly 1×1',BUILDINGS.park.placement.footprint.join('x')==='1x1');
check('Pocket Park is 2×2',BUILDINGS.pocketPark.placement.footprint.join('x')==='2x2');
check('Playground is 2×2',BUILDINGS.playground.placement.footprint.join('x')==='2x2');
check('Picnic Green is 3×3',BUILDINGS.picnicGreen.placement.footprint.join('x')==='3x3');
check('Sports Court is 2×3',BUILDINGS.sportsCourt.placement.footprint.join('x')==='2x3');
check('Town Park is 4×4',BUILDINGS.townPark.placement.footprint.join('x')==='4x4');
check('tiny Pocket Green has finite capacity',BUILDINGS.park.service.capacity===8);
check('Town Park has meaningfully larger capacity',BUILDINGS.townPark.service.capacity>BUILDINGS.pocketPark.service.capacity);
check('multi-tile normal tap remains one action',touchIntent({tool:'townPark',movedPx:0,heldMs:0,pointers:1})==='tap');
check('multi-tile immediate drag remains pan',touchIntent({tool:'townPark',movedPx:14,heldMs:80,pointers:1})==='pan');
check('multi-tile second pointer remains pinch',touchIntent({tool:'townPark',movedPx:0,heldMs:200,pointers:2})==='pinch');

// Atomic placement and root/marker ownership.
dryRect(18,18,2,2);
const before=S.coins;
const placementCheck=canPlace('pocketPark',18,18);
check('legal full Pocket Park footprint is placeable',placementCheck.ok,placementCheck.why||'');
check('Pocket Park placement succeeds atomically',place('pocketPark',18,18));
const placed=facilityRootAt(18,18);
check('placement charges facility cost exactly once',S.coins===before-BUILDINGS.pocketPark.cost);
check('anchor is one authoritative root',placed?.type==='pocketPark'&&placed.x===18&&placed.y===18);
check('all child tiles resolve the same facility',facilityRootAt(19,19)===placed);
check('child occupancy is internal marker state',isFacilityPart(S.grid[idx(19,19)]));
check('one occupied footprint tile blocks another facility',!canPlace('playground',19,19).ok);

// Full removal from a child tile.
const refundBefore=S.coins;
check('remove from child resolves and removes full facility',erase(19,19));
check('all four footprint cells clear together',footprintCells('pocketPark',18,18).every(c=>!S.grid[idx(c.x,c.y)]));
check('multi-tile refund happens once',S.coins===refundBefore+Math.floor(BUILDINGS.pocketPark.cost/2));

// Full-footprint obstruction blocks atomic placement.
reset(); dryRect(24,24,3,3); road(25,25);
check('occupied interior tile rejects full Picnic Green',!canPlace('picnicGreen',24,24).ok);
check('failed placement leaves unrelated blocker intact',S.grid[idx(25,25)]?.type==='road');

// Demand, capacity and real Road access.
reset();
for(let x=10;x<=28;x++) road(x,20);
dryRect(15,19,1,1); dryRect(17,19,1,1); dryRect(20,18,2,2);
const h1=root('house',15,19,8),h2=root('house',17,19,8),park=root('pocketPark',20,18);
recompute(); invalidateRecreation(); recomputeRecreation(true);
let rec=recreationSnapshot();
check('real population creates Recreation demand',rec.demand===16);
check('Pocket Park capacity stays finite',rec.capacity===12&&rec.served===12&&rec.underserved===4);
check('served residents never exceed facility capacity',recreationFacilityStats(park).served<=BUILDINGS.pocketPark.service.capacity);
check('house receives bounded Recreation satisfaction',recreationAssignment(h1).satisfaction>=0&&recreationAssignment(h1).satisfaction<=100);
check('one perimeter Road access point connects facility',recreationFacilityStats(park).connected);

// Remove every direct perimeter entrance Road while leaving the distant network.
S.grid[idx(20,20)]=null; S.grid[idx(21,20)]=null; invalidateRecreation(); recompute(); recomputeRecreation(true);
rec=recreationSnapshot();
check('facility without perimeter Road access serves nobody',rec.served===0);
check('inaccessible facility remains real capacity but not magical service',rec.capacity===12&&rec.underserved===16);

// Save V3 stores roots only and reconstructs markers.
reset(); dryRect(18,18,4,4); root('townPark',18,18); store.set(KEY,''); store.set(KEY_V2,''); store.set(KEY_OLD,''); save();
const payload=JSON.parse(store.get(KEY));
check('Save remains V3',payload.v===3);
check('Town Park persists as one authoritative save object',payload.b.filter(b=>b.type==='townPark').length===1);
check('derived facilityPart markers are not persisted',payload.b.every(b=>b.type!=='facilityPart'));
S.grid.fill(null);
check('V3 reload reconstructs Town Park footprint',load()&&facilityRootAt(21,21)?.type==='townPark');
check('reloaded child tile is reconstructed marker',isFacilityPart(S.grid[idx(21,21)]));

// Legacy 1×1 Park and treasury survive migration exactly where they were.
// A save from the old 44x44 valley is re-centred on load, so the Park comes
// back one tile wide at its migrated position rather than at 16,16.
const legacyPark={v:3,seed:111,coins:777,day:3,dayT:.3,b:[{type:'park',x:16,y:16}],woods:'0'.repeat(44*44),cityProgress:{mode:'legacy-open',stage:4,unlockedParcels:[],claimedMilestones:[]},wishes:[],log:[],history:[]};
const parkShift=legacyShift(legacyPark);
applySave(legacyPark);
const px=16+parkShift, py=16+parkShift;
check('legacy Park remains on its original single tile',S.grid[idx(px,py)]?.type==='park'&&!S.grid[idx(px+1,py)]&&!S.grid[idx(px,py+1)]);
check('legacy Park migration deducts no coins',S.coins===777);

// Goal eligibility is demand-aware, not unlock-only spam.
reset();
check('empty city does not demand a Recreation facility goal',!GOAL_TYPES.recreationStart.eligible());
for(let x=10;x<=17;x++) road(x,20);
for(const [x,p] of [[11,4],[13,4],[15,4]]){ dryRect(x,19,1,1); root('house',x,19,p); }
recompute(); invalidateRecreation(); recomputeRecreation(true);
check('settled neighborhood may sensibly request first Recreation',GOAL_TYPES.recreationStart.eligible());

/* ---------- registry quality has to reach the player ----------
   It existed from the start but only broke ties when sorting candidates, so a
   1x1 Pocket Green gave exactly the mood and desirability of a 4x4 Town Park
   and the five facilities this milestone added had no mechanical reason to
   exist. The scale earns the documented ceilings; it never exceeds them. */
check('the quality floor is below full value',RECREATION_QUALITY_FLOOR>0&&RECREATION_QUALITY_FLOOR<1);
check('the weakest provider sits on the floor',recreationQualityFactor(1)===RECREATION_QUALITY_FLOOR);
check('the strongest provider reaches full value',recreationQualityFactor(1.5)===1);
check('the factor never exceeds full value',recreationQualityFactor(9)===1);
check('a missing quality is treated as the weakest',recreationQualityFactor(undefined)===RECREATION_QUALITY_FLOOR);
const ladder=['park','pocketPark','playground','picnicGreen','sportsCourt','townPark']
  .map(id=>recreationQualityFactor(BUILDINGS[id].service.quality));
check('the factor rises with facility quality',ladder.every((v,i)=>i===0||v>=ladder[i-1]),ladder.join(' '));

function servedBy(id){
  genWorld(2468); resetProgression('legacy-open');
  for(let x=8;x<30;x++) root('road',x,20);
  const h=root('house',10,19,4);
  h.pop=4;
  // Anchored so every footprint, 1x1 to 4x4, ends its last row on y=19 and so
  // touches the same street. Anchoring them all at one point would drop the
  // larger facilities onto the road and silently fail to place them.
  const fp=BUILDINGS[id].placement.footprint;
  const facility=root(id,12,19-(fp[1]-1));
  check(id+' fixture places its whole footprint',S.grid[idx(facility.x,facility.y)]?.type===id);
  recompute();
  const rows=[]; evalHouse(h,rows);
  const mood=rows.find(r=>String(r[0]).includes('Recreation'));
  const des=desirabilityDetails(h).rows.find(r=>String(r.label).includes('Recreation'));
  return {status:recreationStatus(h),mood:mood?mood[1]:0,desirability:des?des.value:0};
}
const green=servedBy('park'), townPark=servedBy('townPark');
check('both households are fully served',green.status.satisfaction===100&&townPark.status.satisfaction===100,
  green.status.satisfaction+' / '+townPark.status.satisfaction);
check('a Town Park earns the documented Mood ceiling',townPark.mood===12,String(townPark.mood));
check('a Town Park earns the documented Desirability ceiling',townPark.desirability===6,String(townPark.desirability));
check('a Pocket Green earns visibly less Mood',green.mood<townPark.mood,green.mood+' vs '+townPark.mood);
check('a Pocket Green earns less Desirability',green.desirability<townPark.desirability,green.desirability+' vs '+townPark.desirability);
check('no facility exceeds the documented Mood bound',townPark.mood<=12&&green.mood<=12);

// The rebalance is priced and weighted only. Service itself is untouched, so no
// established city loses capacity, and Housing stays authoritative.
check('legacy Pocket Green keeps its capacity',BUILDINGS.park.service.capacity===8);
check('legacy Pocket Green keeps its reach',BUILDINGS.park.service.radius===4);
check('legacy Pocket Green is no longer the cheapest per resident',
  BUILDINGS.park.cost/BUILDINGS.park.service.capacity>BUILDINGS.pocketPark.cost/BUILDINGS.pocketPark.service.capacity,
  (BUILDINGS.park.cost/BUILDINGS.park.service.capacity).toFixed(2));
check('Housing tier thresholds are unchanged',
  RESIDENTIAL_TIERS[1].requirements.mood===65&&RESIDENTIAL_TIERS[1].requirements.desirability===45&&
  RESIDENTIAL_TIERS[2].requirements.mood===78&&RESIDENTIAL_TIERS[2].requirements.desirability===62);
check('Housing capacities and tax multipliers are unchanged',
  RESIDENTIAL_TIERS.map(t=>t.capacity).join(',')==='4,6,8'&&RESIDENTIAL_TIERS.map(t=>t.taxMultiplier).join(',')==='1,1.25,1.55');

const failed=checks.filter(c=>!c.pass);
document.getElementById('results').textContent=JSON.stringify({pass:!failed.length,checks},null,2);
document.documentElement.dataset.result=failed.length?'fail':'pass';
