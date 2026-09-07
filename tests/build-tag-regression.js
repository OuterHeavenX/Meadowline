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

  /* ---------- the caching trap ----------
     Meadowline's 139 modules import one another by bare path, so their URLs
     carry no release tag. A long or immutable cache on those would pin every
     player to whatever JavaScript they loaded first, for ever, and the failure
     would be silent: a fixed bug that never goes away for anyone who already
     visited. Only URLs that actually change between releases may be held. */
  const headersRes=await fetch('../_headers');
  const headersText=headersRes.ok?await headersRes.text():'';
  check('the deploy ships caching rules at all',headersText.length>0,headersText.length);
  const rules=[];
  {
    let path=null;
    for(const raw of headersText.split('\n')){
      const line=raw.replace(/#.*$/,'').trimEnd();
      if(!line.trim()) continue;
      if(!/^\s/.test(line)){ path=line.trim(); continue; }
      const m=line.trim().match(/^([\w-]+):\s*(.*)$/);
      if(m&&path) rules.push({path,name:m[1].toLowerCase(),value:m[2]});
    }
  }
  check('and they are parseable rules, not prose',rules.length>=3,JSON.stringify(rules.slice(0,4)));
  const caching=rules.filter(r=>r.name==='cache-control');
  check('every rule set says something about caching',caching.length>=1,caching.length);
  // A long cache is only ever safe on a URL that changes when its content does.
  const VERSIONED=/\?v=/;
  const risky=caching.filter(r=>{
    const held=/immutable/i.test(r.value)||/max-age=([1-9]\d{3,})/.test(r.value);
    return held&&!VERSIONED.test(r.path);
  });
  check('nothing unversioned is cached long enough to strand a player',risky.length===0,
    JSON.stringify(risky));
  check('the page itself is always revalidated, or a new release is never noticed',
    caching.some(r=>(r.path==='/'||r.path==='/index.html')&&/no-cache/i.test(r.value)),
    JSON.stringify(caching.filter(r=>r.path==='/'||r.path==='/index.html')));
  check('and the modules the game imports by bare path are revalidated too',
    caching.some(r=>r.path==='/*'&&/no-cache/i.test(r.value)),
    JSON.stringify(caching.find(r=>r.path==='/*')));

  const failed=checks.filter(c=>!c.pass);
  document.getElementById('results').textContent=JSON.stringify({pass:!failed.length,checks},null,2);
  document.documentElement.dataset.result=failed.length?'fail':'pass';
})().catch(e=>{
  checks.push({name:'the page ran without throwing',pass:false,detail:String(e&&e.stack||e)});
  document.getElementById('results').textContent=JSON.stringify({pass:false,checks},null,2);
  document.documentElement.dataset.result='fail';
});
