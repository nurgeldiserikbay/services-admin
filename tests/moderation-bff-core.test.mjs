import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {readAuthorizedModerationPage} from '../src/lib/moderation-bff-core.mjs';

const origin='https://api.example.test';
const token=randomBytes(32).toString('base64url');
const row={id:randomUUID(),subjectKind:'review',state:'triage',
 createdAt:'2026-11-10T12:00:00.000Z'};
const reply=(payload,status=200,type='application/json')=>({
 status,headers:{get:(key)=>key==='content-type'?type:key==='cache-control'?'private, no-store':null},
 text:async()=>JSON.stringify(payload),
});
test('BFF requests a scoped page without caching, redirects or token in URL',async()=>{
 let seen;
 const result=await readAuthorizedModerationPage({
  backendOrigin:origin,adminToken:token,
  fetchImpl:async(url,options)=>{seen={url,options};return reply({items:[row]});},
 });
 assert.deepEqual(result,{items:[row]});
 assert.equal(seen.url,origin+'/v1/admin/moderation/cases');
 assert.equal(seen.options.method,'GET');
 assert.equal(seen.options.cache,'no-store');
 assert.equal(seen.options.redirect,'error');
 assert.equal(seen.options.headers.Authorization,'Bearer '+token);
 assert.doesNotMatch(seen.url,new RegExp(token));
});
test('BFF fails closed for malformed credentials and transport',async()=>{
 let calls=0;
 for(const credentials of [
  {backendOrigin:'http://api.example.test',adminToken:token},
  {backendOrigin:'https://api.example.test/path',adminToken:token},
  {backendOrigin:'https://localhost',adminToken:token},
  {backendOrigin:'https://127.0.0.1:443',adminToken:token},
  {backendOrigin:'https://api..example.test',adminToken:token},
  {backendOrigin:'https://-api.example.test',adminToken:token},
  {backendOrigin:origin,adminToken:'invalid'},
 ]){
  await assert.rejects(readAuthorizedModerationPage({
   ...credentials,fetchImpl:async()=>{calls++;return reply({items:[]});},
  }),/admin_read_unavailable/);
 }
 assert.equal(calls,0);
});
test('BFF rejects non-200, non-JSON, oversized and unexpected response fields',async()=>{
 for(const response of [
  reply({items:[]},401),reply({items:[]},200,'text/html'),reply({items:[]},200,'application/jsonp'),
  reply({items:[{...row,email:'private@example.test'}]}),
  reply({items:[],token:'leak'}),reply({items:Array.from({length:51},()=>row)}),
  {status:200,headers:{get:(k)=>k==='content-type'?'application/json':k==='cache-control'?'no-store':'40000'},
   text:async()=>JSON.stringify({items:[]})},
 ]){
  await assert.rejects(readAuthorizedModerationPage({
   backendOrigin:origin,adminToken:token,fetchImpl:async()=>response,
  }),/admin_read_unavailable/);
 }
});

test('BFF rejects cacheable privileged moderation responses',async()=>{
 const response={
  status:200,
  headers:{get:key=>key==='content-type'?'application/json':
   key==='cache-control'?'public, max-age=3600':null},
  text:async()=>JSON.stringify({items:[row]}),
 };
 await assert.rejects(readAuthorizedModerationPage({
  backendOrigin:origin,adminToken:token,fetchImpl:async()=>response,
 }),/admin_read_unavailable/);
});

test('BFF rejects responses larger than 32 KiB even when character count is smaller',async()=>{
 // JSON whitespace is valid; each non-ASCII whitespace below is escaped by JSON,
 // so use a long Unicode string within a valid JSON value for the byte limit.
 const payload={items:[],extra:'界'.repeat(11000)};
 const body=JSON.stringify(payload);
 assert.ok(body.length<32768);
 assert.ok(Buffer.byteLength(body,'utf8')>32768);
 const response={status:200,headers:{get:key=>key==='content-type'?'application/json':key==='cache-control'?'no-store':null},
  text:async()=>body};
 await assert.rejects(readAuthorizedModerationPage({
  backendOrigin:origin,adminToken:token,fetchImpl:async()=>response,
 }),/admin_read_unavailable/);
});

