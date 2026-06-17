const NEXARCH_LOGO = 'data:image/png;base64,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';

const CYRABELL_LOGO = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Cdefs%3E%3ClinearGradient id='cg' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%2300c8ff'/%3E%3Cstop offset='100%25' stop-color='%230077cc'/%3E%3C/linearGradient%3E%3C/defs%3E%3Ccircle cx='60' cy='60' r='56' fill='%230a1628' stroke='%2300c8ff' stroke-width='2'/%3E%3Cpath d='M84 38 A34 34 0 1 0 84 82' fill='none' stroke='url(%23cg)' stroke-width='12' stroke-linecap='round'/%3E%3Ccircle cx='84' cy='38' r='6' fill='%2300c8ff'/%3E%3Ccircle cx='84' cy='82' r='6' fill='%230077cc'/%3E%3C/svg%3E";

// ═══════════════════════════════════════════════════════════════════════════
// 🛡️ GLOBAL ERROR HANDLER — Show errors visibly instead of white-screening
// ═══════════════════════════════════════════════════════════════════════════
(function setupGlobalErrorHandler(){
  function showError(msg, detail) {
    // Create a visible error banner that overrides white screens
    let banner = document.getElementById('__cyrabell_error_banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = '__cyrabell_error_banner';
      banner.style.cssText = [
        'position:fixed', 'top:0', 'left:0', 'right:0', 'z-index:99999',
        'background:#fef2f2', 'color:#991b1b', 'border-bottom:3px solid #dc2626',
        'padding:14px 18px', 'font-family:system-ui,sans-serif', 'font-size:13px',
        'box-shadow:0 4px 14px rgba(0,0,0,.15)', 'max-height:50vh', 'overflow-y:auto'
      ].join(';');
      document.body.appendChild(banner);
    }
    const time = new Date().toLocaleTimeString();
    banner.innerHTML += '<div style="margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid #fcc;">'
      + '<div style="font-weight:700;margin-bottom:4px;">⚠️ Error at ' + time + '</div>'
      + '<div style="font-family:monospace;font-size:11.5px;white-space:pre-wrap;word-break:break-word;">'
      + (msg || 'Unknown error').replace(/[<>&]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;'})[c])
      + '</div>'
      + (detail ? '<div style="font-size:11px;color:#7f1d1d;margin-top:4px;opacity:.85;font-family:monospace;">' + detail.replace(/[<>&]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;'})[c]) + '</div>' : '')
      + '<button onclick="this.parentElement.parentElement.removeChild(this.parentElement); if(this.parentElement && this.parentElement.children.length===0) this.parentElement.style.display=\'none\';" '
      +   'style="margin-top:6px;padding:4px 10px;background:#dc2626;color:white;border:none;border-radius:5px;cursor:pointer;font-size:11px;">Dismiss</button> '
      + '<button onclick="window.location.reload();" '
      +   'style="margin-top:6px;margin-left:6px;padding:4px 10px;background:#0a7c6e;color:white;border:none;border-radius:5px;cursor:pointer;font-size:11px;">Reload page</button>'
      + '</div>';
  }
  // Catch synchronous errors
  window.addEventListener('error', function(e) {
    showError(e.message || 'Script error', (e.filename || '') + (e.lineno ? ':' + e.lineno : ''));
  });
  // Catch unhandled promise rejections
  window.addEventListener('unhandledrejection', function(e) {
    let msg = 'Unhandled promise rejection';
    let detail = '';
    if (e.reason instanceof Error) {
      msg = e.reason.message;
      detail = (e.reason.stack || '').split('\n').slice(0, 4).join('\n');
    } else if (typeof e.reason === 'string') {
      msg = e.reason;
    } else {
      try { msg = JSON.stringify(e.reason); } catch (err) {}
    }
    showError(msg, detail);
  });
  // Expose for manual use
  window.__cyrabellShowError = showError;
})();

const {createElement:h,useState,useEffect,useCallback,useRef,Fragment,useMemo}=React;

(function installLogging() {
  if (window.__cyrabellLogsInstalled) return;
  window.__cyrabellLogsInstalled = true;

  // Circular buffer — last 500 log entries (kept small to avoid memory bloat)
  const MAX_LOGS = 500;
  window.__cyrabellLogs = [];

  // Counter for unique IDs
  let logSeq = 0;

  function pushLog(level, source, message, detail) {
    const entry = {
      id: ++logSeq,
      time: new Date().toISOString(),
      level: level,            // 'info' | 'warn' | 'error' | 'event'
      source: source || '',    // tag like 'sync', 'photo', 'ocr', 'reminder', 'ui'
      message: String(message || '').substring(0, 1000),
      detail: detail ? String(detail).substring(0, 2000) : '',
      url: location.href,
    };
    window.__cyrabellLogs.push(entry);
    if (window.__cyrabellLogs.length > MAX_LOGS) {
      window.__cyrabellLogs.shift();
    }
    // Persist errors to localStorage so they survive a reload (last 50 only)
    if (level === 'error') {
      try {
        const persisted = JSON.parse(localStorage.getItem(LS_KEYS.ERROR_LOG) || '[]');
        persisted.push(entry);
        while (persisted.length > 50) persisted.shift();
        localStorage.setItem(LS_KEYS.ERROR_LOG, JSON.stringify(persisted));
      } catch(e) {/* ignore quota errors */}
    }
    // Notify any listening UI
    try {
      window.dispatchEvent(new CustomEvent('cyrabell-log', {detail: entry}));
    } catch(e) {}
    return entry;
  }

  // Restore persisted error logs from previous session (so we don't lose history)
  try {
    const persisted = JSON.parse(localStorage.getItem(LS_KEYS.ERROR_LOG) || '[]');
    persisted.forEach(e => window.__cyrabellLogs.push(e));
  } catch(e) {/* ignore */}

  // Public helper: log an event from app code with structured detail
  // Usage: logEvent('sync', 'pull-success', {rows: 42})
  window.logEvent = function(source, message, detail) {
    pushLog('event', source, message, typeof detail === 'object' ? JSON.stringify(detail) : detail);
  };
  window.logInfo = function(source, message, detail) {
    pushLog('info', source, message, typeof detail === 'object' ? JSON.stringify(detail) : detail);
  };
  window.logWarn = function(source, message, detail) {
    pushLog('warn', source, message, typeof detail === 'object' ? JSON.stringify(detail) : detail);
  };
  window.logError = function(source, message, detail) {
    pushLog('error', source, message, typeof detail === 'object' ? JSON.stringify(detail) : detail);
  };

  // ── Wrap console methods to capture everything ─────────────────────────
  const origLog = console.log.bind(console);
  const origWarn = console.warn.bind(console);
  const origError = console.error.bind(console);
  const origInfo = console.info ? console.info.bind(console) : origLog;

  function extractSource(args) {
    // First arg often looks like '[source] message' — extract the tag
    const first = String(args[0] || '');
    const m = first.match(/^\[([^\]]+)\]/);
    return m ? m[1] : '';
  }

  console.log = function(...args) {
    pushLog('info', extractSource(args), args.map(a => typeof a === 'object' ? JSON.stringify(a).substring(0,200) : String(a)).join(' '));
    origLog.apply(console, args);
  };
  console.info = function(...args) {
    pushLog('info', extractSource(args), args.map(a => typeof a === 'object' ? JSON.stringify(a).substring(0,200) : String(a)).join(' '));
    origInfo.apply(console, args);
  };
  console.warn = function(...args) {
    pushLog('warn', extractSource(args), args.map(a => typeof a === 'object' ? JSON.stringify(a).substring(0,200) : String(a)).join(' '));
    origWarn.apply(console, args);
  };
  console.error = function(...args) {
    pushLog('error', extractSource(args), args.map(a => typeof a === 'object' ? JSON.stringify(a).substring(0,200) : String(a)).join(' '));
    origError.apply(console, args);
  };

  // ── Window-level error trapping ────────────────────────────────────────
  window.addEventListener('error', function(e) {
    pushLog('error', 'window', e.message || 'Unknown error',
      (e.filename ? e.filename + ':' + e.lineno + ':' + e.colno : '') +
      (e.error && e.error.stack ? '\n' + e.error.stack.substring(0, 1500) : '')
    );
  });

  window.addEventListener('unhandledrejection', function(e) {
    let detail = '';
    try {
      if (e.reason instanceof Error) {
        detail = e.reason.message + '\n' + (e.reason.stack || '').substring(0, 1500);
      } else {
        detail = JSON.stringify(e.reason).substring(0, 1500);
      }
    } catch(err) { detail = String(e.reason); }
    pushLog('error', 'promise', 'Unhandled rejection', detail);
  });

  // Boot log entry
  pushLog('event', 'boot', 'Application starting', 'UA: ' + navigator.userAgent.substring(0, 200));
})();


// p$, uid, S, safe defined in config.js (loaded before core.js)

const IC={
  tooth:'M12 2C8.5 2 5 4.5 5 8c0 2 .5 3.5 1 5 .5 1.5 1 3 1 5 0 1.5.5 2 1 2h8c.5 0 1-.5 1-2 0-2 .5-3.5 1-5 .5-1.5 1-3 1-5 0-3.5-3.5-6-7-6z',
  cal:'M3 4h18v18H3zM16 2v4M8 2v4M3 10h18',
  users:'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  dash:'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  x:'M18 6 6 18M6 6l12 12', plus:'M12 5v14M5 12h14',
  search:'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35',
  credit:'M1 4h22v16H1zM1 10h22',
  bell:'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0',
  edit:'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z',
  eye:'M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  report:'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6',
  clock:'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
  shield:'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  dl:'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
  send:'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z',
  globe:'M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zM2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z',
  check:'M20 6L9 17l-5-5',
  file:'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6',
  menu:'M3 12h18M3 6h18M3 18h18',
  lock:'M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zM7 11V7a5 5 0 0 1 10 0v4',
  logout:'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  arrow:'M5 12h14M12 5l7 7-7 7',
  reset:'M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8M3 3v5h5',
  repeat:'M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3',
  cloud:'M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z',
};
const Svg=({d,size,color})=>h('svg',{width:size||18,height:size||18,viewBox:'0 0 24 24',fill:'none',stroke:color||'currentColor',strokeWidth:2,strokeLinecap:'round',strokeLinejoin:'round',style:{flexShrink:0}},h('path',{d}));

// ── Brand logo: teal tooth + silver checkmark + wordmark ──────────────────
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 80">
  <defs>
    <radialGradient id="tg" cx="40%" cy="30%" r="65%">
      <stop offset="0%" stop-color="#4de8e0"/>
      <stop offset="55%" stop-color="#00b8c4"/>
      <stop offset="100%" stop-color="#007a85"/>
    </radialGradient>
    <linearGradient id="sg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#e8e8e8"/>
      <stop offset="40%" stop-color="#c0c0c0"/>
      <stop offset="100%" stop-color="#888"/>
    </linearGradient>
    <filter id="sh" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="1" dy="2" stdDeviation="2" flood-color="#00808088"/>
    </filter>
  </defs>
  <!-- Tooth body -->
  <path d="M10 22 C10 14 14 8 22 7 C26 6 30 8 34 10 C36 11 38 12 40 12 C42 12 44 11 46 10 C50 8 54 6 58 7 C66 8 70 14 70 22 C70 30 67 38 64 46 C62 52 60 58 58 62 C56 66 54 68 52 68 C50 68 48 66 47 62 L44 54 C43 50 42 48 40 48 C38 48 37 50 36 54 L33 62 C32 66 30 68 28 68 C26 68 24 66 22 62 C20 58 18 52 16 46 C13 38 10 30 10 22 Z" fill="url(#tg)" filter="url(#sh)"/>
  <!-- Tooth highlight -->
  <ellipse cx="30" cy="18" rx="7" ry="9" fill="rgba(255,255,255,0.22)" transform="rotate(-15,30,18)"/>
  <!-- Silver checkmark -->
  <path d="M20 32 L33 46 L62 18" fill="none" stroke="url(#sg)" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M20 32 L33 46 L62 18" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- Wordmark -->
  <text x="82" y="26" font-family="'Segoe UI',Arial,sans-serif" font-size="14" font-weight="800" letter-spacing="1.5" fill="#1a3a4a">SIMPLIFIED</text>
  <text x="82" y="46" font-family="'Segoe UI',Arial,sans-serif" font-size="14" font-weight="800" letter-spacing="1" fill="#1a3a4a">DENTAL CLINIC</text>
  <text x="82" y="62" font-family="'Segoe UI',Arial,sans-serif" font-size="10" font-weight="600" letter-spacing="2" fill="#4a7080">MANAGEMENT SYSTEMS</text>
</svg>`;

// Logo for dark backgrounds (sidebar, kiosk, booking header)
const LOGO_SVG_LIGHT = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 80">
  <defs>
    <radialGradient id="tg2" cx="40%" cy="30%" r="65%">
      <stop offset="0%" stop-color="#7ff5ef"/>
      <stop offset="55%" stop-color="#2dd6de"/>
      <stop offset="100%" stop-color="#00b4c0"/>
    </radialGradient>
    <linearGradient id="sg2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f0f0f0"/>
      <stop offset="50%" stop-color="#d0d0d0"/>
      <stop offset="100%" stop-color="#aaa"/>
    </linearGradient>
    <filter id="sh2" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="1" dy="2" stdDeviation="2" flood-color="#00000040"/>
    </filter>
  </defs>
  <path d="M10 22 C10 14 14 8 22 7 C26 6 30 8 34 10 C36 11 38 12 40 12 C42 12 44 11 46 10 C50 8 54 6 58 7 C66 8 70 14 70 22 C70 30 67 38 64 46 C62 52 60 58 58 62 C56 66 54 68 52 68 C50 68 48 66 47 62 L44 54 C43 50 42 48 40 48 C38 48 37 50 36 54 L33 62 C32 66 30 68 28 68 C26 68 24 66 22 62 C20 58 18 52 16 46 C13 38 10 30 10 22 Z" fill="url(#tg2)" filter="url(#sh2)"/>
  <ellipse cx="30" cy="18" rx="7" ry="9" fill="rgba(255,255,255,0.28)" transform="rotate(-15,30,18)"/>
  <path d="M20 32 L33 46 L62 18" fill="none" stroke="url(#sg2)" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M20 32 L33 46 L62 18" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="82" y="26" font-family="'Segoe UI',Arial,sans-serif" font-size="14" font-weight="800" letter-spacing="1.5" fill="#ffffff">SIMPLIFIED</text>
  <text x="82" y="46" font-family="'Segoe UI',Arial,sans-serif" font-size="14" font-weight="800" letter-spacing="1" fill="#ffffff">DENTAL CLINIC</text>
  <text x="82" y="62" font-family="'Segoe UI',Arial,sans-serif" font-size="10" font-weight="600" letter-spacing="2" fill="rgba(255,255,255,0.75)">MANAGEMENT SYSTEMS</text>
</svg>`;

const BrandLogo = ({dark=false, width=200})=>h('div',{
  dangerouslySetInnerHTML:{__html: dark ? LOGO_SVG_LIGHT : LOGO_SVG},
  style:{width, lineHeight:0, flexShrink:0}
});

// Data URLs for use in img tags (e.g. notification email HTML strings)
const LOGO_DATA       = 'data:image/svg+xml,' + encodeURIComponent(LOGO_SVG);
const LOGO_DATA_LIGHT = 'data:image/svg+xml,' + encodeURIComponent(LOGO_SVG_LIGHT);

// Clinic logo — AC Dental (Dr. Arnold Colao) — real PNG embedded as base64
const AC_LOGO_DATA = 'data:image/png;base64,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';

const BMAP={pending:'bpend',confirmed:'bconf',cancelled:'bcanc',completed:'bcomp',paid:'bpaid',unpaid:'bcanc',sent:'bsent',failed:'bcanc'};
// aria-label provides screen-reader text for colour-only status dots (Finding #14)
const SBadge=({status})=>h('span',{className:'badge '+(BMAP[status]||'bpend'),'aria-label':'Status: '+(status||'unknown')},h('span',{className:'bdot','aria-hidden':'true'}),status);

function Toast({toasts,rm}){
  return h('div',{className:'tc',role:'alert','aria-live':'polite','aria-atomic':'false'},toasts.map(t=>
    h('div',{key:t.id,className:'toast '+(t.type==='success'?'ok':t.type==='error'?'err':''),onClick:()=>rm(t.id)},
      h('span',{style:{fontSize:15,flexShrink:0}},t.type==='success'?'✓':t.type==='error'?'✕':'ℹ'),
      h('span',{style:{flex:1}},t.message)
    )
  ));
}

function expCSV(data,fn){
  if(!data.length)return;
  const k=Object.keys(data[0]);
  const c=[k.join(','),...data.map(r=>k.map(k2=>'"'+String(r[k2]||'').replace(/"/g,'""')+'"').join(','))].join('\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([c],{type:'text/csv'}));a.download=fn;a.click();
}
function expJSON(data,fn){
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));a.download=fn;a.click();
}
function printDoc(content,title){
  const w=window.open('','_blank');if(!w)return;
  w.document.write('<!DOCTYPE html><html><head><title>'+title+'</title><style>body{font-family:Segoe UI,sans-serif;padding:28px;color:#1a2332;max-width:880px;margin:0 auto}.doc-header{display:flex;align-items:center;gap:16px;margin-bottom:4px;padding-bottom:10px;border-bottom:2px solid #e0eaf4}.doc-logo{flex-shrink:0}h2{font-size:15px;margin:20px 0 9px;color:#243447}.meta{font-size:12px;color:#8fa8b8;margin-bottom:20px}table{width:100%;border-collapse:collapse;margin-bottom:16px}th{background:#e8f5f3;padding:8px 10px;text-align:left;font-size:11px;color:#4a6275;text-transform:uppercase;letter-spacing:1px}td{padding:8px 10px;border-bottom:1px solid #dde8ec;font-size:12px}.pby{font-size:11px;color:#4a7080;letter-spacing:1px;margin-top:2px}.clinic-lbl{font-size:13px;font-weight:700;color:#1b3182;margin-bottom:2px}</style></head><body><div class="doc-header"><div class="doc-logo"><img src="'+AC_LOGO_DATA+'" alt="AC Dental" style="width:60px;height:auto;display:block"></div><div><div class="clinic-lbl">Arnold Colao Dental Clinic</div><div class="pby">SIMPLIFIED DENTAL CLINIC MANAGEMENT SYSTEMS</div></div></div><div class="meta">Generated: '+new Date().toLocaleString()+'</div>'+content+'<script>window.onload=function(){window.print();}<\/script></body></html>');
  w.document.close();
}

function Field({label,labelHint,children}){return h('div',{className:'fg'},h('label',null,label,labelHint&&h('span',{style:{fontSize:10.5,fontWeight:500,color:'var(--md)',marginLeft:6}},labelHint)),children);}

function Modal({title,sub,onClose,children,footer,large,xl}){
  let maxW = 620;
  if(large) maxW = 700;
  if(xl) maxW = 920;
  const modalRef = useRef(null);
  // Focus trap: keep Tab/Shift-Tab cycling within the modal (Finding #12)
  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;
    // Focus the first focusable element on open
    const focusable = 'button,input,select,textarea,[tabindex]:not([tabindex="-1"])';
    const elements = modal.querySelectorAll(focusable);
    if (elements.length) elements[0].focus();
    function handleKeyDown(e) {
      if (e.key === 'Escape') { onClose && onClose(); return; }
      if (e.key !== 'Tab') return;
      const els = Array.from(modal.querySelectorAll(focusable)).filter(el => !el.disabled && el.offsetParent !== null);
      if (!els.length) return;
      const first = els[0], last = els[els.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
  // Note: We deliberately do NOT close on backdrop click. Users must click ✕ or
  // Cancel/Save explicitly. This prevents accidental data loss especially when
  // adding photos, where browser file pickers can cause spurious click events.
  return h('div',{className:'ov',role:'dialog','aria-modal':'true','aria-label':title},
    h('div',{className:'modal',style:{maxWidth:maxW},ref:modalRef},
      h('div',{className:'mdrag'}),
      h('div',{className:'mh'},
        h('div',{style:{flex:1,minWidth:0}},
          h('div',{className:'mtl'},title),
          sub&&h('div',{className:'msub'},sub)
        ),
        h('button',{className:'xcb',onClick:onClose},h(Svg,{d:IC.x,size:14}))
      ),
      h('div',{className:'mbody'},children),
      footer&&h('div',{className:'mfoot'},footer)
    )
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// LOGIN SCREEN (admin/reception authentication)

// ═══════════════════════════════════════════════════════════════════════════
// 📨 NOTIFICATION SENDERS — Multi-channel delivery
// ═══════════════════════════════════════════════════════════════════════════
// Channels:
//   email:     via Apps Script (Gmail) — server-side, real send
//   sms:       via Apps Script email-to-SMS gateway — real send if carrier set
//   whatsapp:  via wa.me deep link — opens WhatsApp with message pre-filled
//   viber:     via viber:// deep link — opens Viber with message pre-filled
//   messenger: via m.me deep link — opens Messenger
//
// For deep-link channels we open a URL in a new tab and rely on the OS to
// hand off to the installed app. The user taps SEND in the app.

// Normalize phone for deep links: strip leading 0/spaces, add country code
function normalizePhone(phone, defaultCountry) {
  defaultCountry = defaultCountry || '63'; // PH default
  let p = String(phone || '').replace(/[^\d+]/g, '');
  if (p.startsWith('+')) return p.substring(1); // already has country code
  if (p.startsWith('0')) p = defaultCountry + p.substring(1);
  return p;
}

function nlog(stage, detail) {
  if (typeof window !== 'undefined') {
    window.__notifLogs = window.__notifLogs || [];
    window.__notifLogs.push({ t: new Date().toISOString().substr(11,12), stage, detail });
    if (window.__notifLogs.length > 100) window.__notifLogs.shift();
  }
  console.log('[📨 notif]', stage, detail || '');
}

// ─── EMAIL: Apps Script real send ──────────────────────────────────────────
// Wrap fetch with a timeout (Apps Script email can take 5-15s)
async function fetchWithTimeout(url, opts, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs || 30000);
  try {
    const res = await fetch(url, Object.assign({}, opts, { signal: controller.signal }));
    clearTimeout(timeoutId);
    return res;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Request timed out after ' + (timeoutMs/1000) + 's. Apps Script may be slow — check deployment.');
    }
    throw err;
  }
}

async function sendEmailNotification(syncUrl, to, subject, message) {
  nlog('email:start', { to, subject });
  if (!syncUrl) throw new Error('No Sync URL. Configure ☁️ Sync to enable emails.');
  if (!to) throw new Error('No email address');
  let res;
  try {
    res = await fetchWithTimeout(syncUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'sendEmail',
        to: to,
        subject: subject || 'Simplified Dental Clinic Notification',
        message: message
      }),
      redirect: 'follow'
    }, 30000);
    nlog('email:response-received', { status: res.status, ok: res.ok });
  } catch (netErr) {
    nlog('email:network-error', netErr.message);
    throw new Error('Network error: ' + netErr.message);
  }
  let text;
  try {
    text = await res.text();
    nlog('email:response-text', { length: text.length, preview: text.substring(0, 200) });
  } catch (e) {
    nlog('email:read-text-error', e.message);
    throw new Error('Could not read response body');
  }
  let data;
  try { data = JSON.parse(text); }
  catch (e) {
    nlog('email:parse-error', { preview: text.substring(0, 200) });
    throw new Error('Apps Script returned non-JSON. Likely the deployment is outdated — redeploy as "New version". Response: ' + text.substring(0, 100));
  }
  if (!data.ok) {
    nlog('email:server-error', data.error);
    throw new Error(data.error || 'Email send failed');
  }
  nlog('email:sent', { remaining: data.remainingToday, sentTo: data.sentTo });
  return data;
}

// ─── SMS: Apps Script email-to-SMS gateway ─────────────────────────────────
async function sendSmsNotification(syncUrl, phone, message, carrier) {
  nlog('sms:start', { phone, carrier });
  if (!phone) throw new Error('No phone number');
  const semaphoreKey = (function(){ try { return localStorage.getItem(LS_KEYS.SEMAPHORE_KEY)||''; } catch(e) { return ''; } })();
  if (semaphoreKey) {
    // Fully automated via Semaphore.co API (no GAS needed)
    nlog('sms:semaphore:calling', { phone });
    const p = normalizePhone(phone);
    const body = new URLSearchParams({ apikey: semaphoreKey, number: p, message: message, sendername: 'CYRABELL' });
    let res;
    try {
      res = await fetchWithTimeout('https://api.semaphore.co/api/v4/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
        redirect: 'follow'
      }, 30000);
      nlog('sms:semaphore:response', { status: res.status });
    } catch(e) { nlog('sms:semaphore:error', e.message); throw new Error('Semaphore network error: ' + e.message); }
    const text = await res.text();
    nlog('sms:semaphore:body', { preview: text.slice(0,200) });
    let data; try { data = JSON.parse(text); } catch(e) { throw new Error('Semaphore returned non-JSON: ' + text.slice(0,100)); }
    if (!res.ok) throw new Error('Semaphore error: ' + (Array.isArray(data) ? JSON.stringify(data[0]) : text.slice(0,100)));
    nlog('sms:semaphore:sent', { messageId: Array.isArray(data) ? data[0]?.message_id : data?.message_id });
    return { ok: true, method: 'semaphore', data };
  }
  if (!syncUrl) {
    const p = normalizePhone(phone);
    const uri = 'sms:+' + p + '?body=' + encodeURIComponent(message);
    nlog('sms:fallback-manual', { uri });
    window.open(uri, '_blank');
    return { ok: true, method: 'manual', telUri: uri };
  }
  nlog('sms:gas:calling', { phone, carrier });
  let res;
  try {
    res = await fetchWithTimeout(syncUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'sendSms', phone, message, carrier: carrier||'' }),
      redirect: 'follow'
    }, 30000);
    nlog('sms:gas:response', { status: res.status });
  } catch(e) { nlog('sms:gas:error', e.message); throw new Error('Network error: ' + e.message); }
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch(e) { throw new Error('GAS returned non-JSON. Redeploy as new version.'); }
  if (!data.ok) throw new Error(data.error || 'SMS send failed');
  if (data.method === 'manual' && data.telUri) { nlog('sms:opening-tel', {}); window.open(data.telUri, '_blank'); }
  else nlog('sms:gas:sent', { gateway: data.gateway });
  return data;
}

