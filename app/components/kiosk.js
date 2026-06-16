function LoginScreen({onAuth,onPickKiosk,onPublicBooking}){
  const [mode,setMode]=useState('choose'); // 'choose' | 'admin'
  const [username,setUsername]=useState('');
  const [password,setPassword]=useState('');
  const [error,setError]=useState('');
  const [attempts,setAttempts]=useState(0);

  const submit=(e)=>{
    if(e&&e.preventDefault)e.preventDefault();
    if(_loginState.isLocked()){
      const secs=_loginState.lockSecondsRemaining();
      setError('Too many failed attempts. Try again in '+secs+' second'+(secs!==1?'s':'')+'.');
      return;
    }
    const user = ADMIN_USERS.find(u=>u.username===username.trim().toLowerCase()&&u.password===password);
    if(user){
      setError('');
      _loginState.recordSuccess();
      // Pass the plaintext password so App can derive the encryption key (Finding #3)
      onAuth(user, password);
    } else {
      const locked = _loginState.recordFailure();
      const remaining = CONFIG.LOGIN_MAX_ATTEMPTS - _loginState.attempts;
      if(locked){
        setError('Too many failed attempts. Locked for '+Math.ceil(CONFIG.LOGIN_LOCKOUT_MS/1000)+'s.');
      } else {
        setError('Invalid username or password. '+remaining+' attempt'+(remaining!==1?'s':'')+' remaining.');
      }
      setPassword('');
    }
  };

  const Logo = ()=>h('div',{className:'login-logo'},
    h(BrandLogo,{dark:false,width:220})
  );

  if(mode==='choose'){
    return h('div',{className:'login-wrap'},
      h('div',{className:'login-card'},
        h(Logo),
        h('div',{className:'login-title'},'Welcome'),
        h('div',{className:'login-desc'},'Please choose how you would like to continue'),
        h('div',{className:'login-choose'},
          h('button',{className:'login-mode-btn',onClick:()=>setMode('admin')},
            h('div',{className:'lmb-icon'},'🔐'),
            h('div',{className:'lmb-title'},'Admin / Staff'),
            h('div',{className:'lmb-desc'},'Login required')
          ),
          planHas('kioskMode')
            ? h('button',{className:'login-mode-btn',onClick:onPickKiosk},
                h('div',{className:'lmb-icon'},'🏥'),
                h('div',{className:'lmb-title'},'Kiosk Mode'),
                h('div',{className:'lmb-desc'},'Patient check-in')
              )
            : h('button',{className:'login-mode-btn',disabled:true,style:{opacity:.45,cursor:'not-allowed',position:'relative'}},
                h('div',{className:'lmb-icon'},'🏥'),
                h('div',{className:'lmb-title'},'Kiosk Mode ',h('span',{style:{fontSize:10,color:'#d4a017'}},'🔒')),
                h('div',{className:'lmb-desc'},'Professional plan required')
              )
        ),
        h('div',{style:{textAlign:'center',marginTop:18}},
          h('button',{
            style:{background:'none',border:'none',cursor:'pointer',color:'var(--md)',fontSize:12.5,fontFamily:'inherit',textDecoration:'underline',textUnderlineOffset:3},
            onClick:onPublicBooking
          },'📅 I just want to book an appointment')
        ),
        h('div',{className:'nexarch-badge',style:{marginTop:20}},
          h('span',null,'POWERED BY:'),
          h('img',{src:CYRABELL_LOGO,alt:'Cyrabell',className:'nexarch-logo-sm'}),
          h('div',{className:'badge-brand'},'CYRABELL'),
          h('div',{className:'badge-tagline'},'Systems Engineering Solution')
        )
      ),
      h(PatientChatbot,{existingAppointments:[],onBook:onPublicBooking})
    );
  }

  return h('div',{className:'login-wrap'},
    h('div',{className:'login-card'},
      h(Logo),
      h('div',{className:'login-title'},'🔐 Admin Login'),
      h('div',{className:'login-desc'},'Sign in to manage the clinic'),
      error&&h('div',{className:'login-err'},
        h('span',{style:{fontSize:14}},'⚠'),
        h('span',null,error)
      ),
      h('form',{onSubmit:submit},
        h(Field,{label:'Username'},h('input',{
          type:'text',value:username,onChange:e=>setUsername(e.target.value),
          placeholder:'admin',autoFocus:true,autoComplete:'username'
        })),
        h(Field,{label:'Password'},h('input',{
          type:'password',value:password,onChange:e=>setPassword(e.target.value),
          placeholder:'••••••••••',autoComplete:'current-password',
          onKeyDown:e=>{if(e.key==='Enter')submit(e);}
        })),
        h('button',{
          type:'submit',
          className:'btn bp',
          style:{width:'100%',marginTop:8,padding:'12px',fontSize:14},
          disabled:!username||!password
        },h(Svg,{d:IC.lock,size:14}),' Sign In')
      ),
      CONFIG.SHOW_DEMO_CREDENTIALS && h('div',{className:'login-info'},
        h('strong',null,'⚠ Dev Mode: see CONFIG.ADMIN_USERS')
      ),
      h('div',{className:'login-back'},
        h('button',{onClick:()=>{setMode('choose');setError('');setUsername('');setPassword('');}},'← Back')
      ),
      h('div',{className:'nexarch-badge',style:{marginTop:12}},
        h('span',null,'POWERED BY:'),
        h('img',{src:CYRABELL_LOGO,alt:'Cyrabell',className:'nexarch-logo-sm'})
      )
    )
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// KIOSK MODE — Patient self check-in
// ═══════════════════════════════════════════════════════════════════════════
// ── Kiosk Ad Slide Manager (stored in localStorage) ─────────────────────────
const ADS_KEY = 'cyrabell_kiosk_ads';
function getKioskAds(){ try{ return JSON.parse(localStorage.getItem(ADS_KEY)||'[]'); }catch(e){ return []; } }
function saveKioskAds(ads){ try{ localStorage.setItem(ADS_KEY,JSON.stringify(ads)); }catch(e){} }

// Resolves patient photo: inline dataUrl → Drive fetch → null
function KioskPatientPhoto({patient, syncUrl, className, fallback}){
  const inline = patient && S(patient.photoDataUrl).startsWith('data:') ? patient.photoDataUrl : null;
  const [url, setUrl] = useState(inline);

  useEffect(()=>{
    if(inline){ setUrl(inline); return; }
    if(!patient || !patient.photoFileId || !syncUrl){ setUrl(null); return; }
    const cache = window.__cyrabellPhotoCache = window.__cyrabellPhotoCache||{};
    if(cache[patient.photoFileId]){ setUrl(cache[patient.photoFileId]); return; }
    let live = true;
    fetchPhotoFromDrive(syncUrl, patient.photoFileId)
      .then(u=>{ if(live&&u){ cache[patient.photoFileId]=u; setUrl(u); } })
      .catch(()=>{});
    return ()=>{ live=false; };
  }, [patient && patient.id, patient && patient.photoFileId, inline]);

  if(url) return h('img',{src:url, className, alt:'Patient', onError:()=>setUrl(null)});
  return fallback||null;
}

// ── Kiosk YouTube helpers ─────────────────────────────────────────────────────
const KIOSK_YT_QUEUE_KEY='cyrabell_kiosk_yt_queue';
function getKioskYTQueue(){ try{ return JSON.parse(localStorage.getItem(KIOSK_YT_QUEUE_KEY)||'[]'); }catch(e){ return []; } }
function saveKioskYTQueue(q){ try{ localStorage.setItem(KIOSK_YT_QUEUE_KEY,JSON.stringify(q)); }catch(e){} }
function extractYTId(raw){
  if(!raw||!raw.trim()) return null;
  const s=raw.trim();
  const vidM=s.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|shorts\/|live\/|embed\/(?!videoseries)))([A-Za-z0-9_-]{11})/);
  if(vidM) return vidM[1];
  // bare 11-char ID
  if(/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  return null;
}
function extractYTPlaylist(raw){
  const m=(raw||'').match(/[?&]list=([A-Za-z0-9_-]+)/);
  return m?m[1]:null;
}
// Build a single embed URL that auto-plays and loops all queued videos
function buildQueueEmbedUrl(queue){
  if(!queue||!queue.length) return '';
  // Collect all video IDs in order
  const ids=queue.map(q=>extractYTId(q.url)).filter(Boolean);
  // Check if any entry is a playlist-only URL
  const firstPlaylist=queue.map(q=>extractYTPlaylist(q.url)).find(Boolean);
  if(ids.length===0&&firstPlaylist){
    return 'https://www.youtube-nocookie.com/embed/videoseries?list='+firstPlaylist+'&autoplay=1&mute=1&loop=1&rel=0';
  }
  if(ids.length===0) return '';
  // First ID is the video, rest go in playlist= (YouTube auto-advances + loops)
  const extra=ids.length>1?','+ids.slice(1).join(','):'';
  const listParam=firstPlaylist?'&list='+firstPlaylist:'&playlist='+ids.join(',');
  return 'https://www.youtube-nocookie.com/embed/'+ids[0]+'?autoplay=1&mute=1&loop=1'+listParam+'&rel=0&modestbranding=1';
}

