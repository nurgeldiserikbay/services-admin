# Admin acceptance execution plan

Source of truth: [Services master checklist](https://github.com/nurgeldiserikbay/services-back/blob/main/docs/MASTER_CHECKLIST.md), section **Admin**. Do not mark items complete without a reproducible acceptance run and commit/CI evidence.

## Current verified observation (2026-11-15)
`src/app/page.tsx` is an intentional fail-closed landing page, **not the entire admin application**. `src/app/moderation/page.tsx` already implements a feature-flagged, server-rendered moderation workspace with server-only session validation, backend case fetching and logout. It is gated by `SERVICES_ADMIN_ENABLE_MODERATION_BFF=enabled` and denies unauthenticated or cross-site document requests. Functional acceptance still requires verified backend permissions, authenticated flows and CI/E2E evidence.

## Acceptance gates

| Master item | Required evidence | Status |
|---|---|---|
| Owner/admin/operator/auditor roles | Role matrix, denied/allowed API actions for all four roles, live DB grants | Unverified |
| Separate admin token domain | HMAC domain separation tests, cookie/bearer isolation and revocation integration | Unverified |
| TOTP MFA and replay defense | Enrollment, verification, reuse denial, lockout and transaction PostgreSQL tests | Unverified |
| TOTP disable/delete invalidates sessions | Revocation followed by denied authenticated HTTP request | Unverified |
| DB-authoritative session grants | Grant removal/role change reflected in subsequent authenticated requests | Unverified |
| Moderation and authorization | Audited moderation endpoints, IDOR checks and role-specific UI controls | Not accepted |
| Security audit trail | Successful/failed action events, redaction, immutable audit storage and retention verification | Unverified |
| HTTP security headers | Built Next.js response assertions, CSP and cache/noindex checks | Unverified |
| Admin UI functional acceptance | Authenticated MFA login, session expiry/logout, dashboard, moderation flows, loading/error/empty states, mobile and keyboard UX | Moderation workspace prepared behind feature flag; full acceptance unverified |
| Admin PostgreSQL and E2E tests | CI-backed migrated PostgreSQL integration plus browser E2E | Unverified |

## Delivery sequence

1. **Contract and threat boundary:** agree admin login/session endpoints and cookie/CSRF policy; map backend permissions to frontend screens. Never put privileged bearer tokens in browser localStorage or expose server secrets.
2. **Functional admin workspace:** verify the existing server-validated moderation route and logout; complete missing authenticated login, role-aware navigation and action-level moderation acceptance. Keep the landing placeholder and feature flag until the full path is proven safe.
3. **Acceptance:** test owner/admin/operator/auditor permissions, TOTP replay and revocation, moderation audit, CSRF/IDOR, no-store headers, responsive/accessibility states, real PostgreSQL and browser E2E.
4. **Evidence:** link passing GitHub Actions run and exact commit to the master checklist; only then check boxes.


## Verified backend HTTP contract gap (2026-11-15)

The backend's `src/modules/app.module.ts` imports `PlatformAdminModerationModule`. Its `src/modules/admin/admin-moderation.module.ts` registers only `PlatformModerationReadController` and `PlatformAdminLogoutController`; **no admin MFA login controller is registered there**. The backend does contain `loginAdminWithProvisionedTotp` in `src/modules/admin/admin-mfa-login.ts`, but that function explicitly requires a **trusted primary-factor assertion** (`staffId` and `authenticatedAt`), a server-side TOTP decryption-key resolver and a 32-byte session pepper. A browser-supplied staff ID or timestamp is not such an assertion.

**Do not implement an admin login form that sends a user-selected staff ID, a browser-provided primary-auth timestamp, or a raw backend bearer to the browser.** The missing dependency is a backend-authenticated primary-factor proof and a documented private admin MFA login HTTP contract. After that exists, implement a server-only BFF login exchange that validates its response, seals the bearer in the existing `__Host-services-admin-session` AES-GCM cookie, enforces origin/CSRF controls and tests expiration, lockout, replay, logout and role changes against migrated PostgreSQL. Until then the admin landing must stay fail-closed and the moderation BFF feature flag default-off.

**Backend rollout dependencies:** `SERVICES_ENABLE_PLATFORM_ADMIN_LOGOUT_HTTP=enabled` is independently required by `PlatformAdminLogoutService`; `SERVICES_ADMIN_ENABLE_MODERATION_BFF=enabled` only gates the admin Next.js app and cannot enable backend routes or authenticate anyone.

## Release blockers

- Landing page is a restricted placeholder; the separate moderation workspace exists but is feature-flagged and has not passed full acceptance.
- No CI result has been independently confirmed in this document.
- Admin UI must remain fail-closed until authenticated server-side authorization is ready.

## Logout acknowledgement hardening (2026-11-15)

The server-only BFF logout transport now requires HTTP 200, `Cache-Control: no-store`, JSON content type, a bounded (128-byte) UTF-8 body and the exact object `{ "status": "revoked" }` before reporting successful backend revocation. A source-level regression test guards this contract. Commits: [`400937d`](https://github.com/nurgeldiserikbay/services-admin/commit/400937d168b6a7b4112369b8c1bf8539de9c63c0), [`0b89fc3`](https://github.com/nurgeldiserikbay/services-admin/commit/0b89fc3eebad30282cbb7a55dbec514ac7f621e8). Runtime and CI acceptance remain unverified.

### Strict logout JSON shape follow-up

The logout acknowledgement parser now rejects duplicate JSON keys and unexpected fields at the wire level, instead of relying on `JSON.parse` (which retains the last duplicate key). See [`2d7667a`](https://github.com/nurgeldiserikbay/services-admin/commit/2d7667a08188c3a352869773c433232205351bf5) and [`dd717db`](https://github.com/nurgeldiserikbay/services-admin/commit/dd717dbc85103afeff32a27557d05e9946078a1e). CI and live HTTP acceptance remain pending.
