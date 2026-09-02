/* ---------- wonders ----------
   One of each, ever. They cost a great deal, unlock as the valley grows, and
   each does something no ordinary building can. */
export const WONDERS={
  statue:     {name:"The Statue",       unlock:60,  mood:{r:9,  per:10, cap:10}},
  clocktower: {name:"The Clock Tower",  unlock:120, mood:{r:11, per:8,  cap:8}, output:0.15},
  lighthouse: {name:"The Lighthouse",   unlock:150, mood:{r:10, per:9,  cap:9}, boats:3, water:true},
  library:    {name:"The Great Library",unlock:200, mood:{r:13, per:12, cap:12}, room:1}
};
export const IS_WONDER=Object.fromEntries(Object.keys(WONDERS).map(k=>[k,1]));
