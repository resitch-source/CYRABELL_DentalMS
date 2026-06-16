/**
 * PatForm — Add/Edit patient record.
 *
 * ROOT CAUSE FIX: Patient ID is generated HERE before calling onSave()
 * so Drive upload and the saved record use the SAME ID. Previously, IDs
 * were generated inside save() AFTER handleSave() completed, making
 * onPhotoUploaded search for a temporary ID that never matched.
 */
function PatForm({patient, onClose, onSave, syncUrl, addToast, onPhotoUploaded, prefillData}){
  const initial = {
    name:'', dob:'', phone:'', email:'', address:'',
    bloodType:'O+', allergies:'', photoFileId:'',
    ...(patient||{}),
    ...(prefillData||{}),
  };
  const [f, setF]                        = useState(initial);
  const [pendingPhoto, setPendingPhoto]   = useState(null);
  // existingPhotoUrl: loaded from Drive for display only — does NOT trigger re-upload
  const [existingPhotoUrl, setExistingPhotoUrl] = useState(
    (patient && patient.photoDataUrl && S(patient.photoDataUrl).startsWith('data:'))
      ? patient.photoDataUrl : null
  );
  const set = (k,v) => setF(p=>({...p,[k]:v}));
  const ok  = S(f.name).trim().length > 0 && S(f.phone).trim().length > 0;

  // Pre-load Drive photo when editing
  useEffect(()=>{
    if (!patient || !patient.photoFileId || !syncUrl || existingPhotoUrl) return;
    let cancelled = false;
    window.__cyrabellPhotoCache = window.__cyrabellPhotoCache || {};
    const cached = window.__cyrabellPhotoCache[patient.photoFileId];
    if (cached) { setExistingPhotoUrl(cached); return; }
    fetchPhotoFromDrive(syncUrl, patient.photoFileId)
      .then(url => { if (!cancelled && url) { window.__cyrabellPhotoCache[patient.photoFileId]=url; setExistingPhotoUrl(url); }})
      .catch(()=>{});
    return ()=>{ cancelled=true; };
  }, [patient && patient.photoFileId]);

  const handleSave = () => {
    if (!ok) { addToast && addToast('Name and phone are required','error'); return; }
    // Validate phone — must contain only digits, +, -, (, ), spaces (Finding #10)
    const cleanPhone = S(f.phone).trim();
    if (!/^[0-9+\-() ]+$/.test(cleanPhone)) {
      addToast && addToast('Phone number may only contain digits, +, -, (, ) and spaces','error'); return;
    }
    // Validate email format if provided (Finding #10)
    if (f.email && S(f.email).trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(S(f.email).trim())) {
      addToast && addToast('Please enter a valid email address','error'); return;
    }
    // Validate DOB date if provided (Finding #10)
    if (f.dob && S(f.dob).trim() && !/^\d{4}-\d{2}-\d{2}$/.test(S(f.dob).trim())) {
      addToast && addToast('Date of birth must be in YYYY-MM-DD format','error'); return;
    }

    // ── CRITICAL: Assign ID NOW before calling onSave or starting upload ──
    // This ensures Drive upload and the saved record share the same ID.
    const patientId = f.id || ('P' + String(Date.now()).slice(-6));
    const dataToSave = { balance:0, lastVisit:'—', teeth:{}, ...f, id: patientId };

    if (pendingPhoto === 'REMOVE') {
      dataToSave.photoFileId  = '';
      dataToSave.photoDataUrl = '';
      if (f.photoFileId) {
        delete (window.__cyrabellPhotoCache||{})[f.photoFileId];
        if (syncUrl) {
          fetch(syncUrl, {method:'POST', redirect:'follow',
            headers:{'Content-Type':'text/plain;charset=utf-8'},
            body: JSON.stringify({action:'deletePhoto', fileId:f.photoFileId})
          }).catch(e=>console.warn('[Photo] Delete failed:',e.message));
        }
      }
    } else if (pendingPhoto && S(pendingPhoto).startsWith('data:')) {
      // Save inline immediately for instant display
      dataToSave.photoDataUrl = pendingPhoto;
      dataToSave.photoFileId  = f.photoFileId || '';

      if (syncUrl) {
        const snap = pendingPhoto; // closure copy
        uploadPhotoToDrive(syncUrl, patientId, snap, f.photoFileId||'')
          .then(fileId => {
            console.log('[Photo] ✅ Drive upload done. patientId:',patientId,'fileId:',fileId);
            if (typeof onPhotoUploaded === 'function') onPhotoUploaded(patientId, fileId, snap);
            (window.__cyrabellPhotoCache=window.__cyrabellPhotoCache||{})[fileId]=snap;
          })
          .catch(err => {
            console.warn('[Photo] Drive upload failed, keeping inline:',err.message);
            addToast && addToast('Photo saved locally. Drive upload failed: '+err.message,'info');
          });
      }
    }
    // else: no photo change — f already has photoFileId/photoDataUrl from spread

    onSave(dataToSave); // save immediately — don't wait for Drive upload
  };

  const displayPhoto = (pendingPhoto && pendingPhoto !== 'REMOVE') ? pendingPhoto : existingPhotoUrl;

  return h(Modal, {
    title:  patient ? 'Edit Patient' : (prefillData ? '📷 New Patient from Scan' : 'Add Patient'),
    sub:    patient ? 'Update patient record' : (prefillData ? 'Review extracted data before saving' : 'New patient registration'),
    onClose, large: true,
    footer: h(Fragment, null,
      h('button', {type:'button', className:'btn bgh', onClick:onClose}, 'Cancel'),
      h('button', {type:'button', className:'btn bp', onClick:handleSave, disabled:!ok,
        title:!ok?'Name and phone are required':''
      }, patient ? 'Save Changes' : 'Add Patient')
    ),
  },
    h('div', {className:'patform-photo-section'},
      h(PhotoCaptureWidget, {
        patient: f,
        photoDataUrl: displayPhoto,
        onPhotoChange: url => {
          setPendingPhoto(url);
          if (url==='REMOVE') setExistingPhotoUrl(null);
        },
        syncUrl, addToast,
      })
    ),
    h('div', {className:'fg2'},
      h(Field,{label:'Full Name *'}, h('input',{value:f.name,placeholder:'Juan dela Cruz',onChange:e=>set('name',e.target.value)})),
      h(Field,{label:'Date of Birth'}, h('input',{type:'date',value:f.dob||'',onChange:e=>set('dob',e.target.value)}))
    ),
    h('div', {className:'fg2'},
      h(Field,{label:'Age'}, h('input',{type:'number',value:f.age||'',placeholder:'e.g. 35',min:0,max:150,onChange:e=>set('age',e.target.value)}))
    ),
    h('div', {className:'fg2'},
      h(Field,{label:'Phone *'}, h('input',{value:f.phone,placeholder:'09171234567',onChange:e=>set('phone',e.target.value)})),
      h(Field,{label:'Email'}, h('input',{type:'email',value:f.email||'',placeholder:'patient@email.com',onChange:e=>set('email',e.target.value)}))
    ),
    h(Field,{label:'Address'}, h('input',{value:f.address||'',placeholder:'Street, City, Province',onChange:e=>set('address',e.target.value)})),
    h('div', {className:'fg2'},
      h(Field,{label:'Occupation'},
        h('input',{value:f.occupation||'',placeholder:'e.g. Teacher, Nurse, Engineer…',onChange:e=>set('occupation',e.target.value)})
      ),
      h(Field,{label:'Marital Status'},
        h('select',{value:f.maritalStatus||'',onChange:e=>set('maritalStatus',e.target.value)},
          h('option',{value:''},'— Select —'),
          ['Single','Married','Widowed','Separated','Divorced'].map(ms=>h('option',{key:ms,value:ms},ms))
        )
      )
    ),
    h('div', {className:'fg2'},
      h(Field,{label:'Sex'},
        h('select',{value:f.sex||'',onChange:e=>set('sex',e.target.value)},
          h('option',{value:''},'— Select —'),
          ['Male','Female'].map(s=>h('option',{key:s,value:s},s))
        )
      ),
      h(Field,{label:'Blood Type'},
        h('select',{value:f.bloodType||'O+',onChange:e=>set('bloodType',e.target.value)},
          ['A+','A-','B+','B-','AB+','AB-','O+','O-','Unknown'].map(bt=>h('option',{key:bt,value:bt},bt))
        )
      )
    ),
    h('div', {className:'fg2'},
      h(Field,{label:'Allergies'}, h('input',{value:f.allergies||'',placeholder:'e.g. Penicillin — or "None"',onChange:e=>set('allergies',e.target.value)}))
    ),
    h(Field,{label:'Chief Complaint'}, h('input',{value:f.chiefComplaint||'',placeholder:'e.g. Toothache, bleeding gums',onChange:e=>set('chiefComplaint',e.target.value)}))
  );
}


function PatientPhoto({patient, size, syncUrl}) {
  size = size || 40;
  const [dataUrl, setDataUrl] = useState(
    // Initialize with inline base64 immediately (no loading flash)
    (patient && patient.photoDataUrl) || null
  );
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    // Clear state when patient changes
    if (!patient) { setDataUrl(null); setErrored(false); return; }

    // PRIORITY 1: Use inline base64 if available (offline mode / just taken)
    // Only if it's a valid non-empty data URL (not an empty string from removal)
    if (patient.photoDataUrl && patient.photoDataUrl.startsWith('data:')) {
      setDataUrl(patient.photoDataUrl);
      return;
    }

    // PRIORITY 2: Fetch from Google Drive by fileId
    if (!patient.photoFileId || !syncUrl) {
      setDataUrl(null);
      return;
    }

    // Check in-memory cache to avoid redundant Drive fetches
    window.__cyrabellPhotoCache = window.__cyrabellPhotoCache || {};
    const cached = window.__cyrabellPhotoCache[patient.photoFileId];
    if (cached) {
      setDataUrl(cached);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        if (typeof fetchPhotoFromDrive === 'function') {
          const url = await fetchPhotoFromDrive(syncUrl, patient.photoFileId);
          if (!cancelled && url) {
            // Cache and display
            window.__cyrabellPhotoCache[patient.photoFileId] = url;
            setDataUrl(url);
          }
        }
      } catch (err) {
        // Photo load failed — will show initials fallback
        console.warn('[PatientPhoto] fetch failed:', err.message);
        if (!cancelled) setErrored(true);
      }
    })();
    return () => { cancelled = true; };
  }, [
    patient ? patient.id : null,
    patient ? patient.photoFileId : null,
    patient ? (S(patient.photoDataUrl).substring(0,30)) : null,
    syncUrl,
  ]);

  const name = S(patient && patient.name);
  const initials = name
    ? name.split(' ').filter(Boolean).slice(0, 2).map(w => w.charAt(0).toUpperCase()).join('') || '?'
    : '?';
  const colors = ['#0a7c6e','#3a7bd5','#c9a84c','#7c3aed','#3aa876','#e8943a','#dc2626'];
  const idStr = S(patient && patient.id);
  let hash = 0;
  for (let i = 0; i < idStr.length; i++) hash = (hash * 31 + idStr.charCodeAt(i)) & 0xffffff;
  const bgColor = colors[Math.abs(hash) % colors.length];

  if (dataUrl && !errored) {
    return h('img', {
      src: dataUrl,
      style: {
        width: size + 'px', height: size + 'px',
        borderRadius: '50%', objectFit: 'cover',
        border: '2px solid #fff',
        boxShadow: '0 1px 3px rgba(0,0,0,.15)',
        flexShrink: 0,
      },
      alt: name
    });
  }

  return h('div', {
    style: {
      width: size + 'px', height: size + 'px',
      borderRadius: '50%',
      background: 'linear-gradient(135deg, ' + bgColor + ', ' + bgColor + 'dd)',
      color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: (size * 0.4) + 'px',
      fontWeight: 700,
      flexShrink: 0,
      border: '2px solid #fff',
      boxShadow: '0 1px 3px rgba(0,0,0,.1)',
      letterSpacing: '-0.5px',
    },
    title: name
  }, initials);
}



// ═══════════════════════════════════════════════════════════════════════════
// 📄 DENTAL DOCUMENTS — Medical Certificate & Prescription
// Matches actual Colao, Arnold A. Dental Clinic letterhead exactly.
// ═══════════════════════════════════════════════════════════════════════════

// ── Clinic constants sourced from CONFIG.CLINIC (set at top of file) ────

/**
 * MedCertModal — issues and prints a Dental Medical Certificate.
 * Matches the official COLAO, ARNOLD A, DENTAL CLINIC certification format.
 */

// ═══════════════════════════════════════════════════════════════════════════
// 📎 FILE / X-RAY ATTACHMENT SYSTEM
// Attach images, X-rays, PDFs to patients and appointments.
// Files stored as base64 in the record. Syncs to Sheets/Drive.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * AttachmentViewer — view a single attached file.
 * Supports: images (JPEG/PNG/GIF), PDF embed, and downloads.
 */
function AttachmentViewer({file, onClose}) {
  const [dataUrl, setDataUrl] = useState(file.dataUrl || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load from IndexedDB if stored there
    if (!file.dataUrl && file.storage === 'idb') {
      setLoading(true);
      idbGet(file.id).then(url => {
        setDataUrl(url || '');
        setLoading(false);
      }).catch(() => setLoading(false));
    } else if (file.storage === 'drive') {
      // Reconstruct drive URLs from fileId if any drive URL field is missing
      const fid = file.driveFileId ||
        (file.dataUrl && file.dataUrl.includes('/file/d/')
          ? file.dataUrl.replace(/.*\/file\/d\/([^/]+).*/, '$1') : '') ||
        (file.driveEmbedUrl && file.driveEmbedUrl.includes('/file/d/')
          ? file.driveEmbedUrl.replace(/.*\/file\/d\/([^/]+).*/, '$1') : '');
      if (fid) {
        if (!file.driveFileId)       file.driveFileId       = fid;
        if (!file.driveEmbedUrl)     file.driveEmbedUrl     = 'https://drive.google.com/file/d/' + fid + '/preview';
        if (!file.driveViewUrl)      file.driveViewUrl      = 'https://drive.google.com/file/d/' + fid + '/view';
        if (!file.driveDownloadUrl)  file.driveDownloadUrl  = 'https://drive.google.com/uc?id=' + fid + '&export=download';
      }
      setDataUrl(file.driveEmbedUrl || file.dataUrl || '');
    }
  }, [file.id]);

  // Detect type from dataUrl prefix if MIME type is missing/generic (iOS photos etc.)
  const effectiveType = (file.type && file.type !== 'application/octet-stream')
    ? file.type
    : (dataUrl || '').startsWith('data:image/') ? 'image/jpeg'
    : (dataUrl || '').startsWith('data:application/pdf') ? 'application/pdf'
    : file.type || '';
  const isImage  = effectiveType.startsWith('image/');
  const isPdf    = effectiveType === 'application/pdf';
  const isDrive  = file.storage === 'drive' && (file.driveEmbedUrl || file.driveFileId);
  const [zoom, setZoom] = useState(1);

  const driveFileId   = file.driveFileId || '';
  const driveViewUrl  = file.driveViewUrl  || (driveFileId ? 'https://drive.google.com/file/d/'+driveFileId+'/view' : '');
  const driveDownUrl  = file.driveDownloadUrl || (driveFileId ? 'https://drive.google.com/uc?id='+driveFileId+'&export=download' : '');
  const downloadHref  = driveDownUrl || dataUrl || '';

  return h('div', {className:'att-viewer-ov', onClick:onClose},
    h('div', {className:'att-viewer-modal', onClick:e=>e.stopPropagation()},
      h('div', {className:'att-viewer-header'},
        h('div', {style:{fontWeight:700,fontSize:14,color:'var(--dk)'}},
          file.name || 'Attachment',
          file.storage === 'drive' && h('span',{style:{fontSize:10,marginLeft:8,background:'#e8f5f3',color:'var(--t)',padding:'2px 7px',borderRadius:10,fontWeight:600}},'Drive')
        ),
        h('div', {style:{display:'flex',gap:8}},
          isImage && !isDrive && h('button',{type:'button',className:'btn bgh bsm',onClick:()=>setZoom(z=>Math.max(0.3,z-0.2))},'−'),
          isImage && !isDrive && h('button',{type:'button',className:'btn bgh bsm',onClick:()=>setZoom(1)},'1:1'),
          isImage && !isDrive && h('button',{type:'button',className:'btn bgh bsm',onClick:()=>setZoom(z=>Math.min(4,z+0.2))},'+'),
          downloadHref && h('a',{href:downloadHref,download:driveDownUrl?undefined:(file.name||'attachment'),target:driveDownUrl?'_blank':undefined,className:'btn bg2 bsm'},'⬇ Download'),
          driveViewUrl && h('a',{href:driveViewUrl,target:'_blank',className:'btn bgh bsm'},'🔗 Open in Drive'),
          h('button',{type:'button',className:'btn bgh bsm',onClick:onClose},'✕ Close')
        )
      ),
      h('div', {className:'att-viewer-body'},
        loading && h('div',{className:'att-viewer-nopreview'},
          h('div',{style:{color:'#fff',fontSize:14}},'Loading…')
        ),
        // Drive files: Google blocks iframe embedding from external origins (frame-ancestors CSP).
        // thumbnail?sz=w1600 is reliable for publicly-shared images (no consent-page redirect).
        !loading && isDrive && isImage && h('div',{className:'att-viewer-img-wrap',style:{overflow:'auto'}},
          h('img',{
            src:driveThumbnailUrl(file.driveFileId,'w1600'),
            alt:file.name,
            style:{transform:`scale(${zoom})`,transformOrigin:'top left',display:'block',maxWidth:zoom===1?'100%':'none'},
            onError:e=>{
              // Fallback chain: thumbnail → lh3 CDN → Open-in-Drive link
              const id = file.driveFileId;
              if(e.target.src.includes('thumbnail')){
                e.target.src='https://lh3.googleusercontent.com/d/'+id+'=w1600';
              } else {
                e.target.style.display='none';
                e.target.insertAdjacentHTML('afterend','<div style="color:#aaa;padding:20px;text-align:center;font-size:13px">Preview unavailable — <a href="'+(driveViewUrl||'#')+'" target="_blank" style="color:#4dd">Open in Drive</a></div>');
              }
            }
          })
        ),
        !loading && isDrive && !isImage && h('div',{className:'att-viewer-nopreview'},
          h('div',{style:{fontSize:52,marginBottom:12}},isPdf?'📑':'📄'),
          h('div',{style:{color:'#fff',fontWeight:700,fontSize:15,marginBottom:8}},file.name),
          h('div',{style:{color:'#aaa',fontSize:13,marginBottom:16}},'Preview requires opening in Google Drive.'),
          driveViewUrl && h('a',{href:driveViewUrl,target:'_blank',className:'btn bg2'},'🔗 Open in Drive')
        ),
        !loading && !isDrive && !dataUrl && h('div',{className:'att-viewer-nopreview'},
          h('div',{style:{fontSize:40,marginBottom:8}},'⚠️'),
          h('div',{style:{color:'#fff',fontWeight:700,fontSize:15,marginBottom:8}},'File data not available'),
          h('div',{style:{color:'#aaa',fontSize:13,marginBottom:16,textAlign:'center',maxWidth:320}},
            'The image data was not saved. Please remove this entry and re-attach the file.'
          ),
          h('button',{type:'button',className:'btn bgh bsm',onClick:onClose},'Close')
        ),
        !loading && !isDrive && dataUrl && isImage && h('div', {className:'att-viewer-img-wrap', style:{overflow:'auto'}},
          h('img',{
            src: dataUrl,
            alt: file.name,
            style:{transform:`scale(${zoom})`,transformOrigin:'top left',display:'block',maxWidth:zoom===1?'100%':'none'},
          })
        ),
        !loading && !isDrive && dataUrl && isPdf && h('iframe',{src:dataUrl,className:'att-viewer-pdf',title:file.name}),
        !loading && !isDrive && dataUrl && !isImage && !isPdf && h('div',{className:'att-viewer-nopreview'},
          h('div',{style:{fontSize:48}},'📄'),
          h('div',{style:{marginTop:12,color:'#ccc',fontSize:14}},file.name),
          h('a',{href:dataUrl,download:file.name,className:'btn bp'},'⬇ Download')
        )
      )
    )
  );
}

