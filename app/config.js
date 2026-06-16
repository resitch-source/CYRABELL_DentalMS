/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║          CYRABELL DENTAL MANAGEMENT SYSTEM — v2 (Refactored)           ║
 * ║                                                                          ║
 * ║  Original: cyrabelldental_24.html                                        ║
 * ║  Refactored: cyrabelldental_v2.html                                      ║
 * ║  Audit date: 2026-05-31                                                  ║
 * ║                                                                          ║
 * ║  CHANGES FROM v1:                                                        ║
 * ║  - CONFIG object centralizing all configurable values                    ║
 * ║  - LS_KEYS constants object eliminating magic localStorage strings       ║
 * ║  - escapeHTML() to prevent XSS in medical document templates             ║
 * ║  - Login lockout after 5 failed attempts (30-second cooldown)            ║
 * ║  - Removed on-screen credential hints from login form                    ║
 * ║  - Session inactivity timeout (default: 15 minutes)                     ║
 * ║  - Modal focus-trap for accessibility                                    ║
 * ║  - Toast notifications with role="alert" for screen readers              ║
 * ║  - Tooth chart cells with tabIndex, role, aria-label                     ║
 * ║  - Time-of-day greeting on Dashboard                                     ║
 * ║  - JSDoc comments on all major functions and components                  ║
 * ║  - Workflow/data-flow block comments at each major section               ║
 * ║  - All original functionality preserved                                  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * ── ARCHITECTURE OVERVIEW ──────────────────────────────────────────────────
 *
 * This is a self-contained single-file React application.
 * No build step, no bundler. React and XLSX are embedded inline.
 *
 * TECHNOLOGY STACK:
 *   - React 18.3.1 (CDN embedded, hyperscript h() API, no JSX)
 *   - SheetJS/XLSX (CDN embedded, used only for CSV/Excel export)
 *   - Vanilla CSS (embedded, ~2500 lines)
 *   - localStorage for primary client-side persistence
 *   - Google Apps Script (optional) for cloud sync to Google Sheets
 *
 * DATA FLOW:
 *   Google Sheets ←──→ Apps Script API ←──→ fetch() ←──→ App state (React)
 *                                                               │
 *                                              localStorage ←───┤
 *                                              (cache/fallback) │
 *                                                               ↓
 *                                                          React DOM
 *
 * STATE HIERARCHY:
 *   App (root)
 *   ├─ patients[]        — patient demographics, dental chart, attachments
 *   ├─ appointments[]    — scheduled and completed visits
 *   ├─ payments[]        — payment transactions
 *   ├─ notifications[]   — sent SMS/email/WhatsApp records
 *   ├─ reminders[]       — scheduled recurring reminder configs
 *   └─ reminderLog[]     — log of sent reminder messages
 *
 * AUTH MODEL:
 *   Login compares username/password against CONFIG.ADMIN_USERS array.
 *   No tokens or cookies. Auth lives only in React useState memory.
 *   Session clears on page refresh. Inactivity timeout enforced by timer.
 *
 * ── PRODUCTION DEPLOYMENT NOTES ───────────────────────────────────────────
 *   1. Change CONFIG.ADMIN_USERS credentials before going live.
 *   2. Change CONFIG.KIOSK_EXIT_PIN before going live.
 *   3. Set up a Google Apps Script web app and enter the URL in Sync page.
 *   4. Consider serving over HTTPS only.
 *   5. See QUALITY_REPORT.md for full security audit findings.
 */

