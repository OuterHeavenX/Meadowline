import { hash2 } from '../core/constants.js';
import { S } from '../core/state.js';
import { seasonName } from '../world/seasons.js';
import { cityStage } from '../progression/city-growth.js';
import { ledger, publicEvents } from './ledger.js';
import { recomputeDistricts } from './districts.js';
import { FRONT_TYPES, frontsOf, organisations } from './organisations.js';
import { celebrities, venueOf } from './fame.js';
import { CAREERS, LOOKING } from './careers.js';
import { families, familyMembers } from './families.js';
import { knownAlias } from './aliases.js';
import { petitionWant, petitions } from './influence.js';
import { recomputeEmployment } from './employment.js';
import { recomputeServices } from './civic-services.js';
import { recreationSnapshot } from './recreation.js';

/* ============================================================
   THE MEADOWLINE POST — the valley's daily record

   The simulation decides what happened. The Post decides how the public hears
   about it. One issue a day, written from yesterday's ledger and this
   morning's numbers, ranked so a paper has a front page and not ten equally
   loud headlines, and shorter on a quiet day because a quiet day is a real
   thing that happened.

   What the paper may not do is the whole design:

     - It never invents. Every story is a ledger entry or a number read from
       state. If nobody was arrested there is no arrest; if no family moved
       nobody moved.
     - It reports deaths, and only real ones. This rule used to read "there is
       no death mechanic so there are no deaths", and that was true until the
       siege made it false. The rule it was protecting has not changed: a death
       is printed when mortality.js recorded one and never otherwise, the name
       is the person's own, and no number is inflated because a front page
       wanted a bigger one. An obituary the simulation did not earn is exactly
       the invention the whole design forbids.
     - It never leaks. Hidden ledger entries are never read. An organisation
       is "a group" until the world exposes it - a made case, which sets
       `exposed` on the record - and only then may the paper use the name
       investigators use. Fronts, bosses and membership are never printed
       from the simulation's knowledge; what appears is what the police did
       in public, and rumour anchored in what a neighbour could see.
     - Rumour carries a reliability class and the prose follows it: weak
       whispers, plausible reports, strong independent accounts, confirmed
       only when the police confirmed it.
     - Numbers are the city's numbers. Nothing is rounded up for effect.

   Headlines are templates with seeded variation, so two quiet days do not
   read as one. No model writes any of this; if one ever does, it rewrites
   these structured stories and decides nothing.
   ============================================================ */

export const MAX_ARCHIVE=30;
export const RELIABILITY=['weak','plausible','strong','confirmed'];
// Story priority, the brief's order: lower prints first.
const PRIORITY={city:1,safety:2,social:3,business:4,district:5,notable:6,needs:7,gossip:8};

function ensurePost(){
  if(!S.post||typeof S.post!=='object') S.post={issue:null,archive:[],lastIssueDay:0,unread:false};
  if(!Array.isArray(S.post.archive)) S.post.archive=[];
  return S.post;
}
export function currentIssue(){ return ensurePost().issue; }
export function postArchive(){ return ensurePost().archive; }
export function markPostRead(){ ensurePost().unread=false; }
const pick=(day,salt,arr)=>arr[Math.floor(hash2(day*13+salt,911,S.seed>>>0)*arr.length)%arr.length];
const plural=(n,one,many)=>n+' '+(n===1?one:(many||one+'s'));
const cap=s=>s?s[0].toUpperCase()+s.slice(1):s;
const upper=s=>String(s).toUpperCase();
const near=d=>d?' in '+d:'';

/* ---------- what the public knows about a group ----------
   There is no general "name it or don't" helper here on purpose. Each police
   story asks `e.exposed` itself, at the point where it would use a name, and
   says something true and neutral when the answer is no - because a helper
   that is only sometimes called reads like a safeguard while protecting
   nothing. An earlier draft had exactly that, and the regression could not
   tell whether it worked, because nothing called it. `exposedName()` below is
   the one shared guard, and it is used. */

