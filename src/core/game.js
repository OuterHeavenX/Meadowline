import { ambientTick, blip } from '../audio/audio.js';
import { DAY } from './constants.js';
import { configureServices } from './services.js';
import { load, save } from './save.js';
import { S } from './state.js';
import { drawMini, elMini } from '../rendering/minimap.js';
import { render } from '../rendering/renderer.js';
import { resize } from '../rendering/terrain.js';
import { updateCitizens } from '../simulation/citizens.js';
import { checkMiles, checkWishes, payday, rollWishes } from '../simulation/economy.js';
import { growth, recompute } from '../simulation/mood.js';
import { hearts, puff, updatePuffs, updateTrains } from '../simulation/trains.js';
import { paintHud, paintWishes } from '../ui/hud.js';
import { closeLook, refreshLook } from '../ui/panels.js';
import { bMap, bSound } from '../ui/postcard.js';
import { hint, paintTools, tickHint, toast } from '../ui/toolbar.js';
import { genWorld } from '../world/map.js';
import { refreshPalette } from '../world/seasons.js';
import { seedBirds, seedClouds, updateBirds, updateClouds, updateDrops, updateWeather } from '../world/weather.js';

/* ============================================================
   MAIN LOOP
   ============================================================ */
export let last=performance.now();
configureServices({blip,puff,hearts,hint,toast,paintTools,paintWishes,closeLook});
let simClock=0, uiClock=0, lookClock=0, miniClock=0, saveClock=0;
export function frame(now){
  let dt=(now-last)/1000; last=now;
  dt=Math.min(dt,0.05);
  const sdt=dt*(S.running?S.speed:0);

  S.t+=dt;
  refreshPalette();
  if(sdt>0){
    S.dayT+=sdt/DAY;
    if(S.dayT>=1){ S.dayT-=1; S.day++; payday(); }
    simClock+=sdt;
    if(simClock>0.9){ simClock=0; recompute(); checkMiles(); checkWishes(); }
    growth(sdt);
    updateCitizens(sdt);
    updateTrains(sdt);
    updateWeather(sdt);
    updateClouds(sdt);
  }
  // these drift on real time, so the valley still breathes while paused
  updateDrops(dt);
  updateBirds(dt);
  updatePuffs(dt);
  ambientTick(dt);

  uiClock+=dt; if(uiClock>0.2){ uiClock=0; paintHud(); paintTools(); paintWishes(); }
  lookClock+=dt; if(lookClock>0.7){ lookClock=0; refreshLook(); }
  miniClock+=dt; if(miniClock>0.45){ miniClock=0; drawMini(); }
  tickHint(dt);
  saveClock+=dt; if(saveClock>6){ saveClock=0; save(); }

  render();
  requestAnimationFrame(frame);
}

/* ---------- boot ---------- */
resize();
seedClouds(); seedBirds(); refreshPalette();
if(!load()){ genWorld(S.seed); recompute(); rollWishes(); }
S.muted=true; bSound.classList.add("off");   // never start a tab making noise
elMini.classList.remove("hide");
bMap.classList.remove("off");
paintHud(); paintTools(); paintWishes(); drawMini();
requestAnimationFrame(frame);
