/* ============================================================
   THE SIEGE

   A rich town had nothing left to want, so this is the sink: a Garrison that
   costs a fortune to raise and another to keep, towers that cost more, and a
   horde sized by how big the town has grown so the bill never stops.

   Two things are tested hardest. The first is the arithmetic a player has to
   be able to reason about — this many are coming, my towers stop that many,
   the rest get one hit each — because the first draft let a walker that
   reached a door batter it until dawn and a single gap cost a household
   everyone in it. The second is that a death is survivable by the *code*: a
   person here is (homeSeed, index), their trade and renown and nickname are
   all filed under that index, and taking one person out must not renumber
   anybody else into a dead person's job.
   ============================================================ */
import * as siegeMod from '../src/simulation/siege.js';
import { FIRST_NIGHT, GARRISON_RANGE, MILITIA_LEASH, MILITIA_MAX, MILITIA_MIN, TOWER_RANGE, advanceSiege,
  approaches, bearingOf, bearings, firstNightWarning, guardsEmployed, hordeSize, horde, isSurge, militia,
  militiaStrength, MIN_HORDE, nextNight, nightsComing, nightsOf, POINTS, siegeSnapshot, siegeState,
  siegeWarning, spellDirections, tonightSize, townCentre, walkable, WARN_DAYS } from '../src/simulation/siege.js';
import { takeLife, deathsSoFar, isLost } from '../src/simulation/mortality.js';
import { BUILDINGS } from '../src/buildings/registry.js';
import { canPlace, place, erase } from '../src/buildings/buildings.js';
import { families, familyMembers, familyAt, lostOf, memberEver, evaluateFamilies } from '../src/simulation/families.js';
import { CAREERS, evaluateCareers } from '../src/simulation/careers.js';
import { aliases } from '../src/simulation/aliases.js';
import { fame } from '../src/simulation/fame.js';
import { organisations } from '../src/simulation/organisations.js';
import { composeIssue } from '../src/simulation/post.js';
import { ledger } from '../src/simulation/ledger.js';
import { upkeepTotal } from '../src/simulation/upkeep.js';
import { describe } from '../src/ui/panels.js';
import { applySave, save, store, KEY } from '../src/core/save.js';
import { S } from '../src/core/state.js';
import { resetProgression } from '../src/progression/city-growth.js';
import { recompute } from '../src/simulation/mood.js';
import { genWorld } from '../src/world/map.js';
import { idx } from '../src/world/tiles.js';

const checks=[];
const check=(name,value,detail)=>checks.push({name,pass:Boolean(value),...(detail===undefined?{}:{detail})});
const note=()=>{};
const NIGHT=0.95, DAY_T=0.35;

function town({homes=17,settle=140}={}){
  genWorld(20260907); resetProgression('legacy-open'); S.cityProgress.stage=4; S.coins=9e6;
  S.citizens=[]; S.incidents=[]; S.ledger=[]; S.horde=[]; S.siege=null; S.day=40; S.dayT=DAY_T;
  S.social={districts:[],nextId:0,families:[],nextFamilyId:0,firsts:{},organisations:[],nextOrgId:0,orgMemory:{},fame:[],aliases:[],petitions:[]};
  for(let y=34;y<60;y++) for(let x=34;x<76;x++){ const i=idx(x,y); S.terr[i]=0; S.natTree[i]=0; S.grid[i]=null; }
  for(let x=42;x<42+homes+3;x++) place('road',x,46);
  for(let x=43;x<43+homes;x++){ if(place('house',x,45)){ const h=S.grid[idx(x,45)]; h.pop=5; h.mood=70; h.state.housingTier=2; } }
  recompute();
  for(let d=0;d<settle;d++){ S.day++; for(let s=0;s<8;s++){ S.dayT=s/8+0.01; evaluateFamilies(note); evaluateCareers(note); } }
  S.dayT=DAY_T; recompute();
}
const at=(x,y)=>S.grid[idx(x,y)];
/* Run one night to its end. Dawn is not simulated here — the point is what the
   night does, so it runs until nobody is left standing in it. */
