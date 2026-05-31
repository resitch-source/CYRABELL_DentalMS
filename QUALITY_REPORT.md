# Cyrabell Dental Management System — Code Quality Audit Report

**File:** `cyrabelldental_24.html`  
**File size:** 1.56 MB (~12,195 lines)  
**Audit date:** 2026-05-31  
**Auditor:** Claude Code (Sonnet 4.6)

---

## Executive Summary

The application is a self-contained, single-HTML-file dental practice management system built with vanilla React (loaded via CDN script tag), embedded SheetJS (XLSX), and embedded CSS. All data is persisted to `localStorage` with optional two-way sync to a Google Apps Script backend. The system includes a login screen, admin panel with ~10 modules, a patient kiosk check-in mode, and a public appointment booking flow.

The code demonstrates solid product thinking and real clinical utility. However, several critical security vulnerabilities exist that must be addressed before this system handles real patient records, especially given it stores PHI (Protected Health Information).

---

## 1. Security Vulnerabilities

### 1.1 CRITICAL — Hardcoded Credentials in Plain Text

**Lines 3243–3245 of original file:**
```javascript
const ADMIN_USERS = [
  {username:'admin',password:'cyrabell2026',role:'Administrator',name:'Admin'},
  {username:'reception',password:'reception123',role:'Receptionist',name:'Reception Staff'},
];
const KIOSK_EXIT_PIN = '2580';
```

**Risk:** Anyone who can view the HTML source (View Source, DevTools, or file access) obtains the admin password and kiosk PIN immediately. Since the file is served directly from disk (or a basic web server), this is trivial.

**Additional problem:** The credentials are displayed on-screen as demo hints on the login form, training staff to never change credentials and making social-engineering trivial.

**Remediation:**
- Move credentials to a CONFIG object with a clear "CHANGE BEFORE PRODUCTION" warning.
- Add account lockout after 5 failed attempts with a cooldown timer.
- Hash passwords with at minimum SHA-256 (preferably bcrypt via WebCrypto) even for client-side storage.
- Remove the on-screen credential hints entirely in production builds.
- Never commit real credentials to source control.

---

### 1.2 CRITICAL — XSS via `dangerouslySetInnerHTML` with Unsanitized User Input

**`buildMedCertHTML` and `buildRxHTML` functions** interpolate user-supplied values directly into HTML template strings with NO escaping:
```javascript
return `...
  <strong>${patName || '________________________________'}</strong>
  <strong>${patAddress || '____________________________'}</strong>
  <div class="cert-procedure-line">${l||'&nbsp;'}</div>
  ...`
```

Any patient whose name or address contains `<script>alert(1)</script>` or an `<img onerror=...>` payload will execute arbitrary JavaScript when the certificate preview renders. The `procedure` field (a free-text textarea) is split by newline and each line inserted as raw HTML — this is a direct stored XSS vector.

**Also:** The `printDoc` function writes unsanitized content to a new window via `document.write`.

**Remediation:**
- Implement an `escapeHTML(str)` function and apply it to every patient-supplied value before interpolation.
- Never concatenate user content into HTML strings. Use DOM methods or a sanitization library.

---

### 1.3 HIGH — All PHI Stored Unencrypted in `localStorage`

All patient data (names, DOBs, phone numbers, addresses, allergies, medical histories, dental chart conditions, X-ray attachments as base64, payment records) is stored in plain JSON in browser localStorage.

`localStorage` is:
- Accessible to any JavaScript on the same origin (XSS pivot)
- Not encrypted at rest (readable by OS-level access)
- Persisted indefinitely with no expiry mechanism
- Subject to browser data export/sync tools

**For a dental practice handling PHI under HIPAA/local equivalents, this is a compliance violation.**

**Remediation:**
- Encrypt sensitive fields using Web Crypto API (AES-256-GCM) with a key derived from the user's password.
- Add a session timeout that clears sensitive state from memory after inactivity.

---

### 1.4 HIGH — No Session Expiry / Authentication Persistence Gap

Authentication state is held only in React `useState`. There is no session timeout — the admin stays "logged in" indefinitely while the tab is open. All PHI remains accessible in localStorage even when the user is logged out.

---

### 1.5 HIGH — No Brute-Force Protection on Login

The `LoginScreen` component tracks `attempts` in local state but takes NO action on repeated failures. There is no lockout, no rate limiting, no CAPTCHA, no escalating delays.

---

### 1.6 MEDIUM — Kiosk PIN Authentication is Trivially Bypassed

