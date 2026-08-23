import { W, H } from './constants.js';
import { S } from './state.js';

const enabled=(()=>{ try{return new URLSearchParams(location.search).get("debug")==="1";}catch(e){return false;} })();
S.diagnostics.enabled=enabled;
let el=null,frames=0,lastPaint=performance.now(),lastFrame=performance.now();
if(enabled){
  el=document.createElement("pre");
  el.setAttribute("aria-label","Meadowline developer diagnostics");
  el.style.cssText="position:fixed;left:8px;top:8px;z-index:9999;margin:0;padding:8px 10px;max-width:220px;pointer-events:none;background:rgba(18,28,31,.78);color:#eef4e9;border:1px solid rgba(255,255,255,.18);border-radius:8px;font:11px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap";
  document.body.appendChild(el);
}

export function diagnosticFrameStart(now){
  if(!enabled) return;
  const d=Math.max(0,now-lastFrame); lastFrame=now;
  S.diagnostics.frameMs=d;
  frames++;
  if(now-lastPaint>=1000){
    S.diagnostics.fps=Math.round(frames*1000/(now-lastPaint));
    frames=0; lastPaint=now; paintDiagnostics();
  }
}
export function recordSimulationMs(ms){ if(enabled) S.diagnostics.simMs=ms; }
export function recordRenderMs(ms){ if(enabled) S.diagnostics.renderMs=ms; }

export function paintDiagnostics(){
  if(!enabled||!el) return;
  const grid=(S.grid||[]).reduce((n,b)=>n+(b?1:0),0);
  const svc=S.services&&S.services.education;
  const providers=svc?Object.keys(svc.providers||{}).length:0;
  const visible=(S.citizens.length+S.trains.length+S.boats.length+grid);
  el.textContent=[
    "MEADOWLINE DEBUG",
    "FPS             "+(S.diagnostics.fps||0),
    "Frame ms        "+(S.diagnostics.frameMs||0).toFixed(1),
    "Simulation ms   "+(S.diagnostics.simMs||0).toFixed(2),
    "Render ms       "+(S.diagnostics.renderMs||0).toFixed(2),
    "Grid            "+W+"×"+H,
    "Render items    "+grid,
    "Visible approx  "+visible,
    "Citizens        "+S.citizens.length,
    "Trains / boats  "+S.trains.length+" / "+S.boats.length,
    "Service prov.   "+providers,
    "Service rebuild "+(S.services.recomputes||0),
    "Path searches   "+(S.diagnostics.pathSearches||0),
    "Save bytes      "+(S.diagnostics.saveBytes||0)
  ].join("\n");
}
