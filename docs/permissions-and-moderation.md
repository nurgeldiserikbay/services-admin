# Platform admin authorization — first UI contracts

Adds roles and action-specific presentation permissions for PlatformSuperAdmin, ModeratorLead, Moderator, Support, TaxonomyEditor and Auditor, per `services/docs/ru/21-admin-operations.md`. The UI refuses to display case data without a server-verified session + MFA timestamps. A typed, accessible kk/ru moderation table can render **server-supplied, already-filtered** case summaries; it is deliberately not mounted in the public admin shell.

## Non-negotiable release gates

- Dedicated admin identity/session endpoint, short privileged sessions, MFA and rotation.
- Real action/resource-specific backend authorization, case assignment checks, and no leaked PII.
- Audited moderation mutations with reason, optimistic concurrency, independent appeals and idempotency.
- Server-filtered/paginated case read endpoint, threat model, safe logs, CSRF/Origin checks and incident controls.
- The UI policy is **not** a security barrier. Never grant authority because a React component says an action is allowed.

No fake moderation cases, backend routes, live credentials or security bypass are provided.
