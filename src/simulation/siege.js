import { H, W, hash2 } from '../core/constants.js';
import { S } from '../core/state.js';
import { services } from '../core/services.js';
import { getBuildingDefinition } from '../buildings/registry.js';
import { families as familiesList, familyAt, familyMembers } from './families.js';
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

/* Nothing comes for a young town: there has to be something worth coming for.
   After that they come EVERY night, and the scheduled dark nights are no longer
   the only ones — they are the bad ones. An ordinary night is a mini horde
   sized off the town; a dark night is the full weight of it and then some. */
/* Late enough that a player can have banked the money and reached the stage
   that unlocks a Garrison before the first one arrives. At day eight they were
   being attacked nightly with no defence it was even possible to buy yet,
   which is not difficulty, it is a game that has not started. */
export const FIRST_NIGHT=20;
export const NIGHT_GAP=9;               // days between the bad ones
export const HORDE_CAP=26;
export const SURGE_CAP=40;              // a dark night may go past the ordinary ceiling
export const MIN_HORDE=6;               // never one or two: the smallest night is still a crowd
export const ORDINARY_SHARE=0.55;       // what an ordinary night is, against a dark one
export const SURGE=1.35;
export const TOWER_RANGE=5;
export const TOWER_RELOAD=1.9;          // seconds between volleys
// How far the garrison's own people will go out. Named for the Look card.
export const GARRISON_RANGE=10;
export const WALK=0.55;                 // tiles a second
export const SIEGE_DAWN=0.30;           // darkness below this and the night is over
const ATTACK_TIME=4.2;                  // seconds at a door before it costs something
/* ---------- the militia ----------
   The towers shoot from where they stand; these are the ones who go out. How
   many depends on how many guards the town actually employs, so a garrison
   nobody works at fields a token watch — the building is the licence, the
   people are the strength. */
export const MILITIA_SPEED=0.95;        // enough faster that they can actually cut something off
export const MILITIA_REACH=1.15;
export const MILITIA_MAX=4;
export const MILITIA_MIN=2;
/* How far from the garrison they will go. This is the lever that decides what
   a garrison is *for*: at sixteen tiles four of them swept a fifteen-strong
   night on their own and every tower in the game was ornamental. At ten they
   hold their own quarter and the far end of a long town is somebody else's
   problem — which is what towers are, and why a town that spreads has to keep
   buying them. */
export const MILITIA_LEASH=GARRISON_RANGE;
/* A real fight rather than a swat. At the first setting six of them cleared a
   horde of fifteen with no towers standing at all, which made every tower in
   the game ornamental — the whole design is that a garrison alone does not
   hold a town. */
const DUEL_TIME=2.0;
const RECOVER_TIME=26;

export function horde(){ if(!Array.isArray(S.horde)) S.horde=[]; return S.horde; }
export function militia(){ if(!Array.isArray(S.militia)) S.militia=[]; return S.militia; }
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
/* ---------- which way they came ----------
   Bucketed to the eight points, from the town's middle, so the warning can
   point at where they actually are rather than waving vaguely. */
export const POINTS=['N','NE','E','SE','S','SW','W','NW'];
export function townCentre(){
  const homes=S.ctx?.houses||[];
  if(!homes.length) return null;
  let x=0,y=0; for(const h of homes){ x+=h.x; y+=h.y; }
  return {x:x/homes.length,y:y/homes.length};
}
export function bearingOf(x,y,c=townCentre()){
  if(!c) return null;
  // Screen north is up the grid, so -y is N and +x is E.
  const a=Math.atan2(x-c.x,-(y-c.y));            // 0 = N, clockwise
  const k=Math.round(((a<0?a+Math.PI*2:a)/(Math.PI*2))*8)%8;
  return POINTS[k];
}
export function bearings(list){
  const c=townCentre(); if(!c) return [];
  const seen=new Set();
  for(const z of list||[]){ const b=bearingOf(z.fx??z.x,z.fy??z.y,c); if(b) seen.add(b); }
  return POINTS.filter(p=>seen.has(p));
}
export function spellDirections(dirs){
  const WORD={N:'north',NE:'north-east',E:'east',SE:'south-east',S:'south',SW:'south-west',W:'west',NW:'north-west'};
  const list=(dirs||[]).map(d=>WORD[d]||d);
  if(!list.length) return 'dark';
  if(list.length===1) return list[0];
  if(list.length>=5) return 'every side';
  return list.slice(0,-1).join(', ')+' and '+list[list.length-1];
}
/* The whole phrase including its article, because "every side" does not take
   one and "the north and east" does — the band read "from the every side"
   until this existed. */
export function fromPhrase(dirs){
  const where=spellDirections(dirs);
  return where==='every side'||where==='dark'?'from '+where:'from the '+where;
}
/* What the warning needs: which ways, and how long it has been up. Read every
   frame by the alert, so it is cheap and holds no state of its own. */
