// FILE: src/components/dashboard/LegalDashboard.jsx
// eLogix HRMS — Legal Workspace
// COMPLETE REWRITE — Zero mock data. Real tenant API.
// API: GET /api/v1/legal-dashboard/summary
// eLogix Technologies · www.elogix.com.np

import { useState, useEffect } from 'react'
import { useApp } from '../../context/AppContext.jsx'


function _getSession(){try{return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{}}catch{return{}}}
function _authH(){const s=_getSession();const token=localStorage.getItem('access_token')||s?.token||'';const slug=s?.company?.slug||'';return{'Authorization':`Bearer ${token}`,'X-Tenant-Slug':slug,'Content-Type':'application/json'}}

export default function LegalDashboard() {
  const { navTo } = useApp()
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [tab,     setTab]     = useState('cases')

  const s = _getSession(); const company = s?.company || {}

  useEffect(() => {
    const token = localStorage.getItem('access_token') || s?.token || ''
    const slug  = s?.company?.slug || ''
    if (!token || !slug) { setLoading(false); return }
    fetch('/api/v1/legal-dashboard/summary', { headers: _authH() })
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
    <div style={{textAlign:'center',padding:60,color:'#57534e',fontFamily:'system-ui'}}>
      <div style={{fontSize:30,marginBottom:10}}>⟳</div>
      <div style={{fontSize:12,fontWeight:600}}>Loading for {company?.name}...</div>
    </div>
  )

  return (
    <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif",color:'#0f172a'}}>

      {/* Header */}
      <div style={{background:'linear-gradient(135deg,#1c1917 0%,#57534e 60%,#d6d3d1 100%)',borderRadius:16,padding:'18px 22px',marginBottom:20,
        boxShadow:'0 4px 20px rgba(0,0,0,.15)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <span style={{fontSize:22}}>{'⚖️'}</span>
          <div>
            <div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Legal Workspace</div>
            <div style={{fontSize:11,color:'rgba(255,255,255,.75)',marginTop:2}}>
              {company?.name} · Case tracking, contract compliance, ethics & litigation holds
            </div>
          </div>
        </div>
      </div>

      {error&&<div style={{padding:'10px 16px',background:'#fffbeb',border:'1px solid #fde68a',
        borderRadius:10,fontSize:12,color:'#92400e',marginBottom:14}}>⚠️ {error}</div>}

      {/* KPI Cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(110px,1fr))',gap:12,marginBottom:20}}>
        <div style={{background:'#fff',borderRadius:14,padding:14,textAlign:'center',boxShadow:'0 2px 8px rgba(0,0,0,.05)',border:'1px solid #f1f5f9'}}>
          <div style={{fontSize:24,marginBottom:5}}>{'⚖️'}</div>
          <div style={{fontSize:15,fontWeight:900,color:'#57534e'}}>{data?.kpis?.active_cases ?? '—'}</div>
          <div style={{fontSize:9,color:'#64748b',marginTop:3}}>Active Cases</div>
        </div>
        <div style={{background:'#fff',borderRadius:14,padding:14,textAlign:'center',boxShadow:'0 2px 8px rgba(0,0,0,.05)',border:'1px solid #f1f5f9'}}>
          <div style={{fontSize:24,marginBottom:5}}>{'📜'}</div>
          <div style={{fontSize:15,fontWeight:900,color:'#57534e'}}>{data?.kpis?.contracts_tracked ?? '—'}</div>
          <div style={{fontSize:9,color:'#64748b',marginTop:3}}>Contracts Tracked</div>
        </div>
        <div style={{background:'#fff',borderRadius:14,padding:14,textAlign:'center',boxShadow:'0 2px 8px rgba(0,0,0,.05)',border:'1px solid #f1f5f9'}}>
          <div style={{fontSize:24,marginBottom:5}}>{'⚠️'}</div>
          <div style={{fontSize:15,fontWeight:900,color:'#57534e'}}>{data?.kpis?.contracts_expiring ?? '—'}</div>
          <div style={{fontSize:9,color:'#64748b',marginTop:3}}>Expiring (30d)</div>
        </div>
        <div style={{background:'#fff',borderRadius:14,padding:14,textAlign:'center',boxShadow:'0 2px 8px rgba(0,0,0,.05)',border:'1px solid #f1f5f9'}}>
          <div style={{fontSize:24,marginBottom:5}}>{'🛡️'}</div>
          <div style={{fontSize:15,fontWeight:900,color:'#57534e'}}>{data?.kpis?.ethics_open ?? '—'}</div>
          <div style={{fontSize:9,color:'#64748b',marginTop:3}}>Ethics Reports Open</div>
        </div>
        <div style={{background:'#fff',borderRadius:14,padding:14,textAlign:'center',boxShadow:'0 2px 8px rgba(0,0,0,.05)',border:'1px solid #f1f5f9'}}>
          <div style={{fontSize:24,marginBottom:5}}>{'🔒'}</div>
          <div style={{fontSize:15,fontWeight:900,color:'#57534e'}}>{data?.kpis?.litigation_holds ?? '—'}</div>
          <div style={{fontSize:9,color:'#64748b',marginTop:3}}>Litigation Holds</div>
        </div>
        <div style={{background:'#fff',borderRadius:14,padding:14,textAlign:'center',boxShadow:'0 2px 8px rgba(0,0,0,.05)',border:'1px solid #f1f5f9'}}>
          <div style={{fontSize:24,marginBottom:5}}>{'📋'}</div>
          <div style={{fontSize:15,fontWeight:900,color:'#57534e'}}>{data?.kpis?.compliance_due ?? '—'}</div>
          <div style={{fontSize:9,color:'#64748b',marginTop:3}}>Compliance Due</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:4,background:'#f1f5f9',padding:3,borderRadius:10,marginBottom:14,flexWrap:'wrap'}}>
          <button onClick={()=>setTab('cases')}
            style={{flex:1,minWidth:70,padding:'7px 8px',borderRadius:9,border:'none',cursor:'pointer',
              fontSize:10,fontWeight:tab==='cases'?700:400,
              background:tab==='cases'?'#fff':'transparent',
              color:tab==='cases'?'#0f172a':'#64748b',
              boxShadow:tab==='cases'?'0 1px 4px rgba(0,0,0,.08)':'none'}}>
            ⚖️ Cases
          </button>
          <button onClick={()=>setTab('contracts')}
            style={{flex:1,minWidth:70,padding:'7px 8px',borderRadius:9,border:'none',cursor:'pointer',
              fontSize:10,fontWeight:tab==='contracts'?700:400,
              background:tab==='contracts'?'#fff':'transparent',
              color:tab==='contracts'?'#0f172a':'#64748b',
              boxShadow:tab==='contracts'?'0 1px 4px rgba(0,0,0,.08)':'none'}}>
            📜 Contracts
          </button>
          <button onClick={()=>setTab('ethics')}
            style={{flex:1,minWidth:70,padding:'7px 8px',borderRadius:9,border:'none',cursor:'pointer',
              fontSize:10,fontWeight:tab==='ethics'?700:400,
              background:tab==='ethics'?'#fff':'transparent',
              color:tab==='ethics'?'#0f172a':'#64748b',
              boxShadow:tab==='ethics'?'0 1px 4px rgba(0,0,0,.08)':'none'}}>
            🛡️ Ethics
          </button>
          <button onClick={()=>setTab('compliance')}
            style={{flex:1,minWidth:70,padding:'7px 8px',borderRadius:9,border:'none',cursor:'pointer',
              fontSize:10,fontWeight:tab==='compliance'?700:400,
              background:tab==='compliance'?'#fff':'transparent',
              color:tab==='compliance'?'#0f172a':'#64748b',
              boxShadow:tab==='compliance'?'0 1px 4px rgba(0,0,0,.08)':'none'}}>
            📋 Compliance
          </button>
      </div>

      {/* Tab Content */}
            {tab==='cases'&&(
      
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',overflow:'hidden'}}>
          <div style={{padding:'12px 16px',borderBottom:'1px solid #f1f5f9',fontSize:12,fontWeight:800}}>⚖️ Active Legal Cases</div>
          {(data?.legal_cases||[]).length===0?(
            <div style={{padding:32,textAlign:'center',color:'#94a3b8'}}>
              <div style={{fontSize:32,marginBottom:8}}>⚖️</div>
              <div style={{fontSize:13,fontWeight:600,color:'#475569'}}>No active cases for {company?.name}</div>
            </div>
          ):(data?.legal_cases||[]).map((c,i)=>(
            <div key={i} style={{padding:'12px 16px',borderBottom:'1px solid #f8fafc'}}>
              <div style={{display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:8,marginBottom:4}}>
                <span style={{fontSize:11,fontWeight:800,color:'#0f172a'}}>{c.case_no||c.id}</span>
                <span style={{fontSize:9,fontWeight:700,color:'#b45309',background:'#fffbeb',padding:'2px 8px',borderRadius:20,border:'1px solid #fde68a'}}>{c.stage||c.status}</span>
              </div>
              <div style={{fontSize:10,color:'#64748b'}}>{c.matter||c.description}</div>
              {c.next_date&&<div style={{fontSize:9,color:'#94a3b8',marginTop:3}}>📅 Next: {c.next_date}</div>}
            </div>
          ))}
        </div>
      )}
            {tab==='contracts'&&(
      
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',overflow:'hidden'}}>
          <div style={{padding:'12px 16px',borderBottom:'1px solid #f1f5f9',fontSize:12,fontWeight:800}}>📜 Contract Compliance</div>
          {(data?.contracts||[]).length===0?(
            <div style={{padding:32,textAlign:'center',color:'#94a3b8',fontSize:11}}>No contracts tracked yet for {company?.name}</div>
          ):(data?.contracts||[]).map((c,i)=>(
            <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 16px',borderBottom:'1px solid #f8fafc'}}>
              <div>
                <div style={{fontSize:11,fontWeight:700}}>{c.title||c.contract_name}</div>
                <div style={{fontSize:9,color:'#94a3b8'}}>{c.party} · Expires {c.expiry_date}</div>
              </div>
              <span style={{fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20,
                background:(c.days_left||999)<=30?'#fef2f2':(c.days_left||999)<=90?'#fffbeb':'#f0fdf4',
                color:(c.days_left||999)<=30?'#dc2626':(c.days_left||999)<=90?'#b45309':'#15803d'}}>{c.days_left}d left</span>
            </div>
          ))}
        </div>
      )}
            {tab==='ethics'&&(
      
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',overflow:'hidden'}}>
          <div style={{padding:'12px 16px',borderBottom:'1px solid #f1f5f9',fontSize:12,fontWeight:800}}>🛡️ Ethics & Governance Reports</div>
          {(data?.ethics_reports||[]).length===0?(
            <div style={{padding:32,textAlign:'center',color:'#94a3b8',fontSize:11}}>No open ethics reports for {company?.name}</div>
          ):(data?.ethics_reports||[]).map((r,i)=>(
            <div key={i} style={{padding:'10px 16px',borderBottom:'1px solid #f8fafc',display:'flex',gap:10,alignItems:'flex-start'}}>
              <span style={{fontSize:16}}>🛡️</span>
              <div>
                <div style={{fontSize:11,fontWeight:700}}>{r.report_no||r.id}</div>
                <div style={{fontSize:10,color:'#64748b'}}>{r.type||r.category} · {r.status}</div>
                <div style={{fontSize:9,color:'#94a3b8',marginTop:2}}>Submitted: {r.submitted_date}</div>
              </div>
            </div>
          ))}
        </div>
      )}
            {tab==='compliance'&&(
      
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',padding:'16px 20px'}}>
          <div style={{fontSize:12,fontWeight:800,marginBottom:14}}>📋 Compliance Reviews Due</div>
          {(data?.compliance_items||[]).length===0?(
            <div style={{textAlign:'center',padding:24,color:'#94a3b8',fontSize:11}}>✅ No compliance reviews due</div>
          ):(data?.compliance_items||[]).map((c,i)=>(
            <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #f8fafc',fontSize:12}}>
              <span style={{color:'#475569'}}>{c.item||c.requirement}</span>
              <span style={{fontWeight:700,color:c.overdue?'#dc2626':'#f59e0b'}}>{c.due_date}{c.overdue?' ⚠️':''}</span>
            </div>
          ))}
        </div>
      )}

      {/* Quick Links */}
      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'16px 20px'}}>
        <div style={{fontSize:12,fontWeight:800,marginBottom:10}}>🔗 Quick Links</div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <button onClick={()=>navTo('legal-case-tracking')} style={{padding:'7px 14px',borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#374151',fontSize:10,fontWeight:600,cursor:'pointer'}}>Legal Case Tracking</button>
            <button onClick={()=>navTo('contract-compliance')} style={{padding:'7px 14px',borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#374151',fontSize:10,fontWeight:600,cursor:'pointer'}}>Contract Compliance</button>
            <button onClick={()=>navTo('ethics-governance')} style={{padding:'7px 14px',borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#374151',fontSize:10,fontWeight:600,cursor:'pointer'}}>Ethics & Governance</button>
            <button onClick={()=>navTo('license-management')} style={{padding:'7px 14px',borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#374151',fontSize:10,fontWeight:600,cursor:'pointer'}}>License Management</button>
            <button onClick={()=>navTo('litigation-hold')} style={{padding:'7px 14px',borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#374151',fontSize:10,fontWeight:600,cursor:'pointer'}}>Litigation Hold</button>
        </div>
      </div>
    </div>
  )
}
