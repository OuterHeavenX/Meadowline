import { H, TAU, W, clamp } from '../core/constants.js';
import { services } from '../core/services.js';
import { S, reduceMotion } from '../core/state.js';
import { PAL } from './seasons.js';
import { festivalGlow } from './festivals.js';

/* ---------- weather ---------- */
export function startWeather(kind,strength){
  S.wx.k=kind; S.wx.target=strength; S.wx.next=40+Math.random()*60;
}
export function updateWeather(dt){
  const w=S.wx;
  w.next-=dt;
  if(w.next<=0){
    if(w.target>0){                       // a shower runs its course
      w.target=0; w.next=70+Math.random()*150;
    } else {
      const wintry=PAL.snow>0.5;
      const chance=wintry?0.6:(PAL.bloom>0.6?0.42:0.26);
      if(Math.random()<chance){
        startWeather(wintry?"snow":"rain",0.55+Math.random()*0.45);
        services.hint(wintry?"Snow drifting in over the valley":"Rain moving in \u2014 the parks will drink it up");
      } else w.next=50+Math.random()*80;
    }
  }
  const rate=w.target>w.amt?0.22:0.16;
  w.amt+=clamp(w.target-w.amt,-dt*rate,dt*rate);
  if(w.target===0&&w.amt<0.02){ w.amt=0; w.k="clear"; }
}
export function weatherName(){
  if(S.wx.amt<0.15) return "Clear";
  return S.wx.k==="snow"?"Snow":"Rain";
}

/* ---------- drifting clouds (they cast the shadows below) ---------- */
export const clouds=[];
export function seedClouds(){
  clouds.length=0;
  const n=reduceMotion?4:9;
  for(let i=0;i<n;i++) clouds.push({
    x:Math.random()*(W+30)-15, y:Math.random()*(H+30)-15,
    r:5+Math.random()*7, sp:0.10+Math.random()*0.13, o:0.45+Math.random()*0.55,
    // Height above the valley floor and a shape seed. The GPU renderer builds a
    // real body from these and lets the sun cast its shadow, so the shadow on
    // the ground and the cloud overhead are the same object rather than two
    // drawings that have to be kept in step.
    //
    // The height is bounded by the sun's shadow camera, not by taste. That
    // volume is 28 units around the view centre and the sun sits low, so a
    // cloud much above ten falls outside it and stops casting entirely -
    // measured: at 9 the ground darkens by a third, at 16 nothing lands even
    // with the bounds widened to 44. Raising the clouds means enlarging that
    // volume, which spreads the same shadow map over more ground and softens
    // every building shadow in the valley to buy height nobody can see.
    h:8+Math.random()*2.5, seed:Math.floor(Math.random()*9973)
  });
}
/* How present the clouds are, which both renderers read so the fallback and
   the GPU path agree. Zoomed out they are most of the sky; zoomed in they get
   out of the way of the town, which is what the player is looking at. Their
   shadows do not follow this curve - on the GPU path a transparent material
   still casts a full shadow, so the ground keeps its weather even when the
   cloud above has faded almost to nothing. */
export function cloudOpacity(){
  return clamp(1.35-(S.cam.z||1)*0.75,0.08,1);
}

export function updateClouds(dt){
  for(const c of clouds){
    c.x+=c.sp*dt; c.y+=c.sp*dt*0.4;
    if(c.x>W+18){ c.x=-18; c.y=Math.random()*(H+20)-10; }
    if(c.y>H+18){ c.y=-18; c.x=Math.random()*(W+20)-10; }
  }
}

/* ---------- rain and snow, kept in screen space ---------- */
export const drops=[];
export function updateDrops(dt){
  const cap=reduceMotion?36:150;
  const want=S.wx.amt>0.02?Math.round(cap*S.wx.amt):0;
  while(drops.length<want) drops.push({
    x:Math.random()*innerWidth, y:Math.random()*innerHeight,
    l:9+Math.random()*15, sp:620+Math.random()*520, r:Math.random()
  });
  while(drops.length>want) drops.pop();
  const snowy=S.wx.k==="snow";
  for(const d of drops){
    if(snowy){
      d.y+=dt*(34+d.r*46);
      d.x+=Math.sin(S.t*1.3+d.r*11)*26*dt+dt*12;
    } else {
      d.y+=dt*d.sp; d.x+=dt*d.sp*0.22;
    }
    if(d.y>innerHeight+24){ d.y=-24; d.x=Math.random()*innerWidth; }
    if(d.x>innerWidth+24) d.x=-24;
  }
}

/* ---------- where the rain lands ----------
   Drops live in screen space, which is right for falling rain and wrong for
   the moment it arrives: a splash belongs to a place on the ground, so it has
   to stay on that tile while the camera pans, zooms and turns. These are world
   coordinates for that reason, and both renderers project them the same way. */
export const splashes=[];
let splashDebt=0;