/* ---------- stories from the ledger ---------- */
function stories(day,events){
  const out=[];
  const add=(cls,section,headline,body,extra={})=>out.push({priority:PRIORITY[cls],section,headline,body,...extra});
  const by=t=>events.filter(e=>e.type===t);

  for(const e of by('stage_change')) add('city','lead',upper(e.stage)+' DECLARED','Meadowline has grown into a '+e.stage.toLowerCase()+'. City Hall marked the stage yesterday; what the valley does with it is up to the valley.',{archive:'stage'});

  // Safety: counts are the ledger's, one line each, never dramatised.
  const crimes=by('crime_incident').length, arrests=by('arrest').length, fires=by('fire_incident').length, out_=by('fire_out').length, calls=by('health_incident').length, rec=by('recovery').length, unanswered=by('incident_unanswered');
  if(arrests) add('safety','crime',upper(plural(arrests,'ARREST'))+(crimes?' AFTER '+upper(plural(crimes,'REPORTED INCIDENT')):''),'Police responded to '+plural(crimes,'reported incident')+' yesterday. '+cap(plural(arrests,'suspect was caught','suspects were caught'))+'.',{archive:arrests>=2?'arrests':null});
  else if(crimes) add('safety','crime',upper(plural(crimes,'INCIDENT'))+' REPORTED, NO ARREST','Police were called to '+plural(crimes,'incident')+' yesterday. Nobody was caught by the end of the day.');
  if(fires) add('safety','crime',out_?upper(plural(fires,'FIRE'))+' PUT OUT':upper(plural(fires,'FIRE'))+' REPORTED',out_?'Fire crews attended '+plural(fires,'blaze')+' yesterday and brought '+(fires===1?'it':'them')+' under control. No building was lost.':'Fire was reported '+plural(fires,'time')+' yesterday.',{archive:fires>=2?'fires':null});
  if(calls) add('safety','health',rec?'AMBULANCE CREWS ANSWER '+upper(plural(calls,'CALL')):upper(plural(calls,'MEDICAL CALL'))+' REPORTED',rec?cap(plural(rec,'patient is','patients are'))+' recovering after '+plural(calls,'call')+' yesterday.':cap(plural(calls,'medical call'))+' came in yesterday.');
  for(const e of unanswered) add('needs','crime',upper(e.kind==='crime'?'A REPORTED INCIDENT WENT UNANSWERED':e.kind==='fire'?'FIRE CALL WENT UNANSWERED':'MEDICAL CALL WENT UNANSWERED'),'A '+(e.kind==='crime'?'report':'call')+' yesterday drew no response. Residents nearby are asking whether a '+(e.kind==='crime'?'police station':e.kind==='fire'?'fire station':'clinic')+' within reach would have made the difference.');

  // The police, in public. Names only after the world exposed them.
  /* ---------- the siege ----------
     The lead on any night it happened: this is the largest thing that can
     happen to the valley and it outranks everything except itself. The numbers
     are the night's own — what the towers killed, what was lost, what was
     damaged — and a night nobody was hurt in says so plainly rather than
     reaching for drama. */
  for(const e of by('siege_dawn')){
    const lost=e.lost|0, killed=e.killed|0, damaged=e.damaged|0, surge=!!e.surge;
    /* They come every night now, so a night the town held is not the front
       page — it is a line in the paper, the way a quiet shift is. What earns
       the lead is a night that cost something, or one of the bad ones. */
    const notable=lost>0||damaged>0||surge;
    const head=lost?upper(plural(lost,'LIFE','LIVES')+' LOST AS THE VALLEY IS ATTACKED IN THE NIGHT')
      :damaged?'MEADOWLINE ATTACKED IN THE NIGHT, NOBODY HURT'
      :surge?'THE VALLEY HOLDS THROUGH A DARK NIGHT'
      :'ANOTHER NIGHT, ANOTHER WATCH KEPT';
    let body=(surge?'It was one of the bad ones. ':'Something came out of the woods again after dark. ');
    body+=killed?cap(plural(killed,'was brought down','were brought down'))+' before dawn. ':'Nothing was brought down before dawn. ';
    if(lost) body+=cap(plural(lost,'person was','people were'))+' lost. ';
    if(damaged) body+=cap(plural(damaged,'home was','homes were'))+' damaged. ';
    if(!lost&&!damaged) body+='No home was reached and nobody was hurt. ';
    add(notable?'city':'needs','siege',head,body.trim(),{archive:lost?'siege':null});
  }
  /* Each of the dead, by name, once. The paper does not editorialise about a
     death and does not print a number where a name belongs. */
  for(const e of by('death')){
    if(!e.name) continue;
    // Only a name the street had already made public, the same rule every
    // other story here follows about aliases.
    const known=(e.alias&&e.aliasPublic)?' \u2014 known to some as \u201c'+e.alias+'\u201d \u2014 ':' ';
    add('safety','obituary',upper(e.name+' HAS DIED'),
      e.name+known+'died on '+(e.district||'Meadowline')+'. '
      +(e.survivors?cap(plural(e.survivors,'member of the household is','members of the household are'))+' left at the address.'
        :'The household is empty; nobody is left at the address.'),
      {archive:'obituary'});
  }
  for(const e of by('case_made')) add('safety','crime',e.firstExposure?upper('POLICE NAME '+e.name.toUpperCase()+' AFTER '+e.district.toUpperCase()+' OPERATION'):upper('POLICE MOVE AGAIN ON THE '+e.name),(e.firstExposure?'Investigators for the first time put a name to the group they have been looking into around '+e.district+', calling it the '+e.name+'. ':'Police moved again yesterday on the '+e.name+' around '+e.district+'. ')+'Officers described the operation as a success and declined to say more.',{archive:'exposed'});
  for(const e of by('front_closed')) add('safety','crime',upper('POLICE CLOSE '+e.kind.toUpperCase()+' ON '+e.district.toUpperCase()),'Police closed a '+e.kind+' on '+e.district+' yesterday, saying it had been used by the group investigators call the '+e.name+'. The business itself was not charged with anything.',{archive:'front'});
  for(const e of by('questioned')){
    const alias=aliasFor(e.familyId,e.index);
    add('safety','crime',alias?upper('“'+alias+'” QUESTIONED BY POLICE'):upper(e.name)+' QUESTIONED BY POLICE',
      byName(e.familyId,e.index,e.name)+' of '+(e.district||'Meadowline')+' was taken in for questioning yesterday in connection with '+(exposedName(e.orgId)?'the '+exposedName(e.orgId):'an inquiry around '+e.district)+'. Police have not announced any charges.',{archive:'questioned'});
  }
  for(const e of by('raid')) if(!by('front_closed').length&&!by('questioned').length) add('safety','crime',upper('POLICE SEARCH '+(e.kind||'PREMISES').toUpperCase()+' ON '+e.district.toUpperCase()),'Officers searched a '+(e.kind||'property')+' on '+e.district+' yesterday. Police declined to say what they were looking for'+(e.exposed?', beyond confirming it concerned the '+e.name:'')+'.');
  for(const e of by('investigation_opened')) add('safety','crime','POLICE LOOKING INTO '+upper(e.district),'Police confirmed yesterday that officers have opened an inquiry into activity around '+e.district+'. They would not say what prompted it'+(e.exposed?', though it is understood to concern the '+e.name:', and have not confirmed the existence of any larger organisation')+'.');
  for(const e of by('case_dropped')) add('safety','crime','INQUIRY AROUND '+upper(e.district)+' ENDS WITHOUT CHARGES','Police have ended an inquiry around '+e.district+' without bringing charges. '+(e.exposed?'The group investigators call the '+e.name+' remains, they said, of interest.':'Officers said the matter was closed for now.'));
  for(const e of by('org_collapsed')) if(!e.hidden) add('safety','crime',upper('THE '+e.name+' IS FINISHED, POLICE SAY'),'Police say the group they had called the '+e.name+' has broken up'+(e.afterPolice?' following their operations around '+e.district:'')+'. Residents of '+e.district+' say the streets have been quieter.',{archive:'collapse'});

  // Families: arrivals, departures, moves, generations.
  for(const e of by('family_arrival')){ const f=families().find(x=>x.id===e.familyId); const trades=f?Object.values(f.careers||{}).filter(c=>c&&c!==LOOKING).map(c=>CAREERS[c]?.label).filter(Boolean):[];
    add('social','arrivals','NEW FAMILY SETTLES'+upper(near(e.district)),'The '+e.surname+' family has made its home'+near(e.district)+'. '+(trades.length?'Neighbours say the household is already at work: '+trades.slice(0,2).join(' and ')+'.':'Neighbours say the household is settling in.'),{archive:'arrival'}); }
  for(const e of by('family_departure')) add('social','departures','THE '+upper(e.surname)+' FAMILY LEAVES MEADOWLINE','After '+plural(e.days,'day')+near(e.district)+', the '+e.surname+' family has left the valley.'+(e.reason==='home gone'?' Their home is gone.':''),{archive:'departure'});
  for(const e of by('family_move')) add('social','moves','THE '+upper(e.surname)+' FAMILY MOVES TO '+upper(e.to||'A NEW STREET'),'After '+(e.generation>1?plural(e.generation,'generation'):'a spell')+(e.from?' in '+e.from:'')+', the '+e.surname+' family has relocated to '+(e.to||'a new part of town')+(e.tier>=3?', into an established home':e.tier===2?', into a town home':'')+'.',{archive:'move'});
  for(const e of by('generation_change')) add('notable','community','A NEW GENERATION FOR THE '+upper(e.surname)+' FAMILY','The '+e.surname+' family'+near(e.district)+' is now in its '+ordinal(e.generation)+' generation in the valley.');
  for(const e of by('standing_change')) add('notable','community','THE '+upper(e.surname)+' HOUSEHOLD '+(e.up?'DOING WELL':'FEELING THE PINCH'),'Neighbours'+near(e.district)+' say the '+e.surname+' family is '+(e.up?'doing better':'finding things harder')+' than a season ago.');
  /* A name surfacing publicly is news of a sort, and reads differently
     depending on why the valley started using it. It is never the paper that
     decides someone has a nickname - by the time this prints, the street has
     been using it long enough that the police know it too. */
  for(const e of by('nickname_public')) add('notable','community',upper('“'+e.alias+'”')+' IS WHAT THEY CALL '+upper(e.name.split(' ')[0])+' NOW',
    e.name+(e.district?' of '+e.district:'')+' has been going by “'+e.alias+'” for a while now, and the name has stuck'+
    ({career:' — it comes from the work',place:' — it comes from the street they are from',reputation:' — it comes from how they are',habit:' — it comes from where they are always found',event:' — it comes from something that happened'})[e.origin]+'.',{archive:'nickname'});
  for(const e of by('career_first')) add('notable','jobs','MEADOWLINE GETS ITS FIRST '+upper(e.label),e.name+near(e.district)+' has become the valley\'s first '+e.label+'.');

  // Business and services.
  for(const e of by('building_opened')){
    if(e.cls==='business') add('business','business','NEW '+upper(e.name)+' OPENS'+upper(near(e.district)),'A new '+e.name.toLowerCase()+' has opened'+near(e.district)+(e.jobs?', bringing '+plural(e.jobs,'job')+' to the street':'')+'.',{archive:'business'});
    else if(e.cls==='service') add('business','civic','NEW '+upper(e.name)+upper(near(e.district)),'A '+e.name.toLowerCase()+' opened'+near(e.district)+' yesterday'+(e.jobs?', with '+plural(e.jobs,'post'):'')+'.',{archive:'civic'});
    else if(e.cls==='amenity') add('notable','community',upper(e.name)+' OPENS'+upper(near(e.district)),'Residents'+near(e.district)+' have a new '+e.name.toLowerCase()+'.');
    else if(e.cls==='landmark') add('city','lead',upper(e.name)+' RISES'+upper(near(e.district)),'The valley has a new landmark: a '+e.name.toLowerCase()+near(e.district)+'.',{archive:'landmark'});
  }
  for(const e of by('building_closed')) if(e.cls==='business'||e.cls==='service') add('business','business',upper(e.name)+' CLOSES'+upper(near(e.district)),'The '+e.name.toLowerCase()+near(e.district)+' has closed'+(e.jobs?', taking '+plural(e.jobs,'job')+' with it':'')+'.',{archive:'closure'});
  for(const e of by('building_moved')) add('business','business',upper(e.name)+' MOVES TO '+upper(e.to||'A NEW SITE'),'The '+e.name.toLowerCase()+(e.from?' from '+e.from:'')+' has reopened'+near(e.to)+'.');
  const upgrades=by('home_upgraded'); if(upgrades.length) add('notable','housing',upgrades.length===1?'A HOME GROWS INTO A '+upper(upgrades[0].tier):upper(plural(upgrades.length,'HOME'))+' GROW',upgrades.length===1?'A home has grown into a '+upgrades[0].tier.toLowerCase()+'.':plural(upgrades.length,'household')+' saw their homes grow yesterday.');

  // Districts and culture.
  /* A neighbourhood asking for something is the closest the valley has to
     politics, and it is reported the same way as everything else: as a thing
     the city did, with the household that is being listened to named. */
  for(const e of by('petition_raised')) add('needs','district','RESIDENTS OF '+upper(e.district)+' ASK FOR '+upper(e.want.replace(/^an? /,'')),
    'Households in '+e.district+' have begun asking the town for '+e.want+'. The '+e.surname+' family, long settled there, is among those pressing the case. City Hall has made no commitment.',{archive:'petition'});
  for(const e of by('petition_met')) add('social','good',upper(e.district)+' GETS '+upper(e.want.replace(/^an? /,'')),
    e.district+' has got '+e.want+', '+plural(e.days,'day')+' after residents there started asking for it.',{archive:'petition-met'});
  for(const e of by('district_identity')) add('district','district',upper(e.district)+' BECOMING KNOWN AS '+upper(e.labels.join(' AND ')),e.district+' is now spoken of as '+e.labels.map(l=>l.toLowerCase()).join(' and ')+' - a description of what stands there, not a decision anyone took.',{archive:'district'});
  for(const e of by('renown_rise')) add(e.stage>=3?'social':'notable','good',e.stage>=3?(e.first?'LOCAL '+upper(e.label)+' '+upper(e.name)+' BECOMES MEADOWLINE\'S FIRST WIDELY KNOWN PERFORMER':upper(e.name)+' KNOWN ACROSS THE VALLEY'):e.stage===2?'LOCAL '+upper(e.label)+' EARNS WIDER NOTICE':upper(e.name)+' GETTING KNOWN'+upper(near(e.district)),e.stage>=3?e.name+', the '+e.label+near(e.district)+', is now a name the whole valley knows.':e.stage===2?e.name+near(e.district)+' has become locally famous as a '+e.label+'.':e.name+' is getting a reputation'+near(e.district)+' as a '+e.label+'.',{archive:e.stage>=2?'fame':null});
  for(const e of by('full_house')) add('notable','festival',upper(e.name)+' PLAYS TO A FULL HOUSE',e.name+' played to a full house at '+e.festival+'.');
  for(const e of by('renown_faded')) add('notable','community',upper(e.name)+' OUT OF THE LIMELIGHT',e.name+near(e.district)+' is not talked about the way they were.');
  for(const e of by('festival')) add('social','festival',upper(e.name)+' ACROSS THE VALLEY','The valley was dressed for '+e.name+' yesterday, and every till took a little more.',{archive:'festival'});
  return out;
}
/* How the paper names somebody. The canonical name always, plus the alias
   only once it is genuinely public - the newspaper is the last audience to
   learn a nickname, never the first, and `knownAlias` returns nothing until
   the alias has actually travelled that far. */
