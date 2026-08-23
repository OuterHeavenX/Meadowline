import { clamp } from '../core/constants.js';
import { S } from '../core/state.js';
import { PAL } from '../world/seasons.js';
import { darkness } from '../world/time.js';

/* ---------- audio (tiny, optional) ---------- */
export let AC=null;
export function ac(){
  if(AC) return AC;
  try{ AC=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){ AC=null; }
  return AC;
}
export function blip(freq,vol,type){
  if(S.muted) return;
  const a=ac(); if(!a) return;
  try{
    if(a.state==="suspended") a.resume();
    const o=a.createOscillator(),g2=a.createGain();
    o.type=type||"sine"; o.frequency.value=freq;
    g2.gain.value=0; o.connect(g2); g2.connect(a.destination);
    const n=a.currentTime;
    g2.gain.linearRampToValueAtTime(vol||0.09,n+0.012);
    g2.gain.exponentialRampToValueAtTime(0.0001,n+0.30);
    o.start(n); o.stop(n+0.32);
  }catch(e){}
}

/* ---------- an ambient bed: one slow chord per season, plus small events ---------- */
export const amb={on:false,g:null,f:null,voices:[],next:5,bird:7};
export const CHORDS=[[110,164.81,220],[123.47,164.81,246.94],[98,146.83,196],[103.83,155.56,207.65]];
export const PENTA=[440,493.88,587.33,659.25,880];

export function ambientStart(){
  const a=ac(); if(!a||amb.on) return;
  try{
    if(a.state==="suspended") a.resume();
    amb.g=a.createGain(); amb.g.gain.value=0; amb.g.connect(a.destination);
    amb.f=a.createBiquadFilter(); amb.f.type="lowpass";
    amb.f.frequency.value=800; amb.f.Q.value=0.4; amb.f.connect(amb.g);
    amb.voices=[0,1,2].map(i=>{
      const o=a.createOscillator();
      o.type=i===2?"triangle":"sine";
      o.frequency.value=CHORDS[0][i]*(1+(i-1)*0.0016);
      const gg=a.createGain(); gg.gain.value=i===2?0.09:0.15;
      o.connect(gg); gg.connect(amb.f); o.start();
      return o;
    });
    amb.g.gain.linearRampToValueAtTime(0.075,a.currentTime+4);
    amb.on=true;
  }catch(e){}
}
export function ambientStop(){
  if(!amb.on||!AC) return;
  amb.on=false;
  const a=AC, gn=amb.g, vs=amb.voices;
  try{
    gn.gain.cancelScheduledValues(a.currentTime);
    gn.gain.setValueAtTime(gn.gain.value,a.currentTime);
    gn.gain.linearRampToValueAtTime(0,a.currentTime+1.2);
    setTimeout(()=>{ try{ vs.forEach(o=>o.stop()); gn.disconnect(); }catch(e){} },1600);
  }catch(e){}
  amb.voices=[];
}
export function chime(f){
  const a=AC; if(!a||S.muted) return;
  try{
    const o=a.createOscillator(),gg=a.createGain();
    o.type="sine"; o.frequency.value=f;
    o.connect(gg); gg.connect(a.destination);
    const n=a.currentTime;
    gg.gain.setValueAtTime(0.0001,n);
    gg.gain.linearRampToValueAtTime(0.07,n+0.06);
    gg.gain.exponentialRampToValueAtTime(0.0001,n+2.4);
    o.start(n); o.stop(n+2.5);
  }catch(e){}
}
export function chirp(){
  const a=AC; if(!a||S.muted) return;
  try{
    const o=a.createOscillator(),gg=a.createGain(),n=a.currentTime;
    const f=1500+Math.random()*900;
    o.type="sine";
    o.frequency.setValueAtTime(f,n);
    o.frequency.exponentialRampToValueAtTime(f*1.45,n+0.07);
    o.frequency.exponentialRampToValueAtTime(f*0.85,n+0.16);
    o.connect(gg); gg.connect(a.destination);
    gg.gain.setValueAtTime(0.0001,n);
    gg.gain.exponentialRampToValueAtTime(0.045,n+0.02);
    gg.gain.exponentialRampToValueAtTime(0.0001,n+0.2);
    o.start(n); o.stop(n+0.22);
  }catch(e){}
}
export function ambientTick(dt){
  if(!amb.on||!AC) return;
  const a=AC, now=a.currentTime;
  const ch=CHORDS[(PAL.q?PAL.q.i:0)%CHORDS.length];
  try{
    amb.voices.forEach((o,i)=>o.frequency.setTargetAtTime(ch[i]*(1+(i-1)*0.0016),now,3));
    amb.f.frequency.setTargetAtTime(420+1150*(1-clamp(darkness()/0.62,0,1)),now,2);
  }catch(e){}
  amb.next-=dt;
  if(amb.next<=0){
    amb.next=7+Math.random()*11;
    chime(PENTA[(Math.random()*PENTA.length)|0]*(Math.random()<0.4?0.5:1));
  }
  amb.bird-=dt;
  if(amb.bird<=0){
    amb.bird=9+Math.random()*16;
    if(darkness()<0.2&&S.wx.amt<0.3) chirp();
  }
}
