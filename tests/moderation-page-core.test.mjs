import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {isSafeModerationCasePage} from '../src/lib/moderation-page-core.mjs';

const item=()=>({id:randomUUID(),subjectKind:'organization',
 state:'triage',createdAt:'2026-11-08T04:20:00Z'});

test('moderation page accepts only a bounded, exact redacted schema',()=>{
 const row=item();
 assert.equal(isSafeModerationCasePage([]),true);
 assert.equal(isSafeModerationCasePage([row]),true);
 assert.equal(isSafeModerationCasePage(Array.from({length:51},item)),false);
 assert.equal(isSafeModerationCasePage([row],51),false);
 assert.equal(isSafeModerationCasePage([row],0),false);
 for(const invalid of [null,{},'unexpected',42,[null],
  [{...row,email:'private@example.test'}],
  [{...row,id:'invalid'}],
  [{...row,subjectKind:'secret'}],
  [{...row,state:'not_a_state'}],
  [{...row,createdAt:'2026-02-30T04:20:00Z'}],
  [{...row,createdAt:'2026-11-08T04:20:00+00:00'}],
  [{...row,createdAt:'not-a-date'}],
  [row,{...row,id:row.id.toUpperCase()}]]){
  assert.equal(isSafeModerationCasePage(invalid),false);
 }
});
test('moderation table cannot render unvalidated incoming pages',()=>{
 const source=readFileSync(new URL('../src/components/ModerationCaseTable.tsx',import.meta.url),'utf8');
 assert.match(source,/isSafeModerationCasePage\(cases\)/);
 assert.doesNotMatch(source,/fetch\(|document\.cookie|localStorage/);
});

test('moderation table localizes state and subject labels without changing backend enum values',()=>{
 const source=readFileSync(new URL('../src/components/ModerationCaseTable.tsx',import.meta.url),'utf8');
 assert.match(source,/kindLabels\[locale\]\[c\.subjectKind\]/);
 assert.match(source,/stateLabels\[locale\]\[c\.state\]/);
 for(const label of ['Маман','Специалист','Алғашқы қарау','Первичная проверка','Шағым','Апелляция']){
  assert.ok(source.includes(label),label);
 }
});
