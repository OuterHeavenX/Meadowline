import * as THREE from '../../assets/vendor/three.module.min.js';
import { H,W,clamp,mix } from '../core/constants.js';
import { S } from '../core/state.js';
import { getBuildingDefinition } from '../buildings/registry.js';
import { isTileUnlocked } from '../progression/city-growth.js';
import { isBridge } from '../transport/bridges.js';
import { idx,isFacilityPart,isType } from '../world/tiles.js';
import { CANOPY_GREENS, TREE_TRIANGLES, TRUNK_COLOR, treeAsset } from './tree-asset.js';
import { PAL } from '../world/seasons.js';

const materials=new Map(), geometries=new Map();
const C={
  grass:['#78aa62','#74a65d','#7eaf68','#70a158'],locked:['#708b68','#748f6d'],water:'#4384a0',shore:'#9ab77a',
  asphalt:'#50575b',wet:'#3f494f',sidewalk:'#d6d1c4',curb:'#b8b5ac',line:'#eee6c9',foundation:'#9c9990',
  glass:'#59879a',lit:'#ffd783',trunk:'#624632',hedge:'#3f7d4d',white:'#e8e5dc',red:'#a94940',blue:'#3f6985'
};
function mat(hex,rough=.82,metal=0,emissive=''){const key=[hex,rough,metal,emissive].join('/');if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color:hex,roughness:rough,metalness:metal,emissive:emissive||'#000000',emissiveIntensity:emissive?.7:0}));return materials.get(key);}
function basicMat(hex){const key=`basic:${hex}`;if(!materials.has(key))materials.set(key,new THREE.MeshBasicMaterial({color:hex}));return materials.get(key);}
function geo(key,make){if(!geometries.has(key)){const g=make();g.userData.meadowlineCached=true;geometries.set(key,g);}return geometries.get(key);}
function mesh(parent,geometry,material,x,y,z,cast=true){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=cast;m.receiveShadow=true;parent.add(m);return m;}
function box(parent,x,y,z,w,h,d,material,cast=true){return mesh(parent,geo(`box:${w}:${h}:${d}`,()=>new THREE.BoxGeometry(w,h,d)),material,x,y+h/2,z,cast);}
function cyl(parent,x,y,z,r,h,material,sides=8){return mesh(parent,geo(`cyl:${r}:${h}:${sides}`,()=>new THREE.CylinderGeometry(r,r,h,sides)),material,x,y+h/2,z,true);}
function cone(parent,x,y,z,r,h,material,sides=6){const m=mesh(parent,geo(`cone:${r}:${h}:${sides}`,()=>new THREE.ConeGeometry(r,h,sides)),material,x,y+h/2,z,true);m.rotation.y=Math.PI/4;return m;}
function sphere(parent,x,y,z,r,material){return mesh(parent,geo(`dodeca:${r}`,()=>new THREE.DodecahedronGeometry(r,0)),material,x,y,z,true);}
function gable(parent,x,y,z,w,d,h,material,turn=false){const key=`gable:${w}:${d}:${h}:${turn}`,g=geo(key,()=>{const ww=turn?d:w,dd=turn?w:d,v=new Float32Array([-ww/2,0,-dd/2,ww/2,0,-dd/2,0,h,-dd/2,-ww/2,0,dd/2,0,h,dd/2,ww/2,0,dd/2,-ww/2,0,-dd/2,-ww/2,0,dd/2,0,h,dd/2,0,h,-dd/2,ww/2,0,-dd/2,0,h,-dd/2,0,h,dd/2,ww/2,0,dd/2,-ww/2,0,-dd/2,ww/2,0,-dd/2,ww/2,0,dd/2,-ww/2,0,dd/2]),b=new THREE.BufferGeometry();b.setAttribute('position',new THREE.BufferAttribute(v,3));b.computeVertexNormals();return b;});const m=mesh(parent,g,material,x,y,z,true);if(turn)m.rotation.y=Math.PI/2;return m;}
function groupAt(parent,x,z){const g=new THREE.Group();g.position.set(x,0,z);parent.add(g);return g;}
function window(parent,x,y,z,axis='z',lit=false,w=.18,h=.22){const material=lit?mat(C.lit,.35,0,C.lit):mat(C.glass,.28,.08),d=.025;if(axis==='z')box(parent,x,y,z,w,h,d,material,false);else box(parent,x,y,z,d,h,w,material,false);}
function door(parent,x,y,z,w=.18,h=.3,color='#725342'){box(parent,x,y,z,w,h,.035,mat(color,.72),false);}
function path(parent,x,z,w,d,color=C.sidewalk){box(parent,x,.015,z,w,.028,d,mat(color,.94),false);}
function hedge(parent,x,z,w,d=.08,h=.16){box(parent,x,.02,z,w,h,d,mat(C.hedge,.92),true);}
function lamp(parent,x,z){cyl(parent,x,.02,z,.025,.55,mat('#343b3c',.38,.5),7);sphere(parent,x,.62,z,.065,mat(C.lit,.3,0,C.lit));}

