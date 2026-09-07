import { H, W, hash2 } from '../core/constants.js';
import { S } from '../core/state.js';
import { services } from '../core/services.js';
import { getBuildingDefinition } from '../buildings/registry.js';
import { familyAt, familyMembers } from './families.js';
import { takeLife } from './mortality.js';
import { emitFeedback } from './feedback.js';
import { record } from './ledger.js';
import { darkness } from '../world/time.js';
import { idx, inBounds } from '../world/tiles.js';

/* ============================================================
   THE SIEGE — what comes out of the woods, and what the valley does about it

   Meadowline's problem at forty thousand coins was that there was nothing left
   to want. Every building paid for itself and the treasury only went one way.
   This is the sink, and it is deliberately not a one-off purchase: a Garrison
   costs a fortune to raise and a fortune again to keep, watchtowers cost more,
   and the horde is sized by how big the town has grown. Build a city twice as
   large and you have twice as much to defend — the bill never stops.

   Nothing here is a battle the player fights. They fund a garrison, they place
   towers, and then they watch a night happen to a town they built. What they
   are really deciding is which streets they were willing to leave dark.

   The dead are real people out of the Social Fabric, and taking one is
   mortality.js's job, not this module's. This decides who is unlucky.
   ============================================================ */

// Nothing comes for a young town: there has to be something worth coming for.
export const FIRST_NIGHT=18;
export const NIGHT_GAP=9;               // days between dark nights, plus a seeded wobble
export const HORDE_CAP=26;
export const TOWER_RANGE=5;
export const TOWER_RELOAD=1.9;          // seconds between volleys
export const GARRISON_RANGE=9;
export const WALK=0.55;                 // tiles a second
export const SIEGE_DAWN=0.30;           // darkness below this and the night is over
const ATTACK_TIME=4.2;                  // seconds at a door before it costs something

export function horde(){ if(!Array.isArray(S.horde)) S.horde=[]; return S.horde; }
export function siegeState(){
  if(!S.siege||typeof S.siege!=='object') S.siege={active:false,night:0,killed:0,lost:0,damaged:0,strikes:0,arrows:[]};
  if(!Array.isArray(S.siege.arrows)) S.siege.arrows=[];
  return S.siege;
}
const towers=()=>(S.ctx?.towers||[]);
const garrisons=()=>(S.ctx?.garrisons||[]);
export function hasGarrison(){ return garrisons().length>0; }

/* ---------- when ----------
   A dark night is on the calendar, not on a dice roll, because the whole point
   is that the player can see it coming and spend money on it. The wobble keeps
   it from being a metronome. */
export function nightsOf(day){
  const d=Math.max(1,Math.floor(day||1));
  if(d<FIRST_NIGHT) return false;
  const since=d-FIRST_NIGHT;
  const cycle=Math.floor(since/NIGHT_GAP);
  const wobble=Math.floor(hash2(cycle,7,(S.seed>>>0)+91)*3)-1;      // −1, 0 or +1
  return since%NIGHT_GAP===Math.max(0,Math.min(NIGHT_GAP-1,1+wobble));
}
export function nextNight(from=S.day||1){
  for(let d=Math.floor(from)+1;d<Math.floor(from)+40;d++) if(nightsOf(d)) return d;
  return null;
}
export function nightsAway(){ const n=nextNight(); return n===null?null:n-(S.day||1); }

/* ---------- how many ----------
   By the size of the town, so a city that has doubled has doubled its problem.
   That is the sink working: defence is a running cost against a growing bill,
   not a box you tick once. */
export function hordeSize(){
  const pop=S.pop||0;
  return Math.max(3,Math.min(HORDE_CAP,Math.round(3+pop/7)));
}

/* Where they come from: the dark edge. A tile is a way in if it is open
   ground, out past the built-up part, and nothing lit is near it — which is
   what makes a lamp on the outskirts worth something on a night like this. */
function litNear(x,y,r=4){
  for(const l of S.ctx?.lamps||[]) if(Math.max(Math.abs(l.x-x),Math.abs(l.y-y))<=r) return true;
  for(const t of towers()) if(Math.max(Math.abs(t.x-x),Math.abs(t.y-y))<=r) return true;
  return false;
}
export function approaches(){
  const homes=S.ctx?.houses||[]; if(!homes.length) return [];
  let minX=W,maxX=0,minY=H,maxY=0;
  for(const h of homes){ minX=Math.min(minX,h.x); maxX=Math.max(maxX,h.x); minY=Math.min(minY,h.y); maxY=Math.max(maxY,h.y); }
  const out=[],pad=6;
  const push=(x,y)=>{ if(!inBounds(x,y)) return;
    const i=idx(x,y);
    if(S.terr[i]===1||S.grid[i]) return;                 // not out of the water, not through a wall
    out.push({x,y,dark:!litNear(x,y),wood:!!S.natTree[i]}); };
  for(let x=minX-pad;x<=maxX+pad;x+=2){ push(x,minY-pad); push(x,maxY+pad); }
  for(let y=minY-pad;y<=maxY+pad;y+=2){ push(minX-pad,y); push(maxX+pad,y); }
  /* Out of the trees, and out of the dark, first. A ring of lamps on the
     outskirts does not stop a night but it decides which side of town it
     arrives on. */
  return out.sort((a,b)=>(b.wood-a.wood)||(b.dark-a.dark));
}

