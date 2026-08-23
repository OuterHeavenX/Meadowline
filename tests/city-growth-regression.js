import { canPlace } from '../src/buildings/buildings.js';
import { BUILDINGS } from '../src/buildings/registry.js';
import { KEY, KEY_OLD, KEY_V2, load, save, store } from '../src/core/save.js';
import { S } from '../src/core/state.js';
import { civicUpgradeStatus, upgradeCivic } from '../src/progression/civic-upgrades.js';
import { CITY_STAGES, LAND_PARCELS, evaluateCityGrowth, isBuildingUnlocked, isFootprintUnlocked, isLegacyOpen, isTileUnlocked, parcelStatus, resetProgression, sanitizeProgression, stageProgress, unlockParcel } from '../src/progression/city-growth.js';
import { invalidateServices, recomputeServices, schoolStats } from '../src/simulation/civic-services.js';
import { recompute } from '../src/simulation/mood.js';
import { genWorld } from '../src/world/map.js';
import { idx } from '../src/world/tiles.js';

const checks=[];
function check(name,condition,detail=''){ checks.push({name,pass:Boolean(condition),detail}); }
function put(type,x,y,pop=0,state={}){
  S.terr[idx(x,y)]=0;
  S.natTree[idx(x,y)]=0;
  S.grid[idx(x,y)]={type,x,y,seed:((x*73856093)^(y*19349663))>>>0,pop,grow:0,mood:50,linked:false,state};
}
function clearStore(){ store.set(KEY,''); store.set(KEY_V2,''); store.set(KEY_OLD,''); }

clearStore();
genWorld(424242);
resetProgression('parcel');
recompute();
check('four meaningful city stages',CITY_STAGES.length===4&&CITY_STAGES[0].name==='Settlement'&&CITY_STAGES[3].name==='Growing Town');
check('deterministic parcel registry covers nine sectors',LAND_PARCELS.length===9&&LAND_PARCELS[0].id==='center');
check('new progression starts at Settlement',S.cityProgress.stage===1&&S.cityProgress.mode==='parcel');
check('new progression starts with center only',S.cityProgress.unlockedParcels.length===1&&S.cityProgress.unlockedParcels[0]==='center');
check('center is roughly one fifth of map',LAND_PARCELS[0].w*LAND_PARCELS[0].h===400);
check('center tile is buildable',isTileUnlocked(20,20));
check('outer tile starts locked',!isTileUnlocked(2,2));
check('whole footprint blocks partial locked placement',!isFootprintUnlocked(31,20,2,1));
S.coins=1000;
check('locked land rejects building placement',canPlace('road',2,2).ok===false);
check('starting road is unlocked',isBuildingUnlocked('road'));
check('School is initially locked',!isBuildingUnlocked('school'));
check('Rail is initially locked',!isBuildingUnlocked('rail'));

// Flexible grouped milestone logic uses real city statistics but can be unit-tested with explicit stats.
const village=stageProgress(2,{population:16,occupiedHomes:4,roads:10});
check('Village requirements complete together',village.complete);
const townshipOne=stageProgress(3,{population:30,occupiedHomes:7,averageEducation:8,townHomes:0,averageDesirability:0});
const townshipTwo=stageProgress(3,{population:30,occupiedHomes:7,averageEducation:8,townHomes:2,averageDesirability:0});
check('Township any-two group rejects one path',!townshipOne.complete);
check('Township any-two group accepts two paths',townshipTwo.complete);

// Drive the real evaluator by giving it a compact qualifying city context.
S.ctx.houses=[]; S.grid.fill(null); S.pop=16;
for(let i=0;i<4;i++){
  const h={type:'house',x:15+i,y:20,pop:4,grow:0,mood:70,linked:true,state:{education:0,housingTier:1,upgradeProgress:0,desirability:45}};
  S.grid[idx(h.x,h.y)]=h; S.ctx.houses.push(h);
}
for(let x=12;x<22;x++) put('road',x,18);
const stageResult=evaluateCityGrowth();
check('real evaluator advances Settlement to Village',stageResult.stageChanged&&S.cityProgress.stage===2);
check('Village unlocks School',isBuildingUnlocked('school'));
check('Village unlocks Market and Bakery',isBuildingUnlocked('market')&&isBuildingUnlocked('bakery'));