// ─── WhatsApp: API or wa.me deep link ─────────────────────────────────────
async function sendWhatsAppNotification(phone, message, syncUrl) {
  nlog('whatsapp:start', { phone });
  if (!phone) throw new Error('No phone number');
  const waToken   = (function(){ try { return localStorage.getItem(LS_KEYS.WA_TOKEN)||''; } catch(e) { return ''; } })();
  const waPhoneId = (function(){ try { return localStorage.getItem(LS_KEYS.WA_PHONE_ID)||''; } catch(e) { return ''; } })();
  if (waToken && waPhoneId && syncUrl) {
    nlog('whatsapp:api:calling', { phone });
    let res;
    try {
      res = await fetchWithTimeout(syncUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action:'sendWhatsapp', phone: normalizePhone(phone), message, waToken, waPhoneId }),
        redirect: 'follow'
      }, 30000);
      nlog('whatsapp:api:response', { status: res.status });
    } catch(e) { nlog('whatsapp:api:error', e.message); throw new Error('WhatsApp API error: ' + e.message); }
    const text = await res.text();
    let data; try { data = JSON.parse(text); } catch(e) { throw new Error('GAS returned non-JSON for WhatsApp.'); }
    if (!data.ok) throw new Error(data.error || 'WhatsApp send failed');
    nlog('whatsapp:api:sent', { messageId: data.messageId });
    return { ok: true, method: 'api', messageId: data.messageId };
  }
  // Fallback deep link
  const p = normalizePhone(phone);
  const url = 'https://wa.me/' + p + '?text=' + encodeURIComponent(message);
  nlog('whatsapp:fallback-deeplink', { url });
  window.open(url, '_blank');
  return { ok: true, method: 'deeplink', url };
}

