import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import ts from 'typescript';

const source=readFileSync(new URL('../src/lib/admin-mfa-exchange.server.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source.replace(/^import ['"]server-only['"];?\s*/m,'').replace(/^import \{adminBackendOrigin\} from '\.\/admin-backend\.server';\s*/m,`const adminBackendOrigin=(raw)=>typeof raw==='string'&&raw==='https://api.example.test'?raw:null;\n`),{
 compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022},
 reportDiagnostics:true,
});
assert.deepEqual(compiled.diagnostics?.filter(d=>d.category===ts.DiagnosticCategory.Error),[]);
const {validatePrivateMfaSession,exchangeTrustedAdminMfa}=await import('data:text/javascript;base64,'+
 Buffer.from(compiled.outputText).toString('base64'));
const now=1_800_000_000_000;
const token=randomBytes(32).toString('base64url');
const valid=()=>({session_token:token,expires_at:now+60_000});

test('private MFA exchange accepts only canonical bounded backend session',()=>{
 assert.deepEqual(validatePrivateMfaSession(valid(),now),{
  token,expiresAt:now+60_000,
 });
 assert.deepEqual(validatePrivateMfaSession({
  ...valid(),expires_at:now+15*60*1000,
 },now),{token,expiresAt:now+15*60*1000});
});

test('private MFA exchange rejects invalid token, expiry and extra fields',()=>{
 for(const invalid of [
  null,[],{},Object.assign(Object.create(null),valid()),
  {...valid(),email:'private@example.test'},
  {...valid(),session_token:'forged'},
  {...valid(),session_token:token+'='},
  {...valid(),expires_at:now},
  {...valid(),expires_at:now-1},
  {...valid(),expires_at:now+15*60*1000+1},
  {...valid(),expires_at:Infinity},
  {...valid(),expires_at:now+0.5},
  {session_token:token},
  {expires_at:now+1000},
 ]){
  assert.equal(validatePrivateMfaSession(invalid,now),null,JSON.stringify(invalid));
 }
 for(const clock of [-1,NaN,Infinity,now+0.5]){
  assert.equal(validatePrivateMfaSession(valid(),clock),null);
 }
});

test('private MFA exchange refuses getters without executing them',()=>{
 for(const field of ['session_token','expires_at']){
  let calls=0;
  const forged=valid();
  Object.defineProperty(forged,field,{enumerable:true,get(){
   calls++;throw Error('untrusted getter');
  }});
  assert.equal(validatePrivateMfaSession(forged,now),null);
  assert.equal(calls,0);
 }
 const withSymbol=valid();
 withSymbol[Symbol('hidden')]='secret';
 assert.equal(validatePrivateMfaSession(withSymbol,now),null);
});

test('private MFA transport remains disabled by default and does not fetch',async()=>{
 const prev=globalThis.fetch;
 const previousOrigin=process.env.SERVICES_BACKEND_INTERNAL_ORIGIN;
 const previousKey=process.env.ADMIN_MFA_BFF_KEY;
 const previousFlag=process.env.SERVICES_ADMIN_ENABLE_PRIVATE_MFA_EXCHANGE;
 try{
  process.env.SERVICES_BACKEND_INTERNAL_ORIGIN='https://api.example.test';
  process.env.ADMIN_MFA_BFF_KEY=randomBytes(32).toString('base64');
  delete process.env.SERVICES_ADMIN_ENABLE_PRIVATE_MFA_EXCHANGE;
  let calls=0;
  globalThis.fetch=async()=>{calls++;throw Error('should not fetch');};
  assert.equal(await exchangeTrustedAdminMfa(token,'123456',now),null);
  assert.equal(calls,0);
  process.env.SERVICES_ADMIN_ENABLE_PRIVATE_MFA_EXCHANGE='enabled';
  assert.equal(await exchangeTrustedAdminMfa(token,'bad',now),null);
  assert.equal(calls,0);
 }finally{
  globalThis.fetch=prev;
  for(const [key,value] of [
   ['SERVICES_BACKEND_INTERNAL_ORIGIN',previousOrigin],
   ['ADMIN_MFA_BFF_KEY',previousKey],
   ['SERVICES_ADMIN_ENABLE_PRIVATE_MFA_EXCHANGE',previousFlag],
  ]){
   if(value===undefined)delete process.env[key];else process.env[key]=value;
  }
 }
});

