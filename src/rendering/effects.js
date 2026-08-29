import { TAU, TH, TW, clamp } from '../core/constants.js';
import { facilityFootprint } from '../world/tiles.js';
import { S, reduceMotion } from '../core/state.js';
import { g } from './terrain.js';
import { proj } from '../world/map.js';
import { PAL } from '../world/seasons.js';
import { birds, cloudOpacity, clouds, drops, motes, splashes, storm } from '../world/weather.js';
import { activeFestival, festivalGlow } from '../world/festivals.js';
import { graphicsProfile } from './capabilities.js';

export function drawPuff(p,ctx=g){
  const z=S.cam.z, s=proj(p.x,p.y);
  if(p.kind===1){
    ctx.fillStyle="rgba(232,118,138,"+p.life+")";
    const r=2.4*z, y=s.y-p.z*z;
    ctx.beginPath();
    ctx.moveTo(s.x,y+r);
    ctx.bezierCurveTo(s.x-r*1.6,y-r*0.4,s.x-r*0.5,y-r*1.5,s.x,y-r*0.5);
    ctx.bezierCurveTo(s.x+r*0.5,y-r*1.5,s.x+r*1.6,y-r*0.4,s.x,y+r);
    ctx.fill();
  } else {
    ctx.fillStyle="rgba(244,240,226,"+(p.life*0.55)+")";
    ctx.beginPath(); ctx.arc(s.x,s.y-p.z*z,(1.5+ (1-p.life)*3)*z,0,TAU); ctx.fill();
  }
}

/* ---------- sky and weather layers ---------- */
export function drawCloudShadows(){
  const base=0.065+S.wx.amt*0.09;
  for(const c of clouds){
    const p=proj(c.x,c.y);
    const rx=c.r*(TW/2)*S.cam.z, ry=c.r*(TH/2)*S.cam.z;
    if(p.x+rx<0||p.x-rx>innerWidth||p.y+ry<0||p.y-ry>innerHeight) continue;
    const gr=g.createRadialGradient(p.x,p.y,0,p.x,p.y,rx);
    gr.addColorStop(0,"rgba(24,46,40,"+(base*c.o).toFixed(3)+")");
    gr.addColorStop(0.55,"rgba(24,46,40,"+(base*c.o*0.72).toFixed(3)+")");
    gr.addColorStop(1,"rgba(24,46,40,0)");
    g.save();
    g.translate(p.x,p.y); g.scale(1,ry/rx); g.translate(-p.x,-p.y);
    g.fillStyle=gr;
    g.beginPath(); g.arc(p.x,p.y,rx,0,TAU); g.fill();
    g.restore();
  }
}

/* Cloud bodies for the fallback renderer. The GPU path builds real ones in the
   scene and lets the sun shadow them; here they are soft blobs drawn over the
   town, fading as the camera comes in, matching the same cloudOpacity() curve
   so the two renderers behave alike. The shadows below them are drawn
   separately by drawCloudShadows() and keep their strength either way. */
export function drawClouds(ctx=g){
  const alpha=cloudOpacity();
  if(alpha<=0.02) return;
  const z=S.cam.z;
  for(const c of clouds){
    const p=proj(c.x,c.y-c.h*0.55);
    const rx=c.r*(TW/2)*z;
    if(p.x+rx<0||p.x-rx>innerWidth||p.y+rx<0||p.y-rx>innerHeight) continue;
    for(let i=0;i<4;i++){
      const n=c.seed+i*97;
      const r=rx*(0.34+((n*13)%40)/100);
      const cx=p.x+(((n*29)%100)/100-0.5)*rx*1.25;
      const cy=p.y+(((n*41)%100)/100-0.5)*rx*0.34;
      const gr=ctx.createRadialGradient(cx,cy,r*0.15,cx,cy,r);
      const a=alpha*c.o;
      gr.addColorStop(0,"rgba(255,255,255,"+(0.9*a).toFixed(3)+")");
      gr.addColorStop(0.6,"rgba(248,251,255,"+(0.62*a).toFixed(3)+")");
      gr.addColorStop(1,"rgba(244,249,255,0)");
      ctx.fillStyle=gr;
      ctx.beginPath();
      ctx.ellipse(cx,cy,r,r*0.62,0,0,TAU);
      ctx.fill();
    }
  }
}

