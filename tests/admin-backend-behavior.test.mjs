import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomUUID,randomBytes} from 'node:crypto';
import ts from 'typescript';

// Exercise the actual TypeScript transport, not a duplicate test implementation.
// This file has no runtime imports, so it can be transpiled into an ESM data URL.
const source=readFileSync(new URL('../src/lib/admin-backend.server.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{
 compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022},
 reportDiagnostics:true,
});
assert.deepEqual(compiled.diagnostics?.filter(d=>d.category===ts.DiagnosticCategory.Error),[]);
const {validateModerationPayload,adminBackendOrigin,fetchAdminModerationCases,revokeAdminBackendSession}=await import(
 'data:text/javascript;base64,'+Buffer.from(compiled.outputText).toString('base64')
);

const row=()=>({
 id:randomUUID(),subjectKind:'review',state:'triage',
 createdAt:'2026-11-10T12:00:00.000Z',
});

test('live validator accepts exact redacted payload and strips no fields',()=>{
 const item=row();
 assert.deepEqual(validateModerationPayload({items:[item]}),{items:[item]});
 assert.deepEqual(validateModerationPayload({items:[]}),{items:[]});
});

test('live validator rejects extra fields at envelope and item level',()=>{
 const item=row();
 for(const value of [
  {items:[item],token:'secret'},
  {items:[{...item,email:'private@example.test'}]},
  {items:[{...item,subjectKind:'review',metadata:{secret:true}}]},
  {items:[Object.assign(Object.create(null),item)]},
  Object.assign(Object.create(null),{items:[item]}),
  {items:[{id:item.id,subjectKind:item.subjectKind,state:item.state}]},
  {items:[item,{...item,id:item.id.toUpperCase()}]},
  {items:Array.from({length:51},row)},
 ])assert.equal(validateModerationPayload(value),null);
});

test('live validator rejects invalid canonical timestamps and enum values',()=>{
 const item=row();
 for(const value of [
  {...item,createdAt:'2026-11-10T12:00:00Z'},
  {...item,createdAt:'2026-02-30T12:00:00.000Z'},
  {...item,subjectKind:'user'},
  {...item,state:'approved'},
  {...item,id:'not-a-uuid'},
 ])assert.equal(validateModerationPayload({items:[value]}),null);
});

test('live backend origin parser refuses path, credentials and normalization',()=>{
 assert.equal(adminBackendOrigin('https://api.example.test'),'https://api.example.test');
 assert.equal(adminBackendOrigin('https://api.example.test/'),'https://api.example.test');
 for(const value of [
  'https://api.example.test/path',
  'https://user:password@api.example.test',
  'https://api.example.test?x=1',
  'https://API.EXAMPLE.TEST',
  'https://api.example.test:443',
  'http://api.example.test',
 ])assert.equal(adminBackendOrigin(value),null,value);
});

const token=randomBytes(32).toString('base64url');
const response=(payload,options={})=>new Response(
 JSON.stringify(payload),{
  status:options.status??200,
  headers:{
   'content-type':options.contentType??'application/json',
   'cache-control':options.cacheControl??'private, no-store',
  },
 }
);

test('live moderation transport sends a private authorized request and validates response',async()=>{
 const previousOrigin=process.env.SERVICES_BACKEND_INTERNAL_ORIGIN;
 const previousFetch=globalThis.fetch;
 let observed;
 try{
  process.env.SERVICES_BACKEND_INTERNAL_ORIGIN='https://api.example.test';
  const item=row();
  globalThis.fetch=async(url,options)=>{
   observed={url,options};
   return response({items:[item]});
  };
  assert.deepEqual(await fetchAdminModerationCases(token),{items:[item]});
  assert.equal(observed.url,'https://api.example.test/v1/admin/moderation/cases');
  assert.equal(observed.options.method,'GET');
  assert.equal(observed.options.headers.Authorization,'Bearer '+token);
  assert.equal(observed.options.cache,'no-store');
  assert.equal(observed.options.redirect,'error');
  assert.equal(observed.options.credentials,'omit');
 }finally{
  globalThis.fetch=previousFetch;
  if(previousOrigin===undefined)delete process.env.SERVICES_BACKEND_INTERNAL_ORIGIN;
  else process.env.SERVICES_BACKEND_INTERNAL_ORIGIN=previousOrigin;
 }
});

