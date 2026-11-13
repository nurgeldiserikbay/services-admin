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
  // Reject userinfo, IP literals and hostnames with empty labels; only a
  // deployment-controlled HTTPS origin may be used as an upstream.
  const hostname=backendOrigin.slice(8).split(':')[0];
  if(hostname.length>253||hostname.split('.').some(label=>
    label.length===0||label.length>63||label.startsWith('-')||label.endsWith('-'))||
    /^(?:localhost|\d+(?:\.\d+){3})$/i.test(hostname))
    throw new Error('admin_read_unavailable');
  try{
    const response=await fetchImpl(backendOrigin+'/v1/admin/moderation/cases',{
      method:'GET',cache:'no-store',redirect:'error',
      headers:{Authorization:'Bearer '+adminToken,Accept:'application/json'},
      signal:AbortSignal.timeout(5000),
    });
    if(!response||response.status!==200||
       !/^application\/json(?:\s*;|\s*$)/i.test(String(response.headers?.get('content-type')??'')))
      throw new Error('invalid_response');
    // A privileged moderation response must not be cacheable by intermediaries.
    const cacheControl=response.headers?.get('cache-control')??'';
    if(!/(?:^|,)\s*no-store\s*(?:,|$)/i.test(cacheControl))
      throw new Error('invalid_cache_policy');
    const length=response.headers?.get('content-length');
    if(length!==null&&length!==undefined&&(!/^\d+$/.test(length)||Number(length)>32768))
      throw new Error('invalid_size');
    // Cap the streamed response before buffering untrusted upstream data.
    let body;
    if(response.body&&typeof response.body.getReader==='function'){
      const reader=response.body.getReader();
      const chunks=[];
      let total=0;
      let complete=false;
      try{
        while(true){
          const {done,value}=await reader.read();
          if(done){complete=true;break;}
          if(!(value instanceof Uint8Array))throw new Error('invalid_chunk');
          total+=value.byteLength;
          if(total>32768)throw new Error('invalid_size');
          chunks.push(value);
        }
      }finally{
        if(!complete){
          // Reject oversized or malformed upstream data without leaving its
          // response stream consuming resources after the request fails.
          try{void reader.cancel().catch(()=>{});}catch{/* best effort */}
        }
        reader.releaseLock();
      }
      body=new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks,total));
    }else{
      // Test doubles may only implement text(); real fetch has a stream.
      body=await response.text();
      if(Buffer.byteLength(body,'utf8')>32768)throw new Error('invalid_size');
    }
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
