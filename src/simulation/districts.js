import { H, W, clamp, hash2 } from '../core/constants.js';
import { S } from '../core/state.js';
import { isFacilityPart, isType, isWater } from '../world/tiles.js';
import { getBuildingDefinition } from '../buildings/registry.js';

/* ============================================================
   DISTRICTS — the city's own neighbourhoods

   Meadowline has never had neighbourhoods, only a grid of buildings. A player
   who lays farms along the north edge and shops around a market has built two
   very different places and the game had no word for either.

   Districts are derived. The player cannot draw one, name one, merge one or
   tell one what it is. They come out of where the buildings actually are and
   what divides them - water and rail divide a real neighbourhood, so they
   divide these - and they are re-derived when the city changes rather than
   every frame.

   The permanent rule for everything in this file:

     THE PLAYER BUILDS THE CITY. THE CITIZENS DECIDE WHAT THE CITY BECOMES.

   Nothing here is exported as a setter. There is deliberately no way to assign
   an identity from outside, and the regression asserts the exported surface
   stays that way.
   ============================================================ */

/* Coarse cells rather than tiles. A neighbourhood is a block of streets, not a
   square metre, and 16x16 cells over the valley is 256 things to look at
   instead of 16,384. */
const CELL=8, CW=Math.ceil(W/CELL), CH=Math.ceil(H/CELL);
// Below this a cluster is outskirts, not a district worth naming.
const MIN_BUILDINGS=6;
// Bounded, per the milestone's performance rules.
export const MAX_DISTRICTS=24;
// How far a district's middle may drift between recomputes and still be
// recognised as the same place. A neighbourhood that grows keeps its name.
const MATCH_DISTANCE=14;

// Roads and rail are what connect a district, not what fills it. Trees and
// lamps are scenery. Neither makes a patch of meadow into a neighbourhood.
const NOT_DEVELOPMENT=new Set(['road','rail','tree','lamp']);

const SECTOR={
  farm:'agriculture',mill:'agriculture',
  cafe:'trade',market:'trade',bakery:'trade',generalStore:'trade',teaHouse:'trade',bookshop:'trade',vendor:'trade',
  school:'civic',cityHall:'civic',policeStation:'civic',fireStation:'civic',clinic:'civic',hospital:'civic',
  station:'transport',dock:'transport',
  park:'recreation',pocketPark:'recreation',playground:'recreation',picnicGreen:'recreation',sportsCourt:'recreation',townPark:'recreation',buskerPitch:'recreation',
  statue:'landmark',clockTower:'landmark',lighthouse:'landmark',greatLibrary:'landmark',
  house:'homes'
};

/* Names for places, not for people. The pool is grounded in Meadowline's
   register so a district sounds like somewhere in this valley, and the draw is
   seeded from the world and the district's anchor, so the same city always
   names the same corner the same way. */
const NAMES=['Willow Grove','Old Wharf','Mill Quarter','Lantern Row','Station Ward','North Fields',
  'Market Hill','Southbank','Meadowline Heights','Riverside','Cobb End','Thistle Green',
  'Hollow Bank','Bramble Reach','The Warrens','Fern Hollow','Larkspur','Damson Vale',
  'Sparrow Hill','Yarrow Bend','Quarry Side','Harrow Cross','Pennyfield','Elder Row',
  'Kiln Bank','Alder Quarter','Wren Meadow','Saltings'];

/* ---------- what a district can be ----------
   Every identity needs at least two independent conditions. That is the
   mechanism and not a guideline: `need` is checked against how many of the
   listed conditions hold, so a one-condition identity cannot be reached.

   The negative rules matter more than the positive ones. There is no path in
   this table from "poor" to "criminal". Struggling is not a crime identity and
   does not lead to one; a struggling place is far likelier to be read as
   close-knit, which is the reading it usually deserves. The two criminal
   identities require an organisation that actually exists in that district -
   they report something, they never infer it from hardship. In a town with
   no organisation `d.organisations` is 0 and both are unreachable, which the
   regression asserts; organisations.js says what it takes for one to exist. */