/**
 * AttachmentPanel — manage attachments for a patient or appointment.
 * Props:
 *   attachments   - array of {id, name, type, dataUrl, note, date}
 *   onAdd         - called with new attachment object
 *   onRemove      - called with attachment id
 *   onUpdateNote  - called with (id, note)
 *   label         - heading text (default: "Attachments")
 *   compact       - if true, shows smaller layout
 */
function AttachmentPanel({attachments, onAdd, onRemove, onUpdateNote, onUpdate, label, compact, syncUrl, patientId, addToast: addToastProp}) {
  const fileRef  = useRef(null);
  const [viewing, setViewing] = useState(null);
  const [busy,    setBusy]    = useState(false);
  const [noteEdit, setNoteEdit] = useState({}); // id → string

  const atts = safe(attachments);
  // Support addToast from prop or global
  const toast = addToastProp || (typeof addToast !== 'undefined' ? addToast : null);

  const handleFiles = async (e) => {
    const files = e.target.files;
    if (!files || !files.length) return;
    setBusy(true);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // Limit to 8MB per file
      if (file.size > 8 * 1024 * 1024) {
        toast && toast(file.name + ' is too large (max 8MB). Please compress it first.', 'error');
        continue;
      }
      await (async () => {
        const dataUrl  = await readFileAsDataUrl(file);
        {
          const rawType  = file.type || '';
          // Detect image type from dataUrl prefix when browser reports no/generic MIME type.
          // This fixes iOS/HEIC photos that arrive with type='' or type='application/octet-stream'.
          let resolvedType = rawType;
          if (!rawType || rawType === 'application/octet-stream') {
            if (dataUrl.startsWith('data:image/'))      resolvedType = dataUrl.substring(5, dataUrl.indexOf(';'));
            else if (dataUrl.startsWith('data:application/pdf')) resolvedType = 'application/pdf';
          }
          const attId = 'ATT-' + Date.now() + '-' + i;
          const att = {
            id:      attId,
            name:    file.name,
            type:    resolvedType || 'application/octet-stream',
            size:    file.size,
            dataUrl: dataUrl,  // temporary: shown in UI while saving
            note:    '',
            date:    localToday(),
            storage: 'local',  // will be updated to 'drive' or 'idb'
          };
          // Show immediately in UI with local dataUrl for instant preview
          onAdd && onAdd(att);

          // Now persist to Drive or IDB
          const curSyncUrl = (typeof syncUrl === 'string') ? syncUrl : '';
          if (curSyncUrl) {
            try {
              toast && toast('Uploading ' + file.name + ' to Drive...', 'info');
              const result = await uploadFileToDrive(curSyncUrl, dataUrl, resolvedType, file.name, patientId || 'unknown');
              // Update attachment: replace dataUrl with Drive URLs
              const driveAtt = {
                ...att,
                dataUrl: result.embedUrl || result.viewUrl || '',
                driveFileId: result.fileId,
                driveViewUrl: result.viewUrl,
                driveEmbedUrl: result.embedUrl,
                driveThumbnailUrl: result.thumbnailUrl,
                driveDownloadUrl: result.downloadUrl,
                storage: 'drive',
              };
              onUpdate && onUpdate(attId, driveAtt);
              toast && toast(file.name + ' uploaded to Drive ✓', 'ok');
            } catch(err) {
              // Drive upload failed — fall back to IndexedDB
              console.warn('[attachment] Drive upload failed, falling back to IDB:', err.message);
              try {
                await idbPut(attId, dataUrl);
                onUpdate && onUpdate(attId, {...att, dataUrl: '', storage: 'idb'});
                toast && toast(file.name + ' saved locally (Drive upload failed)', 'ok');
              } catch(idbErr) {
                toast && toast('Could not save ' + file.name + ': ' + idbErr.message, 'error');
              }
            }
          } else {
            // No sync URL — save to IndexedDB
            try {
              await idbPut(attId, dataUrl);
              onUpdate && onUpdate(attId, {...att, dataUrl: '', storage: 'idb'});
            } catch(idbErr) {
              // IDB failed — keep dataUrl in memory only (won't survive refresh)
              console.warn('[attachment] IDB save failed:', idbErr.message);
              toast && toast('⚠️ ' + file.name + ' saved in memory only — may be lost on refresh', 'warning');
            }
          }
        }
      })();
    }
    setBusy(false);
    e.target.value = '';
  };

  // File type icon
  const fileIcon = (type) => {
    if (!type) return '📄';
    if (type.startsWith('image/')) return '🖼';
    if (type === 'application/pdf') return '📑';
    return '📄';
  };

  const fmt = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + 'B';
    if (bytes < 1024*1024) return Math.round(bytes/1024) + 'KB';
    return (bytes/(1024*1024)).toFixed(1) + 'MB';
  };

  return h('div', {className:'att-panel'},
    h('div', {className:'att-panel-header'},
      h('div', {style:{fontWeight:700,fontSize:13,color:'var(--dk)'}},
        '📎 ', label || 'Attachments',
        atts.length > 0 && h('span',{className:'att-count'},atts.length)
      ),
      h('button', {
        type:'button', className:'btn bp bsm',
        onClick:()=>fileRef.current&&fileRef.current.click(),
        disabled:busy,
        title:'Attach X-ray, photo, PDF, or any clinical file'
      }, busy ? '⏳' : '+ Attach File'),
      h('input',{
        ref:fileRef, type:'file',
        accept:'image/*,application/pdf,.pdf,.jpg,.jpeg,.png,.heic,.gif',
        multiple:true,
        style:{display:'none'},
        onChange:handleFiles,
      })
    ),

    // Empty state
    atts.length === 0 && h('div', {className:'att-empty'},
      h('div', {style:{fontSize:30,marginBottom:6}}, '📎'),
      h('div', {style:{color:'var(--md)',fontSize:12.5}},
        'No attachments yet. Add X-rays, clinical photos, or PDFs.'
      )
    ),

    // Attachment list
    atts.length > 0 && h('div', {className:'att-list'},
      atts.map(att =>
        h('div', {key:att.id, className:'att-item'},
          // Thumbnail or icon
          h('div', {
            className:'att-thumb',
            onClick:()=>setViewing(att),
            title:'Click to view',
          }, (() => {
            // Drive files: use thumbnail URL if available
            if (att.storage === 'drive' && att.driveThumbnailUrl) {
              return h('img',{src:att.driveThumbnailUrl,alt:att.name,className:'att-thumb-img',
                onError:e=>{e.target.style.display='none';}});
            }
            const t = (att.type && att.type !== 'application/octet-stream') ? att.type
              : (att.dataUrl||'').startsWith('data:image/') ? 'image/jpeg' : att.type;
            return t && t.startsWith('image/') && att.dataUrl
              ? h('img',{src:att.dataUrl,alt:att.name,className:'att-thumb-img',
                  onError:e=>{e.target.style.display='none';e.target.nextSibling&&(e.target.nextSibling.style.display='flex');}})
              : h('div',{className:'att-thumb-icon'},
                  att.storage === 'drive' ? '☁️' : fileIcon(t));
          })()),
          // Info
          h('div', {className:'att-info'},
            h('div', {className:'att-name',onClick:()=>setViewing(att),title:'Click to view'},
              S(att.name).length > 28 ? S(att.name).substring(0,25)+'...' : att.name
            ),
            h('div', {className:'att-meta'},
              att.date && h('span',null,att.date),
              att.size && h('span',null,' · '+fmt(att.size)),
              att.storage === 'drive' && h('span',{style:{color:'var(--t)',fontWeight:700}},' · ☁ Drive'),
              att.storage === 'idb'   && h('span',{style:{color:'var(--md)'}},             ' · Local')
            ),
            // Inline note editor
            h('input',{
              className:'att-note-input',
              value: noteEdit[att.id] !== undefined ? noteEdit[att.id] : (att.note||''),
              placeholder:'Note (e.g. Tooth #36 PA X-ray)…',
              onChange: e => setNoteEdit(prev=>({...prev,[att.id]:e.target.value})),
              onBlur: e => {
                const note = e.target.value;
                if (note !== att.note) onUpdateNote && onUpdateNote(att.id, note);
                setNoteEdit(prev => { const n={...prev}; delete n[att.id]; return n; });
              },
            })
          ),
          // Actions
          h('div', {className:'att-actions'},
            h('button',{type:'button',className:'btn bgh bsm',onClick:()=>setViewing(att),title:'View'},'👁'),
            att.storage === 'drive' && att.driveDownloadUrl
              ? h('a',{href:att.driveDownloadUrl,target:'_blank',className:'btn bgh bsm',title:'Download'},'⬇')
              : att.dataUrl
                ? h('a',{href:att.dataUrl,download:att.name||'file',className:'btn bgh bsm',title:'Download'},'⬇')
                : null,
            h('button',{type:'button',className:'btn bd2 bsm',onClick:()=>onRemove&&onRemove(att.id),title:'Remove'},'✕')
          )
        )
      )
    ),

    // Viewer
    viewing && h(AttachmentViewer, {file:viewing, onClose:()=>setViewing(null)})
  );
}



// ═══════════════════════════════════════════════════════════════════════════
// 📋 CLINICAL HISTORY SYSTEM
// Scan old examination record cards and store as timestamped history entries.
// Each entry contains: scan image thumbnail + all extracted clinical fields.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * ClinicalHistoryScanner — scans a Patient's Examination Record Chart.
 * Extracts full clinical data: demographics, occlusion, medical history,
 * dental chart annotations, medications, and general condition.
 *
 * @param {function} onSaved  - called with the new history entry object
 * @param {function} onClose  - close the modal
 * @param {object}   patient  - current patient (for context)
 */
function ClinicalHistoryScanner({onSaved, onClose, patient}) {
  const [step,        setStep]       = useState('capture');
  const [imageUrl,    setImageUrl]   = useState(null);
  const [mimeType,    setMimeType]   = useState('image/jpeg');
  const [extracted,   setExtracted]  = useState(null);
  const [editData,    setEditData]   = useState({});
  const [errorMsg,    setErrorMsg]   = useState('');
  const [scanning,    setScanning]   = useState(false);
  const [progressMsg, setProgressMsg]= useState('');
  const [progressPct, setProgressPct]= useState(0);
  const fileRef  = useRef(null);
  const videoRef = useRef(null);
  const streamRef= useRef(null);

  const stopCam = () => {
    if (streamRef.current) { streamRef.current.getTracks().forEach(t=>t.stop()); streamRef.current=null; }
  };

  const startCam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode:{ideal:'environment'}, width:{ideal:1920} }
      });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject=stream; videoRef.current.play(); }
    } catch(e) { setErrorMsg('Camera: '+(e.message||'Access denied')); }
  };

  const captureFrame = async () => {
    if (!videoRef.current) return;
    const v=videoRef.current;
    const canvas=document.createElement('canvas');
    canvas.width=v.videoWidth||1280; canvas.height=v.videoHeight||960;
    canvas.getContext('2d').drawImage(v,0,0,canvas.width,canvas.height);
    const dataUrl=canvas.toDataURL('image/jpeg',0.92);
    stopCam();
    setImageUrl(dataUrl); setMimeType('image/jpeg');
    await runExtraction(dataUrl,'image/jpeg');
  };

  const handleFile = (e) => {
    const file = e.target.files&&e.target.files[0];
    if (!file) return;
    const mime = file.type||'image/jpeg';
    readFileAsDataUrl(file).then(async dataUrl => {
      setImageUrl(dataUrl); setMimeType(mime);
      await runExtraction(dataUrl, mime);
    });
    e.target.value='';
  };

  const runExtraction = async (dataUrl, mime) => {
    setStep('processing'); setErrorMsg(''); setProgressPct(0); setProgressMsg('Starting…');
    const syncUrl = (() => { try { return localStorage.getItem(LS_KEYS.SYNC_URL)||''; } catch(e){return '';} })();
    try {
      const result = await extractPatientDataFromCard(
        dataUrl, mime, syncUrl, 'examination',
        (msg, pct) => { setProgressMsg(msg); setProgressPct(pct); }
      );
      setExtracted(result);
      setEditData({...result, scanDate: localToday()});
      setStep('review');
    } catch(err) {
      setErrorMsg(err.message||'Extraction failed');
      setStep('error');
    }
  };

  const ed = (k,v) => setEditData(p=>({...p,[k]:v}));

  const handleSave = () => {
    const entry = {
      id:          'HIST-' + Date.now(),
      scanDate:    editData.scanDate || localToday(),
      scanImageUrl: imageUrl,
      type:        'examination_record',
      patientName: editData.name || S(patient&&patient.name),
      ...editData,
    };
    // Persist scan image to IDB so it survives localStorage quota eviction on refresh
    if (imageUrl) idbPut(entry.id, imageUrl).catch(()=>{});
    onSaved(entry);
  };

  useEffect(() => () => stopCam(), []);

  // ── CAPTURE step ────────────────────────────────────────────────────
  if (step==='capture') return h(Modal,{
    title:'📋 Scan Examination Record',
    sub:'Scan a Patient\'s Examination Record Chart to add to clinical history',
    onClose, footer:null, xl:true,
  },
    h('div',{className:'hist-scan-intro'},
      h('div',{className:'hist-scan-grid'},
        h('div',{className:'hist-scan-opt',onClick:startCam},
          h('div',{className:'hist-scan-icon'},'📷'),
          h('div',{className:'hist-scan-label'},'Use Camera'),
          h('div',{className:'hist-scan-desc'},'Photograph the record card directly')
        ),
        h('div',{className:'hist-scan-opt',onClick:()=>fileRef.current&&fileRef.current.click()},
          h('div',{className:'hist-scan-icon'},'📁'),
          h('div',{className:'hist-scan-label'},'Upload Scan'),
          h('div',{className:'hist-scan-desc'},'JPG, PNG, or PDF of scanned card')
        )
      ),
      h('div',{className:'hist-scan-what'},
        h('div',{className:'hist-scan-what-title'},'🔍 What gets extracted:'),
        h('div',{className:'hist-scan-what-grid'},
          ['Patient demographics','Occlusion & periodontal','Oral hygiene status',
           'Denture information','Physician & medications','Blood pressure','Chronic ailments',
           'Allergies','Previous bleeding history','General condition','Dental chart markings','Clinical notes'
          ].map(item => h('div',{key:item,className:'hist-scan-what-item'},'✓ '+item))
        )
      ),
      h('input',{ref:fileRef,type:'file',accept:'image/*',style:{display:'none'},onChange:handleFile}),
      // Camera view
      h('video',{ref:videoRef,autoPlay:true,playsInline:true,muted:true,
        style:{display:videoRef.current&&streamRef.current?'block':'none',width:'100%',borderRadius:8,marginTop:12}
      }),
      streamRef.current && h('div',{style:{display:'flex',gap:8,marginTop:8}},
        h('button',{type:'button',className:'btn bgh',onClick:stopCam},'✕ Cancel Camera'),
        h('button',{type:'button',className:'btn bp',onClick:captureFrame},'📸 Capture')
      )
    )
  );

  // ── PROCESSING step ─────────────────────────────────────────────────
  if (step==='processing') return h(Modal,{
    title:'⚡ Gemini AI Analyzing…',
    sub:'Gemini 2.0 Flash is reading the examination record',
    onClose, footer:null,
  },
    h('div',{className:'ocr-processing'},
      imageUrl && h('img',{src:imageUrl,alt:'Scanning',className:'ocr-preview-img'}),
      h('div',{className:'ocr-spinner-wrap'},
        h('div',{className:'ocr-spinner'}),
        h('div',{className:'ocr-processing-text'},
          h('div',{style:{fontWeight:700,fontSize:15,marginBottom:6}}, progressMsg || 'Starting…'),
          h('div',{style:{fontSize:12,color:'var(--md)',lineHeight:1.6}},
            'Extracting: patient info, occlusion, periodontal condition, ',
            'medical history, medications, and dental chart annotations.'
          ),
          h('div',{style:{marginTop:10,background:'var(--bg3)',borderRadius:6,overflow:'hidden',height:8}},
            h('div',{style:{
              width: (progressPct||0)+'%', height:'100%',
              background:'linear-gradient(90deg,#4f8ef7,#7c3aed)',
              transition:'width 0.4s ease', borderRadius:6,
            }})
          ),
          h('div',{style:{fontSize:11,color:'var(--md)',marginTop:4,textAlign:'right'}},
            (progressPct||0)+'%'
          )
        )
      )
    )
  );

  // ── ERROR step ──────────────────────────────────────────────────────
  if (step==='error') return h(Modal,{
    title:'⚠ Extraction Failed',
    sub:'Could not read the record card',
    onClose,
    footer:h(Fragment,null,
      h('button',{className:'btn bgh',onClick:onClose},'Cancel'),
      h('button',{className:'btn bp',onClick:()=>{setStep('capture');setImageUrl(null);}},
        '↻ Try again')
    ),
  },
    h('div',{className:'ocr-error'},
      h('div',{className:'ocr-error-icon'},'⚠'),
      h('div',{className:'ocr-error-msg'},errorMsg),
      imageUrl && h('img',{src:imageUrl,alt:'',className:'ocr-preview-img'})
    )
  );

  // ── REVIEW step ─────────────────────────────────────────────────────
  if (step==='review') {
    const sections = [
      { title:'👤 Patient Demographics', fields:[
        {k:'name',l:'Name'},{k:'age',l:'Age'},{k:'sex',l:'Sex'},
        {k:'maritalStatus',l:'Marital Status'},{k:'occupation',l:'Occupation'},
        {k:'address',l:'Home Address'},{k:'telephone',l:'Telephone'},
        {k:'mobileNo',l:'Mobile'},{k:'date',l:'Record Date',t:'date'},
      ]},
      { title:'🦷 Clinical Findings', fields:[
        {k:'occlusion',l:'Occlusion'},{k:'periodontalCondition',l:'Periodontal Condition'},
        {k:'oralHygiene',l:'Oral Hygiene'},{k:'dentureUpper',l:'Denture Upper (Since)'},
        {k:'dentureLower',l:'Denture Lower (Since)'},{k:'abnormalities',l:'Abnormalities'},
        {k:'generalCondition',l:'General Condition'},
      ]},
      { title:'⚕️ Medical History', fields:[
        {k:'physician',l:'Physician'},{k:'bloodPressure',l:'Blood Pressure'},
        {k:'allergies',l:'Allergies'},{k:'chronicAilments',l:'Chronic Ailments'},
        {k:'previousHistoryOfBleeding',l:'History of Bleeding'},
        {k:'drugsBeingTaken',l:'Drugs Being Taken'},
        {k:'natureOfTreatment',l:'Nature of Treatment'},
      ]},
      { title:'📝 Additional Notes', fields:[
        {k:'dentalChartNotes',l:'Dental Chart Annotations',area:true},
        {k:'teethConditions',l:'Tooth Conditions Observed',area:true},
        {k:'clinicalNotes',l:'Clinical Notes',area:true},
      ]},
    ];

    return h(Modal,{
      title:'✅ Review Extracted Record',
      sub:'Verify the information before saving to clinical history',
      onClose, xl:true,
      footer:h(Fragment,null,
        h('button',{className:'btn bgh',onClick:onClose},'Cancel'),
        h('button',{className:'btn bg2',onClick:()=>{setStep('capture');setImageUrl(null);}},'↻ Rescan'),
        h('button',{className:'btn bp',onClick:handleSave},'💾 Save to History')
      ),
    },
      h('div',{className:'hist-review-layout'},
        // Left: scan thumbnail
        h('div',{className:'hist-review-img-col'},
          h('div',{className:'hist-review-img-label'},'📷 Original Card'),
          h('img',{src:imageUrl,alt:'Scanned record',className:'hist-review-img'}),
          h(Field,{label:'Record Date'},
            h('input',{type:'date',value:editData.scanDate||localToday(),
              onChange:e=>ed('scanDate',e.target.value)})
          )
        ),
        // Right: editable fields grouped by section
        h('div',{className:'hist-review-form'},
          sections.map(sec =>
            h('div',{key:sec.title,className:'hist-section'},
              h('div',{className:'hist-section-title'},sec.title),
              h('div',{className:'hist-section-fields'},
                sec.fields.map(fi =>
                  h('div',{key:fi.k,className:'hist-field'},
                    h('label',{className:'hist-field-label'},
                      fi.l,
                      extracted[fi.k] && h('span',{className:'ocr-extracted-badge'},'✓ found')
                    ),
                    fi.area
                      ? h('textarea',{
                          className:'hist-field-input'+(extracted[fi.k]?' ocr-filled':''),
                          value:editData[fi.k]||'',rows:2,
                          onChange:e=>ed(fi.k,e.target.value)
                        })
                      : h('input',{
                          type:fi.t||'text',
                          className:'hist-field-input'+(extracted[fi.k]?' ocr-filled':''),
                          value:editData[fi.k]||'',
                          onChange:e=>ed(fi.k,e.target.value)
                        })
                  )
                )
              )
            )
          )
        )
      )
    );
  }
  return null;
}