export function roadMask(x,y,type='road'){let m=0;if(isType(x,y-1,type))m|=1;if(isType(x+1,y,type))m|=2;if(isType(x,y+1,type))m|=4;if(isType(x-1,y,type))m|=8;return m;}
export function roadKind(mask){const n=((mask&1)>0)+((mask&2)>0)+((mask&4)>0)+((mask&8)>0);if(n===4)return'cross';if(n===3)return'tee';if(n===2)return(mask===5||mask===10)?'straight':'corner';if(n===1)return'dead-end';return'isolated';}
export function waterMask(x,y){let m=0;const water=(xx,yy)=>xx>=0&&yy>=0&&xx<W&&yy<H&&S.terr[idx(xx,yy)]===1;if(water(x,y-1))m|=1;if(water(x+1,y))m|=2;if(water(x,y+1))m|=4;if(water(x-1,y))m|=8;return m;}
function road(parent,x,z,b){const mask=roadMask(x,z),kind=roadKind(mask),wet=S.wx?.k==='rain'&&(S.wx.amt||0)>.15,lift=isBridge(x,z)?.22:0,asphalt=mat(wet?C.wet:C.asphalt,wet?.5:.88,.04),walk=mat(C.sidewalk,.96),curb=mat(C.curb,.9),line=mat(C.line,.72);
  if(lift){box(parent,x,-.02,z,.94,.2,.94,mat('#756f69',.9),true);for(const side of[-.43,.43])box(parent,x,lift+.015,z+side,.96,.12,.055,mat('#d9d7cf',.75),true);}
  box(parent,x,lift,z,.98,.045,.98,asphalt,false);
  const edge=(bit,dx,dz,w,d)=>{if(!(mask&bit)){box(parent,x+dx,lift+.045,z+dz,w,.055,d,walk,false);box(parent,x+dx*.9,lift+.098,z+dz*.9,w,.025,d,curb,false);}};
  edge(1,0,-.44,.98,.12);edge(4,0,.44,.98,.12);edge(8,-.44,0,.12,.98);edge(2,.44,0,.12,.98);
  if(kind==='straight'){if(mask===10)for(const q of[-.3,0,.3])box(parent,x+q,lift+.048,z,.12,.012,.025,line,false);else for(const q of[-.3,0,.3])box(parent,x,lift+.048,z+q,.025,.012,.12,line,false);}
  if(kind==='dead-end'){const bit=[1,2,4,8].find(q=>mask&q),cap=bit===1?[0,.32,.72,.12]:bit===4?[0,-.32,.72,.12]:bit===2?[-.32,0,.12,.72]:[.32,0,.12,.72];box(parent,x+cap[0],lift+.048,z+cap[1],cap[2],.018,cap[3],line,false);}
  if(kind==='tee'||kind==='cross')for(const [bit,dx,dz,rot]of[[1,0,-.28,0],[2,.28,0,1],[4,0,.28,0],[8,-.28,0,1]])if(mask&bit)for(let q=-2;q<=2;q++){const stripe=box(parent,x+(rot?dx:q*.08),lift+.049,z+(rot?q*.08:dz),rot?.035:.035,.014,rot?.055:.055,line,false);stripe.rotation.y=0;}
  if(isBridge(x,z))for(const side of[-.43,.43])box(parent,x,lift+.04,z+side,.96,.11,.035,mat('#e1ded3',.7),true);
  if(b?.state?.roadRailCrossing){for(const q of[-.28,.28]){box(parent,x+q,lift+.052,z,.035,.02,.86,mat('#ddd5c5'),false);box(parent,x+q,lift+.075,z,.035,.035,.86,mat('#676b6d',.35,.5),false);}}
}
function rail(parent,x,z){const mask=roadMask(x,z,'rail'),lift=isBridge(x,z)?.22:0,ew=!!(mask&10),steel=mat('#697176',.3,.58),tie=mat('#574b42');box(parent,x,lift,z,.98,.045,.74,mat('#806f62'),false);if(ew){for(let q=-.4;q<=.4;q+=.2)box(parent,x+q,lift+.05,z,.045,.05,.72,tie,false);for(const q of[-.23,.23])box(parent,x,lift+.1,z+q,.98,.04,.04,steel,false);}else{for(let q=-.4;q<=.4;q+=.2)box(parent,x,lift+.05,z+q,.72,.05,.045,tie,false);for(const q of[-.23,.23])box(parent,x+q,lift+.1,z,.04,.04,.98,steel,false);}}

