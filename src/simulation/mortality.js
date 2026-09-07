import { S } from '../core/state.js';
import { ROSTER_CAP, families, familyMembers, lostOf, memberEver } from './families.js';
import { aliases } from './aliases.js';
import { fame } from './fame.js';
import { organisations } from './organisations.js';
import { invalidateDistricts } from './districts.js';
import { invalidateServices } from './civic-services.js';
import { markRecreationPopulation } from './recreation.js';
import { record } from './ledger.js';

/* ============================================================
   MORTALITY — what it costs when the valley loses somebody

   Meadowline had no way to lose a person until the siege, and adding one is
   not a matter of decrementing a number. A person here is (homeSeed, index):
   their trade is filed under that index, so is their renown, so is the name
   the street ended up calling them, and so is their seat in anything that
   formed around them. Take the person away and leave those behind and the town
   ends up employing a ghost.

   So there is exactly one way to die, it is this function, and it closes every
   one of those books in the same breath. The regression holds a person who is
   all four things at once — employed, famous, nicknamed, and named as running
   something — and checks that nothing anywhere still refers to them.

   Nothing here decides who dies. That is the siege's business; this is only
   what it costs.
   ============================================================ */

export function isLost(f,index){ return lostOf(f).includes(index); }

/* The whole of it, in the order that matters: the record of who is gone is
   written first, so that anything reading back mid-cleanup already sees the
   truth rather than a person half-removed. */
export function takeLife(f,index,{cause='unknown',x=null,y=null}={}){
  if(!f||!Number.isInteger(index)||index<0||index>=ROSTER_CAP) return null;
  if(isLost(f,index)) return null;
  const who=memberEver(f,index);
  if(!who) return null;

  if(!Array.isArray(f.lost)) f.lost=[];
  f.lost.push(index);

  // The household is one smaller. Everything that counts people re-counts.
  const h=(S.ctx?.houses||[]).find(x2=>(x2.seed>>>0)===(f.homeSeed>>>0));
  if(h&&h.pop>0){ h.pop--; invalidateServices(); markRecreationPopulation(); }

  // Their trade: the seat is empty, not held by nobody.
  if(f.careers&&f.careers[index]!==undefined) delete f.careers[index];

  // Their renown. The valley stops talking about somebody who is not there.
  const fameList=fame();
  for(let i=fameList.length-1;i>=0;i--)
    if(fameList[i].familyId===f.id&&fameList[i].index===index) fameList.splice(i,1);

  // The name the street gave them goes with them.
  const aliasList=aliases();
  let alias=null,aliasPublic=false;
  for(let i=aliasList.length-1;i>=0;i--)
    if(aliasList[i].familyId===f.id&&aliasList[i].index===index){
      alias=aliasList[i].alias;
      /* Whether the street had got as far as saying it out loud. The record
         keeps the name either way — the simulation knows it — but the Post
         may only print one the valley already used, and without this flag the
         obituary was the one place a private nickname went public. */
      aliasPublic=aliasList[i].visibility==='public';
      aliasList.splice(i,1);
    }

  /* Anything that formed around them. A household stays in an organisation
     when it loses somebody — the others are still in it — but a named boss who
     is gone is not still the boss, and the group has to find one or do without. */
  for(const o of organisations())
    if(o.boss&&o.boss.familyId===f.id&&o.boss.index===index) o.boss=null;

  // A household that has lost everybody is no longer a household here; the
  // families pass will clear the record on its own next time it runs.
  const left=familyMembers(f).length;
  invalidateDistricts();

  record('death',{familyId:f.id,index,name:who.name,surname:f.surname,alias,aliasPublic,
    cause:String(cause).slice(0,24),district:f.roots||null,
    x:Number.isFinite(x)?x:(h?h.x:null),y:Number.isFinite(y)?y:(h?h.y:null),
    survivors:left,day:S.day||1});
  if(S.diagnostics) S.diagnostics.deaths=(S.diagnostics.deaths||0)+1;
  return {...who,alias,aliasPublic,cause,survivors:left};
}

/* Who, in this household, the night could take. Nobody who is already gone,
   and the household must have somebody in it. */
export function livingIn(f){ return familyMembers(f); }
export function anyoneLeft(f){ return familyMembers(f).length>0; }
export function deathsSoFar(){
  let n=0; for(const f of families()) n+=lostOf(f).length; return n;
}
