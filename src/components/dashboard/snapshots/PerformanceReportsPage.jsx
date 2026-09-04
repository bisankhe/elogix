// FILE: src/components/dashboard/snapshots/PerformanceReportsPage.jsx
// eLogix HRMS — Performance Reports
// Tenant-aware: loads real data for logged-in company only
// eLogix Technologies · www.elogix.com.np

import { useState, useEffect } from 'react'

function _s() {
  try { return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{} } catch{return{}}
}

export default function PerformanceReportsPage() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    const s=_s()
    const token=localStorage.getItem('access_token')||s?.token||''
    const slug=s?.company?.slug||localStorage.getItem('elogix_tenant_slug')||''
    if (!token||!slug) { setLoading(false); return }
    fetch('/api/v1/performance', {
      headers:{'Authorization':`Bearer ${token}`,'X-Tenant-Slug':slug,'Content-Type':'application/json'}
    })
      .then(r=>{ if(r.status===401){ window.dispatchEvent(new CustomEvent('elogix:session-expired')); throw new Error('Session expired') } return r.ok?r.json():Promise.reject(r.status) })
      .then(d=>setData(d.data||d))
      .catch(err=>setError(String(err)))
      .finally(()=>setLoading(false))
  }, [])

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',padding:60,color:'#7c3aed',fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:36,marginBottom:8,display:'inline-block',animation:'spin 1s linear infinite'}}>⟳</div>
        <div style={{fontSize:13,fontWeight:600}}>Loading Performance Reports...</div>
        <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  )

  return (
    <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif",padding:24,minHeight:400}}>
      <div style={{
        background:'linear-gradient(135deg,#1e1b4b 0%,#7c3aed 60%,#c4b5fd 100%)',
        borderRadius:16,padding:'20px 24px',marginBottom:20,
        boxShadow:'0 4px 24px rgba(124,58,237,.25)'
      }}>
        <div style={{fontSize:20,fontWeight:900,color:'#fff'}}>
          🎯 Performance Reports
        </div>
        <div style={{fontSize:11,color:'rgba(255,255,255,.7)',marginTop:4}}>
          {(() => { const s=_s(); return s?.company?.name||'Your Company' })()} · Real-time data
        </div>
      </div>

      {error && (
        <div style={{padding:'10px 16px',background:'#fef2f2',border:'1px solid #fecaca',
          borderRadius:8,color:'#dc2626',fontSize:13,marginBottom:16,fontWeight:600}}>
          ⚠️ {error}
        </div>
      )}

      {!error && !data && (
        <div style={{textAlign:'center',padding:60,color:'#94a3b8'}}>
          <div style={{fontSize:48,marginBottom:12}}>📊</div>
          <div style={{fontSize:14,fontWeight:600,marginBottom:4}}>No data yet</div>
          <div style={{fontSize:12}}>
            Data appears here once your company records are added in eLogix.
          </div>
        </div>
      )}

      {data && (
        <div style={{background:'#f8fafc',borderRadius:12,padding:20,border:'1px solid #e2e8f0'}}>
          <div style={{fontSize:13,color:'#64748b',marginBottom:8}}>
            ✅ Connected to your company data
          </div>
          <pre style={{fontSize:11,color:'#475569',overflow:'auto',maxHeight:400}}>
            {JSON.stringify(data,null,2)}
          </pre>
        </div>
      )}
    </div>
  )
}
