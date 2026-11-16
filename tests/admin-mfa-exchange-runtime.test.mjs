import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import ts from 'typescript';

const source=readFileSync(new URL('../src/lib/admin-mfa-exchange.server.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source.replace(/^import ['"]server-only['"];?\s*/m,''),{
 compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022},
 reportDiagnostics:true,
});
assert.deepEqual(compiled.diagnostics?.filter(d=>d.category===ts.DiagnosticCategory.Error),[]);
const {validatePrivateMfaSession}=await import('data:text/javascript;base64,'+
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
