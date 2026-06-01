// ═══════════════════════════════════════════════════════════════════════════
// CYRABELL DENTAL MS — Apps Script: Gemini Vision OCR + Drive Storage
// ═══════════════════════════════════════════════════════════════════════════
//
// SETUP (one-time):
//   1. script.google.com → open your project → paste this entire file
//   2. Project Settings → Script Properties → Add property:
//        GEMINI_API_KEY  =  AIza...  (get free key at aistudio.google.com)
//   3. Deploy → New Deployment → Web app
//        Execute as: Me   |   Access: Anyone
//   4. Copy the web app URL → paste in Cyrabell ☁️ Sync settings
//
// FREE TIER LIMITS (Gemini 2.0 Flash):
//   15 requests/min  •  1,500 requests/day  — plenty for a clinic
// ═══════════════════════════════════════════════════════════════════════════

// ── Script property key ──────────────────────────────────────────────────────
var GEMINI_KEY_PROP = 'GEMINI_API_KEY';

// ── Gemini model (fastest + most accurate for OCR) ─────────────────────────
var GEMINI_MODEL = 'gemini-2.0-flash';

// ── doGet: health check ──────────────────────────────────────────────────────
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, service: 'CyrabellDMS', version: '3.0' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── doPost: main router ─────────────────────────────────────────────────────
function doPost(e) {
  var params;
  try {
    params = JSON.parse(e.postData.contents);
  } catch(err) {
    return jsonOut({ ok: false, error: 'Invalid JSON: ' + err.message });
  }

  var action = params.action || '';
  switch (action) {

    case 'claudeOcr':      // legacy action name — now powered by Gemini
    case 'geminiOcr':
      return jsonOut(handleGeminiOcr(params));

    case 'uploadFile':
      return jsonOut(uploadFileToDrive(params));

    case 'deleteFile':
      return jsonOut(deleteFileFromDrive(params));

    // ── Sync actions (forward to your existing sync logic) ──────────────────
    default:
      return jsonOut({ ok: false, error: 'Unknown action: ' + action });
  }
}

// ── Gemini Vision OCR ────────────────────────────────────────────────────────
function handleGeminiOcr(params) {
  var apiKey = PropertiesService.getScriptProperties().getProperty(GEMINI_KEY_PROP);
  if (!apiKey) {
    return { ok: false, error: 'GEMINI_API_KEY not configured in Script Properties.' };
  }

  var imageB64  = params.imageB64  || '';
  var mimeType  = params.mimeType  || 'image/jpeg';
  var scanType  = params.scanType  || 'basic';   // 'basic' | 'examination'

  if (!imageB64) {
    return { ok: false, error: 'No image data received.' };
  }

  // ── Build the extraction prompt ──────────────────────────────────────────
  var prompt = scanType === 'examination'
    ? buildExaminationPrompt()
    : buildBasicPrompt();

  // ── Call Gemini 2.0 Flash API ────────────────────────────────────────────
  var url = 'https://generativelanguage.googleapis.com/v1beta/models/'
            + GEMINI_MODEL + ':generateContent?key=' + apiKey;

  var body = {
    contents: [{
      parts: [
        { text: prompt },
        { inline_data: { mime_type: mimeType, data: imageB64 } }
      ]
    }],
    generationConfig: {
      temperature:     0,       // deterministic — we want consistent field extraction
      maxOutputTokens: 1024,
      responseMimeType: 'application/json'  // Gemini returns clean JSON directly
    }
  };

  var options = {
    method:             'post',
    contentType:        'application/json',
    payload:            JSON.stringify(body),
    muteHttpExceptions: true
  };

  var startTime = Date.now();
  var resp;
  try {
    resp = UrlFetchApp.fetch(url, options);
  } catch (e) {
    return { ok: false, error: 'Network error calling Gemini: ' + e.message };
  }

  var elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  var code    = resp.getResponseCode();
  var text    = resp.getContentText();

  if (code === 429) {
    return { ok: false, error: '429: Gemini rate limit. Wait 10 seconds and retry.' };
  }
  if (code !== 200) {
    return { ok: false, error: 'Gemini HTTP ' + code + ': ' + text.substring(0, 300) };
  }

  // ── Parse response ────────────────────────────────────────────────────────
  var geminiResp;
  try {
    geminiResp = JSON.parse(text);
  } catch(e) {
    return { ok: false, error: 'Gemini response not JSON: ' + text.substring(0, 200) };
  }

  var content = (geminiResp.candidates &&
                 geminiResp.candidates[0] &&
                 geminiResp.candidates[0].content &&
                 geminiResp.candidates[0].content.parts &&
                 geminiResp.candidates[0].content.parts[0] &&
                 geminiResp.candidates[0].content.parts[0].text) || '';

  if (!content) {
    return { ok: false, error: 'Gemini returned empty content.' };
  }

  // Strip markdown fences if present (shouldn't happen with responseMimeType, but just in case)
  content = content.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();

  var data;
  try {
    data = JSON.parse(content);
  } catch(e) {
    // Try to extract JSON from response text
    var jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try { data = JSON.parse(jsonMatch[0]); }
      catch(e2) { return { ok: false, error: 'Could not parse extracted data: ' + content.substring(0, 200) }; }
    } else {
      return { ok: false, error: 'No JSON object in Gemini response: ' + content.substring(0, 200) };
    }
  }

  // Sanitize all string values
  var clean = {};
  Object.keys(data).forEach(function(k) {
    var v = data[k];
    if (v === null || v === undefined || v === 'null' || v === 'N/A' || v === 'n/a') {
      clean[k] = '';
    } else {
      clean[k] = String(v).trim();
    }
  });

  Logger.log('[GeminiOCR] Done in ' + elapsed + 's. Fields: ' + Object.keys(clean).join(', '));
  return { ok: true, data: clean, elapsed: elapsed, model: GEMINI_MODEL };
}

