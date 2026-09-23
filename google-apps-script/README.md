# Profile image API

1. Open Google Apps Script and paste `Code.gs` into the project.
2. Deploy **Deploy > New deployment > Web app**.
3. Set **Execute as** to the Drive owner and **Who has access** to **Anyone**.
4. Copy the `/exec` URL into `VITE_GOOGLE_DRIVE_GAS_URL`.

The folder must remain shared according to the Drive owner’s policy; the script sets each image to **Anyone with the link / Viewer** and returns a public `thumbnail?id=...&sz=w1600` URL. Drive’s `uc?export=view` endpoint can return 403 when embedded by a browser, so the thumbnail endpoint is used for display.

Endpoints:

- `POST { action: "create", name, studentId, mimeType, dataUrl }`
- `POST { action: "update", fileId, name, studentId, mimeType, dataUrl }`
- `POST { action: "delete", fileId }`
- `GET ?action=read&fileId=...` and `GET ?action=list`
