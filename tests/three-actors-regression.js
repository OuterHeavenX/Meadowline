import { S } from '../src/core/state.js';
import { genWorld } from '../src/world/map.js';
import { idx } from '../src/world/tiles.js';
import { BUILDINGS, defaultBuildingState } from '../src/buildings/registry.js';
import { restoreFacilityOccupancy } from '../src/buildings/buildings.js';
import { resetProgression } from '../src/progression/city-growth.js';
import { renderThreeScene, resetThreeRenderer, threeDynamicSnapshot, threeSnapshot } from '../src/rendering/three-renderer.js';
import { SKIN, HAIR, personSeed } from '../src/rendering/people-palette.js';
import { L } from './grid-fixture.js';

/* What the low-poly scene shows of what the town is doing. The Canvas renderer
   has always drawn people walking, engines at fires, cruisers after burglars,
   ambulances at the sick and boats on the lake; this page asserts the GPU
   scene draws the same story, by looking at what the moving layer holds rather
   than at pixels - a fire has flames, a working engine has a hose, a crowd of
   a hundred and fifty costs six draw calls. */
const checks=[],check=(name,pass,detail='')=>checks.push({name,pass:!!pass,detail});
function road(x,y){S.grid[idx(x,y)]={type:'road',x,y,seed:x*101+y};}
function root(type,x,y,state={}){const def=BUILDINGS[type],fp=def.placement?.footprint||[1,1];for(let yy=0;yy<fp[1];yy++)for(let xx=0;xx<fp[0];xx++){S.terr[idx(x+xx,y+yy)]=0;S.grid[idx(x+xx,y+yy)]=null;}const b={type,x,y,seed:x*1009+y*313,pop:type==='house'?4:0,state:{...defaultBuildingState(type),...state}};restoreFacilityOccupancy(b);return b;}
function scene(){ genWorld(4242);resetProgression('legacy-open');S.terr.fill(0);S.natTree.fill(0);S.grid.fill(null);S.citizens=[];S.vehicles=[];S.serviceVehicles=[];S.trains=[];S.boats=[];S.incidents=[];S.wx={k:'clear',amt:0,target:0,next:70};S.dayT=.4;S.t=1;
  for(let x=10;x<40;x++) road(L(x),L(20)); for(const x of [12,16,20,24]) root('house',L(x),L(19),{housingTier:1+(x%3)}); root('policeStation',L(30),L(17)); root('fireStation',L(34),L(17)); root('clinic',L(26),L(22)); root('cafe',L(28),L(19)); }
function person(i,moving=true){ const x=L(12+i%20),y=L(20); return {x,y,px:x,py:y,nx:moving?x+1:x,ny:y,p:.3,sp:.5,col:['#e8735f','#5d8fc4','#e0b451'][i%3],bob:i*.37,side:1,carry:i%4===0?1:0,doing:'home'}; }
function frame(){ renderThreeScene(); return threeDynamicSnapshot(); }

