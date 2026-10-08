# Profile image API

1. Build and deploy the updated frontend before updating the script. Its requests include per-upload management capabilities and, for signed-in users, their access token. The earlier script ignores these extra fields, so this deployment order preserves uploads.
2. Open Google Apps Script and paste `Code.gs` into the project. In **Project Settings > Script properties**, configure `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` for the same project as the frontend. Do not use a service-role key. The script verifies each signed-in caller with Supabase Auth and checks their account/MFA access through RLS.
3. Set `ANONYMOUS_DAILY_UPLOAD_LIMIT` to the school's expected registration capacity (default 200 per UTC day). Public registration still uploads before signup; its storage consumption is limited. This daily limit is not a CAPTCHA or a per-person abuse limit.
4. Update the existing deployment under **Deploy > Manage deployments > Edit > New version**, retaining **Execute as** the Drive owner and **Who has access** **Anyone**. Deploying a separate URL while leaving the old unauthenticated deployment active leaves the old vulnerability reachable. Archive obsolete deployments.
5. Confirm the retained `/exec` URL matches `VITE_GOOGLE_DRIVE_GAS_URL`, then test registration, profile replacement, organization logo upload, and failed-save cleanup against the deployed script.

The folder must remain shared according to the Drive owner’s policy; the script sets each image to **Anyone with the link / Viewer** and returns a public `thumbnail?id=...&sz=w1600` URL. Drive’s `uc?export=view` endpoint can return 403 when embedded by a browser, so the thumbnail endpoint is used for display.

Endpoints:

- `POST { action: "create", name, studentId, mimeType, dataUrl, managementToken, accessToken? }`
- `POST { action: "update", fileId, name, studentId, mimeType, dataUrl, replacementManagementToken, managementToken?, accessToken? }`
- `POST { action: "delete" | "read", fileId, managementToken?, accessToken? }`
- `POST { action: "list", accessToken }` returns only the caller's owned images.

The frontend generates random management capabilities, retains them in the current tab, and sends them only in POST bodies. The script stores their hashes in the file description. Read/update/delete require that capability or a validated owner session. GET inventory requests, forged sessions, incomplete MFA, and management of another user's files are rejected. Image MIME types, signatures, and sizes are checked on the server.

Existing public image links continue to display. Legacy files lack verified ownership metadata and cannot safely be claimed using browser-supplied names, student IDs, or profile URLs. After verifying each image's owner against school records, the Drive administrator can call `assignLegacyImageOwner(fileId, supabaseUserId)` from the trusted Apps Script editor. This helper is never exposed by the web app. Until ownership is assigned, replacement still saves the new photo, but cleanup of the old file is denied. Anonymous uploads can be managed only while the uploading tab retains its capability.

These changes in the repository do not update an existing Google Apps Script deployment. The deployed service remains vulnerable until its owner completes the deployment steps above. Photos and organization logos remain public by link as required by the existing display flow; private supporting documents use Supabase Storage.
