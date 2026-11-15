# Admin acceptance execution plan

Source of truth: [Services master checklist](https://github.com/nurgeldiserikbay/services-back/blob/main/docs/MASTER_CHECKLIST.md), section **Admin**. Do not mark items complete without a reproducible acceptance run and commit/CI evidence.

## Current verified observation (2026-11-15)
`src/app/page.tsx` is an intentional fail-closed restricted-workspace placeholder. No functional admin workspace can be accepted on the basis of that page. The backend MFA implementation and security tests are not evidence of a completed admin UI.

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
| Admin UI functional acceptance | Authenticated MFA login, session expiry/logout, dashboard, moderation flows, loading/error/empty states, mobile and keyboard UX | Not implemented in placeholder |
| Admin PostgreSQL and E2E tests | CI-backed migrated PostgreSQL integration plus browser E2E | Unverified |

## Delivery sequence

1. **Contract and threat boundary:** agree admin login/session endpoints and cookie/CSRF policy; map backend permissions to frontend screens. Never put privileged bearer tokens in browser localStorage or expose server secrets.
2. **Functional admin workspace:** implement server-validated session gate, explicit logout, role-aware navigation and moderation screens with API permission enforcement. Keep the placeholder until an authenticated path is proven safe.
3. **Acceptance:** test owner/admin/operator/auditor permissions, TOTP replay and revocation, moderation audit, CSRF/IDOR, no-store headers, responsive/accessibility states, real PostgreSQL and browser E2E.
4. **Evidence:** link passing GitHub Actions run and exact commit to the master checklist; only then check boxes.

## Release blockers

- Restricted placeholder is not a usable admin panel.
- No CI result has been independently confirmed in this document.
- Admin UI must remain fail-closed until authenticated server-side authorization is ready.