/* The nearest home with somebody in it, preferring one nobody else is already
   at. Without the second half they all converge on whichever house happens to
   be closest to the treeline and one household absorbs the entire night. */
function nearestHome(x,y,taken){
  let best=null,bd=Infinity,fallback=null,fd=Infinity;
  for(const h of S.ctx?.houses||[]){
    if((h.pop|0)<=0) continue;
    const d=Math.abs(h.x-x)+Math.abs(h.y-y);
    if(d<fd){ fd=d; fallback=h; }
    if(taken&&taken.has(h.seed>>>0)) continue;
    if(d<bd){ bd=d; best=h; }
  }
  return best||fallback;
}

export function beginNight(note=()=>{}){
  const st=siegeState(), list=horde();
  list.length=0; st.arrows.length=0;
  const ways=approaches();
  if(!ways.length) return list;
  const want=hordeSize();
  st.active=true; st.night=(st.night|0)+1; st.killed=0; st.lost=0; st.damaged=0; st.strikes=0;
  for(let i=0;i<want;i++){
    const w=ways[i%ways.length];
    const jitter=Math.floor(hash2(i,st.night,(S.seed>>>0)+13)*5)-2;
    const x=Math.max(0,Math.min(W-1,w.x+(w.y===undefined?0:jitter)));
    const y=Math.max(0,Math.min(H-1,w.y+jitter));
    list.push({x,y,fx:x,fy:y,tx:x,ty:y,p:0,atDoor:0,target:null,
      seed:((x*73856093)^(y*19349663)^(i*2654435761))>>>0});
  }
  record('siege_night',{night:st.night,size:list.length,towers:towers().length,garrison:hasGarrison()});
  services.toast(list.length+' came out of the woods tonight');
  note('Something came out of the woods');
  return list;
}

export function endNight(note=()=>{}){
  const st=siegeState(), list=horde();
  if(!st.active) return;
  const survived=list.length;
  list.length=0; st.arrows.length=0; st.active=false;
  record('siege_dawn',{night:st.night,killed:st.killed|0,lost:st.lost|0,damaged:st.damaged|0,survived});
  if(st.lost) note('Meadowline counted its losses at first light');
  else if(st.killed) note('The valley held through the night');
  services.toast(st.lost?'Dawn. '+st.lost+(st.lost===1?' life':' lives')+' lost':'Dawn. The town held');
}

/* ---------- the towers shoot ----------
   A tower kills one thing a volley within its range, and a garrison reaches
   further and hits harder. Neither of them chases; this is a valley defending
   itself from where it stands, not an army. */
function volley(dt){
  const st=siegeState(), list=horde();
  for(const t of towers().concat(garrisons())){
    const isGarrison=!!getBuildingDefinition(t.type)?.defence?.garrison;
    const range=isGarrison?GARRISON_RANGE:TOWER_RANGE;
    const reload=isGarrison?TOWER_RELOAD*0.6:TOWER_RELOAD;
    t.cool=(t.cool||0)-dt;
    if(t.cool>0) continue;
    let best=-1,bd=Infinity;
    for(let i=0;i<list.length;i++){
      const z=list[i], d=Math.max(Math.abs(z.fx-t.x),Math.abs(z.fy-t.y));
      if(d<=range&&d<bd){ bd=d; best=i; }
    }
    if(best<0) continue;
    t.cool=reload;
    const z=list[best];
    st.arrows.push({x0:t.x,y0:t.y-0.4,x1:z.fx,y1:z.fy,age:0,life:0.34});
    list.splice(best,1);
    st.killed=(st.killed|0)+1;
    emitFeedback(z.fx,z.fy,'service','✦');
  }
  for(let i=st.arrows.length-1;i>=0;i--){ st.arrows[i].age+=dt; if(st.arrows[i].age>=st.arrows[i].life) st.arrows.splice(i,1); }
}