The kiosk exit PIN `'2580'` is stored as a JavaScript constant and displayed in the UI as a demo hint. An attacker viewing page source obtains it instantly.

---

### 1.7 MEDIUM — No Content Security Policy (CSP)

The `<head>` section has no `<meta http-equiv="Content-Security-Policy" ...>` tag. Combined with the XSS vulnerabilities above, there is no second line of defense against script injection.

---

### 1.8 MEDIUM — `window.open` + `document.write` Used for Print Documents

Print document generation opens blank windows and calls `document.write` with HTML templates containing unsanitized user content. This is an XSS vector and breaks in browsers with strict popup policies.

---

### 1.9 LOW — Google Apps Script URL Stored in Plain localStorage

The Google Apps Script web app URL (effectively an authentication credential for the backend) is stored in plain localStorage. Any XSS could exfiltrate it.

---

## 2. Code Structure and Architecture Issues

### 2.1 Single-File God Object

The entire application — ~12,195 lines including embedded React, SheetJS (~700KB), 2,500+ lines of CSS, and all business logic — lives in one HTML file.

**Problems:**
- Impossible to diff meaningfully in version control.
- No code splitting; the entire 1.56MB must parse and execute on every page load.
- Embedded libraries cannot be browser-cached independently.
- No module system; all functions share a single global scope.
- CSS conflicts: `.photo-widget-body`, `.photo-chooser-ov`, `.fdi-view-toggle`, and others are defined multiple times with differing rules.

### 2.2 All Configuration Hardcoded in Application Code

Business configuration is scattered throughout the file:
- `CLINIC_INFO` (name, address, phone, doctor name, license) — in one block
- `ADMIN_USERS` (credentials) — separate block
- `KIOSK_EXIT_PIN` — inline constant
- `TIMES` array (clinic hours) — inline
- `DENTISTS` array — inline (single dentist)
- `DEFAULT_SLOT_MIN = 45` — inline
- Service catalog (`SVCS`) — embedded constant array

Changes to clinic info, hours, or personnel require finding the right line in a 12,000-line file.

### 2.3 Prop Drilling Across Many Levels

`AdminPanel` passes 14 props directly to child components. The `syncUrl` value is retrieved from localStorage in 7+ different places across the codebase instead of being passed through context or a central store.

### 2.4 localStorage Keys as Magic Strings

Keys like `'cyrabell_v2_patients'`, `'cyrabell_sync_url'`, `'cyrabell_reminder_auto'` appear many times each. A typo in any one instance silently breaks persistence with no error.

### 2.5 Dashboard Greeting Hardcoded

```javascript
h('div', {className:'ptl'}, 'Good morning, Admin 👋')
```
Never changes to "afternoon" or "evening" and always says "Admin" regardless of the logged-in user's name.

---

## 3. Performance Issues

### 3.1 No Code Splitting — 1.56MB Parses on Every Load

The HTML file embeds React + ReactDOM (~140KB minified), SheetJS/XLSX (~700KB minified, loaded even for rarely-used export), ~80KB of CSS, and all application JS (~200KB). Parse + compile time on mid-range mobile devices is 1–3 seconds.

### 3.2 Base64 Images Stored in localStorage

Patient photos and X-ray attachments stored as base64 data URLs easily exceed the 5–10MB localStorage quota, triggering silent image stripping.

### 3.3 Auto-Sync Prep Runs Synchronously on Every Keystroke

The auto-sync `useEffect` fires on every change to any state array — including real-time text input in forms. Payload preparation (deep-copying and stripping arrays) runs synchronously, blocking the main thread.

### 3.4 No Memoization on Expensive Computations

Analytics, conflict analysis, and AI slot suggestions run without `useMemo`. With hundreds of appointments/patients, these are O(n²) operations blocking the main thread on every render.

### 3.5 No Pagination

Patients, appointments, payments, and notifications tables render ALL records simultaneously. At 500+ patients, DOM rendering becomes slow and unusable on mobile.

---

## 4. Maintainability / Configurability / Scalability Concerns

### 4.1 localStorage as Database Does Not Scale

localStorage is synchronous, size-limited (5–10MB), single-origin, and single-device. For a dental practice, a year of patient records with photos easily exceeds 10MB. There is no conflict resolution for multi-device sync or data versioning/migration path.

### 4.2 Service Catalog and Dentist List Cannot Be Edited at Runtime

Adding a new service or dentist requires editing the source file. These should be data in the store.

