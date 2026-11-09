# Admin integration release gates

Status: **NOT RELEASED**. Existing moderation/audit UI components and transport are unmounted/default off.

## A1 — backend prerequisites
- Dedicated persisted staff identities and revocable sessions; no account or guest token reuse.
- Real MFA enrollment/verification/recovery and recent-MFA enforcement.
- Server-side scoped role checks for owner/admin/operator/auditor; default deny unknown actions and resources.
- Authorized paginated redacted moderation and audit APIs, bounded replies and explicit cache controls.
- Transactional audited moderation mutations with revision conflict detection and idempotency.

## A2 — UI integration
- Only mount protected routes after A1 is verified in staging.
- Server validates session and exact permissions for every read/write; UI checks are advisory only.
- Anonymous → 401, authenticated insufficient scope → 403, expired MFA → fresh challenge; no sensitive data on errors.
- Never accept browser-supplied role, grant or actor identity as authority.
- Handle session revocation, account switch, 401, malformed data and network failure by clearing privileged state.

## A3 — test matrix
| Actor | Read in scope | Read out of scope | Mutate | Staff elevation |
| --- | --- | --- | --- | --- |
| Anonymous | Deny | Deny | Deny | Deny |
| Auditor | Explicit grant only | Deny | Deny | Deny |
| Operator | Explicit grant only | Deny | Approved actions + fresh MFA only | Deny |
| Admin | Explicit grant only | Deny | Approved actions + fresh MFA only | No self-elevation |
| Owner | Explicit grant only | Deny | Approved actions + fresh MFA only | Protected last-owner rules |

Also test stale MFA, disabled staff, revoked session, cross-tenant resource IDs, concurrent updates, audit redaction and failed audit persistence.

## A4 — release evidence
- Exact commit: `pnpm install --frozen-lockfile && pnpm typecheck && pnpm test && pnpm build`.
- Stage backend migrations and MFA with test staff; verify session rotation and logout.
- Perform real HTTP E2E with authorized and unauthorized actors, confirm audit events and no secret leakage.
- Record CI links, commit SHAs, reviewer sign-off, feature-flag state and rollback plan.
- Do not mount moderation/audit screens or activate server transport until all A1–A4 checks pass.

## CI evidence — 2026-11-09

- [Admin CI run 42629947514](https://github.com/nurgeldiserikbay/services-admin/actions/runs/42629947514) passed for commit `c08a0b09b89d97c86be3cb6409ec7c21ea1d5050`.
- The production dependency audit now writes `pnpm-audit.json` and archives it for 14 days, including on failure. Audit failure still fails the CI job; lockfile, typecheck, tests and build remain mandatory.
- This verifies repository build/test gates only. It **does not** validate staging MFA delivery, real privileged HTTP transactions, live integration with backend, or production rollout. The admin UI remains default off until A1–A4 evidence is collected.

## A5 — privileged token parity (2026-11-09)

The backend issues a 32-byte, unpadded base64url platform-admin session proof.
Admin server-only moderation transport now rejects noncanonical final characters
before any outbound HTTP request, using the same 43-character canonical alphabet
constraint as the backend token validator. This is input validation only;
revocation, current MFA, grants and resource authorization remain exclusively
backend responsibilities. Browser cookies, ordinary user tokens and guest
capabilities must not be substituted for this proof.

Evidence:
- Admin regression test: `tests/moderation-private-transport.test.mjs` rejects malformed/aliased session proofs without calling transport.
- Backend contract: `src/modules/admin/admin-session-token.ts` and `test/admin-moderation-access-gates.test.ts` reject malformed privileged bearer values before DB access.
- Backend still defaults `SERVICES_ENABLE_PLATFORM_MODERATION_HTTP` off; Admin transport remains unmounted by default. This does **not** satisfy real MFA enrollment or privileged staging E2E gates.

## A6 — real HTTP boundary regression evidence (2026-11-09)

Backend CI [run 42643340907](https://github.com/nurgeldiserikbay/services-back/actions/runs/42643340907) passed for backend commit `5d0d0518220257166fc22567d3b990baacbde224`. The test `test/admin-moderation-live-http-permissions.test.ts` starts an actual NestJS loopback HTTP server and verifies the enabled moderation read endpoint with server-issued proof, revoked proof, stale MFA and missing resource grants. A subsequent regression also rejects out-of-scope database rows before disclosure.

**Evidence boundary:** HTTP routing and authorization logic are real, but the database adapter is controlled in-process test data. Existing PostgreSQL-backed tests separately check actual admin session records, grants and redacted cases. The combined test suite does **not** yet prove a deployed Admin UI ↔ Backend E2E, real MFA enrollment/recovery, production network allowlisting, or operational rollback. Leave admin routes unmounted/default off until A1–A4 are accepted.

## A7 — PostgreSQL-backed HTTP authorization evidence (2026-11-09)

- [Backend CI run 42654094673](https://github.com/nurgeldiserikbay/services-back/actions/runs/42654094673) passed with commit `92a3362022a80500c368c78129e536d63a212e44`.
- `test/admin-moderation-http-postgres-e2e.test.ts` exercises the real NestJS HTTP route and real PostgreSQL-backed admin sessions, grants and moderation-case queries in one acceptance path. Cases cover an authorized auditor, out-of-scope filtering, anonymous/wrong credentials, expired MFA freshness, revocation and redacted/no-store responses.
- Fixtures are inserted into one rollback-only PostgreSQL transaction and the NestJS DB adapter is made to use that same connection during the test; no test admin data is committed.
- This supersedes the A6 limitation for the **Backend HTTP + PostgreSQL read path** only. There is still no verified deployed Admin Next.js ↔ Backend staging journey, real MFA enrollment/recovery, privileged login provisioning, trusted ingress allowlisting, operational alerts or rollback exercise. Do not enable `SERVICES_ADMIN_MODERATION_HTTP` or `SERVICES_ENABLE_PLATFORM_MODERATION_HTTP` in production on CI evidence alone.