/* Trees are collected rather than drawn. Every one in the valley is the same
   authored mesh, so emitting them as two instanced meshes at the end of the
   build costs two draw calls instead of one group per tree - which is both
   cheaper than the procedural version it replaces and the only way the
   authored geometry is affordable at a couple of hundred trees.

   Coordinates arrive local to a parent group for park and placed trees, and
   absolute for the natural ones. Instancing needs absolute, so the parent
   offset is added here; that also fixes the neighbour test below, which was
   reading local coordinates as grid indices for park trees and clamping the
   nonsense away rather than failing. */
const pendingTrees=[];
function tree(parent,x,z,seed,scale=1){
  const ax=(parent?.position?.x||0)+x,az=(parent?.position?.z||0)+z;
  const nearDevelopment=[[-1,0],[1,0],[0,-1],[0,1]].some(([dx,dz])=>S.grid[idx(clamp(Math.round(ax+dx),0,W-1),clamp(Math.round(az+dz),0,H-1))]);
  pendingTrees.push({x:ax,z:az,s:scale*(nearDevelopment?.78:1),seed});
}

const UP=new THREE.Vector3(0,1,0);
function canopyMat(){
  const key='canopy:instanced';
  if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.78,vertexColors:true}));
  return materials.get(key);
}
function emitTrees(parent){
  if(!pendingTrees.length)return;
  const {trunk,canopy}=treeAsset(),count=pendingTrees.length;
  const trunkMesh=new THREE.InstancedMesh(trunk,mat(TRUNK_COLOR,.88),count);
  const canopyMesh=new THREE.InstancedMesh(canopy,canopyMat(),count);
  const matrix=new THREE.Matrix4(),quat=new THREE.Quaternion(),pos=new THREE.Vector3(),scl=new THREE.Vector3(),col=new THREE.Color();
  for(let i=0;i<count;i++){
    const t=pendingTrees[i];
    // Eight yaw steps off the seed. One authored mesh repeated at a single
    // angle reads as wallpaper; turning each one hides that it is the same
    // tree, which is the whole reason a single mesh is acceptable here.
    quat.setFromAxisAngle(UP,(Math.abs(t.seed)%8)*(Math.PI/4));
    pos.set(t.x,0,t.z);
    scl.set(t.s,t.s,t.s);
    matrix.compose(pos,quat,scl);
    trunkMesh.setMatrixAt(i,matrix);
    canopyMesh.setMatrixAt(i,matrix);
    col.set(CANOPY_GREENS[Math.abs(t.seed)%CANOPY_GREENS.length]);
    canopyMesh.setColorAt(i,col);
  }
  trunkMesh.castShadow=canopyMesh.castShadow=true;
  trunkMesh.receiveShadow=canopyMesh.receiveShadow=true;
  parent.add(trunkMesh,canopyMesh);
  S.diagnostics.treeTriangles=count*TREE_TRIANGLES;
}

