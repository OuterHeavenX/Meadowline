import { S } from '../core/state.js'; import { countType } from '../world/tiles.js'; import { save } from '../core/save.js'; import { pickTool } from './toolbar.js';
const STEPS=[
  {title:'Move around',text:'Drag the meadow to pan. Pinch or scroll to zoom.',done:()=>S.cam.z!==1},
  {title:'Build a Road',text:'Roads connect homes, jobs and city services.',done:()=>countType('road')>0,tool:'road'},
  {title:'Welcome a household',text:'Place a House beside a Road, then let residents move in.',done:()=>S.pop>0,tool:'house'},
  {title:'Open a small business',text:'A Café creates jobs and real trade income.',done:()=>countType('cafe')>0,tool:'cafe'},
  {title:'Make room for life',text:'Build a Pocket Park or Pocket Green for Recreation.',done:()=>countType('park')+countType('pocketPark')>0,tool:'pocketPark'},
  {title:'Ask the city',text:'Use Look on a home, then visit City Hall for the municipal overview.',done:()=>!!S.pick,tool:'look'}
];
let root;
function ensure(){if(root)return;root=document.createElement('aside');root.className='tutorial';root.setAttribute('aria-live','polite');document.body.appendChild(root);root.addEventListener('click',e=>{if(e.target.matches('[data-skip]')){S.tutorial.skipped=true;root.hidden=true;save();}if(e.target.matches('[data-next]')){const s=STEPS[S.tutorial.step];if(s?.tool)pickTool(s.tool);tickTutorial(true);}});}
export function tickTutorial(force=false){ensure();if(S.tutorial.completed||S.tutorial.skipped){root.hidden=true;return;}while(STEPS[S.tutorial.step]?.done())S.tutorial.step++;if(S.tutorial.step>=STEPS.length){S.tutorial.completed=true;root.hidden=true;save();return;}root.hidden=false;const s=STEPS[S.tutorial.step];if(force||root.dataset.step!==String(S.tutorial.step)){root.dataset.step=S.tutorial.step;root.innerHTML='<b>'+s.title+'</b><p>'+s.text+'</p><button data-next>'+(s.tool?'Select tool':'Got it')+'</button><button class="quiet" data-skip>Skip</button>';save();}}
