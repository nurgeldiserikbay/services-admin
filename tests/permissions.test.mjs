import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../src/'+p,import.meta.url),'utf8');
test('platform roles never treat business owner as privileged moderator',()=>{
 const source=read('lib/platform-permissions.ts');
 for(const role of ['PlatformSuperAdmin','ModeratorLead','Moderator','Support','TaxonomyEditor','Auditor'])
   assert.ok(source.includes(role));
 assert.doesNotMatch(source,/'OrganizationOwner'|'SellerAdmin'|'BusinessAdmin'/);
 assert.match(source,/mfaVerifiedAt===null/);
 assert.match(source,/sessionExpiresAt<=now/);
});
test('moderation decisions require reason and guard actions by state',()=>{
 const source=read('lib/platform-permissions.ts');
 assert.match(source,/reason\.trim\(\)/);
 assert.match(source,/state==='in_review'/);
 assert.match(source,/canDisplayPlatformAction\(ctx,'moderation.decide'/);
 assert.match(source,/backend policies remain independently enforced/i);
});
test('case table is an unmounted, server-scoped presentation element',()=>{
 const source=read('components/ModerationCaseTable.tsx');
 assert.match(source,/canDisplayPlatformAction\(verifiedClaims,'moderation.read',now\)/);
 assert.doesNotMatch(source,/fetch\(|localStorage|Authorization|randomUUID/);
 assert.doesNotMatch(read('app/page.tsx'),/ModerationCaseTable/);
});
