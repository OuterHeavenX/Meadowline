import { S } from '../core/state.js';
export function rendererCapabilities(){
  let webgl2=false,webgpu=typeof navigator!=='undefined'&&!!navigator.gpu;
  try{const c=document.createElement('canvas');webgl2=!!c.getContext('webgl2',{failIfMajorPerformanceCaveat:true});}catch(e){}
  return {production:'canvas2d',webgl2,webgpu,devicePixelRatio:typeof devicePixelRatio==='number'?devicePixelRatio:1,quality:S.quality||'auto'};
}
export function effectiveQuality(){
  if(S.quality&&S.quality!=='auto')return S.quality;
  const dpr=typeof devicePixelRatio==='number'?devicePixelRatio:1,cores=typeof navigator!=='undefined'?navigator.hardwareConcurrency||4:4;
  return cores<=4||dpr>2.5?'balanced':'high';
}