/**
 * useHistoryScanImage — loads a history entry's scan image.
 * Priority: inlineUrl (from entry.scanImageUrl) → IndexedDB → empty.
 * IDB is the durable store; inlineUrl is only set on first render.
 */
function useHistoryScanImage(id, inlineUrl) {
  const [url,     setUrl]     = useState(inlineUrl || '');
  const [loading, setLoading] = useState(!inlineUrl && !!id);
  useEffect(() => {
    if (inlineUrl) { setUrl(inlineUrl); setLoading(false); return; }
    if (!id)       { setUrl('');        setLoading(false); return; }
    setLoading(true);
    idbGet(id)
      .then(stored => { setUrl(stored || ''); setLoading(false); })
      .catch(()    => {                        setLoading(false); });
  }, [id, inlineUrl]);
  return { url, loading };
}

/**
 * ClinicalHistoryEntry — single card in the history timeline.
 * Handles three entry types: attached_record, appointment_record, examination_record.
 * Image data is always loaded via useHistoryScanImage (IDB-backed).
 */
/**
 * ClinicalHistoryEntry — single card in the history timeline.
 * attached_record entries now get a full AttachmentPanel (same as Files tab).
 */
function ClinicalHistoryEntry({entry, onDelete, onUpdate, idx, syncUrl, patientId, addToast}) {
  const [expanded,    setExpanded]    = useState(idx === 0);
  const [viewingFile, setViewingFile] = useState(null);
  const { url: scanUrl, loading: scanLoading } = useHistoryScanImage(entry.id, entry.scanImageUrl || '');

  // Always-current ref so async Drive upload callbacks read latest attachments
  const entryRef = useRef(entry);
  entryRef.current = entry;

  const handleDelete = () => {
    confirmDelete('Delete this history entry?', () => {
      idbDelete(entry.id).catch(() => {});
      onDelete && onDelete(entry.id);
    });
  };

  // Build AttachmentPanel callbacks using entryRef so async Drive updates
  // always read the latest attachments array (avoids stale-closure bug).
  const makeAttCallbacks = () => ({
    onAdd: att => {
      const e = entryRef.current;
      onUpdate && onUpdate({...e, scanImageUrl: '', attachments: [...safe(e.attachments), att]});
    },
    onUpdate: (attId, newAtt) => {
      const e = entryRef.current;
      onUpdate && onUpdate({...e, attachments: safe(e.attachments).map(a => a.id === attId ? newAtt : a)});
    },
    onUpdateNote: (attId, note) => {
      const e = entryRef.current;
      onUpdate && onUpdate({...e, attachments: safe(e.attachments).map(a => a.id === attId ? {...a, note} : a)});
    },
    onRemove: attId => {
      idbDelete(attId).catch(() => {});
      const e = entryRef.current;
      onUpdate && onUpdate({...e, attachments: safe(e.attachments).filter(a => a.id !== attId)});
    },
  });

  // ── attached_record ───────────────────────────────────────────────────────
  if (entry.type === 'attached_record') {
    // Backward-compat: old entries stored a single file in scanImageUrl.
    // Migrate on-the-fly so they appear in AttachmentPanel without data loss.
    let atts = safe(entry.attachments);
    if (atts.length === 0 && scanUrl) {
      atts = [{
        id:      entry.id + '-legacy',
        name:    entry.label || 'Attached Record',
        type:    entry.fileType || 'image/jpeg',
        size:    entry.fileSize || 0,
        dataUrl: scanUrl,
        note:    '',
        date:    entry.scanDate || '',
        storage: 'local',
      }];
    }

    return h('div', {className:'hist-entry hist-entry-attached'},
      // Card header
      h('div', {className:'hist-entry-header', style:{cursor:'default'}},
        h('div', {className:'hist-entry-left', style:{display:'flex',alignItems:'center',gap:12}},
          h('div', {style:{fontSize:32}}, '📎'),
          h('div', null,
            h('div', {className:'hist-entry-date'}, '📎 ', entry.scanDate||'Unknown date'),
            h('div', {className:'hist-entry-name'}, entry.label||'Attached Record'),
            h('div', {className:'hist-entry-sub', style:{fontSize:11}},
              atts.length ? atts.length+' file(s)' : 'No files yet'
            )
          )
        ),
        h('div', {className:'hist-entry-right'},
          h('button', {type:'button', className:'btn bd2 bsm',
            onClick: e => { e.stopPropagation(); handleDelete(); }
          }, '✕ Delete')
        )
      ),
      h('div', {style:{padding:'0 12px 12px'}},
        h(AttachmentPanel, {
          attachments: atts,
          label: 'Files',
          syncUrl, patientId, addToast,
          ...makeAttCallbacks(),
        })
      ),
      viewingFile && h(AttachmentViewer, {file: viewingFile, onClose: () => setViewingFile(null)})
    );
  }

  // ── appointment_record — read-only gallery with in-app viewer ────────────
  if (entry.type === 'appointment_record') {
    const atts = safe(entry.attachments);
    return h('div', {className:'hist-entry hist-entry-attached'},
      h('div', {className:'hist-entry-header', style:{cursor:'default'}},
        h('div', {className:'hist-entry-left', style:{display:'flex',alignItems:'center',gap:12}},
          h('div', {style:{fontSize:32}}, '📅'),
          h('div', null,
            h('div', {className:'hist-entry-date'}, '📅 ', entry.scanDate||'Unknown date'),
            h('div', {className:'hist-entry-name'}, entry.label||'Appointment Record'),
            h('div', {className:'hist-entry-sub', style:{fontSize:11}},
              'Service record'+(entry.dentist?' · '+entry.dentist:'')+(atts.length?' · '+atts.length+' file(s)':'')
            )
          )
        ),
        h('div', {className:'hist-entry-right'},
          h('button', {type:'button', className:'btn bd2 bsm',
            onClick: e => { e.stopPropagation(); handleDelete(); }
          }, '✕')
        )
      ),
      atts.length > 0 && h('div', {
        className:'hist-appt-files',
        style:{padding:'8px 12px 12px',borderTop:'1px solid var(--bd)',background:'var(--cr)'}
      },
        h('div', {style:{fontSize:11,fontWeight:700,color:'var(--md)',marginBottom:6,textTransform:'uppercase',letterSpacing:'.5px'}},
          '📎 Attached Files ('+atts.length+')'
        ),
        // Use AttachmentPanel in read-only style — no onAdd/onRemove, viewer stays in-app
        h('div', {style:{display:'flex',gap:8,flexWrap:'wrap'}},
          atts.map((att,i) => h(AttachThumb, {
            key: att.id||i,
            att,
            onClick: () => setViewingFile(att),   // ← in-app viewer, not window.open
          }))
        )
      ),
      viewingFile && h(AttachmentViewer, {file: viewingFile, onClose: () => setViewingFile(null)})
    );
  }

  // ── examination_record (AI scan) ──────────────────────────────────────────
  const isImg = S(entry.fileType).startsWith('image/') || scanUrl.startsWith('data:image/');
  const isPdf = entry.fileType === 'application/pdf'  || scanUrl.startsWith('data:application/pdf');

  const clinicalFields = [
    ['Occlusion',        entry.occlusion],
    ['Periodontal',      entry.periodontalCondition],
    ['Oral Hygiene',     entry.oralHygiene],
    ['Denture Upper',    entry.dentureUpper],
    ['Denture Lower',    entry.dentureLower],
    ['Abnormalities',    entry.abnormalities],
    ['General Condition',entry.generalCondition],
  ].filter(([,v]) => v && S(v).trim());

  const medFields = [
    ['Physician',        entry.physician],
    ['Blood Pressure',   entry.bloodPressure],
    ['Allergies',        entry.allergies],
    ['Chronic Ailments', entry.chronicAilments],
    ['Bleeding Hx',      entry.previousHistoryOfBleeding],
    ['Medications',      entry.drugsBeingTaken],
    ['Treatment',        entry.natureOfTreatment],
  ].filter(([,v]) => v && S(v).trim());

  // ── examination_record (AI scan) ──────────────────────────────────────────
  return h('div', {className:'hist-entry'},
    h('div', {className:'hist-entry-header', onClick:()=>setExpanded(e=>!e)},
      h('div', {className:'hist-entry-left'},
        h('div', {className:'hist-entry-date'}, '📋 ', entry.scanDate||'Unknown date'),
        h('div', {className:'hist-entry-name'}, entry.name||'Patient Record'),
        entry.occupation && h('div', {className:'hist-entry-sub'}, entry.occupation)
      ),
      h('div', {className:'hist-entry-right'},
        scanUrl && h('img', {
          src:scanUrl, alt:'Scan thumbnail', className:'hist-entry-thumb',
          style:{cursor:'pointer'},
          onClick:e=>{ e.stopPropagation(); setViewingFile({
            id: entry.id, name: entry.name||'Scan',
            type: entry.fileType||(isImg?'image/jpeg':'application/pdf'),
            dataUrl: scanUrl, storage:'local',
          }); }
        }),
        h('div', {className:'hist-entry-toggle'}, expanded?'▲':'▼')
      )
    ),
    expanded && h('div', {className:'hist-entry-body'},
      h('div', {className:'hist-quick-stats'},
        entry.bloodPressure && h('div',{className:'hist-stat'},h('span',{className:'hist-stat-label'},'BP'),h('span',{className:'hist-stat-value'},entry.bloodPressure)),
        entry.oralHygiene   && h('div',{className:'hist-stat'},h('span',{className:'hist-stat-label'},'Oral Hygiene'),h('span',{className:'hist-stat-value'},entry.oralHygiene)),
        entry.occlusion     && h('div',{className:'hist-stat'},h('span',{className:'hist-stat-label'},'Occlusion'),h('span',{className:'hist-stat-value'},entry.occlusion))
      ),
      h('div', {className:'hist-two-col'},
        clinicalFields.length > 0 && h('div',{className:'hist-col'},
          h('div',{className:'hist-col-title'},'🦷 Clinical Findings'),
          clinicalFields.map(([l,v])=>h('div',{key:l,className:'hist-row'},h('div',{className:'hist-row-label'},l),h('div',{className:'hist-row-value'},v)))
        ),
        medFields.length > 0 && h('div',{className:'hist-col'},
          h('div',{className:'hist-col-title'},'⚕️ Medical History'),
          medFields.map(([l,v])=>h('div',{key:l,className:'hist-row'},h('div',{className:'hist-row-label'},l),h('div',{className:'hist-row-value'},v)))
        )
      ),
      entry.clinicalNotes    && h('div',{className:'hist-notes'},h('div',{className:'hist-col-title'},'📝 Clinical Notes'),h('div',{className:'hist-notes-text'},entry.clinicalNotes)),
      entry.dentalChartNotes && h('div',{className:'hist-notes'},h('div',{className:'hist-col-title'},'🦷 Dental Chart Annotations'),h('div',{className:'hist-notes-text'},entry.dentalChartNotes)),
      entry.teethConditions  && h('div',{className:'hist-notes'},h('div',{className:'hist-col-title'},'🔍 Observed Tooth Conditions'),h('div',{className:'hist-notes-text'},entry.teethConditions)),
      // AttachmentPanel for supporting files — same as Files tab
      h('div', {style:{marginTop:12}},
        h(AttachmentPanel, {
          attachments: safe(entry.attachments),
          label: 'Supporting Files',
          syncUrl, patientId, addToast,
          ...makeAttCallbacks(),
        })
      ),
      h('div', {className:'hist-entry-actions'},
        h('button', {
          type:'button', className:'btn bg2 bsm',
          disabled: scanLoading || !scanUrl,
          onClick: () => scanUrl && setViewingFile({
            id: entry.id, name: entry.name||'Scan',
            type: entry.fileType||(isImg?'image/jpeg':'application/pdf'),
            dataUrl: scanUrl, storage:'local',
          })
        }, scanLoading ? '⏳ Loading scan…' : scanUrl ? '🖼 View Original Scan' : '🖼 Scan Not Available'),
        h('button', {type:'button', className:'btn bd2 bsm', onClick: handleDelete}, '🗑 Delete Entry')
      )
    ),
    viewingFile && h(AttachmentViewer, {file: viewingFile, onClose: () => setViewingFile(null)})
  );
}

/**
 * ClinicalHistoryTab — the full "📋 History" tab in PatProfile.
 * Shows a timeline of scanned examination records.
 */
