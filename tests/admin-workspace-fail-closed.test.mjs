import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

const page=readFileSync(new URL('../src/app/page.tsx',import.meta.url),'utf8');

test('admin entry remains fail-closed until authenticated RBAC is implemented',()=>{
  assert.match(page,/export const dynamic\s*=\s*['"]force-dynamic['"]/);
  assert.match(page,/export default function AdminUnavailable/);
  assert.match(page,/Доступ к данным и операциям не предоставляется/);
  assert.doesNotMatch(page,/fetch\s*\(|localStorage|sessionStorage|dangerouslySetInnerHTML/);
  assert.doesNotMatch(page,/href\s*=\s*['"]\/admin\/|onClick\s*=/);
});