// ── Prompt: basic patient registration card ──────────────────────────────────
function buildBasicPrompt() {
  return [
    'You are a dental records OCR assistant. Extract ALL visible text from this patient registration/record card.',
    'Return a single JSON object with these exact keys (use "" for missing/unclear fields):',
    '',
    '{',
    '  "name": "full patient name",',
    '  "dob": "YYYY-MM-DD or empty",',
    '  "age": "numeric age as string",',
    '  "sex": "Male or Female or empty",',
    '  "phone": "primary phone number",',
    '  "email": "email address",',
    '  "address": "complete address",',
    '  "occupation": "job/occupation",',
    '  "maritalStatus": "Single/Married/Widowed/Separated or empty",',
    '  "bloodType": "A+/A-/B+/B-/O+/O-/AB+/AB- or empty",',
    '  "allergies": "known allergies",',
    '  "lastVisit": "YYYY-MM-DD or empty",',
    '  "balance": "0",',
    '  "physician": "attending physician name",',
    '  "emergencyContact": "emergency contact name and number"',
    '}',
    '',
    'RULES:',
    '- Read every character carefully, including handwritten text',
    '- For dates: convert any format to YYYY-MM-DD (e.g. Jan 5 1990 → 1990-01-05)',
    '- For phone: include area code, remove spaces/dashes',
    '- Never invent data — only extract what is visible',
    '- Return ONLY the JSON object, no explanation'
  ].join('\n');
}

// ── Prompt: full clinical examination record card ────────────────────────────
function buildExaminationPrompt() {
  return [
    'You are a dental clinical records OCR assistant. Extract ALL data from this patient examination record card.',
    'Return a single JSON object with these exact keys (use "" for missing/unclear fields):',
    '',
    '{',
    '  "name": "patient full name",',
    '  "dob": "YYYY-MM-DD or empty",',
    '  "age": "numeric age as string",',
    '  "sex": "Male or Female or empty",',
    '  "phone": "phone number",',
    '  "address": "address",',
    '  "occupation": "occupation",',
    '  "scanDate": "YYYY-MM-DD examination date",',
    '  "bloodPressure": "e.g. 120/80",',
    '  "physician": "physician name",',
    '  "allergies": "allergy list",',
    '  "chronicAilments": "chronic conditions",',
    '  "previousHistoryOfBleeding": "yes/no/details",',
    '  "drugsBeingTaken": "medications list",',
    '  "natureOfTreatment": "treatment description",',
    '  "occlusion": "occlusion findings",',
    '  "periodontalCondition": "periodontal status",',
    '  "oralHygiene": "oral hygiene rating/notes",',
    '  "dentureUpper": "upper denture info",',
    '  "dentureLower": "lower denture info",',
    '  "abnormalities": "oral abnormalities",',
    '  "generalCondition": "general health condition",',
    '  "clinicalNotes": "any clinical notes or remarks",',
    '  "dentalChartNotes": "dental chart annotations",',
    '  "teethConditions": "tooth-by-tooth conditions if listed"',
    '}',
    '',
    'RULES:',
    '- Read ALL text including handwritten annotations',
    '- Dental chart: describe each tooth condition you can read (e.g. "16: missing, 26: crown, 36: cavity")',
    '- For dates: convert to YYYY-MM-DD',
    '- Never invent data',
    '- Return ONLY the JSON object'
  ].join('\n');
}

// ── Drive: upload file ────────────────────────────────────────────────────────
function uploadFileToDrive(params) {
  try {
    var base64     = params.base64;
    var mimeType   = params.mimeType  || 'application/octet-stream';
    var filename   = params.filename  || ('attachment_' + Date.now());
    var patientId  = params.patientId || 'unknown';

    var rootName = 'CyrabellDMS_Patients';
    var rootSearch = DriveApp.getFoldersByName(rootName);
    var rootFolder = rootSearch.hasNext() ? rootSearch.next() : DriveApp.createFolder(rootName);

    var patSearch = rootFolder.getFoldersByName(patientId);
    var patFolder = patSearch.hasNext() ? patSearch.next() : rootFolder.createFolder(patientId);

    var bytes  = Utilities.base64Decode(base64);
    var blob   = Utilities.newBlob(bytes, mimeType, filename);
    var file   = patFolder.createFile(blob);
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
  } catch(e) {
    return { ok: false, error: e.toString() };
  }
}

// ── Drive: delete file ────────────────────────────────────────────────────────
function deleteFileFromDrive(params) {
  try {
    var fileId = params.fileId;
    if (!fileId) return { ok: false, error: 'No fileId' };
    DriveApp.getFileById(fileId).setTrashed(true);
    return { ok: true };
  } catch(e) {
    return { ok: false, error: e.toString() };
  }
}

// ── Helper ────────────────────────────────────────────────────────────────────
function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── One-time setup: save your Gemini API key ─────────────────────────────────
// Run this function ONCE from the Apps Script editor after pasting your key.
function setupGeminiKey() {
  var key = 'PASTE_YOUR_GEMINI_KEY_HERE'; // e.g. AIzaSy...
  PropertiesService.getScriptProperties().setProperty(GEMINI_KEY_PROP, key);
  Logger.log('Gemini API key saved. Model: ' + GEMINI_MODEL);
}

// ── Test function — run from Apps Script editor to verify ────────────────────
function testGeminiOcr() {
  var result = handleGeminiOcr({
    imageB64: '', // paste a small base64 image here to test
    mimeType: 'image/jpeg',
    scanType: 'basic'
  });
  Logger.log(JSON.stringify(result, null, 2));
}
