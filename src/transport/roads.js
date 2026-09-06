import { DIRS, H, W } from '../core/constants.js';
import { S } from '../core/state.js';
import { footprintCells, idx, inBounds, isType } from '../world/tiles.js';

/* ---------- shared street-network helpers ---------- */
export function roadNear(x,y){
  for(const[dx,dy]of DIRS) if(isType(x+dx,y+dy,"road")) return {x:x+dx,y:y+dy};
  return null;
}

/* The same question asked of a whole building rather than of one tile.
   roadNear() looks at the four neighbours of the anchor tile, which is the
   entire story for a cottage and wrong for everything bigger: a 2x3 Fire
   Station or a 3x3 Hospital with a street running along its far side was
   told no road reached it, because the street never touched the one corner
   tile being asked about. Every tile of the footprint has a frontage. */
export function roadNearFacility(b){
  if(!b) return null;
  for(const c of footprintCells(b.type,b.x,b.y))
    for(const[dx,dy]of DIRS) if(isType(c.x+dx,c.y+dy,"road")) return {x:c.x+dx,y:c.y+dy};
  return null;
}

export function roadTiles(){
  const out=[];
  for(let y=0;y<H;y++) for(let x=0;x<W;x++) if(isType(x,y,'road')){
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
