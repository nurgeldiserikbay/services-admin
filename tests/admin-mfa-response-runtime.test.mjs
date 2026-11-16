import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';

const source=readFileSync(new URL('../src/lib/admin-mfa-response.server.ts',import.meta.url),'utf8')
 .replace(/^import 'server-only';\s*/m,'')
 .replace(/^import \{NextResponse\} from 'next\/server';\s*/m,'')
 .replace(/^import \{adminMfaCookieDirective,prepareAdminMfaCookie\} from '\.\/admin-mfa-session.server';\s*/m,'');
const compiled=ts.transpileModule(source,{
 compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022},
}).outputText;
const fixture=`
const NextResponse={json(body,init){
 const cookies=[];
 return {body,init,cookies:{set(...args){cookies.push(args)},entries:cookies}};
}};
const prepareAdminMfaCookie=async()=>globalThis.__responseFixture.prepared;
const adminMfaCookieDirective=(value)=>value&&globalThis.__responseFixture.directive;
`;
globalThis.__responseFixture={prepared:null,directive:null};
const {buildTrustedAdminMfaResponse}=await import('data:text/javascript;base64,'+
 Buffer.from(fixture+compiled).toString('base64'));

test('MFA response fails closed without a verified session and emits no cookie',async()=>{
 globalThis.__responseFixture.prepared=null;
 globalThis.__responseFixture.directive=null;
 const response=await buildTrustedAdminMfaResponse('secret','123456');
 assert.equal(response.init.status,503);
 assert.deepEqual(response.body,{code:'AUTH_UNAVAILABLE'});
 assert.deepEqual(response.cookies.entries,[]);
 assert.match(response.init.headers['Cache-Control'],/no-store/);
});

test('MFA response uses only secure host cookie and never serializes bearer',async()=>{
 const directive={
  name:'__Host-services-admin-session',
  value:'v1.sealed-opaque',
  options:{httpOnly:true,secure:true,sameSite:'strict',path:'/',maxAge:60},
 };
 globalThis.__responseFixture.prepared={sealedValue:directive.value,maxAgeSeconds:60};
 globalThis.__responseFixture.directive=directive;
 const response=await buildTrustedAdminMfaResponse('sensitive-bearer','123456');
 assert.equal(response.init.status,200);
 assert.deepEqual(response.body,{status:'authenticated'});
 assert.deepEqual(response.cookies.entries,[[directive.name,directive.value,directive.options]]);
 assert.equal(JSON.stringify(response.body).includes('sensitive-bearer'),false);
 assert.equal(JSON.stringify(response.body).includes(directive.value),false);
 assert.equal(response.init.headers['Referrer-Policy'],'no-referrer');
 assert.equal(response.init.headers['X-Robots-Tag'],'noindex, nofollow, noarchive');
});
