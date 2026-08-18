import { services } from '../core/services.js';
import { S } from '../core/state.js';
import { countBridges } from '../transport/bridges.js';
import { countType, hasWater } from '../world/tiles.js';

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
  market:{at:()=>countType("market"), ok:()=>S.pop>=20,
          make(){ const n=ladder(countType("market"),[1,2,4]);
                  return {t:"Open <b>"+n+"</b> market"+(n>1?"s":""),g:n,r:90+n*50}; }},
  bakery:{at:()=>countType("bakery"), ok:()=>countType("mill")>=1,
          make(){ const n=ladder(countType("bakery"),[1,3,6]);
                  return {t:"Set <b>"+n+"</b> "+(n>1?"bakeries":"bakery")+" going",g:n,r:60+n*30}; }},
  school:{at:()=>countType("school"), ok:()=>S.pop>=30,
          make(){ const n=ladder(countType("school"),[1,2,4]);
                  return {t:"Build <b>"+n+"</b> school"+(n>1?"s":""),g:n,r:110+n*60}; }},
  boats: {at:()=>S.boats.length,      ok:()=>hasWater(),
          make(){ const n=ladder(S.boats.length,[1,2,4,6]);
                  return {t:"Put <b>"+n+"</b> boat"+(n>1?"s":"")+" on the water",g:n,r:70+n*40}; }},
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