function byName(familyId,index,fallback){
  const f=families().find(x=>x.id===familyId); if(!f) return fallback;
  const m=familyMembers(f).find(x=>x.index===index); if(!m) return fallback;
  const alias=knownAlias(f,index);
  return alias?m.name+' — known to some as “'+alias+'” —':m.name;
}
function aliasFor(familyId,index){ const f=families().find(x=>x.id===familyId); return f?knownAlias(f,index):null; }
function exposedName(orgId){ const o=organisations().find(x=>x.id===orgId); return o&&o.exposed?o.name:null; }
function ordinal(n){ return n+(['th','st','nd','rd'][(n%100>10&&n%100<14)?0:(n%10<4?n%10:0)]); }

/* ---------- this morning's numbers ---------- */
function brief(day){
  const emp=recomputeEmployment(); recomputeServices();
  const edu=S.services?.education?.metrics||{}, rec=recreationSnapshot();
  const yesterday=S.history[S.history.length-2], today=S.history[S.history.length-1];
  const events=publicEvents(day);
  return {population:S.pop||0,populationChange:yesterday&&today?today.pop-yesterday.pop:0,homes:S.ctx?.houses?.length||0,
    workers:emp.workers,jobs:emp.jobs,unemployed:emp.unemployed,
    incidents:events.filter(e=>/_incident$/.test(e.type)).length,arrests:events.filter(e=>e.type==='arrest').length,fires:events.filter(e=>e.type==='fire_incident').length,medical:events.filter(e=>e.type==='health_incident').length,
    schoolDemand:edu.demand||0,schoolCapacity:edu.capacity||0,recreationUnderserved:rec.underserved||0,
    families:families().length,stage:cityStage().name,season:seasonName(),weather:S.wx?.amt>0.3?(S.wx.k==='snow'?'Snow':'Rain'):'Clear'};
}