// ─── Viber: API or viber:// deep link ─────────────────────────────────────
async function sendViberNotification(phone, message, syncUrl) {
  nlog('viber:start', { phone });
  if (!phone) throw new Error('No phone number');
  const viberToken = (function(){ try { return localStorage.getItem(LS_KEYS.VIBER_TOKEN)||''; } catch(e) { return ''; } })();
  if (viberToken && syncUrl) {
    nlog('viber:api:calling', { phone });
    let res;
    try {
      res = await fetchWithTimeout(syncUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action:'sendViber', phone: normalizePhone(phone), message, viberToken }),
        redirect: 'follow'
      }, 30000);
      nlog('viber:api:response', { status: res.status });
    } catch(e) { nlog('viber:api:error', e.message); throw new Error('Viber API error: ' + e.message); }
    const text = await res.text();
    let data; try { data = JSON.parse(text); } catch(e) { throw new Error('GAS returned non-JSON for Viber.'); }
    if (!data.ok) throw new Error(data.error || 'Viber send failed');
    nlog('viber:api:sent', { messageId: data.messageId });
    return { ok: true, method: 'api', messageId: data.messageId };
  }
  const p = normalizePhone(phone);
  const uri = 'viber://chat?number=%2B' + p + '&draft=' + encodeURIComponent(message);
  nlog('viber:fallback-deeplink', { uri });
  window.open(uri, '_blank');
  return { ok: true, method: 'deeplink', url: uri };
}

