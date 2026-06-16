// ── Professional notification templates ──────────────────────────────────────
// Plain-text (SMS) — compact, professional, clinic-branded
const TMPL={
  confirmation:a=>[
    'SIMPLIFIED DENTAL CLINIC',
    '━━━━━━━━━━━━━━━━━━━━━━━━',
    '✅ APPOINTMENT CONFIRMED',
    '',
    'Dear '+a.patientName+',',
    '',
    'Your appointment has been confirmed:',
    '  📅 Date    : '+fmtDateFull(a.date),
    '  🕐 Time    : '+fmtTime(a.time),
    '  🦷 Service : '+svcStr(a),
    '  👨‍⚕️ Dentist : '+a.dentist,
    '',
    'Please arrive 10 minutes early.',
    'Bring any previous dental records if available.',
    '',
    'We look forward to seeing you!',
    '',
    '— Simplified Dental Clinic Management System',
    '  Powered by CYRABELL Systems Engineering Solutions'
  ].join('\n'),
  reminder:a=>[
    'SIMPLIFIED DENTAL CLINIC',
    '━━━━━━━━━━━━━━━━━━━━━━━━',
    '⏰ APPOINTMENT REMINDER',
    '',
    'Dear '+a.patientName+',',
    '',
    'This is a friendly reminder of your upcoming appointment:',
    '  📅 Date    : '+fmtDateFull(a.date),
    '  🕐 Time    : '+fmtTime(a.time),
    '  🦷 Service : '+svcStr(a),
    '  👨‍⚕️ Dentist : '+a.dentist,
    '',
    'Please confirm your attendance or contact us to reschedule.',
    '',
    '— Simplified Dental Clinic Management System',
    '  Powered by CYRABELL Systems Engineering Solutions'
  ].join('\n'),
  cancellation:a=>[
    'SIMPLIFIED DENTAL CLINIC',
    '━━━━━━━━━━━━━━━━━━━━━━━━',
    '❌ APPOINTMENT CANCELLED',
    '',
    'Dear '+a.patientName+',',
    '',
    'Your appointment has been cancelled:',
    '  📅 Date    : '+fmtDateFull(a.date),
    '  🦷 Service : '+svcStr(a),
    '',
    'Please contact us to reschedule at your convenience.',
    'We apologize for any inconvenience.',
    '',
    '— Simplified Dental Clinic Management System',
    '  Powered by CYRABELL Systems Engineering Solutions'
  ].join('\n'),
  followup:a=>[
    'SIMPLIFIED DENTAL CLINIC',
    '━━━━━━━━━━━━━━━━━━━━━━━━',
    '💙 THANK YOU FOR YOUR VISIT',
    '',
    'Dear '+a.patientName+',',
    '',
    'Thank you for choosing Simplified Dental Clinic.',
    'We hope your '+svcStr(a)+' procedure went smoothly!',
    '',
    'Aftercare reminders:',
    '  • Avoid hard foods for 24 hours if advised',
    '  • Follow your dentist\'s post-care instructions',
    '  • Schedule your next check-up in 6 months',
    '',
    'Your smile is our priority. Stay healthy! 🦷',
    '',
    '— Simplified Dental Clinic Management System',
    '  Powered by CYRABELL Systems Engineering Solutions'
  ].join('\n'),
};

