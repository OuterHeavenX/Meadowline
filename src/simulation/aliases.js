import { hash2 } from '../core/constants.js';
import { S } from '../core/state.js';
import { SOCIAL_INTERVAL, families, familyMembers } from './families.js';
import { CAREERS, LOOKING } from './careers.js';
import { fameOf } from './fame.js';
import { organisationOf } from './organisations.js';
import { record } from './ledger.js';

/* ============================================================
   ALIASES — the names people end up being called

   Nobody is given a nickname. One sticks, the way one does anywhere: after a
   person has been around long enough, and been enough of something, that the
   street needs a shorter way to refer to them. There is no "assign nickname",
   the module exports no setter, and the player never picks one.

   An alias NEVER replaces anyone. The canonical first name and surname are
   untouched, the citizen's id and their family are untouched, and every system
   that knows a person by name still does. An alias is one extra optional field
   that some people have and most do not.

   WHERE THE NAME COMES FROM — and where it cannot come from

   A nickname is drawn from what the person actually did: the trade they hold
   or held, the place they are associated with, the leaning that stands out in
   them, the sort of premises they work in, or an event they were part of.
   That is the whole input. The surname is NOT an input, and the regression
   reads this file's source to keep it that way - which is the mechanical
   version of the milestone's rule that a colourful street name must never be
   tied to ethnicity, nationality, race or religion. Surnames come from one
   shared neutral pool drawn at founding; aliases come from history; the two
   never meet, so a "Tony Two-Tone" can be any household in the valley and the
   regression checks that across seeds it is.

   Nor is criminality an input to the WORD. The same banks serve a farmer, a
   musician and someone drawn into an organisation - Sunflower, Railway,
   Ropes, Quiet, Lucky. What an organisation changes is only how FAST the name
   travels, which is a fact about gossip, not about the person.

   HOW FAR IT HAS TRAVELLED

   private -> associates -> district -> police -> public

   It only ever moves forward, and only for a real reason: joining an
   organisation, becoming known, being questioned, having your group exposed.
   The Meadowline Post may use an alias only at `public`. The player's Look
   panel, which is a god's-eye view, may see one sooner - that difference is
   the point, and the regression asserts the paper never runs ahead of it.
   ============================================================ */

export const MAX_ALIASES=12;
export const ALIAS_INTERVAL=SOCIAL_INTERVAL*4;
export const VISIBILITY=['private','associates','district','police','public'];
// How long a person must have been someone before a name sticks at all.
const SETTLE_DAYS=6;

/* ---------- the word banks ----------
   Keyed on things the simulation actually holds. Nothing here is a slur, a
   judgement of a person, or a reference to anybody's origins; the worst any
   of them says is that someone is careful, or works at the docks. */
const BY_CAREER={
  farmer:['Sunflower','Fields','Harvest'], millWorker:['Old Mill','Stone','Grist'],
  baker:['Loaves','Flour','Crust'], marketTrader:['Stalls','Coins','Barter'],
  cafeOwner:['Copper','Kettle'], cafeWorker:['Cups','Saucer'],
  teacher:['Chalk','Letters'], doctor:['Doc','Remedy'], nurse:['Kindly','Bandage'],
  policeOfficer:['Whistle','Beat'], firefighter:['Ladder','Ember'],
  railWorker:['Railway','Sleeper','Signal'], dockWorker:['Ropes','Hooks','Anchor'],
  civilServant:['Ledger','Books','Stamps'], keeper:['Lantern','Watch'],
  musician:['Strings','Golden','Encore'], performer:['Ribbons','Curtain'], artist:['Brushes','Colours']
};
const BY_TRAIT={
  caution:['Quiet','Careful'], charisma:['Silver','Sunny'], discipline:['Clockwork','Steady'],
  riskTolerance:['Lucky','Nine Lives'], leadership:['Captain','Major'], ambition:['Sharp','Climber'],
  creativity:['Dreamer','Tinker'], sociability:['Cheer','Neighbourly'], compassion:['Gentle','Kindly'],
  entrepreneurship:['Trader','Deals']
};
const BY_VENUE={cafe:['Coffee','Cups'],market:['Stalls','Barrow'],bakery:['Loaves','Oven'],
  greatLibrary:['Books','Pages'],statue:['Marble'],clockTower:['Clockwork'],lighthouse:['Beacon'],
  school:['Chalk'],clinic:['Remedy'],hospital:['Remedy'],dock:['Ropes'],station:['Railway'],
  farm:['Fields'],mill:['Old Mill'],policeStation:['Whistle'],fireStation:['Ladder'],cityHall:['Stamps']};
const BY_EVENT={full_house:['Encore','Ovation'],questioned:['Nine Lives','Lucky'],
  career_first:['First','Pioneer'],generation_change:['Elder','Old Hand']};

