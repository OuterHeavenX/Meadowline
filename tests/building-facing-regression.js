import { canRelocate, isMovable, place, relocate } from '../src/buildings/buildings.js';
import { S } from '../src/core/state.js';
import { resetProgression } from '../src/progression/city-growth.js';
import { recompute } from '../src/simulation/mood.js';
import { roadNear, roadNearFacility } from '../src/transport/roads.js';
import { facingAngle } from '../src/world/facing.js';
import { genWorld } from '../src/world/map.js';
import { facilityRootAt, idx } from '../src/world/tiles.js';
import { COLORS as HOUSE_COLORS, GROUPS as HOUSE_GROUPS, POSITIONS as HOUSE_POSITIONS } from '../src/rendering/assets/house-1.mesh.js';

const checks=[];
const check=(name,value,detail)=>checks.push({name,pass:Boolean(value),detail});
function reset(){
  genWorld(13572468); resetProgression('legacy-open'); S.cityProgress.stage=4;
  S.coins=90000; S.citizens=[]; S.vehicles=[];
  // A clear, dry building plot, so nothing below is decided by where the
  // generator happened to put a pond or a wood.
  for(let y=16;y<32;y++) for(let x=16;x<32;x++){ const i=idx(x,y); S.terr[i]=0; S.natTree[i]=0; S.grid[i]=null; }
}
const HALF=Math.PI/2;
const near=(a,b)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)))<1e-6;

/* ---------- frontage ---------- */
reset();
// A 3x3 Hospital with a street along its far side. Its anchor tile is at the
// top-left corner, so the anchor's own four neighbours never touch that road.
place('hospital',20,20);
for(let x=19;x<=23;x++) place('road',x,23);
const hospital=S.grid[idx(20,20)];
check('a road at the far side of a footprint is not seen from the anchor tile',!roadNear(20,20),roadNear(20,20));
check('a road at the far side of a footprint reaches the building',!!roadNearFacility(hospital),roadNearFacility(hospital));
recompute();
check('road access is recorded for a building that is not a house',hospital.linked===true,hospital.linked);

reset();
place('cafe',20,20);
const cafe=S.grid[idx(20,20)];
recompute();
check('a building with no road reads as disconnected',cafe.linked===false,cafe.linked);
place('road',20,21);
recompute();
check('a building with a road reads as connected',cafe.linked===true,cafe.linked);

/* ---------- facing ---------- */
reset();
place('house',20,20);
const home=S.grid[idx(20,20)];
check('a house with no street keeps its default facing',near(facingAngle(home),0),facingAngle(home));
place('road',20,21);
check('a house faces a street on its +y side without turning',near(facingAngle(home),0),facingAngle(home));
reset();
place('house',20,20); place('road',20,19);
check('a house turns to face a street behind it',near(facingAngle(S.grid[idx(20,20)]),Math.PI),facingAngle(S.grid[idx(20,20)]));
reset();
place('house',20,20); place('road',21,20);
check('a house turns to face a street to its +x side',near(facingAngle(S.grid[idx(20,20)]),HALF),facingAngle(S.grid[idx(20,20)]));
reset();
place('house',20,20); place('road',19,20);
check('a house turns to face a street to its -x side',near(facingAngle(S.grid[idx(20,20)]),-HALF),facingAngle(S.grid[idx(20,20)]));

reset();
// A 2x3 Fire Station cannot take a quarter turn without hanging over the
// tiles either side of it, so a street on its long side leaves it as it is.
place('fireStation',20,20);
place('road',22,20); place('road',22,21); place('road',22,22);
check('an oblong footprint does not take a quarter turn',near(facingAngle(S.grid[idx(20,20)]),0),facingAngle(S.grid[idx(20,20)]));
reset();
place('fireStation',20,20);
for(let x=20;x<22;x++) place('road',x,19);
check('an oblong footprint still turns end for end',near(facingAngle(S.grid[idx(20,20)]),Math.PI),facingAngle(S.grid[idx(20,20)]));

reset();
place('road',20,20);
check('a road is never turned',near(facingAngle(S.grid[idx(20,20)]),0),facingAngle(S.grid[idx(20,20)]));

/* ---------- the turn puts the door at the street ----------
   The angles above are only right if they agree with the model. The door is a
   colour group in the authored mesh, so where it ends up can be worked out
   rather than squinted at in a screenshot: take the door's middle, turn it the
   way the renderer turns the building, and see which neighbouring tile it
   points at. */