// ══════════════════════════════════════════════════════════════════════════════
// ⚙️  CENTRAL CONFIGURATION OBJECT
//
// DATA FLOW: This object is the single source of truth for all configurable
// values. Change values here rather than hunting through the codebase.
//
// ⚠️  PRODUCTION NOTICE: Before deploying with real patient data:
//     1. Change ADMIN_USERS passwords to strong unique values.
//     2. Change KIOSK_EXIT_PIN to a clinic-specific PIN.
//     3. Remove or set SHOW_DEMO_CREDENTIALS to false.
// ══════════════════════════════════════════════════════════════════════════════
const CONFIG = Object.freeze({

  // ── Clinic Information ─────────────────────────────────────────────────
  // Used in medical certificates, prescriptions, and UI branding.
  CLINIC: {
    name:       'COLAO, ARNOLD A. DENTAL CLINIC',
    specialty:  'General Dentistry / Orthodontics',
    address:    'Rm 301, Eltanal Building, Roxas Avenue, Iligan City',
    tel:        '(063) 221-0033',
    cel:        '09709197795',
    hours:      '9:00 AM to 5:00 PM  |  Monday to Saturday',
    doctor:     'COLAO, ARNOLD D.M.D.',
    license:    '0040566',
  },

  // ── Authentication ─────────────────────────────────────────────────────
  // ⚠️  CHANGE THESE CREDENTIALS BEFORE PRODUCTION DEPLOYMENT.
  // ⚠️  DO NOT COMMIT REAL PASSWORDS TO VERSION CONTROL.
  // These are plain-text client-side credentials — NOT suitable for
  // high-security environments. For HIPAA compliance, consider moving
  // authentication to a proper server-side system.
  ADMIN_USERS: [
    { username: 'admin',     password: 'cyrabell2026',  role: 'Administrator', name: 'Admin' },
    { username: 'reception', password: 'reception123',  role: 'Receptionist',  name: 'Reception Staff' },
  ],

  // ⚠️  CHANGE THIS PIN BEFORE PRODUCTION DEPLOYMENT.
  KIOSK_EXIT_PIN: '2580',

  // Set to false in production to remove on-screen demo hints.
  SHOW_DEMO_CREDENTIALS: false,

  // ── Security Settings ──────────────────────────────────────────────────
  /** Maximum failed login attempts before lockout. */
  LOGIN_MAX_ATTEMPTS: 5,
  /** Lockout duration in milliseconds (30 seconds). */
  LOGIN_LOCKOUT_MS: 30 * 1000,
  /** Session inactivity timeout in milliseconds (15 minutes). */
  SESSION_TIMEOUT_MS: 15 * 60 * 1000,

  // ── Scheduling Settings ────────────────────────────────────────────────
  /** Default appointment slot duration in minutes. */
  DEFAULT_SLOT_MIN: 45,
  /** Available appointment times. */
  APPOINTMENT_TIMES: ['09:00','10:00','11:00','13:00','14:00','15:00','16:00','17:00'],
  /** Dentists available for scheduling. */
  DENTISTS: ['Dr. Arnold Colao'],

  // ── Data Limits ────────────────────────────────────────────────────────
  /** Strip base64 data URLs larger than this for Google Sheets sync. */
  SYNC_STRIP_THRESHOLD_BYTES: 30 * 1024,
  /** Strip base64 data URLs larger than this for localStorage. */
  LS_STRIP_THRESHOLD_BYTES: 100 * 1024,
  /** Maximum log entries kept in memory. */
  MAX_LOG_ENTRIES: 500,
  /** Maximum persisted error log entries in localStorage. */
  MAX_PERSISTED_ERRORS: 50,

  // ── Auto-Sync Settings ─────────────────────────────────────────────────
  /** Debounce delay before auto-syncing to Google Sheets (ms). */
  AUTO_SYNC_DEBOUNCE_MS: 2000,
  /** Delay before auto-saving to localStorage (ms). */
  LS_SAVE_DEBOUNCE_MS: 1000,
  /** Reminder auto-trigger interval (hours). */
  REMINDER_TRIGGER_HOURS: 6,

  // ── UI Settings ────────────────────────────────────────────────────────
  /** Number of recent appointments shown on Dashboard. */
  DASHBOARD_RECENT_COUNT: 5,
  /** Kiosk success screen auto-dismiss delay (ms). */
  KIOSK_AUTO_RETURN_MS: 6000,

  // ── PHI Encryption (Finding #3) ────────────────────────────────────────────
  /**
   * When true: all PHI localStorage saves are encrypted with AES-256-GCM.
   * Key derived from login password via PBKDF2. Set false for legacy/migration.
   */
  ENCRYPT_LOCALSTORAGE: false,

  // ── Pagination (Finding #16) ─────────────────────────────────────────────
  /** Rows per page in Patients, Appointments, Payments, Notifications tables. */
  PAGE_SIZE: 20,

  // ── Data Versioning (Finding #22) ─────────────────────────────────────────
  /** Bump this constant when adding required fields to existing records. */
  DATA_VERSION: '2.0',
});

