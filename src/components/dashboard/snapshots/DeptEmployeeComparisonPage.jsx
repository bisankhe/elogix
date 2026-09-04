// FILE: src/components/dashboard/snapshots/DeptEmployeeComparisonPage.jsx
// eLogix HRMS · eLogix Technologies

import { useState, useEffect } from 'react'

function _sess() {
  try { return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{} } catch{return{}}
}

export default function DeptEmployeeComparisonPage() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    const s=_sess(); const token=localStorage.getItem('access_token')||''; const slug=s?.company?.slug||''
    if (!token||!slug) { setLoading(false); return }
    fetch('/api/v1/hr-analytics', {
      headers: {'Authorization':`Bearer ${token}`,'X-Tenant-Slug':slug,'Content-Type':'application/json'}
    })
      .then(r=>r.ok?r.json():Promise.reject(r.status))
      .then(d=>setData(d.data||d))
      .catch(err=>setError(String(err)))
      .finally(()=>setLoading(false))
  }, [])

  return (
    <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif",padding:24}}>
      <div style={{
        background:'linear-gradient(135deg,#1e1b4b 0%,#7c3aed 60%,#c4b5fd 100%)',
        borderRadius:16,padding:'20px 24px',marginBottom:20,
        boxShadow:'0 4px 24px rgba(124,58,237,.25)'
      }}>
        <div style={{fontSize:20,fontWeight:900,color:'#fff'}}>📊 Dept Employee Comparison</div>
        <div style={{fontSize:11,color:'rgba(255,255,255,.7)',marginTop:4}}>Real-time data from your company</div>
      </div>
      {loading && <div style={{textAlign:'center',padding:40,color:'#7c3aed'}}>
        <div style={{fontSize:32,marginBottom:8}}>⟳</div>Loading...
      </div>}
      {error && !loading && <div style={{padding:'10px 16px',background:'#fef2f2',border:'1px solid #fecaca',borderRadius:8,color:'#dc2626',fontSize:13}}>⚠️ {error}</div>}
      {!loading && !error && !data && <div style={{textAlign:'center',padding:40,color:'#94a3b8'}}>
        <div style={{fontSize:36,marginBottom:8}}>📊</div>
        <div style={{fontSize:13,fontWeight:600}}>No data yet</div>
        <div style={{fontSize:11,marginTop:4}}>Data appears once your company is configured in eLogix</div>
      </div>}
      {!loading && !error && data && <div style={{color:'#64748b',fontSize:13}}>
        <pre style={{background:'#f8fafc',padding:16,borderRadius:8,fontSize:11,overflow:'auto'}}>
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>}
    </div>
  )
}
