// FILE: src/components/dashboard/ITAdministratorDashboard.jsx
// eLogix HRMS — IT Administrator Workspace
// COMPLETE REWRITE — Zero mock data. Real tenant API.
// API: GET /api/v1/it-admin/summary
// eLogix Technologies · www.elogix.com.np

import { useState, useEffect } from 'react'
import { useApp } from '../../context/AppContext.jsx'


function _getSession(){try{return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{}}catch{return{}}}
function _authH(){const s=_getSession();const token=localStorage.getItem('access_token')||s?.token||'';const slug=s?.company?.slug||'';return{'Authorization':`Bearer ${token}`,'X-Tenant-Slug':slug,'Content-Type':'application/json'}}

export default function ITAdministratorDashboard() {
  const { navTo } = useApp()
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [tab,     setTab]     = useState('alerts')

  const s = _getSession(); const company = s?.company || {}

  useEffect(() => {
    const token = localStorage.getItem('access_token') || s?.token || ''
    const slug  = s?.company?.slug || ''
    if (!token || !slug) { setLoading(false); return }
    fetch('/api/v1/it-admin/summary', { headers: _authH() })
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
    <div style={{textAlign:'center',padding:60,color:'#4338ca',fontFamily:'system-ui'}}>
      <div style={{fontSize:30,marginBottom:10}}>⟳</div>
      <div style={{fontSize:12,fontWeight:600}}>Loading for {company?.name}...</div>
    </div>
  )

  return (
    <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif",color:'#0f172a'}}>

      {/* Header */}
      <div style={{background:'linear-gradient(135deg,#1e1b4b 0%,#4338ca 60%,#818cf8 100%)',borderRadius:16,padding:'18px 22px',marginBottom:20,
        boxShadow:'0 4px 20px rgba(0,0,0,.15)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <span style={{fontSize:22}}>{'🖥️'}</span>
          <div>
            <div style={{fontSize:18,fontWeight:900,color:'#fff'}}>IT Administrator Workspace</div>
            <div style={{fontSize:11,color:'rgba(255,255,255,.75)',marginTop:2}}>
              {company?.name} · Users, access, security posture, API health & audit
            </div>
          </div>
        </div>
      </div>

      {error&&<div style={{padding:'10px 16px',background:'#fffbeb',border:'1px solid #fde68a',
        borderRadius:10,fontSize:12,color:'#92400e',marginBottom:14}}>⚠️ {error}</div>}

      {/* KPI Cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(110px,1fr))',gap:12,marginBottom:20}}>
        <div style={{background:'#fff',borderRadius:14,padding:14,textAlign:'center',boxShadow:'0 2px 8px rgba(0,0,0,.05)',border:'1px solid #f1f5f9'}}>
          <div style={{fontSize:24,marginBottom:5}}>{'👤'}</div>
          <div style={{fontSize:15,fontWeight:900,color:'#4338ca'}}>{data?.kpis?.active_accounts ?? '—'}</div>
          <div style={{fontSize:9,color:'#64748b',marginTop:3}}>Active Accounts</div>
        </div>
        <div style={{background:'#fff',borderRadius:14,padding:14,textAlign:'center',boxShadow:'0 2px 8px rgba(0,0,0,.05)',border:'1px solid #f1f5f9'}}>
          <div style={{fontSize:24,marginBottom:5}}>{'🔐'}</div>
          <div style={{fontSize:15,fontWeight:900,color:'#4338ca'}}>{data?.kpis?.mfa_adoption ?? '—'}</div>
          <div style={{fontSize:9,color:'#64748b',marginTop:3}}>MFA Adoption</div>
        </div>
        <div style={{background:'#fff',borderRadius:14,padding:14,textAlign:'center',boxShadow:'0 2px 8px rgba(0,0,0,.05)',border:'1px solid #f1f5f9'}}>
          <div style={{fontSize:24,marginBottom:5}}>{'🚨'}</div>
          <div style={{fontSize:15,fontWeight:900,color:'#4338ca'}}>{data?.kpis?.security_alerts ?? '—'}</div>
          <div style={{fontSize:9,color:'#64748b',marginTop:3}}>Security Alerts</div>
        </div>
        <div style={{background:'#fff',borderRadius:14,padding:14,textAlign:'center',boxShadow:'0 2px 8px rgba(0,0,0,.05)',border:'1px solid #f1f5f9'}}>
          <div style={{fontSize:24,marginBottom:5}}>{'🔌'}</div>
          <div style={{fontSize:15,fontWeight:900,color:'#4338ca'}}>{data?.kpis?.connected_apis ?? '—'}</div>
          <div style={{fontSize:9,color:'#64748b',marginTop:3}}>Connected APIs</div>
        </div>
        <div style={{background:'#fff',borderRadius:14,padding:14,textAlign:'center',boxShadow:'0 2px 8px rgba(0,0,0,.05)',border:'1px solid #f1f5f9'}}>
          <div style={{fontSize:24,marginBottom:5}}>{'✅'}</div>
          <div style={{fontSize:15,fontWeight:900,color:'#4338ca'}}>{data?.kpis?.system_health ?? '—'}</div>
          <div style={{fontSize:9,color:'#64748b',marginTop:3}}>System Health</div>
        </div>
        <div style={{background:'#fff',borderRadius:14,padding:14,textAlign:'center',boxShadow:'0 2px 8px rgba(0,0,0,.05)',border:'1px solid #f1f5f9'}}>
          <div style={{fontSize:24,marginBottom:5}}>{'📋'}</div>
          <div style={{fontSize:15,fontWeight:900,color:'#4338ca'}}>{data?.kpis?.audit_events_24h ?? '—'}</div>
          <div style={{fontSize:9,color:'#64748b',marginTop:3}}>Audit Events (24h)</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:4,background:'#f1f5f9',padding:3,borderRadius:10,marginBottom:14,flexWrap:'wrap'}}>
          <button onClick={()=>setTab('alerts')}
            style={{flex:1,minWidth:70,padding:'7px 8px',borderRadius:9,border:'none',cursor:'pointer',
              fontSize:10,fontWeight:tab==='alerts'?700:400,
              background:tab==='alerts'?'#fff':'transparent',
              color:tab==='alerts'?'#0f172a':'#64748b',
              boxShadow:tab==='alerts'?'0 1px 4px rgba(0,0,0,.08)':'none'}}>
            🚨 Security Alerts
          </button>
          <button onClick={()=>setTab('apis')}
            style={{flex:1,minWidth:70,padding:'7px 8px',borderRadius:9,border:'none',cursor:'pointer',
              fontSize:10,fontWeight:tab==='apis'?700:400,
              background:tab==='apis'?'#fff':'transparent',
              color:tab==='apis'?'#0f172a':'#64748b',
              boxShadow:tab==='apis'?'0 1px 4px rgba(0,0,0,.08)':'none'}}>
            📡 API Health
          </button>
          <button onClick={()=>setTab('access')}
            style={{flex:1,minWidth:70,padding:'7px 8px',borderRadius:9,border:'none',cursor:'pointer',
              fontSize:10,fontWeight:tab==='access'?700:400,
              background:tab==='access'?'#fff':'transparent',
              color:tab==='access'?'#0f172a':'#64748b',
              boxShadow:tab==='access'?'0 1px 4px rgba(0,0,0,.08)':'none'}}>
            👤 Access Review
          </button>
          <button onClick={()=>setTab('audit')}
            style={{flex:1,minWidth:70,padding:'7px 8px',borderRadius:9,border:'none',cursor:'pointer',
              fontSize:10,fontWeight:tab==='audit'?700:400,
              background:tab==='audit'?'#fff':'transparent',
              color:tab==='audit'?'#0f172a':'#64748b',
              boxShadow:tab==='audit'?'0 1px 4px rgba(0,0,0,.08)':'none'}}>
            📋 Audit Log
          </button>
      </div>

      {/* Tab Content */}
            {tab==='alerts'&&(
      
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',overflow:'hidden'}}>
          <div style={{padding:'12px 16px',borderBottom:'1px solid #f1f5f9',fontSize:12,fontWeight:800}}>🚨 Security Alerts</div>
          {(data?.security_alerts||[]).length===0?(
            <div style={{padding:32,textAlign:'center',color:'#94a3b8'}}>
              <div style={{fontSize:32,marginBottom:8}}>✅</div>
              <div style={{fontSize:13,fontWeight:600,color:'#475569'}}>No security alerts for {company?.name}</div>
            </div>
          ):(data?.security_alerts||[]).map((a,i)=>(
            <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',padding:'12px 16px',borderBottom:'1px solid #f8fafc',flexWrap:'wrap',gap:8}}>
              <div style={{flex:1}}>
                <div style={{fontSize:11,color:'#374151'}}>{a.detail||a.message}</div>
                <div style={{fontSize:9,color:'#94a3b8',marginTop:2}}>{a.source||''}{a.user?' · '+a.user:''}</div>
              </div>
              <div style={{textAlign:'right',flexShrink:0}}>
                <span style={{fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20,
                  color:a.severity==='high'?'#dc2626':a.severity==='medium'?'#b45309':'#64748b',
                  background:a.severity==='high'?'#fef2f2':a.severity==='medium'?'#fffbeb':'#f8fafc',
                  border:`1px solid ${a.severity==='high'?'#fecaca':a.severity==='medium'?'#fde68a':'#e2e8f0'}`}}>{(a.severity||'info').toUpperCase()}</span>
                <div style={{fontSize:8,color:'#94a3b8',marginTop:3}}>{a.ago||a.time||''}</div>
              </div>
            </div>
          ))}
          <div style={{padding:'10px 16px'}}>
            <button onClick={()=>navTo('audit-logs')} style={{padding:'7px 14px',borderRadius:8,border:'none',background:'#4338ca',color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>View Audit Logs →</button>
          </div>
        </div>
      )}
            {tab==='apis'&&(
      
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',overflow:'hidden'}}>
          <div style={{padding:'12px 16px',borderBottom:'1px solid #f1f5f9',fontSize:12,fontWeight:800}}>📡 API & Integration Health</div>
          {(data?.api_health||[]).length===0?(
            <div style={{padding:32,textAlign:'center',color:'#94a3b8',fontSize:11}}>No API integrations configured for {company?.name}</div>
          ):(data?.api_health||[]).map((a,i)=>(
            <div key={i} style={{padding:'12px 16px',borderBottom:'1px solid #f8fafc'}}>
              <div style={{display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
                <span style={{fontSize:11,fontWeight:700,color:'#0f172a'}}>{a.name}</span>
                <span style={{fontSize:9,fontWeight:700,color:a.status==='healthy'?'#15803d':'#b45309',
                  background:a.status==='healthy'?'#f0fdf4':'#fffbeb',padding:'2px 8px',borderRadius:20}}>{a.status} · {a.uptime}</span>
              </div>
              {a.flag&&<div style={{fontSize:9,color:'#b45309',marginTop:4}}>⚠️ {a.flag}</div>}
            </div>
          ))}
        </div>
      )}
            {tab==='access'&&(
      
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',padding:'16px 20px'}}>
          <div style={{fontSize:12,fontWeight:800,marginBottom:14}}>👤 Access Review Summary</div>
          {(data?.access_review||[]).length===0?(
            <div style={{textAlign:'center',padding:24,color:'#94a3b8',fontSize:11}}>No access review data yet</div>
          ):(data?.access_review||[]).map((r,i)=>(
            <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #f8fafc',fontSize:12}}>
              <span style={{color:'#475569'}}>{r.label||r.category}</span>
              <span style={{fontWeight:700,color:'#0f172a'}}>{r.count||r.value}</span>
            </div>
          ))}
        </div>
      )}
            {tab==='audit'&&(
      
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',overflow:'hidden'}}>
          <div style={{padding:'12px 16px',borderBottom:'1px solid #f1f5f9',fontSize:12,fontWeight:800}}>📋 Recent Audit Events (24h)</div>
          {(data?.audit_log||[]).length===0?(
            <div style={{padding:32,textAlign:'center',color:'#94a3b8',fontSize:11}}>No audit events in the last 24h</div>
          ):(data?.audit_log||[]).map((e,i)=>(
            <div key={i} style={{display:'flex',gap:10,padding:'10px 16px',borderBottom:'1px solid #f8fafc',alignItems:'flex-start'}}>
              <span style={{fontSize:14,flexShrink:0}}>{e.icon||'📋'}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:11,color:'#0f172a'}}>{e.action||e.description}</div>
                <div style={{fontSize:9,color:'#94a3b8',marginTop:2}}>{e.user} · {e.time||e.timestamp}</div>
              </div>
              <span style={{fontSize:9,color:'#64748b',flexShrink:0}}>{e.ip||''}</span>
            </div>
          ))}
        </div>
      )}

      {/* Quick Links */}
      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'16px 20px'}}>
        <div style={{fontSize:12,fontWeight:800,marginBottom:10}}>🔗 Quick Links</div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <button onClick={()=>navTo('user-management')} style={{padding:'7px 14px',borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#374151',fontSize:10,fontWeight:600,cursor:'pointer'}}>User Management</button>
            <button onClick={()=>navTo('role-permission')} style={{padding:'7px 14px',borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#374151',fontSize:10,fontWeight:600,cursor:'pointer'}}>Role & Permission</button>
            <button onClick={()=>navTo('security-settings')} style={{padding:'7px 14px',borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#374151',fontSize:10,fontWeight:600,cursor:'pointer'}}>Security Settings</button>
            <button onClick={()=>navTo('device-integration')} style={{padding:'7px 14px',borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#374151',fontSize:10,fontWeight:600,cursor:'pointer'}}>Device Integration</button>
            <button onClick={()=>navTo('backup-restore')} style={{padding:'7px 14px',borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#374151',fontSize:10,fontWeight:600,cursor:'pointer'}}>Backup & Restore</button>
            <button onClick={()=>navTo('api-keys')} style={{padding:'7px 14px',borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#374151',fontSize:10,fontWeight:600,cursor:'pointer'}}>API Keys</button>
        </div>
      </div>
    </div>
  )
}
