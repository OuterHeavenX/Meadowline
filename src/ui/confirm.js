/* ---------- one in-shell confirmation for every deliberate decision ----------
   Removing a facility, starting a new valley, opening land, upgrading a civic
   building and replacing the local city all used the browser's confirm().
   Inside an installed iOS app a system alert reads as a page error rather than
   a game decision, and it ignores every UI 2.0 token. This is the single
   replacement: warm paper, real focus handling, Escape to cancel.

   It stays a UI module on purpose. Simulation code never imports it; placement
   and removal report that a decision is needed and the input layer asks. */
import { reduceMotion } from '../core/state.js';

let dialog=null,resolveCurrent=null;

function ensure(){
  if(dialog) return dialog;
  dialog=document.createElement('dialog');
  dialog.className='ml-confirm';
  dialog.innerHTML='<form method="dialog"><h2 data-title></h2><p data-body></p>'+
    '<div class="ml-confirm-actions">'+
    '<button value="cancel" class="ml-confirm-cancel" data-cancel></button>'+
    '<button value="confirm" class="ml-confirm-go" data-go></button>'+
    '</div></form>';
  // One answer, whoever ends the dialog. settle() is idempotent, so the button
  // and the close event that follows it cannot both resolve.
  const settle=(value)=>{ const done=resolveCurrent; resolveCurrent=null; if(done) done(value); };
  // A press answers immediately rather than waiting for the close event the
  // form dispatches afterwards: that event is a queued task and can be delayed
  // arbitrarily, which would leave the caller waiting on a decision already made.
  dialog.addEventListener('click',e=>{
    const button=e.target.closest?.('button');
    if(button) settle(button.value==='confirm');
  });
  // Escape and the backdrop never produce a click, so the close event still
  // carries their answer.
  dialog.addEventListener('close',()=>settle(dialog.returnValue==='confirm'));
  dialog.addEventListener('cancel',()=>{ dialog.returnValue='cancel'; });
  document.body.appendChild(dialog);
  return dialog;
}

export function confirmDialogOpen(){ return !!resolveCurrent; }

/* Resolves true when the player commits. `tone:'danger'` colours the action for
   a removal or a replacement; anything reversible should leave it out. */
export function askConfirm({title,body='',confirmLabel='Continue',cancelLabel='Cancel',tone=''}={}){
  const text=[title,body].filter(Boolean).join('\n\n');
  const el=ensure();
  if(typeof el.showModal!=='function'){
    // Very old engines keep the native prompt rather than losing the guard.
    try{ return Promise.resolve(!!globalThis.confirm(text)); }catch(e){ return Promise.resolve(false); }
  }
  // A second request while one is open would strand the first caller's promise.
  if(resolveCurrent) return Promise.resolve(false);
  el.querySelector('[data-title]').textContent=title||'Are you sure?';
  const bodyEl=el.querySelector('[data-body]');
  bodyEl.textContent=body; bodyEl.hidden=!body;
  el.querySelector('[data-cancel]').textContent=cancelLabel;
  const go=el.querySelector('[data-go]');
  go.textContent=confirmLabel;
  go.classList.toggle('danger',tone==='danger');
  el.classList.toggle('no-motion',reduceMotion);
  el.returnValue='cancel';
  return new Promise(resolve=>{
    resolveCurrent=resolve;
    try{
      el.showModal();
      // close() fires no event on a dialog that never opened, so a failed
      // showModal would strand this caller forever and, because resolveCurrent
      // stays set, refuse every confirmation afterwards. Answer no instead.
      if(!el.open) throw new Error('dialog did not open');
      // Cancel holds focus so a stray keypress or double tap never commits.
      el.querySelector('[data-cancel]').focus();
    }catch(e){
      resolveCurrent=null;
      resolve(false);
    }
  });
}
