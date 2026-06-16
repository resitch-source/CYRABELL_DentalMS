// ADMIN PANEL — only shown when authenticated
// ═══════════════════════════════════════════════════════════════════════════
function LogsViewer({addToast}) {
  const [logs, setLogs]             = useState(() => (window.__cyrabellLogs || []).slice());
  const [filterLevel, setFilterLevel] = useState('all');
  const [filterSource, setFilterSource] = useState('all');
  const [search, setSearch]         = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  // Listen for new log events and update the view
  useEffect(() => {
    if (!autoRefresh) return;
    const handler = () => {
      setLogs((window.__cyrabellLogs || []).slice());
    };
    window.addEventListener('cyrabell-log', handler);
    // Also refresh every 2s in case some logs slipped through
    const timer = setInterval(handler, 2000);
    return () => {
      window.removeEventListener('cyrabell-log', handler);
      clearInterval(timer);
    };
  }, [autoRefresh]);

  // Compute unique source tags for the filter dropdown
  const sources = useMemo(() => {
    const set = new Set();
    logs.forEach(l => l.source && set.add(l.source));
    return Array.from(set).sort();
  }, [logs]);

  // Filter + search
  const q = S(search).trim().toLowerCase();
  const filtered = logs.filter(l => {
    if (filterLevel !== 'all' && l.level !== filterLevel) return false;
    if (filterSource !== 'all' && l.source !== filterSource) return false;
    if (q) {
      const haystack = (S(l.message) + ' ' + S(l.source) + ' ' + S(l.detail)).toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  }).slice().reverse(); // newest first

  const stats = {
    total:  logs.length,
    error:  logs.filter(l => l.level === 'error').length,
    warn:   logs.filter(l => l.level === 'warn').length,
    info:   logs.filter(l => l.level === 'info').length,
    event:  logs.filter(l => l.level === 'event').length,
  };

  const clearLogs = () => {
    if (!confirm('Clear all logs? This cannot be undone.')) return;
    window.__cyrabellLogs.length = 0;
    try { localStorage.removeItem(LS_KEYS.ERROR_LOG); } catch(e){}
    setLogs([]);
    addToast('Logs cleared', 'info');
  };

  const exportLogs = () => {
    const text = filtered.map(l =>
      '[' + l.time + '] ' + l.level.toUpperCase() + ' ' +
      (l.source ? '['+l.source+'] ' : '') + l.message +
      (l.detail ? '\n  ' + l.detail.replace(/\n/g,'\n  ') : '')
    ).join('\n\n');
    const blob = new Blob([text], {type: 'text/plain'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cyrabell-logs-' + localToday() + '.txt';
    a.click();
    URL.revokeObjectURL(url);
    addToast('Logs exported', 'success');
  };

  const copyToClipboard = () => {
    const text = filtered.slice(0, 100).map(l =>
      l.time + ' [' + l.level + '] [' + (l.source||'') + '] ' + l.message
    ).join('\n');
    navigator.clipboard.writeText(text).then(
      () => addToast('Top 100 logs copied to clipboard', 'success'),
      () => addToast('Could not copy', 'error')
    );
  };

  const testLog = () => {
    window.logInfo('test', 'Test info message from Logs page');
    window.logWarn('test', 'Test warning message');
    window.logError('test', 'Test error message', 'This is a test detail field.');
    window.logEvent('test', 'Test event', {sample: 'data', timestamp: Date.now()});
    addToast('4 test logs added', 'success');
  };

  const levelClass = {
    error: 'log-row-error', warn: 'log-row-warn',
    info:  'log-row-info',  event: 'log-row-event',
  };
  const levelIcon = {error:'❌', warn:'⚠', info:'ℹ', event:'📌'};

  return h('div', {className:'page'},
    h('div', {className:'ph'},
      h('div', null,
        h('div', {className:'ptl'}, '🪵 System Logs'),
        h('div', {className:'psl'},
          'Troubleshooting · Error tracking · Event log'
        )
      ),
      h('div', {className:'ph-act'},
        h('button', {className:'btn bgh bsm', onClick:testLog,
          title:'Add 4 test log entries (info/warn/error/event)'}, '🧪 Test'),
        h('button', {className:'btn bgh bsm', onClick:copyToClipboard}, '📋 Copy'),
        h('button', {className:'btn bg2 bsm', onClick:exportLogs}, '⬇ Export .txt'),
        h('button', {className:'btn bd2 bsm', onClick:clearLogs}, '🗑 Clear All'),
      )
    ),

    // Stats cards
    h('div', {className:'logs-stats'},
      h('div', {className:'logs-stat'},
        h('div', {className:'logs-stat-num'}, stats.total),
        h('div', {className:'logs-stat-lbl'}, 'Total')
      ),
      h('div', {className:'logs-stat logs-stat-error'},
        h('div', {className:'logs-stat-num'}, stats.error),
        h('div', {className:'logs-stat-lbl'}, '❌ Errors')
      ),
      h('div', {className:'logs-stat logs-stat-warn'},
        h('div', {className:'logs-stat-num'}, stats.warn),
        h('div', {className:'logs-stat-lbl'}, '⚠ Warnings')
      ),
      h('div', {className:'logs-stat logs-stat-info'},
        h('div', {className:'logs-stat-num'}, stats.info),
        h('div', {className:'logs-stat-lbl'}, 'ℹ Info')
      ),
      h('div', {className:'logs-stat logs-stat-event'},
        h('div', {className:'logs-stat-num'}, stats.event),
        h('div', {className:'logs-stat-lbl'}, '📌 Events')
      )
    ),

    // Filters
    h('div', {className:'logs-filters'},
      h('input', {
        type:'text', placeholder:'🔍 Search message, source, detail…',
        value: search, onChange: e=>setSearch(e.target.value),
        className: 'logs-search'
      }),
      h('select', {value:filterLevel, onChange:e=>setFilterLevel(e.target.value), className:'logs-select'},
        h('option', {value:'all'}, 'All levels'),
        h('option', {value:'error'}, '❌ Errors only'),
        h('option', {value:'warn'}, '⚠ Warnings only'),
        h('option', {value:'info'}, 'ℹ Info only'),
        h('option', {value:'event'}, '📌 Events only')
      ),
      h('select', {value:filterSource, onChange:e=>setFilterSource(e.target.value), className:'logs-select'},
        h('option', {value:'all'}, 'All sources'),
        sources.map(s => h('option', {key:s, value:s}, '['+s+']'))
      ),
      h('label', {className:'logs-toggle'},
        h('input', {type:'checkbox', checked:autoRefresh,
          onChange:()=>setAutoRefresh(v=>!v)}),
        h('span', null, 'Auto-refresh')
      )
    ),

    // Logs list
    filtered.length === 0 && h('div', {className:'empty-state'},
      h('div', {style:{fontSize:36, marginBottom:12}}, '📭'),
      h('div', {style:{fontWeight:700, fontSize:15, marginBottom:6}},
        logs.length === 0 ? 'No logs yet' : 'No logs match filter'
      ),
      h('div', {style:{color:'var(--md)', fontSize:13}},
        logs.length === 0
          ? 'Activity will appear here as it happens.'
          : 'Try clearing filters or search text.'
      )
    ),

    filtered.length > 0 && h('div', {className:'logs-list'},
      filtered.map(log =>
        h('div', {
          key: log.id,
          className: 'log-row ' + (levelClass[log.level] || ''),
          onClick: () => setExpandedId(id => id === log.id ? null : log.id),
        },
          h('div', {className:'log-row-main'},
            h('span', {className:'log-icon'}, levelIcon[log.level] || '·'),
            h('span', {className:'log-time'},
              new Date(log.time).toLocaleTimeString('en-PH', {hour12: false})
            ),
            log.source && h('span', {className:'log-source'}, log.source),
            h('span', {className:'log-msg'}, log.message)
          ),
          (expandedId === log.id) && (log.detail || log.url) && h('div', {className:'log-detail'},
            log.detail && h('pre', {className:'log-detail-text'}, log.detail),
            h('div', {style:{fontSize:10, color:'var(--md)', marginTop:6}},
              'ID: ', log.id, ' · Time: ', log.time
            )
          )
        )
      )
    )
  );
}



function UpgradeBadge({feature, inline}) {
  const plan=getCurrentPlan(), next=PLAN_UPGRADE[plan];
  if(!next) return null;
  if(inline) return h('span',{style:{background:'linear-gradient(90deg,#b8860b,#d4a017)',color:'#fff',fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:10,marginLeft:6}},'🔒 '+PLAN_NAMES[next]);
  return h('div',{style:{textAlign:'center',padding:'40px 20px',color:'#888'}},
    h('div',{style:{fontSize:40,marginBottom:8}},'🔒'),
    h('p',{style:{fontSize:16,fontWeight:700,marginBottom:4}},'Upgrade to '+PLAN_NAMES[next]),
    h('p',{style:{marginBottom:4}},PLAN_PRICES[next]+' — Contact NexArch'),
    h('a',{href:'mailto:hello@nexarch.dev',style:{color:'#00b4d8'}},'hello@nexarch.dev')
  );
}
function FeatureGate({feature, children, inline, fallback}) {
  if(planHas(feature)) return children;
  if(fallback!==undefined) return fallback;
  return h(UpgradeBadge,{feature,inline});
}

// ── UsersPage ─────────────────────────────────────────────────────────────────
const ROLE_OPTS = ['Administrator','Dentist','Receptionist'];
const ROLE_COLOR = { Administrator:'#00b4d8', Dentist:'#22c55e', Receptionist:'#f59e0b' };
const ROLE_IC    = { Administrator:'🛡️', Dentist:'🦷', Receptionist:'🧑‍💼' };

function UsersPage({currentUser, addToast}) {
  const userLimit = getPlanLimit('userLimit');
  const [users, setUsers] = useState(getStoredUsers);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null); // null = add new
  const [form, setForm] = useState({username:'',name:'',role:'Receptionist',password:'',confirm:''});
  const [formErr, setFormErr] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const save = (next) => { setUsers(next); saveStoredUsers(next); };
  const ff = (k,v) => setForm(p=>({...p,[k]:v}));

  const openAdd = () => {
    if (userLimit !== Infinity && users.length >= userLimit)
      return addToast('User limit reached for your plan. Upgrade to add more.','warn');
    setEditing(null);
    setForm({username:'',name:'',role:'Receptionist',password:'',confirm:''});
    setFormErr('');
    setShowPwd(false);
    setShowForm(true);
  };

  const openEdit = (u) => {
    setEditing(u);
    setForm({username:u.username,name:u.name,role:u.role,password:'',confirm:''});
    setFormErr('');
    setShowPwd(false);
    setShowForm(true);
  };

  const submit = () => {
    const uname = form.username.trim().toLowerCase();
    const name  = form.name.trim();
    if (!uname || !name) { setFormErr('Username and name are required.'); return; }
    if (!/^[a-z0-9_]{3,32}$/.test(uname)) { setFormErr('Username: 3-32 chars, letters/numbers/underscore only.'); return; }
    if (!editing && !form.password) { setFormErr('Password is required for new users.'); return; }
    if (form.password && form.password !== form.confirm) { setFormErr('Passwords do not match.'); return; }
    if (form.password && form.password.length < 6) { setFormErr('Password must be at least 6 characters.'); return; }
    const dupe = users.find(u => u.username === uname && u.id !== (editing && editing.id));
    if (dupe) { setFormErr('Username already taken.'); return; }

    if (editing) {
      const next = users.map(u => u.id !== editing.id ? u : {
        ...u, username: uname, name, role: form.role,
        ...(form.password ? {password: form.password} : {})
      });
      save(next);
      addToast('User updated — ' + name, 'ok');
    } else {
      const next = [...users, {id:'u'+Date.now(), username:uname, name, role:form.role, password:form.password}];
      save(next);
      addToast('User added — ' + name, 'ok');
    }
    setShowForm(false);
  };

  const confirmDelete = (id) => {
    const target = users.find(u=>u.id===id);
    if (!target) return;
    if (target.id === currentUser.id) { addToast('Cannot delete your own account.','warn'); return; }
    const admins = users.filter(u=>u.role==='Administrator');
    if (target.role==='Administrator' && admins.length<=1) { addToast('Cannot delete the last Administrator.','warn'); return; }
    setDeleteId(id);
  };
  const doDelete = () => {
    const target = users.find(u=>u.id===deleteId);
    save(users.filter(u=>u.id!==deleteId));
    addToast('User removed — '+(target&&target.name||''),'ok');
    setDeleteId(null);
  };

  const planLabel = userLimit===Infinity ? 'Unlimited' : userLimit+' user'+(userLimit!==1?'s':'');

  return h('div',{className:'page-wrap'},
    h('div',{className:'ph'},
      h('div',{className:'pt'},'👥 User Management'),
      h('div',{className:'ps'},'Manage staff accounts and role permissions')
    ),

    // Plan info bar
    h('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,marginBottom:20,flexWrap:'wrap'}},
      h('div',{style:{fontSize:13,color:'var(--md)'}},
        h('span',{style:{fontWeight:700,color:'var(--dk)'}},(users.length)+' user'+(users.length!==1?'s':'')),
        ' of ',
        h('span',{style:{fontWeight:700,color:'var(--t)'}},planLabel),
        ' on ',
        h('span',{style:{fontWeight:700}},PLAN_NAMES[getCurrentPlan()]+' plan')
      ),
      h('button',{className:'btn bp',onClick:openAdd,style:{fontSize:13}},
        '+ Add User',
        userLimit!==Infinity && h('span',{style:{marginLeft:6,fontSize:11,opacity:.7}},users.length+'/'+userLimit)
      )
    ),

    // Role legend
    h('div',{style:{display:'flex',gap:10,marginBottom:20,flexWrap:'wrap'}},
      ROLE_OPTS.map(r=>h('div',{key:r,style:{display:'flex',alignItems:'center',gap:5,fontSize:12,color:'var(--md)'}},
        h('span',{style:{display:'inline-block',width:10,height:10,borderRadius:'50%',background:ROLE_COLOR[r]}}),
        ROLE_IC[r],' ',r
      ))
    ),

    // Users table
    h('div',{className:'card'},
      h('div',{style:{overflowX:'auto'}},
        h('table',{style:{width:'100%',borderCollapse:'collapse',fontSize:13}},
          h('thead',null,
            h('tr',{style:{borderBottom:'2px solid var(--bd)'}},
              ['User','Name','Role','Actions'].map(c=>h('th',{key:c,style:{textAlign:'left',padding:'10px 12px',color:'var(--md)',fontWeight:700,fontSize:11,textTransform:'uppercase',letterSpacing:'.5px'}},c))
            )
          ),
          h('tbody',null,
            users.map(u=>h('tr',{key:u.id,style:{borderBottom:'1px solid var(--bd)',background:u.id===currentUser.id?'rgba(0,180,216,.04)':''}},
              h('td',{style:{padding:'12px 12px'}},
                h('div',{style:{display:'flex',alignItems:'center',gap:8}},
                  h('div',{style:{width:30,height:30,borderRadius:'50%',background:'linear-gradient(135deg,'+ROLE_COLOR[u.role]+',rgba(0,0,0,.3))',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,flexShrink:0}},
                    (u.name||u.username||'?').charAt(0).toUpperCase()
                  ),
                  h('div',null,
                    h('div',{style:{fontWeight:600,color:'var(--dk)'}},u.username),
                    u.id===currentUser.id&&h('span',{style:{fontSize:10,color:'var(--t)',fontWeight:700,background:'rgba(0,180,216,.1)',padding:'1px 6px',borderRadius:8}}, 'YOU')
                  )
                )
              ),
              h('td',{style:{padding:'12px 12px',color:'var(--dk)'}},u.name||'—'),
              h('td',{style:{padding:'12px 12px'}},
                h('span',{style:{fontSize:11,fontWeight:700,padding:'3px 9px',borderRadius:20,background:ROLE_COLOR[u.role]+'22',color:ROLE_COLOR[u.role],border:'1px solid '+ROLE_COLOR[u.role]+'44'}},
                  ROLE_IC[u.role],' ',u.role
                )
              ),
              h('td',{style:{padding:'12px 12px'}},
                h('div',{style:{display:'flex',gap:6}},
                  h('button',{className:'btn bs',style:{fontSize:11,padding:'4px 10px'},onClick:()=>openEdit(u)},'✏️ Edit'),
                  u.id!==currentUser.id&&h('button',{className:'btn bd',style:{fontSize:11,padding:'4px 10px'},onClick:()=>confirmDelete(u.id)},'🗑 Delete')
                )
              )
            ))
          )
        )
      )
    ),

    // RBAC reference table
    h('div',{className:'card',style:{marginTop:16}},
      h('div',{className:'ch'},h('div',{className:'ct'},'🛡️ Role Permissions Reference')),
      h('div',{className:'cb'},
        h('div',{style:{overflowX:'auto'}},
          h('table',{style:{width:'100%',borderCollapse:'collapse',fontSize:12}},
            h('thead',null,
              h('tr',{style:{borderBottom:'2px solid var(--bd)'}},
                h('th',{style:{textAlign:'left',padding:'8px 10px',color:'var(--md)',fontWeight:700,fontSize:11}},'Permission'),
                ROLE_OPTS.map(r=>h('th',{key:r,style:{textAlign:'center',padding:'8px 10px',color:ROLE_COLOR[r],fontWeight:700,fontSize:11}},ROLE_IC[r],' ',r))
              )
            ),
            h('tbody',null,
              [
                ['Delete Patients','delete_patient'],
                ['Export Data','export_data'],
                ['Sync & Backup','view_sync'],
                ['Analytics','view_analytics'],
                ['View Logs','view_logs'],
                ['Edit Service Catalog','edit_services'],
                ['AI Assistant','use_ai'],
                ['Kiosk Mode','use_kiosk'],
                ['Manage License','manage_license'],
                ['Manage Users','manage_users'],
              ].map(([label,key])=>h('tr',{key,style:{borderBottom:'1px solid var(--bd)'}},
                h('td',{style:{padding:'8px 10px',color:'var(--dk)',fontWeight:500}},label),
                ROLE_OPTS.map(r=>h('td',{key:r,style:{textAlign:'center',padding:'8px 10px'}},
                  RBAC[r][key]
                    ? h('span',{style:{color:'#22c55e',fontSize:15,fontWeight:700}},'✓')
                    : h('span',{style:{color:'rgba(0,0,0,.18)',fontSize:13}},'—')
                ))
              ))
            )
          )
        )
      )
    ),

    // Add / Edit modal
    showForm && h('div',{className:'ov'},
      h('div',{className:'modal'},
        h('div',{className:'mh'},
          h('div',{className:'mt'},(editing?'Edit User':'Add New User')),
          h('button',{className:'mcl',onClick:()=>setShowForm(false)},'✕')
        ),
        h('div',{style:{padding:'16px 20px 20px',display:'grid',gap:12}},
          h('label',{style:{fontSize:12,fontWeight:600,color:'var(--md)'}},
            'Username *',
            h('input',{className:'inp',style:{marginTop:4},value:form.username,placeholder:'e.g. dr.smith',disabled:!!editing,
              onInput:e=>ff('username',e.target.value)})
          ),
          h('label',{style:{fontSize:12,fontWeight:600,color:'var(--md)'}},
            'Full Name *',
            h('input',{className:'inp',style:{marginTop:4},value:form.name,placeholder:'e.g. Dr. Juan Smith',
              onInput:e=>ff('name',e.target.value)})
          ),
          h('label',{style:{fontSize:12,fontWeight:600,color:'var(--md)'}},
            'Role *',
            h('select',{className:'inp',style:{marginTop:4},value:form.role,onChange:e=>ff('role',e.target.value)},
              ROLE_OPTS.map(r=>h('option',{key:r,value:r},ROLE_IC[r]+' '+r))
            )
          ),
          h('div',{style:{background:'var(--tp)',borderRadius:8,padding:'8px 12px',fontSize:11.5,color:'var(--t)',lineHeight:1.5}},
            h('strong',null,ROLE_IC[form.role]+' '+form.role+': '),
            form.role==='Administrator' ? 'Full access to all features.' :
            form.role==='Dentist'       ? 'Patient records, appointments, AI assistant, analytics. No sync or user management.' :
                                          'Check-in, appointments, notifications. No exports, analytics, or admin features.'
          ),
          h('label',{style:{fontSize:12,fontWeight:600,color:'var(--md)'}},
            (editing?'New Password (leave blank to keep current)':'Password *'),
            h('div',{style:{position:'relative',marginTop:4}},
              h('input',{className:'inp',type:showPwd?'text':'password',value:form.password,placeholder:'Min. 6 characters',
                onInput:e=>ff('password',e.target.value),style:{paddingRight:44}}),
              h('button',{type:'button',onClick:()=>setShowPwd(p=>!p),
                style:{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',fontSize:14,color:'var(--md)'}},
                showPwd?'🙈':'👁')
            )
          ),
          form.password&&h('label',{style:{fontSize:12,fontWeight:600,color:'var(--md)'}},
            'Confirm Password *',
            h('input',{className:'inp',style:{marginTop:4},type:'password',value:form.confirm,placeholder:'Repeat password',
              onInput:e=>ff('confirm',e.target.value)})
          ),
          formErr&&h('div',{style:{color:'var(--re)',fontSize:12,background:'#fef2f2',padding:'8px 12px',borderRadius:6}},formErr),
          h('div',{style:{display:'flex',gap:8,justifyContent:'flex-end',marginTop:4}},
            h('button',{className:'btn bs',onClick:()=>setShowForm(false)},'Cancel'),
            h('button',{className:'btn bp',onClick:submit},editing?'💾 Save Changes':'➕ Add User')
          )
        )
      )
    ),

    // Confirm delete modal
    deleteId && h('div',{className:'ov'},
      h('div',{className:'modal',style:{maxWidth:340}},
        h('div',{style:{padding:'28px 24px',textAlign:'center'}},
          h('div',{style:{fontSize:36,marginBottom:8}},'⚠️'),
          h('div',{style:{fontWeight:700,fontSize:16,marginBottom:8}},'Delete User?'),
          h('div',{style:{fontSize:13,color:'var(--md)',marginBottom:20}},
            'This will permanently remove ',
            h('strong',null,(users.find(u=>u.id===deleteId)||{}).name||'this user'),
            '. They will no longer be able to log in.'
          ),
          h('div',{style:{display:'flex',gap:8,justifyContent:'center'}},
            h('button',{className:'btn bs',onClick:()=>setDeleteId(null)},'Cancel'),
            h('button',{className:'btn bd',onClick:doDelete},'🗑 Delete')
          )
        )
      )
    )
  );
}

function AdminPanel({user,onLogout,patients,setPatients,appointments,setAppointments,payments,setPayments,notifications,setNotifications,reminders,setReminders,reminderLog,setReminderLog,addToast,onGoKiosk}){
  const [page,setPage]=useState('dashboard');
  const [sideOpen,setSideOpen]=useState(false);
  // Read sync URL from localStorage so PatForm/Patients can upload photos.
  // It gets set by the Sync page. Re-read on every render is cheap.
  const syncUrl = (function(){ try { return localStorage.getItem(LS_KEYS.SYNC_URL) || ''; } catch(e) { return ''; } })();
  const pending=appointments.filter(a=>a.status==='pending').length;
  const today=localToday();
  const dueRemindersCount=reminders.filter(r=>r.active&&r.nextDue<=today).length;
  const arrivedCount = appointments.filter(a=>a.arrived&&a.date===localToday()).length;
  const nav=id=>{setPage(id);setSideOpen(false);};

  const NAV=[
    {id:'dashboard',l:'Dashboard',d:IC.dash,sec:'OVERVIEW'},
    {id:'appointments',l:'Appointments',d:IC.cal,badge:pending||null,sec:'MANAGE'},
    {id:'patients',l:'Patients',d:IC.users},
    {id:'payments',l:'Payments',d:IC.credit},
    {id:'reminders',l:'Reminders',d:IC.repeat,badge:dueRemindersCount||null,sec:'TOOLS'},
    {id:'notifications',l:'Notifications',d:IC.bell},
    canDo(user,'edit_services')&&{id:'services',l:'Service Catalog',d:IC.credit,sec:'SETTINGS'},
    canDo(user,'manage_users')&&{id:'users',l:'User & Roles',d:IC.users},
    canDo(user,'view_sync')&&{id:'sync',l:'Sync & Backup',d:IC.cloud},
    canDo(user,'export_data')&&{id:'export',l:'Export',d:IC.dl},
    canDo(user,'view_analytics')&&planHas('advancedAnalytics')&&{id:'analytics',l:'Analytics',d:IC.report},
    canDo(user,'view_logs')&&{id:'logs', l:'🪵 Logs', d:IC.bell, sec:''},
  ].filter(Boolean);
  const BOT=[
    {id:'dashboard',l:'Home',d:IC.dash},
    {id:'appointments',l:'Visits',d:IC.cal,badge:pending||null},
    {id:'patients',l:'Patients',d:IC.users},
    {id:'payments',l:'Payments',d:IC.credit},
    {id:'notifications',l:'Alerts',d:IC.bell},
  ];
  const TITLES={dashboard:'Dashboard',appointments:'Appointments',patients:'Patients',payments:'Payments',reminders:'Recurring Reminders',notifications:'Notifications',sync:'Sync & Backup',export:'Export',analytics:'Analytics',users:'Users & Roles',services:'Service Catalog',logs:'Logs'};
  let lastSec=null;
  const userInitial = (user && (user.name||user.username)||'A').charAt(0).toUpperCase();

  // Wrap each page in an ErrorBoundary so one broken page doesn't crash the whole shell.
  // Each page's data is also defensively coerced to arrays in case sheets returns null.
  const safe = (arr) => Array.isArray(arr) ? arr : [];
  const renderPage = () => {
    try {
      if(page==='dashboard')return h(Dashboard,{appointments:safe(appointments),setAppointments,patients:safe(patients),payments:safe(payments),onGoKiosk,syncUrl,addToast});
      if(page==='appointments')return h(Appointments,{appointments:safe(appointments),setAppointments,patients:safe(patients),setPatients,setNotifications,setPayments,addToast,syncUrl});
      if(page==='patients')return h(Patients,{patients:safe(patients),setPatients,appointments:safe(appointments),setAppointments,payments:safe(payments),setPayments,addToast,syncUrl,user});
      if(page==='payments')return h(Payments,{payments:safe(payments),setPayments,patients:safe(patients),appointments:safe(appointments),setAppointments,addToast,syncUrl});
      if(page==='reminders')return h(Reminders,{reminders:safe(reminders),setReminders,reminderLog:safe(reminderLog),setReminderLog,patients:safe(patients),addToast});
      if(page==='services')return canDo(user,'edit_services')?h(ServicesPage,{addToast}):h('div',{style:{padding:30,textAlign:'center',color:'var(--re)'}},h('p',null,'⛔ Access denied — Administrators only'));
      if(page==='users')return canDo(user,'manage_users')?h(UsersPage,{currentUser:user,addToast}):h('div',{style:{padding:30,textAlign:'center',color:'var(--re)'}},h('p',null,'⛔ Access denied — Administrators only'));
      if(page==='sync')return canDo(user,'view_sync')?h(SyncPage,{patients:safe(patients),appointments:safe(appointments),payments:safe(payments),notifications:safe(notifications),reminders:safe(reminders),reminderLog:safe(reminderLog),services:getActiveSvcs(),setPatients,setAppointments,setPayments,setNotifications,setReminders,setReminderLog,setServices:(svcs)=>{try{localStorage.setItem(LS_KEYS.SERVICES,JSON.stringify(svcs));}catch(e){}},addToast}):h('div',{style:{padding:30,textAlign:'center',color:'var(--re)'}},h('p',null,'⛔ Access denied — Administrators only'));
      if(page==='notifications')return h(Notifications,{notifications:safe(notifications),setNotifications,appointments:safe(appointments),addToast});
      if(page==='export')return canDo(user,'export_data')?h(ExportPage,{appointments:safe(appointments),patients:safe(patients),payments:safe(payments)}):h('div',{style:{padding:30,textAlign:'center',color:'var(--re)'}},h('p',null,'⛔ Access denied — Administrators only'));
      if(page==='analytics'){
        if(!canDo(user,'view_analytics')) return h('div',{style:{padding:30,textAlign:'center',color:'var(--re)'}},h('p',null,'⛔ Access denied — Administrators only'));
        if(!planHas('advancedAnalytics')) return h('div',{style:{padding:30,textAlign:'center'}},h(UpgradeBadge,{feature:'advancedAnalytics'}),h('p',{style:{marginTop:12,color:'var(--md)',fontSize:14}},'Advanced Analytics requires the Professional plan.'));
        return h(Analytics,{appointments:safe(appointments),payments:safe(payments),patients:safe(patients)});
      }
      if(page==='logs') return canDo(user,'view_logs')?h(ErrorBoundary,null,h(LogsViewer,{addToast})):h('div',{style:{padding:30,textAlign:'center',color:'var(--re)'}},h('p',null,'⛔ Access denied — Administrators only'));
      return h('div',{style:{padding:30,textAlign:'center',color:'var(--md)'}}, 'Page not found: ' + page);
    } catch (err) {
      console.error('[renderPage]', err);
      return h('div',{style:{padding:30}},
        h('div',{style:{fontWeight:700,color:'var(--re)',marginBottom:8}},'⚠ Error loading ' + page),
        h('div',{style:{fontSize:12,color:'var(--md)'}},String(err.message || err))
      );
    }
  };
  // Use a named PageContent so React preserves it across renders
  // (don't recreate the component inline each render - that causes remounts)
  const PageContent = () => h(ErrorBoundary, {fallbackMessage: 'The "' + page + '" page crashed. Click "Try again" or switch to another page from the sidebar.', key: page}, renderPage());

  return h(Fragment,null,
    h('div',{className:'sb-ov '+(sideOpen?'show':''),onClick:()=>setSideOpen(false)}),
    h('div',{className:'app'},
      h('div',{className:'sb '+(sideOpen?'open':'')},
        h('div',{className:'sb-logo'},
          h(BrandLogo,{dark:true,width:170})
        ),
        h('nav',{className:'sb-nav'},
          NAV.map(item=>{
            const show=item.sec&&item.sec!==lastSec;
            if(show)lastSec=item.sec;
            return h(Fragment,{key:item.id},
              show&&h('div',{className:'ns'},item.sec),
              h('button',{className:'ni '+(page===item.id?'act':''),onClick:()=>nav(item.id)},
                h(Svg,{d:item.d,size:15}),
                h('span',null,item.l),
                item.badge&&h('span',{className:'nb'},item.badge)
              )
            );
          })
        ),
        h('div',{className:'sb-ft'},
          h('div',{style:{marginBottom:8}},
            planHas('kioskMode')
              ? h('button',{className:'btn bs',style:{width:'100%',justifyContent:'center',fontSize:12,padding:'7px 12px'},onClick:onGoKiosk},
                  h(Svg,{d:IC.globe,size:13}),' Open Kiosk Mode')
              : h('button',{className:'btn bs',style:{width:'100%',justifyContent:'center',fontSize:12,padding:'7px 12px',opacity:0.45,cursor:'not-allowed'},disabled:true,title:'Professional plan required'},
                  h(Svg,{d:IC.globe,size:13}),' 🔒 Open Kiosk Mode')
          ),
          h('div',{className:'uc',onClick:onLogout,title:'Click to log out'},
            h('div',{className:'ua'},userInitial),
            h('div',null,
              h('div',{className:'un'},user.name||user.username),
              h('div',{className:'ur'},user.role,
                h('span',{style:{fontSize:9,padding:'1px 7px',borderRadius:8,background:getCurrentPlan()==='clinic_pro'?'#7c3aed':getCurrentPlan()==='professional'?'#00b4d8':'#475569',color:'#fff',marginLeft:5,fontWeight:700}},PLAN_NAMES[getCurrentPlan()])
              )
            ),
            h(Svg,{d:IC.logout,size:13,color:'rgba(255,255,255,.5)'})
          ),
          // NexArch power badge
          h('div',{className:'nexarch-sb-badge'},
            h('span',null,'POWERED BY:'),
            h('img',{src:CYRABELL_LOGO,alt:'Cyrabell',style:{width:100,height:100,objectFit:'contain',borderRadius:4}})
          )
        )
      ),
      h('div',{className:'main'},
        h('div',{className:'topbar'},
          h('button',{className:'ham',onClick:()=>setSideOpen(o=>!o)},h(Svg,{d:IC.menu,size:18,color:'var(--md)'})),
          h('div',{className:'tt'},TITLES[page]||'Cyrabell'),
          h('div',{className:'tsr'},h(Svg,{d:IC.search,size:13,color:'var(--lt)'}),h('input',{placeholder:'Search…'})),
          h(SyncStatusBadge),
          arrivedCount>0&&h('div',{className:'kiosk-arrived-badge',style:{fontSize:11}},'🪑 '+arrivedCount+' in clinic'),
          h('button',{className:'tbb',onClick:onLogout,title:'Log out'},h(Svg,{d:IC.logout,size:15,color:'var(--md)'})),
          h('button',{className:'tbb'},h(Svg,{d:IC.bell,size:15,color:'var(--md)'}),pending>0&&h('span',{className:'nd'}))
        ),
        h('div',{className:'content'},PageContent()),
        h('div',{className:'bot-nav'},
          h('div',{className:'bn-wrap'},
            BOT.map(item=>h('button',{key:item.id,className:'bn-item '+(page===item.id?'act':''),onClick:()=>nav(item.id)},
              item.badge&&h('span',{className:'bn-badge'},item.badge),
              h('div',{className:'bn-ic'},h(Svg,{d:item.d,size:18,color:page===item.id?'var(--t)':'var(--lt)'})),
              h('span',{className:'bn-lbl'},item.l)
            )),
            h('button',{className:'bn-item',onClick:()=>setSideOpen(o=>!o)},
              h('div',{className:'bn-ic'},h(Svg,{d:IC.menu,size:18,color:'var(--lt)'})),
              h('span',{className:'bn-lbl'},'More')
            )
          ),
          h('div',{style:{borderTop:'1px solid var(--bd)',padding:'6px 12px',display:'flex',alignItems:'center',justifyContent:'center',background:'#f8fafc'}},
            h(BrandLogo,{dark:false,width:160})
          )
        )
      )
    )
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ROOT APP (gates access)
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// 🔄 AUTO-SYNC — Debounced auto-push to Google Sheets on data changes
// ═══════════════════════════════════════════════════════════════════════════
// Status states: 'idle' | 'pending' | 'syncing' | 'synced' | 'error' | 'offline'

// Global sync state (lives outside React so we can debounce across renders)
const __autoSync = {
  timer: null,
  inFlight: false,
  lastError: null,
  listeners: [],
  // Subscribe to sync status changes
  subscribe(fn) {
    this.listeners.push(fn);
    return () => { this.listeners = this.listeners.filter(f => f !== fn); };
  },
  notify(status, extra) {
    if (typeof window !== 'undefined') {
      window.__lastSyncStatus = { status, extra, time: Date.now() };
    }
    this.listeners.forEach(fn => { try { fn(status, extra); } catch (e) {} });
  }
};

function asLog(stage, detail) {
  if (typeof window !== 'undefined') {
    window.__autoSyncLogs = window.__autoSyncLogs || [];
    window.__autoSyncLogs.push({ t: new Date().toISOString().substr(11, 12), stage, detail });
    if (window.__autoSyncLogs.length > 100) window.__autoSyncLogs.shift();
  }
  console.log('[🔄 autosync]', stage, detail || '');
}

// ═══════════════════════════════════════════════════════════════════════════
// BACKGROUND WORKER: runs sync on a separate thread so UI stays responsive
// ═══════════════════════════════════════════════════════════════════════════
// The worker handles:
//   • JSON serialization (can be slow for large datasets)
//   • Network I/O (fetch + response parsing)
//   • Retry logic on transient failures
//
// Communication via postMessage: { type, ... }
// Messages FROM worker: { type: 'status'|'success'|'error', ... }
// Messages TO worker:   { type: 'sync', syncUrl, data }

const __syncWorkerSource = `
let inFlight = false;
let retryCount = 0;
const MAX_RETRIES = 2;

self.onmessage = async function(e) {
  const msg = e.data;
  if (msg.type !== 'sync') return;
  if (inFlight) {
    self.postMessage({ type: 'skipped', reason: 'in-flight' });
    return;
  }
  inFlight = true;
  retryCount = 0;
  await doSync(msg.syncUrl, msg.data);
  inFlight = false;
};

async function doSync(syncUrl, data) {
  self.postMessage({ type: 'status', status: 'syncing' });
  try {
    const body = JSON.stringify({ data: data });
    const res = await fetch(syncUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: body,
      redirect: 'follow'
    });
    const text = await res.text();
    let result;
    try { result = JSON.parse(text); }
    catch (e) {
      throw new Error('Bad response (not JSON): ' + text.substring(0, 80));
    }
    if (!result.ok) throw new Error(result.error || 'Sync failed');
    const totalRows = Object.values(result.stats || {}).reduce(function(a,b){return a+b;}, 0);
    self.postMessage({
      type: 'success',
      rows: totalRows,
      time: new Date().toLocaleTimeString()
    });
  } catch (err) {
    // Retry transient network errors up to 2 times with backoff
    if (retryCount < MAX_RETRIES && (err.message.indexOf('fetch') !== -1 || err.message.indexOf('network') !== -1 || err.message.indexOf('Failed') !== -1)) {
      retryCount++;
      self.postMessage({ type: 'status', status: 'retrying', attempt: retryCount });
      await new Promise(function(r){ setTimeout(r, 1000 * retryCount); });
      return doSync(syncUrl, data);
    }
    self.postMessage({ type: 'error', message: err.message || String(err) });
  }
}
`;

// Singleton worker — created lazily on first sync
function getSyncWorker() {
  if (__autoSync.worker) return __autoSync.worker;
  try {
    const blob = new Blob([__syncWorkerSource], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);
    worker.onmessage = function(e) {
      const m = e.data;
      if (m.type === 'status') {
        asLog('worker:status', m.status + (m.attempt ? (' (attempt ' + m.attempt + ')') : ''));
        __autoSync.notify(m.status, m.attempt ? ('retry ' + m.attempt) : null);
      } else if (m.type === 'success') {
        asLog('worker:success', { rows: m.rows });
        __autoSync.lastError = null;
        __autoSync.inFlight = false;
        __autoSync.notify('synced', { rows: m.rows, time: m.time });
        try { localStorage.setItem(LS_KEYS.LAST_SYNC, new Date().toLocaleString()); } catch (e) {}
        // Push any new client-side logs to Sheets serverLogs tab
        try {
          const _u = localStorage.getItem(LS_KEYS.SYNC_URL) || '';
          if (_u) pushClientLogsToSheets(_u);
        } catch(e) {}
      } else if (m.type === 'error') {
        asLog('worker:error', m.message);
        __autoSync.lastError = m.message;
        __autoSync.inFlight = false;
        __autoSync.notify('error', m.message);
      } else if (m.type === 'skipped') {
        asLog('worker:skipped', m.reason);
      }
    };
    worker.onerror = function(err) {
      asLog('worker:fatal', err.message || String(err));
      __autoSync.inFlight = false;
      __autoSync.notify('error', 'Worker error: ' + (err.message || 'unknown'));
    };
    __autoSync.worker = worker;
    asLog('worker:created');
    return worker;
  } catch (err) {
    asLog('worker:create-failed', err.message);
    return null;
  }
}

// Execute auto-push by posting to the worker (returns immediately)
function performAutoPush(syncUrl, data) {
  if (!syncUrl) {
    asLog('skip:no-url');
    __autoSync.notify('offline', 'No sync URL configured');
    return;
  }
  if (__autoSync.inFlight) {
    asLog('skip:in-flight');
    return;
  }
  __autoSync.inFlight = true;
  asLog('push:dispatch', {
    patients: data.patients.length,
    appointments: data.appointments.length,
    payments: data.payments.length
  });

  const worker = getSyncWorker();
  if (!worker) {
    // Worker unsupported — fallback to main thread fetch
    asLog('push:fallback-main-thread');
    return performAutoPushMain(syncUrl, data);
  }
  // Post the data to the worker — runs in background thread
  worker.postMessage({ type: 'sync', syncUrl: syncUrl, data: data });
}

// Fallback when Workers aren't supported (very old browsers / file:// protocol)
async function performAutoPushMain(syncUrl, data) {
  __autoSync.notify('syncing');
  try {
    const res = await fetch(syncUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ data: data }),
      redirect: 'follow'
    });
    const text = await res.text();
    const result = JSON.parse(text);
    if (!result.ok) throw new Error(result.error || 'Sync failed');
    const totalRows = Object.values(result.stats || {}).reduce(function(a,b){return a+b;}, 0);
    __autoSync.notify('synced', { rows: totalRows, time: new Date().toLocaleTimeString() });
    try { localStorage.setItem(LS_KEYS.LAST_SYNC, new Date().toLocaleString()); } catch (e) {}
  } catch (err) {
    asLog('push:error', err.message);
    __autoSync.lastError = err.message;
    __autoSync.notify('error', err.message);
  } finally {
    __autoSync.inFlight = false;
  }
}

// Schedule a debounced auto-push. The debounce stays on the main thread
// (cheap timer), but the actual sync work happens in the worker.
function scheduleAutoSync(syncUrl, data, debounceMs) {
  if (!syncUrl) return;
  if (__autoSync.timer) clearTimeout(__autoSync.timer);
  __autoSync.notify('pending');
  // Stash the latest data so we always sync the most recent version
  __autoSync.pendingData = data;
  __autoSync.pendingUrl = syncUrl;
  __autoSync.timer = setTimeout(function() {
    __autoSync.timer = null;
    performAutoPush(__autoSync.pendingUrl, __autoSync.pendingData);
  }, debounceMs || 2000);
  asLog('scheduled', { ms: debounceMs || 2000 });
}

// Flush any pending sync immediately (e.g., before page unload)
function flushPendingSync() {
  if (__autoSync.timer && __autoSync.pendingUrl && __autoSync.pendingData) {
    clearTimeout(__autoSync.timer);
    __autoSync.timer = null;
    asLog('flush:forced');
    performAutoPush(__autoSync.pendingUrl, __autoSync.pendingData);
  }
}

// Best-effort flush before the user closes the tab
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', function() {
    if (__autoSync.pendingUrl && __autoSync.pendingData) {
      try {
        // Use sendBeacon for reliable last-chance flush (survives page unload)
        const blob = new Blob([JSON.stringify({ data: __autoSync.pendingData })], { type: 'text/plain' });
        navigator.sendBeacon(__autoSync.pendingUrl, blob);
        asLog('beforeunload:beacon-sent');
      } catch (e) {}
    }
  });

  // Also sync when the tab regains focus, in case anything was missed
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible' && __autoSync.pendingUrl && __autoSync.pendingData && !__autoSync.inFlight) {
      asLog('visibilitychange:resync');
      performAutoPush(__autoSync.pendingUrl, __autoSync.pendingData);
    }
  });
}

