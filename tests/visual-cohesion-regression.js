import { BUILDINGS, defaultBuildingState } from '../src/buildings/registry.js';
import { restoreFacilityOccupancy } from '../src/buildings/buildings.js';
import { S } from '../src/core/state.js';
import { resetProgression } from '../src/progression/city-growth.js';
import { renderThreeScene, resetThreeRenderer, threeSnapshot } from '../src/rendering/three-renderer.js';
import { artMetrics, roadKind, roadMask, visualDescriptor } from '../src/rendering/three-world-art.js';
import { genWorld } from '../src/world/map.js';
import { idx } from '../src/world/tiles.js';

const checks=[],check=(name,pass,detail='')=>checks.push({name,pass:!!pass,detail});
function road(x,y,state={}){S.grid[idx(x,y)]={type:'road',x,y,seed:x*101+y,state};}
function root(type,x,y,state={}){const def=BUILDINGS[type],fp=def.placement?.footprint||[1,1];for(let yy=0;yy<fp[1];yy++)for(let xx=0;xx<fp[0];xx++){S.terr[idx(x+xx,y+yy)]=0;S.grid[idx(x+xx,y+yy)]=null;}const b={type,x,y,seed:x*1009+y*313,pop:type==='house'?4:0,state:{...defaultBuildingState(type),...state}};restoreFacilityOccupancy(b);return b;}
function setRoadShape(bits){S.grid.fill(null);road(20,20);if(bits&1)road(20,19);if(bits&2)road(21,20);if(bits&4)road(20,21);if(bits&8)road(19,20);return roadMask(20,20);}

genWorld(3111);resetProgression('legacy-open');
for(const [bits,kind]of [[0,'isolated'],[1,'dead-end'],[5,'straight'],[3,'corner'],[7,'tee'],[15,'cross']])check(`Road mask ${bits} derives ${kind}`,roadKind(setRoadShape(bits))===kind,roadKind(setRoadShape(bits)));
const homes=[root('house',6,6,{housingTier:1}),root('house',8,6,{housingTier:2}),root('house',10,6,{housingTier:3})];
check('residential tiers have distinct archetypes',new Set(homes.map(h=>visualDescriptor(h).archetype)).size===3,homes.map(h=>visualDescriptor(h).archetype));
const before=homes.map(h=>JSON.stringify(h.state)).join('|');for(const h of homes)check('visual variation is deterministic',visualDescriptor(h).variant===visualDescriptor(h).variant);check('visual descriptors do not mutate Housing',before===homes.map(h=>JSON.stringify(h.state)).join('|'));
for(const type of Object.keys(BUILDINGS))check(`${type} has a visual archetype`,!!visualDescriptor({type,seed:7,state:{}})?.archetype);
S.rendererMode='gpu';S.quality='balanced';resetThreeRenderer();const rendered=renderThreeScene(),snap=threeSnapshot();check('cohesive Three scene initializes',rendered,snap.error);if(rendered){check('art kit creates shared materials',artMetrics().materials>8,artMetrics());check('world creates real geometry',snap.geometries>0,snap);check('draw calls remain bounded',snap.drawCalls<1100,snap.drawCalls);check('visual tree count is bounded',snap.visibleTrees<=260,snap.visibleTrees);}
const failed=checks.filter(c=>!c.pass);document.getElementById('results').textContent=JSON.stringify({pass:!failed.length,checks},null,2);document.documentElement.dataset.result=failed.length?'fail':'pass';