function ClinicalHistoryTab({patient, history, onAddEntry, onDeleteEntry, onUpdateEntry, syncUrl, addToast}) {
  const [showScanner, setShowScanner] = useState(false);
  const entries = safe(history).slice().sort((a,b) =>
    (b.scanDate||'').localeCompare(a.scanDate||'')
  );

  // "Attach Record" button — creates a new attached_record entry with an
  // empty attachments array. The AttachmentPanel inside the entry handles
  // the actual file upload (same flow as the Files tab).
  const handleNewRecord = () => {
    const entry = {
      id:          'HIST-' + Date.now(),
      type:        'attached_record',
      status:      'archived',
      scanDate:    localToday(),
      label:       'Attached Record ' + localToday(),
      attachments: [],
    };
    onAddEntry && onAddEntry(entry);
  };

  return h('div',{className:'hist-tab'},
    // Header
    h('div',{className:'hist-tab-header'},
      h('div',null,
        h('div',{className:'hist-tab-title'},'📋 Clinical History'),
        h('div',{className:'hist-tab-sub'},
          'Scanned examination records and clinical history from physical cards'
        )
      ),
      h('div',{style:{display:'flex',gap:8,flexWrap:'wrap'}},
        // Creates a new attached_record entry — files are added via the AttachmentPanel inside
        h('button',{
          type:'button', className:'btn bg2',
          onClick:handleNewRecord,
          title:'Create a new record entry where you can attach photos, PDFs, or X-rays'
        }, '📎 New Attached Record'),
        // AI scan button
        h('button',{
          type:'button',className:'btn bp',
          onClick:()=>setShowScanner(true),
          title:'Scan and extract clinical data using AI'
        },'📷 Scan + Extract AI')
      )
    ),

    // Empty state
    entries.length===0 && h('div',{className:'hist-empty'},
      h('div',{style:{fontSize:52,marginBottom:12}},'📋'),
      h('div',{style:{fontWeight:700,fontSize:16,marginBottom:8,color:'var(--dk)'}},'No History Records Yet'),
      h('div',{style:{color:'var(--md)',fontSize:13,marginBottom:20,lineHeight:1.6}},
        'Scan physical patient examination record cards to build a ',
        'complete clinical history. Claude AI will extract all clinical ',
        'data, medical history, and dental chart annotations automatically.'
      ),
      h('button',{
        type:'button',className:'btn bp',
        onClick:()=>setShowScanner(true)
      },'📷 Scan Your First Record Card')
    ),

    // Timeline of entries
    entries.length>0 && h('div',{className:'hist-timeline'},
      entries.map((entry,i) =>
        h(ClinicalHistoryEntry,{
          key:entry.id,
          entry,
          idx:i,
          onDelete:onDeleteEntry,
          onUpdate:onUpdateEntry,
          syncUrl,
          patientId: patient && patient.id,
          addToast,
        })
      )
    ),

    // Scanner modal
    showScanner && h(ClinicalHistoryScanner,{
      patient,
      onClose:()=>setShowScanner(false),
      onSaved:(entry)=>{
        onAddEntry(entry);
        setShowScanner(false);
      }
    })
  );
}


function MedCertModal({patient, onClose}) {
  const today = localToday();
  const fmtDate = (d) => {
    if (!d) return '';
    const dt = parseLocalDate(d);
    if (!dt) return d;
    return dt.toLocaleDateString('en-PH', { year:'numeric', month:'long', day:'numeric' });
  };

  const [procedure, setProcedure] = useState('');
  const [certDate,  setCertDate]  = useState(today);
  const [ptrNo,     setPtrNo]     = useState('');

  const patName    = S(patient && patient.name);
  const patAddress = S(patient && patient.address);
  const age        = patient && patient.dob
    ? (() => {
        const bd = parseLocalDate(patient.dob);
        if (!bd) return '';
        return String(new Date().getFullYear() - bd.getFullYear());
      })()
    : '';

  const handlePrint = () => {
    const win = window.open('', '_blank', 'width=794,height=1123');
    win.document.write(buildMedCertHTML({
      patName, patAddress, age, procedure, certDate, ptrNo,
    }));
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 600);
  };

  return h(Modal, {
    title: '📄 Medical Certificate',
    sub: 'Colao, Arnold A. Dental Clinic — Dental Certification',
    onClose, large: true,
    footer: h(Fragment, null,
      h('button', {type:'button', className:'btn bgh', onClick:onClose}, 'Cancel'),
      h('button', {type:'button', className:'btn bp', onClick:handlePrint}, '🖨 Print Certificate')
    ),
  },
    // Live preview
    h('div', {className:'doc-preview-wrap'},
      h('div', {
        className: 'doc-preview',
        dangerouslySetInnerHTML: { __html: buildMedCertHTML({patName, patAddress, age, procedure, certDate, ptrNo, preview:true}) }
      })
    ),
    // Edit fields below preview
    h('div', {className:'doc-edit-bar'},
      h('div', {className:'fg2'},
        h(Field, {label:'Dental Procedure / Certification text'},
          h('textarea', {
            value: procedure,
            onChange: e => setProcedure(e.target.value),
            placeholder: 'e.g. dental extraction of tooth #36, dental cleaning and prophylaxis, orthodontic braces adjustment...',
            rows: 3,
            style: {width:'100%', resize:'vertical'},
          })
        ),
        h(Field, {label:'Certificate Date'},
          h('input', {type:'date', value:certDate, onChange:e=>setCertDate(e.target.value)})
        )
      ),
      h(Field, {label:'PTR No. (optional)'},
        h('input', {value:ptrNo, placeholder:'e.g. 1234567', onChange:e=>setPtrNo(e.target.value)})
      )
    )
  );
}

/**
 * RxModal — issues and prints a Dental Prescription (Rx pad format).
 * Matches the official Colao, Arnold A. Dental Clinic Rx letterhead exactly.
 */
function RxModal({patient, onClose}) {
  const today = localToday();
  const [rx,      setRx]      = useState('');
  const [rxDate,  setRxDate]  = useState(today);
  const [ptrNo,   setPtrNo]   = useState('');

  const patName    = S(patient && patient.name);
  const patAddress = S(patient && patient.address);
  const age        = patient && patient.dob
    ? (() => {
        const bd = parseLocalDate(patient.dob);
        if (!bd) return '';
        return String(new Date().getFullYear() - bd.getFullYear());
      })()
    : '';

  const handlePrint = () => {
    const win = window.open('', '_blank', 'width=794,height=1123');
    win.document.write(buildRxHTML({patName, patAddress, age, rx, rxDate, ptrNo}));
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 600);
  };

  return h(Modal, {
    title: '💊 Prescription (Rx)',
    sub: 'Colao, Arnold A. Dental Clinic — Dental Prescription',
    onClose, large: true,
    footer: h(Fragment, null,
      h('button', {type:'button', className:'btn bgh', onClick:onClose}, 'Cancel'),
      h('button', {type:'button', className:'btn bp', onClick:handlePrint}, '🖨 Print Prescription')
    ),
  },
    h('div', {className:'doc-preview-wrap'},
      h('div', {
        className: 'doc-preview',
        dangerouslySetInnerHTML: { __html: buildRxHTML({patName, patAddress, age, rx, rxDate, ptrNo, preview:true}) }
      })
    ),
    h('div', {className:'doc-edit-bar'},
      h('div', {className:'fg2'},
        h(Field, {label:'Prescription (Rx)'},
          h('textarea', {
            value: rx,
            onChange: e => setRx(e.target.value),
            placeholder: 'e.g.\nAmoxicillin 500mg cap\nSig: 1 cap TID x 7 days\n\nMefenamic Acid 500mg\nSig: 1 tab q6h PRN pain\n\nMetronidazole 500mg\nSig: 1 tab TID x 5 days',
            rows: 7,
            style: {width:'100%', resize:'vertical', fontFamily:'monospace', fontSize:13},
          })
        ),
        h(Field, {label:'Date'},
          h('input', {type:'date', value:rxDate, onChange:e=>setRxDate(e.target.value)})
        )
      ),
      h(Field, {label:'PTR No. (optional)'},
        h('input', {value:ptrNo, placeholder:'e.g. 1234567', onChange:e=>setPtrNo(e.target.value)})
      )
    )
  );
}

// ── HTML builders for print output ────────────────────────────────────────

