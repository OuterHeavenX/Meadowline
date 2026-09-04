/* ---------- the authored tree ----------
   assets/models/vegetation/tree-lowpoly.glb, built by
   assets/source/blender/tree_lowpoly.py, reaching the renderer as geometry
   rather than as a file fetched at runtime. The generated module beside this
   one carries the same 184 triangles the .glb does.

   Split into two geometries rather than kept whole, because that is what lets
   the city draw every tree in two calls while keeping the palette variety the
   procedural trees had. An InstancedMesh carries one colour per instance
   across the entire mesh, so a single tree geometry would tint the trunk green
   along with the canopy. Trunks therefore instance separately at a fixed
   colour, and the canopy carries a vertex-colour tint that distinguishes its
   main lobe from the lighter one, which the per-instance green multiplies. */
import * as THREE from '../../assets/vendor/three.module.min.js';
import { COLORS, GROUPS, NORMALS, POSITIONS, TRIANGLES } from './assets/tree-lowpoly.mesh.js';

export const TREE_TRIANGLES=TRIANGLES;
export const TRUNK_COLOR=COLORS[0];

/* The canopy greens. Widened from the four the procedural trees used: a stand
   of trees in four near-identical greens reads as one shrub repeated, so there
   are lighter and warmer ones in here now - new growth, and the olive of a
   tree that catches more sun - alongside the deep originals. */
export const CANOPY_GREENS=['#3f8a52','#57a55e','#74b566','#2f6c4b','#8cc06a','#4d7f4a','#a8b95c','#6aa86e'];

let cache=null;

function slice(from,count){
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(POSITIONS.slice(from*3,(from+count)*3),3));
  geometry.setAttribute('normal',new THREE.BufferAttribute(NORMALS.slice(from*3,(from+count)*3),3));
  geometry.userData.meadowlineCached=true;
  return geometry;
}

/* Ratio of the two authored canopy colours, so the highlight lobe stays
   proportionally lighter whichever green an instance is given. */
function tintRatio(){
  const main=new THREE.Color(COLORS[1]),high=new THREE.Color(COLORS[2]);
  return [high.r/(main.r||1),high.g/(main.g||1),high.b/(main.b||1)];
}

export function treeAsset(){
  if(cache) return cache;
  const [trunkGroup,mainGroup,highGroup]=GROUPS;
  const trunk=slice(trunkGroup[0],trunkGroup[1]);

  const from=mainGroup[0],count=mainGroup[1]+highGroup[1];
  const canopy=slice(from,count);
  const tint=tintRatio(),colors=new Float32Array(count*3);
  for(let i=0;i<count;i++){
    const lighter=i>=mainGroup[1];
    colors[i*3]=lighter?tint[0]:1;
    colors[i*3+1]=lighter?tint[1]:1;
    colors[i*3+2]=lighter?tint[2]:1;
  }
  canopy.setAttribute('color',new THREE.BufferAttribute(colors,3));

  cache={trunk,canopy};
  return cache;
}

export function resetTreeAsset(){ cache=null; }
