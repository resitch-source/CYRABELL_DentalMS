// ═══════════════════════════════════════════════════════════════════════════
// CYRABELL DENTAL MS — Apps Script: Multi-Provider AI Vision OCR + Drive
// ═══════════════════════════════════════════════════════════════════════════
//
// SETUP (one-time):
//   1. script.google.com → open your project → paste this entire file
//   2. Project Settings → Script Properties → Add ONE of:
//        GEMINI_API_KEY    = AIza...   ← FREE, recommended (aistudio.google.com)
//        OPENAI_API_KEY    = sk-...    ← paid
//        ANTHROPIC_API_KEY = sk-ant-...← paid
//   3. Run authorizeAll() ONCE to grant all OAuth scopes
//   4. Deploy → New Deployment → Web app
//        Execute as: Me   |   Access: Anyone
//   5. Copy the web app URL → paste in Cyrabell ☁️ Sync settings
//
// ⚡ FASTEST OPTION: Also enter your Gemini key in Cyrabell's ☁️ Sync →
//    "Gemini OCR (Fast Mode)" card. The app will then call Gemini DIRECTLY
//    from the browser (~5-10s) instead of routing through Apps Script (~60s).
//
// FREE TIER (Gemini 2.0 Flash):
//   15 requests/min  •  1,500 requests/day  — plenty for a clinic
// ═══════════════════════════════════════════════════════════════════════════

// ── doGet: health check ──────────────────────────────────────────────────────
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, pong: true, service: 'CyrabellDMS', version: '4.0' }))
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
    case 'claudeOcr':   // legacy action name
    case 'geminiOcr':   // new action name (both go to same multi-provider handler)
      return jsonOut(handleOcr(params));

    case 'uploadFile':
      return jsonOut(uploadFileToDrive(params));

    case 'deleteFile':
      return jsonOut(deleteFileFromDrive(params));

    default:
      return jsonOut({ ok: false, error: 'Unknown action: ' + action });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MULTI-PROVIDER OCR HANDLER
// Tries providers in order: Gemini (free) → OpenAI → Anthropic
// ═══════════════════════════════════════════════════════════════════════════
function handleOcr(payload) {
  var props        = PropertiesService.getScriptProperties();
  var geminiKey    = props.getProperty('GEMINI_API_KEY');
  var openaiKey    = props.getProperty('OPENAI_API_KEY');
  var anthropicKey = props.getProperty('ANTHROPIC_API_KEY');

  if (geminiKey)    geminiKey    = geminiKey.trim().replace(/\s/g,'');
  if (openaiKey)    openaiKey    = openaiKey.trim().replace(/\s/g,'');
  if (anthropicKey) anthropicKey = anthropicKey.trim().replace(/\s/g,'');

  if (!payload.imageB64) return { ok: false, error: 'Missing imageB64 in request' };
  var imageB64 = String(payload.imageB64);
  var mimeType = String(payload.mimeType || 'image/jpeg');
  var scanType = payload.scanType || 'basic';
  var prompt   = buildPrompt(scanType);

  if (geminiKey    && geminiKey.length    > 10) return callGemini(geminiKey,    imageB64, mimeType, prompt);
  if (openaiKey    && openaiKey.length    > 10) return callOpenAI(openaiKey,    imageB64, mimeType, prompt);
  if (anthropicKey && anthropicKey.length > 10) return callAnthropic(anthropicKey, imageB64, mimeType, prompt);

  return {
    ok: false,
    error: 'No AI API key configured. For FREE: get a Gemini key at https://aistudio.google.com/app/apikey ' +
           'then add GEMINI_API_KEY to Script Properties.'
  };
}

