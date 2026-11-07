# Future Admin moderation list: private server transport

The admin workspace remains unavailable by default. The new
`getModerationCasesForVerifiedAdmin` wrapper is server-only and
requires `SERVICES_ADMIN_MODERATION_HTTP=enabled`; no browser route or
login session is created.

A future backend `GET /v1/admin/moderation/cases` must exist and enforce
dedicated admin session revocation, fresh MFA, authorized resource scopes,
bounded pagination and PII redaction **before** the wrapper is enabled.
The current backend PR #86 only prepares dedicated session storage and
authorization primitives; it does **not** implement that endpoint.

The private transport uses HTTPS, no redirects, credentials or cache, a
5-second timeout, a 16 KiB streamed response limit and an exact
`{items: SafeModerationCase[]}` response envelope capped at 50 rows.
It drops responses with unknown fields, wrong states, invalid times or
unexpected HTTP statuses. The opaque admin bearer must be supplied by a
server-side verified privileged session, never the browser.

Production release requires secure server session/cookie handling,
CSRF/origin checks, endpoint ACL and MFA tests, audit logs, rate
limits and KZ data residency review. Typecheck/test/build and E2E
results are not claimed by this PR.
