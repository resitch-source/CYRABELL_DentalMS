// ═══════════════════════════════════════════════════════════════════════════
// CYRABELL DENTAL MS — Google Apps Script Backend (v5 — Unified)
// ═══════════════════════════════════════════════════════════════════════════
//
// Combines ALL responsibilities in one file:
//   1. JSON sync API — push/pull all data to/from Google Sheets
//   2. Patient photo upload / retrieval via Google Drive
//   3. File attachment upload / delete via Google Drive
//   4. Multi-provider AI Vision OCR (Gemini → OpenAI → Anthropic)
//   5. Email & SMS notifications
//   6. Server-side error logging
//
// ─── FIRST-TIME SETUP ────────────────────────────────────────────────────
//  1. sheets.google.com → create a new blank spreadsheet
//     Name it: "Cyrabell Dental Database"
//  2. Extensions → Apps Script
//  3. Delete placeholder Code.gs, paste THIS ENTIRE FILE → Save (Ctrl+S)
//  4. In function dropdown select "authorizeAll" → click ▶ Run
//     → Review permissions → Allow (click Advanced → Go to project if warned)
//  5. In function dropdown select "setupSheets" → click ▶ Run
//  6. Add your Gemini API key (FREE):
//     Project Settings (⚙️) → Script properties → Add property:
//       Name:  GEMINI_API_KEY
//       Value: AIza...  (get free key at aistudio.google.com/app/apikey)
//  7. Deploy → New deployment → ⚙️ gear → Web app:
//       Execute as:     Me
//       Who has access: Anyone
//  8. Copy the Web app URL → paste in Cyrabell ☁️ Sync page
//
// ─── UPDATING (already deployed) ─────────────────────────────────────────
//  1. Paste new code over Code.gs → Save
//  2. Deploy → Manage deployments → ✏️ Edit → Version "New version" → Deploy
//  3. URL stays the same — no need to update Cyrabell settings
//
// ⚡ FASTEST OCR (5-10s):
//   Also enter your Gemini key in Cyrabell → ☁️ Sync → "Gemini OCR (Fast Mode)"
//   card. The app then calls Gemini DIRECTLY from the browser, bypassing
//   Apps Script cold start entirely.
//
// FREE TIER (Gemini 2.0 Flash): 15 req/min • 1,500 req/day
// ═══════════════════════════════════════════════════════════════════════════

// ── Constants ────────────────────────────────────────────────────────────────
var DRIVE_PHOTOS_FOLDER      = 'Cyrabell Dental Photos';
var DRIVE_ATTACHMENTS_FOLDER = 'Cyrabell Dental Attachments';

var TABLES = {
  patients: [
    'id','name','dob','age','phone','email','address','bloodType',
    'allergies','chiefComplaint','lastVisit','balance','teeth','photoFileId',
    'occupation','sex','maritalStatus','attachments','history'
  ],
  appointments: [
    'id','patientId','patientName','service','date','time','status','notes',
    'fee','dentist','phone','email','arrived','attachments'
  ],
  payments: [
    'id','patientId','patientName','amount','method','service','date','status','ref','balance','note'
  ],
  notifications: [
    'id','type','recipient','phone','email','message','sentAt','status'
  ],
  reminders: [
    'id','patientId','patientName','type','channels','frequency',
    'lastSent','nextDue','active','notes'
  ],
  reminderLog: [
    'id','reminderId','patientId','patientName','type','channel',
    'message','sentAt','status'
  ],
  services: [
    'name','fee','cat'
  ],
  serverLogs: [
    'id','time','level','source','message','detail'
  ],
};