// ══════════════════════════════════════════════════════════════════════════════
// 🗝️  LOCALSTORAGE KEY CONSTANTS
//
// DATA FLOW: All localStorage reads and writes MUST use these constants.
// Never use raw string literals for localStorage keys — a typo silently
// breaks persistence with no error message.
// ══════════════════════════════════════════════════════════════════════════════
const LS_KEYS = Object.freeze({
  PATIENTS:         'cyrabell_v2_patients',
  APPOINTMENTS:     'cyrabell_v2_appointments',
  PAYMENTS:         'cyrabell_v2_payments',
  NOTIFICATIONS:    'cyrabell_v2_notifications',
  REMINDERS:        'cyrabell_v2_reminders',
  REMINDER_LOG:     'cyrabell_v2_reminderLog',
  SYNC_URL:         'cyrabell_sync_url',
  LAST_SYNC:        'cyrabell_last_sync',
  AUTO_SYNC:        'cyrabell_auto_sync',
  AUTO_CONFIRM:     'cyrabell_auto_confirm',
  REMINDER_AUTO:    'cyrabell_reminder_auto',
  REMINDER_LAST_RUN:'cyrabell_reminder_last_run',
  APPT_NOTIF_CFG:   'cyrabell_appt_notif_cfg',
  ERROR_LOG:        'cyrabell_error_log',
  SERVICES:         'cyrabell_v2_services',
  DATA_VERSION:     'cyrabell_data_version',
  CRYPTO_SALT:      'cyrabell_crypto_salt',
  GEMINI_KEY:       'cyrabell_gemini_key',
  LICENSE:          'cyrabell_license',
  USERS:            'cyrabell_v2_users',
  SEMAPHORE_KEY:  'cyrabell_semaphore_key',
  WA_TOKEN:       'cyrabell_wa_token',
  WA_PHONE_ID:    'cyrabell_wa_phone_id',
  VIBER_TOKEN:    'cyrabell_viber_token',
});

// ── IndexedDB attachment store ─────────────────────────────────────────────
// Stores raw base64 dataUrls keyed by attachment ID.
// Used when Google Drive sync is not configured.
const IDB_DB_NAME = 'CyrabellAttachments';
const IDB_STORE   = 'attachments';

function idbOpen() {
  return new Promise((res, rej) => {
    const req = indexedDB.open(IDB_DB_NAME, 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore(IDB_STORE);
    req.onsuccess = e => res(e.target.result);
    req.onerror   = e => rej(e.target.error);
  });
}
function idbPut(id, dataUrl) {
  return idbOpen().then(db => new Promise((res, rej) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(dataUrl, id);
    tx.oncomplete = res; tx.onerror = e => rej(e.target.error);
  }));
}
function idbGet(id) {
  return idbOpen().then(db => new Promise((res, rej) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get(id);
    req.onsuccess = e => res(e.target.result || null);
    req.onerror   = e => rej(e.target.error);
  }));
}
function idbDelete(id) {
  return idbOpen().then(db => new Promise((res, rej) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).delete(id);
    tx.oncomplete = res; tx.onerror = e => rej(e.target.error);
  }));
}

// ── Shared utility helpers ────────────────────────────────────────────────

/** Build a Google Drive thumbnail URL for direct <img> embedding. */
function driveThumbnailUrl(id, sz) {
  return 'https://drive.google.com/thumbnail?id=' + id + '&sz=' + (sz || 'w400');
}

/** Read a File object as a base64 data URL. Returns a Promise<string>. */
function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = e => resolve(e.target.result || '');
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Show a confirm dialog; if confirmed, call fn(). */
function confirmDelete(msg, fn) {
  if (window.confirm(msg || 'Delete this item?')) fn();
}

/**
 * AttachThumb — reusable mini attachment card (thumbnail or icon + name).
 * Props: att {id, name, type, dataUrl?, driveFileId?, storage}, onClick, sz (Drive thumbnail size)
 */
