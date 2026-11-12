/**
 * Transport-only parsing for the future administrator session boundary.
 * A parsed cookie is NEVER evidence of authentication: every request must
 * verify its HMAC-derived session hash, expiry, revocation, MFA and role in
 * the backend before granting access.
 */
export const ADMIN_SESSION_COOKIE='__Host-services_admin_session';
const TOKEN=/^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/;
const MAX_COOKIE_HEADER_BYTES=4096;

export function readAdminSessionCookie(header){
  if(typeof header!=='string'||Buffer.byteLength(header,'utf8')>MAX_COOKIE_HEADER_BYTES)
    return null;
  let found=null;
  let seen=false;
  for(const segment of header.split(';')){
    const part=segment.trim();
    const separator=part.indexOf('=');
    if(separator<0)continue;
    if(part.slice(0,separator).trim()!==ADMIN_SESSION_COOKIE)continue;
    // Duplicate names are ambiguous and must never be resolved by first/last wins.
    if(seen)return null;
    seen=true;
    const token=part.slice(separator+1);
    if(!TOKEN.test(token))return null;
    found=token;
  }
  return found;
}
