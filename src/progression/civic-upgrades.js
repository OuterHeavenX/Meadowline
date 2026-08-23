import { getBuildingDefinition, getUpgradeDefinition } from '../buildings/registry.js';
import { S } from '../core/state.js';
import { invalidateServices, recomputeServices } from '../simulation/civic-services.js';

export function civicUpgradeStatus(building){
  if(!building) return {available:false,reason:'No civic building selected.'};
  const def=getBuildingDefinition(building.type);
  const level=Math.max(1,Math.floor(Number(building.state?.level)||1));
  const next=getUpgradeDefinition(building.type,level+1);
  if(!def?.upgrades||!next) return {available:false,maxed:true,level};
  const stage=S.cityProgress?.stage||1;
  const stageOk=stage>=(next.requiresStage||1)||S.cityProgress?.mode==='legacy-open';
  const coinsOk=S.coins>=next.cost;
  return {available:stageOk&&coinsOk,level,next,stageOk,coinsOk,reason:!stageOk?'Reach the required city stage first.':!coinsOk?'Not enough coins yet.':''};
}

export function upgradeCivic(building){
  const st=civicUpgradeStatus(building);
  if(!st.available) return {ok:false,why:st.reason||'No upgrade is available.'};
  S.coins-=st.next.cost;
  if(!building.state||typeof building.state!=='object') building.state={};
  building.state.level=st.next.level;
  invalidateServices();
  recomputeServices(true);
  if(S.diagnostics) S.diagnostics.schoolUpgrades=(S.diagnostics.schoolUpgrades||0)+(building.type==='school'?1:0);
  return {ok:true,upgrade:st.next};
}
