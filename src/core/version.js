/* ============================================================
   BUILD TAG — which Meadowline is actually running

   There is no build step, so nothing stamps a version into the files. What
   there is instead is one cache-busting token, written by hand on every asset
   URL in index.html, and this reads it back off the page. That makes the
   token the single source of truth: whatever the browser actually loaded is
   what gets shown, so "I don't see the change" becomes a question anyone can
   answer by looking.

   Why it matters more than a vanity string: a static site with no query on
   its stylesheets is served from cache indefinitely. A player can pull the
   newest index.html and still be looking at last month's CSS, which is
   exactly how a layout fix can land in the repository and never reach a
   phone. Bumping the token is the release step, and the regression asserts
   that every asset carries the same one so half a release cannot ship. */
export function buildTag(){
  try{
    const s=document.querySelector('script[type="module"][src*="main.js"]');
    const m=s&&s.getAttribute('src').match(/[?&]v=([^&"]+)/);
    return m?decodeURIComponent(m[1]):'dev';
  }catch(e){ return 'dev'; }
}
/* Every asset the page pulls, with the token each one carries. The release
   check and the regression both read this rather than a hand-kept list. */
export function assetTags(doc=document){
  const out=[];
  for(const el of doc.querySelectorAll('link[rel="stylesheet"][href],script[type="module"][src]')){
    const url=el.getAttribute('href')||el.getAttribute('src');
    const m=url.match(/[?&]v=([^&"]+)/);
    out.push({url:url.split('?')[0],tag:m?decodeURIComponent(m[1]):null});
  }
  return out;
}
