import { HOUSE_NAMES, residents } from '../buildings/houses.js';
import { capFor } from '../buildings/houses.js';
import { getBuildingDefinition } from '../buildings/registry.js';
import { FARM_MILL_R, FARM_YIELD } from '../buildings/farms.js';
import { BAKERY_MILL_R } from '../buildings/bakeries.js';
import { wonderEffect } from '../buildings/wonders.js';
import { upkeepOf } from '../simulation/upkeep.js';
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
import { roadNearFacility } from '../transport/roads.js';
import { districtAt } from '../simulation/districts.js';
import { familyAt, familyMembers, traitWords } from '../simulation/families.js';
import { familyStanding, knownFor, memberCareer } from '../simulation/careers.js';
import { frontAt, organisationOf } from '../simulation/organisations.js';
import { investigating, underInvestigation } from '../simulation/enforcement.js';
import { fameWord, venueFame } from '../simulation/fame.js';
import { aliasOf, displayName } from '../simulation/aliases.js';
import { darkness } from '../world/time.js';
import { toast } from './notify.js';
import { paintGrowthPanel } from './growth.js';
import { askConfirm } from './confirm.js';
import { varietyOf, varietyReason } from '../simulation/trade.js';
import { actOf, buskersAt, liveliness } from '../simulation/buskers.js';

/* ---------- the Look card ---------- */
export const elLook=document.getElementById("look"), elLookBody=document.getElementById("look-body");
export function closeLook(){ elLook.classList.remove("show","cityhall-open","post-open"); S.pick=null; }
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
  // Why a bigger park would help, in the game's own words rather than a number.
  const room=a.demand&&a.served&&(status.qualityFactor??1)<0.98
    ? ' A larger public space nearby would lift this neighborhood further.'
    : '';
  return '<h4>Recreation</h4><dl class="service">'+
    '<dt>Status</dt><dd class="'+cls+'">'+status.label+'</dd>'+
    '<dt>Residents served</dt><dd>'+a.served+' / '+a.demand+'</dd>'+
    '<dt>Nearby space</dt><dd>'+facility+'</dd></dl><p>'+status.detail+room+'</p>';
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

/* Whether a street reaches this building. Asked of the building rather than
   read back off `linked`, so the row is right on the very first paint, before
   the simulation has run a pass.

   It goes on what actually walks or drives: the trades, the school and the
   station people travel to, the dock the boats put out from, and the stations
   that dispatch an engine. A statue does not care, and a row telling you so
   would be noise. Recreation keeps its own Street access row, which reports
   the entrance its route was found through. */
