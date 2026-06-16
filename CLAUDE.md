# CYRABELL DentalMS — Developer Reference

## Project Overview

CYRABELL DentalMS is a **vanilla-React single-file PWA** for dental clinic management. No build step, no bundler, no transpiler. The entire application is written in plain JavaScript using the `h()` API (Preact's `createElement`). It runs directly in the browser by loading the Preact UMD bundle from a `<script>` tag, which exposes all hooks as globals.

### Technology Stack

| Layer | Choice |
|---|---|
| UI Framework | Preact 10 (UMD bundle, loaded inline) |
| Rendering | `h()` — no JSX, no Babel |
| Styling | Inline `<style>` block + CSS custom properties |
| Persistence | `localStorage` (primary) + IndexedDB (attachments) |
| Sync | Google Apps Script web-app proxy OR local Node/Express server |
| 3D Chart | Three.js r160 via `assets/lib/tooth-viewer.js` |
| OCR/AI | Gemini API (direct) |
| Notifications | Email / SMS via Apps Script backend |

---

## CRITICAL RULE — NEVER TOUCH index.html

> **`index.html` is PRODUCTION.** It is served to live clinic users.  
> **ALL development work happens in `cyrabelldental_v2.html`.**  
> Never edit, overwrite, diff-apply, or otherwise modify `index.html`.

---

## Git Workflow

```bash
# All work should be pushed to:
git push origin work-branch:claude/busy-cerf-Cjv2W
```

Work on `work-branch` locally; the remote ref is `claude/busy-cerf-Cjv2W`.

---

## File Structure

```
CYRABELL_DentalMS/
├── cyrabelldental_v2.html        ← THE DEVELOPMENT FILE (single-file app)
├── index.html                    ← PRODUCTION — DO NOT TOUCH
├── backup-tool.html              ← Standalone backup utility
├── cyrabell-presentation.html    ← Sales/demo deck
├── install.html                  ← Installation guide
├── keygen.html                   ← License key generator
├── DEPLOYMENT_MANUAL.html        ← Deployment documentation
├── MANUAL.html                   ← End-user manual
├── APPS_SCRIPT_GEMINI_OCR.js     ← Google Apps Script backend (GAS)
├── APPS_SCRIPT_DRIVE_UPLOAD.js   ← GAS helper for Drive uploads
│
├── assets/
│   ├── lib/
│   │   ├── three.module.min.js   ← Three.js r160
│   │   ├── GLTFLoader.js         ← Three.js GLTF loader
│   │   ├── BufferGeometryUtils.js
│   │   └── tooth-viewer.js       ← Custom 3D viewer, exposes window.CyrabellMountTooth
│   ├── teeth/
│   │   ├── canine/               ← GLTF model + textures
│   │   ├── incisor_lower/
│   │   ├── incisor_upper/
│   │   ├── molar_1/
│   │   ├── molar_2/
│   │   ├── molar_3/
│   │   ├── premolar_1/
│   │   ├── premolar_1_lower/
│   │   ├── premolar_2/
│   │   └── premolar_2_lower/
│   └── teeth/sprites/            ← PNG sprites: {toothType}_{side|top}.png
│
├── local-server/
│   ├── server.js                 ← Node/Express API mirror of the GAS backend
│   ├── package.json              ← Dependencies: express, cors, multer
│   ├── data/                     ← Runtime JSON data files
│   └── uploads/                  ← Uploaded photos/attachments
│
└── templates/                    ← Component scaffolding templates
    ├── component.js
    ├── page.js
    └── modal.js
```

### Post-Split Target Structure (planned refactor)

When the monolithic HTML is split into modules:

```
app/
├── config.js          ← Constants: LS_KEYS, PLAN_FEATURES, CSS var names
├── data.js            ← SVCS array, CONDITIONS object, ALL_FDI array
├── utils.js           ← idbOpen(), planHas(), canDo(), formatPHP(), etc.
├── voice.js           ← Web Speech API engine + parseDentalCommand()
├── app.js             ← Root App component, router, global state
└── components/
    ├── DentalChart.js
    ├── PatientForm.js
    ├── AppointmentModal.js
    ├── PaymentPanel.js
    └── ... (one file per component)
assets/styles/
└── cyrabell.css       ← Extracted CSS (currently inline in <style>)
```

---

## Coding Conventions

### h() — No JSX

Every element uses Preact's `h()` function, which is available as a global:

```js
// CORRECT
h('div', { className: 'card' },
  h('h2', null, 'Patient List'),
  h(PatientRow, { patient, key: patient.id })
)

// WRONG — JSX not supported, no build step
<div className="card"><h2>Patient List</h2></div>
```

### Globals from Preact Bundle

The Preact UMD bundle exposes these directly on `window` — import nothing:

```js
const { h, Fragment, render,
        useState, useEffect, useRef, useCallback, useMemo, useReducer,
        createContext, useContext } = window.preact ?? window;
```

Use them bare (no import statements):

```js
function MyComponent({ label }) {
  const [open, setOpen] = useState(false);
  return h('button', { onClick: () => setOpen(true) }, label);
}
```

### Component Naming

- **Components:** PascalCase — `PatientCard`, `DentalChart`, `AppointmentModal`
- **Utility functions:** camelCase — `formatPHP()`, `parseDentalCommand()`, `idbOpen()`
- **Constants:** SCREAMING_SNAKE_CASE — `LS_KEYS`, `ALL_FDI`, `CONDITIONS`
- **CSS classes:** kebab-case — `dental-chart`, `tooth-btn`, `modal-overlay`

### Global Registration

Components are NOT imported — they are registered on `window` so script-tag ordering resolves dependencies:

```js
// At the bottom of each component file:
window.MyComponent = MyComponent;
```

---

## Data Layer

### localStorage via LS_KEYS

All primary data is stored as JSON in `localStorage`. Keys are defined in `LS_KEYS`:

```js
const LS_KEYS = {
  PATIENTS:      'cyrabell_patients',
  APPOINTMENTS:  'cyrabell_appointments',
  PAYMENTS:      'cyrabell_payments',
  SERVICES:      'cyrabell_services',
  REMINDERS:     'cyrabell_reminders',
  NOTIFICATIONS: 'cyrabell_notifications',
  SETTINGS:      'cyrabell_settings',
  LOGS:          'cyrabell_server_logs',
  // ...
};

// Read
const patients = JSON.parse(localStorage.getItem(LS_KEYS.PATIENTS) || '[]');

// Write
localStorage.setItem(LS_KEYS.PATIENTS, JSON.stringify(patients));
```

**WARNING:** PHI (Protected Health Information) is stored unencrypted. See security notes below.

### IndexedDB for Attachments

Binary files (X-rays, photos) are stored in IndexedDB via `idbOpen()`:

```js
const db = await idbOpen('CyrabellDB', 1, (db) => {
  db.createObjectStore('attachments', { keyPath: 'id' });
});

// Store a file
const tx = db.transaction('attachments', 'readwrite');
tx.objectStore('attachments').put({ id: attachmentId, data: base64String, type: mimeType });
```

### Google Sheets Sync

Two-way sync is performed through `syncUrl` — a Google Apps Script web-app URL:

```js
const syncUrl = settings.syncUrl; // stored in localStorage

// Push local → Sheets
await fetch(syncUrl, {
  method: 'POST',
  body: JSON.stringify({ action: 'push', table: 'patients', rows: patients })
});

// Pull Sheets → local
const res = await fetch(`${syncUrl}?action=pull&table=patients`);
const { rows } = await res.json();
```

The Apps Script backend (`APPS_SCRIPT_GEMINI_OCR.js`) handles: JSON tables, photo uploads to Drive, Gemini OCR, email/SMS/WhatsApp notifications.

For local development, `local-server/server.js` mirrors the same HTTP API on `localhost:3000`.

---

## Dental Domain — FDI Notation

### FDI Tooth Numbering

Teeth use the **FDI World Dental Federation** two-digit system:

```
Upper Right  | Upper Left
  18-11      |  21-28
─────────────┼─────────────
  48-41      |  31-38
Lower Right  | Lower Left
```

The full set is stored in `ALL_FDI`:

```js
const ALL_FDI = [
  // Upper arch (right to left as viewed in chart)
  18,17,16,15,14,13,12,11,  21,22,23,24,25,26,27,28,
  // Lower arch (right to left as viewed in chart)
  48,47,46,45,44,43,42,41,  31,32,33,34,35,36,37,38
];

const UPPER_FDI = ALL_FDI.filter(n => n >= 11 && n <= 28);
const LOWER_FDI = ALL_FDI.filter(n => n >= 31 && n <= 48);
```

**Gotcha — arch direction:** Upper arch displays **18→11 then 21→28** (right-to-left patient view). Lower arch mirrors the same. Do not render them in simple ascending numeric order or the chart will be mirrored.

### Tooth Type by FDI Number

```js
function toothType(fdi) {
  const n = fdi % 10; // last digit = tooth number within quadrant
  if (n === 8)                     return 'molar_3';    // wisdom
  if (n === 7)                     return 'molar_2';
  if (n === 6)                     return 'molar_1';
  if (n === 5)                     return 'premolar_2';
  if (n === 4)                     return 'premolar_1';
  if (n === 3)                     return 'canine';
  if (n === 2)                     return 'incisor_lateral';
  if (n === 1)                     return 'incisor_central';
}

// Lower premolars use separate models:
const lowerPremolarTypes = { 44:'premolar_1_lower', 45:'premolar_2_lower',
                              34:'premolar_1_lower', 35:'premolar_2_lower' };
```

### Surfaces

Each tooth has five charting surfaces:

| Surface | Abbreviation | Description |
|---|---|---|
| Mesial | M | Surface facing midline |
| Distal | D | Surface facing away from midline |
| Buccal | B | Cheek-facing surface |
| Lingual | L | Tongue-facing surface |
| Occlusal | O | Biting surface |

**Gotcha — shared geometry:** Mesial of tooth N and Distal of tooth N+1 share the same physical space. When charting, only mark one side to avoid double-counting.

---

## CONDITIONS Object — FDI Color Standard

Conditions follow the international FDI color coding standard:

```js
const CONDITIONS = {
  // RED group — Pathology / Disease
  caries:         { label: 'Caries',          color: '#e53935', group: 'pathology' },
  abscess:        { label: 'Abscess',          color: '#b71c1c', group: 'pathology' },
  fracture:       { label: 'Fracture',         color: '#e53935', group: 'pathology' },
  mobility:       { label: 'Mobility',         color: '#ef5350', group: 'pathology' },
  pericoronitis:  { label: 'Pericoronitis',    color: '#c62828', group: 'pathology' },

  // BLUE group — Restorations / Prosthetics
  amalgam:        { label: 'Amalgam',          color: '#1565c0', group: 'restoration' },
  composite:      { label: 'Composite',        color: '#1976d2', group: 'restoration' },
  crown:          { label: 'Crown',            color: '#0d47a1', group: 'restoration' },
  bridge:         { label: 'Bridge',           color: '#1565c0', group: 'restoration' },
  implant:        { label: 'Implant',          color: '#0277bd', group: 'restoration' },
  veneer:         { label: 'Veneer',           color: '#1e88e5', group: 'restoration' },
  rct:            { label: 'Root Canal',       color: '#283593', group: 'restoration' },

  // GREEN group — Preventive / Healthy
  sealant:        { label: 'Sealant',          color: '#2e7d32', group: 'preventive' },
  fluoride:       { label: 'Fluoride',         color: '#388e3c', group: 'preventive' },
  healthy:        { label: 'Healthy',          color: '#43a047', group: 'preventive' },
  unerupted:      { label: 'Unerupted',        color: '#66bb6a', group: 'preventive' },
  extracted:      { label: 'Extracted',        color: '#757575', group: 'other' },  // grey X
  missing:        { label: 'Missing',          color: '#9e9e9e', group: 'other' },
};
```

**Color rule:** RED = active disease/pathology · BLUE = existing restorations · GREEN = preventive/healthy · GREY = absent

---

## SVCS Array — Dental Services

The `SVCS` array holds all 60+ services available for treatment planning and invoicing:

```js
const SVCS = [
  // --- PREVENTIVE ---
  { id: 'oral-prophy',    cat: 'Preventive', label: 'Oral Prophylaxis',       fee: 800,  dur: 45 },
  { id: 'fluoride-tx',   cat: 'Preventive', label: 'Fluoride Treatment',     fee: 500,  dur: 20 },
  { id: 'pit-fissure',   cat: 'Preventive', label: 'Pit & Fissure Sealant',  fee: 600,  dur: 30 },

  // --- RESTORATIVE ---
  { id: 'comp-ant',      cat: 'Restorative', label: 'Composite (Anterior)',   fee: 1500, dur: 60 },
  { id: 'comp-post',     cat: 'Restorative', label: 'Composite (Posterior)',  fee: 1800, dur: 60 },
  { id: 'amalgam',       cat: 'Restorative', label: 'Amalgam Restoration',   fee: 1200, dur: 45 },
  { id: 'glass-ion',     cat: 'Restorative', label: 'Glass Ionomer',         fee: 1000, dur: 45 },

  // --- ENDODONTICS ---
  { id: 'rct-ant',       cat: 'Endodontics', label: 'RCT Anterior',          fee: 5000, dur: 90 },
  { id: 'rct-pre',       cat: 'Endodontics', label: 'RCT Premolar',          fee: 6000, dur: 90 },
  { id: 'rct-mol',       cat: 'Endodontics', label: 'RCT Molar',             fee: 7500, dur: 120 },

  // --- ORAL SURGERY ---
  { id: 'simple-ext',    cat: 'Surgery',     label: 'Simple Extraction',     fee: 800,  dur: 30 },
  { id: 'surgical-ext',  cat: 'Surgery',     label: 'Surgical Extraction',   fee: 2500, dur: 60 },
  { id: 'impacted',      cat: 'Surgery',     label: 'Impacted Extraction',   fee: 5000, dur: 90 },

  // --- PROSTHODONTICS ---
  { id: 'pfm-crown',     cat: 'Prostho',     label: 'PFM Crown',             fee: 8000, dur: 60 },
  { id: 'zirconia',      cat: 'Prostho',     label: 'Zirconia Crown',        fee: 15000,dur: 60 },
  { id: 'acrylic-rp',    cat: 'Prostho',     label: 'Acrylic Removable',     fee: 12000,dur: 60 },
  { id: 'implant-crown', cat: 'Prostho',     label: 'Implant + Crown',       fee: 45000,dur: 60 },

  // --- ORTHODONTICS ---
  { id: 'metal-braces',  cat: 'Ortho',       label: 'Metal Braces',          fee: 35000,dur: 60 },
  { id: 'ceramic-braces',cat: 'Ortho',       label: 'Ceramic Braces',        fee: 45000,dur: 60 },
  { id: 'clear-aligner', cat: 'Ortho',       label: 'Clear Aligners',        fee: 60000,dur: 60 },

  // --- COSMETIC ---
  { id: 'whitening',     cat: 'Cosmetic',    label: 'Teeth Whitening',       fee: 5000, dur: 60 },
  { id: 'veneer',        cat: 'Cosmetic',    label: 'Porcelain Veneer',      fee: 10000,dur: 60 },

  // ... (60+ total)
];
```

Fees are in **Philippine Peso (PHP)**. Duration is in minutes.

---

## CSS Design System

All colors and spacing are defined as CSS custom properties in `:root`:

```css
:root {
  --t:   #0a7c6e;  /* Teal — primary brand color */
  --go:  #f59e0b;  /* Gold — accent, highlights */
  --dk:  #1e293b;  /* Dark — backgrounds, headers */
  --md:  #334155;  /* Medium — secondary backgrounds */
  --lt:  #f1f5f9;  /* Light — card backgrounds, inputs */
  --re:  #ef4444;  /* Red — errors, pathology */
  --gr:  #22c55e;  /* Green — success, preventive */
  --bl:  #3b82f6;  /* Blue — info, restorations */
  --radius: 10px;
  --shadow: 0 2px 12px rgba(0,0,0,.18);
}
```

**Usage in JS:**

```js
h('button', { style: { background: 'var(--t)', color: '#fff' } }, 'Save')
```

**Usage in CSS strings:**

```css
.card { background: var(--lt); border-radius: var(--radius); }
.badge-red { background: var(--re); }
```

---

## Plan Gating & Permissions

Features are gated by clinic subscription plan and user role:

```js
// Check if the current clinic plan includes a feature
function planHas(feature) {
  const settings = JSON.parse(localStorage.getItem(LS_KEYS.SETTINGS) || '{}');
  const plan = settings.plan || 'basic';  // 'basic' | 'pro' | 'enterprise'
  return PLAN_FEATURES[plan]?.includes(feature) ?? false;
}

// Check if the current user has a permission
function canDo(user, permission) {
  const ROLE_PERMS = {
    admin:     ['all'],
    dentist:   ['chart', 'treatment', 'rx', 'medcert'],
    reception: ['appointments', 'payments', 'notifications'],
    kiosk:     ['booking'],
  };
  const perms = ROLE_PERMS[user?.role] || [];
  return perms.includes('all') || perms.includes(permission);
}
```

Gate UI elements:

```js
planHas('sms-reminders') && h(ReminderPanel, null)
canDo(currentUser, 'rx') && h('button', { onClick: openRx }, 'Write Rx')
```

---

## Voice Engine

The voice engine uses the **Web Speech API** (`SpeechRecognition`) and lives in `app/voice.js`:

```js
// Start listening
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.lang = 'en-PH';  // Philippine English
recognition.continuous = false;
recognition.start();

recognition.onresult = (e) => {
  const transcript = e.results[0][0].transcript;
  const command = parseDentalCommand(transcript);
  applyDentalCommand(command);
};
```

### parseDentalCommand()

Parses spoken commands into structured objects:

```js
// "mark tooth 36 caries on mesial"
parseDentalCommand(transcript)
// → { action: 'mark', fdi: 36, condition: 'caries', surface: 'mesial' }

// "extract tooth 48"
// → { action: 'extract', fdi: 48 }

// "schedule patient juan dela cruz next monday 2pm"
// → { action: 'schedule', patientName: 'juan dela cruz', date: '...', time: '14:00' }
```

Commands are stored in `localStorage` for learning — frequently used commands are suggested first.

---

## 3D Tooth Viewer

Three.js r160 renders interactive 3D tooth models via `window.CyrabellMountTooth`:

```js
// Mount a 3D viewer into a DOM container
window.CyrabellMountTooth(containerEl, {
  toothType: 'molar_1',     // matches assets/teeth/{toothType}/scene.gltf
  fdi: 36,
  conditions: ['caries'],   // array of condition keys — drives material color
  onSurfaceClick: (surface) => {
    console.log('Clicked surface:', surface); // 'mesial'|'distal'|'buccal'|'lingual'|'occlusal'
  }
});
```

2D sprite fallback (when WebGL unavailable):

```js
// assets/teeth/sprites/{toothType}_{side}.png
// assets/teeth/sprites/{toothType}_{top}.png
h('img', { src: `assets/teeth/sprites/molar_1_top.png`, alt: 'Tooth 36' })
```

---

## Charts & Visualizations

**No external charting libraries.** All charts are pure SVG rendered with `h('svg', ...)`:

```js
// Line chart
h(SVGLineChart, { data: revenueByMonth, color: 'var(--t)', label: 'Revenue' })

// Donut chart
h(DonutChart, { segments: [
  { label: 'Paid', value: 85, color: 'var(--gr)' },
  { label: 'Pending', value: 15, color: 'var(--go)' },
]})

// Sparkline (inline mini-chart)
h(Sparkline, { data: [800, 1200, 950, 1400], color: 'var(--bl)' })
```

---

## Auth & Views

The app renders one of four top-level views based on `currentView` state:

| View | Path | Access |
|---|---|---|
| `login` | `/` (default) | Public |
| `kiosk` | `#kiosk` | PIN-protected |
| `booking` | `#booking` | Public (patients) |
| `admin` | `#admin` | Role-based (admin/dentist/reception) |

---

## How To: Add a New Page/Section

1. **Create the page component** (follow `templates/page.js`):

```js
function MyNewPage({ currentUser }) {
  const [data, setData] = useState([]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem(LS_KEYS.MY_KEY) || '[]');
    setData(stored);
  }, []);

  return h('div', { className: 'page-panel' },
    h('h2', { className: 'page-title' }, 'My New Page'),
    // ... content
  );
}
window.MyNewPage = MyNewPage;
```

2. **Add a nav entry** in the sidebar nav array (search for `navItems` or `sidebarLinks`):

```js
{ id: 'my-new-page', label: 'My New Page', icon: '🦷', roles: ['admin', 'dentist'] }
```

3. **Wire it in the router** (search for `currentPage === 'patients'` pattern):

```js
currentPage === 'my-new-page' && h(MyNewPage, { currentUser })
```

4. **Add LS_KEYS entry** if the page needs its own data store:

```js
MY_KEY: 'cyrabell_my_new_data',
```

---

## How To: Add a New Dental Service

In the `SVCS` array, add an entry with a **unique `id`** (kebab-case), matching **`cat`** (use an existing category or add new), a **`label`** (display name), **`fee`** in PHP, and **`dur`** in minutes:

```js
{ id: 'laser-whitening', cat: 'Cosmetic', label: 'Laser Whitening', fee: 8000, dur: 75 },
```

That's all — the service will automatically appear in:
- Treatment plan selector
- Invoice line items
- Service price list admin panel
- Analytics by category

---

## How To: Add a New Condition

In the `CONDITIONS` object, add a new key:

```js
// Must follow FDI color standard:
// RED (#e53935 family) = pathology
// BLUE (#1565c0 family) = restoration
// GREEN (#2e7d32 family) = preventive
tooth_wear: { label: 'Tooth Wear', color: '#e57373', group: 'pathology' },
```

The condition will automatically appear in the dental chart condition picker and legend.

---

## Common Gotchas

### 1. Shared Geometry (Mesial/Distal)
When a patient has a crown on tooth 16, do NOT also mark the mesial of 17 as restored — the contact point is shared. Only mark the tooth that was treated.

### 2. localStorage Encryption
PHI is stored plain-text. If adding sensitive fields (SSN, insurance numbers), you MUST encrypt them. A simple XOR cipher or AES-GCM via WebCrypto API should be used. Do not introduce unencrypted PHI fields.

### 3. FDI Arch Direction
Upper arch: display order is `18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28` (NOT sorted ascending). Same rule for lower: `48,47,...41,31,32,...38`. Always use the `ALL_FDI` constant or the ordered sub-arrays.

### 4. h() Attribute Names
Use React/Preact attribute names, not HTML:
- `className` not `class`
- `htmlFor` not `for`
- `onClick` not `onclick`
- `onChange` not `onchange`
- `style` takes an object, not a string: `style={{ color: 'red' }}` → in `h()`: `{ style: { color: 'red' } }`

### 5. Script Tag Load Order
Components that reference other components must be declared after them in the HTML. `App` must be last. If a function is undefined at call time, check script tag order in `cyrabelldental_v2.html`.

### 6. Fees Are PHP
All monetary values in `SVCS` and stored payments are in **Philippine Peso (PHP)**. Use `formatPHP(amount)` for display — never bare numbers.

```js
function formatPHP(n) {
  return '₱' + Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2 });
}
```

### 7. No Async Components
Preact does not support Suspense/lazy in this UMD setup. Load all components synchronously via `<script>` tags. For async data, use `useEffect` + `useState`.

---

## Security Notes (Known Issues)

See `QUALITY_REPORT.md` for full audit. Key issues to be aware of:

1. **Hardcoded credentials** — Default admin/reception passwords are in source. Must be changed on first install.
2. **XSS risk** — `buildMedCertHTML()` and `buildRxHTML()` use template literals with unsanitized user input. Sanitize before inserting into innerHTML.
3. **Unencrypted PHI** — All patient data in localStorage is plain JSON. Do not store especially sensitive data without encryption.

---

## Local Development

```bash
# Start the local API server (mirrors Google Apps Script API)
cd local-server
npm install
npm start
# → API running at http://localhost:3000

# Open the app
# Just open cyrabelldental_v2.html in a browser (no build needed)
# Set syncUrl in Settings → Sync URL → http://localhost:3000
```

---

## Deployment

The production path is:

1. Edit `cyrabelldental_v2.html`
2. Test thoroughly in browser
3. Copy contents into `index.html` (or have the build pipeline do it)
4. Deploy `index.html` + `assets/` to the hosting environment
5. Deploy `APPS_SCRIPT_GEMINI_OCR.js` to Google Apps Script (separate step)

See `DEPLOYMENT_MANUAL.html` for full deployment procedure.
