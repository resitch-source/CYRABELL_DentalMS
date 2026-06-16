// ─── PUBLIC BOOKING (unchanged) ───────────────────────────────────────────────

function PublicBooking({onBook, onBack, existingAppointments, patients, onAddPatient}) {
  const [step, setStep]  = useState(1);
  const [done, setDone]  = useState(null);
  const [err,  setErr]   = useState('');

  // syncUrl from localStorage (same pattern used elsewhere)
  const syncUrl = (function(){ try { return localStorage.getItem(LS_KEYS.SYNC_URL) || ''; } catch(e) { return ''; } })();

  // ── Patient state ────────────────────────────────────────────────────
  // Either a selected existing patient OR null (new/anonymous)
  const [selectedPat, setSelectedPat] = useState(null);
  // Personal info form fields (pre-filled from patient or typed fresh)
  const [info, setInfo] = useState({
    name:'', phone:'', email:'', dob:'', sex:'', bloodType:'O+',
    allergies:'', occupation:'', maritalStatus:'', address:'',
    photoDataUrl:'',
  });
  const si = (k,v) => setInfo(x=>({...x,[k]:v}));

  // ── Service + Schedule state ─────────────────────────────────────────
  const [bookMode, setBookMode] = useState('scheduled'); // 'scheduled' | 'standby'
  const [sched, setSched] = useState({
    service:'', fee:'', date:'', time:'09:00',
    dentist:'Dr. Arnold Colao', notes:'',
  });
  const ss = (k,v) => setSched(x=>({...x,[k]:v}));

  // ── Attachments (X-rays, photos, referral letters) ───────────────────
  const [bookingAtts, setBookingAtts] = useState([]);
  const setSvc = (name) => {
    const sv = SVCS.find(x=>x.name===name);
    setSched(x=>({...x, service:name, fee:sv?sv.fee:''}));
  };

  // ── Patient selection → auto-fill info ───────────────────────────────
  const handleSelectPatient = (p) => {
    setSelectedPat(p);
    if (p) {
      setInfo({
        name:        S(p.name),
        phone:       S(p.phone),
        email:       S(p.email),
        dob:         S(p.dob),
        sex:         S(p.sex),
        bloodType:   S(p.bloodType)||'O+',
        allergies:   S(p.allergies),
        occupation:  S(p.occupation),
        maritalStatus: S(p.maritalStatus),
        address:     S(p.address),
        photoDataUrl: S(p.photoDataUrl),
      });
    } else {
      setInfo({name:'',phone:'',email:'',dob:'',sex:'',bloodType:'O+',
               allergies:'',occupation:'',maritalStatus:'',address:'',photoDataUrl:''});
    }
  };

  // ── Submit ────────────────────────────────────────────────────────────
  const submit = () => {
    setErr('');
    if (!info.name.trim() || !info.phone.trim()) { setErr('Name and phone number are required.'); return; }
    if (!sched.service || !sched.date) { setErr('Please select a service and date.'); return; }
    if (bookMode==='scheduled' && !sched.time) { setErr('Please select a time slot.'); return; }

    const today = sched.date;
    const isStandby = bookMode==='standby';

    if (isStandby) {
      const existingStandby = (existingAppointments||[]).filter(a=>a.date===today && a.appointmentType==='standby' && a.status!=='cancelled');
      if (existingStandby.length >= 4) { setErr('The standby queue is full for this day (max 4). Please choose a specific time slot or select another date.'); return; }
    } else {
      const check = checkAvailability(existingAppointments||[], sched.date, sched.time, sched.service);
      if (!check.available) { setErr('This slot is no longer available: '+check.message+'. Please pick another.'); return; }
    }

    const existingStandbyCount = (existingAppointments||[]).filter(a=>a.date===today && a.appointmentType==='standby' && a.status!=='cancelled').length;
    const patientId = selectedPat ? selectedPat.id : ('P'+uid());
    const appt = {
      ...sched,
      time: isStandby ? '' : sched.time,
      id:          'A'+uid(),
      patientId,
      patientName: info.name.trim(),
      phone:       info.phone.trim(),
      email:       info.email || '',
      status:      'pending',
      arrived:     false,
      attachments: [...bookingAtts],
      appointmentType: isStandby ? 'standby' : 'scheduled',
      queueNumber: isStandby ? existingStandbyCount+1 : null,
      checkedIn:   false,
      checkedInAt: null,
      noShow:      false,
    };
    // If new patient, save to records
    if (!selectedPat && onAddPatient) {
      const newPat = {
        id: patientId, name:info.name.trim(), phone:info.phone.trim(),
        email:info.email, dob:info.dob, sex:info.sex,
        bloodType:info.bloodType, allergies:info.allergies,
        occupation:info.occupation, maritalStatus:info.maritalStatus,
        address:info.address, photoDataUrl:info.photoDataUrl,
        balance:0, lastVisit:localToday(),
        teeth:{}, attachments:[], history:[], photoFileId:'',
      };
      onAddPatient(newPat);
    }
    onBook(appt, info);
    setDone(appt);
  };

  // ── UI Helpers ────────────────────────────────────────────────────────
  const Logo = () => h('div',{className:'pwh', style:{display:'flex',justifyContent:'center',marginBottom:8}},
    h(BrandLogo,{dark:true,width:210})
  );
  const BackBtn = () => h('div',{style:{position:'fixed',top:14,right:14,zIndex:10}},
    h('button',{className:'btn bp',onClick:onBack,style:{fontSize:12,padding:'7px 12px'}},'← Back')
  );
  const Steps = () => h('div',{className:'pws'},
    ['Personal','Service & Schedule','Review'].map((lbl,i) => h(Fragment,{key:i},
      h('span',{className:'pwsi '+(step>i+1?'done':step===i+1?'curr':'todo')},
        (step>i+1?'✓':i+1)+' '+lbl
      ),
      i<2 && h('div',{className:'pwsl'})
    ))
  );

  // ── SUCCESS SCREEN ────────────────────────────────────────────────────
  if (done) return h('div',{className:'pw'},
    h(PatientChatbot,{existingAppointments,onBook:null}),
    h(BackBtn),h(Logo),
    h('div',{className:'pwc'},
      h('div',{className:'pwsuc'},
        h('div',{className:'pwck'}, h(Svg,{d:IC.check,color:'white',size:28})),
        h('h2',{style:{fontFamily:"'Playfair Display',serif",fontSize:20,marginBottom:8}},
          done.appointmentType==='standby' ? 'Added to Standby Queue!' : 'Appointment Requested!'
        ),
        done.appointmentType==='standby' && h('div',{style:{fontSize:28,fontWeight:900,color:'#00b8e0',margin:'6px 0',letterSpacing:2}},'Queue #'+done.queueNumber),
        h('p',{style:{color:'var(--md)',fontSize:13,marginBottom:18,lineHeight:1.6}},
          done.appointmentType==='standby'
            ? 'Thank you, '+done.patientName+'! Please arrive by 9:00 AM on your chosen date and wait to be called. Your position is confirmed as Queue #'+done.queueNumber+'.'
            : 'Thank you, '+done.patientName+'! Our team will confirm your booking shortly.'
        ),
        h('div',{className:'rc',style:{textAlign:'left',marginBottom:16}},
          h('div',{className:'rh'}, h('div',{className:'rl'},'🦷 Booking Summary')),
          [
            ['Patient',   done.patientName],
            ['Type',      done.appointmentType==='standby'?'Standby Queue (No Fixed Time)':'Scheduled'],
            done.appointmentType==='standby' ? ['Queue No.', 'Q'+done.queueNumber] : ['Time', done.time],
            ['Service',   done.service],
            ['Date',      done.date],
            ['Dentist',   done.dentist],
            ['Est. Fee',  '₱'+p$(done.fee||0)],
          ].filter(Boolean).map(([l,v]) => h('div',{key:l,className:'rr'},
            h('span',{className:'rr-l'},l),
            h('span',{className:'rr-v'},v)
          ))
        ),
        h('button',{className:'btn bs',style:{width:'100%'},
          onClick:()=>{ setDone(null); setStep(1); setSelectedPat(null);
            setInfo({name:'',phone:'',email:'',dob:'',sex:'',bloodType:'O+',allergies:'',occupation:'',maritalStatus:'',address:'',photoDataUrl:''});
            setSched({service:'',fee:'',date:'',time:'09:00',dentist:'Dr. Arnold Colao',notes:''});
          }
        },'Book Another Appointment')
      )
    )
  );

  return h('div',{className:'pw'},
    h(PatientChatbot,{existingAppointments,onBook:null}),
    h(BackBtn), h(Logo),
    h('div',{className:'pwc'}, h(Steps),

    // ══════════════════════════════════════════════════════════════════
    // STEP 1 — PERSONAL INFORMATION
    // ══════════════════════════════════════════════════════════════════
    step===1 && h('div',null,
      h('div',{style:{fontFamily:"'Playfair Display',serif",fontSize:17,fontWeight:700,marginBottom:4}},
        'Personal Information'
      ),
      h('div',{style:{fontSize:12,color:'var(--md)',marginBottom:16}},
        'Already a patient? Search your name below to auto-fill your details.'
      ),

      // ── Smart patient search ─────────────────────────────────────────
      h(Field,{label:'Search or Enter Your Name *'},
        h(PatientSearchInput,{
          patients:  safe(patients),
          value:     info.name,
          placeholder: 'Type your name or phone to search…',
          required:  true,
          onSelect:  handleSelectPatient,
          onNewPatient: (np) => {
            onAddPatient && onAddPatient(np);
            handleSelectPatient(np);
          },
        })
      ),

      // ── Show patient badge if found ──────────────────────────────────
      selectedPat && h('div',{style:{
        display:'flex',alignItems:'center',gap:10,padding:'8px 12px',
        background:'linear-gradient(135deg,rgba(10,124,110,.08),rgba(10,124,110,.02))',
        border:'1.5px solid rgba(10,124,110,.25)',borderRadius:10,marginBottom:12,
      }},
        h('div',{style:{width:36,height:36,borderRadius:8,background:'var(--t)',color:'#fff',
          display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:13,flexShrink:0}},
          S(selectedPat.name).split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase()
        ),
        h('div',{style:{flex:1}},
          h('div',{style:{fontWeight:700,fontSize:13,color:'var(--dk)'}},
            '✅ Welcome back, '+selectedPat.name+'!'
          ),
          h('div',{style:{fontSize:11,color:'var(--md)',marginTop:1}},
            'Your details have been pre-filled below. Please review and update if needed.'
          )
        )
      ),

      // ── Personal fields (hidden for existing patients for privacy) ──────
      !selectedPat && h('div',{className:'fg2'},
        h(Field,{label:'Phone *'},
          h('input',{type:'tel',value:info.phone,placeholder:'09XXXXXXXXX',
            onChange:e=>si('phone',e.target.value)})
        ),
        h(Field,{label:'Email'},
          h('input',{type:'email',value:info.email,placeholder:'email@example.com',
            onChange:e=>si('email',e.target.value)})
        )
      ),
      !selectedPat && h('div',{className:'fg2'},
        h(Field,{label:'Date of Birth'},
          h('input',{type:'date',value:info.dob,onChange:e=>si('dob',e.target.value)})
        ),
        h(Field,{label:'Sex'},
          h('select',{value:info.sex,onChange:e=>si('sex',e.target.value)},
            h('option',{value:''},'— Select —'),
            h('option',{value:'Female'},'Female'),
            h('option',{value:'Male'},'Male')
          )
        )
      ),
      !selectedPat && h('div',{className:'fg2'},
        h(Field,{label:'Marital Status'},
          h('select',{value:info.maritalStatus,onChange:e=>si('maritalStatus',e.target.value)},
            h('option',{value:''},'— Select —'),
            ['Single','Married','Widowed','Separated','Divorced'].map(ms=>h('option',{key:ms,value:ms},ms))
          )
        ),
        h(Field,{label:'Blood Type'},
          h('select',{value:info.bloodType,onChange:e=>si('bloodType',e.target.value)},
            BLOOD.map(b=>h('option',{key:b,value:b},b))
          )
        )
      ),
      !selectedPat && h(Field,{label:'Occupation'},
        h('input',{value:info.occupation,placeholder:'e.g. Teacher, Nurse, Engineer…',
          onChange:e=>si('occupation',e.target.value)})
      ),
      !selectedPat && h(Field,{label:'Allergies'},
        h('input',{value:info.allergies,placeholder:'e.g. Penicillin, latex — or "None"',
          onChange:e=>si('allergies',e.target.value)})
      ),
      !selectedPat && h(Field,{label:'Address'},
        h('input',{value:info.address,placeholder:'Street, City',
          onChange:e=>si('address',e.target.value)})
      ),

      err && h('div',{style:{color:'#dc2626',fontSize:12,marginTop:8,padding:'8px 10px',background:'#fef2f2',borderRadius:8}}, err),
      h('button',{className:'btn bp',style:{width:'100%',marginTop:16},
        onClick:()=>{ if (!info.name.trim()||((!selectedPat)&&!info.phone.trim())){setErr('Name and phone are required.');return;} setErr(''); setStep(2); },
        disabled:!info.name.trim()||((!selectedPat)&&!info.phone.trim())
      },'Next: Select Service →')
    ),

    // ══════════════════════════════════════════════════════════════════
    // STEP 2 — SERVICE & SCHEDULE
    // ══════════════════════════════════════════════════════════════════
    step===2 && h('div',null,
      h('div',{style:{fontFamily:"'Playfair Display',serif",fontSize:17,fontWeight:700,marginBottom:12}},
        'Service & Schedule'
      ),

      // ── Booking mode toggle ──────────────────────────────────────────
      h('div',{style:{marginBottom:14}},
        h('div',{style:{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'.5px',color:'var(--md)',marginBottom:6}},'Booking Type'),
        h('div',{className:'standby-toggle'},
          h('button',{className:bookMode==='scheduled'?'active':'',onClick:()=>setBookMode('scheduled')},
            '📅 Schedule a Specific Time'
          ),
          h('button',{className:bookMode==='standby'?'active':'',onClick:()=>setBookMode('standby')},
            '🪑 Join Standby Queue'
          )
        ),
        bookMode==='standby' && h('div',{className:'standby-note'},
          '🕐 No fixed time slot. Please arrive by ',h('strong',null,'9:00 AM'),
          ' on your chosen date and wait to be called in order.',
          h('br'),
          'Up to ',h('strong',null,'4 standby patients'),
          ' are accepted per day. If the queue is full, please choose a specific time.'
        )
      ),

      // ── Service selector (grouped by category, same as ApptForm) ────
      h('div',{className:'fg2'},
        h(Field,{label:'Select Service *'},
          h('select',{
            value: sched.service,
            onChange: e => setSvc(e.target.value),
            style:{fontSize:14},
          },
            h('option',{value:''},'— Choose a service —'),
            Object.entries(getActiveSvcsByCat()).map(([cat, svcs]) =>
              h('optgroup',{key:cat, label:cat},
                svcs.map(sv => h('option',{key:sv.name, value:sv.name},
                  sv.name + ' — ₱' + p$(sv.fee)
                ))
              )
            )
          )
        ),
        h(Field,{label:'Est. Fee (₱)'},
          h('input',{
            type:'number', value:sched.fee, readOnly:false,
            placeholder:'Auto-filled from service',
            onChange:e=>ss('fee',+e.target.value),
            style:{background:'var(--cr)'},
          })
        )
      ),

      // ── Service info card (shows when service selected) ─────────────
      sched.service && h('div',{style:{
        padding:'10px 14px',background:'var(--tp)',border:'1.5px solid rgba(10,124,110,.2)',
        borderRadius:10,marginBottom:12,fontSize:13,
      }},
        h('span',{style:{fontWeight:700,color:'var(--t)'}}, sched.service),
        h('span',{style:{color:'var(--md)',marginLeft:8}},
          '₱'+p$(sched.fee||0) + ' · ' + (SERVICE_DURATIONS[sched.service]||DEFAULT_SLOT_MIN) + ' min'
        )
      ),

      // ── Date + Dentist ──────────────────────────────────────────────
      h('div',{className:'fg2'},
        h(Field,{label:'Preferred Date *'},
          h('input',{type:'date',value:sched.date,min:localToday(),
            onChange:e=>ss('date',e.target.value)})
        ),
        h(Field,{label:'Dentist'},
          h('input',{type:'text',value:'Dr. Arnold Colao',readOnly:true,style:{background:'var(--bg3)',color:'var(--md)',cursor:'default'}})
        )
      ),

      // ── Time Slot Grid (scheduled only) ────────────────────────────
      bookMode==='scheduled' && sched.date && h('div',{style:{marginBottom:12}},
        h('label',{style:{display:'block',fontWeight:600,fontSize:12,marginBottom:6,color:'var(--md)',textTransform:'uppercase',letterSpacing:'.5px'}},
          'Available Time Slots'+(sched.service?' · '+(SERVICE_DURATIONS[sched.service]||DEFAULT_SLOT_MIN)+' min':'')
        ),
        h(TimeSlotGrid,{
          appointments: existingAppointments || [],
          selectedDate: sched.date,
          selectedService: sched.service,
          selectedTime: sched.time,
          onTimeChange: t => ss('time',t),
        })
      ),

      // ── Standby queue counter ────────────────────────────────────────
      bookMode==='standby' && sched.date && (()=>{
        const cnt = (existingAppointments||[]).filter(a=>a.date===sched.date && a.appointmentType==='standby' && a.status!=='cancelled').length;
        if(cnt>=4) return h('div',{className:'standby-full'},'⛔ Standby queue is full for this date (4/4). Please choose a specific time slot or select another date.');
        return h('div',{className:'standby-note',style:{marginTop:0}},
          '✅ Queue spots available: ',h('strong',null,(4-cnt)+' of 4 remaining'),
          '. You will be assigned ',h('strong',null,'Queue #'+(cnt+1)),'.'
        );
      })(),

      // ── Availability banner (scheduled only) ────────────────────────
      bookMode==='scheduled' && sched.date && sched.time && sched.service && h(AvailabilityBanner,{
        appointments: existingAppointments||[],
        date:sched.date, time:sched.time, service:sched.service,
      }),

      h(Field,{label:'Notes / Special Requests'},
        h('textarea',{value:sched.notes,rows:3,
          onChange:e=>ss('notes',e.target.value),
          placeholder:'Any concerns, allergies, or special requests…',
          style:{resize:'vertical'},
        })
      ),

      h('div',{style:{marginTop:8,marginBottom:4}},
        h('div',{style:{fontWeight:600,fontSize:12,color:'var(--md)',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:6}},
          '📎 Attach Files (Optional)'
        ),
        h('div',{style:{fontSize:12,color:'var(--md)',marginBottom:8}},
          'Upload X-rays, referral letters, or photos. Files are saved with your appointment.'
        ),
        h(AttachmentPanel,{
          attachments: bookingAtts,
          label: 'Attachments',
          compact: true,
          syncUrl: syncUrl,
          patientId: selectedPat ? selectedPat.id : 'booking-temp',
          onAdd:        att => setBookingAtts(prev=>[...prev, att]),
          onRemove:     id  => setBookingAtts(prev=>prev.filter(a=>a.id!==id)),
          onUpdateNote: (id, note) => setBookingAtts(prev=>prev.map(a=>a.id===id?{...a,note}:a)),
          onUpdate:     att => setBookingAtts(prev=>prev.map(a=>a.id===att.id?att:a)),
        })
      ),

      err && h('div',{style:{color:'#dc2626',fontSize:12,padding:'8px 10px',background:'#fef2f2',borderRadius:8,marginBottom:8}},err),
      h('div',{style:{display:'flex',gap:10,marginTop:16}},
        h('button',{className:'btn bgh',style:{flex:1},onClick:()=>setStep(1)},'← Back'),
        h('button',{className:'btn bp',style:{flex:2},
          onClick:()=>{
            if(!sched.service||!sched.date){setErr('Please select a service and date.');return;}
            if(bookMode==='scheduled'&&!sched.time){setErr('Please select a time slot.');return;}
            setErr('');setStep(3);
          },
          disabled:!sched.service||!sched.date
        },'Review Booking →')
      )
    ),

    // ══════════════════════════════════════════════════════════════════
    // STEP 3 — REVIEW & CONFIRM
    // ══════════════════════════════════════════════════════════════════
    step===3 && h('div',null,
      h('div',{style:{fontFamily:"'Playfair Display',serif",fontSize:17,fontWeight:700,marginBottom:16}},
        'Review & Confirm'
      ),
      h('div',{className:'rc',style:{marginBottom:16}},
        h('div',{className:'rh'}, h(BrandLogo,{dark:false,width:180})),
        [
          ['Patient',      info.name],
          ['Phone',        info.phone],
          ['Email',        info.email||'—'],
          ['Date of Birth',info.dob||'—'],
          ['Blood Type',   info.bloodType||'—'],
          ['Allergies',    info.allergies||'—'],
          ['Booking Type',  bookMode==='standby'?'Standby Queue (No Fixed Time)':'Scheduled Appointment'],
          ['Service',      sched.service],
          ['Date',         sched.date],
          bookMode==='scheduled' ? ['Time', sched.time] : ['Queue Position', 'Q'+((existingAppointments||[]).filter(a=>a.date===sched.date&&a.appointmentType==='standby'&&a.status!=='cancelled').length+1)+' (Arrive by 9:00 AM)'],
          ['Dentist',      sched.dentist],
          ['Est. Fee',     '₱'+p$(sched.fee||0)],
          ['Notes',        sched.notes||'—'],
          ['Attachments',  bookingAtts.length > 0 ? bookingAtts.length+' file(s) attached' : '—'],
        ].filter(([,v])=>v&&v!=='—'||['Phone','Service','Date','Dentist','Est. Fee'].includes(String([0]))).map(([l,v]) =>
          h('div',{key:l,className:'rr'},
            h('span',{className:'rr-l'},l),
            h('span',{className:'rr-v'},S(v))
          )
        )
      ),
      err && h('div',{style:{color:'#dc2626',fontSize:12,padding:'8px 10px',background:'#fef2f2',borderRadius:8,marginBottom:8}},err),
      h('div',{style:{display:'flex',gap:10}},
        h('button',{className:'btn bgh',style:{flex:1},onClick:()=>setStep(2)},'← Back'),
        h('button',{className:'btn bp',style:{flex:2},onClick:submit},'✅ Confirm Booking')
      )
    )
  ));
}


// ═══════════════════════════════════════════════════════════════════════════
