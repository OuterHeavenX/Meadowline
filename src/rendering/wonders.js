import { TAU, TH, TW, clamp, mix, shade } from '../core/constants.js';
import { S, reduceMotion } from '../core/state.js';
import { box, diamond, g, lights, snowCap } from './terrain.js';
import { groundShadow } from './buildings.js';
import { getBuildingDefinition } from '../buildings/registry.js';
import { PAL } from '../world/seasons.js';
import { proj } from '../world/map.js';

/* ---------- large facilities ----------
   A wonder is the tallest thing in the valley, so it is drawn from its
   footprint centre rather than its root tile: a 3x3 rooted at its north-west
   corner would otherwise lean a tile and a half off its own land. */
function footprintOf(b){ return getBuildingDefinition(b.type)?.placement?.footprint||[1,1]; }
function centre(b){ const fp=footprintOf(b); return proj(b.x+(fp[0]-1)/2,b.y+(fp[1]-1)/2); }
function span(b){ const fp=footprintOf(b); return (fp[0]+fp[1])/2; }

// The paved apron a big building stands on, so it reads as sited rather than
// dropped: it covers the whole footprint and takes the snow like the ground.
function apron(p,f,fill,edge){
  diamond(p.x,p.y,f); g.fillStyle=fill; g.fill();
  if(edge){ g.strokeStyle=edge; g.lineWidth=Math.max(1,1.1*S.cam.z); g.stroke(); }
  if(PAL.snow>0.03){ diamond(p.x,p.y,f); g.fillStyle="rgba(250,252,255,"+(PAL.snow*0.55)+")"; g.fill(); }
}

/* ---------- farm: furrowed fields and a barn ---------- */
export function drawFarm(b,dark){
  const p=centre(b),z=S.cam.z,f=span(b)*0.98;
  const hw=TW/2*f*z, hh=TH/2*f*z;
  groundShadow(p.x,p.y,hw*0.5,hh*0.5,.12);
  // The crop takes the season with it. PAL.yield is the same number the mill is
  // paid on, so the field looks like what the ledger says it grew: green while
  // it is growing, gold only once there is a harvest in it, bare under snow.
  // Even unripe the crop is a warmer, darker olive than the meadow around it, or
  // a spring field would be indistinguishable from the grass it was ploughed out of.
  const ripe=clamp(((PAL.yield||0)-2)/9,0,1);
  const crop=mix(mix("#87a44a","#d9b455",ripe),"#c3c0ad",PAL.snow*0.85);
  apron(p,f,crop);
  // Furrows run along one grid axis, so the field is ploughed with the valley
  // rather than across it. A point (u,v) of the footprint, each in [-0.5,0.5],
  // lands at ((u-v)*hw,(u+v)*hh) from the middle; a furrow holds v and sweeps u.
  g.strokeStyle="rgba(74,62,42,.2)"; g.lineWidth=Math.max(0.7,1*z);
  for(let i=-6;i<=6;i++){
    const v=i/14;
    g.beginPath();
    g.moveTo(p.x+(-0.5-v)*hw, p.y+(-0.5+v)*hh);
    g.lineTo(p.x+(0.5-v)*hw, p.y+(0.5+v)*hh);
    g.stroke();
  }
  // barn and silo, on the north corner so the plot in front of them stays open
  const bx=p.x-hw*0.42, by=p.y-hh*0.42, bf=f*0.3;
  const bhw=TW/2*bf*z;
  const topY=box(bx,by,bf,11,"#c1543f","#813428","#a04434");
  g.fillStyle="#9c4133";
  g.beginPath(); g.moveTo(bx-bhw,topY); g.lineTo(bx,topY-8*z); g.lineTo(bx+bhw,topY); g.lineTo(bx,topY+TH/2*bf*z); g.closePath(); g.fill();
  g.fillStyle="#b04a3a";
  g.beginPath(); g.moveTo(bx-bhw,topY); g.lineTo(bx,topY-8*z); g.lineTo(bx,topY+TH/2*bf*z); g.closePath(); g.fill();
  snowCap(bx,topY-8*z,bf*0.3);
  // the big double door, on the face that looks down the field
  g.fillStyle="#e9e2cd"; g.fillRect(bx+bhw*0.18,by-8*z,bhw*0.5,7*z);
  g.strokeStyle="rgba(120,60,44,.7)"; g.lineWidth=Math.max(0.7,0.9*z);
  g.beginPath(); g.moveTo(bx+bhw*0.43,by-8*z); g.lineTo(bx+bhw*0.43,by-1*z); g.stroke();
  if(dark>0.12) lights.push({x:bx+bhw*0.18,y:by-8*z,w:bhw*0.5,h:7*z});
  // a silo beside it, the tall thing you spot a farm by
  const sx=bx+bhw*1.15, sy=by+TH/4*bf*z;
  groundShadow(sx,sy,4.5*z,2.4*z,.14);
  g.fillStyle="#cfc6ae"; g.fillRect(sx-3*z,sy-26*z,6*z,26*z);
  g.fillStyle="rgba(120,110,88,.22)"; g.fillRect(sx+0.8*z,sy-26*z,2.2*z,26*z);
  g.fillStyle="#b3a992";
  g.beginPath(); g.ellipse(sx,sy-26*z,3*z,3.2*z,0,Math.PI,TAU); g.fill();
  g.fillStyle="#8f8770";
  g.beginPath(); g.ellipse(sx,sy-26*z,3*z,1.5*z,0,0,TAU); g.fill();
}

