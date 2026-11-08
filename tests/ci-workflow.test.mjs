import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

test('admin CI runs all quality gates with least privilege and bounded runtime',()=>{
  const workflow=readFileSync('.github/workflows/ci.yml','utf8');
  assert.match(workflow,/^permissions:\n  contents: read$/m);
  assert.match(workflow,/^    timeout-minutes: 30$/m);
 assert.match(workflow,/^concurrency:\n  group: \$\{\{ github\.workflow \}\}-\$\{\{ github\.ref \}\}\n  cancel-in-progress: true$/m);
  const gates=['pnpm typecheck','pnpm test','pnpm build'];
  let previous=-1;
  for(const gate of gates){
    const occurrences=workflow.split('run: '+gate).length-1;
    assert.equal(occurrences,1,`Expected exactly one ${gate} gate`);
    const index=workflow.indexOf('run: '+gate);
    assert.ok(index>previous,`Quality gate out of order: ${gate}`);
    previous=index;
  }
  assert.match(workflow,/node-version: '22'/);
  assert.match(workflow,/pnpm install --no-frozen-lockfile/);
});
