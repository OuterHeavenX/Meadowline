const checks=[];const check=(name,pass,detail='')=>checks.push({name,pass:!!pass,detail});
const frame=document.getElementById('game');
await new Promise(resolve=>frame.addEventListener('load',()=>setTimeout(resolve,1300),{once:true}));
const d=frame.contentDocument,w=frame.contentWindow;
check('application boots',d.documentElement.dataset.boot==='pass');
check('real coins are displayed',d.getElementById('s-coins').textContent===String(Math.floor(w.__MEADOWLINE_STATE__?.coins??Number(d.getElementById('s-coins').textContent))));
check('four-stage badge uses an authoritative stage',['Settlement','Village','Township','Growing Town'].includes(d.getElementById('s-stage').textContent));
check('build catalog opens',d.getElementById('build-tray').classList.contains('open'));
check('registry cards render',d.querySelectorAll('#tools .tool').length>0);
check('selected building detail uses footprint',d.getElementById('build-detail').textContent.includes('1×1'));
check('five command actions render',d.querySelectorAll('.commandbar>button,.commandbar .modes>.tool').length===5);
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
// object makes the render path throw for real rather than simulating it.
// Headless rAF ticks are sparse, so progress is polled rather than slept on.
const waitFor=async(fn,ms=4000)=>{const t0=Date.now();while(Date.now()-t0<ms){if(fn())return true;await new Promise(r=>setTimeout(r,60));}return false;};
const st=w.__MEADOWLINE_STATE__;
check('the fixture exposes real state',!!st&&typeof st.diagnostics?.frameCount==='number');
const weather=st.wx,before=st.diagnostics.frameCount,errorsBefore=st.diagnostics.loopErrors||0;
st.wx=null;
const threw=await waitFor(()=>(st.diagnostics.loopErrors||0)>errorsBefore);
check('a thrown frame is caught',threw,String(st.diagnostics.lastLoopError||''));
const kept=await waitFor(()=>st.diagnostics.frameCount>before);
const during=st.diagnostics.frameCount;
check('the loop keeps running through the error',kept,before+' -> '+during);
st.wx=weather;
// Recovery after the fault clears is deliberately not asserted here: headless
// rAF stops ticking once the harness settles, so it would measure the browser
// rather than the loop. The two checks above are the behaviour that matters.

frame.src='../?uitest=cityhall';
await new Promise(resolve=>frame.addEventListener('load',()=>setTimeout(resolve,900),{once:true}));
const hall=frame.contentDocument;
check('City Hall uses responsive section navigation',hall.querySelectorAll('[data-cityhall-nav]').length===7);
check('City Hall maximum is Level 4',hall.querySelector('.cityhall-hero')?.textContent.includes('Level 4'));
check('City Hall never advertises Level 5',!hall.getElementById('look-body')?.textContent.includes('Level 5'));
check('City Hall reads real municipal sections',hall.getElementById('look-body')?.textContent.includes('Services')&&hall.getElementById('look-body')?.textContent.includes('Mobility'));
const failed=checks.filter(c=>!c.pass);document.getElementById('results').textContent=JSON.stringify({pass:!failed.length,checks},null,2);document.documentElement.dataset.result=failed.length?'fail':'pass';
