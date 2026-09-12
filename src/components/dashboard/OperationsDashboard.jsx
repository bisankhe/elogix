// FILE: src/components/dashboard/OperationsDashboard.jsx
// eLogix HRMS — Operations Workspace
// COMPLETE REWRITE — Zero mock data. Real tenant API.
// API: GET /api/v1/operations-dashboard/summary
// eLogix Technologies · www.elogix.com.np

import { useState, useEffect } from 'react'
import { useApp } from '../../context/AppContext.jsx'


function _getSession(){try{return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{}}catch{return{}}}
function _authH(){const s=_getSession();const token=localStorage.getItem('access_token')||s?.token||'';const slug=s?.company?.slug||'';return{'Authorization':`Bearer ${token}`,'X-Tenant-Slug':slug,'Content-Type':'application/json'}}

export default function OperationsDashboard() {
  const { navTo } = useApp()
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [tab,     setTab]     = useState('field')

  const s = _getSession(); const company = s?.company || {}

  useEffect(() => {
    const token = localStorage.getItem('access_token') || s?.token || ''
    const slug  = s?.company?.slug || ''
    if (!token || !slug) { setLoading(false); return }
    fetch('/api/v1/operations-dashboard/summary', { headers: _authH() })
      .then(r => {
        if(r.status===401){window.dispatchEvent(new CustomEvent('elogix:session-expired'));throw new Error('Session expired')}
        if(!r.ok) throw new Error(`Error ${r.status}`)
        return r.json()
      })
      .then(d => setData(d.data || d))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{textAlign:'center',padding:60,color:'#c2410c',fontFamily:'system-ui'}}>
      <div style={{fontSize:30,marginBottom:10}}>⟳</div>
      <div style={{fontSize:12,fontWeight:600}}>Loading for {company?.name}...</div>
    </div>
  )

  return (
    <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif",color:'#0f172a'}}>

      {/* Header */}
      <div style={{background:'linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fb923c 100%)',borderRadius:16,padding:'18px 22px',marginBottom:20,
        boxShadow:'0 4px 20px rgba(0,0,0,.15)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <span style={{fontSize:22}}>{'⚙️'}</span>
          <div>
            <div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Operations Workspace</div>
            <div style={{fontSize:11,color:'rgba(255,255,255,.75)',marginTop:2}}>
              {company?.name} · Field ops, attendance, route monitoring, vendor & task oversight
            </div>
          </div>
        </div>
      </div>

      {error&&<div style={{padding:'10px 16px',background:'#fffbeb',border:'1px solid #fde68a',
        borderRadius:10,fontSize:12,color:'#92400e',marginBottom:14}}>⚠️ {error}</div>}

      {/* KPI Cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(110px,1fr))',gap:12,marginBottom:20}}>
        <div style={{background:'#fff',borderRadius:14,padding:14,textAlign:'center',boxShadow:'0 2px 8px rgba(0,0,0,.05)',border:'1px solid #f1f5f9'}}>
          <div style={{fontSize:24,marginBottom:5}}>{'✅'}</div>
          <div style={{fontSize:15,fontWeight:900,color:'#c2410c'}}>{data?.kpis?.field_tasks_today ?? '—'}</div>
          <div style={{fontSize:9,color:'#64748b',marginTop:3}}>Field Tasks Today</div>
        </div>
        <div style={{background:'#fff',borderRadius:14,padding:14,textAlign:'center',boxShadow:'0 2px 8px rgba(0,0,0,.05)',border:'1px solid #f1f5f9'}}>
          <div style={{fontSize:24,marginBottom:5}}>{'🗺️'}</div>
          <div style={{fontSize:15,fontWeight:900,color:'#c2410c'}}>{data?.kpis?.active_routes ?? '—'}</div>
          <div style={{fontSize:9,color:'#64748b',marginTop:3}}>Active Routes</div>
        </div>
        <div style={{background:'#fff',borderRadius:14,padding:14,textAlign:'center',boxShadow:'0 2px 8px rgba(0,0,0,.05)',border:'1px solid #f1f5f9'}}>
          <div style={{fontSize:24,marginBottom:5}}>{'📋'}</div>
          <div style={{fontSize:15,fontWeight:900,color:'#c2410c'}}>{data?.kpis?.outsourced_attendance ?? '—'}</div>
          <div style={{fontSize:9,color:'#64748b',marginTop:3}}>Outsourced Attendance</div>
        </div>
        <div style={{background:'#fff',borderRadius:14,padding:14,textAlign:'center',boxShadow:'0 2px 8px rgba(0,0,0,.05)',border:'1px solid #f1f5f9'}}>
          <div style={{fontSize:24,marginBottom:5}}>{'🏭'}</div>
          <div style={{fontSize:15,fontWeight:900,color:'#c2410c'}}>{data?.kpis?.active_vendors ?? '—'}</div>
          <div style={{fontSize:9,color:'#64748b',marginTop:3}}>Active Vendors</div>
        </div>
        <div style={{background:'#fff',borderRadius:14,padding:14,textAlign:'center',boxShadow:'0 2px 8px rgba(0,0,0,.05)',border:'1px solid #f1f5f9'}}>
          <div style={{fontSize:24,marginBottom:5}}>{'⚠️'}</div>
          <div style={{fontSize:15,fontWeight:900,color:'#c2410c'}}>{data?.kpis?.exceptions_flagged ?? '—'}</div>
          <div style={{fontSize:9,color:'#64748b',marginTop:3}}>Exceptions Flagged</div>
        </div>
        <div style={{background:'#fff',borderRadius:14,padding:14,textAlign:'center',boxShadow:'0 2px 8px rgba(0,0,0,.05)',border:'1px solid #f1f5f9'}}>
          <div style={{fontSize:24,marginBottom:5}}>{'🚗'}</div>
          <div style={{fontSize:15,fontWeight:900,color:'#c2410c'}}>{data?.kpis?.vehicles_on_route ?? '—'}</div>
          <div style={{fontSize:9,color:'#64748b',marginTop:3}}>Vehicles on Route</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:4,background:'#f1f5f9',padding:3,borderRadius:10,marginBottom:14,flexWrap:'wrap'}}>
          <button onClick={()=>setTab('field')}
            style={{flex:1,minWidth:70,padding:'7px 8px',borderRadius:9,border:'none',cursor:'pointer',
              fontSize:10,fontWeight:tab==='field'?700:400,
              background:tab==='field'?'#fff':'transparent',
              color:tab==='field'?'#0f172a':'#64748b',
              boxShadow:tab==='field'?'0 1px 4px rgba(0,0,0,.08)':'none'}}>
            ✅ Field Ops
          </button>
          <button onClick={()=>setTab('attendance')}
            style={{flex:1,minWidth:70,padding:'7px 8px',borderRadius:9,border:'none',cursor:'pointer',
              fontSize:10,fontWeight:tab==='attendance'?700:400,
              background:tab==='attendance'?'#fff':'transparent',
              color:tab==='attendance'?'#0f172a':'#64748b',
              boxShadow:tab==='attendance'?'0 1px 4px rgba(0,0,0,.08)':'none'}}>
            📋 Attendance
          </button>
          <button onClick={()=>setTab('vendors')}
            style={{flex:1,minWidth:70,padding:'7px 8px',borderRadius:9,border:'none',cursor:'pointer',
              fontSize:10,fontWeight:tab==='vendors'?700:400,
              background:tab==='vendors'?'#fff':'transparent',
              color:tab==='vendors'?'#0f172a':'#64748b',
              boxShadow:tab==='vendors'?'0 1px 4px rgba(0,0,0,.08)':'none'}}>
            🏭 Vendors
          </button>
          <button onClick={()=>setTab('routes')}
            style={{flex:1,minWidth:70,padding:'7px 8px',borderRadius:9,border:'none',cursor:'pointer',
              fontSize:10,fontWeight:tab==='routes'?700:400,
              background:tab==='routes'?'#fff':'transparent',
              color:tab==='routes'?'#0f172a':'#64748b',
              boxShadow:tab==='routes'?'0 1px 4px rgba(0,0,0,.08)':'none'}}>
            🗺️ Routes
          </button>
      </div>

      {/* Tab Content */}
            {tab==='field'&&(
      
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',overflow:'hidden'}}>
          <div style={{padding:'12px 16px',borderBottom:'1px solid #f1f5f9',fontSize:12,fontWeight:800}}>✅ Field Operations Snapshot</div>
          {(data?.field_ops||[]).length===0?(
            <div style={{padding:32,textAlign:'center',color:'#94a3b8'}}>
              <div style={{fontSize:32,marginBottom:8}}>✅</div>
              <div style={{fontSize:13,fontWeight:600,color:'#475569'}}>No field ops data yet for {company?.name}</div>
            </div>
          ):(data?.field_ops||[]).map((f,i)=>(
            <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 16px',borderBottom:'1px solid #f8fafc'}}>
              <span style={{fontSize:11,color:'#374151'}}>{f.label||f.task_group}</span>
              <span style={{fontSize:12,fontWeight:800,color:'#c2410c'}}>{f.value||f.progress}</span>
            </div>
          ))}
        </div>
      )}
            {tab==='attendance'&&(
      
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',overflow:'hidden'}}>
          <div style={{padding:'12px 16px',borderBottom:'1px solid #f1f5f9',fontSize:12,fontWeight:800}}>📋 Outsourced Attendance</div>
          {(data?.attendance||[]).length===0?(
            <div style={{padding:32,textAlign:'center',color:'#94a3b8',fontSize:11}}>No outsourced attendance data yet</div>
          ):(data?.attendance||[]).map((a,i)=>(
            <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 16px',borderBottom:'1px solid #f8fafc'}}>
              <div>
                <div style={{fontSize:11,fontWeight:600}}>{a.vendor||a.contractor}</div>
                <div style={{fontSize:9,color:'#94a3b8'}}>{a.location||a.site} · {a.date}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:12,fontWeight:700,color:'#c2410c'}}>{a.attendance_rate||a.rate}%</div>
                <div style={{fontSize:9,color:'#94a3b8'}}>{a.present}/{a.total}</div>
              </div>
            </div>
          ))}
        </div>
      )}
            {tab==='vendors'&&(
      
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',overflow:'hidden'}}>
          <div style={{padding:'12px 16px',borderBottom:'1px solid #f1f5f9',fontSize:12,fontWeight:800}}>🏭 Active Vendors</div>
          {(data?.vendors||[]).length===0?(
            <div style={{padding:32,textAlign:'center',color:'#94a3b8',fontSize:11}}>No vendor data yet</div>
          ):(data?.vendors||[]).map((v,i)=>(
            <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 16px',borderBottom:'1px solid #f8fafc'}}>
              <div>
                <div style={{fontSize:11,fontWeight:700}}>{v.name}</div>
                <div style={{fontSize:9,color:'#94a3b8'}}>{v.category} · {v.workers} workers</div>
              </div>
              <span style={{fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20,
                background:v.status==='active'?'#f0fdf4':'#fffbeb',
                color:v.status==='active'?'#15803d':'#b45309'}}>{v.status}</span>
            </div>
          ))}
        </div>
      )}
            {tab==='routes'&&(
      
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',overflow:'hidden'}}>
          <div style={{padding:'12px 16px',borderBottom:'1px solid #f1f5f9',fontSize:12,fontWeight:800}}>🗺️ Active Route Monitoring</div>
          {(data?.routes||[]).length===0?(
            <div style={{padding:32,textAlign:'center',color:'#94a3b8',fontSize:11}}>No active routes</div>
          ):(data?.routes||[]).map((r,i)=>(
            <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 16px',borderBottom:'1px solid #f8fafc'}}>
              <div>
                <div style={{fontSize:11,fontWeight:700}}>{r.route_name||r.name}</div>
                <div style={{fontSize:9,color:'#94a3b8'}}>{r.driver} · {r.vehicle}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <span style={{fontSize:9,fontWeight:700,color:'#c2410c'}}>{r.progress||r.status}</span>
                <div style={{fontSize:8,color:'#94a3b8'}}>{r.eta||''}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Links */}
      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'16px 20px'}}>
        <div style={{fontSize:12,fontWeight:800,marginBottom:10}}>🔗 Quick Links</div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <button onClick={()=>navTo('field-task-management')} style={{padding:'7px 14px',borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#374151',fontSize:10,fontWeight:600,cursor:'pointer'}}>Field Task Management</button>
            <button onClick={()=>navTo('route-monitoring')} style={{padding:'7px 14px',borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#374151',fontSize:10,fontWeight:600,cursor:'pointer'}}>Route Monitoring</button>
            <button onClick={()=>navTo('outsource-attendance-rpt')} style={{padding:'7px 14px',borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#374151',fontSize:10,fontWeight:600,cursor:'pointer'}}>Outsource Attendance</button>
            <button onClick={()=>navTo('gps-tracking-config')} style={{padding:'7px 14px',borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#374151',fontSize:10,fontWeight:600,cursor:'pointer'}}>GPS Tracking</button>
            <button onClick={()=>navTo('vendor-management')} style={{padding:'7px 14px',borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#374151',fontSize:10,fontWeight:600,cursor:'pointer'}}>Vendor Management</button>
        </div>
      </div>
    </div>
  )
}
