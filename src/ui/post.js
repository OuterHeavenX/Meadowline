import { S } from '../core/state.js';
import { currentIssue, markPostRead, postArchive, rumourLead } from '../simulation/post.js';
import { elLook, elLookBody, fillLook} from './panels.js';

/* ---------- reading the paper ----------
   The Post is a thing you pick up, not a thing that stops the game. A chip in
   the corner carries a dot while an edition is unread; tapping it lays the
   paper over the valley in the same panel City Hall uses, and closing it is
   the same close. Everything on the page comes from the issue the simulation
   wrote; nothing here decides what is news. */
const chip=document.getElementById('b-post');
let open=false;
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

export function paintPostChip(){
  if(!chip) return;
  chip.classList.toggle('unread',!!S.post?.unread&&!!currentIssue());
  chip.classList.toggle('off',!currentIssue());
}
export function isPostOpen(){ return open; }
export function closePost(){ open=false; elLook.classList.remove('post-open'); }

function section(s){
  return '<section class="post-section"><h4>'+esc(s.title)+'</h4>'+s.items.map(i=>'<article><h5>'+esc(i.headline)+'</h5><p>'+esc(i.body)+'</p></article>').join('')+'</section>';
}
function briefRow(b){
  const rows=[['Population',b.population+(b.populationChange?' ('+(b.populationChange>0?'+':'')+b.populationChange+')':'')],['Homes',b.homes],['In work',b.workers-b.unemployed+' of '+b.workers],['Incidents',b.incidents+(b.arrests?' · '+b.arrests+' caught':'')],['Weather',b.weather]];
  return '<section class="post-brief"><h4>City brief</h4><dl>'+rows.map(([k,v])=>'<dt>'+k+'</dt><dd>'+esc(v)+'</dd>').join('')+'</dl></section>';
}
export function issueHtml(issue){
  if(!issue) return '<div class="post-paper"><header class="post-masthead"><h3>THE MEADOWLINE POST</h3><small>The Valley\'s Daily Record</small></header><p class="post-body">The first edition goes to print at the end of the first day.</p></div>';
  const archive=postArchive().slice(-8).reverse().filter(a=>a.day!==issue.day);
  return '<div class="post-paper">'+
    '<header class="post-masthead"><h3>'+esc(issue.masthead)+'</h3><small>'+esc(issue.strap)+'</small><div class="post-dateline">'+esc(issue.dateline)+'</div></header>'+
    '<article class="post-lead"><h2>'+esc(issue.lead.headline)+'</h2><p>'+esc(issue.lead.body)+'</p></article>'+
    '<div class="post-columns">'+briefRow(issue.brief)+issue.sections.map(section).join('')+
    (issue.readers.length?'<section class="post-section post-readers"><h4>Around town</h4>'+issue.readers.map(r=>'<blockquote>“'+esc(r.text)+'”<footer>— '+esc(r.who)+'</footer></blockquote>').join('')+'</section>':'')+
    (issue.whispers.length?'<section class="post-section post-whispers"><h4>Whispers around town</h4>'+issue.whispers.map(w=>'<p><em>'+esc(rumourLead(w.reliability))+'.</em> '+esc(w.text)+'</p>').join('')+'</section>':'')+
    (archive.length?'<section class="post-section post-archive"><h4>From the archive</h4><ul>'+archive.map(a=>'<li><em>Day '+a.day+'</em> '+esc(a.headline)+'</li>').join('')+'</ul></section>':'')+
    '</div></div>';
}
export function openPost(){
  const issue=currentIssue();
  open=true; S.pick=null;
  elLook.classList.remove('cityhall-open'); elLook.classList.add('show','post-open');
  fillLook(issueHtml(issue));
  markPostRead(); paintPostChip();
  if(S.diagnostics) S.diagnostics.postOpens=(S.diagnostics.postOpens||0)+1;
}
export function togglePost(){
  if(open&&elLook.classList.contains('show')){ elLook.classList.remove('show'); closePost(); return false; }
  openPost(); return true;
}
chip?.addEventListener('click',togglePost);
