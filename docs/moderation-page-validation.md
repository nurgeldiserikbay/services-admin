# Moderation page input validation

The reusable, currently unmounted moderation table only renders when the
server-supplied page has an exact redacted schema. A page has at most 50
rows, each with UUID `id`, permitted `subjectKind`, permitted `state`,
and a valid UTC ISO `createdAt`. Missing or extra keys, duplicate IDs
and invalid calendar timestamps reject the complete page.

This is **presentation-layer defense in depth**, not authorization or an
API contract declaration. The backend must independently authorize and scope
every query, redact responses, bound database pagination, and verify platform
admin session/MFA and revocation. The frontend permission hint is not
a server trust boundary.

Tests in `tests/moderation-page-core.test.mjs` execute the actual validation
function under `node --test`. Keep the table unmounted until the scoped
moderation read API exists and has integration tests.
