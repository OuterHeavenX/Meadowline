import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.4/+esm';

const SUPABASE_URL='https://hnhpeerowianivojwqqr.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_eMJWkzvug2VhYpX9kI6Xiw_fUEae1Yj';

// Publishable browser credentials only. Never place service-role/secret keys here.
export const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{
  auth:{
    persistSession:true,
    autoRefreshToken:true,
    detectSessionInUrl:true,
    storageKey:'meadowline.auth'
  }
});

export async function getSession(){
  const {data,error}=await supabase.auth.getSession();
  if(error) throw error;
  return data.session||null;
}

export function friendlyAuthError(error){
  const message=String(error?.message||error||'').toLowerCase();
  const status=Number(error?.status||error?.statusCode||0);
  if(status===429||message.includes('rate limit')||message.includes('too many requests')){
    return 'Too many sign-in emails were requested. Please wait a while before trying again.';
  }
  if(message.includes('invalid')&&message.includes('email')) return 'Enter a valid email address.';
  if(message.includes('network')||message.includes('fetch')) return 'Could not reach Meadowline cloud services. Your local city is unaffected.';
  return 'Could not send the sign-in email. Please try again later.';
}

export async function sendSignInLink(email){
  const clean=String(email||'').trim();
  if(!clean) throw new Error('Enter an email address.');
  const {error}=await supabase.auth.signInWithOtp({
    email:clean,
    options:{emailRedirectTo:`${location.origin}${location.pathname}`}
  });
  if(error){
    const wrapped=new Error(friendlyAuthError(error));
    wrapped.cause=error;
    wrapped.status=error?.status||0;
    throw wrapped;
  }
}

export async function signOut(){
  const {error}=await supabase.auth.signOut();
  if(error) throw error;
}
