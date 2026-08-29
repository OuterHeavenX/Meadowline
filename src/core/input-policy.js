// Keys the game shell owns. A building tool must never claim one of these:
// the keydown handler resolves tools first, so a colliding tool key silently
// kills the shell shortcut. Pocket Park took 'p' and the postcard button kept
// advertising it. `regression.js` asserts this set stays disjoint from TOOLS.
export const RESERVED_SHORTCUT_KEYS=new Set(['m','s','b','p','l','escape',' ','arrowleft','arrowright','arrowup','arrowdown',',','.']);
// Text fields own their own keystrokes. Without this the account panel's
// email and password inputs retyped the build tool letter by letter and the
// space bar paused the game mid-word.
export function isTextEntryTarget(target){
  if(!target||typeof target!=='object') return false;
  if(target.isContentEditable) return true;
  return ['INPUT','TEXTAREA','SELECT'].includes(target.tagName);
}
export function conflictingToolKeys(tools){ return (tools||[]).filter(t=>RESERVED_SHORTCUT_KEYS.has(String(t.key||'').toLowerCase())).map(t=>t.id); }

export const TOUCH_DRAG_THRESHOLD=7;
export const TOUCH_PAINT_HOLD_MS=300;
export const PAINT_TOOLS=new Set(['road','rail','tree','water','erase']);
export const ONE_SHOT_TOOLS=new Set(['house','cafe','park','lamp','school','cityHall','market','bakery','station','mill','dock','policeStation','fireStation','clinic','hospital']);

export function isPaintTool(tool){ return PAINT_TOOLS.has(tool); }
export function isOneShotTool(tool){ return ONE_SHOT_TOOLS.has(tool); }

// Pure policy helper used by regression tests and the pointer controller.
export function touchIntent({tool='move',movedPx=0,heldMs=0,pointers=1}){
  if(pointers>=2) return 'pinch';
  if(isPaintTool(tool)&&heldMs>=TOUCH_PAINT_HOLD_MS) return 'paint';
  if(movedPx>TOUCH_DRAG_THRESHOLD) return 'pan';
  return tool==='move'?'pan':'tap';
}
