import { DIRS } from '../core/constants.js';
import { S } from '../core/state.js';
import { idx, inBounds, isType } from '../world/tiles.js';

/* ---------- shared street-network helpers ---------- */
export function roadNear(x,y){
  for(const[dx,dy]of DIRS) if(isType(x+dx,y+dy,"road")) return {x:x+dx,y:y+dy};
  return null;
}

export function roadTiles(){
  const out=[];
  for(let y=0;y<44;y++) for(let x=0;x<44;x++) if(isType(x,y,'road')){
    const b=S.grid[idx(x,y)];
    out.push({x,y,b});
  }
  return out;
}

export function roadNeighbors(x,y){
  const out=[];
  for(const[dx,dy] of DIRS) if(isType(x+dx,y+dy,'road')) out.push([x+dx,y+dy]);
  return out;
}

export function roadDegree(x,y){ return roadNeighbors(x,y).length; }

export function connectedRoadComponents(){
  const seen=new Set(), components=[];
  for(const r of roadTiles()){
    const key=r.x+','+r.y;
    if(seen.has(key)) continue;
    const q=[[r.x,r.y]], part=[]; seen.add(key);
    for(let head=0;head<q.length;head++){
      const[x,y]=q[head]; part.push({x,y});
      for(const[nx,ny] of roadNeighbors(x,y)){
        const k=nx+','+ny; if(seen.has(k)) continue;
        seen.add(k); q.push([nx,ny]);
      }
    }
    components.push(part);
  }
  return components.sort((a,b)=>b.length-a.length);
}

export function validRoadTile(x,y){ return inBounds(x,y)&&isType(x,y,'road'); }