function runNight(limit=20000){
  S.day=nextNight(1); S.dayT=NIGHT;
  advanceSiege(0.1,note);
  const came=horde().length;
  let t=0; while(horde().length&&t<limit){ advanceSiege(0.05,note); t++; }
  return {came,ticks:t,...siegeSnapshot()};
}

/* ---------- what a town can buy ---------- */
{
  const g=BUILDINGS.garrison, w=BUILDINGS.watchtower;
  check('a garrison is the most expensive thing in the valley bar a wonder',
    g&&g.cost>=4000&&g.cost>BUILDINGS.hospital.cost*4,g&&g.cost);
  check('and costs more to keep than anything else standing',
    g.upkeep>Math.max(...Object.values(BUILDINGS).filter(d=>d.id!=='garrison').map(d=>d.upkeep||0)),g.upkeep);
  check('there is only ever one of it',g.unique===true);
  check('a watchtower is cheap to raise and not cheap to keep',w&&w.cost<500&&w.upkeep>=5,w&&[w.cost,w.upkeep].join('/'));
  check('neither claims a keyboard shortcut',!g.key&&!w.key);
  check('both declare what they can reach, so siege.js names no building',
    g.defence?.garrison===true&&w.defence?.range>0&&!/watchtower|garrison/.test(String(siegeMod.advanceSiege)),
    JSON.stringify([g.defence,w.defence]));
  check('a garrison’s people go further than a tower can shoot',GARRISON_RANGE>TOWER_RANGE,
    GARRISON_RANGE+' vs '+TOWER_RANGE);
}

/* ---------- towers need somewhere to come from ---------- */
{
  town();
  const blocked=canPlace('watchtower',50,48);
  check('no tower without a garrison standing',blocked.ok===false&&/Garrison/.test(blocked.why||''),blocked.why);
  check('fixture: it is not the money or the land stopping it',S.coins>BUILDINGS.watchtower.cost&&!at(50,48));
  place('garrison',64,50); recompute();
  check('and one with a garrison standing goes up',canPlace('watchtower',50,48).ok===true);
  place('watchtower',50,48); recompute();
  /* Pulling the garrison down does not pull the towers down with it — they
     stand there unmanned, which the Look card says out loud. */
  erase(64,50,{confirmed:true}); recompute();
  check('pulling the garrison down leaves the towers standing',at(50,48)?.type==='watchtower');
  check('and the tower says nobody mans it',/Nobody mans this/.test(describe(50,48)),
    describe(50,48).replace(/<[^>]+>/g,' ').slice(0,90));
}

/* ---------- when it happens ---------- */
{
  town();
  check('nothing comes for a young town',
    Array.from({length:FIRST_NIGHT-1},(_,i)=>i+1).every(d=>!nightsComing(d)&&tonightSize(d)===0),FIRST_NIGHT);
  /* A young town gets told it is coming, several days out, because it is the
     one thing here a player cannot find out by looking at the map. */
  check('and it is warned before the first one ever',
    firstNightWarning(FIRST_NIGHT-1)===1&&firstNightWarning(FIRST_NIGHT-WARN_DAYS)===WARN_DAYS
    &&!firstNightWarning(FIRST_NIGHT-WARN_DAYS-1)&&!firstNightWarning(FIRST_NIGHT),
    [firstNightWarning(FIRST_NIGHT-1),firstNightWarning(FIRST_NIGHT)].join(','));
  check('and a Garrison can be standing before that night, or the warning is cruelty',
    BUILDINGS.garrison.unlockStage<=2&&BUILDINGS.watchtower.unlockStage<=2,
    BUILDINGS.garrison.unlockStage+'/'+BUILDINGS.watchtower.unlockStage);
  // Then every night, without exception.
  const after=Array.from({length:120},(_,i)=>FIRST_NIGHT+i);
  check('after that they come every single night',after.every(d=>nightsComing(d)),
    after.filter(d=>!nightsComing(d)).slice(0,5).join(','));
  check('and the smallest night is still a crowd, never one or two',
    after.every(d=>tonightSize(d)>=MIN_HORDE),Math.min(...after.map(d=>tonightSize(d))));
  // The scheduled nights are still special: they are the bad ones.
  const surges=after.filter(d=>isSurge(d));
  check('some of them are worse than others',surges.length>=8&&surges.length<after.length/3,
    surges.length+' of '+after.length);
  check('never two bad ones running',surges.every((d,i)=>i===0||d-surges[i-1]>=2),surges.slice(0,8).join(','));
  check('a dark night brings more than an ordinary one',
    surges.every(d=>tonightSize(d)>tonightSize(d+1===surges[surges.indexOf(d)+1]?d+2:d+1)),
    surges.slice(0,3).map(d=>tonightSize(d)+' vs '+tonightSize(d+1)).join(' | '));
  check('and the calendar is knowable in advance, which is what makes it a sink',
    nextNight(1)!==null&&isSurge(nextNight(1)),nextNight(1));
  const a=[]; for(let d=1;d<120;d++) if(isSurge(d)) a.push(d);
  const b=[]; for(let d=1;d<120;d++) if(isSurge(d)) b.push(d);
  check('the same valley reads the same calendar twice',a.join()===b.join());
}