/* ---------- statue: a bronze figure over the valley ---------- */
export function drawStatue(b,dark){
  const p=centre(b),z=S.cam.z,f=span(b)*0.94;
  groundShadow(p.x,p.y,TW/2*f*z*0.55,TH/2*f*z*0.55,.2);
  apron(p,f,"#d9d3c2","rgba(120,118,102,.5)");
  // a low hedge ring, so the monument has a garden rather than a car park
  g.strokeStyle=mix("#5f8b46",PAL.leaf||"#5f8b46",.5); g.lineWidth=2.4*z;
  diamond(p.x,p.y,f*0.86); g.stroke();
  // plinth: narrow and tall, so the figure on top is the thing you see rather
  // than the block under it
  const step=box(p.x,p.y,f*0.46,4,"#e4dece","#a9a390","#c6bfa9");
  const plinth=box(p.x,step,f*0.3,6,"#e2dbc8","#a49e8a","#c1baa4");
  const top=box(p.x,plinth,f*0.2,22,"#dfd7c4","#9d9784","#bcb5a0");
  snowCap(p.x,top,f*0.2);
  // The figure stands ON the plinth, so every part is drawn upward from the
  // plinth top: a robed silhouette, because at this size a jointed body reads
  // as a scatter of sticks rather than a person. It is deliberately large -
  // a monument the town can see is a monument the player can see.
  const fy=top-1*z, u=z*2.3;
  const bronze="#7d6a3f";
  // The whole body is one silhouette. Shoulders are the widest point and the
  // waist is drawn in, because that - not limbs - is what makes a shape this
  // small read as a person rather than an obelisk.
  g.fillStyle="#6b5c37";
  g.beginPath(); g.ellipse(p.x,fy,2.6*u,1.1*u,0,0,TAU); g.fill();   // base plate
  g.fillStyle=bronze;
  g.beginPath();
  g.moveTo(p.x-1.9*u,fy-0.4*u);
  g.lineTo(p.x-1.5*u,fy-7*u);
  g.lineTo(p.x-2.3*u,fy-10.8*u);
  g.lineTo(p.x-0.7*u,fy-12.6*u);
  g.lineTo(p.x+0.7*u,fy-12.6*u);
  g.lineTo(p.x+2.3*u,fy-10.8*u);
  g.lineTo(p.x+1.5*u,fy-7*u);
  g.lineTo(p.x+1.9*u,fy-0.4*u);
  g.closePath(); g.fill();
  g.beginPath(); g.ellipse(p.x,fy-14*u,1.3*u,1.55*u,0,0,TAU); g.fill();  // head
  g.save(); g.translate(p.x+1.6*u,fy-11.4*u); g.rotate(-1.05);
  g.fillRect(0,-0.8*u,6.2*u,1.6*u); g.restore();   // the arm raised over the town
  g.save(); g.translate(p.x-1.7*u,fy-11*u); g.rotate(0.28);
  g.fillRect(-1.4*u,0,1.4*u,6.4*u); g.restore();   // the other, held down
  // the folds of the robe, and verdigris where the weather gets at it
  g.strokeStyle="rgba(58,48,26,.3)"; g.lineWidth=Math.max(0.8,0.5*u);
  g.beginPath(); g.moveTo(p.x-0.5*u,fy-9.5*u); g.lineTo(p.x-0.8*u,fy-0.6*u); g.stroke();
  g.beginPath(); g.moveTo(p.x+0.6*u,fy-9.5*u); g.lineTo(p.x+0.9*u,fy-0.6*u); g.stroke();
  g.fillStyle="rgba(140,175,150,.26)";
  g.beginPath();
  g.moveTo(p.x+0.7*u,fy-12.6*u); g.lineTo(p.x+2.3*u,fy-10.8*u);
  g.lineTo(p.x+1.5*u,fy-7*u); g.lineTo(p.x+0.8*u,fy-8*u);
  g.closePath(); g.fill();
  if(dark>0.15){
    // uplighters at the foot of the plinth
    for(const dx of[-1,1]) lights.push({x:p.x+dx*7*z-1.5*z,y:top-2*z,w:3*z,h:3*z,big:true});
  }
}

