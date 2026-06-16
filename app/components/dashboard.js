// 📊 DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════
function TodayQueue({appointments, setAppointments, syncUrl, addToast}){
  const [tick, setTick] = useState(0);
  useEffect(()=>{ const t=setInterval(()=>setTick(x=>x+1),60000); return ()=>clearInterval(t); },[]);
  const today = localToday();
  const now = new Date();

  const scheduled = appointments.filter(a=>a.date===today && a.appointmentType!=='standby' && a.status!=='cancelled' && !a.noShow)
    .sort((a,b)=>(a.time||'').localeCompare(b.time||''));
  const standby = appointments.filter(a=>a.date===today && a.appointmentType==='standby' && a.status!=='cancelled' && !a.noShow)
    .sort((a,b)=>(a.queueNumber||99)-(b.queueNumber||99));

  const checkIn = (appt) => {
    const updated = {...appt, checkedIn:true, checkedInAt:new Date().toISOString()};
    setAppointments(prev=>prev.map(a=>a.id===appt.id?updated:a));
    syncOneRecord('appointments', updated, syncUrl);
    addToast(appt.patientName+' checked in','success');
  };
  const markNoShow = (appt) => {
    const updated = {...appt, noShow:true, status:'cancelled'};
    setAppointments(prev=>prev.map(a=>a.id===appt.id?updated:a));
    syncOneRecord('appointments', updated, syncUrl);
    addToast(appt.patientName+' marked no-show — next standby patient can be called','info');
  };

  const minsLate = (appt) => {
    if(!appt.time) return 0;
    const [hh,mm] = appt.time.split(':').map(Number);
    const slotTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm);
    return Math.floor((now - slotTime) / 60000);
  };

  return h('div',{className:'card',style:{marginBottom:16}},
    h('div',{className:'ch'},
      h('div',{className:'ct'},"Today's Queue"),
      h('div',{style:{fontSize:11,color:'var(--md)'}},
        scheduled.length+' scheduled · '+standby.length+' standby'
      )
    ),
    h('div',{className:'cb'},
      h('div',{className:'queue-panel'},
        // Scheduled column
        h('div',{className:'queue-col'},
          h('div',{className:'queue-col-title'},
            h(Svg,{d:IC.cal,size:13,color:'var(--t)'}), 'Scheduled'
          ),
          scheduled.length===0
            ? h('div',{style:{fontSize:12,color:'var(--md)',padding:'6px 0'}},'No scheduled appointments today')
            : scheduled.map(a=>{
                const late = !a.checkedIn ? minsLate(a) : 0;
                return h('div',{key:a.id,className:'queue-row'},
                  h('div',{className:'queue-time'},a.time?fmtTime(a.time):'—'),
                  h('div',{style:{flex:1,minWidth:0}},
                    h('div',{style:{fontWeight:600,fontSize:12.5,color:'var(--dk)',display:'flex',alignItems:'center',gap:5,flexWrap:'wrap'}},
                      a.patientName,
                      a.checkedIn && h('span',{className:'checkedin-badge'},'✓ In'),
                      !a.checkedIn && late>=15 && h('span',{className:'noshow-badge'},'⚠ LATE'),
                      !a.checkedIn && late>0 && late<15 && h('span',{className:'queue-late'},late+'m late'),
                    ),
                    h('div',{style:{fontSize:11,color:'var(--md)',marginTop:1}},svcStr(a))
                  ),
                  !a.checkedIn && a.status!=='cancelled' && late<15
                    ? h('button',{className:'checkin-btn',onClick:()=>checkIn(a)},'Check In')
                    : !a.checkedIn && late>=15
                      ? h('button',{className:'noshow-btn',onClick:()=>markNoShow(a)},'No-show')
                      : null
                );
              })
        ),
        // Standby column
        h('div',{className:'queue-col'},
          h('div',{className:'queue-col-title'},
            h(Svg,{d:IC.users,size:13,color:'#9b59b6'}), 'Standby Queue'
          ),
          standby.length===0
            ? h('div',{style:{fontSize:12,color:'var(--md)',padding:'6px 0'}},'No standby patients today')
            : standby.map(a=>
                h('div',{key:a.id,className:'queue-row'},
                  h('span',{className:'queue-num'},'Q'+a.queueNumber),
                  h('div',{style:{flex:1,minWidth:0}},
                    h('div',{style:{fontWeight:600,fontSize:12.5,color:'var(--dk)',display:'flex',alignItems:'center',gap:5,flexWrap:'wrap'}},
                      a.patientName,
                      a.checkedIn && h('span',{className:'checkedin-badge'},'✓ In'),
                    ),
                    h('div',{style:{fontSize:11,color:'var(--md)',marginTop:1}},svcStr(a))
                  ),
                  !a.checkedIn
                    ? h('button',{className:'checkin-btn',onClick:()=>checkIn(a)},'Check In')
                    : null
                )
              )
        )
      )
    )
  );
}

