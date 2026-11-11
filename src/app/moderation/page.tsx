import {cookies,headers} from 'next/headers';
import {notFound} from 'next/navigation';
import {ModerationQueue} from '@/components/ModerationQueue';
import {ADMIN_SESSION_COOKIE,openAdminSession} from '@/lib/admin-session.server';
import {fetchAdminModerationCases} from '@/lib/admin-backend.server';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const revalidate=0;

/**
 * Private server-rendered workspace. Authentication is server-only:
 * no bearer is passed into HTML, client props, or browser-side fetches.
 * Backend independently enforces current MFA, session and scope grants.
 */
export default async function ModerationPage(){
 if(process.env.SERVICES_ADMIN_ENABLE_MODERATION_BFF!=='enabled')notFound();
 const requestHeaders=await headers();
 const site=requestHeaders.get('sec-fetch-site');
 if(site==='cross-site'||site==='same-site')notFound();
 const store=await cookies();
 const bearer=openAdminSession(store.get(ADMIN_SESSION_COOKIE)?.value);
 if(!bearer)notFound();
 const result=await fetchAdminModerationCases(bearer);
 if(!result)notFound();
 return <main style={{minHeight:'100vh',padding:'clamp(16px,4vw,48px)'}}>
   <ModerationQueue items={result.items}/>
 </main>;
}