/* ---------- what people are saying, and why ----------
   A quote is only printed when the condition it complains about is really
   there, and attributed to a district that really has it. */
function readers(day,b){
  const out=[]; const districts=recomputeDistricts();
  /* A district that has actually raised a petition speaks first, and speaks
     as a district rather than as one grumbling resident. */
  for(const p of petitions().slice(0,2)) out.push({text:'We have been asking for '+petitionWant(p)+' for a while now.',who:'Resident, '+p.district,need:p.need});
  const where=test=>{ const d=districts.find(x=>test(x.measured)); return d?d.name:null; };
  if(b.schoolCapacity>0&&b.schoolDemand>b.schoolCapacity*0.95){ const d=where(m=>m.homes>=6&&m.schools===0)||where(m=>m.homes>=6); out.push({text:pick(day,1,['The school is packed. We really need more room.','Every classroom is full by nine. Another school would not go amiss.']),who:'Parent'+(d?', '+d:''),need:'school'}); }
  if(b.recreationUnderserved>0){ const d=where(m=>m.homes>=4&&m.recreationReach===0); if(d) out.push({text:pick(day,2,['There isn\'t a park anywhere near us.','The children have nowhere to play round here.']),who:'Resident, '+d,need:'recreation'}); }
  if(b.workers>=10&&b.unemployed>b.workers*0.25){ const d=where(m=>m.homes>=6&&m.jobs<m.workers*0.6); out.push({text:pick(day,3,['Work has been hard to find lately.','Half the street is looking for work.']),who:'Resident'+(d?', '+d:''),need:'jobs'}); }
  if(b.homes>0&&(S.pop||0)>=b.homes*4.6){ out.push({text:pick(day,4,['Every house on our street is full. Where are people meant to go?','There is not a room to let anywhere.']),who:'Resident',need:'housing'}); }
  const health=S.municipal?.healthcare||{}; if((health.patients||0)>0&&(health.capacity||0)===0) out.push({text:pick(day,5,['There is no clinic within reach of us.','When someone falls ill there is nowhere to take them.']),who:'Resident',need:'healthcare'});
  const safety=S.municipal?.safety||{}; if((safety.pressure||0)>=60&&(safety.capacity||0)===0) out.push({text:pick(day,6,['We have never once seen a police car on this street.','People lock up early round here.']),who:'Resident',need:'safety'});
  return out.slice(0,3);
}

