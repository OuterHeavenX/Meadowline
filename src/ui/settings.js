import { S } from '../core/state.js';
import { save } from '../core/save.js';
import { resetRendererBackend } from '../rendering/backend.js';
import { resize } from '../rendering/terrain.js';

const wrap=document.createElement('div');wrap.className='graphics-settings';wrap.innerHTML='<button class="chip settings-toggle" aria-label="Graphics settings" title="Graphics settings">⚙</button><section hidden><button class="x" aria-label="Close">×</button><h3>Graphics</h3><label>Renderer<select data-renderer><option value="auto">Auto</option><option value="gpu">GPU</option><option value="compatibility">Compatibility</option></select></label><label>Quality<select data-quality><option value="auto">Auto</option><option value="high">High</option><option value="balanced">Balanced</option><option value="battery">Battery Saver</option></select></label><p>Auto chooses safely. Graphics never change simulation.</p></section>';document.body.appendChild(wrap);
const panel=wrap.querySelector('section'),toggle=wrap.querySelector('.settings-toggle'),renderer=wrap.querySelector('[data-renderer]'),quality=wrap.querySelector('[data-quality]');renderer.value=S.rendererMode||'auto';quality.value=S.quality||'auto';toggle.onclick=()=>panel.hidden=!panel.hidden;wrap.querySelector('.x').onclick=()=>panel.hidden=true;
function changed(){S.rendererMode=renderer.value;S.quality=quality.value;resetRendererBackend();resize();save();}
renderer.onchange=changed;quality.onchange=changed;
