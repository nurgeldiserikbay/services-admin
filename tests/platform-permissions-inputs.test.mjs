import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../src/lib/platform-permissions.ts',import.meta.url),'utf8');

test('platform permission hints validate claim, role and action types',()=>{
  assert.match(source,/typeof verifiedClaims!=='object'/);
  assert.match(source,/typeof verifiedClaims\.role!=='string'/);
  assert.match(source,/typeof action!=='string'/);
  assert.match(source,/!platformRoles\.includes\(verifiedClaims\.role\)/);
  assert.match(source,/!actions\.includes\(action\)/);
});

test('privileged hints require live session and fresh MFA',()=>{
  assert.match(source,/verifiedClaims\.sessionExpiresAt<=now/);
  assert.match(source,/now-verifiedClaims\.mfaVerifiedAt>MAX_MFA_AGE_MS/);
  assert.match(source,/MAX_MFA_AGE_MS=15\*60\*1000/);
});
