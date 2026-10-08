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
- Organizations at school-wide or any academic-unit scope, multiple student memberships, organization heads, public visibility, optional join keys, and reviewed applications.
- Organization attendance and merit events, with OSAS approval before sanction-bearing events open and before individual organization sanctions affect balances.

## Excuse submissions

In an event or ceremony's **Rules & Location** step, authorized creators/editors can set **Days to submit after the activity ends** (0–30; default 3). Zero closes filing at the activity's end. Each recurring occurrence uses its own end time. Students may file in advance once the activity is approved and see the exact deadline in Philippine time. Existing activities without a setting use the three-day default. The existing restrictions on editing activities with attendance still apply.

An explanation of at least 10 characters and a supporting PDF, JPG, PNG, or WebP document up to 5 MB are required. The database enforces deadlines, document ownership/existence, and one pending or approved request per student/activity. Rejected requests can be resubmitted before the deadline. General events, cancelled activities, service, merit, and unapproved activities do not accept excuses. Existing scope and freeze checks still apply. Filing alone does not excuse an absence; OSSA approval is required, and OSSA may review a timely request after the submission window closes. Exceptional late cases must be handled by OSSA through its existing case/sanction tools.

Run `node scripts/verify-excuses.mjs` with the server environment and local test-admin credentials to verify the live policy. It creates and removes temporary records and uploads.

## Organizations

