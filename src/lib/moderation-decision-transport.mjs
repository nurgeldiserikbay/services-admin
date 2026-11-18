// Server-only caller must provide backend-issued privileged admin bearer.
// Never return untrusted upstream bodies or error messages to browser UI.
const TOKEN=/^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DECISIONS=new Set(['APPROVE','REJECT']);
export function validModerationDecisionBody(body){
 return !!body&&typeof body==='object'&&!Array.isArray(body)&&
  Object.getPrototypeOf(body)===Object.prototype&&
  Object.keys(body).sort().join(',')==='decision,profile_id,profile_version'&&
  typeof body.profile_id==='string'&&UUID.test(body.profile_id)&&
  Number.isInteger(body.profile_version)&&body.profile_version>=1&&body.profile_version<=2147483646&&
  DECISIONS.has(body.decision);
}
export async function submitModerationDecision({origin,bearer,caseId,body,transport=fetch}){
 if(typeof origin!=='string'||!/^https:\/\/[^/]+$/.test(origin)||
    typeof bearer!=='string'||!TOKEN.test(bearer)||
    typeof caseId!=='string'||!UUID.test(caseId)||!validModerationDecisionBody(body))
  return 'unavailable';
 const payload={profile_id:body.profile_id.toLowerCase(),profile_version:body.profile_version,decision:body.decision};
 try{
  const response=await transport(origin+'/v1/admin/moderation/cases/'+caseId.toLowerCase()+'/decision',{
   method:'POST',headers:{Authorization:'Bearer '+bearer,'Content-Type':'application/json',Accept:'application/json'},
   body:JSON.stringify(payload),cache:'no-store',credentials:'omit',redirect:'error',signal:AbortSignal.timeout(5000),
  });
  if(response.status===409){if(response.body)void response.body.cancel().catch(()=>{});return 'conflict';}
  if(response.status!==200||response.headers.has('content-range')||
   !/^application\/json(?:\s*;|\s*$)/i.test(response.headers.get('content-type')??'')||
   !/(?:^|,)\s*no-store\s*(?:,|$)/i.test(response.headers.get('cache-control')??'')||
   /(?:^|,)\s*(?:public|s-maxage\s*=)/i.test(response.headers.get('cache-control')??'')){
   if(response.body)void response.body.cancel().catch(()=>{});
   return 'unavailable';
  }
  const length=response.headers.get('content-length');
  if(length!==null&&(!/^\d+$/.test(length)||Number(length)>512))return 'unavailable';
  if(!response.body)return 'unavailable';
  const reader=response.body.getReader();
  let text='',bytes=0,complete=false;
  const decoder=new TextDecoder('utf-8',{fatal:true});
  try{
   while(true){
    const {done,value}=await reader.read();if(done){complete=true;break;}
    if(!(value instanceof Uint8Array))return 'unavailable';
    bytes+=value.byteLength;if(bytes>512)return 'unavailable';
    text+=decoder.decode(value,{stream:true});
   }
   text+=decoder.decode();
  }finally{
   if(!complete)await reader.cancel().catch(()=>{});
   reader.releaseLock();
  }
  if(length!==null&&Number(length)!==bytes)return 'unavailable';
  const receipt=JSON.parse(text);
  if(!receipt||typeof receipt!=='object'||Array.isArray(receipt)||
    Object.keys(receipt).sort().join(',')!=='case_id,decision,profile_id,profile_version'||
    receipt.case_id!==caseId.toLowerCase()||receipt.profile_id!==payload.profile_id||
    receipt.profile_version!==payload.profile_version||receipt.decision!==payload.decision)
   return 'unavailable';
  return 'decided';
 }catch{return 'unavailable';}
}
