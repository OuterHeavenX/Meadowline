import { getUpgradeDefinition } from '../buildings/registry.js';
import { save } from '../core/save.js';
import { S } from '../core/state.js';
import { CITY_STAGES, parcelStatus, unlockParcel } from '../progression/city-growth.js';
import { civicUpgradeStatus, upgradeCivic } from '../progression/civic-upgrades.js';
import { getCitySummary } from '../simulation/city-summary.js';
import { idx } from '../world/tiles.js';
import { paintGrowthPanel } from './growth.js';
import { toast } from './notify.js';

const elLook=document.getElementById('look');
const elLookBody=document.getElementById('look-body');

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
    html+='<button class="go cityhall-parcel" data-cityhall-parcel="'+p.id+'" '+(st?.coinsOk?'':'disabled')+'>'+p.name+' · '+p.cost+' coins</button>';
  }
  return html;
}
function financeRows(f){
  let html='<dl class="service">'+row('Treasury',f.treasury+' coins');
  if(f.total===null){ html+='</dl><p class="muted">The income breakdown appears after the next payday.</p>'; return html; }
  html+=row('Residential taxes','+'+f.residentialTax)+row('Trade','+'+f.trade)+row('Milling','+'+f.milling)+row('Town grant','+'+f.grant)+row('Last payday','+'+f.total,'up')+'</dl>';
  return html;
}
function upgradeBlock(b){
  const level=Math.max(1,Math.min(4,Math.floor(Number(b.state?.level)||1)));
  const current=getUpgradeDefinition('cityHall',level);
  const st=civicUpgradeStatus(b);
  if(st.maxed) return '<h4>Civic Center</h4><p><b>Meadowline City Hall is complete.</b> Future municipal systems can report here without changing City Growth.</p>';
  const next=st.next;
  return '<h4>Civic Center</h4><dl class="service">'+row('Current',current?.name||'Civic Center')+row('Next',next.name)+row('City stage',CITY_STAGES[(next.requiresStage||1)-1].name,st.stageOk?'up':'dn')+row('Cost',next.cost+' coins',st.coinsOk?'':'dn')+'</dl>'+
    '<button class="go civic-upgrade" data-upgrade-cityhall="1" '+(st.available?'':'disabled')+'>Upgrade to '+next.name+'</button>'+
    (!st.stageOk?'<p class="muted">This improvement unlocks when Meadowline reaches '+CITY_STAGES[next.requiresStage-1].name+'.</p>':!st.coinsOk?'<p class="muted">The city can keep growing while you save for this improvement.</p>':'<p class="muted">Upgrading is optional and does not gate the next city stage.</p>');
}

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
  const o=summary.overview, ed=summary.services.education, mob=summary.mobility;
  elLookBody.innerHTML='<h3>MEADOWLINE</h3><div class="kind">'+name+' · Level '+level+' · '+o.stage+'</div>'+
    '<h4>Overview</h4><dl class="service">'+row('Population',o.population)+row('Occupied homes',o.occupiedHomes+' / '+o.homes)+row('Cottages',o.cottages)+row('Town Homes',o.townHomes)+row('Established Homes',o.establishedHomes)+row('Mood',o.mood)+row('Education',o.education)+row('Desirability',o.desirability)+'</dl>'+
    '<h4>Town Goals</h4>'+goalRows(summary.goals)+
    '<h4>City Growth</h4>'+growthRows(summary.growth.next)+
    '<h4>Land</h4>'+landRows(summary)+
    '<h4>Finances</h4>'+financeRows(summary.finances)+
    '<h4>Services</h4><h5>Education</h5><dl class="service">'+row('Schools',ed.schools)+row('Expanded Schools',ed.level2)+row('Students served',ed.served+' / '+ed.demand)+row('Waiting',ed.waiting)+row('Average Education',o.education)+'</dl>'+
    '<h4>Mobility</h4><dl class="service">'+row('Road tiles',mob.roadTiles)+row('Road components',mob.components)+row('Rail crossings',mob.crossings)+row('Vehicles active',mob.vehicles)+'</dl><p class="muted">Vehicles are representative town life, not a congestion score.</p>'+
    upgradeBlock(b);
  return true;
}
export function inspectCityHall(x,y){
  const b=S.grid[idx(x,y)]; if(!b||b.type!=='cityHall') return false;
  S.pick={x,y}; renderCityHall(); elLook.classList.add('show');
  if(S.diagnostics) S.diagnostics.cityHallPanelOpens=(S.diagnostics.cityHallPanelOpens||0)+1;
  return true;
}

elLookBody?.addEventListener('click',e=>{
  if(!cityHallSelected()) return;
  const parcel=e.target.closest('[data-cityhall-parcel]');
  if(parcel){
    const st=parcelStatus(parcel.dataset.cityhallParcel); if(!st) return;
    if(!st.coinsOk){ toast('You need '+st.parcel.cost+' coins to open '+st.parcel.name+'.'); return; }
    if(!confirm('Open '+st.parcel.name+' for '+st.parcel.cost+' coins?')) return;
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
  if(!confirm('Upgrade to '+st.next.name+' for '+st.next.cost+' coins?')) return;
  const r=upgradeCivic(b);
  if(!r.ok){ toast(r.why||'The civic center could not be upgraded.'); return; }
  toast(r.upgrade.name+' established','gold'); save(); renderCityHall();
});
