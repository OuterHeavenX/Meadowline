import { KEY, save, store } from '../core/save.js';
import { cloudClient, getSession } from './supabase.js';

const REVISION_KEY='meadowline.cloud.revision.slot1';

function readRevision(){
  const n=Number(localStorage.getItem(REVISION_KEY));
  return Number.isInteger(n)&&n>=0?n:0;
}
function writeRevision(n){ localStorage.setItem(REVISION_KEY,String(Math.max(0,Number(n)||0))); }

export async function getCloudAccount(){
  const session=await getSession();
  return session?.user||null;
}

export async function getCloudSaveSummary(){
  const user=await getCloudAccount();
  if(!user) return {signedIn:false,save:null};
  const supabase=await cloudClient();
  const {data,error}=await supabase.from('city_saves')
    .select('id,slot,city_name,save_version,revision,client_saved_at,updated_at')
    .eq('user_id',user.id).eq('slot',1).maybeSingle();
  if(error) throw error;
  if(data) writeRevision(data.revision);
  return {signedIn:true,user,save:data||null};
}

export async function getCloudHistory(){
  const user=await getCloudAccount();
  if(!user) return [];
  const supabase=await cloudClient();
  const {data,error}=await supabase.from('city_save_history')
    .select('id,slot,city_name,save_version,revision,client_saved_at,archived_at,payload')
    .eq('user_id',user.id).eq('slot',1)
    .order('revision',{ascending:false}).limit(5);
  if(error) throw error;
  return Array.isArray(data)?data:[];
}

export async function uploadLocalSave(){
  const user=await getCloudAccount();
  if(!user) throw new Error('Sign in before using cloud saves.');
  save();
  const raw=store.get(KEY);
  if(!raw) throw new Error('No local Meadowline save was found.');
  let payload;
  try{ payload=JSON.parse(raw); }catch{ throw new Error('The local save could not be read.'); }
  const expected=readRevision();
  const supabase=await cloudClient();
  const {data,error}=await supabase.rpc('save_city_slot',{
    p_slot:1,
    p_city_name:'Meadowline',
    p_save_version:Number(payload.v)||3,
    p_payload:payload,
    p_expected_revision:expected,
    p_client_saved_at:new Date().toISOString()
  });
  if(error) throw error;
  const result=Array.isArray(data)?data[0]:data;
  if(!result) throw new Error('Cloud save returned no result.');
  if(result.status==='conflict'){
    if(Number.isFinite(Number(result.revision))) writeRevision(Number(result.revision));
    return {status:'conflict',revision:Number(result.revision)||0,updatedAt:result.updated_at||null};
  }
  writeRevision(Number(result.revision)||expected+1);
  return {status:'saved',revision:Number(result.revision)||expected+1,updatedAt:result.updated_at||null};
}

export async function downloadCloudSave(){
  const user=await getCloudAccount();
  if(!user) throw new Error('Sign in before using cloud saves.');
  const supabase=await cloudClient();
  const {data,error}=await supabase.from('city_saves')
    .select('payload,revision,updated_at')
    .eq('user_id',user.id).eq('slot',1).maybeSingle();
  if(error) throw error;
  if(!data) return {status:'empty'};
  if(!data.payload||Number(data.payload.v)!==3||!Array.isArray(data.payload.b)) throw new Error('Cloud save failed Meadowline validation.');
  store.set(KEY,JSON.stringify(data.payload));
  writeRevision(Number(data.revision)||0);
  return {status:'downloaded',revision:Number(data.revision)||0,updatedAt:data.updated_at||null};
}

export async function restoreCloudHistory(historyId){
  const user=await getCloudAccount();
  if(!user) throw new Error('Sign in before restoring cloud history.');
  if(!historyId) throw new Error('Choose a cloud revision to restore.');
  const expected=readRevision();
  if(expected<1) throw new Error('Refresh the cloud save before restoring history.');
  const supabase=await cloudClient();
  const {data,error}=await supabase.rpc('restore_city_save',{
    p_history_id:historyId,
    p_expected_revision:expected
  });
  if(error) throw error;
  const result=Array.isArray(data)?data[0]:data;
  if(!result) throw new Error('Cloud restore returned no result.');
  if(result.status==='conflict'){
    if(Number.isFinite(Number(result.revision))) writeRevision(Number(result.revision));
    return {status:'conflict',revision:Number(result.revision)||0,restoredFrom:Number(result.restored_from_revision)||0};
  }
  writeRevision(Number(result.revision)||expected+1);
  return {status:'restored',revision:Number(result.revision)||expected+1,restoredFrom:Number(result.restored_from_revision)||0};
}

export function clearCloudRevision(){ localStorage.removeItem(REVISION_KEY); }
