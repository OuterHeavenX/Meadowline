import { LAND_PARCELS } from '../src/progression/city-growth.js';
import { L } from './grid-fixture.js';
import { H, W } from '../src/core/constants.js';
import { BUILDINGS, defaultBuildingState } from '../src/buildings/registry.js';
import { restoreFacilityOccupancy } from '../src/buildings/buildings.js';
import { S } from '../src/core/state.js';
import { resetProgression } from '../src/progression/city-growth.js';
import { projectThroughCamera, renderThreeScene, resetThreeRenderer, threeSnapshot } from '../src/rendering/three-renderer.js';
import { artMetrics, roadKind, roadMask, visualDescriptor, waterMask } from '../src/rendering/three-world-art.js';
import { hover } from '../src/rendering/interaction-state.js';
import { genWorld, proj, screen2world, setViewRotation, stepCamera, viewBounds, viewDepth, viewRotation } from '../src/world/map.js';
import { cloudOpacity, clouds, seedClouds, splashes, storm, updateSplashes, updateStorm } from '../src/world/weather.js';
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
S.rendererMode='gpu';S.quality='balanced';resetThreeRenderer();const rendered=renderThreeScene(),snap=threeSnapshot();check('cohesive Three scene initializes',rendered,snap.error);if(rendered){check('art kit creates shared materials',artMetrics().materials>8,artMetrics());check('world creates real geometry',snap.geometries>0,snap);check('draw calls remain bounded',snap.drawCalls<1100,snap.drawCalls);check('visual tree count is bounded',snap.visibleTrees<=900,snap.visibleTrees);{const treesBefore=snap.visibleTrees,callsBefore=snap.drawCalls;for(let x=2;x<40;x++)S.natTree[idx(L(x),L(41))]=1;renderThreeScene();const grown=threeSnapshot();check('more trees do not cost more draw calls',grown.visibleTrees>=treesBefore&&grown.drawCalls<=callsBefore+2,{trees:treesBefore+'->'+grown.visibleTrees,calls:callsBefore+'->'+grown.drawCalls});check('authored tree geometry reaches the scene',(S.diagnostics.treeTriangles||0)>=grown.visibleTrees*184,S.diagnostics.treeTriangles);}const gridBefore=JSON.stringify(S.grid);S.tool='house';hover.x=Math.round(LAND_PARCELS[0].x+LAND_PARCELS[0].w/2);hover.y=Math.round(LAND_PARCELS[0].y+LAND_PARCELS[0].h/2);hover.on=true;renderThreeScene();const overlay=threeSnapshot();check('GPU placement overlay renders without mutating grid',overlay.drawCalls>snap.drawCalls&&JSON.stringify(S.grid)===gridBefore,{base:snap.drawCalls,overlay:overlay.drawCalls});hover.on=false;S.tool='move';}
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

// ---------- turning the city ----------
// One projection feeds the Canvas renderer, the GPU camera and every hit test.
// If the camera orbits by a different angle than proj() turns the world by,
// the city appears to rotate one way while taps land as though it rotated the
// other - which looks like a picking bug and is really a sign error. These
// check the two against each other directly rather than trusting the algebra.
genWorld(4242);resetProgression('legacy-open');
S.rendererMode='gpu';S.quality='balanced';resetThreeRenderer();
if(renderThreeScene()){
  const probes=[[10,10],[22,22],[33,14],[5,38]];
  let worstError=0,worstAt='';
  for(const deg of [0,30,45,90,137,180,270]){
    setViewRotation(deg*Math.PI/180);
    renderThreeScene();
    for(const [x,y] of probes){
      const flat=proj(x,y),gpu=projectThroughCamera(x,y);
      if(!gpu) continue;
      const off=Math.hypot(flat.x-gpu.x,flat.y-gpu.y);
      if(off>worstError){worstError=off;worstAt=`${deg}deg at (${x},${y})`;}
    }
  }
  check('the GPU camera and the shared projection agree at every angle',worstError<0.5,
    worstError.toFixed(3)+'px'+(worstAt?' worst '+worstAt:''));
}
// A tap has to land on the tile under the finger, which means these two stay
// inverses of each other at angles that are not multiples of a quarter turn.
let roundTrip=0;
for(const deg of [0,37,90,211]){
  setViewRotation(deg*Math.PI/180);
  for(const [sx,sy] of [[200,300],[640,420],[100,700]]){
    const w=screen2world(sx,sy),back=proj(w.x,w.y);
    roundTrip=Math.max(roundTrip,Math.hypot(back.x-sx,back.y-sy));
  }
}
check('screen and world stay inverses at any rotation',roundTrip<1e-6,roundTrip);

// Painter's-algorithm depth must follow the view. Two tiles on the same
// diagonal swap which is in front when the city turns a quarter; a depth key
// of x+y cannot express that and would draw them in the wrong order.
setViewRotation(0);
const nearAtZero=viewDepth(30,30)>viewDepth(14,14);
setViewRotation(Math.PI);
const flipped=viewDepth(30,30)<viewDepth(14,14);
check('draw order follows the camera around',nearAtZero&&flipped,`0deg ${nearAtZero} 180deg ${flipped}`);

