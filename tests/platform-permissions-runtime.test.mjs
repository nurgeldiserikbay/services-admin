import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';

// Execute the actual UI policy; it is only a hint, never an authorization decision.
const source=readFileSync(new URL('../src/lib/platform-permissions.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{
 module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,
},reportDiagnostics:true});
assert.deepEqual(compiled.diagnostics?.filter(d=>d.category===ts.DiagnosticCategory.Error),[]);
const {actions,platformRoles,canDisplayPlatformAction,canDisplayCaseAction}=
 await import('data:text/javascript;base64,'+Buffer.from(compiled.outputText).toString('base64'));

const now=1_800_000_000_000;
const claims=(role)=>({role,sessionExpiresAt:now+60_000,mfaVerifiedAt:now-1_000});
const allowed={
 owner:actions,
 admin:['moderation.read','moderation.decide','audit.read','taxonomy.read','taxonomy.publish','platform_roles.read'],
 operator:['moderation.read','moderation.decide','taxonomy.read'],
 auditor:['moderation.read','audit.read','taxonomy.read'],
};

test('real UI policy role/action matrix matches supported backend contract',()=>{
 assert.deepEqual([...platformRoles],['owner','admin','operator','auditor']);
 for(const role of platformRoles){
  for(const action of actions){
   assert.equal(canDisplayPlatformAction(claims(role),action,now),
    allowed[role].includes(action),role+': '+action);
  }
 }
});

test('real UI policy denies stale, missing, future and malformed MFA/session claims',()=>{
 for(const role of platformRoles){
  const valid=claims(role);
  assert.equal(canDisplayPlatformAction(valid,'moderation.read',now),true);
  for(const invalid of [
   null,{}, {...valid,sessionExpiresAt:now}, {...valid,sessionExpiresAt:now-1},
   {...valid,mfaVerifiedAt:null},{...valid,mfaVerifiedAt:now+1},
   {...valid,mfaVerifiedAt:now-15*60*1000-1},
   {...valid,mfaVerifiedAt:-1},{...valid,mfaVerifiedAt:NaN},
   {...valid,mfaVerifiedAt:Infinity},{...valid,sessionExpiresAt:Infinity},
   {...valid,sessionExpiresAt:now+0.5},
   {...valid,role:'__proto__'},{...valid,role:'company_owner'},
  ])assert.equal(canDisplayPlatformAction(invalid,'moderation.read',now),false,
   role+': invalid '+JSON.stringify(invalid));
 }
 for(const invalidNow of [-1,NaN,Infinity,now+0.5]){
  assert.equal(canDisplayPlatformAction(claims('owner'),'moderation.read',invalidNow),false);
 }
 assert.equal(canDisplayPlatformAction(claims('owner'),'moderation.assign',now),false);
});

test('real case decision hint is restricted to in-review and nonempty bounded reason',()=>{
 for(const role of platformRoles){
  const expected=role!=='auditor';
  assert.equal(canDisplayCaseAction(claims(role),'in_review','decide','Reviewed',now),expected);
  for(const state of ['triage','decision','appeal','closed','unknown']){
   assert.equal(canDisplayCaseAction(claims(role),state,'decide','Reviewed',now),false);
  }
  for(const reason of ['', '   ', 'x'.repeat(2001),null,42]){
   assert.equal(canDisplayCaseAction(claims(role),'in_review','decide',reason,now),false);
  }
  assert.equal(canDisplayCaseAction(claims(role),'in_review','assign','Reviewed',now),false);
 }
 assert.equal(canDisplayCaseAction(claims('owner'),'in_review','decide','x'.repeat(2000),now),true);
});

test('UI authorization hints refuse inherited or missing verified claim fields',()=>{
 const valid=claims('owner');
 for(const malformed of [
  Object.create(valid),
  Object.assign(Object.create(valid),{role:'owner'}),
  Object.assign(Object.create(null),{...valid,role:'owner'}),
  {...valid,role:undefined},
  {role:'owner',sessionExpiresAt:valid.sessionExpiresAt},
  {role:'owner',mfaVerifiedAt:valid.mfaVerifiedAt},
  {sessionExpiresAt:valid.sessionExpiresAt,mfaVerifiedAt:valid.mfaVerifiedAt},
  [valid.role,valid.sessionExpiresAt,valid.mfaVerifiedAt],
 ]){
  // Null-prototype records with all own fields remain structurally valid.
  const expected=Object.getPrototypeOf(malformed)===null;
  assert.equal(canDisplayPlatformAction(malformed,'moderation.read',now),expected);
 }
});

test('RBAC hints do not execute attacker-controlled accessor claims',()=>{
 const good=claims('owner');
 for(const key of ['role','sessionExpiresAt','mfaVerifiedAt']){
  let called=0;
  const forged={...good};
  Object.defineProperty(forged,key,{enumerable:true,configurable:true,get(){
   called++;
   throw Error('untrusted accessor must not execute');
  }});
  assert.equal(canDisplayPlatformAction(forged,'moderation.read',now),false);
  assert.equal(canDisplayCaseAction(forged,'in_review','decide','valid reason',now),false);
  assert.equal(called,0,'accessor must not run: '+key);
 }
});
