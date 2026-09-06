import { S } from '../core/state.js';
import { carrying } from '../rendering/interaction-state.js';
import { canPlace, canRelocate, isMovable } from './buildings.js';
import { getBuildingDefinition } from './registry.js';
import { facilityRootAt, footprintCells, idx, inBounds } from '../world/tiles.js';

/* What the tile under the pointer would become, as tiles and a yes/no. Both
   renderers drew this themselves and had drifted apart on the details; a
   third tool would have made it three. */
export function toolPreview(tool,x,y){
  if(!inBounds(x,y)) return null;
  const i=idx(x,y);
  if(tool==='relocate'){
    if(carrying.on){
      const held=facilityRootAt(carrying.x,carrying.y);
      if(!held) return null;
      // The footprint is drawn where it would land, so a 3x3 shows the ground
      // it needs before it is set down rather than after.
      return {cells:footprintCells(held.type,x,y),ok:canRelocate(held,x,y).ok};
    }
    const root=facilityRootAt(x,y);
    if(!root||!isMovable(root)) return null;
    return {cells:footprintCells(root.type,root.x,root.y),ok:true};
  }
  if(tool==='erase') return {cells:[{x,y}],ok:!!S.grid[i]||!!S.natTree[i]};
  if(tool==='water') return {cells:[{x,y}],ok:!S.grid[i]&&S.terr[i]!==1};
  const def=getBuildingDefinition(tool);
  return {cells:def?footprintCells(tool,x,y):[{x,y}],ok:canPlace(tool,x,y).ok};
}
