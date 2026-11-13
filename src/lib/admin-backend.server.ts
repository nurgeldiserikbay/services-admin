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
    if(url.protocol!=='https:'&&
       !(local&&process.env.NODE_ENV!=='production'&&url.protocol==='http:'))return null;
    return url.origin;
  }catch{return null;}
}

export type ModerationCase=Readonly<{id:string;subjectKind:'professional'|'organization'|'review'|'affiliation';state:'triage'|'in_review'|'decision'|'appeal'|'closed';createdAt:string}>;

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KINDS=new Set(['professional','organization','review','affiliation']);
const STATES=new Set(['triage','in_review','decision','appeal','closed']);

/** Never forward an unvalidated backend payload to a browser-facing BFF. */
export function validateModerationPayload(payload:unknown):{items:ModerationCase[]}|null{
  if(!payload||typeof payload!=='object'||Array.isArray(payload)||
     Object.getPrototypeOf(payload)!==Object.prototype||
     Object.keys(payload).length!==1||!Object.hasOwn(payload,'items')||
     !Array.isArray(payload.items)||payload.items.length>50)return null;
  const items:ModerationCase[]=[];
  const seen=new Set<string>();
  for(const item of payload.items){
    if(!item||typeof item!=='object'||Array.isArray(item)||
       Object.getPrototypeOf(item)!==Object.prototype||
       Object.keys(item).length!==4||
       !['id','subjectKind','state','createdAt'].every(key=>Object.hasOwn(item,key)))
      return null;
    const row=item as Record<string,unknown>;
    if(typeof row.id!=='string'||!UUID.test(row.id)||seen.has(row.id.toLowerCase())||
       typeof row.subjectKind!=='string'||!KINDS.has(row.subjectKind)||
       typeof row.state!=='string'||!STATES.has(row.state)||
       typeof row.createdAt!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(row.createdAt)||
       !Number.isFinite(Date.parse(row.createdAt))||
       new Date(row.createdAt).toISOString()!==row.createdAt)return null;
    seen.add(row.id.toLowerCase());
    items.push({id:row.id,subjectKind:row.subjectKind as ModerationCase['subjectKind'],
      state:row.state as ModerationCase['state'],createdAt:row.createdAt});
  }
  return {items};
}

export async function fetchAdminModerationCases(
  bearer:unknown,
):Promise<{items:ModerationCase[]}|null>{
  const origin=adminBackendOrigin(process.env.SERVICES_BACKEND_INTERNAL_ORIGIN);
  if(!origin||typeof bearer!=='string'||!TOKEN.test(bearer))return null;
  try{
    const response=await fetch(origin+'/v1/admin/moderation/cases',{
      method:'GET',
      headers:{Authorization:'Bearer '+bearer,Accept:'application/json'},
      cache:'no-store',
      credentials:'omit',
      redirect:'error',
      signal:AbortSignal.timeout(5000),
    });
    // Rejected upstream responses must not leave their bodies unread.
    const deny=()=>{
      // Best-effort cancellation must not delay rejection indefinitely.
      if(response.body){
        try{void response.body.cancel().catch(()=>{});}catch{/* stream may already be closed */}
      }
      return null;
    };
    // A partial (206) or otherwise non-200 success is not a complete queue snapshot.
    if(response.status!==200)return deny();
    // Privileged data must never be accepted from an upstream cacheable response.
    const cacheControl=response.headers.get('cache-control')??'';
    if(!/(?:^|,)\s*no-store\s*(?:,|$)/i.test(cacheControl))return deny();
    const contentType=response.headers.get('content-type')??'';
    if(!/^application\/json(?:\s*;|\s*$)/i.test(contentType))return deny();
    const length=response.headers.get('content-length');
    if(length!==null&&(!/^\d+$/.test(length)||Number(length)>32_768))return deny();
    if(!response.body)return null;
    const reader=response.body.getReader();
    const chunks:Uint8Array[]=[];
    let total=0;
    let complete=false;
    try{
      while(true){
        const {done,value}=await reader.read();
        if(done){complete=true;break;}
        if(!(value instanceof Uint8Array))return null;
        total+=value.byteLength;
        if(total>32_768)return null;
        chunks.push(value);
      }
    }finally{
      if(!complete){
        try{void reader.cancel().catch(()=>{});}catch{/* upstream may already be closed */}
      }
      reader.releaseLock();
    }
    const bytes=new Uint8Array(total);
    let offset=0;
    for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
    const body=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
    const payload:unknown=JSON.parse(body);
    return validateModerationPayload(payload);
  }catch{return null;}
}


/**
 * Revoke a backend admin session before deleting the browser cookie.
 * Only HTTP 200 is a confirmed revocation; failures must not be reported
 * as a successful server logout.
 */
export async function revokeAdminBackendSession(bearer:unknown):Promise<boolean>{
 const origin=adminBackendOrigin(process.env.SERVICES_BACKEND_INTERNAL_ORIGIN);
 if(!origin||typeof bearer!=='string'||!TOKEN.test(bearer))return false;
 try{
  const response=await fetch(origin+'/v1/admin/session/logout',{
   method:'POST',
   headers:{Authorization:'Bearer '+bearer,Accept:'application/json'},
   cache:'no-store',credentials:'omit',redirect:'error',
   signal:AbortSignal.timeout(5000),
  });
  if(response.body){
   try{void response.body.cancel().catch(()=>{});}catch{/* already closed */}
  }
  // A cached or redirected logout acknowledgement cannot prove revocation.
  const cacheControl=response.headers.get('cache-control')??'';
  return response.status===200&&
   /(?:^|,)\s*no-store\s*(?:,|$)/i.test(cacheControl);
 }catch{return false;}
}
