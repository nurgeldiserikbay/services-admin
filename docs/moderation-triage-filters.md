# Moderation triage filters

This is a reusable kk/ru state/type selector and pure filtering of an **already authenticated, authorized and server-paginated** moderation case list. Filtering only the current page cannot produce global queue totals and does not grant the user access to more cases.

The component is deliberately unmounted until dedicated platform Admin session/MFA, backend scoped list API, read audit logs and paginated moderation cases are operational. It does not create moderation cases, decisions, exports or role changes. Do not mistake client-side filtering for backend permission enforcement.
