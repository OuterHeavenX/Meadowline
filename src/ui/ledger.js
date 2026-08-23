import { HISTORY_DAYS, series } from '../simulation/chronicle.js';
import { getCityEducationAverage, recomputeServices } from '../simulation/civic-services.js';
import { housingMetrics, RESIDENTIAL_TIERS } from '../simulation/housing.js';
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
  document.body.classList.toggle("ledger-open",openState);
  if(openState) paintLedger();
  return openState;
}

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
         '<polyline points="'+pts+'" fill="none" stroke="'+colour+'" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>';
}

function row(label,values,colour,now){
  return '<div class="lrow"><div class="lhead"><span>'+label+'</span><b>'+now+'</b></div>'+spark(values,colour)+'</div>';
}

export function paintLedger(){
  if(!openState) return;
  recomputeServices();
  const edu=S.services.education.metrics;
  const housing=housingMetrics();
  const tierSummary=RESIDENTIAL_TIERS.map((t,i)=>t.name+' '+(housing.tiers[i]||0)).join(' · ');
  const days=S.history.length;
  let html='<h2>Living city</h2>'+
    '<div class="lrow"><div class="lhead"><span>Education</span><b>'+getCityEducationAverage()+'%</b></div>'+
    '<p class="lempty">Students served <b>'+edu.served+' / '+edu.demand+'</b> · capacity '+edu.capacity+' · utilization '+edu.utilization+'%</p></div>'+
    '<div class="lrow"><div class="lhead"><span>Housing</span><b>'+housing.averageDesirability+' desirability</b></div>'+
    '<p class="lempty">'+tierSummary+'<br>'+housing.ready+' home'+(housing.ready===1?'':'s')+' ready to grow</p></div>'+
    '<h2 class="lsep">The last '+Math.min(days,HISTORY_DAYS)+' days</h2>';
  if(days<2){
    html+='<p class="lempty">Come back after a day or two and this will have something to show.</p>';
  } else {
    html+=row("Citizens",series("pop"),"var(--meadow)",S.pop);
    html+=row("Coins",series("coins"),"var(--mustard)",Math.floor(S.coins));
    html+=row("Mood",series("mood"),"var(--sky)",moodName());
  }
  html+='<h2 class="lsep">Chronicle</h2>';
  if(!S.log.length){
    html+='<p class="lempty">Nothing has happened yet worth writing down.</p>';
  } else {
    html+='<ol class="chron">'+S.log.slice(0,24).map(e=>'<li><em>Day '+e.day+'</em><span>'+e.text+'</span></li>').join('')+'</ol>';
  }
  elBody.innerHTML=html;
}
