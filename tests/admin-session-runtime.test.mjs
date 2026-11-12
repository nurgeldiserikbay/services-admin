import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {readFileSync} from 'node:fs';
import ts from 'typescript';

const source=readFileSync(new URL('../src/lib/admin-session.server.ts',import.meta.url),'utf8')
  .replace(/^import 'server-only';\s*/,'');
const js=ts.transpileModule(source,{compilerOptions:{
  module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,
}}).outputText;
const {sealAdminSession,openAdminSession,readUniqueAdminCookie,ADMIN_SESSION_COOKIE}=
  await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const token='A'.repeat(42)+'E';
const now=1_800_000_000_000;
const previous=process.env.SERVICES_ADMIN_COOKIE_KEY;

test('admin session uses host-only cookie name and authenticated roundtrip',()=>{
 try{
  process.env.SERVICES_ADMIN_COOKIE_KEY=randomBytes(32).toString('base64');
  assert.match(ADMIN_SESSION_COOKIE,/^__Host-/);
  const cookie=sealAdminSession(token,now+60_000,now);
  assert.equal(cookie.startsWith('v1.'),true);
  assert.equal(cookie.includes(token),false);
  assert.equal(openAdminSession(cookie,now),token);
  assert.equal(openAdminSession(cookie,now+60_000),null);
  const tampered=cookie.slice(0,-1)+(cookie.endsWith('A')?'B':'A');
  assert.equal(openAdminSession(tampered,now),null);
  // A 16-byte GCM tag has two padding bits: alternate final characters
  // must never be accepted even if they decode to the same bytes.
  const parts=cookie.split('.');
  const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const last=alphabet.indexOf(parts[3].at(-1));
  assert.notEqual(last,-1);
  const alias=parts[3].slice(0,-1)+alphabet[last^1];
  assert.equal(Buffer.from(alias,'base64url').equals(Buffer.from(parts[3],'base64url')),true);
  assert.equal(openAdminSession([parts[0],parts[1],parts[2],alias].join('.'),now),null);
  assert.equal(openAdminSession(cookie.slice(0,10),now),null);
 }finally{
  if(previous===undefined)delete process.env.SERVICES_ADMIN_COOKIE_KEY;
  else process.env.SERVICES_ADMIN_COOKIE_KEY=previous;
 }
});

test('admin session fails closed on invalid key, bearer and expiry',()=>{
 try{
  delete process.env.SERVICES_ADMIN_COOKIE_KEY;
  assert.throws(()=>sealAdminSession(token,now+1000,now));
  assert.equal(openAdminSession('anything',now),null);
  process.env.SERVICES_ADMIN_COOKIE_KEY=randomBytes(32).toString('base64');
  for(const expiry of [now,now-1,now+15*60*1000+1]){
    assert.throws(()=>sealAdminSession(token,expiry,now));
  }
  assert.throws(()=>sealAdminSession('invalid',now+1000,now));
  const cookie=sealAdminSession(token,now+1000,now);
  process.env.SERVICES_ADMIN_COOKIE_KEY=randomBytes(32).toString('base64');
  assert.equal(openAdminSession(cookie,now),null);
 }finally{
  if(previous===undefined)delete process.env.SERVICES_ADMIN_COOKIE_KEY;
  else process.env.SERVICES_ADMIN_COOKIE_KEY=previous;
 }
});


test('duplicate and malformed admin session cookie headers are denied',()=>{
 const name=ADMIN_SESSION_COOKIE;
 assert.equal(readUniqueAdminCookie(name+'=opaque','opaque'),'opaque');
 assert.equal(readUniqueAdminCookie('other=1; '+name+'=opaque','opaque'),'opaque');
 assert.equal(readUniqueAdminCookie(name+'=one; '+name+'=two','two'),null);
 assert.equal(readUniqueAdminCookie(name+'=one; '+name+'=two','one'),null);
 assert.equal(readUniqueAdminCookie(name+'-suffix=one','one'),null);
 assert.equal(readUniqueAdminCookie(name+'=one',undefined),null);
 assert.equal(readUniqueAdminCookie(null,'one'),null);
 assert.equal(readUniqueAdminCookie('x'.repeat(8193),'one'),null);
});