/* ---------- and the rest keep walking ---------- */
function march(dt){
  const st=siegeState(), list=horde();
  // Which homes are already being walked at, so the rest spread out.
  const claimed=new Set();
  for(const z of list) if(z.target) claimed.add(z.target.seed>>>0);
  for(const z of list){
    if(z.atDoor>0){
      // Already at a door: the clock the household is running out of, and the
      // last window in which a tower can still save them.
      z.atDoor+=dt;
      if(z.atDoor>=ATTACK_TIME) z.spent=true;
      continue;
    }
    const home=nearestHome(z.fx,z.fy,claimed);
    z.target=home?{x:home.x,y:home.y,seed:home.seed>>>0}:null;
    if(home) claimed.add(home.seed>>>0);
    if(!home) continue;
    if(Math.abs(home.x-z.fx)<=1&&Math.abs(home.y-z.fy)<=1){ z.atDoor=0.001; continue; }
    const dx=Math.sign(home.x-z.fx), dy=Math.sign(home.y-z.fy);
    // One axis at a time, whichever is further, so they read as walking rather
    // than sliding diagonally through everything.
    if(Math.abs(home.x-z.fx)>Math.abs(home.y-z.fy)) z.fx+=dx*WALK*dt;
    else z.fy+=dy*WALK*dt;
    z.x=Math.round(z.fx); z.y=Math.round(z.fy);
  }
  /* One reaches a door, one thing happens, and that one is done. Without this
     a walker that got through went on battering the same house every four
     seconds until dawn, so a single gap in the line cost a household everyone
     in it — the first undefended night killed fifteen people out of three
     homes. Spent here, the arithmetic is something a player can actually
     reason about: this many are coming, my towers stop that many, the rest get
     one hit each. */
  for(let i=list.length-1;i>=0;i--) if(list[i].spent){ strike(list[i]); list.splice(i,1); }
}

/* ---------- what it costs ----------
   A home that is reached loses something. Most of the time that is the home:
   a tier knocked off, the household scattered, the mood of the whole street.
   Sometimes it is a person, and then it is a person with a name, a trade and
   a family who have to go on without them. */
function strike(z){
  const st=siegeState();
  const home=(S.ctx?.houses||[]).find(h=>Math.abs(h.x-z.fx)<=1&&Math.abs(h.y-z.fy)<=1&&(h.pop|0)>0);
  if(!home) return;
  const f=familyAt(home);
  /* Keyed on how many have got through tonight, not on the time of day: the
     clock's granularity meant the same house rolled the same number every
     time, so a household that lost one person lost all of them. */
  st.strikes=(st.strikes|0)+1;
  const roll=hash2(home.seed>>>0,st.strikes,(S.seed>>>0)+st.night);
  /* A death is the minority outcome even when they reach you, and it needs
     somebody to actually be in. The rest of the time the house takes it. */
  if(f&&roll<0.34&&familyMembers(f).length>0){
    const living=familyMembers(f);
    const who=living[Math.floor(hash2(f.id,st.night*31+st.strikes,(S.seed>>>0)+5)*living.length)%living.length];
    const gone=takeLife(f,who.index,{cause:'the siege',x:home.x,y:home.y});
    if(gone){
      st.lost=(st.lost|0)+1;
      home.mood=Math.max(0,(home.mood|0)-30);
      services.toast(gone.name+' was lost on '+(f.roots||'Meadowline'));
      emitFeedback(home.x,home.y,'warn','✝');
      return;
    }
  }
  // The house itself: knocked back a rung, and the street feels it for days.
  const tier=Math.floor(Number(home.state?.housingTier)||1);
  if(tier>1){ home.state.housingTier=tier-1; home.state.upgradeProgress=0; }
  if(home.pop>0) home.pop--;
  home.mood=Math.max(0,(home.mood|0)-22);
  st.damaged=(st.damaged|0)+1;
  record('siege_damage',{x:home.x,y:home.y,tier:home.state?.housingTier|0,district:f?.roots||null});
  emitFeedback(home.x,home.y,'warn','!');
}

let clock=0;
export function advanceSiege(dt,note=()=>{}){
  const st=siegeState();
  const dark=darkness();
  if(!st.active){
    // A night begins when it is properly dark on a night the calendar named.
    if(nightsOf(S.day||1)&&dark>SIEGE_DAWN&&(S.ctx?.houses||[]).some(h=>(h.pop|0)>0)) beginNight(note);
    return;
  }
  if(dark<=SIEGE_DAWN||!(S.ctx?.houses||[]).some(h=>(h.pop|0)>0)){ endNight(note); return; }
  clock+=dt;
  volley(dt);
  march(dt);
  if(!horde().length&&clock>1){ endNight(note); clock=0; }
}

export function siegeSnapshot(){
  const st=siegeState();
  return {active:!!st.active,night:st.night|0,here:horde().length,
    towers:towers().length,garrison:hasGarrison(),
    killed:st.killed|0,lost:st.lost|0,damaged:st.damaged|0,
    nextIn:nightsAway(),size:hordeSize()};
}
