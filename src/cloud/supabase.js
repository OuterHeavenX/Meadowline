import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.4/+esm';

const SUPABASE_URL='https://hnhpeerowianivojwqqr.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_eMJWkzvug2VhYpX9kI6Xiw_fUEae1Yj';

// Publishable browser credentials only. Never place service-role/secret keys here.
export const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{
  auth:{
    persistSession:true,
    autoRefreshToken:true,
    detectSessionInUrl:false,
    storageKey:'meadowline.auth'
  }
});

export async function getSession(){
  const {data,error}=await supabase.auth.getSession();
  if(error) throw error;
  return data.session||null;
}

export function friendlyAuthError(error,phase='send'){
  const message=String(error?.message||error||'').toLowerCase();
  const status=Number(error?.status||error?.statusCode||0);
  if(status===429||message.includes('rate limit')||message.includes('too many requests')){
    return 'Too many sign-in emails were requested. Please wait a while before trying again.';
  }
  if(message.includes('invalid')&&message.includes('email')) return 'Enter a valid email address.';
  if(phase==='verify'&&(message.includes('token')||message.includes('otp')||message.includes('expired'))){
    return 'That sign-in code is incorrect or expired. Request a new code and try again.';
  }
  if(message.includes('network')||message.includes('fetch')) return 'Could not reach Meadowline cloud services. Your local city is unaffected.';
  return phase==='verify'?'Could not verify that sign-in code. Please try again.':'Could not send the sign-in code. Please try again later.';
}

export async function sendEmailCode(email){
  const clean=String(email||'').trim();
  if(!clean) throw new Error('Enter an email address.');
  const {error}=await supabase.auth.signInWithOtp({
    email:clean,
    options:{shouldCreateUser:true}
  });
  if(error){
    const wrapped=new Error(friendlyAuthError(error,'send'));
    wrapped.cause=error;
    wrapped.status=error?.status||0;
    throw wrapped;
  }
  return clean;
}

export async function verifyEmailCode(email,token){
  const cleanEmail=String(email||'').trim();
  const cleanToken=String(token||'').replace(/\D/g,'').slice(0,6);
  if(!cleanEmail) throw new Error('Enter an email address.');
  if(cleanToken.length!==6) throw new Error('Enter the 6-digit sign-in code.');
  const {data,error}=await supabase.auth.verifyOtp({
    email:cleanEmail,
    token:cleanToken,
    type:'email'
  });
  if(error){
    const wrapped=new Error(friendlyAuthError(error,'verify'));
    wrapped.cause=error;
    wrapped.status=error?.status||0;
    throw wrapped;
  }
  return data.session||null;
}

export async function signOut(){
  const {error}=await supabase.auth.signOut();
  if(error) throw error;
}