function buildMedCertHTML({patName, patAddress, age, procedure, certDate, ptrNo, preview}) {
  const fmtDateLong = (d) => {
    if (!d) return '________________';
    try {
      return new Date(d + 'T00:00:00').toLocaleDateString('en-PH', {year:'numeric',month:'long',day:'numeric'});
    } catch(e) { return d; }
  };

  const LOGO_SVG = `<img src="${AC_LOGO_DATA}" alt="AC Dental" style="width:80px;height:auto;display:block"/>`;

  const procedureLines = procedure
    ? procedure.split('\n').map(l => '<div>' + (l||'&nbsp;') + '</div>').join('')
    : '<div>&nbsp;</div><div>&nbsp;</div><div>&nbsp;</div>';

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Times+New+Roman&family=Arial+Bold&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
      font-family: Arial, sans-serif;
      font-size: 12pt;
      color: #000;
      background: #fff;
      padding: 40px 50px;
      max-width: 794px;
      margin: 0 auto;
    }
    .header-band {
      background: linear-gradient(135deg, #b8d4e8 0%, #d0e8f8 50%, #b8d4e8 100%);
      padding: 12px 20px 10px;
      border-radius: 2px;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .header-logo { flex-shrink: 0; }
    .header-text { text-align: center; flex: 1; }
    .clinic-name {
      font-size: 18pt;
      font-weight: 900;
      letter-spacing: 0.5px;
      font-family: 'Arial Black', Arial, sans-serif;
      text-transform: uppercase;
    }
    .clinic-specialty {
      font-size: 12pt;
      font-weight: bold;
      font-style: italic;
    }
    .clinic-meta {
      display: flex;
      justify-content: space-between;
      margin-top: 14px;
      font-size: 10pt;
      border-top: 1.5px solid #333;
      border-bottom: 1.5px solid #333;
      padding: 6px 0;
    }
    .clinic-meta-left { text-align:left; line-height:1.7; }
    .clinic-meta-right { text-align:right; line-height:1.7; }
    .cert-date { text-align:right; margin:30px 0 20px; font-size:11pt; }
    .cert-body { margin:20px 0; font-size:11pt; line-height:2; }
    .cert-body .line { border-bottom: 1px solid #000; min-height:24px; margin:4px 0; }
    .cert-body .line-sm { font-size:9pt; color:#555; margin-bottom:2px; }
    .cert-procedure { margin:8px 0 8px 0; }
    .cert-procedure-line {
      border-bottom: 1px solid #333;
      min-height: 28px;
      padding-bottom: 2px;
      font-size: 11pt;
      line-height: 1.8;
    }
    .cert-closing { margin-top:20px; font-size:11pt; }
    .sig-block { margin-top:60px; text-align:right; font-size:11pt; }
    .sig-block .doctor { font-weight:bold; }
    .sig-block .license { font-size:10pt; }
    @media print {
      body { padding:20px 30px; }
      .no-print { display:none; }
    }
  `;

  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="utf-8">
<title>Dental Certification — ${patName || 'Patient'}</title>
<style>${css}</style>
</head><body>
<div class="header-band">
  <div class="header-logo">${LOGO_SVG}</div>
  <div class="header-text">
    <div class="clinic-name">${CLINIC_INFO.name}</div>
    <div class="clinic-specialty">${CLINIC_INFO.specialty}</div>
  </div>
  <div class="header-logo">${LOGO_SVG}</div>
</div>
<div class="clinic-meta">
  <div class="clinic-meta-left">
    ${CLINIC_INFO.address}<br>
    Tel. No. ${CLINIC_INFO.tel}<br>
    Cel. No. ${CLINIC_INFO.cel}
  </div>
  <div class="clinic-meta-right">
    Clinic Hours:<br>
    9:00 AM – 5:00 PM<br>
    Monday to Saturday
  </div>
</div>

<div class="cert-date">${fmtDateLong(certDate)}</div>

<div class="cert-body">
  <p>To whom it may concern:</p>
  <br>
  <p>&nbsp;&nbsp;&nbsp;&nbsp;This is to certify that&nbsp;
    <strong>${escapeHTML(patName) || '________________________________'}</strong>
    of&nbsp;<span style="font-size:9pt;color:#555">(address)</span>&nbsp;
    <strong>${escapeHTML(patAddress) || '____________________________'}</strong>
    &nbsp;had undergone / is scheduled for
  </p>
  <div class="cert-procedure">
    ${procedure
      ? procedure.split('\n').map(l => `<div class="cert-procedure-line">${escapeHTML(l)||'&nbsp;'}</div>`).join('')
      : '<div class="cert-procedure-line">&nbsp;</div><div class="cert-procedure-line">&nbsp;</div><div class="cert-procedure-line">&nbsp;</div>'
    }
    <div class="cert-procedure-line">&nbsp;</div>
    .
  </div>
  <br>
  <p>This certification is issued for whatever purpose it may serve.</p>
</div>

<div class="sig-block">
  <div class="doctor">${CLINIC_INFO.doctor}</div>
  <div class="license">License No.: ${CLINIC_INFO.license}</div>
  <div class="license">PTR No.: ${ptrNo || '___________'}</div>
</div>
</body></html>`;
}

function buildRxHTML({patName, patAddress, age, rx, rxDate, ptrNo, preview}) {
  const fmtDateLong = (d) => {
    if (!d) return '';
    try {
      return new Date(d + 'T00:00:00').toLocaleDateString('en-PH', {year:'numeric',month:'long',day:'numeric'});
    } catch(e) { return d; }
  };

  const LOGO_SVG_RX = `<img src="${AC_LOGO_DATA}" alt="AC Dental" style="width:70px;height:auto;display:block"/>`;

  const rxLines = rx
    ? rx.split('\n').map(l => `<div class="rx-line">${escapeHTML(l)||'&nbsp;'}</div>`).join('')
    : Array(10).fill('<div class="rx-line">&nbsp;</div>').join('');

  const css = `
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
      font-family: Arial, sans-serif;
      font-size: 11pt;
      color: #000;
      background: #fff;
      padding: 30px 40px;
      max-width: 680px;
      margin: 0 auto;
    }
    .rx-wrapper {
      border: 2px solid #000;
      padding: 20px 24px 30px;
    }
    .rx-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
    }
    .rx-header-text { flex: 1; text-align: center; }
    .clinic-name {
      font-size: 14pt;
      font-weight: 900;
      font-family: 'Arial Black', Arial, sans-serif;
      text-align: center;
      letter-spacing: 0.3px;
    }
    .clinic-specialty {
      font-size: 10.5pt;
      font-weight: bold;
      text-align: center;
      margin-bottom: 4px;
    }
    .clinic-address, .clinic-contact, .clinic-hours {
      text-align: center;
      font-size: 9.5pt;
      line-height: 1.6;
    }
    .patient-info {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 8px;
      margin-top: 14px;
      padding-top: 10px;
      border-top: 1px solid #000;
    }
    .patient-field {
      display: flex;
      align-items: flex-end;
      gap: 6px;
      font-size: 10.5pt;
      padding-bottom: 3px;
      border-bottom: 1px solid #000;
    }
    .patient-field label { font-weight:bold; white-space:nowrap; }
    .patient-field span { flex:1; min-width:80px; }
    .rx-symbol {
      font-size: 56pt;
      font-family: 'Times New Roman', Times, serif;
      font-style: italic;
      font-weight: bold;
      line-height: 1;
      margin: 14px 0 4px;
    }
    .rx-body {
      min-height: 260px;
      padding: 4px 0;
    }
    .rx-line {
      border-bottom: 1px solid #ccc;
      min-height: 26px;
      padding: 2px 0;
      font-size: 11pt;
      line-height: 1.6;
      font-family: monospace;
    }
    .rx-date { text-align:right; font-size:10pt; margin-top:10px; color:#333; }
    .sig-block {
      text-align: center;
      margin-top: 30px;
      padding-top: 10px;
      border-top: 1px solid #000;
      font-size: 10.5pt;
    }
    .sig-block .doctor { font-weight:bold; font-size:11pt; }
    @media print {
      body { padding:15px 20px; }
    }
  `;

  return `<!DOCTYPE html><html><head>
<meta charset="utf-8">
<title>Prescription — ${patName || 'Patient'}</title>
<style>${css}</style>
</head><body>
<div class="rx-wrapper">
  <div class="rx-header">
    <div>${LOGO_SVG_RX}</div>
    <div class="rx-header-text">
      <div class="clinic-name">${CLINIC_INFO.name}</div>
      <div class="clinic-specialty">${CLINIC_INFO.specialty}</div>
      <div class="clinic-address">${CLINIC_INFO.address}</div>
      <div class="clinic-contact">☎ ${CLINIC_INFO.tel} &nbsp;|&nbsp; 📱 ${CLINIC_INFO.cel}</div>
      <div class="clinic-hours">Clinic Hours: ${CLINIC_INFO.hours}</div>
    </div>
    <div>${LOGO_SVG_RX}</div>
  </div>

  <div class="patient-info">
    <div class="patient-field">
      <label>Name:</label>
      <span>${escapeHTML(patName) || ''}</span>
    </div>
    <div class="patient-field">
      <label>Age:</label>
      <span>${escapeHTML(String(age || ''))}</span>
    </div>
    <div class="patient-field">
      <label>Address:</label>
      <span>${escapeHTML(patAddress) || ''}</span>
    </div>
    <div class="patient-field">
      <label>Sex:</label>
      <span></span>
    </div>
  </div>

  <div class="rx-symbol">R<sub>x</sub></div>

  <div class="rx-body">
    ${rxLines}
  </div>

  <div class="rx-date">${fmtDateLong(rxDate)}</div>

  <div class="sig-block">
    <div class="doctor">${CLINIC_INFO.doctor}</div>
    <div>License No.: ${CLINIC_INFO.license}</div>
    <div>PTR No.: ${ptrNo || '___________'}</div>
  </div>
</div>
</body></html>`;
}


function VisitsTab({appts,pays,patient}){
  const sortedAppts=[...appts].sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  const totalPaid=pays.reduce((s,p)=>s+parseFloat(p.amount||0),0);
  const linkedPayRefs=new Set(appts.map(a=>'auto-'+a.id));
  const linkedPayDates=new Set(appts.map(a=>a.date).filter(Boolean));
  const orphanPays=pays.filter(p=>!linkedPayDates.has(p.date)&&!linkedPayRefs.has(p.ref));
  if(!appts.length&&!pays.length) return h('div',{className:'empty'},'No visits recorded');
  return h('div',{style:{display:'flex',flexDirection:'column',gap:14}},
    h('div',{style:{display:'flex',gap:10,flexWrap:'wrap',marginBottom:2}},
      h('div',{style:{background:'var(--tp)',borderRadius:8,padding:'8px 14px',fontSize:12,fontWeight:600,color:'var(--t)'}},
        '📅 '+appts.length+' Appointment'+(appts.length!==1?'s':'')),
      h('div',{style:{background:'#e8f4ff',borderRadius:8,padding:'8px 14px',fontSize:12,fontWeight:600,color:'#3a7bd5'}},
        '💳 '+pays.length+' Payment'+(pays.length!==1?'s':'')),
      pays.length>0&&h('div',{style:{background:totalPaid>0?'#e8f7f0':'#fde8e8',borderRadius:8,padding:'8px 14px',fontSize:12,fontWeight:700,color:totalPaid>0?'#1a8a6a':'#e05252'}},
        '₱'+p$(totalPaid)+' Total Paid')
    ),
    sortedAppts.map(a=>{
      const linked=pays.filter(p=>(p.date&&p.date===a.date)||(p.ref&&p.ref==='auto-'+a.id));
      return h('div',{key:a.id,style:{background:'#fff',border:'1.5px solid #dde8ec',borderRadius:12,overflow:'hidden'}},
        h('div',{style:{padding:'12px 14px',borderBottom:linked.length?'1px solid #dde8ec':'none'}},
          h('div',{style:{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:8,marginBottom:6}},
            h('div',null,
              h('div',{style:{fontWeight:700,fontSize:14,color:'#1a2332'}},svcStr(a)),
              h('div',{style:{fontSize:11.5,color:'#4a6275',marginTop:2}},
                (a.date?fmtDateWithDay(a.date):'—')+(a.time?' · '+fmtTime(a.time):'')+' · '+(a.dentist||''))
            ),
            h(SBadge,{status:a.status})
          ),
          svcList(a).length>0&&h('table',{className:'appt-svc-table',style:{marginTop:6}},
            h('thead',null,h('tr',null,
              h('th',null,'#'),h('th',null,'Service'),h('th',null,'Category'),h('th',null,'Note'),h('th',null,'Fee (₱)')
            )),
            h('tbody',null,svcList(a).map((sv,i)=>{
              const svcObj=getActiveSvcs().find(x=>x.name===sv)||{};
              return h('tr',{key:i},
                h('td',{style:{color:'#4a6275',fontWeight:600}},i+1),
                h('td',null,h('strong',null,sv)),
                h('td',{style:{color:'#4a6275',fontSize:11.5}},svcObj.cat||'—'),
                h('td',{style:{fontSize:11.5}},((a.serviceNotes||{})[sv])||'—'),
                h('td',{style:{fontWeight:600,color:'#0a7c6e',whiteSpace:'nowrap'}},svcObj.fee!=null?'₱'+p$(svcObj.fee):'—')
              );
            }))
          ),
          h('div',{style:{display:'flex',justifyContent:'space-between',marginTop:8,fontSize:13}},
            h('span',{style:{color:'#4a6275'}},a.notes||''),
            h('span',{style:{fontWeight:700,color:'#0a7c6e'}},'Fee: ₱'+p$(a.fee||0))
          )
        ),
        linked.length>0&&h('div',{style:{background:'#f0f7ff',padding:'10px 14px'}},
          h('div',{style:{fontSize:11,fontWeight:700,color:'#3a7bd5',marginBottom:6,textTransform:'uppercase',letterSpacing:.5}},'💳 Payment'),
          linked.map(pay=>h('div',{key:pay.id,style:{display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:13}},
            h('span',null,(pay.method||'')+(pay.date?' · '+pay.date:'')),
            h('div',{style:{display:'flex',alignItems:'center',gap:8}},
              h(SBadge,{status:pay.status}),
              h('span',{style:{fontWeight:700,color:'#0a7c6e'}},'₱'+p$(pay.amount||0))
            )
          ))
        )
      );
    }),
    orphanPays.length>0&&h('div',null,
      h('div',{style:{fontSize:11,fontWeight:700,color:'#4a6275',margin:'4px 0 8px',textTransform:'uppercase',letterSpacing:.5}},'Other Payments'),
      h('div',{style:{display:'flex',flexDirection:'column',gap:8}},orphanPays.map(p=>
        h('div',{key:p.id,style:{background:'#fff',border:'1.5px solid #dde8ec',borderRadius:10,padding:'10px 14px'}},
          h('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center'}},
            h('div',null,
              h('div',{style:{fontWeight:600,fontSize:13}},svcStr(p)),
              h('div',{style:{fontSize:11.5,color:'#4a6275'}},(p.method||'')+(p.date?' · '+p.date:''))
            ),
            h('div',{style:{display:'flex',alignItems:'center',gap:8}},
              h(SBadge,{status:p.status}),
              h('span',{style:{fontWeight:700,color:'#0a7c6e'}},'₱'+p$(p.amount||0))
            )
          )
        )
      ))
    )
  );
}

function PatProfile({patient: patientProp,appts,pays,onClose,onUpdateTeeth,addToast,syncUrl}){
  // Local copy so file/history updates reflect instantly without waiting for parent re-render
  const [localPat, setLocalPat] = useState(patientProp);
  // Always-current ref — async callbacks (Drive upload) read this instead of stale closure
  const localPatRef = useRef(localPat);
  localPatRef.current = localPat; // updated every render, no useEffect lag
  // Sync if parent sends a fresh patient (e.g. after full refresh)
  const patient = localPat;
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);
  const [showMedCert,    setShowMedCert]    = useState(false);
  const [showRx,         setShowRx]         = useState(false);
  const [tab,setTab]=useState('info');
  const ini=patient.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const infoRows=[['DOB',patient.dob||'—'],['Sex',patient.sex||'—'],['Blood Type',patient.bloodType],['Occupation',patient.occupation||'—'],['Marital Status',patient.maritalStatus||'—'],['Phone',patient.phone],['Email',patient.email||'—'],['Address',patient.address||'—'],['Allergies',patient.allergies||'—'],['Last Visit',patient.lastVisit],['Balance',patient.balance>0?'₱'+p$(patient.balance)+' (Due)':'Settled']];
  const teethData = patient.teeth || {};
  const conditionCount = Object.values(teethData).filter(v => v && v !== 'healthy').length;
  const onToothEdit = (fdi, condition, surface) => {
    const newTeeth = {...teethData};
    if (surface) {
      // Per-surface condition update
      const surfaceKey = fdi + '_surfaces';
      const existingSurfaces = newTeeth[surfaceKey] && typeof newTeeth[surfaceKey] === 'object'
        ? {...newTeeth[surfaceKey]}
        : {};
      if (condition === 'healthy') {
        delete existingSurfaces[surface];
      } else {
        existingSurfaces[surface] = condition;
      }
      // Remove the surfaces key entirely if no surfaces remain
      if (Object.keys(existingSurfaces).length === 0) {
        delete newTeeth[surfaceKey];
      } else {
        newTeeth[surfaceKey] = existingSurfaces;
      }
      // Update local state immediately so chart re-renders without closing modal
      setLocalPat(p => ({...p, teeth: newTeeth}));
      onUpdateTeeth(patient.id, newTeeth);
      addToast('Tooth '+fdi+' '+surface+' marked as '+CONDITIONS[condition].label, 'success');
    } else {
      // Whole-tooth condition update
      if (condition === 'healthy') delete newTeeth[fdi];
      else newTeeth[fdi] = condition;
      // Update local state immediately so chart re-renders without closing modal
      setLocalPat(p => ({...p, teeth: newTeeth}));
      onUpdateTeeth(patient.id, newTeeth);
      addToast('Tooth '+fdi+' marked as '+CONDITIONS[condition].label, 'success');
    }
  };
  return h(Modal,{title:patient.name,sub:patient.id+' · '+patient.phone,xl:true,onClose,footer:h(Fragment,null,
    planHas('aiAssistant')
      ? h('button',{className:'btn bg2',onClick:()=>setShowAIAnalysis(true),style:{marginRight:'auto'}},'🤖 AI Analysis')
      : h('button',{className:'btn bg2',disabled:true,title:'Professional plan required',style:{marginRight:'auto',opacity:0.45,cursor:'not-allowed'}},'🤖 🔒 AI Analysis'),
    h('button',{className:'btn bgh',onClick:onClose},'Close')
  )},
    h('div',{style:{display:'flex',alignItems:'center',gap:12,marginBottom:16}},
      h(PatientPhoto,{
  // Pass full patient object — PatientPhoto checks photoDataUrl first, then photoFileId
  patient: patient,
  size: 64,
  syncUrl: syncUrl
}),
      h('div',null,
        h('div',{style:{fontWeight:700,fontSize:16}},patient.name),
        h('div',{style:{fontSize:12,color:'var(--md)'}},patient.email||'No email'),
        patient.photoFileId&&h('div',{style:{fontSize:10,color:'var(--lt)',marginTop:2}},'📷 Photo on file')
      )
    ),
    h('div',{className:'tabs'},
      ['info','dental','visits','attachments','history'].map(t=>{
        const labels = {info:'Info', dental:'🦷 Dental Chart'+(conditionCount>0?' ('+conditionCount+')':''), visits:'📅 Visits'+(appts.length>0?' ('+appts.length+')':''), attachments:'📎 Files'+(safe(patient.attachments).length>0?' ('+safe(patient.attachments).length+')':''), history:'📋 History'+(safe(patient.history).length>0?' ('+safe(patient.history).length+')':'')};
        return h('button',{key:t,className:'tab'+(tab===t?' act':''),onClick:()=>setTab(t)},labels[t]);
      }),
      // ── Document issue buttons ──────────────────────────────────────
      h('div',{className:'doc-issue-btns'},
        h('button',{type:'button',className:'btn bg2 bsm',onClick:()=>setShowMedCert(true),title:'Issue Dental Medical Certificate'},'📄 Med Cert'),
        h('button',{type:'button',className:'btn bg2 bsm',onClick:()=>setShowRx(true),title:'Issue Dental Prescription'},'💊 Rx')
      )
    ),
    tab==='info'&&h('div',{className:'ig'},infoRows.map(([l,v])=>h('div',{key:l},h('div',{className:'ilb'},l),h('div',{className:'ivl'},v)))),
    tab==='dental'&&h(DentalChart3D,{teethData,patientHistory:patient.history||[],onToothEdit}),
    tab==='visits'&&h(VisitsTab,{appts:appts||[],pays:pays||[],patient}),
    showAIAnalysis && h(AIAssistant,{appointments:appts,patients:[patient],payments:pays,addToast,onClose:()=>setShowAIAnalysis(false),defaultTab:'analyze'}),
    tab==='attachments' && h(AttachmentPanel, {
      attachments: safe(patient.attachments),
      label: 'Patient Files & X-Rays',
      syncUrl: syncUrl,
      patientId: patient.id,
      addToast: addToast,
      onAdd: att => {
        // Read latest state from ref — avoids stale closure when Drive upload is async
        const p = localPatRef.current;
        const updated = [...safe(p.attachments), att];
        setLocalPat({...p, attachments: updated});
        onUpdateTeeth(p.id, p.teeth, updated);
      },
      onUpdate: (attId, newAtt) => {
        // Called after async Drive upload — ref always has current state, closure does not
        const p = localPatRef.current;
        const updated = safe(p.attachments).map(a => a.id === attId ? newAtt : a);
        setLocalPat({...p, attachments: updated});
        onUpdateTeeth(p.id, p.teeth, updated);
      },
      onRemove: id => {
        const p = localPatRef.current;
        const att = safe(p.attachments).find(a => a.id === id);
        if (att && att.storage === 'idb') idbDelete(id).catch(()=>{});
        const updated = safe(p.attachments).filter(a => a.id !== id);
        setLocalPat({...p, attachments: updated});
        onUpdateTeeth(p.id, p.teeth, updated);
      },
      onUpdateNote: (id, note) => {
        const p = localPatRef.current;
        const updated = safe(p.attachments).map(a => a.id===id ? {...a,note} : a);
        setLocalPat({...p, attachments: updated});
        onUpdateTeeth(p.id, p.teeth, updated);
      },
    }),
    tab==='history' && h(ClinicalHistoryTab, {
      patient: patient,
      history: safe(patient.history),
      onAddEntry: entry => {
        const p = localPatRef.current;
        const updated = [...safe(p.history), entry];
        setLocalPat({...p, history: updated});
        onUpdateTeeth(p.id, p.teeth, p.attachments, updated);
      },
      onDeleteEntry: id => {
        const p = localPatRef.current;
        const updated = safe(p.history).filter(e => e.id !== id);
        setLocalPat({...p, history: updated});
        onUpdateTeeth(p.id, p.teeth, p.attachments, updated);
      },
      onUpdateEntry: updatedEntry => {
        const p = localPatRef.current;
        const updated = safe(p.history).map(e => e.id === updatedEntry.id ? updatedEntry : e);
        setLocalPat({...p, history: updated});
        onUpdateTeeth(p.id, p.teeth, p.attachments, updated);
      },
      syncUrl,
      addToast,
    }),
    showMedCert && h(MedCertModal, {patient:patient, onClose:()=>setShowMedCert(false)}),
    showRx      && h(RxModal,      {patient:patient, onClose:()=>setShowRx(false)})
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 📷 OLD RECORD CARD SCANNER
// Uses Claude Vision API to extract patient data from a photo of a record card.
// Flow: capture/upload image → send to Claude → parse JSON → pre-fill PatForm
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calls the Anthropic Messages API with a base64 image.
 * Returns the extracted patient data as a structured object.
 * @param {string} imageBase64  - base64 of the image (with or without data: prefix)
 * @param {string} mimeType     - e.g. 'image/jpeg'
 */
/**
/**
 * extractPatientDataFromCard
 *
 * Fast path: if GEMINI_KEY is saved in settings, calls Gemini 2.0 Flash API
 * DIRECTLY from a Web Worker — no Apps Script cold-start, ~5-10s total.
 *
 * Slow fallback: if no direct key, routes through Apps Script proxy (~60-120s
 * due to Apps Script cold start). Apps Script still needed for Drive uploads.
 *
 * @param {string} imageBase64  data URL or raw base64
 * @param {string} mimeType     image/jpeg | image/png | image/webp
 * @param {string} syncUrl      Apps Script web app URL (fallback only)
 * @param {string} scanType     'basic' | 'examination'
 * @param {Function} onProgress (msg, pct) callback
 * @returns {Promise<object>}   extracted patient data
 */
/** Attempt to repair a truncated/partial JSON string by closing open strings and the object. */
function repairPartialJson(partial) {
  try {
    // Remove trailing incomplete key (ends with a comma + optional whitespace + open quote + partial key)
    let s = partial.replace(/,\s*"[^"]*$/, '');
    // Close any open string value
    s = s.replace(/:\s*"[^"]*$/, ': ""');
    // Remove trailing comma before close
    s = s.replace(/,\s*$/, '');
    // Ensure it ends with }
    if (!s.trimEnd().endsWith('}')) s = s + '}';
    return JSON.parse(s);
  } catch(e) { return null; }
}

/** Extract key:value pairs from a raw string as a last resort fallback. */
function extractKVFallback(text) {
  const result = {};
  const re = /"([\w]+)"\s*:\s*"([^"]*)"/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    result[m[1]] = m[2];
  }
  return Object.keys(result).length ? result : null;
}

// ── OCR Correction Learning System ──────────────────────────────────────────
// Stores user corrections to OCR output so future scans improve over time.
// Persisted in localStorage; injected into the Gemini prompt as known hints.

const OCR_LEARN_KEY = 'cyrabell_ocr_learn';

function loadOcrLearning() {
  try { return JSON.parse(localStorage.getItem(OCR_LEARN_KEY) || '[]'); }
  catch(e) { return []; }
}

function saveOcrLearning(entries) {
  try { localStorage.setItem(OCR_LEARN_KEY, JSON.stringify(entries)); } catch(e) {}
}

/**
 * Compare what Gemini extracted vs what the user corrected and persist diffs.
 * @param {Object} original  - raw extracted data
 * @param {Object} corrected - user-edited final data
 */
function saveOcrCorrections(original, corrected) {
  if (!original || !corrected) return;
  const entries = loadOcrLearning();
  const nameFields = ['name','phone','email','address','occupation','allergies',
                      'physician','emergencyContact','bloodType','maritalStatus',
                      'sex','bloodPressure','chronicAilments','drugsBeingTaken'];
  let changed = false;
  nameFields.forEach(field => {
    const orig = (original[field] || '').trim();
    const corr = (corrected[field] || '').trim();
    if (!orig || orig === corr) return; // nothing to learn
    // Find existing entry
    const idx = entries.findIndex(e => e.field === field && e.original === orig);
    if (idx >= 0) {
      // Update — only strengthen if correction matches previous correction
      if (entries[idx].corrected === corr) {
        entries[idx].count = (entries[idx].count || 1) + 1;
        entries[idx].lastSeen = new Date().toISOString().slice(0, 10);
      } else {
        // Conflicting correction — replace with newer one
        entries[idx].corrected = corr;
        entries[idx].count = 1;
        entries[idx].lastSeen = new Date().toISOString().slice(0, 10);
      }
    } else {
      entries.push({ field, original: orig, corrected: corr, count: 1,
                     lastSeen: new Date().toISOString().slice(0, 10) });
    }
    changed = true;
  });
  if (changed) {
    // Keep only the 200 most recently seen entries (avoid unbounded growth)
    entries.sort((a, b) => (b.lastSeen || '').localeCompare(a.lastSeen || ''));
    saveOcrLearning(entries.slice(0, 200));
    console.log('[OCR Learn] Saved corrections. Total entries:', entries.length);
  }
}

/**
 * Apply learned corrections to freshly extracted data (exact-match pass).
 */
function applyLearnedCorrections(data) {
  const entries = loadOcrLearning();
  if (!entries.length) return data;
  const result = {...data};
  entries.forEach(e => {
    const val = (result[e.field] || '').trim();
    if (val === e.original) {
      result[e.field] = e.corrected;
      console.log('[OCR Learn] Auto-corrected', e.field + ':', JSON.stringify(e.original), '→', JSON.stringify(e.corrected));
    }
  });
  return result;
}

/**
 * Build a "KNOWN CORRECTIONS" block to inject into the Gemini prompt.
 * Gemini sees these as prior examples and applies them during extraction.
 */
function buildLearningHints() {
  const entries = loadOcrLearning();
  if (!entries.length) return '';
  // Show top-20 by frequency to keep prompt short
  const top = entries.slice().sort((a, b) => (b.count||1) - (a.count||1)).slice(0, 20);
  const lines = top.map(e =>
    '  - If you read "' + e.original + '" in the ' + e.field + ' field, write "' + e.corrected + '" instead.'
  );
  return '\nKNOWN CORRECTIONS FROM PREVIOUS SCANS (apply these if you see the same text):\n' + lines.join('\n');
}

