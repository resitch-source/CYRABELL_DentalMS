// ─── ANALYTICS (unchanged) ────────────────────────────────────────────────────
function Analytics({appointments,payments,patients}){
  const [analyticsTab, setAnalyticsTab] = useState('revenue');
  const now=new Date();
  const thisMonth=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');

  // ── Core data ─────────────────────────────────────────────────────────
  const paidPayments=payments.filter(p=>p.status==='paid');
  const pendingPayments=payments.filter(p=>p.status!=='paid');
  const grossRev=paidPayments.reduce((s,p)=>s+Number(p.amount||0),0);
  const outstandingAR=pendingPayments.reduce((s,p)=>s+Number(p.amount||0),0);
  const collectionRate=payments.length>0?(paidPayments.length/payments.length*100):100;

  // ── Revenue by month (last 12) ─────────────────────────────────────────
  const revByMonth12=(()=>{
    const months=[];
    for(let i=11;i>=0;i--){
      const d=new Date(now.getFullYear(),now.getMonth()-i,1);
      const key=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
      const lbl=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()];
      const apptCount=appointments.filter(a=>(a.date||'').startsWith(key)).length;
      const rev=paidPayments.filter(p=>(p.date||'').startsWith(key)).reduce((s,p)=>s+Number(p.amount||0),0);
      months.push({key,lbl,rev,apptCount});
    }
    return months;
  })();

  // ── Patient growth by month ────────────────────────────────────────────
  const patByMonth=(()=>{
    const months=revByMonth12.map(m=>({...m,newPat:patients.filter(p=>(p.lastVisit||'').startsWith(m.key)).length}));
    return months;
  })();

  // ── Service breakdown ──────────────────────────────────────────────────
  const svcMap={},svcCountMap={};
  paidPayments.forEach(p=>{
    const svs=svcList(p);
    const share=Number(p.amount||0)/Math.max(1,svs.length);
    svs.forEach(sv=>{
      svcMap[sv]=(svcMap[sv]||0)+share;
      svcCountMap[sv]=(svcCountMap[sv]||0)+1;
    });
  });
  const topSvcs=Object.entries(svcMap).sort((a,b)=>b[1]-a[1]).slice(0,8);

  // ── Dental conditions breakdown ────────────────────────────────────────
  const issueStats={};
  patients.forEach(p=>{
    Object.entries(p.teeth||{}).forEach(([k,v])=>{
      if(!k||S(k).includes('_surfaces')||!v||typeof v!=='string'||v==='healthy'||!CONDITIONS[v]||typeof v==='object') return;
      issueStats[v]=(issueStats[v]||0)+1;
    });
  });
  const totalIssues=Object.values(issueStats).reduce((s,v)=>s+v,0)||1;

  // ── Payment method breakdown ───────────────────────────────────────────
  const pmMap={};
  paidPayments.forEach(p=>{const m=p.method||'Cash';pmMap[m]=(pmMap[m]||0)+Number(p.amount||0);});
  const pmColors=['#0a7c6e','#3a7bd5','#d4870a','#9b59b6','#e74c3c','#0891b2'];
  const pmSlices=Object.entries(pmMap).map(([k,v],i)=>({label:k,value:v,color:pmColors[i%pmColors.length]}));
  const pmTotal=pmSlices.reduce((s,x)=>s+x.value,0)||1;

  // ── AR Aging ───────────────────────────────────────────────────────────
  const arBuckets=[{l:'Current (0-30d)',max:30,c:'#22c55e'},{l:'31-60 Days',max:60,c:'#eab308'},{l:'61-90 Days',max:90,c:'#f97316'},{l:'90+ Days',max:Infinity,c:'#ef4444'}];
  const arAged=arBuckets.map(b=>({...b,v:0}));
  pendingPayments.forEach(p=>{
    const d=p.date?Math.floor((now-new Date(p.date))/(864e5)):0;
    const bi=arAged.findIndex(b=>d<=b.max);
    if(bi>=0) arAged[bi].v+=Number(p.amount||0);
  });
  const arMax=Math.max(...arAged.map(a=>a.v),1);

  // ── MoM growth helper ──────────────────────────────────────────────────
  const momGrowth=(()=>{
    const cur=revByMonth12[11]?.rev||0;
    const prv=revByMonth12[10]?.rev||0;
    return prv>0?((cur-prv)/prv*100):null;
  })();

  const TABS=[{k:'revenue',l:'Revenue'},  {k:'patients',l:'Patients'},{k:'services',l:'Services'},{k:'accounting',l:'Accounting'},{k:'clinical',l:'Clinical'}];

  return h('div',null,
    // ── Header ───────────────────────────────────────────────────────────
    h('div',{style:{
      background:'linear-gradient(135deg,#0f2447 0%,#0a7c6e 100%)',
      borderRadius:14,padding:'22px 28px',marginBottom:20,color:'#fff',
      display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12,
    }},
      h('div',null,
        h('div',{style:{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700}},'Business Intelligence'),
        h('div',{style:{fontSize:12,opacity:.7,marginTop:3}},'Executive analytics · Cyrabell Dental Clinic · Data as of today')
      ),
      h('div',{style:{display:'flex',gap:2,background:'rgba(255,255,255,.1)',borderRadius:8,padding:3,flexWrap:'wrap'}},
        TABS.map(t=>h('button',{key:t.k,onClick:()=>setAnalyticsTab(t.k),style:{
          background:analyticsTab===t.k?'rgba(255,255,255,.25)':'transparent',
          color:'#fff',border:'none',borderRadius:6,padding:'5px 12px',fontSize:11.5,fontWeight:600,cursor:'pointer'
        }},t.l))
      )
    ),

    // ── Summary KPI strip ────────────────────────────────────────────────
    h('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:10,marginBottom:16}},
      [
        {l:'Gross Revenue',v:'₱'+p$(grossRev),c:'#0a7c6e',trend:momGrowth},
        {l:'Outstanding AR',v:'₱'+p$(outstandingAR),c:'#d4870a',trend:null},
        {l:'Collection Rate',v:collectionRate.toFixed(1)+'%',c:'#6366f1',trend:null},
        {l:'Total Patients',v:patients.length,c:'#0891b2',trend:null},
        {l:'Appointments',v:appointments.length,c:'#059669',trend:null},
      ].map((k,i)=>h('div',{key:i,style:{
        background:'#fff',borderRadius:10,padding:'14px 16px',
        border:'1px solid #e2e8f0',borderLeft:'3px solid '+k.c,
        boxShadow:'0 1px 4px rgba(0,0,0,.05)',
      }},
        h('div',{style:{fontSize:10,color:'#64748b',fontWeight:700,letterSpacing:.8,textTransform:'uppercase',marginBottom:4}},k.l),
        h('div',{style:{display:'flex',alignItems:'center',gap:8}},
          h('div',{style:{fontSize:20,fontWeight:800,color:'#0f172a'}},k.v),
          k.trend!==null && k.trend!==undefined && h(TrendPill,{pct:k.trend})
        )
      ))
    ),

    // ════════════════════════════════════════════════════════════════════
    // TAB: REVENUE
    // ════════════════════════════════════════════════════════════════════
    analyticsTab==='revenue' && h('div',{style:{display:'flex',flexDirection:'column',gap:14}},
      h('div',{style:{background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',boxShadow:'0 1px 6px rgba(0,0,0,.06)',padding:'22px 26px'}},
        h('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:18,flexWrap:'wrap',gap:8}},
          h('div',null,
            h('div',{style:{fontSize:14,fontWeight:700,color:'#0f172a'}},'Monthly Revenue — 12 Month Trend'),
            h('div',{style:{fontSize:11,color:'#94a3b8',marginTop:3}},'Gross collections per month')
          ),
          momGrowth!==null && h('div',{style:{textAlign:'right'}},
            h('div',{style:{fontSize:10,color:'#94a3b8',marginBottom:3}},'Month-over-Month'),
            h(TrendPill,{pct:momGrowth})
          )
        ),
        h(SVGLineChart,{
          series:[{data:revByMonth12.map(m=>m.rev),color:'#0a7c6e',fill:true}],
          labels:revByMonth12.map(m=>m.lbl),
          height:200,showGrid:true,
        })
      ),

      h('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}},
        // Monthly table
        h('div',{style:{background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',padding:'20px 22px'}},
          h('div',{style:{fontSize:12,fontWeight:700,color:'#0f172a',marginBottom:12}},'Monthly Breakdown'),
          h('table',{style:{width:'100%',borderCollapse:'collapse',fontSize:12}},
            h('thead',null,h('tr',null,
              ['Month','Revenue','Appointments','Avg/Visit'].map(c=>h('th',{key:c,style:{textAlign:'left',padding:'6px 4px',color:'#64748b',fontWeight:600,fontSize:10.5,borderBottom:'1px solid #e2e8f0'}},c))
            )),
            h('tbody',null, [...revByMonth12].reverse().map((m,i)=>{
              const avg=m.apptCount?m.rev/m.apptCount:0;
              const isThis=m.key===thisMonth;
              return h('tr',{key:i,style:{background:isThis?'#f0fdf4':'transparent'}},
                h('td',{style:{padding:'7px 4px',fontWeight:isThis?700:400,color:isThis?'#0a7c6e':'#334155'}},m.lbl+(isThis?' ★':'')),
                h('td',{style:{padding:'7px 4px',fontWeight:700,color:'#0f172a'}},'₱'+p$(m.rev)),
                h('td',{style:{padding:'7px 4px',color:'#64748b'}},m.apptCount),
                h('td',{style:{padding:'7px 4px',color:'#64748b'}},'₱'+p$(avg))
              );
            }))
          )
        ),

        // Payment methods
        h('div',{style:{background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',padding:'20px 22px'}},
          h('div',{style:{fontSize:12,fontWeight:700,color:'#0f172a',marginBottom:14}},'Payment Method Breakdown'),
          pmSlices.length===0
            ? h('div',{style:{color:'#94a3b8',fontSize:12,padding:24,textAlign:'center'}},'No payment data yet')
            : h('div',{style:{display:'flex',gap:16,alignItems:'center'}},
                h(DonutChart,{slices:pmSlices,size:64}),
                h('div',{style:{flex:1,display:'flex',flexDirection:'column',gap:8}},
                  pmSlices.map((sl,i)=>{
                    const pct=(sl.value/pmTotal*100);
                    return h('div',{key:i},
                      h('div',{style:{display:'flex',justifyContent:'space-between',marginBottom:3}},
                        h('div',{style:{display:'flex',alignItems:'center',gap:6,fontSize:11}},
                          h('div',{style:{width:8,height:8,borderRadius:2,background:sl.color}}),
                          h('span',{style:{color:'#475569'}},sl.label)
                        ),
                        h('span',{style:{fontSize:11,fontWeight:700}},'₱'+p$(sl.value))
                      ),
                      h('div',{style:{height:4,background:'#f1f5f9',borderRadius:3}},
                        h('div',{style:{height:4,borderRadius:3,width:pct.toFixed(0)+'%',background:sl.color}})
                      )
                    );
                  })
                )
              )
        )
      )
    ),

    // ════════════════════════════════════════════════════════════════════
    // TAB: PATIENTS
    // ════════════════════════════════════════════════════════════════════
    analyticsTab==='patients' && h('div',{style:{display:'flex',flexDirection:'column',gap:14}},
      h('div',{style:{background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',padding:'22px 26px'}},
        h('div',{style:{fontSize:14,fontWeight:700,color:'#0f172a',marginBottom:16}},'Patient Visit Activity — 12 Months'),
        h(SVGLineChart,{
          series:[
            {data:patByMonth.map(m=>m.apptCount),color:'#0891b2',fill:true},
          ],
          labels:patByMonth.map(m=>m.lbl),
          height:180,showGrid:true,formatY:v=>v.toFixed(0),
        })
      ),
      h('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:12}},
        [
          {l:'Total Patients',v:patients.length,c:'#0891b2'},
          {l:'Active (visited)',v:patients.filter(p=>p.lastVisit).length,c:'#0a7c6e'},
          {l:'With Conditions',v:patients.filter(p=>Object.values(p.teeth||{}).some(v=>typeof v==='string'&&v!=='healthy'&&CONDITIONS[v])).length,c:'#d4870a'},
          {l:'Total Appointments',v:appointments.length,c:'#6366f1'},
          {l:'Completed',v:appointments.filter(a=>a.status==='completed').length,c:'#059669'},
          {l:'Cancelled',v:appointments.filter(a=>a.status==='cancelled').length,c:'#ef4444'},
        ].map((k,i)=>h('div',{key:i,style:{background:'#fff',borderRadius:10,padding:'16px',border:'1px solid #e2e8f0',borderTop:'3px solid '+k.c}},
          h('div',{style:{fontSize:22,fontWeight:800,color:'#0f172a',marginBottom:4}},k.v),
          h('div',{style:{fontSize:11,color:'#64748b',fontWeight:600}},k.l)
        ))
      )
    ),

    // ════════════════════════════════════════════════════════════════════
    // TAB: SERVICES
    // ════════════════════════════════════════════════════════════════════
    analyticsTab==='services' && h('div',{style:{display:'flex',flexDirection:'column',gap:14}},
      h('div',{style:{background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',padding:'22px 26px'}},
        h('div',{style:{fontSize:14,fontWeight:700,color:'#0f172a',marginBottom:16}},'Service Revenue Performance'),
        topSvcs.length===0
          ? h('div',{style:{color:'#94a3b8',fontSize:13,padding:'32px 0',textAlign:'center'}},'No service data yet')
          : topSvcs.map(([name,val],i)=>{
              const pct=(val/(topSvcs[0]?topSvcs[0][1]:1)*100);
              const cnt=svcCountMap[name]||0;
              const avg=cnt?val/cnt:0;
              const palette=['#0a7c6e','#3a7bd5','#d4870a','#9b59b6','#0891b2','#ef4444','#059669','#f59e0b'];
              return h('div',{key:i,style:{marginBottom:14,paddingBottom:14,borderBottom:i<topSvcs.length-1?'1px solid #f1f5f9':'none'}},
                h('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:6}},
                  h('div',null,
                    h('span',{style:{fontSize:13,fontWeight:700,color:'#0f172a'}},name),
                    h('span',{style:{fontSize:10.5,color:'#94a3b8',marginLeft:8}},cnt+' visits · avg ₱'+p$(avg))
                  ),
                  h('span',{style:{fontSize:16,fontWeight:800,color:palette[i%palette.length]}},'₱'+p$(val))
                ),
                h('div',{style:{height:8,background:'#f1f5f9',borderRadius:6}},
                  h('div',{style:{height:8,borderRadius:6,width:pct.toFixed(0)+'%',background:'linear-gradient(90deg,'+palette[i%palette.length]+','+palette[(i+1)%palette.length]+')'}})
                )
              );
            })
      )
    ),

    // ════════════════════════════════════════════════════════════════════
    // TAB: ACCOUNTING
    // ════════════════════════════════════════════════════════════════════
    analyticsTab==='accounting' && h('div',{style:{display:'flex',flexDirection:'column',gap:14}},
      // Accounting KPI strip
      h('div',{style:{background:'linear-gradient(135deg,#0f2447,#1e3a5f)',borderRadius:12,padding:'22px 26px',color:'#fff'}},
        h('div',{style:{fontSize:11,fontWeight:700,letterSpacing:1.2,textTransform:'uppercase',opacity:.55,marginBottom:14}},'Financial Summary'),
        h('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:18}},
          [
            {l:'Gross Revenue',v:'₱'+p$(grossRev),c:'#34d399'},
            {l:'Total Collected',v:'₱'+p$(grossRev),c:'#60a5fa'},
            {l:'Outstanding AR',v:'₱'+p$(outstandingAR),c:'#fbbf24'},
            {l:'Collection Rate',v:collectionRate.toFixed(1)+'%',c:'#a78bfa'},
            {l:'Total Invoices',v:payments.length,c:'#f472b6'},
            {l:'Paid Invoices',v:paidPayments.length,c:'#34d399'},
            {l:'Pending Invoices',v:pendingPayments.length,c:'#fbbf24'},
            {l:'Avg Invoice',v:'₱'+p$(payments.length?payments.reduce((s,p)=>s+Number(p.amount||0),0)/payments.length:0),c:'#93c5fd'},
          ].map((k,i)=>h('div',{key:i},
            h('div',{style:{fontSize:9.5,opacity:.5,letterSpacing:.8,textTransform:'uppercase',fontWeight:600,marginBottom:4}},k.l),
            h('div',{style:{fontSize:22,fontWeight:800,color:k.c}},k.v)
          ))
        )
      ),

      // AR Aging
      h('div',{style:{background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',padding:'22px 26px'}},
        h('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}},
          h('div',{style:{fontSize:14,fontWeight:700,color:'#0f172a'}},'Accounts Receivable Aging'),
          h('div',{style:{fontSize:12,color:'#64748b'}},'Total AR: ₱'+p$(outstandingAR))
        ),
        h('div',{style:{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:16}},
          arAged.map((b,i)=>h('div',{key:i,style:{background:b.c+'15',border:'1px solid '+b.c+'40',borderRadius:10,padding:'14px 16px'}},
            h('div',{style:{fontSize:10,color:b.c,fontWeight:700,letterSpacing:.8,textTransform:'uppercase',marginBottom:6}},b.l),
            h('div',{style:{fontSize:20,fontWeight:800,color:b.c}},'₱'+p$(b.v)),
            h('div',{style:{fontSize:10,color:'#94a3b8',marginTop:2}},arMax>0?(b.v/arMax*100).toFixed(0)+'% of AR':'0% of AR')
          ))
        ),
        arAged.map((b,i)=>h('div',{key:i,style:{marginBottom:8}},
          h('div',{style:{display:'flex',justifyContent:'space-between',marginBottom:3}},
            h('span',{style:{fontSize:11,color:'#64748b'}},b.l),
            h('span',{style:{fontSize:11,fontWeight:700,color:b.c}},'₱'+p$(b.v))
          ),
          h('div',{style:{height:6,background:'#f1f5f9',borderRadius:4}},
            h('div',{style:{height:6,borderRadius:4,width:(b.v/arMax*100).toFixed(0)+'%',background:b.c}})
          )
        ))
      ),

      // Payment log
      h('div',{style:{background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',padding:'22px 26px'}},
        h('div',{style:{fontSize:13,fontWeight:700,color:'#0f172a',marginBottom:14}},'Recent Transactions'),
        h('div',{style:{overflowX:'auto'}},
          h('table',{style:{width:'100%',borderCollapse:'collapse',fontSize:12}},
            h('thead',null,h('tr',null,
              ['Date','Patient','Service','Method','Amount','Status'].map(c=>h('th',{key:c,style:{textAlign:'left',padding:'7px 8px',color:'#64748b',fontWeight:600,fontSize:10.5,borderBottom:'2px solid #e2e8f0'}},'  '+c))
            )),
            h('tbody',null,
              [...payments].sort((a,b)=>new Date(b.date||0)-new Date(a.date||0)).slice(0,20).map((p,i)=>h('tr',{key:i,style:{borderBottom:'1px solid #f8fafc',background:i%2?'#fafcff':'#fff'}},
                h('td',{style:{padding:'7px 8px',color:'#475569'}},p.date||'—'),
                h('td',{style:{padding:'7px 8px',fontWeight:600}},p.patientName||'—'),
                h('td',{style:{padding:'7px 8px',color:'#64748b',maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}},svcStr(p)||p.service||'—'),
                h('td',{style:{padding:'7px 8px',color:'#64748b'}},p.method||'Cash'),
                h('td',{style:{padding:'7px 8px',fontWeight:700,color:'#0a7c6e'}},'₱'+p$(Number(p.amount||0))),
                h('td',{style:{padding:'7px 8px'}},
                  h('span',{style:{
                    background:p.status==='paid'?'#dcfce7':'#fef3c7',
                    color:p.status==='paid'?'#15803d':'#92400e',
                    borderRadius:12,padding:'2px 8px',fontSize:10.5,fontWeight:700
                  }},p.status==='paid'?'Paid':'Pending')
                )
              ))
            )
          )
        )
      )
    ),

    // ════════════════════════════════════════════════════════════════════
    // TAB: CLINICAL
    // ════════════════════════════════════════════════════════════════════
    analyticsTab==='clinical' && h('div',{style:{display:'flex',flexDirection:'column',gap:14}},
      h('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}},
        // Conditions breakdown
        h('div',{style:{background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',padding:'22px 26px'}},
          h('div',{style:{fontSize:13,fontWeight:700,color:'#0f172a',marginBottom:14}},'Dental Condition Prevalence'),
          Object.keys(issueStats).length===0
            ? h('div',{style:{color:'#94a3b8',fontSize:12,padding:'24px 0',textAlign:'center'}},'All patients healthy!')
            : h('div',{style:{display:'flex',gap:16,alignItems:'center'}},
                h(DonutChart,{slices:Object.entries(issueStats).sort((a,b)=>b[1]-a[1]).map(([k,v],i)=>({label:k,value:v,color:CONDITIONS[k]?.color||pmColors[i%pmColors.length]})),size:60}),
                h('div',{style:{flex:1,display:'flex',flexDirection:'column',gap:8}},
                  Object.entries(issueStats).sort((a,b)=>b[1]-a[1]).map(([cond,count])=>{
                    const c=CONDITIONS[cond]||{color:'#999',stroke:'#666',label:cond};
                    const pct=(count/totalIssues*100);
                    return h('div',{key:cond},
                      h('div',{style:{display:'flex',justifyContent:'space-between',marginBottom:3}},
                        h('div',{style:{display:'flex',alignItems:'center',gap:6,fontSize:11}},
                          h('div',{style:{width:10,height:10,borderRadius:3,background:c.color,border:'1.5px solid '+c.stroke,flexShrink:0}}),
                          h('span',{style:{color:'#475569'}},c.label)
                        ),
                        h('div',{style:{display:'flex',alignItems:'center',gap:8}},
                          h('span',{style:{fontSize:10.5,color:'#94a3b8'}},pct.toFixed(0)+'%'),
                          h('span',{style:{fontSize:14,fontWeight:800,color:'#0f172a'}},count)
                        )
                      ),
                      h('div',{style:{height:4,background:'#f1f5f9',borderRadius:3}},
                        h('div',{style:{height:4,borderRadius:3,width:pct.toFixed(0)+'%',background:c.color}})
                      )
                    );
                  })
                )
              )
        ),

        // Appointment status breakdown
        h('div',{style:{background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',padding:'22px 26px'}},
          h('div',{style:{fontSize:13,fontWeight:700,color:'#0f172a',marginBottom:14}},'Appointment Status Breakdown'),
          (()=>{
            const statuses=['pending','confirmed','completed','cancelled'];
            const scols={pending:'#f59e0b',confirmed:'#3a7bd5',completed:'#0a7c6e',cancelled:'#ef4444'};
            const total=appointments.length||1;
            return h('div',{style:{display:'flex',flexDirection:'column',gap:10}},
              statuses.map(s=>{
                const cnt=appointments.filter(a=>a.status===s).length;
                return h('div',{key:s},
                  h('div',{style:{display:'flex',justifyContent:'space-between',marginBottom:4}},
                    h('span',{style:{fontSize:12,color:'#475569',textTransform:'capitalize'}},s),
                    h('div',{style:{display:'flex',alignItems:'center',gap:8}},
                      h('span',{style:{fontSize:11,color:'#94a3b8'}},(cnt/total*100).toFixed(0)+'%'),
                      h('span',{style:{fontSize:15,fontWeight:800,color:scols[s]}},cnt)
                    )
                  ),
                  h('div',{style:{height:6,background:'#f1f5f9',borderRadius:4}},
                    h('div',{style:{height:6,borderRadius:4,width:(cnt/total*100).toFixed(0)+'%',background:scols[s]}})
                  )
                );
              })
            );
          })()
        )
      )
    )
  );
}

