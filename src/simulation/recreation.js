import { getBuildingDefinition } from '../buildings/registry.js';
import { clamp } from '../core/constants.js';
import { S } from '../core/state.js';
import { findPath } from '../transport/pathfinding.js';
import { roadNear } from '../transport/roads.js';
import { facilityFootprint, footprintCells, idx, inBounds, isFacilityPart, isType } from '../world/tiles.js';

let dirty=true;
let lastPopulationSignature='';
const connectivityCache=new Map();

/* ---------- how much a public space is worth ----------
   Registry `quality` existed from the start but only ever broke ties when
   sorting candidate facilities, so it never reached the player: a resident
   served by a 1x1 Pocket Green got exactly the mood and desirability of one
   served by a 4x4 Town Park. That made the legacy tile strictly dominant and
   left the five facilities Recreation 2.0 added with no mechanical reason to
   exist.

   The factor scales the existing bounded contributions rather than adding to
   them, so the documented maxima (+12 Mood, +6 Desirability) still stand and
   are simply earned by better public space. Housing thresholds, capacities,
   tax multipliers, timers and the non-downgrade rule are untouched. */
export const RECREATION_QUALITY_FLOOR=0.7;
export function recreationQualityFactor(quality){
  return clamp(RECREATION_QUALITY_FLOOR+((Number(quality)||1)-1)*0.6,RECREATION_QUALITY_FLOOR,1);
}

function key(x,y){ return x+','+y; }
function providerKey(b){ return key(b.x,b.y); }
function houseKey(h){ return key(h.x,h.y); }
function walkable(x,y){ return isType(x,y,'road'); }
function isRecreation(b){ return !!b&&!isFacilityPart(b)&&getBuildingDefinition(b.type)?.service?.type==='recreation'; }

export function invalidateRecreation(){
  dirty=true;
  connectivityCache.clear();
  if(S.diagnostics) S.diagnostics.recreationInvalidations=(S.diagnostics.recreationInvalidations||0)+1;
}

export function recreationFacilities(){
  const out=[];
  for(const b of S.grid||[]) if(isRecreation(b)) out.push(b);
  return out;
}

