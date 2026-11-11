import {NextRequest,NextResponse} from 'next/server';
import {ADMIN_SESSION_COOKIE} from '@/lib/admin-session.server';

export const runtime='nodejs';
export const dynamic='force-dynamic';

const HEADERS={
 'Cache-Control':'private, no-store, max-age=0',
 'Pragma':'no-cache',
 'Referrer-Policy':'no-referrer',
 'X-Robots-Tag':'noindex, nofollow, noarchive',
 'Vary':'Cookie, Origin, Sec-Fetch-Site',
} as const;

function unavailable(){
 return NextResponse.json({code:'NOT_FOUND'},{status:404,headers:HEADERS});
}

/**
 * Clears only the browser-side encrypted admin session. Server-side backend
 * revocation is a separate required step for the final authenticated logout.
 * Do not enable as a substitute for backend session revocation.
 */
export async function POST(request:NextRequest){
 if(process.env.SERVICES_ADMIN_ENABLE_MODERATION_BFF!=='enabled')return unavailable();
 const origin=request.headers.get('origin');
 const site=request.headers.get('sec-fetch-site');
 if(!origin||origin!==request.nextUrl.origin||
    (site!==null&&site!=='same-origin'&&site!=='none'))return unavailable();
 const response=NextResponse.json({status:'browser_session_cleared'},
  {status:200,headers:HEADERS});
 response.cookies.set(ADMIN_SESSION_COOKIE,'',{
  httpOnly:true,secure:true,sameSite:'strict',path:'/',maxAge:0,
 });
 return response;
}
