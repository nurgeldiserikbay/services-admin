import assert from 'node:assert/strict';
import {readdirSync,readFileSync} from 'node:fs';
import {join,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';

// Temporary deny-by-default release gate. Update this allowlist only after
// a reviewed, authenticated admin BFF + MFA + CSRF integration is tested.
const root=fileURLToPath(new URL('../src/app/',import.meta.url));
const walk=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
 const path=join(dir,entry.name);
 return entry.isDirectory()?walk(path):[path];
});

test('no privileged admin HTTP route is accidentally mounted',()=>{
 const routes=walk(root)
  .filter(path=>/^(route|page)\.(tsx?|jsx?)$/.test(path.split(/[\\/]/).at(-1)))
  .map(path=>relative(root,path).replaceAll('\\','/')).sort();
 assert.deepEqual(routes,[
  'api/auth/logout/route.ts',
  'api/health/route.ts',
  'api/moderation/cases/route.ts',
  'moderation/page.tsx',
  'page.tsx',
 ],
  'A new admin page/API route requires an explicit security review and allowlist update');
});

test('privileged routes stay explicitly disabled without an approved BFF rollout',()=>{
 for(const route of [
  'api/auth/logout/route.ts',
  'api/moderation/cases/route.ts',
  'moderation/page.tsx',
 ]){
  const source=readFileSync(join(root,route),'utf8');
  assert.match(source,/SERVICES_ADMIN_ENABLE_MODERATION_BFF/);
  assert.match(source,/!==\s*'enabled'/);
  assert.match(source,/openAdminSession/);
  assert.doesNotMatch(source,/NEXT_PUBLIC_SERVICES_ADMIN_ENABLE_MODERATION_BFF/);
 }
});

test('the only unauthenticated API endpoint remains a minimal liveness probe',()=>{
 const source=readFileSync(join(root,'api/health/route.ts'),'utf8');
 assert.match(source,/export function GET\(\)/);
 assert.match(source,/export function HEAD\(\)/);
 assert.doesNotMatch(source,/DATABASE_URL|REDIS_URL|adminBearer|Authorization|process\.env|fetch\s*\(/i);
});


test('private moderation API denies cross-origin requests even without fetch metadata',()=>{
 const source=readFileSync(join(root,'api/moderation/cases/route.ts'),'utf8');
 assert.match(source,/request\.headers\.get\('origin'\)/);
 assert.match(source,/origin!==null&&origin!==request\.nextUrl\.origin/);
 assert.match(source,/site==='cross-site'\|\|site==='same-site'/);
 assert.match(source,/'Vary':'Cookie, Origin, Sec-Fetch-Site'/);
});
