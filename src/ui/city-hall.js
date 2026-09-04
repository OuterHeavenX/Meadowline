import { getUpgradeDefinition } from '../buildings/registry.js';
import { save } from '../core/save.js';
import { S } from '../core/state.js';
import { CITY_STAGES, nextStageProgress, parcelStatus, unlockParcel } from '../progression/city-growth.js';
import { civicUpgradeStatus, upgradeCivic } from '../progression/civic-upgrades.js';
import { getCitySummary } from '../simulation/city-summary.js';
import { idx } from '../world/tiles.js';
import { buildingThumbnail } from '../rendering/thumbnails.js';
import { landmarkKey } from '../rendering/landmark-assets.js';
import { paintGrowthPanel } from './growth.js';
import { toast } from './notify.js';
import { askConfirm } from './confirm.js';

const elLook=document.getElementById('look');
const elLookBody=document.getElementById('look-body');
let activeSection='overview';

/* ---------- panel furniture ----------
   The panel reported the city honestly and looked like a settings dialog doing
   it: seven identical text buttons down one side and rows of grey figures down
   the other. Nothing said which numbers were healthy, and the civic centre -
   the building you are standing in - never appeared. The readings are the same
   readings; they are given an icon, a colour that means something, and a shape
   you can scan. */
function icon(d){ return '<span class="mi"><svg viewBox="0 0 24 24">'+d+'</svg></span>'; }
const NAV_ICON={
  overview:'<path d="M4 13h6V4H4v9Zm0 7h6v-4H4v4Zm10 0h6v-9h-6v9Zm0-16v4h6V4h-6Z"/>',
  goals:'<path d="M12 21s-7-4.4-7-9.6A4.4 4.4 0 0 1 12 8a4.4 4.4 0 0 1 7 3.4C19 16.6 12 21 12 21Z"/>',
  growth:'<path d="M4 19h16M6.5 19v-6M11 19V9m4.5 10v-4M20 19V5"/>',
  land:'<path d="M4 8.5 9.5 5.5 14.5 8.5 20 5.5v10L14.5 18.5 9.5 15.5 4 18.5v-10ZM9.5 5.5v10M14.5 8.5v10"/>',
  finances:'<path d="M12 4v16M8.5 7.5h6.2a2.4 2.4 0 0 1 0 4.8H9.3a2.4 2.4 0 0 0 0 4.8h6.2"/>',
  services:'<path d="M12 3.5 19.5 7v5.5c0 4.4-3.1 7.3-7.5 8-4.4-.7-7.5-3.6-7.5-8V7L12 3.5ZM9.5 12l1.8 1.9 3.4-3.6"/>',
  mobility:'<path d="M5 16.5h14M6.5 16.5v-4l1.8-4h7.4l1.8 4v4M8 16.5v2H6v-2m12 0v2h-2v-2M8.5 12.5h7"/>'
};
const I={
  people:'<path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-5 8c0-3 2.4-5 5-5s5 2 5 5M16 6.2a2.7 2.7 0 0 1 0 5.4m1 2.6c2 .6 3.4 2.3 3.4 4.8"/>',
  home:'<path d="M3.5 11.5 12 4l8.5 7.5M6 10.5V20h12v-9.5M10 20v-5h4v5"/>',
  mood:'<path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM8.5 9.5h.01M15.5 9.5h.01M8 14.5c1 1.3 2.4 2 4 2s3-.7 4-2"/>',
  book:'<path d="M4 5.5h6a2 2 0 0 1 2 2v11a2.4 2.4 0 0 0-2-1.4H4v-11Zm16 0h-6a2 2 0 0 0-2 2v11a2.4 2.4 0 0 1 2-1.4h6v-11Z"/>',
  park:'<path d="M12 3 6.5 12h11L12 3ZM12 12v8M8.5 20h7"/>',
  coin:'<path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7.5v9M9.8 9.8h3.4a1.9 1.9 0 0 1 0 3.8h-2.6a1.9 1.9 0 0 0 0 3.8h3.4"/>',
  shield:'<path d="M12 3.5 19.5 7v5.5c0 4.4-3.1 7.3-7.5 8-4.4-.7-7.5-3.6-7.5-8V7L12 3.5Z"/>',
  flame:'<path d="M12 3.5c.6 3 3 3.8 3 6.5a3 3 0 0 1-3 3 3 3 0 0 1-3-3c0-1 .5-1.8 1-2.4M12 20.5a5.5 5.5 0 0 0 5.5-5.5c0-3.4-2.6-5-3.6-7.6M12 20.5A5.5 5.5 0 0 1 6.5 15c0-2 1-3.3 2-4.6"/>',
  cross:'<path d="M9.5 3.5h5v6h6v5h-6v6h-5v-6h-6v-5h6v-6Z"/>',
  school:'<path d="M3 9.5 12 5.5l9 4-9 4-9-4ZM7 12v4.6c0 1.3 2.2 2.4 5 2.4s5-1.1 5-2.4V12M20 10.5v5"/>',
  work:'<path d="M4 8.5h16v10H4v-10ZM9 8.5V6.2c0-.9.7-1.7 1.6-1.7h2.8c.9 0 1.6.8 1.6 1.7v2.3M4 13h16"/>',
  road:'<path d="M7 21 4.5 3M17 21l2.5-18M12 4.5v3M12 11v3M12 17.5v3"/>',
  car:'<path d="M5 16.5h14M6.5 16.5v-4l1.8-4h7.4l1.8 4v4M8 16.5v2H6v-2m12 0v2h-2v-2"/>',
  rail:'<path d="M6.5 3.5v17M17.5 3.5v17M4 8h16M4 13h16M4 18h16"/>',
  signal:'<path d="M9 3.5h6v13H9v-13ZM12 16.5v4M12 6.5h.01M12 10h.01M12 13.5h.01"/>',
  tick:'<path d="M4.5 12.5 9.5 17.5 19.5 6.5"/>',
  spark:'<path d="M12 3.5 13.8 9l5.7.6-4.3 3.8 1.3 5.6L12 16.1 7.5 19l1.3-5.6L4.5 9.6 10.2 9 12 3.5Z"/>'
};
function row(label,value,cls=''){ return '<dt>'+label+'</dt><dd class="'+cls+'">'+value+'</dd>'; }
/* Colour is a reading, not decoration: a tile is green when the town is
   comfortably ahead, amber when it is close, red when it is short. A tile with
   no such threshold stays neutral rather than being coloured for looks. */