// ── Build extraction prompt ──────────────────────────────────────────────────
function buildPrompt(scanType) {
  if (scanType === 'examination') {
    return (
      'You are an expert dental clinical records assistant. ' +
      'Read this Patient Examination Record Chart image carefully and extract ALL visible information. ' +
      'Return ONLY a valid JSON object (no markdown, no backticks) with these exact keys: ' +
      '{"name":"Full name","age":"Age","sex":"Male or Female","address":"Home address",' +
      '"officeAddress":"Office address","telephone":"Phone","mobileNo":"Mobile 09XXXXXXXXX",' +
      '"maritalStatus":"Single/Married/etc","occupation":"Occupation",' +
      '"date":"Record date YYYY-MM-DD","occlusion":"Occlusion findings",' +
      '"periodontalCondition":"Periodontal condition","oralHygiene":"Oral hygiene",' +
      '"dentureUpper":"Upper denture","dentureLower":"Lower denture",' +
      '"abnormalities":"Abnormalities","generalCondition":"General condition",' +
      '"physician":"Physician name","natureOfTreatment":"Treatment description",' +
      '"allergies":"Allergies","previousHistoryOfBleeding":"Yes/No/details",' +
      '"chronicAilments":"Chronic conditions","bloodPressure":"BP reading",' +
      '"drugsBeingTaken":"Current medications",' +
      '"dentalChartNotes":"Chart annotations","teethConditions":"Tooth conditions by FDI",' +
      '"clinicalNotes":"Other clinical notes"}. ' +
      'Empty string for missing fields. Normalize PH phones to 09XXXXXXXXX. Dates to YYYY-MM-DD. ' +
      'Read handwriting carefully. Note any marked/shaded teeth in the dental chart diagram.'
    );
  }
  return (
    'You are a dental clinic data entry assistant. ' +
    'Read this patient record card and extract all patient information. ' +
    'Return ONLY a valid JSON object (no markdown, no backticks) with these keys: ' +
    '{"name":"Full name","dob":"YYYY-MM-DD","age":"numeric age","sex":"Male or Female",' +
    '"phone":"09XXXXXXXXX","email":"email","address":"complete address","occupation":"occupation",' +
    '"maritalStatus":"Single/Married/Widowed/Separated","bloodType":"A+/A-/B+/B-/O+/O-/AB+/AB-",' +
    '"allergies":"known allergies","lastVisit":"YYYY-MM-DD","balance":"0",' +
    '"physician":"physician name","emergencyContact":"contact name and number"}. ' +
    'Empty string for missing fields. Normalize PH phones to 09XXXXXXXXX. Dates to YYYY-MM-DD.'
  );
}

// ── Google Gemini Vision (FREE) ──────────────────────────────────────────────
function callGemini(apiKey, imageB64, mimeType, prompt) {
  // Try models in order — gemini-2.0-flash is fastest and free
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
      temperature:      0,       // deterministic — fastest + most consistent
      maxOutputTokens:  1024,
      responseMimeType: 'application/json',  // skip JSON parsing ambiguity
    }
  };

  var httpResponse = null;
  var lastError    = '';
  var usedModel    = '';
  var rateLimitRetries = 0;

  for (var mi = 0; mi < MODELS.length; mi++) {
    var modelUrl = 'https://generativelanguage.googleapis.com/v1beta/models/' +
                   MODELS[mi] + ':generateContent?key=' + apiKey;
    try {
      var resp     = UrlFetchApp.fetch(modelUrl, {
        method: 'post', contentType: 'application/json',
        payload: JSON.stringify(requestBody), muteHttpExceptions: true
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
          Logger.log('[OCR] Rate limit on ' + MODELS[mi] + ', waiting ' + waits[rateLimitRetries] + 's…');
          Utilities.sleep(waits[rateLimitRetries] * 1000);
          rateLimitRetries++;
          mi--;
          continue;
        }
        return { ok: false, error: 'Gemini rate limit — wait 1 minute before scanning again.' };
      }
      var errMsg = 'HTTP ' + respCode;
      try { var ep = JSON.parse(respBody); if (ep.error && ep.error.message) errMsg = ep.error.message; } catch(x){}
      lastError = errMsg;
      Logger.log('[OCR] ' + MODELS[mi] + ' error: ' + errMsg);
    } catch(fetchErr) {
      lastError = 'Network error: ' + String(fetchErr.message);
    }
  }

  if (!httpResponse) {
    return { ok: false, error: 'All Gemini models failed. Last error: ' + lastError };
  }

  var body = httpResponse.getContentText();
  var resp2;
  try { resp2 = JSON.parse(body); } catch(e) { return { ok: false, error: 'Gemini returned invalid JSON' }; }

  var text = '';
  try { text = resp2.candidates[0].content.parts[0].text; }
  catch(e) { return { ok: false, error: 'Unexpected Gemini response: ' + body.substring(0, 200) }; }

  var result = parseExtractedJson(text);
  if (result.ok) result.model = usedModel;
  return result;
}

