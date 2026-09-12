// FILE: src/components/dashboard/ProcurementDashboard.jsx
// eLogix HRMS — Procurement Workspace
// COMPLETE REWRITE — Zero mock data. Real tenant API. No bad imports.
// API: GET /api/v1/procurement/summary
// eLogix Technologies · www.elogix.com.np

import { useState, useEffect } from 'react'
import { useApp } from '../../context/AppContext.jsx'

function _getSession(){try{return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{}}catch{return{}}}
function _authH(){const s=_getSession();const token=localStorage.getItem('access_token')||s?.token||'';const slug=s?.company?.slug||'';return{'Authorization':`Bearer ${token}`,'X-Tenant-Slug':slug,'Content-Type':'application/json'}}

export default function ProcurementDashboard() {
  const { navTo } = useApp()
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [tab,     setTab]     = useState('po')

  const s = _getSession(); const company = s?.company || {}

  useEffect(() => {
    const token = localStorage.getItem('access_token') || s?.token || ''
    const slug  = s?.company?.slug || ''
    if (!token || !slug) { setLoading(false); return }
    fetch('/api/v1/procurement/summary', { headers: _authH() })
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
    <div style={{textAlign:'center',padding:60,color:'#0284c7',fontFamily:'system-ui'}}>
      <div style={{fontSize:30,marginBottom:10}}>⟳</div>
      <div style={{fontSize:12,fontWeight:600}}>Loading for {company?.name}...</div>
    </div>
  )

  return (
    <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif",color:'#0f172a'}}>
      {/* Header */}
      <div style={{background:'linear-gradient(135deg,#0c4a6e 0%,#0284c7 60%,#38bdf8 100%)',borderRadius:16,padding:'18px 22px',marginBottom:20,boxShadow:'0 4px 20px rgba(0,0,0,.15)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <span style={{fontSize:22}}>{'📦'}</span>
          <div>
            <div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Procurement Workspace</div>
            <div style={{fontSize:11,color:'rgba(255,255,255,.75)',marginTop:2}}>{company?.name} · Purchase orders, vendor agreements & asset acquisition</div>
          </div>
        </div>
      </div>
      {error&&<div style={{padding:'10px 16px',background:'#fffbeb',border:'1px solid #fde68a',borderRadius:10,fontSize:12,color:'#92400e',marginBottom:14}}>⚠️ {error}</div>}
      {/* KPIs */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(110px,1fr))',gap:12,marginBottom:20}}>
        <div style={{background:'#fff',borderRadius:14,padding:14,textAlign:'center',boxShadow:'0 2px 8px rgba(0,0,0,.04)',border:'1px solid #f1f5f9'}}>
          <div style={{fontSize:24,marginBottom:5}}>{'📋'}</div>
          <div style={{fontSize:15,fontWeight:900,color:'#0284c7'}}>{data?.kpis?.open_pos ?? '—'}</div>
          <div style={{fontSize:9,color:'#64748b',marginTop:3}}>Open POs</div>
        </div>
        <div style={{background:'#fff',borderRadius:14,padding:14,textAlign:'center',boxShadow:'0 2px 8px rgba(0,0,0,.04)',border:'1px solid #f1f5f9'}}>
          <div style={{fontSize:24,marginBottom:5}}>{'🏭'}</div>
          <div style={{fontSize:15,fontWeight:900,color:'#0284c7'}}>{data?.kpis?.active_vendors ?? '—'}</div>
          <div style={{fontSize:9,color:'#64748b',marginTop:3}}>Active Vendors</div>
        </div>
        <div style={{background:'#fff',borderRadius:14,padding:14,textAlign:'center',boxShadow:'0 2px 8px rgba(0,0,0,.04)',border:'1px solid #f1f5f9'}}>
          <div style={{fontSize:24,marginBottom:5}}>{'📅'}</div>
          <div style={{fontSize:15,fontWeight:900,color:'#0284c7'}}>{data?.kpis?.renewals_30d ?? '—'}</div>
          <div style={{fontSize:9,color:'#64748b',marginTop:3}}>Renewals (30d)</div>
        </div>
        <div style={{background:'#fff',borderRadius:14,padding:14,textAlign:'center',boxShadow:'0 2px 8px rgba(0,0,0,.04)',border:'1px solid #f1f5f9'}}>
          <div style={{fontSize:24,marginBottom:5}}>{'💰'}</div>
          <div style={{fontSize:15,fontWeight:900,color:'#0284c7'}}>{data?.kpis?.mtd_spend ?? '—'}</div>
          <div style={{fontSize:9,color:'#64748b',marginTop:3}}>MTD Spend</div>
        </div>
        <div style={{background:'#fff',borderRadius:14,padding:14,textAlign:'center',boxShadow:'0 2px 8px rgba(0,0,0,.04)',border:'1px solid #f1f5f9'}}>
          <div style={{fontSize:24,marginBottom:5}}>{'✅'}</div>
          <div style={{fontSize:15,fontWeight:900,color:'#0284c7'}}>{data?.kpis?.licensed_suppliers ?? '—'}</div>
          <div style={{fontSize:9,color:'#64748b',marginTop:3}}>Licensed Suppliers</div>
        </div>
        <div style={{background:'#fff',borderRadius:14,padding:14,textAlign:'center',boxShadow:'0 2px 8px rgba(0,0,0,.04)',border:'1px solid #f1f5f9'}}>
          <div style={{fontSize:24,marginBottom:5}}>{'⚠️'}</div>
          <div style={{fontSize:15,fontWeight:900,color:'#0284c7'}}>{data?.kpis?.exceptions ?? '—'}</div>
          <div style={{fontSize:9,color:'#64748b',marginTop:3}}>Exceptions</div>
        </div>
      </div>
      {/* Tabs */}
      <div style={{display:'flex',gap:4,background:'#f1f5f9',padding:3,borderRadius:10,marginBottom:14,flexWrap:'wrap'}}>
          <button onClick={()=>setTab('po')}
            style={{flex:1,minWidth:70,padding:'7px 8px',borderRadius:9,border:'none',cursor:'pointer',
              fontSize:10,fontWeight:tab==='po'?700:400,
              background:tab==='po'?'#fff':'transparent',
              color:tab==='po'?'#0f172a':'#64748b',
              boxShadow:tab==='po'?'0 1px 4px rgba(0,0,0,.08)':'none'}}>
            📋 Purchase Orders
          </button>
          <button onClick={()=>setTab('vendors')}
            style={{flex:1,minWidth:70,padding:'7px 8px',borderRadius:9,border:'none',cursor:'pointer',
              fontSize:10,fontWeight:tab==='vendors'?700:400,
              background:tab==='vendors'?'#fff':'transparent',
              color:tab==='vendors'?'#0f172a':'#64748b',
              boxShadow:tab==='vendors'?'0 1px 4px rgba(0,0,0,.08)':'none'}}>
            🏭 Vendors
          </button>
          <button onClick={()=>setTab('renewals')}
            style={{flex:1,minWidth:70,padding:'7px 8px',borderRadius:9,border:'none',cursor:'pointer',
              fontSize:10,fontWeight:tab==='renewals'?700:400,
              background:tab==='renewals'?'#fff':'transparent',
              color:tab==='renewals'?'#0f172a':'#64748b',
              boxShadow:tab==='renewals'?'0 1px 4px rgba(0,0,0,.08)':'none'}}>
            📅 Renewals
          </button>
          <button onClick={()=>setTab('spend')}
            style={{flex:1,minWidth:70,padding:'7px 8px',borderRadius:9,border:'none',cursor:'pointer',
              fontSize:10,fontWeight:tab==='spend'?700:400,
              background:tab==='spend'?'#fff':'transparent',
              color:tab==='spend'?'#0f172a':'#64748b',
              boxShadow:tab==='spend'?'0 1px 4px rgba(0,0,0,.08)':'none'}}>
            💰 Spend
          </button>
      </div>
      {/* Tab Content */}
      {tab==='po'&&(
      
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',overflow:'hidden'}}>
          <div style={{padding:'12px 16px',borderBottom:'1px solid #f1f5f9',fontSize:12,fontWeight:800}}>📦 Purchase Orders</div>
          {(data?.purchase_orders||[]).length===0?(
            <div style={{padding:32,textAlign:'center',color:'#94a3b8'}}>
              <div style={{fontSize:32,marginBottom:8}}>📦</div>
              <div style={{fontSize:13,fontWeight:600,color:'#475569'}}>No open POs for {company?.name}</div>
            </div>
          ):(data?.purchase_orders||[]).map((p,i)=>(
            <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'12px 16px',borderBottom:'1px solid #f8fafc',flexWrap:'wrap',gap:8}}>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:'#0f172a'}}>{p.item||p.description}</div>
                <div style={{fontSize:9,color:'#94a3b8',marginTop:2}}>{p.vendor} · PO #{p.po_number||p.id}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:11,fontWeight:700,color:'#0284c7'}}>{p.amount}</div>
                <span style={{fontSize:8,color:'#94a3b8'}}>{(p.status||'').replace(/_/g,' ')}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      {tab==='vendors'&&(
      
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',overflow:'hidden'}}>
          <div style={{padding:'12px 16px',borderBottom:'1px solid #f1f5f9',fontSize:12,fontWeight:800}}>🏭 Active Vendors</div>
          {(data?.vendors||[]).length===0?(
            <div style={{padding:32,textAlign:'center',color:'#94a3b8',fontSize:11}}>No vendors yet for {company?.name}</div>
          ):(data?.vendors||[]).map((v,i)=>(
            <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 16px',borderBottom:'1px solid #f8fafc'}}>
              <div>
                <div style={{fontSize:11,fontWeight:700}}>{v.name}</div>
                <div style={{fontSize:9,color:'#94a3b8'}}>{v.category} · {v.contact||''}</div>
              </div>
              <span style={{fontSize:9,fontWeight:700,color:v.status==='active'?'#15803d':'#b45309',background:v.status==='active'?'#f0fdf4':'#fffbeb',padding:'2px 8px',borderRadius:20}}>{v.status}</span>
            </div>
          ))}
        </div>
      )}
      {tab==='renewals'&&(
      
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',overflow:'hidden'}}>
          <div style={{padding:'12px 16px',borderBottom:'1px solid #f1f5f9',fontSize:12,fontWeight:800}}>📅 Vendor Contract Renewals</div>
          {(data?.vendor_renewals||[]).length===0?(
            <div style={{padding:32,textAlign:'center',color:'#94a3b8',fontSize:11}}>✅ No upcoming renewals</div>
          ):(data?.vendor_renewals||[]).map((v,i)=>(
            <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 16px',borderBottom:'1px solid #f8fafc'}}>
              <div>
                <div style={{fontSize:11,fontWeight:700}}>{v.vendor}</div>
                <div style={{fontSize:9,color:'#94a3b8'}}>Expires: {v.expires}</div>
              </div>
              <span style={{fontSize:10,fontWeight:700,color:(v.days_left||999)<=30?'#b45309':'#94a3b8'}}>{v.days_left}d left</span>
            </div>
          ))}
        </div>
      )}
      {tab==='spend'&&(
      
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',padding:'16px 20px'}}>
          <div style={{fontSize:12,fontWeight:800,marginBottom:14}}>💰 Spend by Category</div>
          {(data?.spend_breakdown||[]).length===0?(
            <div style={{textAlign:'center',padding:24,color:'#94a3b8',fontSize:11}}>No spend data yet</div>
          ):(data?.spend_breakdown||[]).map((s,i)=>(
            <div key={i} style={{marginBottom:12}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:11,marginBottom:4}}>
                <span style={{color:'#475569'}}>{s.category}</span>
                <span style={{fontWeight:700,color:'#0284c7'}}>{s.amount}</span>
              </div>
              <div style={{height:6,background:'#f1f5f9',borderRadius:6,overflow:'hidden'}}>
                <div style={{height:'100%',width:`${s.pct||0}%`,background:'#0284c7',borderRadius:6}}/>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Quick Links */}
      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'16px 20px'}}>
        <div style={{fontSize:12,fontWeight:800,marginBottom:10}}>🔗 Quick Links</div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <button onClick={()=>navTo('vendor-listing')} style={{padding:'7px 14px',borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#374151',fontSize:10,fontWeight:600,cursor:'pointer'}}>Vendor Listing</button>
            <button onClick={()=>navTo('vendor-agreement')} style={{padding:'7px 14px',borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#374151',fontSize:10,fontWeight:600,cursor:'pointer'}}>Vendor Agreement</button>
            <button onClick={()=>navTo('asset-management')} style={{padding:'7px 14px',borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#374151',fontSize:10,fontWeight:600,cursor:'pointer'}}>Asset Management</button>
            <button onClick={()=>navTo('vendor-billing-report')} style={{padding:'7px 14px',borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#374151',fontSize:10,fontWeight:600,cursor:'pointer'}}>Vendor Billing</button>
            <button onClick={()=>navTo('it-inventory')} style={{padding:'7px 14px',borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#374151',fontSize:10,fontWeight:600,cursor:'pointer'}}>IT Inventory</button>
            <button onClick={()=>navTo('po-approval')} style={{padding:'7px 14px',borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#374151',fontSize:10,fontWeight:600,cursor:'pointer'}}>PO Approval</button>
        </div>
      </div>
    </div>
  )
}
