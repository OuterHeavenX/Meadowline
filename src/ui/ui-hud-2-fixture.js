import { S } from '../core/state.js';
import { frame } from '../core/game.js';
import { idx } from '../world/tiles.js';
import { inspectCityHall } from './city-hall.js';
import { pickTool, toggleBuildTray } from './toolbar.js';

export function applyUiHudFixture(mode){
  // Test-only: reached solely through ?uitest=, never in normal play.
  window.__MEADOWLINE_STATE__=S;
  // Deterministic capture states have no use for the ambient bed, and a
  // synthetic keypress in a suite should not spin up an audio graph.
  S.muted=true;
  // Lets a suite drive the loop directly instead of waiting on headless
  // requestAnimationFrame, which is sparse enough to starve a poll.
  window.__MEADOWLINE_FRAME__=(now)=>frame(now??performance.now());
  document.body.classList.add('visual-fixture');
  document.getElementById('veil')?.classList.add('hide');
  document.body.classList.remove('menu-open');
  if(mode==='build'){
    pickTool('house');
    toggleBuildTray(true);
  }
  if(mode==='cityhall'){
    const x=21,y=21,i=idx(x,y);
    S.terr[i]=0;
    S.grid[i]={type:'cityHall',x,y,pop:0,seed:2121,state:{level:4}};
    inspectCityHall(x,y);
  }
}
