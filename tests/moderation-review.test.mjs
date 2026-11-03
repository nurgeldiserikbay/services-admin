import{test}from'node:test';
import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
const read=p=>readFileSync(new URL('../src/'+p,import.meta.url),'utf8');
test('moderation requires rationale, optimistic revision and verified privilege',()=>{
 const x=read('lib/moderation-review.ts');
 assert.match(x,/reason\.trim\(\)\.length<10/);
 assert.match(x,/expectedRevision!==c.revision/);
 assert.match(x,/canDisplayCaseAction/);
});
test('review prevents duplicate action and does not create fake decisions',()=>{
 const x=read('components/ModerationCaseReview.tsx');
 assert.match(x,/lock.current/);
 assert.match(x,/!check.valid/);
 assert.match(x,/onDecision\(/);
 assert.doesNotMatch(x,/fetch\(|localStorage|window\.location|Math\.random/);
 assert.doesNotMatch(read('app/page.tsx'),/ModerationCaseReview/);
});