function AttachThumb({att, onClick, sz}) {
  const isImg = (att.type||'').startsWith('image/');
  const isPdf = att.type === 'application/pdf';
  const thumbSrc = att.storage === 'drive' && att.driveFileId
    ? driveThumbnailUrl(att.driveFileId, sz || 'w200')
    : (att.dataUrl || '');
  return h('div', {
    style:{display:'flex',flexDirection:'column',alignItems:'center',gap:4,
      background:'#fff',border:'1.5px solid var(--bd)',borderRadius:8,
      padding:'6px',cursor:onClick?'pointer':'default',minWidth:80,maxWidth:100},
    title: att.name,
    onClick: onClick ? ()=>onClick(att) : undefined
  },
    isImg && thumbSrc
      ? h('img',{src:thumbSrc, alt:att.name,
          style:{width:60,height:60,objectFit:'cover',borderRadius:4},
          onError:e=>{e.target.style.display='none';}})
      : h('div',{style:{fontSize:28,lineHeight:1.2}}, isPdf ? '📑' : '📄'),
    h('div',{style:{fontSize:10,color:'var(--md)',textAlign:'center',wordBreak:'break-all',maxWidth:80}},
      (att.name||'').length > 14 ? (att.name||'').substring(0,12)+'…' : (att.name||'')
    )
  );
}

// ── Google Drive file upload via Apps Script ───────────────────────────────
// POST to Apps Script with action=uploadFile.
// Returns {fileId, viewUrl, embedUrl, thumbnailUrl, downloadUrl} on success.
async function uploadFileToDrive(syncUrl, base64Data, mimeType, filename, patientId) {
  // Strip data URL prefix if present
  const base64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
  const resp = await fetch(syncUrl, {
    method: 'POST',
    headers: {'Content-Type':'text/plain;charset=utf-8'},
    body: JSON.stringify({
      action: 'uploadFile',
      patientId,
      filename,
      mimeType,
      base64,
    }),
  });
  if (!resp.ok) throw new Error('Drive upload failed: ' + resp.status);
  const data = await resp.json();
  if (data.error) throw new Error(data.error);
  return data; // {fileId, viewUrl, embedUrl, thumbnailUrl, downloadUrl}
}

// ══════════════════════════════════════════════════════════════════════════════
// 🔒  SECURITY UTILITIES
//
// These functions should be used whenever user-supplied data is rendered into
// HTML strings. All medical document generators and print functions MUST use
// escapeHTML() on every variable interpolated into HTML.
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Escapes a string for safe interpolation into HTML.
 * Converts <, >, &, ", and ' to their HTML entity equivalents.
 *
 * @param {*} str - The value to escape (will be coerced to string).
 * @returns {string} HTML-safe string.
 *
 * SECURITY: This function is the primary defense against XSS in all
 * medical document templates (buildMedCertHTML, buildRxHTML, printDoc).
 * Do NOT skip calling this function because the value "looks safe".
 * Patient names and addresses can contain angle brackets or quotes.
 */
function escapeHTML(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Validates that a value is a safe date string (YYYY-MM-DD).
 * Returns empty string for invalid/dangerous values.
 *
 * @param {*} val - The value to validate.
 * @returns {string} Safe date string or empty string.
 */
function safeDateStr(val) {
  if (!val || typeof val !== 'string') return '';
  // Only allow YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  return '';
}

/**
 * Validates and sanitizes a phone number string.
 * Strips everything except digits, +, -, (, ), and spaces.
 *
 * @param {string} phone - The phone number to sanitize.
 * @returns {string} Sanitized phone number.
 */
function sanitizePhone(phone) {
  if (!phone || typeof phone !== 'string') return '';
  return phone.replace(/[^0-9+\-() ]/g, '').trim().substring(0, 20);
}

/**
 * Validates and sanitizes an email address.
 * Returns empty string if format is clearly invalid.
 *
 * @param {string} email - The email to validate.
 * @returns {string} Validated email or empty string.
 */
function sanitizeEmail(email) {
  if (!email || typeof email !== 'string') return '';
  const trimmed = email.trim().substring(0, 254);
  // Basic email format check
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return trimmed;
  return '';
}

// ══════════════════════════════════════════════════════════════════════════════
// 🔐  PHI ENCRYPTION HELPERS  (Finding #3)
//
// AES-256-GCM encryption for localStorage PHI data.
// Key is derived per-session from the login password using PBKDF2.
// Opt-in via CONFIG.ENCRYPT_LOCALSTORAGE = true.
// When false, data is stored as plaintext JSON (legacy mode).
// ══════════════════════════════════════════════════════════════════════════════

// Module-level crypto key (set on login, cleared on logout)
let _cryptoKey = null;

/** Derive AES-256-GCM key from password + salt using PBKDF2. */
async function deriveCryptoKey(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveKey']
  );
  return window.crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: 100000, hash: 'SHA-256' },
    keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
  );
}

