import { HOUSE_NAMES, residents } from '../buildings/houses.js';
import { capFor } from '../buildings/houses.js';
import { getBuildingDefinition } from '../buildings/registry.js';
import { outFrom } from '../simulation/citizens.js';
import { educationAssignment, educationProvider, educationStatus, educationTier, getEducationLevel, schoolStats } from '../simulation/civic-services.js';
import { desirabilityDetails, desirabilityLabel, evaluateHousingReadiness, getDesirability, housingTier } from '../simulation/housing.js';
import { recreationFacilityStats, recreationStatus } from '../simulation/recreation.js';
import { hash2 } from '../core/constants.js';
import { save } from '../core/save.js';
import { services } from '../core/services.js';
import { S } from '../core/state.js';
import { CITY_STAGES, isTileUnlocked, parcelAt, parcelStatus } from '../progression/city-growth.js';
import { civicUpgradeStatus, upgradeCivic } from '../progression/civic-upgrades.js';
import { evalHouse } from '../simulation/mood.js';
import { PAL } from '../world/seasons.js';
import { facilityFootprint, facilityRootAt, idx, inBounds, isWater } from '../world/tiles.js';
import { darkness } from '../world/time.js';
import { toast } from './notify.js';
import { paintGrowthPanel } from './growth.js';

/* ---------- the Look card ---------- */
export const elLook=document.getElementById("look"), elLookBody=document.getElementById("look-body");
export function closeLook(){ elLook.classList.remove("show","cityhall-open"); S.pick=null; }
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
  for(const b of S.ctx[type]||[]) if(Math.abs(b.x-x)<=r&&Math.abs(b.y-y)<=r) n++;
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

