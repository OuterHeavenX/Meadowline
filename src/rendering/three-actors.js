import * as THREE from '../../assets/vendor/three.module.min.js';
import { clamp, lerp, shade } from '../core/constants.js';
import { S, reduceMotion } from '../core/state.js';
import { HULLS } from '../simulation/boats.js';
import { headingAngle, laneOffset, sidewalkOffset } from '../transport/lanes.js';
import { idx, inBounds } from '../world/tiles.js';
import { HAIR, SKIN, personSeed } from './people-palette.js';

/* ============================================================
   ACTORS — the moving part of the low-poly scene

   The Canvas renderer has always had people who walk, engines that put fires
   out, cruisers that catch burglars, ambulances that collect the sick, boats
   that leave a wake and flames that look like a fire. The GPU scene had a
   cylinder for a person, one box for every vehicle, three still cones for a
   fire and no boats at all - so a player on the renderer Auto actually picks
   was shown a town where nothing anyone did could be seen happening.

   Everything here reads the same state the Canvas path reads and draws the
   same story: the same gait phase, the same hose from engine to fire, the same
   burglar running while the cruiser is on its way, the same wake behind the
   same boat. Nothing here is simulation; it is all rebuilt from state every
   frame into the dynamic group, and disposed with it.

   People are instanced. A figure is seven pieces - two legs, a torso, two
   arms, a head and its hair - and a hundred and fifty of them one mesh each
   would be a thousand draw calls. As six instanced meshes the whole crowd
   costs six, however big it gets, and the regression asserts that.
   ============================================================ */

const mats=new Map(), geos=new Map();
function mat(hex,rough=.84,opts={}){
  const key=hex+'/'+rough+'/'+(opts.emissive||'')+'/'+(opts.opacity??1);
  if(!mats.has(key)){
    const m=new THREE.MeshStandardMaterial({color:hex,roughness:rough,metalness:opts.metal||0});
    if(opts.emissive){ m.emissive=new THREE.Color(opts.emissive); m.emissiveIntensity=opts.glow??.9; }
    if(opts.opacity!=null&&opts.opacity<1){ m.transparent=true; m.opacity=opts.opacity; m.depthWrite=false; }
    mats.set(key,m);
  }
  return mats.get(key);
}
function geo(key,make){ if(!geos.has(key)){ const g=make(); g.userData.meadowlineCached=true; geos.set(key,g); } return geos.get(key); }
function mesh(parent,geometry,material,x,y,z,kind,shadow=true){ const m=new THREE.Mesh(geometry,material); m.position.set(x,y,z); m.castShadow=shadow; m.receiveShadow=shadow; m.userData.kind=kind; parent.add(m); return m; }
function box(parent,x,y,z,w,h,d,material,kind,shadow=true){ return mesh(parent,geo(`box:${w}:${h}:${d}`,()=>new THREE.BoxGeometry(w,h,d)),material,x,y+h/2,z,kind,shadow); }
function cyl(parent,x,y,z,r,h,material,kind,sides=8){ return mesh(parent,geo(`cyl:${r}:${h}:${sides}`,()=>new THREE.CylinderGeometry(r,r,h,sides)),material,x,y+h/2,z,kind,true); }
function cone(parent,x,y,z,r,h,material,kind,sides=6){ return mesh(parent,geo(`cone:${r}:${h}:${sides}`,()=>new THREE.ConeGeometry(r,h,sides)),material,x,y+h/2,z,kind,true); }
function sphere(parent,x,y,z,r,material,kind){ return mesh(parent,geo(`sph:${r}`,()=>new THREE.SphereGeometry(r,8,6)),material,x,y,z,kind,true); }
export function actorMaterialCount(){ return mats.size; }

/* ---------- people ----------
   One pose per person, then every piece of every person goes into the same
   handful of instanced meshes. The pose is the Canvas renderer's: one phase
   drives legs, arms, lean and bob together, so a citizen strides at the speed
   they are actually moving and settles when they stop. Reduced motion keeps
   people where they are going without the gait. */
const PIECE={
  leg:  {w:.04,h:.15,d:.04},
  torso:{w:.10,h:.17,d:.06},
  arm:  {w:.03,h:.13,d:.03},
  head: {r:.055},
  hair: {r:.058},
  carry:{w:.07,h:.06,d:.05}
};
const M=new THREE.Matrix4(), T=new THREE.Matrix4(), R=new THREE.Matrix4(), SC=new THREE.Matrix4(), color=new THREE.Color();
const HIP=.15, SHOULDER=.30, HEAD=.375;