function lotBase(g,w,d){box(g,0,.005,0,w,.055,d,mat('#78a961'),false);path(g,0,d*.32,.22,d*.32);}
function house(g,b){const seed=b.seed||0,tier=clamp(b.state?.housingTier||1,1,3),district=Math.abs(Math.floor(b.x/4)+Math.floor(b.y/4)),walls=['#ead8b8','#d8c7a9','#c8d4c7','#e4bea8'][Math.abs(seed)%4],roofs=['#8c5042','#50637a','#745649','#a5654d'],roof=mat(roofs[(district+Math.abs(seed)%2)%roofs.length],.88);lotBase(g,.94,.94);
  if(tier===1){box(g,0,.06,-.05,.7,.46,.62,mat(walls));gable(g,0,.52,-.05,.76,.68,.25,roof);box(g,-.2,.52,.02,.09,.26,.09,mat('#74564a'));path(g,0,.34,.2,.24);box(g,0,.06,.31,.4,.08,.16,mat('#b99b76'));door(g,0,.14,.397);window(g,-.22,.2,.267,'z',seed%2===0);window(g,.22,.2,.267,'z',seed%3===0);hedge(g,-.35,.28,.25);}
  if(tier===2){box(g,-.07,.06,-.04,.72,.7,.64,mat(walls));gable(g,-.07,.76,-.04,.78,.7,.28,roof,seed%2===0);box(g,.29,.06,.15,.25,.42,.3,mat(walls));gable(g,.29,.48,.15,.29,.34,.14,roof);path(g,.2,.35,.22,.22);door(g,.2,.14,.39);for(const x of[-.25,.02,.27])window(g,x,.22,.285,'z',(seed+x*10)%3>0);for(const x of[-.22,.12])window(g,x,.52,.285,'z',seed%2===0);hedge(g,-.37,.31,.3);hedge(g,.37,-.25,.25);}
  if(tier===3){box(g,-.08,.06,-.04,.78,.76,.68,mat(walls));box(g,.29,.06,.12,.28,.56,.38,mat(walls));gable(g,-.08,.82,-.04,.84,.74,.3,roof);gable(g,.29,.62,.12,.34,.44,.2,roof,true);box(g,-.28,.82,.02,.1,.28,.1,mat('#6c5246'));path(g,.14,.38,.25,.2);box(g,.13,.06,.32,.52,.09,.18,mat('#b79b7c'));door(g,.14,.15,.415,.2,.32,'#634839');for(const y of[.24,.55])for(const x of[-.3,-.04,.25])window(g,x,y,.305,'z',(seed+Math.round(x*10)+Math.round(y*10))%3!==0);hedge(g,-.4,.34,.35);hedge(g,.4,-.28,.3);for(const x of[-.43,.43])box(g,x,.03,.05,.035,.22,.7,mat('#d7d0bd'),false);}
}
function storefront(g,type,seed){const colors={cafe:'#c98666',market:'#9db7a5',bakery:'#d8b56f',station:'#aaa99e'},wall=colors[type]||'#c8c3b2',accent=type==='cafe'?'#7e3f36':type==='market'?'#4f765e':type==='bakery'?'#9a633d':'#576b76';
  // Four trades used to share one box with a different paint colour, which read
  // as the same shop four times over at play distance. Each keeps the shared
  // storefront grammar — lot, frontage, awning, glazing — and then carries one
  // silhouette cue that is legible from across the map.
  lotBase(g,.94,.94);
  if(type==='market'){
    // An open stall: low counter, tall canopy on posts, crates out front.
    box(g,0,.06,-.12,.76,.34,.5,mat(wall));
    for(const x of[-.34,.34])for(const z of[-.34,.18])cyl(g,x,.06,z,.028,.62,mat('#7d6b52'),6);
    box(g,0,.66,-.08,.9,.05,.78,mat(accent),false);
    for(const q of[-.27,0,.27])box(g,q,.71,-.08,.12,.03,.78,mat('#f0ece0'),false);
    for(const[cx,cz]of[[-.24,.3],[0,.34],[.26,.29]])box(g,cx,.06,cz,.17,.13,.15,mat('#a98c63'),false);
    path(g,0,.42,.5,.14);
    return;
  }
  if(type==='bakery'){
    // Steep loaf-brown roof, a big oven chimney and a hanging sign.
    box(g,0,.06,-.05,.74,.56,.62,mat(wall));
    gable(g,0,.62,-.05,.8,.68,.3,mat('#8d5a3c'));
    cyl(g,-.28,.62,-.2,.07,.36,mat('#7b6152'),7);
    box(g,0,.2,.3,.5,.22,.04,mat(C.glass,.25,.08),false);
    box(g,.3,.44,.31,.03,.16,.03,mat('#6c5545'),false);
    box(g,.3,.36,.33,.22,.11,.03,mat(accent),false);
    path(g,0,.4,.42,.16);
    return;
  }
  if(type==='station'){
    // Long platform, deep canopy and a platform clock.
    box(g,0,.05,.28,.94,.09,.32,mat('#c3bdb0'),false);
    box(g,0,.06,-.14,.8,.6,.5,mat(wall));
    gable(g,0,.66,-.14,.88,.6,.26,mat('#4e5964'));
    for(const x of[-.36,.36])cyl(g,x,.14,.28,.026,.5,mat('#6f7a80'),6);
    box(g,0,.64,.28,.92,.045,.4,mat('#5d6a72'),false);
    cyl(g,0,.5,.11,.075,.03,mat('#f2efe4'),12);
    box(g,0,.18,.12,.56,.26,.04,mat(C.glass,.25,.08),false);
    return;
  }
  // Cafe: the shared storefront, plus a real terrace with parasols.
  box(g,0,.06,-.08,.72,.58,.6,mat(wall));
  box(g,0,.64,-.08,.78,.11,.66,mat('#5d5b59'));
  box(g,0,.4,.24,.62,.13,.045,mat(accent),false);
  box(g,0,.14,.25,.5,.24,.04,mat(C.glass,.25,.08),false);
  for(const x of[-.28,.28]){
    cyl(g,x,.02,.4,.055,.03,mat('#795a46'),8);
    cyl(g,x,.05,.4,.014,.16,mat('#5d4d42'),6);
    cyl(g,x,.21,.4,.15,.02,mat(accent),9);
  }
  path(g,0,.42,.4,.14);
}
function civic(g,type,b,fp){const w=fp[0]*.82,d=fp[1]*.82,level=b.state?.level||1;lotBase(g,fp[0]*.94,fp[1]*.94);const wall=type==='policeStation'?'#a9c5cf':type==='fireStation'?'#d79a86':type==='school'?'#d9c39a':'#e1dfd5',accent=type==='policeStation'?C.blue:type==='fireStation'?C.red:type==='hospital'||type==='clinic'?'#b74348':'#92784f';
  if(type==='hospital'){box(g,-.35,.06,0,w*.6,1.25,d*.78,mat(wall));box(g,.55,.06,.1,w*.28,.78,d*.62,mat(wall));box(g,-.35,1.31,0,w*.62,.12,d*.8,mat('#d3d5d1'));box(g,.55,.84,.1,w*.3,.1,d*.64,mat('#d3d5d1'));box(g,.55,.2,d*.34,w*.18,.45,.04,mat(accent));box(g,.55,.38,d*.365,.4,.12,.045,mat(accent),false);path(g,.55,d*.43,.55,.42);for(const y of[.28,.62,.96]){for(let x=-w*.5;x<w*.1;x+=.32)window(g,x,y,d*.315,'z',(b.seed+x*10+y*10)%3!==0);for(let z=-d*.24;z<d*.25;z+=.34)window(g,-.35-w*.305,y,z,'x',(b.seed+z*10+y*10)%3!==0);}for(const x of[-.55,-.25])box(g,x,1.43,-.15,.18,.12,.18,mat('#768084',.45,.35));cyl(g,.55,.96,-.15,.07,.22,mat(accent),12);return;}
  const h=type==='cityHall'?.7+level*.12:type==='school'?.78:type==='fireStation'?.82:.72;box(g,0,.06,0,w*.8,h,d*.72,mat(wall));if(type==='fireStation'){for(const x of[-w*.22,w*.22])box(g,x,.1,d*.37,w*.32,.5,.045,mat('#9d443d'),false);box(g,-w*.32,.06,-d*.2,w*.18,1.15,d*.25,mat(wall));box(g,-w*.32,1.21,-d*.2,w*.21,.1,d*.28,mat(accent));path(g,0,d*.43,w*.72,.42);}
  else if(type==='policeStation'){box(g,0,.06+h,0,w*.84,.1,d*.76,mat('#49697b'));box(g,0,.3,d*.37,w*.34,.22,.04,mat(accent),false);path(g,0,d*.43,.45,.34);}
  else if(type==='clinic'){box(g,0,.06+h,0,w*.84,.1,d*.76,mat('#d8ddd8'));box(g,0,.25,d*.37,.16,.32,.04,mat(accent),false);box(g,0,.35,d*.39,.34,.1,.045,mat(accent),false);path(g,0,d*.43,.38,.36);}
  else{gable(g,0,.06+h,0,w*.86,d*.78,.3,mat(type==='cityHall'?'#596778':'#8e5847'));path(g,0,d*.43,.34,.34);if(type==='cityHall'){box(g,0,.06+h+.22,0,.24,.32,.24,mat(wall));gable(g,0,.6+h,0,.3,.3,.18,mat('#596778'));cyl(g,0,.92+h,0,.018,.24,mat('#444'));}if(type==='school')box(g,.28,.2,d*.37,.22,.28,.04,mat(accent),false);}
  if(type!=='fireStation')for(const x of[-w*.25,0,w*.25])window(g,x,.28,d*.365,'z',(b.seed+Math.round(x*10))%3!==0,.2,.25);
  for(const z of[-d*.2,d*.12])window(g,-w*.405,.28,z,'x',(b.seed+Math.round(z*10))%3!==0,.18,.23);
  if(type==='policeStation'||type==='fireStation'||type==='clinic')box(g,w*.29,.08,-d*.28,.12,.26,.12,mat(accent),true);
}
function recreation(g,type,fp,seed){const w=fp[0]*.94,d=fp[1]*.94;box(g,0,.005,0,w,.055,d,mat(type==='sportsCourt'?'#698b80':'#70a85c'),false);if(type==='sportsCourt'){box(g,0,.065,0,w*.82,.025,d*.82,mat('#65859a'),false);for(const z of[-d*.33,d*.33]){cyl(g,0,.09,z,.018,.42,mat('#ddd'),6);box(g,0,.46,z,.34,.02,.02,mat('#eee'),false);}}else if(type==='playground'){path(g,0,0,.28,d*.82);box(g,-.2,.06,0,.28,.28,.28,mat('#d89445'));cone(g,-.2,.34,0,.24,.25,mat('#c24f43'),4);box(g,.24,.06,.04,.08,.42,.5,mat('#5d88a1'));}else{path(g,0,0,.22,d*.9);path(g,0,0,w*.9,.22);const count=Math.min(type==='townPark'?10:5,fp[0]*fp[1]);for(let i=0;i<count;i++){const x=-w*.38+(i*37%80)/100*w,z=-d*.38+(i*53%80)/100*d;tree(g,x,z,seed+i,.48);}if(type==='townPark'){cyl(g,0,.06,0,.34,.13,mat('#c9cec5'),16);cyl(g,0,.19,0,.08,.25,mat('#dae2dd'),12);}}}
function farm(g,fp,seed){const w=fp[0]*.94,d=fp[1]*.94;
  // The crop takes the season the same way the Canvas field does, so switching
  // renderers does not switch the time of year.
  const ripe=clamp(((PAL.yield||0)-2)/9,0,1),crop=mix(mix('#87a44a','#d9b455',ripe),'#c3c0ad',(PAL.snow||0)*.85);
  box(g,0,.005,0,w,.055,d,mat(crop,.95),false);
  for(let i=-3;i<=3;i++)box(g,0,.06,i*d/8,w*.9,.02,.05,mat('#6b5738',.96),false);
  const bx=-w*.28,bz=-d*.28;box(g,bx,.06,bz,.72,.5,.6,mat('#a8483a'));gable(g,bx,.56,bz,.78,.66,.24,mat('#8f3d30'));
  door(g,bx,.06,bz+.31,.24,.34,'#e9e2cd');
  cyl(g,bx+.6,.06,bz,.17,.9,mat('#cfc6ae'),12);cone(g,bx+.6,.96,bz,.19,.18,mat('#a99f88'),12);
  path(g,0,d*.36,.3,d*.28);}
