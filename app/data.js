
// ─── DATA ───────────────────────────────────────────────────────────────────
const INIT_P=[
  {id:'P001',name:'Maria Santos',dob:'1985-03-12',phone:'09171234567',email:'maria@email.com',address:'123 Rizal St, Iligan City',occupation:'Teacher',sex:'Female',maritalStatus:'Married',bloodType:'O+',allergies:'Penicillin',lastVisit:'2025-12-10',balance:2500,teeth:{18:'cavity',26:'filling',36:'crown',46:'missing'},photoFileId:''},
  {id:'P002',name:'Juan dela Cruz',dob:'1990-07-22',phone:'09281234567',email:'juan@email.com',address:'456 Bonifacio Ave, Iligan City',bloodType:'A+',allergies:'None',lastVisit:'2026-01-15',balance:0,teeth:{16:'root_canal',24:'cavity'},photoFileId:''},
  {id:'P003',name:'Ana Reyes',dob:'1995-05-18',phone:'09351234567',email:'ana@email.com',address:'789 Mabini St, Iligan City',bloodType:'B+',allergies:'None',lastVisit:'2026-02-20',balance:0,teeth:{},photoFileId:''},
];

// Today's date for demo - appointments on today are kiosk-eligible
const todayStr = localToday();

const INIT_A=[
  {id:'A001',patientId:'P001',patientName:'Maria Santos',service:'Teeth Cleaning',date:todayStr,time:'09:00',status:'confirmed',notes:'Regular cleaning',fee:800,dentist:'Dr. Arnold Colao',phone:'09171234567',email:'maria@email.com',arrived:false},
  {id:'A002',patientId:'P002',patientName:'Juan dela Cruz',service:'Tooth Extraction',date:todayStr,time:'14:00',status:'confirmed',notes:'Lower molar',fee:1500,dentist:'Dr. Arnold Colao',phone:'09281234567',email:'juan@email.com',arrived:false},
  {id:'A003',patientId:'P003',patientName:'Ana Reyes',service:'Teeth Whitening',date:'2026-05-13',time:'10:00',status:'completed',notes:'',fee:3500,dentist:'Dr. Arnold Colao',phone:'09351234567',email:'ana@email.com',arrived:false},
  {id:'A004',patientId:'P001',patientName:'Maria Santos',service:'X-Ray',date:'2026-06-01',time:'11:00',status:'pending',notes:'',fee:600,dentist:'Dr. Arnold Colao',phone:'09171234567',email:'maria@email.com',arrived:false},
];
const INIT_PAY=[
  {id:'PAY001',patientId:'P001',patientName:'Maria Santos',amount:800,method:'Cash',service:'Teeth Cleaning',date:'2025-12-10',status:'paid',ref:'REF-12345'},
  {id:'PAY002',patientId:'P002',patientName:'Juan dela Cruz',amount:1500,method:'GCash',service:'Tooth Extraction',date:'2026-01-15',status:'paid',ref:'REF-67890'},
];
const INIT_N=[
  {id:'N001',type:'sms',recipient:'Maria Santos',phone:'09171234567',email:'maria@email.com',message:'Hi Maria! Your Teeth Cleaning at 9:00 AM is CONFIRMED.',sentAt:'2026-04-30 08:00',status:'sent'},
];

// ─── REMINDER CHANNELS ──────────────────────────────────────────────────────
const CHANNELS = [
  {id:'sms',      name:'SMS',           icon:'📱', color:'#10b981', desc:'Text message'},
  {id:'email',    name:'Email',         icon:'📧', color:'#3a7bd5', desc:'Email inbox'},
  {id:'whatsapp', name:'WhatsApp',      icon:'💬', color:'#25d366', desc:'WhatsApp message'},
  {id:'viber',    name:'Viber',         icon:'🟣', color:'#7360f2', desc:'Viber message'},
  {id:'messenger',name:'FB Messenger',  icon:'💙', color:'#0084ff', desc:'Facebook Messenger'},
];

