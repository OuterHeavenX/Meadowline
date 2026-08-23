import { ambientTick, blip } from '../audio/audio.js';
import { growth } from '../buildings/houses.js';
import { DAY } from './constants.js';
import { load, save } from './save.js';
import { configureServices } from './services.js';
import { diagnosticFrameStart, recordRenderMs, recordSimulationMs } from './diagnostics.js';
import { S } from './state.js';
import { drawMini, elMini } from '../rendering/minimap.js';
import { render } from '../rendering/renderer.js';
import { resize } from '../rendering/terrain.js';
import { advanceEducation, recomputeServices } from '../simulation/civic-services.js';
import { advanceHousing } from '../simulation/housing.js';
import { updateCitizens } from '../simulation/citizens.js';
import { payday } from '../simulation/economy.js';
import { recompute } from '../simulation/mood.js';
import { hearts, puff, updatePuffs } from '../simulation/particles.js';
import { updateTrains } from '../simulation/trains.js';
import { updateBoats } from '../simulation/boats.js';
import { checkMiles, checkWishes, rollWishes } from '../simulation/wishes.js';
import { paintHud } from '../ui/hud.js';
import { hint, tickHint, toast } from '../ui/notify.js';
import { closeLook, refreshLook } from '../ui/panels.js';
import { bMap, bSound } from '../ui/hud.js';
import { paintTools } from '../ui/toolbar.js';
import { paintWishes } from '../ui/wishes.js';
import { genWorld } from '../world/map.js';
import { refreshPalette } from '../world/seasons.js';
import { activeFestival } from '../world/festivals.js';
import { note, recordDay } from '../simulation/chronicle.js';
import { paintLedger } from '../ui/ledger.js';
import { seedBirds, seedClouds, updateBirds, updateClouds, updateDrops, updateMotes, updateWeather } from '../world/weather.js';
import { cityStage, evaluateCityGrowth, resetProgression } from '../progression/city-growth.js';
import { paintGrowthPanel } from '../ui/growth.js';

/* ============================================================
   MAIN LOOP
   ============================================================ */
export let last=performance.now();
configureServices({blip,puff,hearts,hint,toast,paintTools,paintWishes,closeLook});
let simClock=0, uiClock=0, lookClock=0, miniClock=0, saveClock=0, ledgerClock=0;
export function frame(now){
  diagnosticFrameStart(now);
  let dt=(now-last)/1000; last=now;
  dt=Math.min(dt,0.05);
  const sdt=dt*(S.running?S.speed:0);
  const simStart=S.diagnostics.enabled?performance.now():0;

  S.t+=dt;
  refreshPalette();
  if(sdt>0){
    S.dayT+=sdt/DAY;
    if(S.dayT>=1){
      S.dayT-=1; S.day++; payday();
      recordDay();
      const fest=activeFestival();
      if(fest){ toast(fest.name+" · the valley is dressed for it","gold"); note(fest.name); }
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
        paintTools();
        paintGrowthPanel();
      }
      checkMiles(); checkWishes();
    }
    growth(sdt);
    updateCitizens(sdt);
    updateTrains(sdt);
    updateBoats(sdt);
    updateWeather(sdt);
    updateClouds(sdt);
  }
  updateDrops(dt);
  updateMotes(dt);
  updateBirds(dt);
  updatePuffs(dt);
  ambientTick(dt);
  if(S.diagnostics.enabled) recordSimulationMs(performance.now()-simStart);

  uiClock+=dt; if(uiClock>0.2){ uiClock=0; paintHud(); paintTools(); paintWishes(); }
  lookClock+=dt; if(lookClock>0.7){ lookClock=0; refreshLook(); }
  miniClock+=dt; if(miniClock>0.45){ miniClock=0; drawMini(); }
  ledgerClock+=dt; if(ledgerClock>1.1){ ledgerClock=0; paintLedger(); }
  tickHint(dt);
  saveClock+=dt; if(saveClock>6){ saveClock=0; save(); }

  const renderStart=S.diagnostics.enabled?performance.now():0;
  render();
  if(S.diagnostics.enabled) recordRenderMs(performance.now()-renderStart);
  requestAnimationFrame(frame);
}

/* ---------- boot ---------- */
resize();
seedClouds(); seedBirds(); refreshPalette();
if(!load()){
  resetProgression('parcel');
  genWorld(S.seed); recompute(); rollWishes();
}
recomputeServices(true);
S.muted=true; bSound.classList.add("off");
elMini.classList.remove("hide");
bMap.classList.remove("off");
paintHud(); paintTools(); paintWishes(); drawMini(); paintGrowthPanel();
requestAnimationFrame(frame);