export function siegeWarning(){
  const st=siegeState();
  if(!st.active||!st.from?.length) return null;
  return {dirs:st.from.slice(),size:horde().length,surge:!!st.surge,
    age:Math.max(0,(S.t||0)-(st.warnedAt||0))};
}

/* ---------- how many ----------
   By the size of the town, so a city that has doubled has doubled its problem.
   That is the sink working: defence is a running cost against a growing bill,
   not a box you tick once. */
export function hordeSize(){
  const pop=S.pop||0;
  return Math.max(3,Math.min(HORDE_CAP,Math.round(3+pop/7)));
}
// Whether tonight is one of the bad ones.
export function isSurge(day=S.day||1){ return nightsOf(day); }
/* What is actually coming tonight. Every night after the first has something in
   it, and the smallest of them is still a crowd — a night with two of anything
   in it is not a night, it is a stray. */
export function tonightSize(day=S.day||1){
  const d=Math.max(1,Math.floor(day));
  if(d<FIRST_NIGHT) return 0;
  const full=hordeSize();
  return isSurge(d)
    ? Math.max(MIN_HORDE,Math.min(SURGE_CAP,Math.round(full*SURGE)))
    : Math.max(MIN_HORDE,Math.round(full*ORDINARY_SHARE));
}
export function nightsComing(day=S.day||1){ return tonightSize(day)>0; }
/* The days before the first one ever. The valley has never seen this and the
   player has never had to spend money on it, so they are told plainly and in
   advance rather than discovering it at dusk. */
