import {isSafeModerationCasePage} from './moderation-page-core.mjs';

/**
 * Server-side only moderation transport. Caller must supply a token obtained
 * from a verified server-side admin session, never from a browser parameter,
 * header, cookie value accepted without verification, or local storage.
 * This module does not implement authentication or a public route.
 */
export async function readAuthorizedModerationPage({
  backendOrigin,adminToken,fetchImpl,
}){
  if(typeof backendOrigin!=='string'||!/^https:\/\/[a-z0-9.-]+(?::\d{1,5})?$/i.test(backendOrigin)||
     typeof adminToken!=='string'||!/^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/.test(adminToken)||
     typeof fetchImpl!=='function')throw new Error('admin_read_unavailable');
  let response;
  try{
    response=await fetchImpl(backendOrigin+'/v1/admin/moderation/cases',{
      method:'GET',cache:'no-store',redirect:'error',
      headers:{Authorization:'Bearer '+adminToken,Accept:'application/json'},
      signal:AbortSignal.timeout(5000),
    });
    if(!response||response.status!==200||
       !String(response.headers?.get('content-type')??'').toLowerCase().includes('application/json'))
      throw new Error('invalid_response');
    const length=response.headers?.get('content-length');
    if(length!==null&&length!==undefined&&(!/^\d+$/.test(length)||Number(length)>32768))
      throw new Error('invalid_size');
    const body=await response.text();
    if(body.length>32768)throw new Error('invalid_size');
    const payload=JSON.parse(body);
    if(!payload||typeof payload!=='object'||Array.isArray(payload)||
       Object.keys(payload).length!==1||!Object.hasOwn(payload,'items')||
       !isSafeModerationCasePage(payload.items))
      throw new Error('invalid_payload');
    return {items:payload.items};
  }catch{
    throw new Error('admin_read_unavailable');
  }
}
