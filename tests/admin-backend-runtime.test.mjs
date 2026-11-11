import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import ts from 'typescript';

// Execute the real TypeScript implementation rather than matching its source text.
const source=readFileSync(new URL('../src/lib/admin-backend.server.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {adminBackendOrigin,validateModerationPayload,fetchAdminModerationCases}=
  await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));

const id='22222222-2222-4222-8222-222222222222';
const valid={id,subjectKind:'review',state:'triage',createdAt:'2026-11-11T10:00:00.000Z'};
const token='A'.repeat(42)+'E';

test('admin origin parser rejects credentials, insecure remote origins and URL paths',()=>{
  assert.equal(adminBackendOrigin('https://backend.example.kz'),'https://backend.example.kz');
  assert.equal(adminBackendOrigin('http://localhost:3100'),'http://localhost:3100');
  for(const url of ['http://backend.example.kz','https://user:pass@backend.example.kz',
    'https://backend.example.kz/v1','https://backend.example.kz/?x=1',
    'https://backend.example.kz/#hash','file:///etc/passwd','not-a-url']){
    assert.equal(adminBackendOrigin(url),null,url);
  }
});

test('admin backend origin requires HTTPS in production, including loopback',()=>{
  const previous=process.env.NODE_ENV;
  try{
    process.env.NODE_ENV='production';
    for(const origin of [
      'http://localhost:3100','http://127.0.0.1:3100','http://[::1]:3100',
      'http://backend.example.kz',
    ])assert.equal(adminBackendOrigin(origin),null,origin);
    assert.equal(adminBackendOrigin('https://backend.example.kz'),
      'https://backend.example.kz');
    process.env.NODE_ENV='development';
    assert.equal(adminBackendOrigin('http://localhost:3100'),
      'http://localhost:3100');
  }finally{
    if(previous===undefined)delete process.env.NODE_ENV;
    else process.env.NODE_ENV=previous;
  }
});

test('moderation response validator strips unknown fields and denies malformed rows',()=>{
  assert.deepEqual(validateModerationPayload({items:[{...valid,privateContact:'secret'}]}),{items:[valid]});
  assert.deepEqual(validateModerationPayload({items:[]}),{items:[]});
  for(const item of [{...valid,createdAt:'2026-02-30T10:00:00.000Z'},
    {...valid,state:'approved'}, {...valid,id:'bad-id'}]){
    assert.equal(validateModerationPayload({items:[item]}),null);
  }
  assert.equal(validateModerationPayload({items:[valid,valid]}),null);
  assert.equal(validateModerationPayload({items:Array.from({length:51},()=>valid)}),null);
});

test('moderation transport denies oversized streaming responses before EOF',async()=>{
  const originalFetch=globalThis.fetch;
  const originalOrigin=process.env.SERVICES_BACKEND_INTERNAL_ORIGIN;
  try{
    process.env.SERVICES_BACKEND_INTERNAL_ORIGIN='https://backend.example.kz';
    let canceled=false;
    globalThis.fetch=async()=>new Response(new ReadableStream({
      start(controller){
        controller.enqueue(new Uint8Array(33_000));
      },
      cancel(){canceled=true;}
    }),{headers:{'content-type':'application/json'}});
    assert.equal(await fetchAdminModerationCases(token),null);
    assert.equal(canceled,true);
  }finally{
    globalThis.fetch=originalFetch;
    if(originalOrigin===undefined)delete process.env.SERVICES_BACKEND_INTERNAL_ORIGIN;
    else process.env.SERVICES_BACKEND_INTERNAL_ORIGIN=originalOrigin;
  }
});