function tone(part,whole){
  if(!(whole>0)) return '';
  const r=part/whole;
  return r>=0.95?'good':r>=0.7?'warn':'bad';
}
function stat(label,value,glyph,cls=''){
  return '<div class="ch-stat '+cls+'">'+icon(glyph)+'<span>'+label+'</span><b>'+value+'</b></div>';
}
function card(title,glyph,body,cls=''){
  return '<section class="ch-card '+cls+'"><h5>'+icon(glyph)+title+'</h5>'+body+'</section>';
}
function growthRows(next){
  if(!next) return '<p><b>Growing Town.</b> Meadowline has reached its current civic stage.</p>';
  let html='<p><b>Next stage: '+next.stage.name+'</b></p><dl class="service">';
  for(const r of next.progress.required) html+=row(r.label,r.value+' / '+r.atLeast,r.met?'up':'dn');
  html+='</dl>';
  for(const group of next.progress.any){
    html+='<p class="muted">Complete any '+group.count+' of these:</p><dl class="service">';
    for(const r of group.items) html+=row(r.label,r.value+' / '+r.atLeast,r.met?'up':'dn');
    html+='</dl>';
  }
  return html;
}
/* How far the town is through its current stage, counted the same way the
   stage badge in the HUD counts it, so the two never disagree. */