function statue(g,fp){const w=fp[0]*.9;box(g,0,.005,0,w,.06,fp[1]*.9,mat('#d9d3c2',.9),false);
  for(const[x,z]of[[-w*.42,0],[w*.42,0],[0,-w*.42],[0,w*.42]])hedge(g,x,z,x?.1:w*.8,x?w*.8:.1);
  box(g,0,.06,0,.62,.12,.62,mat('#e4dece'));box(g,0,.18,0,.4,.5,.4,mat('#dfd7c4'));
  const bronze=mat('#7d6a3f',.5,.55);
  box(g,0,.68,0,.2,.42,.16,bronze);sphere(g,0,1.18,0,.1,bronze);
  const arm=box(g,.14,1.0,0,.3,.07,.07,bronze);arm.rotation.z=.9;
  box(g,-.06,.62,0,.07,.1,.07,bronze);box(g,.06,.62,0,.07,.1,.07,bronze);}
function clockTower(g,fp){const w=fp[0]*.9;box(g,0,.005,0,w,.06,fp[1]*.9,mat('#cfc8b6',.92),false);
  box(g,0,.06,0,.86,.42,.86,mat('#e7dfcb'));box(g,0,.48,0,.6,1.5,.6,mat('#efe7d2'));
  for(let i=1;i<5;i++)box(g,0,.48+i*.3,0,.63,.035,.63,mat('#c6bda4'),false);
  box(g,0,1.98,0,.74,.3,.74,mat('#e3dac4'));cone(g,0,2.28,0,.56,.62,mat('#5c7183'),4);
  sphere(g,0,2.96,0,.06,mat(C.lit,.3,0,C.lit));
  // A face on each side, lit like a window so the tower reads after dark.
  for(const[x,z,axis]of[[0,.31,'z'],[0,-.31,'z'],[.31,0,'x'],[-.31,0,'x']])window(g,x,1.62,z,axis,true,.34,.34);
  door(g,0,.06,.44,.22,.34);}
