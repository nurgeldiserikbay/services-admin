# Stage 3 — Admin MVP security acceptance

Status: implementation pending verification.

## Roles and boundaries
- Platform roles: owner, admin, operator, auditor. Implement a server-enforced permission matrix; frontend hiding is not authorization.
- Platform admin is distinct from specialist/company workspaces.
- Privileged sessions require MFA policy, session expiry and secure cookies. Never log tokens or PII.
- Moderation operations require audit events with actor, action, target, timestamp and sanitized metadata.

## Initial features
1. Authenticated admin shell and forbidden/unauthorized handling.
2. Profession taxonomy review and controlled publishing.
3. Moderation queue for profiles and organizations.
4. Read-only operational audit list with least-privilege filtering.

## Acceptance
- Anonymous and insufficient-role API requests fail closed.
- Auditor cannot mutate; operator cannot elevate own privileges.
- Every write is recorded once in audit log with no secret leakage.
- Concurrent moderation actions are idempotent or conflict safely.
- CI runs permission-matrix tests, typecheck and build.

## Dependencies
Approved backend admin APIs and explicit policy decisions; do not implement UI-only permissions.

## Role vocabulary reconciliation

The currently implemented backend policy in `services-back` accepts only `owner`, `admin`, `operator`, and `auditor`, with resource scopes and a 15-minute MFA freshness window. The richer six-role vocabulary in the canonical Admin operations chapter has no matching backend claims yet. The admin UI therefore mirrors only the implemented backend policy and does not infer extra roles or permissions. Resolve the canonical vocabulary before mounting privileged routes.
