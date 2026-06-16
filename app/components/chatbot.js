// ═══════════════════════════════════════════════════════════════════════════

function buildChatbot(existingAppointments){
  // ── Knowledge base ────────────────────────────────────────────────────
  const KB = [
    // Greetings
    {p:/^(hi|hello|hey|good\s*(morning|afternoon|evening)|howdy)/i,
     r:()=>'Hello! 👋 Welcome to Cyrabell Dental Clinic. I\'m your virtual assistant. How can I help you today?\n\nYou can ask me about:\n• Available appointment slots\n• Our dental services and fees\n• How to book an appointment\n• Clinic hours and location\n• What to bring to your visit'},

    // Hours
    {p:/hour|open|schedule|when.*open|clinic.*time|time.*clinic/i,
     r:()=>'🕐 **Clinic Hours**\n\nMonday – Friday: 8:00 AM – 6:00 PM\nSaturday: 8:00 AM – 12:00 PM\nSunday: Closed\n\nWe are closed on public holidays. For emergencies, please call us directly.'},

    // Location
    {p:/where|location|address|find you|directions|map/i,
     r:()=>'📍 **Our Location**\n\nCyrabell Dental Clinic\nPlease contact us for the exact address.\n\nYou can also call or message us for directions.'},

    // Contact
    {p:/contact|phone|number|call|email|reach/i,
     r:()=>'📞 **Contact Us**\n\nPhone: Please ask the front desk for our contact number.\nYou can also book directly through this online form.\n\nWould you like to book an appointment now?'},

    // Services list
    {p:/service|offer|treatment|procedure|what.*do|dental|teeth|tooth/i,
     r:()=>{
       const svcs=getActiveSvcs().slice(0,10);
       if(!svcs.length) return 'We offer a full range of dental services. Please contact us or book an appointment for a consultation.';
       const list=svcs.map(s=>'• '+s.name+(s.fee?' — ₱'+p$(s.fee):'')).join('\n');
       return '🦷 **Our Services**\n\n'+list+(getActiveSvcs().length>10?'\n\n...and more! Contact us for the full list.':'')+'\n\nWould you like to book any of these?';
     }},

    // Fees / cost
    {p:/fee|cost|price|how much|rate|payment|pay/i,
     r:()=>{
       const svcs=getActiveSvcs().slice(0,8);
       if(!svcs.length) return 'Our fees vary by procedure. Please contact us for a quote, or book a consultation.';
       const list=svcs.filter(s=>s.fee).map(s=>'• '+s.name+': ₱'+p$(s.fee)).join('\n');
       return '💰 **Service Fees**\n\n'+list+'\n\nFees may vary depending on your specific case. We accept cash, credit/debit cards, and other payment methods.';
     }},

    // Available slots
    {p:/slot|available|free|open.*appoint|book.*when|when.*book|time.*slot|schedule.*appoint/i,
     r:()=>{
       const appts=existingAppointments||[];
       const today=localToday();
       const slots=['08:00','09:00','10:00','11:00','13:00','14:00','15:00','16:00','17:00'];
       const next5Days=[];
       for(let i=0;i<7;i++){
         const d=new Date(); d.setDate(d.getDate()+i);
         const dow=d.getDay();
         if(dow===0) continue; // closed Sunday
         const dateStr=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
         const daySlots=dow===6?slots.slice(0,4):slots; // Sat half-day
         const taken=appts.filter(a=>a.date===dateStr&&a.status!=='cancelled').map(a=>a.time);
         const avail=daySlots.filter(s=>!taken.includes(s));
         if(avail.length>0) next5Days.push({dateStr,dow,avail});
         if(next5Days.length>=4) break;
       }
       if(!next5Days.length) return 'It looks like we\'re fully booked for the next few days. Please call us or check back later.';
       const dayNames=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
       const lines=next5Days.map(d=>{
         const dname=dayNames[d.dow];
         const slots2=d.avail.slice(0,4).map(s=>fmtTime(s)).join(', ')+(d.avail.length>4?' +more':'');
         return '📅 **'+dname+' '+d.dateStr+'**: '+slots2;
       });
       return '✅ **Available Slots (Next Few Days)**\n\n'+lines.join('\n')+'\n\nTo book, tap "Book Appointment" and follow the steps!';
     }},

    // How to book
    {p:/how.*book|book.*how|steps|guide|process|appoint.*process/i,
     r:()=>'📋 **How to Book an Appointment**\n\n1️⃣ **Personal Info** — Enter your name, phone, and contact details\n2️⃣ **Choose Service** — Select the dental service you need\n3️⃣ **Pick a Date & Time** — Choose from available slots\n4️⃣ **Review & Submit** — Confirm your details\n\nYou\'ll receive a confirmation and our team will reach out to confirm your booking!\n\nReady? Tap **"Book Appointment"** on the home screen.'},

    // First visit / what to bring
    {p:/first|new patient|bring|prepare|what.*need|required|document/i,
     r:()=>'📝 **For Your First Visit**\n\nPlease bring:\n• Valid ID (for new patients)\n• Any previous dental X-rays (if available)\n• List of current medications or allergies\n• Insurance card (if applicable)\n\nArrive 10–15 minutes early to complete your patient form. You can also provide this information when booking online!'},

    // Emergency
    {p:/emergency|urgent|pain|toothache|broken|crack|bleed|severe/i,
     r:()=>'🚨 **Dental Emergency?**\n\nFor severe pain or dental emergencies, please:\n1. Call our clinic directly for an urgent slot\n2. If outside clinic hours and the pain is unbearable, visit the nearest hospital emergency room\n\nCommon emergencies we handle:\n• Severe toothache\n• Knocked-out or broken tooth\n• Lost filling or crown\n• Dental abscess / swelling\n\nWe\'ll do our best to see you as soon as possible!'},

    // Kids / children
    {p:/child|kid|baby|pediatric|children|toddler|minor/i,
     r:()=>'👶 **Pediatric Dental Care**\n\nYes, we welcome patients of all ages including children!\n\nWe recommend:\n• First dental visit by age 1 or when first tooth appears\n• Routine check-ups every 6 months\n• Sealants and fluoride treatments for cavity prevention\n\nOur team is friendly and experienced with young patients.'},

    // Insurance
    {p:/insurance|hmo|philhealth|coverage|insur/i,
     r:()=>'🏥 **Insurance & HMO**\n\nWe accept various HMO and insurance plans. Please contact us directly to verify if your specific plan is accepted.\n\nPayment methods we accept:\n• Cash\n• Credit / Debit Cards\n• HMO (select plans)\n• Bank transfer\n\nFor insurance billing, please bring your insurance card and member ID.'},

    // Cancellation / rescheduling
    {p:/cancel|reschedule|change.*appoint|move.*appoint|postpone/i,
     r:()=>'📅 **Cancellation & Rescheduling**\n\nNeed to change your appointment? No problem!\n\n• Please notify us at least 24 hours in advance\n• Contact us by phone or visit the clinic\n• We\'ll help you find the next available slot\n\nNo-shows may affect your ability to book priority slots in the future.'},

    // Thanks / bye
    {p:/thank|thanks|bye|goodbye|see you|that.*all|no.*more/i,
     r:()=>'😊 Thank you for chatting with us! We look forward to seeing you at Cyrabell Dental Clinic.\n\nDon\'t forget to book your appointment if you haven\'t yet. Have a great day! 🦷✨'},

    // Booking status
    {p:/status|confirmed|pending|appointment.*status|check.*booking/i,
     r:()=>'🔍 **Check Your Appointment Status**\n\nIf you\'ve already booked, our team will contact you to confirm your appointment via phone or email.\n\nFor urgent inquiries about your booking, please call us directly.'},
  ];

  function respond(text){
    const t=(text||'').trim();
    if(!t) return null;
    for(const rule of KB){
      if(rule.p.test(t)){
        return typeof rule.r==='function'?rule.r():rule.r;
      }
    }
    // Fallback
    const lower=t.toLowerCase();
    if(lower.length<3) return 'Could you tell me a bit more? I\'m here to help! 😊';
    return 'I\'m not sure about that, but I\'d be happy to help with:\n\n• 📅 Available appointment slots\n• 🦷 Our dental services\n• 💰 Fees and payment\n• 🕐 Clinic hours\n• 📋 How to book an appointment\n\nWhat would you like to know?';
  }

  return {respond};
}

