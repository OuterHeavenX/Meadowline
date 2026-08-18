import { TAU, TH, TW, clamp, lerp, shade } from '../core/constants.js';
import { S, reduceMotion } from '../core/state.js';
import { box, g } from './terrain.js';
import { proj } from '../world/map.js';
import { PAL } from '../world/seasons.js';
import { birds, clouds, drops } from '../world/weather.js';

export function drawTrain(t){
  const z=S.cam.z;
  const cols=[["#c96a5c","#a8503f"],["#5d8fa8","#4a7389"],["#d0a94e","#ac8836"]];
  const c=cols[t.hue];
  const carAt=(k)=>{
    if(k===0) return {x:t.fx,y:t.fy};
    const i=Math.min(t.hist.length-1,k*9);
    return t.hist[i];
  };
  for(let k=2;k>=0;k--){
    const h=carAt(k);
    if(!h) continue;
    const p=proj(h.x,h.y);
    g.fillStyle="rgba(30,44,38,.20)";
    g.beginPath(); g.ellipse(p.x,p.y+2*z,11*z,5*z,0,0,TAU); g.fill();
    const body=k===0?c[0]:"#e6dcc6";
    const topY=box(p.x,p.y-3*z,0.5,k===0?11:9,shade(body,10),shade(body,-38),shade(body,-16));
    // windows
    g.fillStyle="rgba(120,150,165,.75)";
    g.fillRect(p.x-5*z,p.y-11*z,3.2*z,3*z);
    g.fillRect(p.x+1.6*z,p.y-11*z,3.2*z,3*z);
    if(k===0){
      // chimney puff
      g.fillStyle=c[1];
      g.fillRect(p.x-1.2*z,topY-3*z,2.4*z,3*z);
      const ph=(S.t*1.5)%1;
      g.fillStyle="rgba(244,240,226,"+(0.35*(1-ph))+")";
      g.beginPath(); g.arc(p.x,topY-6*z-ph*12*z,(2+ph*4)*z,0,TAU); g.fill();
    }
  }
}

export function drawCitizen(c){
  const z=S.cam.z;
  const fx=lerp(c.x,c.nx,c.p), fy=lerp(c.y,c.ny,c.p);
  const p=proj(fx,fy);
  const off=((c.bob*7)%1-0.5)*10*z;   // spread walkers across the road width
  const bob=Math.abs(Math.sin(S.t*6+c.bob))*1.6*z;
  g.fillStyle="rgba(30,44,38,.18)";
  g.beginPath(); g.ellipse(p.x+off,p.y+2*z,2.6*z,1.3*z,0,0,TAU); g.fill();
  g.fillStyle=c.col;
  g.fillRect(p.x+off-1.5*z,p.y-5.4*z-bob,3*z,4*z);
  g.fillStyle="#f0d9bd";
  g.beginPath(); g.arc(p.x+off,p.y-6.8*z-bob,1.7*z,0,TAU); g.fill();
}

export function drawPuff(p){
  const z=S.cam.z, s=proj(p.x,p.y);
  if(p.kind===1){
    g.fillStyle="rgba(232,118,138,"+p.life+")";
    const r=2.4*z, y=s.y-p.z*z;
    g.beginPath();
    g.moveTo(s.x,y+r);
    g.bezierCurveTo(s.x-r*1.6,y-r*0.4,s.x-r*0.5,y-r*1.5,s.x,y-r*0.5);
    g.bezierCurveTo(s.x+r*0.5,y-r*1.5,s.x+r*1.6,y-r*0.4,s.x,y+r);
    g.fill();
  } else {
    g.fillStyle="rgba(244,240,226,"+(p.life*0.55)+")";
    g.beginPath(); g.arc(s.x,s.y-p.z*z,(1.5+ (1-p.life)*3)*z,0,TAU); g.fill();
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

export function drawBirds(dark){
  if(dark>0.28||S.wx.amt>0.4) return;
  g.strokeStyle="rgba(46,64,58,"+(0.42*(1-dark/0.28)).toFixed(3)+")";
  g.lineCap="round";
  for(const b of birds){
    const x=b.x*innerWidth, y=b.y*innerHeight, w=4.2*b.sc, f=Math.sin(b.ph)*2.4*b.sc;
    g.lineWidth=1.3*b.sc;
    g.beginPath();
    g.moveTo(x-w,y+f); g.lineTo(x,y-f*0.6); g.lineTo(x+w,y+f);
    g.stroke();
  }
}

export function drawWeather(){
  if(S.wx.amt<=0.02) return;
  if(S.wx.k==="snow"){
    g.fillStyle="rgba(255,255,255,"+(0.8*S.wx.amt).toFixed(3)+")";
    for(const d of drops){ g.beginPath(); g.arc(d.x,d.y,1+d.r*1.7,0,TAU); g.fill(); }
  } else {
    g.strokeStyle="rgba(198,226,236,"+(0.4*S.wx.amt).toFixed(3)+")";
    g.lineWidth=1.1; g.lineCap="round";
    g.beginPath();
    for(const d of drops){ g.moveTo(d.x,d.y); g.lineTo(d.x-d.l*0.22,d.y-d.l); }
    g.stroke();
  }
}

// fireflies drift over the parks on summer nights
export function drawFireflies(dark){
  if(dark<0.22||PAL.snow>0.45||reduceMotion) return;
  const parks=S.ctx.parks;
  if(!parks.length) return;
  const z=S.cam.z, glow=clamp((dark-0.22)/0.3,0,1);
  g.globalCompositeOperation="lighter";
  for(const b of parks){
    const p=proj(b.x,b.y);
    if(p.x<-40||p.x>innerWidth+40||p.y<-40||p.y>innerHeight+40) continue;
    for(let k=0;k<4;k++){
      const a=S.t*0.7+k*1.9+(b.seed%17);
      const al=(0.2+0.5*Math.sin(S.t*3.1+k*2.3))*glow;
      if(al<=0.02) continue;
      g.fillStyle="rgba(228,242,152,"+al.toFixed(3)+")";
      g.beginPath();
      g.arc(p.x+Math.cos(a)*(9+k*3.4)*z, p.y-(7+Math.sin(a*1.7)*6)*z, 1.5*z, 0, TAU);
      g.fill();
    }
  }
  g.globalCompositeOperation="source-over";
}