// ─── Messenger: m.me deep link ─────────────────────────────────────────────
// Note: Messenger doesn't support pre-filled text from third parties anymore
// (Facebook removed this in 2020). We can only open the chat — user must
// type the message themselves. For convenience we copy the message to clipboard.
function sendMessengerNotification(messengerId, message) {
  nlog('messenger:start', { messengerId });
  // Copy message to clipboard so the user can paste it
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try { navigator.clipboard.writeText(message); }
    catch (e) {}
  }
  // m.me/<username-or-id> opens the chat
  // If no specific username, fall back to messenger home (user picks recipient)
  let url;
  if (messengerId && messengerId.indexOf('http') === 0) {
    url = messengerId;  // already a URL
  } else if (messengerId) {
    url = 'https://m.me/' + messengerId;
  } else {
    url = 'https://www.messenger.com/';
  }
  nlog('messenger:opening', { url });
  window.open(url, '_blank');
  return {
    ok: true,
    method: 'deeplink',
    url,
    note: 'Message copied to clipboard — paste it in Messenger'
  };
}

// ─── DISPATCHER: route to the right sender ────────────────────────────────
async function sendNotification(channel, patient, message, syncUrl) {
  nlog('dispatch:start', { channel, patient: patient.name, ts: new Date().toISOString() });
  const subject = 'Cyrabell Dental Clinic — ' + (patient.name || 'Reminder');
  let result;
  try {
    if (channel === 'email')     result = await sendEmailNotification(syncUrl, patient.email, subject, message);
    else if (channel === 'sms')  result = await sendSmsNotification(syncUrl, patient.phone, message, patient.smsCarrier);
    else if (channel === 'whatsapp') result = await sendWhatsAppNotification(patient.phone, message, syncUrl);
    else if (channel === 'viber')    result = await sendViberNotification(patient.phone, message, syncUrl);
    else if (channel === 'messenger') result = sendMessengerNotification(patient.messengerId || '', message);
    else throw new Error('Unknown channel: ' + channel);
    nlog('dispatch:success', { channel, method: result && result.method, ts: new Date().toISOString() });
    return result;
  } catch(err) {
    nlog('dispatch:failed', { channel, error: err.message, ts: new Date().toISOString() });
    throw err;
  }
}


