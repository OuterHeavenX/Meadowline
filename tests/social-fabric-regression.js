import * as districts from '../src/simulation/districts.js';
import { IDENTITIES, MAX_DISTRICTS, districtAt, districtIdentityCandidates, districtSnapshot, evaluateDistrictIdentities,
  invalidateDistricts, isCriminalIdentity, packSocial, recomputeDistricts, restoreSocial } from '../src/simulation/districts.js';
import { place } from '../src/buildings/buildings.js';
import { S } from '../src/core/state.js';
import { resetProgression } from '../src/progression/city-growth.js';
import { recompute } from '../src/simulation/mood.js';
import { describe } from '../src/ui/panels.js';
import { genWorld } from '../src/world/map.js';
import { idx } from '../src/world/tiles.js';

const checks=[];
const check=(name,value,detail)=>checks.push({name,pass:Boolean(value),...(detail===undefined?{}:{detail})});

function blank(seed=20260907){
  genWorld(seed); resetProgression('legacy-open'); S.cityProgress.stage=4; S.coins=9e6;
  S.citizens=[]; S.incidents=[]; S.social={districts:[],nextId:0};
  invalidateDistricts();
}
function clear(x0,y0,w,h){
  for(let y=y0;y<y0+h;y++) for(let x=x0;x<x0+w;x++){ const i=idx(x,y); S.terr[i]=0; S.natTree[i]=0; S.grid[i]=null; }
}
function homes(x0,y0,n,step,fill={}){
  for(let k=0;k<n;k++){
    const x=x0+k*step;
    if(!place('house',x,y0)) continue;
    const h=S.grid[idx(x,y0)];
    h.pop=fill.pop??4; h.mood=fill.mood??70;
    Object.assign(h.state,{desirability:fill.desirability??50,education:fill.education??30,
      housingTier:fill.tier??1,recreationSatisfaction:fill.rec??0});
  }
}
function settle(){ recompute(); invalidateDistricts(); evaluateDistrictIdentities(); }
const labels=d=>(d.identities||[]).map(i=>i.id);

/* ---------- the absolute rule ----------
   If the player can name a district, classify one, or make a citizen anything,
   the milestone has failed. This checks the exported surface rather than the
   UI, so a convenience setter added later fails here before it can reach a
   button. */
{
  const setters=Object.keys(districts).filter(k=>/^(set|assign|make|create|force|declare)/i.test(k));
  check('the districts module exports no way to assign an outcome',setters.length===0,setters.join(',')||'none');
  const identityIds=IDENTITIES.map(i=>i.id);
  check('every identity needs at least two independent conditions',
    IDENTITIES.every(i=>i.need>=2),IDENTITIES.filter(i=>i.need<2).map(i=>i.id).join(','));
  check('the identity list is unique',new Set(identityIds).size===identityIds.length);
}

/* ---------- districts form from what was built ---------- */
{
  blank();
  settle();
  check('an empty valley has no districts',recomputeDistricts().length===0);
  clear(40,40,24,10);
  for(let x=41;x<62;x++) place('road',x,42);
  homes(41,41,10,2,{});
  settle();
  const list=recomputeDistricts();
  check('building a street of homes creates a district',list.length===1,list.length);
  check('the district is named',!!list[0]?.name&&list[0].name.length>2,list[0]?.name);
  check('a tile inside it resolves to it',districtAt(45,41)?.name===list[0].name);
  check('a tile far outside it resolves to nothing',districtAt(4,4)===null);
  check('the Look card names the neighbourhood',describe(45,41).includes(list[0].name));
}

/* ---------- water and rail divide a neighbourhood; distance does too ---------- */
{
  blank();
  clear(40,40,20,8); clear(76,40,20,8);
  for(let x=41;x<58;x++) place('road',x,42);
  for(let x=77;x<94;x++) place('road',x,42);
  homes(41,41,8,2,{}); homes(77,41,8,2,{});
  settle();
  check('two separated clusters are two districts',recomputeDistricts().length===2,recomputeDistricts().length);
  const names=recomputeDistricts().map(d=>d.name);
  check('separate districts get separate names',new Set(names).size===2,names.join(' / '));
}

/* ---------- identity is descriptive, and reversible ---------- */
{
  blank();
  clear(40,40,26,14);
  for(let x=41;x<62;x++) place('road',x,42);
  for(let y=44;y<52;y+=3) for(let x=41;x<58;x+=3) place('farm',x,y);
  place('mill',44,53); place('mill',50,53);
  settle();
  const farmland=recomputeDistricts()[0];
  check('a belt of farms reads as agricultural',labels(farmland).includes('agricultural'),labels(farmland).join(','));

  // Clear the farms away and the label must go with them.
  for(let y=44;y<52;y+=3) for(let x=41;x<58;x+=3){ const i=idx(x,y); if(S.grid[i]?.type==='farm') S.grid[i]=null; }
  homes(41,41,10,2,{});
  settle();
  const after=recomputeDistricts()[0];
  check('identity is lost when the conditions are',after&&!labels(after).includes('agricultural'),labels(after||{}).join(','));
  check('the neighbourhood keeps its name through the change',after?.name===farmland.name,farmland.name+' -> '+after?.name);
}