/* ---------- clock tower: the whole town keeps one hour ---------- */
export function drawClockTower(b,dark){
  const p=centre(b),z=S.cam.z,f=span(b)*0.9;
  groundShadow(p.x,p.y,TW/2*f*z*0.6,TH/2*f*z*0.6,.24);
  apron(p,f,"#cfc8b6","rgba(120,118,102,.45)");
  const base=box(p.x,p.y,f*0.62,12,"#e7dfcb","#9f9782","#c3baa2");
  // A wonder has to be the tallest thing on its street or it is just a large
  // building, so the shaft runs well past anything else in the valley.
  const shaft=box(p.x,base,f*0.38,62,"#efe7d2","#a89f88","#cdc4aa");
  const shw=TW/2*f*0.38*z;
  g.fillStyle="rgba(120,110,92,.14)";
  for(let i=1;i<7;i++) g.fillRect(p.x-shw,base-i*9*z,shw*2,1.3*z);
  const belfry=box(p.x,shaft,f*0.46,12,"#e3dac4","#968e79","#bab29a");
  const bhw=TW/2*f*0.46*z;
  // belfry arches, which is what stops the top reading as another plain block
  g.fillStyle="#4c4438";
  for(const t of[-0.5,0,0.5]){
    const ax=p.x+t*bhw*0.9, ay=shaft-1*z;
    g.beginPath();
    g.moveTo(ax-1.5*z,ay); g.lineTo(ax-1.5*z,ay-6*z);
    g.arc(ax,ay-6*z,1.5*z,Math.PI,0); g.lineTo(ax+1.5*z,ay); g.closePath(); g.fill();
  }
  snowCap(p.x,belfry,f*0.46);
  // spire
  g.fillStyle="#5c7183";
  g.beginPath(); g.moveTo(p.x-bhw,belfry); g.lineTo(p.x+bhw,belfry); g.lineTo(p.x,belfry-24*z); g.closePath(); g.fill();
  g.fillStyle="rgba(255,255,255,.12)";
  g.beginPath(); g.moveTo(p.x-bhw,belfry); g.lineTo(p.x,belfry+TH/2*f*0.46*z); g.lineTo(p.x,belfry-24*z); g.closePath(); g.fill();
  g.fillStyle="#e0ae4e";
  g.beginPath(); g.arc(p.x,belfry-25.5*z,1.8*z,0,TAU); g.fill();
  // The face keeps the game's own hour rather than a decorative angle, so a
  // glance at the tower tells you how far the day has run. It sits high on the
  // shaft, just under the belfry, where a clock is actually readable.
  const cy=shaft+11*z, r=6.4*z;
  g.fillStyle="#f6f2e4"; g.beginPath(); g.arc(p.x,cy,r,0,TAU); g.fill();
  g.strokeStyle="#5c5344"; g.lineWidth=1.3*z; g.stroke();
  g.fillStyle="#5c5344";
  for(let k=0;k<4;k++){ const a=k*Math.PI/2; g.fillRect(p.x+Math.cos(a)*r*0.78-0.6*z,cy+Math.sin(a)*r*0.78-0.6*z,1.2*z,1.2*z); }
  g.strokeStyle="#2b3d36"; g.lineWidth=1.5*z; g.lineCap="round";
  const hour=(S.dayT||0)*TAU-Math.PI/2, minute=((S.dayT||0)*12%1)*TAU-Math.PI/2;
  g.beginPath(); g.moveTo(p.x,cy); g.lineTo(p.x+Math.cos(hour)*r*0.48,cy+Math.sin(hour)*r*0.48); g.stroke();
  g.beginPath(); g.moveTo(p.x,cy); g.lineTo(p.x+Math.cos(minute)*r*0.74,cy+Math.sin(minute)*r*0.74); g.stroke();
  g.lineCap="butt";
  if(dark>0.1){ lights.push({x:p.x-r,y:cy-r,w:r*2,h:r*2,big:true}); lights.push({x:p.x-bhw*0.7,y:shaft-6*z,w:bhw*1.4,h:5*z}); }
}