function roadRow(b){
  const linked=!!roadNearFacility(b);
  return '<dt>Road access</dt><dd class="'+(linked?'up':'dn')+'">'+(linked?'Connected':'Disconnected')+'</dd>';
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
    '<dl><dt>Students served</dt><dd>'+st.served+' / '+st.capacity+'</dd><dt>Demand in reach</dt><dd>'+st.demand+'</dd><dt>Utilization</dt><dd>'+st.utilization+'%</dd><dt>Homes served</dt><dd>'+st.homesCovered+'</dd><dt>Coverage radius</dt><dd>'+st.radius+' tiles</dd>'+roadRow(b)+'<dt>Status</dt><dd class="'+(st.overloaded?'dn':'up')+'">'+label+'</dd></dl>'+
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
  const caseOpen=type==='safety'?investigating(b):null;
  return card(def.name,label+' · '+(def.placement?.footprint||[1,1]).join('×'),'<dl class="service"><dt>Capacity</dt><dd>'+cap+'</dd><dt>City demand</dt><dd>'+demand+'</dd><dt>Vehicles active</dt><dd>'+calls+'</dd><dt>Jobs</dt><dd>'+(def.jobs||0)+'</dd>'+roadRow(b)+'<dt>Status</dt><dd class="'+(calls>=cap?'dn':'up')+'">'+(calls>=cap?'Busy':'Ready')+'</dd>'+
    (caseOpen?'<dt>Looking into</dt><dd>The '+caseOpen.name+'</dd>':'')+'</dl>'+
    (caseOpen?'<p>The officers here opened this case on their own. Nobody at City Hall asked them to, and nobody can call them off.</p>':''));
}
// Where a trade's raw material comes from, for the two links of the food chain
// that have one. A supplier out of reach halves the yield, so it is the first
// thing worth telling the player about the building they just tapped.
function supplyRow(b){
  const near=(list,r)=>(list||[]).some(o=>Math.abs(o.x-b.x)<=r&&Math.abs(o.y-b.y)<=r);
  if(b.type==='mill') return {label:'Grain from a farm',ok:near(S.ctx.farms,FARM_MILL_R),r:FARM_MILL_R,what:'farm'};
  if(b.type==='bakery') return {label:'Flour from a mill',ok:near(S.ctx.mills,BAKERY_MILL_R),r:BAKERY_MILL_R,what:'windmill'};
  return null;
}
function businessCard(b){
  const def=getBuildingDefinition(b.type),work=S.municipal.employment,jobs=def?.jobs||0,share=work.jobs?Math.min(jobs,Math.round(work.employed*jobs/work.jobs)):0;
  const sup=supplyRow(b);
  let html='';
  if(sup) html+='<p>'+(sup.ok?'A '+sup.what+' is within <b>'+sup.r+' tiles</b>, so it runs at <b>full tilt</b>.':'No '+sup.what+' within <b>'+sup.r+' tiles</b>, so it runs at <b>half</b>.')+'</p>';
  html+='<dl class="service">';
  if(sup) html+='<dt>'+sup.label+'</dt><dd class="'+(sup.ok?'up':'dn')+'">'+(sup.ok?'Good':'Short')+'</dd>';
  html+='<dt>Jobs filled</dt><dd>'+share+' / '+jobs+'</dd>'+roadRow(b)+'<dt>City prosperity</dt><dd>'+work.prosperity+' / 100</dd>';
  if(upkeepOf(b)) html+='<dt>Upkeep</dt><dd class="dn">\u2212'+upkeepOf(b)+' a day</dd>';
  html+='</dl>';
  // A front is a business, and the card says what a business card says. The
  // one thing it adds is what a neighbour would notice: the police asking.
  const front=frontAt(b);
  if(front&&underInvestigation(front)) html+='<p>The police have been asking questions here.</p>';
  /* A pitch is whatever the street made of it, and the card says so plainly —
     the player did not choose this and would otherwise have no way to find out
     why the barrow outside the green sells flowers. */
  const variety=varietyOf(b);
  if(variety) return card(variety.name,def?.name||'Business',
    '<p>Sells '+variety.sells+'. '+varietyReason(b)+'</p>'+html);
  // A place the valley knows for someone. Nobody made it popular.
  for(const star of venueFame(b)) html+='<p>'+(star.renown>=3?'Known across the valley':'Known locally')+' for <b>'+star.name+'</b>’s '+star.what+'.</p>';
  return card(def?.name||'Business','Business',html);
}

// A wonder is worth explaining in full: it is the most expensive thing in the
// game and everything it does happens somewhere other than its own tile.
function wonderCard(b){
  const def=getBuildingDefinition(b.type),e=wonderEffect(b.type)||{};
  let dl='<dl class="service">';
  if(e.mood) dl+='<dt>Mood, everywhere</dt><dd class="up">+'+e.mood+'</dd>';
  if(e.trade) dl+='<dt>Every till in the valley</dt><dd class="up">+'+Math.round(e.trade*100)+'%</dd>';
  if(e.dock) dl+='<dt>Every dock</dt><dd class="up">×'+e.dock+'</dd>';
  if(b.type==='greatLibrary'){
    const st=schoolStats(b);
    dl+='<dt>Pupils taught</dt><dd>'+st.served+' / '+st.capacity+'</dd>';
  }
  dl+='<dt>Upkeep</dt><dd class="dn">−'+upkeepOf(b)+' a day</dd></dl>';
  return card(def?.name||'Wonder','Wonder','<p>'+(def?.description||'')+'</p>'+dl);
}

/* Which part of town this is, under whatever the card said. It goes on every
   card rather than on a chosen few, because a district is a property of the
   place and not of the building standing on it - the meadow you are about to
   build on is in Southbank too.

   Extends the permanent rule rather than breaking it: the building still
   explains itself, City Hall still explains the city, and the district
   explains the neighbourhood. */
/* A household the valley has come to know. Leanings are given as a word or
   two, not a number: the card keeps some mystery, and a trait is a leaning,
   never a verdict. */
function familyBlock(h){
  const f=familyAt(h);
  if(!f) return '';
  const members=familyMembers(f);
  return '<h4>The '+f.surname+' family</h4>'+
    '<p>Here since <b>day '+f.founded+'</b>'+(f.roots?', settled in <b>'+f.roots+'</b>':'')+'. Known for '+knownFor(f)+'. <b>'+cap(familyStanding(f))+'</b>.'+
    ((f.generation||1)>1?' Now in its <b>'+ordinal(f.generation)+' generation</b>.':'')+rumour(f)+'</p>'+
    '<dl class="service">'+members.map(m=>'<dt>'+displayName(f,m.index)+'</dt><dd>'+memberCareer(f,m.index)+' · '+traitWords(m.traits).join(', ')+(fameWord(f,m.index)?' · <b>'+fameWord(f,m.index)+'</b>':'')+aliasNote(f,m.index)+'</dd>').join('')+'</dl>';
}
/* A family's ties to something the valley talks about are a rumour, not a
   record, and a small one stays unsaid: the card only hints once the thing
   has become a crew, and says which, never what anyone did. */