/* ---------- whispers ----------
   Anchored in something real that a neighbour could see, and never more sure
   than the evidence. Nothing here names a group, a person or a business the
   world has not exposed. */
export function whispers(day){
  const out=[];
  for(const o of organisations()){
    if(o.exposed) continue;                      // confirmed: that is news, not a whisper
    if(o.stage<3) continue;                      // nothing observable yet
    const fronts=frontsOf(o);
    if(o.investigation) out.push({reliability:'strong',text:pick(day,o.id*7+1,['Several residents independently reported police attention around '+o.roots+' this week.','More than one reader has written in about officers asking questions around '+o.roots+'.']),district:o.roots});
    else if(fronts.length) out.push({reliability:'plausible',text:pick(day,o.id*7+2,['People say the same faces are outside a '+FRONT_TYPES[fronts[0].type]+' on '+o.roots+' most evenings.','Readers on '+o.roots+' report unusual late traffic around a '+FRONT_TYPES[fronts[0].type]+'.']),district:o.roots});
    else out.push({reliability:'weak',text:pick(day,o.id*7+3,['Some residents have begun whispering about comings and goings around '+o.roots+' after dark.','There is talk on '+o.roots+' of people meeting who do not seem to live there.']),district:o.roots});
  }
  for(const c of celebrities()){
    const venue=venueOf(c.family,c.index); if(!venue) continue;
    out.push({reliability:'plausible',text:pick(day,c.family.id*3+c.index,['Apparently one of Meadowline\'s '+c.label+'s has been seen around a '+(FRONT_TYPES[venue.type]||venue.type)+(c.roots?' on '+c.roots:'')+' most mornings.','Regulars at a '+(FRONT_TYPES[venue.type]||venue.type)+(c.roots?' on '+c.roots:'')+' say they know exactly who plays there.']),district:c.roots});
  }
  return out.slice(0,3);
}
const RUMOUR_LEAD={weak:'Some say',plausible:'People say',strong:'Several residents report',confirmed:'Police confirmed'};
export function rumourLead(r){ return RUMOUR_LEAD[r]||'Some say'; }

