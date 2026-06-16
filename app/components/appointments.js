// ApptDetail — shows appointment details
function ApptDetail({a, onClose, syncUrl, onEdit}){
  const [viewing, setViewing] = useState(null);
  const rows=[['Patient',a.patientName],['Dentist',a.dentist],['Date',fmtDateFull(a.date)],['Time',fmtTime(a.time)],['When',fmtDateRelative(a.date)],['Total Fee','₱'+p$(a.fee)],['Phone',a.phone||'—'],['Email',a.email||'—'],['Notes',a.notes||'—']];
  const atts = safe(a.attachments);
  return h(Modal,{title:'Appointment Details',sub:'#'+a.id,onClose,footer:h(Fragment,null,
    onEdit && h('button',{className:'btn bp',onClick:()=>onEdit(a)},'✏️ Edit'),
    h('button',{className:'btn bgh',onClick:onClose},'Close')
  )},
    h('div',{style:{display:'flex',flexDirection:'column',gap:10}},
      svcList(a).length > 0 && h('div',null,
        h('div',{style:{color:'var(--md)',fontSize:10.5,textTransform:'uppercase',letterSpacing:.5,fontWeight:600,marginBottom:4}},'Services'),
        h('table',{className:'appt-svc-table'},
          h('thead',null,h('tr',null,
            h('th',null,'#'),h('th',null,'Service'),h('th',null,'Category'),h('th',null,'Note'),h('th',null,'Fee (₱)')
          )),
          h('tbody',null,
            svcList(a).map((sv,i)=>{
              const cat=(getActiveSvcs().find(x=>x.name===sv)||{}).cat||'—';
              const fee=(getActiveSvcs().find(x=>x.name===sv)||{}).fee;
              const note=((a.serviceNotes||{})[sv])||'';
              return h('tr',{key:i},
                h('td',{style:{color:'var(--md)',fontWeight:600}},i+1),
                h('td',null,h('strong',null,sv)),
                h('td',{style:{color:'var(--md)',fontSize:11.5}},cat),
                h('td',{style:{color:'var(--dk)',fontSize:11.5}},note||'—'),
                h('td',{style:{fontWeight:600,color:'var(--t)',whiteSpace:'nowrap'}},fee!=null?'₱'+p$(fee):'—')
              );
            })
          )
        )
      ),
      rows.map(([l,v])=>h('div',{key:l,style:{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid var(--bd)'}},
        h('span',{style:{color:'var(--md)',fontSize:12.5,textTransform:'uppercase',letterSpacing:.5}},l),
        h('span',{style:{fontWeight:600,maxWidth:'60%',textAlign:'right'}},v||'—')
      )),
      atts.length > 0 && h('div',{style:{marginTop:8}},
        h('div',{style:{color:'var(--md)',fontSize:12,textTransform:'uppercase',letterSpacing:.5,marginBottom:8,fontWeight:700}},
          '📎 Attachments ('+atts.length+')'
        ),
        h('div',{style:{display:'flex',gap:8,flexWrap:'wrap'}},
          atts.map(att => h(AttachThumb, {key:att.id, att, onClick:()=>setViewing(att)}))
        )
      )
    ),
    viewing && h(AttachmentViewer,{file:viewing, onClose:()=>setViewing(null)})
  );
}

// ApptForm — book/edit appointment with availability validation

// ═══════════════════════════════════════════════════════════════════════════
// 🔍 PATIENT LIVE SEARCH INPUT
// Replaces plain <select> patient dropdowns with a searchable input.
// As you type, filters patients by name, phone, or ID in real time.
// Selecting a patient fires onSelect(patient) with the full patient object.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * PatientSearchInput — live-search patient selector.
 *
 * @param {Patient[]} patients      - full patients array
 * @param {string}    value         - currently selected patient name (controlled)
 * @param {function}  onSelect      - called with full patient object when selected
 * @param {string}    placeholder   - input placeholder text
 * @param {boolean}   required      - shows * indicator
 */

function PatientSearchInput({patients: patientsProp, value, onSelect, placeholder, required, onNewPatient}) {
  // Internal patients list — merges prop patients + any new ones added inline
  const [internalPatients, setInternalPatients] = useState(() => patientsProp || []);
  // Sync when prop changes (without resetting query)
  const propRef = useRef(patientsProp);
  useEffect(() => {
    if (propRef.current !== patientsProp) {
      propRef.current = patientsProp;
      setInternalPatients(prev => {
        const propIds = new Set((patientsProp||[]).map(p=>p.id));
        const localOnly = prev.filter(p => !propIds.has(p.id)); // keep inline-added
        return [...localOnly, ...(patientsProp||[])];
      });
    }
  }, [patientsProp]);
  const patients = internalPatients;

  const [query,    setQuery]    = useState(value || '');
  const [open,     setOpen]     = useState(false);
  const [hiIdx,    setHiIdx]    = useState(0);
  const [dirty,    setDirty]    = useState(false);
  const [newMode,  setNewMode]  = useState(false);  // inline new-patient panel
  // New patient form fields
  const [newF, setNewF] = useState({name:'', phone:'', email:'', dob:'', sex:'', bloodType:'', allergies:'', occupation:'', maritalStatus:'', address:'', photoDataUrl:''});
  const [camOpen, setCamOpen]   = useState(false);
  const [camStream, setCamStream] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const inputRef  = useRef(null);
  const listRef   = useRef(null);
  const wrapRef   = useRef(null);

  useEffect(() => {
    // Only reset query when value is explicitly cleared/changed by parent
    // NOT when parent just re-renders (dirty prevents spurious resets)
    if (!dirty && query !== (value || '')) {
      setQuery(value || '');
    }
  }, [value]);

  useEffect(() => {
    const handle = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false); setDirty(false);
        if (dirty) setQuery(value || '');
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [dirty, value]);

  // Camera: open
  const openCam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'user'}, audio:false});
      setCamStream(stream); setCamOpen(true);
      setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = stream; }, 100);
    } catch(e) { console.warn('[cam]', e.message); alert('Camera not available: ' + e.message); }
  };
  // Camera: capture
  const captureCam = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current;
    canvasRef.current.width  = v.videoWidth  || 320;
    canvasRef.current.height = v.videoHeight || 240;
    canvasRef.current.getContext('2d').drawImage(v, 0, 0);
    const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.85);
    setNewF(x => ({...x, photoDataUrl: dataUrl}));
    closeCam();
  };
  const closeCam = () => {
    if (camStream) { camStream.getTracks().forEach(t => t.stop()); setCamStream(null); }
    setCamOpen(false);
  };
  // File pick for photo
  const pickPhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    readFileAsDataUrl(file).then(url => setNewF(x => ({...x, photoDataUrl: url})));
    e.target.value = '';
  };

  // Filter patients
  const q = S(query).trim().toLowerCase();
  const qDigits = q.replace(/\D/g,'');
  const filtered = !q
    ? patients.slice(0, 8)
    : patients.filter(p =>
        S(p.name).toLowerCase().includes(q) ||
        // Only phone-match when query has actual digits (prevents '' matching everything)
        (qDigits.length > 0 && S(p.phone).replace(/\D/g,'').includes(qDigits)) ||
        S(p.id).toLowerCase().includes(q) ||
        S(p.email).toLowerCase().includes(q)
      ).slice(0, 10);

  const noMatch = q.length > 1 && filtered.length === 0;

  const handleInput = (e) => {
    const val = e.target.value;
    setQuery(val); setDirty(true); setOpen(true); setHiIdx(0);
    setNewMode(false);
    if (!val.trim()) onSelect && onSelect(null);
  };

  const handleSelect = (patient) => {
    setQuery(patient.name); setDirty(false); setOpen(false); setHiIdx(0); setNewMode(false);
    onSelect && onSelect(patient);
    setTimeout(() => inputRef.current && inputRef.current.blur(), 50);
  };

  const handleKeyDown = (e) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) { setOpen(true); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setHiIdx(i => Math.min(i+1, filtered.length-1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHiIdx(i => Math.max(i-1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (filtered[hiIdx]) handleSelect(filtered[hiIdx]); }
    else if (e.key === 'Escape') { setOpen(false); setDirty(false); setQuery(value || ''); setNewMode(false); }
  };

  useEffect(() => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll('.psi-item');
    if (items[hiIdx]) items[hiIdx].scrollIntoView({ block: 'nearest' });
  }, [hiIdx]);

  const avatarColor = (name) => {
    const colors = ['#0a7c6e','#3a7bd5','#7c3aed','#e8943a','#3aa876','#c9a84c','#dc2626'];
    let h = 0; for (let i = 0; i < (name||'').length; i++) h = (h*31 + name.charCodeAt(i)) & 0xffffff;
    return colors[Math.abs(h) % colors.length];
  };
  const initials = (name) => S(name).split(' ').filter(Boolean).slice(0,2).map(w=>w[0].toUpperCase()).join('') || '?';

  const isSelected = value && !dirty && query === value;

  // Save new patient
  const handleSaveNew = () => {
    if (!newF.name.trim() || !newF.phone.trim()) return;
    const newPat = {
      id:          'P' + Date.now().toString().slice(-6),
      name:        newF.name.trim(),
      phone:       newF.phone.trim(),
      email:       newF.email.trim(),
      dob:         newF.dob || '',
      sex:         newF.sex || '',
      bloodType:   newF.bloodType || '',
      allergies:   newF.allergies || '',
      occupation:  newF.occupation.trim(),
      maritalStatus: newF.maritalStatus || '',
      address:     newF.address || '',
      balance:     0,
      teeth:       {},
      attachments: [],
      history:     [],
      lastVisit:   localToday(),
      photoDataUrl: newF.photoDataUrl || '',
      photoFileId:  '',
    };
    // Add to our internal list immediately (instant availability)
    setInternalPatients(prev => [newPat, ...prev]);
    // Notify parent to persist in global patients state
    onNewPatient && onNewPatient(newPat);
    setQuery(newPat.name); setNewMode(false); setDirty(false); setOpen(false);
  };

  return h('div', {ref:wrapRef, className:'psi-wrap'},
    // ── Search input ──────────────────────────────────────────────────
    h('div', {className:'psi-input-row'},
      isSelected && value && h('div', {className:'psi-selected-dot', title:'Patient selected'}),
      h('input', {
        ref: inputRef, type:'text',
        className: 'psi-input' + (isSelected?' psi-selected':''),
        value: query,
        placeholder: placeholder || (required ? 'Search patient name, phone… *' : 'Search patient name or phone…'),
        onChange: handleInput,
        onFocus: () => { setOpen(true); setHiIdx(0); },
        onKeyDown: handleKeyDown,
        autoComplete: 'off', spellCheck: false,
      }),
      query && h('button', {type:'button', className:'psi-clear',
        onClick:()=>{ setQuery(''); setDirty(false); setOpen(false); setNewMode(false);
          onSelect&&onSelect(null); inputRef.current&&inputRef.current.focus(); }, tabIndex:-1},'✕'),
      !query && h('span', {className:'psi-icon'}, '🔍')
    ),

    // ── Dropdown ──────────────────────────────────────────────────────
    open && !newMode && h('div', {ref:listRef, className:'psi-dropdown'},
      filtered.length === 0 && !noMatch && h('div', {className:'psi-empty'},
        h('div', {style:{fontSize:13,color:'var(--md)',padding:'10px 12px'}}, 'Start typing to search patients…')
      ),
      filtered.map((p, i) => h('div', {
        key:p.id, className:'psi-item'+(i===hiIdx?' psi-hi':''),
        onMouseEnter:()=>setHiIdx(i),
        onMouseDown:(e)=>{e.preventDefault(); handleSelect(p);}
      },
        h('div', {className:'psi-avatar', style:{background:avatarColor(p.name)}}, initials(p.name)),
        h('div', {className:'psi-info'},
          h('div', {className:'psi-name'},
            (() => {
              if (!q) return p.name;
              const name = S(p.name);
              const lo   = name.toLowerCase();
              const si   = lo.indexOf(q);
              if (si === -1) return name;
              return h('span', null,
                name.slice(0, si),
                h('mark', {style:{background:'#fef08a',borderRadius:2,padding:'0 1px'}}, name.slice(si, si+q.length)),
                name.slice(si+q.length)
              );
            })()
          ),
          h('div', {className:'psi-sub'},
            p.dob && h('span', null, 'Age '+(new Date().getFullYear()-new Date(p.dob).getFullYear())),
            p.allergies && h('span', {style:{marginLeft:4,background:'#fef3c7',color:'#92400e',borderRadius:4,padding:'0 5px',fontSize:10}}, '⚠ '+S(p.allergies).slice(0,20))
          )
        ),
        p.balance > 0 && h('div', {className:'psi-badge-bal'}, '₱'+p$(p.balance))
      )),

      // ── "Add as new patient" option ──────────────────────────────────
      noMatch && h('div', {className:'psi-new-option',
        onMouseDown:(e)=>{e.preventDefault(); setOpen(false); setNewMode(true);
          setNewF({name:query.trim(),phone:'',email:'',dob:'',sex:'',bloodType:'',allergies:'',occupation:'',maritalStatus:'',address:'',photoDataUrl:''}); }
      },
        h('div', {className:'psi-new-icon'}, '➕'),
        h('div', {className:'psi-new-text'},
          h('div', {style:{fontWeight:700,fontSize:13}}, 'Add "'+query+'" as new patient'),
          h('div', {style:{fontSize:11,color:'var(--md)'}}, 'Create a quick profile and continue booking')
        )
      ),
      filtered.length > 0 && h('div', {className:'psi-footer'},
        filtered.length+' patient'+(filtered.length!==1?'s':'')+' found',
        noMatch && ' · No exact match'
      )
    ),

    // ── New patient inline panel ──────────────────────────────────────
    newMode && h('div', {className:'psi-new-panel'},
      h('div', {className:'psi-new-header'},
        h('div', {style:{fontWeight:700,fontSize:14,color:'var(--dk)'}}, '➕ New Patient'),
        h('div', {style:{fontSize:11,color:'var(--md)'}}, 'Fill required fields · photo is optional'),
        h('button', {type:'button', className:'btn bgh bsm',
          onClick:()=>{setNewMode(false); setQuery(''); onSelect&&onSelect(null);}}, '✕ Cancel')
      ),

      // Photo capture row
      h('div', {className:'psi-new-photo-row'},
        newF.photoDataUrl
          ? h('div', {className:'psi-new-photo-preview'},
              h('img', {src:newF.photoDataUrl, alt:'Patient photo', className:'psi-new-photo-img'}),
              h('button', {type:'button', className:'psi-new-photo-del', onClick:()=>setNewF(x=>({...x,photoDataUrl:''}))}, '✕')
            )
          : h('div', {className:'psi-new-photo-placeholder'}, '👤'),
        h('div', {className:'psi-new-photo-btns'},
          h('button', {type:'button', className:'btn bg2 bsm', onClick:openCam}, '📷 Take Photo'),
          h('label', {className:'btn bgh bsm', style:{cursor:'pointer'}},
            '🖼 Upload Photo',
            h('input', {type:'file', accept:'image/*', style:{display:'none'}, onChange:pickPhoto})
          )
        )
      ),

      // Camera modal
      camOpen && h('div', {className:'psi-cam-wrap'},
        h('video', {ref:videoRef, autoPlay:true, playsInline:true, className:'psi-cam-video'}),
        h('canvas', {ref:canvasRef, style:{display:'none'}}),
        h('div', {className:'psi-cam-btns'},
          h('button', {type:'button', className:'btn bp', onClick:captureCam}, '📸 Capture'),
          h('button', {type:'button', className:'btn bgh', onClick:closeCam}, '✕ Close')
        )
      ),

      // ── SECTION 1: Identity (required) ─────────────────────────────────
      h('div', {className:'fg2',style:{marginTop:10}},
        h(Field, {label:'Full Name *'},
          h('input', {value:newF.name, placeholder:'Juan dela Cruz',
            onChange:e=>setNewF(x=>({...x,name:e.target.value})), autoFocus:true})
        ),
        h(Field, {label:'Phone *'},
          h('input', {value:newF.phone, placeholder:'09171234567',
            onChange:e=>setNewF(x=>({...x,phone:e.target.value}))})
        )
      ),
      // ── SECTION 2: Contact ───────────────────────────────────────────────
      h('div', {className:'fg2'},
        h(Field, {label:'Email'},
          h('input', {type:'email', value:newF.email, placeholder:'patient@email.com',
            onChange:e=>setNewF(x=>({...x,email:e.target.value}))})
        ),
        h(Field, {label:'Date of Birth'},
          h('input', {type:'date', value:newF.dob, onChange:e=>setNewF(x=>({...x,dob:e.target.value}))})
        )
      ),
      // ── SECTION 3: Demographics ──────────────────────────────────────────
      h('div', {className:'fg2'},
        h(Field, {label:'Sex'},
          h('select', {value:newF.sex, onChange:e=>setNewF(x=>({...x,sex:e.target.value}))},
            h('option',{value:''},'— Select —'),
            h('option',{value:'Female'},'Female'),
            h('option',{value:'Male'},'Male')
          )
        ),
        h(Field, {label:'Marital Status'},
          h('select', {value:newF.maritalStatus, onChange:e=>setNewF(x=>({...x,maritalStatus:e.target.value}))},
            h('option',{value:''},'— Select —'),
            ['Single','Married','Widowed','Separated','Divorced'].map(ms=>h('option',{key:ms,value:ms},ms))
          )
        )
      ),
      // ── SECTION 4: Occupation & Medical ─────────────────────────────────
      h('div', {className:'fg2'},
        h(Field, {label:'Occupation'},
          h('input', {value:newF.occupation, placeholder:'e.g. Teacher, Nurse, Engineer…',
            onChange:e=>setNewF(x=>({...x,occupation:e.target.value}))})
        ),
        h(Field, {label:'Blood Type'},
          h('select', {value:newF.bloodType, onChange:e=>setNewF(x=>({...x,bloodType:e.target.value}))},
            h('option',{value:''},'Unknown'),
            ['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bt=>h('option',{key:bt,value:bt},bt))
          )
        )
      ),
      h(Field, {label:'Allergies'},
        h('input', {value:newF.allergies, placeholder:'e.g. Penicillin, latex — or "None"',
          onChange:e=>setNewF(x=>({...x,allergies:e.target.value}))})
      ),
      h(Field, {label:'Address'},
        h('input', {value:newF.address, placeholder:'Street, City',
          onChange:e=>setNewF(x=>({...x,address:e.target.value}))})
      ),

      h('button', {
        type:'button', className:'btn bp', style:{width:'100%',marginTop:8},
        onClick:handleSaveNew,
        disabled: !newF.name.trim() || !newF.phone.trim()
      }, '✅ Save New Patient & Continue')
    )
  );
}


function highlightMatch(text, query) {
  if (!query || !text) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return [
    text.substring(0, idx),
    h('mark', { key: 'hl', style: { background: '#fef08a', borderRadius: 2, padding: '0 1px' } },
      text.substring(idx, idx + query.length)
    ),
    text.substring(idx + query.length),
  ];
}


function ApptForm({patients,appointments,onClose,onSave,onAddPatient,syncUrl,addToast,existing}){
  const isEdit = !!existing;
  const [f,setF]=useState(isEdit
    ? {...existing, services:svcList(existing), fee:existing.fee||'', serviceNotes:existing.serviceNotes||{}}
    : {patientId:'',patientName:'',services:[],service:'',serviceNotes:{},date:'',time:'09:00',dentist:'Dr. Arnold Colao',notes:'',fee:'',phone:'',email:'',attachments:[],procedures:[]});
  const [selectedPatient, setSelectedPatient] = useState(isEdit ? ((patients||[]).find(p=>p.id===existing.patientId)||null) : null);
  const [showVoicePanel, setShowVoicePanel] = useState(false);
  // Always-current ref so async Drive-upload callbacks don't see stale f.attachments
  const fRef = useRef(f);
  fRef.current = f;

  const s=(k,v)=>setF(x=>({...x,[k]:v}));

  // Apply a parsed voice command to the form fields
  const applyVoiceCommand = (parsed) => {
    setF(x => {
      let next = {...x};
      if (parsed.patient) {
        setSelectedPatient(parsed.patient);
        next = {...next, patientId:parsed.patient.id, patientName:parsed.patient.name,
          phone:S(parsed.patient.phone), email:S(parsed.patient.email)};
      }
      if (parsed.service) {
        const cur = svcList(next);
        if (!cur.includes(parsed.service)) {
          const sv = getActiveSvcs().find(a=>a.name===parsed.service);
          const nextSvcs = [...cur, parsed.service];
          const fee = nextSvcs.reduce((sum,nm)=>{const x=getActiveSvcs().find(a=>a.name===nm);return sum+(x?+x.fee:0);},0);
          next = {...next, services:nextSvcs, service:nextSvcs[0]||'', fee};
        }
      }
      if (parsed.date) next = {...next, date:parsed.date};
      if (parsed.time) next = {...next, time:parsed.time};
      if (parsed.fdi && parsed.condition) {
        const procs = [...safe(next.procedures), {fdi:parsed.fdi, surface:parsed.surface||null, condition:parsed.condition, note:parsed.note||''}];
        next = {...next, procedures:procs};
      }
      return next;
    });
    addToast && addToast('Voice command applied','success');
    setShowVoicePanel(false);
  };

  // Auto-fill ALL patient fields when a patient is selected
  const selectPatient = (p) => {
    if (!p) {
      setSelectedPatient(null);
      setF(x=>({...x,patientId:'',patientName:'',phone:'',email:''}));
      return;
    }
    setSelectedPatient(p);
    setF(x=>({
      ...x,
      patientId:   p.id,
      patientName: p.name,
      phone:       S(p.phone),
      email:       S(p.email),
    }));
  };

  // Handle new patient created inline
  const handleNewPatient = (newPat) => {
    // PSI owns internal list (setInternalPatients called in handleSaveNew)
    // Notify parent to persist
    onAddPatient && onAddPatient(newPat);
    // Select them
    selectPatient(newPat);
  };
  const addSvc=n=>{
  if(!n)return;
  const cur=svcList(f);
  if(cur.includes(n))return;
  const next=[...cur,n];
  const fee=next.reduce((sum,nm)=>{const x=getActiveSvcs().find(a=>a.name===nm);return sum+(x?+x.fee:0);},0);
  setF(x=>({...x,services:next,service:next[0]||'',fee}));
};
const rmSvc=n=>{
  const next=svcList(f).filter(x=>x!==n);
  const fee=next.reduce((sum,nm)=>{const x=getActiveSvcs().find(a=>a.name===nm);return sum+(x?+x.fee:0);},0);
  setF(x=>({...x,services:next,service:next[0]||'',fee}));
};

  const _primarySvc = svcList(f)[0] || '';
  const check = (f.date && f.time && _primarySvc)
    ? checkAvailability(appointments || [], f.date, f.time, _primarySvc)
    : null;
  const isAvailable = !check || check.available;
  const ok = f.patientId && f.patientName && svcList(f).length > 0 && f.date && f.time && isAvailable;

  const showSuggestions = f.service && f.date && check && !check.available;
  const suggestions = showSuggestions
    ? aiSuggestSlots(appointments || [], f.service, f.date, 7).slice(0, 4)
    : [];

  return h(Modal,{title:isEdit?'Edit Appointment':'Book Appointment',sub:isEdit?'Update appointment details':'Schedule a new dental visit',onClose,large:true,
    footer:h(Fragment,null,
      h('button',{className:'btn bgh',onClick:onClose},'Cancel'),
      h('button',{className:'btn bp',onClick:()=>ok&&onSave(f),disabled:!ok,title:!ok&&check?check.message:''},isEdit?'Save Changes':'Book')
    )},
    h(Field,{label:'Patient *'},
      h(PatientSearchInput, {
        patients: patients,
        value: f.patientName,
        placeholder: 'Search by name or phone — or type new name to add…',
        required: true,
        onSelect: selectPatient,
        onNewPatient: handleNewPatient,
      })
    ),
    // Selected patient quick-info card
    selectedPatient && h('div', {className:'appt-patient-card'},
      selectedPatient.photoDataUrl
        ? h('img', {src:selectedPatient.photoDataUrl, alt:selectedPatient.name, className:'appt-patient-photo'})
        : h('div', {className:'appt-patient-avatar',
            style:{background:'#0a7c6e',color:'#fff',width:40,height:40,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:14}},
            S(selectedPatient.name).split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase()
          ),
      h('div', {className:'appt-patient-info'},
        h('div', {style:{fontWeight:700,fontSize:14,color:'var(--dk)'}}, selectedPatient.name),
        h('div', {style:{fontSize:12,color:'var(--md)',marginTop:2}},
          S(selectedPatient.phone),
          selectedPatient.dob && ' · Age '+(new Date().getFullYear()-new Date(selectedPatient.dob).getFullYear()),
          selectedPatient.bloodType && h('span',{style:{marginLeft:6,background:'#fee2e2',color:'#991b1b',borderRadius:4,padding:'0 4px',fontSize:11,fontWeight:700}}, selectedPatient.bloodType)
        ),
        selectedPatient.allergies && h('div',{style:{fontSize:11,color:'#92400e',marginTop:2}},
          '⚠ Allergies: '+selectedPatient.allergies
        ),
        selectedPatient.lastVisit && selectedPatient.lastVisit !== '—' && h('div',{style:{fontSize:11,color:'var(--md)',marginTop:1}},
          'Last visit: '+selectedPatient.lastVisit
        )
      ),
      h('div',{style:{marginLeft:'auto',fontSize:11,color:'var(--t)',fontWeight:600,background:'var(--tp)',padding:'2px 8px',borderRadius:20}},
        selectedPatient.id
      )
    ),
    h(Field,{label:'Services *'},
      svcList(f).length > 0 && h('table',{className:'appt-svc-table'},
        h('thead',null,h('tr',null,
          h('th',null,'#'),h('th',null,'Service'),h('th',null,'Category'),h('th',null,'Note'),h('th',null,'Fee (₱)'),h('th',null,'')
        )),
        h('tbody',null,
          svcList(f).map((sv,i)=>{
            const cat = (getActiveSvcs().find(x=>x.name===sv)||{}).cat || '—';
            const fee = (getActiveSvcs().find(x=>x.name===sv)||{}).fee;
            return h('tr',{key:i},
              h('td',{style:{color:'var(--md)',fontWeight:600}},i+1),
              h('td',null,h('strong',null,sv)),
              h('td',{style:{color:'var(--md)',fontSize:11.5}},cat),
              h('td',null,h('input',{type:'text',className:'svc-note-input',placeholder:'add note…',
                value:(f.serviceNotes||{})[sv]||'',
                onChange:e=>s('serviceNotes',{...(f.serviceNotes||{}),[sv]:e.target.value})
              })),
              h('td',{style:{fontWeight:600,color:'var(--t)',whiteSpace:'nowrap'}},fee!=null?'₱'+p$(fee):'—'),
              h('td',null,h('button',{type:'button',className:'ocr-del-row-btn',onClick:()=>rmSvc(sv)},'×'))
            );
          })
        )
      ),
      h('div',{style:{marginTop:6}},
        h('select',{value:'',className:'svc-add-select',onChange:e=>addSvc(e.target.value)},
          h('option',{value:''},svcList(f).length?'＋ Add another service…':'＋ Add service…'),
          Object.entries(getActiveSvcsByCat()).map(([cat,svcs])=>
            h('optgroup',{key:cat,label:cat},
              svcs.map(sv=>h('option',{key:sv.name,value:sv.name},sv.name+' — ₱'+p$(sv.fee)))
            )
          )
        )
      )
    ),
    h('div',{className:'fg2'},
      h(Field,{label:'Total Fee (₱)'},h('input',{type:'number',value:f.fee,onChange:e=>s('fee',+e.target.value)}))
    ),
    h('div',{className:'fg2'},
      h(Field,{label:'Date *'},h('input',{type:'date',value:f.date,onChange:e=>s('date',e.target.value),min:localToday()})),
      h(Field,{label:'Dentist'},h('input',{type:'text',value:'Dr. Arnold Colao',readOnly:true,style:{background:'var(--bg3)',color:'var(--md)',cursor:'default'}}))
    ),
    h(Field,{label:'Time'+(_primarySvc?' · '+(SERVICE_DURATIONS[_primarySvc]||DEFAULT_SLOT_MIN)+' min slot':'')},
      h(TimeSlotGrid,{
        appointments: appointments || [],
        selectedDate: f.date,
        selectedService: _primarySvc,
        selectedTime: f.time,
        onTimeChange: (t) => s('time', t)
      })
    ),
    f.date && f.time && _primarySvc && h(AvailabilityBanner, {
      appointments: appointments || [],
      date: f.date, time: f.time, service: _primarySvc
    }),
    showSuggestions && suggestions.length > 0 && h('div', {className: 'avail-suggest'},
      h('div', {className: 'avail-suggest-title'}, '🤖 Try one of these available slots:'),
      h('div', {className: 'avail-suggest-grid'},
        suggestions.map((sg, i) => h('button', {
          key: i,
          type: 'button',
          className: 'avail-suggest-btn',
          onClick: () => { s('date', sg.date); s('time', sg.time); }
        },
          h('div', {style: {fontWeight: 600, fontSize: 12}}, fmtDateWithDay(sg.date)),
          h('div', {style: {fontSize: 11, color: 'var(--md)'}}, fmtTime(sg.time))
        ))
      )
    ),
    // ── Procedures Performed (links to dental chart on completion) ───────────
    h(Field,{label:'Procedures Performed (Dental Chart)',labelHint:'Auto-updates patient chart when marked Complete'},
      h('div',{className:'proc-chart-section'},
        // procedure rows
        safe(f.procedures).map((row,i)=>
          h('div',{key:i,className:'proc-row'},
            // Tooth selector
            h('select',{value:row.fdi||'',className:'proc-fdi-sel',
              onChange:e=>{
                const rows=[...safe(f.procedures)];
                rows[i]={...rows[i],fdi:e.target.value?+e.target.value:null};
                s('procedures',rows);
              }},
              h('option',{value:''},'Tooth #'),
              ALL_FDI.map(n=>h('option',{key:n,value:n},'#'+n+' '+toothName(n)))
            ),
            // Surface selector (optional)
            h('select',{value:row.surface||'',className:'proc-surf-sel',
              onChange:e=>{
                const rows=[...safe(f.procedures)];
                rows[i]={...rows[i],surface:e.target.value||null};
                s('procedures',rows);
              }},
              h('option',{value:''},'Surface'),
              ['mesial','distal','occlusal','incisal','buccal','labial','lingual'].map(sv=>
                h('option',{key:sv,value:sv},sv.charAt(0).toUpperCase()+sv.slice(1))
              )
            ),
            // Condition / procedure selector
            h('select',{value:row.condition||'',className:'proc-cond-sel',
              onChange:e=>{
                const rows=[...safe(f.procedures)];
                rows[i]={...rows[i],condition:e.target.value||null};
                s('procedures',rows);
              }},
              h('option',{value:''},'Procedure / Finding'),
              CONDITION_KEYS.filter(k=>k!=='healthy').map(k=>{
                const c=CONDITIONS[k];
                return h('option',{key:k,value:k},c.symbol+' '+c.label);
              })
            ),
            // Note
            h('input',{type:'text',className:'proc-note-inp',placeholder:'Note (optional)',value:row.note||'',
              onChange:e=>{
                const rows=[...safe(f.procedures)];
                rows[i]={...rows[i],note:e.target.value};
                s('procedures',rows);
              }
            }),
            // Remove row
            h('button',{type:'button',className:'proc-del-btn',title:'Remove',
              onClick:()=>s('procedures',safe(f.procedures).filter((_,j)=>j!==i))
            },'×')
          )
        ),
        h('div',{style:{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}},
          h('button',{type:'button',className:'proc-add-btn',
            onClick:()=>s('procedures',[...safe(f.procedures),{fdi:null,surface:null,condition:null,note:''}])
          },'+ Add Procedure'),
          h('button',{type:'button',className:'proc-add-btn',
            style:{background: showVoicePanel?'var(--t)':'var(--tp)', color:showVoicePanel?'#fff':'var(--t)',
              display:'flex',alignItems:'center',gap:5},
            onClick:()=>setShowVoicePanel(v=>!v)},
            h('svg',{width:13,height:13,viewBox:'0 0 24 24',fill:'none'},
              h('rect',{x:9,y:2,width:6,height:11,rx:3,fill:'currentColor'}),
              h('path',{d:'M5 11a7 7 0 0014 0',stroke:'currentColor',strokeWidth:2,strokeLinecap:'round',fill:'none'}),
              h('line',{x1:12,y1:18,x2:12,y2:22,stroke:'currentColor',strokeWidth:2}),
              h('line',{x1:8,y1:22,x2:16,y2:22,stroke:'currentColor',strokeWidth:2})
            ),
            '🎙 Voice Command'
          )
        ),
        showVoicePanel && h(VoiceCommandPanel, {
          patients, activeServices:getActiveSvcs(),
          onApply:applyVoiceCommand,
          onClose:()=>setShowVoicePanel(false)
        })
      )
    ),
    h(Field,{label:'Notes'},
      h('div',{style:{position:'relative',display:'flex',gap:6,alignItems:'flex-start'}},
        h('textarea',{value:f.notes,onChange:e=>s('notes',e.target.value),
          placeholder:'Notes or concerns… (or click mic to dictate)',style:{flex:1}}),
        h(VoiceMicBtn,{
          title:'Dictate note',
          onResult:t=>s('notes',(f.notes?f.notes+' ':'')+t)
        })
      )
    ),
    h(AttachmentPanel, {
      attachments: safe(f.attachments),
      label: 'X-Rays & Clinical Photos',
      syncUrl: syncUrl || '',
      patientId: f.patientId || 'appt-draft',
      addToast: addToast,
      // Use fRef.current so async Drive-upload callbacks always see latest attachments
      onAdd: att => setF(x => ({...x, attachments: [...safe(x.attachments), att]})),
      onUpdate: (attId, newAtt) => setF(x => ({...x, attachments: safe(x.attachments).map(a=>a.id===attId?newAtt:a)})),
      onRemove: id => {
        const att = safe(fRef.current.attachments).find(a => a.id === id);
        if (att && att.storage === 'idb') idbDelete(id).catch(()=>{});
        setF(x => ({...x, attachments: safe(x.attachments).filter(a=>a.id!==id)}));
      },
      onUpdateNote: (id, note) => setF(x => ({...x, attachments: safe(x.attachments).map(a=>a.id===id?{...a,note}:a)})),
    })
  );
}

// AppointmentCalendar — month grid view
function AppointmentCalendar({appointments, onDayClick}){
  const [viewMonth, setViewMonth] = useState(()=>{
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), 1);
  });
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const byDate = {};
  appointments.forEach(a => {
    if (!a.date || a.status === 'cancelled') return;
    if (!byDate[a.date]) byDate[a.date] = [];
    byDate[a.date].push(a);
  });

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = year + '-' + String(month+1).padStart(2,'0') + '-' + String(d).padStart(2,'0');
    cells.push({ day: d, dateStr, appts: byDate[dateStr] || [] });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const todayStr = localToday();
  const monthLabel = viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const prevMonth = ()=> setViewMonth(new Date(year, month-1, 1));
  const nextMonth = ()=> setViewMonth(new Date(year, month+1, 1));
  const goToday = ()=> {
    const t = new Date();
    setViewMonth(new Date(t.getFullYear(), t.getMonth(), 1));
  };

  return h('div', {className: 'cal-wrap'},
    h('div', {className: 'cal-head'},
      h('button', {type: 'button', className: 'cal-nav-btn', onClick: prevMonth, title: 'Previous month'}, '‹'),
      h('div', {className: 'cal-month-label'}, monthLabel),
      h('button', {type: 'button', className: 'cal-nav-btn', onClick: nextMonth, title: 'Next month'}, '›'),
      h('button', {type: 'button', className: 'btn bgh bsm', onClick: goToday, style: {marginLeft: 'auto'}}, 'Today')
    ),
    h('div', {className: 'cal-weekdays'},
      ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d =>
        h('div', {key: d, className: 'cal-weekday'}, d)
      )
    ),
    h('div', {className: 'cal-grid'},
      cells.map((c, i) => {
        if (!c) return h('div', {key: i, className: 'cal-cell cal-blank'});
        const isToday = c.dateStr === todayStr;
        const hasAppts = c.appts.length > 0;
        const arrivedCount = c.appts.filter(a => a.arrived).length;
        const pendingCount = c.appts.filter(a => a.status === 'pending').length;
        return h('div', {
            key: i,
            className: 'cal-cell' + (isToday ? ' cal-today' : '') + (hasAppts ? ' cal-hasappts' : ''),
            onClick: hasAppts ? ()=>onDayClick(c.dateStr, c.appts) : null,
            title: hasAppts ? c.appts.length + ' appointment(s)' : ''
          },
          h('div', {className: 'cal-day-num'}, c.day),
          hasAppts && h('div', {className: 'cal-appt-list'},
            c.appts.slice(0, 3).map((a, j) =>
              h('div', {
                key: j,
                className: 'cal-appt-pill cal-appt-' + (a.arrived ? 'arrived' : a.status)
              },
                fmtTime(a.time) + ' ' + (a.patientName.split(' ')[0])
              )
            ),
            c.appts.length > 3 && h('div', {className: 'cal-appt-more'}, '+' + (c.appts.length - 3) + ' more')
          ),
          hasAppts && h('div', {className: 'cal-cell-summary'},
            pendingCount > 0 && h('span', {className: 'cal-dot cal-dot-pending', title: pendingCount + ' pending'}),
            arrivedCount > 0 && h('span', {className: 'cal-dot cal-dot-arrived', title: arrivedCount + ' arrived'})
          )
        );
      })
    ),
    h('div', {className: 'cal-legend'},
      h('span', null, h('span', {className: 'cal-swatch cal-appt-confirmed'}), 'Confirmed'),
      h('span', null, h('span', {className: 'cal-swatch cal-appt-pending'}), 'Pending'),
      h('span', null, h('span', {className: 'cal-swatch cal-appt-completed'}), 'Completed'),
      h('span', null, h('span', {className: 'cal-swatch cal-appt-arrived'}), 'Arrived')
    )
  );
}

