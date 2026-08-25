import { restoreFacilityOccupancy } from '../src/buildings/buildings.js';
import { getBuildingDefinition } from '../src/buildings/registry.js';
import { resetProgression } from '../src/progression/city-growth.js';
import { rendererSnapshot, presentFrame, resetRendererBackend } from '../src/rendering/backend.js';
import { renderThreeScene, resetThreeRenderer, threeSnapshot } from '../src/rendering/three-renderer.js';
import { graphicsProfile } from '../src/rendering/capabilities.js';
import { S } from '../src/core/state.js';
import { AC, blip } from '../src/audio/audio.js';
import { KEY, load, save, store } from '../src/core/save.js';
import { genWorld } from '../src/world/map.js';
import { idx } from '../src/world/tiles.js';
import { spawnMunicipalIncident, updateMunicipal } from '../src/simulation/municipal.js';

const checks=[];const check=(name,pass,detail='')=>checks.push({name,pass:!!pass,detail});
function root(type,x,y,pop=0){const b={type,x,y,pop,seed:x*101+y,state:{}};const fp=getBuildingDefinition(type)?.placement?.footprint||[1,1];for(let dy=0;dy<fp[1];dy++)for(let dx=0;dx<fp[0];dx++){S.terr[idx(x+dx,y+dy)]=0;S.grid[idx(x+dx,y+dy)]=null;}restoreFacilityOccupancy(b);return b;}
function reset(){genWorld(3131);resetProgression('legacy-open');S.coins=5000;S.feedback=[];S.incidents=[];S.serviceVehicles=[];S.pop=80;for(let x=5;x<31;x++)root('road',x,15);}
function lifecycle(kind,facility,x){reset();root('house',10,14,8);root(facility,x,facility==='fireStation'?12:13);const target=S.grid[idx(10,14)],inc=spawnMunicipalIncident(kind,target),seen=new Set(),random=Math.random;Math.random=()=>1;for(let i=0;i<500&&S.serviceVehicles.length;i++){for(const v of S.serviceVehicles)seen.add(v.state);updateMunicipal(.25);}Math.random=random;return{inc,seen,remaining:S.serviceVehicles.length,resolved:S.municipal[kind==='crime'?'safety':kind==='fire'?'fire':'healthcare'].resolved||0};}

for(const [quality,dpr]of [['high',2],['balanced',1.5],['battery',1]]){S.quality=quality;check(quality+' quality has bounded DPR',graphicsProfile().dpr===dpr);}
S.muted=true;blip(440,.1);check('muted audio does not initialize a context',AC===null);S.muted=false;
S.quality='balanced';S.rendererMode='compatibility';resetRendererBackend();presentFrame();check('compatibility mode keeps Canvas fallback',rendererSnapshot().backend!=='webgl2-hybrid');
S.rendererMode='gpu';resetRendererBackend();presentFrame();const gpu=rendererSnapshot();check('GPU mode initializes or safely falls back',['webgl2-hybrid','canvas2d-fallback'].includes(gpu.backend),gpu.backend);check('GPU pass never exceeds one draw call',gpu.drawCalls<=1);
reset();S.rendererMode='gpu';resetThreeRenderer();const threeOk=renderThreeScene(),three=threeSnapshot();check('Three.js scene initializes',threeOk,three.error);if(threeOk){check('Three.js reports real geometry',three.geometries>0);check('Three.js draw calls remain bounded',three.drawCalls<900,three.drawCalls);}

for(const [kind,facility,x]of [['crime','policeStation',18],['fire','fireStation',21],['medical','clinic',26]]){const r=lifecycle(kind,facility,x);check(kind+' incident spawned',!!r.inc);check(kind+' reaches working state',r.seen.has('WORKING'),[...r.seen].join(','));check(kind+' enters return state',r.seen.has('RETURNING'),[...r.seen].join(','));check(kind+' vehicle cleans up',r.remaining===0);check(kind+' resolves only after response',r.resolved>0);}

S.rendererMode='compatibility';S.quality='battery';save();S.rendererMode='auto';S.quality='high';check('renderer preferences survive Save V3',load()&&S.rendererMode==='compatibility'&&S.quality==='battery');store.set(KEY,'');

const failed=checks.filter(c=>!c.pass);document.getElementById('results').textContent=JSON.stringify({pass:!failed.length,checks},null,2);document.documentElement.dataset.result=failed.length?'fail':'pass';
