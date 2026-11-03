# Admin audit trail presentation

This module is a reusable, read-only table for **already server-authorized, redacted** audit entries. It shows event action, internal subject/actor IDs, time and reason code in kk/ru; unknown action labels are neutral rather than fabricated. Entries are constrained to at most 50 per page.

Not mounted on the live shell, because dedicated Admin MFA, backend scopes, audit event persistence and safe paginated read API are not implemented. This is not an audit system or a permission boundary by itself. Never expose emails, phones, identity documents, OTP, bearer tokens or raw evidence through this interface. Exports require separate backend authorization and redaction review.
