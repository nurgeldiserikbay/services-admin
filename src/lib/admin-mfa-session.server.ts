import 'server-only';
import {exchangeTrustedAdminMfa} from './admin-mfa-exchange.server';
import {sealAdminSession} from './admin-session.server';

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
 accountSessionToken:unknown,totpCode:unknown,now=Date.now(),
):Promise<{sealedValue:string;maxAgeSeconds:number}|null>{
 if(!Number.isSafeInteger(now)||now<0)return null;
 const grant=await exchangeTrustedAdminMfa(accountSessionToken,totpCode,now);
 if(!grant)return null;
 try{
  // Round down: never advertise a cookie TTL longer than the backend grant.
  const maxAgeSeconds=Math.floor((grant.expiresAt-now)/1000);
  if(grant.expiresAt<=now||grant.expiresAt>now+900_000||
     maxAgeSeconds<1||maxAgeSeconds>900)return null;
  const sealedValue=sealAdminSession(grant.token,grant.expiresAt,now);
  return {sealedValue,maxAgeSeconds};
 }catch{return null;}
}
