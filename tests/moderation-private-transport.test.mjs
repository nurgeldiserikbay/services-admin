import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {
 fetchTrustedModerationCases,ModerationTransportUnavailable,
} from '../src/lib/moderation-private-transport.mjs';

const bearer=randomBytes(32).toString('base64url');
const req={apiBaseUrl:'https://api.example.test/v1',bearer};
const item=()=>({id:randomUUID(),subjectKind:'review',state:'triage',
 createdAt:'2026-11-08T00:00:00Z'});
const reply=(data)=>new Response(JSON.stringify(data),{
 status:200,headers:{'content-type':'application/json'},
});
test('transport sends bearer only server-to-server and accepts exact redacted pages',async()=>{
 let seen;
 const items=await fetchTrustedModerationCases({...req,transport:async(url,opts)=>{
  seen={url,opts};return reply({items:[item()]});
 }});
 assert.equal(items.length,1);
 assert.equal(seen.url,'https://api.example.test/v1/admin/moderation/cases');
 assert.equal(seen.opts.headers.Authorization,'Bearer '+bearer);
 assert.equal(seen.opts.credentials,'omit');
 assert.equal(seen.opts.redirect,'manual');
});
test('transport rejects unsafe config before network request',async()=>{
 let count=0;
 const transport=async()=>{count++;return reply({items:[]});};
 for(const apiBaseUrl of ['http://api.example.test/v1',
  'https://user:pass@api.example.test/v1',
  'https://api.example.test/v1?q=1',
  'https://api.example.test/v1/%61',
  'https://api.example.test/v1//admin']){
  await assert.rejects(fetchTrustedModerationCases({...req,apiBaseUrl,transport}),
   ModerationTransportUnavailable);
 }
 await assert.rejects(fetchTrustedModerationCases({...req,bearer:'invalid',transport}),
  ModerationTransportUnavailable);
 assert.equal(count,0);
});
test('transport fails closed on unredacted, malformed, large and denied responses',async()=>{
 for(const response of [
  reply({items:[{...item(),email:'secret@example.test'}]}),
  reply({items:[{...item(),id:'bad'}]}),
  reply({items:Array.from({length:51},item)}),
  reply({unexpected:[]}),
  new Response(null,{status:401}),
  new Response(null,{status:302}),
  new Response('no',{status:200,headers:{'content-type':'text/plain'}}),
  new Response('{}',{status:200,headers:{'content-type':'application/json','content-length':'99999'}}),
 ]){
  await assert.rejects(fetchTrustedModerationCases({...req,transport:async()=>response}),
   ModerationTransportUnavailable);
 }
});
test('admin transport remains unmounted, server-only and feature-disabled',()=>{
 const code=readFileSync(new URL('../src/lib/moderation-api.server.ts',import.meta.url),'utf8');
 const page=readFileSync(new URL('../src/app/page.tsx',import.meta.url),'utf8');
 assert.match(code,/import 'server-only'/);
 assert.match(code,/SERVICES_ADMIN_MODERATION_HTTP/);
 assert.doesNotMatch(page,/getModerationCasesForVerifiedAdmin/);
});

test('transport fails closed when a malformed stream yields a non-byte chunk',async()=>{
 let cancelled=false;
 const stream={
  getReader(){return {
   async read(){return {done:false,value:'private-data'};},
   async cancel(){cancelled=true;},
   releaseLock(){},
  };},
 };
 const response={status:200,headers:new Headers({'content-type':'application/json'}),body:stream};
 await assert.rejects(fetchTrustedModerationCases({...req,transport:async()=>response}),
  ModerationTransportUnavailable);
 assert.equal(cancelled,true);
});

test('transport cancels oversized streaming responses without exposing content',async()=>{
 let cancelled=false;
 const stream={
  getReader(){let reads=0;return {
   async read(){reads++;return {done:false,value:new Uint8Array(reads===1?8192:8193)};},
   async cancel(){cancelled=true;},
   releaseLock(){},
  };},
 };
 const response={status:200,headers:new Headers({'content-type':'application/json'}),body:stream};
 await assert.rejects(fetchTrustedModerationCases({...req,transport:async()=>response}),
  ModerationTransportUnavailable);
 assert.equal(cancelled,true);
});

test('transport rejects invalid UTF-8 response bytes',async()=>{
 const response=new Response(new Uint8Array([0xff,0xfe]),{
  status:200,headers:{'content-type':'application/json'},
 });
 await assert.rejects(fetchTrustedModerationCases({...req,transport:async()=>response}),
  ModerationTransportUnavailable);
});
