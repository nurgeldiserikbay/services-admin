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

export type ModerationCase=Readonly<{id:string;subjectKind:'professional'|'organization'|'review'|'affiliation';state:'triage'|'in_review'|'decision'|'appeal'|'closed';createdAt:string}>;

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KINDS=new Set(['professional','organization','review','affiliation']);
const STATES=new Set(['triage','in_review','decision','appeal','closed']);

/** Never forward an unvalidated backend payload to a browser-facing BFF. */
export function validateModerationPayload(payload:unknown):{items:ModerationCase[]}|null{
  if(!payload||typeof payload!=='object'||!('items' in payload)||
     !Array.isArray(payload.items)||payload.items.length>50)return null;
  const items:ModerationCase[]=[];
  const seen=new Set<string>();
  for(const item of payload.items){
    if(!item||typeof item!=='object')return null;
    const row=item as Record<string,unknown>;
    if(typeof row.id!=='string'||!UUID.test(row.id)||seen.has(row.id.toLowerCase())||
       typeof row.subjectKind!=='string'||!KINDS.has(row.subjectKind)||
       typeof row.state!=='string'||!STATES.has(row.state)||
       typeof row.createdAt!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(row.createdAt)||
       !Number.isFinite(Date.parse(row.createdAt)))return null;
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
      redirect:'error',
      signal:AbortSignal.timeout(5000),
    });
    if(!response.ok)return null;
    const payload:unknown=await response.json();
    return validateModerationPayload(payload);
  }catch{return null;}
}
