// ─── Compression helper (downscale + JPEG quality) ─────────────────────
function compressImage(source, maxDim, quality) {
  maxDim  = maxDim  || 800;
  quality = quality || 0.82;
  return new Promise(resolve => {
    if (!source || typeof source !== 'string') { resolve(source); return; }
    try {
      const img = new Image();
      const t = setTimeout(() => { console.warn('[Photo] compress timeout'); resolve(source); }, 10000);
      img.onload = () => {
        clearTimeout(t);
        try {
          let w = img.naturalWidth||img.width||640, h = img.naturalHeight||img.height||480;
          if (w > maxDim || h > maxDim) {
            if (w >= h) { h=Math.round(h*maxDim/w); w=maxDim; }
            else        { w=Math.round(w*maxDim/h); h=maxDim; }
          }
          const c = document.createElement('canvas');
          c.width=Math.max(1,w); c.height=Math.max(1,h);
          const ctx = c.getContext('2d');
          if (!ctx) { resolve(source); return; }
          ctx.drawImage(img, 0, 0, c.width, c.height);
          const r = c.toDataURL('image/jpeg', quality);
          resolve(r && r.length>100 ? r : source);
        } catch(err) { console.warn('[Photo] compress err:',err.message); resolve(source); }
      };
      img.onerror = () => { clearTimeout(t); resolve(source); };
      img.src = source;
    } catch(err) { resolve(source); }
  });
}

// ─── Upload photo to Google Drive via Apps Script ──────────────────────
async function uploadPhotoToDrive(syncUrl, patientId, dataUrl, oldFileId) {
  if (!syncUrl)  throw new Error('No sync URL — configure in ☁️ Sync');
  if (!dataUrl)  throw new Error('No photo data');
  if (!S(dataUrl).startsWith('data:')) throw new Error('Invalid photo (expected data: URL)');
  console.log('[Photo] Uploading — patientId:',patientId,'size:',Math.round(dataUrl.length/1024)+'KB');
  let res;
  try {
    res = await fetch(syncUrl, {
      method:'POST', redirect:'follow',
      headers:{'Content-Type':'text/plain;charset=utf-8'},
      body: JSON.stringify({action:'uploadPhoto', patientId:S(patientId), dataUrl, oldFileId:oldFileId||''})
    });
  } catch(e) { throw new Error('Network error: '+e.message); }
  if (!res.ok) throw new Error('Server error '+res.status);
  const text = await res.text();
  let result;
  try { result = JSON.parse(text); } catch(e) {
    console.error('[Photo] Non-JSON response:',text.substring(0,200));
    throw new Error('Invalid response — redeploy Apps Script');
  }
  if (!result.ok) throw new Error(result.error||'Upload failed — check Apps Script permissions');
  if (!result.fileId) throw new Error('No fileId in response');
  console.log('[Photo] ✅ Uploaded. fileId:',result.fileId);
  return result.fileId;
}

// ─── Fetch photo from Drive (returns data URL) ─────────────────────────
/**
 * Fetch a patient photo from Google Drive via Apps Script.
 * Returns a base64 data URL, or null on any failure.
 * URL: GET syncUrl?action=getPhoto&fileId=DRIVE_FILE_ID
 */
async function fetchPhotoFromDrive(syncUrl, fileId) {
  if (!syncUrl || !fileId || typeof fileId !== 'string' || fileId.length < 5) return null;
  try {
    const sep = syncUrl.includes('?') ? '&' : '?';
    const url = syncUrl + sep + 'action=getPhoto&fileId=' + encodeURIComponent(fileId);
    const res = await fetch(url);
    if (!res.ok) return null;
    const text = await res.text();
    let result;
    try { result = JSON.parse(text); } catch(e) {
      console.warn('[Photo] getPhoto returned non-JSON:', text.substring(0, 100));
      return null;
    }
    if (!result.ok) {
      console.warn('[Photo] getPhoto error:', result.error);
      return null;
    }
    return result.dataUrl || null;
  } catch (err) {
    console.warn('[Photo] fetchPhotoFromDrive failed:', err.message);
    return null;
  }
}

// ─── The capture/upload widget shown inside PatForm ────────────────────
/**
 * PhotoCaptureWidget — camera capture + file upload.
 * ONLY calls onPhotoChange when user explicitly picks a new photo or removes.
 * Does NOT auto-call onPhotoChange just to display existing Drive photos.
 * Existing Drive photo display is handled by PatForm's existingPhotoUrl state.
 */
