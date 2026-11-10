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
 assert.deepEqual(routes,['api/health/route.ts','page.tsx'],
  'A new admin page/API route requires an explicit security review and allowlist update');
});

test('the only mounted API endpoint remains a minimal unauthenticated liveness probe',()=>{
 const source=readFileSync(join(root,'api/health/route.ts'),'utf8');
 assert.match(source,/export function GET\(\)/);
 assert.match(source,/export function HEAD\(\)/);
 assert.doesNotMatch(source,/DATABASE_URL|REDIS_URL|adminBearer|Authorization|process\.env|fetch\s*\(/i);
});
