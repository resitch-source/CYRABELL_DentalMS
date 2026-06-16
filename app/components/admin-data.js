function lsGet(k, fallback) {
  try { const v = localStorage.getItem(k); return v == null ? fallback : v; }
  catch (e) { return fallback; }
}
function lsSet(k, v) {
  try { localStorage.setItem(k, v); } catch (e) {}
}

// Build the full data blob in the same shape Apps Script expects
// ── Real-time single-record upsert to Google Sheets ─────────────────────
// Called silently after every save. No-op when syncUrl is not configured.
async function syncOneRecord(table, record, syncUrl) {
  if (!syncUrl) return;
  try {
    const rec = {...record};
    // Serialize JSON fields before sending
    ['teeth','attachments','history','channels'].forEach(k => {
      if (rec[k] && typeof rec[k] === 'object') rec[k] = JSON.stringify(rec[k]);
    });
    const res  = await fetch(syncUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'upsertRecord', table, record: rec }),
      redirect: 'follow',
    });
    const data = JSON.parse(await res.text());
    if (!data.ok) console.warn('[Sync] upsert failed:', data.error);
    else console.log('[Sync]', data.action, table, record.id || '');
  } catch(e) { console.warn('[Sync] upsert error:', e.message); }
}

// ── Check Google Sheets for a duplicate record ───────────────────────────
// Returns the existing record object if found, null otherwise.
async function checkSheetsDuplicate(table, keyFields, excludeId, syncUrl) {
  if (!syncUrl) return null;
  try {
    const res  = await fetch(syncUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'checkDuplicate', table, keyFields, excludeId: excludeId || '' }),
      redirect: 'follow',
    });
    const data = JSON.parse(await res.text());
    return (data.ok && data.found) ? data.existing : null;
  } catch(e) { console.warn('[Sync] checkDuplicate error:', e.message); return null; }
}

// ── Push client-side logs to Sheets serverLogs tab ───────────────────────
// Called after each successful sync. Tracks the last pushed log id so only
// new entries are sent (avoids re-sending the same logs every sync cycle).
let _lastPushedLogId = 0;
async function pushClientLogsToSheets(syncUrl) {
  if (!syncUrl) return;
  const all = window.__cyrabellLogs || [];
  const unsent = all.filter(e => (e.id || 0) > _lastPushedLogId);
  if (!unsent.length) return;
  try {
    const res  = await fetch(syncUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'appendLogs', logs: unsent.slice(-50) }), // max 50 at a time
      redirect: 'follow',
    });
    const data = JSON.parse(await res.text());
    if (data.ok) _lastPushedLogId = Math.max(...unsent.map(e => e.id || 0));
  } catch(e) { /* fire and forget */ }
}

// ── Duplicate confirmation modal ──────────────────────────────────────────
function DuplicateModal({ table, existing, onUpdate, onCancel }) {
  const label = table === 'patients' ? 'Patient'
    : table === 'appointments' ? 'Appointment' : 'Payment';
  const detail = table === 'patients'
    ? [existing.name, existing.phone, existing.dob ? 'DOB: '+existing.dob : ''].filter(Boolean).join(' · ')
    : table === 'appointments'
    ? [existing.patientName, existing.service, existing.date, existing.time].filter(Boolean).join(' · ')
    : [existing.patientName, existing.service, existing.amount ? '₱'+existing.amount : '', existing.date].filter(Boolean).join(' · ');

  return h(Modal, {
    title: '⚠️ Duplicate ' + label + ' Found',
    sub: 'A matching record already exists',
    onClose: onCancel,
    footer: h(Fragment, null,
      h('button', { className: 'btn bgh', onClick: onCancel }, '✕ Keep as New Record'),
      h('button', { className: 'btn bp',  onClick: onUpdate }, '✓ Update Existing')
    )
  },
    h('div', { style: { padding: '4px 0 8px' } },
      h('div', { style: { fontSize: 13, marginBottom: 10 } },
        'The following record already exists in ',
        h('strong', null, table === 'patients' ? 'Patients' : table === 'appointments' ? 'Appointments' : 'Payments'),
        ':'
      ),
      h('div', { className: 'dup-detail-box' }, detail),
      h('div', { style: { marginTop: 12, fontSize: 12.5, color: 'var(--md)', lineHeight: 1.6 } },
        h('strong', null, '✓ Update Existing'), ' — overwrites the existing record with the new data.', h('br', null),
        h('strong', null, '✕ Keep as New Record'), ' — saves as a separate entry (both records kept).'
      )
    )
  );
}

function buildDataBlob(patients, appointments, payments, notifications, reminders, reminderLog, services) {
  return {
    patients, appointments, payments, notifications, reminders, reminderLog,
    services: services || [],
  };
}

