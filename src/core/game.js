import { ambientTick, blip, siren, thunder } from '../audio/audio.js';
import { growth } from '../buildings/houses.js';
import { DAY } from './constants.js';
import { load, save } from './save.js';
import { configureServices } from './services.js';
import { diagnosticFrameStart, recordRenderMs, recordSimulationMs } from './diagnostics.js';
import { S, reduceMotion } from './state.js';
import { emitFeedback } from '../simulation/feedback.js';
import { drawMini, elMini } from '../rendering/minimap.js';
import { render } from '../rendering/renderer.js';
import { resize } from '../rendering/terrain.js';
import { advanceEducation, recomputeServices } from '../simulation/civic-services.js';
import { advanceHousing } from '../simulation/housing.js';
import { updateCitizens } from '../simulation/citizens.js';
import { updateMobility } from '../simulation/mobility.js';
import { payday } from '../simulation/economy.js';
import { recompute } from '../simulation/mood.js';
import { hearts, puff, updatePuffs } from '../simulation/particles.js';
import { updateTrains } from '../simulation/trains.js';
import { updateBoats } from '../simulation/boats.js';
import { checkMiles, checkWishes, rollWishes } from '../simulation/wishes.js';
import { paintHud } from '../ui/hud.js';
import { hint, tickHint, toast } from '../ui/notify.js';
import { closeLook, refreshLook } from '../ui/panels.js';
import { cityHallSelected, renderCityHall } from '../ui/city-hall.js';
import { bMap, bSound } from '../ui/hud.js';
import { paintTools } from '../ui/toolbar.js';
import { paintWishes } from '../ui/wishes.js';
import { genWorld, stepCamera, viewBounds } from '../world/map.js';
import { refreshPalette } from '../world/seasons.js';
import { activeFestival } from '../world/festivals.js';
import { note, recordDay } from '../simulation/chronicle.js';
import { paintLedger } from '../ui/ledger.js';
import { seedBirds, seedClouds, updateBirds, updateClouds, updateDrops, updateMotes, updateSplashes, updateStorm, updateWeather } from '../world/weather.js';
import { cityStage, evaluateCityGrowth, resetProgression } from '../progression/city-growth.js';
import { paintGrowthPanel } from '../ui/growth.js';
import { updateMunicipal } from '../simulation/municipal.js';
import { advanceDistricts } from '../simulation/districts.js';
import { advanceFamilies } from '../simulation/families.js';
import { advanceCareers } from '../simulation/careers.js';
import { advanceOrganisations } from '../simulation/organisations.js';
import { advanceEnforcement } from '../simulation/enforcement.js';
import { advanceFame } from '../simulation/fame.js';
import { publishIssue } from '../simulation/post.js';
import { record } from '../simulation/ledger.js';
import { updateFeedback } from '../simulation/feedback.js';
import { tickTutorial } from '../ui/tutorial.js';

/* ---------- reaching a new stage ----------
   Advancing a city stage is the largest thing that happens in Meadowline and it
   passed with a toast alone. It gets a moment at the civic centre, or at the
   middle of the settled town when there is no City Hall yet: a mark on the map,
   a little rise of particles and two soft notes. Restrained on purpose — the
   roadmap asks for calm, not fanfare. */
function stageHeart(){
  const hall=(S.grid||[]).find(b=>b?.type==='cityHall');
  if(hall) return {x:hall.x,y:hall.y};
  const homes=(S.ctx?.houses||[]).filter(h=>(h.pop|0)>0);
  if(!homes.length) return null;
  const sum=homes.reduce((a,h)=>({x:a.x+h.x,y:a.y+h.y}),{x:0,y:0});
  return {x:Math.round(sum.x/homes.length),y:Math.round(sum.y/homes.length)};
}
function celebrateStage(name){
  const at=stageHeart();
  if(!at) return;
  emitFeedback(at.x,at.y,'upgrade','★ '+name);
  if(!reduceMotion){ puff(at.x,at.y); hearts(at.x,at.y); }
  blip(587.33,0.09,'triangle');
  setTimeout(()=>blip(880,0.08,'triangle'),150);
}

/* ============================================================
   MAIN LOOP
   ============================================================ */