// ─── REMINDER TYPES (preventive maintenance) ────────────────────────────────
const REMINDER_TYPES = {
  cleaning: {
    label: 'Teeth Cleaning',
    icon: '🦷',
    color: '#0a7c6e',
    interval: 180,  // every 6 months (industry standard for prophylaxis)
    desc: 'Routine dental prophylaxis',
    template: (p)=>'Hi '+p.name+'! 😊 It\'s been 6 months since your last cleaning. Time for your next dental prophylaxis to keep your smile healthy! 🦷\n\nBook your appointment at Simplified Dental Clinic.',
  },
  checkup: {
    label: 'Regular Checkup',
    icon: '🔍',
    color: '#3a7bd5',
    interval: 180,
    desc: 'Comprehensive oral examination',
    template: (p)=>'Hi '+p.name+'! Time for your routine dental checkup. Early detection saves teeth! 📅\n\nSchedule your visit at Simplified Dental Clinic.',
  },
  xray: {
    label: 'X-Ray Scan',
    icon: '📸',
    color: '#9333ea',
    interval: 365,  // annual
    desc: 'Annual diagnostic X-ray',
    template: (p)=>'Hi '+p.name+'! Your annual dental X-ray is due. This helps us detect hidden problems early. 📸\n\nBook your appointment at Simplified Dental Clinic.',
  },
  fluoride: {
    label: 'Fluoride Treatment',
    icon: '✨',
    color: '#06b6d4',
    interval: 180,
    desc: 'Preventive fluoride application',
    template: (p)=>'Hi '+p.name+'! Time for your fluoride treatment — it strengthens enamel and prevents cavities! ✨\n\nBook at Simplified Dental Clinic.',
  },
  ortho: {
    label: 'Braces Check',
    icon: '🪥',
    color: '#ec4899',
    interval: 30,  // monthly
    desc: 'Orthodontic adjustment',
    template: (p)=>'Hi '+p.name+'! Your monthly braces adjustment is due. Please schedule your visit. 🪥\n\nSimplified Dental Clinic',
  },
  perio: {
    label: 'Periodontal Care',
    icon: '🌿',
    color: '#10b981',
    interval: 90,  // every 3 months
    desc: 'Gum disease maintenance',
    template: (p)=>'Hi '+p.name+'! Time for your periodontal maintenance. Healthy gums = healthy teeth! 🌿\n\nSimplified Dental Clinic',
  },
  whitening: {
    label: 'Whitening Touch-Up',
    icon: '⭐',
    color: '#f59e0b',
    interval: 365,
    desc: 'Teeth whitening refresh',
    template: (p)=>'Hi '+p.name+'! Keep your smile bright — time for a whitening touch-up! ⭐\n\nSimplified Dental Clinic',
  },
  retainer: {
    label: 'Retainer Check',
    icon: '🦷',
    color: '#7c3aed',
    interval: 180,
    desc: 'Retainer fit & condition check',
    template: (p)=>'Hi '+p.name+'! Don\'t forget to have your retainer checked to maintain that perfect smile! 😁\n\nSimplified Dental Clinic',
  },
  custom: {
    label: 'Custom Reminder',
    icon: '⭐',
    color: '#6366f1',
    interval: 90,
    desc: 'Custom maintenance reminder',
    template: (p)=>'Hi '+p.name+'! Friendly reminder from Simplified Dental Clinic.',
  },
};

// ─── INITIAL REMINDERS DATA ─────────────────────────────────────────────────
// Date helpers for demo - lastSent within last X days based on interval
function daysAgo(n){const d=new Date();d.setDate(d.getDate()-n);return toLocalDateStr(d);}
function daysFromNow(n){const d=new Date();d.setDate(d.getDate()+n);return toLocalDateStr(d);}

const INIT_REMINDERS = [
  {id:'R001',patientId:'P001',patientName:'Maria Santos',type:'cleaning',channels:['sms','email'],frequency:180,lastSent:daysAgo(175),nextDue:daysFromNow(5),active:true,notes:''},
  {id:'R002',patientId:'P002',patientName:'Juan dela Cruz',type:'checkup',channels:['whatsapp','sms'],frequency:180,lastSent:daysAgo(160),nextDue:daysFromNow(20),active:true,notes:''},
  {id:'R003',patientId:'P001',patientName:'Maria Santos',type:'xray',channels:['email'],frequency:365,lastSent:daysAgo(360),nextDue:daysFromNow(5),active:true,notes:'Annual scan'},
  {id:'R004',patientId:'P003',patientName:'Ana Reyes',type:'ortho',channels:['viber','messenger'],frequency:30,lastSent:daysAgo(28),nextDue:daysFromNow(2),active:true,notes:'Braces wearing'},
];