// ── Auto-notification helpers ────────────────────────────────────────────────

// Default per-trigger channel config (all channels that have credentials).
const APPT_NOTIF_DEFAULT={confirmation:['sms','email','whatsapp','viber'],reminder:['sms','whatsapp'],cancellation:['sms','email','whatsapp','viber']};

function getApptNotifCfg(){
  try{const s=localStorage.getItem(LS_KEYS.APPT_NOTIF_CFG);if(s)return JSON.parse(s);}catch(e){}
  return APPT_NOTIF_DEFAULT;
}

// Returns channels that are (a) configured for this trigger and (b) have API credentials.
function getEnabledChannels(trigger){
  const cfg=getApptNotifCfg();
  const wanted=new Set(cfg[trigger]||cfg.confirmation||[]);
  const ch=[];
  try{if(wanted.has('sms')&&localStorage.getItem(LS_KEYS.SEMAPHORE_KEY)) ch.push('sms');}catch(e){}
  try{if(wanted.has('email')&&localStorage.getItem(LS_KEYS.SYNC_URL))    ch.push('email');}catch(e){}
  try{if(wanted.has('whatsapp')&&localStorage.getItem(LS_KEYS.WA_TOKEN)&&localStorage.getItem(LS_KEYS.WA_PHONE_ID)) ch.push('whatsapp');}catch(e){}
  try{if(wanted.has('viber')&&localStorage.getItem(LS_KEYS.VIBER_TOKEN)) ch.push('viber');}catch(e){}
  if(wanted.has('messenger')) ch.push('messenger');
  return ch;
}