/** Get or create the per-device salt (stored in localStorage unencrypted). */
function getCryptoSalt() {
  try {
    let salt = localStorage.getItem(LS_KEYS.CRYPTO_SALT);
    if (!salt) {
      const arr = new Uint8Array(16);
      window.crypto.getRandomValues(arr);
      salt = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
      localStorage.setItem(LS_KEYS.CRYPTO_SALT, salt);
    }
    return salt;
  } catch(e) { return 'cyrabell-default-salt'; }
}

/**
 * Initialise encryption on login.
 * Call this with the user's plaintext password right after authentication.
 */
async function initCryptoKey(password) {
  if (!CONFIG.ENCRYPT_LOCALSTORAGE) return;
  if (!window.crypto || !window.crypto.subtle) return; // Web Crypto not available
  try {
    const salt = getCryptoSalt();
    _cryptoKey = await deriveCryptoKey(password, salt);
  } catch(e) {
    console.warn('[crypto] Key derivation failed:', e.message);
    _cryptoKey = null;
  }
}

/** Clear the in-memory key on logout. */
function clearCryptoKey() { _cryptoKey = null; }

/** Encrypt a JSON string. Returns base64-encoded ciphertext or null on failure. */
async function encryptData(plaintext) {
  if (!_cryptoKey) return null;
  try {
    const enc = new TextEncoder();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const cipherBuf = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv }, _cryptoKey, enc.encode(plaintext)
    );
    // Prepend IV to ciphertext, then base64-encode the whole thing
    const combined = new Uint8Array(iv.length + cipherBuf.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(cipherBuf), iv.length);
    return btoa(String.fromCharCode(...combined));
  } catch(e) { return null; }
}

/** Decrypt a base64-encoded ciphertext. Returns plaintext string or null. */
async function decryptData(b64) {
  if (!_cryptoKey) return null;
  try {
    const combined = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    const dec = new TextDecoder();
    const plainBuf = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, _cryptoKey, data);
    return dec.decode(plainBuf);
  } catch(e) { return null; }
}

/**
 * Safe encrypted localStorage set.
 * Falls back to plaintext if encryption is disabled or unavailable.
 * Shows a toast on QuotaExceededError (Finding #21).
 */
async function lsSetEncrypted(key, jsonStr, toastFn) {
  try {
    let value = jsonStr;
    if (CONFIG.ENCRYPT_LOCALSTORAGE && _cryptoKey) {
      const enc = await encryptData(jsonStr);
      if (enc) value = '__ENC__' + enc;
    }
    localStorage.setItem(key, value);
  } catch(e) {
    if (e && (e.name === 'QuotaExceededError' || e.code === 22)) {
      if (typeof toastFn === 'function') {
        toastFn('⚠️ Storage full — export your data and clear old records', 'error');
      }
    }
    throw e;
  }
}

/**
 * Safe encrypted localStorage get.
 * Detects __ENC__ prefix and decrypts if needed.
 * Returns parsed JSON value or null.
 */
async function lsGetDecrypted(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    if (raw.startsWith('__ENC__')) {
      if (!_cryptoKey) return null; // key not yet derived
      const plain = await decryptData(raw.slice(7));
      return plain ? JSON.parse(plain) : null;
    }
    return JSON.parse(raw);
  } catch(e) { return null; }
}

// ══════════════════════════════════════════════════════════════════════════════
// 📦  DATA VERSION MIGRATION  (Finding #22)
//
// On app init, check localStorage for the stored data version.
// If missing or older, run a migration that fills in any required new fields.
// ══════════════════════════════════════════════════════════════════════════════

