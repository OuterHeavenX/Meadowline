export const hover={x:-1,y:-1,on:false};
/* The building the Move tool is carrying, if any: the anchor tile it was
   picked up from. It lives beside `hover` because both are momentary pointer
   state that the renderer draws and the save file has no business knowing
   about. */
export const carrying={x:-1,y:-1,on:false};
export function pickUp(x,y){ carrying.x=x; carrying.y=y; carrying.on=true; }
export function putDown(){ carrying.on=false; carrying.x=-1; carrying.y=-1; }
