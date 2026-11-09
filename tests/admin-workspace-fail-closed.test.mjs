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

const nextConfig=readFileSync(new URL('../next.config.ts',import.meta.url),'utf8');
test('admin HTTP responses remain private and unindexable',()=>{
  for(const header of ['Cache-Control','X-Robots-Tag','X-Frame-Options',
    'X-Content-Type-Options','Content-Security-Policy','Referrer-Policy',
    'Cross-Origin-Opener-Policy','Cross-Origin-Resource-Policy']){
    assert.ok(nextConfig.includes(header),`Missing admin response header: ${header}`);
  }
  assert.match(nextConfig,/Cache-Control['"],\s*value:\s*['"]no-store['"]/);
  assert.match(nextConfig,/frame-ancestors 'none'/);
  assert.match(nextConfig,/form-action 'none'/);
  assert.match(nextConfig,/object-src 'none'/);
  assert.match(nextConfig,/Cross-Origin-Opener-Policy['"],\s*value:\s*['"]same-origin['"]/);
  assert.match(nextConfig,/Cross-Origin-Resource-Policy['"],\s*value:\s*['"]same-origin['"]/);
});

test('unknown admin routes do not expose navigation or backend data',()=>{
 const notFound=readFileSync(new URL('../src/app/not-found.tsx',import.meta.url),'utf8');
 assert.match(notFound,/export default function AdminNotFound/);
 assert.doesNotMatch(notFound,/fetch\s*\(|dangerouslySetInnerHTML|localStorage|sessionStorage/);
 assert.doesNotMatch(notFound,/href\s*=|onClick\s*=/);
});

test('liveness endpoint does not disclose admin state or infrastructure',()=>{
 const route=readFileSync(new URL('../src/app/api/health/route.ts',import.meta.url),'utf8');
 assert.match(route,/export function GET\(\)/);
 assert.match(route,/status:'ok',service:'services-admin'/);
 assert.match(route,/Cache-Control':'no-store'/);
 assert.doesNotMatch(route,/process\.env|DATABASE_URL|REDIS_URL|authorization|fetch\s*\(/i);
});

test('HEAD health probes have no body and disable caching',()=>{
 const route=readFileSync(new URL('../src/app/api/health/route.ts',import.meta.url),'utf8');
 assert.match(route,/export function HEAD\(\)/);
 assert.match(route,/new Response\(null,\{status:200,headers:/);
 assert.match(route,/Cache-Control':'no-store'/);
});
