import { S } from '../core/state.js';
export function rendererCapabilities(){
  let webgl2=false,webgpu=typeof navigator!=='undefined'&&!!navigator.gpu;
  try{const c=document.createElement('canvas');webgl2=!!c.getContext('webgl2',{failIfMajorPerformanceCaveat:true});}catch(e){}
  return {production:S.diagnostics?.rendererBackend||'canvas2d',webgl2,webgpu,devicePixelRatio:typeof devicePixelRatio==='number'?devicePixelRatio:1,quality:S.quality||'auto',rendererMode:S.rendererMode||'auto'};
}
export const QUALITY_PROFILES=Object.freeze({
  high:{dpr:2,shadows:2,particles:1,rain:1,reflections:1,bloom:1,detail:1},
  balanced:{dpr:1.5,shadows:1,particles:.68,rain:.7,reflections:.65,bloom:.55,detail:.8},
  battery:{dpr:1,shadows:0,particles:.35,rain:.42,reflections:0,bloom:0,detail:.55}
});
export function graphicsProfile(){return QUALITY_PROFILES[effectiveQuality()]||QUALITY_PROFILES.balanced;}
export function effectiveQuality(){
  if(S.quality&&S.quality!=='auto')return S.quality;
  const dpr=typeof devicePixelRatio==='number'?devicePixelRatio:1,cores=typeof navigator!=='undefined'?navigator.hardwareConcurrency||4:4;
  return cores<=4||dpr>2.5?'balanced':'high';
}