export const IDENTITIES=[
  {id:'agricultural',label:'Agricultural',need:2,when:d=>[d.farms>=2,d.sector.agriculture>=2,d.density<0.35]},
  {id:'waterfront',label:'Working Waterfront',need:2,when:d=>[d.docks>=1,d.waterEdge,d.sector.transport>=1]},
  {id:'family',label:'Family-Oriented',need:2,when:d=>[d.homes>=8,d.recreationReach>=1,d.schools>=1,d.avgMood>=68]},
  {id:'suburban',label:'Suburban',need:2,when:d=>[d.homes>=8,d.density<0.5,d.avgDesirability>=52]},
  {id:'affluent',label:'Affluent',need:2,when:d=>[d.avgDesirability>=70,d.tier3>=Math.max(2,d.homes*0.35),d.avgEducation>=45]},
  {id:'workingClass',label:'Working Class',need:2,when:d=>[d.homes>=6,d.tier1>=d.homes*0.5,d.jobs>=6]},
  {id:'commercial',label:'Commercial',need:2,when:d=>[d.sector.trade>=3,d.tradeJobs>=12,d.markets>=1]},
  {id:'civic',label:'Civic',need:2,when:d=>[d.sector.civic>=2,d.civicJobs>=10]},
  {id:'academic',label:'Academic',need:2,when:d=>[d.schools>=1,d.avgEducation>=42,d.homes>=6]},
  {id:'transit',label:'Transit-Oriented',need:2,when:d=>[d.stations>=1,d.roadTiles>=24]},
  {id:'parkland',label:'Green',need:2,when:d=>[d.sector.recreation>=2,d.recreationCapacity>=30]},
  {id:'landmark',label:'Historic',need:2,when:d=>[d.sector.landmark>=1,d.buildings>=12]},
  /* Opportunity is local and real: the jobs standing in this district against
     the workers living in it, counted the way employment.js counts them. */
  {id:'opportunity',label:'High Opportunity',need:2,when:d=>[d.jobs>=d.workers*1.2,d.jobs>=8,d.homes>=4]},
  {id:'struggling',label:'Struggling',need:3,when:d=>[d.homes>=6,d.jobs<d.workers*0.5,d.avgDesirability<38,d.recreationReach===0]},
  {id:'closeKnit',label:'Close-Knit',need:2,when:d=>[d.homes>=6,d.avgMood>=62,d.density>=0.5]},
  /* Culture, read from what stands there and who works there. Three of four
     for Entertainment, so a row of cafés on a long street is a commercial
     strip until there is somewhere to perform or someone performing. */
  {id:'entertainment',label:'Entertainment',need:3,when:d=>[d.cafes>=3,d.sector.recreation+d.sector.landmark>=1,d.performers>=1,d.stations>=1||d.roadTiles>=20]},
  {id:'nightlife',label:'Nightlife',need:2,when:d=>[d.cafes>=3&&d.lamps>=4,d.celebrities>=1,d.performers>=2]},
  // Reported, never inferred. Both require an organisation to exist here.
  {id:'criminalInfluence',label:'Criminal Influence',need:2,when:d=>[d.organisations>=1,d.unresolvedCrime>=1]},
  {id:'stronghold',label:'Organized Crime Stronghold',need:2,when:d=>[d.organisations>=1,d.organisationStrength>=3]}
];
const CRIMINAL=new Set(['criminalInfluence','stronghold']);
export function isCriminalIdentity(id){ return CRIMINAL.has(id); }
// A district wears at most two. More than that reads as a list, not a place.
const MAX_IDENTITIES=2;

let dirty=true, generation=0, built=-1, districts=[];

export function invalidateDistricts(){
  dirty=true; generation++;
  if(S.diagnostics) S.diagnostics.districtInvalidations=(S.diagnostics.districtInvalidations||0)+1;
}

