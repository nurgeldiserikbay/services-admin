# Platform admin authorization — first UI contracts

The canonical operations design in `services/docs/ru/21-admin-operations.md` describes six future platform roles. The currently implemented backend authorization policy accepts only `owner`, `admin`, `operator`, and `auditor`; this repository's unmounted UI capability hints mirror that implemented policy. The richer six-role vocabulary is not translated into backend authority and must be reconciled in the canonical contract before protected routes are mounted.

The UI refuses to display case data without a server-verified session + fresh MFA timestamps. A typed, accessible kk/ru moderation table can render **server-supplied, already-filtered** case summaries; it is deliberately not mounted in the public admin shell.

## Non-negotiable release gates

- Dedicated admin identity/session enrollment, recovery, and issuance endpoints; short privileged sessions and rotation.
- Real action/resource-specific backend authorization, case assignment checks, and no leaked PII.
- Audited moderation mutations with reason, optimistic concurrency, independent appeals and idempotency.
- Server-filtered/paginated case read endpoint, threat model, safe logs, CSRF/Origin checks and incident controls.
- The UI policy is **not** a security barrier. Never grant authority because a React component says an action is allowed.

No fake moderation cases, backend routes, live credentials or security bypass are provided.
