import { KEY, save, store } from '../core/save.js';
import { S } from '../core/state.js';
import { cityStage } from '../progression/city-growth.js';

const META_KEY='meadowline.saveManager.meta';
const BACKUP_PREFIX='meadowline.v3.backup.';
const BACKUP_COUNT=5;
let root=null;
let fileInput=null;
let lastObservedRaw=null;

function esc(v=''){return String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function storageProbe(){
  const k='meadowline.storage.probe';
  try{localStorage.setItem(k,'ok'); const ok=localStorage.getItem(k)==='ok'; localStorage.removeItem(k); return ok;}
  catch(e){return false;}
}
function parseSave(raw){
  try{const d=JSON.parse(raw); return d&&[1,2,3].includes(d.v)&&Array.isArray(d.b)?d:null;}catch(e){return null;}
}
function getMeta(){
  try{return JSON.parse(localStorage.getItem(META_KEY)||'{}')||{};}catch(e){return {};}
}
function setMeta(patch){
  const next={...getMeta(),...patch};
  try{localStorage.setItem(META_KEY,JSON.stringify(next));}catch(e){}
  return next;
}
function fmtTime(value){
  if(!value)return 'Not verified yet';
  try{return new Date(value).toLocaleString([], {dateStyle:'medium',timeStyle:'short'});}catch(e){return new Date(value).toLocaleString();}
}
function summary(raw=store.get(KEY)){
  const d=parseSave(raw);
  if(!d)return null;
  const pop=(d.b||[]).reduce((n,b)=>n+((b?.type==='house'?Number(b.pop):0)||0),0);
  return {day:Math.max(1,Math.floor(Number(d.day)||1)),coins:Math.floor(Number(d.coins)||0),buildings:d.b.length,pop,bytes:raw.length};
}
function writeBackup(raw,reason='manual'){
  if(!parseSave(raw))return false;
  try{
    for(let i=BACKUP_COUNT-1;i>0;i--){
      const prev=localStorage.getItem(BACKUP_PREFIX+(i-1));
      if(prev)localStorage.setItem(BACKUP_PREFIX+i,prev); else localStorage.removeItem(BACKUP_PREFIX+i);
      const prevMeta=localStorage.getItem(BACKUP_PREFIX+(i-1)+'.meta');
      if(prevMeta)localStorage.setItem(BACKUP_PREFIX+i+'.meta',prevMeta); else localStorage.removeItem(BACKUP_PREFIX+i+'.meta');
    }
    localStorage.setItem(BACKUP_PREFIX+'0',raw);
    localStorage.setItem(BACKUP_PREFIX+'0.meta',JSON.stringify({savedAt:Date.now(),reason,summary:summary(raw)}));
    return true;
  }catch(e){return false;}
}
function backups(){
  const out=[];
  for(let i=0;i<BACKUP_COUNT;i++){
    try{
      const raw=localStorage.getItem(BACKUP_PREFIX+i); if(!parseSave(raw))continue;
      let meta={}; try{meta=JSON.parse(localStorage.getItem(BACKUP_PREFIX+i+'.meta')||'{}')||{};}catch(e){}
      out.push({index:i,raw,meta,summary:summary(raw)});
    }catch(e){}
  }
  return out;
}
function verifyCurrent(){
  const storage=storageProbe();
  const raw=store.get(KEY);
  const d=parseSave(raw);
  const matches=!!d&&Math.floor(Number(d.day)||1)===Math.floor(Number(S.day)||1)&&Math.floor(Number(d.coins)||0)===Math.floor(Number(S.coins)||0);
  return {ok:storage&&matches,storage,raw,data:d,summary:summary(raw)};
}
export function verifiedSave({backup=true}={}){
  if(!storageProbe())return {success:false,error:'Browser storage is unavailable.'};
  const before=store.get(KEY);
  if(backup&&parseSave(before))writeBackup(before,'before-save');
  try{save();}catch(e){return {success:false,error:String(e?.message||e)};}
  const check=verifyCurrent();
  if(!check.ok)return {success:false,error:check.storage?'The save could not be verified after writing.':'Browser storage is unavailable.'};
  const savedAt=Date.now();
  setMeta({savedAt,bytes:check.raw.length,lastError:null});
  lastObservedRaw=check.raw;
  return {success:true,savedAt,bytes:check.raw.length,summary:check.summary};
}
function exportCurrent(){
  const result=verifiedSave({backup:true});
  if(!result.success){setStatus(result.error,'bad');return;}
  const raw=store.get(KEY);
  const blob=new Blob([raw],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  const day=summary(raw)?.day||1;
  a.href=url; a.download=`Meadowline-Day-${day}-${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000);
  setStatus('Portable city backup exported.','good'); render();
}
async function importFile(file){
  if(!file)return;
  let raw='';
  try{raw=await file.text();}catch(e){setStatus('That file could not be read.','bad');return;}
  const d=parseSave(raw);
  if(!d){setStatus('That is not a compatible Meadowline save.','bad');return;}
  if(!globalThis.confirm('Import this city? Your current city will be kept as a local backup.'))return;
  const current=store.get(KEY); if(parseSave(current))writeBackup(current,'before-import');
  try{
    localStorage.setItem(KEY,raw);
    if(localStorage.getItem(KEY)!==raw)throw new Error('Verification failed');
    setMeta({savedAt:Date.now(),bytes:raw.length,lastError:null,importedAt:Date.now()});
    location.reload();
  }catch(e){setStatus('Import failed. Your current city was not intentionally deleted.','bad');}
}
function restoreBackup(index){
  const item=backups().find(b=>b.index===index); if(!item)return;
  if(!globalThis.confirm(`Restore this backup from ${fmtTime(item.meta.savedAt)}? The current city will be backed up first.`))return;
  const current=store.get(KEY); if(parseSave(current))writeBackup(current,'before-restore');
  try{
    localStorage.setItem(KEY,item.raw);
    if(localStorage.getItem(KEY)!==item.raw)throw new Error('Verification failed');
    setMeta({savedAt:Date.now(),bytes:item.raw.length,lastError:null,restoredAt:Date.now()});
    location.reload();
  }catch(e){setStatus('Restore failed.','bad');}
}
function setStatus(text,kind=''){const el=root?.querySelector('[data-save-status]'); if(el){el.textContent=text;el.dataset.kind=kind;}}
function close(){root?.classList.remove('open');root?.setAttribute('aria-hidden','true');}
export function openSaveManager(){render();root?.classList.add('open');root?.setAttribute('aria-hidden','false');}
function render(){
  if(!root)return;
  const current=verifyCurrent(); const meta=getMeta(); const s=current.summary; const stage=cityStage()?.name||'Settlement';
  const list=backups();
  root.querySelector('[data-save-body]').innerHTML=`
    <section class="sm-card sm-health">
      <div><small>LOCAL STORAGE</small><strong>${current.storage?'✓ Working':'⚠ Unavailable'}</strong></div>
      <div><small>LAST VERIFIED SAVE</small><strong>${esc(fmtTime(meta.savedAt))}</strong></div>
      <div><small>CURRENT CITY</small><strong>${esc(stage)} · Day ${s?.day??Math.floor(S.day||1)}</strong><span>${s?.pop??0} residents · ${s?.coins??Math.floor(S.coins||0)} coins</span></div>
    </section>
    <div class="sm-actions">
      <button type="button" data-sm="save" class="primary">Save now</button>
      <button type="button" data-sm="export">Export city</button>
      <button type="button" data-sm="import">Import city</button>
    </div>
    <section class="sm-card"><div class="sm-heading"><div><small>RECOVERY</small><strong>Local backups</strong></div><span>${list.length}/${BACKUP_COUNT}</span></div>
      <div class="sm-backups">${list.length?list.map(b=>`<button type="button" data-restore="${b.index}"><span><b>${esc(fmtTime(b.meta.savedAt))}</b><small>Day ${b.summary?.day||1} · ${b.summary?.pop||0} residents · ${b.summary?.buildings||0} buildings</small></span><i>Restore</i></button>`).join(''):'<p>No recovery snapshots yet. Meadowline creates them before verified saves, imports and restores.</p>'}</div>
    </section>
    <section class="sm-card sm-note"><strong>Portable backups travel with you.</strong><p>Export a city before changing domains, browsers or devices. Imported saves remain Save V3 compatible.</p></section>`;
}
function injectStyles(){
  const style=document.createElement('style'); style.textContent=`
  .save-manager{position:fixed;inset:0;z-index:10050;display:none;align-items:flex-end;justify-content:center;background:rgba(16,26,22,.52);padding:12px;padding-bottom:max(12px,env(safe-area-inset-bottom));font-family:inherit}.save-manager.open{display:flex}.save-manager-sheet{width:min(640px,100%);max-height:min(86dvh,760px);overflow:auto;background:#f6f0df;color:#24332c;border:1px solid rgba(46,72,58,.2);border-radius:24px 24px 18px 18px;box-shadow:0 24px 70px rgba(0,0,0,.28)}.save-manager-head{position:sticky;top:0;z-index:2;display:flex;justify-content:space-between;align-items:center;padding:18px 20px 14px;background:rgba(246,240,223,.96);border-bottom:1px solid rgba(46,72,58,.12)}.save-manager-head small,.sm-card small{display:block;font-size:10px;letter-spacing:.12em;color:#6b7c70}.save-manager-head h2{margin:2px 0 0;font-size:24px}.save-manager-head button{width:44px;height:44px;border:0;border-radius:50%;background:#e6deca;font-size:24px;color:#34483d}.save-manager-body{display:grid;gap:12px;padding:14px}.sm-card{background:#fffaf0;border:1px solid rgba(46,72,58,.12);border-radius:16px;padding:14px}.sm-health{display:grid;grid-template-columns:1fr 1fr;gap:12px}.sm-health>div:last-child{grid-column:1/-1}.sm-card strong{display:block;font-size:14px}.sm-card span,.sm-card p{font-size:12px;color:#65756b;margin:3px 0 0}.sm-actions{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}.sm-actions button,.sm-backups button{min-height:46px;border:1px solid rgba(46,72,58,.18);border-radius:12px;background:#fffaf0;color:#2c4135;font:600 13px inherit}.sm-actions .primary{background:#315f46;color:white;border-color:#315f46}.sm-heading{display:flex;justify-content:space-between;align-items:center}.sm-backups{display:grid;gap:7px;margin-top:10px}.sm-backups button{width:100%;padding:10px 12px;display:flex;align-items:center;justify-content:space-between;text-align:left}.sm-backups button small{letter-spacing:0;text-transform:none;margin-top:2px}.sm-backups button i{font-style:normal;color:#315f46}.sm-note p{line-height:1.45}.save-manager-status{min-height:22px;padding:0 16px 14px;font-size:12px}.save-manager-status[data-kind=good]{color:#23613c}.save-manager-status[data-kind=bad]{color:#9a3a31}@media(max-width:520px){.save-manager{padding:0;align-items:flex-end}.save-manager-sheet{border-radius:24px 24px 0 0;max-height:88dvh}.sm-actions{grid-template-columns:1fr}.sm-health{grid-template-columns:1fr}.sm-health>div:last-child{grid-column:auto}}
  `; document.head.appendChild(style);
}
function build(){
  injectStyles();
  root=document.createElement('div'); root.className='save-manager'; root.setAttribute('aria-hidden','true');
  root.innerHTML=`<div class="save-manager-sheet" role="dialog" aria-modal="true" aria-labelledby="save-manager-title"><header class="save-manager-head"><div><small>MEADOWLINE</small><h2 id="save-manager-title">Save Manager</h2></div><button type="button" data-sm="close" aria-label="Close Save Manager">×</button></header><div class="save-manager-body" data-save-body></div><div class="save-manager-status" data-save-status aria-live="polite"></div></div>`;
  root.addEventListener('pointerdown',e=>e.stopPropagation()); root.addEventListener('click',e=>{
    e.stopPropagation(); const action=e.target.closest('[data-sm]')?.dataset.sm;
    if(action==='close'){close();return;} if(action==='save'){const r=verifiedSave();render();setStatus(r.success?`Verified save complete · ${fmtTime(r.savedAt)}`:r.error,r.success?'good':'bad');return;} if(action==='export'){exportCurrent();return;} if(action==='import'){fileInput?.click();return;}
    const restore=e.target.closest('[data-restore]'); if(restore)restoreBackup(Number(restore.dataset.restore));
    if(e.target===root)close();
  });
  document.body.appendChild(root);
  fileInput=document.createElement('input'); fileInput.type='file'; fileInput.accept='application/json,.json'; fileInput.hidden=true; fileInput.addEventListener('change',()=>{importFile(fileInput.files?.[0]);fileInput.value='';}); document.body.appendChild(fileInput);
  const menuSave=document.getElementById('menu-save'); if(menuSave){menuSave.textContent='Save Manager'; menuSave.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();openSaveManager();},true);}
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&root.classList.contains('open'))close();});
  lastObservedRaw=store.get(KEY);
  setInterval(()=>{const raw=store.get(KEY); if(raw&&raw!==lastObservedRaw&&parseSave(raw)){if(lastObservedRaw&&parseSave(lastObservedRaw))writeBackup(lastObservedRaw,'autosave-recovery');lastObservedRaw=raw;const check=verifyCurrent();if(check.ok)setMeta({savedAt:Date.now(),bytes:raw.length,lastError:null});}},30000);
}

build();
window.__meadowlineSaveManager={open:openSaveManager,save:verifiedSave,verify:verifyCurrent,backups};