function recreationBlock(h){
  const status=recreationStatus(h),a=status.assignment;
  const nearest=a.nearest;
  const facility=nearest?.name||'None within walking reach';
  const cls=status.satisfaction>=65?'up':status.satisfaction>0?'':'dn';
  return '<h4>Recreation</h4><dl class="service">'+
    '<dt>Status</dt><dd class="'+cls+'">'+status.label+'</dd>'+
    '<dt>Residents served</dt><dd>'+a.served+' / '+a.demand+'</dd>'+
    '<dt>Nearby space</dt><dd>'+facility+'</dd></dl><p>'+status.detail+'</p>';
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

function lockedLandCard(x,y){
  if(isTileUnlocked(x,y)) return null;
  const parcel=parcelAt(x,y);
  if(!parcel) return card("Future Meadow","Undeveloped land",'<p>This land is outside the current development area.</p>');
  const st=parcelStatus(parcel.id);
  const terrain=S.terr[idx(x,y)]===1?'The water and shoreline remain part of the valley.':S.natTree[idx(x,y)]?'The old woodland remains untouched until this district opens.':'The meadow is still here — it simply is not open for development yet.';
  let status;
  if(st.state==='available') status='<p><b>'+parcel.name+' is ready to open.</b> It costs <b>'+parcel.cost+' coins</b> in City Growth.</p>';
  else status='<p><b>Unlock requirement:</b> '+CITY_STAGES[parcel.stage-1].name+(st.prereqOk?'':' and neighboring land')+'.</p>';
  return card(parcel.name,"Undeveloped land",'<p>'+terrain+'</p>'+status+'<p class="muted">You can still pan across and enjoy this part of Meadowline before building reaches it.</p>');
}

function schoolCard(b){
  const st=schoolStats(b);
  const label=st.overloaded?"At capacity":st.utilization>=75?"Busy":"Good";
  const level=Math.max(1,Math.floor(Number(b.state?.level)||1));
  const up=civicUpgradeStatus(b);
  let upgradeHtml='';
  if(up.maxed){
    upgradeHtml='<h4>Upgrade</h4><p><b>Level 2 complete.</b> This school now has room for '+st.capacity+' students while keeping its '+st.radius+'-tile neighborhood reach.</p>';
  }else if(up.next){
    const future=up.next;
    const requirement=up.stageOk?'Township reached':'Reach Township first';
    upgradeHtml='<h4>Upgrade</h4><dl class="service"><dt>Level</dt><dd>'+level+' → '+future.level+'</dd><dt>Capacity</dt><dd>'+st.capacity+' → '+future.capacity+'</dd><dt>Coverage</dt><dd>'+st.radius+' tiles</dd><dt>Requirement</dt><dd class="'+(up.stageOk?'up':'dn')+'">'+requirement+'</dd><dt>Cost</dt><dd>'+future.cost+' coins</dd></dl>'+
      '<button class="go civic-upgrade" data-upgrade-school="1" '+(up.available?'':'disabled')+'>Upgrade to Level 2</button>'+
      (!up.stageOk?'<p class="muted">The larger school becomes available once Meadowline reaches Township.</p>':!up.coinsOk?'<p class="muted">Save '+future.cost+' coins or build another School instead.</p>':'<p class="muted">This adds classroom space; it does not expand the service radius.</p>');
  }
  return card("Meadowline School","School · Level "+level+" · Education service",
    '<p>Education grows gradually for households this school can serve. Knowledge already gained is kept if coverage changes.</p>'+
    '<dl><dt>Students served</dt><dd>'+st.served+' / '+st.capacity+'</dd><dt>Demand in reach</dt><dd>'+st.demand+'</dd><dt>Utilization</dt><dd>'+st.utilization+'%</dd><dt>Homes served</dt><dd>'+st.homesCovered+'</dd><dt>Coverage radius</dt><dd>'+st.radius+' tiles</dd><dt>Status</dt><dd class="'+(st.overloaded?'dn':'up')+'">'+label+'</dd></dl>'+
    (st.overloaded?'<p><b>Some nearby demand is waiting.</b> Build another School or add classroom capacity.</p>':'<p>There is room for this neighborhood to keep learning.</p>')+upgradeHtml);
}

function recreationCard(b){
  const def=getBuildingDefinition(b.type),st=recreationFacilityStats(b),fp=facilityFootprint(b);
  const connected=!!st?.connected;
  const demand=st?.demand||0,served=st?.served||0,capacity=st?.capacity||(def?.service?.capacity||0),visitors=st?.visitors||0;
  let status='Ready for neighbors';
  if(!connected) status='Needs a street entrance';
  else if(demand>served&&served>=capacity) status='Crowded — more recreation would help';
  else if(demand>served) status='Some nearby demand is still underserved';
  else if(demand>0) status='Serving nearby residents well';
  const entrance=st?.entrance?(st.entrance.x+','+st.entrance.y):'None';
  const legacy=b.type==='park'?'<p class="muted">This classic 1×1 green is preserved from earlier Meadowline saves and now provides real small-scale Recreation capacity.</p>':'';
  return card(def?.name||'Public Space','Recreation · '+fp[0]+'×'+fp[1],
    '<dl class="service"><dt>Capacity</dt><dd>'+served+' / '+capacity+' served</dd><dt>Nearby demand</dt><dd>'+demand+'</dd><dt>Visitors now</dt><dd>'+visitors+'</dd><dt>Street access</dt><dd class="'+(connected?'up':'dn')+'">'+(connected?'Connected at '+entrance:'Not connected')+'</dd><dt>Status</dt><dd class="'+(demand>served?'dn':'up')+'">'+status+'</dd></dl>'+legacy);
}
function municipalCard(b){
  const def=getBuildingDefinition(b.type),type=def?.service?.type,vehicles=(S.serviceVehicles||[]).filter(v=>v.home===b),calls=vehicles.filter(v=>!v.done).length,cap=def?.service?.capacity||0;
  const label=type==='safety'?'Police service':type==='fire'?'Fire response':'Healthcare';
  const city=type==='safety'?S.municipal.safety:type==='fire'?S.municipal.fire:S.municipal.healthcare;
  const demand=type==='safety'?city.active:type==='fire'?city.active:city.demand;
  return card(def.name,label+' · '+(def.placement?.footprint||[1,1]).join('×'),'<dl class="service"><dt>Capacity</dt><dd>'+cap+'</dd><dt>City demand</dt><dd>'+demand+'</dd><dt>Vehicles active</dt><dd>'+calls+'</dd><dt>Jobs</dt><dd>'+(def.jobs||0)+'</dd><dt>Status</dt><dd class="'+(calls>=cap?'dn':'up')+'">'+(calls>=cap?'Busy':'Ready')+'</dd></dl>');
}
function businessCard(b){const def=getBuildingDefinition(b.type),work=S.municipal.employment,jobs=def?.jobs||0,share=work.jobs?Math.min(jobs,Math.round(work.employed*jobs/work.jobs)):0;return card(def?.name||'Business','Business','<dl class="service"><dt>Jobs filled</dt><dd>'+share+' / '+jobs+'</dd><dt>Road access</dt><dd class="'+(b.linked===false?'dn':'up')+'">'+(b.linked===false?'Disconnected':'Connected')+'</dd><dt>City prosperity</dt><dd>'+work.prosperity+' / 100</dd></dl>');}

export function describe(x,y){
  const root=facilityRootAt(x,y),rx=root?.x??x,ry=root?.y??y;
  const i=idx(rx,ry), b=root||S.grid[i];
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
    const out_=outFrom(rx,ry);
    const doing=out_?'<p><b>'+out_+'</b> of them '+(out_===1?'is':'are')+' out on the streets just now.</p>':'';
    const line=b.pop
      ? '<p><b>'+listOut(who)+'</b> live'+(who.length===1?"s":"")+' here.</p>'
      : (b.linked?'<p>Empty for now. Lift the mood past <b>62</b> and someone will move in.</p>':'<p>Empty, and no road reaches the door.</p>');
    return card(HOUSE_NAMES[(hash2(b.seed,1,777)*HOUSE_NAMES.length)|0],"Home · "+b.pop+" of "+capFor(b)+" · "+housingTier(b).name,line+doing+dl+moodRow(mood)+educationBlock(b)+recreationBlock(b)+housingBlock(b));
  }
  if(b){
    if(getBuildingDefinition(b.type)?.service?.type==='recreation') return recreationCard(b);
    if(['safety','fire','healthcare'].includes(getBuildingDefinition(b.type)?.service?.type)) return municipalCard(b);
    if(['cafe','market','bakery','mill'].includes(b.type)&&getBuildingDefinition(b.type)?.jobs) return businessCard(b);
    switch(b.type){
      case "cafe": return card("The Corner Café","Café",'<p>Trades for <b>9 coins</b> a day and lifts every home within <b>5 tiles</b>.</p><dl><dt>Homes in reach</dt><dd>'+countNear("houses",rx,ry,5)+'</dd></dl>');
      case "station": return card("Meadowline Halt","Station",'<p>Worth <b>16</b> to every home within <b>6 tiles</b>, whether or not a train has come yet.</p><dl><dt>Homes in reach</dt><dd>'+countNear("houses",rx,ry,6)+'</dd><dt>Trains running</dt><dd>'+S.trains.length+'</dd></dl>');
      case "lamp": return card("Street Lamp","Lamp",'<p>A small lift within <b>2 tiles</b> that <b>doubles</b> once the light goes.</p><dl><dt>Homes in reach</dt><dd>'+countNear("houses",rx,ry,2)+'</dd><dt>Right now</dt><dd>'+(darkness()>0.2?"Lit":"Waiting for dusk")+'</dd></dl>');
      case "mill": return card("The Windmill","Windmill",'<p>Grinds coin every day, and best of all at harvest.</p><dl><dt>Today’s yield</dt><dd>'+Math.round(9+(PAL.yield||0))+'</dd><dt>Charm within 3</dt><dd class="up">+4</dd></dl>');
      case "market": return card("The Market","Market",'<p>Lifts what every café and bakery takes, and cheers the streets within <b>5 tiles</b>.</p><dl><dt>Homes in reach</dt><dd>'+countNear("houses",rx,ry,5)+'</dd><dt>Trades lifted</dt><dd>'+(S.ctx.cafes.length+S.ctx.bakeries.length)+'</dd></dl>');
      case "bakery": {
        const supplied=S.ctx.mills.some(w=>Math.abs(w.x-rx)<=4&&Math.abs(w.y-ry)<=4);
        return card("The Bakery","Bakery",'<p>Bakes what the windmills grind. '+(supplied?'A mill is in reach, so it runs at <b>full tilt</b>.':'No mill within <b>4 tiles</b>, so it runs at <b>half</b>.')+'</p><dl><dt>Flour supply</dt><dd class="'+(supplied?'up':'dn')+'">'+(supplied?'Good':'Short')+'</dd><dt>Homes in reach</dt><dd>'+countNear("houses",rx,ry,4)+'</dd></dl>');
      }
      case "school": return schoolCard(b);
      case "dock": return card("The Dock","Dock",'<p>Boats put out from here and sail the open water. Homes with a view of it are cheered for <b>4 tiles</b>.</p><dl><dt>Boats afloat</dt><dd>'+S.boats.length+'</dd><dt>Homes in reach</dt><dd>'+countNear("houses",rx,ry,4)+'</dd></dl>');
      case "tree": return card("Planted Trees","Trees",'<p>A small lift to any home with a view of them, out to <b>3 tiles</b>.</p>');
      case "road": return card(isWater(rx,ry)?"Road Bridge":"Road",isWater(rx,ry)?"Span":"Road",'<p>Homes fill up only when a road runs alongside. Citizens walk wherever it leads.</p>');
      case "rail": return card(isWater(rx,ry)?"Rail Bridge":"Rail",isWater(rx,ry)?"Span":"Rail",'<p>Trains appear once <b>6 tiles</b> of rail exist, and one more for every 13 after.</p>');
    }
  }
  const locked=lockedLandCard(x,y);
  if(locked) return locked;
  const ii=idx(x,y);
  if(S.terr[ii]===1) return card("Open Water","Water",'<p>Only <b>roads and rails</b> can cross, and a span costs <b>three times</b> the usual. Water cheers up the homes that can see it.</p>');
  if(S.natTree[ii]) return card("Old Woodland","Wild trees",'<p>Here before you were. Worth the same as a planted tree — and free to leave standing.</p>');
  return card("Meadow","Open ground",'<p>Room for anything you like.</p><dl><dt>Homes within 4</dt><dd>'+countNear("houses",x,y,4)+'</dd><dt>Recreation nearby</dt><dd>'+((S.ctx.recreation||[]).filter(r=>Math.abs(r.x-x)<=4&&Math.abs(r.y-y)<=4).length)+'</dd></dl>');
}

