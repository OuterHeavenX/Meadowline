import { DIRS } from '../core/constants.js';
import { isType } from '../world/tiles.js';

/* ---------- citizens ---------- */
export function roadNear(x,y){
  for(const[dx,dy]of DIRS) if(isType(x+dx,y+dy,"road")) return {x:x+dx,y:y+dy};
  return null;
}
