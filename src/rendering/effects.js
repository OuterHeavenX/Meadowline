import { TAU, TH, TW, clamp } from '../core/constants.js';
import { facilityFootprint } from '../world/tiles.js';
import { S, reduceMotion } from '../core/state.js';
import { g } from './terrain.js';
import { proj } from '../world/map.js';
import { PAL } from '../world/seasons.js';
import { birds, clouds, drops, motes } from '../world/weather.js';
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

export function drawWeather(){
  if(S.wx.amt<=0.02) return;
  const stride=graphicsProfile().rain<.5?3:graphicsProfile().rain<.8?2:1;
  if(S.wx.k==="snow"){
    g.fillStyle="rgba(255,255,255,"+(0.8*S.wx.amt).toFixed(3)+")";
    for(let i=0;i<drops.length;i+=stride){const d=drops[i]; g.beginPath(); g.arc(d.x,d.y,1+d.r*1.7,0,TAU); g.fill(); }
  } else {
    g.strokeStyle="rgba(198,226,236,"+(0.4*S.wx.amt).toFixed(3)+")";
    g.lineWidth=1.1; g.lineCap="round";
    g.beginPath();
    for(let i=0;i<drops.length;i+=stride){const d=drops[i]; g.moveTo(d.x,d.y); g.lineTo(d.x-d.l*0.22,d.y-d.l); }
    g.stroke();
  }
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
