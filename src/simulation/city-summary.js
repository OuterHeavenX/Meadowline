import { S } from '../core/state.js';
import { cityStage, developmentStats, LAND_PARCELS, nextStageProgress, parcelStatus } from '../progression/city-growth.js';
import { goalAt } from './wishes.js';

let cache=null, signature='';
function sig(){
  const last=S.lastPay||{};
  return [S.pop,S.homes,S.mood,S.coins,S.day,S.cityProgress?.stage,S.cityProgress?.mode,(S.cityProgress?.unlockedParcels||[]).join(','),S.wishes?.map(w=>w.k+':'+goalAt(w)+':'+w.g).join('|'),S.services?.education?.metrics?.served,S.services?.education?.metrics?.demand,last.tax,last.trade,last.milled].join(';');
}
function count(type){ let n=0; for(const b of S.grid||[]) if(b?.type===type) n++; return n; }
function hall(){ return (S.grid||[]).find(b=>b?.type==='cityHall')||null; }
function education(){
  const schools=(S.grid||[]).filter(b=>b?.type==='school');
  const metrics=S.services?.education?.metrics||{};
  return {schools:schools.length,level2:schools.filter(b=>(b.state?.level||1)>=2).length,served:metrics.served||0,demand:metrics.demand||0,waiting:Math.max(0,(metrics.demand||0)-(metrics.served||0))};
}
export function invalidateCitySummary(){ signature=''; if(S.diagnostics) S.diagnostics.citySummaryInvalidations=(S.diagnostics.citySummaryInvalidations||0)+1; }
export function getCitySummary(){
  const nextSig=sig();
  if(cache&&signature===nextSig) return cache;
  signature=nextSig;
  const dev=developmentStats();
  const h=hall();
  const opened=S.cityProgress?.mode==='legacy-open'?LAND_PARCELS.length:(S.cityProgress?.unlockedParcels?.length||1);
  const parcels=LAND_PARCELS.map(p=>parcelStatus(p.id)).filter(Boolean);
  const available=parcels.filter(p=>p.state==='available');
  const last=S.lastPay||{};
  cache={
    hall:{exists:!!h,level:h?Math.max(1,Math.min(4,Math.floor(Number(h.state?.level)||1))):0,count:count('cityHall')},
    overview:{stage:cityStage().name,population:S.pop||0,homes:dev.homes,occupiedHomes:dev.occupiedHomes,cottages:Math.max(0,dev.homes-dev.townHomes),townHomes:dev.townHomes,establishedHomes:dev.establishedHomes,mood:S.mood||0,education:dev.averageEducation,desirability:dev.averageDesirability,coins:Math.floor(S.coins||0)},
    goals:(S.wishes||[]).map(w=>({id:w.k,slot:w.slot,label:w.t,current:goalAt(w),target:w.g,reward:w.r})),
    growth:{stage:cityStage().name,next:nextStageProgress()},
    land:{opened,total:LAND_PARCELS.length,available:available.map(x=>({id:x.parcel.id,name:x.parcel.name,cost:x.parcel.cost,canUnlock:x.canUnlock})),parcels},
    finances:{treasury:Math.floor(S.coins||0),residentialTax:last.tax??null,trade:last.trade??null,milling:last.milled??null,grant:last.grant??null,total:last.total??null},
    services:{education:education()}
  };
  if(S.diagnostics) S.diagnostics.citySummaryRecomputes=(S.diagnostics.citySummaryRecomputes||0)+1;
  return cache;
}
