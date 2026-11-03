import{test}from'node:test';
import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
const read=p=>readFileSync(new URL('../src/'+p,import.meta.url),'utf8');
test('audit presenter requires bounded, structured, server-filtered records',()=>{
 const code=read('lib/audit-presentation.ts');
 assert.match(code,/entries.length>maxPageSize/);
 assert.match(code,/UUID\.test\(e.actorId\)/);
 assert.match(code,/reasonCode/);
 assert.doesNotMatch(code,/email|phone|password|token/);
});
test('audit table is read-only and not mounted without real ACL',()=>{
 const code=read('components/AdminAuditTable.tsx');
 assert.match(code,/isSafeAuditPage/);
 assert.match(code,/formatSafeAuditEntries/);
 assert.doesNotMatch(code,/fetch\(|localStorage|window\.location|onClick|contentEditable/);
 assert.doesNotMatch(read('app/page.tsx'),/<AdminAuditTable/);
});