// Parcel requires both progress and coins and cannot be bought twice.
S.coins=319;
check('North Meadow available by stage but short on coins',parcelStatus('north').state==='available'&&!parcelStatus('north').canUnlock);
S.coins=500;
const beforeNorth=S.coins;
const north=unlockParcel('north');
check('player-confirmed parcel action succeeds when eligible',north.ok&&isTileUnlocked(20,2)&&S.coins===beforeNorth-320);
check('duplicate parcel unlock is impossible',!unlockParcel('north').ok);

// Legacy mode must never lock an established city or its tools.
S.cityProgress=sanitizeProgression(null,true);
check('missing progression metadata becomes legacy-open',isLegacyOpen()&&S.cityProgress.stage===4);
check('legacy-open grants full map access',isTileUnlocked(0,0)&&isTileUnlocked(43,43));
check('legacy-open retains every existing building tool',Object.keys(BUILDINGS).every(isBuildingUnlocked));

// School Level 2 proves generic civic upgrade metadata and service recomputation.
genWorld(987654);
resetProgression('parcel');
S.cityProgress.stage=3;
S.coins=1000;
put('school',20,20,0,{level:1});
recompute(); invalidateServices(); recomputeServices(true);
const school=S.grid[idx(20,20)];
check('School Level 1 baseline is 28 / radius 7',schoolStats(school).capacity===28&&schoolStats(school).radius===7);
const up=civicUpgradeStatus(school);
check('School Level 2 metadata is 44 / radius 7 / 650 coins',up.next?.capacity===44&&up.next?.radius===7&&up.next?.cost===650);
const beforeUpgrade=S.coins;
const upgraded=upgradeCivic(school);
const upgradedStats=schoolStats(school);
check('School upgrade deducts cost exactly once',upgraded.ok&&S.coins===beforeUpgrade-650);
check('School Level 2 increases capacity without coverage explosion',school.state.level===2&&upgradedStats.capacity===44&&upgradedStats.radius===7);
check('School cannot upgrade past Level 2',!upgradeCivic(school).ok);

// V3 round trip persists parcel mode, stage, parcels and School level.
S.cityProgress.unlockedParcels=['center','east'];
S.cityProgress.claimedMilestones=['village'];
save();
S.cityProgress={mode:'legacy-open',stage:4,unlockedParcels:[],claimedMilestones:[]};
school.state.level=1;
check('City Growth V3 round trip loads',load());
check('V3 progression mode persists',S.cityProgress.mode==='parcel');
check('V3 city stage persists',S.cityProgress.stage===3);
check('V3 unlocked parcels persist',S.cityProgress.unlockedParcels.includes('center')&&S.cityProgress.unlockedParcels.includes('east'));
check('V3 claimed milestones persist',S.cityProgress.claimedMilestones.includes('village'));
check('V3 School Level 2 persists',S.grid[idx(20,20)]?.state?.level===2);

// A Housing-era V3 save has no cityProgress field: migration must be fully open.
store.set(KEY,JSON.stringify({v:3,seed:111,coins:321,day:5,dayT:.2,b:[{type:'road',x:1,y:1},{type:'rail',x:42,y:42},{type:'school',x:30,y:30,state:{level:1}}],woods:''}));
store.set(KEY_V2,''); store.set(KEY_OLD,'');
check('pre-City-Growth V3 loads',load());
check('pre-City-Growth V3 migrates legacy-open',isLegacyOpen());
check('legacy road and rail remain across map',S.grid[idx(1,1)]?.type==='road'&&S.grid[idx(42,42)]?.type==='rail');
check('legacy developed tiles remain usable',isTileUnlocked(1,1)&&isTileUnlocked(42,42));

// Malformed progression metadata repairs safely without crashing.
const repaired=sanitizeProgression({mode:'parcel',stage:99,unlockedParcels:['bad','east','east'],claimedMilestones:[1,'ok']},false);
check('malformed stage clamps',repaired.stage===4);
check('malformed parcel ids are removed and center restored',repaired.unlockedParcels.includes('center')&&repaired.unlockedParcels.includes('east')&&!repaired.unlockedParcels.includes('bad'));
check('malformed milestone values are filtered',repaired.claimedMilestones.length===1&&repaired.claimedMilestones[0]==='ok');

const failed=checks.filter(x=>!x.pass);
document.getElementById('results').textContent=JSON.stringify({pass:failed.length===0,checks},null,2);
document.documentElement.dataset.result=failed.length?'fail':'pass';
