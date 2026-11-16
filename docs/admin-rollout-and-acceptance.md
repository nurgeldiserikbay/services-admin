# Admin privileged rollout and acceptance runbook

Status: **NOT APPROVED FOR PRODUCTION** (2026-11-16). This is an operator checklist, not proof of a working login flow. The backend has passing PostgreSQL privileged-session and moderation HTTP integration tests; the admin web UI still lacks a complete browser MFA sign-in and enrollment journey.

## Deployment boundaries

- Public `/` is an intentionally unavailable landing page, not a login form.
- `GET /api/health` and `HEAD /api/health` are **liveness only**; HTTP 200 does not establish DB readiness, MFA health, or privileged authorization.
- `/moderation` and `GET /api/moderation/cases` are private, read-only, server-side session consumers, disabled by default.
- `POST /api/auth/logout` is a state-changing BFF route, also disabled by default; it must confirm backend revocation before clearing the cookie.
- The browser must never receive a backend admin bearer, a TOTP secret, or an internal backend origin. Never use URL parameters, localStorage or browser Authorization headers to carry privileged proofs.
- UI role hints are not a security boundary. Backend DB grants, session state, scope, and MFA freshness must be checked **on every privileged request**.

## Environment inventory

| Component | Setting | Requirement |
| --- | --- | --- |
| Admin | `SERVICES_ADMIN_ENABLE_MODERATION_BFF` | Keep `disabled` until the entire release gate passes; only literal `enabled` activates routes |
| Admin | `SERVICES_ADMIN_COOKIE_KEY` | Independent, canonical base64-encoded 32-byte secret, secret manager only |
| Admin | `SERVICES_BACKEND_INTERNAL_ORIGIN` | Trusted HTTPS origin without path, credentials, query, fragment |
| Backend | `SERVICES_ENABLE_PLATFORM_MODERATION_HTTP` | Enable only after RBAC/MFA DB and API acceptance |
| Backend | `SERVICES_ENABLE_PLATFORM_ADMIN_LOGOUT_HTTP` | Enable only after revocation contract acceptance |
| Backend | `PLATFORM_ADMIN_SESSION_HMAC_KEY` | Independent canonical base64-encoded 32-byte secret, never reuse the cookie key |

Do not commit actual secret values. Verify HTTPS termination, secure cookie forwarding, host/proxy configuration and access restrictions in the target environment. Do not modify historical Prisma migrations on a persistent database; inspect migration history/checksums before rollout.

## Mandatory release gates

- [ ] Dedicated admin login, TOTP enrollment/challenge and recovery are implemented and verified end-to-end in a real browser over HTTPS.
- [ ] A trusted server-side login flow issues the `__Host-services-admin-session` HttpOnly, Secure, SameSite=Strict, Path=/ cookie only after successful privileged MFA and backend session issuance.
- [ ] Anonymous, expired, revoked, missing-MFA, stale-MFA, insufficient-role, wrong-resource-scope, and suspended-staff requests fail closed on backend and browser BFF.
- [ ] Owner/admin/operator/auditor actions are validated against backend DB grants; auditors cannot mutate; company-owner identities cannot inherit platform-owner authority.
- [ ] Moderation queue shows only backend-authorized, redacted records (maximum 50 per response), without leaking total counts or tokens.
- [ ] Logout confirms backend revocation; backend failure returns 503 and does not claim success or clear the credential.
- [ ] CSRF/cross-origin rejection, duplicate-cookie rejection, secure response headers and cache denial are verified on the deployed HTTPS origin.
- [ ] All relevant `services-back` and `services-admin` main CI runs pass, including PostgreSQL integration, typecheck, tests, production build and deployed smoke.
- [ ] Accessibility, keyboard operation, mobile layout, empty/error states and moderation functional acceptance are manually signed off.
- [ ] Security review, audit logging, incident response, secret rotation and rollback are approved; staging sign-off recorded.

**Do not turn on the BFF flag if any checkbox remains open.** The feature flag is not an authentication mechanism.

## Staging verification (non-destructive)

1. With the admin flag disabled, verify `GET /api/health` returns a minimal `{"status":"ok","service":"services-admin"}` and `Cache-Control: no-store`; `HEAD` returns no body. Verify private API routes return 404 and privileged UI does not render.
2. With staging credentials and the complete MFA flow implemented, verify cookie attributes in browser developer tools without copying its value into tickets, logs or screenshots.
3. Exercise the four roles and every supported action, both allowed and denied. Confirm denied operations fail at the backend even if UI controls are manipulated.
4. Test expiration, backend revocation, MFA age boundary, session-key rotation and duplicate-cookie behavior. Confirm no admin bearer appears in browser network payloads, HTML or JavaScript bundles.
5. Test malicious cross-origin POST logout, invalid Fetch Metadata, untrusted Origin, cache headers and partial/oversized upstream responses. Confirm logout is never reported successful on upstream failure.
6. Inspect sanitized audit records for privileged reads/writes and denied attempts, with no tokens, OTP values or personal contact fields.
7. Record test environment, commit SHAs, CI run links, browser/OS, result, reviewer, and date in the master checklist. A unit test alone is not browser E2E acceptance.

## Failure and rollback

- On unexpected exposure, disable `SERVICES_ADMIN_ENABLE_MODERATION_BFF` and restrict ingress; do not assume the switch revokes previously issued backend sessions.
- Revoke privileged sessions using the backend's authorized administrative procedure and rotate compromised secrets using the approved secret-management process.
- If backend logout is unavailable, the browser's credential may remain; communicate that revocation was **not confirmed**, investigate upstream availability, and do not mislabel it as a successful sign-out.
- Preserve redacted security/audit evidence and CI logs. Never paste cookies, tokens, MFA seeds, or raw PII into an incident report.
- Restore from the last verified release and re-run staging checks before re-enabling access.

## Current evidence and known gaps

- Backend admin PostgreSQL + privileged HTTP E2E: [CI #43804251293](https://github.com/nurgeldiserikbay/services-back/actions/runs/43804251293) (master checklist evidence, 2026-11-16).
- Admin build, tests and default-off BFF smoke: [CI #43843050687](https://github.com/nurgeldiserikbay/services-admin/actions/runs/43843050687) (2026-11-16).
- **Open:** real browser MFA login, authenticated UI E2E, role-by-role staging acceptance, comprehensive ESLint/React/Next semantic lint, deployment/security sign-off.

Canonical cross-repository acceptance register: [MASTER_CHECKLIST.md](https://github.com/nurgeldiserikbay/services-back/blob/main/docs/MASTER_CHECKLIST.md).