function lighthouse(g,fp){const w=fp[0]*.9;box(g,0,.005,0,w,.06,fp[1]*.9,mat('#bfb9a6',.94),false);
  box(g,-w*.3,.06,w*.22,.5,.34,.44,mat('#e4dcc8'));gable(g,-w*.3,.4,w*.22,.56,.5,.16,mat('#7a8fa0'));
  const bands=[['#f4f0e2',.34,.55],['#c9564a',.29,.5],['#f4f0e2',.24,.5]];let y=.06;
  for(const[col,r,h]of bands){cyl(g,0,y,0,r,h,mat(col),12);y+=h;}
  cyl(g,0,y,0,.3,.06,mat('#4a5a63',.4,.4),12);y+=.06;
  cyl(g,0,y,0,.2,.26,mat(C.lit,.25,0,C.lit),10);
  cone(g,0,y+.26,0,.24,.22,mat('#3f4d56'),10);}
function greatLibrary(g,fp){const w=fp[0]*.94,d=fp[1]*.94;box(g,0,.005,0,w,.06,d,mat('#d5cfbd',.92),false);
  box(g,0,.06,0,w*.86,.14,d*.86,mat('#e8e2d0'));
  box(g,0,.2,0,w*.68,.86,d*.68,mat('#f2ecd9'));
  // colonnade around the two faces the camera sees, plus their opposites
  for(let i=-2;i<=2;i++){for(const s2 of[-1,1]){cyl(g,i*w*.16,.2,s2*d*.35,.07,.8,mat('#e6dfc9'),10);cyl(g,s2*w*.35,.2,i*d*.16,.07,.8,mat('#e6dfc9'),10);}}
  box(g,0,1.0,0,w*.78,.1,d*.78,mat('#cdc4ab'));
  gable(g,0,1.1,0,w*.5,d*.5,.26,mat('#efe8d3'));
  cyl(g,0,1.1,0,.42,.2,mat('#e9e2cd'),16);
  sphere(g,0,1.46,0,.36,mat('#8fa9b2',.5));
  sphere(g,0,1.78,0,.07,mat(C.lit,.3,0,C.lit));
  for(let i=-1;i<=1;i++)window(g,i*.4,.5,d*.345,'z',true,.22,.4);
  door(g,0,.2,d*.35,.3,.42);}