// ─── REMINDER LOG (sent reminder history) ──────────────────────────────────
const INIT_REMINDER_LOG = [
  {id:'RL001',reminderId:'R001',patientId:'P001',patientName:'Maria Santos',type:'cleaning',channel:'sms',message:'Hi Maria! Time for your 6-month cleaning at Simplified Dental Clinic.',sentAt:daysAgo(175)+' 09:00',status:'sent'},
  {id:'RL002',reminderId:'R002',patientId:'P002',patientName:'Juan dela Cruz',type:'checkup',channel:'whatsapp',message:'Hi Juan! Time for your routine checkup.',sentAt:daysAgo(160)+' 10:00',status:'sent'},
];

// ── ICDS Professional Fees (Philippine Dental Association - Iligan City Dental Society)
// Updated: July 9, 2022 — agreed during 2nd General Monthly Meeting
// Grouped by category. Fee = minimum; many services have "up" pricing.
const SVCS = [
  // CONSULTATION
  {name:'Consultation',                              fee:500,   cat:'Consultation'},

  // PROPHYLAXIS
  {name:'Oral Prophylaxis / Scaling & Polishing',   fee:1500,  cat:'Prophylaxis'},
  {name:'Topical Fluoride Application',             fee:1500,  cat:'Prophylaxis'},

  // ROOT CANAL
  {name:'Root Canal — 1 Canal',                     fee:7000,  cat:'Root Canal'},
  {name:'Root Canal — 2 Canals',                    fee:10000, cat:'Root Canal'},
  {name:'Root Canal — 3 Canals',                    fee:15000, cat:'Root Canal'},

  // POST & CORE
  {name:'Post & Core — Prefabricated',              fee:2500,  cat:'Post & Core'},
  {name:'Post & Core — Fabricated',                 fee:4000,  cat:'Post & Core'},

  // SURGERY
  {name:'Normal Exodontia (Extraction)',            fee:1000,  cat:'Surgery'},
  {name:'Odontectomy',                              fee:10000, cat:'Surgery'},
  {name:'Gingivectomy',                             fee:4000,  cat:'Surgery'},
  {name:'Alveolectomy',                             fee:8000,  cat:'Surgery'},
  {name:'Apicoectomy',                              fee:8000,  cat:'Surgery'},

  // TOOTH RESTORATION / FILLING
  {name:'Temporary Filling',                        fee:1000,  cat:'Restoration'},
  {name:'Permanent Filling',                        fee:1500,  cat:'Restoration'},

  // VENEERS
  {name:'Direct Veneer',                            fee:7000,  cat:'Veneers'},
  {name:'Indirect Veneer',                          fee:20000, cat:'Veneers'},

  // CROWN & BRIDGE
  {name:'Crown — Acrylic',                          fee:6000,  cat:'Crown & Bridge'},
  {name:'Crown — Porcelain Fused to Metal',         fee:8000,  cat:'Crown & Bridge'},
  {name:'Crown — Porcelain Fused to Special Metals',fee:20000, cat:'Crown & Bridge'},
  {name:'Crown — All Porcelain',                    fee:20000, cat:'Crown & Bridge'},
  {name:'Crown — Tilite',                           fee:15000, cat:'Crown & Bridge'},
  {name:'Recementation',                            fee:1000,  cat:'Crown & Bridge'},

  // DENTURES
  {name:'Complete Denture — Acrylic (up & down)',   fee:20000, cat:'Dentures'},
  {name:'Complete Denture — Ivocap (up & down)',    fee:50000, cat:'Dentures'},
  {name:'RPD Acrylic — 1st Pontic',                 fee:2500,  cat:'Dentures'},
  {name:'RPD Acrylic — Additional Pontic',          fee:1000,  cat:'Dentures'},
  {name:'RPD — One Piece Metal Framework',          fee:12000, cat:'Dentures'},
  {name:'RPD Valplast/Flexite — Unilateral',        fee:15000, cat:'Dentures'},
  {name:'RPD Valplast/Flexite — Bilateral',         fee:20000, cat:'Dentures'},
  {name:'Denture Repair',                           fee:2500,  cat:'Dentures'},
  {name:'Denture Reline',                           fee:3500,  cat:'Dentures'},
  {name:'Denture Rebase',                           fee:5000,  cat:'Dentures'},
  {name:"Hawley's Retainer (up & down)",            fee:15000, cat:'Dentures'},

  // BLEACHING
  {name:'Bleaching',                                fee:15000, cat:'Bleaching'},

  // OTHER (commonly requested)
  {name:'X-Ray (Periapical)',                       fee:300,   cat:'Diagnostics'},
  {name:'X-Ray (Panoramic)',                        fee:800,   cat:'Diagnostics'},
  {name:'Orthodontic Braces — Consultation',        fee:500,   cat:'Orthodontics'},
  {name:'Orthodontic Braces — Monthly Adjustment',  fee:500,   cat:'Orthodontics'},
];

