/* Skin and hair for the little people, shared by both renderers so a citizen
   has the same colouring whichever path draws them. The index comes from the
   citizen's own bob, which is already unique and already saved, so the record
   never grows a field for it. */
export const SKIN=["#f0d9bd","#e6c39c","#c99a6f","#9c6b45","#7a5133"];
export const HAIR=["#3a2c22","#6b4a2f","#2b2b30","#8a6a3e","#4a3550","#d8cfc0"];
export function personSeed(c){ return Math.abs(Math.round((c.bob||0)*1000)); }