export function drawBirds(dark,ctx=g){
  if(dark>0.28||S.wx.amt>0.4) return;
  ctx.strokeStyle="rgba(46,64,58,"+(0.42*(1-dark/0.28)).toFixed(3)+")";
  ctx.lineCap="round";
  for(const b of birds){
    const x=b.x*innerWidth, y=b.y*innerHeight, w=4.2*b.sc, f=Math.sin(b.ph)*2.4*b.sc;
    ctx.lineWidth=1.3*b.sc;
    ctx.beginPath();
    ctx.moveTo(x-w,y+f); ctx.lineTo(x,y-f*0.6); ctx.lineTo(x+w,y+f);
    ctx.stroke();
  }
}

export function drawWeather(ctx=g){
  if(S.wx.amt<=0.02) return;
  const stride=graphicsProfile().rain<.5?3:graphicsProfile().rain<.8?2:1;
  if(S.wx.k==="snow"){
    ctx.fillStyle="rgba(255,255,255,"+(0.8*S.wx.amt).toFixed(3)+")";
    for(let i=0;i<drops.length;i+=stride){const d=drops[i]; ctx.beginPath(); ctx.arc(d.x,d.y,1+d.r*1.7,0,TAU); ctx.fill(); }
  } else {
    // Two passes: a dense faint one and a sparser brighter one. A single
    // uniform stroke reads as static, which is why rain at 0.4 alpha was
    // easy to miss entirely even where it was being drawn.
    ctx.lineCap="round";
    ctx.strokeStyle="rgba(198,226,236,"+(0.34*S.wx.amt).toFixed(3)+")";
    ctx.lineWidth=1.1;
    ctx.beginPath();
    for(let i=0;i<drops.length;i+=stride){const d=drops[i]; ctx.moveTo(d.x,d.y); ctx.lineTo(d.x-d.l*0.22,d.y-d.l); }
    ctx.stroke();
    ctx.strokeStyle="rgba(226,243,250,"+(0.5*S.wx.amt).toFixed(3)+")";
    ctx.lineWidth=1.7;
    ctx.beginPath();
    for(let i=0;i<drops.length;i+=stride*3){const d=drops[i]; ctx.moveTo(d.x,d.y); ctx.lineTo(d.x-d.l*0.3,d.y-d.l*1.35); }
    ctx.stroke();
  }
}

/* ---------- where the rain lands ----------
   World coordinates through proj(), so a splash stays on its tile while the
   camera moves and both renderers agree on where it is. Two rings expanding
   out of a bright centre, fading as they go. */
export function drawSplashes(ctx=g){
  if(!splashes.length) return;
  const z=S.cam.z;
  ctx.lineWidth=Math.max(1.1,1.7*z);
  for(const s of splashes){
    const k=s.t/s.life;
    if(k>=1) continue;
    const p=proj(s.x,s.y);
    if(p.x<-40||p.y<-40||p.x>innerWidth+40||p.y>innerHeight+40) continue;
    const fade=(1-k)*(1-k),rx=s.r*(TW/2)*z*(0.35+k*1.5);
    ctx.strokeStyle="rgba(232,247,253,"+(0.85*fade).toFixed(3)+")";
    ctx.beginPath();
    ctx.ellipse(p.x,p.y,rx,rx*(TH/TW),0,0,TAU);
    ctx.stroke();
    if(k<0.4){
      // A thinner, shorter-lived inner ripple. At equal weight the two rings
      // read as a target reticle rather than as water.
      const inner=ctx.lineWidth;
      ctx.lineWidth=Math.max(0.7,inner*0.55);
      ctx.strokeStyle="rgba(255,255,255,"+(0.55*(1-k/0.4)).toFixed(3)+")";
      ctx.beginPath();
      ctx.ellipse(p.x,p.y,rx*0.4,rx*0.4*(TH/TW),0,0,TAU);
      ctx.stroke();
      ctx.lineWidth=inner;
    }
  }
}

/* ---------- lightning ----------
   The flash is a full-screen veil rather than a change of palette, so it lands
   identically on both renderers without either having to know about the storm.
   The bolt is in screen fractions, which keeps it the same shape at any zoom. */