function pose(c){
  const local=c.facilityLocal;
  const side=sidewalkOffset(c);
  const x=(local?local.x:lerp(c.x,c.nx,c.p))+side.x, z=(local?local.y:lerp(c.y,c.ny,c.p))+side.y;
  const moving=!local&&!reduceMotion&&(c.nx!==c.x||c.ny!==c.y);
  const rate=moving?7.4*(c.sp||0.5)*2:1.6;
  const phase=S.t*rate+(c.bob||0);
  const stride=moving?Math.sin(phase):0;
  const bob=reduceMotion?0:Math.abs(Math.cos(phase))*(moving?.02:.006);
  const heading=moving||c.nx!==c.x||c.ny!==c.y?Math.atan2(c.nx-c.x,c.ny-c.y):((c.side||1)*Math.PI/2);
  const seed=personSeed(c);
  return {x,z,heading,stride,bob,lean:moving?.16:0,col:c.col||c.color||'#d6a86e',skin:SKIN[seed%SKIN.length],hair:HAIR[(seed>>3)%HAIR.length],
    carry:!!(c.carry&&!local),carryKind:c.carryKind||'basket',lying:false};
}
/* A figure that is not a citizen: the burglar in front of a robbed house, the
   patient an ambulance is coming for. Same pieces, its own pose. */
function extra(x,z,heading,col,opts={}){
  return {x,z,heading,stride:opts.stride||0,bob:0,lean:opts.lean||0,col,skin:opts.skin||SKIN[2],hair:opts.hair||HAIR[2],carry:false,carryKind:'basket',lying:!!opts.lying};
}
function figureMatrix(p){
  // Where the person stands, which way they face, and lying down if they are.
  M.makeTranslation(p.x,.02+p.bob,p.z).multiply(R.makeRotationY(p.heading));
  if(p.lying) M.multiply(T.makeTranslation(0,.05,0)).multiply(R.makeRotationX(-Math.PI/2)).multiply(T.makeTranslation(0,-.05,0));
  return M;
}
// A piece hung from a pivot: translate to the pivot, swing, hang the box below.
function hang(out,base,px,py,pz,swing,len,sx=1,sy=1,sz=1){
  out.copy(base).multiply(T.makeTranslation(px,py,pz)).multiply(R.makeRotationX(swing)).multiply(T.makeTranslation(0,-len/2,0));
  if(sx!==1||sy!==1||sz!==1) out.multiply(SC.makeScale(sx,sy,sz));
  return out;
}
function addPeople(parent,people){
  if(!people.length) return;
  const n=people.length;
  const make=(kind,geometry,count,shadow=true)=>{ const inst=new THREE.InstancedMesh(geometry,mat('#ffffff',.86),count); inst.castShadow=shadow; inst.receiveShadow=false; inst.userData.kind=kind; inst.userData.people=n; inst.count=0; parent.add(inst); return inst; };
  const legs=make('people-legs',geo('leg',()=>new THREE.BoxGeometry(PIECE.leg.w,PIECE.leg.h,PIECE.leg.d)),2*n);
  const arms=make('people-arms',geo('arm',()=>new THREE.BoxGeometry(PIECE.arm.w,PIECE.arm.h,PIECE.arm.d)),2*n,false);
  const torsos=make('people-torsos',geo('torso',()=>new THREE.BoxGeometry(PIECE.torso.w,PIECE.torso.h,PIECE.torso.d)),n);
  const heads=make('people-heads',geo('head',()=>new THREE.SphereGeometry(PIECE.head.r,8,6)),n,false);
  const hairs=make('people-hair',geo('hair',()=>new THREE.SphereGeometry(PIECE.hair.r,8,6)),n,false);
  const carries=make('people-carry',geo('carry',()=>new THREE.BoxGeometry(PIECE.carry.w,PIECE.carry.h,PIECE.carry.d)),n,false);
  const put=(inst,matrix,hex)=>{ inst.setMatrixAt(inst.count,matrix); inst.setColorAt(inst.count,color.set(hex)); inst.count++; };
  const part=new THREE.Matrix4();
  for(const p of people){
    const base=figureMatrix(p).clone();
    const trouser=shade(p.col,-46), sleeve=shade(p.col,-18);
    for(const dir of [1,-1]){
      put(legs,hang(part,base,dir*.03,HIP,0,p.stride*dir*.55,PIECE.leg.h),trouser);
      put(arms,hang(part,base,dir*.07,SHOULDER,0,-p.stride*dir*.6+p.lean*.5,PIECE.arm.h),sleeve);
    }
    // Torso leans into the walk from the hip; head and hair ride on top of it.
    put(torsos,hang(part,base,0,SHOULDER+.02,0,-p.lean,PIECE.torso.h),p.col);
    put(heads,part.copy(base).multiply(T.makeTranslation(0,HEAD,p.lean*.06)),p.skin);
    put(hairs,part.copy(base).multiply(T.makeTranslation(0,HEAD+.012,p.lean*.06-.008)).multiply(SC.makeScale(1,.72,1)),p.hair);
    // A basket, a reporter's pale notepad, or the dark body of a camera.
    if(p.carry) put(carries,part.copy(base).multiply(T.makeTranslation(.09,HIP+.03,.02)),
      p.carryKind==='notebook'?'#f4f0e2':p.carryKind==='camera'?'#3b4147':'#b98d5c');
  }
  for(const inst of [legs,arms,torsos,heads,hairs,carries]){ inst.instanceMatrix.needsUpdate=true; if(inst.instanceColor) inst.instanceColor.needsUpdate=true; }
}

