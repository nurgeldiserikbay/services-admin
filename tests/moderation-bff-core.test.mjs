import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {readAuthorizedModerationPage} from '../src/lib/moderation-bff-core.mjs';

const origin='https://api.example.test';
const token=randomBytes(32).toString('base64url');
const row={id:randomUUID(),subjectKind:'review',state:'triage',
 createdAt:'2026-11-10T12:00:00.000Z'};
const reply=(payload,status=200,type='application/json')=>({
 status,headers:{get:(key)=>key==='content-type'?type:null},
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
  reply({items:[]},401),reply({items:[]},200,'text/html'),
  reply({items:[{...row,email:'private@example.test'}]}),
  reply({items:[],token:'leak'}),reply({items:Array.from({length:51},()=>row)}),
  {status:200,headers:{get:(k)=>k==='content-type'?'application/json':'40000'},
   text:async()=>JSON.stringify({items:[]})},
 ]){
  await assert.rejects(readAuthorizedModerationPage({
   backendOrigin:origin,adminToken:token,fetchImpl:async()=>response,
  }),/admin_read_unavailable/);
 }
});