async function extractPatientDataFromCard(imageBase64, mimeType, syncUrl, scanType, onProgress) {
  const geminiKey = (function(){ try { return localStorage.getItem(LS_KEYS.GEMINI_KEY) || ''; } catch(e) { return ''; } })();
  const useDirect = !!geminiKey;

  if (!useDirect && !syncUrl) {
    throw new Error(
      'No Gemini API key configured.\n\n' +
      'Go to ☁️ Sync → enter your Gemini API key (free at aistudio.google.com) → Save.'
    );
  }

  onProgress && onProgress('Optimising image…', 10);

  // Compress to 900px / 0.78 quality — good OCR accuracy, small payload
  let base64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
  try {
    const dataUrl = imageBase64.startsWith('data:')
      ? imageBase64
      : ('data:' + (mimeType || 'image/jpeg') + ';base64,' + base64);
    const compressed = await compressImage(dataUrl, 900, 0.78);
    base64 = compressed.includes(',') ? compressed.split(',')[1] : compressed;
    console.log('[OCR] Image ready:', Math.round(base64.length / 1024), 'KB', useDirect ? '(direct)' : '(proxy)');
  } catch (e) {
    console.warn('[OCR] Compression failed, using original:', e.message);
  }

  onProgress && onProgress(useDirect ? 'Calling Gemini directly…' : 'Sending via Apps Script…', 30);

  // ── Build the extraction prompt (same as Apps Script version) ─────────────
  function buildPrompt(type) {
    if (type === 'examination') {
      return [
        'You are a dental clinical records OCR assistant. Extract ALL data from this patient examination record card.',
        'Return a single JSON object with these exact keys (use "" for missing/unclear fields):',
        '{',
        '  "name":"patient full name","dob":"YYYY-MM-DD","age":"numeric age","sex":"Male or Female",',
        '  "phone":"phone","address":"address","occupation":"occupation","scanDate":"YYYY-MM-DD",',
        '  "bloodPressure":"e.g. 120/80","physician":"physician name","allergies":"allergy list",',
        '  "chronicAilments":"chronic conditions","previousHistoryOfBleeding":"yes/no/details",',
        '  "drugsBeingTaken":"medications","natureOfTreatment":"treatment","occlusion":"occlusion findings",',
        '  "periodontalCondition":"periodontal status","oralHygiene":"oral hygiene rating",',
        '  "dentureUpper":"upper denture","dentureLower":"lower denture","abnormalities":"abnormalities",',
        '  "generalCondition":"general condition","clinicalNotes":"clinical notes",',
        '  "dentalChartNotes":"dental chart annotations","teethConditions":"tooth-by-tooth conditions"',
        '}',
        'ALSO extract any visit/appointment entries as "_appointments":',
        '[{"date":"YYYY-MM-DD","time":"HH:MM","service":"procedure","notes":"","fee":""}]',
        'AND any ledger entries as "_payments":',
        '[{"date":"YYYY-MM-DD","service":"","debit":"","credit":"","balance":"","method":"Cash","note":""}]',
        'If none found, use [] for those fields.',
        'RULES: Read ALL text including handwritten. Dates → YYYY-MM-DD. Return ONLY the JSON object.' +
        buildLearningHints(),
      ].join('\n');
    }
    return [
      'You are a dental records OCR assistant. Extract ALL visible text from this patient registration card.',
      'Return a single JSON object with these exact keys (use "" for missing/unclear fields):',
      '{',
      '  "name":"full patient name","dob":"YYYY-MM-DD","age":"numeric age","sex":"Male or Female",',
      '  "phone":"primary phone","email":"email","address":"complete address","occupation":"occupation",',
      '  "maritalStatus":"Single/Married/Widowed/Separated","bloodType":"A+/A-/B+/B-/O+/O-/AB+/AB-",',
      '  "age":"numeric age","sex":"Male or Female","maritalStatus":"Single/Married/Widowed/Separated",',
      '  "occupation":"occupation","allergies":"known allergies","chiefComplaint":"chief complaint or reason for visit",',
      '  "lastVisit":"YYYY-MM-DD","balance":"0","physician":"physician name","emergencyContact":"contact name and number"',
      '}',
      'ALSO extract any appointment or visit history entries as an array "_appointments":',
      '[{"date":"YYYY-MM-DD","time":"HH:MM","service":"procedure done","notes":"","fee":""}]',
      'AND extract any ledger/payment entries (debit=charges, credit=payments) as "_payments":',
      '[{"date":"YYYY-MM-DD","service":"","debit":"","credit":"","balance":"","method":"Cash","note":""}]',
      'If no appointments or payments found, use empty arrays [] for those fields.',
      'RULES: Read every character carefully. Dates → YYYY-MM-DD. Return ONLY the JSON object.' +
      buildLearningHints(),
    ].join('\n');
  }

  let data;

  if (useDirect) {
    // ── FAST PATH: call Gemini API directly (~5-10s) ─────────────────────────
    // Current Gemini models as of 2026.
    // 1.5 series fully removed from API — 2.0 and 2.5 only.
    // Each model has its own quota pool — fallback helps when one is busy.
    // gemini-2.0-flash-lite has 30 RPM (vs 15 RPM for flash) — best fallback.
    const GEMINI_MODELS = [
      'gemini-2.0-flash',
      'gemini-2.0-flash-lite',
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
    ];
    const geminiBody = JSON.stringify({
      contents: [{ parts: [
        { text: buildPrompt(scanType || 'basic') },
        { inline_data: { mime_type: mimeType || 'image/jpeg', data: base64 } },
      ]}],
      generationConfig: { temperature: 0, maxOutputTokens: 1024, responseMimeType: 'application/json' },
    });
    const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/';

    // Enforce minimum gap between calls (free tier: 15/min = 1 every 4s)
    await geminiRateWait(onProgress);
    onProgress && onProgress('Calling Gemini AI...', 35);

    // Helper: try all models once, return { usedModel, rawText } or null if all rate-limited/missing
    async function tryAllModels(progressOffset) {
      for (const model of GEMINI_MODELS) {
        let res, resText;
        try {
          res     = await fetch(BASE_URL + model + ':generateContent?key=' + geminiKey, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    geminiBody,
          });
          resText = await res.text();
        } catch (fetchErr) {
          throw new Error('Network error calling Gemini: ' + fetchErr.message);
        }

        if (res.status === 429 || res.status === 503) {
          console.warn('[OCR] ' + model + ' rate-limited (429), trying next...');
          onProgress && onProgress('Rate limited on ' + model + ', trying next...', progressOffset);
          continue;
        }
        if (res.status === 404) {
          console.warn('[OCR] ' + model + ' not found (404), trying next...');
          continue;
        }
        if (!res.ok) {
          let errMsg = 'HTTP ' + res.status;
          try { const ej = JSON.parse(resText); if (ej.error && ej.error.message) errMsg = ej.error.message; } catch(x) {}
          if (res.status === 400 && errMsg.toLowerCase().includes('api key')) {
            throw new Error('Invalid Gemini API key.\nGo to Sync settings (sidebar) and update your Gemini key.\nGet a free key at aistudio.google.com');
          }
          throw new Error('Gemini error (' + model + '): ' + errMsg);
        }

        let parsed;
        try { parsed = JSON.parse(resText); } catch(e) {
          throw new Error('Gemini returned invalid JSON from ' + model + '. Try again.');
        }
        const text = (parsed.candidates && parsed.candidates[0] && parsed.candidates[0].content &&
                      parsed.candidates[0].content.parts && parsed.candidates[0].content.parts[0] &&
                      parsed.candidates[0].content.parts[0].text) || '';
        if (!text) continue; // empty response — try next model
        return { usedModel: model, rawText: text };
      }
      return null; // all rate-limited or missing
    }

    // First pass
    let result = await tryAllModels(45);

    // If all rate-limited, wait 62s (full 1-min quota window) then retry once
    if (!result) {
      for (let s = 62; s > 0; s--) {
        onProgress && onProgress('Quota full. Auto-retrying in ' + s + 's... (free tier: 15/min)', 50);
        await new Promise(r => setTimeout(r, 1000));
      }
      _geminiLastCallAt = 0; // reset rate limiter — we already waited the full window
      onProgress && onProgress('Retrying now...', 55);
      result = await tryAllModels(60);
    }

    if (!result) {
      throw new Error(
        'Gemini rate limit exceeded on all models.\n\n' +
        'Free tier: 15 scans/minute. Wait 1 minute and try again.\n' +
        'Tip: avoid scanning multiple cards in rapid succession.'
      );
    }

    const { usedModel, rawText } = result;
    console.log('[OCR] Direct Gemini success — model:', usedModel);
    onProgress && onProgress('Parsing AI response...', 85);

    if (!rawText) throw new Error('Gemini (' + usedModel + ') returned empty content.');

    let content = rawText.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
    try {
      data = JSON.parse(content);
    } catch(e) {
      // Try extracting a complete JSON object first
      const m = content.match(/\{[\s\S]*\}/);
      if (m) {
        try { data = JSON.parse(m[0]); }
        catch(e2) {
          // Repair truncated JSON: close any open string, then close the object
          data = repairPartialJson(m[0]);
          if (!data) throw new Error('Could not parse Gemini response: ' + content.substring(0, 200));
        }
      } else {
        // No closing brace — JSON is truncated; attempt repair on the whole content
        const startIdx = content.indexOf('{');
        if (startIdx !== -1) {
          data = repairPartialJson(content.slice(startIdx));
        }
        if (!data) {
          // Last resort: regex-extract any key:value pairs present
          data = extractKVFallback(content);
        }
        if (!data || !Object.keys(data).length) {
          throw new Error('No JSON in Gemini response: ' + content.substring(0, 200));
        }
      }
    }

  } else {
    // ── FALLBACK: route through Apps Script proxy ────────────────────────────
    const payload = JSON.stringify({
      action:   'geminiOcr',
      imageB64: base64,
      mimeType: mimeType || 'image/jpeg',
      scanType: scanType || 'basic',
    });

    const result = await new Promise((resolve, reject) => {
      const workerSrc = `
self.onmessage = async function(e) {
  const { syncUrl, payload } = e.data;
  try {
    const res = await fetch(syncUrl, { method:'POST', headers:{'Content-Type':'text/plain;charset=utf-8'}, body:payload, redirect:'follow' });
    const text = await res.text();
    if (!res.ok) { self.postMessage({ ok: false, error: 'HTTP ' + res.status + ': ' + text.substring(0, 300) }); return; }
    let parsed;
    try { parsed = JSON.parse(text); } catch(e) { self.postMessage({ ok: false, error: 'Bad JSON: ' + text.substring(0, 100) }); return; }
    self.postMessage({ ok: true, result: parsed });
  } catch(err) { self.postMessage({ ok: false, error: err.message || String(err) }); }
};`;
      let worker, timeout;
      try {
        const blob = new Blob([workerSrc], { type: 'application/javascript' });
        const blobUrl = URL.createObjectURL(blob);
        worker  = new Worker(blobUrl);
        timeout = setTimeout(() => {
          try { worker.terminate(); URL.revokeObjectURL(blobUrl); } catch(e) {}
          reject(new Error('Request timed out (90s). Check your Apps Script URL and try again.'));
        }, 90000);
        worker.onmessage = (e) => {
          clearTimeout(timeout);
          URL.revokeObjectURL(blobUrl);
          worker.terminate();
          resolve(e.data);
        };
        worker.onerror = (e) => {
          clearTimeout(timeout);
          URL.revokeObjectURL(blobUrl);
          reject(new Error('Worker error: ' + (e.message || 'unknown')));
        };
        worker.postMessage({ syncUrl, payload });
      } catch (workerErr) {
        clearTimeout && clearTimeout(timeout);
        fetch(syncUrl, { method:'POST', headers:{'Content-Type':'text/plain;charset=utf-8'}, body:payload, redirect:'follow' })
          .then(r => r.text().then(t => {
            if (!r.ok) resolve({ ok: false, error: 'HTTP ' + r.status + ': ' + t.substring(0, 200) });
            else { try { resolve({ ok: true, result: JSON.parse(t) }); } catch(e) { resolve({ ok: false, error: 'Bad JSON' }); } }
          }))
          .catch(err => resolve({ ok: false, error: err.message }));
      }
    });

    onProgress && onProgress('Processing AI response…', 85);

    if (!result.ok) {
      const err = result.error || 'Unknown error';
      if (err.includes('429')) throw new Error('Gemini rate limit. Wait 15 seconds and try again.');
      if (err.includes('GEMINI_API_KEY') || err.includes('not configured')) {
        throw new Error('Gemini API key missing in Apps Script.\nOr go to ☁️ Sync → add your Gemini key for direct (fast) mode.');
      }
      throw new Error('OCR failed: ' + err);
    }

    const parsed = result.result;
    if (!parsed || parsed.ok === false) {
      const gsErr = (parsed && parsed.error) || 'Unknown Apps Script error';
      if (gsErr.includes('429')) throw new Error('Gemini rate limit. Wait 15 seconds and try again.');
      throw new Error('Apps Script error: ' + gsErr);
    }
    if (!parsed.data) throw new Error('Apps Script returned ok:true but no data field.');
    data = parsed.data;
  }

  // ── Apply learned corrections (exact-match pass before sanitize) ─────────
  data = applyLearnedCorrections(data);

  // ── Sanitize ──────────────────────────────────────────────────────────────
  const clean = {};
  Object.keys(data).forEach(k => {
    const v = data[k];
    clean[k] = (v === null || v === undefined || v === 'null' || v === 'N/A' || v === 'n/a') ? '' : String(v).trim();
  });

  console.log('[OCR] Done via', useDirect ? 'direct Gemini' : 'Apps Script proxy', '— fields:', Object.keys(clean).filter(k => clean[k]).join(', '));
  onProgress && onProgress('Done!', 100);
  return clean;
}

/**
 * RecordCardScanner — modal that captures an image and extracts patient data.
 * @param {function} onExtracted  - called with extracted patient data object
 * @param {function} onClose      - called to close the modal
 */