const DOOR='#725342';
function doorOffset(){
  let sx=0,sz=0,n=0;
  for(const[start,count,colour]of HOUSE_GROUPS){
    if(HOUSE_COLORS[colour]!==DOOR) continue;
    for(let v=start;v<start+count;v++){ sx+=HOUSE_POSITIONS[v*3]; sz+=HOUSE_POSITIONS[v*3+2]; n++; }
  }
  return n?{x:sx/n,z:sz/n}:null;
}
const door=doorOffset();
check('the house model has a door to aim',!!door&&Math.hypot(door.x,door.z)>0.15,door);
// Three.js turns about Y as x' = x cos + z sin, z' = -x sin + z cos, and world
// z is the grid's y.
function doorSide(b){
  const a=facingAngle(b),d=doorOffset();
  const x=d.x*Math.cos(a)+d.z*Math.sin(a),y=-d.x*Math.sin(a)+d.z*Math.cos(a);
  return Math.abs(x)>Math.abs(y)?{dx:Math.sign(x),dy:0}:{dx:0,dy:Math.sign(y)};
}
for(const[dx,dy,where]of[[0,-1,'behind it'],[1,0,'to its +x'],[0,1,'in front of it'],[-1,0,'to its -x']]){
  reset();
  place('house',20,20); place('road',20+dx,20+dy);
  const side=doorSide(S.grid[idx(20,20)]);
  check('the door ends up on the street '+where,side.dx===dx&&side.dy===dy,
    'door at '+side.dx+','+side.dy+' road at '+dx+','+dy);
}

/* ---------- moving a building ---------- */
reset();
place('house',20,20);
const moved=S.grid[idx(20,20)];
moved.pop=4; moved.state.housingTier=3;
const seed=moved.seed, coinsBefore=S.coins;
const r=relocate(moved,25,25);
check('a building can be moved',r.ok,r.why);
check('the tile it left is empty',!S.grid[idx(20,20)]);
check('it is standing where it was put',S.grid[idx(25,25)]===moved&&moved.x===25&&moved.y===25);
check('it is the same building, not a rebuilt one',moved.seed===seed&&moved.pop===4&&moved.state.housingTier===3,
  moved.seed+'/'+moved.pop+'/'+moved.state.housingTier);
check('moving a building is free',S.coins===coinsBefore,coinsBefore+' -> '+S.coins);

reset();
place('hospital',20,20);
const big=S.grid[idx(20,20)];
check('the whole footprint travels',relocate(big,25,25).ok&&facilityRootAt(26,26)===big&&!S.grid[idx(21,21)]);

reset();
place('hospital',20,20); place('house',26,26);
check('a building cannot be moved onto another one',!canRelocate(S.grid[idx(20,20)],24,24).ok);
check('a building can shuffle one tile without blocking itself',canRelocate(S.grid[idx(20,20)],21,20).ok,
  canRelocate(S.grid[idx(20,20)],21,20).why);
check('a refused move leaves the building where it was',S.grid[idx(20,20)]?.type==='hospital'&&facilityRootAt(22,22)?.type==='hospital');

reset();
place('road',20,20);
check('ways are not carried about',!isMovable(S.grid[idx(20,20)])&&!canRelocate(S.grid[idx(20,20)],25,25).ok);
check('a building is movable',(place('cafe',24,24),isMovable(S.grid[idx(24,24)])));

reset();
place('cafe',20,20);
const shop=S.grid[idx(20,20)];
S.terr[idx(25,25)]=1;
check('a building cannot be moved into the water',!canRelocate(shop,25,25).ok,canRelocate(shop,25,25).why);
check('a building cannot be moved outside the valley',!canRelocate(shop,-3,20).ok,canRelocate(shop,-3,20).why);
check('a building cannot be moved onto the tile it already stands on',!canRelocate(shop,20,20).ok);
check('every refusal still leaves it standing where it was',S.grid[idx(20,20)]===shop&&shop.x===20&&shop.y===20);

const failed=checks.filter(c=>!c.pass);
document.getElementById('results').textContent=JSON.stringify({pass:!failed.length,checks},null,2);
document.documentElement.dataset.result=failed.length?'fail':'pass';