function stageProgress(){
  const next=nextStageProgress();
  if(!next) return {pct:100,label:'Final stage reached',met:0,total:0};
  const rows=[...next.progress.required,...next.progress.any.flatMap(g=>g.items)];
  const met=rows.filter(r=>r.met).length;
  return {pct:rows.length?Math.round(met/rows.length*100):0,label:'Next: '+next.stage.name,met,total:rows.length};
}
function stageCard(stageName){
  const p=stageProgress();
  return card('City stage',I.spark,
    '<div class="ch-stage"><b>'+stageName+'</b><span>'+p.label+'</span></div>'+
    '<div class="ch-bar"><i style="width:'+p.pct+'%"></i></div>'+
    '<small class="muted">'+(p.total?p.met+' of '+p.total+' requirements met · '+p.pct+'%':'Meadowline has reached its current civic stage.')+'</small>','ch-card-stage');
}
function goalRows(goals){
  if(!goals.length) return '<p class="muted">No Town Goal is waiting right now.</p>';
  return goals.map(g=>{
    const pct=g.target>0?Math.min(100,Math.round(g.current/g.target*100)):0;
    return '<div class="city-goal '+(g.slot==='primary'?'primary':'')+'"><b>'+icon(NAV_ICON.goals)+(g.slot==='primary'?'NEXT STEP':'OPTIONAL')+'</b><p>'+g.label+'</p>'+
      '<div class="ch-bar"><i style="width:'+pct+'%"></i></div>'+
      '<small>'+g.current+' / '+g.target+' · reward '+g.reward+' coins</small></div>';
  }).join('');
}
function landRows(summary){
  const opened=summary.land.opened,total=summary.land.total;
  let html='<div class="ch-grid">'+stat('Parcels open',opened+' / '+total,NAV_ICON.land)+
    stat('Treasury',summary.finances.treasury,I.coin)+'</div>';
  if(S.cityProgress?.mode==='legacy-open') return html+'<p>This established city keeps full land access.</p>';
  if(!summary.land.available.length) return html+'<p class="muted">No new parcel is ready to purchase at this stage.</p>';
  let rows='';
  for(const p of summary.land.available){
    const st=parcelStatus(p.id);
    rows+='<div class="ch-buy"><div><b>'+p.name+'</b><small class="muted">'+p.cost+' coins'+
      (st?.coinsOk?'':' \u00b7 '+Math.max(0,p.cost-summary.finances.treasury)+' more to save')+'</small></div>'+
      '<button type="button" class="go cityhall-parcel" data-cityhall-parcel="'+p.id+'" '+(st?.coinsOk?'':'disabled')+'>'+
      icon(I.tick)+'<span>Open land</span></button></div>';
  }
  return html+card('Purchase land',NAV_ICON.land,rows,'ch-card-buy');
}
const CATEGORY_LABEL={ways:'Ways',homes:'Homes',civic:'Civic',safety:'Safety',health:'Health',trade:'Trade',recreation:'Recreation',green:'Green',wonder:'Wonders'};
function financeRows(f){
  let html='<div class="ch-grid">'+stat('Treasury',f.treasury,I.coin)+
    (f.total===null?'':stat('Last payday',(f.total<0?'−'+Math.abs(f.total):'+'+f.total),I.spark,f.total<0?'bad':'good'))+
    (f.upkeep?stat('Upkeep',f.upkeep,I.work,f.relief?'bad':''):'')+'</div>';
  if(f.total===null) return html+'<p class="muted">The income breakdown appears after the next payday.</p>';
  html+='<dl class="service">'+row('Residential taxes','+'+f.residentialTax)+row('Trade','+'+f.trade)+row('Milling','+'+f.milling);
  if(f.farming) html+=row('Farming','+'+f.farming);
  if(f.harbour) html+=row('Harbour','+'+f.harbour);
  html+=row('Town grant','+'+f.grant);
  if(f.relief) html+=row('County relief','+'+f.relief,'dn');
  if(f.upkeep) html+=row('Income','+'+(f.income+(f.relief||0)),'up')+row('Upkeep','−'+f.upkeep,'dn');
  html+=row('Last payday',(f.total<0?'−'+Math.abs(f.total):'+'+f.total),f.total<0?'dn':'up')+'</dl>';
  // Which part of the town is expensive to run is the actionable half of the
  // number, so the split follows the total rather than getting its own panel.
  const parts=Object.entries(f.upkeepBy||{}).sort((a,b)=>b[1]-a[1]);
  if(parts.length) html+='<p class="muted">Upkeep: '+parts.map(([k,v])=>(CATEGORY_LABEL[k]||k)+' '+v).join(' · ')+'</p>';
  if(f.relief) html+='<p class="muted">Meadowline could not meet its upkeep. Remove what the town cannot afford to run, or grow the income to match it.</p>';
  return html;
}
/* Ticks list what the upgrade actually is, taken from the building registry.
   No effect is claimed that the game does not have: the civic centre is a
   landmark and a reporting desk, and the list says so. */
