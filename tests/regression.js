import { canPlace, erase, place } from '../src/buildings/buildings.js';
import { COST, H, W } from '../src/core/constants.js';
import { KEY, KEY_OLD, load, save, store } from '../src/core/save.js';
import { S } from '../src/core/state.js';
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

store.set(KEY,''); store.set(KEY_OLD,'');
genWorld(24681357); refreshPalette(); recompute(); rollWishes();
check('new game',S.coins===340&&S.day===1&&S.grid.length===W*H);

const land=firstTile(false), water=firstTile(true);
const landBefore=S.coins; check('road placement',place('road',land.x,land.y)&&S.coins===landBefore-COST.road);
const roadSpent=S.coins; check('road removal/refund',erase(land.x,land.y)&&S.coins===roadSpent+Math.floor(COST.road/2));
const bridgeBefore=S.coins; check('bridge placement',canPlace('road',water.x,water.y).ok&&place('road',water.x,water.y)&&S.coins===bridgeBefore-COST.road*3);
const bridgeSpent=S.coins; check('bridge refund',erase(water.x,water.y)&&S.coins===bridgeSpent+Math.floor(COST.road*3/2));
check('rail placement/removal',place('rail',land.x,land.y)&&erase(land.x,land.y));

// A deterministic rail ring exercises spawning and route advancement.
const ring=[[10,10],[11,10],[12,10],[13,10],[13,11],[13,12],[12,12],[11,12],[10,12],[10,11]];
for(const [x,y] of ring){S.terr[idx(x,y)]=0;S.grid[idx(x,y)]={type:'rail',x,y,seed:1,pop:0,grow:0,mood:50,linked:false};}
updateTrains(100); const trainStart=S.trains[0]&&`${S.trains[0].x},${S.trains[0].y}`; updateTrains(2);
check('train routing',S.trains.length>0&&`${S.trains[0].x},${S.trains[0].y}`!==trainStart);

const hx=20,hy=20; S.terr[idx(hx,hy)]=0; S.terr[idx(hx+1,hy)]=0;
S.grid[idx(hx,hy)]={type:'house',x:hx,y:hy,seed:7,pop:4,grow:0,mood:50,linked:false};
S.grid[idx(hx+1,hy)]={type:'road',x:hx+1,y:hy,seed:8,pop:0,grow:0,mood:50,linked:false};
recompute(); const mood=evalHouse(S.grid[idx(hx,hy)]); spawnCitizen();
check('building and mood',Number.isFinite(mood)&&S.grid[idx(hx,hy)].linked);
check('citizen movement setup',S.citizens.length>0);

S.day=1;S.dayT=.2;refreshPalette(); const spring=seasonName(), morningDark=darkness();
S.day=6;refreshPalette(); const summer=seasonName(); startWeather('rain',1); updateWeather(1);
check('seasons',spring==='Spring'&&summer==='Summer');
check('weather',weatherName()==='Rain');
S.dayT=.52; const middayDark=darkness(); S.dayT=.98; const nightDark=darkness();
check('day/night',middayDark<nightDark&&morningDark<nightDark);

save(); const savedCoins=S.coins; S.coins=1; check('save/reload round trip',load()&&S.coins===Math.floor(savedCoins));
store.set(KEY,''); store.set(KEY_OLD,JSON.stringify({v:1,seed:13579,coins:222,day:3,dayT:.4,b:[['road',5,5,0]]}));
check('existing save migration',load()&&S.coins===222&&S.grid[idx(5,5)]?.type==='road');

const failed=checks.filter(x=>!x.pass); document.getElementById('results').textContent=JSON.stringify({pass:failed.length===0,checks},null,2);
document.documentElement.dataset.result=failed.length?'fail':'pass';
