import {NextRequest,NextResponse} from 'next/server';
import {ADMIN_SESSION_COOKIE,openAdminSession,readUniqueAdminCookie} from '@/lib/admin-session.server';
import {verifyModerationCsrf} from '@/lib/admin-moderation-csrf.server';
import {adminBackendOrigin,fetchAdminModerationCases} from '@/lib/admin-backend.server';
import {submitModerationDecision,validModerationDecisionBody} from '@/lib/moderation-decision-transport.mjs';
export const runtime='nodejs';export const dynamic='force-dynamic';export const revalidate=0;
const HEADERS={'Cache-Control':'private, no-store, max-age=0','Pragma':'no-cache','X-Robots-Tag':'noindex, nofollow, noarchive','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Vary':'Cookie, Origin, Sec-Fetch-Site'} as const;
const reply=(status:number,code:string)=>NextResponse.json({code},{status,headers:HEADERS});
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
/** Mutating admin BFF. Backend is independently authoritative for role,
 * case scope, current MFA, and exact professional revision.
 */
export async function POST(request:NextRequest,context:{params:Promise<{id:string}>}){
 if(process.env.SERVICES_ADMIN_ENABLE_MODERATION_BFF!=='enabled'||
    process.env.SERVICES_ADMIN_ENABLE_MODERATION_DECISIONS!=='enabled')return reply(404,'NOT_FOUND');
 const origin=request.headers.get('origin'),site=request.headers.get('sec-fetch-site');
 if(!origin||origin!==request.nextUrl.origin||
    (site!==null&&site!=='same-origin'&&site!=='none'))return reply(404,'NOT_FOUND');
 const sealed=readUniqueAdminCookie(request.headers.get('cookie'),request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
 const bearer=openAdminSession(sealed);
 if(!bearer||!verifyModerationCsrf(sealed,request.headers.get('x-services-admin-csrf')))return reply(404,'NOT_FOUND');
 const {id}=await context.params;
 if(!UUID.test(id)||new URL(request.url).search||request.headers.has('content-encoding')||
    !/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers.get('content-type')??'')||!request.body)
   return reply(400,'INVALID_REQUEST');
 const length=request.headers.get('content-length');
 if(length!==null&&(!/^\d+$/.test(length)||Number(length)>256))return reply(400,'INVALID_REQUEST');
 let body:unknown,raw='',bytes=0;
 const reader=request.body.getReader(),decoder=new TextDecoder('utf-8',{fatal:true});
 try{
  while(true){const {done,value}=await reader.read();if(done)break;
   bytes+=value.byteLength;if(bytes>256){await reader.cancel();return reply(400,'INVALID_REQUEST');}
   raw+=decoder.decode(value,{stream:true});}
  body=JSON.parse(raw+decoder.decode());
 }catch{return reply(400,'INVALID_REQUEST');}finally{reader.releaseLock();}
 if(!validModerationDecisionBody(body))return reply(400,'INVALID_REQUEST');
 // This read is only a presentation check. The backend enforces resource scope
 // and decision state again under locks before committing any mutation.
 const queue=await fetchAdminModerationCases(bearer);
 if(!queue||!queue.items.some(item=>item.id.toLowerCase()===id.toLowerCase()&&
    item.subjectKind==='professional'&&item.state==='decision'))return reply(404,'NOT_FOUND');
 const backendOrigin=adminBackendOrigin(process.env.SERVICES_BACKEND_INTERNAL_ORIGIN);
 if(!backendOrigin)return reply(503,'UNAVAILABLE');
 const result=await submitModerationDecision({origin:backendOrigin,bearer,caseId:id,body});
 return result==='decided'?reply(200,'DECIDED'):result==='conflict'?reply(409,'CONFLICT'):reply(503,'UNAVAILABLE');
}
