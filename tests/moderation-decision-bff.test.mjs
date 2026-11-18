import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {validModerationDecisionBody,submitModerationDecision} from '../src/lib/moderation-decision-transport.mjs';

const caseId=randomUUID(),profileId=randomUUID();
const bearer=randomBytes(32).toString('base64url');
const body={profile_id:profileId,profile_version:2,decision:'APPROVE'};
const receipt={case_id:caseId,profile_id:profileId,profile_version:2,decision:'APPROVE'};
const response=(data,status=200,cache='private, no-store')=>new Response(JSON.stringify(data),{
 status,headers:{'Content-Type':'application/json','Cache-Control':cache},
});
test('decision transport sends server-only bearer and checks exact receipt',async()=>{
 assert.equal(await submitModerationDecision({origin:'https://backend.example.test',bearer,caseId,body,
  transport:async(url,options)=>{
   assert.equal(url,'https://backend.example.test/v1/admin/moderation/cases/'+caseId+'/decision');
   assert.equal(options.method,'POST');
   assert.equal(options.headers.Authorization,'Bearer '+bearer);
   assert.equal(options.credentials,'omit');
   assert.equal(options.redirect,'error');
   assert.equal(options.body,JSON.stringify(body));
   return response(receipt);
  },
 }),'decided');
 assert.equal(await submitModerationDecision({origin:'https://backend.example.test',bearer,caseId,body,
  transport:async()=>response({},409)}),'conflict');
 for(const invalid of [{...receipt,profile_version:3},{...receipt,decision:'REJECT'},{...receipt,extra:'leak'}]){
  assert.equal(await submitModerationDecision({origin:'https://backend.example.test',bearer,caseId,body,
   transport:async()=>response(invalid)}),'unavailable');
 }
 assert.equal(await submitModerationDecision({origin:'https://backend.example.test',bearer,caseId,body,
  transport:async()=>response(receipt,200,'public, no-store')}),'unavailable');
});
test('decision validator fails closed on malformed bodies',()=>{
 assert.equal(validModerationDecisionBody(body),true);
 for(const bad of [null,[],{}, {...body,extra:true},{...body,profile_version:0},
  {...body,profile_version:2.5},{...body,decision:'ALLOW'},
  {...body,profile_id:'invalid'},Object.assign(Object.create(null),body)]){
  assert.equal(validModerationDecisionBody(bad),false);
 }
});
test('default-off BFF uses signed session CSRF and strict same-origin preflight',()=>{
 const route=readFileSync(new URL('../src/app/api/moderation/cases/[id]/decision/route.ts',import.meta.url),'utf8');
 const csrf=readFileSync(new URL('../src/lib/admin-moderation-csrf.server.ts',import.meta.url),'utf8');
 const page=readFileSync(new URL('../src/app/moderation/page.tsx',import.meta.url),'utf8');
 const form=readFileSync(new URL('../src/components/ModerationDecisionForm.tsx',import.meta.url),'utf8');
 assert.match(route,/SERVICES_ADMIN_ENABLE_MODERATION_DECISIONS/);
 assert.match(route,/SERVICES_ADMIN_ENABLE_MODERATION_BFF/);
 assert.match(route,/origin!==request\.nextUrl\.origin/);
 assert.match(route,/verifyModerationCsrf\(sealed,/);
 assert.match(route,/fetchAdminModerationCases\(bearer\)/);
 assert.match(route,/bytes>256/);
 assert.match(csrf,/createHmac/);
 assert.match(csrf,/timingSafeEqual/);
 assert.match(page,/moderationCsrfToken\(sealed\)/);
 assert.match(form,/confirmed/);
 assert.doesNotMatch(form,/localStorage|sessionStorage|Authorization/);
});