var JSON_COLS = {
  patients:     ['teeth','attachments','history'],
  appointments: ['attachments'],
  reminders:    ['channels'],
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN ENTRY POINTS
// ═══════════════════════════════════════════════════════════════════════════

function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) || 'pull';
    if (action === 'ping')     return jsonOut({ ok:true, pong:true, version:'5.0', time:new Date().toISOString() });
    if (action === 'pull')     return jsonOut({ ok:true, data:pullAll() });
    if (action === 'init') {
      ensureSheets();
      getOrCreateFolder(DRIVE_PHOTOS_FOLDER);
      getOrCreateFolder(DRIVE_ATTACHMENTS_FOLDER);
      return jsonOut({ ok:true, message:'Sheets and Drive folders ready' });
    }
    if (action === 'getPhoto') return jsonOut(handleGetPhoto(e.parameter.fileId || e.parameter.id));
    return jsonOut({ ok:false, error:'Unknown action: ' + action });
  } catch (err) {
    logServerError('doGet', String(err.message || err), err.stack || '');
    return jsonOut({ ok:false, error:String(err.message || err) });
  }
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents)
      return jsonOut({ ok:false, error:'No POST body received' });

    var payload = JSON.parse(e.postData.contents);
    var action  = payload.action || 'push';

    // ── OCR (both action names accepted) ─────────────────────────────────
    if (action === 'claudeOcr' || action === 'geminiOcr')
      return jsonOut(handleOcr(payload));

    // ── Photos ────────────────────────────────────────────────────────────
    if (action === 'uploadPhoto') return jsonOut(handleUploadPhoto(payload));
    if (action === 'deletePhoto') return jsonOut(handleDeletePhoto(payload));

    // ── File attachments ──────────────────────────────────────────────────
    if (action === 'uploadFile')  return jsonOut(handleUploadAttachment(payload));
    if (action === 'deleteFile')  return jsonOut(handleDeleteAttachment(payload));

    // ── Notifications ─────────────────────────────────────────────────────
    if (action === 'sendEmail')   return jsonOut(handleSendEmail(payload));
    if (action === 'sendSms')     return jsonOut(handleSendSms(payload));

    // ── Real-time single-record upsert ────────────────────────────────────
    if (action === 'upsertRecord')    return jsonOut(handleUpsertRecord(payload));
    if (action === 'checkDuplicate')  return jsonOut(handleCheckDuplicate(payload));

    // ── Default: push all data ────────────────────────────────────────────
    if (!payload.data) return jsonOut({ ok:false, error:'Missing "data" field' });
    var stats = pushAll(payload.data);
    return jsonOut({
      ok:      true,
      message: 'Synced ' + Object.values(stats).reduce(function(a,b){return a+b;}, 0) + ' rows',
      stats:   stats,
      time:    new Date().toISOString()
    });

  } catch (err) {
    logServerError('doPost', String(err.message || err), err.stack || '');
    return jsonOut({ ok:false, error:String(err.message || err) });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SERVER-SIDE LOGGING
// ═══════════════════════════════════════════════════════════════════════════

function serverLog(level, source, message, detail) {
  try {
    var ss    = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('serverLogs');
    if (!sheet) {
      sheet = ss.insertSheet('serverLogs');
      sheet.getRange(1,1,1,6).setValues([['id','time','level','source','message','detail']])
        .setFontWeight('bold').setBackground('#fef3c7');
      sheet.setFrozenRows(1);
    }
    sheet.appendRow([
      Utilities.getUuid().substring(0,8),
      new Date().toISOString(),
      String(level || 'info'),
      String(source || ''),
      String(message || '').substring(0,500),
      detail ? String(detail).substring(0,2000) : ''
    ]);
    var total = sheet.getLastRow();
    if (total > 201) sheet.deleteRows(2, total - 201);
  } catch(e) {
    Logger.log('serverLog failed: ' + e.message);
  }
}

function logServerError(source, message, detail) { serverLog('error', source, message, detail); }
function logServerEvent(source, message, detail)  { serverLog('event', source, message, detail); }

// ═══════════════════════════════════════════════════════════════════════════
// SHEETS — PULL (read all sheets → return JSON)
// ═══════════════════════════════════════════════════════════════════════════

function pullAll() {
  ensureSheets();
  var ss     = SpreadsheetApp.getActiveSpreadsheet();
  var result = {};

  for (var tableName in TABLES) {
    var headers   = TABLES[tableName];
    var sheet     = ss.getSheetByName(tableName);
    if (!sheet) { result[tableName] = []; continue; }
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) { result[tableName] = []; continue; }

    var values   = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
    var jsonCols = JSON_COLS[tableName] || [];

    result[tableName] = values
      .filter(function(row) { return row[0] !== '' && row[0] != null; })
      .map(function(row) {
        var obj = {};
        headers.forEach(function(key, i) {
          var v = row[i];
          if (v instanceof Date) {
            var isTimeOnly = v.getFullYear() < 1970;
            if (isTimeOnly || key === 'time') {
              v = Utilities.formatDate(v, Session.getScriptTimeZone(), 'HH:mm');
            } else {
              v = Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
            }
          }
          if (key === 'time' && typeof v === 'number' && v < 1) {
            var totalMin = Math.round(v * 24 * 60);
            var hh = Math.floor(totalMin / 60);
            var mm = totalMin % 60;
            v = String(hh).padStart(2,'0') + ':' + String(mm).padStart(2,'0');
          }
          if (jsonCols.indexOf(key) !== -1 && typeof v === 'string' && v) {
            try { v = JSON.parse(v); } catch(e) {}
          }
          if (key === 'arrived' || key === 'active') {
            v = (v === true || v === 'TRUE' || v === 'true' || v === 1);
          }
          if ((key === 'fee' || key === 'amount' || key === 'balance' || key === 'frequency') && v !== '' && v != null) {
            var n = Number(v);
            if (!isNaN(n)) v = n;
          }
          obj[key] = v == null ? '' : v;
        });
        return obj;
      });
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// SHEETS — PUSH (accept JSON → overwrite all sheets)
// ═══════════════════════════════════════════════════════════════════════════

function pushAll(data) {
  ensureSheets();
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var stats = {};

  for (var tableName in TABLES) {
    var headers  = TABLES[tableName];
    var sheet    = ss.getSheetByName(tableName);
    var jsonCols = JSON_COLS[tableName] || [];

    // Skip tables not present in the payload — avoids wiping sheets on partial syncs
    if (!Object.prototype.hasOwnProperty.call(data, tableName)) {
      stats[tableName] = -1; // -1 = skipped
      continue;
    }
    var rows = Array.isArray(data[tableName]) ? data[tableName] : [];

    if (sheet.getLastRow() > 1)
      sheet.getRange(2, 1, sheet.getLastRow()-1, sheet.getLastColumn()).clearContent();

    if (rows.length === 0) { stats[tableName] = 0; continue; }

    var out = rows.map(function(row) {
      return headers.map(function(key) {
        var v = row[key];
        if (v == null) return '';
        if (jsonCols.indexOf(key) !== -1 && typeof v === 'object') return JSON.stringify(v);
        return v;
      });
    });

    sheet.getRange(2, 1, out.length, headers.length).setValues(out);
    stats[tableName] = out.length;
  }
  return stats;
}

// ═══════════════════════════════════════════════════════════════════════════
// UPSERT — write or update a single record in a sheet by id
// payload: { action:'upsertRecord', table:'patients'|'appointments'|'payments', record:{...} }
// ═══════════════════════════════════════════════════════════════════════════

function handleUpsertRecord(payload) {
  var tableName = payload.table;
  var record    = payload.record;
  if (!tableName || !record) return { ok:false, error:'Missing table or record' };
  var headers = TABLES[tableName];
  if (!headers) return { ok:false, error:'Unknown table: ' + tableName };

  ensureSheets();
  var ss       = SpreadsheetApp.getActiveSpreadsheet();
  var sheet    = ss.getSheetByName(tableName);
  var jsonCols = JSON_COLS[tableName] || [];

  // Build row values in header order
  var rowValues = headers.map(function(key) {
    var v = record[key];
    if (v == null) return '';
    if (jsonCols.indexOf(key) !== -1 && typeof v === 'object') return JSON.stringify(v);
    return v;
  });

  // Find existing row by id (column 1)
  var lastRow  = sheet.getLastRow();
  var foundRow = -1;
  if (record.id && lastRow >= 2) {
    var idVals = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < idVals.length; i++) {
      if (String(idVals[i][0]).trim() === String(record.id).trim()) {
        foundRow = i + 2;
        break;
      }
    }
  }

  if (foundRow > 0) {
    sheet.getRange(foundRow, 1, 1, headers.length).setValues([rowValues]);
    logServerEvent('upsertRecord', 'Updated ' + tableName + ' id=' + record.id);
    return { ok:true, action:'updated', table:tableName, id:record.id };
  } else {
    sheet.appendRow(rowValues);
    logServerEvent('upsertRecord', 'Inserted ' + tableName + ' id=' + record.id);
    return { ok:true, action:'inserted', table:tableName, id:record.id };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CHECK DUPLICATE — find an existing row matching key fields
// payload: { action:'checkDuplicate', table, keyFields:{field:value,...}, excludeId? }
// Returns: { ok:true, found:bool, existing:obj|null }
// ═══════════════════════════════════════════════════════════════════════════

function handleCheckDuplicate(payload) {
  var tableName = payload.table;
  var keyFields = payload.keyFields || {};
  var excludeId = String(payload.excludeId || '');
  if (!tableName || !Object.keys(keyFields).length)
    return { ok:false, error:'Missing table or keyFields' };

  var headers = TABLES[tableName];
  if (!headers) return { ok:false, error:'Unknown table: ' + tableName };

  ensureSheets();
  var ss      = SpreadsheetApp.getActiveSpreadsheet();
  var sheet   = ss.getSheetByName(tableName);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return { ok:true, found:false, existing:null };

  var jsonCols = JSON_COLS[tableName] || [];
  var values   = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  var keyList  = Object.keys(keyFields);
  var idIdx    = headers.indexOf('id');

  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    var rid = idIdx >= 0 ? String(row[idIdx] || '').trim() : '';
    if (!rid) continue;
    if (excludeId && rid === excludeId) continue;

    var allMatch = keyList.every(function(k) {
      var ci = headers.indexOf(k);
      if (ci < 0) return false;
      return String(row[ci] || '').toLowerCase().trim() ===
             String(keyFields[k] || '').toLowerCase().trim();
    });

    if (allMatch) {
      var obj = {};
      headers.forEach(function(key, ci) {
        var v = row[ci];
        if (jsonCols.indexOf(key) !== -1 && typeof v === 'string' && v) {
          try { v = JSON.parse(v); } catch(e) {}
        }
        obj[key] = v == null ? '' : v;
      });
      return { ok:true, found:true, existing:obj };
    }
  }
  return { ok:true, found:false, existing:null };
}

// ═══════════════════════════════════════════════════════════════════════════
// PATIENT PHOTOS — Google Drive
// ═══════════════════════════════════════════════════════════════════════════

// Body: { action:'uploadPhoto', patientId, dataUrl, oldFileId? }
function handleUploadPhoto(payload) {
  if (!payload.dataUrl)   return { ok:false, error:'Missing dataUrl' };
  if (!payload.patientId) return { ok:false, error:'Missing patientId' };

  if (payload.oldFileId) {
    try { DriveApp.getFileById(payload.oldFileId).setTrashed(true); } catch(e) {}
  }

  var m = payload.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return { ok:false, error:'Invalid dataUrl format' };
  var mimeType = m[1];
  var base64   = m[2];
  var ext      = (mimeType.split('/')[1] || 'jpg').replace('jpeg','jpg');

  var folder   = getOrCreateFolder(DRIVE_PHOTOS_FOLDER);
  var safeName = String(payload.patientId).replace(/[^a-zA-Z0-9_-]/g,'_');
  var filename = safeName + '_' + Date.now() + '.' + ext;

  var bytes = Utilities.base64Decode(base64);
  var blob  = Utilities.newBlob(bytes, mimeType, filename);
  var file  = folder.createFile(blob);
  file.setDescription('PATIENT_ID:' + payload.patientId);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return {
    ok:           true,
    fileId:       file.getId(),
    viewUrl:      'https://drive.google.com/uc?export=view&id=' + file.getId(),
    thumbnailUrl: 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w400',
  };
}

// GET: ?action=getPhoto&id=<fileId>
function handleGetPhoto(fileId) {
  if (!fileId) return { ok:false, error:'Missing id' };
  try {
    var file   = DriveApp.getFileById(fileId);
    var blob   = file.getBlob();
    var mime   = blob.getContentType() || 'image/jpeg';
    var base64 = Utilities.base64Encode(blob.getBytes());
    return { ok:true, dataUrl:'data:' + mime + ';base64,' + base64, filename:file.getName() };
  } catch(err) {
    return { ok:false, error:'Could not fetch photo: ' + err.message };
  }
}

// Body: { action:'deletePhoto', fileId }
function handleDeletePhoto(payload) {
  if (!payload.fileId) return { ok:false, error:'Missing fileId' };
  try {
    DriveApp.getFileById(payload.fileId).setTrashed(true);
    return { ok:true, message:'Photo deleted' };
  } catch(err) {
    return { ok:false, error:'Could not delete: ' + err.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FILE ATTACHMENTS — Google Drive (patient records, X-rays, documents)
// ═══════════════════════════════════════════════════════════════════════════

// Body: { action:'uploadFile', base64, mimeType, filename, patientId }
function handleUploadAttachment(payload) {
  if (!payload.base64)    return { ok:false, error:'Missing base64' };
  if (!payload.patientId) return { ok:false, error:'Missing patientId' };
  if (!payload.filename)  return { ok:false, error:'Missing filename' };

  var mimeType  = payload.mimeType || 'application/octet-stream';
  var patientId = String(payload.patientId).replace(/[^a-zA-Z0-9_-]/g,'_');

  var rootFolder = getOrCreateFolder(DRIVE_ATTACHMENTS_FOLDER);
  var patFolders = rootFolder.getFoldersByName(patientId);
  var patFolder  = patFolders.hasNext() ? patFolders.next() : rootFolder.createFolder(patientId);

  var bytes = Utilities.base64Decode(payload.base64);
  var blob  = Utilities.newBlob(bytes, mimeType, payload.filename);
  var file  = patFolder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  var fileId = file.getId();
  return {
    ok:           true,
    fileId:       fileId,
    viewUrl:      'https://drive.google.com/file/d/' + fileId + '/view',
    embedUrl:     'https://drive.google.com/file/d/' + fileId + '/preview',
    thumbnailUrl: 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w300',
    downloadUrl:  'https://drive.google.com/uc?id=' + fileId + '&export=download',
  };
}

// Body: { action:'deleteFile', fileId }
function handleDeleteAttachment(payload) {
  if (!payload.fileId) return { ok:false, error:'Missing fileId' };
  try {
    DriveApp.getFileById(payload.fileId).setTrashed(true);
    return { ok:true };
  } catch(e) {
    return { ok:false, error:'Could not delete: ' + e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// AI VISION OCR — Multi-provider (Gemini → OpenAI → Anthropic)
// ═══════════════════════════════════════════════════════════════════════════
//
// Accepts actions: 'claudeOcr' (legacy) OR 'geminiOcr' (new) — both work.
//
// Provider priority (first key found wins):
//   1. GEMINI_API_KEY    → Gemini 2.0 Flash  (FREE: 15 req/min, 1500/day)
//   2. OPENAI_API_KEY    → GPT-4o Vision      (paid)
//   3. ANTHROPIC_API_KEY → Claude Haiku       (paid, cheapest)
//
// ONE-TIME KEY SETUP:
//   Apps Script → ⚙️ Project Settings → Script properties → Add property:
//     GEMINI_API_KEY = AIza...  (free at aistudio.google.com/app/apikey)
// ═══════════════════════════════════════════════════════════════════════════

function handleOcr(payload) {
  var props        = PropertiesService.getScriptProperties();
  var geminiKey    = props.getProperty('GEMINI_API_KEY');
  var openaiKey    = props.getProperty('OPENAI_API_KEY');
  var anthropicKey = props.getProperty('ANTHROPIC_API_KEY');

  if (geminiKey)    geminiKey    = geminiKey.trim().replace(/\s/g,'');
  if (openaiKey)    openaiKey    = openaiKey.trim().replace(/\s/g,'');
  if (anthropicKey) anthropicKey = anthropicKey.trim().replace(/\s/g,'');

  if (!payload.imageB64) return { ok:false, error:'Missing imageB64 in request' };
  var imageB64 = String(payload.imageB64);
  var mimeType = String(payload.mimeType || 'image/jpeg');
  var scanType = payload.scanType || 'basic';
  var prompt   = buildOcrPrompt(scanType);

  if (geminiKey    && geminiKey.length    > 10) return callGemini(geminiKey,    imageB64, mimeType, prompt);
  if (openaiKey    && openaiKey.length    > 10) return callOpenAI(openaiKey,    imageB64, mimeType, prompt);
  if (anthropicKey && anthropicKey.length > 10) return callAnthropic(anthropicKey, imageB64, mimeType, prompt);

  return {
    ok:    false,
    error: 'No AI API key configured. For FREE: get a Gemini key at ' +
           'https://aistudio.google.com/app/apikey then add GEMINI_API_KEY to Script Properties.'
  };
}

// Keep legacy function name as alias so any old callers still work
function handleClaudeOcr(payload) { return handleOcr(payload); }

// ── OCR Prompts ──────────────────────────────────────────────────────────────

function buildOcrPrompt(scanType) {
  if (scanType === 'examination') {
    return (
      'You are an expert dental clinical records assistant. ' +
      'Read this Patient Examination Record Chart image carefully and extract ALL visible information. ' +
      'Return ONLY a valid JSON object (no markdown, no backticks) with these exact keys: ' +
      '{"name":"Full name","age":"Age","sex":"Male or Female","address":"Home address",' +
      '"officeAddress":"Office address","telephone":"Phone","mobileNo":"Mobile 09XXXXXXXXX",' +
      '"maritalStatus":"Single/Married/Widowed/Separated","occupation":"Occupation",' +
      '"date":"Record date YYYY-MM-DD","occlusion":"Occlusion findings",' +
      '"periodontalCondition":"Periodontal condition","oralHygiene":"Oral hygiene rating",' +
      '"dentureUpper":"Upper denture info","dentureLower":"Lower denture info",' +
      '"abnormalities":"Oral abnormalities","generalCondition":"General health condition",' +
      '"physician":"Physician name","natureOfTreatment":"Treatment description",' +
      '"allergies":"Allergies","previousHistoryOfBleeding":"Yes/No/details",' +
      '"chronicAilments":"Chronic conditions","bloodPressure":"e.g. 120/80",' +
      '"drugsBeingTaken":"Current medications",' +
      '"dentalChartNotes":"Chart annotations","teethConditions":"Tooth conditions by FDI number",' +
      '"clinicalNotes":"Other clinical notes"}. ' +
      'Empty string for missing fields. Normalize PH phones to 09XXXXXXXXX. Dates to YYYY-MM-DD. ' +
      'Read handwriting carefully. Note any marked or shaded teeth in the dental chart diagram.'
    );
  }
  return (
    'You are a dental clinic data entry assistant. ' +
    'Read this patient record card and extract all patient information. ' +
    'Return ONLY a valid JSON object (no markdown, no backticks) with these exact keys: ' +
    '{"name":"Full name","dob":"YYYY-MM-DD","age":"numeric age","sex":"Male or Female",' +
    '"phone":"09XXXXXXXXX","email":"email address","address":"complete address",' +
    '"occupation":"occupation","maritalStatus":"Single/Married/Widowed/Separated",' +
    '"bloodType":"A+/A-/B+/B-/O+/O-/AB+/AB-","allergies":"known allergies",' +
    '"lastVisit":"YYYY-MM-DD","balance":"0","physician":"physician name",' +
    '"emergencyContact":"contact name and number"}. ' +
    'Empty string for missing fields. Normalize PH phones to 09XXXXXXXXX. Dates to YYYY-MM-DD.'
  );
}

// ── Provider 1: Google Gemini (FREE) ─────────────────────────────────────────
// Speed optimizations applied:
//   temperature: 0              → deterministic, skips sampling overhead
//   responseMimeType: json      → Gemini returns clean JSON directly
//   maxOutputTokens: 1024       → OCR fields fit easily; halves output time
//   model fallback list         → tries fast model first, falls back gracefully

function callGemini(apiKey, imageB64, mimeType, prompt) {
  var MODELS = [
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash',
  ];

  var requestBody = {
    contents: [{
      parts: [
        { inline_data: { mime_type: mimeType, data: imageB64 } },
        { text: prompt }
      ]
    }],
    generationConfig: {
      temperature:      0,       // deterministic — fastest + most consistent output
      maxOutputTokens:  1024,    // OCR fields never exceed this; halves response time
      responseMimeType: 'application/json',  // clean JSON direct — no markdown stripping
    }
  };

  var httpResponse     = null;
  var lastError        = '';
  var usedModel        = '';
  var rateLimitRetries = 0;

  for (var mi = 0; mi < MODELS.length; mi++) {
    var modelUrl = 'https://generativelanguage.googleapis.com/v1beta/models/' +
                   MODELS[mi] + ':generateContent?key=' + apiKey;
    try {
      var resp     = UrlFetchApp.fetch(modelUrl, {
        method:             'post',
        contentType:        'application/json',
        payload:            JSON.stringify(requestBody),
        muteHttpExceptions: true
      });
      var respCode = resp.getResponseCode();
      var respBody = resp.getContentText();

      if (respCode === 200) {
        httpResponse = resp;
        usedModel    = MODELS[mi];
        Logger.log('[OCR] Gemini model: ' + usedModel);
        break;
      }
      if (respCode === 404) {
        Logger.log('[OCR] Model ' + MODELS[mi] + ' not found, trying next…');
        lastError = 'Model not found';
        continue;
      }
      if (respCode === 429) {
        var waits = [5, 15, 30, 60];
        if (rateLimitRetries < waits.length) {
          Logger.log('[OCR] Rate limit, waiting ' + waits[rateLimitRetries] + 's…');
          Utilities.sleep(waits[rateLimitRetries] * 1000);
          rateLimitRetries++;
          mi--;
          continue;
        }
        return { ok:false, error:'Gemini rate limit hit 4 times. Wait 1 minute and try again.' };
      }
      var errMsg = 'HTTP ' + respCode;
      try {
        var ep = JSON.parse(respBody);
        if (ep.error && ep.error.message) errMsg = ep.error.message;
      } catch(x){}
      lastError = errMsg;
      Logger.log('[OCR] ' + MODELS[mi] + ' error: ' + errMsg);
    } catch(fetchErr) {
      lastError = 'Network error: ' + String(fetchErr.message);
    }
  }

  if (!httpResponse) {
    return { ok:false, error:'All Gemini models failed. Last error: ' + lastError +
             '. Check that GEMINI_API_KEY is correct and has Generative Language API enabled.' };
  }

  var body = httpResponse.getContentText();
  var resp2;
  try { resp2 = JSON.parse(body); }
  catch(e) { return { ok:false, error:'Gemini returned invalid JSON' }; }

  var text = '';
  try { text = resp2.candidates[0].content.parts[0].text; }
  catch(e) { return { ok:false, error:'Unexpected Gemini response structure: ' + body.substring(0,200) }; }

  var result = parseExtractedJson(text);
  if (result.ok) result.model = usedModel;
  return result;
}

// ── Provider 2: OpenAI GPT-4o Vision ─────────────────────────────────────────

function callOpenAI(apiKey, imageB64, mimeType, prompt) {
  var requestBody = {
    model:      'gpt-4o',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: [
        { type:'image_url', image_url:{ url:'data:' + mimeType + ';base64,' + imageB64 } },
        { type:'text', text: prompt }
      ]
    }]
  };

  var httpResponse;
  try {
    httpResponse = UrlFetchApp.fetch('https://api.openai.com/v1/chat/completions', {
      method:             'post',
      contentType:        'application/json',
      headers:            { 'Authorization':'Bearer ' + apiKey },
      payload:            JSON.stringify(requestBody),
      muteHttpExceptions: true
    });
  } catch(e) { return { ok:false, error:'OpenAI network error: ' + e.message }; }

  var code = httpResponse.getResponseCode();
  var body = httpResponse.getContentText();
  if (code !== 200) {
    var msg = 'OpenAI error ' + code;
    try { var e2 = JSON.parse(body); if(e2.error&&e2.error.message) msg=e2.error.message; } catch(x){}
    return { ok:false, error:msg };
  }

  var resp;
  try { resp = JSON.parse(body); } catch(e) { return { ok:false, error:'OpenAI bad JSON' }; }
  var text = resp.choices && resp.choices[0] && resp.choices[0].message && resp.choices[0].message.content;
  if (!text) return { ok:false, error:'No content from OpenAI' };
  return parseExtractedJson(text);
}

// ── Provider 3: Anthropic Claude Haiku (cheapest + fast) ─────────────────────

function callAnthropic(apiKey, imageB64, mimeType, prompt) {
  var requestBody = {
    model:      'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system:     'You are a dental clinic OCR assistant. Extract data from images as JSON only.',
    messages: [{
      role: 'user',
      content: [
        { type:'image', source:{ type:'base64', media_type:mimeType, data:imageB64 } },
        { type:'text',  text:   prompt }
      ]
    }]
  };

  var httpResponse;
  try {
    httpResponse = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
      method:             'post',
      contentType:        'application/json',
      headers:            { 'x-api-key':apiKey, 'anthropic-version':'2023-06-01' },
      payload:            JSON.stringify(requestBody),
      muteHttpExceptions: true
    });
  } catch(e) { return { ok:false, error:'Anthropic network error: ' + e.message }; }

  var code = httpResponse.getResponseCode();
  var body = httpResponse.getContentText();
  if (code === 402) return { ok:false, error:'Anthropic credit balance too low. Switch to Gemini (free).' };
  if (code !== 200) {
    var msg = 'Anthropic error ' + code;
    try { var e2=JSON.parse(body); if(e2.error&&e2.error.message)msg=e2.error.message; } catch(x){}
    return { ok:false, error:msg };
  }

  var resp;
  try { resp = JSON.parse(body); } catch(e) { return { ok:false, error:'Anthropic bad JSON' }; }
  var text = resp.content && resp.content[0] && resp.content[0].text;
  if (!text) return { ok:false, error:'No content from Anthropic' };
  return parseExtractedJson(text);
}

// ── Shared JSON parser ────────────────────────────────────────────────────────

function parseExtractedJson(rawText) {
  var clean = rawText.replace(/```json\s*/gi,'').replace(/```\s*/g,'').trim();
  var start = clean.indexOf('{');
  var end   = clean.lastIndexOf('}');
  if (start !== -1 && end > start) clean = clean.substring(start, end + 1);

  var extracted;
  try { extracted = JSON.parse(clean); }
  catch(e) { return { ok:false, error:'Could not parse AI response as JSON. Raw: ' + clean.substring(0,200) }; }

  var ALL_KEYS = [
    'name','dob','phone','email','address','bloodType','allergies','lastVisit',
    'balance','physician','emergencyContact','age','sex','officeAddress',
    'telephone','mobileNo','maritalStatus','occupation','date','occlusion',
    'periodontalCondition','oralHygiene','dentureUpper','dentureLower',
    'abnormalities','generalCondition','natureOfTreatment',
    'previousHistoryOfBleeding','chronicAilments','bloodPressure',
    'drugsBeingTaken','dentalChartNotes','teethConditions','clinicalNotes','notes',
  ];
  for (var i = 0; i < ALL_KEYS.length; i++) {
    var v = extracted[ALL_KEYS[i]];
    if (v === undefined || v === null || v === 'null' || v === 'N/A' || v === 'n/a') {
      extracted[ALL_KEYS[i]] = '';
    } else {
      extracted[ALL_KEYS[i]] = String(v).trim();
    }
  }
  return { ok:true, data:extracted };
}

// ═══════════════════════════════════════════════════════════════════════════
// EMAIL NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════

// Body: { action:'sendEmail', to, subject, message, replyTo? }
function handleSendEmail(payload) {
  if (!payload.to)      return { ok:false, error:'Missing recipient (to)' };
  if (!payload.message) return { ok:false, error:'Missing message body' };
  try {
    var options = {
      name:     'Cyrabell Dental',
      htmlBody: String(payload.message).replace(/\n/g,'<br>'),
    };
    if (payload.replyTo) options.replyTo = payload.replyTo;
    MailApp.sendEmail(
      payload.to,
      payload.subject || 'Cyrabell Dental Notification',
      payload.message,
      options
    );
    return { ok:true, sentTo:payload.to, remainingToday:MailApp.getRemainingDailyQuota(), time:new Date().toISOString() };
  } catch(err) {
    return { ok:false, error:'Email failed: ' + err.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SMS NOTIFICATIONS (via email-to-SMS gateway)
// ═══════════════════════════════════════════════════════════════════════════

// Body: { action:'sendSms', phone, message, carrier? }
// Carrier codes: globe | smart | sun | att | verizon | tmobile | sprint
function handleSendSms(payload) {
  if (!payload.phone)   return { ok:false, error:'Missing phone' };
  if (!payload.message) return { ok:false, error:'Missing message' };

  // Normalize Philippine numbers to 10 digits (strip leading 0 or country code 63)
  var phone = String(payload.phone).replace(/\D/g,'');
  if (phone.length === 11 && phone.charAt(0) === '0')          phone = phone.substring(1);
  if (phone.length === 12 && phone.substring(0,2) === '63')    phone = phone.substring(2);

  var GATEWAYS = {
    globe:   '@globe.com.ph',
    smart:   '@smart.com.ph',
    sun:     '@sun.com.ph',
    att:     '@txt.att.net',
    verizon: '@vtext.com',
    tmobile: '@tmomail.net',
    sprint:  '@messaging.sprintpcs.com',
  };

  var carrier = (payload.carrier || '').toLowerCase();
  var gateway = GATEWAYS[carrier];

  if (gateway) {
    try {
      var addr = phone + gateway;
      MailApp.sendEmail({ to:addr, subject:'', body:String(payload.message).substring(0,160), name:'Cyrabell' });
      return { ok:true, method:'email-to-sms', gateway:addr, time:new Date().toISOString() };
    } catch(err) {
      return { ok:false, error:'SMS gateway failed: ' + err.message };
    }
  }

  // No carrier → return SMS URI for manual launch
  return {
    ok:     true,
    method: 'manual',
    telUri: 'sms:+63' + phone + '?body=' + encodeURIComponent(payload.message),
    note:   'No carrier specified. Open the telUri to send manually.',
    time:   new Date().toISOString()
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function getOrCreateFolder(name) {
  var folders = DriveApp.getFoldersByName(name);
  return folders.hasNext() ? folders.next() : DriveApp.createFolder(name);
}

function ensureSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  for (var tableName in TABLES) {
    var headers = TABLES[tableName];
    var sheet   = ss.getSheetByName(tableName);
    if (!sheet) sheet = ss.insertSheet(tableName);
    if (sheet.getMaxColumns() < headers.length)
      sheet.insertColumnsAfter(sheet.getMaxColumns(), headers.length - sheet.getMaxColumns());
    var existing = sheet.getRange(1,1,1,headers.length).getValues()[0];
    var needsHeader = false;
    for (var i = 0; i < headers.length; i++) {
      if (existing[i] !== headers[i]) { needsHeader = true; break; }
    }
    if (needsHeader) {
      sheet.getRange(1,1,1,headers.length).setValues([headers])
        .setFontWeight('bold').setBackground('#e8f5f3').setFontColor('#0a7c6e');
      sheet.setFrozenRows(1);
    }
  }
  // Remove default Sheet1 if it still exists and is empty
  var sheet1 = ss.getSheetByName('Sheet1');
  if (sheet1 && ss.getSheets().length > Object.keys(TABLES).length) {
    try { ss.deleteSheet(sheet1); } catch(e) {}
  }
}

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ═══════════════════════════════════════════════════════════════════════════
// SETUP UTILITIES — run these from the Apps Script editor (not deployed)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * authorizeAll — Run ONCE to grant all required OAuth permissions.
 *
 * Steps:
 *  1. Select "authorizeAll" in the function dropdown
 *  2. Click ▶ Run
 *  3. "Review permissions" → pick your Google account
 *     → "Advanced" → "Go to [project] (unsafe)" → "Allow"
 *  4. Check Execution Log — should see all ✅ lines
 *  5. Redeploy: Deploy → Manage → ✏️ Edit → New version → Deploy
 */
function authorizeAll() {
  // Sheets
  try {
    ensureSheets();
    Logger.log('✅ Sheets scope granted');
  } catch(e) { Logger.log('⚠ Sheets: ' + e.message); }

  // Drive
  try {
    getOrCreateFolder(DRIVE_PHOTOS_FOLDER);
    getOrCreateFolder(DRIVE_ATTACHMENTS_FOLDER);
    Logger.log('✅ Drive scope granted — folders: "' + DRIVE_PHOTOS_FOLDER + '", "' + DRIVE_ATTACHMENTS_FOLDER + '"');
  } catch(e) { Logger.log('⚠ Drive: ' + e.message); }

  // UrlFetchApp (needed for OCR API calls)
  try {
    var res = UrlFetchApp.fetch('https://httpbin.org/get', { muteHttpExceptions:true });
    Logger.log('✅ UrlFetchApp scope granted (HTTP ' + res.getResponseCode() + ')');
  } catch(e) { Logger.log('⚠ UrlFetchApp: ' + e.message); }

  // MailApp (email + SMS gateway)
  try {
    var email = Session.getActiveUser().getEmail();
    if (email) {
      MailApp.sendEmail({ to:email, subject:'✅ Cyrabell Dental - Authorization Test',
        body:'Auth test email from setupSheets(). Safe to delete.\nQuota remaining: ' + MailApp.getRemainingDailyQuota() });
      Logger.log('✅ MailApp scope granted — test email sent to: ' + email);
    } else {
      MailApp.getRemainingDailyQuota();
      Logger.log('✅ MailApp scope granted');
    }
  } catch(e) { Logger.log('⚠ MailApp: ' + e.message); }

  Logger.log('');
  Logger.log('✅ Done. Now redeploy: Deploy → Manage → ✏️ Edit → New version → Deploy');
}

// Run once to create all sheets and Drive folders.
function setupSheets() {
  ensureSheets();
  var pf = getOrCreateFolder(DRIVE_PHOTOS_FOLDER);
  var af = getOrCreateFolder(DRIVE_ATTACHMENTS_FOLDER);
  Logger.log('✅ Sheets: ' + Object.keys(TABLES).join(', '));
  Logger.log('✅ Photos folder:      ' + pf.getUrl());
  Logger.log('✅ Attachments folder: ' + af.getUrl());
}

// Save your Gemini API key (FREE). Replace key below then click ▶ Run.
function setupGeminiKey() {
  var key = 'YOUR-GEMINI-KEY-HERE'; // ← paste AIza... key here
  if (key === 'YOUR-GEMINI-KEY-HERE' || key.length < 10) {
    Logger.log('❌ Replace YOUR-GEMINI-KEY-HERE with your actual key first.');
    Logger.log('   Free key: https://aistudio.google.com/app/apikey');
    return;
  }
  key = key.trim().replace(/\s/g,'');
  PropertiesService.getScriptProperties().setProperty('GEMINI_API_KEY', key);
  Logger.log('✅ Gemini key saved: ' + key.substring(0,8) + '… (' + key.length + ' chars)');
  Logger.log('   Redeploy: Deploy → Manage → ✏️ Edit → New version → Deploy');
}

// Save your Anthropic API key. Replace key below then click ▶ Run.
function setupApiKey() {
  var key = 'YOUR-KEY-HERE'; // ← paste sk-ant-... key here
  if (key === 'YOUR-KEY-HERE' || key.length < 20) {
    Logger.log('❌ Replace YOUR-KEY-HERE with your actual Anthropic key first.');
    return;
  }
  key = key.trim().replace(/\s/g,'');
  PropertiesService.getScriptProperties().setProperty('ANTHROPIC_API_KEY', key);
  Logger.log('✅ Anthropic key saved: ' + key.substring(0,10) + '… (' + key.length + ' chars)');
}

// Check which API keys are configured and which provider will be used.
function checkApiKeyStatus() {
  var props = PropertiesService.getScriptProperties().getProperties();
  function mask(k) {
    k = (k||'').trim();
    return k ? k.substring(0,8) + '…(' + k.length + ' chars)' : '(not set)';
  }
  Logger.log('GEMINI_API_KEY:    ' + mask(props.GEMINI_API_KEY));
  Logger.log('OPENAI_API_KEY:    ' + mask(props.OPENAI_API_KEY));
  Logger.log('ANTHROPIC_API_KEY: ' + mask(props.ANTHROPIC_API_KEY));
  Logger.log('Active provider:   ' + (
    (props.GEMINI_API_KEY    && props.GEMINI_API_KEY.trim().length    > 10) ? 'Gemini 2.0 Flash (FREE ✅)' :
    (props.OPENAI_API_KEY    && props.OPENAI_API_KEY.trim().length    > 10) ? 'OpenAI GPT-4o' :
    (props.ANTHROPIC_API_KEY && props.ANTHROPIC_API_KEY.trim().length > 10) ? 'Anthropic Claude Haiku' :
    'NONE ❌ — add GEMINI_API_KEY to Script Properties'
  ));
}

// List all Gemini models available on your key.
function listGeminiModels() {
  var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) { Logger.log('❌ GEMINI_API_KEY not set.'); return; }
  var resp = UrlFetchApp.fetch(
    'https://generativelanguage.googleapis.com/v1beta/models?key=' + apiKey.trim(),
    { muteHttpExceptions:true }
  );
  if (resp.getResponseCode() !== 200) {
    Logger.log('Error ' + resp.getResponseCode() + ': ' + resp.getContentText().substring(0,200));
    return;
  }
  var models = JSON.parse(resp.getContentText()).models || [];
  Logger.log('Models supporting generateContent:');
  models.forEach(function(m) {
    if ((m.supportedGenerationMethods||[]).indexOf('generateContent') !== -1)
      Logger.log('  ✓ ' + m.name + ' — ' + (m.displayName||''));
  });
}

// Verify Anthropic key is valid (sends a minimal test request).
function verifyApiKey() {
  var key = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
  if (!key) { Logger.log('❌ ANTHROPIC_API_KEY not found. Run setupApiKey() first.'); return; }
  key = key.trim();
  Logger.log('Found key: ' + key.substring(0,10) + '… (' + key.length + ' chars). Testing…');
  var res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method:'post', contentType:'application/json',
    headers:{ 'x-api-key':key, 'anthropic-version':'2023-06-01' },
    payload:JSON.stringify({ model:'claude-haiku-4-5-20251001', max_tokens:10, messages:[{role:'user',content:'Reply: OK'}] }),
    muteHttpExceptions:true
  });
  var code = res.getResponseCode();
  if (code === 200)  Logger.log('✅ Key is VALID!');
  else if (code===401) Logger.log('❌ Key INVALID (401). Check the value.');
  else if (code===429) Logger.log('⚠ Rate limited (429). Key is valid.');
  else Logger.log('⚠ HTTP ' + code + ': ' + res.getContentText().substring(0,200));
}

// Quick data dump to Execution Log for debugging.
function testPull() {
  Logger.log(JSON.stringify(pullAll(), null, 2));
}
