import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

const transport=readFileSync(new URL('../src/lib/admin-backend.server.ts',import.meta.url),'utf8');
const page=readFileSync(new URL('../src/app/page.tsx',import.meta.url),'utf8');

test('admin transport is server-side and does not introduce public credential routes',()=>{
  assert.match(transport,/export async function fetchAdminModerationCases/);
  assert.match(transport,/SERVICES_BACKEND_INTERNAL_ORIGIN/);
  assert.match(transport,/cache:'no-store'/);
  assert.match(transport,/redirect:'error'/);
  assert.match(transport,/AbortSignal.timeout\(5000\)/);
  assert.match(transport,/url.username\|\|url.password/);
  assert.match(transport,/url.protocol!=='https:'/);
  assert.doesNotMatch(transport,/NEXT_PUBLIC_|localStorage|document\.cookie|console\./);
  assert.doesNotMatch(page,/fetchAdminModerationCases|Authorization/);
});

test('moderation transport validates every row and strips unexpected fields',()=>{
  assert.match(transport,/export function validateModerationPayload/);
  assert.match(transport,/seen\.has\(row\.id\.toLowerCase\(\)\)/);
  assert.match(transport,/KINDS\.has\(row\.subjectKind\)/);
  assert.match(transport,/STATES\.has\(row\.state\)/);
  assert.match(transport,/Number\.isFinite\(Date\.parse\(row\.createdAt\)\)/);
  assert.match(transport,/new Date\(row\.createdAt\)\.toISOString\(\)!==row\.createdAt/);
  assert.match(transport,/response\.headers\.get\('content-type'\)/);
  assert.match(transport,/Number\(length\)>32_768/);
  assert.match(transport,/response\.body\.getReader\(\)/);
  assert.match(transport,/total>32_768/);
  assert.match(transport,/reader\.cancel\(\)/);
  assert.match(transport,/new TextDecoder\('utf-8',\{fatal:true\}\)/);
  assert.match(transport,/return validateModerationPayload\(payload\)/);
  assert.doesNotMatch(transport,/return \{items:payload\.items\}/);
});
