// ── Add this function to your Google Apps Script web app ──────────────────
// It handles the 'uploadFile' and 'deleteFile' actions sent from the dental app.
//
// HOW TO DEPLOY:
// 1. Open your Google Apps Script project at script.google.com
// 2. Paste uploadFileToDrive() and deleteFileFromDrive() into Code.gs
// 3. In your existing doPost(e) function, add the two case blocks shown at the bottom
// 4. Deploy > Manage Deployments > create new deployment (Web app, Execute as: Me, Who has access: Anyone)
// 5. Copy the new Web app URL and set it in Cyrabell's ☁️ Sync page

function uploadFileToDrive(params) {
  try {
    const base64 = params.base64;
    const mimeType = params.mimeType || 'application/octet-stream';
    const filename = params.filename || ('attachment_' + Date.now());
    const patientId = params.patientId || 'unknown';

    // Get or create CyrabellDMS root folder
    const rootName = 'CyrabellDMS_Patients';
    let rootFolder;
    const rootSearch = DriveApp.getFoldersByName(rootName);
    rootFolder = rootSearch.hasNext() ? rootSearch.next() : DriveApp.createFolder(rootName);

    // Get or create per-patient subfolder
    const patSearch = rootFolder.getFoldersByName(patientId);
    const patFolder = patSearch.hasNext() ? patSearch.next() : rootFolder.createFolder(patientId);

    // Decode base64 and create file
    const bytes = Utilities.base64Decode(base64);
    const blob = Utilities.newBlob(bytes, mimeType, filename);
    const file = patFolder.createFile(blob);

    // Make file viewable by anyone with the link
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    const fileId = file.getId();
    return {
      fileId: fileId,
      viewUrl: 'https://drive.google.com/file/d/' + fileId + '/view',
      embedUrl: 'https://drive.google.com/file/d/' + fileId + '/preview',
      thumbnailUrl: 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w300',
      downloadUrl: 'https://drive.google.com/uc?id=' + fileId + '&export=download',
    };
  } catch(e) {
    return {error: e.toString()};
  }
}

function deleteFileFromDrive(params) {
  try {
    const fileId = params.fileId;
    if (!fileId) return {error: 'No fileId'};
    DriveApp.getFileById(fileId).setTrashed(true);
    return {success: true};
  } catch(e) {
    return {error: e.toString()};
  }
}

// ── In your doPost(e) function, add these two cases: ──────────────────────
//
// function doPost(e) {
//   const params = JSON.parse(e.postData.contents);
//   const action = params.action;
//   switch (action) {
//     // ... your existing cases ...
//     case 'uploadFile':
//       return ContentService
//         .createTextOutput(JSON.stringify(uploadFileToDrive(params)))
//         .setMimeType(ContentService.MimeType.JSON);
//     case 'deleteFile':
//       return ContentService
//         .createTextOutput(JSON.stringify(deleteFileFromDrive(params)))
//         .setMimeType(ContentService.MimeType.JSON);
//   }
// }
