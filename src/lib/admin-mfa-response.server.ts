import 'server-only';
import {NextResponse} from 'next/server';
import {adminMfaCookieDirective,prepareAdminMfaCookie} from './admin-mfa-session.server';

/**
 * Not an HTTP route. Only a future approved same-origin MFA completion handler
 * may call this after its own CSRF, rate-limit and primary-factor checks.
 * Never serialize the backend bearer or sealed cookie into JSON.
 */
const HEADERS={
 'Cache-Control':'private, no-store, max-age=0',
 'Pragma':'no-cache',
 'Referrer-Policy':'no-referrer',
 'X-Content-Type-Options':'nosniff',
 'X-Robots-Tag':'noindex, nofollow, noarchive',
 'Vary':'Cookie, Origin, Sec-Fetch-Site',
} as const;

export async function buildTrustedAdminMfaResponse(
 accountSessionToken:unknown,totpCode:unknown,now?:number,
):Promise<NextResponse>{
 const prepared=await prepareAdminMfaCookie(accountSessionToken,totpCode,now);
 const directive=adminMfaCookieDirective(prepared);
 if(!directive)return NextResponse.json({code:'AUTH_UNAVAILABLE'},{
  status:503,headers:HEADERS,
 });
 const response=NextResponse.json({status:'authenticated'},{
  status:200,headers:HEADERS,
 });
 response.cookies.set(directive.name,directive.value,directive.options);
 return response;
}
