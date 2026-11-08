# Admin parallel work handoff

Canonical coordination: https://github.com/nurgeldiserikbay/services/blob/main/docs/parallel-delivery-board.md

**Ownership:** platform moderation, audit presentation, staff UX and typed server-only BFF; not company seller workspace. Backend remains the sole authorization authority.

## Current slice
1. Run `pnpm typecheck && pnpm test && pnpm build` on exact main SHA and repair regressions.
2. Extend unmounted moderation/audit UI and tests for bounded pagination, kk/ru, redacted data, empty/error/unauthorized and insufficient-scope states.
3. Validate server-only moderation transport against reviewed API shape; never forward admin bearer to browser.
4. Do not mount privileged screens until backend DB sessions, real MFA issuance, scoped RBAC and audit endpoints pass staging E2E.
5. Request API/DTO corrections in canonical shared docs before coding against missing backend fields.

**Done when:** role-matrix negative tests, CI green, secure cookie/CSRF tests, staged MFA and moderation/audit HTTP E2E, exact SHA. Follow docs/admin-integration-release-gates.md.
