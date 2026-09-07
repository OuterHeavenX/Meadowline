/* ============================================================
   THE BUILD TAG — so a release cannot ship half-cached

   Meadowline is static files with no build step, which means a browser is
   free to serve last month's stylesheet next to this morning's JavaScript
   and nothing looks wrong. That is not hypothetical: the safe-area fix was
   entirely CSS, the stylesheets carried no cache-busting query at all, and
   it reached the repository without reaching a phone.

   One token now goes on every asset URL, and these checks make forgetting it
   loud: every stylesheet and the module entry must carry the same tag, and
   the tag the page reports must be the tag it actually loaded.
   ============================================================ */
import { assetTags, buildTag } from '../src/core/version.js';

const checks=[];
const check=(name,value,detail)=>checks.push({name,pass:Boolean(value),...(detail===undefined?{}:{detail})});

(async()=>{
  const html=await (await fetch('../index.html')).text();
  const doc=new DOMParser().parseFromString(html,'text/html');
  const assets=assetTags(doc);

  check('the page pulls the assets it is supposed to',assets.length>=7,assets.length);
  const untagged=assets.filter(a=>!a.tag);
  check('every stylesheet and script carries a cache-busting tag',untagged.length===0,
    untagged.map(a=>a.url).join(', '));
  const tags=[...new Set(assets.map(a=>a.tag))];
  check('and they all carry the same one, so a release cannot half-ship',tags.length===1,
    JSON.stringify(assets));
  check('the tag looks like something a person chose, not a leftover',
    /^[a-z0-9][a-z0-9.-]{4,48}$/i.test(tags[0]||''),tags[0]);

  // Every stylesheet the page names must exist, tag and all.
  const missing=[];
  for(const a of assets){
    const url='../'+a.url+'?v='+encodeURIComponent(a.tag);
    const r=await fetch(url,{method:'GET'});
    if(!r.ok) missing.push(a.url+' -> '+r.status);
  }
  check('every tagged asset actually loads',missing.length===0,missing.join(', '));

  /* The reported tag has to come from the page rather than from a constant
     somebody can forget to update, so it is read back off the script tag. */
  const reported=(()=>{
    const s=doc.querySelector('script[type="module"][src*="main.js"]');
    const m=s&&s.getAttribute('src').match(/[?&]v=([^&"]+)/);
    return m?decodeURIComponent(m[1]):'dev';
  })();
  check('the build the page reports is the build it loaded',reported===tags[0],reported+' vs '+tags[0]);
  check('and a page with no tag at all reports itself as dev',(()=>{
    const bare=new DOMParser().parseFromString('<script type="module" src="src/main.js"></script>','text/html');
    const s=bare.querySelector('script[type="module"][src*="main.js"]');
    return !/[?&]v=/.test(s.getAttribute('src')); })());

  // The running page (this test) has no tag of its own, and must not pretend.
  check('buildTag falls back rather than inventing a version',typeof buildTag()==='string'&&buildTag().length>0,buildTag());

  // The credits dialog has somewhere to put it.
  check('the game has a place to show the build',!!doc.getElementById('build-tag'));

  const failed=checks.filter(c=>!c.pass);
  document.getElementById('results').textContent=JSON.stringify({pass:!failed.length,checks},null,2);
  document.documentElement.dataset.result=failed.length?'fail':'pass';
})().catch(e=>{
  checks.push({name:'the page ran without throwing',pass:false,detail:String(e&&e.stack||e)});
  document.getElementById('results').textContent=JSON.stringify({pass:false,checks},null,2);
  document.documentElement.dataset.result='fail';
});
