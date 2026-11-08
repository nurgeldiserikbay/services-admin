# Admin MFA and privileged onboarding proposal

**Status: proposal for owner/security review. This is not an approved authentication contract and does not enable admin provisioning or sessions.** Keep all admin integration flags disabled until the review and release gates below pass.

## Verified current state

- The backend has separate platform staff, session and resource-grant tables.
- Admin bearer tokens use a separate HMAC domain. The mounted moderation read path reloads staff status, expiry, MFA timestamp and exact resource grants from the database on each request.
- The active policy requires MFA verified within the last 15 minutes.
- Moderation read is disabled by default. There is no approved staff enrollment, first-owner bootstrap or MFA recovery flow yet.
- The canonical operations document lists six future roles; the current backend and Stage 3 acceptance use `owner`, `admin`, `operator` and `auditor`. Keep the four-role contract until the canonical role model is reconciled.

## Recommended defaults for review

1. **MFA:** Require a phishing-resistant WebAuthn/passkey authenticator for every platform staff role. Do not offer SMS or email codes as an MFA fallback. Permit at least two separately registered authenticators to reduce lockout risk.
2. **Recovery:** Issue single-use recovery codes once, show them only at enrollment, and store only salted hashes. If all authenticators and codes are lost, require documented identity verification and approval by two independent privileged people. Recovery must revoke existing sessions and authenticators.
3. **Initial owner:** Do not provide public registration or a permanent bootstrap token. Provision the first owner through a one-time deployment procedure with out-of-band identity verification, a recorded operator, and an audit event. Disable the bootstrap immediately after use.
4. **Staff lifecycle:** Only an authorized owner can invite or disable admin, operator and auditor accounts. Do not allow self-elevation or ordinary role changes to create another owner. Protect the last active owner from removal.
5. **Web session:** Keep a dedicated Secure, HttpOnly, SameSite=Strict host-only cookie on the admin origin; never expose the bearer in browser storage or response JSON. Enforce Origin/CSRF checks on mutations, no-store responses, short session expiry and reauthentication for sensitive operations.
6. **Step-up:** Preserve the implemented 15-minute MFA freshness check. Reverify before staff management, moderation decisions, recovery changes and exports. Revoke all privileged sessions after factor, role or account-status changes.
7. **Audit:** Record enrollment, authentication, recovery, staff changes, session revocation and moderation decisions with actor, action, target, timestamp and sanitized metadata. Never log tokens, recovery codes, authenticator secrets or private evidence.

These defaults are a proposal informed by NIST SP 800-63B-4's authenticator and recovery guidance. The product owner and security reviewer must approve the exact methods and recovery controls before they become implementation requirements.

## Required release sequence

1. Approve the MFA factor, first-owner bootstrap, recovery, session lifetime and role vocabulary.
2. Add reviewed API/DTO contracts and a threat model for staff enrollment, verification, recovery and revocation.
3. Implement backend state transitions and audit writes; keep public self-enrollment impossible.
4. Test anonymous, wrong-role, wrong-scope, expired-session, stale-MFA, revoked-session, self-elevation, lost-factor recovery and concurrent-owner changes.
5. Exercise the real HTTP flow in a disposable environment with feature flags off by default and verify no secrets in logs or responses.
6. Enable only after independent review, CI evidence, rollback instructions and deployment-specific approval.

## Source references

- [NIST SP 800-63B-4 — Authentication and Authenticator Management](https://csrc.nist.gov/pubs/sp/800/63/b/4/final)
- [Services admin integration release gates](admin-integration-release-gates.md)
- [Stage 3 admin security acceptance](admin-mvp-security-acceptance.md)
- Backend session migration comment: provisioning/session issuance remains disabled until MFA enrollment and privileged onboarding are reviewed.
