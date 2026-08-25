import { TAU, TW } from '../core/constants.js';
import { S } from '../core/state.js';
import { facilityFootprint } from '../world/tiles.js';
import { proj } from '../world/map.js';
import { PAL } from '../world/seasons.js';
import { diamond, drawTree, g, lights } from './terrain.js';

function baseTile(x,y,edge=false){
  const p=proj(x,y),z=S.cam.z;
  diamond(p.x,p.y,0.99); g.fillStyle=PAL.snow>0.25?'#dfe5dc':'#79ad69'; g.fill();
  if(edge){ g.strokeStyle='rgba(72,96,70,.28)'; g.lineWidth=0.8*z; g.stroke(); }
  return p;
}
function line(a,b,width=3,alpha=.82){
  const z=S.cam.z;
  g.strokeStyle='rgba(224,210,177,'+alpha+')'; g.lineWidth=width*z; g.lineCap='round';
  g.beginPath(); g.moveTo(a.x,a.y); g.lineTo(b.x,b.y); g.stroke();
}
function bench(x,y){
  const p=proj(x,y),z=S.cam.z;
  g.fillStyle='#997a55'; g.fillRect(p.x-4*z,p.y+1*z,8*z,1.5*z); g.fillRect(p.x-4*z,p.y-1*z,8*z,1.2*z);
}
function littleLamp(x,y,dark){
  const p=proj(x,y),z=S.cam.z;
  g.fillStyle='#4d5c54'; g.fillRect(p.x-.7*z,p.y-10*z,1.4*z,10*z);
  g.fillStyle=dark>0.12?'#ffdda2':'#d9ded6'; g.fillRect(p.x-1.8*z,p.y-12*z,3.6*z,2.6*z);
  if(dark>0.12) lights.push({x:p.x-1.8*z,y:p.y-12*z,w:3.6*z,h:2.6*z,big:true});
}
function fillFacility(root){
  const [w,h]=facilityFootprint(root);
  for(let dy=0;dy<h;dy++) for(let dx=0;dx<w;dx++) baseTile(root.x+dx,root.y+dy,dx===0||dy===0||dx===w-1||dy===h-1);
}
function crossPaths(root){
  const [w,h]=facilityFootprint(root);
  const left=proj(root.x-.35,root.y+(h-1)/2),right=proj(root.x+w-.65,root.y+(h-1)/2);
  const top=proj(root.x+(w-1)/2,root.y-.35),bottom=proj(root.x+(w-1)/2,root.y+h-.65);
  line(left,right,3.2,.82); line(top,bottom,3.2,.82);
}
function treeAt(root,dx,dy,n,scale=.82){ const p=proj(root.x+dx,root.y+dy); drawTree(p.x,p.y,root.seed+n,scale); }

function drawPocketPark(root,dark){
  fillFacility(root); crossPaths(root);
  treeAt(root,.25,.28,1,.78); treeAt(root,1.38,1.25,2,.86);
  bench(root.x+.96,root.y+.55);
  littleLamp(root.x+1.45,root.y+.35,dark);
}

function drawPlayground(root,dark){
  fillFacility(root);
  const z=S.cam.z,p=proj(root.x+.95,root.y+.95);
  line(proj(root.x-.3,root.y+.95),proj(root.x+2.3,root.y+.95),2.4,.75);
  // bright climbing frame / slide silhouette
  g.strokeStyle='#cf6f61'; g.lineWidth=2*z;
  g.beginPath(); g.moveTo(p.x-9*z,p.y+1*z); g.lineTo(p.x-3*z,p.y-12*z); g.lineTo(p.x+5*z,p.y+1*z); g.stroke();
  g.fillStyle='#e5b84f'; g.beginPath(); g.moveTo(p.x-2*z,p.y-8*z); g.lineTo(p.x+10*z,p.y+1*z); g.lineTo(p.x+7*z,p.y+2*z); g.closePath(); g.fill();
  g.strokeStyle='#5e8eae'; g.lineWidth=1.6*z;
  g.beginPath(); g.moveTo(p.x+11*z,p.y-10*z); g.lineTo(p.x+16*z,p.y+2*z); g.moveTo(p.x+21*z,p.y-10*z); g.lineTo(p.x+16*z,p.y+2*z); g.moveTo(p.x+11*z,p.y-10*z); g.lineTo(p.x+21*z,p.y-10*z); g.stroke();
  littleLamp(root.x+.25,root.y+1.5,dark);
}