/* ---------- they do not walk on water ---------- */
{
  /* Reported from a real game: one of them wading across the middle of the
     lake. approaches() had always offered dry ground, but the jitter that
     spreads them along the treeline was applied afterwards and never
     re-checked, and march() never looked at the terrain at all. */
  town();
  // A lake between the treeline and the town, wide enough that nothing could
  // reach a home by accident without crossing it.
  for(let y=36;y<41;y++) for(let x=40;x<64;x++) S.terr[idx(x,y)]=1;
  recompute();
  check('fixture: there is real water on the map',(()=>{
    let n=0; for(let y=36;y<41;y++) for(let x=40;x<64;x++) if(S.terr[idx(x,y)]===1) n++;
    return n>100; })());
  check('open water is not walkable',!walkable(50,38)&&!walkable(44,39));
  check('and dry ground is',walkable(50,45)&&walkable(43,45));
  check('a way laid over water is, because a bridge is a bridge for anything',(()=>{
    place('road',50,38);
    return walkable(50,38); })());
  erase(50,38,{confirmed:true}); recompute();

  S.day=nextNight(1); S.dayT=NIGHT;
  advanceSiege(0.1,note);
  check('fixture: a night started with the lake in the way',horde().length>0,horde().length);
  check('none of them starts the night standing in the water',
    horde().every(z=>walkable(z.fx,z.fy)),
    JSON.stringify(horde().filter(z=>!walkable(z.fx,z.fy)).map(z=>[z.x,z.y])));
  let onWater=0,t=0;
  while(horde().length&&t<4000){
    advanceSiege(0.05,note); t++;
    for(const z of horde()) if(!walkable(z.fx,z.fy)) onWater++;
  }
  check('and not one of them crosses it on foot',onWater===0,onWater+' tile-frames in the lake');
}

