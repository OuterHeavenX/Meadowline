import { BUILDINGS, defaultBuildingState } from '../src/buildings/registry.js';
import { restoreFacilityOccupancy } from '../src/buildings/buildings.js';
import { S } from '../src/core/state.js';
import { resetProgression } from '../src/progression/city-growth.js';
import { renderThreeScene, resetThreeRenderer, threeSnapshot } from '../src/rendering/three-renderer.js';
import { artMetrics, roadKind, roadMask, visualDescriptor, waterMask } from '../src/rendering/three-world-art.js';
import { hover } from '../src/rendering/interaction-state.js';
import { genWorld } from '../src/world/map.js';
import { idx } from '../src/world/tiles.js';

const checks=[],check=(name,pass,detail='')=>checks.push({name,pass:!!pass,detail});
function road(x,y,state={}){S.grid[idx(x,y)]={type:'road',x,y,seed:x*101+y,state};}
function root(type,x,y,state={}){const def=BUILDINGS[type],fp=def.placement?.footprint||[1,1];for(let yy=0;yy<fp[1];yy++)for(let xx=0;xx<fp[0];xx++){S.terr[idx(x+xx,y+yy)]=0;S.grid[idx(x+xx,y+yy)]=null;}const b={type,x,y,seed:x*1009+y*313,pop:type==='house'?4:0,state:{...defaultBuildingState(type),...state}};restoreFacilityOccupancy(b);return b;}
function setRoadShape(bits){S.grid.fill(null);road(20,20);if(bits&1)road(20,19);if(bits&2)road(21,20);if(bits&4)road(20,21);if(bits&8)road(19,20);return roadMask(20,20);}

genWorld(3111);resetProgression('legacy-open');
for(const [bits,kind]of [[0,'isolated'],[1,'dead-end'],[5,'straight'],[3,'corner'],[7,'tee'],[15,'cross']])check(`Road mask ${bits} derives ${kind}`,roadKind(setRoadShape(bits))===kind,roadKind(setRoadShape(bits)));
S.terr.fill(0);S.terr[idx(20,20)]=1;S.terr[idx(20,19)]=1;S.terr[idx(21,20)]=1;check('Water adjacency derives shoreline corner mask',waterMask(20,20)===3,waterMask(20,20));
const homes=[root('house',6,6,{housingTier:1}),root('house',8,6,{housingTier:2}),root('house',10,6,{housingTier:3})];
check('residential tiers have distinct archetypes',new Set(homes.map(h=>visualDescriptor(h).archetype)).size===3,homes.map(h=>visualDescriptor(h).archetype));
const before=homes.map(h=>JSON.stringify(h.state)).join('|');for(const h of homes)check('visual variation is deterministic',visualDescriptor(h).variant===visualDescriptor(h).variant);check('visual descriptors do not mutate Housing',before===homes.map(h=>JSON.stringify(h.state)).join('|'));
for(const type of Object.keys(BUILDINGS))check(`${type} has a visual archetype`,!!visualDescriptor({type,seed:7,state:{}})?.archetype);
S.rendererMode='gpu';S.quality='balanced';resetThreeRenderer();const rendered=renderThreeScene(),snap=threeSnapshot();check('cohesive Three scene initializes',rendered,snap.error);if(rendered){check('art kit creates shared materials',artMetrics().materials>8,artMetrics());check('world creates real geometry',snap.geometries>0,snap);check('draw calls remain bounded',snap.drawCalls<1100,snap.drawCalls);check('visual tree count is bounded',snap.visibleTrees<=230,snap.visibleTrees);const gridBefore=JSON.stringify(S.grid);S.tool='house';hover.x=12;hover.y=12;hover.on=true;renderThreeScene();const overlay=threeSnapshot();check('GPU placement overlay renders without mutating grid',overlay.drawCalls>snap.drawCalls&&JSON.stringify(S.grid)===gridBefore,{base:snap.drawCalls,overlay:overlay.drawCalls});hover.on=false;S.tool='move';}
// Cafe, Market, Bakery and Station shared one storefront box with a different
// paint colour, so four trades read as the same shop four times over at play
// distance. Each now carries a silhouette cue, which means measurably different
// geometry rather than a different material: a scene holding one of each must
// draw a different number of triangles for each.
const trades=['cafe','market','bakery','station'];
const tradeShapes=trades.map(type=>{
  genWorld(606);resetProgression('legacy-open');
  S.grid.fill(null);
  for(let x=12;x<22;x++) road(x,21);
  root(type,16,20);
  resetThreeRenderer();
  const drew=renderThreeScene();
  return {type,drew,triangles:threeSnapshot().triangles};
});
const drewAll=tradeShapes.every(t=>t.drew);
check('every trade builds a GPU scene',drewAll,tradeShapes.map(t=>t.type+':'+t.drew).join(' '));
if(drewAll){
  const counts=tradeShapes.map(t=>t.triangles);
  check('each trade has its own silhouette',new Set(counts).size===trades.length,
    tradeShapes.map(t=>t.type+'='+t.triangles).join(' '));
  check('every trade actually draws geometry',counts.every(n=>n>0),counts.join(','));
}

const failed=checks.filter(c=>!c.pass);document.getElementById('results').textContent=JSON.stringify({pass:!failed.length,checks},null,2);document.documentElement.dataset.result=failed.length?'fail':'pass';
