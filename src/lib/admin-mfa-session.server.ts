import 'server-only';
import {exchangeTrustedAdminMfa} from './admin-mfa-exchange.server';
import {ADMIN_SESSION_COOKIE,sealAdminSession} from './admin-session.server';

/**
 * Trusted server-only handoff: exchange account MFA for an admin grant and
 * immediately seal it into an authenticated BFF cookie envelope.
 * No browser route invokes this until the backend private controller, vault
 * wiring and staging authorization checks are approved.
 *
 * The caller must set the cookie with __Host- semantics, Secure, HttpOnly,
 * SameSite=Strict, Path=/ and no Domain. Never return the bearer to a client.
 */
export async function prepareAdminMfaCookie(
 accountSessionToken:unknown,totpCode:unknown,now?:number,clock:()=>number=Date.now,
):Promise<{sealedValue:string;maxAgeSeconds:number}|null>{
 const startedAt=now??clock();
 if(!Number.isSafeInteger(startedAt)||startedAt<0)return null;
 const grant=await exchangeTrustedAdminMfa(accountSessionToken,totpCode,startedAt);
 if(!grant)return null;
 try{
  const receivedAt=now??clock();
  if(!Number.isSafeInteger(receivedAt)||receivedAt<startedAt)return null;
  // Round down remaining time after the network exchange.
  const maxAgeSeconds=Math.floor((grant.expiresAt-receivedAt)/1000);
  if(grant.expiresAt<=receivedAt||grant.expiresAt>startedAt+900_000||
     maxAgeSeconds<1||maxAgeSeconds>900)return null;
  const sealedValue=sealAdminSession(grant.token,grant.expiresAt,receivedAt);
  return {sealedValue,maxAgeSeconds};
 }catch{return null;}
}

/**
 * Cookie policy for the eventual trusted MFA completion handler.
 * This helper only constructs options; it does not mount an HTTP route.
 */
export function adminMfaCookieDirective(prepared:unknown):{
 name:typeof ADMIN_SESSION_COOKIE;
 value:string;
 options:{httpOnly:true;secure:true;sameSite:'strict';path:'/';maxAge:number};
}|null{
 if(!prepared||typeof prepared!=='object'||Array.isArray(prepared)||
    Object.getPrototypeOf(prepared)!==Object.prototype)return null;
 const fields=Object.getOwnPropertyDescriptors(prepared);
 if(Reflect.ownKeys(prepared).length!==2||
    !Object.hasOwn(fields,'sealedValue')||
    !Object.hasOwn(fields,'maxAgeSeconds'))return null;
 const sealed=fields.sealedValue;
 const age=fields.maxAgeSeconds;
 if(!sealed||!age||!Object.hasOwn(sealed,'value')||
    !Object.hasOwn(age,'value')||!sealed.enumerable||!age.enumerable||
    typeof sealed.value!=='string'||sealed.value.length>512||
    !/^v1\.[A-Za-z0-9_-]{16}\.[A-Za-z0-9_-]{1,400}\.[A-Za-z0-9_-]{22}$/.test(sealed.value)||
    !Number.isSafeInteger(age.value)||age.value<1||age.value>900)return null;
 return {
  name:ADMIN_SESSION_COOKIE,
  value:sealed.value,
  options:{httpOnly:true,secure:true,sameSite:'strict',path:'/',maxAge:age.value},
 };
}