export function updateSplashes(dt,view){
  for(let i=splashes.length-1;i>=0;i--){
    const s=splashes[i];
    s.t+=dt;
    if(s.t>=s.life) splashes.splice(i,1);
  }
  if(S.wx.k==='snow'||S.wx.amt<=0.05||reduceMotion||!view) return;
  // Rate follows the shower, capped so a downpour cannot flood the array.
  splashDebt+=dt*S.wx.amt*78;
  const room=Math.min(splashDebt|0,Math.max(0,170-splashes.length));
  splashDebt-=room;
  for(let i=0;i<room;i++){
    // Seeded across the visible ground only. Scattering over the whole map
    // would spend almost all of them where nobody is looking.
    const x=view.minX+Math.random()*(view.maxX-view.minX);
    const y=view.minY+Math.random()*(view.maxY-view.minY);
    if(x<0||y<0||x>W||y>H) continue;
    splashes.push({x,y,t:0,life:0.4+Math.random()*0.26,r:0.2+Math.random()*0.2});
  }
}

/* ---------- thunderstorms ----------
   Only heavy rain brings them, so a light shower stays calm. A strike is a
   short bright flash with a dimmer second beat, which is what sells it as
   lightning rather than as the screen glitching, plus a bolt drawn for the
   first instant. The thunder follows at a delay, the way it does. */
export const storm={flash:0,bolt:null,next:9,rumble:0};

export function stormActive(){ return S.wx.k==='rain'&&S.wx.amt>0.55; }
export function lightningFlash(){ return storm.flash; }

function makeBolt(){
  // A jagged descent across the upper sky, in screen fractions so it does not
  // depend on the projection and reads the same at any zoom.
  const x=0.12+Math.random()*0.76,pts=[[x,-0.02]];
  let cx=x,cy=-0.02;
  const steps=4+Math.floor(Math.random()*3);
  for(let i=0;i<steps;i++){
    cy+=0.06+Math.random()*0.09;
    cx+=(Math.random()-0.5)*0.11;
    pts.push([cx,cy]);
  }
  return pts;
}

export function updateStorm(dt){
  if(storm.flash>0) storm.flash=Math.max(0,storm.flash-dt*(storm.flash>0.5?7:3.4));
  if(storm.bolt&&storm.flash<0.42) storm.bolt=null;
  if(storm.rumble>0) storm.rumble=Math.max(0,storm.rumble-dt);
  if(!stormActive()||reduceMotion){ storm.next=7+Math.random()*9; return; }
  storm.next-=dt;
  if(storm.next>0) return;
  storm.next=4.5+Math.random()*11;
  storm.flash=0.85+Math.random()*0.15;
  // Most strikes are close enough to draw; some are only a glow beyond the hills.
  storm.bolt=Math.random()<0.62?makeBolt():null;
  storm.rumble=0.35+Math.random()*1.4;
  services.thunder?.(storm.bolt?0.9:0.55);
}

/* ---------- a few birds, for the daylight hours ---------- */
export const birds=[];
export function seedBirds(){
  birds.length=0;
  if(reduceMotion) return;
  for(let i=0;i<3;i++) birds.push({
    x:Math.random(), y:0.10+Math.random()*0.28,
    sp:0.02+Math.random()*0.03, ph:Math.random()*TAU, sc:0.7+Math.random()*0.6
  });
}
export function updateBirds(dt){
  for(const b of birds){
    b.x+=b.sp*dt; b.ph+=dt*6;
    if(b.x>1.1){ b.x=-0.1; b.y=0.10+Math.random()*0.28; }
  }
}

/* ---------- seasonal motes: blossom, falling leaves, festival confetti ----------
   Screen-space like the rain, because they read as atmosphere in front of the
   valley rather than as objects standing in it. */
export const motes=[];
export function seedMotes(){ motes.length=0; }
export function moteLoad(){
  if(reduceMotion) return 0;
  const fest=festivalGlow();
  return Math.round(46*(PAL.fall||0) + 34*Math.max((PAL.bloom||0)-0.5,0)*2 + 40*fest);
}
export function updateMotes(dt){
  const want=moteLoad();
  while(motes.length<want) motes.push({
    x:Math.random()*innerWidth, y:Math.random()*innerHeight,
    sp:16+Math.random()*30, sway:0.6+Math.random()*1.5, ph:Math.random()*TAU,
    r:Math.random(), spin:(Math.random()-0.5)*3
  });
  while(motes.length>want) motes.pop();
  for(const m of motes){
    m.ph+=dt*m.sway;
    m.y+=dt*m.sp;
    m.x+=Math.sin(m.ph)*22*dt+dt*8;
    m.spin+=dt*1.4;
    if(m.y>innerHeight+16){ m.y=-16; m.x=Math.random()*innerWidth; }
    if(m.x>innerWidth+16) m.x=-16;
  }
}
