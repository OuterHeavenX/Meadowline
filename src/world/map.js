import { H, TH, TW, W, fbm, hash2 } from '../core/constants.js';
import { S } from '../core/state.js';
import { invalidateMobility } from '../simulation/mobility.js';
import { invalidateRecreation } from '../simulation/recreation.js';
import { idx } from './tiles.js';
import { drops, seedBirds, seedClouds } from './weather.js';

/* ---------- world generation ---------- */
export function genWorld(seed){
  S.seed=seed;
  S.terr=new Uint8Array(W*H);
  S.natTree=new Uint8Array(W*H);
  S.grid=new Array(W*H).fill(null);
  const s=seed%9973;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const i=idx(x,y);
    // ponds: organic blobs, kept away from the very centre so there's room to build
    const cd=Math.hypot(x-W/2,y-H/2)/(W/2);
    const w=fbm(x/11,y/11,s);
    if(w>0.68+0.13*(1-cd)) S.terr[i]=1;
    // natural woodland in clusters
    const f=fbm(x/6.5,y/6.5,s+404);
    if(!S.terr[i]&&f>0.585&&hash2(x,y,s+9)>0.45) S.natTree[i]=1;
  }
  // Every runtime actor belongs to the world that spawned it. Vehicles,
  // service vehicles, incidents and feedback used to survive genWorld, so a
  // Load, New City or Cloud restore inherited the previous city's traffic and
  // an incident that could never be dispatched — which permanently blocked
  // its whole service, because new ones are gated on none being active.
  // The seed's own water, kept so a player-painted pond can be told apart
  // from the valley's and undone. restoreTerrain() replays player edits on
  // top of this baseline, so it survives a load without a save field.
  S.natWater=S.terr.slice();
  S.citizens.length=0; S.trains.length=0; S.boats.length=0; S.puffs.length=0;
  S.vehicles.length=0; S.serviceVehicles.length=0; S.incidents.length=0; S.feedback.length=0;
  invalidateMobility(); invalidateRecreation();
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

/* ---------- iso transforms ----------
   One projection serves the Canvas renderer, the GPU camera and every hit
   test, which is why turning the city is a change here rather than in a
   renderer. World coordinates are rotated about the middle of the map and
   then projected exactly as before, so proj() and screen2world() stay
   inverses of each other at any angle and a tap keeps landing on the tile
   under the finger.

   The GPU camera orbits by the same angle, which is not a coincidence to be
   maintained by hand: an orthographic camera at 45 degrees of azimuth and 30
   of elevation projects to precisely this 2:1 diamond (sin 30 = TH/TW), so
   adding the same rotation to both keeps them showing the same city. */
const RX=W/2, RY=H/2;

/* The Canvas renderer draws every tile as a fixed axis-aligned diamond, a
   shape that is only correct at quarter turns; at anything between, tiles
   would be the wrong shape rather than merely rotated. So the fallback
   renderer follows the same rotation snapped to the nearest quarter, and
   because hit testing reads this too, taps stay accurate on both. */
export function viewRotation(){
  const r=S.cam.rot||0;
  if(S.diagnostics?.rendererBackend==='three-webgl2') return r;
  const quarter=Math.PI/2;
  return Math.round(r/quarter)*quarter;
}

function turn(x,y,a){
  const c=Math.cos(a),s=Math.sin(a),dx=x-RX,dy=y-RY;
  return {x:RX+dx*c-dy*s, y:RY+dx*s+dy*c};
}

export function world2screen(x,y){
  const r=viewRotation(),p=r?turn(x,y,r):{x,y};
  return {x:(p.x-p.y)*(TW/2), y:(p.x+p.y)*(TH/2)};
}
export function screen2world(sx,sy){
  const wx=(sx-S.cam.x)/S.cam.z, wy=(sy-S.cam.y)/S.cam.z;
  const a=wy/(TH/2), b=wx/(TW/2);
  const px=(a+b)/2, py=(a-b)/2, r=viewRotation();
  return r?turn(px,py,-r):{x:px,y:py};
}

/* Painter's-algorithm depth. Was simply x+y, which is the depth order only at
   rotation zero; the sort has to follow the view or everything draws back to
   front in the wrong order the moment the city turns. */
export function viewDepth(x,y){
  const r=viewRotation(),p=r?turn(x,y,r):{x,y};
  return p.x+p.y;
}

export function proj(x,y){const p=world2screen(x,y);return {x:p.x*S.cam.z+S.cam.x, y:p.y*S.cam.z+S.cam.y};}

/* The rectangle of world the screen currently covers. Rotation means the four
   screen corners no longer map to an axis-aligned patch, so the bounding box of
   all four is what callers want; anything seeding effects across the view needs
   it, and scattering over the whole map instead would spend almost everything
   where nobody is looking. */
export function viewBounds(pad=1){
  const c=[screen2world(0,0),screen2world(innerWidth,0),screen2world(0,innerHeight),screen2world(innerWidth,innerHeight)];
  return {
    minX:Math.min(...c.map(p=>p.x))-pad, maxX:Math.max(...c.map(p=>p.x))+pad,
    minY:Math.min(...c.map(p=>p.y))-pad, maxY:Math.max(...c.map(p=>p.y))+pad
  };
}

/* ---------- turning the city ----------
   Rotation is about the middle of the map, which world2screen sends to the
   same screen point at every angle, so the city turns in place instead of
   swinging away and needing the pan corrected after it.

   The angle eases rather than jumping. A quarter turn applied instantly loses
   the player's place completely; watching it turn is what keeps the town you
   were looking at the town you are still looking at. */
export function rotateView(delta){ S.cam.rotTo=(S.cam.rotTo||0)+delta; }
export function setViewRotation(a){ S.cam.rotTo=a; S.cam.rot=a; }

export function stepCamera(dt){
  const target=S.cam.rotTo||0,current=S.cam.rot||0,gap=target-current;
  if(Math.abs(gap)<1e-4){ S.cam.rot=target; return; }
  // A non-finite frame time would put NaN into the angle, and NaN is sticky:
  // every later frame reads it back as the current angle and the camera never
  // recovers, in a way that looks like the controls have died rather than like
  // one bad frame. Skipping the frame costs nothing - the next one eases from
  // the same place.
  if(!Number.isFinite(dt)||dt<=0) return;
  // Frame-rate independent ease, so the turn takes the same time on a phone
  // at 30fps as on a desktop at 120.
  S.cam.rot=current+gap*(1-Math.exp(-dt*9));
}