/* ---------- the issue ---------- */
/* Obituaries come directly after the front page, before anything else the
   valley did that day. A section a story can be filed under but that the paper
   has no heading for is dropped on the floor at compose time, which is how the
   first draft of the siege printed nothing at all. */
const SECTIONS=[['lead','Front page'],['siege','The night'],['obituary','Obituaries'],['crime','Crime & Safety'],['health','Health'],['arrivals','Arrivals'],['departures','Departures'],['moves','Neighbourhood moves'],['business','Business'],['civic','Civic'],['jobs','Jobs'],['housing','Housing'],['district','District watch'],['community','Community'],['festival','Festivals'],['good','Good news']];
export function composeIssue(day){
  const events=publicEvents(day);
  const list=stories(day,events).sort((a,b)=>a.priority-b.priority);
  const b=brief(day);
  let lead=list.find(s=>s.priority<=5)||null;
  const rest=list.filter(s=>s!==lead);
  const quiet=!lead;
  if(quiet){
    const bits=[];
    if(b.incidents===0) bits.push('No incidents were reported');
    else bits.push(plural(b.incidents,'incident was','incidents were')+' reported and '+(b.arrests?plural(b.arrests,'arrest was','arrests were')+' made':'no arrests were made'));
    const minor=rest.slice(0,2).map(s=>s.body.replace(/\.$/,'')); if(minor.length) bits.push(...minor.map(t=>t[0].toLowerCase()+t.slice(1)));
    lead={priority:9,section:'lead',headline:pick(day,77,['A QUIET DAY ACROSS MEADOWLINE','NOTHING MUCH HAPPENED, AND THAT SUITED EVERYONE','A CALM DAY IN THE VALLEY']),body:bits.join('. ')+'.',quiet:true};
  }
  const sections=[];
  for(const [id,title] of SECTIONS){ const items=rest.filter(s=>s.section===id); if(items.length) sections.push({id,title,items:items.map(({headline,body})=>({headline,body}))}); }
  return {day,masthead:'THE MEADOWLINE POST',strap:'The Valley\'s Daily Record',dateline:'Day '+day+' · '+b.season+' · '+b.stage,
    lead:{headline:lead.headline,body:lead.body,quiet:!!lead.quiet},sections,brief:b,readers:readers(day,b),whispers:whispers(day),
    archiveKinds:list.filter(s=>s.archive).map(s=>({headline:s.headline,kind:s.archive}))};
}

