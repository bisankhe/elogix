// FILE: src/components/dashboard/snapshots/OvertimeMonitoringPage.jsx
// eLogix HRMS — Overtime & Monitoring
// COMPLETE REWRITE — Zero mock data. Real tenant API. No bad imports.
// Removes DEPT_OT_COST, OT_TREND, BURNOUT_ALERTS, GHOST_OT_FLAGS (all fake).
// API: GET /api/v1/overtime/summary  +  GET /api/v1/overtime/records
// eLogix Technologies · www.elogix.com.np

import { useState, useEffect } from 'react'

function _getSession(){try{return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{}}catch{return{}}}
function _authH(){const s=_getSession();const token=localStorage.getItem('access_token')||s?.token||'';const slug=s?.company?.slug||'';return{'Authorization':`Bearer ${token}`,'X-Tenant-Slug':slug,'Content-Type':'application/json'}}

const G='linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fdba74 100%)'
const A='#c2410c'
const RISK_CFG={high:{c:'#ef4444',bg:'#fef2f2'},medium:{c:'#f59e0b',bg:'#fffbeb'},low:{c:'#10b981',bg:'#f0fdf4'}}

function MiniBar({data,color}){
  if(!data?.length)return<div style={{textAlign:'center',padding:20,color:'#94a3b8',fontSize:11}}>No trend data</div>
  const max=Math.max(...data.map(d=>d.hours||0),1)
  return(
    <div style={{display:'flex',gap:6,alignItems:'flex-end',height:60}}>
      {data.map((d,i)=>(
        <div key={i} style={{flex:1,textAlign:'center'}}>
          <div style={{height:`${((d.hours||0)/max)*48}px`,background:color,borderRadius:'4px 4px 0 0',marginBottom:4,minHeight:2}}/>
          <div style={{fontSize:8,color:'#94a3b8'}}>{d.month||d.label||''}</div>
        </div>
      ))}
    </div>
  )
}