function building(parent,b){const def=getBuildingDefinition(b.type),fp=def?.placement?.footprint||[1,1],cx=b.x+(fp[0]-1)/2,cz=b.y+(fp[1]-1)/2,g=groupAt(parent,cx,cz);if(def?.service?.type==='recreation'||b.type==='park'){recreation(g,b.type,fp,b.seed||0);return;}if(b.type==='tree'){tree(g,0,0,b.seed||0,1);return;}if(b.type==='lamp'){lamp(g,0,0);return;}if(b.type==='dock'){box(g,0,.02,0,.8,.12,.8,mat('#80664e'));return;}if(b.type==='house'){house(g,b);return;}if(['cafe','market','bakery','station'].includes(b.type)){storefront(g,b.type,b.seed||0);return;}if(b.type==='farm'){farm(g,fp,b.seed||0);return;}if(b.type==='statue'){statue(g,fp);return;}if(b.type==='clockTower'){clockTower(g,fp);return;}if(b.type==='lighthouse'){lighthouse(g,fp);return;}if(b.type==='greatLibrary'){greatLibrary(g,fp);return;}if(b.type==='mill'){lotBase(g,.94,.94);box(g,0,.05,0,.55,.72,.55,mat('#d3c6aa'));gable(g,0,.77,0,.62,.62,.22,mat('#75594b'));cyl(g,0,.5,.3,.035,.45,mat('#5d4a3e'),7);for(const a of[0,Math.PI/2,Math.PI,Math.PI*1.5]){const blade=box(g,Math.cos(a)*.24,.68,Math.sin(a)*.24,.08,.05,.42,mat('#e2d4b8'),false);blade.rotation.y=-a;}return;}civic(g,b.type,b,fp);}