export function drawLightning(ctx=g){
  if(storm.flash<=0.001) return;
  const f=storm.flash;
  ctx.save();
  ctx.fillStyle="rgba(233,243,255,"+(0.5*f*f).toFixed(3)+")";
  ctx.fillRect(0,0,innerWidth,innerHeight);
  if(storm.bolt&&storm.bolt.length>1){
    const pts=storm.bolt.map(([x,y])=>[x*innerWidth,y*innerHeight]);
    ctx.lineJoin="round"; ctx.lineCap="round";
    // Drawn twice: a wide soft halo, then a hot core inside it.
    ctx.strokeStyle="rgba(198,222,255,"+(0.5*f).toFixed(3)+")";
    ctx.lineWidth=7;
    ctx.beginPath(); ctx.moveTo(pts[0][0],pts[0][1]);
    for(const [x,y] of pts.slice(1)) ctx.lineTo(x,y);
    ctx.stroke();
    ctx.strokeStyle="rgba(255,255,255,"+(0.92*f).toFixed(3)+")";
    ctx.lineWidth=2.1;
    ctx.beginPath(); ctx.moveTo(pts[0][0],pts[0][1]);
    for(const [x,y] of pts.slice(1)) ctx.lineTo(x,y);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawFireflies(dark,ctx=g){
  if(dark<0.22||PAL.snow>0.45||reduceMotion) return;
  const parks=S.ctx.recreation?.length?S.ctx.recreation:S.ctx.parks;
  if(!parks.length) return;
  const z=S.cam.z, glow=clamp((dark-0.22)/0.3,0,1);
  ctx.globalCompositeOperation="lighter";
  for(const b of parks){
    const fp=facilityFootprint(b);
    const p=proj(b.x+(fp[0]-1)/2,b.y+(fp[1]-1)/2);
    if(p.x<-40||p.x>innerWidth+40||p.y<-40||p.y>innerHeight+40) continue;
    for(let k=0;k<4;k++){
      const a=S.t*0.7+k*1.9+(b.seed%17);
      const al=(0.2+0.5*Math.sin(S.t*3.1+k*2.3))*glow;
      if(al<=0.02) continue;
      ctx.fillStyle="rgba(228,242,152,"+al.toFixed(3)+")";
      ctx.beginPath();
      ctx.arc(p.x+Math.cos(a)*(9+k*3.4)*z, p.y-(7+Math.sin(a*1.7)*6)*z, 1.5*z, 0, TAU);
      ctx.fill();
    }
  }
  ctx.globalCompositeOperation="source-over";
}

/* ---------- seasonal motes ---------- */
export function drawMotes(ctx=g){
  if(!motes.length) return;
  const fest=activeFestival(), glow=festivalGlow();
  const fall=PAL.fall||0, bloom=Math.max((PAL.bloom||0)-0.5,0)*2;
  for(const m of motes){
    // one pool, three costumes: confetti during a festival, then leaves, then petals
    const confetti = fest && m.r < glow*0.55;
    const leafy    = !confetti && m.r < fall;
    const w=(confetti?2.6:leafy?3.4:2.4), h=(confetti?1.4:leafy?2.2:2.4);
    ctx.save();
    ctx.translate(m.x,m.y);
    ctx.rotate(m.spin);
    if(confetti)      ctx.fillStyle=m.r<glow*0.28 ? fest.flag : fest.lantern;
    else if(leafy)    ctx.fillStyle=m.r<fall*0.5 ? PAL.leaf : PAL.leafHi;
    else              ctx.fillStyle="rgba(240,190,206,.85)";
    ctx.globalAlpha=leafy||confetti?0.9:0.75*Math.max(bloom,glow);
    ctx.beginPath(); ctx.ellipse(0,0,w,h,0,0,TAU); ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha=1;
}

/* ---------- festival lanterns, once the light goes ---------- */
export function drawLanterns(dark,ctx=g){
  const fest=activeFestival();
  if(!fest||dark<0.2||reduceMotion) return;
  const glow=clamp((dark-0.2)/0.3,0,1);
  ctx.globalCompositeOperation="lighter";
  for(let i=0;i<14;i++){
    const t=S.t*0.11+i*0.7;
    const x=((i*137.5+S.t*7)%(innerWidth+120))-60;
    const y=innerHeight*(0.82-((t%1)*0.72));
    const a=glow*(0.35+0.25*Math.sin(S.t*1.6+i));
    const r=(5+2.5*Math.sin(S.t+i))*1.4;
    const rg=ctx.createRadialGradient(x,y,0,x,y,r*3.2);
    rg.addColorStop(0,"rgba(255,214,150,"+(a*0.9).toFixed(3)+")");
    rg.addColorStop(1,"rgba(255,190,120,0)");
    ctx.fillStyle=rg; ctx.beginPath(); ctx.arc(x,y,r*3.2,0,TAU); ctx.fill();
    ctx.fillStyle=fest.lantern; ctx.globalAlpha=a;
    ctx.beginPath(); ctx.ellipse(x,y,r*0.5,r*0.62,0,0,TAU); ctx.fill();
    ctx.globalAlpha=1;
  }
  ctx.globalCompositeOperation="source-over";
}
