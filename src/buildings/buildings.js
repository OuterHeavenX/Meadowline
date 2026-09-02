import { note } from '../simulation/chronicle.js';
import { IS_WONDER, WONDERS } from './wonders.js';
import { SIGNAL_COST, addSignal, removeSignal, signalAt } from '../transport/signals.js';
import { COST, DIRS, TOOLS } from '../core/constants.js';
import { services } from '../core/services.js';
import { S } from '../core/state.js';
import { SPANS } from '../transport/bridges.js';
import { idx, inBounds, isType, isWater } from '../world/tiles.js';

/* ---------- building placement ---------- */
export const BUILDABLE={road:1,rail:1,house:1,cafe:1,park:1,tree:1,lamp:1,mill:1,station:1,
                        market:1,bakery:1,school:1,dock:1,
                        farm:1,sawmill:1,workshop:1,inn:1,clinic:1,well:1,
                        statue:1,clocktower:1,lighthouse:1,library:1};

// A span over water costs three times what it does on dry ground.
export function costOf(kind,x,y){ return COST[kind]*(SPANS[kind]&&isWater(x,y)?3:1); }

// Tools arrive as the town grows into needing them, and never go away again.
export function unlockOf(kind){
  const t=TOOLS.find(t=>t.id===kind);
  return t&&t.unlock||0;
}
export function isUnlocked(kind){
  return S.peakPop>=unlockOf(kind);
}

export function canPlace(kind,x,y){
  if(!inBounds(x,y)) return {ok:false};
  if(!isUnlocked(kind)){
    const t=TOOLS.find(t=>t.id===kind);
    return {ok:false,why:(t?t.name:"That")+" comes to a valley of "+unlockOf(kind)+
      " citizens. You have reached "+S.peakPop+"."};
  }
  const i=idx(x,y);
  // a signal rides on top of a road rather than replacing it, so it is
  // checked before the "something is already there" rule
  if(kind==="signal"){
    if(!isType(x,y,"road")) return {ok:false,why:"A signal has to stand on a road."};
    if(signalAt(x,y)) return {ok:false};
    if(S.coins<SIGNAL_COST) return {ok:false,why:"Not enough coins yet \u2014 wait for the next payday."};
    return {ok:true};
  }
  if(S.terr[i]===1&&!SPANS[kind]) return {ok:false,why:"Only roads and rails can cross the water."};
  const cur=S.grid[i];
  if(cur){
    if(cur.type===kind) return {ok:false};
    return {ok:false,why:"Something's already there \u2014 remove it first."};
  }
  if(kind==="station"){
    let touching=false;
    for(const[dx,dy]of DIRS) if(isType(x+dx,y+dy,"rail")) touching=true;
    if(!touching) return {ok:false,why:"Stations have to touch a rail tile."};
  }
  if(kind==="dock"){
    let touching=false;
    for(const[dx,dy]of DIRS) if(isWater(x+dx,y+dy)) touching=true;
    if(!touching) return {ok:false,why:"A dock has to stand at the water's edge."};
  }
  if(IS_WONDER[kind]){
    const spec=WONDERS[kind];
    if(S.ctx.wonders.some(w=>w.type===kind))
      return {ok:false,why:"There is only ever one "+spec.name+"."};
    // measured against the peak, like every other unlock, so a slump never
    // puts a wonder back out of reach
    if(S.peakPop<spec.unlock)
      return {ok:false,why:spec.name+" waits for a valley of "+spec.unlock+
        " citizens. You have reached "+S.peakPop+"."};
    if(spec.water){
      let touching=false;
      for(const[dx,dy]of DIRS) if(isWater(x+dx,y+dy)) touching=true;
      if(!touching) return {ok:false,why:spec.name+" must stand at the water's edge."};
    }
  }
  const c=costOf(kind,x,y);
  if(S.coins<c){
    return {ok:false,why:S.terr[i]===1
      ? "A bridge across costs "+c+" \u2014 not enough coins yet."
      : "Not enough coins yet \u2014 wait for the next payday."};
  }
  return {ok:true};
}

// the first of each kind is worth writing down
const NOTED={};
const NOTE_NAMES={cafe:"The first caf\u00e9 opened",park:"The first park was laid out",
  farm:"The first fields were sown",sawmill:"The first sawmill started up",
  workshop:"The first workshop opened",inn:"The first inn took guests",
  clinic:"The first clinic opened its doors",well:"The first well was dug",
  statue:"The Statue was unveiled",clocktower:"The Clock Tower struck its first hour",
  lighthouse:"The Lighthouse was lit",library:"The Great Library opened",
  station:"The first station opened",mill:"The first windmill turned",
  market:"The first market day",bakery:"The first bakery lit its oven",
  school:"The first school took pupils",dock:"The first dock was built",
  rail:"The first rail was laid",house:"The first house went up"};

export function place(kind,x,y){
  const r=canPlace(kind,x,y);
  if(!r.ok){ if(r.why) services.hint(r.why,true); return false; }
  if(kind==="signal"){
    S.coins-=SIGNAL_COST;
    addSignal(x,y);
    if(!NOTED.signal){ NOTED.signal=1; note("The first signal went up"); }
    services.puff(x,y); services.blip(500,0.05,"triangle");
    return true;
  }
  const i=idx(x,y);
  S.coins-=costOf(kind,x,y);
  S.natTree[i]=0;
  S.grid[i]={type:kind,x,y,seed:((x*73856093)^(y*19349663))>>>0,pop:0,grow:0,mood:50,linked:false};
  if(NOTE_NAMES[kind]&&!NOTED[kind]){ NOTED[kind]=1; note(NOTE_NAMES[kind]); }
  services.puff(x,y);
  services.blip(kind==="house"?520:kind==="park"?400:kind==="mill"?300:340);
  return true;
}

export function erase(x,y){
  if(!inBounds(x,y)) return false;
  // a signal sits above the road, so it comes off first
  if(removeSignal(x,y)){
    S.coins+=Math.floor(SIGNAL_COST/2);
    services.puff(x,y); services.blip(220);
    return true;
  }
  const i=idx(x,y);
  const b=S.grid[i];
  if(!b){
    if(S.natTree[i]){ S.natTree[i]=0; services.puff(x,y); services.blip(240); return true; }
    return false;
  }
  S.coins+=Math.floor(costOf(b.type,x,y)/2);
  S.grid[i]=null;
  services.puff(x,y);
  services.blip(220);
  return true;
}