elLookBody.addEventListener('click',async e=>{
  const btn=e.target.closest('[data-upgrade-school]');
  if(!btn||!S.pick) return;
  const root=facilityRootAt(S.pick.x,S.pick.y),b=root||S.grid[idx(S.pick.x,S.pick.y)];
  if(!b||b.type!=="school") return;
  const st=civicUpgradeStatus(b);
  if(!st.available){ toast(st.reason||'That upgrade is not ready yet.'); return; }
  if(!await askConfirm({title:'Expand this School?',body:'Level 2 costs '+st.next.cost+' coins'+(st.next.capacity?' and raises capacity to '+st.next.capacity+' students':'')+'.',confirmLabel:'Expand'})) return;
  const r=upgradeCivic(b);
  if(!r.ok){ toast(r.why||'The School could not be upgraded.'); return; }
  toast('School Level 2 · capacity '+r.upgrade.capacity,'gold');
  save();
  paintGrowthPanel();
  refreshLook();
});

export function inspect(x,y){
  if(!inBounds(x,y)){ closeLook(); return; }
  elLook.classList.remove('cityhall-open');
  const root=facilityRootAt(x,y);
  S.pick={x:root?.x??x,y:root?.y??y};
  elLookBody.innerHTML=describe(S.pick.x,S.pick.y);
  elLook.classList.add("show");
  services.blip(600,0.04,"triangle");
}
export function refreshLook(){
  if(S.pick&&elLook.classList.contains("show")) elLookBody.innerHTML=describe(S.pick.x,S.pick.y);
}