/* ---------- vehicles ----------
   A fire engine is long and red with a ladder; an ambulance is a white box
   with a cross; a cruiser is blue and white with a light bar; everything else
   is a car in its own colour. Responding vehicles flash. A working engine
   runs a hose to the fire it is at. */
const TYPE={
  fireEngine:{len:.62,w:.27,h:.21,col:'#d74738',cab:'#f2ebdd'},
  ambulance: {len:.5, w:.26,h:.24,col:'#eef0ea',cab:'#eef0ea'},
  police:    {len:.44,w:.24,h:.17,col:'#3e6f9c',cab:'#e4ebf0'},
  van:       {len:.48,w:.25,h:.23},
  pickup:    {len:.46,w:.24,h:.17}
};
export function addVehicle(parent,v,service=false){
  const lane=laneOffset(v), x=lerp(v.x,v.nx,v.p)+lane.x, z=lerp(v.y,v.ny,v.p)+lane.y, kind=v.type||'car';
  const spec=TYPE[kind]||{len:.42,w:.24,h:.17}, col=spec.col||v.color||'#d58b45';
  const g=new THREE.Group(); g.position.set(x,.1,z); g.rotation.y=headingAngle(v); g.userData.kind='vehicle:'+kind; parent.add(g);
  box(g,0,0,0,spec.len,spec.h,spec.w,mat(col),'vehicle-body');
  const cabLen=spec.len*.34;
  box(g,spec.len*.22,spec.h,0,cabLen,.1,spec.w*.86,mat(spec.cab||'#9fc1c9',.3,{metal:.1}),'vehicle-cab');
  for(const dx of [-spec.len*.33,spec.len*.33]) for(const dz of [-spec.w*.5,spec.w*.5]) cyl(g,dx,-.01,dz,.045,.035,mat('#292c2d'),'wheel',8).rotation.x=Math.PI/2;
  const responding=service&&(v.state==='EN_ROUTE'||v.state==='DISPATCHED'), pulse=Math.sin(S.t*8+(v.id||0))>0;
  if(kind==='fireEngine'){
    // The ladder, laid along the body behind the cab, is what makes it an engine.
    for(const dz of [-.05,.05]) box(g,-.08,spec.h+.02,dz,.42,.025,.02,mat('#c9cdd0',.4,{metal:.4}),'ladder',false);
    for(let i=-3;i<=3;i++) box(g,-.08+i*.065,spec.h+.02,0,.02,.02,.1,mat('#c9cdd0',.4,{metal:.4}),'ladder-rung',false);
    box(g,spec.len*.22,spec.h+.1,0,.09,.035,.06,mat(pulse||!responding?'#ed4d4d':'#ff9a9a',.2,{emissive:'#ff3b30',glow:responding?1.2:.25}),'lightbar',false);
  } else if(kind==='ambulance'){
    // A red cross on the roof and both flanks; a blue light over the cab.
    box(g,-.06,spec.h+.005,0,.14,.015,.04,mat('#d33f45',.6),'cross',false); box(g,-.06,spec.h+.005,0,.04,.015,.14,mat('#d33f45',.6),'cross',false);
    for(const dz of [-1,1]){ box(g,-.06,spec.h*.45,dz*spec.w*.5,.12,.04,.012,mat('#d33f45',.6),'cross',false); box(g,-.06,spec.h*.45,dz*spec.w*.5,.04,.12,.012,mat('#d33f45',.6),'cross',false); }
    box(g,spec.len*.22,spec.h+.1,0,.09,.035,.06,mat(pulse||!responding?'#4d80ed':'#a7c2ff',.2,{emissive:'#3a6df0',glow:responding?1.2:.25}),'lightbar',false);
  } else if(kind==='police'){
    // White doors on a blue car, and a bar that alternates red and blue on the way to a call.
    box(g,0,spec.h*.3,0,spec.len*.42,spec.h*.5,spec.w+.004,mat('#e8eef2',.7),'door-band',false);
    box(g,-.03,spec.h+.1,-.035,.07,.035,.06,mat(pulse?'#ed4d4d':'#7a2a26',.2,{emissive:'#ff3b30',glow:responding&&pulse?1.3:.15}),'lightbar',false);
    box(g,-.03,spec.h+.1,.035,.07,.035,.06,mat(pulse?'#2b3f7a':'#4d80ed',.2,{emissive:'#3a6df0',glow:responding&&!pulse?1.3:.15}),'lightbar',false);
  }
  if(service&&kind==='fireEngine'&&(v.state==='WORKING'||v.state==='ARRIVED')){
    const inc=(S.incidents||[]).find(i=>i.id===v.incidentId);
    if(inc&&!inc.resolved) hose(parent,x,z,inc.target.x,inc.target.y);
  }
}
/* The hose is the one piece of the scene made fresh every frame: a tube along
   a curve from the engine to the fire, with the water breaking at the far end. */
