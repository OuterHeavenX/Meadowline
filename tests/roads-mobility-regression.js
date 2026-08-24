import { BUILDINGS } from '../src/buildings/registry.js';
import { canPlace, erase, place } from '../src/buildings/buildings.js';
import { touchIntent } from '../src/core/input-policy.js';
import { applySave, KEY, KEY_OLD, KEY_V2, load, save, store } from '../src/core/save.js';
import { S } from '../src/core/state.js';
import { resetProgression } from '../src/progression/city-growth.js';
import { crossingBlockedByTrain, invalidateMobility, mobilitySnapshot, railCrossingCount, vehicleCap } from '../src/simulation/mobility.js';
import { findPath } from '../src/transport/pathfinding.js';
import { connectedRoadComponents, roadTiles } from '../src/transport/roads.js';
import { railTiles } from '../src/transport/rails.js';
import { genWorld } from '../src/world/map.js';
import { countType, idx, isRoadRailCrossing, isType } from '../src/world/tiles.js';

const checks=[];
const check=(name,value)=>checks.push({name,pass:Boolean(value)});
function put(type,x,y,state={}){
  S.terr[idx(x,y)]=0;
  const b={type,x,y,seed:1,pop:0,grow:0,mood:50,linked:false,state:{...state}};
  S.grid[idx(x,y)]=b;
  return b;
}
function reset(){
  genWorld(24681357); resetProgression('parcel'); S.cityProgress.stage=4; S.coins=5000; S.pop=100; S.citizens=[]; S.vehicles=[]; S.trains=[]; invalidateMobility();
}

reset();
check('Road keeps production cost 3',BUILDINGS.road.cost===3);
check('Road remains one tile',BUILDINGS.road.placement.footprint[0]===1&&BUILDINGS.road.placement.footprint[1]===1);
check('Road touch tap remains one action',touchIntent({tool:'road',movedPx:0,heldMs:0,pointers:1})==='tap');
check('Road immediate drag remains pan',touchIntent({tool:'road',movedPx:12,heldMs:80,pointers:1})==='pan');
check('Road held drag remains paint',touchIntent({tool:'road',movedPx:12,heldMs:360,pointers:1})==='paint');
check('Road second pointer remains pinch',touchIntent({tool:'road',movedPx:0,heldMs:360,pointers:2})==='pinch');

// Clean perpendicular crossing: horizontal Road over vertical Rail.
put('road',19,20); put('road',21,20);
put('rail',20,19); const base=put('rail',20,20); put('rail',20,21);
const roadBefore=countType('road'),railBefore=countType('rail'),coinsBefore=S.coins;
check('perpendicular Road over Rail is legal',canPlace('road',20,20).ok);
check('crossing placement succeeds',place('road',20,20));
check('crossing retains one grid object',S.grid[idx(20,20)]===base&&base.type==='rail');
check('crossing state is explicit',isRoadRailCrossing(base)&&base.state.roadRailCrossing===true);
check('crossing is semantically Road',isType(20,20,'road'));
check('crossing is semantically Rail',isType(20,20,'rail'));
check('crossing adds exactly one progression Road',countType('road')===roadBefore+1);
check('crossing does not duplicate Rail count',countType('rail')===railBefore);
check('crossing costs normal Road price once',S.coins===coinsBefore-BUILDINGS.road.cost);
check('crossing count is one',railCrossingCount()===1);

const path=findPath(19,20,21,20,(x,y)=>isType(x,y,'road'));
check('Road route traverses crossing',Array.isArray(path)&&path.some(p=>p[0]===20&&p[1]===20));
check('Rail collector retains crossing',railTiles().some(r=>r.x===20&&r.y===20));
check('Road collector retains crossing',roadTiles().some(r=>r.x===20&&r.y===20));
check('Road component remains connected',connectedRoadComponents()[0]?.length>=3);

S.trains=[{x:20,y:19,nx:20,ny:20,p:.75,fx:20,fy:19.75}];
check('approaching train protects crossing',crossingBlockedByTrain(20,20));
S.trains[0].fx=20; S.trains[0].fy=16;
check('distant train releases crossing',!crossingBlockedByTrain(20,20));

const snap=mobilitySnapshot();
check('mobility snapshot reports real Road tiles',snap.roadTiles===countType('road'));
check('mobility snapshot reports crossing',snap.crossings===1);
check('ambient vehicle cap stays bounded',vehicleCap()>=1&&vehicleCap()<=12);

// Parallel/ambiguous geometry must not become a corrupt crossing.
put('road',29,30); put('road',31,30);
put('rail',29,30); // replaced below with a clean standalone setup
S.grid[idx(29,30)]={type:'road',x:29,y:30,state:{},seed:1,pop:0,grow:0,mood:50,linked:false};
S.grid[idx(31,30)]={type:'road',x:31,y:30,state:{},seed:1,pop:0,grow:0,mood:50,linked:false};
put('rail',30,30); put('rail',29,30); put('rail',31,30);
check('parallel Road/Rail overlap is rejected',!canPlace('road',30,30).ok);

// First erase removes only the overlay Road; Rail survives. Second erase removes base Rail.
const refundBefore=S.coins;
check('crossing overlay erase succeeds',erase(20,20));
check('first erase preserves base Rail',isType(20,20,'rail')&&!isType(20,20,'road')&&!isRoadRailCrossing(S.grid[idx(20,20)]));
check('overlay erase refunds half Road cost',S.coins===refundBefore+Math.floor(BUILDINGS.road.cost/2));
check('second erase removes base Rail',erase(20,20)&&!S.grid[idx(20,20)]);

// Generic V3 state must persist a crossing without Save V4.
reset();
put('road',19,20); put('road',21,20); put('rail',20,19); put('rail',20,20); put('rail',20,21);
check('recreated crossing for save test',place('road',20,20));
store.set(KEY,''); store.set(KEY_V2,''); store.set(KEY_OLD,'');
save();
S.grid[idx(20,20)]=null;
check('V3 reload restores crossing',load()&&isRoadRailCrossing(S.grid[idx(20,20)])&&isType(20,20,'road')&&isType(20,20,'rail'));

// A pre-Roads V3 Road needs no migration charge or rebuild.
applySave({v:3,seed:13579,coins:777,day:3,dayT:.3,b:[{type:'road',x:16,y:16}],woods:'0'.repeat(44*44),cityProgress:{mode:'legacy-open',stage:4,unlockedParcels:[],claimedMilestones:[]},wishes:[],log:[],history:[]});
check('old Road save loads as upgraded Road semantics',isType(16,16,'road')&&S.grid[idx(16,16)].type==='road');
check('old Road migration deducts no coins',S.coins===777);
check('ambient vehicles are transient save state',!Object.prototype.hasOwnProperty.call(JSON.parse(store.get(KEY)||'{}'),'vehicles'));

const failed=checks.filter(c=>!c.pass);
document.getElementById('results').textContent=JSON.stringify({pass:!failed.length,checks},null,2);
document.documentElement.dataset.result=failed.length?'fail':'pass';
