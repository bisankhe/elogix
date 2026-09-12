// FILE: src/components/dashboard/SalesDashboard.jsx
// eLogix HRMS — Sales Workspace
// COMPLETE REWRITE — Zero mock data. Real tenant API. No bad imports.
// API: GET /api/v1/sales-dashboard/summary
// eLogix Technologies · www.elogix.com.np

import { useState, useEffect } from 'react'
import { useApp } from '../../context/AppContext.jsx'


function _getSession(){try{return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{}}catch{return{}}}
function _authH(){const s=_getSession();const token=localStorage.getItem('access_token')||s?.token||'';const slug=s?.company?.slug||'';return{'Authorization':`Bearer ${token}`,'X-Tenant-Slug':slug,'Content-Type':'application/json'}}

function PBar({value=0,color='#3b82f6',height=6}){
  return<div style={{height,background:'#f1f5f9',borderRadius:height,overflow:'hidden'}}><div style={{height:'100%',width:`${Math.min(100,value)}%`,background:color,borderRadius:height,transition:'width .5s'}}/></div>
}

export default function SalesDashboard() {
  const { navTo } = useApp()
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [tab,     setTab]     = useState('team')

  const s = _getSession(); const company = s?.company || {}

  useEffect(() => {
    const token = localStorage.getItem('access_token') || s?.token || ''
    const slug  = s?.company?.slug || ''
    if (!token || !slug) { setLoading(false); return }
    fetch('/api/v1/sales-dashboard/summary', { headers: _authH() })
      .then(r => {
        if(r.status===401){window.dispatchEvent(new CustomEvent('elogix:session-expired'));throw new Error('Session expired')}
        if(!r.ok) throw new Error(`Error ${r.status}`)
        return r.json()
      })
      .then(d => setData(d.data || d))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{textAlign:'center',padding:60,color:'#059669',fontFamily:'system-ui'}}><div style={{fontSize:30,marginBottom:10}}>⟳</div><div style={{fontSize:12,fontWeight:600}}>Loading for {company?.name}...</div></div>

  return (
    <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif",color:'#0f172a'}}>
      <div style={{background:'linear-gradient(135deg,#065f46 0%,#059669 60%,#6ee7b7 100%)',borderRadius:16,padding:'18px 22px',marginBottom:20,boxShadow:'0 4px 20px rgba(0,0,0,.15)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <span style={{fontSize:22}}>{'📈'}</span>
          <div>
            <div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Sales Workspace</div>
            <div style={{fontSize:11,color:'rgba(255,255,255,.75)',marginTop:2}}>{company?.name} · Team field visits, performance & incentive tracking</div>
          </div>
        </div>
      </div>
      {error&&<div style={{padding:'10px 16px',background:'#fffbeb',border:'1px solid #fde68a',borderRadius:10,fontSize:12,color:'#92400e',marginBottom:14}}>⚠️ {error}</div>}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(110px,1fr))',gap:12,marginBottom:20}}>
        <div style={{background:'#fff',borderRadius:14,padding:14,textAlign:'center',boxShadow:'0 2px 8px rgba(0,0,0,.04)',border:'1px solid #f1f5f9'}}>
          <div style={{fontSize:24,marginBottom:5}}>{'👥'}</div>
          <div style={{fontSize:15,fontWeight:900,color:'#059669'}}>{data?.kpis?.team_size ?? '—'}</div>
          <div style={{fontSize:9,color:'#64748b',marginTop:3}}>Sales Team Size</div>
        </div>
        <div style={{background:'#fff',borderRadius:14,padding:14,textAlign:'center',boxShadow:'0 2px 8px rgba(0,0,0,.04)',border:'1px solid #f1f5f9'}}>
          <div style={{fontSize:24,marginBottom:5}}>{'🚗'}</div>
          <div style={{fontSize:15,fontWeight:900,color:'#059669'}}>{data?.kpis?.field_visits_mtd ?? '—'}</div>
          <div style={{fontSize:9,color:'#64748b',marginTop:3}}>Field Visits (MTD)</div>
        </div>
        <div style={{background:'#fff',borderRadius:14,padding:14,textAlign:'center',boxShadow:'0 2px 8px rgba(0,0,0,.04)',border:'1px solid #f1f5f9'}}>
          <div style={{fontSize:24,marginBottom:5}}>{'💰'}</div>
          <div style={{fontSize:15,fontWeight:900,color:'#059669'}}>{data?.kpis?.incentives_pending ?? '—'}</div>
          <div style={{fontSize:9,color:'#64748b',marginTop:3}}>Incentives Pending</div>
        </div>
        <div style={{background:'#fff',borderRadius:14,padding:14,textAlign:'center',boxShadow:'0 2px 8px rgba(0,0,0,.04)',border:'1px solid #f1f5f9'}}>
          <div style={{fontSize:24,marginBottom:5}}>{'🎯'}</div>
          <div style={{fontSize:15,fontWeight:900,color:'#059669'}}>{data?.kpis?.target_achievement ?? '—'}</div>
          <div style={{fontSize:9,color:'#64748b',marginTop:3}}>Target Achievement</div>
        </div>
        <div style={{background:'#fff',borderRadius:14,padding:14,textAlign:'center',boxShadow:'0 2px 8px rgba(0,0,0,.04)',border:'1px solid #f1f5f9'}}>
          <div style={{fontSize:24,marginBottom:5}}>{'📋'}</div>
          <div style={{fontSize:15,fontWeight:900,color:'#059669'}}>{data?.kpis?.proposals_sent ?? '—'}</div>
          <div style={{fontSize:9,color:'#64748b',marginTop:3}}>Proposals Sent</div>
        </div>
        <div style={{background:'#fff',borderRadius:14,padding:14,textAlign:'center',boxShadow:'0 2px 8px rgba(0,0,0,.04)',border:'1px solid #f1f5f9'}}>
          <div style={{fontSize:24,marginBottom:5}}>{'✅'}</div>
          <div style={{fontSize:15,fontWeight:900,color:'#059669'}}>{data?.kpis?.deals_closed_mtd ?? '—'}</div>
          <div style={{fontSize:9,color:'#64748b',marginTop:3}}>Deals Closed (MTD)</div>
        </div>
      </div>
      <div style={{display:'flex',gap:4,background:'#f1f5f9',padding:3,borderRadius:10,marginBottom:14,flexWrap:'wrap'}}>
          <button onClick={()=>setTab('team')}
            style={{flex:1,minWidth:70,padding:'7px 8px',borderRadius:9,border:'none',cursor:'pointer',
              fontSize:10,fontWeight:tab==='team'?700:400,
              background:tab==='team'?'#fff':'transparent',
              color:tab==='team'?'#0f172a':'#64748b',
              boxShadow:tab==='team'?'0 1px 4px rgba(0,0,0,.08)':'none'}}>
            👥 Team Activity
          </button>
          <button onClick={()=>setTab('targets')}
            style={{flex:1,minWidth:70,padding:'7px 8px',borderRadius:9,border:'none',cursor:'pointer',
              fontSize:10,fontWeight:tab==='targets'?700:400,
              background:tab==='targets'?'#fff':'transparent',
              color:tab==='targets'?'#0f172a':'#64748b',
              boxShadow:tab==='targets'?'0 1px 4px rgba(0,0,0,.08)':'none'}}>
            🎯 Targets
          </button>
          <button onClick={()=>setTab('incentives')}
            style={{flex:1,minWidth:70,padding:'7px 8px',borderRadius:9,border:'none',cursor:'pointer',
              fontSize:10,fontWeight:tab==='incentives'?700:400,
              background:tab==='incentives'?'#fff':'transparent',
              color:tab==='incentives'?'#0f172a':'#64748b',
              boxShadow:tab==='incentives'?'0 1px 4px rgba(0,0,0,.08)':'none'}}>
            💰 Incentives
          </button>
          <button onClick={()=>setTab('visits')}
            style={{flex:1,minWidth:70,padding:'7px 8px',borderRadius:9,border:'none',cursor:'pointer',
              fontSize:10,fontWeight:tab==='visits'?700:400,
              background:tab==='visits'?'#fff':'transparent',
              color:tab==='visits'?'#0f172a':'#64748b',
              boxShadow:tab==='visits'?'0 1px 4px rgba(0,0,0,.08)':'none'}}>
            🚗 Field Visits
          </button>
      </div>
      {tab==='team'&&(
      
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',overflow:'hidden'}}>
          <div style={{padding:'12px 16px',borderBottom:'1px solid #f1f5f9',fontSize:12,fontWeight:800}}>👥 Team Field Activity</div>
          {(data?.team||[]).length===0?(
            <div style={{padding:32,textAlign:'center',color:'#94a3b8'}}>
              <div style={{fontSize:32,marginBottom:8}}>👥</div>
              <div style={{fontSize:13,fontWeight:600,color:'#475569'}}>No team data yet for {company?.name}</div>
            </div>
          ):(data?.team||[]).map((t,i)=>(
            <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 16px',borderBottom:'1px solid #f8fafc'}}>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:'#0f172a'}}>{t.name}</div>
                <div style={{fontSize:9,color:'#94a3b8'}}>{t.role||t.designation||''} · {t.visits_mtd} visits MTD</div>
              </div>
              <span style={{fontSize:10,fontWeight:700,color:t.status==='On Track'?'#15803d':t.status==='Behind Target'?'#b45309':'#0284c7'}}>{t.status||t.performance}</span>
            </div>
          ))}
        </div>
      )}
      {tab==='targets'&&(
      
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',padding:'16px 20px'}}>
          <div style={{fontSize:12,fontWeight:800,marginBottom:14}}>🎯 Department Targets</div>
          {(data?.targets||[]).length===0?(
            <div style={{textAlign:'center',padding:24,color:'#94a3b8',fontSize:11}}>No targets configured yet</div>
          ):(data?.targets||[]).map((t,i)=>(
            <div key={i} style={{marginBottom:14}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:11,marginBottom:4}}>
                <span style={{fontWeight:600,color:'#475569'}}>{t.name||t.target_name}</span>
                <span style={{fontWeight:700,color:'#059669'}}>{t.achievement_pct||t.pct}%</span>
              </div>
              <div style={{height:6,background:'#f1f5f9',borderRadius:6,overflow:'hidden'}}>
                <div style={{height:'100%',width:`${Math.min(100,t.achievement_pct||t.pct||0)}%`,background:'#059669',borderRadius:6}}/>
              </div>
            </div>
          ))}
        </div>
      )}
      {tab==='incentives'&&(
      
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',overflow:'hidden'}}>
          <div style={{padding:'12px 16px',borderBottom:'1px solid #f1f5f9',fontSize:12,fontWeight:800}}>💰 Incentives & Commission</div>
          {(data?.incentives||[]).length===0?(
            <div style={{padding:32,textAlign:'center',color:'#94a3b8',fontSize:11}}>No pending incentives</div>
          ):(data?.incentives||[]).map((iv,i)=>(
            <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'10px 16px',borderBottom:'1px solid #f8fafc'}}>
              <div>
                <div style={{fontSize:11,fontWeight:700}}>{iv.name||iv.employee}</div>
                <div style={{fontSize:9,color:'#94a3b8'}}>{iv.type||'Incentive'} · {iv.period}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:11,fontWeight:700,color:'#059669'}}>{iv.amount}</div>
                <div style={{fontSize:9,color:'#94a3b8'}}>{iv.status}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      {tab==='visits'&&(
      
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',padding:'16px 20px'}}>
          <div style={{fontSize:12,fontWeight:800,marginBottom:14}}>🚗 Field Visit Summary</div>
          {(data?.visit_summary||[]).length===0?(
            <div style={{textAlign:'center',padding:24,color:'#94a3b8',fontSize:11}}>No visit data yet</div>
          ):(data?.visit_summary||[]).map((v,i)=>(
            <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #f8fafc',fontSize:12}}>
              <span style={{color:'#475569'}}>{v.label||v.category}</span>
              <span style={{fontWeight:700,color:'#0f172a'}}>{v.value}</span>
            </div>
          ))}
        </div>
      )}
      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'16px 20px'}}>
        <div style={{fontSize:12,fontWeight:800,marginBottom:10}}>🔗 Quick Links</div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <button onClick={()=>navTo('field-visit-tracking-cfg')} style={{padding:'7px 14px',borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#374151',fontSize:10,fontWeight:600,cursor:'pointer'}}>Field Visit Tracking</button>
            <button onClick={()=>navTo('incentive-processing')} style={{padding:'7px 14px',borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#374151',fontSize:10,fontWeight:600,cursor:'pointer'}}>Incentive Processing</button>
            <button onClick={()=>navTo('team-performance-mss')} style={{padding:'7px 14px',borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#374151',fontSize:10,fontWeight:600,cursor:'pointer'}}>Team Performance</button>
            <button onClick={()=>navTo('sales-pipeline')} style={{padding:'7px 14px',borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#374151',fontSize:10,fontWeight:600,cursor:'pointer'}}>Sales Pipeline</button>
            <button onClick={()=>navTo('ta-da-claims')} style={{padding:'7px 14px',borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#374151',fontSize:10,fontWeight:600,cursor:'pointer'}}>TA/DA Claims</button>
            <button onClick={()=>navTo('commission-report')} style={{padding:'7px 14px',borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#374151',fontSize:10,fontWeight:600,cursor:'pointer'}}>Commission Report</button>
        </div>
      </div>
    </div>
  )
}
