import { sendEmailCode, signOut, supabase, verifyEmailCode } from '../cloud/supabase.js';
import { clearCloudRevision, downloadCloudSave, getCloudHistory, getCloudSaveSummary, restoreCloudHistory, uploadLocalSave } from '../cloud/cloud-save.js';
import { toast } from './notify.js';

const AUTH_COOLDOWN_KEY='meadowline.auth.emailCooldownUntil';
const AUTH_PENDING_EMAIL_KEY='meadowline.auth.pendingEmail';
const AUTH_COOLDOWN_MS=60_000;

const style=document.createElement('style');
style.textContent=`
.cloud-account{position:fixed;left:10px;bottom:calc(env(safe-area-inset-bottom,0px) + 12px);z-index:35}
.cloud-account>.cloud-toggle{width:42px;height:42px;border:0;border-radius:14px;background:rgba(29,43,38,.9);color:#f4f0e2;box-shadow:0 7px 22px rgba(0,0,0,.25);font:700 18px system-ui;backdrop-filter:blur(8px)}
.cloud-account section{position:absolute;left:0;bottom:52px;width:min(350px,calc(100vw - 20px));max-height:min(72vh,620px);overflow:auto;padding:16px;border-radius:18px;background:rgba(29,43,38,.97);color:#f4f0e2;box-shadow:0 18px 48px rgba(0,0,0,.35);font:14px/1.4 system-ui}
.cloud-account section[hidden]{display:none}.cloud-account h3{margin:0 32px 4px 0;font-size:18px}.cloud-account h4{margin:16px 0 7px;font-size:12px;text-transform:uppercase;letter-spacing:.12em;color:#e5c45b}.cloud-account p{margin:6px 0 12px;color:#c9c9bd}.cloud-account .x{position:absolute;right:10px;top:8px;border:0;background:none;color:#f4f0e2;font-size:24px}.cloud-account input{box-sizing:border-box;width:100%;padding:11px 12px;border:1px solid rgba(244,240,226,.2);border-radius:11px;background:#13201c;color:#fff;font:inherit}.cloud-account input.code{font-size:24px;font-weight:800;letter-spacing:.28em;text-align:center;font-variant-numeric:tabular-nums}.cloud-account .row{display:flex;gap:8px;margin-top:9px}.cloud-account button.action{flex:1;padding:10px;border:0;border-radius:11px;background:#e5c45b;color:#1d2b26;font:800 13px system-ui}.cloud-account button.secondary{background:#344940;color:#f4f0e2}.cloud-account button.danger{background:#493936;color:#f4f0e2}.cloud-account button.linkish{background:transparent;color:#d8ddd7;border:1px solid rgba(244,240,226,.14)}.cloud-account button:disabled{opacity:.5}.cloud-account small{display:block;color:#aeb7b0;margin-top:8px;word-break:break-word}.cloud-history{display:grid;gap:7px}.cloud-history-item{display:flex;align-items:center;gap:9px;padding:9px 10px;border:1px solid rgba(244,240,226,.11);border-radius:12px;background:rgba(10,20,16,.28)}.cloud-history-item>div{min-width:0;flex:1}.cloud-history-item b{display:block;font-size:13px}.cloud-history-item span{display:block;font-size:11px;color:#adb8b1}.cloud-history-item button{border:0;border-radius:9px;padding:8px 9px;background:#344940;color:#f4f0e2;font:800 11px system-ui;white-space:nowrap}
`;
document.head.appendChild(style);

const wrap=document.createElement('div');
wrap.className='cloud-account';
wrap.innerHTML=`<button class="cloud-toggle" aria-label="Meadowline account and cloud saves" title="Account & Cloud Saves">☁</button><section hidden><button class="x" aria-label="Close">×</button><h3>Account & Cloud Saves</h3><div data-body>Checking account…</div></section>`;
document.body.appendChild(wrap);
const panel=wrap.querySelector('section'),body=wrap.querySelector('[data-body]');
wrap.querySelector('.cloud-toggle').onclick=()=>{panel.hidden=!panel.hidden;if(!panel.hidden) render();};
wrap.querySelector('.x').onclick=()=>panel.hidden=true;
let busy=false,cooldownTimer=0;