function hose(parent,x,z,tx,tz){
  const curve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(x,.3,z),new THREE.Vector3((x+tx)/2,1.15,(z+tz)/2),new THREE.Vector3(tx,.7,tz));
  const tube=new THREE.Mesh(new THREE.TubeGeometry(curve,14,.022,5,false),mat('#a9dcf2',.3,{opacity:.85}));
  tube.userData.kind='hose'; tube.castShadow=false; parent.add(tube);
  for(let i=0;i<3;i++){ const t=(S.t*1.7+i*.33)%1; sphere(parent,tx+Math.sin(i*2.1)*.1*t,.7-t*.35,tz+Math.cos(i*2.1)*.1*t,.03+t*.03,mat('#e6f6ff',.2,{opacity:.7*(1-t)+.1}),'spray'); }
}

/* ---------- trains and boats ---------- */
const ENGINES=[['#c96a5c','#a8503f'],['#5d8fa8','#4a7389'],['#d0a94e','#ac8836']];
export function addTrain(parent,t){
  const c=ENGINES[t.hue||0]||ENGINES[0];
  const carAt=k=>k===0?{x:t.fx??t.x,y:t.fy??t.y}:(t.hist||[])[Math.min((t.hist||[]).length-1,k*9)];
  for(let k=0;k<3;k++){
    const h=carAt(k); if(!h) continue;
    const next=carAt(Math.max(0,k-1))||h, ang=Math.atan2((next.x-h.x)||0,(next.y-h.y)||1e-6);
    const g=new THREE.Group(); g.position.set(h.x,.12,h.y); g.rotation.y=ang; g.userData.kind='train-car'; parent.add(g);
    box(g,0,0,0,.36,k===0?.3:.26,.72,mat(k===0?c[0]:'#e6dcc6'),'train-body');
    for(const dz of [-.18,.18]) box(g,0,.14,dz,.38,.07,.14,mat('#7a96a5',.3),'train-window',false);
    if(k===0){
      box(g,0,.3,.14,.12,.08,.12,mat(c[1]),'stack',false);
      const ph=(S.t*1.5)%1; sphere(parent,h.x,.62+ph*.5,h.y,.05+ph*.08,mat('#f4f0e2',.9,{opacity:.35*(1-ph)}),'steam');
    }
  }
}
const WAKE=[.32,.22,.12];
export function addBoat(parent,t){
  const x=t.fx??t.x, z=t.fy??t.y, c=HULLS[t.hue||0]||HULLS[0], bob=Math.sin(S.t*1.8+(t.bob||0))*.02;
  const ang=Math.atan2((t.nx??x)-(t.x??x),(t.ny??z)-(t.y??z));
  const g=new THREE.Group(); g.position.set(x,.02+bob,z); g.rotation.y=ang; g.rotation.z=Math.sin(S.t*1.3+(t.bob||0))*.04; g.userData.kind='boat'; parent.add(g);
  box(g,0,0,0,.24,.09,.5,mat(c[1]),'hull');
  box(g,0,.09,0,.26,.03,.52,mat(c[0]),'deck',false);
  cyl(g,0,.12,.02,.012,.36,mat('#7a5c43'),'mast',6);
  box(g,.06,.16,.02,.11,.26,.012,mat('#f7f3e8',.9),'sail',false);
  for(let i=1;i<(t.wake||[]).length;i+=2){
    const w=t.wake[i], f=1-i/t.wake.length;
    cyl(parent,w.x,.005,w.y,.035+.06*f,.006,mat('#ffffff',1,{opacity:WAKE[Math.min(2,Math.floor((1-f)*3))]}),'wake',10);
  }
}