/* ---------- state ---------- */
function ensureSocial(){
  if(!S.social||typeof S.social!=='object') S.social={districts:[],nextId:0,families:[],nextFamilyId:0,firsts:{}};
  if(!Array.isArray(S.social.aliases)) S.social.aliases=[];
  return S.social;
}
export function aliases(){ return ensureSocial().aliases; }
export function aliasOf(familyId,index){ return aliases().find(a=>a.familyId===familyId&&a.index===index)||null; }
export function aliasRank(a){ return Math.max(0,VISIBILITY.indexOf(a?.visibility||'private')); }
/* The name as a given audience would say it. The canonical name always
   survives: an alias is inserted, never substituted. */
export function displayName(f,index,{atLeast='private'}={}){
  const m=familyMembers(f).find(x=>x.index===index);
  if(!m) return '';
  const a=aliasOf(f.id,index);
  if(!a||aliasRank(a)<VISIBILITY.indexOf(atLeast)) return m.name;
  return m.first+' “'+a.alias+'” '+f.surname;
}
/* What the newspaper is allowed to print: the alias only once it is public. */
export function publicName(f,index){ return displayName(f,index,{atLeast:'public'}); }
export function knownAlias(f,index){ const a=aliasOf(f.id,index); return a&&a.visibility==='public'?a.alias:null; }

/* ---------- is this person someone yet? ----------
   A name sticks to somebody the valley has reason to talk about. Each of these
   is a real thing the simulation already tracks. */
function standing(f,m){
  const fame=fameOf(f,m.index);
  const org=organisationOf(f);
  const career=f.careers?.[m.index];
  // By identity, never by printed name - the printed name carries a surname.
  const firstOf=Object.entries(S.social?.firsts||{}).find(([k,v])=>v&&v.familyId===f.id&&v.index===m.index);
  return {
    renown:fame?Math.floor(fame.renown):0,
    inOrganisation:!!org, organisation:org,
    isBoss:!!(org&&org.boss&&org.boss.familyId===f.id&&org.boss.index===m.index),
    career:career&&career!==LOOKING?career:null,
    firstOfTrade:firstOf?firstOf[0]:null,
    generation:f.generation||1
  };
}
function worthOne(st){
  return st.renown>=1||st.inOrganisation||!!st.firstOfTrade||(st.generation>=2&&!!st.career);
}

/* ---------- coining one ----------
   The origin is chosen from what is actually true of the person, in a fixed
   order of preference, and the word from that origin's bank by a seeded pick.
   Note what is absent from every branch: the surname. */
function coin(f,m,st,day){
  const key=f.id*8+m.index;
  const opts=[];
  if(st.firstOfTrade) opts.push(['event',BY_EVENT.career_first]);
  if(st.career&&BY_CAREER[st.career]) opts.push(['career',BY_CAREER[st.career]]);
  if(st.career&&CAREERS[st.career]) for(const t of CAREERS[st.career].at) if(BY_VENUE[t]) opts.push(['habit',BY_VENUE[t]]);
  // A place name pairs with the person - "Lantern Lou", not "Lantern", which
  // would be indistinguishable from the street itself in any sentence.
  if(f.roots) opts.push(['place',[String(f.roots).split(' ')[0]+' '+m.first]]);
  const lead=Object.entries(m.traits).sort((a,b)=>b[1]-a[1])[0];
  if(lead&&BY_TRAIT[lead[0]]) opts.push(['reputation',BY_TRAIT[lead[0]]]);
  if(st.generation>=3) opts.push(['event',BY_EVENT.generation_change]);
  if(!opts.length) return null;
  const [origin,bank]=opts[Math.floor(hash2(key,4093,S.seed>>>0)*opts.length)%opts.length];
  const word=bank[Math.floor(hash2(key,7717,S.seed>>>0)*bank.length)%bank.length];
  // Some names are the word alone, some pair it with the familiar first name -
  // "Ropes", or "Ada Ropes". Seeded, so a person keeps the shape they got.
  // Place names already carry the person; the rest pair about half the time.
  const paired=origin!=='place'&&hash2(key,3313,S.seed>>>0)<0.45;
  return {alias:paired?m.first+' '+word:word,origin,day};
}

/* ---------- how far it has travelled ----------
   Forward only. A nickname that stuck does not un-stick because someone
   changed jobs, which is what makes it history rather than a label. */
/* Returns how far the name has got AND why, because "why" is the only thing
   that makes the state auditable later. Fame fades and organisations break up,
   so a name that went public for a good reason can outlive every trace of that
   reason; storing it at the moment it happened is the difference between a
   record and a guess. */