function PhotoCaptureWidget({patient, photoDataUrl, onPhotoChange, syncUrl, addToast}){
  const fileInputRef = useRef(null);
  const videoRef     = useRef(null);
  const streamRef    = useRef(null);
  const [showLiveCam,  setShowLiveCam]  = useState(false);
  const [showChooser,  setShowChooser]  = useState(false);
  const [facingMode,   setFacingMode]   = useState('environment');
  const [busy,         setBusy]         = useState(false);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setShowLiveCam(false);
  };

  const startCamera = async (mode) => {
    const fm = mode || facingMode;
    setShowChooser(false);
    setShowLiveCam(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: fm }, width: {ideal:1280}, height: {ideal:720} }
      });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().catch(()=>{}); }
    } catch(e) {
      addToast && addToast('Camera: ' + (e.message||'Access denied'), 'error');
      setShowLiveCam(false);
    }
  };

  const flipCamera = () => {
    const nm = facingMode==='user' ? 'environment' : 'user';
    setFacingMode(nm); stopCamera(); setTimeout(()=>startCamera(nm), 200);
  };

  const capturePhoto = async () => {
    if (!videoRef.current || busy) return;
    setBusy(true);
    try {
      const v = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = v.videoWidth||640; canvas.height = v.videoHeight||480;
      canvas.getContext('2d').drawImage(v, 0, 0, canvas.width, canvas.height);
      const compressed = await compressImage(canvas.toDataURL('image/jpeg', 0.92), 800, 0.82);
      stopCamera();
      onPhotoChange(compressed);
    } catch(e) { addToast && addToast('Capture failed: '+(e.message||''), 'error'); }
    setBusy(false);
  };

  const handleFile = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setShowChooser(false); setBusy(true);
    readFileAsDataUrl(file)
      .then(async dataUrl => {
        try {
          const compressed = await compressImage(dataUrl, 800, 0.82);
          onPhotoChange(compressed);
        } catch(err) { addToast && addToast('Image error: '+err.message, 'error'); }
        setBusy(false);
      })
      .catch(() => { addToast && addToast('File read failed','error'); setBusy(false); });
    e.target.value = '';
  };

  const removePhoto = () => {
    confirmDelete('Remove this patient photo?', () => onPhotoChange('REMOVE'));
  };

  useEffect(() => () => stopCamera(), []);

  const hasPhoto = photoDataUrl && photoDataUrl !== 'REMOVE' && S(photoDataUrl).startsWith('data:');

  return h('div', {className:'photo-widget-body'},
    h('input', {ref:fileInputRef, type:'file', accept:'image/*,image/heic', style:{display:'none'}, onChange:handleFile}),
    h('div', {className:'photo-preview'},
      hasPhoto
        ? h('img', {src:photoDataUrl, alt:'Patient', className:'photo-img', onError:e=>{e.target.style.display='none';}})
        : h('div', {className:'photo-empty'},
            h('div', {style:{fontSize:36}}, '📷'),
            h('div', {style:{fontSize:12,color:'var(--md)',marginTop:6}}, busy?'⏳ Processing…':'No photo yet')
          )
    ),
    h('div', {className:'photo-actions'},
      h('button', {type:'button', className:'btn bp bsm', onClick:()=>setShowChooser(true), disabled:busy},
        busy ? '⏳' : (hasPhoto ? '📸 Change Photo' : '📸 Add Photo')),
      hasPhoto && h('button', {type:'button', className:'btn bd2 bsm', onClick:removePhoto, disabled:busy}, '✕ Remove')
    ),
    showChooser && h('div', {className:'photo-chooser-ov', onClick:()=>setShowChooser(false)},
      h('div', {className:'photo-chooser-modal', onClick:e=>e.stopPropagation()},
        h('div', {className:'photo-chooser-header'}, 'Add Patient Photo'),
        h('div', {className:'photo-chooser-body'},
          h('button', {type:'button', className:'photo-chooser-btn', onClick:()=>startCamera('environment')},
            h('span', {style:{fontSize:28}}, '📷'), h('span', null, 'Take Photo')),
          h('button', {type:'button', className:'photo-chooser-btn', onClick:()=>{setShowChooser(false); fileInputRef.current&&fileInputRef.current.click();}},
            h('span', {style:{fontSize:28}}, '📁'), h('span', null, 'Upload File'))
        )
      )
    ),
    showLiveCam && h('div', {className:'photo-cam-wrap'},
      h('video', {ref:videoRef, autoPlay:true, playsInline:true, muted:true, className:'photo-cam-video'}),
      h('div', {className:'photo-cam-btns'},
        h('button', {type:'button', className:'btn bgh', onClick:stopCamera}, '✕ Cancel'),
        h('button', {type:'button', className:'btn bp', onClick:capturePhoto, disabled:busy}, busy?'⏳':'📸 Capture'),
        h('button', {type:'button', className:'btn bg2', onClick:flipCamera, title:'Flip camera'}, '🔄')
      )
    )
  );
}


