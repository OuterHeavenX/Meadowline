import { getBuildingDefinition } from '../buildings/registry.js';
import { S } from '../core/state.js';
import { isFacilityPart } from '../world/tiles.js';

export function recomputeEmployment(){
  const workers=Math.floor((S.pop||0)*0.58);
  let jobs=0;
  for(const b of S.grid||[]){ if(!b||isFacilityPart(b)) continue; jobs+=getBuildingDefinition(b.type)?.jobs||0; }
  const employed=Math.min(workers,jobs),unemployed=Math.max(0,workers-employed);
  const rate=workers?employed/workers:1;
  const prosperity=Math.round(Math.max(20,Math.min(100,45+rate*45+(S.mood-50)*0.1)));
  S.municipal.employment={workers,jobs,employed,unemployed,prosperity};
  return S.municipal.employment;
}