export default function OvertimeMonitoringPage(){
  const [summary,  setSummary]  = useState(null)
  const [deptOT,   setDeptOT]   = useState([])
  const [trend,    setTrend]    = useState([])
  const [burnout,  setBurnout]  = useState([])
  const [ghostOT,  setGhostOT]  = useState([])
  const [records,  setRecords]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [tab,      setTab]      = useState('overview')
  const [search,   setSearch]   = useState('')
  const [msg,      setMsg]      = useState('')

  const s=_getSession(); const company=s?.company||{}
  const toast=(m,d=3500)=>{setMsg(m);setTimeout(()=>setMsg(''),d)}

  useEffect(()=>{
    const token=localStorage.getItem('access_token')||s?.token||''
    const slug=s?.company?.slug||''
    if(!token||!slug){setLoading(false);return}
    // Load summary
    fetch('/api/v1/overtime/summary',{headers:_authH()})
      .then(r=>{if(r.status===401){window.dispatchEvent(new CustomEvent('elogix:session-expired'));return null};return r.ok?r.json():null})
      .then(d=>{
        if(!d)return
        setSummary(d.data?.summary||d.summary||d.data||{})
        setDeptOT(d.data?.by_dept||d.by_dept||[])
        setTrend(d.data?.trend||d.trend||[])
        setBurnout(d.data?.burnout_alerts||d.burnout_alerts||d.burnout||[])
        setGhostOT(d.data?.ghost_ot||d.ghost_ot||[])
      })
      .catch(e=>setError(e?.message))
      .finally(()=>setLoading(false))
    // Load individual OT records
    fetch('/api/v1/overtime/records',{headers:_authH()})
      .then(r=>r.ok?r.json():null)
      .then(d=>d&&setRecords(d.data?.records||d.records||d.data||[]))
      .catch(()=>{})
  },[])

  const investigate=async(id)=>{
    try{await fetch(`/api/v1/overtime/records/${id}/flag`,{method:'PATCH',headers:_authH(),body:JSON.stringify({flagged:true})})}catch{}
    setGhostOT(p=>p.map(g=>g.id===id?{...g,flagged:true}:g))
    toast('⚠️ Investigation flagged and notified to manager')
  }
  const approveOT=async(id)=>{
    try{await fetch(`/api/v1/overtime/records/${id}/approve`,{method:'PATCH',headers:_authH()})}catch{}
    setRecords(p=>p.map(r=>r.id===id?{...r,status:'approved'}:r))
    toast('✅ Overtime approved')
  }

  const totalHours=summary?.total_hours||deptOT.reduce((s,d)=>s+(d.ot_hours||0),0)
  const totalCost =summary?.total_cost ||deptOT.reduce((s,d)=>s+(d.ot_cost_npr||0),0)
  const filtRecords=records.filter(r=>!search||(r.employee||r.employee_name||'').toLowerCase().includes(search.toLowerCase()))

  if(loading&&!summary&&deptOT.length===0)return<div style={{textAlign:'center',padding:60,color:A,fontFamily:'system-ui'}}><div style={{fontSize:36,marginBottom:12}}>⟳</div><div style={{fontSize:13,fontWeight:600}}>Loading overtime data for {company?.name}...</div></div>

  return(
    <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif",padding:24,background:'#fff7ed',minHeight:'100vh'}}>
      {msg&&<div style={{position:'fixed',bottom:20,right:20,zIndex:9999,background:'#fffbeb',border:'1px solid #fde68a',borderRadius:10,padding:'10px 18px',fontSize:12,color:'#92400e',boxShadow:'0 4px 16px rgba(0,0,0,.12)',maxWidth:360}}>{msg}</div>}

      {/* Header */}
      <div style={{background:G,borderRadius:16,padding:'20px 24px',marginBottom:20,boxShadow:'0 4px 24px rgba(194,65,12,.25)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:12}}>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
              <span style={{fontSize:24}}>📊</span>
              <div><h2 style={{fontSize:18,fontWeight:900,color:'#fff',margin:0}}>Overtime & Monitoring</h2>
                <div style={{fontSize:11,color:'rgba(255,255,255,.75)',marginTop:2}}>{company?.name} · LA 2074: max 4h/day, 24h/week, 150% pay</div>
              </div>
            </div>
            <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
              {[{l:'Total OT Hours',v:totalHours,i:'⏱️'},{l:'Total OT Cost',v:`NPR ${(totalCost/1000).toFixed(0)}K`,i:'💰'},{l:'Burnout Alerts',v:burnout.length,i:'⚠️'},{l:'Ghost OT Flags',v:ghostOT.length,i:'🚨'}].map((s,i)=>(
                <div key={i} style={{background:'rgba(255,255,255,.15)',borderRadius:10,padding:'6px 12px'}}>
                  <span style={{fontSize:11}}>{s.i}</span><span style={{fontSize:15,fontWeight:800,color:'#fff',marginLeft:5}}>{s.v||'—'}</span>
                  <span style={{fontSize:9,color:'rgba(255,255,255,.7)',marginLeft:3}}>{s.l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* LA 2074 banner */}
      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:10,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#7c2d12',display:'flex',gap:8}}>
        <span style={{fontSize:16}}>⚖️</span>
        <div><strong>Nepal Labour Act 2074:</strong> OT capped at 4hrs/day, 24hrs/week, paid at 150% (Section 30). Worker consent required. Under-18 employees cannot do OT. All OT requires pre-approval.</div>
      </div>

      {error&&<div style={{padding:'12px 16px',background:'#fffbeb',border:'1px solid #fde68a',borderRadius:10,fontSize:12,color:'#92400e',marginBottom:14}}>⚠️ {error}</div>}

      {/* Tabs */}
      <div style={{display:'flex',gap:6,marginBottom:16}}>
        {[['overview','📊 Overview'],['records','📋 OT Records'],['burnout','⚠️ Burnout'],['ghost','🚨 Ghost OT']].map(([v,l])=>(
          <button key={v} onClick={()=>setTab(v)} style={{padding:'8px 16px',borderRadius:20,border:`1.5px solid ${tab===v?A:'#e2e8f0'}`,background:tab===v?A:'#fff',color:tab===v?'#fff':'#64748b',fontSize:11,fontWeight:700,cursor:'pointer'}}>{l}</button>
        ))}
      </div>

      {/* Overview tab */}
      {tab==='overview'&&(
        <div>
          {deptOT.length===0&&burnout.length===0&&trend.length===0&&!loading?(
            <div style={{textAlign:'center',padding:60,background:'#fff',borderRadius:14,border:'2px dashed #fed7aa',color:'#94a3b8'}}>
              <div style={{fontSize:40,marginBottom:12}}>📊</div>
              <div style={{fontSize:14,fontWeight:700,color:'#475569',marginBottom:6}}>No overtime data yet for {company?.name}</div>
              <div style={{fontSize:12}}>OT records appear after employees log overtime and managers approve</div>
            </div>
          ):(
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                {/* Trend chart */}
                <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'16px 18px'}}>
                  <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:4}}>📈 OT Hours Trend (6 Months)</div>
                  <div style={{fontSize:10,color:'#94a3b8',marginBottom:12}}>Month-by-month overtime hours for {company?.name}</div>
                  <MiniBar data={trend} color={A}/>
                </div>
                {/* Burnout alerts */}
                <div style={{background:'#fff',border:'1px solid #fecaca',borderRadius:14,padding:'16px 18px'}}>
                  <div style={{fontSize:12,fontWeight:800,color:'#991b1b',marginBottom:12}}>⚠️ Burnout Threshold Alerts</div>
                  {burnout.length===0?<div style={{textAlign:'center',padding:20,color:'#94a3b8',fontSize:11}}>✅ No burnout alerts — all employees within LA 2074 limits</div>:(
                    burnout.map((b,i)=>(
                      <div key={i} style={{background:b.pct>=100?'#fef2f2':'#fffbeb',borderRadius:10,padding:'10px 12px',marginBottom:8}}>
                        <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                          <div><span style={{fontSize:11,fontWeight:700,color:'#0f172a'}}>{b.employee||b.employee_name}</span><span style={{fontSize:9,color:'#64748b',marginLeft:6}}>{b.dept||b.department}</span></div>
                          <span style={{fontSize:11,fontWeight:800,color:b.pct>=100?'#dc2626':'#b45309'}}>{b.weekly_ot_hours||b.ot_hours}/{b.cap||24}h</span>
                        </div>
                        <div style={{height:6,background:'#f1f5f9',borderRadius:6,overflow:'hidden',marginBottom:6}}>
                          <div style={{width:`${Math.min(b.pct||0,100)}%`,height:'100%',background:b.pct>=100?'#dc2626':'#f59e0b',borderRadius:6}}/>
                        </div>
                        <div style={{fontSize:9,color:'#64748b'}}>{b.note||b.message}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              {/* Dept heatmap */}
              {deptOT.length>0&&(
                <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'16px 18px'}}>
                  <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:12}}>🔥 Department OT Cost Heatmap</div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:10}}>
                    {deptOT.map((d,i)=>{const rc=RISK_CFG[d.risk||'low'];return(
                      <div key={i} style={{background:rc.bg,border:`2px solid ${rc.c}33`,borderRadius:12,padding:'14px 12px',textAlign:'center'}}>
                        <div style={{fontSize:20,fontWeight:900,color:rc.c}}>{d.ot_hours||0}h</div>
                        <div style={{fontSize:10,fontWeight:700,color:'#0f172a',marginTop:4,lineHeight:1.3}}>{d.dept||d.department}</div>
                        <div style={{fontSize:8,color:'#64748b',marginTop:4}}>NPR {((d.ot_cost_npr||0)/1000).toFixed(0)}K · {d.headcount||0} HC</div>
                        <span style={{display:'inline-block',marginTop:6,fontSize:8,fontWeight:700,padding:'1px 8px',borderRadius:20,background:rc.bg,color:rc.c,border:`1px solid ${rc.c}33`}}>{(d.risk||'low').toUpperCase()} RISK</span>
                      </div>
                    )})}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Records tab */}
      {tab==='records'&&(
        <div>
          <div style={{display:'flex',gap:8,marginBottom:12}}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search employee..." style={{flex:1,padding:'8px 14px',borderRadius:10,border:'1.5px solid #e2e8f0',fontSize:12,outline:'none',background:'#fff'}}/>
          </div>
          {records.length===0?(
            <div style={{textAlign:'center',padding:60,background:'#fff',borderRadius:14,border:'2px dashed #fed7aa',color:'#94a3b8'}}>
              <div style={{fontSize:40,marginBottom:12}}>📋</div>
              <div style={{fontSize:14,fontWeight:700,color:'#475569'}}>No OT records yet for {company?.name}</div>
            </div>
          ):(
            <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',overflow:'hidden'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                <thead><tr style={{background:'#f8fafc'}}>{['Employee','Dept','Date','OT Hours','Rate','Cost (NPR)','Status','Actions'].map(h=><th key={h} style={{padding:'10px 12px',textAlign:'left',fontSize:10,fontWeight:700,color:'#64748b',whiteSpace:'nowrap'}}>{h}</th>)}</tr></thead>
                <tbody>
                  {filtRecords.map((r,i)=><tr key={r.id||i} style={{borderBottom:'1px solid #f8fafc',background:i%2?'#fafafa':'#fff'}}>
                    <td style={{padding:'10px 12px'}}><div style={{fontWeight:700,color:'#0f172a'}}>{r.employee||r.employee_name||'—'}</div><div style={{fontSize:9,color:'#94a3b8'}}>{r.emp_code}</div></td>
                    <td style={{padding:'10px 12px',color:'#64748b',fontSize:11}}>{r.dept||r.department||'—'}</td>
                    <td style={{padding:'10px 12px',fontFamily:'monospace',color:'#475569'}}>{r.date||'—'}</td>
                    <td style={{padding:'10px 12px',fontWeight:800,color:A}}>{r.ot_hours||r.hours||'—'}h</td>
                    <td style={{padding:'10px 12px',fontSize:11,color:'#64748b'}}>{r.rate||'150%'}</td>
                    <td style={{padding:'10px 12px',fontWeight:700,color:'#059669'}}>{r.cost_npr?`NPR ${Number(r.cost_npr).toLocaleString('en-IN')}`:'—'}</td>
                    <td style={{padding:'10px 12px'}}><span style={{padding:'2px 8px',borderRadius:20,fontSize:9,fontWeight:700,background:r.status==='approved'?'#f0fdf4':r.status==='rejected'?'#fef2f2':'#fffbeb',color:r.status==='approved'?'#15803d':r.status==='rejected'?'#dc2626':'#b45309'}}>{r.status||'pending'}</span></td>
                    <td style={{padding:'10px 12px'}}>{r.status==='pending'&&<button onClick={()=>approveOT(r.id)} style={{padding:'4px 10px',borderRadius:7,border:'none',background:'#10b981',color:'#fff',fontSize:9,fontWeight:700,cursor:'pointer'}}>✅ Approve</button>}</td>
                  </tr>)}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Burnout tab */}
      {tab==='burnout'&&(
        <div>
          {burnout.length===0?(
            <div style={{textAlign:'center',padding:60,background:'#fff',borderRadius:14,border:'2px dashed #fde68a',color:'#94a3b8'}}>
              <div style={{fontSize:40,marginBottom:12}}>✅</div>
              <div style={{fontSize:14,fontWeight:700,color:'#475569'}}>No burnout alerts — all employees are within LA 2074 OT limits</div>
            </div>
          ):(
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {burnout.map((b,i)=>(
                <div key={i} style={{background:'#fff',border:`1.5px solid ${b.pct>=100?'#fecaca':'#fde68a'}`,borderRadius:14,padding:'16px 18px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                    <div><div style={{fontWeight:800,fontSize:13,color:'#0f172a'}}>{b.employee||b.employee_name}</div><div style={{fontSize:11,color:'#64748b',marginTop:2}}>{b.dept||b.department} · Week: {b.week||'Current'}</div></div>
                    <span style={{fontSize:18,fontWeight:900,color:b.pct>=100?'#dc2626':'#b45309'}}>{b.weekly_ot_hours||b.ot_hours}/{b.cap||24}h</span>
                  </div>
                  <div style={{height:8,background:'#f1f5f9',borderRadius:4,overflow:'hidden',marginBottom:8}}><div style={{width:`${Math.min(b.pct||0,100)}%`,height:'100%',background:b.pct>=100?'#dc2626':'#f59e0b',borderRadius:4}}/></div>
                  <div style={{fontSize:10,color:'#64748b'}}>{b.note||b.message}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Ghost OT tab */}
      {tab==='ghost'&&(
        <div>
          {ghostOT.length===0?(
            <div style={{textAlign:'center',padding:60,background:'#fff',borderRadius:14,border:'2px dashed #fde68a',color:'#94a3b8'}}>
              <div style={{fontSize:40,marginBottom:12}}>✅</div>
              <div style={{fontSize:14,fontWeight:700,color:'#475569'}}>No unauthorized OT flags for {company?.name}</div>
            </div>
          ):(
            <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',overflow:'hidden'}}>
              {ghostOT.map((g,i)=>(
                <div key={i} style={{display:'flex',gap:12,alignItems:'flex-start',padding:'12px 16px',borderBottom:i<ghostOT.length-1?'1px solid #f8fafc':'none'}}>
                  <span style={{background:g.severity==='high'?'#fef2f2':'#fffbeb',color:g.severity==='high'?'#dc2626':'#b45309',fontSize:9,fontWeight:700,padding:'2px 9px',borderRadius:20,flexShrink:0,marginTop:2}}>{(g.severity||'medium').toUpperCase()}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:11,fontWeight:700,color:'#0f172a'}}>{g.employee||g.employee_name} <span style={{color:'#94a3b8',fontWeight:400}}>· {g.date}</span></div>
                    <div style={{fontSize:10,color:'#64748b',marginTop:2}}>{g.detail||g.reason}</div>
                  </div>
                  <button onClick={()=>investigate(g.id)} disabled={g.flagged} style={{padding:'5px 12px',borderRadius:8,border:'1px solid #fecaca',background:g.flagged?'#f8fafc':'#fef2f2',color:g.flagged?'#94a3b8':'#dc2626',fontSize:9,fontWeight:700,cursor:g.flagged?'default':'pointer',flexShrink:0}}>
                    {g.flagged?'Flagged':'Investigate'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
