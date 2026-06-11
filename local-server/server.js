/**
 * Cyrabell Dental MS — Local Server
 *
 * Mirrors the Google Apps Script web-app API so the front-end works identically
 * whether it is pointed at the cloud deployment or this local server.
 *
 * Usage:
 *   npm install
 *   node server.js            (default port 3001)
 *   PORT=8080 node server.js  (custom port)
 *
 * Then in the Cyrabell app → Settings → Sync URL → set to http://localhost:3001
 */

const express  = require('express');
const cors     = require('cors');
const multer   = require('multer');
const fs       = require('fs');
const path     = require('path');
const crypto   = require('crypto');

const PORT       = Number(process.env.PORT) || 3001;
const DATA_DIR   = path.join(__dirname, 'data');
const UPLOAD_DIR = path.join(__dirname, 'uploads');

[DATA_DIR, UPLOAD_DIR].forEach(d => fs.mkdirSync(d, { recursive: true }));

const app = express();

// ── CORS: allow any origin (same-origin policy is irrelevant for a local dev server)
app.use(cors({ origin: '*' }));

// JSON body – 50 MB limit for large payloads
app.use(express.json({ limit: '50mb' }));
// text/plain body (the main app sends data this way to avoid CORS preflight)
app.use(express.text({ limit: '50mb', type: 'text/plain' }));

// Serve uploaded files (photos, attachments)
app.use('/uploads', express.static(UPLOAD_DIR));

// ── File upload storage ───────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (_req, file, cb) => {
    const id  = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)+Math.random().toString(36).slice(2);
    const ext = path.extname(file.originalname).toLowerCase() || '.bin';
    cb(null, id + ext);
  },
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

// ── Data helpers ──────────────────────────────────────────────────────────────
const TABLES = ['patients','appointments','payments','notifications','reminders','reminderLog','services','serverLogs'];

function readTable(name) {
  const f = path.join(DATA_DIR, name + '.json');
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return []; }
}

function writeTable(name, rows) {
  fs.writeFileSync(path.join(DATA_DIR, name + '.json'), JSON.stringify(rows, null, 2));
}

function appendLog(level, source, message, detail) {
  const logs = readTable('serverLogs');
  logs.push({
    id: Date.now().toString(36),
    time: new Date().toISOString(),
    level, source, message,
    detail: detail ? String(detail).slice(0, 500) : '',
  });
  writeTable('serverLogs', logs.slice(-500));
}

// ── Parse body (supports both JSON object and text/plain JSON string) ─────────
function parseBody(req) {
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return req.body || {};
}

// ─────────────────────────────────────────────────────────────────────────────
// GET  /  — ping or pull
// ─────────────────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  const action = req.query.action;

  if (!action || action === 'ping') {
    return res.json({ ok: true, pong: true, mode: 'local', version: '1.0.0' });
  }

  if (action === 'pull') {
    const data = {};
    TABLES.forEach(t => { data[t] = readTable(t); });
    return res.json({ ok: true, data });
  }

  if (action === 'getPhoto') {
    const fileId = req.query.fileId || '';
    if (!fileId) return res.status(400).json({ ok: false, error: 'Missing fileId' });

    // Try to serve file directly
    const filePath = path.join(UPLOAD_DIR, fileId);
    if (fs.existsSync(filePath)) {
      const ext  = path.extname(fileId).toLowerCase();
      const mime = { '.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png',
                     '.gif':'image/gif','.webp':'image/webp','.svg':'image/svg+xml' }[ext] || 'application/octet-stream';
      const buf  = fs.readFileSync(filePath);
      const b64  = buf.toString('base64');
      return res.json({ ok: true, dataUrl: `data:${mime};base64,${b64}` });
    }
    return res.status(404).json({ ok: false, error: 'File not found: ' + fileId });
  }

  return res.status(400).json({ ok: false, error: 'Unknown action: ' + action });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /  — all write operations
