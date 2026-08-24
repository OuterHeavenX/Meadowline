import { BUILDINGS } from '../src/buildings/registry.js';
import { canPlace, erase, place, restoreFacilityOccupancy } from '../src/buildings/buildings.js';
import { touchIntent } from '../src/core/input-policy.js';
import { applySave, KEY, KEY_OLD, KEY_V2, load, save, store } from '../src/core/save.js';
import { S } from '../src/core/state.js';
import { resetProgression } from '../src/progression/city-growth.js';
import { recompute } from '../src/simulation/mood.js';
import { invalidateRecreation, recreationAssignment, recreationFacilityStats, recreationSnapshot, recomputeRecreation } from '../src/simulation/recreation.js';
import { GOAL_TYPES } from '../src/simulation/wishes.js';
import { genWorld } from '../src/world/map.js';
import { facilityRootAt, footprintCells, idx, isFacilityPart } from '../src/world/tiles.js';

const checks=[];
const check=(name,value)=>checks.push({name,pass:Boolean(value)});
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
check('legal full Pocket Park footprint is placeable',canPlace('pocketPark',18,18).ok);
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
dryRect(12,19,1,1); dryRect(14,19,1,1); dryRect(20,18,2,2);
const h1=root('house',12,19,8),h2=root('house',14,19,8),park=root('pocketPark',20,18);
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
applySave({v:3,seed:111,coins:777,day:3,dayT:.3,b:[{type:'park',x:16,y:16}],woods:'0'.repeat(44*44),cityProgress:{mode:'legacy-open',stage:4,unlockedParcels:[],claimedMilestones:[]},wishes:[],log:[],history:[]});
check('legacy Park remains on its original single tile',S.grid[idx(16,16)]?.type==='park'&&!S.grid[idx(17,16)]&&!S.grid[idx(16,17)]);
check('legacy Park migration deducts no coins',S.coins===777);

// Goal eligibility is demand-aware, not unlock-only spam.
reset();
check('empty city does not demand a Recreation facility goal',!GOAL_TYPES.recreationStart.eligible());
for(let x=10;x<=17;x++) road(x,20);
for(const [x,p] of [[11,4],[13,4],[15,4]]){ dryRect(x,19,1,1); root('house',x,19,p); }
recompute(); invalidateRecreation(); recomputeRecreation(true);
check('settled neighborhood may sensibly request first Recreation',GOAL_TYPES.recreationStart.eligible());

const failed=checks.filter(c=>!c.pass);
document.getElementById('results').textContent=JSON.stringify({pass:!failed.length,checks},null,2);
document.documentElement.dataset.result=failed.length?'fail':'pass';