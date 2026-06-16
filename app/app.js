// 🛡️ REACT ERROR BOUNDARY — Catches errors in component tree
// ═══════════════════════════════════════════════════════════════════════════
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error: error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
    this.setState({ errorInfo: errorInfo });
    if (typeof window.__cyrabellShowError === 'function') {
      window.__cyrabellShowError(
        'React render error: ' + (error.message || error),
        (errorInfo && errorInfo.componentStack ? errorInfo.componentStack.split('\n').slice(0,5).join('\n') : '')
      );
    }
  }
  reset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };
  render() {
    if (this.state.hasError) {
      const err = this.state.error;
      const stack = this.state.errorInfo && this.state.errorInfo.componentStack ? this.state.errorInfo.componentStack : '';
      return h('div', {
        style: {
          padding: 24, margin: 20,
          background: '#fef2f2', border: '2px solid #dc2626',
          borderRadius: 12, fontFamily: 'system-ui, sans-serif',
          maxWidth: 800, margin: '40px auto',
        }
      },
        h('div', {style: {fontSize: 22, fontWeight: 700, marginBottom: 12, color: '#991b1b'}}, '⚠️ Something went wrong'),
        h('div', {style: {fontSize: 14, marginBottom: 14, color: '#7f1d1d'}}, this.props.fallbackMessage || 'A component crashed while rendering. The error has been captured below.'),
        h('div', {style: {background: '#fff', padding: 12, borderRadius: 8, fontFamily: 'monospace', fontSize: 12, color: '#991b1b', marginBottom: 14, overflow: 'auto', maxHeight: 200}},
          h('div', {style: {fontWeight: 700, marginBottom: 6}}, err && err.message ? err.message : String(err)),
          stack && h('pre', {style: {fontSize: 10.5, opacity: 0.8, margin: 0, whiteSpace: 'pre-wrap'}}, stack.substring(0, 1500))
        ),
        h('div', {style: {display: 'flex', gap: 10}},
          h('button', {
            onClick: this.reset,
            style: {padding: '8px 16px', background: '#0a7c6e', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600}
          }, '↻ Try again'),
          h('button', {
            onClick: () => window.location.reload(),
            style: {padding: '8px 16px', background: '#6b7280', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600}
          }, '🔄 Reload page'),
          h('button', {
            onClick: () => {
              if (confirm('Clear local storage and reload? This will reset all settings (sync URL, preferences).')) {
                try { localStorage.clear(); } catch(e) {}
                window.location.reload();
              }
            },
            style: {padding: '8px 16px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600}
          }, '🗑️ Clear settings & reload')
        )
      );
    }
    return this.props.children;
  }
}


