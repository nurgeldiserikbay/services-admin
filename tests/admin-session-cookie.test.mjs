import assert from 'node:assert/strict';
import {test} from 'node:test';
import {ADMIN_SESSION_COOKIE,readAdminSessionCookie} from '../src/lib/admin-session-cookie.mjs';

const token='A'.repeat(43);
test('admin session transport reads only the dedicated host-only cookie',()=>{
 assert.equal(readAdminSessionCookie(`theme=dark; ${ADMIN_SESSION_COOKIE}=${token}; other=x`),token);
 assert.equal(readAdminSessionCookie(`session=${token}`),null);
 assert.equal(readAdminSessionCookie(null),null);
});
test('admin session transport rejects duplicate or malformed cookies',()=>{
 for(const header of [
  `${ADMIN_SESSION_COOKIE}=${token}; ${ADMIN_SESSION_COOKIE}=${token}`,
  `${ADMIN_SESSION_COOKIE}=invalid; ${ADMIN_SESSION_COOKIE}=${token}`,
  `${ADMIN_SESSION_COOKIE}=${token}; ${ADMIN_SESSION_COOKIE}=invalid`,
  `${ADMIN_SESSION_COOKIE}=${'A'.repeat(42)}B`,
  `${ADMIN_SESSION_COOKIE}=${token}%00`,
  `${ADMIN_SESSION_COOKIE}=" ${token} "`,
  `${ADMIN_SESSION_COOKIE}=${token}; filler=${'x'.repeat(4096)}`,
 ])assert.equal(readAdminSessionCookie(header),null);
});
