import { H, W } from '../core/constants.js';
import { S } from '../core/state.js';

export const CITY_STAGES=Object.freeze([
  {id:1,key:'settlement',name:'Settlement'},
  {id:2,key:'village',name:'Village'},
  {id:3,key:'township',name:'Township'},
  {id:4,key:'growing-town',name:'Growing Town'}
]);

export const LAND_PARCELS=Object.freeze([
  {id:'center',name:'Meadowline Center',x:12,y:12,w:20,h:20,starting:true,cost:0,stage:1,requires:[]},
  {id:'north',name:'North Meadow',x:12,y:0,w:20,h:12,cost:320,stage:2,requires:['center']},
  {id:'east',name:'East Meadow',x:32,y:12,w:12,h:20,cost:360,stage:2,requires:['center']},
  {id:'south',name:'South Meadow',x:12,y:32,w:20,h:12,cost:420,stage:3,requires:['center']},
  {id:'west',name:'West Meadow',x:0,y:12,w:12,h:20,cost:380,stage:3,requires:['center']},
  {id:'northwest',name:'Northwest Fields',x:0,y:0,w:12,h:12,cost:520,stage:4,requires:['north','west']},
  {id:'northeast',name:'Northeast Fields',x:32,y:0,w:12,h:12,cost:540,stage:4,requires:['north','east']},
  {id:'southwest',name:'Southwest Fields',x:0,y:32,w:12,h:12,cost:560,stage:4,requires:['south','west']},
  {id:'southeast',name:'Southeast Fields',x:32,y:32,w:12,h:12,cost:580,stage:4,requires:['south','east']}
]);

export const BUILDING_STAGE=Object.freeze({
  road:1,house:1,cafe:1,park:1,tree:1,lamp:1,cityHall:1,
  school:2,market:2,bakery:2,
  rail:3,station:3,mill:3,
  dock:4
});

export const STAGE_REQUIREMENTS=Object.freeze({
  2:{required:[{id:'population',label:'Grow to 16 residents',metric:'population',atLeast:16},{id:'occupiedHomes',label:'Fill 4 homes',metric:'occupiedHomes',atLeast:4},{id:'roads',label:'Lay 10 road tiles',metric:'roads',atLeast:10}],any:[]},
  3:{required:[{id:'population',label:'Grow to 30 residents',metric:'population',atLeast:30},{id:'occupiedHomes',label:'Fill 7 homes',metric:'occupiedHomes',atLeast:7}],any:[{count:2,items:[{id:'education',label:'Average Education 8+',metric:'averageEducation',atLeast:8},{id:'townHomes',label:'Develop 2 Town Homes',metric:'townHomes',atLeast:2},{id:'desirability',label:'Average Desirability 42+',metric:'averageDesirability',atLeast:42}]}]},
  4:{required:[{id:'population',label:'Grow to 48 residents',metric:'population',atLeast:48},{id:'occupiedHomes',label:'Fill 10 homes',metric:'occupiedHomes',atLeast:10},{id:'townHomes',label:'Develop 4 Town Homes',metric:'townHomes',atLeast:4},{id:'establishedHomes',label:'Develop 1 Established Home',metric:'establishedHomes',atLeast:1}],any:[{count:2,items:[{id:'education',label:'Average Education 18+',metric:'averageEducation',atLeast:18},{id:'studentsServed',label:'Serve 8 students',metric:'studentsServed',atLeast:8},{id:'desirability',label:'Average Desirability 50+',metric:'averageDesirability',atLeast:50}]}]}
});

