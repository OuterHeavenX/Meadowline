import { askConfirm } from '../src/ui/confirm.js';
const checks=[];const check=(name,pass,detail='')=>checks.push({name,pass:!!pass,detail});
// Polled rather than driven by load events and fixed sleeps. A load event that
// fires before its listener attaches hangs the suite instead of failing it, and
// headless timers are sparse enough that a fixed wait is a coin toss.
// Bounded by iterations, not by the clock: headless pauses the virtual clock
// when its budget runs out, so a Date.now() deadline can stop advancing and
// spin forever. A tick count always terminates and always reports.
const waitFor=async(fn,ticks=100)=>{for(let i=0;i<ticks;i++){try{ if(fn()) return true; }catch(e){} await new Promise(r=>setTimeout(r,50));}return false;};
const frame=document.getElementById('game');const booted=await waitFor(()=>frame.contentDocument?.getElementById('build-tray')?.classList.contains('open'));
check('the build fixture finishes booting',booted);
const d=frame.contentDocument,w=frame.contentWindow;
check('application boots',d.documentElement.dataset.boot==='pass');
check('real coins are displayed',d.getElementById('s-coins').textContent===String(Math.floor(w.__MEADOWLINE_STATE__?.coins??Number(d.getElementById('s-coins').textContent))));
check('four-stage badge uses an authoritative stage',['Settlement','Village','Township','Growing Town'].includes(d.getElementById('s-stage').textContent));
check('build catalog opens',d.getElementById('build-tray').classList.contains('open'));
check('registry cards render',d.querySelectorAll('#tools .tool').length>0);
check('selected building detail uses footprint',d.getElementById('build-detail').textContent.includes('1×1'));
check('six command actions render',d.querySelectorAll('.commandbar>button,.commandbar .modes>.tool').length===6,[...d.querySelectorAll('.commandbar>button,.commandbar .modes>.tool')].map(b=>b.dataset.id||b.id).join(','));
check('safe-area dock exists',getComputedStyle(d.querySelector('.dock')).position==='fixed');
check('no Level 5 text exists',!d.body.textContent.includes('Level 5'));
check('main menu has real actions',!!d.getElementById('b-start')&&!!d.getElementById('menu-new')&&!!d.getElementById('menu-settings'));
check('document has no horizontal overflow',d.documentElement.scrollWidth<=d.documentElement.clientWidth,d.documentElement.scrollWidth+' / '+d.documentElement.clientWidth);
// Keystrokes typed into a field must not reach the map. Dispatching on a real
// input inside the booted app covers the wiring, not just the policy helper.
const armed=()=>[...d.querySelectorAll('#tools .tool,#modes .tool')].find(b=>b.classList.contains('on'))?.dataset.id||'';
const key=(k,target)=>target.dispatchEvent(new w.KeyboardEvent('keydown',{key:k,bubbles:true}));
const field=d.createElement('input');field.type='email';d.body.appendChild(field);field.focus();
const toolBeforeTyping=armed();
key('h',field);key('c',field);key('r',field);
check('typing in a field does not change the build tool',armed()===toolBeforeTyping,armed());
key('h',d.body);
check('the same key still works outside a field',armed()==='cityHall',armed());
field.remove();

// A thrown frame must cost one frame, not the session. Breaking the weather
// object makes the render path throw for real. The loop is driven directly
// rather than waited on: headless rAF is sparse enough to starve a poll, which
// made this read as a failure when the guard was working perfectly well.
const st=w.__MEADOWLINE_STATE__;
const runFrame=w.__MEADOWLINE_FRAME__;
check('the fixture exposes real state',!!st&&typeof st.diagnostics?.frameCount==='number');
check('the fixture exposes the frame loop',typeof runFrame==='function');
if(st&&typeof runFrame==='function'){
  const weather=st.wx,before=st.diagnostics.frameCount,errorsBefore=st.diagnostics.loopErrors||0;
  st.wx=null;
  runFrame();
  check('a thrown frame is caught',(st.diagnostics.loopErrors||0)===errorsBefore+1,String(st.diagnostics.lastLoopError||''));
  check('the loop keeps running through the error',st.diagnostics.frameCount>before,before+' -> '+st.diagnostics.frameCount);
  st.wx=weather;
  const errorsAtRestore=st.diagnostics.loopErrors||0,framesAtRestore=st.diagnostics.frameCount;
  runFrame();
  check('the loop recovers once the fault clears',
    st.diagnostics.frameCount>framesAtRestore&&(st.diagnostics.loopErrors||0)===errorsAtRestore,
    framesAtRestore+' -> '+st.diagnostics.frameCount);
}

