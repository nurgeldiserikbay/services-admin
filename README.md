# Services Admin

Administrative interface for the Services platform. Canonical product and API contracts: [services documentation](https://github.com/nurgeldiserikbay/services).

## Scope and security boundary

Platform administration covers moderation, reports, verification, disputes, profession taxonomy, operational audit and, later, analytics. This is **not** the seller/company dashboard: seller workspaces belong to the client frontend and require separate backend authorization.

Expected stack: Next.js, TypeScript, typed API contracts, server-side role checks, MFA for privileged staff and redacted audit logs. UI filtering or hiding controls never enforces permissions.

## Verified implementation inventory (2026-11-08)

The repository contains **reusable, currently unmounted presentation components**:

- `src/components/ModerationTriageFilters.tsx` and `src/lib/moderation-triage.ts`: localized kk/ru moderation state/type filters over an already authorized, paginated list. See [moderation triage constraints](docs/moderation-triage-filters.md).
- `src/components/AdminAuditTable.tsx` and `src/lib/audit-presentation.ts`: safe read-only audit table presentation for already server-authorized, redacted entries, bounded to 50 per page. See [audit presentation constraints](docs/audit-presentation.md).
- Unit regression tests exist at `tests/moderation-triage.test.mjs` and `tests/audit-presenter.test.mjs`.

- `src/lib/admin-capability-hints.mjs`: conservative, read-only UI presentation hints for the four implemented backend role names. All write hints are denied; these hints are **not authorization**, are not mounted, and must never be used as an API access gate. Runtime tests: `tests/admin-capability-hints.test.mjs`.

These are UI building blocks, **not evidence of an operational administration system**. They are deliberately unmounted. Dedicated admin authentication/MFA, scoped backend APIs, persistent audit events and authorized moderation operations are not verified. The current implementation must not be described as production ready.

## Operational endpoints and limitations

- `GET /api/health` returns only a minimal liveness response with `Cache-Control: no-store`.
- `HEAD /api/health` returns HTTP 200 without a response body for load-balancer probes.
- The endpoint **does not** check PostgreSQL, Redis, privileged sessions, MFA or backend dependencies; it is not a readiness or authorization signal.
- Unknown routes return a neutral not-found page. Neither this page nor the liveness endpoint grants access to administrative data.

## Backend integration status (2026-11-10)

The backend already mounts a **private, read-only** `GET /v1/admin/moderation/cases` route. It is disabled unless `SERVICES_ENABLE_PLATFORM_MODERATION_HTTP=enabled`, requires a dedicated privileged bearer token and an authoritative database-backed role, current MFA proof and explicit resource-scope grants. It returns a bounded, redacted case list, not an unrestricted moderation feed. It is **not** safe to call from the browser with an administrator bearer token.

The backend Prisma design schema defines `platform_admin_staff`, `platform_admin_sessions`, `platform_admin_grants` and `platform_moderation_cases`. A separate `20261110_platform_admin_foundation` migration has been committed, alongside PostgreSQL constraint tests. Its clean PostgreSQL CI migration deployment and database constraint tests are now **verified in backend CI** ([run 42833641292](https://github.com/nurgeldiserikbay/services-back/actions/runs/42833641292), code SHA `b2c43b16aa4e2d0d3693de1a2f212aca6d829aee`). This is **not** verification against any persistent production database. A later migration was amended to remove duplicate table creation; check `_prisma_migrations` history and checksum before applying to an existing environment. Do not rewrite the historical baseline migration or reset a persistent database.

A fail-closed server-side moderation transport now exists at `src/lib/moderation-bff-core.mjs` with unit tests. It validates the upstream response, bounds page size and refuses malformed credentials. **It is not mounted as an HTTP endpoint** and must only receive a token from a future verified server-side admin session; it is not a login mechanism or a browser token store.

Admin authentication, MFA enrollment/challenge, secure browser-to-BFF sessions, CSRF controls, protected server-side BFF proxy, moderation writes and durable audit logging are still missing or unverified. The admin frontend remains intentionally fail-closed until those gates are implemented and tested. The backend's read-only route is not a complete administrative product.

## Stage 3 acceptance gates

See [Admin MVP security acceptance](docs/admin-mvp-security-acceptance.md). Before mounting privileged screens or releasing:

1. Enforce owner/admin/operator/auditor permission matrix in backend APIs; anonymous and insufficient-role requests must fail closed.
2. Implement dedicated privileged sessions, MFA, expiry and secure cookies. Never log tokens, OTPs or personal data.
3. Provide server-authorized, scoped, paginated moderation and audit read APIs. Client-side filters cannot change authorization or represent total queue counts.
4. Make moderation writes auditable with sanitized metadata; ensure safe idempotency/conflict handling and prohibit auditor mutations or self-elevation.
5. Verify permission-matrix tests, unit tests, `pnpm typecheck`, `pnpm test` and `pnpm build` in CI; separately verify actual deployment and runtime integration.

The preceding gates are **pending verification**, not completed milestones.

## Local checks

Node.js 22.12+ and pnpm 10.20.0:

```bash
corepack enable
pnpm install
pnpm typecheck
pnpm test
pnpm build
```

No claim of passing checks is made solely from the presence of scripts or test files.


## Private moderation BFF and logout (2026-11-11)

A server-rendered read-only moderation page now exists at `/moderation`.
It decrypts the short-lived, HttpOnly, Secure, SameSite=Strict
`__Host-services-admin-session` cookie on the Next.js server and forwards
the canonical bearer only to the configured backend. The browser never
receives the raw backend token. The page and `GET /api/moderation/cases`
are **default-off**, and neither provides login or MFA enrollment.

The moderation page contains a logout control. Its
`POST /api/auth/logout` handler checks same-origin requests, opens the
encrypted cookie, calls the backend `POST /v1/admin/session/logout`
with the bearer and clears the cookie **only after HTTP 200**.
Backend logout is separately default-off. If backend revocation cannot be
confirmed, the BFF returns 503 and keeps the browser cookie, so operators
must not treat that attempt as a confirmed sign-out.

Rollout requires all of the following server-side configuration, with secrets
supplied through a secret manager (never committed):

- Admin: `SERVICES_ADMIN_ENABLE_MODERATION_BFF=enabled`
- Admin: `SERVICES_ADMIN_COOKIE_KEY` — canonical base64 of 32 random bytes
- Admin: `SERVICES_BACKEND_INTERNAL_ORIGIN` — trusted HTTPS backend origin
- Backend: `SERVICES_ENABLE_PLATFORM_MODERATION_HTTP=enabled`
- Backend: `SERVICES_ENABLE_PLATFORM_ADMIN_LOGOUT_HTTP=enabled`
- Backend: `PLATFORM_ADMIN_SESSION_HMAC_KEY` — canonical base64 of 32 bytes

**Do not enable these flags yet.** The platform still lacks a complete,
verified privileged login and MFA issuance flow, and no public UI should
accept raw admin bearer tokens. Backend roles, scopes, session expiry and
MFA freshness must remain authoritative for each privileged read. Before
production rollout, verify both repos' CI, database migrations, runtime
integration, negative-path tests and secure cookie behavior on HTTPS.


## Moderation payload contract (2026-11-13)

The mounted `src/lib/admin-backend.server.ts` transport validates an exact
redacted upstream envelope: `{items: [...]}` with at most 50 rows. Each
row must contain **only** `id`, `subjectKind`, `state`, and `createdAt`.
Unexpected properties and non-plain objects are rejected rather than silently
stripped. UUID uniqueness is case-insensitive; timestamps must be canonical
millisecond UTC strings. The backend remains authoritative for access checks.

The standalone `moderation-bff-core.mjs` is a separate, currently unmounted
testable transport; its unit tests do **not** by themselves prove the mounted
Next.js route's integration. Run the actual admin and backend CI suites and
HTTPS runtime tests before enabling privileged feature flags.
