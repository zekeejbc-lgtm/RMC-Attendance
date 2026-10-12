# Enrollment email confirmation

System Controls → Enrollment is restricted to the built-in `admin` role (System Owner / Super Admin). Delegated roles and custom roles cannot open or save these controls. Opening the editor and saving both require a new password login, an enrolled authenticator when present, and the exact word `initiate`. Database authorization checks the active role, session, signed authentication events within two minutes, and MFA. Direct table writes are denied and changes are audited.

The default is required confirmation using Supabase standard email. After submitting an enrollment, applicants see instructions, an illustrative email example (or the configured HTTPS image), resend, and a confirmation check. A verified Auth email is required to continue. School admission approval is still separate from email confirmation.

Policies apply to new student accounts:

- **Required:** create an unconfirmed account, send a verification email, and wait for confirmation.
- **Bypass:** create a confirmed account and sign it in without an email link.
- **Google only:** reject password-only enrollment on the server; verify Google's signed email ownership proof before creation. Existing accounts can still sign in using their existing credentials.

## Installation

Apply `supabase/migrations/20261012151908_enrollment_confirmation.sql` through the normal migration process, deploy the updated `rmc-enroll` function, then build/deploy the frontend. Keep Supabase Auth email confirmations enabled and configure production redirect URLs. No Management API token or service-role key is sent to the browser.

Custom delivery uses Resend and requires Edge Function secrets `ENROLLMENT_RESEND_API_KEY` and `ENROLLMENT_EMAIL_FROM` (a verified sender). Configure those before selecting Custom email. The editor controls the subject and plain-text message; the server appends a Supabase-generated verification link. Supabase's [generateLink API](https://supabase.com/docs/reference/javascript/auth-admin-generatelink) supports generating links for custom delivery. Custom enrollment uses a magic-link confirmation for the already-created unconfirmed account. Link tokens are never returned to the browser or audit log. The custom message supports plain text, not executable HTML. Standard email content remains managed by Supabase.

Saved accounts remain recoverable if mail delivery fails. Resend uses the account's server-owned original email delivery selection, including when the global setting later changes. It returns the same success response for unknown and confirmed addresses to avoid exposing account existence. Enrollment and resend use the existing server rate limiter.

Run `supabase/tests/enrollment_confirmation.sql` against a migrated test database. The test transaction rolls back its settings, factors, sessions, role changes, and audit entries.
