import { sendSignInLink, signOut, supabase } from '../cloud/supabase.js';
import { clearCloudRevision, downloadCloudSave, getCloudSaveSummary, uploadLocalSave } from '../cloud/cloud-save.js';
import { toast } from './notify.js';

const style=document.createElement('style');
style.textContent=`
.cloud-account{position:fixed;left:10px;bottom:calc(env(safe-area-inset-bottom,0px) + 12px);z-index:35}
.cloud-account>.cloud-toggle{width:42px;height:42px;border:0;border-radius:14px;background:rgba(29,43,38,.9);color:#f4f0e2;box-shadow:0 7px 22px rgba(0,0,0,.25);font:700 18px system-ui;backdrop-filter:blur(8px)}
.cloud-account section{position:absolute;left:0;bottom:52px;width:min(330px,calc(100vw - 20px));padding:16px;border-radius:18px;background:rgba(29,43,38,.97);color:#f4f0e2;box-shadow:0 18px 48px rgba(0,0,0,.35);font:14px/1.4 system-ui}
.cloud-account section[hidden]{display:none}.cloud-account h3{margin:0 32px 4px 0;font-size:18px}.cloud-account p{margin:6px 0 12px;color:#c9c9bd}.cloud-account .x{position:absolute;right:10px;top:8px;border:0;background:none;color:#f4f0e2;font-size:24px}.cloud-account input{box-sizing:border-box;width:100%;padding:11px 12px;border:1px solid rgba(244,240,226,.2);border-radius:11px;background:#13201c;color:#fff;font:inherit}.cloud-account .row{display:flex;gap:8px;margin-top:9px}.cloud-account button.action{flex:1;padding:10px;border:0;border-radius:11px;background:#e5c45b;color:#1d2b26;font:800 13px system-ui}.cloud-account button.secondary{background:#344940;color:#f4f0e2}.cloud-account button.danger{background:#493936;color:#f4f0e2}.cloud-account button:disabled{opacity:.5}.cloud-account small{display:block;color:#aeb7b0;margin-top:8px;word-break:break-word}
`;
document.head.appendChild(style);

const wrap=document.createElement('div');
wrap.className='cloud-account';
wrap.innerHTML=`<button class="cloud-toggle" aria-label="Meadowline account and cloud saves" title="Account & Cloud Saves">☁</button><section hidden><button class="x" aria-label="Close">×</button><h3>Account & Cloud Saves</h3><div data-body>Checking account…</div></section>`;
document.body.appendChild(wrap);
const panel=wrap.querySelector('section'),body=wrap.querySelector('[data-body]');
wrap.querySelector('.cloud-toggle').onclick=()=>{panel.hidden=!panel.hidden;if(!panel.hidden) render();};
wrap.querySelector('.x').onclick=()=>panel.hidden=true;
let busy=false;

function setBusy(value){busy=value;for(const b of body.querySelectorAll('button')) b.disabled=value;}
function stamp(value){if(!value)return 'Never';try{return new Date(value).toLocaleString();}catch{return String(value);}}

async function render(){
  if(busy)return;
  body.textContent='Checking account…';
  try{
    const info=await getCloudSaveSummary();
    if(!info.signedIn){
      body.innerHTML=`<p>Play locally without an account, or sign in to enable protected cloud saves.</p><input data-email type="email" inputmode="email" autocomplete="email" placeholder="Email address"><div class="row"><button class="action" data-link>Send sign-in link</button></div><small>Supabase will email a secure one-time sign-in link. Local Save V3 remains the normal offline save.</small>`;
      body.querySelector('[data-link]').onclick=async()=>{
        const email=body.querySelector('[data-email]').value;
        setBusy(true);try{await sendSignInLink(email);toast('Check your email for the Meadowline sign-in link');}catch(e){toast(e?.message||'Could not send sign-in link');}finally{setBusy(false);}
      };
      return;
    }
    const email=info.user?.email||'Signed in';
    const save=info.save;
    body.innerHTML=`<p><b>${email.replace(/[<>&]/g,'')}</b><br>${save?`Cloud revision ${save.revision} · ${stamp(save.updated_at)}`:'No cloud city uploaded yet.'}</p><div class="row"><button class="action" data-upload>Upload local city</button><button class="action secondary" data-download ${save?'':'disabled'}>Use cloud city</button></div><div class="row"><button class="action danger" data-signout>Sign out</button></div><small>Cloud downloads replace this device's local Save V3 only after confirmation. Server revision checks prevent an older device from silently overwriting a newer cloud city.</small>`;
    body.querySelector('[data-upload]').onclick=async()=>{
      setBusy(true);try{const r=await uploadLocalSave();if(r.status==='conflict'){toast(`Cloud save conflict · newer revision ${r.revision} exists`);}else{toast(`Cloud save updated · revision ${r.revision}`);}await render();}catch(e){toast(e?.message||'Cloud upload failed');}finally{setBusy(false);}
    };
    const download=body.querySelector('[data-download]');
    if(download)download.onclick=async()=>{
      if(!confirm('Replace this device\'s local Meadowline city with the current cloud save?'))return;
      setBusy(true);try{const r=await downloadCloudSave();if(r.status==='empty'){toast('No cloud city found');return;}toast(`Cloud city restored · revision ${r.revision}`);location.reload();}catch(e){toast(e?.message||'Cloud download failed');}finally{setBusy(false);}
    };
    body.querySelector('[data-signout]').onclick=async()=>{setBusy(true);try{await signOut();clearCloudRevision();toast('Signed out · local city remains on this device');await render();}catch(e){toast(e?.message||'Sign out failed');}finally{setBusy(false);}};
  }catch(e){body.innerHTML=`<p>Cloud services are unavailable right now. Your local city is unaffected.</p><small>${String(e?.message||e).replace(/[<>&]/g,'')}</small>`;}
}

supabase.auth.onAuthStateChange(()=>{if(!panel.hidden)setTimeout(render,0);});
