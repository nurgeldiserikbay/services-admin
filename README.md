# Services Admin

Administrative interface for the Services platform. Domain and API design: [services documentation](https://github.com/nurgeldiserikbay/services).

## Intended scope
Platform moderation, reports, verification, disputes, profession taxonomy, template registry, operational audit and later monetization/analytics.

This is **not** the business owner's regular dashboard. Business and professional workspaces belong to the client frontend, guarded by backend permissions.

## Intended approach
Next.js + TypeScript, typed API client, server-side authorization checks, least-privilege roles, MFA for privileged staff, audit logs.

## Status
Repository initialized; no administration interface implementation yet.
