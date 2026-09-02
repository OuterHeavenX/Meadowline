import { getUpgradeDefinition } from '../buildings/registry.js';
import { save } from '../core/save.js';
import { S } from '../core/state.js';
import { CITY_STAGES, parcelStatus, unlockParcel } from '../progression/city-growth.js';
import { civicUpgradeStatus, upgradeCivic } from '../progression/civic-upgrades.js';
import { getCitySummary } from '../simulation/city-summary.js';
import { idx } from '../world/tiles.js';
import { paintGrowthPanel } from './growth.js';
import { toast } from './notify.js';
import { askConfirm } from './confirm.js';

const elLook=document.getElementById('look');
const elLookBody=document.getElementById('look-body');
let activeSection='overview';

function row(label,value,cls=''){ return '<dt>'+label+'</dt><dd class="'+cls+'">'+value+'</dd>'; }
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
function goalRows(goals){
  if(!goals.length) return '<p class="muted">No Town Goal is waiting right now.</p>';
  return goals.map(g=>'<div class="city-goal"><b>'+(g.slot==='primary'?'NEXT STEP':'OPTIONAL')+'</b><p>'+g.label+'</p><small>'+g.current+' / '+g.target+' · reward '+g.reward+' coins</small></div>').join('');
}
function landRows(summary){
  let html='<dl class="service">'+row('Opened',summary.land.opened+' / '+summary.land.total+' parcels')+'</dl>';
  if(S.cityProgress?.mode==='legacy-open') return html+'<p>This established city keeps full land access.</p>';
  if(!summary.land.available.length) return html+'<p class="muted">No new parcel is ready to purchase at this stage.</p>';
  html+='<p class="muted">Available next:</p>';
  for(const p of summary.land.available){
    const st=parcelStatus(p.id);
    html+='<button type="button" class="go cityhall-parcel" data-cityhall-parcel="'+p.id+'" '+(st?.coinsOk?'':'disabled')+'>'+p.name+' · '+p.cost+' coins</button>';
  }
  return html;
}
const CATEGORY_LABEL={ways:'Ways',homes:'Homes',civic:'Civic',safety:'Safety',health:'Health',trade:'Trade',recreation:'Recreation',green:'Green',wonder:'Wonders'};
function financeRows(f){
  let html='<dl class="service">'+row('Treasury',f.treasury+' coins');
  if(f.total===null){ html+='</dl><p class="muted">The income breakdown appears after the next payday.</p>'; return html; }
  html+=row('Residential taxes','+'+f.residentialTax)+row('Trade','+'+f.trade)+row('Milling','+'+f.milling);
  if(f.farming) html+=row('Farming','+'+f.farming);
  if(f.harbour) html+=row('Harbour','+'+f.harbour);
  html+=row('Town grant','+'+f.grant);
  if(f.relief) html+=row('County relief','+'+f.relief,'dn');
  if(f.upkeep) html+=row('Income','+'+(f.income+(f.relief||0)),'up')+row('Upkeep','\u2212'+f.upkeep,'dn');
  html+=row('Last payday',(f.total<0?'\u2212'+Math.abs(f.total):'+'+f.total),f.total<0?'dn':'up')+'</dl>';
  // Which part of the town is expensive to run is the actionable half of the
  // number, so the split follows the total rather than getting its own panel.
  const parts=Object.entries(f.upkeepBy||{}).sort((a,b)=>b[1]-a[1]);
  if(parts.length) html+='<p class="muted">Upkeep: '+parts.map(([k,v])=>(CATEGORY_LABEL[k]||k)+' '+v).join(' \u00b7 ')+'</p>';
  if(f.relief) html+='<p class="muted">Meadowline could not meet its upkeep. Remove what the town cannot afford to run, or grow the income to match it.</p>';
  return html;
}
function upgradeBlock(b){
  const level=Math.max(1,Math.min(4,Math.floor(Number(b.state?.level)||1)));
  const current=getUpgradeDefinition('cityHall',level);
  const st=civicUpgradeStatus(b);
  if(st.maxed) return '<h4>Civic Center</h4><p><b>Meadowline City Hall is complete.</b> Future municipal systems can report here without changing City Growth.</p>';
  const next=st.next;
  return '<h4>Civic Center</h4><dl class="service">'+row('Current',current?.name||'Civic Center')+row('Next',next.name)+row('City stage',CITY_STAGES[(next.requiresStage||1)-1].name,st.stageOk?'up':'dn')+row('Cost',next.cost+' coins',st.coinsOk?'':'dn')+'</dl>'+
    '<button type="button" class="go civic-upgrade" data-upgrade-cityhall="1" '+(st.available?'':'disabled')+'>Upgrade to '+next.name+'</button>'+
    (!st.stageOk?'<p class="muted">This improvement unlocks when Meadowline reaches '+CITY_STAGES[next.requiresStage-1].name+'.</p>':!st.coinsOk?'<p class="muted">The city can keep growing while you save for this improvement.</p>':'<p class="muted">Upgrading is optional and does not gate the next city stage.</p>');
}
function stat(label,value,tone=''){return '<div class="cityhall-stat '+tone+'"><span>'+label+'</span><b>'+value+'</b></div>';}
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
  elLook.classList.add('cityhall-open');
  elLookBody.innerHTML='<div class="cityhall-shell"><nav class="cityhall-nav" aria-label="City Hall sections">'+nav.map(n=>'<button type="button" class="'+(activeSection===n[0]?'on':'')+'" data-cityhall-nav="'+n[0]+'">'+n[1]+'</button>').join('')+'</nav><main class="cityhall-content"><header class="cityhall-hero"><div><h3>Meadowline City Hall</h3><div class="kind">'+name+' · Level '+level+'</div></div><div class="cityhall-stat"><span>City stage</span><b>'+o.stage+'</b></div></header>'+
    section('overview','Town overview','<div class="cityhall-grid">'+stat('Population',o.population)+stat('Housing',o.occupiedHomes+' / '+o.homes)+stat('Mood',o.mood)+stat('Education',o.education)+stat('Recreation',rec.served+' / '+rec.demand)+stat('Prosperity',work.prosperity+' / 100')+stat('Crime pressure',crime)+stat('Fire risk',fireRisk)+stat('Healthcare',health.demand+' demand')+'</div>'+upgradeBlock(b))+
    section('goals','Town Goals',goalRows(summary.goals))+
    section('growth','City Growth',growthRows(summary.growth.next)+'<div class="cityhall-grid">'+stat('Cottages',o.cottages)+stat('Town Homes',o.townHomes)+stat('Established',o.establishedHomes)+'</div>')+
    section('land','Land management',landRows(summary))+
    section('finances','Finances',financeRows(summary.finances))+
    section('services','Infrastructure & services','<div class="cityhall-grid">'+stat('Schools',ed.schools)+stat('Students',ed.served+' / '+ed.demand)+stat('Recreation facilities',rec.facilities)+stat('Police capacity',safe.capacity)+stat('Fire capacity',fire.capacity)+stat('Healthcare capacity',health.capacity)+stat('Workers',work.employed+' / '+work.workers)+stat('Jobs',work.jobs)+stat('Unemployed',work.unemployed)+'</div><p class="muted">These cards report real city systems. No future or normalized service score is invented.</p>')+
    section('mobility','Mobility','<div class="cityhall-grid">'+stat('Road tiles',mob.roadTiles)+stat('Road components',mob.components)+stat('Rail crossings',mob.crossings)+stat('Signalled junctions',mob.signals??0)+stat('Vehicles active',mob.vehicles)+'</div><p class="muted">Vehicles represent town life and service movement, not a congestion score.</p>')+
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
