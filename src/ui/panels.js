import { hash2 } from '../core/constants.js';
import { services } from '../core/services.js';
import { S } from '../core/state.js';
import { evalHouse } from '../simulation/mood.js';
import { PAL } from '../world/seasons.js';
import { idx, inBounds, isWater } from '../world/tiles.js';
import { darkness } from '../world/time.js';

/* ---------- the Look card ---------- */
export const FIRSTS=["Ada","Rowan","Juno","Maple","Bo","Wren","Otto","Sage","Iris","Fen",
              "Clover","Bram","Nell","Pip","Hazel","Tam","Marlow","Ivy","Cass","Linnet"];
export const HOUSE_NAMES=["Bramble Cottage","Willow End","The Old Bakehouse","Hollyhock","Number Four",
                   "Thistledown","Sparrow House","The Green Gate","Cobb Cottage","Fern Row",
                   "Larkspur","The Quiet Corner","Pennywort","Damson House","Yarrow Lodge"];
export const elLook=document.getElementById("look"), elLookBody=document.getElementById("look-body");
export function closeLook(){ elLook.classList.remove("show"); S.pick=null; }
document.getElementById("look-x").addEventListener("click",closeLook);

export function residents(h){
  const out=[];
  for(let i=0;i<h.pop;i++){
    let n="",k=0;
    do{ n=FIRSTS[(hash2(h.seed,i*11+k,313)*FIRSTS.length)|0]; k++; }
    while(out.indexOf(n)>=0&&k<14);
    out.push(n);
  }
  return out;
}
export function listOut(a){
  if(a.length<=1) return a[0]||"";
  return a.slice(0,-1).join(", ")+" and "+a[a.length-1];
}
export function card(title,kind,body){
  return '<h3>'+title+'</h3><div class="kind">'+kind+'</div>'+body;
}
export function moodRow(mood){
  const cls=mood>=68?"up":mood<40?"dn":"";
  return '<div class="tot"><span>Mood</span><em class="'+cls+'">'+moodLabel(mood)+' \u00b7 '+mood+'</em></div>';
}
export function moodLabel(m){
  if(m>=82) return "Blissful";
  if(m>=68) return "Content";
  if(m>=50) return "Settled";
  if(m>=32) return "Restless";
  return "Glum";
}
export function countNear(type,x,y,r){
  let n=0;
  for(const b of S.ctx[type]) if(Math.abs(b.x-x)<=r&&Math.abs(b.y-y)<=r) n++;
  return n;
}