// ── Sparkline SVG helper (tiny 40×22 area chart) ──────────────────────────
function Sparkline({values, color, fill}){
  if(!values||values.length<2) return null;
  const W=60,H=24;
  const mn=Math.min(...values), mx=Math.max(...values);
  const rng=mx-mn||1;
  const pts=values.map((v,i)=>[i/(values.length-1)*W, H-((v-mn)/rng)*(H-4)-2]);
  const d='M'+pts.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join('L');
  const fillD=d+'L'+W+','+H+' L0,'+H+' Z';
  return h('svg',{width:W,height:H,viewBox:`0 0 ${W} ${H}`,style:{display:'block'}},
    fill && h('path',{d:fillD,fill:fill,opacity:.18}),
    h('path',{d,fill:'none',stroke:color||'#0a7c6e',strokeWidth:1.8,strokeLinecap:'round',strokeLinejoin:'round'})
  );
}

// ── SVG Line/Area Chart (full width) ──────────────────────────────────────
function SVGLineChart({series, labels, height, showGrid, formatY}){
  const W=560,H=height||180;
  const PAD={t:16,r:16,b:36,l:56};
  const CW=W-PAD.l-PAD.r, CH=H-PAD.t-PAD.b;
  const allVals=series.flatMap(s=>s.data);
  const mn=0, mx=Math.max(...allVals,1);
  const xOf=(i,len)=>PAD.l+i/(Math.max(len-1,1))*CW;
  const yOf=v=>PAD.t+CH-(((v-mn)/(mx-mn))*CH);
  const fmt=formatY||(v=>'₱'+p$(v));
  const gridY=[0,.25,.5,.75,1].map(t=>mn+(mx-mn)*t);
  return h('svg',{viewBox:`0 0 ${W} ${H}`,style:{width:'100%',height:H,display:'block',overflow:'visible'}},
    showGrid && gridY.map((gv,gi)=>h(Fragment,{key:gi},
      h('line',{x1:PAD.l,x2:W-PAD.r,y1:yOf(gv),y2:yOf(gv),stroke:'#e2e8f0',strokeWidth:1,strokeDasharray:'4 3'}),
      h('text',{x:PAD.l-6,y:yOf(gv)+4,textAnchor:'end',fontSize:9,fill:'#94a3b8'},fmt(gv))
    )),
    labels && labels.map((lbl,i)=>h('text',{key:i,x:xOf(i,labels.length),y:H-6,textAnchor:'middle',fontSize:9,fill:'#94a3b8'},lbl)),
    series.map((s,si)=>{
      const pts=s.data.map((v,i)=>[xOf(i,s.data.length),yOf(v)]);
      const lineD='M'+pts.map(p=>p.join(',')).join('L');
      const fillD=lineD+'L'+xOf(s.data.length-1,s.data.length)+','+(PAD.t+CH)+'L'+PAD.l+','+(PAD.t+CH)+' Z';
      return h(Fragment,{key:si},
        s.fill && h('path',{d:fillD,fill:s.color||'#0a7c6e',opacity:.1}),
        h('path',{d:lineD,fill:'none',stroke:s.color||'#0a7c6e',strokeWidth:2,strokeLinecap:'round',strokeLinejoin:'round'}),
        pts.map((pt,pi)=>h('circle',{key:pi,cx:pt[0],cy:pt[1],r:3,fill:s.color||'#0a7c6e',stroke:'#fff',strokeWidth:1.5}))
      );
    })
  );
}

