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

These are UI building blocks, **not evidence of an operational administration system**. They are deliberately unmounted. Dedicated admin authentication/MFA, scoped backend APIs, persistent audit events and authorized moderation operations are not verified. The current implementation must not be described as production ready.

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