function terrain(parent){box(parent,(W-1)/2,-.6,(H-1)/2,W+.8,.48,H+.8,mat('#455a45'),false);const batches=new Map(),matrix=new THREE.Matrix4();for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=idx(x,y),water=S.terr[i]===1,open=isTileUnlocked(x,y),broad=Math.floor(x/5)+Math.floor(y/5),speck=((x*13+y*7+S.seed)%17===0?1:0),v=Math.abs((broad+speck)%4),mask=water?waterMask(x,y):0,key=water?(mask===15?'water-deep':'water-edge'):open?`grass:${v}`:`locked:${v%2}`;if(!batches.has(key))batches.set(key,[]);batches.get(key).push({x,y});}
  for(const [key,cells]of batches){const water=key.startsWith('water'),hex=water?C.water:key.startsWith('locked')?C.locked[+key.at(-1)]:C.grass[+key.at(-1)],height=water?.045:.09,g=geo(`terrain:${water?'water':'land'}`,()=>new THREE.BoxGeometry(1,height,1)),surface=water?basicMat(key==='water-deep'?'#245f7b':'#3f829c'):mat(hex,.93),inst=new THREE.InstancedMesh(g,surface,cells.length);for(let i=0;i<cells.length;i++){matrix.makeTranslation(cells[i].x,water?-.105:-.14,cells[i].y);inst.setMatrixAt(i,matrix);}inst.receiveShadow=true;parent.add(inst);}
  for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(S.terr[idx(x,y)]===1){const mask=waterMask(x,y),shore=mat(C.shore,.95);for(const [bit,dx,dz,w,d]of[[1,0,-.47,.96,.07],[2,.47,0,.07,.96],[4,0,.47,.96,.07],[8,-.47,0,.07,.96]])if(!(mask&bit))box(parent,x+dx,-.07,y+dz,w,.055,d,shore,false);for(const [a,b,dx,dz]of[[1,8,-.46,-.46],[1,2,.46,-.46],[4,8,-.46,.46],[4,2,.46,.46]])if(!(mask&a)&&!(mask&b))cyl(parent,x+dx,-.072,y+dz,.105,.058,shore,10);if((x*13+y*7+S.seed)%11===0){for(const q of[-.035,.035])cyl(parent,x+.32+q,-.05,y+.3,.012,.2,mat('#547750'),5);}}
}

export function buildCohesiveWorld(parent){
  terrain(parent);
  pendingTrees.length=0;
  // Was 110 trees when zoomed out and 230 in, because each one cost its own
  // group and meshes. Instanced, the whole valley is two draw calls whatever
  // the count, so the cap only exists now to bound the instance buffers.
  const treeLimit=900;
  let visibleTrees=0;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const i=idx(x,y),b=S.grid[i],treeHash=(x*19+y*31+S.seed);
    if(b?.type==='road')road(parent,x,y,b);
    else if(b?.type==='rail')rail(parent,x,y);
    if(S.natTree[i]&&visibleTrees<treeLimit&&(isTileUnlocked(x,y)?treeHash%4!==0:treeHash%3!==0)){
      tree(parent,x,y,i,.65+((i*17)%20)/100);
      visibleTrees++;
    }
  }
  for(const b of S.grid)if(b&&!isFacilityPart(b)&&b.type!=='road'&&b.type!=='rail')building(parent,b);
  emitTrees(parent);
  S.diagnostics.rendererMaterials=materials.size;
  S.diagnostics.visibleTrees=visibleTrees;
}
export function visualDescriptor(b){if(!b)return null;if(b.type==='house')return{archetype:['cottage','town-home','established-home'][clamp((b.state?.housingTier||1)-1,0,2)],variant:Math.abs(b.seed||0)%4};return{archetype:b.type,variant:Math.abs(b.seed||0)%4};}
export function artMetrics(){return{materials:materials.size,geometries:geometries.size};}
