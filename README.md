# RMC Attendance

React/Vite application connected to Supabase project `iqnjyebkcetcmwammxff`.

```sh
npm ci
npm run dev
```

The local environment is already configured. For another workstation, copy `.env.example` to `.env.local` and supply the project's publishable key. Only `VITE_SUPABASE_URL` and the publishable key belong in the frontend environment. Never put a service-role key in a `VITE_` variable.

## Connected workflows

- Supabase Auth login by username or email, persistent sessions, password changes, password recovery, and authenticator MFA.
- Academic directory creation, hierarchy templates, officer assignment, role permissions, enrollment keys, account creation, and CSV member imports.
- Student admission, private photo/ID uploads, rejection, resubmission, and approval.
- Events, weekly recurrence, recipient scopes, daily attendance windows, geofences, and late/absence rules.
- Expiring QR passes, officer identity checks, manual attendance with a reason, scan-in/out, service hours, and merit credits.
- Scheduled absence finalization, sanction adjustments, excuse documents/review, reports, and audit records.
- System/unit freezes, role administration, and stored in-app payment notices.

Attendance uses database time and database authorization. Concurrent duplicate scans do not award credits or penalties twice. Geofenced saves require a new GPS reading; offline scans are not accepted. The displayed student identity must still be verified by the officer. A browser's GPS can be spoofed, so it is not a guarantee of physical presence.

School data is loaded into an authorized in-memory snapshot and refreshed after writes, on focus, and every 15 seconds while visible. It is not stored in a browser demo database. Supabase stores its Auth session locally. The old simulator exists only under `tests/fixtures` for isolated component regression tests.

## Checking accounts

The five original test identities are retained in Supabase Auth: `admin`, `ossa`, `ssg`, `mayor`, and `student`. Their newly generated passwords are in the ignored local file `.demo-accounts.local`. Credentials are never included in the website or committed to Git.

The administrator can create the actual academic hierarchy and assign staff to the appropriate units. Other checking accounts initially have no academic assignment. There are no sample directory units, events, attendance records, admissions, or sanctions.

`npm run seed:test-accounts` is an explicit, server-only maintenance command. It needs `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the ignored `.env.server.local`; it preserves existing accounts and does not seed business data. Provisioned members without an explicit initial password receive an unguessable password and must request a password reset. Provisioning does not send emails automatically.

## Database and functions

Eight migrations in `supabase/migrations` have been applied to the connected project. Both Edge Functions, `rmc-login` and `rmc-accounts`, are deployed. The private `rmc-documents` bucket and the once-per-minute `rmc-finalize-attendance` cron job are installed.

Public tables have RLS and explicit grants. Business writes go through authorized database functions. Account provisioning authenticates the caller and performs role/scope checks before using server-only Auth administration. Deactivation and enrolled MFA also restrict personal reads and private documents.

The Edge Function gateway setting `verify_jwt = false` is intentional: login accepts a password without an existing JWT, and account management verifies its bearer token with `auth.getUser`, then runs authorization RPCs with that caller's JWT. Never remove those checks.

Future changes should use new migrations, not edits to applied migrations:

```sh
npx supabase login
npx supabase link --project-ref iqnjyebkcetcmwammxff
npx supabase migration new describe_change
npx supabase db push
npx supabase functions deploy rmc-login
npx supabase functions deploy rmc-accounts
```

Use the correct Supabase account when linking. The Codex MCP connection is separately authenticated; it does not replace the CLI's account login. The installed Supabase agent skills are in the local Codex skill directory.

## Verification

```sh
npm run typecheck
npm test
npm run build
npm audit
npm run test:integration
npm run audit:browser
node scripts/verify-browser-writes.mjs
```

Integration checks require both ignored environment files and `.demo-accounts.local`. They create uniquely named temporary records in the configured project and remove only those records in cleanup. They exercise actual Auth, RPCs, RLS, Edge Functions, storage, concurrency, cron, and TOTP. No email is sent by the test suite.

The browser write check creates and removes temporary directory/event records using the actual forms.

The browser check requires Chrome and the application running at `http://127.0.0.1:4173`. Start it with `npm run dev -- --host 127.0.0.1 --port 4173`, or set `AUDIT_BASE_URL` to your local server. `CHROME_PATH` can override the Chrome executable. Results are saved in ignored `.supabase-verification.local` and `.browser-verification.local`.

Verified on 2026-09-19: 133 automated tests, 53 live integration checks, and 28 authenticated browser routes at desktop/mobile widths. Type checking and the production build passed; dependency audit reported zero vulnerabilities.

## Required before public launch

The application and backend are connected; public deployment has not been completed or certified.

1. Supply the production HTTPS URL and deploy `dist` with the two public Supabase environment variables. Set that origin as Supabase Auth's Site URL and allow it in redirect URLs. The production host is not known yet. HTTPS is required for camera/GPS outside localhost.
2. In Supabase Auth settings, verify email confirmation, configure a production SMTP provider, enforce a minimum password length of 12, and enable leaked-password protection when supported by the project plan. The MCP OAuth client cannot request the Auth configuration scopes needed to change those settings. Local `supabase/config.toml` settings do not change the hosted project. Leaked-password protection remains the security advisor's outstanding warning.
3. Test signup confirmation and password-recovery email delivery on the deployed origin. Those messages have not been sent during automated checks.
4. Test a physical phone camera and GPS: valid QR, expired QR, duplicate scan, outside-boundary scan, and service scan-out. API validation and mocked camera callbacks are tested; physical hardware and deployed permissions are not.
5. Enter the real academic hierarchy, officer assignments, and optional verified support contact environment values. Confirm the school's intended attendance/sanction rules before creating live events. Enrollment keys are stored as hashes; share a newly set key when saving it because existing keys cannot be retrieved.

Payment reminders are in-app notices, not outbound emails or payment processing. Database capacity, backups, and hosting uptime are managed in the Supabase dashboard rather than fabricated in the application.
