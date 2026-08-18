import { isBridge } from '../buildings/buildings.js';
import { DIRS, H, P, TAU, TH, TW, W, clamp, hash2, lerp, mix, shade } from '../core/constants.js';
import { S, idx, isType } from '../core/state.js';
import { proj, screen2world } from '../world/map.js';
import { PAL } from '../world/seasons.js';

/* ============================================================
   RENDERING
   ============================================================ */
export const cv=document.getElementById("c"),g=cv.getContext("2d",{alpha:false});
export let DPR=1;
export function resize(){
  DPR=Math.min(devicePixelRatio||1,2);
  cv.width=Math.floor(innerWidth*DPR);
  cv.height=Math.floor(innerHeight*DPR);
  g.setTransform(DPR,0,0,DPR,0,0);
}
addEventListener("resize",()=>{resize();});

export function diamond(sx,sy,f){
  const hw=TW/2*f*S.cam.z, hh=TH/2*f*S.cam.z;
  g.beginPath();
  g.moveTo(sx,sy-hh); g.lineTo(sx+hw,sy); g.lineTo(sx,sy+hh); g.lineTo(sx-hw,sy);
  g.closePath();
}

// draws an iso box; returns the screen y of the top face centre
export function box(sx,sy,f,hgt,top,left,right){
  const z=S.cam.z, hw=TW/2*f*z, hh=TH/2*f*z, h=hgt*z;
  g.fillStyle=left;
  g.beginPath();
  g.moveTo(sx-hw,sy); g.lineTo(sx,sy+hh); g.lineTo(sx,sy+hh-h); g.lineTo(sx-hw,sy-h);
  g.closePath(); g.fill();
  g.fillStyle=right;
  g.beginPath();
  g.moveTo(sx+hw,sy); g.lineTo(sx,sy+hh); g.lineTo(sx,sy+hh-h); g.lineTo(sx+hw,sy-h);
  g.closePath(); g.fill();
  g.fillStyle=top;
  g.beginPath();
  g.moveTo(sx,sy-hh-h); g.lineTo(sx+hw,sy-h); g.lineTo(sx,sy+hh-h); g.lineTo(sx-hw,sy-h);
  g.closePath(); g.fill();
  return sy-h;
}

// a fresh diamond of snow, laid on any flat top face
export function snowCap(sx,topY,f){
  if(PAL.snow<0.03) return;
  diamond(sx,topY,f);
  g.fillStyle="rgba(250,252,255,"+(PAL.snow*0.8)+")";
  g.fill();
}

export const lights=[];   // window glow positions, drawn after the night tint

export function drawGround(){
  const z=S.cam.z;
  // visible band of the grid
  const c0=screen2world(0,0), c1=screen2world(innerWidth,0), c2=screen2world(0,innerHeight), c3=screen2world(innerWidth,innerHeight);
  const minX=Math.floor(Math.min(c0.x,c1.x,c2.x,c3.x))-1, maxX=Math.ceil(Math.max(c0.x,c1.x,c2.x,c3.x))+1;
  const minY=Math.floor(Math.min(c0.y,c1.y,c2.y,c3.y))-1, maxY=Math.ceil(Math.max(c0.y,c1.y,c2.y,c3.y))+1;
  for(let y=Math.max(0,minY);y<Math.min(H,maxY);y++){
    for(let x=Math.max(0,minX);x<Math.min(W,maxX);x++){
      const i=idx(x,y), p=proj(x,y);
      const b=S.grid[i];
      if(S.terr[i]===1){
        diamond(p.x,p.y,1.02); g.fillStyle=PAL.water; g.fill();
        const w=Math.sin(S.t*1.3+x*0.7+y*0.5);
        if(w>0.55){
          g.save(); diamond(p.x,p.y,1.02); g.clip();
          g.strokeStyle="rgba(255,255,255,"+(0.30-0.14*PAL.snow)+")"; g.lineWidth=1.6*z;
          g.beginPath();
          g.moveTo(p.x-10*z,p.y+2*z); g.lineTo(p.x-2*z,p.y-1*z); g.lineTo(p.x+7*z,p.y+2*z);
          g.stroke(); g.restore();
        }
        continue;                       // any span over it is drawn in the sorted pass
      }
      if(b&&b.type==="road"){ drawRoad(x,y,p); continue; }
      if(b&&b.type==="rail"){ drawRail(x,y,p); continue; }
      const tint=PAL.grass[(hash2(x,y,17)*4)|0];
      diamond(p.x,p.y,1.02); g.fillStyle=tint; g.fill();
      if(hash2(x,y,88)>0.86){
        g.fillStyle=PAL.grassDark;
        g.fillRect(p.x-2*z,p.y-1*z,4*z,1.4*z);
      }
      if(PAL.snow>0.55&&hash2(x,y,131)>0.95){
        g.fillStyle="rgba(255,255,255,.9)";
        g.fillRect(p.x-1*z,p.y-0.5*z,2*z,1*z);
      }
      if(PAL.bloom>0.6&&hash2(x,y,205)>0.965){
        g.fillStyle=["#e9dc7d","#e7b4c6","#f2efe2"][(hash2(x,y,206)*3)|0];
        g.beginPath(); g.arc(p.x,p.y,1.2*z,0,TAU); g.fill();
      }
    }
  }
}