// ── KioskInfoBar — weather + live news ticker + ads ──────────────────────────
const WX_CODES={0:'☀️',1:'🌤️',2:'⛅',3:'☁️',45:'🌫️',48:'🌫️',51:'🌦️',53:'🌦️',55:'🌧️',61:'🌧️',63:'🌧️',65:'🌧️',71:'🌨️',73:'🌨️',75:'❄️',80:'🌦️',81:'🌦️',82:'⛈️',95:'⛈️',99:'⛈️'};
const WX_DESC={0:'Clear Sky',1:'Mostly Clear',2:'Partly Cloudy',3:'Overcast',45:'Foggy',48:'Icy Fog',51:'Light Drizzle',53:'Drizzle',55:'Heavy Drizzle',61:'Light Rain',63:'Rain',65:'Heavy Rain',71:'Light Snow',73:'Snow',75:'Heavy Snow',80:'Showers',81:'Showers',82:'Heavy Showers',95:'Thunderstorm',99:'Thunderstorm'};
const DOW=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const RSS_FEEDS=[
  {url:'https://feeds.bbci.co.uk/news/world/rss.xml',label:'WORLD',cat:'int'},
  {url:'https://feeds.bbci.co.uk/news/asia/rss.xml',label:'ASIA',cat:'int'},
  {url:'https://rss.dw.com/rdf/rss-en-all',label:'WORLD',cat:'int'},
  {url:'https://feeds.bbci.co.uk/news/health/rss.xml',label:'HEALTH',cat:'int'},
];
// Try multiple CORS proxies in order; return text or null
async function proxyFetch(url){
  const proxies=[
    async u=>{ const r=await fetch('https://corsproxy.io/?'+u); if(!r.ok) throw 0; return r.text(); },
    async u=>{ const r=await fetch('https://api.allorigins.win/get?url='+encodeURIComponent(u)); if(!r.ok) throw 0; const j=await r.json(); return j.contents||''; },
    async u=>{ const r=await fetch('https://api.codetabs.com/v1/proxy?quest='+encodeURIComponent(u)); if(!r.ok) throw 0; return r.text(); },
  ];
  for(const p of proxies){ try{ const t=await p(url); if(t) return t; }catch(e){} }
  return null;
}
async function fetchRSSFeed(feed){
  try{
    const txt=await proxyFetch(feed.url);
    if(!txt) return [];
    const xml=new DOMParser().parseFromString(txt,'text/xml');
    return [...xml.querySelectorAll('item')].slice(0,8).map(it=>{
      const raw=it.querySelector('title')?.textContent||'';
      return {title:raw.replace(/<!\[CDATA\[|\]\]>/g,'').replace(/<[^>]+>/g,'').trim(),cat:feed.cat,label:feed.label};
    }).filter(x=>x.title);
  }catch(e){ return []; }
}

