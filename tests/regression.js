import { canPlace, erase, place } from '../src/buildings/buildings.js';
import { BUILDINGS, BUILDABLE } from '../src/buildings/registry.js';
import { COST, H, W } from '../src/core/constants.js';
import { KEY, KEY_OLD, KEY_V2, load, save, store } from '../src/core/save.js';
import { S } from '../src/core/state.js';
import { advanceEducation, educationAssignment, getEducationLevel, invalidateServices, recomputeServices, schoolStats } from '../src/simulation/civic-services.js';
import { spawnCitizen } from '../src/simulation/citizens.js';
import { evalHouse, recompute } from '../src/simulation/mood.js';
import { updateTrains } from '../src/simulation/trains.js';
import { rollWishes } from '../src/simulation/wishes.js';
import { genWorld } from '../src/world/map.js';
import { refreshPalette, seasonName } from '../src/world/seasons.js';
import { idx } from '../src/world/tiles.js';
import { darkness } from '../src/world/time.js';
import { startWeather, updateWeather, weatherName } from '../src/world/weather.js';

const checks=[];
function check(name,condition,detail=''){ checks.push({name,pass:Boolean(condition),detail}); }
function firstTile(water){
  for(let y=2;y<H-2;y++) for(let x=2;x<W-2;x++) if(Boolean(S.terr[idx(x,y)])===water) return {x,y};
  throw new Error('fixture tile unavailable');
}
function put(type,x,y,pop=0,state={}){
  S.terr[idx(x,y)]=0;
  S.grid[idx(x,y)]={type,x,y,seed:((x*73856093)^(y*19349663))>>>0,pop,grow:0,mood:50,linked:false,state};
}

store.set(KEY,''); store.set(KEY_V2,''); store.set(KEY_OLD,'');
genWorld(24681357); refreshPalette(); recompute(); rollWishes();
check('new game',S.coins===340&&S.day===1&&S.grid.length===W*H);

check('building registry school exists',BUILDINGS.school?.service?.type==='education'&&BUILDABLE.school===1);
check('building registry costs remain correct',BUILDINGS.road.cost===3&&BUILDINGS.house.cost===24&&BUILDINGS.school.cost===145&&COST.school===145);

const land=firstTile(false), water=firstTile(true);
const landBefore=S.coins; check('road placement',place('road',land.x,land.y)&&S.coins===landBefore-COST.road);
const roadSpent=S.coins; check('road removal/refund',erase(land.x,land.y)&&S.coins===roadSpent+Math.floor(COST.road/2));
const bridgeBefore=S.coins; check('bridge placement',canPlace('road',water.x,water.y).ok&&place('road',water.x,water.y)&&S.coins===bridgeBefore-COST.road*3);
const bridgeSpent=S.coins; check('bridge refund',erase(water.x,water.y)&&S.coins===bridgeSpent+Math.floor(COST.road*3/2));
check('rail placement/removal',place('rail',land.x,land.y)&&erase(land.x,land.y));

const ring=[[10,10],[11,10],[12,10],[13,10],[13,11],[13,12],[12,12],[11,12],[10,12],[10,11]];
for(const [x,y] of ring) put('rail',x,y);
updateTrains(100); const trainStart=S.trains[0]&&`${S.trains[0].x},${S.trains[0].y}`; updateTrains(2);
check('train routing',S.trains.length>0&&`${S.trains[0].x},${S.trains[0].y}`!==trainStart);

const hx=20,hy=20; put('house',hx,hy,4,{education:10}); put('road',hx+1,hy);
recompute(); const mood=evalHouse(S.grid[idx(hx,hy)]); spawnCitizen();
check('building and mood',Number.isFinite(mood)&&S.grid[idx(hx,hy)].linked);
check('citizen movement setup',S.citizens.length>0);