/* One issue a day, at the turn of the day, about the day that just ended. */
export function publishIssue(){
  const post=ensurePost();
  const day=(S.day||1)-1;
  if(day<1||post.lastIssueDay>=day) return false;
  const issue=composeIssue(day);
  post.issue=issue; post.lastIssueDay=day; post.unread=true;
  // What is worth remembering: the lead if it was not a quiet one, and the
  // stories that mark a change in the valley. Bounded.
  const keep=[];
  if(!issue.lead.quiet) keep.push({day,headline:issue.lead.headline,kind:'lead'});
  for(const a of issue.archiveKinds) if(!keep.some(k=>k.headline===a.headline)) keep.push({day,headline:a.headline,kind:a.kind});
  post.archive.push(...keep.slice(0,4));
  while(post.archive.length>MAX_ARCHIVE) post.archive.shift();
  // Yesterday is printed; the ledger can let it go.
  const list=ledger(); for(let i=list.length-1;i>=0;i--) if(list[i].day<=day) list.splice(i,1);
  if(S.diagnostics){ S.diagnostics.postIssues=(S.diagnostics.postIssues||0)+1; S.diagnostics.postArchive=post.archive.length; }
  return true;
}
export function postSnapshot(){ const p=ensurePost(); return {issues:S.diagnostics?.postIssues||0,archive:p.archive.length,lastIssueDay:p.lastIssueDay,unread:!!p.unread}; }