test('private MFA transport checks backend response and never returns raw response',async()=>{
 const prev=globalThis.fetch;
 const saved=Object.fromEntries(['SERVICES_BACKEND_INTERNAL_ORIGIN','ADMIN_MFA_BFF_KEY','SERVICES_ADMIN_ENABLE_PRIVATE_MFA_EXCHANGE'].map(k=>[k,process.env[k]]));
 try{
  process.env.SERVICES_BACKEND_INTERNAL_ORIGIN='https://api.example.test';
  const key=randomBytes(32).toString('base64');
  process.env.ADMIN_MFA_BFF_KEY=key;
  process.env.SERVICES_ADMIN_ENABLE_PRIVATE_MFA_EXCHANGE='enabled';
  let request;
  globalThis.fetch=async(url,options)=>{
   request={url,options};
   return new Response(JSON.stringify(valid()),{status:200,headers:{
    'cache-control':'private, no-store','content-type':'application/json',
   }});
  };
  assert.deepEqual(await exchangeTrustedAdminMfa(token,'123456',now),{
   token,expiresAt:now+60000,
  });
  assert.equal(request.url,'https://api.example.test/v1/admin/private/mfa/verify');
  assert.equal(request.options.headers['X-Services-Admin-Mfa-Key'],key);
  assert.equal(request.options.credentials,'omit');
  assert.equal(request.options.redirect,'error');
  assert.deepEqual(JSON.parse(request.options.body),{
   account_session_token:token,totp_code:'123456',
  });
  for(const headers of [
   {'cache-control':'public, no-store','content-type':'application/json'},
   {'cache-control':'private, no-store','content-type':'text/html'},
  ]){
   globalThis.fetch=async()=>new Response(JSON.stringify(valid()),{status:200,headers});
   assert.equal(await exchangeTrustedAdminMfa(token,'123456',now),null);
  }
  globalThis.fetch=async()=>new Response(JSON.stringify(valid()),{
   status:401,headers:{'cache-control':'private, no-store','content-type':'application/json'},
  });
  assert.equal(await exchangeTrustedAdminMfa(token,'123456',now),null);
 }finally{
  globalThis.fetch=prev;
  for(const [key,value] of Object.entries(saved)){
   if(value===undefined)delete process.env[key];else process.env[key]=value;
  }
 }
});

test('private MFA transport refuses reused service credentials before network access',async()=>{
 const names=[
  'SERVICES_BACKEND_INTERNAL_ORIGIN','ADMIN_MFA_BFF_KEY',
  'SERVICES_ADMIN_ENABLE_PRIVATE_MFA_EXCHANGE',
  'SERVICES_ADMIN_COOKIE_KEY','PLATFORM_ADMIN_SESSION_HMAC_KEY',
  'ACCOUNT_SESSION_HMAC_KEY','ACCOUNT_LOGIN_BFF_KEY',
 ];
 const saved=Object.fromEntries(names.map(name=>[name,process.env[name]]));
 const previousFetch=globalThis.fetch;
 try{
  const key=randomBytes(32).toString('base64');
  process.env.SERVICES_BACKEND_INTERNAL_ORIGIN='https://api.example.test';
  process.env.ADMIN_MFA_BFF_KEY=key;
  process.env.SERVICES_ADMIN_ENABLE_PRIVATE_MFA_EXCHANGE='enabled';
  for(const peer of names.slice(3))delete process.env[peer];
  let calls=0;
  globalThis.fetch=async()=>{
   calls++;
   return new Response(JSON.stringify(valid()),{
    headers:{'cache-control':'private, no-store','content-type':'application/json'},
   });
  };
  for(const peer of names.slice(3)){
   process.env[peer]=key;
   assert.equal(await exchangeTrustedAdminMfa(token,'123456',now),null,peer);
   delete process.env[peer];
  }
  assert.equal(calls,0);
  assert.deepEqual(await exchangeTrustedAdminMfa(token,'123456',now),{
   token,expiresAt:now+60000,
  });
  assert.equal(calls,1);
 }finally{
  globalThis.fetch=previousFetch;
  for(const [name,value] of Object.entries(saved)){
   if(value===undefined)delete process.env[name];else process.env[name]=value;
  }
 }
});

test('private MFA wire contract rejects duplicate JSON keys and ambiguous responses',async()=>{
 const names=['SERVICES_BACKEND_INTERNAL_ORIGIN','ADMIN_MFA_BFF_KEY','SERVICES_ADMIN_ENABLE_PRIVATE_MFA_EXCHANGE'];
 const saved=Object.fromEntries(names.map(name=>[name,process.env[name]]));
 const previousFetch=globalThis.fetch;
 try{
  process.env.SERVICES_BACKEND_INTERNAL_ORIGIN='https://api.example.test';
  process.env.ADMIN_MFA_BFF_KEY=randomBytes(32).toString('base64');
  process.env.SERVICES_ADMIN_ENABLE_PRIVATE_MFA_EXCHANGE='enabled';
  const send=async(body,headers={})=>{
   globalThis.fetch=async()=>new Response(body,{
    status:200,headers:{
     'cache-control':'private, no-store',
     'content-type':'application/json',
     ...headers,
    },
   });
   return exchangeTrustedAdminMfa(token,'123456',now);
  };
  for(const body of [
   '{"session_token":"'+token+'","session_token":"'+token+'","expires_at":'+(now+60000)+'}',
   '{"session_token":"'+token+'","expires_at":'+(now+60000)+',"expires_at":'+(now+60000)+'}',
   '{"session_token":"'+token+'","expires_at":'+(now+60000)+',"extra":true}',
   '{"session_token":"'+token+'","expires_at":1e15}',
   '{"session_token":"'+token+'","expires_at":'+(now+60000)+',"nested":{}}',
  ]){
   assert.equal(await send(body),null,body);
  }
  assert.deepEqual(await send('{"expires_at":'+(now+60000)+',"session_token":"'+token+'"}'),{
   token,expiresAt:now+60000,
  });
  assert.equal(await send(JSON.stringify(valid()),{'content-type':'application/json; charset=iso-8859-1'}),null);
  assert.equal(await send(JSON.stringify(valid()),{'content-range':'bytes 0-5/20'}),null);
  assert.equal(await send(JSON.stringify(valid()),{'content-length':'999'}),null);
 }finally{
  globalThis.fetch=previousFetch;
  for(const [name,value] of Object.entries(saved)){
   if(value===undefined)delete process.env[name];else process.env[name]=value;
  }
 }
});