// Group services by category for the select dropdown
const SVCS_BY_CAT = SVCS.reduce((acc, sv) => {
  if (!acc[sv.cat]) acc[sv.cat] = [];
  acc[sv.cat].push(sv);
  return acc;
}, {});

// Finding #20: load custom services from localStorage if saved
function getActiveSvcs() {
  try {
    const raw = localStorage.getItem(LS_KEYS.SERVICES);
    if (raw) { const d = JSON.parse(raw); if (Array.isArray(d) && d.length) return d; }
  } catch(e){}
  return SVCS;
}
function getActiveSvcsByCat() {
  return getActiveSvcs().reduce((acc, sv) => {
    if (!acc[sv.cat]) acc[sv.cat] = [];
    acc[sv.cat].push(sv);
    return acc;
  }, {});
}
const svcList = r => (r && Array.isArray(r.services) && r.services.length) ? r.services : (r && S(r.service) ? [S(r.service)] : []);
const svcStr  = r => svcList(r).join(', ') || '—';
const BLOOD=['A+','A-','B+','B-','AB+','AB-','O+','O-'];
const METHODS=['Cash','GCash','Maya','Bank Transfer','Credit Card','Debit Card','PhilHealth'];
const TIMES = CONFIG.APPOINTMENT_TIMES;
const DENTISTS = CONFIG.DENTISTS;

// ─── ADMIN CREDENTIALS ─── See CONFIG.ADMIN_USERS above ─────────────────────
const KIOSK_EXIT_PIN = CONFIG.KIOSK_EXIT_PIN;

// User store — falls back to CONFIG.ADMIN_USERS when localStorage is empty.
// Each user: { id, username, name, role, password }
function getStoredUsers() {
  try {
    const raw = localStorage.getItem(LS_KEYS.USERS);
    if (raw) { const arr = JSON.parse(raw); if (Array.isArray(arr) && arr.length) return arr; }
  } catch {}
  // Seed from config defaults on first launch
  const seeded = CONFIG.ADMIN_USERS.map((u,i) => ({...u, id: 'u'+(i+1)}));
  localStorage.setItem(LS_KEYS.USERS, JSON.stringify(seeded));
  return seeded;
}
function saveStoredUsers(users) {
  localStorage.setItem(LS_KEYS.USERS, JSON.stringify(users));
}
// Alias used by login
const ADMIN_USERS = { find: (fn) => getStoredUsers().find(fn) };

// FDI tooth numbering (Fédération Dentaire Internationale)
const TEETH_UPPER = [18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28];
const TEETH_LOWER = [48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38];

function toothName(fdi){
  const pos = fdi % 10;
  const names = {1:'Central Incisor',2:'Lateral Incisor',3:'Canine',4:'1st Premolar',5:'2nd Premolar',6:'1st Molar',7:'2nd Molar',8:'3rd Molar (Wisdom)'};
  return names[pos] || 'Unknown';
}

function toothQuadrant(fdi){
  return {1:'Upper Right',2:'Upper Left',3:'Lower Left',4:'Lower Right'}[Math.floor(fdi/10)] || '';
}

// Classify tooth type: 'incisor' | 'canine' | 'premolar' | 'molar'
function toothType(fdi){
  const pos = fdi % 10;
  if (pos === 1 || pos === 2) return 'incisor';
  if (pos === 3) return 'canine';
  if (pos === 4 || pos === 5) return 'premolar';
  return 'molar';
}

// Is the tooth in the upper jaw?
function isUpperTooth(fdi){
  const q = Math.floor(fdi/10);
  return q === 1 || q === 2;
}

