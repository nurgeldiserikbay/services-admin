import {test} from 'node:test';
import assert from 'node:assert/strict';
import {hasAdminPresentationHint} from '../src/lib/admin-capability-hints.mjs';

test('presentation hints are limited to explicit read capabilities',()=>{
  assert.equal(hasAdminPresentationHint('owner','moderation.read'),true);
  assert.equal(hasAdminPresentationHint('admin','audit.read'),true);
  assert.equal(hasAdminPresentationHint('operator','moderation.read'),true);
  assert.equal(hasAdminPresentationHint('operator','audit.read'),false);
  assert.equal(hasAdminPresentationHint('auditor','audit.read'),true);
  assert.equal(hasAdminPresentationHint('auditor','moderation.read'),false);
  for(const role of ['owner','admin','operator','auditor']){
    for(const action of ['moderation.write','roles.grant','audit.delete','taxonomy.publish'])
      assert.equal(hasAdminPresentationHint(role,action),false);
  }
});

test('unknown and prototype-shaped roles fail closed',()=>{
  for(const role of [null,undefined,'OWNER','superadmin','__proto__','constructor',{},42]){
    assert.equal(hasAdminPresentationHint(role,'audit.read'),false);
  }
  for(const capability of [null,undefined,{},'toString','constructor']){
    assert.equal(hasAdminPresentationHint('owner',capability),false);
  }
});
