import { createPasswordAccount, onCloudAuthChange, sendPasswordSetup, signInWithPassword, signOut, updatePassword } from '../cloud/supabase.js';
import { clearCloudRevision, downloadCloudSave, getCloudHistory, getCloudSaveSummary, restoreCloudHistory, uploadLocalSave } from '../cloud/cloud-save.js';
import { askConfirm } from './confirm.js';
import { toast } from './notify.js';

const style=document.createElement('style');
style.textContent=`
.cloud-account{position:fixed;left:10px;bottom:calc(env(safe-area-inset-bottom,0px) + 12px);z-index:35}
.cloud-account>.cloud-toggle{width:42px;height:42px;border:0;border-radius:14px;background:rgba(29,43,38,.9);color:#f4f0e2;box-shadow:0 7px 22px rgba(0,0,0,.25);font:700 18px system-ui;backdrop-filter:blur(8px)}
.cloud-account section{position:absolute;left:0;bottom:52px;width:min(350px,calc(100vw - 20px));max-height:min(72vh,620px);overflow:auto;padding:16px;border-radius:18px;background:rgba(29,43,38,.97);color:#f4f0e2;box-shadow:0 18px 48px rgba(0,0,0,.35);font:14px/1.4 system-ui}
.cloud-account section[hidden]{display:none}.cloud-account h3{margin:0 32px 4px 0;font-size:18px}.cloud-account h4{margin:16px 0 7px;font-size:12px;text-transform:uppercase;letter-spacing:.12em;color:#e5c45b}.cloud-account p{margin:6px 0 12px;color:#c9c9bd}.cloud-account .x{position:absolute;right:10px;top:8px;border:0;background:none;color:#f4f0e2;font-size:24px}.cloud-account input{box-sizing:border-box;width:100%;padding:11px 12px;margin-top:8px;border:1px solid rgba(244,240,226,.2);border-radius:11px;background:#13201c;color:#fff;font:inherit}.cloud-account .row{display:flex;gap:8px;margin-top:9px}.cloud-account button.action{flex:1;padding:10px;border:0;border-radius:11px;background:#e5c45b;color:#1d2b26;font:800 13px system-ui}.cloud-account button.secondary{background:#344940;color:#f4f0e2}.cloud-account button.danger{background:#493936;color:#f4f0e2}.cloud-account button.linkish{background:transparent;color:#d8ddd7;border:1px solid rgba(244,240,226,.14)}.cloud-account button:disabled{opacity:.5}.cloud-account small{display:block;color:#aeb7b0;margin-top:8px;word-break:break-word}.cloud-history{display:grid;gap:7px}.cloud-history-item{display:flex;align-items:center;gap:9px;padding:9px 10px;border:1px solid rgba(244,240,226,.11);border-radius:12px;background:rgba(10,20,16,.28)}.cloud-history-item>div{min-width:0;flex:1}.cloud-history-item b{display:block;font-size:13px}.cloud-history-item span{display:block;font-size:11px;color:#adb8b1}.cloud-history-item button{border:0;border-radius:9px;padding:8px 9px;background:#344940;color:#f4f0e2;font:800 11px system-ui;white-space:nowrap}
`;
document.head.appendChild(style);

const wrap=document.createElement('div');
wrap.className='cloud-account';
wrap.innerHTML=`<button class="cloud-toggle" aria-label="Meadowline account and cloud saves" title="Account & Cloud Saves">☁</button><section hidden><button class="x" aria-label="Close">×</button><h3>Account & Cloud Saves</h3><div data-body>Checking account…</div></section>`;
document.body.appendChild(wrap);
const panel=wrap.querySelector('section'),body=wrap.querySelector('[data-body]');
wrap.querySelector('.cloud-toggle').onclick=()=>{panel.hidden=!panel.hidden;if(!panel.hidden){ subscribeAuth(); render(); }};
wrap.querySelector('.x').onclick=()=>panel.hidden=true;
let busy=false;

function setBusy(value){busy=value;for(const b of body.querySelectorAll('button')) b.disabled=value;}
function stamp(value){if(!value)return 'Never';try{return new Date(value).toLocaleString();}catch{return String(value);}}
function safeText(value){return String(value??'').replace(/[<>&]/g,'');}
function historyMeta(entry){const p=entry?.payload||{};return `Day ${Number(p.day)||1} · ${Math.max(0,Math.floor(Number(p.coins)||0))} coins · ${Array.isArray(p.b)?p.b.length:0} buildings`;}

function renderSignedOut(){
  body.innerHTML=`<p>Sign in directly inside Meadowline. No browser handoff is needed for normal play.</p><input data-email type="email" inputmode="email" autocomplete="email" placeholder="Email address"><input data-password type="password" autocomplete="current-password" placeholder="Password (8+ characters)"><div class="row"><button class="action" data-signin>Sign in</button><button class="action secondary" data-create>Create account</button></div><div class="row"><button class="action linkish" data-reset>Set / reset password</button></div><small>Your local Save V3 always remains playable while signed out. Existing passwordless accounts can use Set / reset password once, then sign in here normally.</small>`;
  const email=()=>body.querySelector('[data-email]').value;
  const password=()=>body.querySelector('[data-password]').value;
  body.querySelector('[data-signin]').onclick=async()=>{setBusy(true);try{await signInWithPassword(email(),password());toast('Signed in · cloud saves ready');await render();}catch(e){toast(e?.message||'Could not sign in');}finally{setBusy(false);}};
  body.querySelector('[data-create]').onclick=async()=>{setBusy(true);try{const r=await createPasswordAccount(email(),password());if(r.session){toast('Account created · signed in');await render();}else toast('Account created · check your email if confirmation is required');}catch(e){toast(e?.message||'Could not create account');}finally{setBusy(false);}};
  body.querySelector('[data-reset]').onclick=async()=>{setBusy(true);try{await sendPasswordSetup(email());toast('Password setup email sent · open it once, then choose a password');}catch(e){toast(e?.message||'Could not send password setup email');}finally{setBusy(false);}};
}