/** Run data migration if stored version < CONFIG.DATA_VERSION. */
function runDataMigration(patients, appointments, payments, notifications) {
  let storedVersion = '';
  try { storedVersion = localStorage.getItem(LS_KEYS.DATA_VERSION) || ''; } catch(e) {}
  if (storedVersion === CONFIG.DATA_VERSION) return { patients, appointments, payments, notifications };

  // Migration: ensure all patients have required fields added in v2.0
  const migratedPatients = (Array.isArray(patients) ? patients : []).map(p => ({
    balance: 0,
    teeth: {},
    attachments: [],
    history: [],
    allergies: 'None',
    ...p,
  }));

  // Migration: ensure all appointments have required fields
  const migratedAppts = (Array.isArray(appointments) ? appointments : []).map(a => ({
    arrived: false,
    notes: '',
    ...a,
  }));

  // Stamp the new version
  try { localStorage.setItem(LS_KEYS.DATA_VERSION, CONFIG.DATA_VERSION); } catch(e) {}

  return { patients: migratedPatients, appointments: migratedAppts, payments, notifications };
}

// ══════════════════════════════════════════════════════════════════════════════
// 🛡️  ROLE-BASED ACCESS CONTROL  (Finding #8)
//
// canDo(user, action) returns true if the user's role permits the action.
// Receptionist is restricted from: deleting patients, exporting data,
// accessing Settings/Sync tab, and viewing financial analytics.
// ══════════════════════════════════════════════════════════════════════════════

const RBAC = {
  Administrator: {
    delete_patient: true,  export_data: true,  view_sync: true,
    view_analytics: true,  view_logs: true,    edit_services: true,
    use_ai: true,          use_kiosk: true,    manage_license: true,  manage_users: true,
  },
  Dentist: {
    delete_patient: true,  export_data: true,  view_sync: false,
    view_analytics: true,  view_logs: false,   edit_services: true,
    use_ai: true,          use_kiosk: true,    manage_license: false, manage_users: false,
  },
  Receptionist: {
    delete_patient: false, export_data: false, view_sync: false,
    view_analytics: false, view_logs: false,   edit_services: false,
    use_ai: false,         use_kiosk: true,    manage_license: false, manage_users: false,
  },
};

function canDo(user, action) {
  if (!user) return false;
  const perms = RBAC[user.role] || RBAC.Receptionist;
  return perms[action] === true;
}

// ══════════════════════════════════════════════════════════════════════════════
// PLAN / LICENSE FEATURE GATES
// ══════════════════════════════════════════════════════════════════════════════
const PLAN_FEATURES = {
  starter:      { patientLimit:500, userLimit:1, aiAssistant:false, kioskMode:false, advancedAnalytics:false, allReminderTypes:false, viber:false, messenger:false, multiDentist:false, conflictAnalysis:false, customBranding:false },
  professional: { patientLimit:Infinity, userLimit:2, aiAssistant:true, kioskMode:true, advancedAnalytics:true, allReminderTypes:true, viber:true, messenger:true, multiDentist:false, conflictAnalysis:true, customBranding:false },
  clinic_pro:   { patientLimit:Infinity, userLimit:Infinity, aiAssistant:true, kioskMode:true, advancedAnalytics:true, allReminderTypes:true, viber:true, messenger:true, multiDentist:true, conflictAnalysis:true, customBranding:true },
};
const PLAN_NAMES  = { starter:'Starter', professional:'Professional', clinic_pro:'Clinic Pro' };
const PLAN_PRICES = { starter:'₱599/mo', professional:'₱1,299/mo', clinic_pro:'₱1,999/mo' };
const PLAN_UPGRADE= { starter:'professional', professional:'clinic_pro', clinic_pro:null };
function getLicense() { try { return JSON.parse(localStorage.getItem('cyrabell_license')||'{}'); } catch { return {}; } }
function getCurrentPlan() { const l=getLicense(); return l.plan && PLAN_FEATURES[l.plan] ? l.plan : 'starter'; }
function planHas(feature) { return PLAN_FEATURES[getCurrentPlan()][feature] === true; }
function getPlanLimit(feature) { return PLAN_FEATURES[getCurrentPlan()][feature]; }