function ensureSocial(){
  if(!S.social||typeof S.social!=='object') S.social={districts:[]};
  if(!Array.isArray(S.social.districts)) S.social.districts=[];
  return S.social;
}

/* ---------- barriers ----------
   Two developed cells are one neighbourhood unless something real stands
   between them. Water and rail are what split a town in half; a road is what
   joins it, so a road is never a barrier. */
function edgeBlocked(ax,ay,bx,by){
  let blocked=0,total=0;
  for(let k=0;k<CELL;k++){
    const a=ax===bx?{x:ax*CELL+k,y:ay*CELL+(ay<by?CELL-1:0)}:{x:ax*CELL+(ax<bx?CELL-1:0),y:ay*CELL+k};
    const b=ax===bx?{x:bx*CELL+k,y:by*CELL+(by<ay?CELL-1:0)}:{x:bx*CELL+(bx<ax?CELL-1:0),y:by*CELL+k};
    if(a.x>=W||a.y>=H||b.x>=W||b.y>=H) continue;
    total++;
    const cut=t=>isWater(t.x,t.y)||isType(t.x,t.y,'rail');
    if(cut(a)||cut(b)) blocked++;
  }
  return total>0&&blocked/total>=0.75;
}

function districtName(anchorX,anchorY,taken){
  const start=Math.abs(Math.floor(hash2(anchorX,anchorY,S.seed>>>0)*NAMES.length))%NAMES.length;
  for(let i=0;i<NAMES.length;i++){
    const name=NAMES[(start+i)%NAMES.length];
    if(!taken.has(name)) return name;
  }
  return 'Meadowline '+(taken.size+1);
}

/* ---------- deriving the districts ---------- */
function derive(){
  const parent=new Int16Array(CW*CH).fill(-1), count=new Uint16Array(CW*CH);
  const buildingsByCell=new Map();
  for(const b of S.grid||[]){
    if(!b||isFacilityPart(b)||NOT_DEVELOPMENT.has(b.type)) continue;
    const ci=((b.y/CELL)|0)*CW+((b.x/CELL)|0);
    count[ci]++;
    if(!buildingsByCell.has(ci)) buildingsByCell.set(ci,[]);
    buildingsByCell.get(ci).push(b);
  }
  const find=i=>{ while(parent[i]!==i) i=parent[i]=parent[parent[i]]; return i; };
  for(let i=0;i<parent.length;i++) if(count[i]) parent[i]=i;
  for(let cy=0;cy<CH;cy++) for(let cx=0;cx<CW;cx++){
    const i=cy*CW+cx; if(!count[i]) continue;
    for(const [dx,dy] of [[1,0],[0,1]]){
      const nx=cx+dx,ny=cy+dy; if(nx>=CW||ny>=CH) continue;
      const j=ny*CW+nx; if(!count[j]) continue;
      if(edgeBlocked(cx,cy,nx,ny)) continue;
      const a=find(i),b=find(j); if(a!==b) parent[a]=b;
    }
  }
  const groups=new Map();
  for(const [ci,list] of buildingsByCell){
    const rootCell=find(ci);
    if(!groups.has(rootCell)) groups.set(rootCell,[]);
    groups.get(rootCell).push(...list);
  }
  return [...groups.values()].filter(list=>list.length>=MIN_BUILDINGS);
}