### 4.3 No Role-Based Access Control Enforcement

The `reception` role exists in the data but is never checked. Receptionists have identical access to administrators — they can delete patients, view all financials, export all data, and change sync settings.

### 4.4 Duplicate CSS Rules

Multiple identical class names defined with differing styles throughout the 2,500-line CSS block. The "last definition wins" behavior makes the actual applied style unpredictable during maintenance.

---

## 5. Accessibility Issues

### 5.1 Dental Chart Has No Keyboard Navigation

Tooth chart cells have no `tabIndex`, no `role="button"`, no `aria-label`, and no keyboard event handlers. Keyboard and screen-reader users cannot interact with the dental chart.

### 5.2 Modal Does Not Trap Focus

The `Modal` component does not trap focus inside the overlay. Users can Tab out of open modals into background content.

### 5.3 Toast Notifications Not Announced to Screen Readers

Toast messages have no `role="alert"` or `aria-live="polite"` attribute.

### 5.4 Color-Only Status Indicators

Appointment status communicates using only color (green dot = confirmed, red dot = cancelled). No text alternative for colorblind users.

### 5.5 Missing `lang` Attribute on Print Documents

`buildMedCertHTML` and `buildRxHTML` produce `<html>` documents without a `lang` attribute.

---

## 6. Missing Error Handling

### 6.1 Photo/Camera Errors Silently Fail

Live camera capture errors are caught and logged internally; the user sees a frozen camera view with no actionable error message.

### 6.2 Google Apps Script Sync Errors Surface Inconsistently

Some sync paths call `addToast` on error (visible to user). Others only call `addLog` (internal). Sync failures may be invisible to the user.

### 6.3 Date Parsing Silently Discards Invalid Dates

`sanitizeDate` silently returns empty string for dates it cannot parse, potentially losing clinical data without warning.

### 6.4 No Handling of localStorage Quota in Private Browsing

Firefox and Safari in private mode set localStorage quota to 0. The app silently ignores quota errors, causing all data to be lost on page refresh without warning.

---

## 7. Data Flow Analysis

### 7.1 Data Sources and Sinks

```
INIT_P / INIT_A / INIT_PAY         → seeded into localStorage on first run
localStorage (cyrabell_v2_*)       → read at app initialization into React state
Google Apps Script (pull on boot)  → overwrites localStorage and React state

React State (in-memory)
  ├─ patients[]
  ├─ appointments[]
  ├─ payments[]
  ├─ notifications[]
  ├─ reminders[]
  └─ reminderLog[]
        │
        ├─→ [every state change] → auto-sync debounced 2s → Google Sheets
        ├─→ [every state change] → localStorage debounced 1s (strips large images)
        └─→ [render] → React DOM → User Interface
```

### 7.2 Data Mutation Patterns

- All state is managed at the root `App` component via setter functions passed as props.
- Child components call `setPatients(prev => [...prev, newPat])` style mutations.
- No immutable update library. No optimistic update rollback if sync fails.

### 7.3 Patient Photo Data URL Flow

```
User selects file or takes photo
  → FileReader.readAsDataURL() → base64 string
  → stored in patient.photoDataUrl (React state)
  → localStorage (stripped if > 100KB)
  → Google Sheets sync (stripped if > 30KB — user NOT notified)
  → Google Drive upload (via Apps Script, if configured)
```

### 7.4 Appointment Lifecycle

```
Public Booking Form → pending status → localStorage/Sheets
Admin creates/edits → saved with full details
Kiosk check-in → appt.arrived = true → status unchanged
Admin confirms → status = 'confirmed'
Admin marks complete → status = 'completed'
Admin records payment → new payment record linked by patientId
```

---

## 8. Program/Workflow Analysis

### 8.1 Application Boot Sequence

1. HTML parses → React/SheetJS evaluate (synchronous, ~1.5MB)
2. Global error handler and in-memory logger installed
3. `App` renders; localStorage data loaded into React state via lazy initializers
4. If sync URL configured: async fetch to Apps Script `?action=pull`
5. On pull success: state updated with Sheets data
6. On pull failure: user must choose "Use local data"
7. If no sync URL: app proceeds with localStorage data

### 8.2 Login Flow

1. `view === 'login'` → `LoginScreen` renders with three paths
2. Admin Login: username/password compared against `ADMIN_USERS` array in memory
3. On match: `setUser(user)` → `view = 'admin'` → `AdminPanel` renders
4. No token, no session cookie — auth is entirely in React memory

### 8.3 Patient Management