test('live moderation transport fails closed on cacheable, malformed and unauthorized responses',async()=>{
 const previousOrigin=process.env.SERVICES_BACKEND_INTERNAL_ORIGIN;
 const previousFetch=globalThis.fetch;
 try{
  process.env.SERVICES_BACKEND_INTERNAL_ORIGIN='https://api.example.test';
  const item=row();
  for(const upstream of [
   response({items:[item]},{cacheControl:'public, max-age=3600'}),
   response({items:[item]},{status:401}),
   response({items:[{...item,email:'private@example.test'}]}),
   response({items:[]},{contentType:'text/html'}),
  ]){
   globalThis.fetch=async()=>upstream;
   assert.equal(await fetchAdminModerationCases(token),null);
  }
  let called=false;
  globalThis.fetch=async()=>{called=true;throw Error('unexpected network call');};
  assert.equal(await fetchAdminModerationCases('invalid'),null);
  assert.equal(called,false);
 }finally{
  globalThis.fetch=previousFetch;
  if(previousOrigin===undefined)delete process.env.SERVICES_BACKEND_INTERNAL_ORIGIN;
  else process.env.SERVICES_BACKEND_INTERNAL_ORIGIN=previousOrigin;
 }
});

test('live transport rejects oversized streams, invalid UTF-8 and UTF-8 BOM',async()=>{
 const previousOrigin=process.env.SERVICES_BACKEND_INTERNAL_ORIGIN;
 const previousFetch=globalThis.fetch;
 try{
  process.env.SERVICES_BACKEND_INTERNAL_ORIGIN='https://api.example.test';
  const valid=new TextEncoder().encode(JSON.stringify({items:[row()]}));
  const bom=Uint8Array.from([0xef,0xbb,0xbf,...valid]);
  const invalid=Uint8Array.from([0xff,...valid]);
  for(const bytes of [bom,invalid,new Uint8Array(32769)]){
   let cancelled=false;
   const stream=new ReadableStream({
    start(controller){controller.enqueue(bytes);},
    cancel(){cancelled=true;},
   });
   globalThis.fetch=async()=>new Response(stream,{
    status:200,headers:{
     'content-type':'application/json',
     'cache-control':'private, no-store',
    },
   });
   assert.equal(await fetchAdminModerationCases(token),null);
   if(bytes.length>32768)assert.equal(cancelled,true);
  }
 }finally{
  globalThis.fetch=previousFetch;
  if(previousOrigin===undefined)delete process.env.SERVICES_BACKEND_INTERNAL_ORIGIN;
  else process.env.SERVICES_BACKEND_INTERNAL_ORIGIN=previousOrigin;
 }
});

test('backend logout confirms only a non-cacheable HTTP 200 response',async()=>{
 const previousOrigin=process.env.SERVICES_BACKEND_INTERNAL_ORIGIN;
 const previousFetch=globalThis.fetch;
 try{
  process.env.SERVICES_BACKEND_INTERNAL_ORIGIN='https://api.example.test';
  let observed;
  globalThis.fetch=async(url,options)=>{
   observed={url,options};
   return new Response('{}',{status:200,headers:{'cache-control':'private, no-store'}});
  };
  assert.equal(await revokeAdminBackendSession(token),true);
  assert.equal(observed.url,'https://api.example.test/v1/admin/session/logout');
  assert.equal(observed.options.method,'POST');
  assert.equal(observed.options.headers.Authorization,'Bearer '+token);
  assert.equal(observed.options.cache,'no-store');
  assert.equal(observed.options.credentials,'omit');
  assert.equal(observed.options.redirect,'error');
  for(const options of [
   {status:200,headers:{'cache-control':'public, max-age=60'}},
   {status:202,headers:{'cache-control':'no-store'}},
   {status:401,headers:{'cache-control':'no-store'}},
  ]){
   globalThis.fetch=async()=>new Response('{}',options);
   assert.equal(await revokeAdminBackendSession(token),false);
  }
  let called=false;
  globalThis.fetch=async()=>{called=true;throw Error('unexpected call');};
  assert.equal(await revokeAdminBackendSession('invalid'),false);
  assert.equal(called,false);
 }finally{
  globalThis.fetch=previousFetch;
  if(previousOrigin===undefined)delete process.env.SERVICES_BACKEND_INTERNAL_ORIGIN;
  else process.env.SERVICES_BACKEND_INTERNAL_ORIGIN=previousOrigin;
 }
});