Open **School Hierarchy** (or your role's hierarchy page), select an academic unit, and use the same **Add** tile as educational units, then choose **Organization** from **Semantic type**. Existing organizations remain separately labeled; empty organization panels are hidden. The form automatically locks the selected unit. The administrator's hierarchy root contains school-wide organizations. Accounts with directory-structure permission can establish organizations within their assigned scope. Students retain the Organizations directory for discovery and joining. Assign organization heads without changing their existing account roles. Heads can change the logo, public visibility, and joining policy, review applications, remove members, and manually add students from their own academic unit. Organization scope is fixed after creation.

Joining can be closed, immediate, or subject to head approval, with an optional hashed join key. Students can join multiple organizations while retaining their academic enrollment. Hidden organizations remain accessible to their members, heads, and authorized reviewers, and are omitted from the public directory at `/#/organizations/public`.

Heads submit individual sanctions to OSAS. Attendance events with penalties also remain pending until OSAS approves them; changing their configuration requires another review. Only scoped OSAS accounts can approve sanctions, including submissions made by administrators. Merit events use the existing attendance completion rules: complete all required sessions, deduct outstanding sanction hours first, then credit excess hours as merit. Admin, OSAS, and SSG retain their existing merit-event creation tools; organization heads create them from the organization page.

Logos use the existing Google Apps Script image uploader and Google Drive display mechanism. The configured web-app URL must be deployed and accessible. Failed uploads leave the organization form open with a readable error.

The organization schema is in `20260930160615_organizations_membership_approval.sql`. Verification commands create uniquely named temporary records and clean them up:

```sh
npm run test:organizations
npm run test:organizations:browser
```

The browser check expects a local server at `http://127.0.0.1:4173` (override with `AUDIT_BASE_URL`) and tests a real logo upload. Set `MOCK_ORGANIZATION_UPLOAD=1` only to verify the remaining UI when the image service is unavailable; that mode does not verify the live uploader.

Attendance uses database time and database authorization. Concurrent duplicate scans do not award credits or penalties twice. Geofenced saves require a new GPS reading; offline scans are not accepted. The displayed student identity must still be verified by the officer. A browser's GPS can be spoofed, so it is not a guarantee of physical presence.

School data is loaded into an authorized in-memory snapshot and refreshed after writes, on focus, and every 15 seconds while visible. It is not stored in a browser demo database. Supabase stores its Auth session locally. The old simulator exists only under `tests/fixtures` for isolated component regression tests.

## Checking accounts

The five original test identities are retained in Supabase Auth: `admin`, `ossa`, `ssg`, `mayor`, and `student`. Their current demo passwords are in the ignored local file `.demo-accounts.local`. Credentials are never included in the website or committed to Git.

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

## Google login and enrollment setup

Cloud configuration was completed on 2026-10-08 for Vercel project `rmcssg` and Supabase project `iqnjyebkcetcmwammxff`: Google client ID in all three Vercel environments and the Edge Function environment, Google provider credentials, nonce checks, production Site URL, and local redirect URLs. `rmc-enroll` is deployed. The Google enrollment migration and updated frontend release still need to be deployed together. Google Cloud authorized origins and real browser consent must be checked in the OAuth client's console.

On this Windows workspace, `node scripts/configure-cloud-environment.mjs` synchronizes allowlisted public frontend variables and the Edge Function's Google client ID. `node scripts/configure-google-provider.mjs` previews provider/URL differences and verifies hosted settings; add `--apply` to save the declared configuration and the Google secret. These scripts read `.env.local` and `.env.server.local`, keep credentials out of command arguments, and suppress secret values. `node scripts/verify-cloud-google.mjs` verifies matching cloud values, authorization callback, deployed invalid-token rejection, and absence of the Google client secret from the frontend build. Supply `GOOGLE_CLIENT_SECRET` only in the ignored server environment file.

Google selection verifies an email without creating an Auth user, profile, or application. Unknown emails are prompted to enroll. Google enrollment locks the verified email and creates a pending account/application only after the complete form passes server validation. Existing emails sign in to their existing account; pending applicants are routed to application status by the existing route guard. Google enrollment still asks for a password so username/password login remains available. Suspended/inactive/graduated accounts cannot use Google to regain access.

Creation is limited to one attempt per email every 60 seconds and five attempts per IP every ten minutes, including failed Auth creation attempts. Existing Google accounts can sign in during this cooldown. Database tickets prevent direct Auth signup/OAuth from bypassing final enrollment. Existing email/name/username/student-ID unique indexes remain the final duplicate guard. Staff provisioning retains its separate authenticated reservation flow.

1. Create a **Web application** OAuth client in Google Cloud's Google Auth Platform. Configure branding/audience and add your deployed origin plus `http://127.0.0.1:3000` (or the exact development origin you use) under **Authorized JavaScript origins**. Add test users if the audience is still in Testing. Add `https://iqnjyebkcetcmwammxff.supabase.co/auth/v1/callback` under **Authorized redirect URIs**.
2. In Supabase **Authentication → Sign In / Providers → Google**, enable Google and save that client ID and client secret. Keep nonce verification enabled. Set the production Site URL/redirect allowlist for signup confirmation and password recovery. Follow the [Supabase Google setup guide](https://supabase.com/docs/guides/auth/social-login/auth-google).
3. Set `VITE_GOOGLE_CLIENT_ID=YOUR_WEB_CLIENT_ID.apps.googleusercontent.com` in `.env.local` and your frontend hosting environment. Set the same ID as the Edge Function secret `GOOGLE_CLIENT_ID` in Supabase. The Google client secret belongs only in Supabase's provider settings.
4. Deploy `rmc-enroll`, apply `supabase/migrations/20261008111610_google_enrollment_guard.sql`, and deploy this frontend in the same release. The database guard requires the updated frontend for regular enrollment too. The linked project's history has older gaps and a newer applied migration, so use the targeted query below rather than a general `db push --include-all`. Run the repair command only after the query succeeds; it records this migration without changing other history entries. If migration list already shows this version applied remotely, skip the query/repair pair.

```sh
npx supabase secrets set GOOGLE_CLIENT_ID=YOUR_WEB_CLIENT_ID.apps.googleusercontent.com
npx supabase functions deploy rmc-enroll
npx supabase migration list --linked
npx supabase db query --linked --file supabase/migrations/20261008111610_google_enrollment_guard.sql
npx supabase migration repair 20261008111610 --status applied --linked
npm run configure:hosting
npm run build
```

The implementation uses Google's popup button and passes verified ID tokens through the enrollment Edge Function; no Google credentials are saved in browser storage. Restart Vite after editing `.env.local`. Production needs HTTPS. The CSP in the generated hosting headers permits Google's sign-in script/frame/connections.

After setup, test a new Google email: login must prompt enrollment and leave Auth Users unchanged, selecting Google during enrollment must lock the email without creating a user, and final submission must create exactly one pending application. Sign in again through either Google button to open the existing status page. Test an approved account, an inactive account, duplicate tabs, a cooldown retry, and normal email confirmation. Automated tests verify the handler/UI branches; real Google popup/provider integration requires your OAuth configuration and browser consent.

Focused checks: `npm test -- tests/google-enrollment-edge.test.ts tests/enrollment.test.tsx lib/backend.test.ts tests/security-config.test.ts`. `tests/google-enrollment.sql` exercises the real database guard/cooldown/duplicate behavior; run it with the migration inside a transaction and **ROLLBACK**. It creates temporary records and requires an existing active administrator for the directory fixture. The live database checks performed during development were rolled back; this feature's migration/function have not been deployed.

## Verification commands

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

## PWA and browser security

`npm run build` generates an installable manifest, standard/maskable icons, an Apple touch icon, and a service worker. The worker precaches only this build's app assets. Supabase requests, private documents, QR passes, external images, and attendance writes are never added to a runtime cache or an offline write queue. Authentication callback query parameters are not cached. Opening the shell offline is supported; private records and writes require a connection. Saved sessions opened offline retain their route and resume loading on reconnect.

Supported browsers offer **Install IARS** when installation is available. On iOS, use Safari's **Share > Add to Home Screen**. App updates prompt for a reload so users can finish their work first. Development does not register a worker; test the production build with `npm run preview -- --host 127.0.0.1 --port 4175` and `npm run test:pwa` (Chrome required; `AUDIT_BASE_URL` and `CHROME_PATH` can override defaults). Production must use HTTPS.

`security.config.mjs` provides a CSP permitting the app's Supabase, Google image service, fonts, and map tiles while blocking inline scripts, plugins, and framing. Camera and GPS remain permitted for this origin. Vite preview applies these headers, and each build emits `dist/_headers` for Netlify/Cloudflare Pages; `netlify.toml` selects the build and output directory. `vercel.json` supplies equivalent Vercel headers for the current backend; if that origin changes, run `npm run configure:hosting` with the production environment and commit the regenerated configuration before deployment. For another host, apply the equivalent HTTP headers and serve `sw.js` without caching and HTML/manifest with revalidation. Do not apply long immutable caching to `sw.js` or HTML. Rebuild when the backend origin changes so CSP matches the environment.

Builds reject secret/service-role keys in frontend environment variables. API fetches and deployed Edge Function responses use `no-store`; Edge Functions also bound request sizes. Sensitive-action RPCs use the session that just verified the password and MFA, sending only confirmation text and a reason to the command API. The `20261008110405_enforce_qr_mfa.sql` migration protects live QR issuance and printed QR access/rotation with the same enrolled-MFA checks as private reads. Accounts without enrolled MFA retain their existing QR behavior.

The Google Drive web app needs its separate [deployment and ownership setup](google-apps-script/README.md). Updating this repository alone does not close the existing hosted script's unauthenticated photo-management vulnerability. Deploy the new frontend first, update the existing script deployment, and assign verified ownership to legacy images to retain old-photo cleanup.

Verification on 2026-10-08: production build, typecheck, nine Chrome PWA/installability/offline/cache/CSP checks, 28 authenticated browser routes at desktop/mobile widths, 67 focused security/backend regression tests, and 61 live backend checks passed. QR PNG export and decoding from a simulated camera frame also passed under the production CSP. The runtime dependency audit reports zero known vulnerabilities. The full unit/UI suite is not green: the original checkout reproduces 40 failures across six older UI test files, and the working tree reproduces 39 of them. The last full run had 306 passes and 41 failures, including two registration mock failures during concurrent signup edits; the updated backend's 15 tests subsequently passed on a focused rerun. Its older integration fixtures were updated for the current enrollment and excuse requirements. The complete dependency audit still reports five high-severity entries from the unpatched `braces` build-tool advisory through Tailwind's dependency chain. These are unresolved findings, not a claim of complete security. Hosted Auth leaked-password protection and intentional public validation/lookup function advisor warnings also require launch review. The QR MFA fix and hardened Edge Functions have been applied to the configured Supabase project; website hosting and the Google Apps Script redeployment remain outstanding. Google enrollment and notification changes were being edited concurrently and need their own coordinated deployment/verification; their implementation was preserved.
