import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import ts from 'typescript';

const raw=readFileSync(new URL('../src/lib/admin-mfa-session.server.ts',import.meta.url),'utf8');
const source=raw.replace(/^import 'server-only';\s*/m,'')
 .replace(/^import \{exchangeTrustedAdminMfa\} from '\.\/admin-mfa-exchange.server';\s*/m,'')
 .replace(/^import \{ADMIN_SESSION_COOKIE,sealAdminSession\} from '\.\/admin-session.server';\s*/m,'');
const js=ts.transpileModule(source,{
 compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022},
}).outputText;
const now=1_800_000_000_000;
const token=randomBytes(32).toString('base64url');
let grant=null,called=0,sealed=0,failSeal=false;
const setup=`const ADMIN_SESSION_COOKIE='__Host-services-admin-session';\nconst exchangeTrustedAdminMfa=async()=>{globalThis.__mfaTest.called++;return globalThis.__mfaTest.grant;};
const sealAdminSession=(token,expiry,now)=>{globalThis.__mfaTest.sealed++;if(globalThis.__mfaTest.failSeal)throw Error('unavailable');return 'v1.sealed.'+expiry;};`;
globalThis.__mfaTest={grant,called,sealed,failSeal};
const {prepareAdminMfaCookie,adminMfaCookieDirective}=await import('data:text/javascript;base64,'+
 Buffer.from(setup+js).toString('base64'));
const state=globalThis.__mfaTest;

test('MFA cookie handoff never seals a failed exchange',async()=>{
 state.grant=null;state.called=0;state.sealed=0;
 assert.equal(await prepareAdminMfaCookie(token,'123456',now),null);
 assert.equal(state.called,1);
 assert.equal(state.sealed,0);
 assert.equal(await prepareAdminMfaCookie(token,'123456',NaN),null);
 assert.equal(state.called,1);
});

test('MFA cookie handoff seals a verified grant without returning bearer',async()=>{
 state.grant={token,expiresAt:now+61_999};
 state.sealed=0;
 const result=await prepareAdminMfaCookie(token,'123456',now);
 assert.deepEqual(result,{sealedValue:'v1.sealed.'+(now+61_999),maxAgeSeconds:61});
 assert.equal(JSON.stringify(result).includes(token),false);
 assert.equal(state.sealed,1);
});

test('MFA cookie handoff rejects sub-second, oversized and unavailable grants',async()=>{
 state.sealed=0;
 for(const expiresAt of [now,now+999,now+900_001]){
  state.grant={token,expiresAt};
  assert.equal(await prepareAdminMfaCookie(token,'123456',now),null);
 }
 assert.equal(state.sealed,0);
 state.grant={token,expiresAt:now+60_000};
 state.failSeal=true;
 assert.equal(await prepareAdminMfaCookie(token,'123456',now),null);
 state.failSeal=false;
});

test('MFA cookie directive enforces __Host-, HttpOnly, Secure and strict SameSite',()=>{
 const value='v1.'+'A'.repeat(16)+'.'+'B'.repeat(20)+'.'+'C'.repeat(22);
 const directive=adminMfaCookieDirective({sealedValue:value,maxAgeSeconds:60});
 assert.deepEqual(directive,{
  name:'__Host-services-admin-session',
  value,
  options:{httpOnly:true,secure:true,sameSite:'strict',path:'/',maxAge:60},
 });
 for(const age of [0,-1,901,1.5,Infinity,NaN,'60']){
  assert.equal(adminMfaCookieDirective({sealedValue:value,maxAgeSeconds:age}),null);
 }
 for(const malformed of [
  null,[],{},Object.assign(Object.create(null),{sealedValue:value,maxAgeSeconds:60}),
  {sealedValue:value,maxAgeSeconds:60,domain:'example.test'},
  {sealedValue:'raw-bearer',maxAgeSeconds:60},
  {sealedValue:value+'=',maxAgeSeconds:60},
 ]){
  assert.equal(adminMfaCookieDirective(malformed),null);
 }
 let accessed=0;
 const malicious={maxAgeSeconds:60};
 Object.defineProperty(malicious,'sealedValue',{enumerable:true,get(){accessed++;throw Error('getter');}});
 assert.equal(adminMfaCookieDirective(malicious),null);
 assert.equal(accessed,0);
});
