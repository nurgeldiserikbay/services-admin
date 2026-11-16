import {readdirSync,readFileSync} from 'node:fs';
import {join,relative} from 'node:path';
import process from 'node:process';
import ts from 'typescript';

const root='src';
const extensions=/\.(?:ts|tsx|js|jsx)$/;
const errors=[];
function scan(dir){
  for(const entry of readdirSync(dir,{withFileTypes:true})){
    const path=join(dir,entry.name);
    if(entry.isDirectory()){scan(path);continue;}
    if(!entry.isFile()||!extensions.test(entry.name))continue;
    const source=ts.createSourceFile(path,readFileSync(path,'utf8'),ts.ScriptTarget.Latest,true,path.endsWith('x')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
    const report=(node,message)=>{
      const {line,character}=source.getLineAndCharacterOfPosition(node.getStart(source));
      errors.push(`${relative('.',path)}:${line+1}:${character+1}: ${message}`);
    };
    function visit(node){
      if(ts.isCallExpression(node)){
        if(ts.isIdentifier(node.expression)&&node.expression.text==='eval')report(node,'eval is forbidden');
        if(ts.isIdentifier(node.expression)&&node.expression.text==='Function')report(node,'Function constructor is forbidden');
        if(ts.isPropertyAccessExpression(node.expression)&&node.expression.name.text==='write'&&ts.isIdentifier(node.expression.expression)&&node.expression.expression.text==='document')report(node,'document.write is forbidden');
      }
      if(ts.isNewExpression(node)&&ts.isIdentifier(node.expression)&&node.expression.text==='Function')report(node,'Function constructor is forbidden');
      if(ts.isPropertyAccessExpression(node)&&['innerHTML','outerHTML'].includes(node.name.text))report(node,'unsafe HTML DOM sink is forbidden');
      ts.forEachChild(node,visit);
    }
    visit(source);
  }
}
scan(root);
if(errors.length){for(const error of errors)console.error(error);process.exitCode=1;}
else console.log('Admin source security lint passed');
