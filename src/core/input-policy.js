export const TOUCH_DRAG_THRESHOLD=7;
export const TOUCH_PAINT_HOLD_MS=300;
export const PAINT_TOOLS=new Set(['road','rail','tree','erase']);
export const ONE_SHOT_TOOLS=new Set(['house','cafe','park','lamp','school','market','bakery','station','mill','dock']);

export function isPaintTool(tool){ return PAINT_TOOLS.has(tool); }
export function isOneShotTool(tool){ return ONE_SHOT_TOOLS.has(tool); }

// Pure policy helper used by regression tests and the pointer controller.
export function touchIntent({tool='move',movedPx=0,heldMs=0,pointers=1}){
  if(pointers>=2) return 'pinch';
  if(isPaintTool(tool)&&heldMs>=TOUCH_PAINT_HOLD_MS) return 'paint';
  if(movedPx>TOUCH_DRAG_THRESHOLD) return 'pan';
  return tool==='move'?'pan':'tap';
}
