/* ============================================================
   SAFE AREAS — the phone's own furniture

   A phone draws its clock and battery over the top of the page and its home
   indicator over the bottom. A panel that measures itself against 100vh does
   not know that, so it can be perfectly sized and still have its first row of
   controls sitting behind the clock, where they cannot be read or tapped.
   That is exactly what City Hall did: bottom-anchored above the tool bar and
   allowed to grow to `100vh - 130px`, which put its top edge about eight
   pixels from the top of the screen and buried the whole section nav.

   Headless Chromium reports every safe-area inset as zero, so `env()` alone
   cannot be tested. The stylesheet names them as `--safe-top` and
   `--safe-bottom`, defaulting to `env()`, which lets this page pretend to be
   a notched phone by setting the two properties and then measuring what the
   player could actually reach.
   ============================================================ */

const checks=[];
const check=(name,value,detail)=>checks.push({name,pass:Boolean(value),...(detail===undefined?{}:{detail})});

const NOTCH={top:59,bottom:34};      // an iPhone with a notch and a home bar
const PHONE={w:390,h:844};

const frame=document.getElementById('app');
const wait=(test,ms=12000)=>new Promise(res=>{ const t0=Date.now();
  (function poll(){ let ok=false; try{ ok=test(); }catch(e){}
    if(ok||Date.now()-t0>ms) return res(ok);
    setTimeout(poll,60); })(); });

function setInsets(doc,top,bottom){
  doc.documentElement.style.setProperty('--safe-top',top+'px');
  doc.documentElement.style.setProperty('--safe-bottom',bottom+'px');
}
/* What the player can actually reach: inside the viewport, and clear of the
   bands the phone paints over the page. */
function reachable(r,view){
  return r.width>0&&r.height>0&&r.top>=NOTCH.top-0.5&&r.bottom<=view.h-NOTCH.bottom+0.5&&r.left>=-0.5&&r.right<=view.w+0.5;
}

