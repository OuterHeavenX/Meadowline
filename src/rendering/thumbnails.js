import * as THREE from '../../assets/vendor/three.module.min.js';
import { hasLandmark, landmarkAsset } from './landmark-assets.js';

/* ---------- build-catalogue thumbnails ----------
   A picture of the building, rendered from the same Blender mesh the city is
   built from, so the card in the Build tray and the thing that lands on the
   grid are the same object. A line icon cannot say whether a School is a
   cottage or a civic block, and at 23 buildings the catalogue had become a
   wall of similar green glyphs.

   Rendered once each into a data URL and cached: this is a second, tiny WebGL
   context that draws 23 frames in its life and then sits idle. Everything is
   wrapped so that a machine without a second context - or without WebGL at
   all - simply gets null back, and the toolbar keeps its line icons. */
const SIZE=176;
let renderer=null,scene=null,camera=null,rig=null,failed=false;
const cache=new Map();

function ensure(){
  if(failed) return false;
  if(renderer) return true;
  try{
    const canvas=document.createElement('canvas');
    canvas.width=canvas.height=SIZE;
    renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,preserveDrawingBuffer:true});
    renderer.setSize(SIZE,SIZE,false);
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure=1.16;
    scene=new THREE.Scene();
    // The same angles the city is drawn at - 45 degrees round, 30 up - so a
    // thumbnail is the building as the player will actually see it.
    camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,100);
    const hemi=new THREE.HemisphereLight('#dceeff','#6f9152',2.0);
    const sun=new THREE.DirectionalLight('#fff2cf',3.0);
    sun.position.set(-6,9,-4);
    scene.add(hemi,sun);
    rig=new THREE.Group(); scene.add(rig);
    return true;
  }catch(e){ failed=true; renderer=null; return false; }
}

function frame(group){
  const box=new THREE.Box3().setFromObject(group);
  if(box.isEmpty()) return false;
  const size=new THREE.Vector3(),centre=new THREE.Vector3();
  box.getSize(size); box.getCenter(centre);
  // Frame on the widest of the three, with a little air, so a 3x3 library and
  // a 1x1 windmill are both fully in shot at their own scale.
  const reach=Math.max(size.x,size.z,size.y*1.15)*0.86+0.35;
  camera.left=-reach; camera.right=reach; camera.top=reach; camera.bottom=-reach;
  const radius=30,azimuth=Math.PI/4,height=radius*Math.tan(Math.PI/6);
  camera.position.set(centre.x+radius*Math.cos(azimuth),centre.y+height,centre.z+radius*Math.sin(azimuth));
  camera.lookAt(centre.x,centre.y,centre.z);
  camera.updateProjectionMatrix();
  return true;
}

/* A PNG data URL for one building, or null when there is no authored mesh for
   it or no context to draw in. Cached by key - the catalogue asks for the same
   two dozen pictures every time it opens. */
export function buildingThumbnail(key){
  if(cache.has(key)) return cache.get(key);
  let url=null;
  if(hasLandmark(key)&&ensure()){
    try{
      const asset=landmarkAsset(key);
      const group=new THREE.Group();
      for(const part of asset.parts){
        // Cloned so the catalogue never touches the materials the city is
        // drawn with; one renderer compiling another's programs is a good way
        // to make a frame hitch appear somewhere unrelated.
        group.add(new THREE.Mesh(part.geometry,part.material.clone()));
      }
      rig.add(group);
      if(frame(group)){
        renderer.render(scene,camera);
        url=renderer.domElement.toDataURL('image/png');
      }
      rig.remove(group);
      group.traverse(o=>{ if(o.material) o.material.dispose(); });
    }catch(e){ url=null; }
  }
  cache.set(key,url);
  return url;
}

export function thumbnailReport(){
  const out={drawn:0,missing:0};
  for(const url of cache.values()) url?out.drawn++:out.missing++;
  return {...out,context:failed?'unavailable':renderer?'ready':'idle'};
}
