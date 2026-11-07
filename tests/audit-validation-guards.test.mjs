import{test}from'node:test';
import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
const code=readFileSync(new URL('../src/lib/audit-presentation.ts',import.meta.url),'utf8');

test('audit page rejects unknown keys and requires all seven public fields',()=>{
 assert.match(code,/Object\.keys\(e\)\.length!==AUDIT_KEYS\.length/);
 assert.match(code,/Object\.hasOwn\(e,key\)/);
 assert.match(code,/subjectKind/);
 assert.match(code,/SUBJECT_KINDS\.has\(e\.subjectKind\)/);
});
test('audit page fails closed for invalid entries and oversized pages',()=>{
 assert.match(code,/Array\.isArray\(entries\)/);
 assert.match(code,/Number\.isInteger\(maxPageSize\)/);
 assert.match(code,/maxPageSize>50/);
 assert.match(code,/entries\.length>maxPageSize/);
 assert.match(code,/typeof e\.reasonCode==='string'/);
 assert.match(code,/isValidUtcCalendarTime\(e\.occurredAt\)/);
});
