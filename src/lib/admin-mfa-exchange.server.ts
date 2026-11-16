import 'server-only';
import {adminBackendOrigin} from './admin-backend.server';

/**
 * Strict validation of a trusted private MFA exchange acknowledgement.
 * This is NOT a browser endpoint, login route or MFA credential collector.
 * The backend controller remains unregistered until vault/ingress approval.
 */
const TOKEN=/^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/;
const MAX_TTL_MS=15*60*1000;

export type PrivateMfaSession=Readonly<{token:string;expiresAt:number}>;

export function validatePrivateMfaSession(
 payload:unknown,now:number,
):PrivateMfaSession|null{
 if(!Number.isSafeInteger(now)||now<0||
    !payload||typeof payload!=='object'||Array.isArray(payload)||
    Object.getPrototypeOf(payload)!==Object.prototype)return null;
 const keys=Reflect.ownKeys(payload);
 const descriptors=Object.getOwnPropertyDescriptors(payload);
 if(keys.length!==2||
    !Object.hasOwn(descriptors,'session_token')||
    !Object.hasOwn(descriptors,'expires_at'))return null;
 const token=descriptors.session_token;
 const expiry=descriptors.expires_at;
 if(!token||!expiry||!token.enumerable||!expiry.enumerable||
    !Object.hasOwn(token,'value')||!Object.hasOwn(expiry,'value')||
    typeof token.value!=='string'||!TOKEN.test(token.value)||
    !Number.isSafeInteger(expiry.value)||expiry.value<=now||
    expiry.value>now+MAX_TTL_MS)return null;
 return {token:token.value,expiresAt:expiry.value};
}

/**
 * Internal-only transport. Do not expose via a browser route until the
 * backend controller, vault-backed credentials and restricted ingress pass
 * staging acceptance. Never return this result to a client component.
 */
export async function exchangeTrustedAdminMfa(
 accountSessionToken:unknown,totpCode:unknown,now=Date.now(),
):Promise<PrivateMfaSession|null>{
 const origin=adminBackendOrigin(process.env.SERVICES_BACKEND_INTERNAL_ORIGIN);
 const access=process.env.ADMIN_MFA_BFF_KEY;
 if(!origin||process.env.SERVICES_ADMIN_ENABLE_PRIVATE_MFA_EXCHANGE!=='enabled'||
    typeof access!=='string'||!/^[A-Za-z0-9+/]{43}=$/.test(access)||
    Buffer.from(access,'base64').toString('base64')!==access||
    [
     process.env.SERVICES_ADMIN_COOKIE_KEY,
     process.env.PLATFORM_ADMIN_SESSION_HMAC_KEY,
     process.env.ACCOUNT_SESSION_HMAC_KEY,
     process.env.ACCOUNT_LOGIN_BFF_KEY,
    ].some(peer=>typeof peer==='string'&&peer===access)||
    typeof accountSessionToken!=='string'||!TOKEN.test(accountSessionToken)||
    typeof totpCode!=='string'||!/^[0-9]{6}$/.test(totpCode)||
    !Number.isSafeInteger(now)||now<0)return null;
 try{
  const response=await fetch(origin+'/v1/admin/private/mfa/verify',{
   method:'POST',cache:'no-store',credentials:'omit',redirect:'error',
   signal:AbortSignal.timeout(5000),
   headers:{
    'Content-Type':'application/json',
    Accept:'application/json',
    'X-Services-Admin-Mfa-Key':access,
   },
   body:JSON.stringify({
    account_session_token:accountSessionToken,totp_code:totpCode,
   }),
  });
  const deny=()=>{
   if(response.body){try{void response.body.cancel().catch(()=>{});}catch{/* closed */}}
   return null;
  };
  const cache=response.headers.get('cache-control')??'';
  const contentType=response.headers.get('content-type')??'';
  const length=response.headers.get('content-length');
  if(response.status!==200||response.headers.has('content-range')||
     !/(?:^|,)\s*no-store\s*(?:,|$)/i.test(cache)||
     /(?:^|,)\s*(?:public|s-maxage\s*=)/i.test(cache)||
     !/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(contentType)||
     (length!==null&&(!/^(?:0|[1-9][0-9]*)$/.test(length)||Number(length)>512)))
   return deny();
  if(!response.body)return null;
  const reader=response.body.getReader();
  const chunks:Uint8Array[]=[];
  let size=0,complete=false;
  try{
   while(true){
    const {done,value}=await reader.read();
    if(done){complete=true;break;}
    if(!(value instanceof Uint8Array)||size+value.byteLength>512)return null;
    size+=value.byteLength;chunks.push(value);
   }
  }finally{
   if(!complete){try{void reader.cancel().catch(()=>{});}catch{/* closed */}}
   reader.releaseLock();
  }
  if(length!==null&&Number(length)!==size)return null;
  const bytes=new Uint8Array(size);let offset=0;
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  if(size>=3&&bytes[0]===239&&bytes[1]===187&&bytes[2]===191)return null;
  const decoded=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
  // The private backend contract is an exact two-field JSON object. Reject
  // duplicate names, nested values and alternate representations before parse.
  const strict=/^\{\s*"session_token"\s*:\s*"([A-Za-z0-9_-]{43})"\s*,\s*"expires_at"\s*:\s*([0-9]+)\s*\}$|^\{\s*"expires_at"\s*:\s*([0-9]+)\s*,\s*"session_token"\s*:\s*"([A-Za-z0-9_-]{43})"\s*\}$/;
  if(!strict.test(decoded))return null;
  const payload:unknown=JSON.parse(decoded);
  return validatePrivateMfaSession(payload,now);
 }catch{return null;}
}