export function describe(x,y){
  const i=idx(x,y), b=S.grid[i];
  if(b&&b.type==="house"){
    const why=[];
    const mood=evalHouse(b,why);
    const who=residents(b);
    let dl='<dl>', raw=0;
    for(const[label,v] of why){
      raw+=v;
      dl+='<dt>'+label+'</dt><dd class="'+(v>=0?"up":"dn")+'">'+(v>0?"+":"")+v+'</dd>';
    }
    if(raw!==mood){   // happiness stops at 100, and at 0 — say so rather than not add up
      dl+='<dt>'+(raw>mood?"Happier than it can hold":"As low as it goes")+'</dt>'+
          '<dd>'+(mood-raw>0?"+":"")+(mood-raw)+'</dd>';
    }
    dl+='</dl>';
    const line=b.pop
      ? '<p><b>'+listOut(who)+'</b> live'+(who.length===1?"s":"")+' here.</p>'
      : (b.linked
          ? '<p>Empty for now. Lift the mood past <b>62</b> and someone will move in.</p>'
          : '<p>Empty, and no road reaches the door.</p>');
    return card(HOUSE_NAMES[(hash2(b.seed,1,777)*HOUSE_NAMES.length)|0],
                "Home \u00b7 "+b.pop+" of 4",
                line+dl+moodRow(mood));
  }
  if(b) switch(b.type){
    case "cafe": return card("The Corner Caf\u00e9","Caf\u00e9",
      '<p>Trades for <b>9 coins</b> a day and lifts every home within <b>5 tiles</b>.</p>'+
      '<dl><dt>Homes in reach</dt><dd>'+countNear("houses",x,y,5)+'</dd></dl>');
    case "park": return card("The Green","Park",
      '<p>The strongest lift there is, out to <b>4 tiles</b>. Fireflies come here after dark.</p>'+
      '<dl><dt>Homes in reach</dt><dd>'+countNear("houses",x,y,4)+'</dd></dl>');
    case "station": return card("Meadowline Halt","Station",
      '<p>Worth <b>16</b> to every home within <b>6 tiles</b>, whether or not a train has come yet.</p>'+
      '<dl><dt>Homes in reach</dt><dd>'+countNear("houses",x,y,6)+'</dd>'+
      '<dt>Trains running</dt><dd>'+S.trains.length+'</dd></dl>');
    case "lamp": return card("Street Lamp","Lamp",
      '<p>A small lift within <b>2 tiles</b> that <b>doubles</b> once the light goes.</p>'+
      '<dl><dt>Homes in reach</dt><dd>'+countNear("houses",x,y,2)+'</dd>'+
      '<dt>Right now</dt><dd>'+(darkness()>0.2?"Lit":"Waiting for dusk")+'</dd></dl>');
    case "mill": return card("The Windmill","Windmill",
      '<p>Grinds coin every day, and best of all at harvest.</p>'+
      '<dl><dt>Today\u2019s yield</dt><dd>'+Math.round(9+(PAL.yield||0))+'</dd>'+
      '<dt>Charm within 3</dt><dd class="up">+4</dd></dl>');
    case "market": return card("The Market","Market",
      '<p>Lifts what every caf\u00e9 and bakery takes, and cheers the streets within <b>5 tiles</b>.</p>'+
      '<dl><dt>Homes in reach</dt><dd>'+countNear("houses",x,y,5)+'</dd>'+
      '<dt>Trades lifted</dt><dd>'+(S.ctx.cafes.length+S.ctx.bakeries.length)+'</dd></dl>');
    case "bakery": {
      const supplied=S.ctx.mills.some(w=>Math.abs(w.x-x)<=4&&Math.abs(w.y-y)<=4);
      return card("The Bakery","Bakery",
        '<p>Bakes what the windmills grind. '+(supplied
          ? 'A mill is in reach, so it runs at <b>full tilt</b>.'
          : 'No mill within <b>4 tiles</b>, so it runs at <b>half</b>.')+'</p>'+
        '<dl><dt>Flour supply</dt><dd class="'+(supplied?'up':'dn')+'">'+(supplied?'Good':'Short')+'</dd>'+
        '<dt>Homes in reach</dt><dd>'+countNear("houses",x,y,4)+'</dd></dl>');
    }
    case "school": return card("The Schoolhouse","School",
      '<p>Every home within <b>5 tiles</b> has room for <b>two more</b> under its roof, and is the happier for it.</p>'+
      '<dl><dt>Homes in reach</dt><dd>'+countNear("houses",x,y,5)+'</dd></dl>');
    case "dock": return card("The Dock","Dock",
      '<p>Boats put out from here and sail the open water. Homes with a view of it are cheered for <b>4 tiles</b>.</p>'+
      '<dl><dt>Boats afloat</dt><dd>'+S.boats.length+'</dd>'+
      '<dt>Homes in reach</dt><dd>'+countNear("houses",x,y,4)+'</dd></dl>');
    case "tree": return card("Planted Trees","Trees",
      '<p>A small lift to any home with a view of them, out to <b>3 tiles</b>.</p>');
    case "road": return card(isWater(x,y)?"Road Bridge":"Road",isWater(x,y)?"Span":"Road",
      '<p>Homes fill up only when a road runs alongside. Citizens walk wherever it leads.</p>');
    case "rail": return card(isWater(x,y)?"Rail Bridge":"Rail",isWater(x,y)?"Span":"Rail",
      '<p>Trains appear once <b>6 tiles</b> of rail exist, and one more for every 13 after.</p>');
  }
  if(S.terr[i]===1) return card("Open Water","Water",
    '<p>Only <b>roads and rails</b> can cross, and a span costs <b>three times</b> the usual. Water cheers up the homes that can see it.</p>');
  if(S.natTree[i]) return card("Old Woodland","Wild trees",
    '<p>Here before you were. Worth the same as a planted tree \u2014 and free to leave standing.</p>');
  return card("Meadow","Open ground",
    '<p>Room for anything you like.</p>'+
    '<dl><dt>Homes within 4</dt><dd>'+countNear("houses",x,y,4)+'</dd>'+
    '<dt>Parks within 4</dt><dd>'+countNear("parks",x,y,4)+'</dd></dl>');
}

export function inspect(x,y){
  if(!inBounds(x,y)){ closeLook(); return; }
  S.pick={x,y};
  elLookBody.innerHTML=describe(x,y);
  elLook.classList.add("show");
  services.blip(600,0.04,"triangle");
}
export function refreshLook(){
  if(S.pick&&elLook.classList.contains("show")) elLookBody.innerHTML=describe(S.pick.x,S.pick.y);
}