function reach(f,m,st){
  if(st.renown>=2) return ['public','widely known'];
  if(st.organisation&&st.organisation.exposed) return ['public','their group was exposed'];
  if(st.organisation&&(st.organisation.investigation||st.organisation.pressure>0)) return ['police','the police were looking into their group'];
  if(st.renown>=1) return ['district','becoming known locally'];
  if(st.firstOfTrade) return ['district','the first of a trade in the valley'];
  if(st.organisation&&st.organisation.stage>=3) return ['district','their group became talked about'];
  if(st.inOrganisation) return ['associates','drawn in among associates'];
  return ['private',''];
}

let clock=0;
export function advanceAliases(dt,note){
  clock+=dt;
  if(clock<ALIAS_INTERVAL) return;
  clock=0;
  evaluateAliases(note);
}
export function evaluateAliases(note=()=>{}){
  const social=ensureSocial();
  const list=social.aliases;
  const day=S.day||1;
  if(S.diagnostics) S.diagnostics.aliasEvaluations=(S.diagnostics.aliasEvaluations||0)+1;
  const alive=new Set();
  for(const f of families()){
    for(const m of familyMembers(f)){
      const st=standing(f,m);
      let a=list.find(x=>x.familyId===f.id&&x.index===m.index);
      if(a) alive.add(a);
      if(!a){
        if(!worthOne(st)||list.length>=MAX_ALIASES) continue;
        if(day-(f.founded||1)<SETTLE_DAYS) continue;
        const made=coin(f,m,st,day); if(!made) continue;
        // One primary alias each, and no two people answer to the same name.
        if(list.some(x=>x.alias===made.alias)) continue;
        a={familyId:f.id,index:m.index,alias:made.alias,origin:made.origin,since:day,visibility:'private',reason:''};
        list.push(a); alive.add(a);
        if(S.diagnostics) S.diagnostics.aliasesCoined=(S.diagnostics.aliasesCoined||0)+1;
        record('nickname_adopted',{familyId:f.id,index:m.index,alias:a.alias,origin:a.origin,hidden:true});
      }
      const [want,why]=reach(f,m,st);
      if(VISIBILITY.indexOf(want)<=aliasRank(a)) continue;
      const before=a.visibility;
      a.visibility=want; a.reason=why;
      if(S.diagnostics) S.diagnostics.aliasSpread=(S.diagnostics.aliasSpread||0)+1;
      if(want==='public'&&before!=='public'){
        note(m.name+' is known around '+(f.roots||'Meadowline')+' as “'+a.alias+'”');
        record('nickname_public',{familyId:f.id,index:m.index,name:m.name,alias:a.alias,origin:a.origin,district:f.roots});
      }
    }
  }
  // A person the valley no longer has takes their name with them.
  for(let i=list.length-1;i>=0;i--) if(!alive.has(list[i])) list.splice(i,1);
}

export function aliasSnapshot(){
  const list=aliases();
  return {aliases:list.length,public:list.filter(a=>a.visibility==='public').length,
    byOrigin:list.reduce((o,a)=>(o[a.origin]=(o[a.origin]||0)+1,o),{})};
}

/* ---------- save ---------- */
export function packAliases(){
  return {aliases:aliases().slice(0,MAX_ALIASES).map(a=>({familyId:a.familyId|0,index:a.index|0,
    alias:String(a.alias).slice(0,40),origin:String(a.origin).slice(0,20),
    since:Math.max(1,a.since|0),visibility:a.visibility,reason:String(a.reason||'').slice(0,60)}))};
}
export function restoreAliases(raw){
  const s=ensureSocial(); s.aliases=[]; clock=0;
  if(!raw||typeof raw!=='object') return;
  const known=new Set(families().map(f=>f.id));
  const taken=new Set();
  for(const a of (Array.isArray(raw.aliases)?raw.aliases:[]).slice(0,MAX_ALIASES)){
    if(!a||typeof a!=='object'||typeof a.alias!=='string') continue;
    const familyId=Math.floor(Number(a.familyId)||0),index=Math.floor(Number(a.index)||0);
    // A name must belong to somebody this save actually has.
    if(!known.has(familyId)||index<0||index>=5) continue;
    const alias=a.alias.slice(0,40); if(!alias||taken.has(alias)) continue;
    if(s.aliases.some(x=>x.familyId===familyId&&x.index===index)) continue;
    taken.add(alias);
    s.aliases.push({familyId,index,alias,origin:String(a.origin||'reputation').slice(0,20),
      since:Math.max(1,Math.floor(Number(a.since)||1)),
      visibility:VISIBILITY.includes(a.visibility)?a.visibility:'private',
      reason:String(a.reason||'').slice(0,60)});
  }
}