/* ---------- what is actually here ---------- */
function measure(list){
  const d={buildings:list.length,homes:0,pop:0,jobs:0,tradeJobs:0,civicJobs:0,farms:0,docks:0,markets:0,
    schools:0,stations:0,roadTiles:0,tier1:0,tier3:0,recreationCapacity:0,recreationReach:0,
    sector:{agriculture:0,trade:0,civic:0,transport:0,recreation:0,landmark:0,homes:0},
    organisations:0,organisationStrength:0,unresolvedCrime:0,cafes:0,lamps:0,performers:0,celebrities:0,
    minX:W,maxX:0,minY:H,maxY:0};
  let desirability=0,education=0,mood=0,homesWithMood=0,recSat=0;
  for(const b of list){
    d.minX=Math.min(d.minX,b.x); d.maxX=Math.max(d.maxX,b.x);
    d.minY=Math.min(d.minY,b.y); d.maxY=Math.max(d.maxY,b.y);
    const sector=SECTOR[b.type]; if(sector) d.sector[sector]++;
    if(b.type==='house'){
      d.homes++; d.pop+=b.pop|0;
      const tier=Math.max(1,Math.min(3,Math.floor(Number(b.state?.housingTier)||1)));
      if(tier===1) d.tier1++; if(tier===3) d.tier3++;
      desirability+=Number(b.state?.desirability)||0;
      education+=Number(b.state?.education)||0;
      recSat+=Number(b.state?.recreationSatisfaction)||0;
      mood+=Number(b.mood)||0; homesWithMood++;
    }
    if(b.type==='cafe') d.cafes++;
    if(b.type==='lamp') d.lamps++;
    if(b.type==='farm') d.farms++;
    if(b.type==='dock') d.docks++;
    if(b.type==='market') d.markets++;
    if(b.type==='school') d.schools++;
    if(b.type==='station') d.stations++;
  }
  // Jobs standing here, read from the registry rather than invented.
  for(const b of list){
    const def=getBuildingDefinition(b.type),jobs=def?.jobs||0;
    d.jobs+=jobs;
    if(SECTOR[b.type]==='trade'||SECTOR[b.type]==='agriculture') d.tradeJobs+=jobs;
    if(SECTOR[b.type]==='civic') d.civicJobs+=jobs;
    if(def?.service?.type==='recreation') d.recreationCapacity+=def.service.capacity||0;
  }
  d.avgDesirability=d.homes?Math.round(desirability/d.homes):0;
  d.avgEducation=d.homes?Math.round(education/d.homes):0;
  d.avgMood=homesWithMood?Math.round(mood/homesWithMood):0;
  // Workers counted the way employment.js counts them, so the local reading and
  // the citywide one cannot disagree about what a worker is.
  d.workers=Math.floor(d.pop*0.58);
  d.recreationReach=d.homes?Math.round(recSat/d.homes):0;
  d.recreationReach=d.recreationReach>0?1:0;
  const w=d.maxX-d.minX+1,h=d.maxY-d.minY+1;
  d.area=Math.max(1,w*h);
  d.density=clamp(d.buildings/d.area,0,1);
  for(let y=d.minY;y<=d.maxY;y++) for(let x=d.minX;x<=d.maxX;x++) if(isType(x,y,'road')) d.roadTiles++;
  d.waterEdge=false;
  for(let y=d.minY-1;y<=d.maxY+1&&!d.waterEdge;y++) for(let x=d.minX-1;x<=d.maxX+1;x++)
    if(isWater(x,y)){ d.waterEdge=true; break; }
  // A tagged incident is one the police raised themselves; it is not a crime
  // nobody has resolved, and must not feed the conditions it exists to press.
  for(const inc of S.incidents||[]) if(!inc.resolved&&inc.kind==='crime'&&!inc.tag&&inc.target&&
    inc.target.x>=d.minX&&inc.target.x<=d.maxX&&inc.target.y>=d.minY&&inc.target.y<=d.maxY) d.unresolvedCrime++;
  /* Who performs here and who is known for it, read as plain data off the
     family and fame records (careers.js and fame.js import this module, so it
     cannot import them). The list of performing trades is theirs; the fame
     regression asserts this copy matches it. */
  const byHome=new Map(); for(const f of S.social?.families||[]) byHome.set(f.homeSeed>>>0,f);
  for(const b of list){
    if(b.type!=='house') continue;
    const f=byHome.get(b.seed>>>0); if(!f) continue;
    for(const c of Object.values(f.careers||{})) if(PERFORMING.has(c)) d.performers++;
    for(const r of S.social?.fame||[]) if(r.familyId===f.id&&r.renown>=2) d.celebrities++;
  }
  d.cx=Math.round((d.minX+d.maxX)/2); d.cy=Math.round((d.minY+d.maxY)/2);
  return d;
}
const PERFORMING=new Set(['musician','performer','artist']);

