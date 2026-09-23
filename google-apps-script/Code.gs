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
  const action = (e && e.parameter && e.parameter.action) || 'list';
  try {
    if (action === 'read') return json_(readFile_(e.parameter.fileId));
    if (action === 'list') return json_({ success: true, files: listFiles_() });
    return json_({ success: false, error: 'Unsupported read action.' });
  } catch (error) {
    return json_({ success: false, error: error.message || String(error) });
  }
}

function doPost(e) {
  try {
    const request = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const action = request.action || 'create';
    if (action === 'create') return json_({ success: true, ...createFile_(request) });
    if (action === 'update') return json_({ success: true, ...updateFile_(request) });
    if (action === 'delete') return json_({ success: true, ...deleteFile_(request) });
    if (action === 'read') return json_(readFile_(request.fileId));
    if (action === 'list') return json_({ success: true, files: listFiles_() });
    return json_({ success: false, error: 'Unsupported action.' });
  } catch (error) {
    return json_({ success: false, error: error.message || String(error) });
  }
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
  if (bytes.length > MAX_IMAGE_BYTES) throw new Error('Profile images must be 5 MB or smaller.');
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

function createFile_(request) {
  const blob = blobFromRequest_(request).setName(filename_(request, request.mimeType));
  const file = DriveApp.getFolderById(DRIVE_FOLDER_ID).createFile(blob);
  return { id: file.getId(), name: file.getName(), url: publicUrl_(file) };
}

function updateFile_(request) {
  const file = managedFile_(request.fileId);
  // Drive's Apps Script File API cannot replace binary content in place reliably;
  // create the replacement first, then trash the old object after it succeeds.
  if (request.dataUrl) {
    const replacement = createFile_(request);
    file.setTrashed(true);
    return replacement;
  }
  if (request.name || request.studentId) {
    const current = file.getName().split('.').pop();
    file.setName(safePart_(request.name, 'Profile') + ' - ' + safePart_(request.studentId, 'Unknown ID') + '.' + current);
  }
  return { id: file.getId(), name: file.getName(), url: publicUrl_(file) };
}

function readFile_(fileId) {
  const file = managedFile_(fileId);
  return { success: true, id: file.getId(), name: file.getName(), url: publicUrl_(file) };
}

function deleteFile_(request) {
  const file = managedFile_(request.fileId);
  file.setTrashed(true);
  return { id: file.getId() };
}

function listFiles_() {
  const files = [];
  const iterator = DriveApp.getFolderById(DRIVE_FOLDER_ID).getFiles();
  while (iterator.hasNext()) {
    const file = iterator.next();
    if (ALLOWED_MIME_TYPES.indexOf(file.getMimeType()) >= 0) files.push({ id: file.getId(), name: file.getName(), url: publicUrl_(file) });
  }
  return files;
}
