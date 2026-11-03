# Moderation review component (unmounted)

A typed case review form adds reason validation, explicit retain/restrict/escalate decisions, expectedRevision optimistic concurrency, disabled double-submit and a clear server rejection state. **This component is intentionally not mounted on the live Admin shell**, because there is no vetted dedicated admin MFA session, no API that filters cases by assignment and no backend audited decision transition yet.

Business owner accounts are not platform administrators. Client claims cannot be trusted, and every moderation mutation needs backend scope, case ownership, audit record and appeal separation. Restricting a review does not rewrite organic ratings or override a professional's profile ownership.

Before connecting this component, build and test secure platform identity, backend scope checks, per-case audit logs, resource-aware pagination, decision transaction, appeal workflow and no-PII telemetry.
