# Services Admin — production readiness and release runbook

Status: **BLOCKED / do not expose privileged routes** until every gate below is independently verified. A successful Next.js build or liveness probe is not an authorization or readiness signal.

## 1. Required evidence

- [ ] Admin CI on the exact release SHA: frozen-lockfile install, production dependency audit, typecheck, unit tests, build, and default-off HTTP smoke tests all green.
- [ ] Backend CI on the compatible release SHA: database migration deployment on disposable PostgreSQL, RBAC/permission matrix, session revocation, MFA freshness, scoped moderation reads, and audit tests all green.
- [ ] Production database migration history and checksums reviewed against the actual target environment; **never reset** a persistent database to resolve drift.
- [ ] Dedicated staff login, MFA enrollment/challenge and recovery flow security-reviewed and integration-tested end to end. No login form or bearer token entry in public browser UI before this is ready.
- [ ] Browser-to-BFF session creation tested with Secure, HttpOnly, SameSite=Strict, __Host- cookie constraints, rotation, expiry and revocation.
- [ ] Same-origin/CSRF protection tested on every state-changing route; origin/proxy headers validated under the actual deployment topology.
- [ ] Backend enforces owner/admin/operator/auditor privileges, resource scopes and MFA on **every** request; hiding controls is not authorization.
- [ ] Moderation writes are idempotent or conflict-safe and emit durable, redacted audit records; auditor and insufficient-scope writes are rejected.
- [ ] End-to-end HTTPS tests cover no session, expired/revoked session, forged cookie, missing MFA, stale MFA, cross-origin request, malformed/oversized body, upstream timeout and error.
- [ ] Security review confirms no bearer tokens, session keys, OTPs or personal data in logs, HTML, browser storage, monitoring events or build artifacts.
- [ ] Monitoring, incident response owner, backup/restore and rollback procedure confirmed; post-deploy checks completed.

## 2. Deployment order

1. Pin compatible admin/backend commits and record CI links. Review backend migrations and deploy backend first with privileged endpoints **disabled**.
2. Verify database migration state and server-only credentials through the secret manager. Do not place any backend bearer or cookie encryption key in `NEXT_PUBLIC_*` variables.
3. Deploy admin with `SERVICES_ADMIN_ENABLE_MODERATION_BFF` **unset**. Verify `GET/HEAD /api/health` returns 200 with no-store; `/moderation`, `/api/moderation/cases`, and `POST /api/auth/logout` remain inaccessible.
4. Complete privileged authentication/MFA and session issuance integration, then test backend access control and revocation in a staging HTTPS environment.
5. Only after all gates pass, explicitly enable the backend moderation and logout routes and admin BFF, using canonical internal HTTPS origin and secret-manager-managed keys. Validate a real scoped, MFA-authenticated session and negative paths.
6. Observe errors and audit events without sensitive payloads. Keep a documented flag-off rollback; if revocation cannot be confirmed, treat logout as **unconfirmed**, not successful.

## 3. Required configuration (server only)

| Service | Variable | Rule |
| --- | --- | --- |
| Admin | `SERVICES_ADMIN_ENABLE_MODERATION_BFF` | Leave unset until approved; literal `enabled` for rollout |
| Admin | `SERVICES_ADMIN_COOKIE_KEY` | Canonical base64 encoding of 32 cryptographically random bytes; secret manager only |
| Admin | `SERVICES_BACKEND_INTERNAL_ORIGIN` | Trusted canonical HTTPS origin; never a user-controlled URL |
| Backend | `SERVICES_ENABLE_PLATFORM_MODERATION_HTTP` | Default off |
| Backend | `SERVICES_ENABLE_PLATFORM_ADMIN_LOGOUT_HTTP` | Default off |
| Backend | `PLATFORM_ADMIN_SESSION_HMAC_KEY` | Canonical base64 encoding of 32 random bytes; secret manager only |

Never paste secrets into issues, PR comments or CI logs.

## 4. Rollback and incident handling

- Disable privileged feature flags first; confirm privileged routes deny access.
- If credentials may be exposed, revoke sessions and rotate affected keys through a controlled incident procedure; cookie encryption key rotation can invalidate sessions.
- Roll back the admin deployment to the last compatible tested release. Do not automatically reverse or reset database migrations; use a reviewed forward fix where necessary.
- Record incident timeline, affected release SHA, CI evidence and sanitized audit event IDs.

## 5. Release sign-off

Record: admin SHA, backend SHA, migration IDs/checksums, CI run URLs, staging test evidence, security approver, operational owner, rollout time and rollback verification. **No release sign-off is implied by this document.**