function setBusy(value){busy=value;for(const b of body.querySelectorAll('button')) b.disabled=value;}
function stamp(value){if(!value)return 'Never';try{return new Date(value).toLocaleString();}catch{return String(value);}}
function safeText(value){return String(value??'').replace(/[<>&]/g,'');}
function historyMeta(entry){
  const p=entry?.payload||{};
  const day=Number(p.day)||1,coins=Math.max(0,Math.floor(Number(p.coins)||0)),buildings=Array.isArray(p.b)?p.b.length:0;
  return `Day ${day} · ${coins} coins · ${buildings} buildings`;
}
function cooldownUntil(){return Math.max(0,Number(localStorage.getItem(AUTH_COOLDOWN_KEY))||0);}
function startCooldown(){localStorage.setItem(AUTH_COOLDOWN_KEY,String(Date.now()+AUTH_COOLDOWN_MS));updateCooldownButton();}
function pendingEmail(){return String(localStorage.getItem(AUTH_PENDING_EMAIL_KEY)||'').trim();}
function setPendingEmail(email){if(email)localStorage.setItem(AUTH_PENDING_EMAIL_KEY,email);else localStorage.removeItem(AUTH_PENDING_EMAIL_KEY);}
function updateCooldownButton(){
  clearTimeout(cooldownTimer);
  const button=body.querySelector('[data-resend]');
  if(!button)return;
  const seconds=Math.ceil((cooldownUntil()-Date.now())/1000);
  if(seconds>0){button.disabled=true;button.textContent=`Resend in ${seconds}s`;cooldownTimer=setTimeout(updateCooldownButton,1000);}
  else{button.disabled=busy;button.textContent='Resend code';}
}
function renderEmailEntry(){
  body.innerHTML=`<p>Sign in without leaving Meadowline. We’ll email a 6-digit code that you enter right here.</p><input data-email type="email" inputmode="email" autocomplete="email" placeholder="Email address"><div class="row"><button class="action" data-send>Send code</button></div><small>No password and no browser redirect. Local Save V3 keeps working while signed out.</small>`;
  body.querySelector('[data-send]').onclick=async()=>{
    const email=body.querySelector('[data-email]').value;
    setBusy(true);try{const clean=await sendEmailCode(email);setPendingEmail(clean);startCooldown();toast('Sign-in code sent · check your email');renderCodeEntry(clean);}catch(e){toast(e?.message||'Could not send the sign-in code');}finally{setBusy(false);}
  };
}
function renderCodeEntry(email){
  body.innerHTML=`<p>Enter the 6-digit code sent to <b>${safeText(email)}</b>.</p><input class="code" data-code type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]*" placeholder="000000"><div class="row"><button class="action" data-verify>Sign in</button></div><div class="row"><button class="action secondary" data-resend>Resend code</button><button class="action linkish" data-change>Change email</button></div><small>The sign-in finishes inside this copy of Meadowline, so the installed Home Screen app can keep its own persistent session.</small>`;
  const input=body.querySelector('[data-code]');
  input.oninput=()=>{input.value=input.value.replace(/\D/g,'').slice(0,6);};
  body.querySelector('[data-verify]').onclick=async()=>{
    setBusy(true);try{await verifyEmailCode(email,input.value);setPendingEmail('');toast('Signed in · cloud saves ready');await render();}catch(e){toast(e?.message||'Could not verify that sign-in code');}finally{setBusy(false);}
  };
  body.querySelector('[data-resend]').onclick=async()=>{
    setBusy(true);try{await sendEmailCode(email);startCooldown();toast('New sign-in code sent');}catch(e){toast(e?.message||'Could not resend the sign-in code');}finally{setBusy(false);updateCooldownButton();}
  };
  body.querySelector('[data-change]').onclick=()=>{setPendingEmail('');renderEmailEntry();};
  updateCooldownButton();
  setTimeout(()=>input.focus(),0);
}

