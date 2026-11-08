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