function App(){
  // 'login' | 'admin' | 'kiosk' | 'booking'
  const [view,setView]=useState('login');
  const [user,setUser]=useState(null);
  const logoutRef = useRef(null);
  const [patients,setPatients]=useState(()=>{try{const s=localStorage.getItem(LS_KEYS.PATIENTS);if(s){const d=JSON.parse(s);if(Array.isArray(d)&&d.length>0)return d;}}catch(e){}return INIT_P;});
  const [appointments,setAppointments]=useState(()=>{try{const s=localStorage.getItem(LS_KEYS.APPOINTMENTS);if(s){const d=JSON.parse(s);if(Array.isArray(d))return d;}}catch(e){}return INIT_A;});
  const [payments,setPayments]=useState(()=>{try{const s=localStorage.getItem(LS_KEYS.PAYMENTS);if(s){const d=JSON.parse(s);if(Array.isArray(d))return d;}}catch(e){}return INIT_PAY;});
  const [notifications,setNotifications]=useState(()=>{try{const s=localStorage.getItem(LS_KEYS.NOTIFICATIONS);if(s){const d=JSON.parse(s);if(Array.isArray(d))return d;}}catch(e){}return INIT_N;});
  const [reminders,setReminders]=useState(()=>{try{const s=localStorage.getItem(LS_KEYS.REMINDERS);if(s){const d=JSON.parse(s);if(Array.isArray(d))return d;}}catch(e){}return INIT_REMINDERS;});
  const [reminderLog,setReminderLog]=useState(()=>{try{const s=localStorage.getItem(LS_KEYS.REMINDER_LOG);if(s){const d=JSON.parse(s);if(Array.isArray(d))return d;}}catch(e){}return INIT_REMINDER_LOG;});
  const [toasts,setToasts]=useState([]);
  const syncUrl = (function(){try{return localStorage.getItem(LS_KEYS.SYNC_URL)||'';}catch(e){return '';}})();

  // ───── INITIAL PULL: Google Sheets is the source of truth ─────
  // bootState: 'pulling' | 'ready' | 'no-sync' | 'pull-failed'
  const [bootState, setBootState] = useState(()=>{
    let syncUrl = '';
    try { syncUrl = localStorage.getItem(LS_KEYS.SYNC_URL) || ''; } catch (e) {}
    return syncUrl ? 'pulling' : 'no-sync';
  });
  const [bootError, setBootError] = useState('');
  // Auto-sync is BLOCKED until initial pull completes (or user manually
  // overrides). This prevents overwriting Sheets with the demo INIT_* data
  // on every page reload.
  const autoSyncReadyRef = useRef(false);

  // Run the initial pull ONCE on mount
  useEffect(() => {
    let syncUrl = '';
    try { syncUrl = localStorage.getItem(LS_KEYS.SYNC_URL) || ''; } catch (e) {}

    if (!syncUrl) {
      asLog('boot:no-sync-url-configured');
      setBootState('no-sync');
      // No sync URL → safe to allow local edits; but never auto-push (no URL)
      autoSyncReadyRef.current = true;
      return;
    }

    // ── Initial data pull from Google Sheets ─────────────────────────────
    // This is the single most important boot operation.
    // The result determines whether the app renders real data or demo data.
    // All auto-sync is BLOCKED until this completes.
    asLog('boot:initial-pull-start', { url: syncUrl.substring(0, 50) + '...' });

    (async () => {
      try {
        const sep = syncUrl.includes('?') ? '&' : '?';
        const res = await fetch(syncUrl + sep + 'action=pull', {
          method: 'GET', redirect: 'follow'
        });
        const text = await res.text();
        let result;
        try { result = JSON.parse(text); }
        catch (e) {
          throw new Error('Bad response from Apps Script (not JSON). Check deployment.');
        }
        if (!result.ok) throw new Error(result.error || 'Pull failed');

        const data = result.data || {};
        asLog('boot:pull-success', {
          patients: (data.patients||[]).length,
          appointments: (data.appointments||[]).length,
          payments: (data.payments||[]).length,
          notifications: (data.notifications||[]).length,
          reminders: (data.reminders||[]).length,
          reminderLog: (data.reminderLog||[]).length,
        });
        // Update localStorage cache with fresh Sheets data
        try {
          if(data.patients)      localStorage.setItem(LS_KEYS.PATIENTS,      JSON.stringify(data.patients));
          if(data.appointments)  localStorage.setItem(LS_KEYS.APPOINTMENTS,  JSON.stringify(data.appointments));
          if(data.payments)      localStorage.setItem(LS_KEYS.PAYMENTS,      JSON.stringify(data.payments));
          if(data.notifications) localStorage.setItem(LS_KEYS.NOTIFICATIONS, JSON.stringify(data.notifications));
          if(data.reminders)     localStorage.setItem(LS_KEYS.REMINDERS,     JSON.stringify(data.reminders));
          if(data.reminderLog)   localStorage.setItem(LS_KEYS.REMINDER_LOG,   JSON.stringify(data.reminderLog));
        } catch(e) { console.warn('[boot] localStorage cache update failed:', e.message); }

        // Detect first-time-empty: if every table is empty, seed with demo data
        // by enabling auto-sync to push. Otherwise replace local state.
        const totalRows = (data.patients||[]).length + (data.appointments||[]).length +
                          (data.payments||[]).length + (data.notifications||[]).length +
                          (data.reminders||[]).length + (data.reminderLog||[]).length;

        if (totalRows === 0) {
          asLog('boot:sheets-empty-keeping-demo-data');
          // Keep INIT_* demo data, allow auto-sync to seed Sheets
          autoSyncReadyRef.current = true;
          setBootState('ready');
        } else {
          // Normalize: clean any 1899-12-30 corrupted values that may be in old data
          const fixTimeStr = (v) => {
            if (!v) return v;
            if (typeof v === 'string') {
              if (v.indexOf('1899-12-30') === 0) {
                const m = v.match(/T(\d{1,2}):(\d{2})/);
                return m ? (String(m[1]).padStart(2,'0') + ':' + m[2]) : '';
              }
              if (v.length > 10 && v.indexOf('T') === 10) {
                const m = v.match(/T(\d{1,2}):(\d{2})/);
                return m ? (String(m[1]).padStart(2,'0') + ':' + m[2]) : v;
              }
            }
            return v;
          };
          const fixDateStr = (v) => {
            if (!v) return v;
            if (typeof v === 'string') {
              if (v.indexOf('1899-12-30') === 0) return '';
              if (v.length > 10 && v.indexOf('T') === 10) return v.substring(0, 10);
            }
            return v;
          };
          const cleanedAppts = (data.appointments||[]).map(a => ({
            ...a,
            date: fixDateStr(a.date),
            time: fixTimeStr(a.time)
          }));
          const cleanedPays = (data.payments||[]).map(p => ({
            ...p, date: fixDateStr(p.date)
          }));
          const cleanedPatients = dedupePatients(
            (data.patients||[]).map(p => ({
              ...p, dob: fixDateStr(p.dob), lastVisit: fixDateStr(p.lastVisit)
            }))
          );
          const cleanedReminders = (data.reminders||[]).map(r => ({
            ...r, lastSent: fixDateStr(r.lastSent), nextDue: fixDateStr(r.nextDue)
          }));

          // Replace local state with sheet data (sheets is source of truth).
          // IMPORTANT: Sheets strips images >30KB before pushing, so the pulled
          // patients will have empty dataUrl fields. We merge Sheets metadata with
          // locally-stored images so attachments survive a page refresh.
          if (Array.isArray(data.patients)) {
            let localPatients = [];
            try {
              const ls = localStorage.getItem(LS_KEYS.PATIENTS);
              if (ls) localPatients = JSON.parse(ls) || [];
            } catch(e) {}
            // Build a quick lookup: patientId → local attachment/history arrays (with images)
            const localById = {};
            localPatients.forEach(p => { localById[p.id] = p; });
            // Merge: take all metadata from Sheets, but restore local dataUrls where Sheets stripped them
            const mergedPatients = cleanedPatients.map(sp => {
              const lp = localById[sp.id];
              if (!lp) return sp;
              // Restore attachment dataUrls that Sheets stripped
              const sheetAttIds = new Set((sp.attachments || []).map(a => a.id));
              const mergedAtts = (sp.attachments || []).map(sa => {
                if (sa.dataUrl) return sa; // Sheets has the data (small file) — keep it
                const la = (lp.attachments || []).find(a => a.id === sa.id);
                return la ? {...sa, dataUrl: la.dataUrl || ''} : sa;
              });
              // Preserve local-only attachments not yet pushed to Sheets
              const localOnlyAtts = (lp.attachments || []).filter(a => !sheetAttIds.has(a.id));
              const finalAtts = [...mergedAtts, ...localOnlyAtts];
              // Restore history scanImageUrls and nested attachment dataUrls
              const sheetHistIds = new Set((sp.history || []).map(h => h.id));
              const mergedHist = (sp.history || []).map(sh => {
                const lh = (lp.history || []).find(h => h.id === sh.id);
                if (!lh) return sh;
                const restoredAtts = (sh.attachments || []).map(sa => {
                  if (sa.dataUrl) return sa;
                  const la = (lh.attachments || []).find(a => a.id === sa.id);
                  return la ? {...sa, dataUrl: la.dataUrl || ''} : sa;
                });
                return {
                  ...sh,
                  scanImageUrl: sh.scanImageUrl || lh.scanImageUrl || '',
                  attachments: restoredAtts,
                };
              });
              // Preserve local-only history entries not yet pushed to Sheets
              const localOnlyHist = (lp.history || []).filter(h => !sheetHistIds.has(h.id));
              const finalHist = [...mergedHist, ...localOnlyHist];
              // Restore patient photo if Sheets stripped it
              return {
                ...sp,
                photoDataUrl: sp.photoDataUrl || lp.photoDataUrl || '',
                attachments: finalAtts,
                history: finalHist,
              };
            });
            setPatients(mergedPatients);
          }
          if (Array.isArray(data.appointments))  setAppointments(cleanedAppts);
          if (Array.isArray(data.payments))      setPayments(cleanedPays);
          if (Array.isArray(data.notifications)) setNotifications(data.notifications);
          if (Array.isArray(data.reminders))     setReminders(cleanedReminders);
          if (Array.isArray(data.reminderLog))   setReminderLog(data.reminderLog);
          asLog('boot:applied-sheet-data', { cleanedAppts: cleanedAppts.length });
          // Trigger reminder auto-send AFTER state has been applied
          setTimeout(() => {
            runDailyReminderTrigger(cleanedReminders, cleanedPatients, setReminders, setReminderLog, addToast);
          }, 2000);
          // Unlock auto-sync AFTER React applies the setState
          setTimeout(() => {
            autoSyncReadyRef.current = true;
            asLog('boot:auto-sync-unlocked');
          }, 500);
          setBootState('ready');
        }
      } catch (err) {
        const errMsg = (err && err.message) ? err.message : String(err);
        asLog('boot:pull-failed', errMsg);
        setBootError(errMsg);
        setBootState('pull-failed');
        if (typeof window.__cyrabellShowError === 'function' && errMsg.length < 200) {
          // Don't show banner for network errors that are already shown in boot screen
          if (!errMsg.includes('fetch') && !errMsg.includes('NetworkError')) {
            window.__cyrabellShowError('Initial pull error: ' + errMsg);
          }
        }
        // Keep auto-sync BLOCKED — don't overwrite Sheets with demo data
        // User must explicitly click "Use local data" or fix the connection
      }
    })();
  }, []);  // empty deps — run exactly once

  // ─────────────────────────────────────────────────────────────────────────
  // REMINDER PERIODIC TRIGGER
  //
  // Runs every 6 hours while the app tab is open.
  // Sends all reminders with nextDue <= today (Philippines timezone).
  // The daily lock (localStorage.cyrabell_reminder_last_run) prevents
  // double-sending if the app is refreshed multiple times in one day.
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;  // Only run while logged in
    const interval = setInterval(() => {
      runDailyReminderTrigger(reminders, patients, setReminders, setReminderLog, addToast);
    }, 6 * 60 * 60 * 1000); // 6 hours
    return () => clearInterval(interval);
  }, [user, reminders, patients]);

  // ─────────────────────────────────────────────────────────────────────────
  // 30-MINUTE PRE-APPOINTMENT REMINDER: checks every minute, sends once per
  // appointment (tracked in sessionStorage to survive re-renders but reset on
  // page reload so staff don't get duplicate reminders across days).
  useEffect(()=>{
    const sentKey='cyrabell_30min_sent';
    const getSent=()=>{try{return JSON.parse(sessionStorage.getItem(sentKey)||'[]');}catch(e){return [];}};
    const markSent=(id)=>{const s=getSent();s.push(id);try{sessionStorage.setItem(sentKey,JSON.stringify(s));}catch(e){}};
    const check=()=>{
      const now=new Date();
      const today2=localToday();
      const sent=getSent();
      (appointments||[]).forEach(a=>{
        if(a.date!==today2) return;
        if(a.status==='cancelled'||a.status==='completed') return;
        if(sent.includes(a.id)) return;
        if(!a.time) return;
        const [hh,mm]=(a.time).split(':').map(Number);
        const apptMs=new Date(now.getFullYear(),now.getMonth(),now.getDate(),hh,mm).getTime();
        const diffMin=(apptMs-now.getTime())/60000;
        if(diffMin>=28&&diffMin<=32){
          markSent(a.id);
          sendApptNotif('reminder',a,syncUrl,setNotifications);
        }
      });
    };
    const t=setInterval(check,60000);
    return ()=>clearInterval(t);
  },[appointments,syncUrl]);

  // ─────────────────────────────────────────────────────────────────────────
  // AUTO-SYNC: push to Google Sheets on every data change.
  //
  // Design notes:
  //   - Gated by autoSyncReadyRef, which is only TRUE after the initial pull
  //     succeeds. This prevents overwriting Sheets with demo INIT_* data.
  //   - Uses a 2-second debounce via scheduleAutoSync() so rapid edits
  //     (e.g., typing in a text field) don't flood the Apps Script endpoint.
  //   - A Web Worker handles the actual fetch() off the main thread.
  //   - Skips sync while user is not logged in (prevents leaking draft data).
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!autoSyncReadyRef.current) {
      asLog('app:auto-sync-blocked-until-pull-complete');
      return;
    }
    if (!user) return;  // never sync from login screen

    let syncUrl = '';
    try { syncUrl = localStorage.getItem(LS_KEYS.SYNC_URL) || ''; } catch (e) {}
    let autoEnabled = true;
    try { autoEnabled = localStorage.getItem(LS_KEYS.AUTO_SYNC) !== 'false'; } catch (e) {}
    if (!autoEnabled) {
      asLog('app:auto-disabled');
      return;
    }
    if (!syncUrl) {
      asLog('app:no-sync-url');
      return;
    }
    asLog('app:data-changed', {
      p: patients.length, a: appointments.length, pay: payments.length,
      n: notifications.length, r: reminders.length, rl: reminderLog.length
    });
    // Strip large base64 fields before sync to stay under Sheets cell limits (~50KB).
    // Photos are stored in Drive. Attachments/history images stay local only.
    // We keep all metadata (names, dates, notes, sizes) — just drop the raw blob data.
    const STRIP_THRESHOLD = 30 * 1024; // 30KB — aggressive strip for reliability
    const stripDataUrl = (url) => {
      if (!url || typeof url !== 'string') return url;
      if (url.length > STRIP_THRESHOLD) return '';   // strip large base64
      return url;
    };
    const patientsForSync = patients.map(p => {
      const {photoDataUrl: _drop, ...rest} = p;
      // Strip large dataUrls inside attachments array
      if (rest.attachments && rest.attachments.length) {
        rest.attachments = rest.attachments.map(a => ({
          ...a,
          dataUrl: stripDataUrl(a.dataUrl),
        }));
      }
      // Strip large scanImageUrls and nested attachment dataUrls inside history array
      if (rest.history && rest.history.length) {
        rest.history = rest.history.map(h => ({
          ...h,
          scanImageUrl: stripDataUrl(h.scanImageUrl),
          // Strip dataUrls inside history entries that came from appointment cross-save
          attachments: h.attachments ? h.attachments.map(a => ({
            ...a,
            dataUrl: stripDataUrl(a.dataUrl),
          })) : h.attachments,
        }));
      }
      return rest;
    });
    // Strip attachment dataUrls from appointments too (same 30KB limit)
    const appointmentsForSync = appointments.map(a => {
      if (!a.attachments || !a.attachments.length) return a;
      return {
        ...a,
        attachments: a.attachments.map(att => ({
          ...att,
          dataUrl: stripDataUrl(att.dataUrl),
        }))
      };
    });
    scheduleAutoSync(syncUrl, {
      patients: patientsForSync,
      appointments: appointmentsForSync,
      payments, notifications, reminders, reminderLog,
      services: getActiveSvcs(),
    }, 2000);
  }, [patients, appointments, payments, notifications, reminders, reminderLog, user]);
  // ── Auto-save full state to localStorage (preserves attachments/images) ──
  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(LS_KEYS.PATIENTS,      JSON.stringify(patients));
        localStorage.setItem(LS_KEYS.APPOINTMENTS,  JSON.stringify(appointments));
        localStorage.setItem(LS_KEYS.PAYMENTS,      JSON.stringify(payments));
        localStorage.setItem(LS_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
        localStorage.setItem(LS_KEYS.REMINDERS,     JSON.stringify(reminders));
        localStorage.setItem(LS_KEYS.REMINDER_LOG,   JSON.stringify(reminderLog));
      } catch(e) {
        // Quota exceeded — only strip patient profile photos (large, re-uploadable).
        // NEVER strip attachment dataUrls — those are the user's clinical files and
        // cannot be re-created if lost. If quota is still exceeded after photo strip,
        // warn the user rather than silently deleting their files.
        try {
          const slim = patients.map(p => ({
            ...p,
            // Strip large profile photo (re-uploadable)
            photoDataUrl: (p.photoDataUrl && p.photoDataUrl.length > 51200) ? '' : (p.photoDataUrl || ''),
            // Strip large scanImageUrls from history (base64 scans can be 500KB+)
            // Drive attachment driveEmbedUrls are short URLs — never stripped
            history: safe(p.history).map(h => ({
              ...h,
              scanImageUrl: (h.scanImageUrl && h.scanImageUrl.length > 51200) ? '' : (h.scanImageUrl || ''),
            })),
          }));
          localStorage.setItem(LS_KEYS.PATIENTS,      JSON.stringify(slim));
          localStorage.setItem(LS_KEYS.APPOINTMENTS,  JSON.stringify(appointments));
          localStorage.setItem(LS_KEYS.PAYMENTS,      JSON.stringify(payments));
          localStorage.setItem(LS_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
          localStorage.setItem(LS_KEYS.REMINDERS,     JSON.stringify(reminders));
          localStorage.setItem(LS_KEYS.REMINDER_LOG,   JSON.stringify(reminderLog));
          console.warn('[localsave] Stripped large profile photos to fit storage quota; attachments preserved');
        } catch(e2) {
          if (e2 && (e2.name === 'QuotaExceededError' || e2.code === 22)) {
            addToast('⚠️ Storage almost full — export your data or remove unused attachments to free space', 'error');
          }
          console.warn('[localsave] Storage full:', e2.message);
        }
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [patients, appointments, payments, notifications, reminders, reminderLog, user]);


  // (duplicate localStorage save effect removed — the single effect above handles all saves)



  const addToast=(msg,type)=>{
    const id=Date.now()+Math.random();
    setToasts(p=>[...p,{id,message:msg,type:type||'info'}]);
    setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),3500);
  };

  const handleAuth=(authedUser, plainPwd)=>{
    setUser(authedUser);
    setView('admin');
    // Derive AES-256-GCM key from password for PHI encryption (Finding #3)
    if (CONFIG.ENCRYPT_LOCALSTORAGE && plainPwd) {
      initCryptoKey(plainPwd).catch(e => console.warn('[crypto] init failed', e));
    }
    // Run data migration to fill in any new required fields (Finding #22)
    // We do this here so the migrated data gets persisted on the next save cycle
    setPatients(prev => {
      const result = runDataMigration(prev, [], [], []);
      return result.patients;
    });
    setAppointments(prev => {
      const result = runDataMigration([], prev, [], []);
      return result.appointments;
    });
    // Start inactivity timeout — clears session after CONFIG.SESSION_TIMEOUT_MS
    startSessionTimer(function(){
      addToast('Session expired due to inactivity.','info');
      if(logoutRef.current) logoutRef.current();
    });
    addToast('Welcome back, '+(authedUser.name||authedUser.username)+'!','success');
  };
  const handleLogout=()=>{
    clearCryptoKey(); // clear in-memory encryption key on logout (Finding #3)
    stopSessionTimer();
    setUser(null);
    setView('login');
    addToast('Logged out successfully','info');
  };
  const handleBook=(appt,pd)=>{
    // Dedupe: check if patient already exists (by name+phone+email)
    const existingPat = findExistingPatient(patients, pd);
    if (existingPat) {
      // Link the booking to the existing patient record (no duplicate patient created)
      appt.patientId = existingPat.id;
      appt.patientName = existingPat.name;
      if (typeof asLog === 'function') {
        asLog('booking:matched-existing-patient', { id: existingPat.id, name: existingPat.name });
      }
    } else {
      // New patient — create the record
      setPatients(p=>[{id:appt.patientId,name:pd.name,dob:pd.dob||'',phone:pd.phone,email:pd.email||'',address:pd.address||'',bloodType:pd.bloodType||'O+',allergies:'',lastVisit:'—',balance:0,teeth:{}},...p]);
    }
    setAppointments(p=>[appt,...p]);
    addToast('Booking received from '+pd.name+'!','success');
  };
  const handleCheckIn=(apptId)=>{
    setAppointments(prev=>prev.map(a=>a.id===apptId?{...a,arrived:true}:a));
    addToast('Patient checked in!','success');
  };

  // Boot screen — block UI while pulling from Sheets on startup
  if (bootState === 'pulling') {
    return h('div', {className: 'boot-screen'},
      h('div', {className: 'boot-card'},
        h('div', {className: 'login-logo'},
          h(BrandLogo, {dark: false, width: 220})
        ),
        h('div', {className: 'boot-spinner'}),
        h('div', {className: 'boot-status'}, '☁️ Loading data from Google Sheets…'),
        h('div', {className: 'boot-hint'}, 'Google Sheets is the source of truth'),
        h('div', {className: 'nexarch-badge', style: {marginTop: 16}},
          h('span', null, 'POWERED BY:'),
          h('img', {src: CYRABELL_LOGO, alt: 'Cyrabell', className: 'nexarch-logo-sm'}),
          h('div', {className: 'badge-brand'}, 'CYRABELL'),
          h('div', {className: 'badge-tagline'}, 'Systems Engineering Solution')
        )
      )
    );
  }

  if (bootState === 'pull-failed') {
    return h('div', {className: 'boot-screen'},
      h('div', {className: 'boot-card'},
        h('div', {className: 'login-logo'},
          h(BrandLogo, {dark: false, width: 220})
        ),
        h('div', {className: 'boot-title'}, 'Cannot reach Google Sheets'),
        h('div', {className: 'boot-status', style: {color: '#e05252'}}, bootError || 'Network error'),
        h('div', {className: 'boot-hint'},
          'The app cannot start with stale data — that would risk overwriting your real records.'
        ),
        h('div', {className: 'boot-actions'},
          h('button', {
            className: 'btn bp',
            onClick: () => window.location.reload()
          }, '🔄 Retry'),
          h('button', {
            className: 'btn bgh',
            onClick: () => {
              if (!confirm('Continue with LOCAL demo data only? Auto-sync to Sheets will stay disabled until you fix the connection. Your edits will NOT be saved to Google Sheets.')) return;
              autoSyncReadyRef.current = false;  // keep blocked
              setBootState('no-sync');
            }
          }, 'Use local data (offline mode)')
        ),
        h('div', {className: 'nexarch-badge', style: {marginTop: 16}},
          h('span', null, 'POWERED BY:'),
          h('img', {src: CYRABELL_LOGO, alt: 'Cyrabell', className: 'nexarch-logo-sm'}),
          h('div', {className: 'badge-brand'}, 'CYRABELL'),
          h('div', {className: 'badge-tagline'}, 'Systems Engineering Solution')
        )
      )
    );
  }

  // bootState === 'ready' or 'no-sync' — continue to normal flow

  if(view==='login') return h(Fragment,null,
    h(LoginScreen,{
      onAuth:handleAuth,
      onPickKiosk:()=>setView('kiosk'),
      onPublicBooking:()=>setView('booking')
    }),
    h(Toast,{toasts,rm:id=>setToasts(p=>p.filter(t=>t.id!==id))})
  );

  if(view==='kiosk') return h(Fragment,null,
    h(KioskMode,{
      appointments,
      setAppointments,
      onCheckIn:handleCheckIn,
      onExit:()=>setView(user?'admin':'login'),
      addToast,
      patients,
      setPatients,
      syncUrl,
    }),
    h(Toast,{toasts,rm:id=>setToasts(p=>p.filter(t=>t.id!==id))})
  );

  if(view==='booking') return h(Fragment,null,
    h(PublicBooking,{
      onBook:handleBook,
      onBack:()=>setView('login'),
      existingAppointments:appointments,
      patients:patients,
      onAddPatient:(np)=>setPatients(prev=>[np,...prev.filter(x=>x.id!==np.id)]),
    }),
    h(Toast,{toasts,rm:id=>setToasts(p=>p.filter(t=>t.id!==id))})
  );

  // view === 'admin' — protected. If user got cleared, show login (no state mutation during render).
  if(!user){
    // Use effect to fix the state — never call setState during render
    return h(LoginScreen,{
      onAuth:handleAuth,
      onPickKiosk:()=>setView('kiosk'),
      onPublicBooking:()=>setView('booking')
    });
  }

  return h(Fragment,null,
    h(ErrorBoundary, {fallbackMessage: 'The admin panel crashed. Your data is safe in Google Sheets.'},
      h(AdminPanel,{
      user,onLogout:handleLogout,
      patients,setPatients,
      appointments,setAppointments,
      payments,setPayments,
      notifications,setNotifications,
      reminders,setReminders,
      reminderLog,setReminderLog,
      addToast,
      onGoKiosk:()=>setView('kiosk')
      })
    ),
    h(Toast,{toasts,rm:id=>setToasts(p=>p.filter(t=>t.id!==id))})
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  React.createElement(ErrorBoundary, null, React.createElement(App))
);