function perimeterEntrances(root){
  const fp=facilityFootprint(root), found=new Map();
  for(let dy=0;dy<fp[1];dy++) for(let dx=0;dx<fp[0];dx++){
    if(dx!==0&&dy!==0&&dx!==fp[0]-1&&dy!==fp[1]-1) continue;
    const x=root.x+dx,y=root.y+dy;
    for(const [ox,oy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const rx=x+ox,ry=y+oy;
      if(!inBounds(rx,ry)||!isType(rx,ry,'road')) continue;
      const k=key(rx,ry);
      if(!found.has(k)) found.set(k,{x:rx,y:ry,facilityX:x,facilityY:y});
    }
  }
  return [...found.values()].sort((a,b)=>(a.y-b.y)||(a.x-b.x));
}

export function recreationEntrance(root){
  return root?perimeterEntrances(root)[0]||null:null;
}

function distanceToFacility(h,root){
  const [w,hgt]=facilityFootprint(root);
  const dx=h.x<root.x?root.x-h.x:h.x>root.x+w-1?h.x-(root.x+w-1):0;
  const dy=h.y<root.y?root.y-h.y:h.y>root.y+hgt-1?h.y-(root.y+hgt-1):0;
  return Math.max(dx,dy);
}

function routeAccess(h,root,entrances){
  if(!h.linked||!entrances.length) return null;
  const hr=roadNear(h.x,h.y); if(!hr) return null;
  for(const e of entrances){
    const ck=hr.x+','+hr.y+'>'+e.x+','+e.y;
    if(connectivityCache.has(ck)){
      if(connectivityCache.get(ck)) return e;
      continue;
    }
    if(S.diagnostics) S.diagnostics.recreationRouteSearches=(S.diagnostics.recreationRouteSearches||0)+1;
    const p=findPath(hr.x,hr.y,e.x,e.y,walkable);
    const ok=!!p&&(p.length>0||(hr.x===e.x&&hr.y===e.y));
    connectivityCache.set(ck,ok);
    if(ok) return e;
    if(S.diagnostics) S.diagnostics.recreationRouteFailures=(S.diagnostics.recreationRouteFailures||0)+1;
  }
  return null;
}

function populationSignature(homes){
  return homes.map(h=>h.x+','+h.y+':'+(h.pop|0)+':'+(h.linked?1:0)).join('|');
}

function ensureState(){
  if(!S.services) S.services={};
  if(!S.services.recreation) S.services.recreation={providers:{},assignments:{},metrics:{facilities:0,demand:0,served:0,capacity:0,underserved:0,activeVisitors:0}};
  return S.services.recreation;
}

function refreshVisitorCounts(svc){
  const providers=svc.providers||{};
  for(const p of Object.values(providers)) p.visitors=0;
  let active=0;
  for(const c of S.citizens||[]){
    if(!c.recreationRoot||!c.facilityLocal) continue;
    const p=providers[key(c.recreationRoot.x,c.recreationRoot.y)];
    if(p){ p.visitors++; active++; }
  }
  svc.metrics.activeVisitors=active;
  if(S.diagnostics) S.diagnostics.recreationVisitors=active;
  return active;
}

export function recomputeRecreation(force=false){
  const svc=ensureState();
  const homes=(S.ctx?.houses||[]).filter(h=>(h.pop|0)>0);
  const popSig=populationSignature(homes);
  if(!force&&!dirty&&popSig===lastPopulationSignature){
    // Visitor count is transient even while service assignment is cached.
    refreshVisitorCounts(svc);
    return svc;
  }
  dirty=false; lastPopulationSignature=popSig;

  const facilities=recreationFacilities();
  const providers={};
  for(const root of facilities){
    const def=getBuildingDefinition(root.type), meta=def.service||{};
    const entrances=perimeterEntrances(root);
    providers[providerKey(root)]={
      root,type:root.type,name:def.name,capacity:Math.max(0,meta.capacity|0),radius:Math.max(0,meta.radius|0),quality:Number(meta.quality)||1,
      entrances,entrance:entrances[0]||null,demand:0,served:0,visitors:0,connected:entrances.length>0
    };
  }

  const candidatesByHome=new Map();
  for(const h of homes){
    const candidates=[];
    for(const p of Object.values(providers)){
      const dist=distanceToFacility(h,p.root);
      if(dist>p.radius) continue;
      const entry=routeAccess(h,p.root,p.entrances);
      if(!entry) continue;
      p.demand+=h.pop|0;
      candidates.push({p,dist,entry});
    }
    candidates.sort((a,b)=>(a.dist-b.dist)||(b.p.quality-a.p.quality)||(a.p.root.y-b.p.root.y)||(a.p.root.x-b.p.root.x));
    candidatesByHome.set(h,candidates);
  }

  const assignments={};
  // Larger households allocate first, then stable map order. Capacity is still
  // aggregate residents, not one representative actor per person.
  const ordered=[...homes].sort((a,b)=>((b.pop|0)-(a.pop|0))||(a.y-b.y)||(a.x-b.x));
  let demand=0,served=0;
  for(const h of ordered){
    const hd=Math.max(0,h.pop|0); demand+=hd;
    let remaining=hd,hs=0,qualitySum=0;
    const used=[];
    for(const c of candidatesByHome.get(h)||[]){
      if(remaining<=0) break;
      const spare=Math.max(0,c.p.capacity-c.p.served);
      if(!spare) continue;
      const take=Math.min(remaining,spare);
      c.p.served+=take; hs+=take; remaining-=take;
      // Weighted by the places actually taken, so a household drawing on one
      // good park and one poor one lands between the two.
      qualitySum+=take*c.p.quality;
      used.push({key:providerKey(c.p.root),served:take,entry:c.entry});
    }
    served+=hs;
    const satisfaction=hd?Math.round(clamp(hs/hd,0,1)*100):100;
    const quality=hs?qualitySum/hs:0;
    if(!h.state||typeof h.state!=='object') h.state={};
    h.state.recreationSatisfaction=satisfaction;
    // Quality is derived from the registry every pass, so it is deliberately
    // not persisted: no save field, no migration.
    assignments[houseKey(h)]={house:h,demand:hd,served:hs,satisfaction,quality,providers:used,nearest:(candidatesByHome.get(h)||[])[0]?.p||null};
  }

  const capacity=Object.values(providers).reduce((n,p)=>n+p.capacity,0);
  svc.providers=providers;
  svc.assignments=assignments;
  svc.metrics={facilities:facilities.length,demand,served,capacity,underserved:Math.max(0,demand-served),activeVisitors:0};
  const activeVisitors=refreshVisitorCounts(svc);

  if(S.diagnostics){
    S.diagnostics.recreationRecomputes=(S.diagnostics.recreationRecomputes||0)+1;
    S.diagnostics.recreationFacilities=facilities.length;
    S.diagnostics.recreationDemand=demand;
    S.diagnostics.recreationServed=served;
    S.diagnostics.recreationVisitors=activeVisitors;
    S.diagnostics.multiTileFacilities=facilities.filter(f=>{const fp=facilityFootprint(f);return fp[0]*fp[1]>1;}).length;
    S.diagnostics.occupiedFacilityTiles=facilities.reduce((n,f)=>{const fp=facilityFootprint(f);return n+fp[0]*fp[1];},0);
  }
  return svc;
}

export function recreationAssignment(h){
  recomputeRecreation();
  return S.services?.recreation?.assignments?.[houseKey(h)]||{house:h,demand:Math.max(0,h?.pop|0),served:0,satisfaction:0,quality:0,providers:[],nearest:null};
}

export function recreationStatus(h){
  const a=recreationAssignment(h), sat=a.satisfaction||0;
  // An empty home has no service to judge, so it keeps the contribution it has
  // always had rather than being scaled by a quality it never received.
  const factor=a.demand&&a.served?recreationQualityFactor(a.quality):1;
  const base={satisfaction:sat,assignment:a,quality:a.quality||0,qualityFactor:factor};
  if(!a.demand) return {label:'No demand yet',detail:'This home is empty.',...base,satisfaction:100,qualityFactor:1};
  if(sat>=90) return {label:'Excellent Recreation',detail:'Nearby public space has comfortable room.',...base};
  if(sat>=65) return {label:'Good Recreation',detail:'Nearby recreation is serving most residents.',...base};
  if(sat>=35) return {label:'Limited Recreation',detail:'Nearby recreation is crowded or only partly available.',...base};
  if(a.nearest) return {label:'Poor Recreation',detail:'A nearby facility exists, but access or capacity is limited.',...base};
  return {label:'No Recreation access',detail:'No connected public recreation space is within walking reach.',...base,satisfaction:0};
}

export function recreationFacilityStats(root){
  recomputeRecreation();
  return S.services?.recreation?.providers?.[providerKey(root)]||null;
}

export function recreationSnapshot(){
  recomputeRecreation();
  return {...(S.services?.recreation?.metrics||{})};
}

export function recreationDestinationForCitizen(c){
  if(!c?.home) return null;
  const h=S.grid?.[idx(c.home.x,c.home.y)];
  if(!h||h.type!=='house'||!(h.pop>0)) return null;
  const a=recreationAssignment(h);
  if(!a.providers?.length) return null;
  // Prefer facilities with fewer people currently inside relative to capacity,
  // while using only providers that genuinely serve this household.
  const ranked=a.providers.map(u=>{
    const p=S.services.recreation.providers[u.key];
    return p?{p,u,score:(p.visitors+1)/Math.max(1,p.capacity)}:null;
  }).filter(Boolean).sort((a,b)=>a.score-b.score);
  const chosen=ranked[0];
  if(!chosen) return null;
  return {root:chosen.p.root,entry:chosen.u.entry||chosen.p.entrance};
}

export function recreationLocalPoint(root,serial=0){
  if(!root) return null;
  const cells=footprintCells(root.type,root.x,root.y);
  if(!cells.length) return null;
  const c=cells[Math.abs(serial|0)%cells.length];
  // Fractional tile coordinates are render-only local leisure positions. They
  // never enter the global Road pathfinder.
  const offsets=[[0.18,0.12],[-0.16,0.14],[0.1,-0.15],[-0.12,-0.1]];
  const o=offsets[Math.abs(serial|0)%offsets.length];
  return {x:c.x+o[0],y:c.y+o[1]};
}
