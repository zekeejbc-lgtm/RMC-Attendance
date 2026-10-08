/**
 * RMC Attendance profile image API.
 * Deploy as a web app: execute as the owner, who has access: anyone.
 */
const DRIVE_FOLDER_ID = '1ow0X_gdQB7AwJI5pAFJeP1YTftbc845Q';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  // Credentials must never appear in URLs, logs, or referrers. No public inventory.
  return json_({ success: false, error: 'Use an authorized POST request.' });
}

function doPost(e) {
  try {
    const contents = (e && e.postData && e.postData.contents) || '{}';
    if (contents.length > 7 * 1024 * 1024) throw new Error('Request is too large.');
    const request = JSON.parse(contents);
    if (!request || typeof request !== 'object' || Array.isArray(request)) throw new Error('Invalid request.');
    const action = request.action || 'create';
    const actor = actor_(request.accessToken);
    if (action === 'create') {
      return json_({ success: true, ...createFile_(request, actor) });
    }
    if (action === 'update') return json_({ success: true, ...updateFile_(request, actor) });
    if (action === 'delete') return json_({ success: true, ...deleteFile_(request, actor) });
    if (action === 'read') return json_(readFile_(request, actor));
    if (action === 'list') {
      if (!actor) throw new Error('Sign in first.');
      return json_({ success: true, files: listFiles_(actor) });
    }
    return json_({ success: false, error: 'Unsupported action.' });
  } catch (error) {
    return json_({ success: false, error: error.message || String(error) });
  }
}

function actor_(token) {
  if (!token) return null; // Registration uploads happen before signup.
  if (typeof token !== 'string' || token.length > 8192) throw new Error('Invalid session.');
  const properties = PropertiesService.getScriptProperties();
  const url = properties.getProperty('SUPABASE_URL');
  const key = properties.getProperty('SUPABASE_PUBLISHABLE_KEY');
  if (!url || !/^https:\/\/[a-z0-9.-]+(?::\d+)?\/?$/i.test(url) || !key) throw new Error('Image service authentication is not configured.');
  const options = { headers: { apikey: key, Authorization: 'Bearer ' + token }, muteHttpExceptions: true };
  const identity = UrlFetchApp.fetch(url.replace(/\/$/, '') + '/auth/v1/user', options);
  if (identity.getResponseCode() !== 200) throw new Error('Invalid session.');
  const user = JSON.parse(identity.getContentText());
  if (!user.id || !/^[0-9a-f-]{36}$/i.test(user.id)) throw new Error('Invalid session.');
  // RLS checks account status and enrolled MFA as well as identity.
  const profile = UrlFetchApp.fetch(url.replace(/\/$/, '') + '/rest/v1/rmc_profiles?select=id&id=eq.' + encodeURIComponent(user.id), options);
  if (profile.getResponseCode() !== 200 || !JSON.parse(profile.getContentText()).some(function (row) { return row.id === user.id; })) {
    throw new Error('Verify your account and security code before managing images.');
  }
  return user.id;
}

function tokenHash_(token) {
  if (typeof token !== 'string' || !/^[a-z0-9-]{72}$/i.test(token)) throw new Error('Image management token is required.');
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, token).map(function (byte) { return ('0' + ((byte + 256) % 256).toString(16)).slice(-2); }).join('');
}

function ownership_(file) {
  try { return JSON.parse(file.getDescription() || '{}'); } catch (_) { return {}; }
}

function authorizedFile_(request, actor) {
  const file = managedFile_(request.fileId);
  const owner = ownership_(file);
  if (actor && owner.owner === actor) return file;
  if (owner.capability && request.managementToken && owner.capability === tokenHash_(request.managementToken)) return file;
  // Existing files without ownership remain viewable, but cannot be claimed by
  // supplying a filename, student ID, or a user-editable profile URL.
  throw new Error('You do not have permission to manage this image.');
}

function limitAnonymousUploads_() {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const properties = PropertiesService.getScriptProperties();
    const day = new Date().toISOString().slice(0, 10);
    const saved = JSON.parse(properties.getProperty('ANONYMOUS_UPLOAD_COUNT') || '{}');
    const count = saved.day === day ? Number(saved.count) || 0 : 0;
    const limit = Number(properties.getProperty('ANONYMOUS_DAILY_UPLOAD_LIMIT')) || 200;
    if (count >= limit) throw new Error('The daily registration photo limit has been reached. Contact school support.');
    properties.setProperty('ANONYMOUS_UPLOAD_COUNT', JSON.stringify({ day: day, count: count + 1 }));
  } finally { lock.releaseLock(); }
}