// ── OpenAI GPT-4o Vision ──────────────────────────────────────────────────────
function callOpenAI(apiKey, imageB64, mimeType, prompt) {
  var requestBody = {
    model: 'gpt-4o',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: 'data:' + mimeType + ';base64,' + imageB64 } },
        { type: 'text', text: prompt }
      ]
    }]
  };

  var httpResponse;
  try {
    httpResponse = UrlFetchApp.fetch('https://api.openai.com/v1/chat/completions', {
      method: 'post', contentType: 'application/json',
      headers: { 'Authorization': 'Bearer ' + apiKey },
      payload: JSON.stringify(requestBody), muteHttpExceptions: true
    });
  } catch(e) { return { ok: false, error: 'OpenAI network error: ' + e.message }; }

  var code = httpResponse.getResponseCode();
  var body = httpResponse.getContentText();
  if (code !== 200) {
    var msg = 'OpenAI error ' + code;
    try { var e2 = JSON.parse(body); if (e2.error && e2.error.message) msg = e2.error.message; } catch(x){}
    return { ok: false, error: msg };
  }

  var resp;
  try { resp = JSON.parse(body); } catch(e) { return { ok: false, error: 'OpenAI bad JSON' }; }
  var text = resp.choices && resp.choices[0] && resp.choices[0].message && resp.choices[0].message.content;
  if (!text) return { ok: false, error: 'No content from OpenAI' };
  return parseExtractedJson(text);
}

// ── Anthropic Claude ──────────────────────────────────────────────────────────
function callAnthropic(apiKey, imageB64, mimeType, prompt) {
  var requestBody = {
    model:      'claude-haiku-4-5-20251001',  // cheapest + fast vision model
    max_tokens: 1024,
    system:     'You are a dental clinic OCR assistant. Extract data from images as JSON only.',
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mimeType, data: imageB64 } },
        { type: 'text',  text: prompt }
      ]
    }]
  };

  var httpResponse;
  try {
    httpResponse = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
      method: 'post', contentType: 'application/json',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      payload: JSON.stringify(requestBody), muteHttpExceptions: true
    });
  } catch(e) { return { ok: false, error: 'Anthropic network error: ' + e.message }; }

  var code = httpResponse.getResponseCode();
  var body = httpResponse.getContentText();
  if (code === 402) return { ok: false, error: 'Anthropic credit balance too low. Switch to Gemini (free).' };
  if (code !== 200) {
    var msg = 'Anthropic error ' + code;
    try { var e2 = JSON.parse(body); if (e2.error && e2.error.message) msg = e2.error.message; } catch(x){}
    return { ok: false, error: msg };
  }

  var resp;
  try { resp = JSON.parse(body); } catch(e) { return { ok: false, error: 'Anthropic bad JSON' }; }
  var text = resp.content && resp.content[0] && resp.content[0].text;
  if (!text) return { ok: false, error: 'No content from Anthropic' };
  return parseExtractedJson(text);
}

// ── Shared JSON parser ────────────────────────────────────────────────────────
function parseExtractedJson(rawText) {
  var clean = rawText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  var start = clean.indexOf('{');
  var end   = clean.lastIndexOf('}');
  if (start !== -1 && end > start) clean = clean.substring(start, end + 1);

  var extracted;
  try { extracted = JSON.parse(clean); }
  catch(e) { return { ok: false, error: 'Could not parse AI response as JSON. Raw: ' + clean.substring(0, 200) }; }

  // Sanitize values
  var keys = [
    'name','dob','phone','email','address','bloodType','allergies','lastVisit','notes',
    'age','sex','officeAddress','telephone','mobileNo','maritalStatus','occupation','date',
    'occlusion','periodontalCondition','oralHygiene','dentureUpper','dentureLower',
    'abnormalities','generalCondition','physician','natureOfTreatment',
    'previousHistoryOfBleeding','chronicAilments','bloodPressure','drugsBeingTaken',
    'dentalChartNotes','teethConditions','clinicalNotes','balance','emergencyContact',
    'scanDate','chronicAilments',
  ];
  for (var i = 0; i < keys.length; i++) {
    var v = extracted[keys[i]];
    if (v === undefined || v === null || v === 'null' || v === 'N/A' || v === 'n/a') {
      extracted[keys[i]] = '';
    } else {
      extracted[keys[i]] = String(v).trim();
    }
  }

  return { ok: true, data: extracted };
}

