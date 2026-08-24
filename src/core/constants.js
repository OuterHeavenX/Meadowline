import { buildingToolDefinitions } from '../buildings/registry.js';

/* ---------- tiny utilities ---------- */
export const clamp=(v,a,b)=>v<a?a:v>b?b:v;
export const lerp=(a,b,t)=>a+(b-a)*t;
export const TAU=Math.PI*2;

// value noise on a hashed lattice
export function hash2(x,y,s){
  let h=Math.imul(x|0,374761393)+Math.imul(y|0,668265263)+Math.imul(s|0,1442695041);
  h=Math.imul(h^(h>>>13),1274126177);
  return((h^(h>>>16))>>>0)/4294967296;
}
export function smooth(t){return t*t*(3-2*t);}
export function noise2(x,y,s){
  const xi=Math.floor(x),yi=Math.floor(y),xf=smooth(x-xi),yf=smooth(y-yi);
  const a=hash2(xi,yi,s),b=hash2(xi+1,yi,s),c=hash2(xi,yi+1,s),d=hash2(xi+1,yi+1,s);
  return lerp(lerp(a,b,xf),lerp(c,d,xf),yf);
}
export function fbm(x,y,s){return noise2(x,y,s)*0.6+noise2(x*2.1,y*2.1,s+31)*0.3+noise2(x*4.3,y*4.3,s+77)*0.1;}

export function shade(hex,amt){
  const n=parseInt(hex.slice(1),16);
  let r=(n>>16)&255,gg=(n>>8)&255,b=n&255;
  r=clamp(Math.round(r+amt),0,255); gg=clamp(Math.round(gg+amt),0,255); b=clamp(Math.round(b+amt),0,255);
  return "rgb("+r+","+gg+","+b+")";
}

export function mix(h1,h2,t){
  const a=parseInt(h1.slice(1),16),b=parseInt(h2.slice(1),16);
  const r=Math.round(lerp((a>>16)&255,(b>>16)&255,t));
  const gg=Math.round(lerp((a>>8)&255,(b>>8)&255,t));
  const bb=Math.round(lerp(a&255,b&255,t));
  return "#"+(((1<<24)|(r<<16)|(gg<<8)|bb).toString(16).slice(1));
}

/* ---------- constants ---------- */
export const W=44,H=44;
export const TW=64,TH=32;
export const DAY=100;
export const DIRS=[[1,0],[-1,0],[0,1],[0,-1]];

export const TOOLS=[
  ...buildingToolDefinitions(),
  {id:"water",name:"Water",cost:6,key:"w",desc:"Hold and drag to shape a pond on clear, opened land.",cat:"landscaping"},
  {id:"move",name:"Move",cost:0,key:"1",desc:"Drag to pan the valley. Scroll or pinch to zoom.",cat:"mode"},
  {id:"look",name:"Look",cost:0,key:"i",desc:"Tap anything to ask how it's doing, and why.",cat:"mode"},
  {id:"erase",name:"Remove",cost:0,key:"e",desc:"Clears a tile and refunds half the cost.",cat:"mode"}
];
export const COST={}; for(const t of TOOLS) COST[t.id]=t.cost;

export const CATEGORIES=[
  {id:"ways",name:"Ways"},
  {id:"homes",name:"Homes"},
  {id:"civic",name:"Civic"},
  {id:"trade",name:"Trade"},
  {id:"recreation",name:"Recreation"},
  {id:"green",name:"Green"}
  ,{id:"safety",name:"Safety"},{id:"health",name:"Health"},{id:"landscaping",name:"Landscape"}
];

