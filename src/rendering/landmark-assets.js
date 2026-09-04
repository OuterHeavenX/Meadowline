import * as THREE from '../../assets/vendor/three.module.min.js';
import * as statue from './assets/statue.mesh.js';
import * as clockTower from './assets/clockTower.mesh.js';
import * as lighthouse from './assets/lighthouse.mesh.js';
import * as greatLibrary from './assets/greatLibrary.mesh.js';
import * as farm from './assets/farm.mesh.js';
import * as mill from './assets/mill.mesh.js';
import * as house1 from './assets/house-1.mesh.js';
import * as house2 from './assets/house-2.mesh.js';
import * as house3 from './assets/house-3.mesh.js';
import * as cafe from './assets/cafe.mesh.js';
import * as market from './assets/market.mesh.js';
import * as bakery from './assets/bakery.mesh.js';
import * as station from './assets/station.mesh.js';
import * as school from './assets/school.mesh.js';
import * as dock from './assets/dock.mesh.js';
import * as cityHall1 from './assets/cityHall-1.mesh.js';
import * as cityHall2 from './assets/cityHall-2.mesh.js';
import * as cityHall3 from './assets/cityHall-3.mesh.js';
import * as cityHall4 from './assets/cityHall-4.mesh.js';
import * as policeStation from './assets/policeStation.mesh.js';
import * as fireStation from './assets/fireStation.mesh.js';
import * as clinic from './assets/clinic.mesh.js';
import * as hospital from './assets/hospital.mesh.js';

/* ---------- the authored landmarks ----------
   The buildings whose silhouette carries a city, modelled in Blender by
   assets/source/blender/landmarks.py and reaching the renderer as geometry
   rather than as a file fetched at run time.

   This follows the seam tree-asset.js already established, and for the reason
   assets/ASSETS.md sets out: the game has no build step and a synchronous
   render path, so a glTF loader would mean vendoring 180 KB of unminified
   GLTFLoader - Draco, KTX2, skinning and all - for a handful of static
   meshes, and fetching the .glb would mean the first frames draw a wonder
   that has not arrived yet. The .glb beside each model stays the interchange
   artifact; one script emits both, so they cannot drift.

   One geometry per building with one group per material, which is what lets a
   whole wonder draw in as many calls as it has colours - four to nine each -
   rather than one per box the recipe stacked. */
const MESHES={statue,clockTower,lighthouse,greatLibrary,farm,mill,
  cafe,market,bakery,station,school,dock,
  policeStation,fireStation,clinic,hospital,
  'cityHall-1':cityHall1,'cityHall-2':cityHall2,'cityHall-3':cityHall3,'cityHall-4':cityHall4,
  // Homes are keyed by tier, not by type: an Established Home has grown a
  // porch and a dormer, and that is the whole point of upgrading one.
  'house-1':house1,'house-2':house2,'house-3':house3};

/* The key a building asks for. Everything is its own type except a home,
   whose tier is what decides which of the three it is. */
export function landmarkKey(b){
  if(!b) return '';
  if(b.type==='house') return 'house-'+Math.max(1,Math.min(3,Math.floor(Number(b.state?.housingTier)||1)));
  // The civic centre grows through four buildings, not one that gets taller.
  if(b.type==='cityHall') return 'cityHall-'+Math.max(1,Math.min(4,Math.floor(Number(b.state?.level)||1)));
  return b.type;
}

/* ---------- colour variety ----------
   A street of homes built from one mesh is one house repeated, and that is
   what the valley looked like: every cottage the same sand wall under the same
   navy roof. The geometry is already split per colour group, so each group can
   be instanced with its own per-instance tint - the same instanceColor trick
   the trees use for their canopy greens - and one mesh becomes a street.

   instanceColor multiplies the material colour, so the tint stored per
   instance is the ratio between the colour wanted and the one the model was
   authored with. */