- CRUD on `patients[]` array in React state
- Dental chart: `patient.teeth` object mapping FDI tooth numbers to condition strings
- No change history for dental chart edits
- AI analysis is rule-based (no LLM), reads tooth conditions and generates summaries
- OCR scanner uses actual Claude API call via Apps Script proxy

### 8.4 Appointment Management

- Calendar view (monthly grid) and table view (sortable columns)
- Availability checker prevents double-booking by comparing time overlaps
- Auto-confirm setting: new bookings automatically confirmed
- Conflict analysis: O(n²) scan of all appointments for same-day overlaps

### 8.5 Payment / Billing

- Simple payment records linked by `patientId`
- No invoice system, no line items per appointment
- Patient `balance` field is manually maintained, not computed from payments

### 8.6 Google Sheets Sync

- Apps Script web app acts as REST-ish API (ping/pull/push actions)
- Auto-sync runs 2 seconds after any state change
- Push serializes all 6 data arrays; photos stripped at 30KB threshold

### 8.7 Kiosk Check-In Mode

- Today's confirmed/pending appointments shown
- Patient taps their name → `appointment.arrived = true`
- Auto-returns to list after 6 seconds
- Admin exits via hardcoded 4-digit PIN

### 8.8 Medical Document Generation

- Medical Certificate and Prescription generate HTML for print
- BOTH use unsanitized string interpolation (XSS vulnerability)
- No server-side PDF generation

---

## 9. Summary of Findings by Priority

| # | Severity | Finding |
|---|----------|---------|
| 1 | CRITICAL | Hardcoded admin credentials displayed in source and on-screen |
| 2 | CRITICAL | XSS in `buildMedCertHTML` / `buildRxHTML` / `printDoc` via unsanitized user data |
| 3 | HIGH | PHI stored unencrypted in localStorage |
| 4 | HIGH | No session timeout or expiry |
| 5 | HIGH | No brute-force protection on login |
| 6 | MEDIUM | Kiosk PIN in source code and displayed on screen |
| 7 | MEDIUM | No Content Security Policy |
| 8 | MEDIUM | No role-based access control enforcement |
| 9 | MEDIUM | Duplicate CSS definitions causing unpredictable styling |
| 10 | MEDIUM | No input validation beyond availability checking |
| 11 | LOW | No keyboard navigation on dental chart |
| 12 | LOW | Modals do not trap focus |
| 13 | LOW | Toast notifications not screen-reader-announced |
| 14 | LOW | Color-only status indicators |
| 15 | PERF | 1.56MB single-file, no code splitting, no caching |
| 16 | PERF | No pagination; large datasets block rendering |
| 17 | PERF | Auto-sync prep runs synchronously on every keystroke |
| 18 | MAINT | All configuration scattered, no CONFIG object |
| 19 | MAINT | localStorage keys as magic strings repeated many times |
| 20 | MAINT | Service catalog, dentist list hardcoded in source |
| 21 | SCALE | localStorage not suitable for production PHI volume |
| 22 | SCALE | No data migration/versioning system |

---

## 10. Improvements Implemented in `cyrabelldental_v2.html`

1. Added a central `CONFIG` object at the top of the JS containing all configurable values.
2. Implemented `escapeHTML()` and applied it in `buildMedCertHTML`, `buildRxHTML`, and `printDoc`.
3. Added login lockout (5 attempts → 30-second cooldown) and removed on-screen credential hints.
4. Extracted all localStorage keys to a named `LS_KEYS` constants object.
5. Added `role="alert"` and `aria-live="polite"` to toast container.
6. Added `tabIndex`, `role="button"`, and `aria-label` to tooth chart cells.
7. Added focus trap to `Modal` component.
8. Added session inactivity timeout (15 minutes, configurable via `CONFIG`).
9. Added `lang="en"` to print document templates.
10. Added JSDoc comments to all major functions and components.
11. Added workflow and data-flow block comments at the top of each major section.
12. Added `const LS_KEYS` object centralizing all localStorage key strings.
13. Added prominent `PRODUCTION_NOTICE` comment blocks on credentials and sensitive config.
14. Added time-of-day greeting on Dashboard (Good morning/afternoon/evening).
15. Added `aria-label` to status badges.
16. Added `lang` to print document HTML output.
17. Fixed `printDoc` to escape content before `document.write`.
18. Added `useMemo` to expensive filter/sort operations in `Analytics` and conflict analysis.
19. Added `try/catch` with user-visible error to camera failures.
