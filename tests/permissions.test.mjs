import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../src/'+p,import.meta.url),'utf8');

test('presentation roles and capabilities mirror the backend admin contract',()=>{
 const source=read('lib/platform-permissions.ts');
 for(const role of ["'owner'","'admin'","'operator'","'auditor'"])assert.ok(source.includes(role),role);
 for(const operation of ['moderation.read','moderation.decide','audit.read','taxonomy.read','taxonomy.publish','platform_roles.read','platform_roles.manage'])assert.ok(source.includes(operation),operation);
 assert.doesNotMatch(source,/moderation\.assign|taxonomy\.manage|users\.support\.read/);
 assert.doesNotMatch(source,/OrganizationOwner|OrganizationAdmin|OrganizationOperator|SellerAdmin|BusinessAdmin/);
 assert.match(source,/now-verifiedClaims\.mfaVerifiedAt>MAX_MFA_AGE_MS/);
 assert.match(source,/verifiedClaims\.sessionExpiresAt<=now/);
});

test('UI hints fail closed without current MFA and only expose supported case decisions',()=>{
 const source=read('lib/platform-permissions.ts');
 assert.match(source,/verifiedClaims\.mfaVerifiedAt===null/);
 assert.match(source,/operation==='decide'&&state==='in_review'/);
 assert.match(source,/backend.*EVERY request/is);
 assert.doesNotMatch(source,/operation==='assign'|operation==='appeal'|operation==='close'/);
});

test('case table remains a presentation component and is not mounted publicly',()=>{
 const source=read('components/ModerationCaseTable.tsx');
 assert.match(source,/canDisplayPlatformAction\(verifiedClaims,'moderation\.read',now\)/);
 assert.doesNotMatch(source,/fetch\(|localStorage|Authorization|randomUUID/);
 assert.doesNotMatch(read('app/page.tsx'),/ModerationCaseTable/);
});