function RecordCardScanner({onExtracted, onBatchExtracted, onClose}) {
  const [step, setStep]           = useState('capture'); // 'capture' | 'processing' | 'review' | 'error'
  const [imageDataUrl, setImage]  = useState(null);
  const [mimeType, setMimeType]   = useState('image/jpeg');
  const [extracted, setExtracted] = useState(null);
  const [errorMsg, setErrorMsg]   = useState('');
  const [editData, setEditData]   = useState({});
  const [progressMsg, setProgressMsg] = useState('');
  const [progressPct, setProgressPct] = useState(0);
  const [scannedList, setScannedList] = useState([]); // accumulates confirmed scans for batch add
  const fileRef                   = useRef(null);
  const videoRef                  = useRef(null);
  const streamRef                 = useRef(null);
  const [showCam, setShowCam]     = useState(false);

  const stopCam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setShowCam(false);
  };

  const startCam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 } }
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setShowCam(true);
    } catch (e) {
      setErrorMsg('Camera access denied: ' + e.message);
      setStep('error');
    }
  };

  const captureFrame = async () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    stopCam();
    setImage(dataUrl);
    setMimeType('image/jpeg');
    await runExtraction(dataUrl, 'image/jpeg');
  };

  const handleFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const mime = file.type || 'image/jpeg';
    const dataUrl = await readFileAsDataUrl(file);
    setImage(dataUrl);
    setMimeType(mime);
    await runExtraction(dataUrl, mime);
    e.target.value = '';
  };

  const runExtraction = async (dataUrl, mime) => {
    setStep('processing');
    setErrorMsg('');
    setProgressPct(0);
    setProgressMsg('Starting…');
    try {
      const syncUrl = (() => {
        try { return localStorage.getItem(LS_KEYS.SYNC_URL) || ''; } catch(e) { return ''; }
      })();
      const safeMime = (mime && mime.startsWith('image/')) ? mime : 'image/jpeg';
      const result = await extractPatientDataFromCard(
        dataUrl, safeMime, syncUrl, 'basic',
        (msg, pct) => { setProgressMsg(msg); setProgressPct(pct); }
      );
      // Normalize dates
      ['dob', 'lastVisit'].forEach(k => {
        if (result[k]) result[k] = sanitizeDate(result[k]) || result[k];
      });
      // Normalize appointment dates
      if (Array.isArray(result._appointments)) {
        result._appointments = result._appointments.map(a => ({
          ...a, date: sanitizeDate(a.date) || a.date || ''
        }));
      } else { result._appointments = []; }
      // Normalize payment dates
      if (Array.isArray(result._payments)) {
        result._payments = result._payments.map(p => ({
          ...p, date: sanitizeDate(p.date) || p.date || ''
        }));
      } else { result._payments = []; }
      setExtracted(result);
      setEditData({...result});
      setStep('review');
    } catch (err) {
      setErrorMsg(err.message);
      setStep('error');
    }
  };

  const ed = (k, v) => setEditData(prev => ({...prev, [k]: v}));

  // Image viewer state (zoom + rotate for the scanned card preview)
  const [imgZoom, setImgZoom]     = useState(1);
  const [imgRotate, setImgRotate] = useState(0);
  const [imgPan, setImgPan]       = useState({x:0, y:0});
  const imgDragRef                = useRef(null);

  const imgResetView = () => { setImgZoom(1); setImgRotate(0); setImgPan({x:0,y:0}); };

  const imgOnWheel = (e) => {
    e.preventDefault();
    setImgZoom(z => Math.min(8, Math.max(0.3, z - e.deltaY * 0.001)));
  };

  const imgOnMouseDown = (e) => {
    if (e.button !== 0) return;
    const start = {x: e.clientX - imgPan.x, y: e.clientY - imgPan.y};
    const onMove = (ev) => setImgPan({x: ev.clientX - start.x, y: ev.clientY - start.y});
    const onUp   = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const imgOnTouchStart = (e) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      const start = {x: t.clientX - imgPan.x, y: t.clientY - imgPan.y};
      const onMove = (ev) => {
        if (ev.touches.length !== 1) return;
        setImgPan({x: ev.touches[0].clientX - start.x, y: ev.touches[0].clientY - start.y});
      };
      const onEnd = () => { window.removeEventListener('touchmove', onMove); window.removeEventListener('touchend', onEnd); };
      window.addEventListener('touchmove', onMove, {passive:false});
      window.addEventListener('touchend', onEnd);
    } else if (e.touches.length === 2) {
      // Pinch-to-zoom
      const d0 = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      const z0 = imgZoom;
      const onMove = (ev) => {
        if (ev.touches.length !== 2) return;
        const d = Math.hypot(ev.touches[0].clientX - ev.touches[1].clientX, ev.touches[0].clientY - ev.touches[1].clientY);
        setImgZoom(Math.min(8, Math.max(0.3, z0 * (d / d0))));
      };
      const onEnd = () => { window.removeEventListener('touchmove', onMove); window.removeEventListener('touchend', onEnd); };
      window.addEventListener('touchmove', onMove, {passive:false});
      window.addEventListener('touchend', onEnd);
    }
  };

  // Cleanup on unmount
  useEffect(() => () => stopCam(), []);

  // ── STEP: CAPTURE ──────────────────────────────────────────────────
  if (step === 'capture') return h(Modal, {
    title: '📷 Scan Old Record Card',
    sub: 'Capture or upload a photo of a physical patient record card',
    onClose: () => { stopCam(); onClose(); },
    footer: null
  },
    h('div', {className: 'ocr-scanner'},
      showCam
        ? h('div', {className: 'ocr-cam-wrap'},
            h('video', {ref: videoRef, autoPlay: true, playsInline: true, className: 'ocr-video'}),
            h('div', {className: 'ocr-cam-overlay'},
              h('div', {className: 'ocr-scan-frame'}),
              h('div', {className: 'ocr-scan-hint'}, 'Align the record card within the frame')
            ),
            h('div', {className: 'ocr-cam-btns'},
              h('button', {type: 'button', className: 'btn bgh', onClick: stopCam}, '✕ Cancel'),
              h('button', {type: 'button', className: 'btn bp', onClick: captureFrame}, '📸 Capture')
            )
          )
        : h('div', {className: 'ocr-options'},
            h('div', {className: 'ocr-title'}, '📋 Scan Patient Record Card'),
            h('div', {className: 'ocr-subtitle'},
              'Take a photo or upload a scan of a handwritten or printed patient record card. ',
              'Claude AI will read and extract the patient data automatically.'
            ),
            h('div', {className: 'ocr-btn-grid'},
              h('button', {type: 'button', className: 'ocr-opt-btn', onClick: startCam},
                h('div', {className: 'ocr-opt-icon'}, '📷'),
                h('div', {className: 'ocr-opt-label'}, 'Use Camera'),
                h('div', {className: 'ocr-opt-desc'}, 'Take a photo with your device camera')
              ),
              h('button', {type: 'button', className: 'ocr-opt-btn', onClick: () => fileRef.current.click()},
                h('div', {className: 'ocr-opt-icon'}, '📁'),
                h('div', {className: 'ocr-opt-label'}, 'Upload Image'),
                h('div', {className: 'ocr-opt-desc'}, 'JPG, PNG, PDF scan, or HEIC')
              )
            ),
            h('div', {className: 'ocr-tip'},
              '💡 Works best with clear, well-lit photos. Handwritten cards are supported.'
            ),
            h('input', {
              ref: fileRef, type: 'file',
              accept: 'image/*',
              onChange: handleFile,
              style: {display: 'none'}
            })
          )
    )
  );

  // ── STEP: PROCESSING ───────────────────────────────────────────────
  if (step === 'processing') return h(Modal, {
    title: '⚡ Gemini AI Reading Card…',
    sub: 'Gemini 2.0 Flash is extracting patient information',
    onClose, footer: null
  },
    h('div', {className: 'ocr-processing'},
      imageDataUrl && h('img', {src: imageDataUrl, alt: 'Scanned card', className: 'ocr-preview-img'}),
      h('div', {className: 'ocr-spinner-wrap'},
        h('div', {className: 'ocr-spinner'}),
        h('div', {className: 'ocr-processing-text'},
          h('div', {style: {fontWeight: 700, fontSize: 15, marginBottom: 6}}, progressMsg || 'Starting…'),
          h('div', {style: {fontSize: 12.5, color: 'var(--md)', lineHeight: 1.5}},
            'Reading patient name, date of birth, contact details, ',
            'blood type, allergies, and medical notes.'
          ),
          h('div', {style: {marginTop:10, background:'var(--bg3)', borderRadius:6, overflow:'hidden', height:8}},
            h('div', {style: {
              width: (progressPct||0)+'%', height:'100%',
              background:'linear-gradient(90deg,#4f8ef7,#7c3aed)',
              transition:'width 0.4s ease', borderRadius:6,
            }})
          ),
          h('div', {style: {fontSize:11, color:'var(--md)', marginTop:4, textAlign:'right'}},
            (progressPct||0)+'%'
          )
        )
      )
    )
  );

  // ── STEP: ERROR ────────────────────────────────────────────────────
  if (step === 'error') return h(Modal, {
    title: '⚠ Extraction Failed',
    sub: 'Could not read the record card',
    onClose,
    footer: h(Fragment, null,
      h('button', {className: 'btn bgh', onClick: onClose}, 'Cancel'),
      h('button', {className: 'btn bp', onClick: () => { setStep('capture'); setImage(null); }}, '↻ Try again')
    )
  },
    h('div', {className: 'ocr-error'},
      h('div', {className: 'ocr-error-icon'}, '⚠'),
      h('div', {className: 'ocr-error-msg'}, errorMsg),
      imageDataUrl && h('img', {src: imageDataUrl, alt: 'Failed scan', className: 'ocr-preview-img'}),
      h('div', {className: 'ocr-tip', style: {marginTop: 14}},
        '💡 Tips: Ensure the card is well-lit and clearly readable. ' +
        'Try a closer shot. Avoid glare on shiny cards.'
      )
    )
  );

  // ── STEP: REVIEW ───────────────────────────────────────────────────
  if (step === 'review') {
    const fields = [
      {k:'name',          l:'Full Name *',      t:'text',   ph:'Juan Dela Cruz'},
      {k:'dob',           l:'Date of Birth',    t:'date',   ph:''},
      {k:'age',           l:'Age',              t:'number', ph:''},
      {k:'sex',           l:'Sex',              t:'select', opts:['','Male','Female','Other']},
      {k:'maritalStatus', l:'Status',           t:'select', opts:['','Single','Married','Widowed','Separated']},
      {k:'occupation',    l:'Occupation',       t:'text',   ph:'e.g. Teacher'},
      {k:'phone',         l:'Phone *',          t:'text',   ph:'09171234567'},
      {k:'email',         l:'Email',            t:'email',  ph:'patient@email.com'},
      {k:'address',       l:'Address',          t:'text',   ph:'Street, City'},
      {k:'bloodType',     l:'Blood Type',       t:'select', opts:['A+','A-','B+','B-','AB+','AB-','O+','O-','Unknown']},
      {k:'allergies',     l:'Allergies',        t:'text',   ph:'None'},
      {k:'chiefComplaint',l:'Chief Complaint',  t:'text',   ph:'e.g. Toothache, bleeding gums'},
    ];

    const learnCount = loadOcrLearning().length;

    const addToList = () => {
      saveOcrCorrections(extracted, editData); // learn from this correction
      const entry = {...editData};
      setScannedList(prev => [...prev, entry]);
      setStep('capture');
      setImage(null);
      setExtracted(null);
      setEditData({});
    };

    const addAllPatients = () => {
      saveOcrCorrections(extracted, editData); // learn from this correction
      const finalList = [...scannedList, {...editData}];
      if (onBatchExtracted) onBatchExtracted(finalList);
      else finalList.forEach(d => onExtracted(d));
    };

    return h(Modal, {
      title: '✅ Review Extracted Data',
      sub: scannedList.length
        ? `${scannedList.length} record(s) queued — verify then add all`
        : 'Verify the information before saving to the patient record',
      onClose, xl: true,
      footer: h(Fragment, null,
        h('button', {className: 'btn bgh', onClick: onClose}, 'Cancel'),
        h('button', {className: 'btn bg2', onClick: () => { setStep('capture'); setImage(null); }}, '↻ Rescan'),
        h('button', {
          className: 'btn bg2',
          disabled: !S(editData.name).trim(),
          onClick: addToList,
          title: 'Save this record and scan another card'
        }, '+ Scan Another'),
        scannedList.length > 0
          ? h('button', {
              className: 'btn bp',
              disabled: !S(editData.name).trim(),
              onClick: addAllPatients
            }, '✓ Add All (' + (scannedList.length + 1) + ') as Patients')
          : h('button', {
              className: 'btn bp',
              disabled: !S(editData.name).trim() || !S(editData.phone).trim(),
              onClick: () => { saveOcrCorrections(extracted, editData); onExtracted(editData); }
            }, '✓ Use This Data')
      )
    },
      scannedList.length > 0 && h('div', {className: 'ocr-queued-bar'},
        h('span', {className: 'ocr-queued-label'}, '📋 Queued:'),
        scannedList.map((s, i) => h('span', {key: i, className: 'ocr-queued-chip'},
          S(s.name) || '(no name)',
          h('button', {
            className: 'ocr-queued-remove',
            title: 'Remove from queue',
            onClick: () => setScannedList(prev => prev.filter((_, j) => j !== i))
          }, '×')
        ))
      ),
      h('div', {className: 'ocr-review-grid'},
        // Left: interactive image viewer
        h('div', {className: 'ocr-review-img-col'},
          h('div', {className: 'ocr-img-viewer-hdr'},
            h('span', null, '📷 Scanned Card'),
            h('div', {className: 'ocr-img-controls'},
              h('button', {className:'ocr-ic-btn', title:'Zoom in',
                onClick:()=>setImgZoom(z=>Math.min(8,+(z+0.25).toFixed(2)))}, '＋'),
              h('button', {className:'ocr-ic-btn', title:'Zoom out',
                onClick:()=>setImgZoom(z=>Math.max(0.3,+(z-0.25).toFixed(2)))}, '－'),
              h('button', {className:'ocr-ic-btn', title:'Rotate left',
                onClick:()=>setImgRotate(r=>(r-90+360)%360)}, '↺'),
              h('button', {className:'ocr-ic-btn', title:'Rotate right',
                onClick:()=>setImgRotate(r=>(r+90)%360)}, '↻'),
              h('button', {className:'ocr-ic-btn ocr-ic-reset', title:'Reset view', onClick:imgResetView}, '⊡'),
              h('span', {className:'ocr-ic-zoom-lbl'}, Math.round(imgZoom*100)+'%')
            )
          ),
          h('div', {
            className: 'ocr-img-viewport',
            onWheel: imgOnWheel,
            onMouseDown: imgOnMouseDown,
            onTouchStart: imgOnTouchStart,
            ref: imgDragRef,
            style: {cursor: imgZoom > 1 ? 'grab' : 'default'}
          },
            h('img', {
              src: imageDataUrl,
              alt: 'Scanned record card',
              className: 'ocr-img-inner',
              draggable: false,
              style: {
                transform: `translate(${imgPan.x}px,${imgPan.y}px) rotate(${imgRotate}deg) scale(${imgZoom})`,
                transformOrigin: 'center center',
              }
            })
          ),
          extracted.notes && h('div', {className: 'ocr-notes-box'},
            h('div', {className: 'ocr-notes-label'}, '📝 Notes from card'),
            h('div', {className: 'ocr-notes-text'}, extracted.notes)
          )
        ),
        // Right: editable fields + appointments + payments
        h('div', {className: 'ocr-review-form'},
          h('div', {className: 'ocr-review-form-header'},
            h('div', {style: {fontWeight: 700, fontSize: 15}}, '✏️ Edit if needed'),
            h('div', {style: {fontSize: 12, color: 'var(--md)', marginTop: 3}},
              'Fields highlighted in green were successfully extracted. Edit any incorrect values.'
            ),
            h('div', {className: 'ocr-learn-badge'},
              h('span', {className: 'ocr-learn-icon'}, '🧠'),
              learnCount > 0
                ? h('span', null, 'AI learned ', h('strong', null, learnCount), ' correction' + (learnCount === 1 ? '' : 's') + ' — edits here will improve future scans')
                : h('span', null, 'Edit any wrong fields — AI will learn and improve next time')
            )
          ),
          // Patient fields
          h('div', {className: 'ocr-fields'},
            fields.map(fi => h('div', {key: fi.k, className: 'ocr-field'},
              h('label', {className: 'ocr-field-label'},
                fi.l,
                extracted[fi.k] && h('span', {className: 'ocr-extracted-badge'}, '✓ found')
              ),
              fi.t === 'select'
                ? h('select', {
                    value: editData[fi.k] || '',
                    onChange: e => ed(fi.k, e.target.value),
                    className: 'ocr-field-input' + (extracted[fi.k] ? ' ocr-filled' : '')
                  },
                  fi.opts.map(o => h('option', {key: o, value: o}, o))
                )
                : h('input', {
                    type: fi.t,
                    value: editData[fi.k] || '',
                    onChange: e => ed(fi.k, e.target.value),
                    placeholder: fi.ph,
                    className: 'ocr-field-input' + (extracted[fi.k] ? ' ocr-filled' : '')
                  })
            ))
          ),

          // ── Appointment history section ──────────────────────────────────
          h('div', {className: 'ocr-section-hdr'},
            h('div', {className: 'ocr-section-hdr-left'},
              h('span', null, '📅 Appointment History'),
              h('span', {className: 'ocr-section-count'},
                (editData._appointments || []).length + ' record(s)'
              )
            ),
            h('button', {
              type: 'button', className: 'ocr-add-row-btn',
              onClick: () => ed('_appointments', [...(editData._appointments || []),
                {date: localToday(), time: '09:00', services: [], service: '', notes: '', fee: ''}])
            }, '+ Add Row')
          ),
          (editData._appointments || []).length === 0
            ? h('div', {className: 'ocr-empty-hint'}, 'No appointments extracted. Click "+ Add Row" to add manually.')
            : h('div', {className: 'ocr-ledger-table'},
                h('div', {className: 'ocr-ledger-head ocr-appt-head'},
                  h('span', {className:'ocr-col-date'}, 'Date'),
                  h('span', {className:'ocr-col-time'}, 'Time'),
                  h('span', {className:'ocr-col-svc'}, 'Services'),
                  h('span', {className:'ocr-col-notes'}, 'Notes'),
                  h('span', {className:'ocr-col-fee'}, 'Fee (₱)'),
                  h('span', {className:'ocr-col-del'}, '')
                ),
                (editData._appointments || []).map((appt, i) =>
                  h('div', {key: i, className: 'ocr-ledger-row ocr-appt-head'},
                    h('input', {type:'date', value: appt.date||'', className:'ocr-cell-input ocr-col-date',
                      onChange: e => { const a=[...(editData._appointments||[])]; a[i]={...a[i],date:e.target.value}; ed('_appointments',a); }}),
                    h('input', {type:'time', value: appt.time||'', className:'ocr-cell-input ocr-col-time',
                      onChange: e => { const a=[...(editData._appointments||[])]; a[i]={...a[i],time:e.target.value}; ed('_appointments',a); }}),
                    h('div', {className:'ocr-cell-input ocr-col-svc', style:{display:'flex',flexWrap:'wrap',gap:2,alignItems:'center',padding:'2px 3px',minHeight:28}},
                      svcList(appt).map((sv,si)=>h('span',{key:si,className:'svc-tag',style:{fontSize:10,padding:'1px 5px 1px 6px'}},sv,
                        h('button',{type:'button',onClick:()=>{
                          const a=[...(editData._appointments||[])];
                          const next=svcList(appt).filter(x=>x!==sv);
                          const fee=next.reduce((sum,nm)=>{const x=getActiveSvcs().find(q=>q.name===nm);return sum+(x?+x.fee:0);},0);
                          a[i]={...a[i],services:next,service:next[0]||'',fee:fee||a[i].fee};
                          ed('_appointments',a);
                        }},'×')
                      )),
                      h('select',{value:'',className:'svc-add-select',style:{fontSize:10,maxWidth:110},onChange:e=>{
                        const n=e.target.value;if(!n)return;
                        const a=[...(editData._appointments||[])];
                        const cur=svcList(appt);if(cur.includes(n))return;
                        const next=[...cur,n];
                        const fee=next.reduce((sum,nm)=>{const x=getActiveSvcs().find(q=>q.name===nm);return sum+(x?+x.fee:0);},0);
                        a[i]={...a[i],services:next,service:next[0]||'',fee};
                        ed('_appointments',a);
                      }},
                        h('option',{value:''},svcList(appt).length?'＋ more…':'＋ service'),
                        Object.entries(getActiveSvcsByCat()).map(([cat,svcs])=>
                          h('optgroup',{key:cat,label:cat},
                            svcs.map(sv=>h('option',{key:sv.name,value:sv.name},sv.name))
                          )
                        )
                      )
                    ),
                    h('input', {type:'text', value: appt.notes||'', placeholder:'notes', className:'ocr-cell-input ocr-col-notes',
                      onChange: e => { const a=[...(editData._appointments||[])]; a[i]={...a[i],notes:e.target.value}; ed('_appointments',a); }}),
                    h('input', {type:'number', value: appt.fee||'', placeholder:'0', className:'ocr-cell-input ocr-col-fee',
                      onChange: e => { const a=[...(editData._appointments||[])]; a[i]={...a[i],fee:e.target.value}; ed('_appointments',a); }}),
                    h('button', {type:'button', className:'ocr-del-row-btn ocr-col-del',
                      onClick: () => { const a=[...(editData._appointments||[])]; a.splice(i,1); ed('_appointments',a); }}, '×')
                  )
                )
              ),

          // ── Payment / ledger section ─────────────────────────────────────
          h('div', {className: 'ocr-section-hdr'},
            h('div', {className: 'ocr-section-hdr-left'},
              h('span', null, '💳 Payment Records'),
              h('span', {className: 'ocr-section-count'},
                (editData._payments || []).length + ' record(s)'
              )
            ),
            h('button', {
              type: 'button', className: 'ocr-add-row-btn',
              onClick: () => ed('_payments', [...(editData._payments || []),
                {date: localToday(), services: [], service: '', debit: '', credit: '', balance: '', method: 'Cash', note: ''}])
            }, '+ Add Row')
          ),
          (editData._payments || []).length === 0
            ? h('div', {className: 'ocr-empty-hint'}, 'No payment records extracted. Click "+ Add Row" to add manually.')
            : h('div', {className: 'ocr-ledger-table'},
                h('div', {className: 'ocr-ledger-head ocr-pay-head'},
                  h('span', {className:'ocr-col-date'}, 'Date'),
                  h('span', {className:'ocr-col-svc'}, 'Services'),
                  h('span', {className:'ocr-col-amt', style:{color:'var(--re)'}}, 'Debit (₱)'),
                  h('span', {className:'ocr-col-amt', style:{color:'#22c55e'}}, 'Credit (₱)'),
                  h('span', {className:'ocr-col-amt'}, 'Balance (₱)'),
                  h('span', {className:'ocr-col-meth'}, 'Method'),
                  h('span', {className:'ocr-col-del'}, '')
                ),
                (editData._payments || []).map((pay, i) =>
                  h('div', {key: i, className: 'ocr-ledger-row ocr-pay-head'},
                    h('input', {type:'date', value: pay.date||'', className:'ocr-cell-input ocr-col-date',
                      onChange: e => { const a=[...(editData._payments||[])]; a[i]={...a[i],date:e.target.value}; ed('_payments',a); }}),
                    h('div', {className:'ocr-cell-input ocr-col-svc', style:{display:'flex',flexWrap:'wrap',gap:2,alignItems:'center',padding:'2px 3px',minHeight:28}},
                      svcList(pay).map((sv,si)=>h('span',{key:si,className:'svc-tag',style:{fontSize:10,padding:'1px 5px 1px 6px'}},sv,
                        h('button',{type:'button',onClick:()=>{
                          const a=[...(editData._payments||[])];
                          const next=svcList(pay).filter(x=>x!==sv);
                          a[i]={...a[i],services:next,service:next[0]||''};
                          ed('_payments',a);
                        }},'×')
                      )),
                      h('select',{value:'',className:'svc-add-select',style:{fontSize:10,maxWidth:110},onChange:e=>{
                        const n=e.target.value;if(!n)return;
                        const a=[...(editData._payments||[])];
                        const cur=svcList(pay);if(cur.includes(n))return;
                        const next=[...cur,n];
                        a[i]={...a[i],services:next,service:next[0]||''};
                        ed('_payments',a);
                      }},
                        h('option',{value:''},svcList(pay).length?'＋ more…':'＋ service'),
                        Object.entries(getActiveSvcsByCat()).map(([cat,svcs])=>
                          h('optgroup',{key:cat,label:cat},
                            svcs.map(sv=>h('option',{key:sv.name,value:sv.name},sv.name))
                          )
                        )
                      )
                    ),
                    h('input', {type:'number', value: pay.debit||'', placeholder:'0', className:'ocr-cell-input ocr-col-amt',
                      onChange: e => { const a=[...(editData._payments||[])]; a[i]={...a[i],debit:e.target.value}; ed('_payments',a); }}),
                    h('input', {type:'number', value: pay.credit||'', placeholder:'0', className:'ocr-cell-input ocr-col-amt',
                      onChange: e => { const a=[...(editData._payments||[])]; a[i]={...a[i],credit:e.target.value}; ed('_payments',a); }}),
                    h('input', {type:'number', value: pay.balance||'', placeholder:'0', className:'ocr-cell-input ocr-col-amt',
                      onChange: e => { const a=[...(editData._payments||[])]; a[i]={...a[i],balance:e.target.value}; ed('_payments',a); }}),
                    h('select', {value: pay.method||'Cash', className:'ocr-cell-input ocr-col-meth',
                      onChange: e => { const a=[...(editData._payments||[])]; a[i]={...a[i],method:e.target.value}; ed('_payments',a); }},
                      ['Cash','GCash','Maya','Card','Bank Transfer','HMO','Other'].map(m => h('option',{key:m,value:m},m))
                    ),
                    h('button', {type:'button', className:'ocr-del-row-btn ocr-col-del',
                      onClick: () => { const a=[...(editData._payments||[])]; a.splice(i,1); ed('_payments',a); }}, '×')
                  )
                )
              )
        )
      )
    );
  }

  return null;
}


