// ─── PAYMENTS ─────────────────────────────────────────────────────────────────
// PayForm variant that accepts an optional prefill (used when paying from an appointment)
function PayFormPrefilled({patients,prefill,onClose,onSave}){
  const [f,setF]=useState({patientId:'',patientName:'',services:[],service:'',...(prefill||{}),amount:prefill?.amount||'',method:prefill?.method||'Cash',date:prefill?.date||localToday()});
  const s=(k,v)=>setF(x=>({...x,[k]:v}));
  const ok=f.patientId&&svcList(f).length>0&&f.amount;
  return h(Modal,{title:'Record Payment',sub:'Enter payment details',onClose,
    footer:h(Fragment,null,h('button',{className:'btn bgh',onClick:onClose},'Cancel'),h('button',{className:'btn bg2',onClick:()=>ok&&onSave(f),disabled:!ok},'Record'))},
    h(Field,{label:'Patient *'},
      h(PatientSearchInput, {
        patients: patients,
        value: f.patientName,
        placeholder: 'Type patient name or phone number…',
        required: true,
        onSelect: (p) => {
          if (p) { s('patientId',p.id); s('patientName',p.name); }
          else { s('patientId',''); s('patientName',''); }
        }
      })
    ),
    h(Field,{label:'Services *'},
      h('div',{className:'svc-tags-wrap'},
        svcList(f).map((sv,i)=>h('span',{key:i,className:'svc-tag'},sv,
          h('button',{type:'button',onClick:()=>{
            const next=svcList(f).filter(x=>x!==sv);
            const amt=next.reduce((sum,nm)=>{const x=getActiveSvcs().find(a=>a.name===nm);return sum+(x?+x.fee:0);},0);
            setF(x=>({...x,services:next,service:next[0]||'',amount:amt||x.amount}));
          }},'×')
        )),
        h('select',{value:'',className:'svc-add-select',onChange:e=>{
          const n=e.target.value;if(!n)return;
          const cur=svcList(f);if(cur.includes(n))return;
          const next=[...cur,n];
          const amt=next.reduce((sum,nm)=>{const x=getActiveSvcs().find(a=>a.name===nm);return sum+(x?+x.fee:0);},0);
          setF(x=>({...x,services:next,service:next[0]||'',amount:amt}));
        }},
          h('option',{value:''},'＋ Add service…'),
          Object.entries(getActiveSvcsByCat()).map(([cat,svcs])=>
            h('optgroup',{key:cat,label:cat},
              svcs.map(sv=>h('option',{key:sv.name,value:sv.name},sv.name+' — ₱'+p$(sv.fee)))
            )
          )
        )
      )
    ),
    h('div',{className:'fg2'},
      h(Field,{label:'Amount (₱)'},h('input',{type:'number',value:f.amount,onChange:e=>s('amount',+e.target.value),placeholder:'0'})),
      h(Field,{label:'Method'},h('select',{value:f.method,onChange:e=>s('method',e.target.value)},METHODS.map(m=>h('option',{key:m},m))))
    ),
    h(Field,{label:'Date'},h('input',{type:'date',value:f.date,onChange:e=>s('date',e.target.value)}))
  );
}
function PayForm({patients,onClose,onSave}){
  const [f,setF]=useState({patientId:'',patientName:'',services:[],service:'',amount:'',method:'Cash',date:localToday()});
  const s=(k,v)=>setF(x=>({...x,[k]:v}));
  const ok=f.patientId&&svcList(f).length>0&&f.amount;
  return h(Modal,{title:'Record Payment',sub:'Enter payment details',onClose,
    footer:h(Fragment,null,h('button',{className:'btn bgh',onClick:onClose},'Cancel'),h('button',{className:'btn bg2',onClick:()=>ok&&onSave(f),disabled:!ok},'Record'))},
    h(Field,{label:'Patient *'},
      h(PatientSearchInput, {
        patients: patients,
        value: f.patientName,
        placeholder: 'Type patient name or phone number…',
        required: true,
        onSelect: (p) => {
          if (p) {
            s('patientId',   p.id);
            s('patientName', p.name);
          } else {
            s('patientId', '');
            s('patientName', '');
          }
        }
      })
    ),
    h(Field,{label:'Services *'},
      h('div',{className:'svc-tags-wrap'},
        svcList(f).map((sv,i)=>h('span',{key:i,className:'svc-tag'},sv,
          h('button',{type:'button',onClick:()=>{
            const next=svcList(f).filter(x=>x!==sv);
            const amt=next.reduce((sum,nm)=>{const x=getActiveSvcs().find(a=>a.name===nm);return sum+(x?+x.fee:0);},0);
            setF(x=>({...x,services:next,service:next[0]||'',amount:amt||x.amount}));
          }},'×')
        )),
        h('select',{value:'',className:'svc-add-select',onChange:e=>{
          const n=e.target.value;if(!n)return;
          const cur=svcList(f);if(cur.includes(n))return;
          const next=[...cur,n];
          const amt=next.reduce((sum,nm)=>{const x=getActiveSvcs().find(a=>a.name===nm);return sum+(x?+x.fee:0);},0);
          setF(x=>({...x,services:next,service:next[0]||'',amount:amt}));
        }},
          h('option',{value:''},'＋ Add service…'),
          Object.entries(getActiveSvcsByCat()).map(([cat,svcs])=>
            h('optgroup',{key:cat,label:cat},
              svcs.map(sv=>h('option',{key:sv.name,value:sv.name},sv.name+' — ₱'+p$(sv.fee)))
            )
          )
        )
      )
    ),
    h('div',{className:'fg2'},
      h(Field,{label:'Amount (₱)'},h('input',{type:'number',value:f.amount,onChange:e=>s('amount',+e.target.value),placeholder:'0'})),
      h(Field,{label:'Method'},h('select',{value:f.method,onChange:e=>s('method',e.target.value)},METHODS.map(m=>h('option',{key:m},m))))
    ),
    h(Field,{label:'Date'},h('input',{type:'date',value:f.date,onChange:e=>s('date',e.target.value)}))
  );
}
function ReceiptView({pay,onClose}){
  return h(Modal,{title:'Payment Receipt',onClose,footer:h(Fragment,null,h('button',{className:'btn bgh',onClick:onClose},'Close'),h('button',{className:'btn bp',onClick:()=>window.print()},'🖨️ Print'))},
    h('div',{className:'rc'},
      h('div',{className:'rh'},
        h('div',{style:{marginBottom:4}},h(BrandLogo,{dark:false,width:180})),
        h('div',{style:{fontSize:11,color:'var(--md)',marginTop:3}},'Official Payment Receipt')
      ),
      [['Receipt No.',pay.ref],['Patient',pay.patientName],['Service',svcStr(pay)],['Method',pay.method],['Date',pay.date]].map(([l,v])=>h('div',{key:l,className:'rr'},h('span',{className:'rr-l'},l),h('span',{className:'rr-v'},v))),
      h('div',{className:'rr rtot'},h('span',null,'Total Paid'),h('span',null,'₱'+p$(pay.amount))),
      h('div',{style:{textAlign:'center',marginTop:14,fontSize:12,color:'var(--lt)'}},'Thank you for choosing Simplified Dental Clinic! 🙏')
    )
  );
}
function Payments({payments,setPayments,patients,appointments,setAppointments,addToast,syncUrl}){
  const [filter,setFilter]=useState('all');
  const [modal,setModal]=useState(false);
  const [receipt,setReceipt]=useState(null);
  const [prefill,setPrefill]=useState(null);
  const [payingApptId,setPayingApptId]=useState(null);
  const [dupState,setDupState]=useState(null);
  const filtered=payments.filter(p=>filter==='all'||p.status===filter);
  const { pageItems: pagedPayments, PagerUI: PaymentsPager } = usePagination(filtered);
  const paid=payments.filter(p=>p.status==='paid').reduce((s,p)=>s+p.amount,0);
  const unpaid=payments.filter(p=>p.status==='unpaid').reduce((s,p)=>s+p.amount,0);
  const paidKeys = new Set(payments.map(p=>p.patientId+'|'+p.service+p.date));
  const pendingAppts = safe(appointments).filter(a=>
    a.status==='pending' && !paidKeys.has(a.patientId+'|'+a.service+a.date)
  );

  const commitNewPayment = async (n) => {
    // Local duplicate check (same patient + service + date + amount)
    const localDup = payments.find(p =>
      p.patientId === n.patientId && p.service === n.service &&
      p.date === n.date && String(p.amount) === String(n.amount) && p.id !== n.id
    );
    if (localDup) {
      setDupState({
        existing: localDup,
        onUpdate: () => {
          const merged = {...localDup, ...n, id: localDup.id};
          setPayments(prev => prev.map(p => p.id === localDup.id ? merged : p));
          syncOneRecord('payments', merged, syncUrl);
          setReceipt(merged);
          addToast('Updated existing payment record', 'success');
          setModal(false); setPrefill(null); setPayingApptId(null); setDupState(null);
        },
        onCancel: () => {
          setDupState(null);
          setPayments(p => [n, ...p]);
          syncOneRecord('payments', n, syncUrl);
          setReceipt(n);
          setModal(false); setPrefill(null); setPayingApptId(null);
        }
      });
      return;
    }
    // Sheets duplicate check
    if (syncUrl && n.patientId && n.date) {
      try {
        const sheetDup = await checkSheetsDuplicate('payments',
          { patientId: S(n.patientId), date: S(n.date), service: S(n.service) }, n.id, syncUrl);
        if (sheetDup && sheetDup.id) {
          setDupState({
            existing: sheetDup,
            onUpdate: () => {
              const merged = {...sheetDup, ...n, id: sheetDup.id};
              setPayments(prev => {
                const found = prev.some(p => p.id === sheetDup.id);
                return found ? prev.map(p => p.id === sheetDup.id ? merged : p) : [merged, ...prev];
              });
              syncOneRecord('payments', merged, syncUrl);
              setReceipt(merged);
              addToast('Updated existing payment from Sheets', 'success');
              setModal(false); setPrefill(null); setPayingApptId(null); setDupState(null);
            },
            onCancel: () => {
              setDupState(null);
              setPayments(p => [n, ...p]);
              syncOneRecord('payments', n, syncUrl);
              setReceipt(n);
              setModal(false); setPrefill(null); setPayingApptId(null);
            }
          });
          return;
        }
      } catch(e) { /* proceed */ }
    }
    setPayments(p => [n, ...p]);
    syncOneRecord('payments', n, syncUrl);
    setReceipt(n);
    setModal(false); setPrefill(null); setPayingApptId(null);
  };

  const save = d => {
    if (d._replaceId) {
      const updated = {method:d.method,amount:d.amount,date:d.date,status:'paid'};
      setPayments(prev=>prev.map(p=>p.id===d._replaceId?{...p,...updated}:p));
      const existing = payments.find(p=>p.id===d._replaceId);
      const finalPay = existing ? {...existing,...updated} : updated;
      if (existing) { setReceipt(finalPay); syncOneRecord('payments', finalPay, syncUrl); }
      addToast('₱'+p$(d.amount)+' marked as paid!','success');
      setModal(false); setPrefill(null); setPayingApptId(null);
    } else {
      const n={...d,id:'PAY'+uid(),ref:'REF-'+Math.random().toString(36).substr(2,6).toUpperCase(),status:'paid'};
      if (payingApptId && setAppointments) {
        setAppointments(prev=>prev.map(a=>a.id===payingApptId?{...a,status:'completed'}:a));
      }
      addToast('₱'+p$(d.amount)+' recorded!','success');
      commitNewPayment(n);
    }
  };
  // Mark an existing pending payment record as paid (method chooser via modal)
  const payRecord = (p) => {
    setPrefill({patientId:p.patientId,patientName:p.patientName,service:p.service,amount:p.amount,method:'Cash',date:localToday(),_replaceId:p.id});
    setModal(true);
  };
  const openPayForAppt = (a) => {
    setPayingApptId(a.id);
    setPrefill({patientId:a.patientId,patientName:a.patientName,services:svcList(a),service:svcList(a)[0]||a.service,amount:a.fee||'',method:'Cash',date:localToday()});
    setModal(true);
  };
  return h('div',null,
    h('div',{className:'ph'},
      h('div',null,h('div',{className:'ptl'},'Payments'),h('div',{className:'psl'},'Track all dental service payments')),
      h('div',{className:'ph-act'},h('button',{className:'btn bg2',onClick:()=>{setPrefill(null);setModal(true);}},h(Svg,{d:IC.plus,size:14}),' Record'))
    ),
    h('div',{className:'sg sg3'},
      [['Collected','₱'+p$(paid),'#e6f7f3','#3aa876'],['Outstanding','₱'+p$(unpaid),'#fdeaea','#e05252'],['Total',payments.length,'#e8eeff','#3a7bd5']].map(([l,v,bg,c])=>
        h('div',{key:l,className:'sc'},h('div',{className:'si',style:{background:bg}},h(Svg,{d:IC.credit,color:c,size:20})),h('div',null,h('div',{className:'sv'},v),h('div',{className:'sl'},l)))
      )
    ),
    // ── Pending appointments awaiting payment ────────────────────────────
    pendingAppts.length>0 && h('div',{className:'card',style:{marginBottom:16,padding:'14px 18px'}},
      h('div',{style:{fontWeight:700,fontSize:13,color:'var(--dk)',marginBottom:10,display:'flex',alignItems:'center',gap:6}},
        h('span',{style:{background:'#fef3c7',color:'#b45309',padding:'2px 8px',borderRadius:20,fontSize:11,fontWeight:700}},'⏳ PENDING'),
        ' Appointments Awaiting Payment'
      ),
      h('div',{className:'tw'},h('table',null,
        h('thead',null,h('tr',null,['Patient','Service','Fee','Date','Time','Dentist',''].map(c=>h('th',{key:c},c)))),
        h('tbody',null,pendingAppts.map(a=>h('tr',{key:a.id},
          h('td',null,h('strong',null,a.patientName)),
          h('td',null,svcStr(a)),
          h('td',{style:{fontWeight:700,color:'var(--t)'}},a.fee?'₱'+p$(a.fee):'—'),
          h('td',null,a.date),
          h('td',null,a.time),
          h('td',null,a.dentist),
          h('td',null,h('button',{className:'btn bg2 bsm',onClick:()=>openPayForAppt(a)},'💳 Pay'))
        )))
      ))
    ),
    h('div',{className:'filters'},['all','paid','unpaid','pending'].map(f=>h('button',{key:f,className:'fb'+(filter===f?' act':''),onClick:()=>setFilter(f)},f.charAt(0).toUpperCase()+f.slice(1)))),
    h('div',{className:'card dt'},h('div',{className:'tw'},h('table',null,
      h('thead',null,h('tr',null,['Ref','Patient','Service','Amount','Method','Date','Status',''].map(c=>h('th',{key:c},c)))),
      h('tbody',null,filtered.length===0?h('tr',null,h('td',{colSpan:8},h('div',{className:'empty'},'No records'))):
        pagedPayments.map(p=>h('tr',{key:p.id},
          h('td',null,h('code',{style:{fontSize:11,background:'var(--cr)',padding:'2px 6px',borderRadius:5}},p.ref)),
          h('td',null,h('strong',null,p.patientName)),
          h('td',null,svcStr(p)),
          h('td',{style:{fontWeight:700,color:'var(--t)'}},'₱'+p$(p.amount)),
          h('td',null,h('span',{className:'tag',style:{background:'#f0f8ff',color:'#2563eb'}},p.method)),
          h('td',{style:{whiteSpace:'nowrap'}},p.date),
          h('td',null,h(SBadge,{status:p.status})),
          h('td',null,h('div',{className:'gap8'},
            p.status==='pending' && h('button',{className:'btn bg2 bsm',onClick:()=>payRecord(p)},'💳 Pay'),
            p.status==='paid' && h('button',{className:'btn bgh bsm',onClick:()=>setReceipt(p)},'Receipt')
          ))
        ))
      )
    )),h(PaymentsPager)),
    h('div',{className:'ml'},
      filtered.length===0&&h('div',{className:'empty'},'No payment records'),
      pagedPayments.map(p=>h('div',{key:p.id,className:'mc'},
        h('div',{className:'mc-top'},
          h('div',null,h('div',{className:'mc-nm'},p.patientName),h('div',{className:'mc-sb'},svcStr(p))),
          h('div',{style:{textAlign:'right'}},h('div',{style:{fontWeight:700,color:'var(--t)',fontSize:16}},'₱'+p$(p.amount)),h(SBadge,{status:p.status}))
        ),
        h('div',{className:'mc-row'},h('span',{className:'mc-lbl'},'Method'),h('span',{className:'mc-val'},p.method)),
        h('div',{className:'mc-row'},h('span',{className:'mc-lbl'},'Date'),h('span',{className:'mc-val'},p.date)),
        h('div',{className:'mc-row'},h('span',{className:'mc-lbl'},'Ref'),h('span',{className:'mc-val',style:{fontSize:11}},p.ref)),
        h('div',{className:'mc-act'},
          p.status==='pending' && h('button',{className:'btn bg2 bsm',style:{flex:1},onClick:()=>payRecord(p)},'💳 Pay'),
          p.status==='paid' && h('button',{className:'btn bgh bsm',style:{flex:1},onClick:()=>setReceipt(p)},'View Receipt')
        )
      ))
    ),
    dupState && h(DuplicateModal, {table:'payments', existing:dupState.existing, onUpdate:dupState.onUpdate, onCancel:dupState.onCancel}),
    modal&&h(PayFormPrefilled,{patients,prefill,onClose:()=>{setModal(false);setPrefill(null);setPayingApptId(null);},onSave:save}),
    receipt&&h(ReceiptView,{pay:receipt,onClose:()=>setReceipt(null)})
  );
}

// ─── NOTIFICATIONS (unchanged) ────────────────────────────────────────────────
