import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const config=readFileSync(new URL('../next.config.ts',import.meta.url),'utf8');
const page=readFileSync(new URL('../src/app/page.tsx',import.meta.url),'utf8');
const layout=readFileSync(new URL('../src/app/layout.tsx',import.meta.url),'utf8');

test('admin security headers apply to all paths and deny caching/indexing',()=>{
 assert.match(config,/source:\s*['"]\/:path\*['"]/);
 for(const header of ['Cache-Control','X-Robots-Tag','X-Content-Type-Options','Referrer-Policy','X-Frame-Options','Content-Security-Policy']){
  assert.ok(config.includes("key: '"+header+"'"),'missing '+header);
 }
 assert.match(config,/value:\s*'no-store'/);
 assert.match(config,/value:\s*'nosniff'/);
 assert.match(config,/value:\s*'DENY'/);
 assert.match(config,/frame-ancestors 'none'/);
 assert.match(config,/object-src 'none'/);
 assert.match(config,/base-uri 'none'/);
});

test('unimplemented admin UI stays non-indexed and fail-closed',()=>{
 assert.match(layout,/robots:\s*\{index:\s*false/);
 assert.match(page,/force-dynamic/);
 assert.match(page,/Restricted workspace/);
 assert.match(page,/Доступ к данным и операциям не предоставляется/);
 assert.doesNotMatch(page,/localStorage|sessionStorage|dangerouslySetInnerHTML/);
});

test('moderation workspace uses a page heading and server-only authorization gate',()=>{
 const moderation=readFileSync(new URL('../src/app/moderation/page.tsx',import.meta.url),'utf8');
 const queue=readFileSync(new URL('../src/components/ModerationQueue.tsx',import.meta.url),'utf8');
 assert.match(queue,/<h1 id="moderation-heading">/);
 assert.match(queue,/aria-labelledby="moderation-heading"/);
 assert.match(moderation,/SERVICES_ADMIN_ENABLE_MODERATION_BFF/);
 assert.match(moderation,/openAdminSession/);
 assert.match(moderation,/fetchAdminModerationCases\(bearer\)/);
 assert.match(moderation,/if\(!result\)notFound\(\)/);
 assert.doesNotMatch(moderation,/localStorage|sessionStorage|dangerouslySetInnerHTML/);
});

test('moderation loading and error states do not disclose privileged diagnostics',()=>{
 const loading=readFileSync(new URL('../src/app/moderation/loading.tsx',import.meta.url),'utf8');
 const error=readFileSync(new URL('../src/app/moderation/error.tsx',import.meta.url),'utf8');
 assert.match(loading,/role="status"/);
 assert.match(loading,/aria-live="polite"/);
 assert.match(loading,/aria-busy="true"/);
 assert.match(loading,/<h1>/);
 assert.match(error,/^'use client';/);
 assert.match(error,/role="alert"/);
 assert.match(error,/<h1>/);
 assert.match(error,/onClick=\{reset\}/);
 assert.doesNotMatch(loading+'\n'+error,/error\.message|error\.stack|error\.digest|process\.env|Authorization|Bearer|localStorage|sessionStorage|dangerouslySetInnerHTML/);
});

test('moderation filters remain local to already authorized items',()=>{
 const queue=readFileSync(new URL('../src/components/ModerationQueue.tsx',import.meta.url),'utf8');
 assert.match(queue,/^'use client';/);
 assert.match(queue,/items\.filter\(/);
 assert.match(queue,/item\.subjectKind===kind/);
 assert.match(queue,/item\.state===state/);
 assert.match(queue,/visible\.map\(/);
 assert.match(queue,/aria-label="Жазба түрі бойынша сүзгі"/);
 assert.match(queue,/aria-label="Жазба күйі бойынша сүзгі"/);
 assert.doesNotMatch(queue,/fetch\(|localStorage|sessionStorage|Authorization|Bearer|dangerouslySetInnerHTML/);
});

test('moderation filter reset and result announcements stay scoped to the current page',()=>{
 const queue=readFileSync(new URL('../src/components/ModerationQueue.tsx',import.meta.url),'utf8');
 assert.match(queue,/setKind\('all'\);setState\('all'\)/);
 assert.match(queue,/Сүзгілерді тазалау/);
 assert.match(queue,/aria-live="polite"/);
 assert.match(queue,/aria-atomic="true"/);
 assert.match(queue,/visible\.length} \/ \{items\.length}/);
 assert.doesNotMatch(queue,/totalCount|globalCount|fetch\(/);
});