/* ---------- lighthouse: the boats find their way in ---------- */
export function drawLighthouse(b,dark){
  const p=centre(b),z=S.cam.z,f=span(b)*0.9;
  groundShadow(p.x,p.y,TW/2*f*z*0.55,TH/2*f*z*0.55,.22);
  apron(p,f,"#bfb9a6","rgba(110,108,94,.5)");
  // keeper's cottage tucked at the foot
  const kx=p.x-TW/2*f*z*0.42, ky=p.y+TH/2*f*z*0.2;
  const kTop=box(kx,ky,f*0.26,8,"#e4dcc8","#9c947f","#c0b89f");
  g.fillStyle="#7a8fa0";
  const khw=TW/2*f*0.26*z;
  g.beginPath(); g.moveTo(kx-khw,kTop); g.lineTo(kx+khw,kTop); g.lineTo(kx,kTop-5*z); g.closePath(); g.fill();
  // The tower tapers over six short courses rather than three tall ones, which
  // is what makes a stack of iso boxes read as a cone instead of a wedding cake.
  let y=p.y;
  const stages=[[0.44,11],[0.40,11],[0.35,11],[0.31,11],[0.27,11],[0.24,10]];
  for(let i=0;i<stages.length;i++){
    const[w,h]=stages[i],col=i%2?"#c9564a":"#f4f0e2";
    y=box(p.x,y,f*w,h,shade(col,10),shade(col,-32),shade(col,-14));
  }
  // gallery rail
  const ghw=TW/2*f*0.29*z;
  g.fillStyle="#4a5a63"; g.fillRect(p.x-ghw,y-2*z,ghw*2,2.6*z);
  // lantern room
  const lTop=box(p.x,y-2*z,f*0.2,9,"#ffe9b4","#c9a862","#e6cd8e");
  g.fillStyle="#3f4d56";
  const lhw=TW/2*f*0.2*z;
  g.beginPath(); g.moveTo(p.x-lhw,lTop); g.lineTo(p.x+lhw,lTop); g.lineTo(p.x,lTop-8*z); g.closePath(); g.fill();
  snowCap(p.x,lTop,f*0.2);
  // The beam only sweeps once it is dark enough to be worth lighting, and it
  // holds still when the player has asked for less motion.
  if(dark>0.18){
    const a=reduceMotion?2.1:S.t*0.6;
    const lampY=y-8*z;
    g.save(); g.globalCompositeOperation="lighter";
    for(let k=0;k<2;k++){
      const ang=a+k*Math.PI, dx=Math.cos(ang), dy=Math.sin(ang)*0.5;
      const grad=g.createLinearGradient(p.x,lampY,p.x+dx*120*z,lampY+dy*120*z);
      grad.addColorStop(0,"rgba(255,236,178,"+(0.5*dark)+")");
      grad.addColorStop(1,"rgba(255,236,178,0)");
      g.fillStyle=grad;
      g.beginPath(); g.moveTo(p.x,lampY);
      g.lineTo(p.x+dx*120*z-dy*22*z,lampY+dy*120*z+dx*11*z);
      g.lineTo(p.x+dx*120*z+dy*22*z,lampY+dy*120*z-dx*11*z);
      g.closePath(); g.fill();
    }
    g.restore();
    lights.push({x:p.x-4*z,y:lampY-4*z,w:8*z,h:8*z,big:true});
  }
}

