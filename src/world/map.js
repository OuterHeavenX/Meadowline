import { H, TH, TW, W, fbm, hash2 } from '../core/constants.js';
import { S } from '../core/state.js';
import { idx } from './tiles.js';
import { drops, seedBirds, seedClouds } from './weather.js';

/* ---------- world generation ---------- */
export function genWorld(seed){
  S.seed=seed;
  S.terr=new Uint8Array(W*H);
  S.natTree=new Uint8Array(W*H);
  S.grid=new Array(W*H).fill(null);
  const s=seed%9973;
  // Feature size grows with the map, so a bigger valley gets bigger lakes and
  // woods rather than the same small blobs repeated many more times.
  const F=Math.sqrt(W/44);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const i=idx(x,y);
    // ponds: organic blobs, kept away from the very centre so there's room to build
    const cd=Math.hypot(x-W/2,y-H/2)/(W/2);
    const w=fbm(x/(11*F),y/(11*F),s);
    if(w>0.68+0.13*(1-cd)) S.terr[i]=1;
    // natural woodland in clusters
    const f=fbm(x/(6.5*F),y/(6.5*F),s+404);
    if(!S.terr[i]&&f>0.585&&hash2(x,y,s+9)>0.45) S.natTree[i]=1;
  }
  S.citizens.length=0; S.trains.length=0; S.boats.length=0; S.puffs.length=0;
  S.coins=340; S.day=1; S.dayT=0.24; S.t=0;
  S.wx={k:"clear",amt:0,target:0,next:70}; drops.length=0;
  S.wishes.length=0; S.log.length=0; S.history.length=0;
  seedClouds(); seedBirds();
  centreCamera();
}

export function centreCamera(){
  S.cam.z=Math.min(1.15,Math.max(0.62,Math.min(innerWidth/900,innerHeight/620)));
  const p=world2screen(W/2,H/2);
  S.cam.x=innerWidth/2-p.x*S.cam.z;
  S.cam.y=innerHeight/2-p.y*S.cam.z;
}

/* ---------- iso transforms ---------- */
export function world2screen(x,y){return {x:(x-y)*(TW/2), y:(x+y)*(TH/2)};}
export function screen2world(sx,sy){
  const wx=(sx-S.cam.x)/S.cam.z, wy=(sy-S.cam.y)/S.cam.z;
  const a=wy/(TH/2), b=wx/(TW/2);
  return {x:(a+b)/2, y:(a-b)/2};
}
export function proj(x,y){const p=world2screen(x,y);return {x:p.x*S.cam.z+S.cam.x, y:p.y*S.cam.z+S.cam.y};}

/* The band of tiles the camera can currently see, clamped to the grid. At
   128x128 the sorted pass must not walk all 16,384 cells every frame. */
export function visibleBand(pad){
  const m=pad||2;
  const c0=screen2world(0,0), c1=screen2world(innerWidth,0),
        c2=screen2world(0,innerHeight), c3=screen2world(innerWidth,innerHeight);
  return {
    x0:Math.max(0,Math.floor(Math.min(c0.x,c1.x,c2.x,c3.x))-m),
    x1:Math.min(W,Math.ceil(Math.max(c0.x,c1.x,c2.x,c3.x))+m),
    y0:Math.max(0,Math.floor(Math.min(c0.y,c1.y,c2.y,c3.y))-m),
    y1:Math.min(H,Math.ceil(Math.max(c0.y,c1.y,c2.y,c3.y))+m)
  };
}

