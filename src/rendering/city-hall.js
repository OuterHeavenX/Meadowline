import { P, TAU, TW, TH, shade } from '../core/constants.js';
import { S } from '../core/state.js';
import { box, diamond, g, lights, snowCap } from './terrain.js';
import { PAL } from '../world/seasons.js';

function shadow(x,y,z){ g.fillStyle='rgba(30,50,40,.18)'; g.beginPath(); g.ellipse(x,y+2*z,22*z,10*z,0,0,TAU); g.fill(); }
function roof(x,topY,scale,z,color,raise=0){
  const hw=TW/2*scale*z,hh=TH/2*scale*z;
  g.fillStyle=color;
  g.beginPath(); g.moveTo(x,topY-hh-raise*z); g.lineTo(x+hw,topY-raise*z); g.lineTo(x,topY+hh-raise*z); g.lineTo(x-hw,topY-raise*z); g.closePath(); g.fill();
}
function clock(x,y,z){
  g.fillStyle='#f4f0e2'; g.beginPath(); g.arc(x,y,3.4*z,0,TAU); g.fill();
  g.strokeStyle='#45534d'; g.lineWidth=.8*z; g.beginPath(); g.moveTo(x,y); g.lineTo(x,y-2*z); g.moveTo(x,y); g.lineTo(x+1.8*z,y+.6*z); g.stroke();
}
function flag(x,y,z){
  g.strokeStyle='#59675f'; g.lineWidth=.9*z; g.beginPath(); g.moveTo(x,y); g.lineTo(x,y-12*z); g.stroke();
  g.fillStyle='#d3897c'; g.beginPath(); g.moveTo(x,y-12*z); g.lineTo(x+8*z,y-9.5*z); g.lineTo(x,y-7*z); g.closePath(); g.fill();
}

export function drawCityHall(b,p,dark){
  const z=S.cam.z;
  const level=Math.max(1,Math.min(4,Math.floor(Number(b.state?.level)||1)));
  const scale=[0,.72,.78,.84,.9][level];
  const height=[0,14,18,22,26][level];
  shadow(p.x,p.y,z);
  diamond(p.x,p.y,0.96); g.fillStyle=level>=3?'#d8cfb7':'#ddd2b8'; g.fill();
  const topY=box(p.x,p.y,scale,height,'#efe5cf','#b9aa8d','#d7c6a7');
  roof(p.x,topY,scale,z,level>=3?'#637f95':'#7890a2');
  snowCap(p.x,topY,scale);
  const hw=TW/2*scale*z;

  // A broad central entrance and symmetrical windows read at phone zoom.
  g.fillStyle='#715d4b';
  g.fillRect(p.x-3*z,p.y-8*z,6*z,8*z);
  const windows=level===1?2:level===2?3:4;
  for(let i=0;i<windows;i++){
    const t=windows===1?.5:i/(windows-1);
    const wx=p.x-hw*.62+t*hw*1.24;
    if(Math.abs(wx-p.x)<5*z) continue;
    g.fillStyle='rgba(112,141,153,.68)'; g.fillRect(wx-1.8*z,p.y-(9+level)*z,3.6*z,4.5*z);
    if(dark>.1) lights.push({x:wx-1.8*z,y:p.y-(9+level)*z,w:3.6*z,h:4.5*z,big:level>=3});
  }

  // Stone steps grow slightly with the building rather than expanding footprint.
  g.fillStyle=shade(P.stone,-8);
  g.fillRect(p.x-7*z,p.y+1*z,14*z,2*z);
  if(level>=2) g.fillRect(p.x-9*z,p.y+3*z,18*z,2*z);

  if(level>=2){
    const towerY=topY-(level===2?8:12)*z;
    g.fillStyle='#e9ddc5'; g.fillRect(p.x-4*z,towerY,8*z,(level===2?9:13)*z);
    g.fillStyle=level>=3?'#536f86':'#6c8395';
    g.beginPath(); g.moveTo(p.x-5*z,towerY); g.lineTo(p.x+5*z,towerY); g.lineTo(p.x,towerY-7*z); g.closePath(); g.fill();
    if(level>=3) clock(p.x,towerY+4*z,z);
    if(level>=4) flag(p.x,towerY-7*z,z);
  }else{
    // Town Office uses a simple civic sign/flag shape instead of a tower.
    flag(p.x+hw*.45,topY-1*z,z*.75);
  }

  if(level>=4){
    // Two planters make the mature level visibly landscaped without becoming a service bonus.
    for(const sx of [-1,1]){
      const px=p.x+sx*13*z,py=p.y+1*z;
      g.fillStyle='#92765b'; g.fillRect(px-2.5*z,py-2*z,5*z,2.5*z);
      g.fillStyle=PAL.leaf||'#5f9350'; g.beginPath(); g.arc(px,py-4*z,3*z,0,TAU); g.fill();
    }
  }
}