// ─────────────────────────────────────────────────────────────────────────────
app.post('/', upload.single('file'), (req, res) => {
  const body   = parseBody(req);
  const action = body.action || body.type || '';

  // ── push: replace all tables ──────────────────────────────────────────────
  if (!action || action === 'push') {
    const tables = body.data || body.tables || body;
    let written = 0;
    TABLES.forEach(t => {
      if (Array.isArray(tables[t])) { writeTable(t, tables[t]); written += tables[t].length; }
    });
    const stats = {};
    TABLES.forEach(t => { stats[t] = readTable(t).length; });
    appendLog('INFO', 'push', `Push: ${written} total rows written`);
    return res.json({ ok: true, stats });
  }

  // ── upsertRecord ──────────────────────────────────────────────────────────
  if (action === 'upsertRecord') {
    const { table, record } = body;
    if (!table || !record) return res.status(400).json({ ok: false, error: 'Missing table or record' });
    const rows = readTable(table);
    const idx  = rows.findIndex(r => r.id === record.id);
    const act  = idx >= 0 ? 'updated' : 'inserted';
    if (idx >= 0) rows[idx] = record; else rows.push(record);
    writeTable(table, rows);
    return res.json({ ok: true, action: act, record });
  }

  // ── checkDuplicate ────────────────────────────────────────────────────────
  if (action === 'checkDuplicate') {
    const { table, field, value, excludeId } = body;
    const rows = readTable(table || 'patients');
    const dup  = rows.find(r => r[field] === value && r.id !== excludeId);
    return res.json({ ok: true, found: !!dup, existing: dup || null });
  }

  // ── uploadPhoto ───────────────────────────────────────────────────────────
  if (action === 'uploadPhoto') {
    if (!req.file) {
      // Also accept base64 dataUrl in body
      const { dataUrl, mimeType, filename } = body;
      if (dataUrl) {
        const m   = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (!m) return res.status(400).json({ ok: false, error: 'Invalid dataUrl' });
        const ext = { 'image/jpeg':'.jpg','image/png':'.png','image/gif':'.gif','image/webp':'.webp' }[m[1]] || '.bin';
        const id  = (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)) + ext;
        fs.writeFileSync(path.join(UPLOAD_DIR, id), Buffer.from(m[2], 'base64'));
        const url = `http://localhost:${PORT}/uploads/${id}`;
        return res.json({ ok: true, fileId: id, thumbnailUrl: url, viewUrl: url, embedUrl: url, downloadUrl: url });
      }
      return res.status(400).json({ ok: false, error: 'No file provided' });
    }
    const id  = req.file.filename;
    const url = `http://localhost:${PORT}/uploads/${id}`;
    return res.json({ ok: true, fileId: id, thumbnailUrl: url, viewUrl: url, embedUrl: url, downloadUrl: url });
  }

  // ── uploadFile (attachment) ───────────────────────────────────────────────
  if (action === 'uploadFile') {
    if (!req.file) {
      const { dataUrl, name } = body;
      if (dataUrl) {
        const m   = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (!m) return res.status(400).json({ ok: false, error: 'Invalid dataUrl' });
        const safeExt = (path.extname(name||'').toLowerCase()) || '.bin';
        const id  = (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)) + safeExt;
        fs.writeFileSync(path.join(UPLOAD_DIR, id), Buffer.from(m[2], 'base64'));
        const url = `http://localhost:${PORT}/uploads/${id}`;
        return res.json({ ok: true, fileId: id, driveFileId: id, driveViewUrl: url, driveEmbedUrl: url, driveDownloadUrl: url, driveThumbnailUrl: url });
      }
      return res.status(400).json({ ok: false, error: 'No file provided' });
    }
    const id  = req.file.filename;
    const url = `http://localhost:${PORT}/uploads/${id}`;
    return res.json({ ok: true, fileId: id, driveFileId: id, driveViewUrl: url, driveEmbedUrl: url, driveDownloadUrl: url, driveThumbnailUrl: url });
  }

  // ── deletePhoto / deleteFile ───────────────────────────────────────────────
  if (action === 'deletePhoto' || action === 'deleteFile') {
    const { fileId } = body;
    if (fileId) {
      const f = path.join(UPLOAD_DIR, fileId);
      if (fs.existsSync(f)) { try { fs.unlinkSync(f); } catch {} }
    }
    return res.json({ ok: true });
  }

  // ── sendEmail ─────────────────────────────────────────────────────────────
  if (action === 'sendEmail') {
    appendLog('INFO', 'sendEmail', `[LOCAL — not sent] To: ${body.to || body.email}`, JSON.stringify(body).slice(0, 400));
    console.log('\n📧 [sendEmail – local mode, not sent]');
    console.log('  To:     ', body.to || body.email || '—');
    console.log('  Subject:', body.subject || '—');
    return res.json({ ok: true, local: true, note: 'Email not sent in local mode' });
  }

  // ── sendSms ───────────────────────────────────────────────────────────────
  if (action === 'sendSms') {
    appendLog('INFO', 'sendSms', `[LOCAL — not sent] To: ${body.to || body.phone}`, JSON.stringify(body).slice(0, 400));
    console.log('\n📱 [sendSms – local mode, not sent]');
    console.log('  To:     ', body.to || body.phone || '—');
    console.log('  Message:', (body.message || '').slice(0, 100));
    return res.json({ ok: true, local: true, note: 'SMS not sent in local mode' });
  }

  // ── appendLogs ────────────────────────────────────────────────────────────
  if (action === 'appendLogs') {
    const { logs } = body;
    if (Array.isArray(logs)) {
      const existing = readTable('serverLogs');
      writeTable('serverLogs', [...existing, ...logs].slice(-500));
    }
    return res.json({ ok: true });
  }

  // ── geminiOcr / claudeOcr — not available locally ─────────────────────────
  if (action === 'geminiOcr' || action === 'claudeOcr') {
    return res.json({ ok: false, error: 'OCR not available in local mode. Use the cloud deployment for scanning.' });
  }

  return res.status(400).json({ ok: false, error: 'Unknown action: ' + action });
});

// ─────────────────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║       Cyrabell Dental MS — Local Server              ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`  URL  : http://localhost:${PORT}`);
  console.log(`  Data : ${DATA_DIR}`);
  console.log(`  Files: ${UPLOAD_DIR}`);
  console.log('');
  console.log('  In the Cyrabell app → Settings → Sync URL:');
  console.log(`  → http://localhost:${PORT}`);
  console.log('');
  console.log('  Press Ctrl+C to stop.');
  console.log('');
});
