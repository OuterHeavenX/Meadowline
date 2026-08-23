import { HOUSE_NAMES, residents } from '../buildings/houses.js';
import { capFor } from '../buildings/houses.js';
import { outFrom } from '../simulation/citizens.js';
import { educationAssignment, educationProvider, educationStatus, educationTier, getEducationLevel, schoolStats } from '../simulation/civic-services.js';
import { desirabilityDetails, desirabilityLabel, evaluateHousingReadiness, getDesirability, housingTier } from '../simulation/housing.js';
import { hash2 } from '../core/constants.js';
import { services } from '../core/services.js';
import { S } from '../core/state.js';
import { evalHouse } from '../simulation/mood.js';
import { PAL } from '../world/seasons.js';
import { idx, inBounds, isWater } from '../world/tiles.js';
import { darkness } from '../world/time.js';

/* ---------- the Look card ---------- */
export const elLook=document.getElementById("look"), elLookBody=document.getElementById("look-body");
export function closeLook(){ elLook.classList.remove("show"); S.pick=null; }
document.getElementById("look-x").addEventListener("click",closeLook);

export function listOut(a){
  if(a.length<=1) return a[0]||"";
  return a.slice(0,-1).join(", ")+" and "+a[a.length-1];
}
export function card(title,kind,body){
  return '<h3>'+title+'</h3><div class="kind">'+kind+'</div>'+body;
}
export function moodRow(mood){
  const cls=mood>=68?"up":mood<40?"dn":"";
  return '<div class="tot"><span>Mood</span><em class="'+cls+'">'+moodLabel(mood)+' · '+mood+'</em></div>';
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

function educationBlock(h){
  const level=Math.round(getEducationLevel(h));
  const a=educationAssignment(h);
  const p=educationProvider(h);
  const status=educationStatus(h);
  const schoolLine=p
    ? '<dt>School</dt><dd>Schoolhouse · '+p.provider.x+','+p.provider.y+'</dd><dt>School capacity</dt><dd>'+p.served+' / '+p.capacity+'</dd>'
    : '<dt>School</dt><dd>None serving this home</dd>';
  const coverage=a?(a.status==="served"?"Strong":a.status==="partial"?"Limited":a.status==="capacity"?"In range · full":"None"):"None";
  return '<h4>Education</h4><dl class="service">'+
    '<dt>Education</dt><dd>'+level+' · '+educationTier(level)+'</dd>'+
    schoolLine+'<dt>Coverage</dt><dd>'+coverage+'</dd></dl>'+
    '<p><b>'+status.label+'.</b> '+status.detail+'</p>';
}

function housingBlock(h){
  const current=housingTier(h);
  const readiness=evaluateHousingReadiness(h);
  const desirability=getDesirability(h);
  const details=desirabilityDetails(h);
  const best=details.rows.filter(r=>r.value>0).sort((a,b)=>b.value-a.value).slice(0,2).map(r=>r.label.toLowerCase());
  let html='<h4>Neighborhood</h4><dl class="service">'+
    '<dt>Desirability</dt><dd>'+desirability+' · '+desirabilityLabel(desirability)+'</dd></dl>'+
    (best.length?'<p class="muted">Helped most by '+best.join(' and ')+'.</p>':'');

  html+='<h4>Residential growth</h4><dl class="service">'+
    '<dt>Home</dt><dd>'+current.name+'</dd>';
  if(!readiness.next){
    html+='<dt>Growth</dt><dd class="up">Established</dd></dl><p>This home has reached the highest residential tier currently available.</p>';
    return html;
  }

  const pct=Math.round(((h.state&&h.state.upgradeProgress)||0)*100);
  html+='<dt>Next</dt><dd>'+readiness.next.name+'</dd>'+
    '<dt>Progress</dt><dd class="'+(readiness.ready?'up':'')+'">'+pct+'%</dd></dl>'+
    '<dl class="service readiness">'+readiness.requirements.map(r=>
      '<dt>'+r.label+'</dt><dd class="'+(r.met?'up':'dn')+'">'+(r.met?'✓ Ready':'○ Not yet')+'</dd>'
    ).join('')+'</dl>'+
    (readiness.ready
      ? '<p><b>Growing toward '+readiness.next.name+'.</b> Good conditions are being sustained; progress pauses rather than disappearing if something changes.</p>'
      : '<p><b>Not ready yet.</b> Improve the missing conditions and this home will begin growing automatically.</p>');
  return html;
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
    if(raw!==mood){
      dl+='<dt>'+(raw>mood?"Happier than it can hold":"As low as it goes")+'</dt><dd>'+(mood-raw>0?"+":"")+(mood-raw)+'</dd>';
    }
    dl+='</dl>';
    const out_=outFrom(x,y);
    const doing=out_?'<p><b>'+out_+'</b> of them '+(out_===1?'is':'are')+' out on the streets just now.</p>':'';
    const line=b.pop
      ? '<p><b>'+listOut(who)+'</b> live'+(who.length===1?"s":"")+' here.</p>'
      : (b.linked?'<p>Empty for now. Lift the mood past <b>62</b> and someone will move in.</p>':'<p>Empty, and no road reaches the door.</p>');
    return card(HOUSE_NAMES[(hash2(b.seed,1,777)*HOUSE_NAMES.length)|0],"Home · "+b.pop+" of "+capFor(b)+" · "+housingTier(b).name,line+doing+dl+moodRow(mood)+educationBlock(b)+housingBlock(b));
  }
  if(b) switch(b.type){
    case "cafe": return card("The Corner Café","Café",'<p>Trades for <b>9 coins</b> a day and lifts every home within <b>5 tiles</b>.</p><dl><dt>Homes in reach</dt><dd>'+countNear("houses",x,y,5)+'</dd></dl>');
    case "park": return card("The Green","Park",'<p>The strongest lift there is, out to <b>4 tiles</b>. Fireflies come here after dark.</p><dl><dt>Homes in reach</dt><dd>'+countNear("houses",x,y,4)+'</dd></dl>');
    case "station": return card("Meadowline Halt","Station",'<p>Worth <b>16</b> to every home within <b>6 tiles</b>, whether or not a train has come yet.</p><dl><dt>Homes in reach</dt><dd>'+countNear("houses",x,y,6)+'</dd><dt>Trains running</dt><dd>'+S.trains.length+'</dd></dl>');
    case "lamp": return card("Street Lamp","Lamp",'<p>A small lift within <b>2 tiles</b> that <b>doubles</b> once the light goes.</p><dl><dt>Homes in reach</dt><dd>'+countNear("houses",x,y,2)+'</dd><dt>Right now</dt><dd>'+(darkness()>0.2?"Lit":"Waiting for dusk")+'</dd></dl>');
    case "mill": return card("The Windmill","Windmill",'<p>Grinds coin every day, and best of all at harvest.</p><dl><dt>Today’s yield</dt><dd>'+Math.round(9+(PAL.yield||0))+'</dd><dt>Charm within 3</dt><dd class="up">+4</dd></dl>');
    case "market": return card("The Market","Market",'<p>Lifts what every café and bakery takes, and cheers the streets within <b>5 tiles</b>.</p><dl><dt>Homes in reach</dt><dd>'+countNear("houses",x,y,5)+'</dd><dt>Trades lifted</dt><dd>'+(S.ctx.cafes.length+S.ctx.bakeries.length)+'</dd></dl>');
    case "bakery": {
      const supplied=S.ctx.mills.some(w=>Math.abs(w.x-x)<=4&&Math.abs(w.y-y)<=4);
      return card("The Bakery","Bakery",'<p>Bakes what the windmills grind. '+(supplied?'A mill is in reach, so it runs at <b>full tilt</b>.':'No mill within <b>4 tiles</b>, so it runs at <b>half</b>.')+'</p><dl><dt>Flour supply</dt><dd class="'+(supplied?'up':'dn')+'">'+(supplied?'Good':'Short')+'</dd><dt>Homes in reach</dt><dd>'+countNear("houses",x,y,4)+'</dd></dl>');
    }
    case "school": {
      const st=schoolStats(b);
      const label=st.overloaded?"At capacity":st.utilization>=75?"Busy":"Good";
      return card("Meadowline School","School · Education service",
        '<p>Education grows gradually for households this school can serve. Knowledge already gained is kept if coverage changes.</p>'+
        '<dl><dt>Students served</dt><dd>'+st.served+' / '+st.capacity+'</dd><dt>Demand in reach</dt><dd>'+st.demand+'</dd><dt>Utilization</dt><dd>'+st.utilization+'%</dd><dt>Homes served</dt><dd>'+st.homesCovered+'</dd><dt>Coverage radius</dt><dd>'+st.radius+' tiles</dd><dt>Status</dt><dd class="'+(st.overloaded?'dn':'up')+'">'+label+'</dd><dt>Upgrade</dt><dd>Not yet available</dd></dl>'+
        (st.overloaded?'<p><b>Some nearby demand is waiting.</b> Another school will relieve the pressure.</p>':'<p>There is room for this neighborhood to keep learning.</p>'));
    }
    case "dock": return card("The Dock","Dock",'<p>Boats put out from here and sail the open water. Homes with a view of it are cheered for <b>4 tiles</b>.</p><dl><dt>Boats afloat</dt><dd>'+S.boats.length+'</dd><dt>Homes in reach</dt><dd>'+countNear("houses",x,y,4)+'</dd></dl>');
    case "tree": return card("Planted Trees","Trees",'<p>A small lift to any home with a view of them, out to <b>3 tiles</b>.</p>');
    case "road": return card(isWater(x,y)?"Road Bridge":"Road",isWater(x,y)?"Span":"Road",'<p>Homes fill up only when a road runs alongside. Citizens walk wherever it leads.</p>');
    case "rail": return card(isWater(x,y)?"Rail Bridge":"Rail",isWater(x,y)?"Span":"Rail",'<p>Trains appear once <b>6 tiles</b> of rail exist, and one more for every 13 after.</p>');
  }
  if(S.terr[i]===1) return card("Open Water","Water",'<p>Only <b>roads and rails</b> can cross, and a span costs <b>three times</b> the usual. Water cheers up the homes that can see it.</p>');
  if(S.natTree[i]) return card("Old Woodland","Wild trees",'<p>Here before you were. Worth the same as a planted tree — and free to leave standing.</p>');
  return card("Meadow","Open ground",'<p>Room for anything you like.</p><dl><dt>Homes within 4</dt><dd>'+countNear("houses",x,y,4)+'</dd><dt>Parks within 4</dt><dd>'+countNear("parks",x,y,4)+'</dd></dl>');
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