function KioskInfoBar({ads}){
  const [wx,setWx]=useState(null);
  const [forecast,setForecast]=useState([]);
  const [newsItems,setNewsItems]=useState([]);
  const [adSlide,setAdSlide]=useState(0);
  const [marqueeKey,setMarqueeKey]=useState(0);

  // Fetch weather from Open-Meteo (no key required) for Iligan City
  useEffect(()=>{
    fetch('https://api.open-meteo.com/v1/forecast?latitude=8.228&longitude=124.245&current=temperature_2m,weathercode,windspeed_10m,relativehumidity_2m&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=Asia%2FManila&forecast_days=4')
      .then(r=>r.json())
      .then(d=>{
        if(!d||!d.current) return;
        setWx({temp:Math.round(d.current.temperature_2m),code:d.current.weathercode,humidity:d.current.relativehumidity_2m,wind:Math.round(d.current.windspeed_10m)});
        if(d.daily){
          const days=d.daily.time.slice(1,4).map((t,i)=>({
            name:DOW[new Date(t+'T00:00').getDay()],
            code:d.daily.weathercode[i+1],
            max:Math.round(d.daily.temperature_2m_max[i+1]),
            min:Math.round(d.daily.temperature_2m_min[i+1]),
          }));
          setForecast(days);
        }
      }).catch(()=>{});
  },[]);

  // Fetch news from RSS feeds via allorigins proxy
  useEffect(()=>{
    const loadNews=async()=>{
      const results=await Promise.all(RSS_FEEDS.map(fetchRSSFeed));
      const all=results.flat();
      if(all.length) setNewsItems(shuffleArr(all));
      setMarqueeKey(k=>k+1);
    };
    loadNews();
    const iv=setInterval(loadNews,600000);
    return ()=>clearInterval(iv);
  },[]);

  // Ad rotation
  useEffect(()=>{
    if(!ads||ads.length<2) return;
    const t=setInterval(()=>setAdSlide(i=>(i+1)%ads.length),8000);
    return ()=>clearInterval(t);
  },[ads&&ads.length]);

  const icon=wx?WX_CODES[wx.code]||'🌡️':'—';
  const desc=wx?WX_DESC[wx.code]||'':'Loading…';

  // Build marquee chips: news + ad messages interleaved
  const chips=[...newsItems];
  if(ads&&ads.length) ads.forEach((a,i)=>{ chips.splice(Math.floor((i+1)*chips.length/(ads.length+1)),0,{title:a.text,cat:'ad',label:'AD'}); });
  // Duplicate for seamless loop
  const allChips=[...chips,...chips];

  const marqueeSpeed=Math.max(40,allChips.length*4); // seconds

  return h('div',{className:'kiosk-info-bar'},
    // Weather current
    h('div',{className:'kib-weather'},
      h('div',{className:'kib-wx-icon'},icon),
      h('div',{className:'kib-wx-info'},
        h('div',{className:'kib-wx-temp'},wx?wx.temp+'°C':'--°'),
        h('div',{className:'kib-wx-desc'},desc),
        h('div',{className:'kib-wx-loc'},'📍 Iligan City, PH'),
        wx && h('div',{className:'kib-wx-loc'},`💧${wx.humidity}%  💨${wx.wind}km/h`)
      )
    ),
    // 3-day forecast
    forecast.length>0 && h('div',{className:'kib-wx-forecast'},
      forecast.map((d,i)=>h('div',{key:i,className:'kib-wx-day'},
        h('div',{className:'kib-wx-dname'},d.name),
        h('div',{className:'kib-wx-dico'},WX_CODES[d.code]||'🌡️'),
        h('div',{className:'kib-wx-dtemp'},d.max+'°/'+d.min+'°')
      ))
    ),
    // Scrolling marquee
    h('div',{className:'kib-marquee-wrap'},
      h('div',{className:'kib-marquee-label'},
        h('span',{className:'kib-ticker-cat ph'},'📰 NEWS'),
        h('span',{className:'kib-ticker-label-text'},'PH & WORLD')
      ),
      h('div',{className:'kib-marquee-row'},
        chips.length>0
          ? h('div',{key:marqueeKey,className:'kib-marquee-inner',style:{animationDuration:marqueeSpeed+'s'}},
              allChips.map((item,i)=>h('span',{key:i,className:'kib-news-chip'},
                h('span',{className:'tag '+(item.cat||'ph')},item.label||'PH'),
                item.title
              ))
            )
          : h('span',{style:{paddingLeft:136,fontSize:12,color:'rgba(255,255,255,.35)'}},
              'Fetching latest news…'
            )
      )
    )
  );
}
function shuffleArr(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a;}