// Appointments — sortable table + calendar view + filters
function Appointments({appointments,setAppointments,patients,setPatients,setNotifications,setPayments,addToast,syncUrl}){
  const [filter,setFilter]=useState('all');
  const [search,setSearch]=useState('');
  const [modal,setModal]=useState(false);
  const [detail,setDetail]=useState(null);
  const [editAppt,setEditAppt]=useState(null);
  const [viewMode,setViewMode]=useState('table');
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [sortBy,setSortBy]=useState('datetime');
  const [sortDir,setSortDir]=useState('desc');
  const [dayDetail,setDayDetail]=useState(null);

  const STATUSES=['all','pending','confirmed','completed','cancelled','arrived'];

  let filtered=appointments.filter(a=>{
    if(filter==='arrived')return a.arrived;
    return filter==='all'||a.status===filter;
  }).filter(a=>!search||
    S(a.patientName).toLowerCase().includes(S(search).toLowerCase())||
    svcStr(a).toLowerCase().includes(S(search).toLowerCase()));

  const sortFns = {
    patient:  (a,b)=> S(a.patientName).localeCompare(S(b.patientName)),
    service:  (a,b)=> S(a.service).localeCompare(S(b.service)),
    datetime: (a,b)=> dateTimeValue(a.date,a.time) - dateTimeValue(b.date,b.time),
    fee:      (a,b)=> (+a.fee||0) - (+b.fee||0),
    status:   (a,b)=> S(a.status).localeCompare(S(b.status)),
  };
  filtered = [...filtered].sort((a,b)=>{
    const cmp = (sortFns[sortBy] || sortFns.datetime)(a,b);
    return sortDir==='asc' ? cmp : -cmp;
  });
  const { pageItems: pagedAppts, PagerUI: ApptsPager } = usePagination(filtered);

  const toggleSort = (col)=>{
    if (sortBy === col) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  };
  const sortIcon = (col)=>{
    if (sortBy !== col) return h('span', {className: 'sort-icon sort-icon-idle'}, '⇅');
    return h('span', {className: 'sort-icon sort-icon-active'}, sortDir === 'asc' ? '↑' : '↓');
  };

  const payForAppt = (a) => {
    if (!setPayments) return;
    const ref = 'PAY-APT-' + a.id;
    setPayments(prev => {
      if (prev.some(p => p.ref === ref)) { addToast('Already recorded for this appointment','info'); return prev; }
      return [{
        id:'PAY'+uid(), patientId:a.patientId, patientName:a.patientName,
        amount:a.fee||0, method:'Cash', services:svcList(a), service:a.service,
        date:localToday(), status:'paid', ref,
      }, ...prev];
    });
    setAppointments(prev=>prev.map(x=>x.id===a.id?{...x,status:'completed'}:x));
    addToast('₱'+p$(a.fee||0)+' payment recorded for '+a.patientName,'success');
  };

  const action=(id,status)=>{
    const a=appointments.find(x=>x.id===id);
    const extra = status==='completed' ? {arrived:false} : {};
    setAppointments(prev=>prev.map(x=>{
      if(x.id!==id) return x;
      const updated={...x,status,...extra};
      syncOneRecord('appointments', updated, syncUrl);
      return updated;
    }));
    const msgs={confirmed:'Confirmed! Notifications sent.',completed:'Marked complete.',cancelled:'Appointment cancelled.'};
    addToast(msgs[status]||'Updated.',status==='cancelled'?'error':'success');
    // ── Auto-update dental chart from procedures when appointment is completed ──
    if (status === 'completed' && a && safe(a.procedures).length > 0) {
      const validProcs = safe(a.procedures).filter(p => p.fdi && p.condition);
      if (validProcs.length > 0) {
        setPatients(prev => prev.map(pat => {
          if (pat.id !== a.patientId) return pat;
          const newTeeth = {...(pat.teeth||{})};
          const historyEntry = {
            id: 'H'+uid(),
            date: a.date,
            dentist: a.dentist || 'Dr. Arnold Colao',
            appointmentId: a.id,
            services: svcList(a),
            procedures: validProcs,
          };
          validProcs.forEach(p => {
            if (p.surface) {
              const sk = p.fdi+'_surfaces';
              newTeeth[sk] = {...(newTeeth[sk]||{}), [p.surface]: p.condition};
            } else {
              newTeeth[p.fdi] = p.condition;
            }
          });
          const newHistory = [{...historyEntry}, ...(pat.history||[])];
          const updated = {...pat, teeth: newTeeth, history: newHistory, lastVisit: a.date};
          syncOneRecord('patients', updated, syncUrl);
          return updated;
        }));
        addToast(validProcs.length+' procedure(s) applied to dental chart for '+a.patientName,'success');
      }
    }
    if(status==='confirmed'&&a){
      sendApptNotif('confirmation',a,syncUrl,setNotifications);
      if (setPayments && a.fee > 0) {
        const refTag = 'auto-' + a.id;
        setPayments(prev => {
          if (prev.some(p => p.ref === refTag)) return prev;
          return [{
            id: 'PAY'+uid(),
            patientId: a.patientId, patientName: a.patientName,
            amount: a.fee, method: 'pending', services: svcList(a), service: a.service,
            date: a.date, status: 'pending', ref: refTag
          }, ...prev];
        });
      }
    }
    if(status==='cancelled'&&a){
      sendApptNotif('cancellation',a,syncUrl,setNotifications);
    }
  };

  return h('div',null,
    h('div',{className:'ph'},
      h('div',null,h('div',{className:'ptl'},'Appointments'),h('div',{className:'psl'},'Manage and confirm patient visits')),
      h('div',{className:'ph-act'},
        h('div',{className:'view-toggle'},
          h('button',{
            type:'button',
            className:'vt-btn'+(viewMode==='table'?' act':''),
            style: viewMode==='table' ? {background:'#fff',color:'var(--t)',fontWeight:700,boxShadow:'0 1px 3px rgba(0,0,0,.1)'} : {},
            onClick:()=>setViewMode('table')
          },'📋 Table'),
          h('button',{
            type:'button',
            className:'vt-btn'+(viewMode==='calendar'?' act':''),
            style: viewMode==='calendar' ? {background:'#fff',color:'var(--t)',fontWeight:700,boxShadow:'0 1px 3px rgba(0,0,0,.1)'} : {},
            onClick:()=>setViewMode('calendar')
          },'📅 Calendar')
        ),
        planHas('conflictAnalysis')
          ? h('button',{className:'btn bg2',onClick:()=>setShowAnalysis(true),title:'View conflict analysis'},'🔍 Analysis')
          : h('button',{className:'btn bg2',disabled:true,title:'Upgrade to Professional to unlock Conflict Analysis',style:{opacity:.45,cursor:'not-allowed'}},'🔍 Analysis ',h('span',{style:{fontSize:10,color:'#d4a017'}},'🔒')),
        h('button',{className:'btn bp',onClick:()=>setModal(true)},h(Svg,{d:IC.plus,size:14}),' New')
      )
    ),
    h(AutoConfirmBanner, {appointments, setAppointments, addToast}),

    viewMode === 'table' && h('div',{style:{marginBottom:12}},
      h('div',{className:'filters'},STATUSES.map(f=>h('button',{key:f,className:'fb'+(filter===f?' act':''),onClick:()=>setFilter(f)},
        f==='arrived'?'🪑 In Clinic':f.charAt(0).toUpperCase()+f.slice(1)
      ))),
      h('div',{className:'tsr',style:{width:'100%',maxWidth:320}},h(Svg,{d:IC.search,size:13,color:'var(--lt)'}),h('input',{placeholder:'Search…',value:search,onChange:e=>setSearch(e.target.value)})),
      h('div',{style:{fontSize:11,color:'var(--md)',marginTop:6}}, filtered.length + ' appointment' + (filtered.length!==1?'s':'') + ' · sorted by ' + sortBy + ' (' + sortDir + ')')
    ),

    viewMode === 'calendar' && h(AppointmentCalendar, {
      appointments,
      onDayClick: (dateStr, appts) => setDayDetail({date: dateStr, appts})
    }),

    viewMode === 'table' && h(Fragment, null,
      h('div',{className:'card dt'},h('div',{className:'tw'},h('table',null,
        h('thead',null,h('tr',null,
          h('th', {onClick: ()=>toggleSort('patient'), style: {cursor:'pointer',userSelect:'none'}}, 'Patient ', sortIcon('patient')),
          h('th', {onClick: ()=>toggleSort('service'), style: {cursor:'pointer',userSelect:'none'}}, 'Service ', sortIcon('service')),
          h('th', {onClick: ()=>toggleSort('datetime'), style: {cursor:'pointer',userSelect:'none'}}, 'Date & Time ', sortIcon('datetime')),
          h('th', {onClick: ()=>toggleSort('fee'), style: {cursor:'pointer',userSelect:'none'}}, 'Fee ', sortIcon('fee')),
          h('th', {onClick: ()=>toggleSort('status'), style: {cursor:'pointer',userSelect:'none'}}, 'Status ', sortIcon('status')),
          h('th', null, 'Actions')
        )),
        h('tbody',null,filtered.length===0?h('tr',null,h('td',{colSpan:6},h('div',{className:'empty'},'No appointments found'))):
          pagedAppts.map(a=>{
            const isToday2 = a.date===localToday();
            const doCheckIn2 = () => {
              const updated={...a,checkedIn:true,checkedInAt:new Date().toISOString()};
              setAppointments(prev=>prev.map(x=>x.id===a.id?updated:x));
              syncOneRecord('appointments',updated,syncUrl);
              addToast(a.patientName+' checked in','success');
            };
            return h('tr',{key:a.id},
              h('td',null,
                h('div',{style:{display:'flex',alignItems:'center',gap:5,flexWrap:'wrap'}},
                  h('strong',null,a.patientName),
                  a.appointmentType==='standby'&&h('span',{className:'standby-badge'},'Q'+a.queueNumber),
                  a.noShow&&h('span',{className:'noshow-badge'},'No-show'),
                  a.checkedIn&&h('span',{className:'checkedin-badge'},'✓ In'),
                  a.arrived&&!a.checkedIn&&h('span',{className:'kiosk-arrived-badge',style:{fontSize:9}},'🪑')
                ),
                h('div',{style:{fontSize:11,color:'var(--lt)'}},a.dentist)
              ),
              h('td',null,svcStr(a)),
              h('td',{style:{whiteSpace:'nowrap'}},
                h('div',{style:{fontWeight:600,fontSize:13}}, fmtDateWithDay(a.date)),
                a.appointmentType==='standby'
                  ? h('span',{className:'standby-badge',style:{fontSize:10}},'Standby — No Fixed Time')
                  : h('div',{style:{fontSize:11,color:'var(--md)'}}, fmtTime(a.time) + ' · ' + fmtDateRelative(a.date))
              ),
              h('td',null,'₱'+p$(a.fee)),
              h('td',null,a.arrived?h('span',{className:'kiosk-arrived-badge'},'✓ In Clinic'):h(SBadge,{status:a.status})),
              h('td',null,h('div',{className:'gap8'},
                h('button',{className:'btn bgh bsm',onClick:()=>setDetail(a)},h(Svg,{d:IC.eye,size:13})),
                isToday2&&!a.checkedIn&&(a.status==='confirmed'||a.status==='pending')&&!a.noShow&&
                  h('button',{className:'checkin-btn',onClick:doCheckIn2},'✓ In'),
                a.status==='pending'&&!a.arrived&&h('button',{className:'btn bs bsm',onClick:()=>action(a.id,'confirmed')},'Confirm'),
                (a.status==='confirmed'||a.arrived)&&a.status!=='completed'&&h('button',{className:'btn bp bsm',onClick:()=>action(a.id,'completed')},'✓ Complete'),
                (a.status==='pending'||a.status==='confirmed')&&!a.arrived&&h('button',{className:'btn bd2 bsm',onClick:()=>action(a.id,'cancelled')},'Cancel')
              ))
            );
          })
        )
      )),h(ApptsPager)),
      h('div',{className:'ml'},
        filtered.length===0&&h('div',{className:'empty'},'No appointments found'),
        pagedAppts.map(a=>{
          const isToday = a.date===localToday();
          const doCheckIn = () => {
            const updated={...a,checkedIn:true,checkedInAt:new Date().toISOString()};
            setAppointments(prev=>prev.map(x=>x.id===a.id?updated:x));
            syncOneRecord('appointments',updated,syncUrl);
            addToast(a.patientName+' checked in','success');
          };
          return h('div',{key:a.id,className:'mc'},
            h('div',{className:'mc-top'},
              h('div',null,
                h('div',{className:'mc-nm',style:{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}},
                  a.patientName,
                  a.appointmentType==='standby'&&h('span',{className:'standby-badge'},'Q'+a.queueNumber),
                  a.noShow&&h('span',{className:'noshow-badge'},'No-show'),
                  a.checkedIn&&h('span',{className:'checkedin-badge'},'✓ Checked In'),
                  a.arrived&&!a.checkedIn&&h('span',{style:{fontSize:13}},'🪑')
                ),
                h('div',{className:'mc-sb'},svcStr(a)+' · '+a.dentist)
              ),
              a.arrived?h('span',{className:'kiosk-arrived-badge'},'In Clinic'):h(SBadge,{status:a.status})
            ),
            h('div',{className:'mc-row'},
              h('span',{className:'mc-lbl'},'Date'),
              h('span',{className:'mc-val'}, fmtDateWithDay(a.date))
            ),
            h('div',{className:'mc-row'},
              h('span',{className:'mc-lbl'},a.appointmentType==='standby'?'Type':'Time'),
              h('span',{className:'mc-val'},
                a.appointmentType==='standby'
                  ? h('span',{className:'standby-badge'},'Standby — No Fixed Time')
                  : fmtTime(a.time) + ' · ' + fmtDateRelative(a.date)
              )
            ),
            h('div',{className:'mc-row'},h('span',{className:'mc-lbl'},'Fee'),h('span',{className:'mc-val',style:{color:'var(--t)',fontWeight:700}},'₱'+p$(a.fee))),
            h('div',{className:'mc-act'},
              h('button',{className:'btn bgh bsm',style:{flex:1},onClick:()=>setDetail(a)},'View'),
              isToday&&!a.checkedIn&&(a.status==='confirmed'||a.status==='pending')&&!a.noShow&&
                h('button',{className:'checkin-btn',style:{flex:1},onClick:doCheckIn},'✓ Check In'),
              a.status==='pending'&&!a.arrived&&h('button',{className:'btn bs bsm',style:{flex:2},onClick:()=>action(a.id,'confirmed')},'✓ Confirm'),
              (a.status==='confirmed'||a.arrived)&&a.status!=='completed'&&h('button',{className:'btn bp bsm',style:{flex:2},onClick:()=>action(a.id,'completed')},'✓ Complete'),
              (a.status==='pending'||a.status==='confirmed')&&!a.arrived&&h('button',{className:'btn bd2 bsm',style:{flex:1},onClick:()=>action(a.id,'cancelled')},'Cancel')
            )
          );
        })
      )
    ),

    dayDetail && h(Modal, {
      title: fmtDateFull(dayDetail.date),
      sub: dayDetail.appts.length + ' appointment' + (dayDetail.appts.length!==1?'s':''),
      onClose: ()=>setDayDetail(null),
      large: true,
      footer: h('button', {className: 'btn bgh', onClick: ()=>setDayDetail(null)}, 'Close')
    },
      h('div', {style: {display: 'flex', flexDirection: 'column', gap: 10}},
        dayDetail.appts
          .slice()
          .sort((a,b)=> (a.time||'').localeCompare(b.time||''))
          .map(a => h('div', {key: a.id, className: 'day-detail-item'},
            h('div', {className: 'day-detail-time'}, fmtTime(a.time)),
            h('div', {style: {flex: 1, minWidth: 0}},
              h('div', {style: {fontWeight: 600}}, a.patientName),
              h('div', {style: {fontSize: 12, color: 'var(--md)'}}, svcStr(a) + ' · ' + a.dentist)
            ),
            a.arrived?h('span',{className:'kiosk-arrived-badge'},'In Clinic'):h(SBadge,{status:a.status}),
            h('button', {className: 'btn bgh bsm', onClick: ()=>{setDayDetail(null);setDetail(a);}}, 'View')
          ))
      )
    ),

    modal&&h(ApptForm,{patients,appointments,syncUrl,addToast,onClose:()=>setModal(false),onAddPatient:(np)=>{if(setPatients)setPatients(prev=>[np,...prev.filter(x=>x.id!==np.id)]);},onSave:async d=>{
      const status = autoConfirmEnabled() ? 'confirmed' : 'pending';
      const newAppt = {...d,id:'A'+uid(),status,arrived:false};

      // Local duplicate check (same patient + service + date + time)
      const localDup = appointments.find(a =>
        a.patientId === newAppt.patientId && a.service === newAppt.service &&
        a.date === newAppt.date && a.time === newAppt.time && a.id !== newAppt.id
      );
      if (localDup) {
        if (!confirm('⚠️ Duplicate Appointment: ' + localDup.patientName + ' already has "' + svcStr(localDup) + '" on ' + localDup.date + ' at ' + localDup.time + '.\n\nClick OK to update the existing appointment, or Cancel to book anyway.')) {
          return; // user cancelled
        }
        // Update existing
        const merged = {...localDup, ...d, id: localDup.id};
        setAppointments(prev => prev.map(a => a.id === localDup.id ? merged : a));
        syncOneRecord('appointments', merged, syncUrl);
        setModal(false);
        addToast('Updated existing appointment for ' + merged.patientName, 'success');
        return;
      }

      setAppointments(p=>[newAppt,...p]);
      syncOneRecord('appointments', newAppt, syncUrl);
      setModal(false);
      addToast(status==='confirmed' ? '✓ Auto-confirmed!' : 'Appointment booked!', 'success');

      // ── Cross-save attachments to patient clinical history ──────────────
      // If the appointment has attached files (X-rays, photos), automatically
      // create a history entry in the patient's record so clinicians can see
      // all clinical files per service in one place.
      if (setPatients && safe(newAppt.attachments).length > 0) {
        const histEntry = {
          id:          'HIST-APT-' + newAppt.id,
          type:        'appointment_record',
          status:      'archived',
          scanDate:    newAppt.date,
          label:       newAppt.service + ' — ' + fmtDateLong(newAppt.date),
          service:     newAppt.service,
          appointmentId: newAppt.id,
          dentist:     newAppt.dentist || 'Dr. Arnold Colao',
          notes:       newAppt.notes || '',
          // Copy attachment references (keep dataUrls — they're stored locally)
          attachments: safe(newAppt.attachments).map(a => ({...a})),
          // Use first image as the thumbnail
          scanImageUrl: safe(newAppt.attachments).find(a => S(a.type).startsWith('image/'))?.dataUrl || '',
        };
        setPatients(prev => prev.map(p => {
          if (p.id !== newAppt.patientId) return p;
          const existing = safe(p.history);
          // Avoid duplicating if re-saved
          const alreadyExists = existing.some(h => h.appointmentId === newAppt.id);
          if (alreadyExists) return p;
          return {...p, history: [histEntry, ...existing]};
        }));
        addToast('📎 ' + safe(newAppt.attachments).length + ' file(s) saved to patient history', 'info');
      }
      if (status === 'confirmed' && setPayments && newAppt.fee > 0) {
        setPayments(prev=>[{
          id: 'PAY'+uid(),
          patientId: newAppt.patientId, patientName: newAppt.patientName,
          amount: newAppt.fee, method: 'pending', services: svcList(newAppt), service: newAppt.service,
          date: newAppt.date, status: 'pending', ref: 'auto-' + newAppt.id
        }, ...prev]);
      }
    }}),
    detail&&h(ApptDetail,{a:detail,syncUrl,onClose:()=>setDetail(null),onEdit:a=>{setEditAppt(a);setDetail(null);}}),
    editAppt&&h(ApptForm,{patients,appointments,syncUrl,addToast,existing:editAppt,
      onClose:()=>setEditAppt(null),
      onAddPatient:(np)=>{if(setPatients)setPatients(prev=>[np,...prev.filter(x=>x.id!==np.id)]);},
      onSave:d=>{
        const updated={...editAppt,...d,id:editAppt.id,services:svcList(d),service:svcList(d)[0]||d.service||''};
        setAppointments(prev=>prev.map(a=>a.id===editAppt.id?updated:a));
        syncOneRecord('appointments',updated,syncUrl);
        // Mirror service/fee changes to linked payment records
        if(setPayments){
          setPayments(prev=>prev.map(p=>{
            const linked=p.ref==='PAY-APT-'+editAppt.id||p.ref==='auto-'+editAppt.id;
            if(!linked)return p;
            const up={...p,services:svcList(updated),service:updated.service,
              amount:+p.amount===+(editAppt.fee||0)?+(updated.fee||0):+p.amount};
            syncOneRecord('payments',up,syncUrl);
            return up;
          }));
        }
        setEditAppt(null);
        addToast('Appointment updated for '+updated.patientName,'success');
      }
    }),
    showAnalysis && h(ConflictAnalysisModal, {appointments, onClose: ()=>setShowAnalysis(false)})
  );
}

