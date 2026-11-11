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
