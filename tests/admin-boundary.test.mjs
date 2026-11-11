import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

const page=readFileSync(new URL('../src/app/page.tsx',import.meta.url),'utf8');
const health=readFileSync(new URL('../src/app/api/health/route.ts',import.meta.url),'utf8');

test('admin entrypoint remains fail-closed before verified admin auth and MFA',()=>{
  assert.match(page,/Әкімшілік панель әзірленуде/);
  assert.match(page,/Доступ к данным и операциям не предоставляется/);
  assert.doesNotMatch(page,/<(?:form|input|button)\b/i);
});

test('admin liveness does not expose internal dependency or session state',()=>{
  assert.match(health,/status:'ok',service:'services-admin'/);
  assert.match(health,/Cache-Control':'no-store'/);
  const handlers=health.slice(health.indexOf('export function GET'));
  assert.doesNotMatch(handlers,/process\.env|DATABASE_URL|session|secret|token/i);
});