function KioskMode({appointments,setAppointments,onCheckIn,onExit,addToast,patients,setPatients,syncUrl}){
  const [step,setStep]=useState('queue'); // 'queue'|'checkin'|'walkin'|'install'|'confirm'|'success'
  const [search,setSearch]=useState('');
  const [picked,setPicked]=useState(null);
  const [clock,setClock]=useState(new Date());
  const [exitPin,setExitPin]=useState('');
  const [showExit,setShowExit]=useState(false);
  const [ads,setAds]=useState(getKioskAds);
  const [showAdMgr,setShowAdMgr]=useState(false);
  const [newAdText,setNewAdText]=useState('');
  const [ytQueue,setYtQueue]=useState(getKioskYTQueue);
  const [ytQueueInput,setYtQueueInput]=useState('');
  const [walkinMode,setWalkinMode]=useState('scheduled'); // 'scheduled'|'standby'
  const [walkinInfo,setWalkinInfo]=useState({name:'',phone:'',service:'',date:localToday(),time:''});
  const [walkinDone,setWalkinDone]=useState(null);
  const [walkinErr,setWalkinErr]=useState('');
  const wi=(k,v)=>setWalkinInfo(x=>({...x,[k]:v}));
  const [kioskOs,setKioskOs]=useState('android');
  const kioskQrRef=useRef(null);
  const kioskQrMainRef=useRef(null);

  useEffect(()=>{ const t=setInterval(()=>setClock(new Date()),30000); return ()=>clearInterval(t); },[]);

  // Real-time queue refresh: listen for localStorage changes from other tabs,
  // and poll every 15s to catch same-tab updates (e.g. booking confirmations)
  useEffect(()=>{
    const reload=()=>{
      try{
        const s=localStorage.getItem('cyrabell_v2_appointments');
        if(s){const d=JSON.parse(s);if(Array.isArray(d))setAppointments(d);}
      }catch(e){}
    };
    window.addEventListener('storage',reload);
    const t=setInterval(reload,15000);
    return ()=>{ window.removeEventListener('storage',reload); clearInterval(t); };
  },[]);

  // Draw QR on sidebar install canvas
  useEffect(()=>{
    if(kioskQrRef.current && window._drawQROnCanvas)
      window._drawQROnCanvas('https://resitch-source.github.io/CYRABELL_DentalMS/',kioskQrRef.current,80);
  },[kioskQrRef.current]);

  // Draw QR on main install tab canvas
  useEffect(()=>{
    if(kioskQrMainRef.current && window._drawQROnCanvas)
      window._drawQROnCanvas('https://resitch-source.github.io/CYRABELL_DentalMS/',kioskQrMainRef.current,200);
  },[kioskQrMainRef.current, step]);

  // Auto-update Now Serving / Completed based on time every minute
  useEffect(()=>{
    if(!setAppointments) return;
    const tick=()=>{
      const now=new Date();
      const today2=localToday();
      setAppointments(prev=>{
        let changed=false;
        const next=prev.map(a=>{
          if(a.date!==today2||a.appointmentType==='standby') return a;
          if(!(a.arrived||a.checkedIn)) return a;
          if(a.status==='cancelled'||a.status==='completed') return a;
          const [hh,mm]=(a.time||'00:00').split(':').map(Number);
          const slotMs=new Date(now.getFullYear(),now.getMonth(),now.getDate(),hh,mm).getTime();
          const durMin=SERVICE_DURATIONS[a.service]||DEFAULT_SLOT_MIN||30;
          const endMs=slotMs+durMin*60000;
          let upd={...a};
          // Auto Now Serving: checked in + time has arrived
          if(!a.nowServing && now.getTime()>=slotMs){ upd.nowServing=true; changed=true; }
          // Auto Completed: now serving + duration elapsed
          if(a.nowServing && now.getTime()>=endMs && a.status!=='completed'){
            upd.status='completed'; upd.nowServing=false; changed=true;
            syncOneRecord('appointments',upd,syncUrl);
          }
          return upd;
        });
        return changed?next:prev;
      });
    };
    tick(); // run immediately on mount
    const t=setInterval(tick,60000);
    return ()=>clearInterval(t);
  },[]);

  // Manual status helpers
  const setNowServing=(a)=>{
    const upd={...a,nowServing:true,arrived:true,checkedIn:true,checkedInAt:a.checkedInAt||new Date().toISOString()};
    setAppointments(prev=>prev.map(x=>x.id===a.id?upd:x));
    syncOneRecord('appointments',upd,syncUrl);
    addToast(a.patientName+' — Now Serving','success');
  };
  const setDone=(a)=>{
    const upd={...a,nowServing:false,status:'completed'};
    setAppointments(prev=>prev.map(x=>x.id===a.id?upd:x));
    syncOneRecord('appointments',upd,syncUrl);
    addToast(a.patientName+' — Completed','success');
  };

  const today=localToday();
  const todayAppts=appointments.filter(a=>a.date===today&&a.status!=='cancelled').sort((a,b)=>{
    if(a.appointmentType==='standby'&&b.appointmentType!=='standby')return 1;
    if(a.appointmentType!=='standby'&&b.appointmentType==='standby')return -1;
    return (a.time||'').localeCompare(b.time||'');
  });
  const filtered=todayAppts.filter(a=>!search||S(a.patientName).toLowerCase().includes(search.toLowerCase()));

  const handlePick=(appt)=>{ if(appt.arrived){addToast('Already checked in!','info');return;} setPicked(appt);setStep('confirm'); };
  const handleConfirm=()=>{
    onCheckIn(picked.id);
    // Also set checkedIn flag
    if(setAppointments){
      setAppointments(prev=>prev.map(a=>a.id===picked.id?{...a,arrived:true,checkedIn:true,checkedInAt:new Date().toISOString()}:a));
    }
    setStep('success');
    setTimeout(()=>{ setPicked(null);setStep('queue');setSearch(''); },7000);
  };
  const tryExit=()=>{ if(exitPin===KIOSK_EXIT_PIN){onExit();}else{setExitPin('');addToast('Wrong PIN','error');} };
  const initials=(name)=>name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const formatTime=(d)=>d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',hour12:true});

  const submitWalkin=()=>{
    setWalkinErr('');
    if(!walkinInfo.name.trim()||!walkinInfo.phone.trim()){setWalkinErr('Name and phone are required.');return;}
    if(!walkinInfo.service){setWalkinErr('Please select a service.');return;}
    if(walkinMode==='scheduled'&&!walkinInfo.time){setWalkinErr('Please select a time slot.');return;}
    const todayStandby=(appointments||[]).filter(a=>a.date===today&&a.appointmentType==='standby'&&a.status!=='cancelled');
    if(walkinMode==='standby'&&todayStandby.length>=4){setWalkinErr('Standby queue is full today (4/4). Please choose a specific time slot.');return;}
    const sv=getActiveSvcs().find(x=>x.name===walkinInfo.service);
    const qNum=walkinMode==='standby'?todayStandby.length+1:null;
    const nameClean=walkinInfo.name.trim();
    const phoneClean=walkinInfo.phone.trim();
    // Find existing patient by phone or name to avoid duplicates
    const existingPat=(patients||[]).find(p=>
      (p.phone&&p.phone===phoneClean)||(p.name&&p.name.toLowerCase()===nameClean.toLowerCase())
    );
    let patientId;
    if(existingPat){
      patientId=existingPat.id;
    } else {
      patientId='P'+Date.now().toString().slice(-6);
      const newPat={
        id:patientId,name:nameClean,phone:phoneClean,email:'',
        dob:'',sex:'',bloodType:'',allergies:'',occupation:'',maritalStatus:'',
        teeth:{},attachments:[],history:[],lastVisit:localToday(),photoDataUrl:'',photoFileId:'',
      };
      if(setPatients) setPatients(prev=>[newPat,...prev]);
      try{
        const stored=JSON.parse(localStorage.getItem('cyrabell_v2_patients')||'[]');
        localStorage.setItem('cyrabell_v2_patients',JSON.stringify([newPat,...stored]));
      }catch(e){}
    }
    const appt={
      id:'A'+uid(),patientId,patientName:nameClean,
      phone:phoneClean,email:'',
      service:walkinInfo.service,services:[walkinInfo.service],fee:sv?sv.fee:0,
      date:walkinInfo.date,time:walkinMode==='scheduled'?walkinInfo.time:'',
      dentist:'Dr. Arnold Colao',notes:'Walk-in booking via Kiosk',
      status:'confirmed',arrived:true,checkedIn:true,checkedInAt:new Date().toISOString(),
      appointmentType:walkinMode,queueNumber:qNum,noShow:false,attachments:[],
    };
    if(setAppointments) setAppointments(prev=>[appt,...prev]);
    if(syncUrl) syncOneRecord('appointments',appt,syncUrl);
    sendApptNotif('confirmation',appt,syncUrl,null);
    setWalkinDone(appt);
  };

  // Add/remove ads
  const addAd=()=>{
    if(!newAdText.trim())return;
    const updated=[...ads,{id:uid(),text:newAdText.trim()}];
    setAds(updated);saveKioskAds(updated);setNewAdText('');
  };
  const removeAd=(id)=>{
    const updated=ads.filter(a=>a.id!==id);
    setAds(updated);saveKioskAds(updated);setAdSlide(0);
  };

  const checkedInCount=todayAppts.filter(a=>a.arrived||a.checkedIn).length;

  return h('div',{className:'kiosk-wrap'},
    // ── Header ────────────────────────────────────────────────────────────────
    h('div',{className:'kiosk-header'},
      h('button',{className:'kiosk-exit',onClick:()=>setShowExit(true),title:'Exit kiosk (staff only)'},
        h(Svg,{d:IC.lock,size:14,color:'white'})
      ),
      h('div',{className:'kiosk-clock'},'🕐 '+formatTime(clock)),
      h('div',{className:'kiosk-logo-row'},h(BrandLogo,{dark:true,width:220})),
      h('div',{className:'kiosk-tag'},'Welcome — Please Check In or Register Walk-in')
    ),

    // ── Info Bar (Weather + News + Ads) ──────────────────────────────────────
    h(KioskInfoBar,{ads}),

    // ── Body row (nav+content left | YouTube right) ───────────────────────────
    h('div',{className:'kiosk-body'},
    h('div',{className:'kiosk-main'},
    // ── Nav Tabs ──────────────────────────────────────────────────────────────
    h('div',{className:'kiosk-nav'},
      h('button',{className:'kiosk-nav-btn'+(step==='queue'?' active':''),onClick:()=>setStep('queue')},'📋 Queue'),
      h('button',{className:'kiosk-nav-btn'+(step==='checkin'?' active':''),onClick:()=>setStep('checkin')},'✓ Check In'),
      h('button',{className:'kiosk-nav-btn'+(step==='walkin'?' active':''),onClick:()=>{setStep('walkin');setWalkinDone(null);setWalkinErr('');}},walkinMode==='standby'?'🪑 Join Queue':'➕ Walk-In'),
      h('button',{className:'kiosk-nav-btn'+(step==='install'?' active':''),onClick:()=>setStep('install')},'📲 Install App')
    ),

    // ── Content ───────────────────────────────────────────────────────────────
    h('div',{className:'kiosk-content'},

      // ── QUEUE DISPLAY ──
      step==='queue' && h(Fragment,null,
        h('div',{className:'kiosk-step-title'},"Today's Queue"),
        h('div',{className:'kiosk-step-sub'},checkedInCount+' of '+todayAppts.length+' checked in'),
        todayAppts.length===0
          ? h('div',{className:'kiosk-empty'},
              h('div',{className:'kiosk-empty-icon'},'📅'),
              h('div',{className:'kiosk-empty-title'},'No appointments today'),
              h('div',{className:'kiosk-empty-desc'},'Please ask the receptionist for assistance.')
            )
          : h('div',{className:'kiosk-queue-grid'},
              todayAppts.map((a,idx)=>{
                const isIn=a.arrived||a.checkedIn;
                const isNS=a.nowServing;
                const isDone=a.status==='completed';
                const pat=patients&&patients.find(p=>p.id===a.patientId);
                let cardCls='kiosk-queue-card';
                if(isNS) cardCls+=' kqc-serving';
                else if(isDone) cardCls+=' kqc-done';
                else if(isIn) cardCls+=' kqc-in';
                return h('div',{key:a.id,className:cardCls},
                  h('div',{className:'kiosk-queue-seq'},
                    a.appointmentType==='standby'?h('span',{className:'kiosk-q-badge'},'Q'+a.queueNumber):(idx+1)
                  ),
                  h(KioskPatientPhoto,{patient:pat,syncUrl,className:'kiosk-queue-photo',
                    fallback:h('div',{className:'kiosk-queue-avatar'+(isNS?' kqa-serving':'')},initials(a.patientName))
                  }),
                  h('div',{className:'kiosk-queue-info'},
                    h('div',{className:'kiosk-queue-name'},a.patientName),
                    h('div',{className:'kiosk-queue-time'},
                      a.appointmentType==='standby'?'Standby':('🕐 '+fmtTime(a.time))
                    ),
                    h('div',{className:'kiosk-queue-svc'},svcStr(a))
                  ),
                  // Status badge
                  h('div',{className:'kiosk-queue-status'},
                    isNS  ? h('span',{className:'kiosk-ns-badge'},'🔔 NOW SERVING') :
                    isDone? h('span',{className:'kiosk-done-badge'},'✓ Done') :
                    isIn  ? h('span',{className:'kiosk-arrived-badge'},'✓ Checked In') :
                            h('span',{className:'kiosk-waiting-badge'},'⏳ Waiting')
                  ),
                  // Manual staff buttons
                  isIn && !isDone && h('div',{className:'kiosk-queue-btns'},
                    !isNS && h('button',{className:'kiosk-ns-btn',onClick:e=>{e.stopPropagation();setNowServing(a);}},'▶ Now Serving'),
                    isNS  && h('button',{className:'kiosk-done-btn',onClick:e=>{e.stopPropagation();setDone(a);}},'✓ Mark Done')
                  ),
                  !isIn && !isDone && h('div',{className:'kiosk-queue-btns'},
                    h('button',{className:'kiosk-ns-btn',style:{background:'#9b59b6'},onClick:e=>{e.stopPropagation();setNowServing(a);}},
                      '▶ Call Now'
                    )
                  )
                );
              })
            )
      ),

      // ── CHECK IN ──
      step==='checkin' && step!=='confirm' && step!=='success' && h(Fragment,null,
        h('div',{className:'kiosk-step-title'},'Check In'),
        h('div',{className:'kiosk-step-sub'},'Tap your name below'),
        todayAppts.length>0 && h('div',{className:'kiosk-search-bar'},
          h(Svg,{d:IC.search,size:18,color:'var(--lt)'}),
          h('input',{placeholder:'Search your name…',value:search,onChange:e=>setSearch(e.target.value)})
        ),
        filtered.length===0
          ? h('div',{className:'kiosk-empty'},
              h('div',{className:'kiosk-empty-icon'},'📅'),
              h('div',{className:'kiosk-empty-title'},todayAppts.length===0?'No appointments today':'No matches'),
              h('div',{className:'kiosk-empty-desc'},'Please ask the receptionist for assistance.')
            )
          : h('div',{className:'kiosk-appt-list'},
              filtered.map(a=>{
                const pat2=patients&&patients.find(p=>p.id===a.patientId);
                return h('div',{key:a.id,className:'kiosk-appt-card'+((a.arrived||a.checkedIn)?' checked':''),onClick:()=>handlePick(a)},
                  h(KioskPatientPhoto,{patient:pat2,syncUrl,className:'kiosk-avatar-photo',
                    fallback:h('div',{className:'kiosk-avatar'},initials(a.patientName))
                  }),
                  h('div',{className:'kiosk-info'},
                    h('div',{className:'kiosk-pname'},a.patientName),
                    h('div',{className:'kiosk-pdetails'},
                      a.appointmentType==='standby'
                        ? h('span',{className:'standby-badge'},'Q'+a.queueNumber+' — Standby')
                        : h('span',null,'🕐 '+fmtTime(a.time)),
                      h('span',null,'• '+svcStr(a))
                    )
                  ),
                  (a.arrived||a.checkedIn)
                    ? h('div',{className:'kiosk-arrived-badge'},'✓ Checked In')
                    : h('div',{className:'kiosk-arrow'},'→')
                );
              })
            )
      ),

      // ── WALK-IN BOOKING ──
      step==='walkin' && h(Fragment,null,
        walkinDone
          ? h('div',{className:'kiosk-success'},
              h('div',{className:'kiosk-check-anim'},h(Svg,{d:IC.check,size:54,color:'white'})),
              h('div',{className:'kiosk-success-title'},'Welcome, '+walkinDone.patientName.split(' ')[0]+'! 👋'),
              h('div',{className:'kiosk-success-name'},
                walkinDone.appointmentType==='standby'
                  ? 'You are Queue #'+walkinDone.queueNumber+'. Please take a seat.'
                  : 'Your walk-in appointment is confirmed!'
              ),
              h('div',{className:'kiosk-success-msg'},'🪑 Please take a seat in the waiting area.',h('br'),'Our staff has been notified.'),
              h('button',{className:'btn bp',style:{marginTop:16,fontSize:14,padding:'10px 28px'},
                onClick:()=>{setWalkinDone(null);setStep('queue');}
              },'Done')
            )
          : h('div',{style:{maxWidth:400,margin:'0 auto'}},
              h('div',{className:'kiosk-step-title'},'Walk-In Registration'),
              // Mode toggle
              h('div',{className:'standby-toggle',style:{marginBottom:14}},
                h('button',{className:walkinMode==='scheduled'?'active':'',onClick:()=>setWalkinMode('scheduled')},'📅 Specific Time'),
                h('button',{className:walkinMode==='standby'?'active':'',onClick:()=>setWalkinMode('standby')},'🪑 Join Standby Queue')
              ),
              walkinMode==='standby' && h('div',{className:'standby-note',style:{marginBottom:10,fontSize:12}},
                'You will be added to the standby queue and called when a slot opens.',h('br'),
                'Available: ',h('strong',null,4-(appointments.filter(a=>a.date===today&&a.appointmentType==='standby'&&a.status!=='cancelled').length)),' of 4 spots'
              ),
              h('div',{style:{display:'flex',flexDirection:'column',gap:10}},
                h('input',{className:'kiosk-wi-input',placeholder:'Full Name *',value:walkinInfo.name,onChange:e=>wi('name',e.target.value)}),
                h('input',{className:'kiosk-wi-input',placeholder:'Phone Number *',value:walkinInfo.phone,onChange:e=>wi('phone',e.target.value)}),
                h('select',{className:'kiosk-wi-input',value:walkinInfo.service,onChange:e=>wi('service',e.target.value)},
                  h('option',{value:''},'— Select Service —'),
                  Object.entries(getActiveSvcsByCat()).map(([cat,svcs])=>
                    h('optgroup',{key:cat,label:cat},
                      svcs.map(sv=>h('option',{key:sv.name,value:sv.name},sv.name+' — ₱'+p$(sv.fee)))
                    )
                  )
                ),
                h('input',{className:'kiosk-wi-input',type:'date',value:walkinInfo.date,min:localToday(),onChange:e=>wi('date',e.target.value)}),
                walkinMode==='scheduled' && h('div',null,
                  h('label',{style:{fontSize:11,color:'rgba(255,255,255,.7)',display:'block',marginBottom:4}},'Available Time Slots'),
                  h(TimeSlotGrid,{
                    appointments:appointments||[],
                    selectedDate:walkinInfo.date,
                    selectedService:walkinInfo.service,
                    selectedTime:walkinInfo.time,
                    onTimeChange:t=>wi('time',t),
                  })
                ),
                walkinErr && h('div',{style:{color:'#e74c3c',fontSize:12,background:'#fef2f2',padding:'6px 10px',borderRadius:6}},walkinErr),
                h('button',{className:'btn bp',style:{fontSize:14,padding:'11px'},onClick:submitWalkin},
                  walkinMode==='standby'?'🪑 Join Standby Queue':'✓ Confirm Walk-In'
                )
              )
            )
      ),

      // ── SUCCESS ──
      step==='success' && picked && h('div',{className:'kiosk-success'},
        h('div',{className:'kiosk-check-anim'},h(Svg,{d:IC.check,size:54,color:'white'})),
        h('div',{className:'kiosk-success-title'},'Welcome, '+picked.patientName.split(' ')[0]+'! 👋'),
        h('div',{className:'kiosk-success-name'},'You\'re checked in.'),
        h('div',{className:'kiosk-success-card'},
          h('div',{className:'kiosk-confirm-info'},
            h('div',{className:'row'},h('span',null,'Appointment'),h('span',null,svcStr(picked))),
            picked.appointmentType==='standby'
              ? h('div',{className:'row'},h('span',null,'Queue'),h('span',null,'#'+picked.queueNumber))
              : h('div',{className:'row'},h('span',null,'Time'),h('span',null,fmtTime(picked.time))),
            h('div',{className:'row'},h('span',null,'Dentist'),h('span',null,picked.dentist))
          )
        ),
        h('div',{className:'kiosk-success-msg'},'🪑 Please take a seat in the waiting area.',h('br'),'Our staff has been notified that you\'ve arrived.'),
        h('div',{className:'kiosk-countdown'},'This screen will reset in a few seconds…')
      )
      ,

      // ── INSTALL TAB ─────────────────────────────────────────────────────────
      step==='install' && h('div',{style:{maxWidth:520,margin:'0 auto',padding:'8px 0'}},
        h('div',{className:'kiosk-step-title',style:{marginBottom:16}},'📲 Install App on Your Phone'),
        h('div',{style:{display:'flex',gap:24,alignItems:'flex-start',flexWrap:'wrap',justifyContent:'center'}},
          // QR side
          h('div',{style:{display:'flex',flexDirection:'column',alignItems:'center',gap:10}},
            h('div',{style:{background:'#fff',borderRadius:16,padding:12,boxShadow:'0 4px 24px rgba(0,180,216,.3)'}},
              h('canvas',{ref:kioskQrMainRef,width:180,height:180,title:'Scan to install'})
            ),
            h('div',{style:{fontSize:11,color:'rgba(255,255,255,.45)',textAlign:'center',lineHeight:1.4}},
              'resitch-source.github.io',h('br'),'CYRABELL_DentalMS'
            )
          ),
          // Steps side
          h('div',{style:{flex:1,minWidth:220}},
            h('div',{style:{display:'flex',gap:8,marginBottom:14}},
              h('button',{
                className:'kiosk-install-os-btn'+(kioskOs==='android'?' active':''),
                style:{fontSize:12,padding:'6px 16px'},
                onClick:()=>setKioskOs('android')
              },'🤖 Android'),
              h('button',{
                className:'kiosk-install-os-btn'+(kioskOs==='ios'?' active':''),
                style:{fontSize:12,padding:'6px 16px'},
                onClick:()=>setKioskOs('ios')
              },'🍎 iOS')
            ),
            kioskOs==='android'
              ? h('div',{style:{display:'flex',flexDirection:'column',gap:12}},
                  ...[
                    ['1','Open your Camera app and point it at the QR code above'],
                    ['2','A notification will appear — tap it to open the app in Chrome'],
                    ['3','Tap the ⋮ menu (top-right) → select "Add to Home screen"'],
                    ['4','Tap "Add" — the app icon will appear on your home screen'],
                  ].map(([n,t])=>h('div',{key:n,style:{display:'flex',gap:10,alignItems:'flex-start'}},
                    h('div',{style:{width:26,height:26,borderRadius:'50%',background:'rgba(0,180,216,.2)',border:'1px solid rgba(0,180,216,.5)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800,color:'#00d4ff',flexShrink:0,marginTop:1}},n),
                    h('div',{style:{fontSize:13,color:'rgba(255,255,255,.75)',lineHeight:1.5}},t)
                  ))
                )
              : h('div',{style:{display:'flex',flexDirection:'column',gap:12}},
                  ...[
                    ['1','Open Safari (must use Safari — not Chrome — on iOS)'],
                    ['2','Scan the QR code with your Camera app or type the URL'],
                    ['3','Tap the Share icon □↑ at the bottom of the screen'],
                    ['4','Scroll down and tap "Add to Home Screen"'],
                    ['5','Tap "Add" in the top-right — the app icon will appear'],
                  ].map(([n,t])=>h('div',{key:n,style:{display:'flex',gap:10,alignItems:'flex-start'}},
                    h('div',{style:{width:26,height:26,borderRadius:'50%',background:'rgba(0,180,216,.2)',border:'1px solid rgba(0,180,216,.5)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800,color:'#00d4ff',flexShrink:0,marginTop:1}},n),
                    h('div',{style:{fontSize:13,color:'rgba(255,255,255,.75)',lineHeight:1.5}},t)
                  ))
                )
          )
        ),
        h('div',{style:{marginTop:20,padding:'12px 16px',background:'rgba(0,180,216,.07)',border:'1px solid rgba(0,180,216,.18)',borderRadius:10,fontSize:12,color:'rgba(255,255,255,.5)',textAlign:'center',lineHeight:1.6}},
          'Works like a native app — book appointments, view records, and receive reminders from your phone.',h('br'),
          'No download required. Free for patients.'
        )
      )

    ) // end kiosk-content
    ), // end kiosk-main

    // ── YouTube Side Panel ───────────────────────────────────────────────────
    h('div',{className:'kiosk-yt-panel'},
      h('div',{className:'kiosk-yt-header'},
        h('div',{className:'kiosk-yt-title'},
          h('svg',{width:16,height:16,viewBox:'0 0 24 24',fill:'#ff0000'},
            h('path',{d:'M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8z'}),
            h('polygon',{points:'9.75 15.02 15.5 12 9.75 8.98 9.75 15.02',fill:'white'})
          ),
          'NOW PLAYING'
        ),
        h('button',{className:'kiosk-yt-cfg-btn',onClick:()=>setShowAdMgr(true)},'⚙ Configure')
      ),
      buildQueueEmbedUrl(ytQueue)
        ? h(Fragment,null,
            h('div',{className:'kiosk-yt-frame'},
              h('iframe',{
                key:buildQueueEmbedUrl(ytQueue),
                src:buildQueueEmbedUrl(ytQueue),
                allow:'autoplay; encrypted-media; picture-in-picture',
                allowFullScreen:true,
                title:'Kiosk YouTube'
              })
            ),
            h('div',{className:'kiosk-yt-nowplaying'},
              h('div',{className:'kiosk-yt-np-dot'}),
              h('span',{className:'kiosk-yt-np-label'},ytQueue.length+' video'+(ytQueue.length!==1?'s':'')+' in queue — looping')
            )
          )
        : h('div',{className:'kiosk-yt-placeholder'},
            h('div',{className:'kiosk-yt-placeholder-icon'},'▶'),
            h('div',{className:'kiosk-yt-placeholder-text'},'No videos in queue.',h('br'),'Add YouTube URLs via ⚙ Configure.'),
            h('div',{className:'kiosk-yt-placeholder-hint'},'🔒 Staff: tap ⚙ Configure above or enter PIN to set URLs')
          ),
      // ── Install / QR Panel ─────────────────────────────────────────────────
      h('div',{className:'kiosk-install-panel'},
        h('div',{className:'kiosk-install-header'},
          h('span',null,'📲'),' INSTALL APP ON YOUR PHONE'
        ),
        h('div',{className:'kiosk-install-body'},
          h('div',{className:'kiosk-install-qr'},
            h('canvas',{ref:kioskQrRef,width:80,height:80,title:'Scan to install'})
          ),
          h('div',{className:'kiosk-install-steps'},
            h('div',{style:{display:'flex',gap:5,marginBottom:8}},
              h('button',{
                className:'kiosk-install-os-btn'+(kioskOs==='android'?' active':''),
                onClick:()=>setKioskOs('android')
              },'🤖 Android'),
              h('button',{
                className:'kiosk-install-os-btn'+(kioskOs==='ios'?' active':''),
                onClick:()=>setKioskOs('ios')
              },'🍎 iOS')
            ),
            kioskOs==='android'
              ? h('div',null,
                  h('div',{className:'kiosk-install-step'},h('div',{className:'kiosk-install-num'},'1'),h('div',{className:'kiosk-install-text'},'Scan QR with camera or open in Chrome')),
                  h('div',{className:'kiosk-install-step'},h('div',{className:'kiosk-install-num'},'2'),h('div',{className:'kiosk-install-text'},'Tap ⋮ menu → "Add to Home screen"')),
                  h('div',{className:'kiosk-install-step'},h('div',{className:'kiosk-install-num'},'3'),h('div',{className:'kiosk-install-text'},'Tap "Add" — the app appears on your home screen'))
                )
              : h('div',null,
                  h('div',{className:'kiosk-install-step'},h('div',{className:'kiosk-install-num'},'1'),h('div',{className:'kiosk-install-text'},'Open this page in Safari')),
                  h('div',{className:'kiosk-install-step'},h('div',{className:'kiosk-install-num'},'2'),h('div',{className:'kiosk-install-text'},'Tap the Share icon □↑ at the bottom')),
                  h('div',{className:'kiosk-install-step'},h('div',{className:'kiosk-install-num'},'3'),h('div',{className:'kiosk-install-text'},'"Add to Home Screen" → Add'))
                )
          )
        )
      )
    ), // end kiosk-yt-panel
    ), // end kiosk-body

    // ── Confirm modal ─────────────────────────────────────────────────────────
    step==='confirm' && picked && h('div',{className:'ov'},
      h('div',{className:'kiosk-confirm-modal'},
        h('div',{className:'kiosk-confirm-icon'},'🦷'),
        h('div',{className:'kiosk-confirm-title'},'Confirm Check-In'),
        h('div',{className:'kiosk-confirm-name'},picked.patientName),
        h('div',{className:'kiosk-confirm-info'},
          h('div',{className:'row'},h('span',null,'Service'),h('span',null,svcStr(picked))),
          picked.appointmentType==='standby'
            ? h('div',{className:'row'},h('span',null,'Queue'),h('span',null,'#'+picked.queueNumber))
            : h('div',{className:'row'},h('span',null,'Time'),h('span',null,fmtTime(picked.time))),
          h('div',{className:'row'},h('span',null,'Dentist'),h('span',null,picked.dentist))
        ),
        h('p',{style:{fontSize:12.5,color:'var(--md)',marginBottom:16,lineHeight:1.5}},'Is this you? Tap "Yes, that\'s me" to notify the front desk.'),
        h('div',{className:'kiosk-confirm-actions'},
          h('button',{className:'btn bgh',onClick:()=>{setPicked(null);setStep('checkin');}},'No, go back'),
          h('button',{className:'btn bp',onClick:handleConfirm},'✓ Yes, that\'s me')
        )
      )
    ),

    // ── Ad Manager modal (staff only — opened via long-press on header) ───────
    showAdMgr && h('div',{className:'ov'},
      h('div',{className:'kiosk-confirm-modal',style:{maxWidth:440}},
        h('div',{className:'kiosk-confirm-title'},'⚙ Kiosk Settings'),

        // YouTube Queue
        h('div',{style:{marginBottom:16}},
          h('div',{style:{fontSize:11,fontWeight:700,color:'var(--md)',textTransform:'uppercase',letterSpacing:'.8px',marginBottom:6,display:'flex',alignItems:'center',gap:5}},
            h('svg',{width:13,height:13,viewBox:'0 0 24 24',fill:'#ff0000'},h('path',{d:'M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8z'}),h('polygon',{points:'9.75 15.02 15.5 12 9.75 8.98 9.75 15.02',fill:'white'})),
            'YouTube Queue ('+ytQueue.length+' video'+(ytQueue.length!==1?'s':'')+' — loops non-stop)'
          ),
          h('div',{style:{display:'flex',gap:8,marginBottom:8}},
            h('input',{className:'kiosk-yt-input',placeholder:'Paste YouTube video URL or ID…',value:ytQueueInput,onChange:e=>setYtQueueInput(e.target.value),
              onKeyDown:e=>{ if(e.key==='Enter'){ const id=extractYTId(ytQueueInput.trim()); if(id){ const q=[...ytQueue,{url:ytQueueInput.trim(),id}]; setYtQueue(q); saveKioskYTQueue(q); setYtQueueInput(''); addToast('Added to queue','success'); } else { addToast('Invalid YouTube URL','error'); } } }
            }),
            h('button',{className:'btn bp bsm',onClick:()=>{
              const id=extractYTId(ytQueueInput.trim());
              if(!id){ addToast('Invalid YouTube URL','error'); return; }
              const q=[...ytQueue,{url:ytQueueInput.trim(),id}];
              setYtQueue(q); saveKioskYTQueue(q); setYtQueueInput(''); addToast('Added to queue','success');
            }},'+Add')
          ),
          ytQueue.length>0
            ? h('div',{style:{maxHeight:140,overflowY:'auto',border:'1px solid var(--bd)',borderRadius:8,background:'var(--bg2)'}},
                ytQueue.map((item,i)=>h('div',{key:i,style:{display:'flex',alignItems:'center',gap:8,padding:'5px 10px',borderBottom:i<ytQueue.length-1?'1px solid var(--bd)':'none'}},
                  h('span',{style:{fontSize:11,color:'var(--md)',minWidth:18}},i+1+'.'),
                  h('span',{style:{flex:1,fontSize:11,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:'var(--fg)'}},item.id),
                  h('button',{style:{background:'none',border:'none',color:'#e74c3c',cursor:'pointer',fontSize:14,padding:'0 2px'},onClick:()=>{
                    const q=ytQueue.filter((_,j)=>j!==i); setYtQueue(q); saveKioskYTQueue(q); addToast('Removed from queue','info');
                  }},'×')
                ))
              )
            : h('div',{style:{fontSize:11,color:'var(--md)',fontStyle:'italic',padding:'6px 0'}},'No videos yet. Add a YouTube URL above.')
        ),

        h('hr',{style:{border:'none',borderTop:'1px solid var(--bd)',margin:'4px 0 14px'}}),

        // Ads
        h('div',{style:{fontSize:11,fontWeight:700,color:'var(--md)',textTransform:'uppercase',letterSpacing:'.8px',marginBottom:8}},'📢 Ticker Ads / Announcements'),
        h('div',{style:{display:'flex',gap:8,marginBottom:12}},
          h('input',{style:{flex:1,padding:'8px 10px',borderRadius:8,border:'1px solid var(--bd)',fontSize:13,background:'var(--bg2)',color:'var(--fg)'},
            placeholder:'Enter ad text or announcement…',value:newAdText,onChange:e=>setNewAdText(e.target.value),
            onKeyDown:e=>{if(e.key==='Enter')addAd();}
          }),
          h('button',{className:'btn bp bsm',onClick:addAd},'Add')
        ),
        ads.length===0
          ? h('div',{style:{color:'var(--md)',fontSize:12,padding:'8px 0'}},'No ads yet. Add one above.')
          : h('div',{style:{display:'flex',flexDirection:'column',gap:6,maxHeight:160,overflowY:'auto'}},
              ads.map(ad=>h('div',{key:ad.id,style:{display:'flex',alignItems:'center',gap:8,background:'var(--bg2)',borderRadius:8,padding:'7px 10px'}},
                h('span',{style:{flex:1,fontSize:12.5,color:'var(--dk)'}},ad.text),
                h('button',{className:'btn bd2 bsm',onClick:()=>removeAd(ad.id)},'×')
              ))
            ),
        h('div',{className:'kiosk-confirm-actions',style:{marginTop:14}},
          h('button',{className:'btn bp',onClick:()=>setShowAdMgr(false)},'Done')
        )
      )
    ),

    // ── Exit PIN modal ────────────────────────────────────────────────────────
    showExit && h('div',{className:'ov'},
      h('div',{className:'kiosk-confirm-modal'},
        h('div',{className:'kiosk-confirm-icon'},'🔒'),
        h('div',{className:'kiosk-confirm-title'},'Staff Access'),
        h('p',{style:{fontSize:12.5,color:'var(--md)',marginBottom:10,marginTop:6}},'Enter the 4-digit PIN to exit kiosk mode'),
        h('button',{style:{fontSize:11,color:'#00c8ff',background:'none',border:'none',cursor:'pointer',marginBottom:12},
          onClick:()=>{setShowExit(false);setShowAdMgr(true);}
        },'⚙ Kiosk Settings (YouTube, Ads)'),
        h('input',{
          type:'password',inputMode:'numeric',maxLength:4,value:exitPin,autoFocus:true,
          onChange:e=>setExitPin(e.target.value.replace(/\D/g,'')),
          onKeyDown:e=>{if(e.key==='Enter'&&exitPin.length===4)tryExit();},
          style:{fontSize:24,textAlign:'center',letterSpacing:'12px',marginBottom:14},
          placeholder:'• • • •'
        }),
        h('div',{className:'kiosk-confirm-actions'},
          h('button',{className:'btn bgh',onClick:()=>{setShowExit(false);setExitPin('');}
          },'Cancel'),
          h('button',{className:'btn bp',onClick:tryExit,
            disabled:exitPin.length!==4
          },'Exit Kiosk')
        ),
        h('div',{style:{fontSize:10,color:'var(--lt)',marginTop:10,textAlign:'center'}},
          CONFIG.SHOW_DEMO_CREDENTIALS ? 'Demo PIN: '+KIOSK_EXIT_PIN : 'Enter admin PIN to exit'
        )
      )
    )
  );
}

// ─── 3D DENTAL CHART (anatomical) ───────────────────────────────────────────