// School 2.0: coverage, finite capacity and gradual persistent education.
put('school',22,20,0,{level:1});
const covered=S.grid[idx(hx,hy)];
put('house',35,35,4,{education:7});
recompute(); invalidateServices(); recomputeServices(true);
const coveredAssignment=educationAssignment(covered);
const uncovered=S.grid[idx(35,35)];
check('education coverage inside radius',coveredAssignment?.status==='served'&&coveredAssignment.served===coveredAssignment.demand);
check('education outside radius',educationAssignment(uncovered)?.status==='uncovered');
const beforeEducation=getEducationLevel(covered); advanceEducation(10);
check('covered education improves over time',getEducationLevel(covered)>beforeEducation&&getEducationLevel(covered)<=100);
const outsideBefore=getEducationLevel(uncovered); advanceEducation(10);
check('uncovered education does not improve',getEducationLevel(uncovered)===outsideBefore);

// Add enough nearby demand to exceed one school's 28-seat capacity.
let added=0;
for(let y=16;y<=24&&added<15;y++) for(let x=17;x<=27&&added<15;x++){
  if((x===22&&y===20)||S.grid[idx(x,y)]) continue;
  put('house',x,y,4,{education:0}); added++;
}
recompute(); invalidateServices(); recomputeServices(true);
const school=S.grid[idx(22,20)], stats=schoolStats(school);
check('school capacity is finite',stats.capacity===28&&stats.served<=28&&stats.demand>28);
check('school overload deterministic and bounded',stats.overloaded&&stats.utilization<=100&&stats.served>=0);

S.day=1;S.dayT=.2;refreshPalette(); const spring=seasonName(), morningDark=darkness();
S.day=6;refreshPalette(); const summer=seasonName(); startWeather('rain',1); updateWeather(1);
check('seasons',spring==='Spring'&&summer==='Summer');
check('weather',weatherName()==='Rain');
S.dayT=.52; const middayDark=darkness(); S.dayT=.98; const nightDark=darkness();
check('day/night',middayDark<nightDark&&morningDark<nightDark);

const educationBeforeSave=getEducationLevel(covered);
save(); const savedCoins=S.coins; S.coins=1; covered.state.education=0;
check('v3 save/reload round trip',load()&&S.coins===Math.floor(savedCoins));
const reloadedCovered=S.grid[idx(hx,hy)];
check('v3 education persists',Math.abs(getEducationLevel(reloadedCovered)-educationBeforeSave)<0.001);
check('v3 school state persists',S.grid[idx(22,20)]?.state?.level===1);

store.set(KEY,''); store.set(KEY_V2,JSON.stringify({v:2,seed:97531,coins:233,day:4,dayT:.3,b:[['house',6,6,3],['school',7,7,0]],woods:''})); store.set(KEY_OLD,'');
check('v2 migration',load()&&S.coins===233&&S.grid[idx(6,6)]?.pop===3&&getEducationLevel(S.grid[idx(6,6)])===0&&S.grid[idx(7,7)]?.state?.level===1);

store.set(KEY,''); store.set(KEY_V2,''); store.set(KEY_OLD,JSON.stringify({v:1,seed:13579,coins:222,day:3,dayT:.4,b:[['road',5,5,0]]}));
check('v1 migration',load()&&S.coins===222&&S.grid[idx(5,5)]?.type==='road');

store.set(KEY,JSON.stringify({v:3,seed:2468,coins:111,day:2,dayT:.2,b:[{type:'house',x:8,y:8,pop:2,state:'bad'},{type:'school',x:9,y:8,state:{level:'bad'}},{type:'not-real',x:10,y:8},{nonsense:true}]}));
store.set(KEY_V2,''); store.set(KEY_OLD,'');
check('malformed optional v3 state is defensive',load()&&S.grid[idx(8,8)]?.type==='house'&&getEducationLevel(S.grid[idx(8,8)])===0&&S.grid[idx(9,8)]?.state?.level===1&&!S.grid[idx(10,8)]);

const failed=checks.filter(x=>!x.pass); document.getElementById('results').textContent=JSON.stringify({pass:failed.length===0,checks},null,2);
document.documentElement.dataset.result=failed.length?'fail':'pass';