// React hook to consume sync status
function useSyncStatus() {
  const [status, setStatus] = useState('idle');
  const [extra, setExtra] = useState(null);
  useEffect(() => {
    const unsub = __autoSync.subscribe((s, e) => { setStatus(s); setExtra(e); });
    return unsub;
  }, []);
  return { status, extra };
}

// Status badge component used in topbar
function SyncStatusBadge() {
  const { status, extra } = useSyncStatus();
  const [autoSyncEnabled] = useState(() => {
    try { return localStorage.getItem(LS_KEYS.AUTO_SYNC) !== 'false'; }
    catch (e) { return true; }
  });

  if (!autoSyncEnabled) return null;

  const cfg = {
    idle:     { icon: '○',  label: 'Idle',        color: '#8fa8b8', bg: '#f0f4f7' },
    pending:  { icon: '⏳', label: 'Pending…',    color: '#d97706', bg: '#fff7e6' },
    syncing:  { icon: '↻',  label: 'Syncing…',    color: '#3a7bd5', bg: '#e8eeff' },
    retrying: { icon: '↻',  label: 'Retrying…',   color: '#d97706', bg: '#fff7e6' },
    synced:   { icon: '✓',  label: 'Synced',      color: '#0a7c6e', bg: '#e6f7f3' },
    error:    { icon: '⚠',  label: 'Sync error',  color: '#e05252', bg: '#fdeaea' },
    offline:  { icon: '⊘',  label: 'Sync off',    color: '#8fa8b8', bg: '#f0f4f7' },
  };
  const c = cfg[status] || cfg.idle;

  return h('div', {
    className: 'sync-status-badge',
    style: { background: c.bg, color: c.color },
    title: extra ? (typeof extra === 'string' ? extra : ('Last sync: ' + (extra.time || ''))) : c.label
  },
    h('span', {
      className: status === 'syncing' || status === 'pending' ? 'sync-spin' : '',
      style: { fontSize: 13, fontWeight: 700 }
    }, c.icon),
    h('span', { style: { fontSize: 11, fontWeight: 600 } }, c.label)
  );
}



// ═══════════════════════════════════════════════════════════════════════════