// HTML email template builder — returns full HTML string
function buildNotifHTML(tmplKey, a){
  const COLORS={confirmation:'#0a7c6e',reminder:'#0a5c8e',cancellation:'#c0392b',followup:'#6c3483'};
  const ICONS={confirmation:'✅',reminder:'⏰',cancellation:'❌',followup:'💙'};
  const TITLES={confirmation:'Appointment Confirmed',reminder:'Appointment Reminder',cancellation:'Appointment Cancelled',followup:'Thank You for Your Visit'};
  const accentColor=COLORS[tmplKey]||'#0a7c6e';
  const icon=ICONS[tmplKey]||'🦷';
  const title=TITLES[tmplKey]||'Notification';

  const bodyMap={
    confirmation:`
      <p style="color:#444;font-size:14px;line-height:1.7;margin:0 0 16px">Dear <strong>${a.patientName}</strong>,</p>
      <p style="color:#444;font-size:14px;margin:0 0 16px">Your dental appointment has been <strong style="color:${accentColor}">confirmed</strong>. Please review the details below:</p>
      <table style="width:100%;border-collapse:collapse;margin:0 0 18px;font-size:13.5px;">
        <tr><td style="padding:8px 10px;background:#f0fdf9;border-radius:6px 6px 0 0;color:#888;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.5px">📅 Date</td><td style="padding:8px 10px;background:#f0fdf9;border-radius:6px 6px 0 0;color:#222;font-weight:700">${fmtDateFull(a.date)}</td></tr>
        <tr><td style="padding:8px 10px;background:#fff;color:#888;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.5px">🕐 Time</td><td style="padding:8px 10px;background:#fff;color:#222;font-weight:700">${fmtTime(a.time)}</td></tr>
        <tr><td style="padding:8px 10px;background:#f0fdf9;color:#888;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.5px">🦷 Service</td><td style="padding:8px 10px;background:#f0fdf9;color:#222;font-weight:700">${svcStr(a)}</td></tr>
        <tr><td style="padding:8px 10px;background:#fff;border-radius:0 0 6px 6px;color:#888;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.5px">👨‍⚕️ Dentist</td><td style="padding:8px 10px;background:#fff;border-radius:0 0 6px 6px;color:#222;font-weight:700">${a.dentist}</td></tr>
      </table>
      <p style="color:#555;font-size:13px;border-left:3px solid ${accentColor};padding-left:10px;margin:0">Please arrive <strong>10 minutes early</strong> and bring any previous dental records if available.</p>`,
    reminder:`
      <p style="color:#444;font-size:14px;line-height:1.7;margin:0 0 16px">Dear <strong>${a.patientName}</strong>,</p>
      <p style="color:#444;font-size:14px;margin:0 0 16px">This is a friendly reminder of your <strong style="color:${accentColor}">upcoming appointment</strong>:</p>
      <table style="width:100%;border-collapse:collapse;margin:0 0 18px;font-size:13.5px;">
        <tr><td style="padding:8px 10px;background:#eff6ff;border-radius:6px 6px 0 0;color:#888;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.5px">📅 Date</td><td style="padding:8px 10px;background:#eff6ff;color:#222;font-weight:700">${fmtDateFull(a.date)}</td></tr>
        <tr><td style="padding:8px 10px;background:#fff;color:#888;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.5px">🕐 Time</td><td style="padding:8px 10px;background:#fff;color:#222;font-weight:700">${fmtTime(a.time)}</td></tr>
        <tr><td style="padding:8px 10px;background:#eff6ff;color:#888;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.5px">🦷 Service</td><td style="padding:8px 10px;background:#eff6ff;color:#222;font-weight:700">${svcStr(a)}</td></tr>
        <tr><td style="padding:8px 10px;background:#fff;border-radius:0 0 6px 6px;color:#888;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.5px">👨‍⚕️ Dentist</td><td style="padding:8px 10px;background:#fff;color:#222;font-weight:700">${a.dentist}</td></tr>
      </table>
      <p style="color:#555;font-size:13px;border-left:3px solid ${accentColor};padding-left:10px;margin:0">Please confirm your attendance or contact us to reschedule.</p>`,
    cancellation:`
      <p style="color:#444;font-size:14px;line-height:1.7;margin:0 0 16px">Dear <strong>${a.patientName}</strong>,</p>
      <p style="color:#444;font-size:14px;margin:0 0 16px">We regret to inform you that your appointment has been <strong style="color:${accentColor}">cancelled</strong>:</p>
      <table style="width:100%;border-collapse:collapse;margin:0 0 18px;font-size:13.5px;">
        <tr><td style="padding:8px 10px;background:#fef2f2;border-radius:6px 6px 0 0;color:#888;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.5px">📅 Date</td><td style="padding:8px 10px;background:#fef2f2;color:#222;font-weight:700">${fmtDateFull(a.date)}</td></tr>
        <tr><td style="padding:8px 10px;background:#fff;border-radius:0 0 6px 6px;color:#888;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.5px">🦷 Service</td><td style="padding:8px 10px;background:#fff;color:#222;font-weight:700">${svcStr(a)}</td></tr>
      </table>
      <p style="color:#555;font-size:13px;border-left:3px solid ${accentColor};padding-left:10px;margin:0">Please contact us at your convenience to <strong>reschedule</strong>. We apologize for any inconvenience caused.</p>`,
    followup:`
      <p style="color:#444;font-size:14px;line-height:1.7;margin:0 0 16px">Dear <strong>${a.patientName}</strong>,</p>
      <p style="color:#444;font-size:14px;margin:0 0 16px">Thank you for visiting <strong>Simplified Dental Clinic</strong>. We hope your <strong style="color:${accentColor}">${svcStr(a)}</strong> procedure went smoothly!</p>
      <div style="background:#f8f8ff;border-radius:8px;padding:14px 16px;margin:0 0 16px;font-size:13px;color:#555;line-height:1.8">
        <strong style="color:#444;display:block;margin-bottom:6px">Aftercare Reminders:</strong>
        <div>• Avoid hard foods for 24 hours if advised</div>
        <div>• Follow your dentist's post-care instructions</div>
        <div>• Schedule your next check-up in 6 months</div>
      </div>
      <p style="color:#555;font-size:13px;border-left:3px solid ${accentColor};padding-left:10px;margin:0">Your smile is our priority. Stay healthy! 😊</p>`,
  };

  const bodyHTML = bodyMap[tmplKey] || `<p style="color:#444">${TMPL[tmplKey]?TMPL[tmplKey](a):''}</p>`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:16px;background:#f0f0f0;font-family:Arial,Helvetica,sans-serif">
<div style="max-width:520px;margin:0 auto;border-radius:14px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.12)">
  <!-- HEADER -->
  <div style="background:linear-gradient(135deg,${accentColor} 0%,#0a2a4a 100%);padding:22px 24px;text-align:center">
    <div style="margin-bottom:6px;display:inline-block;max-width:200px">${LOGO_SVG_LIGHT}</div>
    <div style="display:inline-block;margin-top:8px;background:rgba(255,255,255,.15);border-radius:20px;padding:4px 14px">
      <span style="color:#fff;font-size:14px">${icon}</span>
      <span style="color:#fff;font-size:13px;font-weight:600;margin-left:6px">${title}</span>
    </div>
  </div>
  <!-- BODY -->
  <div style="background:#fff;padding:24px 24px 20px">
    ${bodyHTML}
  </div>
  <!-- DIVIDER TEETH -->
  <div style="background:#fff;text-align:center;padding:4px 0;font-size:11px;letter-spacing:4px;color:#ddd">🦷 🦷 🦷 🦷 🦷 🦷 🦷 🦷</div>
  <!-- FOOTER -->
  <div style="background:#0a1628;padding:14px 24px;text-align:center">
    <div style="color:#00c8ff;font-size:13px;font-weight:800;letter-spacing:3px;text-transform:uppercase">CYRABELL</div>
    <div style="color:#aaa;font-size:10px;margin-top:2px;letter-spacing:1px">Systems Engineering Solutions</div>
    <div style="color:#555;font-size:9px;margin-top:6px">This is an automated notification from Simplified Dental Clinic Management System</div>
  </div>
</div>
</body></html>`;
}
function Notifications({notifications,setNotifications,appointments,addToast}){
  const [tab,setTab]=useState('send');
  const { pageItems: pagedNotifs, PagerUI: NotifsPager } = usePagination(notifications);
  const [ntype,setNtype]=useState('sms');
  const [apptId,setApptId]=useState('');
  const [tmpl,setTmpl]=useState('confirmation');
  const [custom,setCustom]=useState('');
  const curA=appointments.find(a=>a.id===apptId);
  let preview='';
  if(curA&&tmpl!=='custom'){const fn=TMPL[tmpl];preview=fn?fn(curA):'';}
  else if(tmpl==='custom')preview=custom;
  const [sendingNow,setSendingNow]=useState(false);
  const send=async()=>{
    if(!curA||!preview)return;
    setSendingNow(true);
    const syncUrl=(function(){try{return localStorage.getItem(LS_KEYS.SYNC_URL)||'';}catch(e){return '';}})();
    const patient={
      name:curA.patientName,
      phone:curA.phone,
      email:curA.email,
      smsCarrier:curA.smsCarrier||''
    };
    let status='sent';
    let errMsg='';
    try {
      await sendNotification(ntype, patient, preview, syncUrl);
      addToast(ntype.toUpperCase()+' sent to '+curA.patientName+'!','success');
    } catch (err) {
      status='failed';
      errMsg=err.message;
      addToast('Send failed: '+err.message,'error');
    }
    setNotifications(prev=>[{
      id:'N'+uid(),
      type:ntype,
      recipient:curA.patientName,
      phone:curA.phone||'—',
      email:curA.email||'—',
      message:preview+(errMsg?'\n[ERROR: '+errMsg+']':''),
      sentAt:new Date().toLocaleString(),
      status:status
    },...prev]);
    setApptId('');
    setSendingNow(false);
  };
  return h('div',null,
    h('div',{className:'ph'},h('div',null,h('div',{className:'ptl'},'Notifications'),h('div',{className:'psl'},'Send SMS & Email alerts to patients'))),
    h('div',{className:'tabs'},[['send','✉️ Send'],['log','📋 Log']].map(([v,l])=>h('button',{key:v,className:'tab'+(tab===v?' act':''),onClick:()=>setTab(v)},l))),
    tab==='send'&&h('div',{className:'ng',style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}},
      h('div',{className:'card'},h('div',{className:'ch'},h('div',{className:'ct'},'Compose')),h('div',{className:'cb'},
        h('div',{className:'fg',style:{marginBottom:12}},h('label',null,'Type'),
          h('div',{className:'ntg'},
            [
              ['sms','📱','SMS','Text message',false],
              ['email','📧','Email','To inbox',false],
              ['whatsapp','💬','WhatsApp','Opens WhatsApp',false],
              ['viber','🟣','Viber','Opens Viber',!planHas('viber')],
              ['messenger','💙','Messenger','Opens FB Messenger',!planHas('messenger')],
            ].map(([v,e,n,d,locked])=>
              h('div',{key:v,className:'ntc'+(ntype===v&&!locked?' sel':''),
                onClick:locked?undefined:()=>setNtype(v),
                title:locked?'Professional plan required':undefined,
                style:locked?{opacity:0.4,cursor:'not-allowed',position:'relative'}:undefined
              },
                h('div',{className:'ntic',style:{background:v==='sms'?'#e8f5f3':v==='email'?'#e8eeff':v==='whatsapp'?'#dcfce7':v==='viber'?'#f3e8ff':'#dbeafe'}},h('span',{style:{fontSize:17}},e)),
                h('div',{className:'ntn'},n,locked&&h('span',{style:{fontSize:10,marginLeft:3}},'🔒')),h('div',{className:'ntd'},d)
              )
            )
          )
        ),
        h('div',{className:'fg',style:{marginBottom:12}},h('label',null,'Appointment'),
          h('select',{value:apptId,onChange:e=>setApptId(e.target.value)},
            h('option',{value:''},'Choose appointment…'),
            appointments.map(a=>h('option',{key:a.id,value:a.id},a.patientName+' — '+svcStr(a)+' ('+a.date+')'))
          )
        ),
        h('div',{className:'fg',style:{marginBottom:12}},h('label',null,'Template'),
          h('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:7}},
            [['confirmation','✓ Confirm'],['reminder','⏰ Remind'],['cancellation','✕ Cancel'],['followup','💬 Follow-up'],['custom','✏️ Custom']].map(([v,l])=>
              h('button',{key:v,className:'fb'+(tmpl===v?' act':''),onClick:()=>setTmpl(v),style:{textAlign:'left',fontSize:12}},l)
            )
          )
        ),
        tmpl==='custom'&&h('div',{className:'fg',style:{marginBottom:12}},h('label',null,'Message'),h('textarea',{value:custom,onChange:e=>setCustom(e.target.value),placeholder:'Type your message…'})),
        h('button',{className:'btn bp',style:{width:'100%'},onClick:send,disabled:!apptId||!preview||sendingNow},
          h(Svg,{d:IC.send,size:14}),
          sendingNow?' Sending…':' Send '+(ntype==='sms'?'SMS':ntype==='email'?'Email':ntype==='whatsapp'?'via WhatsApp':ntype==='viber'?'via Viber':'via Messenger')
        )
      )),
      h('div',{className:'card'},h('div',{className:'ch'},h('div',{className:'ct'},'Preview')),h('div',{className:'cb'},
        preview?h(Fragment,null,
          h('div',{style:{display:'flex',alignItems:'center',gap:8,marginBottom:8}},
            h('span',{style:{fontSize:12,color:'var(--md)'}},
              (ntype==='sms'?'📱 SMS to ':'📧 Email to ')+(curA?(ntype==='email'?(curA.email||'no email'):(curA.phone||'no phone')):'')
            )
          ),
          ntype==='email'&&tmpl!=='custom'&&curA
            ? h('div',{className:'npv npv-email',style:{borderRadius:10}},
                h('iframe',{
                  srcDoc: buildNotifHTML(tmpl,curA),
                  sandbox:'allow-same-origin',
                  style:{width:'100%',border:'none',borderRadius:10,minHeight:460,display:'block'}
                })
              )
            : h('div',{className:'notif-card-preview'},
                h('div',{className:'notif-card-header'},
                  h(BrandLogo,{dark:true,width:160})
                ),
                h('div',{className:'notif-card-body'},
                  h('pre',{style:{margin:0,fontFamily:'inherit',fontSize:12.5,lineHeight:1.65,whiteSpace:'pre-wrap',wordBreak:'break-word',color:'var(--dk)'}},preview)
                ),
                h('div',{className:'notif-card-footer'},
                  h('span',{className:'notif-card-footer-brand'},'CYRABELL'),
                  h('span',{className:'notif-card-footer-tag'},'Systems Engineering Solutions')
                )
              ),
          h('div',{style:{fontSize:11,color:'var(--lt)',marginTop:6,display:'flex',gap:12}},
            h('span',null,preview.length+' chars'),
            ntype==='sms'&&h('span',null,'~'+Math.ceil(preview.length/160)+' SMS segment(s)')
          )
        ):h('div',{className:'empty'},'💬\nSelect an appointment and template to preview')
      ))
    ),
    tab==='log'&&h('div',null,
      h('div',{className:'card dt'},h('div',{className:'tw'},h('table',null,
        h('thead',null,h('tr',null,['Type','Recipient','Contact','Message','Sent At','Status'].map(c=>h('th',{key:c},c)))),
        h('tbody',null,notifications.length===0?h('tr',null,h('td',{colSpan:6},h('div',{className:'empty'},'No notifications yet'))):
          pagedNotifs.map(n=>h('tr',{key:n.id},
            h('td',null,h('span',{className:'tag',style:{background:n.type==='sms'?'#e8f5f3':'#e8eeff',color:n.type==='sms'?'var(--t)':'var(--bl)'}},n.type==='sms'?'📱 SMS':'📧 Email')),
            h('td',null,h('strong',null,n.recipient)),
            h('td',{style:{fontSize:12,color:'var(--md)'}},n.type==='sms'?n.phone:n.email),
            h('td',{style:{maxWidth:200,fontSize:12,color:'var(--md)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}},n.message),
            h('td',{style:{fontSize:12,whiteSpace:'nowrap'}},n.sentAt),
            h('td',null,h(SBadge,{status:n.status}))
          ))
        )
      )),h(NotifsPager)),
      h('div',{className:'ml'},
        notifications.length===0&&h('div',{className:'empty'},'No notifications yet'),
        pagedNotifs.map(n=>h('div',{key:n.id,className:'mc'},
          h('div',{className:'mc-top'},
            h('div',null,
              h('div',{className:'mc-nm'},n.recipient),
              h('div',{className:'mc-sb'},n.sentAt+' · '+(n.type==='sms'?'📱 SMS':'📧 Email'))
            ),
            h(SBadge,{status:n.status})
          ),
          h('div',{className:'notif-card-preview',style:{margin:'8px 0 0'}},
            h('div',{className:'notif-card-header'},
              h(BrandLogo,{dark:true,width:150})
            ),
            h('div',{className:'notif-card-body'},
              h('pre',{style:{margin:0,fontFamily:'inherit',fontSize:11.5,lineHeight:1.6,whiteSpace:'pre-wrap',wordBreak:'break-word',color:'var(--dk)',maxHeight:120,overflow:'hidden'}},n.message)
            ),
            h('div',{className:'notif-card-footer'},
              h('span',{className:'notif-card-footer-brand'},'CYRABELL'),
              h('span',{className:'notif-card-footer-tag'},'Systems Engineering Solutions')
            )
          )
        ))
      )
    )
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// RECURRING REMINDERS — Preventive maintenance with multi-channel delivery
// ═══════════════════════════════════════════════════════════════════════════
function ReminderForm({patients,reminder,onClose,onSave}){
  const [f,setF]=useState(reminder||{
    patientId:'',patientName:'',type:'cleaning',channels:['sms','email'],
    frequency:180,notes:'',active:true,
    lastSent:localToday(),
  });
  const s=(k,v)=>setF(x=>({...x,[k]:v}));

  const hp=id=>{
    const p=patients.find(x=>x.id===id);
    s('patientId',id);
    s('patientName',p?p.name:'');
  };

  const ht=type=>{
    s('type',type);
    const t=REMINDER_TYPES[type];
    if(t)s('frequency',t.interval);
  };

  const toggleChannel=(ch)=>{
    if(f.channels.includes(ch)){
      s('channels',f.channels.filter(c=>c!==ch));
    } else {
      s('channels',[...f.channels,ch]);
    }
  };

  const ok = f.patientId && f.type && f.channels.length>0;
  const nextDue = (()=>{
    if(!f.lastSent)return '—';
    const d=new Date(f.lastSent);
    d.setDate(d.getDate()+(+f.frequency||90));
    return toLocalDateStr(d);
  })();

  return h(Modal,{title:reminder?'Edit Reminder':'New Recurring Reminder',
    sub:'Preventive maintenance schedule',onClose,large:true,
    footer:h(Fragment,null,
      h('button',{className:'btn bgh',onClick:onClose},'Cancel'),
      h('button',{className:'btn bp',onClick:()=>ok&&onSave({...f,nextDue}),disabled:!ok},
        reminder?'Update Reminder':'Create Reminder')
    )},
    h(Field,{label:'Patient *'},
      h(PatientSearchInput, {
        patients: patients,
        value: f.patientName,
        placeholder: 'Type patient name or phone…',
        required: true,
        onSelect: (p) => {
          if (p) hp(p.id);
          else { s('patientId',''); s('patientName',''); }
        }
      })
    ),
    h(Field,{label:'Reminder Type *'},
      h('div',{className:'rmnd-type-grid'},
        Object.entries(REMINDER_TYPES).map(([k,t])=>{
          const starterTypes=['cleaning','checkup','custom'];
          const locked=!planHas('allReminderTypes')&&!starterTypes.includes(k);
          return h('div',{
            key:k,
            className:'rmnd-type-card'+(f.type===k?' sel':'')+(locked?' locked':''),
            onClick:locked?undefined:()=>ht(k),
            style:{borderColor:f.type===k?t.color:undefined,opacity:locked?.4:1,cursor:locked?'not-allowed':'pointer',position:'relative'}
          },
            h('div',{className:'rt-icon',style:{background:t.color+'18',color:t.color}},t.icon),
            h('div',{className:'rt-info'},
              h('div',{className:'rt-name'},t.label,locked&&h('span',{style:{fontSize:10,color:'#d4a017',marginLeft:4}},'🔒')),
              h('div',{className:'rt-desc'},'Every '+(t.interval>=365?'year':t.interval>=180?'6 months':t.interval>=90?'3 months':t.interval+' days'))
            )
          );
        })
      )
    ),
    h('div',{className:'fg2'},
      h(Field,{label:'Repeat Every (days) *'},h('input',{type:'number',value:f.frequency,onChange:e=>s('frequency',+e.target.value),min:'1'})),
      h(Field,{label:'Start From'},h('input',{type:'date',value:f.lastSent,onChange:e=>s('lastSent',e.target.value)}))
    ),
    h(Field,{label:'Notification Channels *'},
      h('div',{className:'rmnd-ch-grid'},
        CHANNELS.map(ch=>{
          const sel=f.channels.includes(ch.id);
          const locked=(ch.id==='viber'&&!planHas('viber'))||(ch.id==='messenger'&&!planHas('messenger'));
          return h('button',{
            key:ch.id,type:'button',
            className:'rmnd-ch'+(sel&&!locked?' sel':''),
            onClick:()=>!locked&&toggleChannel(ch.id),
            style:{...(sel&&!locked?{borderColor:ch.color,background:ch.color+'15'}:{}),
                   ...(locked?{opacity:.5,cursor:'not-allowed'}:{})}
          },
            h('span',{style:{fontSize:18}},ch.icon),
            h('span',null,ch.name),
            locked&&h('span',{style:{fontSize:10,fontWeight:700,color:'#d4a017',marginLeft:4}},'🔒'),
            sel&&!locked&&h('span',{style:{marginLeft:'auto',color:ch.color,fontWeight:700}},'✓')
          );
        })
      )
    ),
    h(Field,{label:'Notes (optional)'},
      h('textarea',{value:f.notes,onChange:e=>s('notes',e.target.value),placeholder:'Any special notes…'})
    ),
    h('div',{style:{background:'var(--cr)',borderRadius:10,padding:'12px 14px',fontSize:12.5,marginTop:8}},
      h('div',{style:{color:'var(--md)',marginBottom:4}},'📅 Schedule Preview:'),
      h('div',null,'Next reminder will be sent on ',h('strong',{style:{color:'var(--t)'}},nextDue)),
      f.channels.length>0&&h('div',{style:{marginTop:4}},
        'via ',h('strong',null,f.channels.map(c=>{
          const ch=CHANNELS.find(x=>x.id===c);
          return ch?ch.icon+' '+ch.name:c;
        }).join(', '))
      )
    )
  );
}

function Reminders({reminders,setReminders,reminderLog,setReminderLog,patients,addToast}){
  const [tab,setTab]=useState('active');
  const [search,setSearch]=useState('');
  const [filterType,setFilterType]=useState('all');
  const [modal,setModal]=useState(false);
  const [edit,setEdit]=useState(null);

  const today=localToday();

  const filtered = reminders.filter(r=>{
    if(tab==='active'&&!r.active)return false;
    if(tab==='inactive'&&r.active)return false;
    if(tab==='due'){
      if(!r.active)return false;
      if(r.nextDue>today)return false;
    }
    if(filterType!=='all'&&r.type!==filterType)return false;
    if(search&&!S(r.patientName).toLowerCase().includes(S(search).toLowerCase()))return false;
    return true;
  });

  const dueCount = reminders.filter(r=>r.active&&r.nextDue<=today).length;
  const totalActive = reminders.filter(r=>r.active).length;

  const save = (data)=>{
    if(data.id){
      setReminders(prev=>prev.map(r=>r.id===data.id?{...r,...data}:r));
      addToast('Reminder updated!','success');
    } else {
      setReminders(prev=>[{...data,id:'R'+uid()},...prev]);
      addToast('Recurring reminder created!','success');
    }
    setModal(false);setEdit(null);
  };

  const sendNow = async (reminder, isTest)=>{
    const patient = patients.find(p=>p.id===reminder.patientId);
    if(!patient){addToast('Patient not found','error');return;}
    const type = REMINDER_TYPES[reminder.type];
    if(!type)return;
    let message = type.template(patient);
    if(isTest) message = '🧪 [TEST] ' + message;
    const syncUrl = (function(){try{return localStorage.getItem(LS_KEYS.SYNC_URL)||'';}catch(e){return '';}})();

    if(isTest){
      addToast('🧪 Test send started for '+reminder.patientName+' on '+reminder.channels.length+' channel'+(reminder.channels.length>1?'s':'')+'…','info');
    }

    // Fire each channel and capture status
    const results = await Promise.all(reminder.channels.map(async (ch)=>{
      let status='sent', errMsg='';
      try {
        await sendNotification(ch, patient, message, syncUrl);
      } catch (err) {
        status='failed';
        errMsg=err.message;
      }
      return {
        id:'RL'+uid()+ch,
        reminderId:reminder.id,
        patientId:reminder.patientId,
        patientName:reminder.patientName,
        type:reminder.type,
        channel:ch,
        message:message+(errMsg?'\n[ERROR: '+errMsg+']':''),
        sentAt:new Date().toLocaleString()+(isTest?' (test)':''),
        status:status
      };
    }));
    setReminderLog(prev=>[...results,...prev]);

    // Update next-due date ONLY for real sends (tests don't shift the schedule)
    if(!isTest){
      const newLastSent = today;
      const d=new Date(newLastSent);
      d.setDate(d.getDate()+(+reminder.frequency||90));
      const newNextDue = toLocalDateStr(d);
      setReminders(prev=>prev.map(r=>r.id===reminder.id?{...r,lastSent:newLastSent,nextDue:newNextDue}:r));
    }

    const successCount = results.filter(r=>r.status==='sent').length;
    const failCount = results.length-successCount;
    const prefix = isTest ? '🧪 TEST: ' : '';
    if(failCount===0){
      addToast(prefix+'✓ Sent via '+successCount+' channel'+(successCount>1?'s':'')+' to '+reminder.patientName,'success');
    } else if(successCount===0){
      addToast(prefix+'✕ All '+failCount+' channels failed: see Sent Log for details','error');
    } else {
      addToast(prefix+successCount+' sent, '+failCount+' failed (see log)','info');
    }
  };

  const toggleActive = (id)=>{
    setReminders(prev=>prev.map(r=>r.id===id?{...r,active:!r.active}:r));
    addToast('Reminder updated','success');
  };

  const deleteReminder = (id)=>{
    setReminders(prev=>prev.filter(r=>r.id!==id));
    addToast('Reminder deleted','error');
  };

  const sendAllDue = ()=>{
    const due = reminders.filter(r=>r.active&&r.nextDue<=today);
    if(due.length===0){addToast('No reminders due today','info');return;}
    due.forEach(r=>sendNow(r));
    addToast('🚀 Sent '+due.length+' due reminder'+(due.length>1?'s':'')+'!','success');
  };

  const renderTable = ()=>{
    if(filtered.length===0)return h('div',{className:'empty'},'No reminders found');
    return h(Fragment,null,
      // Desktop table
      h('div',{className:'card dt'},h('div',{className:'tw'},h('table',null,
        h('thead',null,h('tr',null,
          ['Patient','Type','Channels','Frequency','Last Sent','Next Due','Status','Actions'].map(c=>h('th',{key:c},c))
        )),
        h('tbody',null,filtered.map(r=>{
          const type = REMINDER_TYPES[r.type] || REMINDER_TYPES.custom;
          const isDue = r.nextDue<=today;
          const isOverdue = r.nextDue<today;
          return h('tr',{key:r.id},
            h('td',null,h('strong',null,r.patientName)),
            h('td',null,
              h('div',{style:{display:'flex',alignItems:'center',gap:7}},
                h('span',{style:{fontSize:16}},type.icon),
                h('span',null,type.label)
              )
            ),
            h('td',null,
              h('div',{className:'ch-pills'},r.channels.map(c=>{
                const ch=CHANNELS.find(x=>x.id===c);
                if(!ch)return null;
                return h('span',{key:c,className:'ch-pill',title:ch.name,style:{background:ch.color+'20',color:ch.color}},ch.icon);
              }))
            ),
            h('td',null,r.frequency>=365?'Yearly':r.frequency>=180?'Every 6 mo':r.frequency>=90?'Every 3 mo':r.frequency>=30?'Monthly':r.frequency+' days'),
            h('td',{style:{fontSize:12,whiteSpace:'nowrap'}},r.lastSent||'—'),
            h('td',{style:{fontSize:12,whiteSpace:'nowrap',color:isOverdue?'var(--re)':isDue?'var(--or)':'var(--md)',fontWeight:isDue?700:500}},r.nextDue,isDue?(isOverdue?' ⚠':' ⏰'):''),
            h('td',null,r.active?
              h('span',{className:'badge bconf'},h('span',{className:'bdot'}),'Active'):
              h('span',{className:'badge bcanc'},h('span',{className:'bdot'}),'Paused')
            ),
            h('td',null,h('div',{className:'gap8'},
              isDue&&r.active&&h('button',{className:'btn bp bsm',onClick:()=>sendNow(r)},'📤 Send'),
              h('button',{className:'btn bg2 bsm',onClick:()=>sendNow(r,true),title:'Test send — forces send NOW regardless of schedule, does NOT update next due date'},'🧪 Test'),
              h('button',{className:'btn bgh bsm',onClick:()=>{setEdit(r);setModal(true);}},h(Svg,{d:IC.edit,size:13})),
              h('button',{className:'btn bgh bsm',onClick:()=>toggleActive(r.id),title:r.active?'Pause':'Activate'},r.active?'⏸':'▶'),
              h('button',{className:'btn bd2 bsm',onClick:()=>confirmDelete('Delete this reminder?',()=>deleteReminder(r.id))},h(Svg,{d:IC.x,size:13}))
            ))
          );
        }))
      ))),
      // Mobile cards
      h('div',{className:'ml'},filtered.map(r=>{
        const type=REMINDER_TYPES[r.type]||REMINDER_TYPES.custom;
        const isDue=r.nextDue<=today;
        return h('div',{key:r.id,className:'mc'},
          h('div',{className:'mc-top'},
            h('div',null,
              h('div',{className:'mc-nm',style:{display:'flex',alignItems:'center',gap:6}},
                h('span',{style:{fontSize:18}},type.icon),
                r.patientName
              ),
              h('div',{className:'mc-sb'},type.label)
            ),
            r.active?
              h('span',{className:'badge bconf'},h('span',{className:'bdot'}),'Active'):
              h('span',{className:'badge bcanc'},h('span',{className:'bdot'}),'Paused')
          ),
          h('div',{className:'mc-row'},h('span',{className:'mc-lbl'},'Channels'),
            h('div',{className:'ch-pills'},r.channels.map(c=>{
              const ch=CHANNELS.find(x=>x.id===c);
              if(!ch)return null;
              return h('span',{key:c,className:'ch-pill',style:{background:ch.color+'20',color:ch.color}},ch.icon);
            }))
          ),
          h('div',{className:'mc-row'},h('span',{className:'mc-lbl'},'Next due'),h('span',{className:'mc-val',style:{color:isDue?'var(--or)':'var(--md)',fontWeight:isDue?700:500}},r.nextDue+(isDue?' ⏰':''))),
          h('div',{className:'mc-act'},
            isDue&&r.active&&h('button',{className:'btn bp bsm',style:{flex:2},onClick:()=>sendNow(r)},'📤 Send Now'),
            h('button',{className:'btn bg2 bsm',style:{flex:1},onClick:()=>sendNow(r,true),title:'Test send'},'🧪 Test'),
            h('button',{className:'btn bgh bsm',style:{flex:1},onClick:()=>{setEdit(r);setModal(true);}},'Edit'),
            h('button',{className:'btn bgh bsm',style:{flex:1},onClick:()=>toggleActive(r.id)},r.active?'⏸':'▶')
          )
        );
      }))
    );
  };

  const renderLog = ()=>{
    if(reminderLog.length===0)return h('div',{className:'empty'},'No reminders sent yet');
    return h(Fragment,null,
      h('div',{className:'card dt'},h('div',{className:'tw'},h('table',null,
        h('thead',null,h('tr',null,['Patient','Type','Channel','Message','Sent At','Status'].map(c=>h('th',{key:c},c)))),
        h('tbody',null,reminderLog.map(log=>{
          const type=REMINDER_TYPES[log.type]||REMINDER_TYPES.custom;
          const ch=CHANNELS.find(c=>c.id===log.channel)||{name:log.channel,icon:'•',color:'#888'};
          return h('tr',{key:log.id},
            h('td',null,h('strong',null,log.patientName)),
            h('td',null,h('div',{style:{display:'flex',alignItems:'center',gap:6}},h('span',null,type.icon),type.label)),
            h('td',null,h('span',{className:'tag',style:{background:ch.color+'20',color:ch.color}},ch.icon+' '+ch.name)),
            h('td',{style:{maxWidth:200,fontSize:12,color:'var(--md)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}},log.message),
            h('td',{style:{fontSize:12,whiteSpace:'nowrap'}},log.sentAt),
            h('td',null,h(SBadge,{status:log.status}))
          );
        }))
      ))),
      h('div',{className:'ml'},reminderLog.map(log=>{
        const type=REMINDER_TYPES[log.type]||REMINDER_TYPES.custom;
        const ch=CHANNELS.find(c=>c.id===log.channel)||{name:log.channel,icon:'•',color:'#888'};
        return h('div',{key:log.id,className:'mc'},
          h('div',{className:'mc-top'},
            h('div',null,
              h('div',{className:'mc-nm'},log.patientName),
              h('div',{className:'mc-sb'},type.icon+' '+type.label)
            ),
            h('span',{className:'tag',style:{background:ch.color+'20',color:ch.color}},ch.icon+' '+ch.name)
          ),
          h('div',{style:{fontSize:12,color:'var(--md)',marginTop:6,lineHeight:1.5}},log.message.slice(0,100)+(log.message.length>100?'…':'')),
          h('div',{className:'mc-row'},h('span',{className:'mc-lbl'},'Sent'),h('span',{className:'mc-val',style:{fontSize:11}},log.sentAt))
        );
      }))
    );
  };

  const [autoTrigger, setAutoTrigger] = useState(reminderAutoEnabled());
  const toggleAutoTrigger = () => {
    const v = !autoTrigger;
    try { localStorage.setItem(LS_KEYS.REMINDER_AUTO, v?'true':'false'); } catch(e) {}
    setAutoTrigger(v);
    addToast(v ? '⏰ Daily auto-trigger enabled' : 'Daily auto-trigger disabled', 'info');
  };
  const forceRunNow = async () => {
    if (!confirm('Run reminder trigger now? This will send all DUE reminders immediately.')) return;
    // Force-reset the "last run today" so trigger isn't skipped
    try { localStorage.setItem(LS_KEYS.REMINDER_LAST_RUN, ''); } catch(e) {}
    await runDailyReminderTrigger(reminders, patients, setReminders, setReminderLog, addToast);
  };

  return h('div',null,
    h('div',{className:'ph'},
      h('div',null,h('div',{className:'ptl'},'Reminders'),h('div',{className:'psl'},'Automated patient recall — '+totalActive+' active')),
      h('div',{className:'ph-act'},
        dueCount>0&&h('button',{className:'btn bg2',onClick:sendAllDue,title:'Send all due reminders now'},'⚡ Send All Due ('+dueCount+')'),
        h('button',{className:'btn bgh',onClick:forceRunNow,title:'Run the daily trigger right now (sends all due)'},'⏰ Run Trigger Now'),
        h('button',{className:'btn bp',onClick:()=>{setEdit(null);setModal(true);}},h(Svg,{d:IC.plus,size:14}),' New Reminder')
      )
    ),

    // Daily auto-trigger toggle banner
    h('div', {className: 'autoconfirm-banner ' + (autoTrigger ? 'on' : '')},
      h('div', {style: {display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap'}},
        h('label', {className: 'switch', style: {margin: 0}},
          h('input', {type: 'checkbox', checked: autoTrigger, onChange: toggleAutoTrigger}),
          h('span', {className: 'slider'})
        ),
        h('div', {style: {flex: 1, minWidth: 200}},
          h('div', {style: {fontWeight: 600, fontSize: 13}},
            autoTrigger ? '⏰ Daily auto-send ON' : '⏰ Daily auto-send OFF'
          ),
          h('div', {style: {fontSize: 11.5, color: 'var(--md)', marginTop: 2}},
            autoTrigger
              ? 'Reminders auto-send at app launch + every 6 hours.'
              : 'Reminders only fire when you click Send manually.'
          )
        )
      )
    ),

    // Top summary cards
    h('div',{className:'sg sg4'},
      [
        ['Active',totalActive,'#e8f5f3','#0a7c6e','▶'],
        ['Due Now',dueCount,'#fff7e6','#d97706','⏰'],
        ['Total Sent',reminderLog.length,'#e8eeff','#3a7bd5','✉️'],
        ['Channels',CHANNELS.length,'#f0e8ff','#7c3aed','📡'],
      ].map(([l,v,bg,c,ic])=>
        h('div',{key:l,className:'sc'},
          h('div',{className:'si',style:{background:bg}},h('span',{style:{fontSize:22}},ic)),
          h('div',{style:{minWidth:0}},
            h('div',{className:'sv'},v),
            h('div',{className:'sl'},l)
          )
        )
      )
    ),

    h('div',{className:'tabs'},
      [['active','Active ('+totalActive+')'],['due','⏰ Due ('+dueCount+')'],['inactive','Paused'],['log','📋 Sent Log ('+reminderLog.length+')']].map(([v,l])=>
        h('button',{key:v,className:'tab'+(tab===v?' act':''),onClick:()=>setTab(v)},l)
      )
    ),

    tab!=='log'&&h(Fragment,null,
      h('div',{className:'filters'},
        h('button',{className:'fb'+(filterType==='all'?' act':''),onClick:()=>setFilterType('all')},'All Types'),
        Object.entries(REMINDER_TYPES).map(([k,t])=>{
          const starterTypes=['cleaning','checkup','custom'];
          const locked=!planHas('allReminderTypes')&&!starterTypes.includes(k);
          return h('button',{key:k,className:'fb'+(filterType===k?' act':''),
            onClick:locked?undefined:()=>setFilterType(k),
            disabled:locked,
            title:locked?'Professional plan required':undefined,
            style:locked?{opacity:0.4,cursor:'not-allowed'}:undefined
          },t.icon+' '+t.label+(locked?' 🔒':''));
        })
      ),
      h('div',{className:'tsr',style:{width:'100%',maxWidth:320,marginBottom:14}},
        h(Svg,{d:IC.search,size:13,color:'var(--lt)'}),
        h('input',{placeholder:'Search patient name…',value:search,onChange:e=>setSearch(e.target.value)})
      )
    ),

    tab==='log'?renderLog():renderTable(),

    modal&&h(ReminderForm,{patients,reminder:edit,onClose:()=>{setModal(false);setEdit(null);},onSave:save})
  );
}



// ═══════════════════════════════════════════════════════════════════════════
// ☁️ SYNC — Google Sheets (via Apps Script) + Local Excel (.xlsx)
// ═══════════════════════════════════════════════════════════════════════════

// localStorage helper that won't crash in restricted environments



// ═══════════════════════════════════════════════════════════════════════════
// 📅 DATE / TIME FORMATTING HELPERS
