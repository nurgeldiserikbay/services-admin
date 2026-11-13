import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('mounted moderation route is default-off and validates encrypted session cookie',()=>{
 const route=source('src/app/api/moderation/cases/route.ts');
 assert.match(route,/SERVICES_ADMIN_ENABLE_MODERATION_BFF/);
 assert.match(route,/openAdminSession\(readUniqueAdminCookie\(/);
 assert.match(route,/fetchAdminModerationCases\(token\)/);
 assert.match(route,/Cache-Control[^\n]*no-store/);
 assert.doesNotMatch(route,/request\.headers\.get\(['"]authorization['"]\)/i);
});

test('live backend moderation validator requires exact redacted envelope and row keys',()=>{
 const transport=source('src/lib/admin-backend.server.ts');
 assert.match(transport,/Object\.keys\(payload\)\.length!==1/);
 assert.match(transport,/Object\.hasOwn\(payload,'items'\)/);
 assert.match(transport,/payload\.items\.length>50/);
 assert.match(transport,/Object\.keys\(item\)\.length!==4/);
 assert.match(transport,/\['id','subjectKind','state','createdAt'\]\.every/);
 assert.match(transport,/seen\.has\(row\.id\.toLowerCase\(\)\)/);
 assert.match(transport,/TextDecoder\('utf-8',\{fatal:true\}\)/);
});

test('live moderation transport is bounded and refuses cacheable upstream responses',()=>{
 const transport=source('src/lib/admin-backend.server.ts');
 assert.match(transport,/cache:'no-store'/);
 assert.match(transport,/redirect:'error'/);
 assert.match(transport,/AbortSignal\.timeout\(5000\)/);
 assert.match(transport,/response\.status!==200/);
 assert.match(transport,/cache-control/);
 assert.match(transport,/no-store/);
 assert.match(transport,/total>32_768/);
 assert.match(transport,/reader\.cancel\(\)/);
});

test('privileged logout requires backend revocation before clearing cookie',()=>{
 const route=source('src/app/api/auth/logout/route.ts');
 const revocation=route.indexOf('await revokeAdminBackendSession(token)');
 const clear=route.indexOf('response.cookies.set(');
 assert.ok(revocation>0);
 assert.ok(clear>revocation);
 assert.match(route,/origin!==request\.nextUrl\.origin/);
 assert.match(route,/status:503/);
});