test('moderation transport forwards canonical proof only to configured backend',async()=>{
  const originalFetch=globalThis.fetch;
  const originalOrigin=process.env.SERVICES_BACKEND_INTERNAL_ORIGIN;
  try{
    process.env.SERVICES_BACKEND_INTERNAL_ORIGIN='https://backend.example.kz';
    let calls=0;
    globalThis.fetch=async(url,options)=>{
      calls++;
      assert.equal(url,'https://backend.example.kz/v1/admin/moderation/cases');
      assert.equal(options.headers.Authorization,'Bearer '+token);
      assert.equal(options.cache,'no-store');
      assert.equal(options.credentials,'omit');
      assert.equal(options.redirect,'error');
      return new Response(JSON.stringify({items:[{...valid,privateContact:'secret'}]}),
        {headers:{'content-type':'application/json'}});
    };
    assert.equal(await fetchAdminModerationCases('bad'),null);
    assert.equal(calls,0);
    assert.deepEqual(await fetchAdminModerationCases(token),{items:[valid]});
    assert.equal(calls,1);
  }finally{
    globalThis.fetch=originalFetch;
    if(originalOrigin===undefined)delete process.env.SERVICES_BACKEND_INTERNAL_ORIGIN;
    else process.env.SERVICES_BACKEND_INTERNAL_ORIGIN=originalOrigin;
  }
});

test('moderation transport fails closed on invalid content types, responses and JSON',async()=>{
  const originalFetch=globalThis.fetch;
  const originalOrigin=process.env.SERVICES_BACKEND_INTERNAL_ORIGIN;
  try{
    process.env.SERVICES_BACKEND_INTERNAL_ORIGIN='https://backend.example.kz';
    const responses=[
      new Response('<html>error</html>',{headers:{'content-type':'text/html'}}),
      new Response('{invalid',{headers:{'content-type':'application/json'}}),
      new Response(JSON.stringify({items:[{...valid,state:'unknown'}]}),
        {headers:{'content-type':'application/json'}}),
      new Response(JSON.stringify({items:[valid]}),{status:403,
        headers:{'content-type':'application/json'}}),
      new Response(JSON.stringify({items:[valid]}),{status:206,
        headers:{'content-type':'application/json'}}),
      new Response(JSON.stringify({items:[valid]}),{headers:{
        'content-type':'application/json','content-length':'999999'}}),
    ];
    for(const response of responses){
      globalThis.fetch=async()=>response;
      assert.equal(await fetchAdminModerationCases(token),null);
    }
  }finally{
    globalThis.fetch=originalFetch;
    if(originalOrigin===undefined)delete process.env.SERVICES_BACKEND_INTERNAL_ORIGIN;
    else process.env.SERVICES_BACKEND_INTERNAL_ORIGIN=originalOrigin;
  }
});

test('moderation transport rejects malformed stream chunks and invalid UTF-8',async()=>{
  const originalFetch=globalThis.fetch;
  const originalOrigin=process.env.SERVICES_BACKEND_INTERNAL_ORIGIN;
  try{
    process.env.SERVICES_BACKEND_INTERNAL_ORIGIN='https://backend.example.kz';
    const malformed=new ReadableStream({start(controller){
      controller.enqueue('not a byte chunk');
      controller.close();
    }});
    const invalidUtf8=new ReadableStream({start(controller){
      controller.enqueue(new Uint8Array([0xff,0xfe]));
      controller.close();
    }});
    for(const body of [malformed,invalidUtf8]){
      globalThis.fetch=async()=>({status:200,headers:new Headers({'content-type':'application/json'}),body});
      assert.equal(await fetchAdminModerationCases(token),null);
    }
  }finally{
    globalThis.fetch=originalFetch;
    if(originalOrigin===undefined)delete process.env.SERVICES_BACKEND_INTERNAL_ORIGIN;
    else process.env.SERVICES_BACKEND_INTERNAL_ORIGIN=originalOrigin;
  }
});

test('moderation transport cancels upstream on malformed chunks',async()=>{
  const originalFetch=globalThis.fetch;
  const originalOrigin=process.env.SERVICES_BACKEND_INTERNAL_ORIGIN;
  try{
    process.env.SERVICES_BACKEND_INTERNAL_ORIGIN='https://backend.example.kz';
    let canceled=false;
    globalThis.fetch=async()=>({status:200,headers:new Headers({'content-type':'application/json'}),body:new ReadableStream({
      start(controller){controller.enqueue('invalid byte chunk');},
      cancel(){canceled=true;}
    })});
    assert.equal(await fetchAdminModerationCases(token),null);
    assert.equal(canceled,true);
  }finally{
    globalThis.fetch=originalFetch;
    if(originalOrigin===undefined)delete process.env.SERVICES_BACKEND_INTERNAL_ORIGIN;
    else process.env.SERVICES_BACKEND_INTERNAL_ORIGIN=originalOrigin;
  }
});

