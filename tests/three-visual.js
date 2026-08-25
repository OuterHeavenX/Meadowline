import { S } from '../src/core/state.js';
import { genWorld, centreCamera } from '../src/world/map.js';
import { idx } from '../src/world/tiles.js';
import { defaultBuildingState } from '../src/buildings/registry.js';
import { restoreFacilityOccupancy } from '../src/buildings/buildings.js';
import { renderThreeScene } from '../src/rendering/three-renderer.js';

genWorld(310031);S.rendererMode='gpu';S.quality='high';S.dayT=.69;S.wx={k:'clear',amt:0,target:0,next:70};
S.terr.fill(0);S.natTree.fill(0);S.grid.fill(null);
function put(type,x,y,state={}){const b={type,x,y,seed:(x*73856093^y*19349663)>>>0,pop:type==='house'?6:0,grow:0,mood:78,linked:true,state:{...defaultBuildingState(type),...state}};restoreFacilityOccupancy(b);return b;}
function road(x,y){S.grid[idx(x,y)]={type:'road',x,y,seed:x*101+y};}
for(let x=6;x<=37;x++){road(x,12);road(x,21);road(x,31);}for(let y=6;y<=37;y++){road(10,y);road(20,y);road(30,y);}
for(let y=24;y<=28;y++)for(let x=23;x<=27;x++)S.terr[idx(x,y)]=1;
const buildings=[['cityHall',15,15,{level:4}],['school',24,15,{level:2}],['policeStation',6,16,{}],['fireStation',32,14,{}],['hospital',14,25,{}],['townPark',32,24,{}],['cafe',12,10,{}],['market',17,10,{}],['bakery',22,10,{}],['mill',34,9,{}],['playground',6,25,{}],['sportsCourt',24,33,{}]];
for(const b of buildings)put(...b);
const homes=[[7,10,1],[8,14,2],[13,13,3],[16,19,2],[22,13,3],[27,19,1],[32,10,2],[35,19,3],[7,33,2],[12,34,3],[18,34,1],[32,34,3],[36,29,2]];for(const [x,y,t]of homes)put('house',x,y,{housingTier:t});
for(const [x,y]of[[5,8],[7,8],[13,8],[15,8],[25,8],[28,9],[33,7],[37,11],[5,20],[8,23],[13,23],[18,24],[28,23],[37,22],[6,36],[10,38],[16,37],[22,37],[28,37],[36,37]])put('tree',x,y);
S.citizens=Array.from({length:28},(_,i)=>({x:11+i%9*2.1,y:13+Math.floor(i/9)*3.5,nx:12+i%9*2.1,ny:13+Math.floor(i/9)*3.5,p:(i%5)/5,color:['#d78d67','#6f91b5','#dda34c','#7f6aa7'][i%4]}));
S.vehicles=Array.from({length:14},(_,i)=>({x:11+i%7*3.4,y:i<7?12:31,nx:12+i%7*3.4,ny:i<7?12:31,p:.35,color:['#d65843','#e0a83e','#557e9f','#75a05a'][i%4]}));
S.serviceVehicles=[{x:20,y:17,nx:20,ny:18,p:.4,type:'police',state:'EN_ROUTE'},{x:30,y:21,nx:29,ny:21,p:.2,type:'fireEngine',state:'EN_ROUTE'},{x:18,y:31,nx:19,ny:31,p:.6,type:'ambulance',state:'RETURNING'}];
S.incidents=[{kind:'fire',target:{x:35,y:19},resolved:false},{kind:'crime',target:{x:17,y:10},resolved:false}];
centreCamera();
function frame(t){S.t=t/1000;const ok=renderThreeScene();document.getElementById('debug').textContent=ok?'':'fallback: '+S.diagnostics.rendererError;document.getElementById('debug').hidden=ok;requestAnimationFrame(frame)}requestAnimationFrame(frame);