/* ---------- the warning ---------- */
{
  town();
  check('there is nothing to warn about before a night starts',siegeWarning()===null);
  S.day=nextNight(1); S.dayT=NIGHT;
  advanceSiege(0.1,note);
  const w=siegeWarning();
  check('a night raises a warning',!!w&&w.size===horde().length,JSON.stringify(w&&{n:w.size,d:w.dirs}));
  check('and it says which ways they are actually coming from',
    w.dirs.length>0&&w.dirs.every(d=>POINTS.includes(d)),w.dirs.join(','));
  /* Not a decoration: every direction named has somebody in it, and every
     direction somebody is in is named. A warning pointing at an empty field is
     worse than no warning.

     Worked out here from the raw positions rather than by calling bearings()
     — the first version compared that function against itself, so a sabotage
     that named all eight points at once passed cleanly. */
  const c=townCentre();
  const octant=(x,y)=>{
    const a=Math.atan2(x-c.x,-(y-c.y));
    return POINTS[Math.round(((a<0?a+Math.PI*2:a)/(Math.PI*2))*8)%8];
  };
  const actual=new Set(horde().map(z=>octant(z.fx,z.fy)));
  check('fixture: they are not all coming from one side',actual.size>=2,[...actual].join(','));
  check('every way it points at has something coming from it',
    w.dirs.every(d=>actual.has(d)),w.dirs.join(',')+' vs '+[...actual].join(','));
  check('and it does not miss one',[...actual].every(d=>w.dirs.includes(d)),
    [...actual].filter(d=>!w.dirs.includes(d)).join(','));
  check('a bearing is read from the town, not from the map',(()=>{
    const c=townCentre();
    return c&&bearingOf(c.x,c.y-10,c)==='N'&&bearingOf(c.x+10,c.y,c)==='E'
      &&bearingOf(c.x,c.y+10,c)==='S'&&bearingOf(c.x-10,c.y,c)==='W'; })(),
    JSON.stringify(townCentre()));
  check('it can be said out loud',/north|south|east|west|every side/.test(spellDirections(w.dirs)),
    spellDirections(w.dirs));
  check('and many directions at once become “every side” rather than a list',
    spellDirections(['N','NE','E','SE','S'])==='every side');
  /* The alert is a reading of the night and cannot raise one of its own — the
     same rule the rest of the UI follows about the simulation. */
  const src=await (await fetch('../src/ui/siege-alert.js')).text();
  check('the alert decides nothing; it only reads',
    !/S\.horde|S\.siege\s*=|beginNight|takeLife|\bsiegeState\(/.test(src)
    &&/siegeWarning\(\)/.test(src),
    (src.match(/S\.[a-z]+/g)||[]).join(','));
  S.dayT=DAY_T; advanceSiege(0.1,note);
  check('and it goes when the night does',siegeWarning()===null);
}

/* ---------- how many, and from where ---------- */
{
  town({homes:6});
  const small=hordeSize();
  town({homes:24});
  const big=hordeSize();
  check('a bigger town has a bigger problem, which is the whole sink',big>small,small+' -> '+big);
  check('and it is bounded, so a huge city is not simply lost',big<=siegeMod.HORDE_CAP);
  town();
  const ways=approaches();
  check('they come in from outside the built-up part',ways.length>0&&ways.every(w=>!S.grid[idx(w.x,w.y)]),ways.length);
  /* A ring of lamps does not stop a night, but it decides which side of town
     it arrives on — which is what makes lighting the outskirts worth anything. */
  const darkBefore=approaches().filter(w=>w.dark).length;
  for(const w of approaches().slice(0,10)) place('lamp',w.x,w.y+1);
  recompute();
  const darkAfter=approaches().filter(w=>w.dark).length;
  check('lighting the outskirts changes where the dark ways in are',darkAfter<darkBefore,
    darkBefore+' -> '+darkAfter);
}

/* ---------- an undefended night ---------- */
{
  town();
  const before=S.ctx.houses.reduce((n,h)=>n+h.pop,0);
  const r=runNight();
  check('fixture: something came',r.came>0&&r.came===tonightSize(),r.came+' / '+tonightSize());
  check('nothing was brought down, because nothing was there to do it',r.killed===0,r.killed);
  check('and the town paid for it',r.lost+r.damaged>0,JSON.stringify({lost:r.lost,damaged:r.damaged}));
  check('the night ended rather than running for ever',r.active===false&&horde().length===0,r.ticks);
  check('everything that came got at most one hit',r.lost+r.damaged<=r.came,
    (r.lost+r.damaged)+' vs '+r.came);
  /* The bug this replaced: a walker that reached a door struck every four
     seconds until dawn, so one gap in the line emptied a whole household. */
  const wiped=families().filter(f=>lostOf(f).length>=5).length;
  check('and no household was emptied in a single night',wiped===0,wiped);
  check('the households that lost somebody are not all the same one',
    new Set(ledger().filter(e=>e.type==='death').map(e=>e.familyId)).size
      >=Math.min(2,ledger().filter(e=>e.type==='death').length),
    ledger().filter(e=>e.type==='death').map(e=>e.familyId).join(','));
  const after=S.ctx.houses.reduce((n,h)=>n+h.pop,0);
  check('the town is genuinely smaller afterwards',after<before,before+' -> '+after);
  check('and it is written down as a night, with its numbers',(()=>{
    const e=ledger().find(x=>x.type==='siege_dawn');
    return e&&e.killed===r.killed&&e.lost===r.lost&&e.damaged===r.damaged; })(),
    JSON.stringify(ledger().find(x=>x.type==='siege_dawn')));
}

/* ---------- a defended one ---------- */
{
  town();
  place('garrison',64,50);
  recompute();
  for(const x of [44,48,52,56,58]) place('watchtower',x,47);
  recompute();
  check('fixture: the watch is standing',siegeSnapshot().towers===5&&siegeSnapshot().garrison);
  const r=runNight();
  check('the towers bring them down',r.killed>0,r.killed);
  check('and a town that paid for enough of them loses nobody',r.lost===0,
    JSON.stringify({killed:r.killed,lost:r.lost,damaged:r.damaged}));
  check('nothing was left standing at the end of it',horde().length===0);
  /* Reach is real: the same walls with the towers parked out of the way stop
     nothing, so it is the placement being paid for and not the receipt. */
  town();
  place('garrison',70,58); recompute();
  for(const x of [66,68,70,72,74]) place('watchtower',x,58);
  recompute();
  const far=runNight();
  check('towers too far from the homes stop nothing',far.killed<5&&far.lost+far.damaged>0,
    JSON.stringify({killed:far.killed,lost:far.lost,damaged:far.damaged}));
}

/* ---------- the ones who go out ---------- */
{
  check('there is a guard’s trade, held at the watch',
    CAREERS.guard&&CAREERS.guard.at.includes('garrison')&&CAREERS.guard.at.includes('watchtower'));
  town();
  check('a town with no garrison sends nobody out',militiaStrength()===0&&guardsEmployed()===0);
  place('garrison',52,48); recompute();
  /* Let people actually take the posts, so the strength is the town's and not
     the building's — the building is the licence, the people are the watch. */
  for(let d=0;d<160;d++){ S.day++; for(let s=0;s<8;s++){ S.dayT=s/8+0.01; evaluateFamilies(note); evaluateCareers(note); } }
  S.dayT=DAY_T; recompute();
  check('people take the guard’s post once there is somewhere to hold it',guardsEmployed()>0,guardsEmployed());
  check('and what goes out is bounded either way',
    militiaStrength()>=MILITIA_MIN&&militiaStrength()<=MILITIA_MAX,militiaStrength());
  S.day=nextNight(1); S.dayT=NIGHT;
  advanceSiege(0.1,note);
  check('they muster when the night starts',militia().length===militiaStrength(),militia().length);
  check('and they start at the garrison',
    militia().every(m=>Math.max(Math.abs(m.fx-52),Math.abs(m.fy-48))<=2),
    JSON.stringify(militia().map(m=>[m.x,m.y])));
  const states=new Set();
  let t=0,fought=false;
  while(horde().length&&t<3000){ advanceSiege(0.05,note);
    for(const m of militia()){ states.add(m.state); if(m.state==='FIGHTING') fought=true; }
    t++; }
  check('they walk out and they fight',states.has('OUT')&&fought,[...states].join(','));
  check('and it is them doing the killing, not the building',siegeSnapshot().killed>0,siegeSnapshot().killed);
  /* The garrison used to shoot as well, with a longer reach and a faster
     reload, so it killed everything before its own people could reach it and
     not one guard ever landed a blow. A garrison sends people; it does not
     fire. */
  town();
  place('garrison',52,48); recompute();
  S.day=nextNight(1); S.dayT=NIGHT;
  advanceSiege(0.1,note);
  militia().length=0;                       // the building, and nobody in it
  let u=0; while(horde().length&&u<600){ advanceSiege(0.05,note); u++; }
  check('a garrison with nobody out of it kills nothing by itself',
    siegeSnapshot().killed===0,siegeSnapshot().killed);
  // They hold their own quarter rather than the whole valley.
  /* The leash. This has to prove two things at once, and the first draft only
     proved the second: that there was genuinely something out beyond the
     quarter worth chasing, and that nobody went after it. Without the first
     half the check passed with the leash deleted, because in that fixture
     nothing ever strayed far enough to tempt anybody. */
  town({homes:30});
  place('garrison',44,48); recompute();
  S.day=nextNight(1); S.dayT=NIGHT;
  advanceSiege(0.1,note);
  const G={x:44,y:48}, far=(o)=>Math.max(Math.abs(o.fx-G.x),Math.abs(o.fy-G.y));
  let tempted=0,strayed=0,v=0;
  while(horde().length&&v<3000){
    advanceSiege(0.05,note); v++;
    tempted=Math.max(tempted,...horde().map(far));
    strayed=Math.max(strayed,0,...militia().map(far));
  }
  check('fixture: there was something well outside the quarter to be drawn to',
    tempted>MILITIA_LEASH+4,tempted.toFixed(1));
  check('and they were not drawn past it',strayed<=MILITIA_LEASH+2,
    strayed.toFixed(1)+' vs leash '+MILITIA_LEASH);
  /* Where the leash actually decides something: a garrison parked away from
     the homes. Its people hold the ground they were given and the town is
     somebody else's problem — so a garrison in the wrong place is money spent
     on nothing, which is the point of being able to place it. */
  town({homes:30});
  place('garrison',70,58); recompute();
  for(let d=0;d<160;d++){ S.day++; for(let s=0;s<8;s++){ S.dayT=s/8+0.01; evaluateFamilies(note); evaluateCareers(note); } }
  S.dayT=DAY_T; recompute();
  check('fixture: it is parked well away from any home',
    S.ctx.houses.every(h=>Math.max(Math.abs(h.x-70),Math.abs(h.y-58))>MILITIA_LEASH),
    Math.min(...S.ctx.houses.map(h=>Math.max(Math.abs(h.x-70),Math.abs(h.y-58)))));
  const parked=runNight();
  check('a garrison in the wrong place defends nothing',parked.killed===0&&parked.lost+parked.damaged>0,
    JSON.stringify({killed:parked.killed,lost:parked.lost,damaged:parked.damaged}));
}

/* ---------- going out is not free ---------- */
{
  town({homes:30});
  place('garrison',52,48); recompute();
  for(let d=0;d<160;d++){ S.day++; for(let s=0;s<8;s++){ S.dayT=s/8+0.01; evaluateFamilies(note); evaluateCareers(note); } }
  S.dayT=DAY_T; recompute();
  /* One night is a coin flip, so this runs a season of them: over that many
     fights somebody has to come off worse, or the watch is free and a garrison
     would simply be better than a tower at everything. */
  let hurt=0,nights=0,kills=0;
  for(let n=0;n<8;n++){
    const r=runNight();
    hurt+=r.hurt|0; kills+=r.killed|0; nights++;
    // put the town back on its feet between nights so the fixture keeps its shape
    for(const h of S.ctx.houses){ h.pop=5; h.mood=70; }
    recompute();
  }
  check('fixture: there were real fights across the season',kills>=10,kills+' over '+nights+' nights');
  check('and going out costs the watch something',hurt>0,hurt+' hurt over '+kills+' fights');
  check('a hurt guard is out of the night rather than dead',
    ledger().filter(e=>e.type==='militia_hurt').length>0
    &&!ledger().some(e=>e.type==='death'&&e.cause==='the watch'));
}

/* ---------- a garrison is not enough on its own ---------- */
{
  /* The shape the whole purchase depends on: a watch helps and does not hold.
     If this ever inverts, one of the two buildings has become ornamental. */
  town({homes:30});
  const bare=runNight();
  town({homes:30});
  place('garrison',52,48); recompute();
  for(let d=0;d<160;d++){ S.day++; for(let s=0;s<8;s++){ S.dayT=s/8+0.01; evaluateFamilies(note); evaluateCareers(note); } }
  S.dayT=DAY_T; recompute();
  const watched=runNight();
  check('fixture: the same night came for both towns',bare.came===watched.came,bare.came+' / '+watched.came);
  check('a garrison brings some of them down where nothing did',
    watched.killed>0&&bare.killed===0,bare.killed+' -> '+watched.killed);
  check('and the town pays less for the night than it would have',
    watched.lost+watched.damaged<bare.lost+bare.damaged,
    (bare.lost+bare.damaged)+' -> '+(watched.lost+watched.damaged));
  check('but a garrison alone does not hold a town, which is what towers are for',
    watched.lost+watched.damaged>0,JSON.stringify({lost:watched.lost,damaged:watched.damaged}));
  town({homes:30});
  place('garrison',52,48); recompute();
  for(const x of [38,42,46,50,54,58,62,66]) place('watchtower',x,47);
  recompute();
  const full=runNight();
  check('and a town that bought both holds',full.lost===0&&full.killed>=watched.killed,
    JSON.stringify({killed:full.killed,lost:full.lost,damaged:full.damaged}));
}

/* ---------- dawn ---------- */
{
  town();
  S.day=nextNight(1); S.dayT=NIGHT;
  advanceSiege(0.1,note);
  check('fixture: a night is running',siegeState().active&&horde().length>0);
  S.dayT=DAY_T;                       // morning
  advanceSiege(0.1,note);
  check('daylight ends it and clears the street',!siegeState().active&&horde().length===0);
  check('and a night that has ended does not start again the same day',(()=>{
    advanceSiege(0.1,note); return horde().length===0; })());
}

/* ---------- what a death costs, everywhere it is filed ---------- */
{
  town();
  const f=families()[0];
  f.careers={0:'baker',1:'teacher',2:'musician',3:'farmer',4:'shopkeeper'};
  fame().push({familyId:f.id,index:2,renown:2.4,career:'musician',since:10,peak:2.4});
  aliases().push({familyId:f.id,index:2,alias:'Encore',origin:'career',visibility:'public',since:20,why:'known'});
  aliases().push({familyId:f.id,index:4,alias:'Loaves',origin:'career',visibility:'district',since:22,why:'known'});
  organisations().push({id:99,name:'Fern Hollow Network',roots:f.roots,stage:4,founded:10,families:[f.id],
    fronts:[],boss:{familyId:f.id,index:2},exposed:false});
  const before=familyMembers(f).map(m=>m.index+':'+m.name);
  check('fixture: a household of five, one of them employed, famous and nicknamed',
    before.length===5&&f.careers[2]==='musician',before.join(' '));
  const home=S.ctx.houses.find(h=>(h.seed>>>0)===(f.homeSeed>>>0));
  const popBefore=home.pop;
  const gone=takeLife(f,2,{cause:'the siege'});
  check('somebody is lost, by name',gone&&gone.name===before[2].split(':')[1],gone&&gone.name);
  check('and the household is one smaller',home.pop===popBefore-1,popBefore+' -> '+home.pop);
  /* The whole reason this is one function: a person is (homeSeed, index), and
     everything about them is filed under that index. */
  const after=familyMembers(f);
  check('everybody else keeps the index their life is filed under',
    before.filter((_,i)=>i!==2).every(x=>after.some(m=>m.index+':'+m.name===x)),
    after.map(m=>m.index+':'+m.name).join(' '));
  check('so nobody is renumbered into a dead person’s trade',
    f.careers[3]==='farmer'&&f.careers[4]==='shopkeeper'&&f.careers[2]===undefined,
    JSON.stringify(f.careers));
  check('the valley stops talking about them',!fame().some(r=>r.familyId===f.id&&r.index===2));
  check('the name the street gave them goes with them',
    !aliases().some(a=>a.familyId===f.id&&a.index===2));
  check('and nobody else’s nickname goes with it',
    aliases().some(a=>a.familyId===f.id&&a.index===4));
  check('anything they were said to run has to find somebody else',
    organisations().find(o=>o.id===99)?.boss===null);
  check('it is written down as a death, with what survives them',(()=>{
    const e=ledger().find(x=>x.type==='death');
    return e&&e.name===gone.name&&e.alias==='Encore'&&e.survivors===4&&e.cause==='the siege'; })(),
    JSON.stringify(ledger().find(x=>x.type==='death')));
  check('and they are recorded as lost, so it cannot happen to them twice',
    isLost(f,2)&&takeLife(f,2,{cause:'the siege'})===null);
  check('the dead can still be spoken of by name afterwards',
    memberEver(f,2)?.name===gone.name,memberEver(f,2)?.name);
  /* A home that grows again takes on somebody new, not the person back. */
  const n=deathsSoFar();
  home.pop++; recompute();
  check('a household that grows again gains a new person, not the old one back',
    !familyMembers(f).some(m=>m.index===2)&&familyMembers(f).length===5&&deathsSoFar()===n,
    familyMembers(f).map(m=>m.index).join(','));
}

/* ---------- the paper ---------- */
{
  town();
  const f=families()[0];
  aliases().push({familyId:f.id,index:1,alias:'Ropes',origin:'career',visibility:'public',since:20,why:'known'});
  aliases().push({familyId:f.id,index:0,alias:'Quiet',origin:'reputation',visibility:'district',since:20,why:'known'});
  const one=takeLife(f,1,{cause:'the siege'});
  const two=takeLife(f,0,{cause:'the siege'});
  const issue=composeIssue(S.day);
  const text=JSON.stringify(issue);
  check('the paper prints the dead by name',text.includes(one.name)&&text.includes(two.name),
    issue.lead.headline);
  check('and uses a nickname only when the street already used it',
    text.includes('Ropes')&&!text.includes('Quiet'),
    (text.match(/Ropes|Quiet/g)||[]).join(','));
  check('a death is worth the front page',/HAS DIED/.test(issue.lead.headline),issue.lead.headline);
  /* The rule the Post was built on. It used to read "there is no death
     mechanic so there are no deaths", and the siege made that false — but the
     rule it protected did not change: printed only when the simulation
     recorded one. */
  town();
  const quiet=JSON.stringify(composeIssue(S.day));
  check('a day nobody died prints no obituary',!/HAS DIED|died on/.test(quiet),
    JSON.parse(quiet).lead.headline);
  town();
  const r=runNight();
  const night=composeIssue(S.day);
  const nightText=JSON.stringify(night);
  check('a night is the lead the morning after',/NIGHT|VALLEY|ATTACKED/.test(night.lead.headline),night.lead.headline);
  check('and the paper reports the night’s own numbers, not rounder ones',
    !r.lost||nightText.includes(String(r.lost)),r.lost+' / '+night.lead.body);
  check('a night nobody was hurt in says so rather than reaching for drama',
    r.lost>0||/nobody was hurt|No home was reached/i.test(nightText),night.lead.body);
}

/* ---------- the sink, and the save ---------- */
{
  town();
  const bare=upkeepTotal();
  place('garrison',64,50); recompute();
  const withG=upkeepTotal();
  for(const x of [44,48,52,56,58]) place('watchtower',x,47);
  recompute();
  const withT=upkeepTotal();
  check('a garrison is a standing bill, not a one-off purchase',withG>bare+40,bare+' -> '+withG);
  check('and every tower adds to it',withT>withG+30,withG+' -> '+withT);
  check('so defending a big town costs real money every day',withT-bare>=80,withT-bare);
  runNight();
  save();
  const raw=JSON.parse(store.get(KEY));
  check('the watch is saved like any other building',
    raw.b.some(x=>x.type==='garrison')&&raw.b.filter(x=>x.type==='watchtower').length===5);
  /* The night itself is not. It is transient by design: a save mid-siege loads
     into the morning after rather than dropping the player back into it. */
  check('but the night is not, and neither is anything standing in it',
    raw.horde===undefined&&raw.siege===undefined&&!JSON.stringify(raw).includes('"atDoor"'),
    Object.keys(raw).join(','));
  check('and who was lost is saved, because that does not un-happen',(()=>{
    const f=families()[0]; takeLife(f,0,{cause:'the siege'}); save();
    const r2=JSON.parse(store.get(KEY));
    return (r2.social.families.find(x=>x.id===f.id)?.lost||[]).includes(0); })());
  applySave(JSON.parse(store.get(KEY)));
  check('a loaded town remembers its dead',deathsSoFar()>0,deathsSoFar());
  check('and loads into a quiet morning',horde().length===0&&!siegeState().active);
  // A save that claims losses it never had is not trusted.
  const mangled=JSON.parse(store.get(KEY));
  for(const f of mangled.social.families) f.lost=[0,0,1,99,-3];
  applySave(mangled);
  check('a save cannot invent people to have lost',
    families().every(f=>lostOf(f).every(i=>i>=0&&i<5)&&new Set(lostOf(f)).size===lostOf(f).length),
    JSON.stringify(families().map(f=>lostOf(f))));
}

const failed=checks.filter(c=>!c.pass);
document.getElementById('results').textContent=JSON.stringify({pass:!failed.length,checks},null,2);
document.documentElement.dataset.result=failed.length?'fail':'pass';