// ── License key crypto ────────────────────────────────────────────────────────
const _LK_SECRET = 'NEXARCH_CYRABELL_LK_SECRET_2024$#@!xQ7mRpZ9vNcY3bWd';
const _PLAN_CODE_MAP = { STRT:'starter', PROF:'professional', CPRO:'clinic_pro' };
async function _lkHmac(message){
  const enc=new TextEncoder();
  const key=await crypto.subtle.importKey('raw',enc.encode(_LK_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const buf=await crypto.subtle.sign('HMAC',key,enc.encode(message));
  const hex=Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
  return BigInt('0x'+hex.slice(0,16)).toString(36).toUpperCase().slice(0,8).padStart(8,'0');
}
async function validateLicenseKey(key){
  const parts=(key||'').trim().toUpperCase().split('-');
  if(parts.length!==5||parts[0]!=='CYRABELL') return {valid:false,error:'Invalid key format.'};
  const [,planCode,expiry,nonce,sig]=parts;
  if(!_PLAN_CODE_MAP[planCode]) return {valid:false,error:'Unknown plan code in key.'};
  if(!/^\d{6}$/.test(expiry)) return {valid:false,error:'Invalid expiry segment.'};
  const yr=parseInt(expiry.slice(0,4),10), mo=parseInt(expiry.slice(4,6),10);
  const now=new Date();
  if(now.getFullYear()>yr||(now.getFullYear()===yr&&now.getMonth()+1>mo))
    return {valid:false,error:'License key has expired. Contact hello@nexarch.dev'};
  const expected=await _lkHmac(`CYRABELL-${planCode}-${expiry}-${nonce}`);
  if(sig!==expected) return {valid:false,error:'Invalid license key. Contact hello@nexarch.dev'};
  return {valid:true,plan:_PLAN_CODE_MAP[planCode],expiry,error:null};
}

// APP_DEFAULTS — bake your GAS URL here after first deploy so all browsers auto-fill it
const APP_DEFAULTS = Object.freeze({
  GAS_URL: '', // ← paste your Apps Script /exec URL here
});

// ══════════════════════════════════════════════════════════════════════════════
// 🔐  LOGIN LOCKOUT TRACKER
//
// Tracks failed login attempts and lockout state in module scope.
// This is intentionally NOT in localStorage (would allow bypass by clearing).
// Resets on page refresh — acceptable trade-off for a client-side system.
// ══════════════════════════════════════════════════════════════════════════════
const _loginState = {
  attempts: 0,
  lockedUntil: 0,

  /** @returns {boolean} True if currently locked out. */
  isLocked() {
    return Date.now() < this.lockedUntil;
  },

  /** @returns {number} Seconds remaining in lockout (0 if not locked). */
  lockSecondsRemaining() {
    return Math.max(0, Math.ceil((this.lockedUntil - Date.now()) / 1000));
  },

  /** Records a failed attempt. Returns true if now locked. */
  recordFailure() {
    this.attempts++;
    if (this.attempts >= CONFIG.LOGIN_MAX_ATTEMPTS) {
      this.lockedUntil = Date.now() + CONFIG.LOGIN_LOCKOUT_MS;
      this.attempts = 0; // Reset counter; lockout timer takes over
      return true;
    }
    return false;
  },

  /** Records a successful login. Resets state. */
  recordSuccess() {
    this.attempts = 0;
    this.lockedUntil = 0;
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// ⏱️  SESSION INACTIVITY TIMEOUT
//
// WORKFLOW: After CONFIG.SESSION_TIMEOUT_MS of no user interaction,
// the session is automatically cleared and the user is returned to the
// login screen. This prevents unauthorized access to an unattended clinic
// computer. The timer resets on any mouse move, click, or keypress.
//
// DATA FLOW: Only clears React auth state. localStorage PHI is NOT cleared
// on timeout (would require page reload to re-login, losing unsaved state).
// For full PHI clearance, see QUALITY_REPORT.md recommendation #3.
// ══════════════════════════════════════════════════════════════════════════════
let _sessionTimeoutHandle = null;
let _onSessionExpire = null;

// Gemini client-side rate limiter
// Free tier: 15 req/min = 1 every 4s. We enforce 6s to leave headroom
// for any background calls (test button, retries, etc.)
let _geminiLastCallAt = 0;
const GEMINI_MIN_INTERVAL_MS = 6000;
async function geminiRateWait(onProgress) {
  const wait = GEMINI_MIN_INTERVAL_MS - (Date.now() - _geminiLastCallAt);
  if (wait > 200) {
    onProgress && onProgress('Pacing requests... (' + Math.ceil(wait/1000) + 's)', 20);
    await new Promise(r => setTimeout(r, wait));
  }
  _geminiLastCallAt = Date.now();
}

/**
 * Starts (or resets) the session inactivity timer.
 * Call this after successful login and pass the logout callback.
 *
 * @param {Function} onExpire - Callback to invoke when session expires.
 */
function startSessionTimer(onExpire) {
  _onSessionExpire = onExpire;
  resetSessionTimer();

  // Listen for user activity
  ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll'].forEach(event => {
    document.addEventListener(event, resetSessionTimer, { passive: true });
  });
}

/** Resets the inactivity countdown. Called on any user activity. */
function resetSessionTimer() {
  if (_sessionTimeoutHandle) clearTimeout(_sessionTimeoutHandle);
  _sessionTimeoutHandle = setTimeout(() => {
    if (_onSessionExpire) _onSessionExpire();
  }, CONFIG.SESSION_TIMEOUT_MS);
}

/** Stops the session timer. Call on explicit logout. */
function stopSessionTimer() {
  if (_sessionTimeoutHandle) clearTimeout(_sessionTimeoutHandle);
  _sessionTimeoutHandle = null;
  _onSessionExpire = null;
  ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll'].forEach(event => {
    document.removeEventListener(event, resetSessionTimer);
  });
}