function drawPicnicGreen(root,dark){
  fillFacility(root);
  const z=S.cam.z;
  line(proj(root.x-.3,root.y+1.5),proj(root.x+3.3,root.y+1.5),3.3,.78);
  treeAt(root,.35,.35,1,.88); treeAt(root,2.42,.42,2,.84); treeAt(root,2.45,2.38,3,.9); treeAt(root,.45,2.4,4,.8);
  for(const [dx,dy] of [[1.05,.72],[1.85,1.45],[1.08,2.15]]){
    const p=proj(root.x+dx,root.y+dy);
    g.fillStyle='#a9835c'; g.fillRect(p.x-4*z,p.y-1*z,8*z,2*z); g.fillRect(p.x-2.5*z,p.y+1*z,1*z,3*z); g.fillRect(p.x+1.5*z,p.y+1*z,1*z,3*z);
  }
  littleLamp(root.x+1.5,root.y+.25,dark);
}

function drawSportsCourt(root,dark){
  fillFacility(root);
  const [w,h]=facilityFootprint(root),z=S.cam.z;
  const a=proj(root.x+.15,root.y+.25),b=proj(root.x+w-.15,root.y+h-.25);
  // Court is drawn as one coordinated surface across the footprint.
  const center=proj(root.x+(w-1)/2,root.y+(h-1)/2);
  const poly=[proj(root.x-.15,root.y+.05),proj(root.x+w-.05,root.y+.05),proj(root.x+w-.05,root.y+h-.05),proj(root.x-.15,root.y+h-.05)];
  g.fillStyle=PAL.snow>0.4?'rgba(200,207,204,.9)':'#7f9c8d';
  g.beginPath(); g.moveTo(poly[0].x,poly[0].y); for(let i=1;i<poly.length;i++) g.lineTo(poly[i].x,poly[i].y); g.closePath(); g.fill();
  g.strokeStyle='rgba(245,240,220,.85)'; g.lineWidth=1.2*z;
  g.beginPath(); g.moveTo(a.x,a.y); g.lineTo(b.x,b.y); g.stroke();
  g.beginPath(); g.arc(center.x,center.y,6*z,0,TAU); g.stroke();
  // two readable hoop silhouettes
  for(const s of [-1,1]){
    const p=proj(root.x+(w-1)/2+s*.55,root.y+(h-1)/2+s*.55);
    g.strokeStyle='#555f5a'; g.lineWidth=1.2*z;
    g.beginPath(); g.moveTo(p.x,p.y); g.lineTo(p.x,p.y-10*z); g.stroke();
    g.beginPath(); g.arc(p.x+s*3*z,p.y-9*z,2.5*z,0,TAU); g.stroke();
  }
  littleLamp(root.x+.1,root.y+h-.2,dark); littleLamp(root.x+w-.2,root.y+.15,dark);
}

function drawTownPark(root,dark){
  fillFacility(root); crossPaths(root);
  const z=S.cam.z,[w,h]=facilityFootprint(root);
  // perimeter canopy
  const trees=[[.3,.3],[1.45,.22],[2.65,.3],[3.45,.7],[.28,1.65],[3.55,2.05],[.45,3.35],[1.55,3.48],[2.75,3.4],[3.45,3.35]];
  trees.forEach((p,i)=>treeAt(root,p[0],p[1],i+1,.78+(i%3)*.05));
  // central fountain / gathering landmark
  const c=proj(root.x+(w-1)/2,root.y+(h-1)/2);
  g.fillStyle='#aeb8ae'; g.beginPath(); g.ellipse(c.x,c.y+1*z,10*z,5*z,0,0,TAU); g.fill();
  g.fillStyle='#7bb3c2'; g.beginPath(); g.ellipse(c.x,c.y,7.5*z,3.6*z,0,0,TAU); g.fill();
  g.strokeStyle='rgba(235,245,245,.8)'; g.lineWidth=1.1*z; g.beginPath(); g.moveTo(c.x,c.y-2*z); g.quadraticCurveTo(c.x+5*z,c.y-12*z,c.x+1*z,c.y-1*z); g.stroke();
  bench(root.x+1.1,root.y+2.35); bench(root.x+2.5,root.y+1.05);
  littleLamp(root.x+.85,root.y+1.45,dark); littleLamp(root.x+2.75,root.y+2.55,dark);
}

export function drawRecreationFacility(root,dark=0){
  if(root.type==='pocketPark') drawPocketPark(root,dark);
  else if(root.type==='playground') drawPlayground(root,dark);
  else if(root.type==='picnicGreen') drawPicnicGreen(root,dark);
  else if(root.type==='sportsCourt') drawSportsCourt(root,dark);
  else if(root.type==='townPark') drawTownPark(root,dark);
}