// Complete FDI metadata for a tooth
function toothMetadata(fdi){
  const pos = fdi % 10;
  const type = toothType(fdi);
  const upper = isUpperTooth(fdi);
  const meta = {
    fdi: fdi,
    name: toothName(fdi),
    quadrant: toothQuadrant(fdi),
    type: type,
    jaw: upper ? 'Maxilla (upper)' : 'Mandible (lower)',
    position: pos,
    side: (pos === 1) ? 'Centerline' : '',
  };

  // Type-specific anatomy
  if (type === 'incisor') {
    meta.function = 'Cutting / biting';
    meta.roots = 1;
    meta.cusps = 0;
    meta.surfaces = ['mesial','distal','labial','lingual','incisal'];
    meta.eruptionAge = upper ? (pos===1 ? '7-8 years' : '8-9 years') : (pos===1 ? '6-7 years' : '7-8 years');
  } else if (type === 'canine') {
    meta.function = 'Tearing / grasping';
    meta.roots = 1;
    meta.cusps = 1;
    meta.surfaces = ['mesial','distal','labial','lingual','incisal'];
    meta.eruptionAge = upper ? '11-12 years' : '9-10 years';
  } else if (type === 'premolar') {
    meta.function = 'Tearing + grinding';
    meta.roots = upper && pos === 4 ? 2 : 1;
    meta.cusps = 2;
    meta.surfaces = ['mesial','distal','buccal','lingual','occlusal'];
    meta.eruptionAge = pos === 4 ? '10-11 years' : '10-12 years';
  } else { // molar
    meta.function = 'Grinding / chewing';
    meta.roots = upper ? 3 : 2;
    meta.cusps = upper ? 4 : (pos === 6 ? 5 : 4);
    meta.surfaces = ['mesial','distal','buccal','lingual','occlusal'];
    if (pos === 6) meta.eruptionAge = '6-7 years';
    else if (pos === 7) meta.eruptionAge = '11-13 years';
    else meta.eruptionAge = '17-25 years (wisdom)';
  }
  return meta;
}
// FDI / international charting colour standard:
//   RED   = pathology / treatment required (caries, extraction indicated)
//   BLUE  = existing restoration / completed treatment (filling, crown, RCT, implant, bridge, veneer)
//   GREEN = preventive (sealant)
// Conditions follow the FDI / ISO 3950 dental chart colour standard:
//   RED   = pathology / treatment required   (caries, abscess, fracture, mobility)
//   BLUE  = existing restoration             (filling, composite, amalgam, crown, RCT, implant, bridge, veneer)
//   GREEN = preventive                       (sealant, fluoride, unerupted-watch)
//   GREY  = absent                           (extracted, missing)
// NOTE: existing keys (cavity, filling, crown, root_canal, missing, implant,
// bridge, veneer, sealant) are preserved so stored charts + PROCEDURE_CONDITION_MAP
// keep working — only colours were aligned to the FDI families and new keys added.
const CONDITIONS = {
  healthy:    {label:'Healthy',         color:'#ffffff', stroke:'#94a3b8', symbol:'',  group:'healthy',     desc:'No issues'},

  // ── RED — Pathology / treatment required ──
  cavity:     {label:'Caries / Cavity', color:'#e53935', stroke:'#b71c1c', symbol:'●', group:'pathology',   desc:'Decay/caries — treatment required'},
  abscess:    {label:'Abscess',         color:'#c62828', stroke:'#7f0000', symbol:'⊛', group:'pathology',   desc:'Periapical / periodontal abscess'},
  fracture:   {label:'Fracture',        color:'#ef5350', stroke:'#c62828', symbol:'⚡', group:'pathology',   desc:'Cracked / fractured tooth'},
  mobility:   {label:'Mobility',        color:'#e57373', stroke:'#c62828', symbol:'↔', group:'pathology',   desc:'Loose / mobile tooth'},

  // ── BLUE — Existing restorations ──
  filling:    {label:'Filling',         color:'#1976d2', stroke:'#1565c0', symbol:'■', group:'restoration', desc:'Existing restoration'},
  composite:  {label:'Composite',       color:'#1e88e5', stroke:'#1565c0', symbol:'▣', group:'restoration', desc:'Tooth-coloured composite'},
  amalgam:    {label:'Amalgam',         color:'#1565c0', stroke:'#0d47a1', symbol:'◼', group:'restoration', desc:'Amalgam restoration'},
  crown:      {label:'Crown',           color:'#0d47a1', stroke:'#08306b', symbol:'♛', group:'restoration', desc:'Crown placed'},
  root_canal: {label:'Root Canal',      color:'#283593', stroke:'#1a237e', symbol:'▲', group:'restoration', desc:'Endodontic treatment done'},
  implant:    {label:'Implant',         color:'#0277bd', stroke:'#01579b', symbol:'⬢', group:'restoration', desc:'Implant placed'},
  bridge:     {label:'Bridge',          color:'#1565c0', stroke:'#0d47a1', symbol:'═', group:'restoration', desc:'Part of bridge'},
  veneer:     {label:'Veneer',          color:'#42a5f5', stroke:'#1565c0', symbol:'◆', group:'restoration', desc:'Veneer applied'},

  // ── GREEN — Preventive ──
  sealant:    {label:'Sealant',         color:'#2e7d32', stroke:'#1b5e20', symbol:'◉', group:'preventive',  desc:'Preventive sealant'},
  fluoride:   {label:'Fluoride',        color:'#388e3c', stroke:'#1b5e20', symbol:'✚', group:'preventive',  desc:'Fluoride treatment'},
  unerupted:  {label:'Unerupted',       color:'#66bb6a', stroke:'#2e7d32', symbol:'◌', group:'preventive',  desc:'Unerupted / impacted — monitor'},

  // ── GREY — Absent ──
  extracted:  {label:'Extracted',       color:'#9e9e9e', stroke:'#616161', symbol:'✗', group:'absent',      desc:'Extracted'},
  missing:    {label:'Missing',         color:'#bdbdbd', stroke:'#757575', symbol:'✕', group:'absent',      desc:'Missing / congenitally absent'},
};