// ── Backward compatibility alias: CLINIC_INFO → CONFIG.CLINIC ─────────────
// All original code that references CLINIC_INFO continues to work unchanged.
// The value is now configurable via the CONFIG object at the top of this file.
const CLINIC_INFO = CONFIG.CLINIC;

// ══════════════════════════════════════════════════════════════════════════════
// 📄  PAGINATION HOOK  (Finding #16)
//
// Simple prev/next pagination with CONFIG.PAGE_SIZE rows per page.
// Returns { page, setPage, pageItems, totalPages, PagerUI }
// ══════════════════════════════════════════════════════════════════════════════
function usePagination(items, pageSize) {
  pageSize = pageSize || CONFIG.PAGE_SIZE;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil((items ? items.length : 0) / pageSize));
  // Clamp page if items shrink (e.g., after a search)
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const pageItems = (items || []).slice(start, start + pageSize);

  function PagerUI() {
    if (totalPages <= 1) return null;
    return h('div', {
      style: { display:'flex', alignItems:'center', gap:8, padding:'10px 0 2px', justifyContent:'flex-end' }
    },
      h('button', {
        className: 'btn bgh bsm',
        disabled: safePage <= 1,
        onClick: () => setPage(p => Math.max(1, p - 1))
      }, '← Prev'),
      h('span', { style: { fontSize:12, color:'var(--md)' } },
        'Page ' + safePage + ' of ' + totalPages + ' (' + (items ? items.length : 0) + ' total)'
      ),
      h('button', {
        className: 'btn bgh bsm',
        disabled: safePage >= totalPages,
        onClick: () => setPage(p => Math.min(totalPages, p + 1))
      }, 'Next →')
    );
  }

  // Reset to page 1 when items array reference changes (e.g., after search filter)
  useEffect(() => { setPage(1); }, [items ? items.length : 0]);

  return { page: safePage, setPage, pageItems, totalPages, PagerUI };
}


// ── Early utilities — must be defined before data.js runs ─────────────────
// Returns LOCAL date as 'YYYY-MM-DD' (avoids UTC timezone shift issues)
function localToday() {
  const d = new Date();
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

function toLocalDateStr(d) {
  if (!d) return '';
  if (typeof d === 'string') return d.substring(0, 10);
  if (!(d instanceof Date)) d = new Date(d);
  if (isNaN(d.getTime())) return '';
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

function dateOffsetStr(n) {
  const d = new Date();
  d.getDate() + n;
  return toLocalDateStr(d);
}

// Defensive string/array coercion — needed before core.js loads
const S = (v) => (v === null || v === undefined) ? '' : String(v);
const safe = (arr) => Array.isArray(arr) ? arr : [];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const p$ = (n) => Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