// Turning the city, driven the way a player does it: a real keypress on the
// booted app, then the real frame loop. Checking S.cam.rot after a keypress
// alone would pass even if the easing never ran, and checking the easing
// function alone would pass even if the key were never wired up.
if(st&&typeof runFrame==='function'){
  const startRot=st.cam.rot||0,startTarget=st.cam.rotTo||0;
  key('.',d.body);
  const targetMoved=Math.abs((st.cam.rotTo||0)-startTarget)>1e-6;
  check('a keypress asks the city to turn',targetMoved,startTarget+' -> '+st.cam.rotTo);
  // Explicit advancing timestamps: headless pauses the virtual clock during a
  // synchronous loop, so performance.now() returns the same value every
  // iteration and every frame would see zero elapsed time. Driving the clock
  // here tests the real easing rather than 160 frames of standing still.
  let clock=performance.now();
  for(let i=0;i<160;i++){ clock+=16; runFrame(clock); }
  check('the frame loop turns the city toward the target',
    Math.abs((st.cam.rot||0)-(st.cam.rotTo||0))<1e-2&&Math.abs((st.cam.rot||0)-startRot)>1e-3,
    'rot '+startRot.toFixed(4)+' -> '+(st.cam.rot||0).toFixed(4)+' target '+(st.cam.rotTo||0).toFixed(4));
  // The on-screen control, clicked the way a player clicks it. The keys and
  // the twist gesture worked before this existed, which for anyone who had not
  // read the source was the same as the camera not turning at all.
  const compass=d.getElementById('b-rotate');
  check('the HUD offers a visible way to turn the city',!!compass);
  if(compass){
    const beforeClick=st.cam.rotTo;
    compass.click();
    check('the compass turns the city a quarter',Math.abs((st.cam.rotTo-beforeClick)-Math.PI/2)<1e-9,
      beforeClick.toFixed(4)+' -> '+st.cam.rotTo.toFixed(4));
    // Four taps come back to where you started, which is what makes a single
    // one-way button enough.
    compass.click();compass.click();compass.click();
    check('four taps return the city to its start',Math.abs((st.cam.rotTo-beforeClick)-Math.PI*2)<1e-9,st.cam.rotTo);
    let spin=performance.now();
    for(let i=0;i<200;i++){ spin+=16; runFrame(spin); }
    check('the needle shows which way the city faces',
      /rotate\(/.test(compass.querySelector('svg')?.style.transform||''),
      compass.querySelector('svg')?.style.transform||'(none)');
  }

  // The rotation keys go through the same text-entry guard as the tool keys.
  const box=d.createElement('input');d.body.appendChild(box);box.focus();
  const heldTarget=st.cam.rotTo;
  key('.',box);
  check('typing in a field does not turn the city',st.cam.rotTo===heldTarget,st.cam.rotTo);
  box.remove();
}

// The in-shell confirmation replaces eight native confirm() dialogs, so it has
// to hold up as a real UI surface: centred, inside the viewport, thumb-sized,
// and cancelling by default rather than committing. askConfirm() opens the
// dialog synchronously, so nothing here waits on a timer.
const pending=askConfirm({title:'Remove the Fire Station?',body:'You get 260 coins back of the 520 it cost.',confirmLabel:'Remove',tone:'danger'});
const dlg=document.querySelector('.ml-confirm');check('the confirmation opens as a modal',!!dlg?.open&&dlg.matches(':modal'));
if(dlg?.open){
  const r=dlg.getBoundingClientRect();
  // clientWidth, not innerWidth: innerWidth includes the scrollbar, which
  // would read a correctly centred dialog as off-centre.
  const vw=document.documentElement.clientWidth;
  check('the confirmation stays inside the viewport',r.left>=-0.5&&r.right<=vw+0.5,Math.round(r.left)+'..'+Math.round(r.right)+' of '+vw);
  check('the confirmation is centred',Math.abs(r.left-(vw-r.right))<2,Math.round(r.left)+' vs '+Math.round(vw-r.right));
  check('its actions are thumb-sized',[...dlg.querySelectorAll('button')].every(b=>b.getBoundingClientRect().height>=44));
  check('cancel holds focus, not the destructive action',document.activeElement===dlg.querySelector('.ml-confirm-cancel'));
  check('the destructive action is marked',dlg.querySelector('.ml-confirm-go').classList.contains('danger'));
  check('it reads as a question, not an alert',dlg.textContent.includes('Remove the Fire Station?')&&dlg.textContent.includes('260 coins back'));
}
// Awaiting is safe only because the dialog exists and is being closed here; a
// missing dialog would strand the promise, so that case reports and moves on.
// Dismissed the way a player does it, by pressing Cancel, rather than by
// calling close() directly: the button is the path that has to work.
if(dlg?.open){
  dlg.querySelector('.ml-confirm-cancel').click();
  check('dismissing resolves as a refusal',(await pending)===false);
}else{
  check('dismissing resolves as a refusal',(await pending)===false,'dialog never opened');
}

frame.src='../?uitest=cityhall';
const hallReady=await waitFor(()=>frame.contentDocument?.querySelectorAll('[data-cityhall-nav]')?.length===7);
check('the City Hall fixture finishes rendering',hallReady);
const hall=frame.contentDocument;
check('City Hall uses responsive section navigation',hall.querySelectorAll('[data-cityhall-nav]').length===7);
check('City Hall maximum is Level 4',hall.querySelector('.cityhall-hero')?.textContent.includes('Level 4'));
check('City Hall never advertises Level 5',!hall.getElementById('look-body')?.textContent.includes('Level 5'));
check('City Hall reads real municipal sections',hall.getElementById('look-body')?.textContent.includes('Services')&&hall.getElementById('look-body')?.textContent.includes('Mobility'));

// Every confirmation-gated action in City Hall shipped dead: the module called
// askConfirm() without importing it, and because the handler is async the
// ReferenceError became an unhandled rejection - no dialog, no toast, no
// console anyone was looking at, just a button that did nothing. Module
// hygiene catches the missing import now; this checks the thing the player
// actually does, so a future break anywhere along the path still fails.
const hallWin=frame.contentWindow,hallState=hallWin.__MEADOWLINE_STATE__;
if(hallState){
  hallState.coins=1914;
  hallState.cityProgress.stage=4;
  const civic=hallState.grid.find(b=>b&&b.type==='cityHall');
  if(civic) civic.state.level=3;
  hall.querySelector('[data-cityhall-nav="overview"]')?.click();
  const upgradeBtn=hall.querySelector('[data-upgrade-cityhall]');
  check('City Hall offers a live upgrade action',!!upgradeBtn&&!upgradeBtn.disabled,
    upgradeBtn?('disabled='+upgradeBtn.disabled):'(missing)');
  if(upgradeBtn&&!upgradeBtn.disabled){
    const levelBefore=civic.state.level,coinsBefore=hallState.coins;
    upgradeBtn.click();
    const dlg2=hall.querySelector('.ml-confirm');
    check('the upgrade asks for confirmation instead of failing silently',!!dlg2?.open);
    if(dlg2?.open){
      dlg2.querySelector('.ml-confirm-go').click();
      await new Promise(r=>setTimeout(r,0));
      check('confirming the upgrade actually upgrades the civic centre',
        civic.state.level===levelBefore+1&&hallState.coins<coinsBefore,
        'level '+levelBefore+'->'+civic.state.level+' coins '+coinsBefore+'->'+Math.round(hallState.coins));
    }
  }
  // The upgrade above spends from the same purse. 1914 coins covered the
  // upgrade and a parcel back when a parcel cost 320; parcel prices scale with
  // the valley and the cheapest is 1280 now, so the two checks were quietly
  // competing for the money and land always lost. Each step gets a purse that
  // can pay for it.
  hallState.coins=Math.max(hallState.coins||0,6000);
  hall.querySelector('[data-cityhall-nav="land"]')?.click();
  const parcelBtn=hall.querySelector('[data-cityhall-parcel]:not([disabled])');
  check('City Hall offers a live land purchase',!!parcelBtn,parcelBtn?.textContent?.trim()||'(none available)');
  if(parcelBtn){
    const openedBefore=(hallState.cityProgress.unlockedParcels||[]).length;
    parcelBtn.click();
    const dlg3=hall.querySelector('.ml-confirm');
    check('opening land asks for confirmation instead of failing silently',!!dlg3?.open);
    if(dlg3?.open){
      dlg3.querySelector('.ml-confirm-go').click();
      await new Promise(r=>setTimeout(r,0));
      check('confirming a land purchase actually opens the parcel',
        (hallState.cityProgress.unlockedParcels||[]).length===openedBefore+1,
        openedBefore+' -> '+(hallState.cityProgress.unlockedParcels||[]).length);
    }
  }
}

// A disabled action has to look disabled. Nothing in the stylesheet spoke to
// :disabled, so a button the game refuses to act on was pixel-identical to one
// it honours - and since a disabled button emits no click, there was not even
// a toast to explain the refusal.
{
  const probe=hall.createElement('button');
  probe.className='go';probe.disabled=true;probe.textContent='x';
  hall.body.appendChild(probe);
  const live=hall.createElement('button');
  live.className='go';live.textContent='x';
  hall.body.appendChild(live);
  const a=hallWin.getComputedStyle(probe),b=hallWin.getComputedStyle(live);
  check('a disabled action is visually distinct from a live one',
    a.backgroundColor!==b.backgroundColor||a.color!==b.color,
    a.backgroundColor+' vs '+b.backgroundColor);
  probe.remove();live.remove();
}

const failed=checks.filter(c=>!c.pass);document.getElementById('results').textContent=JSON.stringify({pass:!failed.length,checks},null,2);document.documentElement.dataset.result=failed.length?'fail':'pass';