export const BRIDGE_LIFT=8;                 // deck height above the water, in tile pixels
export function tileLift(x,y){ return isBridge(x,y)?BRIDGE_LIFT:0; }

export function drawRoad(x,y,p){
  const z=S.cam.z, L=tileLift(x,y)*z, py=p.y-L;
  diamond(p.x,py,1.02); g.fillStyle=P.roadEdge; g.fill();
  diamond(p.x,py,0.86); g.fillStyle=P.road; g.fill();
  if(PAL.snow>0.25&&!L){
    diamond(p.x,py,0.86);
    g.fillStyle="rgba(250,252,255,"+(PAL.snow*0.38)+")"; g.fill();
  }
  g.strokeStyle=P.roadLine; g.lineWidth=1.5*z; g.lineCap="round";
  g.setLineDash([3.2*z,3.4*z]);
  for(const[dx,dy]of DIRS){
    if(!isType(x+dx,y+dy,"road")) continue;
    const e=proj(x+dx*0.5,y+dy*0.5);
    const eL=(L+tileLift(x+dx,y+dy)*z)/2;        // ramp gently onto the bank
    g.beginPath(); g.moveTo(p.x,py); g.lineTo(e.x,e.y-eL); g.stroke();
  }
  g.setLineDash([]);
}

export function drawRail(x,y,p){
  const z=S.cam.z, L=tileLift(x,y)*z, py=p.y-L;
  diamond(p.x,py,1.02); g.fillStyle=P.railBed; g.fill();
  const cons=[];
  for(const[dx,dy]of DIRS) if(isType(x+dx,y+dy,"rail")) cons.push([dx,dy]);
  const list=cons.length?cons:[[1,0],[-1,0]];
  for(const[dx,dy]of list){
    const e=proj(x+dx*0.52,y+dy*0.52);
    const ey=e.y-(L+tileLift(x+dx,y+dy)*z)/2;
    // ties
    g.strokeStyle=P.railTie; g.lineWidth=1.4*z; g.setLineDash([2*z,3.2*z]);
    g.beginPath(); g.moveTo(p.x,py); g.lineTo(e.x,ey); g.stroke();
    g.setLineDash([]);
    // two rails, offset perpendicular in screen space
    const nx=-(ey-py), ny=(e.x-p.x);
    const len=Math.hypot(nx,ny)||1, ox=nx/len*3.1*z, oy=ny/len*3.1*z;
    g.strokeStyle=P.railMetal; g.lineWidth=1.1*z;
    g.beginPath(); g.moveTo(p.x+ox,py+oy); g.lineTo(e.x+ox,ey+oy); g.stroke();
    g.beginPath(); g.moveTo(p.x-ox,py-oy); g.lineTo(e.x-ox,ey-oy); g.stroke();
  }
}

