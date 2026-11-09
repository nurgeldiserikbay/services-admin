import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// The implementation is TypeScript. These source checks run with the existing
// dependency-free Node test command; runtime policy tests remain necessary.
const source=readFileSync(new URL('../src/lib/platform-permissions.ts',import.meta.url),'utf8');

test('admin UI permission checks reject negative clocks and MFA timestamps',()=>{
 assert.match(source,/Number\.isSafeInteger\(now\) \|\| now<0/);
 assert.match(source,/verifiedClaims\.sessionExpiresAt<0/);
 assert.match(source,/verifiedClaims\.mfaVerifiedAt<0/);
});

test('admin UI hints require expiry and fresh MFA and never replace backend ACL',()=>{
 assert.match(source,/verifiedClaims\.sessionExpiresAt<=now/);
 assert.match(source,/now-verifiedClaims\.mfaVerifiedAt>MAX_MFA_AGE_MS/);
 assert.match(source,/backend validates a separate privileged session/);
});