export const ICONS={
  move:'<path d="M12 3v18M3 12h18M12 3l-2.4 2.4M12 3l2.4 2.4M12 21l-2.4-2.4M12 21l2.4-2.4M3 12l2.4-2.4M3 12l2.4 2.4M21 12l-2.4-2.4M21 12l2.4 2.4"/>',
  road:'<path d="M7 21 4.5 3M17 21l2.5-18M12 4.5v3M12 11v3M12 17.5v3"/>',
  rail:'<path d="M8 3v18M16 3v18M5 7.5h14M5 12h14M5 16.5h14"/>',
  house:'<path d="M3.5 11.5 12 4l8.5 7.5M6 10.5V20h12v-9.5M10 20v-5h4v5"/>',
  cityHall:'<path d="M3 9.5 12 4l9 5.5M5 10h14M6.5 10v8M10 10v8M14 10v8M17.5 10v8M4 20h16M12 4V2.8M12 2.8h4"/>',
  cafe:'<path d="M5 8h11v5.5A4.5 4.5 0 0 1 11.5 18h-2A4.5 4.5 0 0 1 5 13.5V8ZM16 9.5h2a2.5 2.5 0 0 1 0 5h-2M4 21h14"/>',
  park:'<path d="M12 3.5c3 0 5.2 2.4 5.2 5.2S15 13.5 12 13.5 6.8 11.5 6.8 8.7 9 3.5 12 3.5ZM12 13.5V20M8 20h8"/>',
  pocketPark:'<path d="M4 19h16M6 16c2-4 3-8 6-11 3 3 4 7 6 11M12 7v12M7 13h10"/>',
  playground:'<path d="M4 19h16M6 17 10 7l5 10M8 12h8M17 6v11M17 6h3M20 6v8"/>',
  picnicGreen:'<path d="M4 19h16M6 13h12M8 13l-2 6M16 13l2 6M9 9h6l-1.5 4h-3L9 9ZM12 4v5"/>',
  sportsCourt:'<rect x="4" y="5" width="16" height="14" rx="1"/><path d="M12 5v14M4 12h16"/><circle cx="12" cy="12" r="3"/>',
  townPark:'<path d="M4 19h16M7 15c0-4 2-8 5-11 3 3 5 7 5 11M12 7v12"/><circle cx="12" cy="14" r="3"/>',
  tree:'<path d="M9 4 5.5 10.5h7L9 4ZM9 10.5V19M17 9.5l-2.6 4.5h5.2l-2.6-4.5ZM17 14v5M3.5 19.5h17"/>',
  lamp:'<path d="M12 3.5a3.6 3.6 0 0 1 3.6 3.6c0 1.7-1.2 2.6-1.6 3.9h-4c-.4-1.3-1.6-2.2-1.6-3.9A3.6 3.6 0 0 1 12 3.5ZM10 11h4M11 13.5h2M12 13.5V21M9 21h6"/>',
  mill:'<path d="M10 21h4l-1-9h-2l-1 9ZM12 12 5.5 8.5M12 12l3.5-6.5M12 12l6.5 3.5M12 12l-3.5 6.5"/>',
  station:'<path d="M3 7.5 12 3.5l9 4M6 8.5V17h12V8.5M9.5 12.5h5M8.5 21h7M10.5 17v4M13.5 17v4"/>',
  market:'<path d="M4 9.5h16l-1.2-4H5.2L4 9.5ZM5.5 9.5V20h13V9.5M3 20h18M9.5 20v-5h5v5"/>',
  bakery:'<path d="M4.5 14.5c0-3.3 3.4-6 7.5-6s7.5 2.7 7.5 6M4.5 14.5h15v3.2a1.8 1.8 0 0 1-1.8 1.8H6.3a1.8 1.8 0 0 1-1.8-1.8v-3.2ZM9 8.8V6M12 8.5V5.5M15 8.8V6"/>',
  school:'<path d="M12 3.5 21.5 8 12 12.5 2.5 8 12 3.5ZM6 10v5.5c0 1.9 2.7 3.4 6 3.4s6-1.5 6-3.4V10M21.5 8v5"/>',
  dock:'<path d="M12 4v13M12 17c-3.2 0-5.8-2-6.6-4.6h13.2C17.8 15 15.2 17 12 17ZM8.5 8.5h7M3 20.5c1.6 0 1.6 1 3.2 1s1.6-1 3.2-1 1.6 1 3.2 1 1.6-1 3.2-1 1.6 1 3.2 1"/>',
  look:'<path d="M12 5c5 0 8.5 4.2 9.5 7-1 2.8-4.5 7-9.5 7s-8.5-4.2-9.5-7C3.5 9.2 7 5 12 5Z"/><circle cx="12" cy="12" r="2.9"/>',
  erase:'<path d="M4.5 7h15M9.5 7V4.8h5V7M6.5 7l1 13.2h9L17.5 7M10.5 10.8v6M13.5 10.8v6"/>'
  ,water:'<path d="M12 3C9 7 5.5 10.5 5.5 14.5a6.5 6.5 0 0 0 13 0C18.5 10.5 15 7 12 3Z"/>',
  policeStation:'<path d="M12 3 20 7v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4Zm0 5v8m-4-4h8"/>',
  fireStation:'<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-3 2-5 4-7 0 3 1 4 2 5 1-3 0-5-1-8Z"/>',
  clinic:'<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3Z"/>',
  hospital:'<path d="M5 3h14v18H5V3Zm4 4h6m-3-3v6M8 21v-5h8v5"/>'
};

