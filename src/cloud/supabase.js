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

function cleanEmail(email){
  const value=String(email||'').trim();
  if(!value||!value.includes('@')) throw new Error('Enter a valid email address.');
  return value;
}
function cleanPassword(password){
  const value=String(password||'');
  if(value.length<8) throw new Error('Password must be at least 8 characters.');
  return value;
}
export function friendlyAuthError(error,phase='signin'){
  const message=String(error?.message||error||'').toLowerCase();
  const status=Number(error?.status||error?.statusCode||0);
  if(status===429||message.includes('rate limit')||message.includes('too many requests')) return 'Too many account requests were made. Please wait a while and try again.';
  if(message.includes('invalid login credentials')) return 'Email or password is incorrect.';
  if(message.includes('email not confirmed')) return 'Check your email and confirm this account before signing in.';
  if(message.includes('user already registered')) return 'That email already has a Meadowline account. Sign in or use Set / reset password.';
  if(message.includes('password')&&message.includes('weak')) return 'Choose a stronger password with at least 8 characters.';
  if(message.includes('network')||message.includes('fetch')) return 'Could not reach Meadowline cloud services. Your local city is unaffected.';
  if(phase==='reset') return 'Could not send the password setup email. Please try again later.';
  if(phase==='update') return 'Could not update your password. Please try again.';
  if(phase==='signup') return 'Could not create the account. Please try again.';
  return 'Could not sign in. Please check your details and try again.';
}

export async function signInWithPassword(email,password){
  const {data,error}=await supabase.auth.signInWithPassword({email:cleanEmail(email),password:cleanPassword(password)});
  if(error) throw new Error(friendlyAuthError(error,'signin'));
  return data.session||null;
}

export async function createPasswordAccount(email,password){
  const {data,error}=await supabase.auth.signUp({email:cleanEmail(email),password:cleanPassword(password)});
  if(error) throw new Error(friendlyAuthError(error,'signup'));
  return data;
}

export async function sendPasswordSetup(email){
  const target=cleanEmail(email);
  const {error}=await supabase.auth.resetPasswordForEmail(target,{redirectTo:`${location.origin}${location.pathname}`});
  if(error) throw new Error(friendlyAuthError(error,'reset'));
  return target;
}

export async function updatePassword(password){
  const {data,error}=await supabase.auth.updateUser({password:cleanPassword(password)});
  if(error) throw new Error(friendlyAuthError(error,'update'));
  return data.user||null;
}

export async function signOut(){
  const {error}=await supabase.auth.signOut();
  if(error) throw error;
}
