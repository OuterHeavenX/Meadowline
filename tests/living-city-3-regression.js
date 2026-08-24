import { restoreFacilityOccupancy } from '../src/buildings/buildings.js';
import { FEEDBACK_LIMIT, emitFeedback, updateFeedback } from '../src/simulation/feedback.js';
import { recomputeEmployment } from '../src/simulation/employment.js';
import { updateMunicipal } from '../src/simulation/municipal.js';
import { KEY, load, save, store } from '../src/core/save.js';
import { S } from '../src/core/state.js';
import { resetProgression } from '../src/progression/city-growth.js';
import { genWorld } from '../src/world/map.js';
import { recompute } from '../src/simulation/mood.js';
import { canPaintWater, paintWater } from '../src/world/landscaping.js';
import { idx } from '../src/world/tiles.js';
import { getBuildingDefinition } from '../src/buildings/registry.js';

const checks=[]; const check=(name,condition,detail='')=>checks.push({name,pass:!!condition,detail});
function root(type,x,y,pop=0){const b={type,x,y,pop,seed:x*101+y,state:{}};const fp=getBuildingDefinition(type)?.placement?.footprint||[1,1];for(let dy=0;dy<fp[1];dy++)for(let dx=0;dx<fp[0];dx++){S.terr[idx(x+dx,y+dy)]=0;S.grid[idx(x+dx,y+dy)]=null;}restoreFacilityOccupancy(b);return b;}
function reset(){genWorld(8080);resetProgression('legacy-open');S.coins=5000;S.feedback=[];S.incidents=[];S.serviceVehicles=[];}
reset();
S.terr[idx(10,10)]=0; check('water accepts clear opened land',canPaintWater(10,10).ok); const before=S.coins; check('water paints real terrain',paintWater(10,10).ok&&S.terr[idx(10,10)]===1&&S.coins===before-6);
root('house',11,10,4);check('water refuses occupied land',!canPaintWater(11,10).ok);
save();S.terr[idx(10,10)]=0;check('player water survives V3 round trip',load()&&S.terr[idx(10,10)]===1);

reset();for(let x=8;x<24;x++)root('road',x,15);root('house',10,14,8);root('cafe',13,14);root('policeStation',18,13);root('fireStation',21,12);root('clinic',16,13);recompute();
const work=recomputeEmployment();check('employment bounded by workers and jobs',work.employed<=work.workers&&work.employed<=work.jobs&&work.unemployed>=0);
const random=Math.random;Math.random=()=>0;updateMunicipal(1);Math.random=random;
check('municipal capacities derive from real facilities',S.municipal.safety.capacity===2&&S.municipal.fire.capacity===2&&S.municipal.healthcare.capacity>=18);
check('shared dispatcher bounds service actors',S.serviceVehicles.length<=3&&S.incidents.length<=3);

for(let i=0;i<FEEDBACK_LIMIT+12;i++)emitFeedback(i%5,i%5,'mood','☺');check('feedback pool remains bounded',S.feedback.length===FEEDBACK_LIMIT);updateFeedback(3);check('feedback expires cleanly',S.feedback.length===0);

const failed=checks.filter(c=>!c.pass);document.getElementById('results').textContent=JSON.stringify({pass:!failed.length,checks},null,2);document.documentElement.dataset.result=failed.length?'fail':'pass';store.set(KEY,'');