/* ---------- seasons ---------- */
export const SEASON_DAYS=5;
export const SEASONS=[
  {name:"Spring",grass:["#8fc077","#96c67e","#89ba6d","#9dcb83"],dark:"#6f9d5c",fall:0,leaf:"#63a052",leafHi:"#86bf6d",bloom:1,snow:0,mood:3,yield:2,skyTop:"#b6dde5",skyBot:"#86ba7f",nightTop:"#3b566f",nightBot:"#2e4441"},
  {name:"Summer",grass:["#82b968","#8bbf70","#79b060","#92c578"],dark:"#639250",fall:0,leaf:"#4f9146",leafHi:"#71b05e",bloom:.55,snow:0,mood:2,yield:5,skyTop:"#a6d8e8",skyBot:"#7fb476",nightTop:"#37506c",nightBot:"#2a4038"},
  {name:"Autumn",grass:["#b5ad6a","#bfb474","#aaa161","#c6bb7e"],dark:"#8d8650",fall:1,leaf:"#cf8a3c",leafHi:"#e3ad50",bloom:.2,snow:0,mood:0,yield:12,skyTop:"#cbd2c8",skyBot:"#a89f68",nightTop:"#3d4a5e",nightBot:"#3a3d36"},
  {name:"Winter",grass:["#dee4dc","#e7ebe3","#d5dbd3","#edf0e9"],dark:"#c2cabf",fall:0,leaf:"#8ea892",leafHi:"#b8cab7",bloom:0,snow:1,mood:-4,yield:0,skyTop:"#d3dee4",skyBot:"#c3ccc6",nightTop:"#3a4763",nightBot:"#414c50"}
];

/* ---------- palette ---------- */
export const P={
  grass:["#8dbc72","#93c078","#87b66c","#98c47d"],
  grassDark:"#6f9d5c",
  water:"#79b0c0", waterDeep:"#5f97ab", waterEdge:"#a7cfd8",
  road:"#cfc3a6", roadEdge:"#b6a988", roadLine:"#efe7cf",
  railBed:"#a99b80", railTie:"#8a7c63", railMetal:"#8e9aa6",
  wall:["#efe6d3","#e6dcc6","#f2ead9"],
  roof:["#cf8274","#6f8fae","#d9ae57","#7fa887","#b9776f","#5f8ba0"],
  trunk:"#7a5c43", leaf:"#5f9350", leafHi:"#79ad63",
  stone:"#b9b2a0", warm:"#ffd79a",
  parkGrass:"#7bb268", path:"#ddd0b0"
};