// A road or rail carried over water: piers, deck, and railings on the
// open sides only, so a run of spans reads as one continuous bridge.
export function drawSpan(b,p){
  const z=S.cam.z, L=BRIDGE_LIFT*z;
  const hw=TW/2*z, hh=TH/2*z, py=p.y-L;
  g.fillStyle="rgba(28,58,68,.22)";
  diamond(p.x,p.y+2*z,0.86); g.fill();
  g.fillStyle="#8a7a63";
  g.fillRect(p.x-9*z,py+4*z,2.4*z,L);
  g.fillRect(p.x+6.6*z,py+4*z,2.4*z,L);
  g.fillStyle="#9c8968";
  diamond(p.x,py+2.4*z,1.0); g.fill();

  if(b.type==="road") drawRoad(b.x,b.y,p); else drawRail(b.x,b.y,p);

  const corner={
    t:[p.x,py-hh], r:[p.x+hw,py], b:[p.x,py+hh], l:[p.x-hw,py]
  };
  const edges=[[[1,0],"r","b"],[[-1,0],"l","t"],[[0,1],"b","l"],[[0,-1],"t","r"]];
  g.strokeStyle="rgba(244,240,226,.88)"; g.lineWidth=1.2*z; g.lineCap="round";
  for(const[d,c1,c2] of edges){
    if(isType(b.x+d[0],b.y+d[1],b.type)) continue;   // the way carries on, leave it open
    const a=corner[c1], c=corner[c2];
    g.beginPath(); g.moveTo(a[0],a[1]-5*z); g.lineTo(c[0],c[1]-5*z); g.stroke();
    g.beginPath(); g.moveTo(a[0],a[1]); g.lineTo(a[0],a[1]-5*z); g.stroke();
    g.beginPath(); g.moveTo(c[0],c[1]); g.lineTo(c[0],c[1]-5*z); g.stroke();
  }
}

export function blob(sx,sy,r,col,hi){
  g.fillStyle=col;
  g.beginPath(); g.arc(sx,sy,r,0,TAU); g.fill();
  g.fillStyle=hi;
  g.beginPath(); g.arc(sx-r*0.28,sy-r*0.3,r*0.6,0,TAU); g.fill();
}

export function drawTree(sx,sy,seed,scale){
  const z=S.cam.z*(scale||1);
  const r=hash2(seed,3,5);
  g.fillStyle="rgba(30,50,30,.16)";
  g.beginPath(); g.ellipse(sx,sy+1*z,7*z,3.4*z,0,0,TAU); g.fill();
  g.fillStyle=P.trunk;
  g.fillRect(sx-1.3*z,sy-9*z,2.6*z,9*z);
  const rr=(6.2+r*2.4)*z*(1-PAL.snow*0.28);       // winter thins the canopy
  blob(sx,sy-13*z,rr,PAL.leaf,PAL.leafHi);
  blob(sx-rr*0.55,sy-9*z,rr*0.62,PAL.leaf,PAL.leafHi);
  blob(sx+rr*0.55,sy-9.5*z,rr*0.6,PAL.leaf,PAL.leafHi);
  if(PAL.snow>0.05){
    g.fillStyle="rgba(252,253,255,"+(PAL.snow*0.8)+")";
    g.beginPath(); g.arc(sx,sy-13*z-rr*0.42,rr*0.62,0,TAU); g.fill();
    g.beginPath(); g.arc(sx+rr*0.55,sy-9.5*z-rr*0.3,rr*0.34,0,TAU); g.fill();
  }
  if(PAL.bloom>0.55){
    const a=PAL.bloom*0.85;
    for(let i=0;i<3;i++){
      const t=hash2(seed,i,44)*TAU;
      g.fillStyle="rgba(240,182,199,"+a+")";
      g.beginPath();
      g.arc(sx+Math.cos(t)*rr*0.7,sy-13*z+Math.sin(t)*rr*0.6,rr*0.22,0,TAU); g.fill();
    }
  }
}