// Run only from the trusted Apps Script editor after verifying the file's
// existing owner against school records. This is never exposed by doPost.
function assignLegacyImageOwner(fileId, ownerId) {
  if (!/^[0-9a-f-]{36}$/i.test(ownerId)) throw new Error('A verified Supabase user ID is required.');
  const file = managedFile_(fileId);
  const current = ownership_(file);
  if (current.owner || current.capability) throw new Error('This image already has ownership protection.');
  file.setDescription(JSON.stringify({ owner: ownerId }));
}

function safePart_(value, fallback) {
  const clean = String(value || fallback).trim().replace(/[\\/:*?"<>|#%{}~]/g, '-').replace(/\s+/g, ' ').replace(/-+/g, '-');
  return clean.substring(0, 100) || fallback;
}

function extension_(mimeType) {
  return mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
}

function blobFromRequest_(request) {
  const mimeType = String(request.mimeType || '');
  if (ALLOWED_MIME_TYPES.indexOf(mimeType) < 0) throw new Error('Only JPG, PNG, and WebP images are allowed.');
  const encoded = String(request.dataUrl || '').replace(/^data:[^;]+;base64,/, '');
  if (!encoded) throw new Error('Image data is required.');
  const bytes = Utilities.base64Decode(encoded);
  if (!bytes.length) throw new Error('Image data is required.');
  if (bytes.length > MAX_IMAGE_BYTES) throw new Error('Profile images must be 5 MB or smaller.');
  const unsigned = bytes.map(function (byte) { return (byte + 256) % 256; });
  const valid = mimeType === 'image/jpeg' ? unsigned[0] === 255 && unsigned[1] === 216 && unsigned[2] === 255
    : mimeType === 'image/png' ? unsigned.slice(0, 8).join(',') === '137,80,78,71,13,10,26,10'
    : unsigned.slice(0, 4).join(',') === '82,73,70,70' && unsigned.slice(8, 12).join(',') === '87,69,66,80';
  if (!valid) throw new Error('The file content does not match its image type.');
  return Utilities.newBlob(bytes, mimeType);
}

function filename_(request, mimeType) {
  return safePart_(request.name, 'Profile') + ' - ' + safePart_(request.studentId, 'Unknown ID') + '.' + extension_(mimeType);
}

function publicUrl_(file) {
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w1600';
}

function managedFile_(fileId) {
  const file = DriveApp.getFileById(String(fileId || ''));
  const parents = file.getParents();
  while (parents.hasNext()) {
    if (parents.next().getId() === DRIVE_FOLDER_ID) return file;
  }
  throw new Error('The requested file is outside the profile image folder.');
}

function createFile_(request, actor) {
  const capability = tokenHash_(request.managementToken);
  const blob = blobFromRequest_(request).setName(filename_(request, request.mimeType));
  if (!actor) limitAnonymousUploads_();
  const file = DriveApp.getFolderById(DRIVE_FOLDER_ID).createFile(blob);
  file.setDescription(JSON.stringify({ owner: actor || null, capability: capability }));
  return { id: file.getId(), name: file.getName(), url: publicUrl_(file) };
}

function updateFile_(request, actor) {
  const file = authorizedFile_(request, actor);
  // Drive's Apps Script File API cannot replace binary content in place reliably;
  // create the replacement first, then trash the old object after it succeeds.
  if (request.dataUrl) {
    const replacement = createFile_(Object.assign({}, request, { managementToken: request.replacementManagementToken }), actor);
    file.setTrashed(true);
    return replacement;
  }
  if (request.name || request.studentId) {
    const current = file.getName().split('.').pop();
    file.setName(safePart_(request.name, 'Profile') + ' - ' + safePart_(request.studentId, 'Unknown ID') + '.' + current);
  }
  return { id: file.getId(), name: file.getName(), url: publicUrl_(file) };
}

function readFile_(request, actor) {
  const file = authorizedFile_(request, actor);
  return { success: true, id: file.getId(), name: file.getName(), url: publicUrl_(file) };
}

function deleteFile_(request, actor) {
  const file = authorizedFile_(request, actor);
  file.setTrashed(true);
  return { id: file.getId() };
}

function listFiles_(actor) {
  const files = [];
  const iterator = DriveApp.getFolderById(DRIVE_FOLDER_ID).getFiles();
  while (iterator.hasNext()) {
    const file = iterator.next();
    if (ownership_(file).owner === actor && ALLOWED_MIME_TYPES.indexOf(file.getMimeType()) >= 0) files.push({ id: file.getId(), name: file.getName(), url: publicUrl_(file) });
  }
  return files;
}
