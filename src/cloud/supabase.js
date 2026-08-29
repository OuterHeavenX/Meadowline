// The Supabase client is fetched on demand and never during boot. A static
// import here would put the whole module graph — game loop, renderer and save
// system included — behind one network request, so Meadowline would not start
// at all when the CDN is unreachable. Guest play must never touch the network.
const CLIENT_MODULE='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.4/+esm';
const OFFLINE_MESSAGE='Could not reach Meadowline cloud services. Your local city is unaffected.';

const SUPABASE_URL='https://hnhpeerowianivojwqqr.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_eMJWkzvug2VhYpX9kI6Xiw_fUEae1Yj';

let clientPromise=null;

// Publishable browser credentials only. Never place service-role/secret keys here.
export function cloudClient(){
  if(!clientPromise){
    clientPromise=import(CLIENT_MODULE)
      .then(module=>module.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{
        auth:{
          persistSession:true,
          autoRefreshToken:true,
          detectSessionInUrl:true,
          storageKey:'meadowline.auth'
        }
      }))
      .catch(()=>{ clientPromise=null; throw new Error(OFFLINE_MESSAGE); });
  }
  return clientPromise;
}

// Subscribes once the player actually opens the account panel. Returns false
// when cloud services are unreachable so the caller can carry on regardless.
export async function onCloudAuthChange(handler){
  try{
    const supabase=await cloudClient();
    supabase.auth.onAuthStateChange(()=>handler());
    return true;
  }catch(e){ return false; }
}

export async function getSession(){
  const supabase=await cloudClient();
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
  const supabase=await cloudClient();
  const {data,error}=await supabase.auth.signInWithPassword({email:cleanEmail(email),password:cleanPassword(password)});
  if(error) throw new Error(friendlyAuthError(error,'signin'));
  return data.session||null;
}

export async function createPasswordAccount(email,password){
  const supabase=await cloudClient();
  const {data,error}=await supabase.auth.signUp({email:cleanEmail(email),password:cleanPassword(password)});
  if(error) throw new Error(friendlyAuthError(error,'signup'));
  return data;
}

export async function sendPasswordSetup(email){
  const target=cleanEmail(email);
  const supabase=await cloudClient();
  const {error}=await supabase.auth.resetPasswordForEmail(target,{redirectTo:`${location.origin}${location.pathname}`});
  if(error) throw new Error(friendlyAuthError(error,'reset'));
  return target;
}

export async function updatePassword(password){
  const supabase=await cloudClient();
  const {data,error}=await supabase.auth.updateUser({password:cleanPassword(password)});
  if(error) throw new Error(friendlyAuthError(error,'update'));
  return data.user||null;
}

export async function signOut(){
  const supabase=await cloudClient();
  const {error}=await supabase.auth.signOut();
  if(error) throw error;
}
