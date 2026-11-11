/**
 * Server-side transport for future authenticated admin BFF handlers.
 * This module deliberately does not obtain or persist admin credentials.
 * Never pass the bearer proof to a browser component.
 */
const TOKEN=/^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/;

export function adminBackendOrigin(raw:unknown):string|null{
  if(typeof raw!=='string'||raw.length>256)return null;
  try{
    const url=new URL(raw);
    if(url.username||url.password||url.search||url.hash||
       (url.pathname!==''&&url.pathname!=='/'))return null;
    const local=url.hostname==='localhost'||url.hostname==='127.0.0.1'||url.hostname==='[::1]';
    if(url.protocol!=='https:'&&!(local&&url.protocol==='http:'))return null;
    return url.origin;
  }catch{return null;}
}

export async function fetchAdminModerationCases(
  bearer:unknown,
):Promise<{items:unknown[]}|null>{
  const origin=adminBackendOrigin(process.env.SERVICES_BACKEND_INTERNAL_ORIGIN);
  if(!origin||typeof bearer!=='string'||!TOKEN.test(bearer))return null;
  try{
    const response=await fetch(origin+'/v1/admin/moderation/cases',{
      method:'GET',
      headers:{Authorization:'Bearer '+bearer,Accept:'application/json'},
      cache:'no-store',
      redirect:'error',
      signal:AbortSignal.timeout(5000),
    });
    if(!response.ok)return null;
    const payload:unknown=await response.json();
    if(!payload||typeof payload!=='object'||!('items' in payload)||
       !Array.isArray(payload.items)||payload.items.length>50)return null;
    return {items:payload.items};
  }catch{return null;}
}