/* ---------- the anti-stereotype rules, as mechanics ----------
   PART 27 is mandatory, so the rules that matter are the ones that say what
   cannot happen. Hardship is modelled here as hard as the fixture can make it:
   crowded, poor, unschooled, no recreation, no work, with unresolved crime
   reported in the street. It must still never produce a criminal identity,
   because criminal identities report an organisation and there is none. */
{
  blank();
  clear(40,40,20,8);
  for(let x=41;x<58;x++) place('road',x,42);
  homes(41,41,14,1,{pop:6,mood:24,desirability:8,education:2,tier:1,rec:0});
  S.incidents=[{id:1,kind:'crime',resolved:false,target:{x:45,y:41},age:0,status:'REPORTED'},
               {id:2,kind:'crime',resolved:false,target:{x:48,y:41},age:0,status:'REPORTED'}];
  settle();
  const poor=recomputeDistricts()[0];
  check('a poor, crowded, underserved district still forms',!!poor);
  const qualified=districtIdentityCandidates(poor.measured).map(i=>i.id);
  check('hardship alone never produces a criminal identity',
    !qualified.some(isCriminalIdentity),qualified.join(','));
  check('and none is even hidden behind the two-label cap',
    !labels(poor).some(isCriminalIdentity),labels(poor).join(','));
  check('no district anywhere is criminal without an organisation',districtSnapshot().criminal===0);
  check('hardship is described honestly instead',labels(poor).length>0,labels(poor).join(','));
  // Every criminal identity in the table must depend on an organisation
  // existing. Checked structurally, so a future edit that drops the dependency
  // fails here rather than shipping.
  const probe={farms:0,docks:0,markets:0,schools:0,stations:0,homes:20,pop:99,jobs:0,workers:99,tradeJobs:0,civicJobs:0,
    roadTiles:40,tier1:20,tier3:0,recreationCapacity:0,recreationReach:0,buildings:20,area:100,density:0.9,
    avgDesirability:0,avgEducation:0,avgMood:0,waterEdge:true,unresolvedCrime:9,
    organisations:0,organisationStrength:0,sector:{agriculture:0,trade:0,civic:0,transport:1,recreation:0,landmark:0,homes:20}};
  const reachable=IDENTITIES.filter(i=>isCriminalIdentity(i.id))
    .filter(i=>i.when(probe).reduce((n,c)=>n+(c?1:0),0)>=i.need);
  check('with zero organisations no criminal identity is reachable at all',reachable.length===0,reachable.map(i=>i.id).join(','));
}

/* ---------- bounded, cached, and not per frame ---------- */
{
  blank();
  clear(30,30,70,60);
  for(let k=0;k<40;k++){
    const x=32+(k%8)*8, y=32+Math.floor(k/8)*8;
    for(let i=0;i<6;i++) place('road',x+i,y);
    homes(x,y+1,5,1,{});
  }
  settle();
  const list=recomputeDistricts();
  check('district count stays inside its cap',list.length<=MAX_DISTRICTS,list.length+' / '+MAX_DISTRICTS);

  S.diagnostics.districtRecomputes=0;
  for(let i=0;i<50;i++) recomputeDistricts();
  check('repeated reads do not rebuild the districts',S.diagnostics.districtRecomputes===0,S.diagnostics.districtRecomputes);
  invalidateDistricts();
  recomputeDistricts(); recomputeDistricts();
  check('one change causes exactly one rebuild',S.diagnostics.districtRecomputes===1,S.diagnostics.districtRecomputes);
  // Building something is a change, and must invalidate on its own. The
  // placement is asserted too: a cafe dropped onto an existing road silently
  // fails, and the invalidation check would then pass for the wrong reason.
  S.diagnostics.districtRecomputes=0;
  const built=place('cafe',33,36);
  check('the fixture actually placed the building',built===true,built);
  recomputeDistricts();
  check('placing a building invalidates the districts',S.diagnostics.districtRecomputes===1,S.diagnostics.districtRecomputes);
}

/* ---------- save V3 keeps the durable truth, derives the rest ---------- */
{
  blank();
  clear(40,40,24,10);
  for(let x=41;x<62;x++) place('road',x,42);
  homes(41,41,10,2,{desirability:72,education:55,tier:3,mood:75});
  place('pocketPark',44,44); place('playground',50,44); place('school',56,44);
  settle();
  const before=recomputeDistricts()[0];
  const packed=JSON.parse(JSON.stringify(packSocial()));
  check('the save carries the district',packed.districts.length===1,packed.districts.length);
  check('the save carries no derived measurements',!('measured' in (packed.districts[0]||{}))&&!('bounds' in (packed.districts[0]||{})));

  restoreSocial(packed);
  settle();
  const after=recomputeDistricts()[0];
  check('a district survives save and load with its name',after?.name===before.name,before.name+' -> '+after?.name);
  check('and with the day it appeared',after?.born===before.born);

  // An old save has no social field at all. It must load and rebuild quietly.
  restoreSocial(undefined);
  check('an old save with no social data loads',Array.isArray(S.social.districts)&&S.social.districts.length===0);
  settle();
  check('and derives its districts from the city it already describes',recomputeDistricts().length===1);

  // An edited save cannot invent a label this build does not know.
  restoreSocial({nextId:1,districts:[{id:1,name:'Nowhere',cx:50,cy:41,born:2,
    identities:[{id:'crimeLord',label:'Crime Lord',met:9},{id:'agricultural',label:'Agricultural',met:2}]}]});
  const kept=S.social.districts[0].identities.map(i=>i.id);
  check('an unknown identity in a save is dropped',!kept.includes('crimeLord'),kept.join(','));
  check('a known identity in a save is kept',kept.includes('agricultural'),kept.join(','));
}

const failed=checks.filter(c=>!c.pass);
document.getElementById('results').textContent=JSON.stringify({pass:!failed.length,checks},null,2);
document.documentElement.dataset.result=failed.length?'fail':'pass';
