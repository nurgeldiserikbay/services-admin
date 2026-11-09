import {isSafeModerationCasePage} from './moderation-page-core.mjs';

// Canonical 32-byte base64url admin token; aligned with backend admin-session-token.ts.
// The final character contains only four significant bits and cannot be arbitrary.
const TOKEN=/^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/;
const MAX_BYTES=16384;
export class ModerationTransportUnavailable extends Error{
 constructor(){super('Moderation list unavailable');}
}

/**
 * Transport for a FUTURE privileged backend read contract; never call from
 * browser JS or accept URLs/session credentials from untrusted input.
 */
export async function fetchTrustedModerationCases({
 apiBaseUrl,bearer,transport=fetch,
}){
 if(typeof apiBaseUrl!=='string'||apiBaseUrl.length>500||
  typeof bearer!=='string'||!TOKEN.test(bearer))
  throw new ModerationTransportUnavailable();
 let url;
 try{
  const parsed=new URL(apiBaseUrl);
  if(parsed.protocol!=='https:'||parsed.username||parsed.password||
   parsed.search||parsed.hash||apiBaseUrl.includes('%')||
   apiBaseUrl.includes('\\')||
   !/^\/(?:[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*)?\/?$/.test(parsed.pathname))
   throw new Error('invalid admin API base');
  parsed.pathname=parsed.pathname.replace(/\/$/,'')+'/admin/moderation/cases';
  url=parsed.toString();
 }catch{throw new ModerationTransportUnavailable();}
 try{
  const response=await transport(url,{
   method:'GET',redirect:'manual',cache:'no-store',credentials:'omit',
   headers:{Accept:'application/json',Authorization:'Bearer '+bearer},
   signal:AbortSignal.timeout(5000),
  });
  if(response.status!==200||
   !/^application\/json(?:\s*;|\s*$)/i.test(response.headers.get('content-type')??''))
   throw new ModerationTransportUnavailable();
  const len=response.headers.get('content-length');
  if(len!==null&&(!/^\d+$/.test(len)||Number(len)>MAX_BYTES))
   throw new ModerationTransportUnavailable();
  if(!response.body)throw new ModerationTransportUnavailable();
  const reader=response.body.getReader();
  const chunks=[];let bytes=0,finished=false;
  try{
   while(true){
    const part=await reader.read();
    if(part.done){finished=true;break;}
    if(!(part.value instanceof Uint8Array))throw new ModerationTransportUnavailable();
    bytes+=part.value.byteLength;
    if(bytes>MAX_BYTES)throw new ModerationTransportUnavailable();
    chunks.push(part.value);
   }
  }finally{
   if(!finished)await reader.cancel().catch(()=>{});
   reader.releaseLock();
  }
  const all=new Uint8Array(bytes);let offset=0;
  for(const part of chunks){all.set(part,offset);offset+=part.byteLength;}
  const parsed=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(all));
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed)||
   Object.keys(parsed).join(',')!=='items'||
   !isSafeModerationCasePage(parsed.items))
   throw new ModerationTransportUnavailable();
  return parsed.items;
 }catch{
  // Never leak bearer, PII or private API error bodies into rendering.
  throw new ModerationTransportUnavailable();
 }
}