async function render(){
  if(busy)return;
  clearTimeout(cooldownTimer);
  body.textContent='Checking account…';
  try{
    const info=await getCloudSaveSummary();
    if(!info.signedIn){
      const email=pendingEmail();
      if(email)renderCodeEntry(email);else renderEmailEntry();
      return;
    }
    setPendingEmail('');
    const email=info.user?.email||'Signed in';
    const save=info.save;
    const history=save?await getCloudHistory():[];
    const historyHtml=history.length?`<h4>Previous cloud saves</h4><div class="cloud-history">${history.map(h=>`<div class="cloud-history-item"><div><b>Revision ${Number(h.revision)||0}</b><span>${safeText(historyMeta(h))}</span><span>${safeText(stamp(h.archived_at))}</span></div><button data-restore="${safeText(h.id)}">Restore</button></div>`).join('')}</div>`:'';
    body.innerHTML=`<p><b>${safeText(email)}</b><br>${save?`Cloud revision ${save.revision} · ${safeText(stamp(save.updated_at))}`:'No cloud city uploaded yet.'}</p><div class="row"><button class="action" data-upload>Upload local city</button><button class="action secondary" data-download ${save?'':'disabled'}>Use cloud city</button></div>${historyHtml}<div class="row"><button class="action danger" data-signout>Sign out</button></div><small>Your session stays in this Meadowline app context. Cloud downloads replace local Save V3 only after confirmation, and revision checks protect newer cloud cities.</small>`;
    body.querySelector('[data-upload]').onclick=async()=>{
      setBusy(true);try{const r=await uploadLocalSave();if(r.status==='conflict'){toast(`Cloud save conflict · newer revision ${r.revision} exists`);}else{toast(`Cloud save updated · revision ${r.revision}`);}await render();}catch(e){toast(e?.message||'Cloud upload failed');}finally{setBusy(false);}
    };
    const download=body.querySelector('[data-download]');
    if(download)download.onclick=async()=>{
      if(!confirm('Replace this device\'s local Meadowline city with the current cloud save?'))return;
      setBusy(true);try{const r=await downloadCloudSave();if(r.status==='empty'){toast('No cloud city found');return;}toast(`Cloud city restored · revision ${r.revision}`);location.reload();}catch(e){toast(e?.message||'Cloud download failed');}finally{setBusy(false);}
    };
    for(const button of body.querySelectorAll('[data-restore]'))button.onclick=async()=>{
      const id=button.getAttribute('data-restore');
      const item=history.find(h=>h.id===id);
      if(!item)return;
      if(!confirm(`Restore cloud Revision ${item.revision}? The current cloud city will be archived first, then this device will load the restored city.`))return;
      setBusy(true);try{
        const r=await restoreCloudHistory(id);
        if(r.status==='conflict'){toast(`Restore blocked · newer cloud revision ${r.revision} exists`);await render();return;}
        const downloaded=await downloadCloudSave();
        if(downloaded.status!=='downloaded')throw new Error('Restored cloud city could not be downloaded.');
        toast(`Revision ${r.restoredFrom} restored as cloud revision ${r.revision}`);
        location.reload();
      }catch(e){toast(e?.message||'Cloud restore failed');}finally{setBusy(false);}
    };
    body.querySelector('[data-signout]').onclick=async()=>{setBusy(true);try{await signOut();clearCloudRevision();setPendingEmail('');toast('Signed out · local city remains on this device');await render();}catch(e){toast(e?.message||'Sign out failed');}finally{setBusy(false);}};
  }catch(e){body.innerHTML=`<p>Cloud services are unavailable right now. Your local city is unaffected.</p><small>${safeText(e?.message||e)}</small>`;}
}

supabase.auth.onAuthStateChange(()=>{if(!panel.hidden)setTimeout(render,0);});
