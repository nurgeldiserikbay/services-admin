# Admin audit trail presentation

This module is a reusable, read-only table for **already server-authorized, redacted** audit entries. It shows event action, internal subject/actor IDs, UTC time and reason code in kk/ru; unknown action labels are neutral rather than fabricated.

## Input contract (defense in depth)

The presenter rejects the entire page unless it contains at most 50 rows and only these exact keys on every row: `id`, `action`, `subjectKind`, `subjectId`, `actorId`, `occurredAt`, `reasonCode`. All IDs must be UUIDs; the subject kind must be one of professional, organization, review, affiliation or moderation_case; action and reason codes are bounded; `occurredAt` must be a valid UTC ISO timestamp ending in `Z`. Unknown fields are rejected to avoid accidentally passing personal data through this presentation model. Rejected input renders no audit table.

**Do not interpret this as authorization or redaction:** the API must still enforce least-privilege resource scopes, a dedicated MFA-protected administrator session, server-side data minimization, appropriate pagination, and safe durable audit persistence. The component remains **unmounted** until those backend requirements are met.

Never send emails, phone numbers, identity documents, OTP, bearer tokens or raw evidence through the audit view. Exports require separate backend authorization and redaction review. A client-side page limit does not replace backend query limits.
