/* ---------- wonders ----------
   A wonder is a single building that changes the whole valley rather than its
   own block, which is what makes one worth several paydays. Each moves a
   different lever, so a city that can only afford one has a real decision to
   make about which way it wants to grow. */
export const WONDER_EFFECT=Object.freeze({
  // The valley is proud of itself.
  statue:{mood:6, label:'The statue on the green'},
  // One hour, kept by everybody: trade runs to time.
  clockTower:{trade:0.18, mood:2, label:'The clock tower keeps the hour'},
  // Boats find their way in after dark, so the docks are worth working.
  lighthouse:{dock:3, mood:3, label:"The lighthouse over the water"},
  // Its education service is declared in the registry like a school's; the
  // mood here is the building itself, not the teaching.
  greatLibrary:{mood:4, label:'The Great Library'}
});

export function wonderEffect(id){ return WONDER_EFFECT[id]||null; }

// Every wonder standing, from the context Mood already assembles. Wonders are
// unique, so this is at most four entries and safe to read per household.
export function wonderMood(ctx,out){
  let m=0;
  for(const b of ctx?.wonders||[]){
    const e=WONDER_EFFECT[b.type]; if(!e?.mood) continue;
    m+=e.mood; if(out) out.push([e.label,e.mood]);
  }
  return m;
}

export function wonderTradeLift(ctx){
  let lift=0;
  for(const b of ctx?.wonders||[]) lift+=WONDER_EFFECT[b.type]?.trade||0;
  return 1+lift;
}

export function wonderDockLift(ctx){
  let lift=1;
  for(const b of ctx?.wonders||[]) lift*=WONDER_EFFECT[b.type]?.dock||1;
  return lift;
}