test('BFF rejects an oversized streamed response before reading its tail',async()=>{
 let reads=0;
 const reader={
  async read(){
   reads++;
   if(reads===1)return {done:false,value:new Uint8Array(32769)};
   throw new Error('stream tail must not be consumed');
  },
  releaseLock(){},
 };
 const response={status:200,headers:{get:key=>key==='content-type'?'application/json':key==='cache-control'?'no-store':null},
  body:{getReader:()=>reader},
  text:async()=>{throw new Error('must stream instead');}};
 await assert.rejects(readAuthorizedModerationPage({
  backendOrigin:origin,adminToken:token,fetchImpl:async()=>response,
 }),/admin_read_unavailable/);
 assert.equal(reads,1);
});
test('BFF parses a valid streamed JSON page across chunk boundaries',async()=>{
 const bytes=new TextEncoder().encode(JSON.stringify({items:[row]}));
 let position=0;
 const response={status:200,headers:{get:key=>key==='content-type'?'application/json':key==='cache-control'?'no-store':null},
  body:{getReader:()=>({
   async read(){
    if(position===bytes.length)return {done:true};
    const chunk=bytes.slice(position,position+7);
    position+=chunk.length;
    return {done:false,value:chunk};
   },
   releaseLock(){},
  })},
  text:async()=>{throw new Error('must stream instead');}};
 assert.deepEqual(await readAuthorizedModerationPage({
  backendOrigin:origin,adminToken:token,fetchImpl:async()=>response,
 }),{items:[row]});
});

test('BFF rejects malformed UTF-8 rather than silently replacing bytes',async()=>{
 // Invalid byte sequence inside an otherwise valid JSON string.
 const prefix=new TextEncoder().encode('{"items":[],"note":"');
 const suffix=new TextEncoder().encode('"}');
 const bytes=new Uint8Array(prefix.length+1+suffix.length);
 bytes.set(prefix);
 bytes[prefix.length]=0xff;
 bytes.set(suffix,prefix.length+1);
 let released=0;
 const response={
  status:200,
  headers:{get:key=>key==='content-type'?'application/json':
   key==='cache-control'?'no-store':null},
  body:{getReader:()=>({
   async read(){
    if(this.finished)return {done:true};
    this.finished=true;
    return {done:false,value:bytes};
   },
   releaseLock(){released++;},
  })},
 };
 await assert.rejects(readAuthorizedModerationPage({
  backendOrigin:origin,adminToken:token,fetchImpl:async()=>response,
 }),/admin_read_unavailable/);
 assert.equal(released,1);
});

test('BFF cancels a rejected oversized stream without reading further chunks',async()=>{
 let reads=0;
 let cancelled=0;
 let released=0;
 const reader={
  async read(){
   reads++;
   return {done:false,value:new Uint8Array(32769)};
  },
  async cancel(){cancelled++;},
  releaseLock(){released++;},
 };
 const response={status:200,headers:{get:key=>key==='content-type'?'application/json':key==='cache-control'?'no-store':null},
  body:{getReader:()=>reader}};
 await assert.rejects(readAuthorizedModerationPage({
  backendOrigin:origin,adminToken:token,fetchImpl:async()=>response,
 }),/admin_read_unavailable/);
 assert.equal(reads,1);
 assert.equal(cancelled,1);
 assert.equal(released,1);
});

test('BFF cancels malformed streamed chunks before releasing the reader',async()=>{
 let cancelled=0;
 const response={status:200,headers:{get:key=>key==='content-type'?'application/json':key==='cache-control'?'no-store':null},
  body:{getReader:()=>({
   async read(){return {done:false,value:'not-bytes'};},
   async cancel(){cancelled++;},
   releaseLock(){},
  })}};
 await assert.rejects(readAuthorizedModerationPage({
  backendOrigin:origin,adminToken:token,fetchImpl:async()=>response,
 }),/admin_read_unavailable/);
 assert.equal(cancelled,1);
});