function AutoConfirmBanner({appointments, setAppointments, addToast}){
  const [enabled, setEnabled] = useState(autoConfirmEnabled());
  const pending = appointments.filter(a => a.status === 'pending').length;

  const toggle = () => {
    const newVal = !enabled;
    try { localStorage.setItem(LS_KEYS.AUTO_CONFIRM, newVal ? 'true' : 'false'); } catch (e) {}
    setEnabled(newVal);
    addToast(newVal ? '✓ Auto-confirm enabled' : 'Auto-confirm disabled', 'info');
  };

  const confirmAllNow = () => {
    const ids = runAutoConfirm(appointments);
    if (ids.length === 0) {
      addToast('No conflict-free pending appointments to confirm', 'info');
      return;
    }
    setAppointments(prev => prev.map(a =>
      ids.includes(a.id) ? {...a, status: 'confirmed'} : a
    ));
    addToast('✓ Auto-confirmed ' + ids.length + ' appointment(s)', 'success');
  };

  return h('div', {className: 'autoconfirm-banner ' + (enabled ? 'on' : '')},
    h('div', {style: {display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap'}},
      h('label', {className: 'switch', style: {margin: 0}},
        h('input', {type: 'checkbox', checked: enabled, onChange: toggle}),
        h('span', {className: 'slider'})
      ),
      h('div', {style: {flex: 1, minWidth: 200}},
        h('div', {style: {fontWeight: 600, fontSize: 13}},
          enabled ? '🤖 Auto-confirm ON' : '⚙ Auto-confirm OFF'
        ),
        h('div', {style: {fontSize: 11.5, color: 'var(--md)', marginTop: 2}},
          enabled
            ? 'New bookings without conflicts are auto-confirmed.'
            : 'New bookings start as pending and need manual confirmation.'
        )
      ),
      pending > 0 && h('button', {
        className: 'btn bs bsm',
        onClick: confirmAllNow,
        title: 'Confirm all pending appointments that have no conflicts'
      }, '⚡ Confirm pending (' + pending + ')')
    )
  );
}

function ConflictAnalysisModal({appointments, onClose}){
  const analysis = analyzeAppointmentConflicts(appointments);
  return h(Modal, {
    title: '🔍 Appointment Analysis',
    sub: 'Schedule conflicts and capacity overview',
    onClose, large: true,
    footer: h('button', {className: 'btn bgh', onClick: onClose}, 'Close')
  },
    h('div', {className: 'analysis-grid'},
      h('div', {className: 'analysis-card analysis-' + (analysis.conflicts.length > 0 ? 'danger' : 'ok')},
        h('div', {className: 'ac-num'}, analysis.conflicts.length),
        h('div', {className: 'ac-lbl'}, 'Conflicts'),
        h('div', {className: 'ac-sub'}, 'Overlapping appointments')
      ),
      h('div', {className: 'analysis-card analysis-' + (analysis.nearMisses.length > 0 ? 'warn' : 'ok')},
        h('div', {className: 'ac-num'}, analysis.nearMisses.length),
        h('div', {className: 'ac-lbl'}, 'Near-misses'),
        h('div', {className: 'ac-sub'}, '<15 min gap between')
      ),
      h('div', {className: 'analysis-card analysis-info'},
        h('div', {className: 'ac-num'}, analysis.pending),
        h('div', {className: 'ac-lbl'}, 'Pending'),
        h('div', {className: 'ac-sub'}, 'Need confirmation')
      ),
      h('div', {className: 'analysis-card analysis-info'},
        h('div', {className: 'ac-num'}, analysis.arrived),
        h('div', {className: 'ac-lbl'}, 'In clinic'),
        h('div', {className: 'ac-sub'}, 'Currently arrived')
      )
    ),
    analysis.conflicts.length > 0 && h('div', {className: 'analysis-section'},
      h('div', {className: 'analysis-section-title'}, '🚨 Schedule Conflicts'),
      analysis.conflicts.map((c, i) => h('div', {key: i, className: 'conflict-item'},
        h('div', {className: 'conflict-date'}, fmtDateWithDay(c.date)),
        h('div', {className: 'conflict-pair'},
          h('div', {className: 'conflict-side'},
            h('div', {style: {fontSize: 12, fontWeight: 600}}, fmtTime(c.a.time)),
            h('div', {style: {fontWeight: 600}}, c.a.patientName),
            h('div', {style: {fontSize: 11, color: 'var(--md)'}}, svcStr(c.a)+' ('+(SERVICE_DURATIONS[c.a.service]||DEFAULT_SLOT_MIN)+' min)')
          ),
          h('div', {className: 'conflict-vs'}, '⚡'),
          h('div', {className: 'conflict-side'},
            h('div', {style: {fontSize: 12, fontWeight: 600}}, fmtTime(c.b.time)),
            h('div', {style: {fontWeight: 600}}, c.b.patientName),
            h('div', {style: {fontSize: 11, color: 'var(--md)'}}, c.b.service+' ('+(SERVICE_DURATIONS[c.b.service]||DEFAULT_SLOT_MIN)+' min)')
          )
        )
      ))
    ),
    analysis.nearMisses.length > 0 && h('div', {className: 'analysis-section'},
      h('div', {className: 'analysis-section-title'}, '⏱ Tight gaps (<15 min)'),
      analysis.nearMisses.map((c, i) => h('div', {key: i, className: 'conflict-item conflict-warn'},
        h('div', {className: 'conflict-date'}, fmtDateWithDay(c.date)+' · '+c.gap+' min gap'),
        h('div', {className: 'conflict-pair'},
          h('div', {className: 'conflict-side'},
            h('div', null, fmtTime(c.a.time)+' · '+c.a.patientName)
          ),
          h('div', {className: 'conflict-vs'}, '↔'),
          h('div', {className: 'conflict-side'},
            h('div', null, fmtTime(c.b.time)+' · '+c.b.patientName)
          )
        )
      ))
    ),
    analysis.conflicts.length === 0 && analysis.nearMisses.length === 0 && h('div', {className: 'empty', style: {padding: 30}},
      '✓ No conflicts or near-misses detected.'
    )
  );
}

