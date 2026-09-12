// FILE: src/components/dashboard/snapshots/HeadcountPlanPage.jsx
// eLogix HRMS — Headcount Plan
// COMPLETE REWRITE — Real tenant API. Zero mock data. No wrong API.
// API: GET/POST/PUT/DELETE /api/v1/headcount/plan
// eLogix Technologies · www.elogix.com.np

import { useState, useEffect } from 'react'

function _getSession(){try{return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{}}catch{return {}}}
function _authH(){const s=_getSession();const token=localStorage.getItem('access_token')||s?.token||'';const slug=s?.company?.slug||'';return{'Authorization':`Bearer ${token}`,'X-Tenant-Slug':slug,'Content-Type':'application/json'}}

const G='linear-gradient(135deg,#0c4a6e 0%,#0369a1 60%,#38bdf8 100%)'
const A='#0369a1'

export default function HeadcountPlanPage(){
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [saving,  setSaving]  = useState(false)
  const [msg,     setMsg]     = useState('')

  const s=_getSession(); const company=s?.company||{}
  const toast=(m,d=3500)=>{setMsg(m);setTimeout(()=>setMsg(''),d)}

  useEffect(()=>{
    const token=localStorage.getItem('access_token')||s?.token||''
    const slug=s?.company?.slug||''
    if(!token||!slug){setLoading(false);return}
    fetch('/api/v1/headcount/plan',{headers:_authH()})
      .then(r=>{if(r.status===401){window.dispatchEvent(new CustomEvent('elogix:session-expired'));throw new Error('Session expired')};if(!r.ok)throw new Error(`Error ${r.status}`);return r.json()})
      .then(d=>setData(d.data||d))
      .catch(e=>setError(e.message))
      .finally(()=>setLoading(false))
  },[])

  if(loading)return<div style={{textAlign:'center',padding:60,color:A,fontFamily:'system-ui'}}><div style={{fontSize:36,marginBottom:12}}>⟳</div><div style={{fontSize:13,fontWeight:600}}>Loading Headcount Plan for {company?.name}...</div></div>

  return(
    <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif",padding:24,background:'#f8fafc',minHeight:'100vh'}}>
      {msg&&<div style={{position:'fixed',bottom:20,right:20,zIndex:9999,background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 18px',fontSize:12,color:'#14532d',boxShadow:'0 4px 16px rgba(0,0,0,.12)',maxWidth:360}}>{msg}</div>}

      {/* Header */}
      <div style={{background:G,borderRadius:16,padding:'20px 24px',marginBottom:20,boxShadow:`0 4px 24px ${A}30`}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
          <span style={{fontSize:24}}>📋</span>
          <div>
            <h2 style={{fontSize:18,fontWeight:900,color:'#fff',margin:0}}>Headcount Plan</h2>
            <div style={{fontSize:11,color:'rgba(255,255,255,.75)',marginTop:2}}>{company?.name} · Nepal Labour Act 2074 compliant</div>
          </div>
        </div>
      </div>

      {error&&<div style={{padding:'12px 16px',background:'#fffbeb',border:'1px solid #fde68a',borderRadius:10,fontSize:12,color:'#92400e',marginBottom:14}}>⚠️ {error}</div>}

      {!data&&!loading&&(
        <div style={{textAlign:'center',padding:60,background:'#fff',borderRadius:14,border:'2px dashed #e2e8f0',color:'#94a3b8'}}>
          <div style={{fontSize:48,marginBottom:16}}>📋</div>
          <div style={{fontSize:15,fontWeight:700,color:'#475569',marginBottom:6}}>No headcount plan data yet for {company?.name}</div>
          <div style={{fontSize:12}}>Set up headcount plan rules to see them here</div>
        </div>
      )}

      {data&&(
        <div style={{display:'flex',flexDirection:'column',gap:16}}>

          {/* Current vs Planned */}
          {data.current_vs_planned&&(
            <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',overflow:'hidden'}}>
              <div style={{padding:'14px 18px',borderBottom:'1px solid #f1f5f9',fontWeight:800,fontSize:13,color:'#0f172a'}}>Current vs Planned</div>
              <div style={{padding:'16px 18px'}}>
                {Array.isArray(data.current_vs_planned)?(
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:10}}>
                    {data.current_vs_planned.map((item,i)=>(
                      <div key={i} style={{background:'#f8fafc',borderRadius:10,padding:'12px 14px',border:'1px solid #e2e8f0'}}>
                        {Object.entries(item).map(([k,v])=>(
                          <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'4px 0',fontSize:11}}>
                            <span style={{color:'#64748b',textTransform:'capitalize'}}>{k.replace(/_/g," ")}:</span>
                            <span style={{fontWeight:600,color:'#0f172a'}}>{String(v).slice(0,50)}...</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ):(
                  <div style={{background:'#f8fafc',borderRadius:10,padding:'14px',border:'1px solid #e2e8f0'}}>
                    {Object.entries(data.current_vs_planned).map(([k,v])=>(
                      <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid #f1f5f9',fontSize:12}}>
                        <span style={{color:'#64748b',textTransform:'capitalize'}}>{k.replace(/_/g," ")}:</span>
                        <span style={{fontWeight:700,color:'#0f172a'}}>{String(v).slice(0,60)}...</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Department Breakdown */}
          {data.dept_breakdown&&(
            <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',overflow:'hidden'}}>
              <div style={{padding:'14px 18px',borderBottom:'1px solid #f1f5f9',fontWeight:800,fontSize:13,color:'#0f172a'}}>Department Breakdown</div>
              <div style={{padding:'16px 18px'}}>
                {Array.isArray(data.dept_breakdown)?(
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:10}}>
                    {data.dept_breakdown.map((item,i)=>(
                      <div key={i} style={{background:'#f8fafc',borderRadius:10,padding:'12px 14px',border:'1px solid #e2e8f0'}}>
                        {Object.entries(item).map(([k,v])=>(
                          <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'4px 0',fontSize:11}}>
                            <span style={{color:'#64748b',textTransform:'capitalize'}}>{k.replace(/_/g," ")}:</span>
                            <span style={{fontWeight:600,color:'#0f172a'}}>{String(v).slice(0,50)}...</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ):(
                  <div style={{background:'#f8fafc',borderRadius:10,padding:'14px',border:'1px solid #e2e8f0'}}>
                    {Object.entries(data.dept_breakdown).map(([k,v])=>(
                      <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid #f1f5f9',fontSize:12}}>
                        <span style={{color:'#64748b',textTransform:'capitalize'}}>{k.replace(/_/g," ")}:</span>
                        <span style={{fontWeight:700,color:'#0f172a'}}>{String(v).slice(0,60)}...</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Open Positions */}
          {data.open_positions&&(
            <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',overflow:'hidden'}}>
              <div style={{padding:'14px 18px',borderBottom:'1px solid #f1f5f9',fontWeight:800,fontSize:13,color:'#0f172a'}}>Open Positions</div>
              <div style={{padding:'16px 18px'}}>
                {Array.isArray(data.open_positions)?(
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:10}}>
                    {data.open_positions.map((item,i)=>(
                      <div key={i} style={{background:'#f8fafc',borderRadius:10,padding:'12px 14px',border:'1px solid #e2e8f0'}}>
                        {Object.entries(item).map(([k,v])=>(
                          <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'4px 0',fontSize:11}}>
                            <span style={{color:'#64748b',textTransform:'capitalize'}}>{k.replace(/_/g," ")}:</span>
                            <span style={{fontWeight:600,color:'#0f172a'}}>{String(v).slice(0,50)}...</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ):(
                  <div style={{background:'#f8fafc',borderRadius:10,padding:'14px',border:'1px solid #e2e8f0'}}>
                    {Object.entries(data.open_positions).map(([k,v])=>(
                      <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid #f1f5f9',fontSize:12}}>
                        <span style={{color:'#64748b',textTransform:'capitalize'}}>{k.replace(/_/g," ")}:</span>
                        <span style={{fontWeight:700,color:'#0f172a'}}>{String(v).slice(0,60)}...</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Planned Hires */}
          {data.planned_hires&&(
            <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',overflow:'hidden'}}>
              <div style={{padding:'14px 18px',borderBottom:'1px solid #f1f5f9',fontWeight:800,fontSize:13,color:'#0f172a'}}>Planned Hires</div>
              <div style={{padding:'16px 18px'}}>
                {Array.isArray(data.planned_hires)?(
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:10}}>
                    {data.planned_hires.map((item,i)=>(
                      <div key={i} style={{background:'#f8fafc',borderRadius:10,padding:'12px 14px',border:'1px solid #e2e8f0'}}>
                        {Object.entries(item).map(([k,v])=>(
                          <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'4px 0',fontSize:11}}>
                            <span style={{color:'#64748b',textTransform:'capitalize'}}>{k.replace(/_/g," ")}:</span>
                            <span style={{fontWeight:600,color:'#0f172a'}}>{String(v).slice(0,50)}...</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ):(
                  <div style={{background:'#f8fafc',borderRadius:10,padding:'14px',border:'1px solid #e2e8f0'}}>
                    {Object.entries(data.planned_hires).map(([k,v])=>(
                      <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid #f1f5f9',fontSize:12}}>
                        <span style={{color:'#64748b',textTransform:'capitalize'}}>{k.replace(/_/g," ")}:</span>
                        <span style={{fontWeight:700,color:'#0f172a'}}>{String(v).slice(0,60)}...</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  )
}
