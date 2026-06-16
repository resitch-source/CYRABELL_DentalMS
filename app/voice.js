const VOICE_VOCAB_KEY = 'cyrabell_voice_vocab_v1';
function loadVoiceVocab(){ try{ return JSON.parse(localStorage.getItem(VOICE_VOCAB_KEY)||'{}'); }catch{ return {}; } }
function saveVoiceCorrection(heard, meant){
  const v=loadVoiceVocab(); v[heard.toLowerCase().trim()]=meant.toLowerCase().trim();
  localStorage.setItem(VOICE_VOCAB_KEY, JSON.stringify(v));
}
function deleteVoiceCorrection(heard){
  const v=loadVoiceVocab(); delete v[heard]; localStorage.setItem(VOICE_VOCAB_KEY, JSON.stringify(v));
}
function applyVoiceVocab(text){
  const v=loadVoiceVocab();
  let t=text;
  // longest match first so "teeth cleaning" beats "teeth"
  Object.entries(v).sort((a,b)=>b[0].length-a[0].length).forEach(([k,rep])=>{
    t=t.replace(new RegExp('\\b'+k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','gi'),rep);
  });
  return t;
}

// Number words → digit, supports "sixteen", "twenty six", "thirty-six"
const _W2N_ONES={zero:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,
  ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,
  seventeen:17,eighteen:18,nineteen:19};
const _W2N_TENS={twenty:20,thirty:30,forty:40};
function wordToNumber(w){
  if(!w)return null;
  const s=String(w).toLowerCase().replace(/-/,' ').trim();
  if(/^\d+$/.test(s))return+s;
  if(_W2N_ONES[s]!=null)return _W2N_ONES[s];
  // "twenty six" → 26
  for(const[tk,tv] of Object.entries(_W2N_TENS)){
    if(s===tk)return tv;
    for(const[ok,ov] of Object.entries(_W2N_ONES)){
      if(s===tk+' '+ok||s===tk+ok)return tv+ov;
    }
  }
  return null;
}

// Parse a dental voice command into structured fields
function parseDentalCommand(rawText, patients, activeServices){
  const text = applyVoiceVocab(rawText);
  const t = text.toLowerCase();
  const result = {fdi:null, surface:null, condition:null, patient:null,
    service:null, note:null, date:null, time:null, raw:rawText, corrected:text};

  // ── Tooth number ────────────────────────────────────────────────────────────
  // Match "tooth sixteen", "tooth 16", "#16", or bare FDI pair like "36"
  const toothRx = /(?:tooth|#)\s*([a-z\-]+|\d+)/i;
  const tm = t.match(toothRx);
  if(tm){ const n=wordToNumber(tm[1]); if(n>=11&&n<=48) result.fdi=n; }
  // Fallback: bare FDI number in range
  if(!result.fdi){
    const bm=t.match(/\b([1-4][1-8])\b/);
    if(bm){ const n=+bm[1]; if(n>=11&&n<=48) result.fdi=n; }
  }

  // ── Surface ─────────────────────────────────────────────────────────────────
  const surfaceWords={mesial:'mesial',distal:'distal',buccal:'buccal',labial:'labial',
    lingual:'lingual',occlusal:'occlusal',incisal:'incisal',
    // phonetic variants
    'mezzial':'mesial','mee zeal':'mesial','buccle':'buccal','lingual':'lingual'};
  for(const[k,v] of Object.entries(surfaceWords)){
    if(t.includes(k)){result.surface=v;break;}
  }

  // ── Condition / procedure ────────────────────────────────────────────────────
  // Try CONDITIONS keys first (exact), then PROCEDURE_CONDITION_MAP
  for(const k of CONDITION_KEYS){
    if(t.includes(k.replace('_',' '))){result.condition=k;break;}
  }
  if(!result.condition) result.condition=procedureToCondition(t);

  // ── Patient name ─────────────────────────────────────────────────────────────
  if(patients){
    const best=patients.find(p=>t.includes(p.name.toLowerCase()));
    if(best)result.patient=best;
  }

  // ── Service ──────────────────────────────────────────────────────────────────
  if(activeServices){
    for(const sv of activeServices){
      if(t.includes(sv.name.toLowerCase())){result.service=sv.name;break;}
    }
  }

  // ── Date parsing ─────────────────────────────────────────────────────────────
  // "today", "tomorrow", "june twentieth", "monday"
  const MONTHS={january:0,february:1,march:2,april:3,may:4,june:5,
    july:6,august:7,september:8,october:9,november:10,december:11};
  const today=new Date(); let d=null;
  if(t.includes('today'))d=today;
  else if(t.includes('tomorrow')){d=new Date(today);d.setDate(d.getDate()+1);}
  else{
    for(const[mn,mv] of Object.entries(MONTHS)){
      const mx=t.match(new RegExp(mn+'\\s+([a-z\\d]+)'));
      if(mx){const day=wordToNumber(mx[1]);if(day){d=new Date(today.getFullYear(),mv,day);break;}}
    }
  }
  if(d) result.date=d.toISOString().slice(0,10);

  // ── Time parsing ─────────────────────────────────────────────────────────────
  const timeRx=/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i;
  const timem=t.match(timeRx);
  if(timem){
    let hr=+timem[1],mn=+(timem[2]||0);
    if(timem[3].toLowerCase()==='pm'&&hr!==12)hr+=12;
    if(timem[3].toLowerCase()==='am'&&hr===12)hr=0;
    result.time=String(hr).padStart(2,'0')+':'+String(mn).padStart(2,'0');
  }

  // ── Note (everything else, after all matched tokens are removed) ─────────────
  const stripped=t.replace(toothRx,'').replace(/\b([1-4][1-8])\b/,'')
    .replace(result.surface||'__none__','').replace(result.condition?.replace('_',' ')||'__none__','')
    .replace(/\b(tooth|add|mark|set|as|on|the|to|for)\b/g,'').replace(/\s+/g,' ').trim();
  if(stripped.length>2) result.note=stripped;

  return result;
}

// React hook — wraps SpeechRecognition
function useVoiceInput({onResult, onInterim, lang='en-US', continuous=false}){
  const [listening,setListening]=useState(false);
  const [supported]=useState(()=>!!(window.SpeechRecognition||window.webkitSpeechRecognition));
  const [error,setError]=useState(null);
  const recRef=useRef(null);

  const stop=useCallback(()=>{
    if(recRef.current){try{recRef.current.stop();}catch(e){} recRef.current=null;}
    setListening(false);
  },[]);

  const start=useCallback(()=>{
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){setError('not-supported');return;}
    stop();
    const rec=new SR();
    rec.continuous=continuous; rec.interimResults=true; rec.lang=lang;
    rec.onresult=e=>{
      let interim='',final='';
      for(let i=e.resultIndex;i<e.results.length;i++){
        const tx=e.results[i][0].transcript;
        if(e.results[i].isFinal)final+=tx; else interim+=tx;
      }
      if(interim&&onInterim)onInterim(interim);
      if(final&&onResult)onResult(final.trim());
    };
    rec.onerror=e=>{setError(e.error);setListening(false);};
    rec.onend=()=>{setListening(false);};
    rec.start();
    recRef.current=rec; setListening(true); setError(null);
  },[continuous,lang,onResult,onInterim,stop]);

  const toggle=useCallback(()=>listening?stop():start(),[listening,start,stop]);
  useEffect(()=>()=>stop(),[stop]);
  return {listening,supported,error,start,stop,toggle};
}

// Mic button — small reusable component
function VoiceMicBtn({onResult, onInterim, title, size=22, className=''}){
  const [interim,setInterim]=useState('');
  const {listening,supported,error,toggle}=useVoiceInput({
    onResult:t=>{setInterim('');if(onResult)onResult(t);},
    onInterim:t=>setInterim(t)
  });
  if(!supported)return null;
  return h('span',{style:{position:'relative',display:'inline-flex',alignItems:'center'}},
    h('button',{type:'button',title:title||'Voice input',
      onClick:e=>{e.stopPropagation();toggle();},
      className:'voice-mic-btn'+(listening?' listening':'')+(className?' '+className:''),
      style:{width:size+6,height:size+6,borderRadius:'50%',border:'none',cursor:'pointer',
        display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,
        background:listening?'#dc2626':'var(--tp)',
        boxShadow:listening?'0 0 0 3px rgba(220,38,38,.25)':'none',
        transition:'all .2s'}},
      h('svg',{width:size,height:size,viewBox:'0 0 24 24',fill:'none'},
        h('rect',{x:9,y:2,width:6,height:11,rx:3,
          fill:listening?'#fff':'var(--t)'}),
        h('path',{d:'M5 11a7 7 0 0014 0',stroke:listening?'#fff':'var(--t)',
          strokeWidth:2,strokeLinecap:'round',fill:'none'}),
        h('line',{x1:12,y1:18,x2:12,y2:22,stroke:listening?'#fff':'var(--t)',strokeWidth:2}),
        h('line',{x1:8,y1:22,x2:16,y2:22,stroke:listening?'#fff':'var(--t)',strokeWidth:2})
      )
    ),
    listening&&interim&&h('div',{className:'voice-interim-bubble'},interim)
  );
}

// Full voice command panel — floating listener with parsed preview + learn workflow
function VoiceCommandPanel({patients, activeServices, onApply, onClose}){
  const [phase,setPhase]=useState('idle'); // idle | listening | parsed | learn
  const [transcript,setTranscript]=useState('');
  const [interim,setInterim]=useState('');
  const [parsed,setParsed]=useState(null);
  const [learnHeard,setLearnHeard]=useState('');
  const [learnMeant,setLearnMeant]=useState('');
  const [vocab,setVocab]=useState(()=>loadVoiceVocab());

  const {listening,supported,error,start,stop}=useVoiceInput({
    continuous:true,
    onResult:t=>{
      setTranscript(prev=>prev?prev+' '+t:t);
      setInterim('');
      const p=parseDentalCommand(t,patients,activeServices);
      setParsed(p); setPhase('parsed');
    },
    onInterim:t=>setInterim(t)
  });

  const startListen=()=>{ setTranscript(''); setInterim(''); setParsed(null); setPhase('listening'); start(); };
  const stopListen=()=>{ stop(); setPhase(parsed?'parsed':'idle'); };

  const apply=()=>{ if(parsed&&onApply)onApply(parsed); setPhase('idle'); setTranscript(''); setParsed(null); };
  const retry=()=>{ setTranscript(''); setInterim(''); setParsed(null); setPhase('listening'); start(); };

  const saveLearn=()=>{
    if(learnHeard&&learnMeant){
      saveVoiceCorrection(learnHeard,learnMeant);
      setVocab(loadVoiceVocab());
      setLearnHeard(''); setLearnMeant('');
      setPhase('parsed');
    }
  };

  if(!supported) return null;

  return h('div',{className:'voice-panel'},
    h('div',{className:'voice-panel-header'},
      h('span',{style:{fontWeight:700,fontSize:13,color:'var(--dk)'}},'🎙 Voice Command'),
      h('button',{type:'button',className:'voice-panel-close',onClick:onClose},'×')
    ),

    // Idle / start prompt
    phase==='idle'&&h('div',{style:{textAlign:'center',padding:'16px 8px'}},
      h('div',{style:{fontSize:12,color:'var(--md)',marginBottom:12}},
        'Say a dental command — e.g.\n"Tooth 16 cavity on mesial" or "Patient Maria Santos"'),
      h('button',{type:'button',className:'btn bp',onClick:startListen},'🎙 Start Listening'),
      error&&h('div',{style:{fontSize:11,color:'#dc2626',marginTop:8}},
        error==='not-supported'?'Voice not supported in this browser':'Mic error: '+error)
    ),

    // Listening
    phase==='listening'&&h('div',null,
      h('div',{className:'voice-listening-ring'},
        h('div',{className:'voice-ring-pulse'}),
        h('svg',{width:32,height:32,viewBox:'0 0 24 24',fill:'none'},
          h('rect',{x:9,y:2,width:6,height:11,rx:3,fill:'#dc2626'}),
          h('path',{d:'M5 11a7 7 0 0014 0',stroke:'#dc2626',strokeWidth:2,strokeLinecap:'round',fill:'none'}),
          h('line',{x1:12,y1:18,x2:12,y2:22,stroke:'#dc2626',strokeWidth:2}),
          h('line',{x1:8,y1:22,x2:16,y2:22,stroke:'#dc2626',strokeWidth:2})
        )
      ),
      h('div',{style:{fontSize:11,color:'#dc2626',textAlign:'center',fontWeight:700,marginBottom:8}},'Listening…'),
      (transcript||interim)&&h('div',{className:'voice-transcript'},
        transcript&&h('span',null,transcript+' '),
        interim&&h('span',{style:{color:'var(--md)',fontStyle:'italic'}},interim)
      ),
      h('button',{type:'button',className:'btn bgh',style:{width:'100%',marginTop:8},onClick:stopListen},'Stop')
    ),

    // Parsed result preview
    phase==='parsed'&&parsed&&h('div',null,
      h('div',{className:'voice-transcript',style:{marginBottom:8}},
        h('span',{style:{fontSize:10,color:'var(--md)',display:'block',marginBottom:2}},'Heard:'),
        h('span',null,parsed.raw),
        parsed.corrected!==parsed.raw&&h('span',{style:{fontSize:10,color:'var(--t)',display:'block',marginTop:2}},
          '→ corrected: '+parsed.corrected)
      ),
      // Parsed fields
      h('div',{className:'voice-parsed-grid'},
        parsed.patient&&h('div',{className:'voice-parsed-row'},
          h('span',{className:'voice-parsed-lbl'},'Patient'),
          h('span',{className:'voice-parsed-val'},parsed.patient.name)
        ),
        parsed.fdi&&h('div',{className:'voice-parsed-row'},
          h('span',{className:'voice-parsed-lbl'},'Tooth'),
          h('span',{className:'voice-parsed-val'},'#'+parsed.fdi+' '+toothName(parsed.fdi))
        ),
        parsed.condition&&h('div',{className:'voice-parsed-row'},
          h('span',{className:'voice-parsed-lbl'},'Condition'),
          h('span',{className:'voice-parsed-val'},
            h('span',{style:{width:10,height:10,borderRadius:2,display:'inline-block',marginRight:4,
              background:CONDITIONS[parsed.condition].color,border:'1px solid '+CONDITIONS[parsed.condition].stroke}}),
            CONDITIONS[parsed.condition].label)
        ),
        parsed.surface&&h('div',{className:'voice-parsed-row'},
          h('span',{className:'voice-parsed-lbl'},'Surface'),
          h('span',{className:'voice-parsed-val'},parsed.surface)
        ),
        parsed.service&&h('div',{className:'voice-parsed-row'},
          h('span',{className:'voice-parsed-lbl'},'Service'),
          h('span',{className:'voice-parsed-val'},parsed.service)
        ),
        parsed.date&&h('div',{className:'voice-parsed-row'},
          h('span',{className:'voice-parsed-lbl'},'Date'),
          h('span',{className:'voice-parsed-val'},fmtDate(parsed.date))
        ),
        parsed.time&&h('div',{className:'voice-parsed-row'},
          h('span',{className:'voice-parsed-lbl'},'Time'),
          h('span',{className:'voice-parsed-val'},fmtTime(parsed.time))
        ),
        !parsed.fdi&&!parsed.condition&&!parsed.patient&&!parsed.service&&
          h('div',{style:{fontSize:12,color:'var(--md)',padding:'4px 0'}},
            'Could not parse command. Try again or add a correction below.')
      ),
      h('div',{style:{display:'flex',gap:6,marginTop:10}},
        h('button',{type:'button',className:'btn bp',style:{flex:1},onClick:apply},'✓ Apply'),
        h('button',{type:'button',className:'btn bgh',onClick:retry},'🔄 Retry'),
        h('button',{type:'button',className:'btn bgh',
          style:{fontSize:11},onClick:()=>{setLearnHeard(parsed.raw);setLearnMeant(parsed.corrected);setPhase('learn');}},
          '📚 Teach')
      )
    ),

    // Learn / correction workflow
    phase==='learn'&&h('div',null,
      h('div',{style:{fontSize:12,fontWeight:700,color:'var(--dk)',marginBottom:8}},'📚 Teach a Correction'),
      h('div',{style:{fontSize:11,color:'var(--md)',marginBottom:8}},
        'When you say the phrase below, what should it be replaced with?'),
      h('label',{style:{fontSize:11,fontWeight:600,color:'var(--md)',display:'block',marginBottom:3}},'When I say:'),
      h('input',{type:'text',value:learnHeard,onChange:e=>setLearnHeard(e.target.value),
        style:{width:'100%',padding:'6px 8px',border:'1.5px solid var(--bd)',borderRadius:7,fontSize:12,marginBottom:6,boxSizing:'border-box'}}),
      h('label',{style:{fontSize:11,fontWeight:600,color:'var(--md)',display:'block',marginBottom:3}},'Replace with:'),
      h('input',{type:'text',value:learnMeant,onChange:e=>setLearnMeant(e.target.value),
        style:{width:'100%',padding:'6px 8px',border:'1.5px solid var(--bd)',borderRadius:7,fontSize:12,marginBottom:8,boxSizing:'border-box'}}),
      h('div',{style:{display:'flex',gap:6}},
        h('button',{type:'button',className:'btn bp',onClick:saveLearn},'💾 Save'),
        h('button',{type:'button',className:'btn bgh',onClick:()=>setPhase('parsed')},'Cancel')
      )
    ),

    // Learned vocabulary list
    Object.keys(vocab).length>0&&h('div',{style:{marginTop:12,borderTop:'1px solid var(--bd)',paddingTop:10}},
      h('div',{style:{fontSize:10,fontWeight:700,color:'var(--md)',textTransform:'uppercase',letterSpacing:1,marginBottom:6}},
        'Learned Corrections'),
      h('div',{style:{maxHeight:100,overflowY:'auto',display:'flex',flexDirection:'column',gap:4}},
        Object.entries(vocab).map(([heard,meant])=>
          h('div',{key:heard,style:{display:'flex',alignItems:'center',gap:6,fontSize:11}},
            h('span',{style:{flex:1,color:'var(--md)'}},'\"'+heard+'\" →'),
            h('span',{style:{fontWeight:600,color:'var(--dk)'}},'\"'+meant+'\"'),
            h('button',{type:'button',onClick:()=>{deleteVoiceCorrection(heard);setVocab(loadVoiceVocab());},
              style:{padding:'1px 5px',fontSize:11,background:'#fee2e2',color:'#dc2626',border:'1px solid #fca5a5',
                borderRadius:4,cursor:'pointer'}},'×')
          )
        )
      )
    )
  );
}

// ─── SHORTCUTS ───────────────────────────────────────────────────────────────

// ═══════════════════════════════════════════════════════════════════════════
// 🏢 CYRABELL BRANDING
// Powered by CYRABELL — inline SVG C-mark badge
// ═══════════════════════════════════════════════════════════════════════════
