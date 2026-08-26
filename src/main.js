import './core/input.js';
import './core/game.js';
import './ui/settings.js';
import './ui/account.js';
document.documentElement.dataset.boot='pass';
const fixture=new URLSearchParams(location.search).get('uitest');
if(fixture) setTimeout(()=>import('./ui/ui-hud-2-fixture.js').then(m=>m.applyUiHudFixture(fixture)),250);