/* ---------- great library: a colonnade for the whole valley ---------- */
export function drawGreatLibrary(b,dark){
  const p=centre(b),z=S.cam.z,f=span(b)*0.94;
  groundShadow(p.x,p.y,TW/2*f*z*0.62,TH/2*f*z*0.62,.24);
  apron(p,f,"#d5cfbd","rgba(118,116,100,.45)");
  const steps=box(p.x,p.y,f*0.78,5,"#e8e2d0","#aca592","#cbc4ae");
  const hall=box(p.x,steps,f*0.62,20,"#f2ecd9","#ada58d","#d2c9ae");
  const hw=TW/2*f*0.62*z, hh=TH/2*f*0.62*z;
  // colonnade across the two faces the camera can see
  g.fillStyle="#e6dfc9";
  for(let i=0;i<5;i++){
    const t=(i+0.5)/5;
    g.fillRect(p.x-hw+t*hw-1.4*z, hall+hh*t-1*z, 2.8*z, 15*z);
    g.fillRect(p.x+hw-t*hw-1.4*z, hall+hh*t-1*z, 2.8*z, 15*z);
  }
  g.fillStyle="rgba(90,84,68,.2)";
  g.fillRect(p.x-hw,hall-1*z,hw*2,2*z);
  // pediment over the entrance
  g.fillStyle="#efe8d3";
  g.beginPath(); g.moveTo(p.x-hw*0.55,hall-2*z); g.lineTo(p.x+hw*0.55,hall-2*z); g.lineTo(p.x,hall-11*z); g.closePath(); g.fill();
  g.strokeStyle="rgba(120,112,92,.5)"; g.lineWidth=1.1*z; g.stroke();
  // dome behind, the silhouette that carries at a distance
  const dTop=box(p.x,hall-2*z,f*0.34,9,"#e9e2cd","#a49c86","#c8c0a8");
  g.fillStyle="#8fa9b2";
  g.beginPath(); g.ellipse(p.x,dTop,TW/2*f*0.34*z,13*z,0,Math.PI,TAU); g.fill();
  g.fillStyle="rgba(255,255,255,.22)";
  g.beginPath(); g.ellipse(p.x-3*z,dTop-4*z,5*z,7*z,0,Math.PI,TAU); g.fill();
  g.fillStyle="#e0ae4e";
  g.beginPath(); g.arc(p.x,dTop-14*z,2*z,0,TAU); g.fill();
  if(PAL.snow>0.03){
    g.fillStyle="rgba(250,252,255,"+(PAL.snow*0.7)+")";
    g.beginPath(); g.ellipse(p.x,dTop-1*z,TW/2*f*0.34*z,5*z,0,Math.PI,TAU); g.fill();
  }
  // lit windows between the columns after dark
  if(dark>0.1){
    for(let i=0;i<4;i++){
      const t=(i+1)/5;
      lights.push({x:p.x-hw+t*hw*2-2*z,y:hall+2*z,w:4*z,h:6*z});
    }
    lights.push({x:p.x-hw*0.4,y:hall-8*z,w:hw*0.8,h:6*z,big:true});
  }
}

const WONDER_DRAW={statue:drawStatue,clockTower:drawClockTower,lighthouse:drawLighthouse,greatLibrary:drawGreatLibrary};
export function isWonder(type){ return !!WONDER_DRAW[type]; }
export function drawWonder(b,dark){ const fn=WONDER_DRAW[b.type]; if(fn) fn(b,dark); }
