import { S } from '../core/state.js';
import { CITY_STAGES, LAND_PARCELS, cityStage, nextStageProgress, parcelStatus, unlockParcel } from '../progression/city-growth.js';
import { save } from '../core/save.js';
import { toast } from './notify.js';
import { askConfirm } from './confirm.js';

export const elGrowth=document.getElementById('growth');
export const elGrowthBody=document.getElementById('growth-body');
const bGrowth=document.getElementById('b-growth');
const bClose=document.getElementById('growth-x');

function requirementRows(progress){
  if(!progress) return '<p class="muted">All City Growth 1.0 stages reached.</p>';
  let html=progress.required.map(r=>'<div class="growth-req '+(r.met?'done':'')+'"><span>'+(r.met?'✓':'○')+' '+r.label+'</span><b>'+r.value+' / '+r.atLeast+'</b></div>').join('');
  for(const group of progress.any){
    html+='<p class="muted">Complete any '+group.count+' of these:</p>'+
      group.items.map(r=>'<div class="growth-req '+(r.met?'done':'')+'"><span>'+(r.met?'✓':'○')+' '+r.label+'</span><b>'+r.value+' / '+r.atLeast+'</b></div>').join('');
  }
  return html;
}

function parcelRows(){
  if(S.cityProgress?.mode==='legacy-open') return '<p>This established city keeps full land and building access.</p>';
  return LAND_PARCELS.filter(p=>!p.starting).map(p=>{
    const st=parcelStatus(p.id);
    const label=st.state==='unlocked'?'Open':st.state==='available'?(st.coinsOk?'Ready to open':'Ready · '+p.cost+' coins'):'Reach '+CITY_STAGES[p.stage-1].name;
    return '<button class="growth-parcel '+st.state+'" data-parcel="'+p.id+'" '+(st.state==='unlocked'?'disabled':'')+'><span><b>'+p.name+'</b><small>'+label+'</small></span><em>'+(st.state==='unlocked'?'✓':p.cost+'')+'</em></button>';
  }).join('');
}

export function paintGrowthPanel(){
  if(!elGrowthBody) return;
  const next=nextStageProgress();
  elGrowthBody.innerHTML='<div class="growth-stage"><span>City stage</span><strong>'+cityStage().name+'</strong></div>'+
    '<h4>'+(next?next.stage.name+' is within reach':'Growing Town established')+'</h4>'+
    requirementRows(next?.progress||null)+
    '<h4>Land</h4>'+parcelRows();
}

export function toggleGrowth(force){
  const show=typeof force==='boolean'?force:!elGrowth.classList.contains('show');
  elGrowth.classList.toggle('show',show);
  bGrowth?.classList.toggle('off',!show);
  if(show) paintGrowthPanel();
  return show;
}

bGrowth?.addEventListener('click',()=>toggleGrowth());
bClose?.addEventListener('click',()=>toggleGrowth(false));
elGrowthBody?.addEventListener('click',async e=>{
  const btn=e.target.closest('[data-parcel]');
  if(!btn) return;
  const id=btn.dataset.parcel;
  const st=parcelStatus(id);
  if(!st) return;
  if(st.state==='locked'){
    toast(st.stageOk?'Open the neighboring land first.':'Reach '+CITY_STAGES[st.parcel.stage-1].name+' first.');
    return;
  }
  if(!st.coinsOk){ toast('You need '+st.parcel.cost+' coins to open '+st.parcel.name+'.'); return; }
  if(!await askConfirm({title:'Open '+st.parcel.name+'?',body:'This costs '+st.parcel.cost+' coins and cannot be undone.',confirmLabel:'Open land'})) return;
  const r=unlockParcel(id);
  if(r.ok){ toast(r.parcel.name+' is open','gold'); save(); paintGrowthPanel(); }
  else toast(r.why||'That land cannot be opened yet.');
});