function renderPasswordChange(email){
  body.innerHTML=`<p><b>${safeText(email)}</b></p><p>Choose a password for this Meadowline account.</p><input data-new-password type="password" autocomplete="new-password" placeholder="New password (8+ characters)"><div class="row"><button class="action" data-save-password>Save password</button><button class="action linkish" data-cancel>Cancel</button></div><small>After this, the Home Screen app can sign in directly with email + password.</small>`;
  body.querySelector('[data-save-password]').onclick=async()=>{setBusy(true);try{await updatePassword(body.querySelector('[data-new-password]').value);toast('Password saved');await render();}catch(e){toast(e?.message||'Could not update password');}finally{setBusy(false);}};
  body.querySelector('[data-cancel]').onclick=()=>render();
}

async function render(){
  if(busy)return;
  body.textContent='Checking account…';
  try{
    const info=await getCloudSaveSummary();
    if(!info.signedIn){renderSignedOut();return;}
    const email=info.user?.email||'Signed in';
    const save=info.save;
    const history=save?await getCloudHistory():[];
    const historyHtml=history.length?`<h4>Previous cloud saves</h4><div class="cloud-history">${history.map(h=>`<div class="cloud-history-item"><div><b>Revision ${Number(h.revision)||0}</b><span>${safeText(historyMeta(h))}</span><span>${safeText(stamp(h.archived_at))}</span></div><button data-restore="${safeText(h.id)}">Restore</button></div>`).join('')}</div>`:'';
    body.innerHTML=`<p><b>${safeText(email)}</b><br>${save?`Cloud revision ${save.revision} · ${safeText(stamp(save.updated_at))}`:'No cloud city uploaded yet.'}</p><div class="row"><button class="action" data-upload>Upload local city</button><button class="action secondary" data-download ${save?'':'disabled'}>Use cloud city</button></div>${historyHtml}<div class="row"><button class="action linkish" data-password>Set / change password</button></div><div class="row"><button class="action danger" data-signout>Sign out</button></div><small>Email + password stays inside this Meadowline app context. Cloud downloads replace local Save V3 only after confirmation, and revision checks protect newer cloud cities.</small>`;
    body.querySelector('[data-upload]').onclick=async()=>{setBusy(true);try{const r=await uploadLocalSave();toast(r.status==='conflict'?`Cloud save conflict · newer revision ${r.revision} exists`:`Cloud save updated · revision ${r.revision}`);await render();}catch(e){toast(e?.message||'Cloud upload failed');}finally{setBusy(false);}};
    const download=body.querySelector('[data-download]');
    if(download)download.onclick=async()=>{if(!await askConfirm({title:'Use the cloud city?',body:"This device's local Meadowline city is replaced by the cloud save.",confirmLabel:'Replace local city',tone:'danger'}))return;setBusy(true);try{const r=await downloadCloudSave();if(r.status==='empty'){toast('No cloud city found');return;}toast(`Cloud city restored · revision ${r.revision}`);location.reload();}catch(e){toast(e?.message||'Cloud download failed');}finally{setBusy(false);}};
    for(const button of body.querySelectorAll('[data-restore]'))button.onclick=async()=>{const id=button.getAttribute('data-restore');const item=history.find(h=>h.id===id);if(!item||!await askConfirm({title:`Restore revision ${item.revision}?`,body:'The current cloud city is archived first, so nothing is lost.',confirmLabel:'Restore'}))return;setBusy(true);try{const r=await restoreCloudHistory(id);if(r.status==='conflict'){toast(`Restore blocked · newer cloud revision ${r.revision} exists`);await render();return;}const downloaded=await downloadCloudSave();if(downloaded.status!=='downloaded')throw new Error('Restored cloud city could not be downloaded.');toast(`Revision ${r.restoredFrom} restored as cloud revision ${r.revision}`);location.reload();}catch(e){toast(e?.message||'Cloud restore failed');}finally{setBusy(false);}};
    body.querySelector('[data-password]').onclick=()=>renderPasswordChange(email);
    body.querySelector('[data-signout]').onclick=async()=>{setBusy(true);try{await signOut();clearCloudRevision();toast('Signed out · local city remains on this device');await render();}catch(e){toast(e?.message||'Sign out failed');}finally{setBusy(false);}};
  }catch(e){body.innerHTML=`<p>Cloud services are unavailable right now. Your local city is unaffected.</p><small>${safeText(e?.message||e)}</small>`;}
}

// Subscribed the first time the player opens the panel, so a guest session
// never loads the cloud client or reaches the network at all.
let authSubscribed=false;
async function subscribeAuth(){
  if(authSubscribed) return;
  authSubscribed=true;
  const ok=await onCloudAuthChange(()=>{if(!panel.hidden)setTimeout(render,0);});
  if(!ok) authSubscribed=false;
}
