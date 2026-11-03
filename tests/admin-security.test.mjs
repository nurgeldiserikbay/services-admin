import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read = path => readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('admin stays unavailable without authenticated MFA and RBAC',()=>{
 const page=read('src/app/page.tsx');
 assert.match(page,/force-dynamic/);
 assert.doesNotMatch(page,/fetch\(|Authorization|admin_session|/api\/moderation/);
 assert.match(page,/Restricted workspace/);
});
test('admin response blocks indexing, framing and caching',()=>{
 const c=read('next.config.ts');
 for(const h of ['X-Robots-Tag','noindex','X-Frame-Options','DENY','Cache-Control','no-store','frame-ancestors'])assert.ok(c.includes(h),h);
});
test('no administrator or business-owner functionality is fabricated',()=>{
 const page=read('src/app/page.tsx');
 assert.doesNotMatch(page,/onClick=|action=|sessionStorage|localStorage/);
});