/* ---------- incidents ----------
   A fire is flames at the roofline that lick and lean, smoke rising off them,
   and a glow on the ground the building stands on, all fading once the crew is
   working it. A crime is the burglar, running while the cruiser is on its way
   and standing when it arrives; a raid the police raised themselves shows no
   burglar. A medical call is someone lying where the ambulance is coming, and
   a stretcher once it is there. */
function roofOf(x,z){
  if(!inBounds(x,z)) return .5;
  const b=S.grid[idx(x,z)]; if(!b) return .4;
  if(b.type==='house') return .55+.3*clamp((b.state?.housingTier||1)-1,0,4);
  return ['hospital'].includes(b.type)?1.6:['cityHall','school','clinic','policeStation','fireStation'].includes(b.type)?1:.75;
}
export function addIncident(parent,inc,people){
  if(inc.resolved||inc.status==='CLEARED') return;
  const x=inc.target.x, z=inc.target.y, working=inc.status==='WORKING';
  if(inc.kind==='fire'){
    const roof=roofOf(x,z), fade=working?.5:1;
    box(parent,x,.04,z,.92,.02,.92,mat('#ff8a3c',.6,{emissive:'#ff6a1a',glow:1.1*fade,opacity:.55*fade}),'glow',false);
    for(let i=0;i<3;i++){
      const a=S.t*5+i*2, lick=.8+.3*Math.sin(a);
      const f=cone(parent,x+(i-1)*.17,roof-.04,z+(i%2?.1:-.1),.14,.46,mat(i%2?'#ffb54f':'#e65c38',.5,{emissive:i%2?'#ffa030':'#ff4a1c',glow:1.3*fade,opacity:.92*fade}),'flame',5);
      f.scale.set(1,lick,1); f.rotation.z=Math.sin(a)*.22; f.rotation.y=a*.3;
    }
    for(let i=0;i<4;i++){
      const t=(S.t*.35+i*.19)%1;
      sphere(parent,x+Math.sin(i*4.2)*.12,roof+.32+t*1.1,z+Math.cos(i*3.1)*.08,.07+t*.14,mat('#4c4e4b',1,{opacity:Math.round((1-t)*.36*fade*20)/20}),'smoke');
    }
  } else if(inc.kind==='crime'){
    if(inc.tag) return;
    const running=inc.status==='EN_ROUTE'||inc.status==='REPORTED';
    const run=running?Math.sin(S.t*5)*.28:0;
    people.push(extra(x+.32+run,z+.36,run>=0?Math.PI/2:-Math.PI/2,'#34383b',{stride:running?Math.sin(S.t*12):0,lean:running?.3:0,hair:'#e8e0cd'}));
  } else {
    // Someone on the ground until the ambulance is working, then a stretcher.
    const arrived=working||inc.status==='ARRIVED';
    if(arrived) box(parent,x+.3,.03,z+.34,.18,.03,.46,mat('#f2f4f0',.7),'stretcher',false);
    people.push(extra(x+.3,z+.34,0,'#c9a0c8',{lying:true}));
    const bob=Math.sin(S.t*4+(inc.id||0))*.03;
    box(parent,x+.3,.9+bob,z+.34,.14,.04,.04,mat('#ffffff',.5,{emissive:'#ffffff',glow:.6}),'medical-marker',false);
    box(parent,x+.3,.9+bob,z+.34,.04,.04,.14,mat('#ffffff',.5,{emissive:'#ffffff',glow:.6}),'medical-marker',false);
  }
}