function Patients({patients,setPatients,appointments,setAppointments,payments,setPayments,addToast,syncUrl,user}){
  const [search,setSearch]=useState('');
  const [modal,setModal]=useState(false);
  const [edit,setEdit]=useState(null);
  const [view,setView]=useState(null);
  const [showScanner,setShowScanner]=useState(false);    // OCR scanner modal
  const [scanPrefill,setScanPrefill]=useState(null);     // pre-filled data from scan
  const filtered=patients.filter(p=>!search||S(p.name).toLowerCase().includes(S(search).toLowerCase())||S(p.id).includes(S(search)));
  const { pageItems: pagedPatients, PagerUI: PatientsPager } = usePagination(filtered);
  const [dupState, setDupState] = useState(null); // {existing, onUpdate, onCancel}

  const doAddPatient = (d, overrideId) => {
    const newId = overrideId || d.id || ('P' + String(Date.now()).slice(-6));
    const rec   = {balance:0, lastVisit:'—', teeth:{}, ...d, id: newId};
    setPatients(p => [rec, ...p.filter(x => x.id !== newId)]);
    syncOneRecord('patients', rec, syncUrl);
    // If patient was added from a scan, create appointments + payments with the real final ID
    if (scanPrefill && ((scanPrefill._appointments||[]).length || (scanPrefill._payments||[]).length)) {
      createScannedRecords({...scanPrefill, name: rec.name, phone: rec.phone, email: rec.email}, newId);
      setScanPrefill(null);
    }
    addToast('Patient added!', 'success');
    setModal(false); setEdit(null);
  };

  const doUpdatePatient = (d, targetId) => {
    let updated;
    setPatients(p => p.map(x => {
      if (x.id !== targetId) return x;
      updated = {...x, ...d, id: targetId};
      return updated;
    }));
    if (updated) syncOneRecord('patients', updated, syncUrl);
    // If patient was updated from a scan, also import scan appointments + payments
    if (scanPrefill && ((scanPrefill._appointments||[]).length || (scanPrefill._payments||[]).length)) {
      createScannedRecords({...scanPrefill, name: d.name||updated?.name, phone: d.phone||updated?.phone, email: d.email||updated?.email}, targetId);
      setScanPrefill(null);
    }
    addToast('Record updated!', 'success');
    setModal(false); setEdit(null);
  };

  const save = async d => {
    const isExisting = d.id && patients.some(p => p.id === d.id);

    if (isExisting) {
      doUpdatePatient(d, d.id);
      return;
    }

    // 1 — Local duplicate check
    const localDup = findExistingPatient(patients, d);
    if (localDup) {
      setDupState({
        existing: localDup,
        onUpdate: () => { setDupState(null); doUpdatePatient(d, localDup.id); },
        onCancel: () => { setDupState(null); doAddPatient(d); }
      });
      return;
    }

    // 2 — Google Sheets duplicate check (only if connected)
    if (syncUrl && S(d.name) && S(d.phone)) {
      try {
        const sheetDup = await checkSheetsDuplicate('patients',
          { name: S(d.name).trim(), phone: S(d.phone).trim() }, d.id || '', syncUrl);
        if (sheetDup && sheetDup.id) {
          setDupState({
            existing: sheetDup,
            onUpdate: () => {
              setDupState(null);
              const merged = {balance:0, lastVisit:'—', teeth:{}, ...sheetDup, ...d, id: sheetDup.id};
              setPatients(p => {
                const found = p.some(x => x.id === sheetDup.id);
                return found ? p.map(x => x.id === sheetDup.id ? merged : x) : [merged, ...p];
              });
              syncOneRecord('patients', merged, syncUrl);
              if (scanPrefill && ((scanPrefill._appointments||[]).length || (scanPrefill._payments||[]).length)) {
                createScannedRecords({...scanPrefill, name: merged.name, phone: merged.phone, email: merged.email}, sheetDup.id);
                setScanPrefill(null);
              }
              addToast('Updated existing patient from Sheets: ' + merged.name, 'success');
              setModal(false); setEdit(null);
            },
            onCancel: () => { setDupState(null); doAddPatient(d); }
          });
          return;
        }
      } catch(e) { /* ignore — proceed to add */ }
    }

    doAddPatient(d);
  };

  const updateTeeth = (patientId, newTeeth, newAttachments, newHistory) => {
    setPatients(prev => prev.map(p => {
      if (p.id !== patientId) return p;
      const updated = {...p};
      if (newTeeth       !== undefined && newTeeth       !== null) updated.teeth       = newTeeth;
      if (newAttachments !== undefined && newAttachments !== null) updated.attachments = newAttachments;
      if (newHistory     !== undefined && newHistory     !== null) updated.history     = newHistory;
      return updated;
    }));
    // Keep the open profile view in sync so UI reflects immediately
    if (view && view.id === patientId) {
      setView(prev => {
        if (!prev || prev.id !== patientId) return prev;
        const v = {...prev};
        if (newTeeth       !== undefined && newTeeth       !== null) v.teeth       = newTeeth;
        if (newAttachments !== undefined && newAttachments !== null) v.attachments = newAttachments;
        if (newHistory     !== undefined && newHistory     !== null) v.history     = newHistory;
        return v;
      });
    }
  };

  // Create appointment and payment records from scanned data for a given patient ID
  const createScannedRecords = (data, patientId) => {
    const pname = S(data.name).trim();
    // ── Appointment records ───────────────────────────────────────────────────
    if (setAppointments && Array.isArray(data._appointments) && data._appointments.length) {
      setAppointments(prev => {
        let updated = [...prev];
        data._appointments.forEach(appt => {
          // require at least a date OR a service to save the row
          if (!appt.date && !S(appt.service)) return;
          const newId = 'A' + String(Date.now() + Math.random() * 1000 | 0).slice(-7);
          updated = [...updated, {
            id: newId,
            patientId,
            patientName: pname,
            services: svcList(appt).length ? svcList(appt) : ['Dental Visit'],
            service: svcList(appt)[0] || 'Dental Visit',
            date: appt.date,
            time: S(appt.time) || '09:00',
            status: 'completed',
            notes: S(appt.notes) || '',
            fee: parseFloat(appt.fee) || 0,
            dentist: 'Dr. Arnold Colao',
            phone: S(data.phone) || '',
            email: S(data.email) || '',
            arrived: true,
          }];
        });
        return updated;
      });
    }
    // ── Payment records ───────────────────────────────────────────────────────
    if (setPayments && Array.isArray(data._payments) && data._payments.length) {
      setPayments(prev => {
        let updated = [...prev];
        data._payments.forEach(pay => {
          const debit  = parseFloat(pay.debit)  || 0;
          const credit = parseFloat(pay.credit) || 0;
          const amount = parseFloat(pay.amount) || credit || debit;
          // include the row as long as any monetary value is present OR a service is chosen
          if (!amount && !S(pay.service)) return;
          const newId = 'PAY' + String(Date.now() + Math.random() * 1000 | 0).slice(-7);
          updated = [...updated, {
            id: newId,
            patientId,
            patientName: pname,
            amount: amount || 0,
            method: S(pay.method) || 'Cash',
            services: svcList(pay).length ? svcList(pay) : ['Dental Visit'],
            service: svcList(pay)[0] || 'Dental Visit',
            date: S(pay.date) || localToday(),
            status: debit && !credit ? 'debit' : 'paid',
            ref: 'SCAN-' + newId,
            balance: parseFloat(pay.balance) || 0,
            note: S(pay.note) || '',
          }];
        });
        return updated;
      });
    }
  };

  return h('div',null,
    h('div',{className:'ph'},
      h('div',null,h('div',{className:'ptl'},'Patient Records'),h('div',{className:'psl'},'Profiles · Dental Chart · History')),
      h('div',{className:'ph-act'},
        h('button',{
          className:'btn bg2',
          onClick:()=>setShowScanner(true),
          title:'Scan a physical patient record card and extract data automatically'
        }, '📷 Scan Record Card'),
        h('button',{className:'btn bp',onClick:()=>{setEdit(null);setScanPrefill(null);setModal(true);}},h(Svg,{d:IC.plus,size:14}),' New Patient')
      )
    ),
    h('div',{className:'tsr',style:{width:'100%',maxWidth:320,marginBottom:14}},h(Svg,{d:IC.search,size:13,color:'var(--lt)'}),h('input',{placeholder:'Search patients…',value:search,onChange:e=>setSearch(e.target.value)})),
    h('div',{className:'card dt'},h('div',{className:'tw'},h('table',null,
      h('thead',null,h('tr',null,['','Name','Phone','Blood','Dental','Balance',''].map(c=>h('th',{key:c},c)))),
      h('tbody',null,filtered.length===0?h('tr',null,h('td',{colSpan:7},h('div',{className:'empty'},'No patients found'))):
        pagedPatients.map(p=>{
          const issues = Object.values(p.teeth||{}).filter(v=>v&&v!=='healthy').length;
          return h('tr',{key:p.id},
            h('td',null,h(PatientPhoto,{patient:p,size:36,syncUrl:syncUrl})),
            h('td',null,h('strong',null,p.name),h('div',{style:{fontSize:11,color:'var(--lt)'}},p.id+(p.email?' · '+p.email:''))),
            h('td',null,p.phone),
            h('td',null,h('span',{className:'tag',style:{background:'#f0e8ff',color:'#7c3aed'}},p.bloodType)),
            h('td',null,issues>0?h('span',{className:'tag',style:{background:'#fdeaea',color:'#e05252'}},'⚠ '+issues+' issue'+(issues>1?'s':'')):h('span',{className:'tag',style:{background:'#e6f7f3',color:'#1a8a6a'}},'✓ Healthy')),
            h('td',{style:{color:p.balance>0?'var(--re)':'var(--gr)',fontWeight:600}},p.balance>0?'₱'+p$(p.balance):'Settled'),
            h('td',null,h('div',{className:'gap8'},
              h('button',{className:'btn bgh bsm',onClick:()=>setView(p)},h(Svg,{d:IC.eye,size:13})),
              h('button',{className:'btn bgh bsm',onClick:()=>{setEdit(p);setModal(true);}},h(Svg,{d:IC.edit,size:13}))
            ))
          );
        })
      )
    )),h(PatientsPager)),
    h('div',{className:'ml'},
      filtered.length===0&&h('div',{className:'empty'},'No patients found'),
      pagedPatients.map(p=>{
        const issues = Object.values(p.teeth||{}).filter(v=>v&&v!=='healthy').length;
        return h('div',{key:p.id,className:'mc'},
          h('div',{className:'mc-top'},
            h('div',{style:{display:'flex',alignItems:'center',gap:10,flex:1,minWidth:0}},
              h(PatientPhoto,{patient:p,size:40,syncUrl:syncUrl}),
              h('div',{style:{minWidth:0}},
                h('div',{className:'mc-nm'},p.name),
                h('div',{className:'mc-sb'},p.id+' · '+p.phone)
              )
            ),
            h('span',{className:'tag',style:{background:'#f0e8ff',color:'#7c3aed'}},p.bloodType)
          ),
          h('div',{className:'mc-row'},h('span',{className:'mc-lbl'},'Dental'),h('span',{className:'mc-val'},issues>0?'⚠ '+issues+' issue'+(issues>1?'s':''):'✓ Healthy')),
          h('div',{className:'mc-row'},h('span',{className:'mc-lbl'},'Balance'),h('span',{className:'mc-val',style:{color:p.balance>0?'var(--re)':'var(--gr)',fontWeight:600}},p.balance>0?'₱'+p$(p.balance):'Settled')),
          h('div',{className:'mc-act'},
            h('button',{className:'btn bgh bsm',style:{flex:1},onClick:()=>setView(p)},'Profile'),
            h('button',{className:'btn bs bsm',style:{flex:1},onClick:()=>{setEdit(p);setModal(true);}},'Edit')
          )
        );
      })
    ),
    modal&&h(PatForm,{
      patient: scanPrefill ? null : edit,        // if from scan, always a new patient
      prefillData: scanPrefill,                  // pre-filled fields from OCR
      onClose:()=>{setModal(false);setEdit(null);setScanPrefill(null);},
      onSave:save,
      syncUrl,
      addToast,
      onPhotoUploaded:(patientId, fileId, photoDataUrl)=>{
        setPatients(prev=>prev.map(p=>{
          if(p.id!==patientId) return p;
          return {...p, photoFileId:fileId, ...(photoDataUrl?{photoDataUrl}:{})};
        }));
        console.log('[Photo] ✅ State updated — id:',patientId,'fileId:',fileId);
      }
    }),
    // OCR Record Card Scanner modal
    showScanner && h(RecordCardScanner, {
      onClose: () => setShowScanner(false),
      onExtracted: (data) => {
        setShowScanner(false);
        setScanPrefill(data);
        setEdit(null);
        setModal(true);
        // appointments + payments are created in doAddPatient/doUpdatePatient with the real final ID
        addToast('✅ Data extracted! Review and save the patient record.', 'success');
      },
      onBatchExtracted: (dataList) => {
        setShowScanner(false);
        let added = 0;
        setPatients(prev => {
          let updated = [...prev];
          dataList.forEach(d => {
            const dup = findExistingPatient(updated, d);
            if (dup) {
              createScannedRecords(d, dup.id);
              return;
            }
            const newId = 'P' + String(Date.now() + added).slice(-6);
            d._pendingId = newId;
            updated = [{balance:0, lastVisit:'—', teeth:{}, ...d, id: newId}, ...updated];
            createScannedRecords(d, newId);
            added++;
          });
          return updated;
        });
        addToast('✅ ' + dataList.length + ' patient record(s) added from scan!', 'success');
      }
    }),
    dupState && h(DuplicateModal, {table:'patients', existing:dupState.existing, onUpdate:dupState.onUpdate, onCancel:dupState.onCancel}),
    view&&h(PatProfile,{patient:view,appts:appointments.filter(a=>a.patientId===view.id),pays:payments.filter(p=>p.patientId===view.id),onClose:()=>setView(null),onUpdateTeeth:updateTeeth,addToast,syncUrl})
  );
}