S.rendererMode='gpu';S.quality='balanced';resetThreeRenderer();scene();
const ok=renderThreeScene(); check('the low-poly scene initialises',ok,threeSnapshot().error);
if(ok){
  /* ---------- people ---------- */
  {
    S.citizens=Array.from({length:12},(_,i)=>person(i));
    const snap=frame();
    check('every citizen has two legs',snap.kinds['people-legs']===24,snap.kinds['people-legs']);
    check('two arms',snap.kinds['people-arms']===24,snap.kinds['people-arms']);
    check('a torso, a head and hair',snap.kinds['people-torsos']===12&&snap.kinds['people-heads']===12&&snap.kinds['people-hair']===12,JSON.stringify(snap.kinds));
    check('the ones carrying something carry it',snap.kinds['people-carry']===3,snap.kinds['people-carry']);
    // Twenty people stand on the same twenty tiles a hundred and fifty do, so
    // the two frames cull alike and the only difference is the crowd.
    S.citizens=Array.from({length:20},(_,i)=>person(i));
    const twenty=frame().drawCalls;
    S.citizens=Array.from({length:150},(_,i)=>person(i));
    const crowd=frame();
    check('a crowd of one hundred and fifty draws as one of twenty does',crowd.drawCalls<=twenty,twenty+' -> '+crowd.drawCalls);
    check('and every one of them has legs',crowd.kinds['people-legs']===300,crowd.kinds['people-legs']);
    // Skin and hair come from the same palette on both renderers, from the same seed.
    const c=S.citizens[5]; check('skin and hair are dealt from the shared palette by the citizen\'s own seed',SKIN.length===5&&HAIR.length===6&&personSeed(c)===Math.abs(Math.round(c.bob*1000)));
  }
  /* ---------- vehicles ---------- */
  {
    S.citizens=[];
    S.serviceVehicles=[
      {id:1,x:L(31),y:L(20),nx:L(32),ny:L(20),p:.4,type:'police',state:'EN_ROUTE',incidentId:1},
      {id:2,x:L(35),y:L(20),nx:L(34),ny:L(20),p:.2,type:'fireEngine',state:'EN_ROUTE',incidentId:2},
      {id:3,x:L(27),y:L(20),nx:L(26),ny:L(20),p:.6,type:'ambulance',state:'RETURNING',incidentId:3}];
    S.vehicles=[{id:4,x:L(14),y:L(20),nx:L(15),ny:L(20),p:.5,color:'#d65843'},{id:5,x:L(18),y:L(20),nx:L(19),ny:L(20),p:.5,color:'#557e9f',type:'van'}];
    const snap=frame();
    check('a fire engine carries a ladder',snap.kinds['ladder']>=2,snap.kinds['ladder']);
    check('an ambulance carries a cross',snap.kinds['cross']>=2,snap.kinds['cross']);
    check('a cruiser has white doors and a light bar',snap.kinds['door-band']===1&&snap.kinds['lightbar']>=3,JSON.stringify([snap.kinds['door-band'],snap.kinds['lightbar']]));
    check('every vehicle is a typed vehicle',snap.kinds['vehicle:police']===1&&snap.kinds['vehicle:fireEngine']===1&&snap.kinds['vehicle:ambulance']===1&&snap.kinds['vehicle:car']===1&&snap.kinds['vehicle:van']===1,JSON.stringify(snap.kinds));
    check('no hose runs while the engine is still on its way',!snap.kinds['hose']);
  }
  /* ---------- a fire, and the crew putting it out ---------- */
  {
    S.incidents=[{id:2,kind:'fire',target:{x:L(16),y:L(19)},resolved:false,status:'EN_ROUTE'}];
    S.serviceVehicles=[{id:2,x:L(17),y:L(20),nx:L(16),ny:L(20),p:.9,type:'fireEngine',state:'EN_ROUTE',incidentId:2}];
    let snap=frame();
    check('a fire burns as flames, smoke and a glow on the ground',snap.kinds['flame']===3&&snap.kinds['smoke']===4&&snap.kinds['glow']===1,JSON.stringify(snap.kinds));
    check('the flames move',(()=>{ S.t=1; renderThreeScene(); const a=JSON.stringify(threeDynamicSnapshot().kinds); S.t=1.4; renderThreeScene(); return a===JSON.stringify(threeDynamicSnapshot().kinds); })(),'same kinds, animated in place');
    S.incidents[0].status='WORKING'; S.serviceVehicles[0].state='WORKING'; S.serviceVehicles[0].x=L(16); S.serviceVehicles[0].nx=L(16);
    snap=frame();
    check('a working engine runs a hose to the fire',snap.kinds['hose']===1&&snap.kinds['spray']===3,JSON.stringify([snap.kinds['hose'],snap.kinds['spray']]));
    S.incidents[0].resolved=true; snap=frame();
    check('a resolved fire is out',!snap.kinds['flame']&&!snap.kinds['hose'],JSON.stringify(snap.kinds));
  }
  /* ---------- a crime, and the cruiser after it ---------- */
  {
    S.serviceVehicles=[]; S.incidents=[{id:1,kind:'crime',target:{x:L(20),y:L(19)},resolved:false,status:'EN_ROUTE'}];
    let snap=frame();
    check('a burglar stands at a robbed house',snap.kinds['people-legs']===2&&snap.kinds['people-torsos']===1,JSON.stringify(snap.kinds));
    S.incidents[0].tag='raid'; snap=frame();
    check('a raid the police raised themselves shows no burglar',!snap.kinds['people-legs'],JSON.stringify(snap.kinds));
    S.incidents[0].tag=null; S.incidents[0].resolved=true; snap=frame();
    check('a caught burglar is gone',!snap.kinds['people-legs']);
  }
  /* ---------- a medical call ---------- */
  {
    S.incidents=[{id:3,kind:'medical',target:{x:L(24),y:L(19)},resolved:false,status:'EN_ROUTE'}];
    let snap=frame();
    check('someone lies where the ambulance is coming, under a marker',snap.kinds['people-torsos']===1&&snap.kinds['medical-marker']===2&&!snap.kinds['stretcher'],JSON.stringify(snap.kinds));
    S.incidents[0].status='WORKING'; snap=frame();
    check('a working ambulance has a stretcher out',snap.kinds['stretcher']===1);
  }
  /* ---------- boats and trains ---------- */
  {
    S.incidents=[];
    S.boats=[{x:L(5),y:L(30),nx:L(6),ny:L(30),fx:L(5.5),fy:L(30),p:.5,hue:1,bob:1,wake:Array.from({length:10},(_,i)=>({x:L(5.5)-i*.08,y:L(30)}))}];
    S.trains=[{x:L(10),y:L(25),fx:L(10),fy:L(25),hue:2,hist:Array.from({length:30},(_,i)=>({x:L(10)-i*.1,y:L(25)}))}];
    const snap=frame();
    check('a boat has a hull, a deck, a mast and a sail',snap.kinds['hull']===1&&snap.kinds['deck']===1&&snap.kinds['mast']===1&&snap.kinds['sail']===1,JSON.stringify(snap.kinds));
    check('and leaves a wake',snap.kinds['wake']>=4,snap.kinds['wake']);
    check('a train is an engine and two cars',snap.kinds['train-car']===3&&snap.kinds['stack']===1&&snap.kinds['steam']===1,JSON.stringify([snap.kinds['train-car'],snap.kinds['stack']]));
  }
  /* ---------- budget ---------- */
  {
    S.citizens=Array.from({length:150},(_,i)=>person(i));
    S.vehicles=Array.from({length:20},(_,i)=>({id:10+i,x:L(11+i),y:L(20),nx:L(12+i),ny:L(20),p:.3,color:'#d65843'}));
    S.serviceVehicles=[{id:1,x:L(31),y:L(20),nx:L(32),ny:L(20),p:.4,type:'police',state:'EN_ROUTE'},{id:2,x:L(16),y:L(20),nx:L(16),ny:L(20),p:.9,type:'fireEngine',state:'WORKING',incidentId:2}];
    S.incidents=[{id:2,kind:'fire',target:{x:L(16),y:L(19)},resolved:false,status:'WORKING'},{id:1,kind:'crime',target:{x:L(20),y:L(19)},resolved:false,status:'EN_ROUTE'},{id:3,kind:'medical',target:{x:L(24),y:L(19)},resolved:false,status:'WORKING'}];
    const snap=frame();
    check('a full day of it all stays inside the draw-call budget',snap.drawCalls<600,snap.drawCalls);
    check('actor materials stay bounded',snap.actorMaterials<120,snap.actorMaterials);
    // Nothing here changed a single thing about the town.
    check('drawing moves nothing',S.incidents[0].status==='WORKING'&&S.citizens[3].x===L(15)&&S.serviceVehicles[1].state==='WORKING');
  }
}
const failed=checks.filter(c=>!c.pass);
document.getElementById('results').textContent=JSON.stringify({pass:!failed.length,checks},null,2);
document.documentElement.dataset.result=failed.length?'fail':'pass';