// Apply pulled data into all state setters
function applyDataBlob(blob, setters) {
  if (Array.isArray(blob.patients))      setters.setPatients(blob.patients);
  if (Array.isArray(blob.appointments))  setters.setAppointments(blob.appointments);
  if (Array.isArray(blob.payments))      setters.setPayments(blob.payments);
  if (Array.isArray(blob.notifications)) setters.setNotifications(blob.notifications);
  if (Array.isArray(blob.reminders))     setters.setReminders(blob.reminders);
  if (Array.isArray(blob.reminderLog))   setters.setReminderLog(blob.reminderLog);
  if (Array.isArray(blob.services) && blob.services.length) {
    setters.setServices && setters.setServices(blob.services);
    try { localStorage.setItem(LS_KEYS.SERVICES, JSON.stringify(blob.services)); } catch(e){}
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 🛠️  SERVICES PAGE  (Finding #20)
//
// Admin-only page to add, edit, delete service catalog entries.
// Services are stored in localStorage under LS_KEYS.SERVICES.
// Falls back to the default SVCS array on first load.
// ══════════════════════════════════════════════════════════════════════════════
function ServicesPage({addToast}){
  const loadServices = () => {
    try {
      const raw = localStorage.getItem(LS_KEYS.SERVICES);
      if (raw) { const d = JSON.parse(raw); if (Array.isArray(d)) return d; }
    } catch(e){}
    return SVCS.map(s => ({...s})); // copy of defaults
  };
  const [services, setServices] = useState(loadServices);
  const [editing, setEditing] = useState(null); // null | 'new' | {index, item}
  const [form, setForm] = useState({name:'', fee:'', cat:''});
  const cats = [...new Set(services.map(s => s.cat))].sort();

  const save = () => {
    try { localStorage.setItem(LS_KEYS.SERVICES, JSON.stringify(services)); } catch(e){}
  };

  const openNew = () => { setForm({name:'', fee:'', cat:'Consultation'}); setEditing('new'); };
  const openEdit = (i) => { setForm({...services[i]}); setEditing({index:i, item:services[i]}); };
  const closeEdit = () => setEditing(null);

  const saveForm = () => {
    if (!form.name.trim() || !form.fee || !form.cat.trim()) {
      addToast('Name, fee, and category are required', 'error'); return;
    }
    const entry = {name: form.name.trim(), fee: +form.fee, cat: form.cat.trim()};
    let updated;
    if (editing === 'new') {
      updated = [...services, entry];
    } else {
      updated = services.map((s, i) => i === editing.index ? entry : s);
    }
    setServices(updated);
    try { localStorage.setItem(LS_KEYS.SERVICES, JSON.stringify(updated)); } catch(e){}
    addToast(editing === 'new' ? 'Service added!' : 'Service updated!', 'success');
    setEditing(null);
  };

  const del = (i) => {
    if (!confirm('Delete service "' + services[i].name + '"?')) return;
    const updated = services.filter((_, j) => j !== i);
    setServices(updated);
    try { localStorage.setItem(LS_KEYS.SERVICES, JSON.stringify(updated)); } catch(e){}
    addToast('Service deleted', 'info');
  };

  const reset = () => {
    if (!confirm('Reset to default service catalog? This cannot be undone.')) return;
    const defaults = SVCS.map(s => ({...s}));
    setServices(defaults);
    try { localStorage.setItem(LS_KEYS.SERVICES, JSON.stringify(defaults)); } catch(e){}
    addToast('Service catalog reset to defaults', 'success');
  };

  return h('div', null,
    h('div', {className:'ph'},
      h('div', null,
        h('div', {className:'ptl'}, 'Service Catalog'),
        h('div', {className:'psl'}, 'Manage available dental services and fees')
      ),
      h('div', {className:'ph-act'},
        h('button', {className:'btn bgh bsm', onClick:reset}, '↺ Reset Defaults'),
        h('button', {className:'btn bp', onClick:openNew}, '+ Add Service')
      )
    ),
    h('div', {className:'card dt'},
      h('div', {className:'tw'},
        h('table', null,
          h('thead', null, h('tr', null,
            h('th', null, 'Service Name'),
            h('th', null, 'Category'),
            h('th', null, 'Fee (₱)'),
            h('th', null, '')
          )),
          h('tbody', null,
            services.length === 0
              ? h('tr', null, h('td', {colSpan:4}, h('div', {className:'empty'}, 'No services')))
              : services.map((sv, i) => h('tr', {key:i},
                  h('td', null, sv.name),
                  h('td', null, h('span', {className:'tag', style:{background:'#e8eeff',color:'var(--bl)'}}, sv.cat)),
                  h('td', {style:{fontWeight:700, color:'var(--t)'}}, '₱' + p$(sv.fee)),
                  h('td', null, h('div', {className:'gap8'},
                    h('button', {className:'btn bgh bsm', onClick:()=>openEdit(i)}, '✏️'),
                    h('button', {className:'btn bd2 bsm', onClick:()=>del(i)}, '🗑')
                  ))
                ))
          )
        )
      )
    ),
    editing && h(Modal, {
      title: editing === 'new' ? 'Add Service' : 'Edit Service',
      onClose: closeEdit,
      footer: h(Fragment, null,
        h('button', {className:'btn bgh', onClick:closeEdit}, 'Cancel'),
        h('button', {className:'btn bp', onClick:saveForm}, editing === 'new' ? 'Add' : 'Save')
      )
    },
      h(Field, {label:'Service Name *'},
        h('input', {type:'text', value:form.name, onChange:e=>setForm(p=>({...p,name:e.target.value})), placeholder:'e.g. Teeth Cleaning'})
      ),
      h(Field, {label:'Category *'},
        h('input', {type:'text', value:form.cat, onChange:e=>setForm(p=>({...p,cat:e.target.value})),
          placeholder:'e.g. Prophylaxis', list:'svc-cats-list'}),
        h('datalist', {id:'svc-cats-list'}, cats.map(c => h('option', {key:c, value:c})))
      ),
      h(Field, {label:'Fee (₱) *'},
        h('input', {type:'number', value:form.fee, onChange:e=>setForm(p=>({...p,fee:e.target.value})), placeholder:'0', min:'0'})
      )
    )
  );
}

function SyncPage({patients, appointments, payments, notifications, reminders, reminderLog, services, setPatients, setAppointments, setPayments, setNotifications, setReminders, setReminderLog, setServices, addToast}){
  const [url, setUrl] = useState(()=>lsGet(LS_KEYS.SYNC_URL,'') || APP_DEFAULTS.GAS_URL);
  const [autoSync, setAutoSync] = useState(()=>lsGet(LS_KEYS.AUTO_SYNC,'true')!=='false');
  const [lastSync, setLastSync] = useState(()=>lsGet(LS_KEYS.LAST_SYNC,''));
  const [busy, setBusy] = useState(null);
  const [log, setLog] = useState([]);
  const [geminiKey, setGeminiKey] = useState(()=>lsGet(LS_KEYS.GEMINI_KEY,''));
  const [showKey, setShowKey]     = useState(false);
  const [semaphoreKey, setSemaphoreKey] = useState(()=>lsGet(LS_KEYS.SEMAPHORE_KEY,''));
  const [showSemaphoreKey, setShowSemaphoreKey] = useState(false);
  const [waToken, setWaToken]       = useState(()=>lsGet(LS_KEYS.WA_TOKEN,''));
  const [showWaToken, setShowWaToken] = useState(false);
  const [waPhoneId, setWaPhoneId]   = useState(()=>lsGet(LS_KEYS.WA_PHONE_ID,''));
  const [viberToken, setViberToken] = useState(()=>lsGet(LS_KEYS.VIBER_TOKEN,''));
  const [showViberToken, setShowViberToken] = useState(false);
  const [licKey, setLicKey]       = useState(()=>getLicense().licenseKey||'');
  const [licClinic, setLicClinic] = useState(()=>getLicense().clinicName||'');
  const [licMsg, setLicMsg]       = useState('');
  const [apptNotifCfg, setApptNotifCfg] = useState(getApptNotifCfg);
  const toggleApptNotifCh=(trigger,ch)=>{
    setApptNotifCfg(prev=>{
      const cur=prev[trigger]||[];
      const next={...prev,[trigger]:cur.includes(ch)?cur.filter(x=>x!==ch):[...cur,ch]};
      try{localStorage.setItem(LS_KEYS.APPT_NOTIF_CFG,JSON.stringify(next));}catch(e){}
      return next;
    });
  };
  const ALL_CH=[{id:'sms',label:'📱 SMS'},{id:'email',label:'📧 Email'},{id:'whatsapp',label:'💬 WhatsApp'},{id:'viber',label:'🟣 Viber'},{id:'messenger',label:'💙 Messenger'}];
  const TRIGGERS=[{id:'confirmation',label:'✅ Confirmation'},{id:'reminder',label:'⏰ 30-min Reminder'},{id:'cancellation',label:'❌ Cancellation'}];
  const fileInputRef = useRef(null);

  const saveGeminiKey = (v) => {
    setGeminiKey(v);
    lsSet(LS_KEYS.GEMINI_KEY, v.trim());
  };

  const totalRecords = patients.length + appointments.length + payments.length + notifications.length + reminders.length + reminderLog.length + (services||[]).length;

  const addLog = (msg, type)=>{
    const entry = {
      id: Date.now()+Math.random(),
      time: new Date().toLocaleTimeString(),
      message: msg,
      type: type || 'info',
    };
    setLog(prev => [entry, ...prev].slice(0, 20));
  };

  const saveUrl = (v)=>{
    setUrl(v);
    lsSet(LS_KEYS.SYNC_URL, v);
  };

  const isLocalUrl  = url && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/.test(url);
  const isValidUrl  = url && (isLocalUrl || /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec\b/.test(url));

  // Test connection
  const testConnection = async ()=>{
    if (!isValidUrl) { addToast('Enter a valid Apps Script URL first', 'error'); return; }
    setBusy('test');
    addLog('🔌 Testing connection…');
    try {
      const sep = url.includes('?') ? '&' : '?';
      const res = await fetch(url + sep + 'action=ping', { method:'GET', redirect:'follow' });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch(e) { throw new Error('Invalid response (not JSON). Did you deploy as "Anyone"?'); }
      if (data.ok && data.pong) {
        addLog('✅ Connected successfully', 'ok');
        addToast('Connection OK!', 'success');
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err) {
      addLog('❌ Connection failed: ' + err.message, 'err');
      addToast('Connection failed: ' + err.message, 'error');
    } finally {
      setBusy(null);
    }
  };

  // Push to Google Sheets
  const pushToSheets = async ()=>{
    if (!isValidUrl) { addToast('Enter a valid Apps Script URL first', 'error'); return; }
    setBusy('push');
    addLog('📤 Pushing ' + totalRecords + ' records to Google Sheets…');
    try {
      const blob = buildDataBlob(patients, appointments, payments, notifications, reminders, reminderLog, services);
      const res = await fetch(url, {
        method: 'POST',
        // Use text/plain to avoid CORS preflight (Apps Script accepts this)
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ data: blob }),
        redirect: 'follow',
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch(e) { throw new Error('Invalid response'); }
      if (data.ok) {
        const now = new Date().toLocaleString();
        setLastSync(now);
        lsSet(LS_KEYS.LAST_SYNC, now);
        addLog('✅ Pushed ' + Object.values(data.stats||{}).reduce((a,b)=>a+b,0) + ' rows', 'ok');
        addToast('Pushed to Google Sheets!', 'success');
      } else {
        throw new Error(data.error || 'Push failed');
      }
    } catch (err) {
      addLog('❌ Push failed: ' + err.message, 'err');
      addToast('Push failed: ' + err.message, 'error');
    } finally {
      setBusy(null);
    }
  };

  // Pull from Google Sheets
  const pullFromSheets = async ()=>{
    if (!isValidUrl) { addToast('Enter a valid Apps Script URL first', 'error'); return; }
    if (totalRecords > 5 && !confirm('Pulling will REPLACE all current data in this app with what\'s in Google Sheets. Continue?')) return;
    setBusy('pull');
    addLog('📥 Pulling data from Google Sheets…');
    try {
      const sep = url.includes('?') ? '&' : '?';
      const res = await fetch(url + sep + 'action=pull', { method:'GET', redirect:'follow' });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch(e) { throw new Error('Invalid response'); }
      if (data.ok) {
        // Merge Sheets data with local data to restore attachment images/Drive URLs
        // that were stripped before pushing (same logic as boot pull)
        const d = data.data || {};
        if (Array.isArray(d.patients)) {
          let localPatients = [];
          try { const ls = localStorage.getItem(LS_KEYS.PATIENTS); if (ls) localPatients = JSON.parse(ls) || []; } catch(e) {}
          const localById = {};
          localPatients.forEach(p => { localById[p.id] = p; });
          d.patients = d.patients.map(sp => {
            const lp = localById[sp.id];
            if (!lp) return sp;
            // Restore attachment dataUrls and drive fields that Sheets may have stripped
            const sheetAttIds = new Set((sp.attachments || []).map(a => a.id));
            const mergedAtts = (sp.attachments || []).map(sa => {
              const la = (lp.attachments || []).find(a => a.id === sa.id);
              if (!la) return sa;
              return {
                ...la,   // start with local (has all drive* fields + dataUrl)
                ...sa,   // overlay Sheets metadata (name, note, date, storage, etc.)
                // Prefer local dataUrl if Sheets stripped it, else keep Sheets value
                dataUrl: sa.dataUrl || la.dataUrl || '',
                // Restore drive fields from local if missing in Sheets copy
                driveFileId:       sa.driveFileId       || la.driveFileId       || '',
                driveEmbedUrl:     sa.driveEmbedUrl     || la.driveEmbedUrl     || '',
                driveViewUrl:      sa.driveViewUrl      || la.driveViewUrl      || '',
                driveThumbnailUrl: sa.driveThumbnailUrl || la.driveThumbnailUrl || '',
                driveDownloadUrl:  sa.driveDownloadUrl  || la.driveDownloadUrl  || '',
              };
            });
            const localOnlyAtts = (lp.attachments || []).filter(a => !sheetAttIds.has(a.id));
            // Same for history attachments
            const sheetHistIds = new Set((sp.history || []).map(h => h.id));
            const mergedHist = (sp.history || []).map(sh => {
              const lh = (lp.history || []).find(h => h.id === sh.id);
              if (!lh) return sh;
              const restoredAtts = (sh.attachments || []).map(sa => {
                const la = (lh.attachments || []).find(a => a.id === sa.id);
                if (!la) return sa;
                return {
                  ...la, ...sa,
                  dataUrl:           sa.dataUrl           || la.dataUrl           || '',
                  driveFileId:       sa.driveFileId       || la.driveFileId       || '',
                  driveEmbedUrl:     sa.driveEmbedUrl     || la.driveEmbedUrl     || '',
                  driveViewUrl:      sa.driveViewUrl      || la.driveViewUrl      || '',
                  driveThumbnailUrl: sa.driveThumbnailUrl || la.driveThumbnailUrl || '',
                  driveDownloadUrl:  sa.driveDownloadUrl  || la.driveDownloadUrl  || '',
                };
              });
              const localOnlyHistAtts = (lh.attachments || []).filter(a => !(sh.attachments||[]).some(x=>x.id===a.id));
              return {
                ...sh,
                scanImageUrl: sh.scanImageUrl || lh.scanImageUrl || '',
                attachments: [...restoredAtts, ...localOnlyHistAtts],
              };
            });
            const localOnlyHist = (lp.history || []).filter(h => !sheetHistIds.has(h.id));
            return {
              ...sp,
              photoDataUrl: sp.photoDataUrl || lp.photoDataUrl || '',
              attachments: [...mergedAtts, ...localOnlyAtts],
              history: [...mergedHist, ...localOnlyHist],
            };
          });
        }
        applyDataBlob(d, {setPatients, setAppointments, setPayments, setNotifications, setReminders, setReminderLog, setServices});
        const now = new Date().toLocaleString();
        setLastSync(now);
        lsSet(LS_KEYS.LAST_SYNC, now);
        const total = Object.values(data.data||{}).reduce((s,arr)=>s+(Array.isArray(arr)?arr.length:0),0);
        addLog('✅ Pulled ' + total + ' records', 'ok');
        addToast('Pulled from Google Sheets!', 'success');
      } else {
        throw new Error(data.error || 'Pull failed');
      }
    } catch (err) {
      addLog('❌ Pull failed: ' + err.message, 'err');
      addToast('Pull failed: ' + err.message, 'error');
    } finally {
      setBusy(null);
    }
  };

  // Export to Excel
  const exportExcel = ()=>{
    if (typeof XLSX === 'undefined') { addToast('Excel library not loaded', 'error'); return; }
    setBusy('export');
    addLog('📁 Building Excel file…');
    try {
      const wb = XLSX.utils.book_new();
      const tables = {
        patients: patients.map(p=>({...p, teeth: typeof p.teeth==='object'?JSON.stringify(p.teeth):p.teeth})),
        appointments: appointments,
        payments: payments,
        notifications: notifications,
        reminders: reminders.map(r=>({...r, channels: Array.isArray(r.channels)?r.channels.join(','):r.channels})),
        reminderLog: reminderLog,
        services: services || [],
      };
      Object.entries(tables).forEach(([name, rows])=>{
        if (rows.length === 0) {
          // Still create the sheet with headers for clarity
          XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['(empty)']]), name);
          return;
        }
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, name);
      });
      const stamp = localToday();
      const filename = 'cyrabell-dental-backup-' + stamp + '.xlsx';
      XLSX.writeFile(wb, filename);
      addLog('✅ Saved ' + filename, 'ok');
      addToast('Excel file downloaded!', 'success');
    } catch (err) {
      addLog('❌ Export failed: ' + err.message, 'err');
      addToast('Export failed', 'error');
    } finally {
      setBusy(null);
    }
  };

  // Import from Excel
  const importExcel = (e)=>{
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!confirm('Importing will REPLACE all current data with the contents of "' + file.name + '". Continue?')) {
      e.target.value = '';
      return;
    }
    setBusy('import');
    addLog('📂 Reading ' + file.name + '…');
    const reader = new FileReader();
    reader.onload = (ev)=>{
      try {
        const wb = XLSX.read(ev.target.result, { type: 'binary' });
        const blob = {};
        const tableNames = ['patients','appointments','payments','notifications','reminders','reminderLog'];
        tableNames.forEach(name=>{
          if (wb.SheetNames.indexOf(name) === -1) { blob[name] = []; return; }
          let rows = XLSX.utils.sheet_to_json(wb.Sheets[name]);
          // Fix up JSON columns
          if (name === 'patients') {
            rows = rows.map(p => ({...p, teeth: typeof p.teeth==='string'&&p.teeth.startsWith('{')?JSON.parse(p.teeth):(p.teeth||{})}));
          }
          if (name === 'reminders') {
            rows = rows.map(r => ({
              ...r,
              channels: typeof r.channels === 'string' ? r.channels.split(',').map(s=>s.trim()).filter(Boolean) : (r.channels||[]),
              active: r.active === true || r.active === 'true' || r.active === 'TRUE' || r.active === 1,
            }));
          }
          if (name === 'appointments') {
            rows = rows.map(a => ({
              ...a,
              arrived: a.arrived === true || a.arrived === 'true' || a.arrived === 'TRUE' || a.arrived === 1,
            }));
          }
          blob[name] = rows;
        });
        applyDataBlob(blob, {setPatients, setAppointments, setPayments, setNotifications, setReminders, setReminderLog, setServices});
        const total = Object.values(blob).reduce((s,arr)=>s+arr.length,0);
        addLog('✅ Imported ' + total + ' records', 'ok');
        addToast('Imported from Excel!', 'success');
      } catch (err) {
        addLog('❌ Import failed: ' + err.message, 'err');
        addToast('Import failed: ' + err.message, 'error');
      } finally {
        setBusy(null);
        e.target.value = '';
      }
    };
    reader.onerror = ()=>{
      addLog('❌ Could not read file', 'err');
      setBusy(null);
      e.target.value = '';
    };
    reader.readAsBinaryString(file);
  };

  // Auto-sync timer
  useEffect(()=>{
    lsSet(LS_KEYS.AUTO_SYNC, autoSync ? 'true' : 'false');
    if (!autoSync || !isValidUrl) return;
    const t = setInterval(()=>{
      if (!busy) pushToSheets();
    }, 5 * 60 * 1000); // every 5 minutes
    return ()=>clearInterval(t);
  }, [autoSync, isValidUrl, url, patients, appointments, payments, notifications, reminders, reminderLog, busy]);

  return h('div', null,
    h('div', {className:'ph'},
      h('div', null,
        h('div', {className:'ptl'}, '☁️ Sync & Backup'),
        h('div', {className:'psl'}, 'Google Sheets cloud sync & local Excel backup')
      )
    ),

    // Summary
    h('div', {className:'sg sg4'},
      [
        ['Total Records', totalRecords, '#e8f5f3', '#0a7c6e', '📊'],
        ['Patients', patients.length, '#e8eeff', '#3a7bd5', '👤'],
        ['Appointments', appointments.length, '#fff7e6', '#d97706', '📅'],
        ['Last Sync', lastSync ? lastSync.split(',')[0] : 'Never', '#f0e8ff', '#7c3aed', '🕐'],
      ].map(([l,v,bg,c,ic])=>
        h('div',{key:l,className:'sc'},
          h('div',{className:'si',style:{background:bg}}, h('span',{style:{fontSize:22}},ic)),
          h('div',{style:{minWidth:0}},
            h('div',{className:'sv',style:{fontSize:l==='Last Sync'?14:22}}, v),
            h('div',{className:'sl'}, l)
          )
        )
      )
    ),

    h('div', {className:'sync-grid'},

      // ───── License & Plan card ─────
      h('div', {className:'card', style:{borderTop:'3px solid #d4a017', gridColumn:'1/-1'}},
        h('div', {className:'ch'}, h('div', {className:'ct'}, '🏷️ License & Plan')),
        h('div', {className:'cb'},
          h('div',{style:{display:'flex',alignItems:'center',gap:12,marginBottom:16,flexWrap:'wrap'}},
            h('span',{style:{fontSize:28}},getCurrentPlan()==='clinic_pro'?'🏆':getCurrentPlan()==='professional'?'⭐':'🌱'),
            h('div',null,
              h('div',{style:{fontWeight:700,fontSize:16,color:'var(--dk)'}},(PLAN_NAMES[getCurrentPlan()]||'Starter')+' Plan'),
              h('div',{style:{fontSize:13,color:'var(--md)'}},PLAN_PRICES[getCurrentPlan()]||'₱599/mo'),
              getLicense().clinicName&&h('div',{style:{fontSize:12,color:'var(--md)'}},getLicense().clinicName)
            )
          ),
          h('div',{style:{display:'grid',gap:10,marginBottom:14}},
            h('input',{className:'inp',placeholder:'Clinic Name',value:licClinic,onInput:e=>setLicClinic(e.target.value)}),
            h('input',{className:'inp',placeholder:'License Key (e.g. CYRABELL-PROF-202612-XK9A-T3MWPQZR)',value:licKey,onInput:e=>setLicKey(e.target.value)})
          ),
          h('div',{style:{display:'flex',gap:8,flexWrap:'wrap'}},
            h('button',{className:'btn bp',onClick:async()=>{
              const key=(licKey||'').trim().toUpperCase();
              const name=(licClinic||'').trim();
              if(!key){setLicMsg('Please enter a license key.');return;}
              if(!name){setLicMsg('Please enter your clinic name.');return;}
              setLicMsg('⏳ Validating…');
              const result=await validateLicenseKey(key);
              if(!result.valid){setLicMsg('❌ '+result.error);return;}
              localStorage.setItem('cyrabell_license',JSON.stringify({plan:result.plan,licenseKey:key,clinicName:name,activatedAt:new Date().toISOString(),expiry:result.expiry}));
              setLicMsg('✅ License activated! Plan: '+(PLAN_NAMES[result.plan]||result.plan));
              addToast('License activated — '+PLAN_NAMES[result.plan],'ok');
            }},'✅ Activate License'),
            getLicense().plan&&h('button',{className:'btn bd',onClick:()=>{
              localStorage.removeItem('cyrabell_license');
              setLicKey('');setLicClinic('');
              setLicMsg('License cleared. Running in Starter mode.');
            }},'🗑 Clear License')
          ),
          licMsg&&h('p',{style:{marginTop:10,fontSize:13,color:licMsg.startsWith('✅')?'#22c55e':'var(--re)'}},licMsg),
          h('p',{style:{fontSize:12,color:'var(--md)',marginTop:10}},
            'Need a license? Contact ',h('a',{href:'mailto:hello@nexarch.dev',style:{color:'var(--accent)'}},'hello@nexarch.dev')
          )
        )
      ),

      // ───── Local Server toggle hint ─────
      isLocalUrl && h('div',{className:'card',style:{borderTop:'3px solid #22c55e',gridColumn:'1/-1'}},
        h('div',{className:'ch'},h('div',{className:'ct'},'🖥️ Local Server Mode')),
        h('div',{className:'cb'},
          h('p',{style:{fontSize:13,color:'var(--md)',marginBottom:8}},
            'Connected to local Node.js server at ',h('strong',null,url),'. All data is stored on your PC.'
          ),
          h('p',{style:{fontSize:12,color:'var(--md)'}},
            'To switch back to cloud, replace the URL with your Google Apps Script /exec URL.'
          )
        )
      ),

      // ───── Gemini API key card ─────
      h('div', {className:'card', style:{borderTop:'3px solid #4f8ef7'}},
        h('div', {className:'ch'}, h('div', {className:'ct'}, '⚡ Gemini OCR (Fast Mode)')),
        h('div', {className:'cb'},
          h('p',{style:{fontSize:13,color:'var(--md)',marginBottom:12,lineHeight:1.55}},
            h('strong',null,'Direct Gemini API key '),
            '= ',h('strong',{style:{color:'#4f8ef7'}},'5-10 second'),
            ' scans. Without it, OCR routes via Apps Script (~60-120s cold start).'
          ),
          h('div',{style:{fontWeight:700,fontSize:13,color:'var(--dk)',marginBottom:8,marginTop:4,borderTop:'1px solid var(--bd)',paddingTop:12}},'📨 Messaging API Keys (for automated sending)'),
          h(Field,{label:'📱 Semaphore API Key (SMS)'},
            h('div',{style:{display:'flex',gap:6}},
              h('input',{type:'password',className:'inp',value:semaphoreKey,onChange:e=>{setSemaphoreKey(e.target.value);lsSet(LS_KEYS.SEMAPHORE_KEY,e.target.value.trim());},placeholder:'Your Semaphore.co API key',style:{fontSize:12,fontFamily:'monospace',flex:1}}),
              h('button',{className:'btn bgh bsm',onClick:()=>setShowSemaphoreKey(s=>!s),style:{whiteSpace:'nowrap'}},showSemaphoreKey?'🙈 Hide':'👁 Show')
            ),
            semaphoreKey
              ? h('div',{style:{fontSize:11.5,color:'#22c55e',marginTop:4}},'✓ Semaphore key saved — SMS will send automatically via API')
              : h('div',{style:{fontSize:11,color:'var(--md)',marginTop:4,lineHeight:1.5}},'Get a free key at semaphore.co → register → Dashboard → API Key. Cost: ₱0.50–1.00/SMS')
          ),
          h(Field,{label:'💬 WhatsApp Business Token'},
            h('div',{style:{display:'flex',gap:6}},
              h('input',{type:'password',className:'inp',value:waToken,onChange:e=>{setWaToken(e.target.value);lsSet(LS_KEYS.WA_TOKEN,e.target.value.trim());},placeholder:'EAAxxxx… (Meta Business access token)',style:{fontSize:12,fontFamily:'monospace',flex:1}}),
              h('button',{className:'btn bgh bsm',onClick:()=>setShowWaToken(s=>!s),style:{whiteSpace:'nowrap'}},showWaToken?'🙈 Hide':'👁 Show')
            )
          ),
          h(Field,{label:'💬 WhatsApp Phone Number ID'},
            h('input',{className:'inp',value:waPhoneId,onChange:e=>{setWaPhoneId(e.target.value);lsSet(LS_KEYS.WA_PHONE_ID,e.target.value.trim());},placeholder:'1234567890 (from Meta Developer Console)',style:{fontSize:12,fontFamily:'monospace'}}),
            waToken&&waPhoneId
              ? h('div',{style:{fontSize:11.5,color:'#22c55e',marginTop:4}},'✓ WhatsApp Business API configured — messages will send automatically')
              : h('div',{style:{fontSize:11,color:'var(--md)',marginTop:4,lineHeight:1.5}},'Get from developers.facebook.com → My Apps → WhatsApp → API Setup. Free: 1,000 msgs/month')
          ),
          h(Field,{label:'🟣 Viber Bot Token'},
            planHas('viber')
              ? h(Fragment,null,
                  h('div',{style:{display:'flex',gap:6}},
                    h('input',{type:'password',className:'inp',value:viberToken,onChange:e=>{setViberToken(e.target.value);lsSet(LS_KEYS.VIBER_TOKEN,e.target.value.trim());},placeholder:'Viber Bot authentication token',style:{fontSize:12,fontFamily:'monospace',flex:1}}),
                    h('button',{className:'btn bgh bsm',onClick:()=>setShowViberToken(s=>!s),style:{whiteSpace:'nowrap'}},showViberToken?'🙈 Hide':'👁 Show')
                  ),
                  viberToken
                    ? h('div',{style:{fontSize:11.5,color:'#22c55e',marginTop:4}},'✓ Viber Bot token saved — Viber messages will send automatically')
                    : h('div',{style:{fontSize:11,color:'var(--md)',marginTop:4,lineHeight:1.5}},'Create a Viber Bot at partners.viber.com → get auth token')
                )
              : h('div',{style:{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:'#f8f8f8',borderRadius:8,border:'1px solid var(--bd)',opacity:0.6}},
                  h('span',{style:{fontSize:18}},'🔒'),
                  h('span',{style:{fontSize:12,color:'var(--md)'}},'Viber Bot Token — Available on Professional plan and above')
                )
          ),
          h(Field,{label:'Gemini API Key'},
            h('div',{style:{display:'flex',gap:6}},
              h('input',{
                type: showKey ? 'text' : 'password',
                value: geminiKey,
                onChange: e => saveGeminiKey(e.target.value),
                placeholder:'AIza… (get free key at aistudio.google.com)',
                style:{fontSize:12,fontFamily:'monospace',flex:1},
              }),
              h('button',{className:'btn bgh bsm',onClick:()=>setShowKey(s=>!s),style:{whiteSpace:'nowrap'}},
                showKey ? '🙈 Hide' : '👁 Show'
              )
            )
          ),
          geminiKey
            ? h('div',{style:{fontSize:12,color:'#22c55e',fontWeight:600,marginTop:-4,marginBottom:10}},
                '✓ Key saved — OCR will use direct Gemini (fast mode)'
              )
            : h('div',{style:{fontSize:11.5,color:'var(--md)',marginTop:-4,marginBottom:10,lineHeight:1.5}},
                '💡 Get a free API key at ',
                h('a',{href:'https://aistudio.google.com/app/apikey',target:'_blank',rel:'noopener',style:{color:'var(--pr)'}},
                  'aistudio.google.com/app/apikey'),
                ' — free tier: 15 scans/min, 1,500/day'
              ),
          geminiKey && h('button',{
            className:'btn bgh bsm',
            style:{width:'100%',justifyContent:'center'},
            onClick: async () => {
              addToast('Testing Gemini key…','info');
              try {
                // Use models list endpoint — does NOT consume any quota
                const url = 'https://generativelanguage.googleapis.com/v1beta/models?key=' + geminiKey.trim() + '&pageSize=5';
                const res = await fetch(url);
                if (res.ok) {
                  const d = await res.json();
                  const hasFlash = (d.models||[]).some(m => m.name && m.name.includes('flash'));
                  addToast('✅ Gemini key valid!' + (hasFlash ? ' Gemini Flash ready.' : ''), 'success');
                } else {
                  const t = await res.text();
                  const msg = res.status === 400 ? 'Invalid API key' : res.status === 403 ? 'API not enabled for this key' : 'Error ' + res.status;
                  addToast('❌ ' + msg + ': ' + t.substring(0,80), 'error');
                }
              } catch(e) { addToast('❌ Test failed: ' + e.message,'error'); }
            },
          }, '🔬 Test Gemini Key')
        )
      ),

      // ───── Auto-Notification Channels card ─────
      h('div',{className:'card'},
        h('div',{className:'ch'},h('div',{className:'ct'},'🔔 Auto-Notification Channels')),
        h('div',{className:'cb'},
          h('div',{style:{fontSize:13,color:'var(--md)',marginBottom:16,lineHeight:1.5}},
            'Choose which channels to use for each automatic notification trigger. Only channels with API credentials configured above will actually send.'),
          h('div',{style:{display:'flex',flexDirection:'column',gap:16}},
            TRIGGERS.map(tr=>
              h('div',{key:tr.id,style:{background:'var(--cr)',borderRadius:10,padding:'14px 16px',border:'1px solid var(--bd)'}},
                h('div',{style:{fontWeight:700,fontSize:13,color:'var(--t)',marginBottom:10}},tr.label),
                h('div',{style:{display:'flex',flexWrap:'wrap',gap:8}},
                  ALL_CH.map(ch=>{
                    const on=(apptNotifCfg[tr.id]||[]).includes(ch.id);
                    const locked=(ch.id==='viber'&&!planHas('viber'))||(ch.id==='messenger'&&!planHas('messenger'));
                    return h('button',{
                      key:ch.id,
                      type:'button',
                      onClick:locked?undefined:()=>toggleApptNotifCh(tr.id,ch.id),
                      disabled:locked,
                      title:locked?'Professional plan required':undefined,
                      style:{
                        padding:'7px 16px',borderRadius:50,fontSize:13,fontWeight:600,
                        cursor:locked?'not-allowed':'pointer',
                        border: locked ? '2px solid var(--bd)' : on ? '2px solid #0a7c6e' : '2px solid var(--bd)',
                        background: locked ? '#f0f0f0' : on ? '#0a7c6e' : '#fff',
                        color: locked ? '#aaa' : on ? '#fff' : 'var(--md)',
                        opacity: locked ? 0.5 : 1,
                        transition:'all .15s',
                        display:'flex',alignItems:'center',gap:5,
                        boxShadow: on&&!locked ? '0 2px 8px rgba(10,124,110,.3)' : 'none',
                      }
                    },
                      ch.label,
                      locked ? h('span',{style:{fontSize:12}},' 🔒') : on && h('span',{style:{fontSize:12,fontWeight:900}},' ✓')
                    );
                  })
                )
              )
            )
          ),
          h('div',{style:{marginTop:14,fontSize:12,color:'var(--md)',lineHeight:1.6}},
            '💡 Messenger uses a deep link (no token needed). SMS requires Semaphore key, Email requires Sync URL, WhatsApp requires WA Token + Phone ID, Viber requires Viber Token.')
        )
      ),

      // ───── Google Sheets card ─────
      h('div', {className:'card'},
        h('div', {className:'ch'}, h('div', {className:'ct'}, '☁️ Google Sheets')),
        h('div', {className:'cb'},
          h(Field, {label:'Apps Script Web App URL'},
            h('input', {
              type:'url',
              value:url,
              onChange:e=>saveUrl(e.target.value),
              placeholder:'https://script.google.com/macros/s/.../exec',
              style:{fontSize:12,fontFamily:'monospace'},
            })
          ),
          !url && h('div', {style:{fontSize:11.5,color:'var(--md)',marginTop:-6,marginBottom:10,lineHeight:1.5}},
            '💡 ',
            h('strong',null,"Don't have a URL yet?"),
            ' See ',h('code',{style:{background:'var(--cr)',padding:'1px 5px',borderRadius:4}},'SETUP.md'),' to set up your Google Sheet.'
          ),
          url && !isValidUrl && h('div', {style:{fontSize:12,color:'var(--re)',marginTop:-6,marginBottom:10}},
            '⚠ URL should look like: https://script.google.com/macros/s/.../exec'
          ),

          h('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:10}},
            h('button',{className:'btn bs bsm',onClick:testConnection,disabled:!isValidUrl||!!busy},
              busy==='test'?'…':'🔌 Test Connection'),
            h('button',{className:'btn bgh bsm',onClick:()=>window.open(url,'_blank'),disabled:!isValidUrl},
              '↗ Open URL')
          ),

          h('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:14}},
            h('button',{className:'btn bp',onClick:pushToSheets,disabled:!isValidUrl||!!busy,style:{justifyContent:'center'}},
              busy==='push'?'… Pushing':'📤 Push to Sheets'),
            h('button',{className:'btn bs',onClick:pullFromSheets,disabled:!isValidUrl||!!busy,style:{justifyContent:'center'}},
              busy==='pull'?'… Pulling':'📥 Pull from Sheets')
          ),

          h('label',{style:{display:'flex',alignItems:'center',gap:9,cursor:'pointer',padding:'10px 12px',background:'var(--cr)',borderRadius:9,fontSize:13,marginTop:8}},
            h('input',{type:'checkbox',checked:autoSync,onChange:e=>setAutoSync(e.target.checked),style:{width:16,height:16,marginBottom:0}}),
            h('div',{style:{flex:1}},
              h('div',{style:{fontWeight:600,textTransform:'none',letterSpacing:0,color:'var(--dk)'}},'Auto-push every 5 minutes'),
              h('div',{style:{fontSize:11,color:'var(--md)',marginTop:1}},'Keeps Google Sheets up to date automatically')
            )
          )
        )
      ),

      // ───── Excel card ─────
      h('div', {className:'card'},
        h('div', {className:'ch'}, h('div', {className:'ct'}, '📁 Local Excel Backup')),
        h('div', {className:'cb'},
          h('p',{style:{fontSize:13,color:'var(--md)',marginBottom:14,lineHeight:1.55}},
            'Download a full ',h('code',null,'.xlsx'),' snapshot with all data across 6 worksheet tabs, or import a previously exported file.'),
          h('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:10}},
            h('button',{className:'btn bg2',onClick:exportExcel,disabled:!!busy,style:{justifyContent:'center'}},
              busy==='export'?'…':'📁 Export to Excel'),
            h('button',{className:'btn bgh',onClick:()=>fileInputRef.current&&fileInputRef.current.click(),disabled:!!busy,style:{justifyContent:'center'}},
              busy==='import'?'…':'📂 Import Excel')
          ),
          h('input',{
            ref:fileInputRef,type:'file',accept:'.xlsx,.xls',
            onChange:importExcel,style:{display:'none'}
          }),
          h('div',{style:{fontSize:11.5,color:'var(--md)',marginTop:10,padding:'10px 12px',background:'var(--cr)',borderRadius:9,lineHeight:1.55}},
            '💡 ',h('strong',null,'Tip:'),' Push to Sheets daily; export to Excel weekly for an offline archive on your PC.')
        )
      )
    ),

    // ───── Sync log ─────
    log.length > 0 && h('div', {className:'card', style:{marginTop:14}},
      h('div',{className:'ch'},
        h('div',{className:'ct'},'📋 Sync Activity'),
        h('button',{className:'btn bgh bsm',onClick:()=>setLog([])},'Clear')
      ),
      h('div',{className:'cb'},
        h('div',{className:'sync-log'},
          log.map(e=>h('div',{key:e.id,className:'sync-log-entry '+(e.type==='ok'?'ok':e.type==='err'?'err':'')},
            h('span',{style:{fontSize:11,color:'var(--lt)',width:64,flexShrink:0}}, e.time),
            h('span',{style:{flex:1,fontSize:13}}, e.message)
          ))
        )
      )
    )
  ,
      h('div',{className:'card',style:{marginTop:8}},
        h('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}},
          h('div',{style:{fontWeight:700,fontSize:14}},'💾 Local Cache'),
          h('div',{style:{display:'flex',gap:6}},
            h('button',{className:'btn bg2 bsm',onClick:()=>{
              const ks=[LS_KEYS.PATIENTS,LS_KEYS.APPOINTMENTS,LS_KEYS.PAYMENTS,
                        LS_KEYS.NOTIFICATIONS,LS_KEYS.REMINDERS,LS_KEYS.REMINDER_LOG];
              addToast('Cache: '+ks.map(k=>{try{const v=localStorage.getItem(k);return k.replace('cyrabell_v2_','')+':'+(v?Math.round(v.length/1024)+'KB':'0');}catch(e){return '';}}).join(' '),  'info');
            }},'📊 Size'),
            h('button',{className:'btn bd2 bsm',onClick:()=>{
              if(!confirm('Clear local cache? Demo data will show until you log in again. Google Sheets is unaffected.')) return;
              [LS_KEYS.PATIENTS,LS_KEYS.APPOINTMENTS,LS_KEYS.PAYMENTS,
               LS_KEYS.NOTIFICATIONS,LS_KEYS.REMINDERS,LS_KEYS.REMINDER_LOG]
                .forEach(k=>{try{localStorage.removeItem(k);}catch(e){}});
              addToast('Cache cleared','info');
            }},'🗑 Clear')
          )
        ),
        h('div',{style:{fontSize:12,color:'var(--md)',lineHeight:1.7}},
          'All data (including attachments and images) is saved here automatically every 500ms. ',
          'Data persists across page refreshes without needing Google Sheets sync.'
        )
      ));
}