// ── SVG Donut Chart ────────────────────────────────────────────────────────
function DonutChart({slices, size}){
  const R=size||48, cx=R+8, cy=R+8;
  const total=slices.reduce((s,x)=>s+x.value,0)||1;
  let ang=-Math.PI/2;
  const paths=slices.map((sl,i)=>{
    const sweep=(sl.value/total)*2*Math.PI;
    const x1=cx+R*Math.cos(ang), y1=cy+R*Math.sin(ang);
    ang+=sweep;
    const x2=cx+R*Math.cos(ang), y2=cy+R*Math.sin(ang);
    const large=sweep>Math.PI?1:0;
    const inner=R*0.58;
    const ix1=cx+inner*Math.cos(ang-sweep), iy1=cy+inner*Math.sin(ang-sweep);
    const ix2=cx+inner*Math.cos(ang), iy2=cy+inner*Math.sin(ang);
    return h('path',{key:i,d:`M${x1},${y1} A${R},${R} 0 ${large},1 ${x2},${y2} L${ix2},${iy2} A${inner},${inner} 0 ${large},0 ${ix1},${iy1} Z`,fill:sl.color});
  });
  return h('svg',{width:(R+8)*2,height:(R+8)*2,viewBox:`0 0 ${(R+8)*2} ${(R+8)*2}`},paths);
}

// ── Trend pill ─────────────────────────────────────────────────────────────
function TrendPill({pct, inverse}){
  if(pct===null||pct===undefined) return null;
  const up=pct>=0;
  const good=inverse?!up:up;
  return h('span',{style:{
    display:'inline-flex',alignItems:'center',gap:2,
    background:good?'#dcfce7':'#fee2e2',
    color:good?'#15803d':'#dc2626',
    borderRadius:20,fontSize:10,fontWeight:700,
    padding:'2px 7px',
  }},
    (up?'↑':'↓')+Math.abs(pct).toFixed(1)+'%'
  );
}