/* Everything that moves, into the dynamic group, once per frame. */
/* What walks in at night. It goes through the same instanced figure as
   everybody else — same seven pieces, same gait — because that is what makes
   it unsettling on a map this gentle: it is shaped like the little people and
   it is the wrong colour, walking the wrong way, at the wrong hour. */
function walkerFigure(z){
  const sway=reduceMotion?0:Math.sin((S.t||0)*3.4+(z.seed%97))*.5;
  const heading=Math.atan2((z.target?z.target.x:z.fx)-z.fx,(z.target?z.target.y:z.fy)-z.fy);
  return {x:z.fx,z:z.fy,heading,stride:sway,bob:0,lean:.28,col:'#6d7f5e',
    skin:'#9db07f',hair:'#41503f',carry:false,carryKind:'basket',lying:false};
}
// The volley, as a thin bright line from the tower to what it hit.
function addVolley(parent,a){
  const dx=a.x1-a.x0, dz=a.y1-a.y0, len=Math.hypot(dx,dz)||0.001;
  const shaft=box(parent,(a.x0+a.x1)/2,.5,(a.y0+a.y1)/2,len,.035,.035,
    mat('#fff6d6',.4,{emissive:'#fff6d6',glow:1.3}),'volley',false);
  shaft.rotation.y=-Math.atan2(dz,dx);
}

const ACT_COLOR={juggler:'#d4738f',clown:'#e0574f',fiddler:'#8d6fa0',puppeteer:'#4f8b8d',chalkArtist:'#c9a35e'};
/* An entertainer is one of the little people standing still, so they are posed
   through the same instanced figure everything else uses and cost nothing
   extra. What is above their hands is their own — at most ten of them stand in
   a town, so a handful of small meshes each is cheap. */
function buskerFigure(bk){
  return extra(bk.x,bk.y,Math.PI,ACT_COLOR[bk.act]||'#d4738f',
    {skin:SKIN[bk.seed%SKIN.length],hair:HAIR[(bk.seed>>3)%HAIR.length]});
}
function addBuskerProp(parent,bk){
  const t=reduceMotion?0:((S.t*0.9+bk.seed%97)%1);
  if(bk.act==='juggler'){
    for(let i=0;i<3;i++){
      const a=(t+i/3)*Math.PI*2;
      sphere(parent,bk.x+Math.cos(a)*.16,.62+Math.sin(a)*.14,bk.y,.045,
        mat(['#e0b45a','#c9647a','#7fa9c9'][i],.7),'busker-prop');
    }
  }else if(bk.act==='clown'){
    sphere(parent,bk.x,.5,bk.y+.09,.035,mat('#e0574f',.6),'busker-prop');
    cone(parent,bk.x,.54,bk.y,.09,.16,mat('#f2e6c8',.8),'busker-prop',7);
  }else if(bk.act==='fiddler'){
    box(parent,bk.x+.11,.4,bk.y,.16,.05,.06,mat('#8a5a3c',.7),'busker-prop');
    box(parent,bk.x+.1,.62+t*.1,bk.y,.03,.05,.01,mat('#f0ece0',.6),'busker-prop',false);
  }else if(bk.act==='puppeteer'){
    box(parent,bk.x,.34,bk.y,.34,.24,.08,mat('#4f8b8d',.8),'busker-prop');
    box(parent,bk.x,.4,bk.y+.05,.22,.14,.02,mat('#f2e6c8',.8),'busker-prop',false);
    sphere(parent,bk.x+(t<.5?-.06:.06),.46,bk.y+.07,.03,mat('#c9647a',.7),'busker-prop');
  }else{
    for(let i=0;i<4;i++)
      box(parent,bk.x-.18+i*.12,.005,bk.y+.16,.09,.01,.09,
        mat(['#c9647a','#e0b45a','#7fa9c9','#8fae72'][i],.9),'busker-prop',false);
  }
}

export function addActors(parent){
  const people=S.citizens.map(pose);
  for(const bk of S.buskers||[]){ people.push(buskerFigure(bk)); addBuskerProp(parent,bk); }
  for(const z of S.horde||[]) people.push(walkerFigure(z));
  for(const a of S.siege?.arrows||[]) addVolley(parent,a);
  for(const inc of S.incidents||[]) addIncident(parent,inc,people);
  addPeople(parent,people);
  for(const v of S.vehicles||[]) addVehicle(parent,v);
  for(const v of S.serviceVehicles||[]) addVehicle(parent,v,true);
  for(const t of S.trains||[]) addTrain(parent,t);
  for(const b of S.boats||[]) addBoat(parent,b);
}