(async()=>{
  frame.style.width=PHONE.w+'px'; frame.style.height=PHONE.h+'px';
  frame.src='../index.html';
  await new Promise(r=>frame.addEventListener('load',r,{once:true}));
  const doc=frame.contentDocument, win=frame.contentWindow;
  const ok=await wait(()=>doc.getElementById('b-start'));
  check('the game loaded in a phone-sized frame',ok&&win.innerWidth===PHONE.w,win.innerWidth+'×'+win.innerHeight);
  setInsets(doc,NOTCH.top,NOTCH.bottom);
  doc.getElementById('b-start').click();
  await wait(()=>doc.querySelector('.dock'));

  const view={w:win.innerWidth,h:win.innerHeight};
  const el=id=>doc.getElementById(id);
  const box=e=>e.getBoundingClientRect();
  const state=await win.eval("import('/src/core/state.js')");
  const S=state.S;
  const hall=await win.eval("import('/src/ui/city-hall.js')");
  let hallAt=null;
  /* Opening the paper clears the current selection, so anything that wants to
     look at City Hall again has to select it again. Re-rendering without this
     measures whatever the panel happened to be showing before, which is how
     the last check here first reported a 196px-tall City Hall. */
  const openHall=async()=>{
    S.pick={x:hallAt.x,y:hallAt.y};
    hall.renderCityHall();
    el('look').classList.add('show');
    await wait(()=>doc.querySelectorAll('[data-cityhall-nav]').length>0);
  };

  /* ---------- the panel the report was about ---------- */
  {
    // Open City Hall the way the game does, through its own module.
    const buildings=await win.eval("import('/src/buildings/buildings.js')");
    const tiles=await win.eval("import('/src/world/tiles.js')");
    // A City Hall to stand in, on cleared ground with a road at its door.
    const cx=Math.round(S.grid.length**0.5/2);
    for(let y=cx-3;y<cx+4;y++) for(let x=cx-4;x<cx+5;x++){ const i=tiles.idx(x,y); S.terr[i]=0; S.natTree[i]=0; S.grid[i]=null; }
    S.coins=9e6; S.cityProgress.stage=4;
    for(let x=cx-4;x<cx+5;x++) buildings.place('road',x,cx+1);
    const placed=buildings.place('cityHall',cx,cx-1);
    check('fixture: a City Hall to open',placed);
    hallAt={x:cx,y:cx-1};
    await openHall();
    const look=el('look');

    const panel=box(look);
    check('the City Hall panel opens clear of the status bar',panel.top>=NOTCH.top-0.5,
      'top '+panel.top.toFixed(1)+' vs status bar '+NOTCH.top);
    check('and clear of the home indicator',panel.bottom<=view.h-NOTCH.bottom+0.5,
      'bottom '+panel.bottom.toFixed(1)+' of '+view.h);
    check('and it does not overlap the tool bar',panel.bottom<=box(doc.querySelector('.dock')).top+0.5,
      panel.bottom.toFixed(1)+' vs dock '+box(doc.querySelector('.dock')).top.toFixed(1));

    /* Every section button must be reachable, which is the actual complaint:
       the panel fitting on screen is not the same as its controls being
       tappable. The nav scrolls sideways, so each button is measured after
       being scrolled into view. */
    const nav=[...doc.querySelectorAll('[data-cityhall-nav]')];
    check('fixture: the section nav rendered',nav.length>=9,nav.length);
    const unreachable=[];
    for(const b of nav){
      b.scrollIntoView({block:'nearest',inline:'nearest'});
      const r=box(b);
      if(!reachable(r,view)) unreachable.push(b.dataset.cityhallNav+'@'+r.top.toFixed(0)+'-'+r.bottom.toFixed(0));
    }
    check('every City Hall section can be reached and tapped',unreachable.length===0,unreachable.join(', '));
    check('the close button is reachable too',reachable(box(el('look-x')),view),JSON.stringify(box(el('look-x'))));

    // The first thing in the panel must be visible, not scrolled under the bar.
    const firstNav=box(nav[0]);
    check('the first section is not hidden behind the clock',firstNav.top>=NOTCH.top-0.5,firstNav.top.toFixed(1));
    look.classList.remove('show','cityhall-open');
  }

  /* ---------- the same for the newspaper ---------- */
  {
    /* A full edition, not the "first paper goes to print" stub. An empty paper
       is short enough that no height rule ever binds, so measuring one proves
       nothing about whether a real one clears the clock. */
    const postSim=await win.eval("import('/src/simulation/post.js')");
    const ledger=await win.eval("import('/src/simulation/ledger.js')");
    S.day=40; S.post={issue:null,archive:[],lastIssueDay:0,unread:false}; S.ledger=[];
    const day=39;
    for(const [type,fields] of [['crime_incident',{}],['crime_incident',{}],['arrest',{}],['arrest',{}],
      ['fire_incident',{}],['fire_out',{}],['health_incident',{}],['recovery',{}],
      ['family_arrival',{familyId:-1,surname:'Okafor',district:'Fern Hollow'}],
      ['family_move',{surname:'Mendes',from:'Lantern Row',to:'Fern Hollow',tier:3,generation:3}],
      ['building_opened',{cls:'business',type:'bakery',name:'Bakery',jobs:6,district:'Fern Hollow'}],
      ['building_opened',{cls:'service',type:'school',name:'School',jobs:7,district:'Lantern Row'}],
      ['district_identity',{district:'Fern Hollow',labels:['Commercial']}],
      ['home_upgraded',{tier:'Town Home'}],['festival',{name:'Harvest Home'}],
      ['petition_raised',{district:'Fern Hollow',need:'school',want:'a school',surname:'Marsh',familyId:1}]])
      ledger.record(type,{...fields,day});
    for(const e of ledger.ledger()) e.day=day;
    check('fixture: a full edition went to print',postSim.publishIssue()&&postSim.currentIssue().sections.length>=4,
      postSim.currentIssue()&&postSim.currentIssue().sections.length);
    const post=await win.eval("import('/src/ui/post.js')");
    post.openPost();
    await wait(()=>el('look').classList.contains('post-open'));
    const panel=box(el('look'));
    check('the paper opens clear of the status bar',panel.top>=NOTCH.top-0.5,'top '+panel.top.toFixed(1));
    check('and clear of the home indicator',panel.bottom<=view.h-NOTCH.bottom+0.5,'bottom '+panel.bottom.toFixed(1)+' of '+view.h);
    check('its masthead is readable, not under the clock',(()=>{
      const m=doc.querySelector('.post-masthead h3'); return m&&box(m).top>=NOTCH.top-0.5; })(),
      JSON.stringify(doc.querySelector('.post-masthead h3')&&box(doc.querySelector('.post-masthead h3')).top));
    check('and its close button is reachable',reachable(box(el('look-x')),view));
    check('a full paper actually fills the room it is given',panel.height>400,panel.height.toFixed(0));
    el('look').classList.remove('show','post-open');
  }

  /* ---------- nothing else was pushed off either ---------- */
  {
    const musts=[['the tool bar','.dock'],['the build button','#b-build'],['the city stage badge','#b-stage'],
      ['the coins readout','.hud-resources'],['the day readout','.hud-climate']];
    for(const [label,sel] of musts){
      const e=doc.querySelector(sel);
      check(label+' stays where a thumb can reach it',e&&reachable(box(e),view),
        e?JSON.stringify({t:+box(e).top.toFixed(0),b:+box(e).bottom.toFixed(0)}):'missing');
    }
  }

  /* ---------- a panel opens at the top of what it is showing ----------
     The panel that was reported clipped was, the second time, not clipped at
     all: `.look` is the scroll container, and the position left behind by the
     last card survives into the next one. Scroll a long house card, close it,
     open City Hall, and its section nav is above the fold with nothing on
     screen to say so — which looks identical to a panel whose top has been cut
     off, and which no amount of CSS will fix. */
  {
    const look=el('look');
    look.classList.remove('show','cityhall-open','post-open');
    // A long card: a house with a household in it.
    const panels=await win.eval("import('/src/ui/panels.js')");
    const social=await win.eval("import('/src/simulation/families.js')");
    const b=await win.eval("import('/src/buildings/buildings.js')");
    const cx=hallAt.x;
    b.place('house',cx+2,cx+2); b.place('road',cx+2,cx+3);
    panels.inspect(cx+2,cx+2);
    await wait(()=>look.classList.contains('show'));
    look.scrollTop=400;
    const scrolled=look.scrollTop;
    check('fixture: a card long enough to scroll, and scrolled',scrolled>0,scrolled);
    // Now open City Hall, the way tapping it does.
    await openHall();
    check('opening a different panel starts at the top of it',look.scrollTop===0,look.scrollTop);
    const nav=[...doc.querySelectorAll('[data-cityhall-nav]')];
    check('so its first section is on screen, not above the fold',
      nav.length>0&&box(nav[0]).top>=box(look).top-0.5&&box(nav[0]).top<box(look).top+120,
      nav.length?JSON.stringify({nav:+box(nav[0]).top.toFixed(0),panel:+box(look).top.toFixed(0)}):'no nav');
    /* But a card being refreshed in place keeps its position. Yanking somebody
       back to the top every time the simulation ticks would be worse than the
       bug this fixes. */
    panels.inspect(cx+2,cx+2);
    await wait(()=>look.classList.contains('show'));
    look.scrollTop=120;
    panels.refreshLook();
    check('a card refreshing in place does not yank the reader back',look.scrollTop===120,look.scrollTop);
    look.classList.remove('show','cityhall-open');
  }

  /* ---------- and with no insets at all, nothing moved ----------
     A desktop browser reports zero for both, and the panels should sit exactly
     where they always did rather than paying for a notch that is not there. */
  {
    setInsets(doc,0,0);
    await openHall();
    const panel=box(el('look'));
    check('with no insets the panel still fits the screen',panel.top>=-0.5&&panel.bottom<=view.h+0.5,
      JSON.stringify({t:+panel.top.toFixed(0),b:+panel.bottom.toFixed(0),h:view.h}));
    check('and it uses the room a notchless screen actually has',panel.top<NOTCH.top,
      'top '+panel.top.toFixed(1)+' should be above '+NOTCH.top+' when nothing is in the way');
    check('the panel is a full-height panel, not a stub',panel.height>400,panel.height.toFixed(0));
  }

  const failed=checks.filter(c=>!c.pass);
  document.getElementById('results').textContent=JSON.stringify({pass:!failed.length,checks},null,2);
  document.documentElement.dataset.result=failed.length?'fail':'pass';
})().catch(e=>{
  checks.push({name:'the page ran without throwing',pass:false,detail:String(e&&e.stack||e)});
  document.getElementById('results').textContent=JSON.stringify({pass:false,checks},null,2);
  document.documentElement.dataset.result='fail';
});
