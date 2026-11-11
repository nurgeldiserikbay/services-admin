import {NextRequest,NextResponse} from 'next/server';
import {ADMIN_SESSION_COOKIE,openAdminSession} from '@/lib/admin-session.server';
import {fetchAdminModerationCases} from '@/lib/admin-backend.server';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const revalidate=0;

const HEADERS={
 'Cache-Control':'private, no-store, max-age=0',
 'Pragma':'no-cache',
 'X-Robots-Tag':'noindex, nofollow, noarchive',
 'X-Content-Type-Options':'nosniff',
 'Referrer-Policy':'no-referrer',
 'Vary':'Cookie, Sec-Fetch-Site',
} as const;

function deny():NextResponse{
 return NextResponse.json({code:'NOT_FOUND',message:'Resource unavailable'},
  {status:404,headers:HEADERS});
}

/**
 * Read-only admin BFF. Default-off until MFA login issues encrypted,
 * HttpOnly Secure __Host- cookies. No token is accepted from URL or headers.
 * The backend remains authoritative for session, MFA and resource grants.
 */
export async function GET(request:NextRequest):Promise<NextResponse>{
 if(process.env.SERVICES_ADMIN_ENABLE_MODERATION_BFF!=='enabled')return deny();
 const site=request.headers.get('sec-fetch-site');
 if(site==='cross-site'||site==='same-site')return deny();
 const token=openAdminSession(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
 if(!token)return deny();
 const data=await fetchAdminModerationCases(token);
 if(!data)return deny();
 return NextResponse.json({items:data.items},{status:200,headers:HEADERS});
}
