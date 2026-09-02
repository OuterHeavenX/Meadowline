import * as THREE from '../../assets/vendor/three.module.min.js';
import * as statue from './assets/statue.mesh.js';
import * as clockTower from './assets/clockTower.mesh.js';
import * as lighthouse from './assets/lighthouse.mesh.js';
import * as greatLibrary from './assets/greatLibrary.mesh.js';
import * as farm from './assets/farm.mesh.js';
import * as mill from './assets/mill.mesh.js';

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
const MESHES={statue,clockTower,lighthouse,greatLibrary,farm,mill};

const cache=new Map();

export function hasLandmark(type){ return !!MESHES[type]; }

function build(mesh){
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(mesh.POSITIONS,3));
  geometry.setAttribute('normal',new THREE.BufferAttribute(mesh.NORMALS,3));
  for(const[start,count,material]of mesh.GROUPS) geometry.addGroup(start,count,material);
  // The renderer's disposeGroup() frees anything it does not recognise as
  // shared. These are shared - one geometry serves every copy of a building,
  // and there is only ever one of each anyway - so they are marked as cached.
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

export function landmarkAsset(type){
  if(cache.has(type)) return cache.get(type);
  const mesh=MESHES[type];
  if(!mesh) return null;
  const asset={
    geometry:build(mesh),
    materials:mesh.COLORS.map((hex,i)=>materialFor(hex,!!mesh.LIT?.[i])),
    triangles:mesh.TRIANGLES
  };
  cache.set(type,asset);
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