// The Canvas fallback draws every tile as a fixed axis-aligned diamond, a
// shape that is only right at quarter turns, so it follows the same rotation
// snapped. Hit testing reads the same function, which is what keeps taps
// accurate on the fallback rather than merely keeping it from looking wrong.
const gpuBackend=S.diagnostics.rendererBackend;
setViewRotation(0.9);
S.diagnostics.rendererBackend='canvas2d-fallback';
const snapped=viewRotation();
check('the fallback renderer snaps rotation to quarter turns',
  Math.abs(snapped-Math.PI/2)<1e-9,snapped);
S.diagnostics.rendererBackend='three-webgl2';
check('the GPU renderer turns freely',Math.abs(viewRotation()-0.9)<1e-9,viewRotation());
S.diagnostics.rendererBackend=gpuBackend;

// The angle eases rather than jumping, so a quarter turn does not teleport the
// player. Driven directly here: a poll on headless timers is a coin toss.
S.cam.rot=0;S.cam.rotTo=Math.PI/2;
stepCamera(0.016);
const started=S.cam.rot;
for(let i=0;i<400;i++)stepCamera(0.016);
check('rotation eases toward its target rather than snapping',
  started>0&&started<Math.PI/2&&Math.abs(S.cam.rot-Math.PI/2)<1e-3,
  `first step ${started.toFixed(4)} settled ${S.cam.rot.toFixed(6)}`);
setViewRotation(0);

// ---------- weather ----------
// Rain, cloud shadows and the whole storm were drawn only inside the Canvas
// path, so on the renderer Auto actually picks the game announced rain over a
// dry, shadowless valley. These check the state every renderer reads.
setViewRotation(0);
genWorld(8181);resetProgression('legacy-open');
seedClouds();
check('the valley has clouds to move',clouds.length>0,clouds.length);
check('every cloud carries a height and a shape',clouds.every(c=>c.h>0&&Number.isFinite(c.seed)),
  clouds[0]&&(clouds[0].h.toFixed(1)+'/'+clouds[0].seed));
// The sun's shadow camera is 28 units around the view centre and the sun sits
// low, so a cloud much above ten stops casting a shadow entirely. That is a
// hard ceiling, not a preference, and nothing on screen would show it broke.
check('clouds stay inside the sun shadow volume',clouds.every(c=>c.h<=11),
  Math.max(...clouds.map(c=>c.h)).toFixed(2));

S.cam.z=0.5;const farOpacity=cloudOpacity();
S.cam.z=2.2;const nearOpacity=cloudOpacity();
S.cam.z=1;
check('clouds fade as the camera comes in',farOpacity>nearOpacity&&farOpacity>0.6&&nearOpacity<0.2,
  'out '+farOpacity.toFixed(2)+' in '+nearOpacity.toFixed(2));

// Splashes belong to a place on the ground, so they are world coordinates and
// have to land inside the map and inside the view.
splashes.length=0;
S.wx={k:'rain',amt:1,target:1,next:99};
for(let i=0;i<10;i++) updateSplashes(0.05,viewBounds(1));
check('rain lands on the ground',splashes.length>0,splashes.length);
check('splashes stay on the map',splashes.every(s=>s.x>=0&&s.y>=0&&s.x<=W&&s.y<=H),
  splashes.length?splashes[0].x.toFixed(1)+','+splashes[0].y.toFixed(1):'none');
// They have to expire, or a long shower grows the array without bound.
const peak=splashes.length;
for(let i=0;i<40;i++) updateSplashes(0.05,null);
check('splashes expire instead of accumulating',splashes.length<peak,peak+' -> '+splashes.length);

splashes.length=0;
S.wx={k:'snow',amt:1,target:1,next:99};
for(let i=0;i<10;i++) updateSplashes(0.05,viewBounds(1));
check('snow does not splash',splashes.length===0,splashes.length);

// A storm belongs to heavy rain only, so a light shower stays calm.
S.wx={k:'rain',amt:0.2,target:0.2,next:99};storm.flash=0;storm.next=0;
updateStorm(0.05);
check('a light shower brings no lightning',storm.flash===0,storm.flash);
S.wx={k:'rain',amt:0.9,target:0.9,next:99};storm.next=0;
updateStorm(0.05);
const struck=storm.flash;
check('heavy rain brings lightning',struck>0.5,struck);
for(let i=0;i<80;i++) updateStorm(0.05);
check('the flash fades instead of staying lit',storm.flash<struck,struck.toFixed(2)+' -> '+storm.flash.toFixed(3));
S.wx={k:'clear',amt:0,target:0,next:99};storm.flash=0;storm.bolt=null;splashes.length=0;


const failed=checks.filter(c=>!c.pass);document.getElementById('results').textContent=JSON.stringify({pass:!failed.length,checks},null,2);document.documentElement.dataset.result=failed.length?'fail':'pass';
