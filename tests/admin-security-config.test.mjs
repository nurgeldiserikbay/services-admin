import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

const config=readFileSync(new URL('../next.config.ts',import.meta.url),'utf8');

test('admin response security headers are configured globally',()=>{
  assert.match(config,/source:\s*'\/:path\*'/);
  const required=[
    ['X-Content-Type-Options','nosniff'],
    ['Referrer-Policy','no-referrer'],
    ['X-Frame-Options','DENY'],
    ['Cache-Control','no-store'],
    ['X-Robots-Tag','noindex'],
    ['Cross-Origin-Opener-Policy','same-origin'],
    ['Cross-Origin-Resource-Policy','same-origin'],
  ];
  for(const [name,value] of required){
    assert.ok(config.includes(name),`Missing security header: ${name}`);
    assert.ok(config.includes(value),`Missing security value for: ${name}`);
  }
  assert.match(config,/frame-ancestors 'none'/);
  assert.match(config,/form-action 'none'/);
  assert.match(config,/object-src 'none'/);
  assert.match(config,/poweredByHeader:\s*false/);
});
