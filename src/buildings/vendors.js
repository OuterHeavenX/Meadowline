/* ---------- street vendors ----------
   One building, three things it can turn out to be. The player puts down a
   pitch; the street decides what sets up on it, and can change its mind when
   the street changes. A green opens next door and the food cart becomes a
   flower stall. */
export const VENDOR_VARIETIES=[
  // yield: coins a day. presence: how much a home nearby feels it, against the
  // same six-point cap the shops share — flowers are worth more to a street
  // than a newspaper is.
  {id:"foodCart",   name:"Food cart",    yield:4, presence:1, sells:"hot food and something to drink"},
  {id:"flowerStall",name:"Flower stall", yield:3, presence:2, sells:"cut flowers and pot plants"},
  {id:"newsstand",  name:"Newsstand",    yield:3, presence:1, sells:"the Post, and sweets for the walk home"}
];
export const VENDOR_GREEN_R=3;   // a stall wants people already strolling
export const VENDOR_LEARN_R=4;   // a newsstand wants somewhere people read
export function vendorVariety(id){ return VENDOR_VARIETIES.find(v=>v.id===id)||null; }
