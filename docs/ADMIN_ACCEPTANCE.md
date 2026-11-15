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

## Release blockers

- Landing page is a restricted placeholder; the separate moderation workspace exists but is feature-flagged and has not passed full acceptance.
- No CI result has been independently confirmed in this document.
- Admin UI must remain fail-closed until authenticated server-side authorization is ready.