// Conditions whose symbol/text reads better in white on their dark swatch.
const CONDITION_DARK = new Set(['cavity','abscess','amalgam','crown','root_canal','implant','bridge','sealant','fluoride','unerupted','extracted','mobility','fracture']);
// Foreground colour for a condition swatch (white on dark families, ink on light).
function condFg(k){ return CONDITION_DARK.has(k) ? '#fff' : '#1a2332'; }
const CONDITION_KEYS = Object.keys(CONDITIONS);

// Maps clinical procedure/service names to dental chart conditions.
// Used when an appointment is marked Complete to auto-update the patient's chart.
const PROCEDURE_CONDITION_MAP = {
  // Pathology / pre-treatment findings
  'cavity':           'cavity',
  'caries':           'cavity',
  'decay':            'cavity',
  'diagnosis: cavity':'cavity',
  'abscess':          'abscess',
  'fracture':         'fracture',
  'cracked':          'fracture',
  'mobility':         'mobility',
  'loose':            'mobility',
  // Restorations
  'composite':        'composite',
  'amalgam':          'amalgam',
  'filling':          'filling',
  'restoration':      'filling',
  'tooth filling':    'filling',
  'dental filling':   'filling',
  // Crowns
  'crown':            'crown',
  'dental crown':     'crown',
  'ceramic crown':    'crown',
  'pfm crown':        'crown',
  'zirconia crown':   'crown',
  // Root canal
  'root canal':       'root_canal',
  'rct':              'root_canal',
  'endodontic':       'root_canal',
  'pulpotomy':        'root_canal',
  // Extractions
  'extraction':       'missing',
  'tooth extraction': 'missing',
  'surgical extraction':'missing',
  'exo':              'missing',
  // Implants
  'implant':          'implant',
  'dental implant':   'implant',
  // Bridge
  'bridge':           'bridge',
  'dental bridge':    'bridge',
  // Veneer
  'veneer':           'veneer',
  'dental veneer':    'veneer',
  'porcelain veneer': 'veneer',
  // Preventive
  'sealant':          'sealant',
  'fissure sealant':  'sealant',
  'pit and fissure':  'sealant',
  'fluoride':         'fluoride',
};

// Resolve a free-text procedure string to a CONDITIONS key (or null if no match)
function procedureToCondition(text){
  if (!text) return null;
  const t = text.toLowerCase().trim();
  if (CONDITIONS[t]) return t; // exact key
  for (const [k,v] of Object.entries(PROCEDURE_CONDITION_MAP)){
    if (t.includes(k)) return v;
  }
  return null;
}

// FDI numbers for the full arch (used in procedure tooth selector)
const ALL_FDI = [
  18,17,16,15,14,13,12,11, 21,22,23,24,25,26,27,28,
  48,47,46,45,44,43,42,41, 31,32,33,34,35,36,37,38
];

// ─── VOICE ENGINE ────────────────────────────────────────────────────────────
// Uses the Web Speech API (built into Chrome/Edge/Safari — no server or key needed).
// Voice Learning stores user corrections in localStorage so accuracy improves over time.