// ── Markdown-lite renderer (bold, bullets, newlines) ──────────────────────
function ChatMd({text}){
  const lines=(text||'').split('\n');
  return h('div',{style:{lineHeight:1.55,fontSize:13}},
    lines.map((line,i)=>{
      // Bold **text**
      const parts=line.split(/\*\*(.*?)\*\*/g);
      const rendered=parts.map((p,j)=>j%2===1?h('strong',{key:j},p):p);
      // Bullet lines
      if(line.startsWith('• ')||line.startsWith('•\t')){
        return h('div',{key:i,style:{paddingLeft:12,marginTop:2}},'• ',rendered.slice(1));
      }
      if(line===''&&i<lines.length-1) return h('div',{key:i,style:{height:6}});
      return h('div',{key:i},rendered);
    })
  );
}

function PatientChatbot({existingAppointments, onBook, minimal}){
  const [open,setOpen]=useState(false);
  const [msgs,setMsgs]=useState([
    {role:'bot',text:'Hi there! 👋 I\'m **Cara**, your Cyrabell Dental assistant.\n\nHow can I help you today? You can ask me about our services, available slots, fees, or how to book an appointment!',ts:Date.now()}
  ]);
  const [input,setInput]=useState('');
  const [typing,setTyping]=useState(false);
  const bottomRef=useRef(null);
  const inputRef=useRef(null);
  const bot=useMemo(()=>buildChatbot(existingAppointments),[existingAppointments]);

  const QUICK=[
    '📅 Available slots','🦷 Services & fees','📋 How to book','🕐 Clinic hours','🚨 Emergency visit','📝 First visit tips'
  ];

  useEffect(()=>{
    if(open && bottomRef.current) bottomRef.current.scrollIntoView({behavior:'smooth'});
  },[msgs,open]);

  useEffect(()=>{
    if(open && inputRef.current) inputRef.current.focus();
  },[open]);

  const send=(text)=>{
    const t=(text||input).trim();
    if(!t) return;
    setInput('');
    setMsgs(m=>[...m,{role:'user',text:t,ts:Date.now()}]);
    setTyping(true);
    setTimeout(()=>{
      const reply=bot.respond(t)||'I\'m here to help! Ask me anything about our clinic. 😊';
      setMsgs(m=>[...m,{role:'bot',text:reply,ts:Date.now()}]);
      setTyping(false);
    }, 600 + Math.random()*400);
  };

  const handleKey=(e)=>{
    if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}
  };

  // Floating bubble
  if(!open) return h('button',{
    onClick:()=>setOpen(true),
    style:{
      position:'fixed',bottom:24,right:24,zIndex:999,
      width:56,height:56,borderRadius:'50%',border:'none',cursor:'pointer',
      background:'linear-gradient(135deg,#0a7c6e,#0891b2)',
      boxShadow:'0 4px 20px rgba(10,124,110,.45)',
      display:'flex',alignItems:'center',justifyContent:'center',
      fontSize:24,transition:'transform .15s',
    },
    onMouseEnter:e=>{e.currentTarget.style.transform='scale(1.08)';},
    onMouseLeave:e=>{e.currentTarget.style.transform='scale(1)';},
    title:'Chat with Cara — Dental Assistant',
  },'🦷');

  // Chat window
  return h('div',{style:{
    position:'fixed',bottom:24,right:24,zIndex:999,
    width:360,maxWidth:'calc(100vw - 32px)',
    borderRadius:18,overflow:'hidden',
    boxShadow:'0 8px 40px rgba(0,0,0,.22)',
    display:'flex',flexDirection:'column',
    maxHeight:'80vh',
    background:'#fff',
    border:'1px solid #e2e8f0',
  }},
    // Header
    h('div',{style:{
      background:'linear-gradient(135deg,#0a7c6e,#0891b2)',
      padding:'14px 16px',color:'#fff',
      display:'flex',alignItems:'center',gap:10,
      flexShrink:0,
    }},
      h('div',{style:{
        width:36,height:36,borderRadius:'50%',background:'rgba(255,255,255,.25)',
        display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0,
      }},'🦷'),
      h('div',{style:{flex:1,minWidth:0}},
        h('div',{style:{fontWeight:700,fontSize:14}},'Cara'),
        h('div',{style:{fontSize:11,opacity:.8,display:'flex',alignItems:'center',gap:4}},
          h('div',{style:{width:6,height:6,borderRadius:'50%',background:'#4ade80'}}),
          'Cyrabell Dental Assistant · Online'
        )
      ),
      h('button',{onClick:()=>setOpen(false),style:{
        background:'none',border:'none',color:'#fff',cursor:'pointer',
        fontSize:18,opacity:.8,padding:4,lineHeight:1,
      }},'✕')
    ),

    // Messages
    h('div',{style:{
      flex:1,overflowY:'auto',padding:'14px 12px',
      display:'flex',flexDirection:'column',gap:10,
      background:'#f8fafc',
    }},
      msgs.map((m,i)=>h('div',{key:i,style:{
        display:'flex',flexDirection:'column',
        alignItems:m.role==='user'?'flex-end':'flex-start',
      }},
        h('div',{style:{
          maxWidth:'85%',padding:'10px 13px',
          borderRadius:m.role==='user'?'16px 16px 4px 16px':'16px 16px 16px 4px',
          background:m.role==='user'?'linear-gradient(135deg,#0a7c6e,#0891b2)':'#fff',
          color:m.role==='user'?'#fff':'#1e293b',
          boxShadow:'0 1px 4px rgba(0,0,0,.08)',
          border:m.role==='bot'?'1px solid #e2e8f0':'none',
        }},
          m.role==='bot'?h(ChatMd,{text:m.text}):h('span',{style:{fontSize:13}},m.text)
        )
      )),
      typing && h('div',{style:{display:'flex',alignItems:'flex-start'}},
        h('div',{style:{
          padding:'10px 14px',borderRadius:'16px 16px 16px 4px',
          background:'#fff',border:'1px solid #e2e8f0',
          boxShadow:'0 1px 4px rgba(0,0,0,.08)',
          display:'flex',gap:4,alignItems:'center',
        }},
          [0,1,2].map(j=>h('div',{key:j,style:{
            width:7,height:7,borderRadius:'50%',background:'#94a3b8',
            animation:`chatdot 1.2s ${j*0.2}s ease-in-out infinite`,
          }}))
        )
      ),
      h('div',{ref:bottomRef})
    ),

    // Quick replies
    msgs.length<=2 && h('div',{style:{
      padding:'8px 10px',borderTop:'1px solid #f1f5f9',background:'#fff',
      display:'flex',gap:6,flexWrap:'wrap',flexShrink:0,
    }},
      QUICK.map((q,i)=>h('button',{key:i,onClick:()=>send(q),style:{
        fontSize:11,padding:'4px 10px',borderRadius:20,border:'1px solid #cbd5e1',
        background:'#f8fafc',color:'#475569',cursor:'pointer',fontFamily:'inherit',
        transition:'background .1s',
      },
      onMouseEnter:e=>{e.currentTarget.style.background='#e2e8f0';},
      onMouseLeave:e=>{e.currentTarget.style.background='#f8fafc';},
      },q))
    ),

    // Book CTA (after a few messages)
    msgs.length>=3 && onBook && h('div',{style:{padding:'8px 12px',borderTop:'1px solid #f1f5f9',background:'#fff',flexShrink:0}},
      h('button',{onClick:onBook,style:{
        width:'100%',padding:'9px',borderRadius:10,border:'none',cursor:'pointer',
        background:'linear-gradient(135deg,#0a7c6e,#0891b2)',color:'#fff',
        fontWeight:700,fontSize:13,fontFamily:'inherit',
      }},'📅 Book an Appointment Now →')
    ),

    // Input
    h('div',{style:{
      padding:'10px 12px',borderTop:'1px solid #e2e8f0',background:'#fff',
      display:'flex',gap:8,alignItems:'flex-end',flexShrink:0,
    }},
      h('textarea',{
        ref:inputRef,
        value:input,
        onChange:e=>setInput(e.target.value),
        onKeyDown:handleKey,
        placeholder:'Ask me anything...',
        rows:1,
        style:{
          flex:1,resize:'none',border:'1px solid #e2e8f0',borderRadius:10,
          padding:'8px 11px',fontSize:13,fontFamily:'inherit',outline:'none',
          background:'#f8fafc',lineHeight:1.4,maxHeight:80,overflowY:'auto',
          color:'#1e293b',
        },
        onInput:e=>{e.target.style.height='auto';e.target.style.height=Math.min(e.target.scrollHeight,80)+'px';},
      }),
      h('button',{
        onClick:()=>send(),
        disabled:!input.trim(),
        style:{
          width:38,height:38,borderRadius:10,border:'none',cursor:'pointer',
          background:input.trim()?'linear-gradient(135deg,#0a7c6e,#0891b2)':'#e2e8f0',
          color:input.trim()?'#fff':'#94a3b8',
          display:'flex',alignItems:'center',justifyContent:'center',
          fontSize:16,flexShrink:0,transition:'background .15s',
        }
      },'➤')
    )
  );
}

