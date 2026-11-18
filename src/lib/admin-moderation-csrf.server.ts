import 'server-only';
import {createHmac,timingSafeEqual} from 'node:crypto';

// Bind a per-session CSRF secret to the sealed cookie, not the raw bearer.
// This is a form token, NOT a second admin authentication factor.
const TOKEN=/^[a-f0-9]{64}$/;
export function moderationCsrfToken(sealedCookie:unknown):string|null{
 const raw=process.env.SERVICES_ADMIN_COOKIE_KEY;
 if(typeof raw!=='string'||!/^[A-Za-z0-9+/]{43}=$/.test(raw)||
  typeof sealedCookie!=='string'||sealedCookie.length>512)return null;
 const key=Buffer.from(raw,'base64');
 if(key.length!==32||key.toString('base64')!==raw)return null;
 return createHmac('sha256',key).update('services-admin-moderation-csrf:v1\0').update(sealedCookie).digest('hex');
}
export function verifyModerationCsrf(sealedCookie:unknown,submitted:unknown):boolean{
 if(typeof submitted!=='string'||!TOKEN.test(submitted))return false;
 const expected=moderationCsrfToken(sealedCookie);
 return expected!==null&&timingSafeEqual(Buffer.from(submitted,'hex'),Buffer.from(expected,'hex'));
}