function Dashboard({appointments,setAppointments,patients,payments,onGoKiosk,syncUrl,addToast}){
  const [showAI, setShowAI] = useState(false);
  const [dashTab, setDashTab] = useState('executive'); // 'executive' | 'clinical'
  const addToast2 = (m,t) => {};

  // ── Date helpers ───────────────────────────────────────────────────────
  const today=localToday();
  const now=new Date();
  const thisMonth=today.slice(0,7);
  const lastMonthDate=new Date(now.getFullYear(),now.getMonth()-1,1);
  const lastMonth=(lastMonthDate.getFullYear()+'-'+String(lastMonthDate.getMonth()+1).padStart(2,'0'));

  // ── Revenue metrics ────────────────────────────────────────────────────
  const paidPayments=payments.filter(p=>p.status==='paid');
  const pendingPayments=payments.filter(p=>p.status!=='paid');
  const grossRev=paidPayments.reduce((s,p)=>s+Number(p.amount||0),0);
  const outstandingAR=pendingPayments.reduce((s,p)=>s+Number(p.amount||0),0);
  const thisMonthRev=paidPayments.filter(p=>(p.date||'').startsWith(thisMonth)).reduce((s,p)=>s+Number(p.amount||0),0);
  const lastMonthRev=paidPayments.filter(p=>(p.date||'').startsWith(lastMonth)).reduce((s,p)=>s+Number(p.amount||0),0);
  const revGrowth=lastMonthRev>0?((thisMonthRev-lastMonthRev)/lastMonthRev*100):null;
  const collectionRate=payments.length>0?(paidPayments.length/payments.length*100):100;

  // ── Revenue by month (last 6) ──────────────────────────────────────────
  const revByMonth=(()=>{
    const months=[];
    for(let i=5;i>=0;i--){
      const d=new Date(now.getFullYear(),now.getMonth()-i,1);
      const key=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
      const lbl=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()];
      months.push({key,lbl,val:paidPayments.filter(p=>(p.date||'').startsWith(key)).reduce((s,p)=>s+Number(p.amount||0),0)});
    }
    return months;
  })();

  // ── Patient metrics ────────────────────────────────────────────────────
  const newPatientsThisMonth=patients.filter(p=>(p.lastVisit||'').startsWith(thisMonth)).length;
  const newPatientsLastMonth=patients.filter(p=>(p.lastVisit||'').startsWith(lastMonth)).length;
  const patGrowth=newPatientsLastMonth>0?((newPatientsThisMonth-newPatientsLastMonth)/newPatientsLastMonth*100):null;

  // ── Appointment metrics ────────────────────────────────────────────────
  const pending=appointments.filter(a=>a.status==='pending').length;
  const completedToday=appointments.filter(a=>a.date===today&&a.status==='completed').length;
  const todayAppts=appointments.filter(a=>a.date===today&&a.status!=='cancelled')
    .sort((a,b)=>(a.time||'').localeCompare(b.time||''));
  const todayRev=paidPayments.filter(p=>p.date===today).reduce((s,p)=>s+Number(p.amount||0),0);

  // ── Payment method breakdown ───────────────────────────────────────────
  const pmMap={};
  paidPayments.forEach(p=>{const m=p.method||'Cash';pmMap[m]=(pmMap[m]||0)+Number(p.amount||0);});
  const pmColors=['#0a7c6e','#3a7bd5','#d4870a','#9b59b6','#e74c3c'];
  const pmSlices=Object.entries(pmMap).map(([k,v],i)=>({label:k,value:v,color:pmColors[i%pmColors.length]}));

  // ── Top services ──────────────────────────────────────────────────────
  const svcMap={};
  paidPayments.forEach(p=>{svcList(p).forEach(sv=>{svcMap[sv]=(svcMap[sv]||0)+Number(p.amount||0)/Math.max(1,svcList(p).length);});});
  const topSvcs=Object.entries(svcMap).sort((a,b)=>b[1]-a[1]).slice(0,4);

  // ── Hour greeting ──────────────────────────────────────────────────────
  const hr=now.getHours();
  const greeting=hr<12?'Good Morning':hr<17?'Good Afternoon':'Good Evening';

  const kpiCards=[
    {label:'Gross Revenue',value:'₱'+p$(grossRev),sub:'All-time collected',trend:null,color:'#0a7c6e',sparkVals:revByMonth.map(m=>m.val)},
    {label:'Monthly Revenue',value:'₱'+p$(thisMonthRev),sub:revByMonth[revByMonth.length-1]?.lbl||thisMonth,trend:revGrowth,color:'#3a7bd5',sparkVals:revByMonth.map(m=>m.val)},
    {label:'Outstanding AR',value:'₱'+p$(outstandingAR),sub:pendingPayments.length+' pending invoices',trend:null,color:'#d4870a',sparkVals:null,inverse:true},
    {label:'Collection Rate',value:collectionRate.toFixed(1)+'%',sub:'Paid vs total billed',trend:null,color:'#9b59b6',sparkVals:null},
    {label:'Total Patients',value:patients.length,sub:newPatientsThisMonth+' new this month',trend:patGrowth,color:'#0891b2',sparkVals:null},
    {label:'Today\'s Revenue',value:'₱'+p$(todayRev),sub:completedToday+' completed visits',trend:null,color:'#059669',sparkVals:null},
    {label:'Pending Approval',value:pending,sub:'Appointments awaiting confirmation',trend:null,color:'#d97706',sparkVals:null},
    {label:'Today\'s Schedule',value:todayAppts.length,sub:'Appointments today',trend:null,color:'#6366f1',sparkVals:null},
  ];

  return h('div',null,
    // ── Executive banner ────────────────────────────────────────────────
    h('div',{style:{
      background:'linear-gradient(135deg,#0f2447 0%,#0a7c6e 60%,#0891b2 100%)',
      borderRadius:14,padding:'24px 28px',marginBottom:22,color:'#fff',
      boxShadow:'0 4px 24px rgba(10,124,110,.25)',
      display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:16,
    }},
      h('div',null,
        h('div',{style:{fontSize:11,opacity:.7,letterSpacing:1.5,textTransform:'uppercase',fontWeight:600,marginBottom:4}},
          (hr<12?'Good Morning':hr<17?'Good Afternoon':'Good Evening')+' — '+new Date().toLocaleDateString('en-PH',{weekday:'long',year:'numeric',month:'long',day:'numeric'})
        ),
        h('div',{style:{fontFamily:"'Playfair Display',serif",fontSize:26,fontWeight:700,marginBottom:4}},'Executive Dashboard'),
        h('div',{style:{fontSize:13,opacity:.75}},'Cyrabell Dental Clinic · Real-time Business Intelligence')
      ),
      h('div',{style:{display:'flex',gap:10,flexWrap:'wrap',alignItems:'flex-start'}},
        planHas('aiAssistant')
          ? h('button',{className:'btn',onClick:()=>setShowAI(true),style:{background:'rgba(255,255,255,.15)',color:'#fff',border:'1px solid rgba(255,255,255,.3)',backdropFilter:'blur(4px)'}},'🤖 AI Insights')
          : null,
        onGoKiosk && planHas('kioskMode')
          ? h('button',{className:'btn',onClick:onGoKiosk,style:{background:'rgba(255,255,255,.15)',color:'#fff',border:'1px solid rgba(255,255,255,.3)'}},'🏥 Kiosk')
          : null,
        h('div',{style:{display:'flex',gap:2,background:'rgba(255,255,255,.1)',borderRadius:8,padding:3}},
          ['executive','clinical'].map(tab=>h('button',{key:tab,onClick:()=>setDashTab(tab),style:{
            background:dashTab===tab?'rgba(255,255,255,.25)':'transparent',color:'#fff',
            border:'none',borderRadius:6,padding:'5px 14px',fontSize:12,fontWeight:600,cursor:'pointer'
          }},tab==='executive'?'Executive':'Clinical'))
        )
      )
    ),

    // ── KPI Grid ────────────────────────────────────────────────────────
    dashTab==='executive' && h(Fragment,null,
      h('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:12,marginBottom:20}},
        kpiCards.map((k,i)=>h('div',{key:i,style:{
          background:'#fff',borderRadius:12,padding:'18px 20px',
          border:'1px solid #e2e8f0',
          boxShadow:'0 1px 6px rgba(0,0,0,.06)',
          display:'flex',flexDirection:'column',gap:4,
          borderLeft:'3px solid '+k.color,
        }},
          h('div',{style:{fontSize:10.5,color:'#64748b',fontWeight:700,letterSpacing:.8,textTransform:'uppercase'}},k.label),
          h('div',{style:{display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:8}},
            h('div',{style:{fontSize:24,fontWeight:800,color:'#0f172a',lineHeight:1.1}},k.value),
            k.sparkVals && h(Sparkline,{values:k.sparkVals,color:k.color,fill:k.color})
          ),
          h('div',{style:{display:'flex',alignItems:'center',gap:6,marginTop:2}},
            h('span',{style:{fontSize:11,color:'#94a3b8',flex:1}},k.sub),
            k.trend!==null && k.trend!==undefined && h(TrendPill,{pct:k.trend,inverse:k.inverse})
          )
        ))
      ),

      // ── Revenue Trend ──────────────────────────────────────────────────
      h('div',{style:{display:'grid',gridTemplateColumns:'2fr 1fr',gap:14,marginBottom:14}},
        h('div',{style:{background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',boxShadow:'0 1px 6px rgba(0,0,0,.06)',padding:'20px 24px'}},
          h('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}},
            h('div',null,
              h('div',{style:{fontSize:12,fontWeight:700,color:'#0f172a'}}, 'Revenue Trend — Last 6 Months'),
              h('div',{style:{fontSize:11,color:'#94a3b8',marginTop:2}},'Monthly gross collections')
            ),
            h('div',{style:{fontSize:20,fontWeight:800,color:'#0a7c6e'}},'₱'+p$(thisMonthRev)),
          ),
          h(SVGLineChart,{
            series:[{data:revByMonth.map(m=>m.val),color:'#0a7c6e',fill:true}],
            labels:revByMonth.map(m=>m.lbl),
            height:160,showGrid:true,
          })
        ),

        // ── Payment Mix Donut ──────────────────────────────────────────
        h('div',{style:{background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',boxShadow:'0 1px 6px rgba(0,0,0,.06)',padding:'20px 24px'}},
          h('div',{style:{fontSize:12,fontWeight:700,color:'#0f172a',marginBottom:14}},'Payment Method Mix'),
          pmSlices.length===0
            ? h('div',{style:{color:'#94a3b8',fontSize:12,padding:'24px 0',textAlign:'center'}},'No payment data')
            : h('div',{style:{display:'flex',flexDirection:'column',alignItems:'center',gap:12}},
                h(DonutChart,{slices:pmSlices,size:56}),
                h('div',{style:{width:'100%',display:'flex',flexDirection:'column',gap:6}},
                  pmSlices.map((sl,i)=>h('div',{key:i,style:{display:'flex',alignItems:'center',justifyContent:'space-between',fontSize:11}},
                    h('div',{style:{display:'flex',alignItems:'center',gap:6}},
                      h('div',{style:{width:9,height:9,borderRadius:3,background:sl.color,flexShrink:0}}),
                      h('span',{style:{color:'#475569'}},sl.label)
                    ),
                    h('span',{style:{fontWeight:700,color:'#0f172a'}},'₱'+p$(sl.value))
                  ))
                )
              )
        )
      ),

      // ── Accounting Section ─────────────────────────────────────────────
      h('div',{style:{background:'linear-gradient(135deg,#0f2447,#1e3a5f)',borderRadius:12,padding:'20px 24px',marginBottom:14,color:'#fff'}},
        h('div',{style:{fontSize:11,fontWeight:700,letterSpacing:1.2,textTransform:'uppercase',opacity:.6,marginBottom:12}},'Accounting Overview'),
        h('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:16}},
          [
            {l:'Gross Revenue',v:'₱'+p$(grossRev),c:'#34d399'},
            {l:'Total Collected',v:'₱'+p$(grossRev),c:'#60a5fa'},
            {l:'Outstanding AR',v:'₱'+p$(outstandingAR),c:'#fbbf24'},
            {l:'Collection Rate',v:collectionRate.toFixed(1)+'%',c:'#a78bfa'},
            {l:'Avg Invoice',v:'₱'+p$(payments.length?payments.reduce((s,p)=>s+Number(p.amount||0),0)/payments.length:0),c:'#f472b6'},
            {l:'MTD Revenue',v:'₱'+p$(thisMonthRev),c:'#34d399'},
          ].map((it,i)=>h('div',{key:i},
            h('div',{style:{fontSize:10,opacity:.55,letterSpacing:.8,textTransform:'uppercase',fontWeight:600,marginBottom:3}},it.l),
            h('div',{style:{fontSize:20,fontWeight:800,color:it.c}},it.v)
          ))
        )
      ),

      // ── Top Services + AR Aging ────────────────────────────────────────
      h('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}},
        h('div',{style:{background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',boxShadow:'0 1px 6px rgba(0,0,0,.06)',padding:'20px 24px'}},
          h('div',{style:{fontSize:12,fontWeight:700,color:'#0f172a',marginBottom:14}},'Top Revenue Services'),
          topSvcs.length===0
            ? h('div',{style:{color:'#94a3b8',fontSize:12}},'No service data yet')
            : topSvcs.map(([name,val],i)=>h('div',{key:i,style:{marginBottom:10}},
                h('div',{style:{display:'flex',justifyContent:'space-between',marginBottom:4}},
                  h('span',{style:{fontSize:12,color:'#334155',fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'65%'}},name),
                  h('span',{style:{fontSize:12,fontWeight:800,color:'#0a7c6e'}},'₱'+p$(val))
                ),
                h('div',{style:{height:5,background:'#f1f5f9',borderRadius:4}},
                  h('div',{style:{height:5,borderRadius:4,width:Math.round((val/(topSvcs[0]?topSvcs[0][1]:1))*100)+'%',background:'linear-gradient(90deg,#0a7c6e,#0891b2)'}})
                )
              ))
        ),

        h('div',{style:{background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',boxShadow:'0 1px 6px rgba(0,0,0,.06)',padding:'20px 24px'}},
          h('div',{style:{fontSize:12,fontWeight:700,color:'#0f172a',marginBottom:14}},'AR Aging Analysis'),
          (()=>{
            const now2=new Date();
            const buckets=[{l:'Current (0-30d)',max:30},{l:'31-60 Days',max:60},{l:'61-90 Days',max:90},{l:'90+ Days',max:Infinity}];
            const aged=buckets.map(b=>({...b,v:0}));
            pendingPayments.forEach(p=>{
              const d=p.date?Math.floor((now2-new Date(p.date))/(864e5)):0;
              const bi=aged.findIndex((b,i)=>d<=(b.max));
              if(bi>=0) aged[bi].v+=Number(p.amount||0);
            });
            const maxV=Math.max(...aged.map(a=>a.v),1);
            const cols=['#22c55e','#eab308','#f97316','#ef4444'];
            return aged.map((b,i)=>h('div',{key:i,style:{marginBottom:10}},
              h('div',{style:{display:'flex',justifyContent:'space-between',marginBottom:4}},
                h('span',{style:{fontSize:11,color:'#64748b'}},'  '+b.l),
                h('span',{style:{fontSize:12,fontWeight:700,color:cols[i]}},'₱'+p$(b.v))
              ),
              h('div',{style:{height:5,background:'#f1f5f9',borderRadius:4}},
                h('div',{style:{height:5,borderRadius:4,width:Math.round((b.v/maxV)*100)+'%',background:cols[i]}})
              )
            ));
          })()
        )
      )
    ),

    // ── Clinical tab ────────────────────────────────────────────────────
    dashTab==='clinical' && h(Fragment,null,
      h(TodayQueue,{appointments,setAppointments,syncUrl:syncUrl||'',addToast:addToast||(()=>{})}),
      h('div',{className:'dg'},
        h('div',{className:'card'},
          h('div',{className:'ch'},h('div',{className:'ct'},"Today's Schedule")),
          h('div',{className:'cb'},
            todayAppts.length===0
              ? h('div',{className:'empty'},'No appointments today')
              : h(Fragment,null,
                  h('div',{className:'dt'},h('div',{className:'tw'},
                    h('table',null,
                      h('thead',null,h('tr',null,['Patient','Service','Time','Status'].map(c=>h('th',{key:c},c)))),
                      h('tbody',null,todayAppts.map(a=>h('tr',{key:a.id},
                        h('td',null,h('strong',null,a.patientName+(a.arrived?' 🪑':''))),
                        h('td',null,svcStr(a)),
                        h('td',{style:{whiteSpace:'nowrap'}},fmtTime(a.time)),
                        h('td',null,a.arrived?h('span',{className:'kiosk-arrived-badge'},'In Clinic'):h(SBadge,{status:a.status}))
                      )))
                    )
                  ))
                )
          )
        ),
        h('div',{className:'card'},
          h('div',{className:'ch'},h('div',{className:'ct'},'Recent Activity')),
          h('div',{className:'cb'},
            h('div',{className:'tl'},[...appointments].sort((a,b)=>dateTimeValue(b.date,b.time)-dateTimeValue(a.date,a.time)).slice(0,5).map((a,i)=>h('div',{key:i,className:'tli'},
              h('div',{className:'tld',style:{background:a.arrived?'#f59e0b':a.status==='confirmed'?'var(--gr)':a.status==='pending'?'var(--go)':a.status==='completed'?'var(--bl)':'var(--re)'}}),
              h('div',null,
                h('div',{className:'tlt'},a.patientName+(a.arrived?' 🪑':'')),
                h('div',{className:'tls'},svcStr(a)+' · '+fmtDateWithDay(a.date))
              )
            )))
          )
        )
      )
    ),

    showAI && planHas('aiAssistant') && h(AIAssistant,{appointments,patients,payments,addToast:addToast2,onClose:()=>setShowAI(false),defaultTab:'insights'})
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 📋 APPOINTMENTS — Sortable table + calendar view + auto-confirm + analysis
// ═══════════════════════════════════════════════════════════════════════════

