import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {test} from 'node:test';

test('AST security lint rejects executable HTML and dynamic code, but accepts safe JSX',()=>{
 const dir=mkdtempSync(join(tmpdir(),'services-admin-lint-'));
 const run=()=>spawnSync(process.execPath,['scripts/security-lint.mjs',dir],{encoding:'utf8'});
 try{
  mkdirSync(join(dir,'nested'));
  const file=join(dir,'nested','sample.tsx');
  writeFileSync(file,'export const Safe = () => <p>Safe content</p>;\n');
  assert.equal(run().status,0,'safe JSX should pass');
  for(const [name,source] of [
   ['eval','eval("1")'],
   ['Function constructor','new Function("return 1")'],
   ['dynamic Function call','Function("return 1")'],
   ['document.write','document.write("unsafe")'],
   ['innerHTML','element.innerHTML = "unsafe"'],
   ['outerHTML','element.outerHTML = "unsafe"'],
   ['React HTML injection','export const Unsafe = () => <div dangerouslySetInnerHTML={{__html: "unsafe"}} />;'],
  ]){
   writeFileSync(file,source+'\n');
   const result=run();
   assert.notEqual(result.status,0,`${name} must fail lint`);
   assert.match(result.stderr,/sample\.tsx:\d+:\d+:/,`${name} should report a source location`);
  }
 }finally{rmSync(dir,{recursive:true,force:true});}
});
