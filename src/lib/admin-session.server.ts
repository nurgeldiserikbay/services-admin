import 'server-only';
import {createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';

// Only a trusted server-side MFA/login flow may call sealAdminSession.
// Never expose the raw backend bearer to client components or JSON endpoints.
const AAD=Buffer.from('services-admin-bff-session:v1','utf8');
const TOKEN=/^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/;
const MAX_TTL=15*60*1000;
export const ADMIN_SESSION_COOKIE='__Host-services-admin-session';

function secret():Buffer|null{
 const raw=process.env.SERVICES_ADMIN_COOKIE_KEY;
 if(!raw||!/^[A-Za-z0-9+/]{43}=$/.test(raw))return null;
 const key=Buffer.from(raw,'base64');
 return key.length===32&&key.toString('base64')===raw?key:null;
}

export function sealAdminSession(token:string,expiresAt:number,now=Date.now()):string{
 const key=secret();
 if(!key||!TOKEN.test(token)||!Number.isSafeInteger(now)||
    !Number.isSafeInteger(expiresAt)||expiresAt<=now||expiresAt>now+MAX_TTL)
  throw new Error('admin_session_unavailable');
 const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);
 cipher.setAAD(AAD);
 const data=Buffer.concat([cipher.update(JSON.stringify({token,expiresAt}),'utf8'),cipher.final()]);
 return ['v1',iv.toString('base64url'),data.toString('base64url'),
   cipher.getAuthTag().toString('base64url')].join('.');
}

export function openAdminSession(cookie:unknown,now=Date.now()):string|null{
 const key=secret();
 if(!key||typeof cookie!=='string'||cookie.length>512||
    !Number.isSafeInteger(now))return null;
 const parts=cookie.split('.');
 if(parts.length!==4||parts[0]!=='v1'||
    !/^[A-Za-z0-9_-]{16}$/.test(parts[1])||
    !/^[A-Za-z0-9_-]{1,400}$/.test(parts[2])||
    !/^[A-Za-z0-9_-]{22}$/.test(parts[3]))return null;
 try{
  const iv=Buffer.from(parts[1],'base64url');
  const ciphertext=Buffer.from(parts[2],'base64url');
  const tag=Buffer.from(parts[3],'base64url');
  if(iv.length!==12||tag.length!==16||ciphertext.length>300||
     iv.toString('base64url')!==parts[1]||
     ciphertext.toString('base64url')!==parts[2]||
     tag.toString('base64url')!==parts[3])return null;
  const decipher=createDecipheriv('aes-256-gcm',key,iv);
  decipher.setAAD(AAD);decipher.setAuthTag(tag);
  const value=JSON.parse(Buffer.concat([decipher.update(ciphertext),decipher.final()]).toString('utf8'));
  if(!value||typeof value!=='object'||Array.isArray(value)||
     Object.keys(value).length!==2||!TOKEN.test(value.token)||
     !Number.isSafeInteger(value.expiresAt)||value.expiresAt<=now||
     value.expiresAt>now+MAX_TTL)return null;
  return value.token;
 }catch{return null;}
}

/** Reject duplicate or ambiguous session cookies before Next.js cookie parsing. */
export function readUniqueAdminCookie(raw:unknown,parsed:unknown):string|null{
 if(typeof raw!=='string'||raw.length>8192||typeof parsed!=='string')return null;
 let count=0;
 let value:string|null=null;
 for(const part of raw.split(';')){
  const pair=part.trim();
  const separator=pair.indexOf('=');
  if(separator<0)continue;
  if(pair.slice(0,separator).trim()!==ADMIN_SESSION_COOKIE)continue;
  count++;
  // Do not trust a framework-decoded value that disagrees with the raw header.
  // Session cookies are unquoted base64url envelopes, never URL-encoded.
  const candidate=pair.slice(separator+1);
  if(!/^[A-Za-z0-9_.-]{1,512}$/.test(candidate))return null;
  value=candidate;
 }
 return count===1&&value===parsed?value:null;
}
