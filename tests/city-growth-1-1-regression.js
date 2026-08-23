import { S } from '../src/core/state.js';
import { touchIntent,TOUCH_PAINT_HOLD_MS } from '../src/core/input-policy.js';
import { resetProgression } from '../src/progression/city-growth.js';
import { genWorld } from '../src/world/map.js';
import { recompute } from '../src/simulation/mood.js';
import { getEligibleGoals,hasFunctionalRailRoute,rollWishes,sanitizeGoals } from '../src/simulation/wishes.js';
import { idx } from '../src/world/tiles.js';
const checks=[];const check=(name,v)=>checks.push({name,pass:!!v});
function put(type,x,y,state={}){S.terr[idx(x,y)]=0;S.grid[idx(x,y)]={type,x,y,seed:1,pop:0,grow:0,mood:50,linked:false,state};}
genWorld(24681357);resetProgression('parcel');recompute();S.wishes=[];rollWishes();
const settlement=[...getEligibleGoals('primary'),...getEligibleGoals('optional')];
check('settlement has no train',!settlement.includes('train'));check('settlement has no boats',!settlement.includes('boats'));check('settlement has no school',!settlement.includes('school'));
S.cityProgress.stage=2;S.wishes=[];const village=[...getEligibleGoals('primary'),...getEligibleGoals('optional')];check('village can guide school',village.includes('school'));check('village still has no train',!village.includes('train'));check('village has no boats',!village.includes('boats'));
S.cityProgress.stage=3;S.wishes=[];const townshipBefore=[...getEligibleGoals('primary'),...getEligibleGoals('optional')];check('township can guide rail',townshipBefore.includes('rail'));check('train waits for infrastructure',!townshipBefore.includes('train'));
for(let x=14;x<20;x++)put('rail',x,16);put('station',14,17);recompute();check('rail readiness becomes meaningful',hasFunctionalRailRoute());const townshipAfter=[...getEligibleGoals('primary'),...getEligibleGoals('optional')];check('train becomes eligible after transit readiness',townshipAfter.includes('train'));
check('touch building drag pans',touchIntent({tool:'house',movedPx:12,heldMs:50,pointers:1})==='pan');check('touch road quick drag pans',touchIntent({tool:'road',movedPx:12,heldMs:80,pointers:1})==='pan');check('touch road hold paints',touchIntent({tool:'road',movedPx:2,heldMs:TOUCH_PAINT_HOLD_MS,pointers:1})==='paint');check('touch remove quick drag pans',touchIntent({tool:'erase',movedPx:12,heldMs:80,pointers:1})==='pan');check('second pointer pinches',touchIntent({tool:'school',movedPx:0,heldMs:0,pointers:2})==='pinch');
const bad=sanitizeGoals([{k:'boats',slot:'primary',t:'boat',g:1,r:1},{k:'train',slot:'optional',t:'train',g:1,r:1}]);check('old ineligible transport goals are sanitized',bad.length===0);
const failed=checks.filter(c=>!c.pass);document.getElementById('results').textContent=JSON.stringify({pass:!failed.length,checks},null,2);document.documentElement.dataset.result=failed.length?'fail':'pass';