export const WARN_DAYS=5;
export function firstNightWarning(day=S.day||1){
  const d=Math.max(1,Math.floor(day));
  const away=FIRST_NIGHT-d;
  return away>0&&away<=WARN_DAYS?away:0;
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

/* Guards on the books, which is what decides how many go out. A garrison with
   nobody working in it still fields the minimum — somebody always turns out —
   but a town that has the people to staff it fields a real watch. */
export function guardsEmployed(){
  let n=0;
  for(const f of familiesList()) for(const c of Object.values(f.careers||{})) if(c==='guard') n++;
  return n;
}
export function militiaStrength(){
  if(!hasGarrison()) return 0;
  return Math.max(MILITIA_MIN,Math.min(MILITIA_MAX,guardsEmployed()));
}
function muster(){
  const list=militia(); list.length=0;
  const g=garrisons()[0]; if(!g) return list;
  const want=militiaStrength();
  for(let i=0;i<want;i++){
    const x=g.x+(i%2), y=g.y+((i>>1)%2);
    list.push({x,y,fx:x,fy:y,home:{x:g.x,y:g.y},state:'OUT',duel:0,hurt:0,
      seed:((g.seed>>>0)^(i*2654435761))>>>0});
  }
  return list;
}

export function beginNight(note=()=>{}){
  const st=siegeState(), list=horde();
  list.length=0; st.arrows.length=0;
  const ways=approaches();
  if(!ways.length) return list;
  muster();
  const surge=isSurge(S.day||1);
  const want=tonightSize(S.day||1);
  if(!want) return list;
  st.active=true; st.night=(st.night|0)+1; st.killed=0; st.lost=0; st.damaged=0; st.strikes=0; st.hurt=0;
  st.surge=surge;
  for(let i=0;i<want;i++){
    const w=ways[i%ways.length];
    const jitter=Math.floor(hash2(i,st.night,(S.seed>>>0)+13)*5)-2;
    const x=Math.max(0,Math.min(W-1,w.x+(w.y===undefined?0:jitter)));
    const y=Math.max(0,Math.min(H-1,w.y+jitter));
    list.push({x,y,fx:x,fy:y,tx:x,ty:y,p:0,atDoor:0,target:null,
      seed:((x*73856093)^(y*19349663)^(i*2654435761))>>>0});
  }
  /* Which way they are coming in from, as compass points, for the warning the
     player gets. Worked out here rather than in the UI because it is a fact
     about the night and not a decoration. */
  st.from=bearings(list);
  st.warnedAt=(S.t||0);
  record('siege_night',{night:st.night,size:list.length,surge,from:st.from.join(','),
    towers:towers().length,garrison:hasGarrison(),militia:militia().length});
  /* No toast. The band across the top says this, holds it for the whole night
     and has the arrows with it; a toast saying the same words at the same
     moment was two announcements of one event, and on a phone the two of them
     sat on top of each other. */
  note(surge?'A dark night: they are coming in force':'Something came out of the woods');
  return list;
}

export function endNight(note=()=>{}){
  const st=siegeState(), list=horde();
  if(!st.active) return;
  const survived=list.length;
  list.length=0; st.arrows.length=0; militia().length=0; st.active=false;
  record('siege_dawn',{night:st.night,surge:!!st.surge,killed:st.killed|0,lost:st.lost|0,damaged:st.damaged|0,hurt:st.hurt|0,survived});
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
  /* Towers only. The garrison used to shoot too, with a longer reach and a
     faster reload, and the result was that it killed everything before its own
     militia could walk to it — every guard on the map was ornamental and not
     one of them ever landed a blow. A garrison sends people; it does not fire.
     That split is what makes the two purchases different things to own. */
  for(const t of towers()){
    const range=getBuildingDefinition(t.type)?.defence?.range||TOWER_RANGE;
    const reload=TOWER_RELOAD;
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

/* ---------- the ones who go out ----------
   They pick the nearest thing to the town, walk out to meet it, and settle it
   at arm's length. They will not follow one past the leash: a militia that
   chases a straggler across the valley leaves the street it was standing in
   open, which is exactly the mistake the player is being asked not to make. */
function patrol(dt){
  const st=siegeState(), list=horde(), guard=militia();
  for(const m of guard){
    if(m.hurt>0){
      // Hurt: back to the garrison, and out of the night until they have sat down.
      m.hurt-=dt;
      const dx=Math.sign(m.home.x-m.fx), dy=Math.sign(m.home.y-m.fy);
      if(Math.abs(m.home.x-m.fx)>0.4) m.fx+=dx*MILITIA_SPEED*dt;
      else if(Math.abs(m.home.y-m.fy)>0.4) m.fy+=dy*MILITIA_SPEED*dt;
      m.state='RETURNING';
      m.x=Math.round(m.fx); m.y=Math.round(m.fy);
      continue;
    }
    // The nearest one, so long as it is still the town they are standing in.
    let best=-1,bd=Infinity;
    for(let i=0;i<list.length;i++){
      const z=list[i];
      if(Math.max(Math.abs(z.fx-m.home.x),Math.abs(z.fy-m.home.y))>MILITIA_LEASH) continue;
      const d=Math.hypot(z.fx-m.fx,z.fy-m.fy);
      if(d<bd){ bd=d; best=i; }
    }
    if(best<0){
      // Nothing in reach: back towards the garrison and wait.
      m.state='RETURNING'; m.duel=0;
      const dx=Math.sign(m.home.x-m.fx), dy=Math.sign(m.home.y-m.fy);
      if(Math.abs(m.home.x-m.fx)>0.4) m.fx+=dx*MILITIA_SPEED*dt;
      else if(Math.abs(m.home.y-m.fy)>0.4) m.fy+=dy*MILITIA_SPEED*dt;
      m.x=Math.round(m.fx); m.y=Math.round(m.fy);
      continue;
    }
    const z=list[best];
    m.face={x:z.fx,y:z.fy};
    if(bd<=MILITIA_REACH){
      m.state='FIGHTING'; m.duel+=dt;
      if(m.duel>=DUEL_TIME){
        m.duel=0;
        list.splice(best,1);
        st.killed=(st.killed|0)+1;
        emitFeedback(z.fx,z.fy,'service','\u2694');
        /* It is not free. Roughly one in six goes badly and that guard is out
           of the night, which is why a garrison alone does not hold a town —
           the towers have to be there too. */
        if(hash2(m.seed,st.killed*7+guard.indexOf(m),(S.seed>>>0)+29)<0.22){
          m.hurt=RECOVER_TIME;
          st.hurt=(st.hurt|0)+1;
          if(S.diagnostics) S.diagnostics.militiaHurt=(S.diagnostics.militiaHurt||0)+1;
          record('militia_hurt',{night:st.night,x:Math.round(m.fx),y:Math.round(m.fy)});
        }
      }
      continue;
    }
    m.state='OUT'; m.duel=0;
    const ang=Math.atan2(z.fy-m.fy,z.fx-m.fx);
    m.fx+=Math.cos(ang)*MILITIA_SPEED*dt;
    m.fy+=Math.sin(ang)*MILITIA_SPEED*dt;
    m.x=Math.round(m.fx); m.y=Math.round(m.fy);
  }
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
    if(nightsComing(S.day||1)&&dark>SIEGE_DAWN&&(S.ctx?.houses||[]).some(h=>(h.pop|0)>0)) beginNight(note);
    return;
  }
  if(dark<=SIEGE_DAWN||!(S.ctx?.houses||[]).some(h=>(h.pop|0)>0)){ endNight(note); return; }
  clock+=dt;
  volley(dt);
  patrol(dt);
  march(dt);
  if(!horde().length&&clock>1){ endNight(note); clock=0; }
}

export function siegeSnapshot(){
  const st=siegeState();
  return {active:!!st.active,night:st.night|0,here:horde().length,
    towers:towers().length,garrison:hasGarrison(),
    killed:st.killed|0,lost:st.lost|0,damaged:st.damaged|0,surge:!!st.surge,from:(st.from||[]).slice(),
    tonight:tonightSize(),
    militia:militia().length,outThere:militia().filter(m=>m.hurt<=0).length,hurt:st.hurt|0,
    nextIn:nightsAway(),size:hordeSize()};
}
