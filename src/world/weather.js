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
  const n=reduceMotion?4:7;
  for(let i=0;i<n;i++) clouds.push({
    x:Math.random()*(W+30)-15, y:Math.random()*(H+30)-15,
    r:5+Math.random()*7, sp:0.10+Math.random()*0.13, o:0.45+Math.random()*0.55
  });
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