// ─── EXPORT (unchanged) ───────────────────────────────────────────────────────
function ExportPage({appointments,patients,payments}){
  const [busy,setBusy]=useState(null);
  const go=async(type,fmt)=>{
    setBusy(type+'-'+fmt);await new Promise(r=>setTimeout(r,300));
    const rh=k=>'<tr>'+k.map(x=>'<th>'+x+'</th>').join('')+'</tr>';
    const rb=(d,k)=>d.map(r=>'<tr>'+k.map(x=>'<td>'+(r[x]||'')+'</td>').join('')+'</tr>').join('');
    if(type==='appts'){
      const d=appointments.map(a=>({ID:a.id,Patient:a.patientName,Service:svcStr(a),Date:a.date,Time:a.time,Dentist:a.dentist,Status:a.status,Arrived:a.arrived?'Yes':'No',Fee:'₱'+a.fee}));
      const k=Object.keys(d[0]);
      if(fmt==='csv')expCSV(d,'appointments.csv');else if(fmt==='json')expJSON(d,'appointments.json');else printDoc('<h2>📅 Appointments</h2><table>'+rh(k)+rb(d,k)+'</table>','Appointments');
    }else if(type==='pats'){
      const d=patients.map(p=>{
        const issues = Object.entries(p.teeth||{}).filter(([_,v])=>v&&v!=='healthy').map(([k,v])=>'#'+k+':'+v).join(', ');
        return {ID:p.id,Name:p.name,Phone:p.phone,Email:p.email,Blood:p.bloodType,LastVisit:p.lastVisit,DentalIssues:issues||'None',Balance:'₱'+p.balance};
      });
      const k=Object.keys(d[0]);
      if(fmt==='csv')expCSV(d,'patients.csv');else if(fmt==='json')expJSON(d,'patients.json');else printDoc('<h2>👤 Patients</h2><table>'+rh(k)+rb(d,k)+'</table>','Patients');
    }else if(type==='pays'){
      const d=payments.map(p=>({Ref:p.ref,Patient:p.patientName,Service:svcStr(p),Amount:'₱'+p.amount,Method:p.method,Date:p.date,Status:p.status}));
      const k=Object.keys(d[0]);const tot=payments.filter(p=>p.status==='paid').reduce((s,p)=>s+p.amount,0);
      if(fmt==='csv')expCSV(d,'payments.csv');else if(fmt==='json')expJSON(d,'payments.json');else printDoc('<h2>💳 Payments</h2><table>'+rh(k)+rb(d,k)+'</table><p><strong>Total: ₱'+p$(tot)+'</strong></p>','Payments');
    }else{
      const tot=payments.filter(p=>p.status==='paid').reduce((s,p)=>s+p.amount,0);
      printDoc('<h2>Summary</h2><table><tr><th>Metric</th><th>Value</th></tr><tr><td>Patients</td><td>'+patients.length+'</td></tr><tr><td>Appointments</td><td>'+appointments.length+'</td></tr><tr><td>Pending</td><td>'+appointments.filter(a=>a.status==='pending').length+'</td></tr><tr><td>Revenue</td><td>₱'+p$(tot)+'</td></tr></table>','Full Report');
    }
    setBusy(null);
  };
  const Row=({label,desc,type})=>h('div',{className:'exp-row'},
    h('div',{style:{fontWeight:600,fontSize:13}},label,' ',h('span',{style:{fontWeight:400,fontSize:12,color:'var(--md)'}},desc)),
    h('div',{className:'exp-btns'},[['csv','📄 CSV'],['json','{ } JSON'],['print','🖨️ Print']].map(([f,l])=>
      h('button',{key:f,className:'btn bgh',onClick:()=>go(type,f),disabled:!!busy},busy===type+'-'+f?'…':l)
    ))
  );
  const stats=[['Patients',patients.length,'var(--t)'],['Appointments',appointments.length,'var(--bl)'],['Pending',appointments.filter(a=>a.status==='pending').length,'var(--or)'],['Checked-In Today',appointments.filter(a=>a.arrived&&a.date===localToday()).length,'#d97706'],['Revenue','₱'+p$(payments.filter(p=>p.status==='paid').reduce((s,p)=>s+p.amount,0)),'var(--go)'],['Outstanding','₱'+p$(patients.reduce((s,p)=>s+p.balance,0)),'var(--re)']];
  return h('div',null,
    h('div',{className:'ph'},h('div',null,h('div',{className:'ptl'},'Export & Reports'),h('div',{className:'psl'},'Download data in multiple formats'))),
    h('div',{className:'eg',style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}},
      h('div',{className:'card'},h('div',{className:'ch'},h('div',{className:'ct'},'Export Data')),h('div',{className:'cb'},
        h(Row,{label:'📅 Appointments',desc:appointments.length+' records (incl. check-in status)',type:'appts'}),
        h(Row,{label:'👤 Patients',desc:patients.length+' records',type:'pats'}),
        h(Row,{label:'💳 Payments',desc:payments.length+' records',type:'pays'}),
        h('div',{style:{borderTop:'1px solid var(--bd)',paddingTop:16,marginTop:4}},
          h('button',{className:'btn bp',style:{width:'100%'},onClick:()=>go('full','print'),disabled:!!busy},h(Svg,{d:IC.file,size:14}),' Full PDF Report')
        )
      )),
      h('div',{className:'card'},h('div',{className:'ch'},h('div',{className:'ct'},'Live Snapshot')),h('div',{className:'cb'},
        stats.map(([l,v,c])=>h('div',{key:l,style:{display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:'1px solid var(--bd)',fontSize:13}},h('span',{style:{color:'var(--md)'}},l),h('span',{style:{fontWeight:700,color:c}},v)))
      ))
    )
  );
}