const WALLS=['#f0e2c4','#e7d0a6','#efe7da','#d3ddc8','#eecab8','#d2dee7','#f2e0a8','#e4d3bd'];
const ROOFS=['#44607f','#a8503f','#c26a44','#417054','#4c515a','#6d4c60','#7d5642','#8a4a44'];

// Which group of which model takes which palette. Group indices come from the
// generated mesh module's COLORS array: for every house tier, 2 is the wall
// and 3 is the roof.
const TINTS={
  'house-1':{2:WALLS,3:ROOFS},
  'house-2':{2:WALLS,3:ROOFS},
  'house-3':{2:WALLS,3:ROOFS}
};

const ratios=new Map();
function tintRatio(base,target){
  const key=base+'>'+target;
  if(!ratios.has(key)){
    const b=new THREE.Color(base),t=new THREE.Color(target);
    ratios.set(key,new THREE.Color(t.r/(b.r||1),t.g/(b.g||1),t.b/(b.b||1)));
  }
  return ratios.get(key);
}

/* The tint for one instance of one colour group, or null when that group is
   not varied. Driven by the building's own seed, so a house keeps its colours
   for the life of the city instead of changing every time the world is
   rebuilt. */
export function landmarkTint(key,groupIndex,baseHex,seed){
  const palette=TINTS[key]?.[groupIndex];
  if(!palette) return null;
  // Wall and roof are drawn from different points in the seed so a house is
  // not limited to matched pairs.
  const spread=groupIndex===3?7:3;
  return tintRatio(baseHex,palette[Math.abs(Math.floor(seed/spread))%palette.length]);
}

export function landmarkVaries(key){ return !!TINTS[key]; }

const cache=new Map();

export function hasLandmark(key){ return !!MESHES[key]; }

function slice(mesh,from,count){
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(mesh.POSITIONS.slice(from*3,(from+count)*3),3));
  geometry.setAttribute('normal',new THREE.BufferAttribute(mesh.NORMALS.slice(from*3,(from+count)*3),3));
  // The renderer's disposeGroup() frees anything it does not recognise as
  // shared. These are shared - one geometry serves every copy of a building -
  // so they are marked as cached.
  geometry.userData.meadowlineCached=true;
  return geometry;
}

/* Materials are flat-shaded and per colour, so the whole kit shares them: two
   Wonders using the same cream draw from one material. A lit colour becomes
   an emissive material, which is what makes the clock faces and the lighthouse
   lantern read after dark without the renderer knowing which faces they are. */
const materials=new Map();
function materialFor(hex,lit){
  const key=hex+(lit?':lit':'');
  if(!materials.has(key)) materials.set(key,new THREE.MeshStandardMaterial({
    color:hex, roughness:lit?0.4:0.86, metalness:0,
    emissive:lit?hex:'#000000', emissiveIntensity:lit?0.9:0, flatShading:true
  }));
  return materials.get(key);
}

/* One geometry per colour rather than one per building, which is what lets a
   street of homes draw in as many calls as a home has colours instead of as
   many as the street has homes. Same trick the trees use, for the same
   reason. */
export function landmarkAsset(key){
  if(cache.has(key)) return cache.get(key);
  const mesh=MESHES[key];
  if(!mesh) return null;
  const parts=mesh.GROUPS.map(([from,count,material])=>({
    geometry:slice(mesh,from,count),
    material:materialFor(mesh.COLORS[material],!!mesh.LIT?.[material]),
    group:material,
    hex:mesh.COLORS[material]
  }));
  const asset={parts,triangles:mesh.TRIANGLES};
  cache.set(key,asset);
  return asset;
}

// Every emissive material in the kit, so the renderer can brighten them after
// dark the same way it does its procedural windows.
export function landmarkGlowMaterials(){
  const out=[];
  for(const[key,material]of materials) if(key.endsWith(':lit')) out.push(material);
  return out;
}

export function landmarkMetrics(){
  let triangles=0;
  for(const mesh of Object.values(MESHES)) triangles+=mesh.TRIANGLES;
  return {models:Object.keys(MESHES).length,triangles,materials:materials.size};
}
