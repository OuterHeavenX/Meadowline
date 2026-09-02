import { BUILDINGS } from '../src/buildings/registry.js';
import { canPlace, erase, place } from '../src/buildings/buildings.js';
import { touchIntent } from '../src/core/input-policy.js';
import { applySave, KEY, KEY_OLD, KEY_V2, legacyShift, load, save, store } from '../src/core/save.js';
import { S } from '../src/core/state.js';
import { developmentStats, resetProgression } from '../src/progression/city-growth.js';
import { crossingBlockedByTrain, invalidateMobility, mobilitySnapshot, railCrossingCount, vehicleCap } from '../src/simulation/mobility.js';
import { findPath } from '../src/transport/pathfinding.js';
import { connectedRoadComponents, roadTiles } from '../src/transport/roads.js';
import { railTiles } from '../src/transport/rails.js';
import { LANE_OFFSET, SIDEWALK_OFFSET, headingAngle, headingOf, laneOffset, sidewalkOffset } from '../src/transport/lanes.js';
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
  genWorld(24681357); resetProgression('legacy-open'); S.cityProgress.stage=4; S.coins=5000; S.pop=100; S.citizens=[]; S.vehicles=[]; S.trains=[]; invalidateMobility();
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
check('tiny Road network spawns no ambient traffic',vehicleCap()===0);
for(let x=4;x<20;x++) put('road',x,8);
invalidateMobility();
check('eligible developed network gets positive bounded vehicle cap',vehicleCap()>=1&&vehicleCap()<=12);

// Ambiguous base geometry must fail rather than corrupt two networks.
put('rail',30,30); put('rail',30,29); put('rail',31,30); put('road',29,30);
check('ambiguous Road/Rail overlap is rejected',!canPlace('road',30,30).ok);

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
// A save written on the old 44x44 valley is re-centred on load, so the tile
// it comes back on is offset by the migration shift rather than being 16,16.
const oldSave={v:3,seed:13579,coins:777,day:3,dayT:.3,b:[{type:'road',x:16,y:16}],woods:'0'.repeat(44*44),cityProgress:{mode:'legacy-open',stage:4,unlockedParcels:[],claimedMilestones:[]},wishes:[],log:[],history:[]};
const oldShift=legacyShift(oldSave);
applySave(oldSave);
check('old Road save loads as upgraded Road semantics',isType(16+oldShift,16+oldShift,'road')&&S.grid[idx(16+oldShift,16+oldShift)].type==='road');
check('old Road migration deducts no coins',S.coins===777);
check('ambient vehicles are transient save state',!Object.prototype.hasOwnProperty.call(JSON.parse(store.get(KEY)||'{}'),'vehicles'));

// One semantic Road tile is one City Growth Road tile, including when the same
// tile is also a Rail crossing. City Growth counted type === 'road' and so lost
// every Road that had been overlaid onto Rail, which could close a stage gate.
genWorld(20406080);resetProgression('legacy-open');S.coins=100000;
for(let y=10;y<=18;y++)place('rail',16,y);
for(let x=13;x<21;x++)if(x!==16)place('road',x,14);
check('road overlays rail as a clean crossing',place('road',16,14)&&isRoadRailCrossing(S.grid[idx(16,14)]));
check('the crossing still reads as a Road',isType(16,14,'road'));
check('City Growth counts a Road laid over Rail',developmentStats().roads===countType('road'));
check('City Growth agrees with Mobility on Road tiles',developmentStats().roads===mobilitySnapshot().roadTiles);

// One tile reads as sidewalk / curb -> carriageway -> curb / sidewalk. Only the
// Canvas renderer ever placed anyone accordingly, and only pedestrians; the GPU
// path put every citizen and vehicle on the raw tile centre. These offsets are
// world tiles so both renderers agree, and both stay inside the tile.
const eastbound={x:10,y:10,nx:11,ny:10,px:9,py:10,side:1};
const westbound={x:11,y:10,nx:10,ny:10,px:12,py:10,side:1};
const walkEast=sidewalkOffset(eastbound),walkWest=sidewalkOffset(westbound);
check('a pedestrian steps off the centre line',Math.hypot(walkEast.x,walkEast.y)>0.3);
check('the pavement is perpendicular to travel',Math.abs(walkEast.x)<1e-9&&Math.abs(walkEast.y)>0.3,JSON.stringify(walkEast));
check('opposing pedestrians take opposite sides',Math.sign(walkEast.y)===-Math.sign(walkWest.y));
check('a pedestrian stays inside their own tile',Math.abs(walkEast.y)<0.5&&SIDEWALK_OFFSET<0.5);
check('the stable side flips the pavement',Math.sign(sidewalkOffset({...eastbound,side:-1}).y)===-Math.sign(walkEast.y));
check('a citizen inside a facility leaves the street',
  sidewalkOffset({...eastbound,facilityLocal:{x:3,y:3}}).x===0&&sidewalkOffset({...eastbound,facilityLocal:{x:3,y:3}}).y===0);

const laneEast=laneOffset(eastbound),laneWest=laneOffset(westbound);
check('a vehicle keeps to a lane',Math.hypot(laneEast.x,laneEast.y)>0.1);
check('oncoming traffic passes on the other side',Math.sign(laneEast.y)===-Math.sign(laneWest.y));
check('a lane sits inside the carriageway, not on the pavement',LANE_OFFSET<SIDEWALK_OFFSET&&Math.abs(laneEast.y)<0.5);

// A vehicle mesh points its local +X along travel; world Y is the scene's Z.
check('heading points east at zero',Math.abs(headingAngle(eastbound))<1e-9,String(headingAngle(eastbound)));
check('heading turns to face west',Math.abs(Math.abs(headingAngle(westbound))-Math.PI)<1e-9,String(headingAngle(westbound)));
const south={x:10,y:10,nx:10,ny:11,px:10,py:9};
check('heading turns to face south',Math.abs(headingAngle(south)+Math.PI/2)<1e-9,String(headingAngle(south)));
check('a stalled actor still has a heading',Math.hypot(headingOf({x:5,y:5,nx:5,ny:5,px:5,py:5}).x,headingOf({x:5,y:5,nx:5,ny:5,px:5,py:5}).y)===1);

const failed=checks.filter(c=>!c.pass);
document.getElementById('results').textContent=JSON.stringify({pass:!failed.length,checks},null,2);
document.documentElement.dataset.result=failed.length?'fail':'pass';