/* Every reading a district qualifies for, before the two-label cap. The cap can
   hide a label rather than prevent it, which is a false comfort in a safeguard:
   a criminal identity squeezed out by a better-supported one is still one the
   rules allowed. The regression asserts against this, not against what is
   displayed - it caught exactly that hole when it was written. */
export function districtIdentityCandidates(measured){
  const held=[];
  for(const identity of IDENTITIES){
    const met=identity.when(measured).reduce((n,c)=>n+(c?1:0),0);
    if(met>=identity.need) held.push({id:identity.id,label:identity.label,met});
  }
  // The best-supported readings win, and the order is stable so the same city
  // does not shuffle its own labels between frames.
  held.sort((a,b)=>(b.met-a.met)||a.id.localeCompare(b.id));
  return held;
}
function identitiesFor(measured){
  return districtIdentityCandidates(measured).slice(0,MAX_IDENTITIES);
}

export function recomputeDistricts(){
  if(!dirty&&built===generation) return districts;
  dirty=false; built=generation;
  const social=ensureSocial();
  const groups=derive().slice(0,MAX_DISTRICTS);
  const previous=social.districts.slice();
  const claimed=new Set();
  const taken=new Set();
  const next=[];
  for(const list of groups){
    const m=measure(list);
    /* A neighbourhood that grows, or swallows the one next to it, is still the
       same neighbourhood. Matching on where its middle sits keeps the name it
       has had since it was four houses and a road. */
    let match=null,best=MATCH_DISTANCE+1;
    for(const p of previous){
      if(claimed.has(p.id)) continue;
      const dist=Math.abs(p.cx-m.cx)+Math.abs(p.cy-m.cy);
      if(dist<best){ best=dist; match=p; }
    }
    if(match) claimed.add(match.id);
    const name=match?match.name:districtName(m.cx,m.cy,taken);
    taken.add(name);
    /* Organisations are read here as plain data rather than through the
       organisations module, which imports this one. A district counts the
       organisations rooted in it and takes the strongest stage as its
       strength; both are inputs to the criminal identities, which is what
       keeps those readings unreachable in a town that has none. */
    for(const o of social.organisations||[]){
      if(!o||o.roots!==name) continue;
      m.organisations++; m.organisationStrength=Math.max(m.organisationStrength,o.stage|0);
    }
    next.push({
      id:match?match.id:(social.nextId=(social.nextId||0)+1),
      name,cx:m.cx,cy:m.cy,born:match?match.born:(S.day||1),
      identities:match?match.identities||[]:[],
      bounds:{minX:m.minX,maxX:m.maxX,minY:m.minY,maxY:m.maxY},
      measured:m
    });
  }
  // Names already in use stay in use; a second district cannot steal one.
  for(const d of next) taken.add(d.name);
  social.districts=next.map(d=>({id:d.id,name:d.name,cx:d.cx,cy:d.cy,born:d.born,identities:d.identities}));
  districts=next;
  if(S.diagnostics){
    S.diagnostics.districts=districts.length;
    S.diagnostics.districtRecomputes=(S.diagnostics.districtRecomputes||0)+1;
  }
  return districts;
}

/* ---------- identity, on its own slow clock ----------
   What a place is changes over months, not frames, so it is re-read on a slow
   cadence. Identity can be lost exactly as easily as it was gained: nothing
   here is sticky, and a district that stops meeting the conditions stops
   holding the label. */
