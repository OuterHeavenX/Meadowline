import { HISTORY_DAYS, series } from '../simulation/chronicle.js';
import { moodName } from '../simulation/mood.js';
import { S } from '../core/state.js';

/* ---------- the ledger: how the valley has been getting on ---------- */
const elLedger=document.getElementById("ledger");
const elBody=document.getElementById("ledger-body");
document.getElementById("ledger-x").addEventListener("click",()=>toggleLedger(false));

let openState=false;
export function isLedgerOpen(){ return openState; }
export function toggleLedger(want){
  openState = want===undefined ? !openState : want;
  elLedger.classList.toggle("show",openState);
  document.body.classList.toggle("ledger-open",openState);   // the wishes panel shares this corner
  if(openState) paintLedger();
  return openState;
}

// a sparkline as an SVG polyline, scaled to its own range
function spark(values,colour){
  const w=196, h=30;
  if(values.length<2) return '<svg class="spark" viewBox="0 0 '+w+' '+h+'"></svg>';
  const lo=Math.min(...values), hi=Math.max(...values);
  const span=(hi-lo)||1;
  const pts=values.map((v,i)=>{
    const x=(i/(values.length-1))*w;
    const y=h-2-((v-lo)/span)*(h-4);
    return x.toFixed(1)+','+y.toFixed(1);
  }).join(' ');
  return '<svg class="spark" viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none">'+
         '<polyline points="'+pts+'" fill="none" stroke="'+colour+'" stroke-width="2" '+
         'stroke-linejoin="round" stroke-linecap="round"/></svg>';
}

function row(label,values,colour,now){
  return '<div class="lrow"><div class="lhead"><span>'+label+'</span><b>'+now+'</b></div>'+
         spark(values,colour)+'</div>';
}

export function paintLedger(){
  if(!openState) return;
  const days=S.history.length;
  let html='<h2>The last '+Math.min(days,HISTORY_DAYS)+' days</h2>';
  if(days<2){
    html+='<p class="lempty">Come back after a day or two and this will have something to show.</p>';
  } else {
    html+=row("Citizens",series("pop"),"var(--meadow)",S.pop);
    html+=row("Coins",series("coins"),"var(--mustard)",Math.floor(S.coins));
    html+=row("Mood",series("mood"),"var(--sky)",moodName());
  }
  // the day's books: where the money came from and where it went
  const e=S.econ, lp=S.lastPay;
  html+='<h2 class="lsep">The books</h2>';
  html+='<dl class="books">'+
    '<dt>Work</dt><dd class="'+(e.idle?'dn':'up')+'">'+e.employed+' of '+S.pop+' in work</dd>'+
    '<dt>Jobs going</dt><dd>'+Math.max(0,e.jobs-e.employed)+'</dd>'+
    (lp?('<dt>Taxes</dt><dd class="up">+'+lp.tax+'</dd>'+
         '<dt>Trade</dt><dd class="up">+'+lp.trade+'</dd>'+
         '<dt>Grant</dt><dd class="up">+'+lp.grant+'</dd>'+
         (lp.feast?'<dt>Festival</dt><dd class="up">+'+lp.feast+'</dd>':'')+
         '<dt>Upkeep</dt><dd class="dn">\u2212'+lp.upkeep+'</dd>'+
         '<dt class="net">Last payday</dt><dd class="net '+(lp.total>=0?'up':'dn')+'">'+
           (lp.total>=0?'+':'\u2212')+Math.abs(lp.total)+'</dd>')
        :'<dt>Last payday</dt><dd>not yet</dd>')+
    '</dl>';
  if(e.broke) html+='<p class="lempty">Upkeep is outrunning the takings. Build something that earns, or clear what you do not need.</p>';

  html+='<h2 class="lsep">Chronicle</h2>';
  if(!S.log.length){
    html+='<p class="lempty">Nothing has happened yet worth writing down.</p>';
  } else {
    html+='<ol class="chron">'+
      S.log.slice(0,24).map(e=>'<li><em>Day '+e.day+'</em><span>'+e.text+'</span></li>').join('')+
      '</ol>';
  }
  elBody.innerHTML=html;
}
