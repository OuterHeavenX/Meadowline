import { SPANS } from '../buildings/buildings.js';
import { TAU, clamp } from '../core/constants.js';
import { services } from '../core/services.js';
import { S } from '../core/state.js';
import { PAL } from '../world/seasons.js';

/* ---------- economy & clock ---------- */
export function payday(){
  const tax=Math.round(S.pop*2.6*(0.55+S.mood/140));
  const trade=(S._cafes||0)*9;
  // windmills grind steadily, and best of all at harvest
  const mills=S.ctx.mills.length;
  const milled=Math.round(mills*(9+(PAL.yield||0)));
  const grant=18;
  const total=tax+trade+milled+grant;
  S.coins+=total;
  S.lastPay={tax,trade,milled,grant,total};
  services.toast("Day "+S.day+" \u00b7 +"+total+" coins","gold");
  services.blip(660,0.2,"triangle");
  if(mills&&(PAL.yield||0)>=9) services.toast("A good harvest at the mill");
}
/* ---------- wishes: gentle goals, never a deadline ---------- */
export function countType(t){
  let n=0;
  for(let i=0;i<S.grid.length;i++){ const b=S.grid[i]; if(b&&b.type===t) n++; }
  return n;
}
export function countBridges(){
  let n=0;
  for(let i=0;i<S.grid.length;i++){
    const b=S.grid[i];
    if(b&&SPANS[b.type]&&S.terr[i]===1) n++;
  }
  return n;
}
export function hasWater(){
  for(let i=0;i<S.terr.length;i++) if(S.terr[i]===1) return true;
  return false;
}
// next rung of a ladder that's still ahead of where you already are
export function ladder(cur,steps){
  for(const v of steps) if(v>cur) return v;
  return Math.round(steps[steps.length-1]*1.6);
}

export const WISH_TYPES={
  pop:   {at:()=>S.pop,               ok:()=>true,
          make(){ const n=ladder(S.pop,[6,14,26,42,64,92,130,180]);
                  return {t:"Give <b>"+n+"</b> people a home",g:n,r:30+n*3}; }},
  mood:  {at:()=>S.mood,              ok:()=>S.homes>=5&&S.mood<82,
          make(){ const n=Math.min(ladder(S.mood,[52,68,82]),82);
                  return {t:"Lift the valley to <b>"+(n>=82?"Blissful":n>=68?"Content":"Settled")+"</b>",g:n,r:120}; }},
  cafe:  {at:()=>countType("cafe"),   ok:()=>true,
          make(){ const n=ladder(countType("cafe"),[1,2,4,7]);
                  return {t:"Open <b>"+n+"</b> caf\u00e9"+(n>1?"s":""),g:n,r:40+n*18}; }},
  park:  {at:()=>countType("park"),   ok:()=>true,
          make(){ const n=ladder(countType("park"),[1,3,6,10]);
                  return {t:"Lay out <b>"+n+"</b> park"+(n>1?"s":""),g:n,r:35+n*16}; }},
  train: {at:()=>S.trains.length,     ok:()=>true,
          make(){ const n=ladder(S.trains.length,[1,2,3,5]);
                  return {t:"Keep <b>"+n+"</b> train"+(n>1?"s":"")+" running",g:n,r:70+n*45}; }},
  station:{at:()=>countType("station"),ok:()=>countType("rail")>=6,
          make(){ const n=ladder(countType("station"),[1,2,4]);
                  return {t:"Build <b>"+n+"</b> station"+(n>1?"s":""),g:n,r:60+n*40}; }},
  bridge:{at:()=>countBridges(),      ok:()=>hasWater(),
          make(){ const n=ladder(countBridges(),[1,4,9]);
                  return {t:"Carry a way across the water \u2014 <b>"+n+"</b> span"+(n>1?"s":""),g:n,r:55+n*22}; }},
  lamp:  {at:()=>countType("lamp"),   ok:()=>S.homes>=3,
          make(){ const n=ladder(countType("lamp"),[4,10,20,34]);
                  return {t:"Light the streets with <b>"+n+"</b> lamps",g:n,r:30+n*7}; }},
  mill:  {at:()=>countType("mill"),   ok:()=>S.pop>=10,
          make(){ const n=ladder(countType("mill"),[1,2,4]);
                  return {t:"Raise <b>"+n+"</b> windmill"+(n>1?"s":""),g:n,r:70+n*45}; }},
  tree:  {at:()=>countType("tree"),   ok:()=>true,
          make(){ const n=ladder(countType("tree"),[8,20,40,70]);
                  return {t:"Plant <b>"+n+"</b> trees",g:n,r:25+n*3}; }},
  purse: {at:()=>Math.floor(S.coins), ok:()=>S.day>=2,
          make(){ const n=ladder(Math.floor(S.coins),[250,600,1200,2400]);
                  return {t:"Put by <b>"+n+"</b> coins",g:n,r:Math.round(n*0.18)}; }}
};
export const WISH_KEYS=Object.keys(WISH_TYPES);

export function rollWishes(){
  const held=new Set(S.wishes.map(w=>w.k));
  const pool=WISH_KEYS.filter(k=>!held.has(k)&&WISH_TYPES[k].ok());
  while(S.wishes.length<2&&pool.length){
    const k=pool.splice((Math.random()*pool.length)|0,1)[0];
    S.wishes.push(Object.assign({k},WISH_TYPES[k].make()));
  }
  services.paintWishes();
}
export function checkWishes(){
  let granted=false;
  for(let i=S.wishes.length-1;i>=0;i--){
    const w=S.wishes[i];
    const type=WISH_TYPES[w.k];
    if(!type){ S.wishes.splice(i,1); continue; }
    if(type.at()>=w.g){
      S.wishes.splice(i,1);
      S.coins+=w.r;
      S.granted=(S.granted||0)+1;
      services.toast("Wish granted \u00b7 +"+w.r+" coins","gold");
      services.blip(784,0.16,"triangle");
      granted=true;
    }
  }
  if(granted||S.wishes.length<2) rollWishes();
  else services.paintWishes();
}

export const MILES=[10,25,50,100,175];
export let mileHit=0;
export function setMileHit(value){ mileHit=value; }
export function checkMiles(){
  while(mileHit<MILES.length&&S.pop>=MILES[mileHit]){
    services.toast(MILES[mileHit]+" citizens call this home");
    mileHit++;
  }
}
export function shortTime(){
  const t=S.dayT;
  if(t<0.22) return "Dawn";
  if(t<0.42) return "Morn";
  if(t<0.60) return "Noon";
  if(t<0.74) return "Dusk";
  return "Night";
}
export function timeName(){
  const t=S.dayT;
  if(t<0.22) return "Dawn";
  if(t<0.42) return "Morning";
  if(t<0.60) return "Afternoon";
  if(t<0.74) return "Dusk";
  return "Night";
}
export function moodName(){
  if(!S.homes) return "—";
  const m=S.mood;
  if(m>=82) return "Blissful";
  if(m>=68) return "Content";
  if(m>=50) return "Settled";
  if(m>=32) return "Restless";
  return "Glum";
}

/* ---------- night curve ---------- */
export function darkness(){
  const t=S.dayT;
  // 0 at midday (dayT 0.48), rising to ~0.62 in the small hours
  const d=0.5-Math.cos((t-0.48)*TAU)*0.5;
  return Math.pow(clamp(d,0,1),1.6)*0.62;
}