// ═══════════════════════════════════════════════════════════════════════════
// GOOGLE DRIVE — file upload / delete
// ═══════════════════════════════════════════════════════════════════════════
function uploadFileToDrive(params) {
  try {
    var base64    = params.base64;
    var mimeType  = params.mimeType  || 'application/octet-stream';
    var filename  = params.filename  || ('attachment_' + Date.now());
    var patientId = params.patientId || 'unknown';

    var rootName   = 'CyrabellDMS_Patients';
    var rootSearch = DriveApp.getFoldersByName(rootName);
    var rootFolder = rootSearch.hasNext() ? rootSearch.next() : DriveApp.createFolder(rootName);

    var patSearch = rootFolder.getFoldersByName(patientId);
    var patFolder = patSearch.hasNext() ? patSearch.next() : rootFolder.createFolder(patientId);

    var bytes = Utilities.base64Decode(base64);
    var blob  = Utilities.newBlob(bytes, mimeType, filename);
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
  } catch(e) {
    return { ok: false, error: e.toString() };
  }
}

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

// ═══════════════════════════════════════════════════════════════════════════
// SETUP UTILITIES — run these ONCE from the Apps Script editor
// ═══════════════════════════════════════════════════════════════════════════

// Run ONCE to grant all required OAuth scopes, then redeploy.
function authorizeAll() {
  try { Logger.log('Sheets: ' + SpreadsheetApp.getActiveSpreadsheet().getName()); } catch(e) { Logger.log('Sheets: ' + e.message); }
  try { Logger.log('Drive:  ' + DriveApp.getRootFolder().getName()); } catch(e) { Logger.log('Drive: ' + e.message); }
  try {
    var res = UrlFetchApp.fetch('https://httpbin.org/get', { muteHttpExceptions: true });
    Logger.log('UrlFetch: OK (' + res.getResponseCode() + ')');
  } catch(e) { Logger.log('UrlFetch: ' + e.message); }
  Logger.log('✅ Done. Now redeploy as a new version.');
}

// Save your Gemini key (FREE - recommended).
// Replace the key below, select this function, click ▶ Run.
function setupGeminiKey() {
  var key = 'YOUR-GEMINI-KEY-HERE'; // ← paste AIza... key here
  if (key === 'YOUR-GEMINI-KEY-HERE' || key.length < 10) {
    Logger.log('❌ Replace YOUR-GEMINI-KEY-HERE with your actual key first.');
    Logger.log('   Free key: https://aistudio.google.com/app/apikey');
    return;
  }
  key = key.trim().replace(/\s/g, '');
  PropertiesService.getScriptProperties().setProperty('GEMINI_API_KEY', key);
  Logger.log('✅ Gemini key saved: ' + key.substring(0, 8) + '... (' + key.length + ' chars)');
  Logger.log('   Redeploy: Deploy → Manage → ✏️ Edit → New version → Deploy');
}

// List all available Gemini vision models on your key.
function listGeminiModels() {
  var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) { Logger.log('❌ GEMINI_API_KEY not set.'); return; }
  var resp = UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + apiKey.trim(), { muteHttpExceptions: true });
  if (resp.getResponseCode() !== 200) { Logger.log('Error: ' + resp.getContentText().substring(0, 200)); return; }
  var data = JSON.parse(resp.getContentText());
  Logger.log('Models supporting generateContent:');
  (data.models || []).forEach(function(m) {
    if ((m.supportedGenerationMethods || []).indexOf('generateContent') !== -1) {
      Logger.log('  ✓ ' + m.name + ' — ' + (m.displayName || ''));
    }
  });
}

// Check which API keys are configured.
function checkApiKeyStatus() {
  var props = PropertiesService.getScriptProperties().getProperties();
  function mask(k) { k = (k||'').trim(); return k ? k.substring(0,8)+'...(' + k.length + ' chars)' : '(not set)'; }
  Logger.log('GEMINI_API_KEY:    ' + mask(props.GEMINI_API_KEY));
  Logger.log('OPENAI_API_KEY:    ' + mask(props.OPENAI_API_KEY));
  Logger.log('ANTHROPIC_API_KEY: ' + mask(props.ANTHROPIC_API_KEY));
  Logger.log('Active provider: ' + (
    (props.GEMINI_API_KEY    && props.GEMINI_API_KEY.trim().length    > 10) ? 'Gemini (free)' :
    (props.OPENAI_API_KEY    && props.OPENAI_API_KEY.trim().length    > 10) ? 'OpenAI' :
    (props.ANTHROPIC_API_KEY && props.ANTHROPIC_API_KEY.trim().length > 10) ? 'Anthropic' : 'NONE'
  ));
}
