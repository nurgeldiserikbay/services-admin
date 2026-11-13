import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import ts from 'typescript';

// Exercise the actual TypeScript transport, not a duplicate test implementation.
// This file has no runtime imports, so it can be transpiled into an ESM data URL.
const source=readFileSync(new URL('../src/lib/admin-backend.server.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{
 compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022},
 reportDiagnostics:true,
});
assert.deepEqual(compiled.diagnostics?.filter(d=>d.category===ts.DiagnosticCategory.Error),[]);
const {validateModerationPayload,adminBackendOrigin}=await import(
 'data:text/javascript;base64,'+Buffer.from(compiled.outputText).toString('base64')
);

const row=()=>({
 id:randomUUID(),subjectKind:'review',state:'triage',
 createdAt:'2026-11-10T12:00:00.000Z',
});

test('live validator accepts exact redacted payload and strips no fields',()=>{
 const item=row();
 assert.deepEqual(validateModerationPayload({items:[item]}),{items:[item]});
 assert.deepEqual(validateModerationPayload({items:[]}),{items:[]});
});

test('live validator rejects extra fields at envelope and item level',()=>{
 const item=row();
 for(const value of [
  {items:[item],token:'secret'},
  {items:[{...item,email:'private@example.test'}]},
  {items:[{...item,subjectKind:'review',metadata:{secret:true}}]},
  {items:[Object.assign(Object.create(null),item)]},
  Object.assign(Object.create(null),{items:[item]}),
  {items:[{id:item.id,subjectKind:item.subjectKind,state:item.state}]},
  {items:[item,{...item,id:item.id.toUpperCase()}]},
  {items:Array.from({length:51},row)},
 ])assert.equal(validateModerationPayload(value),null);
});

test('live validator rejects invalid canonical timestamps and enum values',()=>{
 const item=row();
 for(const value of [
  {...item,createdAt:'2026-11-10T12:00:00Z'},
  {...item,createdAt:'2026-02-30T12:00:00.000Z'},
  {...item,subjectKind:'user'},
  {...item,state:'approved'},
  {...item,id:'not-a-uuid'},
 ])assert.equal(validateModerationPayload({items:[value]}),null);
});

test('live backend origin parser refuses path, credentials and normalization',()=>{
 assert.equal(adminBackendOrigin('https://api.example.test'),'https://api.example.test');
 assert.equal(adminBackendOrigin('https://api.example.test/'),'https://api.example.test');
 for(const value of [
  'https://api.example.test/path',
  'https://user:password@api.example.test',
  'https://api.example.test?x=1',
  'https://API.EXAMPLE.TEST',
  'https://api.example.test:443',
  'http://api.example.test',
 ])assert.equal(adminBackendOrigin(value),null,value);
});