test('moderation payload accepts exactly 50 distinct records and rejects case-insensitive duplicates',()=>{
  const items=Array.from({length:50},(_,index)=>({
    ...valid,id:'22222222-2222-4222-8222-'+(index+1).toString(16).padStart(12,'0'),
  }));
  assert.equal(validateModerationPayload({items})?.items.length,50);
  assert.equal(validateModerationPayload({items:[valid,{...valid,id:id.toUpperCase()}]}),null);
});

test('moderation transport denies network errors without disclosing backend details',async()=>{
  const originalFetch=globalThis.fetch;
  const originalOrigin=process.env.SERVICES_BACKEND_INTERNAL_ORIGIN;
  try{
    process.env.SERVICES_BACKEND_INTERNAL_ORIGIN='https://backend.example.kz';
    globalThis.fetch=async()=>{throw new Error('private backend failure');};
    assert.equal(await fetchAdminModerationCases(token),null);
  }finally{
    globalThis.fetch=originalFetch;
    if(originalOrigin===undefined)delete process.env.SERVICES_BACKEND_INTERNAL_ORIGIN;
    else process.env.SERVICES_BACKEND_INTERNAL_ORIGIN=originalOrigin;
  }
});

test('moderation transport cancels rejected upstream responses before reading',async()=>{
  const originalFetch=globalThis.fetch;
  const originalOrigin=process.env.SERVICES_BACKEND_INTERNAL_ORIGIN;
  try{
    process.env.SERVICES_BACKEND_INTERNAL_ORIGIN='https://backend.example.kz';
    for(const headers of [
      {'content-type':'text/html'},
      {'content-type':'application/json','content-length':'32769'},
    ]){
      let canceled=false;
      const body=new ReadableStream({cancel(){canceled=true;}});
      globalThis.fetch=async()=>({status:200,headers:new Headers(headers),body});
      assert.equal(await fetchAdminModerationCases(token),null);
      await Promise.resolve();
      assert.equal(canceled,true);
    }
  }finally{
    globalThis.fetch=originalFetch;
    if(originalOrigin===undefined)delete process.env.SERVICES_BACKEND_INTERNAL_ORIGIN;
    else process.env.SERVICES_BACKEND_INTERNAL_ORIGIN=originalOrigin;
  }
});

test('moderation transport rejects promptly even if upstream cancellation never settles',async()=>{
  const originalFetch=globalThis.fetch;
  const originalOrigin=process.env.SERVICES_BACKEND_INTERNAL_ORIGIN;
  try{
    process.env.SERVICES_BACKEND_INTERNAL_ORIGIN='https://backend.example.kz';
    let started=false;
    const body=new ReadableStream({
      cancel(){started=true;return new Promise(()=>{});}
    });
    globalThis.fetch=async()=>({
      status:403,headers:new Headers({'content-type':'application/json'}),body
    });
    assert.equal(await fetchAdminModerationCases(token),null);
    assert.equal(started,true);
  }finally{
    globalThis.fetch=originalFetch;
    if(originalOrigin===undefined)delete process.env.SERVICES_BACKEND_INTERNAL_ORIGIN;
    else process.env.SERVICES_BACKEND_INTERNAL_ORIGIN=originalOrigin;
  }
});

test('moderation transport rejects oversized body even if reader cancellation stalls',async()=>{
  const originalFetch=globalThis.fetch;
  const originalOrigin=process.env.SERVICES_BACKEND_INTERNAL_ORIGIN;
  try{
    process.env.SERVICES_BACKEND_INTERNAL_ORIGIN='https://backend.example.kz';
    let started=false;
    const body=new ReadableStream({
      start(controller){controller.enqueue(new Uint8Array(33_000));},
      cancel(){started=true;return new Promise(()=>{});}
    });
    globalThis.fetch=async()=>({
      status:200,headers:new Headers({'content-type':'application/json'}),body
    });
    assert.equal(await fetchAdminModerationCases(token),null);
    assert.equal(started,true);
  }finally{
    globalThis.fetch=originalFetch;
    if(originalOrigin===undefined)delete process.env.SERVICES_BACKEND_INTERNAL_ORIGIN;
    else process.env.SERVICES_BACKEND_INTERNAL_ORIGIN=originalOrigin;
  }
});
