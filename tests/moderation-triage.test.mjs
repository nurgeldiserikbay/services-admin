import{test}from'node:test';
import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
const read=p=>readFileSync(new URL('../src/'+p,import.meta.url),'utf8');
test('triage defaults to unreviewed cases and filters only server-supplied data',()=>{
 const source=read('lib/moderation-triage.ts');
 assert.match(source,/state:'triage'/);
 assert.match(source,/data.filter\(/);
 assert.doesNotMatch(source,/fetch\(|localStorage|Authorization/);
});
test('triage filters are not public moderation authorization',()=>{
 const source=read('components/ModerationTriageFilters.tsx');
 assert.match(source,/onChange/);
 assert.doesNotMatch(source,/fetch\(|window\.location|document\.cookie|onSubmit/);
 assert.doesNotMatch(read('app/page.tsx'),/<ModerationTriageFilters/);
});
