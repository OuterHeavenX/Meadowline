import { S } from '../core/state.js';
import { idx } from '../world/tiles.js';
import { inspectCityHall } from './city-hall.js';
import { pickTool, toggleBuildTray } from './toolbar.js';

export function applyUiHudFixture(mode){
  // Test-only: reached solely through ?uitest=, never in normal play.
  window.__MEADOWLINE_STATE__=S;
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
