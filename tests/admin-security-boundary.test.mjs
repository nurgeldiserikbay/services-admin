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