function benefit(text,met){ return '<li class="'+(met?'yes':'no')+'">'+icon(met?I.tick:I.spark)+'<span>'+text+'</span></li>'; }
function upgradeBlock(b){
  const level=Math.max(1,Math.min(4,Math.floor(Number(b.state?.level)||1)));
  const current=getUpgradeDefinition('cityHall',level);
  const st=civicUpgradeStatus(b);
  if(st.maxed) return card('City Hall upgrades',NAV_ICON.services,
    '<p><b>Meadowline City Hall is complete.</b> Future municipal systems can report here without changing City Growth.</p>','ch-card-upgrade');
  const next=st.next;
  const needStage=CITY_STAGES[(next.requiresStage||1)-1].name;
  const list='<ul class="ch-benefits">'+
    benefit(next.description||('The civic centre becomes '+next.name+'.'),true)+
    benefit('Level '+next.level+' civic building on the same tile',true)+
    benefit('Requires '+needStage,st.stageOk)+
    benefit('Costs '+next.cost+' coins',st.coinsOk)+
    '</ul>';
  return card('City Hall upgrades',NAV_ICON.services,
    '<div class="ch-upgrade-head"><div><small class="muted">Current</small><b>'+(current?.name||'Civic Center')+'</b></div>'+
    '<span class="mi ch-arrow"><svg viewBox="0 0 24 24"><path d="M5 12h13M13 7l5 5-5 5"/></svg></span>'+
    '<div><small class="muted">Next</small><b>'+next.name+'</b></div></div>'+list+
    '<button type="button" class="go primary civic-upgrade" data-upgrade-cityhall="1" '+(st.available?'':'disabled')+'>Upgrade to '+next.name+'</button>'+
    (!st.stageOk?'<small class="muted">This improvement unlocks when Meadowline reaches '+needStage+'.</small>':!st.coinsOk?'<small class="muted">The city can keep growing while you save for this improvement.</small>':'<small class="muted">Upgrading is optional and does not gate the next city stage.</small>'),'ch-card-upgrade');
}
function section(id,title,html){return '<section class="cityhall-section '+(activeSection===id?'on':'')+'" data-cityhall-section="'+id+'"><h4>'+title+'</h4>'+html+'</section>';}