function cleanUnlocked(list){ const valid=new Set(LAND_PARCELS.map(p=>p.id)); const out=[]; for(const id of Array.isArray(list)?list:[]) if(valid.has(id)&&!out.includes(id)) out.push(id); if(!out.includes('center')) out.unshift('center'); return out; }
export function createProgression(mode='parcel'){ return {mode:mode==='legacy-open'?'legacy-open':'parcel',stage:mode==='legacy-open'?4:1,unlockedParcels:mode==='legacy-open'?LAND_PARCELS.map(p=>p.id):['center'],claimedMilestones:[]}; }
export function sanitizeProgression(raw,legacyFallback=false){ if(!raw||typeof raw!=='object') return createProgression(legacyFallback?'legacy-open':'parcel'); const mode=raw.mode==='legacy-open'?'legacy-open':'parcel'; const stage=Math.max(1,Math.min(4,Math.floor(Number(raw.stage)||1)); return {mode,stage:mode==='legacy-open'?4:stage,unlockedParcels:mode==='legacy-open'?LAND_PARCELS.map(p=>p.id):cleanUnlocked(raw.unlockedParcels),claimedMilestones:Array.isArray(raw.claimedMilestones)?raw.claimedMilestones.filter(x=>typeof x==='string').slice(0,32):[]}; }
export function resetProgression(mode='parcel'){ S.cityProgress=sanitizeProgression(createProgression(mode)); }
export function cityStage(){ return CITY_STAGES[(S.cityProgress?.stage||1)-1]||CITY_STAGES[0]; }
export function isLegacyOpen(){ return S.cityProgress?.mode==='legacy-open'; }
export function parcelAt(x,y){ return LAND_PARCELS.find(p=>x>=p.x&&x<p.x+p.w&&y>=p.y&&y<p.y+p.h)||null; }
export function isParcelUnlocked(id){ return isLegacyOpen()||(S.cityProgress?.unlockedParcels||[]).includes(id); }
export function isTileUnlocked(x,y){ if(x<0||y<0||x>=W||y>=H) return false; if(isLegacyOpen()) return true; const p=parcelAt(x,y); return !!p&&isParcelUnlocked(p.id); }
export function isFootprintUnlocked(x,y,w=1,h=1){ for(let yy=y;yy<y+h;yy++) for(let xx=x;xx<x+w;xx++) if(!isTileUnlocked(xx,yy)) return false; return true; }
export function isBuildingUnlocked(type){ return isLegacyOpen()||(S.cityProgress?.stage||1)>=(BUILDING_STAGE[type]||1); }
export function buildingUnlockStage(type){ return BUILDING_STAGE[type]||1; }
export function developmentStats(){ const houses=(S.ctx?.houses||[]); let occupiedHomes=0,townHomes=0,establishedHomes=0,desirabilityTotal=0,educationTotal=0; for(const h of houses){ if((h.pop||0)>0) occupiedHomes++; const tier=Math.max(1,Math.floor(Number(h.state?.housingTier)||1)); if(tier>=2) townHomes++; if(tier>=3) establishedHomes++; desirabilityTotal+=Number(h.state?.desirability)||0; educationTotal+=Number(h.state?.education)||0; } let roads=0; for(const b of S.grid||[]) if(b?.type==='road') roads++; return {population:S.pop||0,homes:houses.length,occupiedHomes,townHomes,establishedHomes,roads,averageEducation:houses.length?Math.round(educationTotal/houses.length):0,averageDesirability:houses.length?Math.round(desirabilityTotal/houses.length):0,studentsServed:S.services?.education?.metrics?.served||0}; }
function check(item,stats){ const value=Number(stats[item.metric])||0; return {...item,value,met:value>=item.atLeast}; }
export function stageProgress(targetStage,stats=developmentStats()){ const def=STAGE_REQUIREMENTS[targetStage]; if(!def) return {complete:true,required:[],any:[]}; const required=def.required.map(r=>check(r,stats)); const any=def.any.map(g=>{ const items=g.items.map(r=>check(r,stats)); return {...g,items,met:items.filter(i=>i.met).length>=g.count}; }); return {complete:required.every(r=>r.met)&&any.every(g=>g.met),required,any}; }
export function evaluateCityGrowth(){ if(isLegacyOpen()) return {stageChanged:false,stage:4}; if(!S.cityProgress) resetProgression('parcel'); const before=S.cityProgress.stage; let next=before+1; while(next<=4&&stageProgress(next).complete){ S.cityProgress.stage=next; next++; } if(S.diagnostics) S.diagnostics.progressionRecomputes=(S.diagnostics.progressionRecomputes||0)+1; return {stageChanged:S.cityProgress.stage!==before,from:before,stage:S.cityProgress.stage}; }
export function parcelStatus(id){ const parcel=LAND_PARCELS.find(p=>p.id===id); if(!parcel) return null; if(isParcelUnlocked(id)) return {parcel,state:'unlocked',canUnlock:false}; const stageOk=(S.cityProgress?.stage||1)>=parcel.stage; const prereqOk=parcel.requires.every(isParcelUnlocked); const coinsOk=S.coins>=parcel.cost; return {parcel,state:stageOk&&prereqOk?'available':'locked',stageOk,prereqOk,coinsOk,canUnlock:stageOk&&prereqOk&&coinsOk}; }
export function unlockParcel(id){ if(isLegacyOpen()) return {ok:false,why:'This legacy city already has full land access.'}; const st=parcelStatus(id); if(!st||st.state==='unlocked') return {ok:false,why:'That land is already open.'}; if(!st.stageOk) return {ok:false,why:'Reach '+CITY_STAGES[st.parcel.stage-1].name+' first.'}; if(!st.prereqOk) return {ok:false,why:'Open the neighboring land first.'}; if(!st.coinsOk) return {ok:false,why:'You need '+st.parcel.cost+' coins to open this land.'}; S.coins-=st.parcel.cost; S.cityProgress.unlockedParcels=cleanUnlocked([...(S.cityProgress.unlockedParcels||[]),id]); if(S.diagnostics) S.diagnostics.parcelUnlocks=(S.diagnostics.parcelUnlocks||0)+1; return {ok:true,parcel:st.parcel}; }
export function nextStageProgress(){ const current=S.cityProgress?.stage||1; return current>=4?null:{stage:CITY_STAGES[current],progress:stageProgress(current+1)}; }