let identityClock=0;
export const IDENTITY_INTERVAL=20;
export function advanceDistricts(dt,onChange){
  identityClock+=dt;
  if(identityClock<IDENTITY_INTERVAL) return;
  identityClock=0;
  evaluateDistrictIdentities(onChange);
}
export function evaluateDistrictIdentities(onChange){
  const list=recomputeDistricts();
  const social=ensureSocial();
  for(let i=0;i<list.length;i++){
    const d=list[i];
    const held=identitiesFor(d.measured);
    const before=(d.identities||[]).map(x=>x.id).join(',');
    const after=held.map(x=>x.id).join(',');
    if(before===after) continue;
    d.identities=held;
    if(social.districts[i]) social.districts[i].identities=held;
    if(S.diagnostics) S.diagnostics.districtIdentityChanges=(S.diagnostics.districtIdentityChanges||0)+1;
    if(typeof onChange==='function') onChange(d,held,before);
  }
  if(S.diagnostics) S.diagnostics.districtIdentityEvaluations=(S.diagnostics.districtIdentityEvaluations||0)+1;
}

export function districts_(){ return districts; }
export function districtAt(x,y){
  for(const d of recomputeDistricts()){
    const b=d.bounds;
    if(x>=b.minX&&x<=b.maxX&&y>=b.minY&&y<=b.maxY) return d;
  }
  return null;
}
export function districtSnapshot(){
  const list=recomputeDistricts();
  return {
    count:list.length,
    named:list.map(d=>d.name),
    identified:list.filter(d=>(d.identities||[]).length).length,
    // Always zero until the organisation slice lands. Reported rather than
    // hidden, so the number is honest about what the simulation holds.
    criminal:list.filter(d=>(d.identities||[]).some(i=>CRIMINAL.has(i.id))).length
  };
}

/* ---------- save ----------
   Only the durable truth: which places exist, what they are called, when they
   appeared and what they are currently read as. Boundaries and every measured
   figure are derived on load from the city itself. */
export function packSocial(){
  const social=ensureSocial();
  return {
    nextId:social.nextId||0,
    districts:social.districts.slice(0,MAX_DISTRICTS).map(d=>({
      id:d.id|0,name:String(d.name||'').slice(0,40),cx:d.cx|0,cy:d.cy|0,born:Math.max(1,d.born|0),
      identities:(d.identities||[]).slice(0,MAX_IDENTITIES).map(i=>({id:String(i.id).slice(0,32),label:String(i.label).slice(0,40),met:i.met|0}))
    }))
  };
}
export function restoreSocial(raw){
  const valid=new Set(IDENTITIES.map(i=>i.id));
  const social=ensureSocial();
  social.districts=[]; social.nextId=0;
  if(raw&&typeof raw==='object'){
    social.nextId=Math.max(0,Math.floor(Number(raw.nextId)||0));
    const list=Array.isArray(raw.districts)?raw.districts.slice(0,MAX_DISTRICTS):[];
    for(const d of list){
      if(!d||typeof d!=='object') continue;
      if(!Number.isFinite(d.cx)||!Number.isFinite(d.cy)) continue;
      social.districts.push({
        id:Math.max(0,Math.floor(Number(d.id)||0)),
        name:String(d.name||'').slice(0,40)||'Meadowline',
        cx:clamp(Math.floor(d.cx),0,W-1),cy:clamp(Math.floor(d.cy),0,H-1),
        born:Math.max(1,Math.floor(Number(d.born)||1)),
        // An identity this build does not know about is dropped rather than
        // trusted, so an edited save cannot invent a label.
        identities:(Array.isArray(d.identities)?d.identities:[]).filter(i=>i&&valid.has(i.id))
          .slice(0,MAX_IDENTITIES).map(i=>({id:i.id,label:String(i.label||i.id).slice(0,40),met:Math.max(0,Math.floor(Number(i.met)||0))}))
      });
    }
  }
  districts=[]; invalidateDistricts();
}
