import { P, shade } from '../core/constants.js';
import { S } from '../core/state.js';
import { box, g, lights } from './terrain.js';
import { groundShadow } from './buildings.js';
import { proj } from '../world/map.js';

export function drawMunicipalBuilding(b,dark){
  const p=proj(b.x,b.y),z=S.cam.z,fp=b.type==='hospital'?[3,3]:b.type==='fireStation'?[2,3]:[2,2];
  groundShadow(p.x,p.y,24*z,12*z,.2); const color=b.type==='policeStation'?'#557da0':b.type==='fireStation'?'#b85a4e':'#e7e4d8';
  const top=box(p.x,p.y,Math.min(1.35,.62+.13*(fp[0]+fp[1])),17,shade(color,8),shade(color,-38),shade(color,-18));
  g.fillStyle=shade(color,-12); g.fillRect(p.x-13*z,top-5*z,26*z,5*z);
  if(b.type==='fireStation'){g.fillStyle='#7d332f';for(const x of[-9,0,9])g.fillRect(p.x+x*z-3*z,top-3*z,6*z,7*z);}
  if(b.type==='policeStation'){g.fillStyle='#244b70';g.fillRect(p.x-11*z,top-3*z,8*z,6*z);g.fillRect(p.x+3*z,top-3*z,8*z,6*z);}
  g.fillStyle=b.type==='fireStation'?'#f0d6c8':b.type==='policeStation'?'#dce8ef':'#c94e4e';
  if(b.type==='clinic'||b.type==='hospital'){g.fillRect(p.x-2*z,top-13*z,4*z,12*z);g.fillRect(p.x-6*z,top-9*z,12*z,4*z);}else g.fillRect(p.x-8*z,top-11*z,16*z,5*z);
  if(dark>.12) lights.push({x:p.x-8*z,y:top-5*z,w:16*z,h:4*z,big:true});
}

export function drawIncident(inc){
  if(inc.status==='CLEARED')return; const p=proj(inc.target.x,inc.target.y),z=S.cam.z,bob=Math.sin(S.t*4+inc.id)*2*z,working=inc.status==='WORKING';
  if(inc.kind==='fire'&&!inc.resolved){const fade=working?.55:1;for(let i=0;i<5;i++){const t=(S.t*.35+i*.19)%1;g.fillStyle=`rgba(76,78,75,${(1-t)*.34*fade})`;g.beginPath();g.arc(p.x+Math.sin(i*4.2)*5*z,p.y-16*z-t*32*z,(4+t*7)*z,0,Math.PI*2);g.fill();}for(let i=0;i<3;i++){const a=S.t*5+i*2;g.fillStyle=i%2?'#ffb54f':'#e65c38';g.beginPath();g.moveTo(p.x+(i-1)*5*z,p.y-7*z);g.quadraticCurveTo(p.x+(i-1)*5*z+Math.sin(a)*5*z,p.y-22*z,p.x+(i-1)*5*z+2*z,p.y-10*z);g.fill();}}
  if(inc.kind==='crime'&&!inc.resolved){const run=inc.status==='EN_ROUTE'?Math.sin(S.t*5)*7*z:0;g.fillStyle='#34383b';g.beginPath();g.arc(p.x+run,p.y-12*z,3*z,0,Math.PI*2);g.fill();g.fillRect(p.x-2*z+run,p.y-9*z,4*z,8*z);g.strokeStyle='#e8e0cd';g.lineWidth=z;g.beginPath();g.moveTo(p.x-2*z+run,p.y-12*z);g.lineTo(p.x+2*z+run,p.y-12*z);g.stroke();}
  if(working&&inc.kind==='fire'){const v=(S.serviceVehicles||[]).find(x=>x.incidentId===inc.id),vp=v?proj(v.x,v.y):p;g.strokeStyle='rgba(160,220,244,.8)';g.lineWidth=2*z;g.beginPath();g.moveTo(vp.x,vp.y-5*z);g.quadraticCurveTo((vp.x+p.x)/2,p.y-24*z,p.x,p.y-9*z);g.stroke();}
  g.fillStyle=inc.kind==='fire'?'#ef6a3d':inc.kind==='crime'?'#596071':'#e7ecec';g.strokeStyle='rgba(35,40,38,.55)';g.lineWidth=z;
  g.beginPath();g.arc(p.x,p.y-34*z+bob,7*z,0,Math.PI*2);g.fill();g.stroke();
  g.fillStyle=inc.kind==='medical'?'#c84d55':'#fff';g.font=`bold ${9*z}px system-ui`;g.textAlign='center';g.fillText(inc.resolved?'✓':inc.kind==='fire'?'!':inc.kind==='crime'?'!':'+',p.x,p.y-31*z+bob);
}