/* ---------- save ---------- */
const clean=s=>String(s??'').slice(0,240);
export function packPost(){
  const p=ensurePost();
  const i=p.issue;
  return {lastIssueDay:p.lastIssueDay|0,unread:!!p.unread,
    archive:p.archive.slice(-MAX_ARCHIVE).map(a=>({day:Math.max(1,a.day|0),headline:clean(a.headline).slice(0,120),kind:clean(a.kind).slice(0,20)})),
    issue:i?{day:i.day|0,dateline:clean(i.dateline),lead:{headline:clean(i.lead.headline),body:clean(i.lead.body).slice(0,600),quiet:!!i.lead.quiet},
      sections:i.sections.slice(0,14).map(s=>({id:clean(s.id).slice(0,20),title:clean(s.title).slice(0,40),items:s.items.slice(0,8).map(x=>({headline:clean(x.headline).slice(0,120),body:clean(x.body).slice(0,600)}))})),
      brief:i.brief,readers:i.readers.slice(0,3).map(r=>({text:clean(r.text),who:clean(r.who).slice(0,60)})),whispers:i.whispers.slice(0,3).map(w=>({reliability:RELIABILITY.includes(w.reliability)?w.reliability:'weak',text:clean(w.text)}))}:null};
}
export function restorePost(raw){
  const p=ensurePost(); p.issue=null; p.archive=[]; p.lastIssueDay=0; p.unread=false;
  if(!raw||typeof raw!=='object') return;
  p.lastIssueDay=Math.max(0,Math.floor(Number(raw.lastIssueDay)||0)); p.unread=!!raw.unread;
  for(const a of (Array.isArray(raw.archive)?raw.archive:[]).slice(-MAX_ARCHIVE)) if(a&&typeof a.headline==='string') p.archive.push({day:Math.max(1,Math.floor(Number(a.day)||1)),headline:a.headline.slice(0,120),kind:String(a.kind||'lead').slice(0,20)});
  const i=raw.issue;
  if(i&&typeof i==='object'&&i.lead&&typeof i.lead.headline==='string'){
    p.issue={day:Math.max(1,Math.floor(Number(i.day)||1)),masthead:'THE MEADOWLINE POST',strap:'The Valley\'s Daily Record',dateline:clean(i.dateline),
      lead:{headline:clean(i.lead.headline),body:clean(i.lead.body).slice(0,600),quiet:!!i.lead.quiet},
      sections:(Array.isArray(i.sections)?i.sections:[]).slice(0,14).filter(s=>s&&Array.isArray(s.items)).map(s=>({id:clean(s.id).slice(0,20),title:clean(s.title).slice(0,40),items:s.items.slice(0,8).filter(x=>x&&typeof x.headline==='string').map(x=>({headline:clean(x.headline).slice(0,120),body:clean(x.body).slice(0,600)}))})),
      brief:i.brief&&typeof i.brief==='object'?i.brief:{},readers:(Array.isArray(i.readers)?i.readers:[]).slice(0,3).filter(r=>r&&typeof r.text==='string').map(r=>({text:clean(r.text),who:clean(r.who).slice(0,60)})),
      whispers:(Array.isArray(i.whispers)?i.whispers:[]).slice(0,3).filter(w=>w&&typeof w.text==='string').map(w=>({reliability:RELIABILITY.includes(w.reliability)?w.reliability:'weak',text:clean(w.text)})),archiveKinds:[]};
  }
}