// Sends appointment notification on all enabled channels and appends to the
// notifications log.  type = 'confirmation' | 'cancellation' | 'reminder'
async function sendApptNotif(type, appt, syncUrl, setNotifications){
  const channels=getEnabledChannels(type);
  if(!channels.length||!appt) return;
  const tmplFn=TMPL[type];
  if(!tmplFn) return;
  const message=tmplFn(appt);
  const patient={name:appt.patientName,phone:appt.phone||'',email:appt.email||'',smsCarrier:appt.smsCarrier||''};
  const nowStr=new Date().toLocaleString();
  for(const ch of channels){
    let status='sent';
    try{ await sendNotification(ch,patient,message,syncUrl); }
    catch(e){ status='failed'; }
    if(setNotifications){
      setNotifications(prev=>[{
        id:'N'+uid(),type:ch,recipient:appt.patientName,
        phone:appt.phone||'—',email:appt.email||'—',
        message,sentAt:nowStr,status
      },...prev]);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🤖 AI ASSISTANT — Rule-based scheduling + dental case analysis
// ═══════════════════════════════════════════════════════════════════════════
// Uses on-device logic (no API keys needed, no data leaves your browser).
// For free-form chat, optionally configure a Gemini/OpenAI API key in
// localStorage as 'cyrabell_ai_key' + 'cyrabell_ai_provider' ('gemini'|'openai').

// ─── SCHEDULING AI ─────────────────────────────────────────────────────────
// Given appointments + a target date range, suggests optimal slots based on:
//   - Existing bookings (no conflicts)
//   - Clinic hours (09:00–17:00)
//   - Even distribution (don't bunch all morning)
//   - Service duration estimates
const SERVICE_DURATIONS = {
  // Consultation
  'Consultation': 30,
  // Prophylaxis
  'Oral Prophylaxis / Scaling & Polishing': 45,
  'Topical Fluoride Application': 20,
  // Root Canal
  'Root Canal — 1 Canal': 90,
  'Root Canal — 2 Canals': 120,
  'Root Canal — 3 Canals': 120,
  // Post & Core
  'Post & Core — Prefabricated': 60,
  'Post & Core — Fabricated': 60,
  // Surgery
  'Normal Exodontia (Extraction)': 45,
  'Odontectomy': 90,
  'Gingivectomy': 60,
  'Alveolectomy': 60,
  'Apicoectomy': 60,
  // Restoration
  'Temporary Filling': 30,
  'Permanent Filling': 45,
  // Veneers
  'Direct Veneer': 60,
  'Indirect Veneer': 60,
  // Crown & Bridge
  'Crown — Acrylic': 60,
  'Crown — Porcelain Fused to Metal': 60,
  'Crown — Porcelain Fused to Special Metals': 60,
  'Crown — All Porcelain': 60,
  'Crown — Tilite': 60,
  'Recementation': 30,
  // Dentures
  'Complete Denture — Acrylic (up & down)': 90,
  'Complete Denture — Ivocap (up & down)': 90,
  'RPD Acrylic — 1st Pontic': 60,
  'RPD Acrylic — Additional Pontic': 30,
  'RPD — One Piece Metal Framework': 60,
  'RPD Valplast/Flexite — Unilateral': 60,
  'RPD Valplast/Flexite — Bilateral': 90,
  'Denture Repair': 45,
  'Denture Reline': 45,
  'Denture Rebase': 60,
  "Hawley's Retainer (up & down)": 60,
  // Bleaching
  'Bleaching': 90,
  // Diagnostics
  'X-Ray (Periapical)': 15,
  'X-Ray (Panoramic)': 20,
  // Orthodontics
  'Orthodontic Braces — Consultation': 30,
  'Orthodontic Braces — Monthly Adjustment': 30,
};
const SLOT_TIMES = ['09:00','10:00','11:00','13:00','14:00','15:00','16:00','17:00'];

function aiSuggestSlots(appointments, service, fromDate, daysAhead) {
  daysAhead = daysAhead || 7;
  const duration = SERVICE_DURATIONS[service] || 45;
  const startDate = new Date(fromDate || new Date());
  const suggestions = [];

  for (let dayOffset = 0; dayOffset < daysAhead && suggestions.length < 8; dayOffset++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + dayOffset);
    if (d.getDay() === 0) continue; // skip Sundays
    const dateStr = toLocalDateStr(d);

    const busy = appointments.filter(a =>
      a.date === dateStr &&
      a.status !== 'cancelled' && a.status !== 'completed'
    ).map(a => a.time);

    for (const t of SLOT_TIMES) {
      if (busy.includes(t)) continue;
      // Score: prefer mornings, but spread across days
      const hour = parseInt(t.split(':')[0]);
      const morningBonus = hour < 12 ? 2 : 0;
      const dayPenalty = dayOffset; // earlier days better
      const score = 100 + morningBonus - dayPenalty - busy.length;
      suggestions.push({ date: dateStr, time: t, score, dayOffset, duration });
    }
  }

  suggestions.sort((a, b) => b.score - a.score);
  return suggestions.slice(0, 6);
}

function aiCheckConflicts(appointments, date, time, excludeId) {
  return appointments.filter(a =>
    a.date === date &&
    a.time === time &&
    a.id !== excludeId &&
    a.status !== 'cancelled' &&
    a.status !== 'completed'
  );
}

function aiScheduleInsights(appointments) {
  const today = localToday();
  const insights = [];

  // Today's load
  const todayAppts = appointments.filter(a => a.date === today && a.status !== 'cancelled');
  insights.push({
    type: 'info',
    title: "Today's load",
    value: todayAppts.length + ' appointment' + (todayAppts.length!==1?'s':'') + ' scheduled',
    detail: todayAppts.filter(a => a.arrived).length + ' have arrived'
  });

  // Tomorrow forecast
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate()+1);
  const tomStr = toLocalDateStr(tomorrow);
  const tomAppts = appointments.filter(a => a.date === tomStr && a.status !== 'cancelled');
  insights.push({
    type: 'info',
    title: 'Tomorrow',
    value: tomAppts.length + ' appointment' + (tomAppts.length!==1?'s':''),
    detail: tomAppts.length > 6 ? '⚠ Heavy day' : tomAppts.length < 2 ? '✨ Light day' : 'Normal load'
  });

  // Pending confirmations
  const pending = appointments.filter(a => a.status === 'pending').length;
  if (pending > 0) {
    insights.push({
      type: 'warn',
      title: 'Pending confirmation',
      value: pending + ' appointment' + (pending!==1?'s':'') + ' need attention',
      detail: 'Confirm or cancel to free up slots'
    });
  }

  // Most common service this month
  const thisMonth = appointments.filter(a => a.date && a.date.startsWith(today.substring(0,7)));
  const svcCount = {};
  thisMonth.forEach(a => { svcList(a).forEach(sv => { svcCount[sv] = (svcCount[sv]||0) + 1; }); });
  const topService = Object.entries(svcCount).sort((a,b)=>b[1]-a[1])[0];
  if (topService) {
    insights.push({
      type: 'info',
      title: 'Top service this month',
      value: topService[0],
      detail: topService[1] + ' booking' + (topService[1]!==1?'s':'')
    });
  }

  // Empty days warning
  const next7Days = [];
  for (let i = 1; i <= 7; i++) {
    const d = new Date(); d.setDate(d.getDate()+i);
    if (d.getDay() === 0) continue;
    const ds = toLocalDateStr(d);
    const cnt = appointments.filter(a => a.date === ds && a.status !== 'cancelled').length;
    if (cnt === 0) next7Days.push(ds);
  }
  if (next7Days.length > 0) {
    insights.push({
      type: 'opportunity',
      title: 'Empty days next week',
      value: next7Days.length + ' open day' + (next7Days.length!==1?'s':''),
      detail: 'Consider proactive bookings'
    });
  }

  return insights;
}

// ─── DENTAL CASE ANALYZER ──────────────────────────────────────────────────
// Reviews patient.teeth (FDI dict) and recommends:
//   - Priority treatments
//   - Risk flags
//   - Preventive recommendations
function aiAnalyzePatientDental(patient) {
  const teeth = patient && patient.teeth || {};
  const conditions = Object.entries(teeth).filter(([,v]) => v && v !== 'healthy');
  const stats = { cavity:0, filling:0, crown:0, root_canal:0, missing:0, implant:0, bridge:0, veneer:0, sealant:0 };
  conditions.forEach(([fdi, cond]) => { if (stats[cond] !== undefined) stats[cond]++; });

  const findings = [];
  const recommendations = [];
  const urgency = []; // priority list

  // Cavity analysis
  if (stats.cavity > 0) {
    urgency.push({
      level: stats.cavity > 3 ? 'high' : 'medium',
      title: stats.cavity + ' active cavit' + (stats.cavity===1?'y':'ies') + ' detected',
      action: 'Schedule filling appointment within 2-4 weeks',
      teeth: conditions.filter(([,v])=>v==='cavity').map(([k])=>k)
    });
    findings.push('Active decay present — pulpal involvement risk if left untreated');
  }

  // Root canal candidates (deep cavities or pain)
  if (stats.cavity >= 2) {
    recommendations.push('Take periapical X-rays to rule out pulpitis');
  }

  // Missing teeth
  if (stats.missing > 0) {
    const level = stats.missing >= 3 ? 'medium' : 'low';
    urgency.push({
      level: level,
      title: stats.missing + ' missing tooth/teeth',
      action: 'Discuss prosthetic options: implant, bridge, or denture',
      teeth: conditions.filter(([,v])=>v==='missing').map(([k])=>k)
    });
    if (stats.missing >= 2) {
      findings.push('Multiple missing teeth — risk of bite collapse and adjacent tooth drift');
    }
  }

  // Crown/restoration tracking
  if (stats.crown > 0 || stats.filling > 0) {
    recommendations.push('Annual radiographic check on restored teeth (#' +
      [...conditions.filter(([,v])=>v==='crown'||v==='filling').map(([k])=>k)].join(', #') + ')');
  }

  // Root canal long-term watch
  if (stats.root_canal > 0) {
    recommendations.push('6-month follow-up on root-canal-treated tooth/teeth (#' +
      conditions.filter(([,v])=>v==='root_canal').map(([k])=>k).join(', #') + ') — check for re-infection');
  }

  // Bridges nearby
  if (stats.bridge > 0) {
    recommendations.push('Bridge maintenance: floss threader use, abutment health check');
  }

  // Preventive
  if (stats.sealant === 0 && conditions.length === 0) {
    recommendations.push('No issues found — consider preventive sealants on molars for cavity prevention');
  } else {
    recommendations.push('6-month cleaning + fluoride treatment');
  }

  // Allergy flag
  if (patient.allergies && patient.allergies.toLowerCase() !== 'none' && patient.allergies !== '') {
    findings.push('⚠ Patient allergic to: ' + patient.allergies + ' — verify medications before any procedure');
  }

  // Outstanding balance flag
  if (patient.balance > 0) {
    findings.push('💰 Outstanding balance of ₱' + patient.balance.toLocaleString() + ' — discuss payment plan');
  }

  // Overall assessment
  let overall;
  if (conditions.length === 0) {
    overall = { status: 'excellent', summary: 'Excellent oral health. Maintain 6-month cleanings.', emoji: '🌟' };
  } else if (stats.cavity > 3 || stats.missing > 3) {
    overall = { status: 'urgent', summary: 'Multiple active issues require comprehensive treatment plan.', emoji: '🚨' };
  } else if (stats.cavity > 0) {
    overall = { status: 'attention', summary: 'Active decay — needs prompt attention.', emoji: '⚠️' };
  } else if (stats.missing > 0 || stats.root_canal > 0) {
    overall = { status: 'maintenance', summary: 'Stable but requires ongoing maintenance.', emoji: '🔧' };
  } else {
    overall = { status: 'good', summary: 'Generally good condition with minor restorative work.', emoji: '✓' };
  }

  return { overall, urgency, findings, recommendations, stats, conditionsCount: conditions.length };
}

// ─── AI ASSISTANT PANEL COMPONENT ─────────────────────────────────────────
function AIAssistant({appointments, patients, payments, addToast, onClose, defaultTab}) {
  const [tab, setTab] = useState(defaultTab || 'schedule');
  const [pickedPatient, setPickedPatient] = useState(null);
  const [pickedService, setPickedService] = useState('Teeth Cleaning');

  const insights = aiScheduleInsights(appointments);
  const suggestions = aiSuggestSlots(appointments, pickedService);
  const analysis = pickedPatient ? aiAnalyzePatientDental(pickedPatient) : null;

  return h(Modal, {
    title: '🤖 AI Assistant',
    sub: 'Smart insights powered by on-device analysis',
    xl: true,
    onClose,
    footer: h('button', {className: 'btn bgh', onClick: onClose}, 'Close')
  },
    h('div', {className: 'tabs'},
      [
        ['schedule', '📅 Scheduling'],
        ['analyze', '🦷 Case Analysis'],
        ['insights', '📊 Insights']
      ].map(([v,l]) =>
        h('button', {key: v, className: 'tab'+(tab===v?' act':''), onClick: ()=>setTab(v)}, l)
      )
    ),

    // ─── SCHEDULING TAB ──────────────────────────────────────────────
    tab === 'schedule' && h('div', null,
      h('div', {style: {marginBottom: 14}},
        h('div', {style: {fontWeight: 600, fontSize: 14, marginBottom: 6}}, 'Suggest optimal slots for:'),
        h('select', {
          value: pickedService,
          onChange: e => setPickedService(e.target.value)
        }, SVCS.map(sv => h('option', {key: sv.name, value: sv.name}, sv.name + ' (~' + (SERVICE_DURATIONS[sv.name]||45) + ' min)')))
      ),
      h('div', {className: 'ai-suggestions'},
        suggestions.length === 0
          ? h('div', {className: 'empty'}, 'No slots found in the next 7 days')
          : suggestions.map((s, i) =>
              h('div', {key: i, className: 'ai-slot'},
                h('div', {className: 'ai-slot-rank'}, '#' + (i+1)),
                h('div', {style: {flex: 1}},
                  h('div', {className: 'ai-slot-date'}, new Date(s.date).toLocaleDateString('en-US', {weekday: 'short', month: 'short', day: 'numeric'})),
                  h('div', {className: 'ai-slot-time'}, s.time + ' · ' + s.duration + ' min slot')
                ),
                h('div', {className: 'ai-slot-score', title: 'Recommendation score'}, '⭐ ' + s.score)
              )
            )
      ),
      h('div', {className: 'ai-tip'},
        '💡 Slots are ranked by morning preference, even distribution across days, and avoiding overbooked days.'
      )
    ),

    // ─── ANALYSIS TAB ────────────────────────────────────────────────
    tab === 'analyze' && h('div', null,
      h('div', {style: {marginBottom: 14}},
        h('div', {style: {fontWeight: 600, fontSize: 14, marginBottom: 6}}, 'Pick a patient to analyze:'),
        h('select', {
          value: pickedPatient ? pickedPatient.id : '',
          onChange: e => setPickedPatient(patients.find(p => p.id === e.target.value))
        },
          h('option', {value: ''}, 'Select patient…'),
          patients.map(p => h('option', {key: p.id, value: p.id},
            p.name + (Object.keys(p.teeth||{}).length>0 ? ' ('+Object.keys(p.teeth||{}).length+' findings)' : '')
          ))
        )
      ),
      analysis ? h('div', null,
        // Overall card
        h('div', {className: 'ai-overall ai-overall-' + analysis.overall.status},
          h('div', {className: 'ai-overall-emoji'}, analysis.overall.emoji),
          h('div', {style: {flex: 1}},
            h('div', {className: 'ai-overall-title'}, analysis.overall.status.toUpperCase()),
            h('div', {className: 'ai-overall-summary'}, analysis.overall.summary)
          )
        ),

        // Findings
        analysis.findings.length > 0 && h('div', {className: 'ai-section'},
          h('div', {className: 'ai-section-title'}, '⚕️ Clinical Findings'),
          h('ul', {className: 'ai-list'},
            analysis.findings.map((f, i) => h('li', {key: i}, f))
          )
        ),

        // Urgency / priority treatments
        analysis.urgency.length > 0 && h('div', {className: 'ai-section'},
          h('div', {className: 'ai-section-title'}, '🎯 Priority Treatments'),
          analysis.urgency.map((u, i) =>
            h('div', {key: i, className: 'ai-urgency ai-urgency-' + u.level},
              h('div', {className: 'ai-urgency-badge'}, u.level === 'high' ? '🔴 HIGH' : u.level === 'medium' ? '🟡 MEDIUM' : '🟢 LOW'),
              h('div', {style: {flex: 1}},
                h('div', {className: 'ai-urgency-title'}, u.title),
                h('div', {className: 'ai-urgency-action'}, '→ ' + u.action),
                u.teeth.length > 0 && h('div', {className: 'ai-urgency-teeth'}, 'Teeth: #' + u.teeth.join(', #'))
              )
            )
          )
        ),

        // Recommendations
        analysis.recommendations.length > 0 && h('div', {className: 'ai-section'},
          h('div', {className: 'ai-section-title'}, '💡 Recommendations'),
          h('ul', {className: 'ai-list'},
            analysis.recommendations.map((r, i) => h('li', {key: i}, r))
          )
        ),

        h('div', {className: 'ai-tip'},
          '⚠ AI analysis is a clinical aid only. Always verify with your professional judgment and patient examination.'
        )
      ) : h('div', {className: 'empty'}, 'Pick a patient to see analysis')
    ),

    // ─── INSIGHTS TAB ────────────────────────────────────────────────
    tab === 'insights' && h('div', null,
      h('div', {style: {fontWeight: 600, fontSize: 14, marginBottom: 12}}, 'Practice insights'),
      h('div', {className: 'ai-insights-grid'},
        insights.map((ins, i) =>
          h('div', {key: i, className: 'ai-insight ai-insight-' + ins.type},
            h('div', {className: 'ai-insight-title'}, ins.title),
            h('div', {className: 'ai-insight-value'}, ins.value),
            h('div', {className: 'ai-insight-detail'}, ins.detail)
          )
        )
      ),
      h('div', {className: 'ai-tip'},
        '🤖 Insights regenerate every time you open this panel.'
      )
    )
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// 👤 PATIENT DEDUPLICATION
// ═══════════════════════════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════════════════════════
// 🌏 LOCAL TIMEZONE HELPERS
// ═══════════════════════════════════════════════════════════════════════════
// IMPORTANT: Never use toISOString() for date strings — it returns UTC date,
// which can be off by one day depending on the user's timezone (e.g., 7 PM
// UTC = 3 AM next day in Manila). Use these helpers instead.

// Returns the user's LOCAL date as 'YYYY-MM-DD'
function localToday() {
  const d = new Date();
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

// Converts a Date object to LOCAL 'YYYY-MM-DD' string
function toLocalDateStr(d) {
  if (!d) return '';
  if (typeof d === 'string') return d.substring(0, 10);
  if (!(d instanceof Date)) d = new Date(d);
  if (isNaN(d.getTime())) return '';
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

// Date N days from today, as 'YYYY-MM-DD' in LOCAL time
function dateOffsetStr(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return toLocalDateStr(d);
}

// S, safe, uid, p$ defined in config.js (loaded before core.js)


// Normalize a name for comparison: lowercase, trim, collapse whitespace


function normName(n) {
  return S(n).toLowerCase().trim().replace(/\s+/g, ' ');
}

// Normalize phone: digits only, strip leading 0/63
function normPhone(p) {
  let s = S(p).replace(/\D/g, '');
  if (s.startsWith('63') && s.length === 12) s = s.substring(2);
  if (s.startsWith('0') && s.length === 11) s = s.substring(1);
  return s;
}

// Find an existing patient that matches by name+phone OR exact email
// Returns the matched patient object, or null
function findExistingPatient(patients, candidate) {
  if (!candidate || (!candidate.name && !candidate.phone && !candidate.email)) return null;
  const cName  = normName(candidate.name);
  const cPhone = normPhone(candidate.phone);
  const cEmail = (candidate.email || '').toLowerCase().trim();

  for (const p of patients) {
    const pName  = normName(p.name);
    const pPhone = normPhone(p.phone);
    const pEmail = (p.email || '').toLowerCase().trim();

    // Match priority: name+phone, then exact phone, then exact email
    if (cName && pName === cName && cPhone && pPhone === cPhone) return p;
    if (cPhone && cPhone.length >= 10 && pPhone === cPhone) return p;
    if (cEmail && pEmail && cEmail === pEmail) return p;
  }
  return null;
}

// Dedupe an array of patient records by name+phone, keeping the FIRST occurrence
// (assumes the array is ordered with the canonical/newest entry first)
function dedupePatients(patients) {
  const seen = new Map();
  const result = [];
  for (const p of patients) {
    const key = normName(p.name) + '|' + normPhone(p.phone);
    if (!seen.has(key) || !key.includes('|')) {
      seen.set(key, true);
      result.push(p);
    }
  }
  return result;
}


// ═══════════════════════════════════════════════════════════════════════════
// ⏰ REMINDER AUTO-TRIGGER — Daily check for due reminders
// ═══════════════════════════════════════════════════════════════════════════
// Runs at app startup AND every 6 hours while the app is open.
// Sends all reminders whose nextDue date is today or in the past.
// Can be disabled via localStorage.cyrabell_reminder_auto = 'false'

function reminderAutoEnabled() {
  try { return localStorage.getItem(LS_KEYS.REMINDER_AUTO) !== 'false'; }
  catch (e) { return true; }
}

function reminderLastRunDate() {
  try { return localStorage.getItem(LS_KEYS.REMINDER_LAST_RUN) || ''; }
  catch (e) { return ''; }
}

function setReminderLastRunDate(dateStr) {
  try { localStorage.setItem(LS_KEYS.REMINDER_LAST_RUN, dateStr); }
  catch (e) {}
}

function rlog(stage, detail) {
  if (typeof window !== 'undefined') {
    window.__reminderLogs = window.__reminderLogs || [];
    window.__reminderLogs.push({ t: new Date().toISOString().substr(11,12), stage, detail });
    if (window.__reminderLogs.length > 100) window.__reminderLogs.shift();
  }
  console.log('[⏰ reminder]', stage, detail || '');
}

// Find reminders that are due today or overdue
function getDueReminders(reminders) {
  const today = localToday();
  return reminders.filter(r => {
    // Must be active and have a valid nextDue date
    if (!r.active) return false;
    if (!r.nextDue || typeof r.nextDue !== 'string') return false;
    // Reject obviously corrupt dates (1899 epoch, too short)
    if (r.nextDue.length < 10) return false;
    if (r.nextDue.startsWith('1899')) return false;
    return r.nextDue <= today;
  });
}

// Run the daily trigger — sends all due reminders, updates schedules
async function runDailyReminderTrigger(reminders, patients, setReminders, setReminderLog, addToast) {
  if (!reminderAutoEnabled()) {
    rlog('skip:disabled');
    return { sent: 0, skipped: 'disabled' };
  }
  const today = localToday();
  if (reminderLastRunDate() === today) {
    rlog('skip:already-ran-today');
    return { sent: 0, skipped: 'already-ran-today' };
  }

  const due = getDueReminders(reminders);
  rlog('trigger:start', { dueCount: due.length });
  if (due.length === 0) {
    setReminderLastRunDate(today);
    rlog('trigger:nothing-due');
    return { sent: 0 };
  }

  const syncUrl = (function(){try{return localStorage.getItem(LS_KEYS.SYNC_URL)||'';}catch(e){return '';}})();
  let sentCount = 0;
  let failedCount = 0;
  const newLogs = [];
  const updatedReminders = [...reminders];

  for (const reminder of due) {
    const patient = patients.find(p => p.id === reminder.patientId);
    if (!patient) {
      rlog('skip:no-patient', { id: reminder.id });
      continue;
    }
    const type = REMINDER_TYPES[reminder.type];
    if (!type) continue;
    const message = type.template(patient);

    for (const ch of (reminder.channels || [])) {
      let status = 'sent', errMsg = '';
      try {
        await sendNotification(ch, patient, message, syncUrl);
        sentCount++;
      } catch (err) {
        status = 'failed';
        errMsg = err.message;
        failedCount++;
      }
      newLogs.push({
        id: 'RL'+uid()+ch,
        reminderId: reminder.id,
        patientId: reminder.patientId,
        patientName: reminder.patientName,
        type: reminder.type,
        channel: ch,
        message: message + (errMsg ? '\n[ERROR: ' + errMsg + ']' : '') + '\n[auto-trigger]',
        sentAt: new Date().toLocaleString() + ' (auto)',
        status: status
      });
    }

    // Advance schedule
    const newLastSent = today;
    const d = new Date(newLastSent);
    d.setDate(d.getDate() + (+reminder.frequency || 90));
    const newNextDue = toLocalDateStr(d);
    const idx = updatedReminders.findIndex(r => r.id === reminder.id);
    if (idx !== -1) {
      updatedReminders[idx] = {...updatedReminders[idx], lastSent: newLastSent, nextDue: newNextDue};
    }
  }

  setReminderLog(prev => [...newLogs, ...prev]);
  setReminders(updatedReminders);
  setReminderLastRunDate(today);

  rlog('trigger:complete', { sent: sentCount, failed: failedCount });
  if (sentCount > 0) {
    addToast('⏰ Auto-sent ' + sentCount + ' reminder' + (sentCount!==1?'s':'') + (failedCount > 0 ? ' (' + failedCount + ' failed)' : ''), 'success');
  }
  return { sent: sentCount, failed: failedCount };
}

// ═══════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════
// 🤖 PATIENT AI CHATBOT — Welcome screen & Public Booking assistant