function rumour(f){
  const o=organisationOf(f);
  if(!o||o.stage<3) return '';
  const boss=o.boss&&o.boss.familyId===f.id?familyMembers(f).find(m=>m.index===o.boss.index):null;
  return boss?' People say <b>'+boss.first+'</b> runs <b>the '+o.name+'</b>.':' Said to have ties to <b>the '+o.name+'</b>.';
}
/* How widely the name has travelled. The card is the player's god's-eye view
   and may say a name the newspaper is not yet entitled to print. */
const ALIAS_REACH={private:'only at home',associates:'among associates',district:'around the neighbourhood',police:'known to the police',public:'known all over'};
function aliasNote(f,index){
  const a=aliasOf(f.id,index);
  if(!a) return '';
  return ' · <small>“'+a.alias+'” '+ALIAS_REACH[a.visibility]+(a.reason?', '+a.reason:'')+'</small>';
}
function cap(s){ return s?s[0].toUpperCase()+s.slice(1):s; }
function ordinal(n){ return n+(['th','st','nd','rd'][(n%100>10&&n%100<14)?0:(n%10<4?n%10:0)]); }
function districtFooter(x,y){
  const d=districtAt(x,y);
  if(!d) return '';
  const held=(d.identities||[]).map(i=>i.label).join(' · ');
  return '<div class="district-line"><b>'+d.name+'</b>'+(held?'<span>'+held+'</span>':'<span class="muted">still taking shape</span>')+'</div>';
}
export function describe(x,y){
  return describeTile(x,y)+districtFooter(x,y);
}
function describeTile(x,y){
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
    return card(HOUSE_NAMES[(hash2(b.seed,1,777)*HOUSE_NAMES.length)|0],"Home · "+b.pop+" of "+capFor(b)+" · "+housingTier(b).name,line+doing+dl+moodRow(mood)+educationBlock(b)+recreationBlock(b)+housingBlock(b)+familyBlock(b));
  }
  if(b){
    if(getBuildingDefinition(b.type)?.service?.type==='recreation') return recreationCard(b);
    if(['safety','fire','healthcare'].includes(getBuildingDefinition(b.type)?.service?.type)) return municipalCard(b);
    if(getBuildingDefinition(b.type)?.category==='wonder') return wonderCard(b);
    if((['cafe','market','bakery','mill'].includes(b.type)||getBuildingDefinition(b.type)?.trade)&&getBuildingDefinition(b.type)?.jobs) return businessCard(b);
    switch(b.type){
      case "farm": {
        const feeds=(S.ctx.mills||[]).filter(w=>Math.abs(w.x-rx)<=FARM_MILL_R&&Math.abs(w.y-ry)<=FARM_MILL_R).length;
        return card("The Farm","Farm",'<p>Grows the grain the windmills grind. Brings in <b>'+Math.round(FARM_YIELD+(PAL.yield||0))+' coins</b> a day at this time of year.</p><dl><dt>Mills it supplies</dt><dd class="'+(feeds?'up':'dn')+'">'+feeds+'</dd><dt>Homes in reach</dt><dd>'+countNear("houses",rx,ry,5)+'</dd></dl>');
      }
      case "buskerPitch": {
        /* The pitch is the player's half and the acts are not, so the card is
           mostly a report: who came, what they are doing, and — the thing the
           player cannot see any other way — whose being famous nearby is
           bringing them. An empty pitch says so rather than promising. */
        const here=buskersAt(rx,ry), live=liveliness(rx,ry);
        let body=here.length
          ? '<p>'+here.map(b=>'A <b>'+actOf(b.act).name+'</b>, '+actOf(b.act).doing+'.').join(' ')+'</p>'
          : '<p>Nobody has set up here today. A pitch fills when the street around it is worth standing on.</p>';
        const drawn=here.find(b=>b.drawnBy);
        if(drawn) body+='<p>Drawn by <b>'+drawn.drawnBy+'</b> playing nearby.</p>';
        body+='<dl class="service"><dt>Homes in earshot</dt><dd class="'+(live.homes?'up':'dn')+'">'+live.homes+'</dd>'
          +'<dt>Trade to draw a crowd</dt><dd class="'+(live.trade?'up':'dn')+'">'+live.trade+'</dd>'
          +'<dt>Somebody famous nearby</dt><dd class="'+(live.stars.length?'up':'dn')+'">'+(live.stars.length?live.stars[0].name:'Nobody yet')+'</dd>'
          +(upkeepOf(b)?'<dt>Upkeep</dt><dd class="dn">\u2212'+upkeepOf(b)+' a day</dd>':'')+'</dl>';
        return card("The Pitch","Busker\u2019s Pitch",body);
      }
      case "cafe": return card("The Corner Café","Café",'<p>Trades for <b>9 coins</b> a day and lifts every home within <b>5 tiles</b>.</p><dl><dt>Homes in reach</dt><dd>'+countNear("houses",rx,ry,5)+'</dd></dl>');
      case "station": return card("Meadowline Halt","Station",'<p>Worth <b>16</b> to every home within <b>6 tiles</b>, whether or not a train has come yet.</p><dl><dt>Homes in reach</dt><dd>'+countNear("houses",rx,ry,6)+'</dd>'+roadRow(b)+'<dt>Trains running</dt><dd>'+S.trains.length+'</dd></dl>');
      case "lamp": return card("Street Lamp","Lamp",'<p>A small lift within <b>2 tiles</b> that <b>doubles</b> once the light goes.</p><dl><dt>Homes in reach</dt><dd>'+countNear("houses",rx,ry,2)+'</dd><dt>Right now</dt><dd>'+(darkness()>0.2?"Lit":"Waiting for dusk")+'</dd></dl>');
      case "mill": return card("The Windmill","Windmill",'<p>Grinds coin every day, and best of all at harvest.</p><dl><dt>Today’s yield</dt><dd>'+Math.round(9+(PAL.yield||0))+'</dd><dt>Charm within 3</dt><dd class="up">+4</dd></dl>');
      case "market": return card("The Market","Market",'<p>Lifts what every café and bakery takes, and cheers the streets within <b>5 tiles</b>.</p><dl><dt>Homes in reach</dt><dd>'+countNear("houses",rx,ry,5)+'</dd><dt>Trades lifted</dt><dd>'+(S.ctx.cafes.length+S.ctx.bakeries.length)+'</dd></dl>');
      case "bakery": {
        const supplied=S.ctx.mills.some(w=>Math.abs(w.x-rx)<=4&&Math.abs(w.y-ry)<=4);
        return card("The Bakery","Bakery",'<p>Bakes what the windmills grind. '+(supplied?'A mill is in reach, so it runs at <b>full tilt</b>.':'No mill within <b>4 tiles</b>, so it runs at <b>half</b>.')+'</p><dl><dt>Flour supply</dt><dd class="'+(supplied?'up':'dn')+'">'+(supplied?'Good':'Short')+'</dd><dt>Homes in reach</dt><dd>'+countNear("houses",rx,ry,4)+'</dd></dl>');
      }
      case "school": return schoolCard(b);
      case "dock": return card("The Dock","Dock",'<p>Boats put out from here and sail the open water. Homes with a view of it are cheered for <b>4 tiles</b>.</p><dl><dt>Boats afloat</dt><dd>'+S.boats.length+'</dd><dt>Homes in reach</dt><dd>'+countNear("houses",rx,ry,4)+'</dd>'+roadRow(b)+'</dl>');
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

/* Filling the panel, and where that leaves the reader.

   `.look` is the scroll container, so the position left behind by the last
   card survives into the next one. Scroll a long house card, close it, open
   City Hall, and its section nav is above the fold with nothing on screen to
   suggest there is anything up there — which looks exactly like a panel whose
   top has been clipped off, and is not something any amount of CSS can fix.

   A card that is merely being refreshed in place keeps its position, because
   yanking somebody back to the top every time the simulation ticks would be
   worse than the bug. */
export function fillLook(html,{keepScroll=false}={}){
  elLookBody.innerHTML=html;
  if(!keepScroll) elLook.scrollTop=0;
}

export function inspect(x,y){
  if(!inBounds(x,y)){ closeLook(); return; }
  elLook.classList.remove('cityhall-open');
  const root=facilityRootAt(x,y);
  S.pick={x:root?.x??x,y:root?.y??y};
  fillLook(describe(S.pick.x,S.pick.y));
  elLook.classList.add("show");
  services.blip(600,0.04,"triangle");
}
export function refreshLook(){
  if(S.pick&&elLook.classList.contains("show")) fillLook(describe(S.pick.x,S.pick.y),{keepScroll:true});
}