export function cityHallSelected(){
  if(!S.pick) return false;
  return S.grid[idx(S.pick.x,S.pick.y)]?.type==='cityHall';
}
export function renderCityHall(){
  if(!cityHallSelected()) return false;
  const b=S.grid[idx(S.pick.x,S.pick.y)];
  const summary=getCitySummary();
  const level=Math.max(1,Math.min(4,Math.floor(Number(b.state?.level)||1)));
  const name=getUpgradeDefinition('cityHall',level)?.name||'Town Office';
  const o=summary.overview, ed=summary.services.education, rec=summary.services.recreation, mob=summary.mobility;
  const safe=summary.services.safety,fire=summary.services.fire,health=summary.services.healthcare,work=summary.employment;
  const nav=[['overview','Overview'],['goals','Town Goals'],['growth','Growth'],['land','Land'],['finances','Finances'],['services','Services'],['mobility','Mobility']];
  const crime=safe.pressure===0?'Low':safe.pressure<35?'Limited':'Elevated',fireRisk=fire.risk===0?'Low':fire.risk<30?'Limited':'Elevated';
  const crimeTone=safe.pressure===0?'good':safe.pressure<35?'warn':'bad',fireTone=fire.risk===0?'good':fire.risk<30?'warn':'bad';
  // The building you are standing in, drawn from the same authored mesh the
  // valley uses, so the panel is unmistakably this City Hall and not a generic
  // civic dialog.
  const art=buildingThumbnail(landmarkKey(b));
  elLook.classList.add('cityhall-open');
  elLookBody.innerHTML='<div class="cityhall-shell"><nav class="cityhall-nav" aria-label="City Hall sections">'+
    nav.map(n=>'<button type="button" class="'+(activeSection===n[0]?'on':'')+'" data-cityhall-nav="'+n[0]+'">'+icon(NAV_ICON[n[0]])+'<span>'+n[1]+'</span></button>').join('')+
    '</nav><main class="cityhall-content"><header class="cityhall-hero">'+
    '<div class="ch-crest">'+(art?'<img src="'+art+'" alt="" draggable="false">':icon(NAV_ICON.overview))+'</div>'+
    '<div class="ch-title"><h3>Meadowline City Hall</h3><div class="kind">'+name+'</div></div>'+
    '<span class="ch-level">Level '+level+'</span></header>'+
    section('overview','Town overview',stageCard(o.stage)+'<div class="ch-grid">'+
      stat('Population',o.population,I.people)+
      stat('Housing',o.occupiedHomes+' / '+o.homes,I.home,tone(o.occupiedHomes,o.homes))+
      stat('Mood',o.mood,I.mood,o.mood>=70?'good':o.mood>=45?'warn':'bad')+
      stat('Education',o.education,I.book)+
      stat('Recreation',rec.served+' / '+rec.demand,I.park,tone(rec.served,rec.demand))+
      stat('Prosperity',work.prosperity+' / 100',I.coin,tone(work.prosperity,100))+
      stat('Crime pressure',crime,I.shield,crimeTone)+
      stat('Fire risk',fireRisk,I.flame,fireTone)+
      stat('Healthcare',health.demand+' demand',I.cross)+
      '</div>'+upgradeBlock(b))+
    section('goals','Town Goals',goalRows(summary.goals))+
    section('growth','City Growth',stageCard(o.stage)+growthRows(summary.growth.next)+'<div class="ch-grid">'+
      stat('Cottages',o.cottages,I.home)+stat('Town Homes',o.townHomes,I.home)+stat('Established',o.establishedHomes,I.home)+'</div>')+
    section('land','Land management',landRows(summary))+
    section('finances','Finances',financeRows(summary.finances))+
    section('services','Infrastructure & services','<div class="ch-grid">'+
      stat('Schools',ed.schools,I.school)+
      stat('Students',ed.served+' / '+ed.demand,I.book,tone(ed.served,ed.demand))+
      stat('Recreation facilities',rec.facilities,I.park)+
      stat('Police capacity',safe.capacity,I.shield)+
      stat('Fire capacity',fire.capacity,I.flame)+
      stat('Healthcare capacity',health.capacity,I.cross)+
      stat('Workers',work.employed+' / '+work.workers,I.work,tone(work.employed,work.workers))+
      stat('Jobs',work.jobs,I.work)+
      stat('Unemployed',work.unemployed,I.people,work.unemployed?'warn':'good')+
      '</div><p class="muted">These cards report real city systems. No future or normalized service score is invented.</p>')+
    section('mobility','Mobility','<div class="ch-grid">'+
      stat('Road tiles',mob.roadTiles,I.road)+
      stat('Road components',mob.components,NAV_ICON.mobility)+
      stat('Rail crossings',mob.crossings,I.rail)+
      stat('Signalled junctions',mob.signals??0,I.signal)+
      stat('Vehicles active',mob.vehicles,I.car)+
      '</div><p class="muted">Vehicles represent town life and service movement, not a congestion score.</p>')+
    '</main></div>';
  return true;
}
export function inspectCityHall(x,y){
  const b=S.grid[idx(x,y)]; if(!b||b.type!=='cityHall') return false;
  S.pick={x,y}; renderCityHall(); elLook.classList.add('show');
  if(S.diagnostics) S.diagnostics.cityHallPanelOpens=(S.diagnostics.cityHallPanelOpens||0)+1;
  return true;
}

elLookBody?.addEventListener('click',async e=>{
  if(!cityHallSelected()) return;
  const nav=e.target.closest('[data-cityhall-nav]');
  if(nav){activeSection=nav.dataset.cityhallNav;renderCityHall();return;}
  const parcel=e.target.closest('[data-cityhall-parcel]');
  if(parcel){
    const st=parcelStatus(parcel.dataset.cityhallParcel); if(!st) return;
    if(!st.coinsOk){ toast('You need '+st.parcel.cost+' coins to open '+st.parcel.name+'.'); return; }
    if(!await askConfirm({title:'Open '+st.parcel.name+'?',body:'This costs '+st.parcel.cost+' coins and cannot be undone.',confirmLabel:'Open land'})) return;
    const r=unlockParcel(st.parcel.id);
    if(r.ok){ toast(r.parcel.name+' is open','gold'); save(); paintGrowthPanel(); renderCityHall(); }
    else toast(r.why||'That land cannot be opened yet.');
    return;
  }
  const upgrade=e.target.closest('[data-upgrade-cityhall]');
  if(!upgrade) return;
  const b=S.grid[idx(S.pick.x,S.pick.y)];
  const st=civicUpgradeStatus(b);
  if(!st.available){ toast(st.reason||'That civic upgrade is not ready yet.'); return; }
  if(!await askConfirm({title:'Upgrade to '+st.next.name+'?',body:'This costs '+st.next.cost+' coins.',confirmLabel:'Upgrade'})) return;
  const r=upgradeCivic(b);
  if(!r.ok){ toast(r.why||'The civic center could not be upgraded.'); return; }
  toast(r.upgrade.name+' established','gold'); save(); renderCityHall();
});