export let last=performance.now();
configureServices({blip,siren,thunder,puff,hearts,hint,toast,paintTools,paintWishes,closeLook});
let simClock=0, uiClock=0, lookClock=0, miniClock=0, saveClock=0, ledgerClock=0;
// One thrown error used to end the session: frame() re-queued itself on the
// last line, so an exception anywhere stopped simulation, the HUD and the
// six-second autosave permanently behind a screen that still looked normal.
// A crash now costs one frame and is recorded where ?debug=1 can show it.
let loopErrorMessage='';
function recordLoopError(e){
  const message=String(e?.message||e);
  S.diagnostics.loopErrors=(S.diagnostics.loopErrors||0)+1;
  S.diagnostics.lastLoopError=message;
  // Repeats are counted but logged once, so a per-frame fault cannot drown
  // the console it needs to be diagnosed from.
  if(message!==loopErrorMessage){ loopErrorMessage=message; console.error('Meadowline frame error:',e); }
}
export function frame(now){
  try{ step(now); }
  catch(e){ recordLoopError(e); }
  finally{ requestAnimationFrame(frame); }
}
function step(now){
  S.diagnostics.frameCount=(S.diagnostics.frameCount||0)+1;
  diagnosticFrameStart(now);
  let dt=(now-last)/1000; last=now;
  dt=Math.min(dt,0.05);
  const sdt=dt*(S.running?S.speed:0);
  const simStart=S.diagnostics.enabled?performance.now():0;

  S.t+=dt;
  stepCamera(dt);
  refreshPalette();
  if(sdt>0){
    S.dayT+=sdt/DAY;
    if(S.dayT>=1){
      S.dayT-=1; S.day++; payday();
      recordDay();
      // Yesterday is over; the paper reads its ledger and goes to print. The
      // player is told an edition is out, and chooses whether to read it.
      if(publishIssue()) toast('The Meadowline Post · Day '+(S.day-1)+' edition is out');
      const fest=activeFestival();
      if(fest){ toast(fest.name+" · the valley is dressed for it","gold"); note(fest.name); record('festival',{name:fest.name}); }
    }
    simClock+=sdt;
    if(simClock>0.9){
      const step=simClock; simClock=0;
      recompute();
      recomputeServices();
      advanceEducation(step);
      advanceHousing(step);
      const growthResult=evaluateCityGrowth();
      if(S.diagnostics) S.diagnostics.milestoneEvaluations=(S.diagnostics.milestoneEvaluations||0)+1;
      if(growthResult.stageChanged){
        toast(cityStage().name+' established','gold');
        note(cityStage().name+' established');
        record('stage_change',{stage:cityStage().name});
        celebrateStage(cityStage().name);
        paintTools();
        paintGrowthPanel();
      }
      checkMiles(); checkWishes();
      /* What a neighbourhood is changes over months, not frames, so it is read
         on its own slow clock. When a place becomes something, the valley
         remembers it. */
      advanceDistricts(step,(district,held)=>{
        if(!held.length) return;
        note(district.name+' became known as '+held.map(h=>h.label.toLowerCase()).join(' and '));
        record('district_identity',{district:district.name,labels:held.map(h=>h.label)});
      });
      // Who the valley has come to know. Same slow clock, same idea: the
      // Chronicle gets the sentence, the simulation decides the fact.
      advanceFamilies(step,note);
      advanceCareers(step,note);
      // Slower still. Whether a place grows something nobody built is read
      // against the conditions the player did build, three passes to one.
      advanceOrganisations(step,note);
      // And what the police make of it. Their clock, their decision.
      advanceEnforcement(step,note);
      // Who the valley has come to talk about for the right reasons.
      advanceFame(step,note);
    }
    growth(sdt);
    updateCitizens(sdt);
    updateMobility(sdt);
    updateMunicipal(sdt);
    updateTrains(sdt);
    updateBoats(sdt);
    updateWeather(sdt);
    updateClouds(sdt);
  }
  updateDrops(dt);
  // Splashes are seeded across the ground the player can actually see, so they
  // follow a pan or a turn instead of raining on the far corner of the map.
  updateSplashes(dt,viewBounds(1));
  updateStorm(dt);
  updateMotes(dt);
  updateBirds(dt);
  updatePuffs(dt);
  updateFeedback(dt);
  ambientTick(dt);
  if(S.diagnostics.enabled) recordSimulationMs(performance.now()-simStart);

  uiClock+=dt; if(uiClock>0.2){ uiClock=0; paintHud(); paintTools(); paintWishes(); }
  tickTutorial();
  lookClock+=dt; if(lookClock>0.7){ lookClock=0; if(cityHallSelected()) renderCityHall(); else refreshLook(); }
  miniClock+=dt; if(miniClock>0.45){ miniClock=0; drawMini(); }
  ledgerClock+=dt; if(ledgerClock>1.1){ ledgerClock=0; paintLedger(); }
  tickHint(dt);
  saveClock+=dt; if(saveClock>6){ saveClock=0; save(); }

  const renderStart=S.diagnostics.enabled?performance.now():0;
  render();
  if(S.diagnostics.enabled) recordRenderMs(performance.now()-renderStart);
}

/* ---------- boot ---------- */
resize();
seedClouds(); seedBirds(); refreshPalette();
if(!load()){
  resetProgression('parcel');
  genWorld(S.seed); recompute(); rollWishes();
}
recomputeServices(true);
// Sound is on unless the player turned it off, and the chip is painted from
// the loaded preference rather than a hardcoded mute. The ambient bed still
// waits for a gesture: browsers refuse to start an AudioContext before one.
bSound.classList.toggle("off",S.muted);
elMini.classList.remove("hide");
bMap.classList.remove("off");
paintHud(); paintTools(); paintWishes(); drawMini(); paintGrowthPanel();
requestAnimationFrame(frame);
