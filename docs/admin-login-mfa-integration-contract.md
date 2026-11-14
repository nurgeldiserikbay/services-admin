# Dedicated administrator login and MFA — integration contract

**Status: specification only. Not implemented.** The existing moderation BFF is intentionally default-off. Never treat this document as authorization to expose it.

## Security model

1. **Backend is authoritative** for staff identity, active status, roles (owner/admin/operator/auditor), resource grants, MFA enrollment/freshness, session expiry and revocation. The Next.js app cannot mint privileged sessions by itself.
2. **Browser only holds a Secure, HttpOnly, SameSite=Strict, Path=/, __Host- session cookie**. No bearer token, OTP, recovery code or encryption key is ever serialized into HTML, client props, localStorage, URL, logs or browser-visible API JSON.
3. A successful credential check **without fresh MFA is not a privileged session**. MFA enrollment, challenge and recovery require backend-side throttling, audit events and replay prevention. Recovery cannot silently bypass equivalent assurance.
4. After backend confirmation, a server-only BFF handler may call `sealAdminSession(token, expiresAt)` with a backend-issued 32-byte canonical base64url bearer and its authoritative expiry. Cookie lifetime must not outlive backend expiry or the existing 15-minute maximum. No token issuance through arbitrary request headers or user-supplied cookies.
5. Every privileged request is reauthorized by the backend; frontend role hints are only presentation. Backend must reject revoked/expired sessions, stale MFA, disabled staff and out-of-scope resources.
6. All credential-changing POST handlers require strict origin and Fetch Metadata checks, anti-CSRF protections, bounded input, rate limiting and generic error messages. Treat reverse-proxy host/origin configuration as trusted infrastructure, not client-controlled headers.

## Backend prerequisites before writing a login route

- Dedicated admin identity and password/SSO authentication contract, with secure failure behavior and throttling.
- MFA challenge issuance and verification with replay protection, freshness and audit trail.
- Privileged session creation returning a canonical short-lived bearer **only to the trusted server-side BFF** over HTTPS; document expiry, revocation and rotation semantics.
- Permission-matrix tests for all four roles, disabled staff, expired grants, resource scopes and denied self-elevation.
- Logout revocation confirmation and session invalidation across instances.
- Deployment-specific origin, CSRF and HTTPS cookie tests.

## Browser-to-BFF flow (not yet mounted)

```text
Browser -> BFF: login initiation (no admin bearer)
BFF -> Backend: authenticate via approved server-only contract
Backend -> BFF: MFA required, opaque short-lived challenge reference
Browser -> BFF: MFA proof + anti-CSRF
BFF -> Backend: verify MFA and issue privileged session
Backend -> BFF: canonical bearer, expiry, authorized session metadata
BFF: encrypt bearer with SERVICES_ADMIN_COOKIE_KEY
BFF -> Browser: Set-Cookie __Host-services-admin-session; Secure; HttpOnly; SameSite=Strict; Path=/
Browser -> BFF: GET /moderation (cookie only)
BFF -> Backend: GET /v1/admin/moderation/cases with bearer
Backend: validate active session, MFA freshness, role and scope
BFF -> Browser: redacted bounded items, no token
```

The challenge reference must be short-lived, unguessable, one-time or replay-protected, and bound to the initiating authentication transaction. No implementation should be merged until the actual backend contract is reviewed.

## Acceptance tests

- Anonymous, malformed cookie, duplicate cookie, invalid challenge, incorrect OTP, reused OTP, expired MFA, revoked session, disabled staff and insufficient scope all fail closed.
- A successful MFA session is bound to an authoritative expiry and is never accepted after revocation.
- CSRF/cross-site requests cannot create, rotate or revoke sessions; same-origin valid flows work behind the actual trusted proxy.
- Session tokens, OTPs and recovery codes are absent from rendered HTML, JSON responses, browser storage, redirects, application logs and telemetry.
- Parallel login, logout and rotation requests do not resurrect revoked sessions.
- Integration tests exercise a real backend, HTTPS cookies, database state and audit events; unit mocks alone are insufficient.

**Release gate:** keep `SERVICES_ADMIN_ENABLE_MODERATION_BFF` disabled until all backend prerequisites and acceptance tests pass.
