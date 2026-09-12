// FILE: src/components/dashboard/MarketingDashboard.jsx
// eLogix HRMS — Marketing Workspace
// COMPLETE REWRITE — Zero mock data. Real tenant API.
// API: GET /api/v1/marketing-dashboard/summary
// eLogix Technologies · www.elogix.com.np

import { useState, useEffect } from 'react'
import { useApp } from '../../context/AppContext.jsx'


function _getSession(){try{return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{}}catch{return{}}}
function _authH(){const s=_getSession();const token=localStorage.getItem('access_token')||s?.token||'';const slug=s?.company?.slug||'';return{'Authorization':`Bearer ${token}`,'X-Tenant-Slug':slug,'Content-Type':'application/json'}}

export default function MarketingDashboard() {
  const { navTo } = useApp()
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [tab,     setTab]     = useState('campaigns')

  const s = _getSession(); const company = s?.company || {}

  useEffect(() => {
    const token = localStorage.getItem('access_token') || s?.token || ''
    const slug  = s?.company?.slug || ''
    if (!token || !slug) { setLoading(false); return }
    fetch('/api/v1/marketing-dashboard/summary', { headers: _authH() })
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
    <div style={{textAlign:'center',padding:60,color:'#a21caf',fontFamily:'system-ui'}}>
      <div style={{fontSize:30,marginBottom:10}}>⟳</div>
      <div style={{fontSize:12,fontWeight:600}}>Loading for {company?.name}...</div>
    </div>
  )

  return (
    <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif",color:'#0f172a'}}>

      {/* Header */}
      <div style={{background:'linear-gradient(135deg,#701a75 0%,#a21caf 60%,#e879f9 100%)',borderRadius:16,padding:'18px 22px',marginBottom:20,
        boxShadow:'0 4px 20px rgba(0,0,0,.15)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <span style={{fontSize:22}}>{'📣'}</span>
          <div>
            <div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Marketing Workspace</div>
            <div style={{fontSize:11,color:'rgba(255,255,255,.75)',marginTop:2}}>
              {company?.name} · Employer branding, recruitment campaigns & career page analytics
            </div>
          </div>
        </div>
      </div>

      {error&&<div style={{padding:'10px 16px',background:'#fffbeb',border:'1px solid #fde68a',
        borderRadius:10,fontSize:12,color:'#92400e',marginBottom:14}}>⚠️ {error}</div>}

      {/* KPI Cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(110px,1fr))',gap:12,marginBottom:20}}>
        <div style={{background:'#fff',borderRadius:14,padding:14,textAlign:'center',boxShadow:'0 2px 8px rgba(0,0,0,.05)',border:'1px solid #f1f5f9'}}>
          <div style={{fontSize:24,marginBottom:5}}>{'📣'}</div>
          <div style={{fontSize:15,fontWeight:900,color:'#a21caf'}}>{data?.kpis?.active_campaigns ?? '—'}</div>
          <div style={{fontSize:9,color:'#64748b',marginTop:3}}>Active Campaigns</div>
        </div>
        <div style={{background:'#fff',borderRadius:14,padding:14,textAlign:'center',boxShadow:'0 2px 8px rgba(0,0,0,.05)',border:'1px solid #f1f5f9'}}>
          <div style={{fontSize:24,marginBottom:5}}>{'👁️'}</div>
          <div style={{fontSize:15,fontWeight:900,color:'#a21caf'}}>{data?.kpis?.career_page_visits ?? '—'}</div>
          <div style={{fontSize:9,color:'#64748b',marginTop:3}}>Career Page Visits (MTD)</div>
        </div>
        <div style={{background:'#fff',borderRadius:14,padding:14,textAlign:'center',boxShadow:'0 2px 8px rgba(0,0,0,.05)',border:'1px solid #f1f5f9'}}>
          <div style={{fontSize:24,marginBottom:5}}>{'📝'}</div>
          <div style={{fontSize:15,fontWeight:900,color:'#a21caf'}}>{data?.kpis?.campaign_applications ?? '—'}</div>
          <div style={{fontSize:9,color:'#64748b',marginTop:3}}>Campaign Applications</div>
        </div>
        <div style={{background:'#fff',borderRadius:14,padding:14,textAlign:'center',boxShadow:'0 2px 8px rgba(0,0,0,.05)',border:'1px solid #f1f5f9'}}>
          <div style={{fontSize:24,marginBottom:5}}>{'⭐'}</div>
          <div style={{fontSize:15,fontWeight:900,color:'#a21caf'}}>{data?.kpis?.brand_score ?? '—'}</div>
          <div style={{fontSize:9,color:'#64748b',marginTop:3}}>Employer Brand Score</div>
        </div>
        <div style={{background:'#fff',borderRadius:14,padding:14,textAlign:'center',boxShadow:'0 2px 8px rgba(0,0,0,.05)',border:'1px solid #f1f5f9'}}>
          <div style={{fontSize:24,marginBottom:5}}>{'📱'}</div>
          <div style={{fontSize:15,fontWeight:900,color:'#a21caf'}}>{data?.kpis?.social_reach ?? '—'}</div>
          <div style={{fontSize:9,color:'#64748b',marginTop:3}}>Social Reach (MTD)</div>
        </div>
        <div style={{background:'#fff',borderRadius:14,padding:14,textAlign:'center',boxShadow:'0 2px 8px rgba(0,0,0,.05)',border:'1px solid #f1f5f9'}}>
          <div style={{fontSize:24,marginBottom:5}}>{'🎯'}</div>
          <div style={{fontSize:15,fontWeight:900,color:'#a21caf'}}>{data?.kpis?.conversion_rate ?? '—'}</div>
          <div style={{fontSize:9,color:'#64748b',marginTop:3}}>Conversion Rate</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:4,background:'#f1f5f9',padding:3,borderRadius:10,marginBottom:14,flexWrap:'wrap'}}>
          <button onClick={()=>setTab('campaigns')}
            style={{flex:1,minWidth:70,padding:'7px 8px',borderRadius:9,border:'none',cursor:'pointer',
              fontSize:10,fontWeight:tab==='campaigns'?700:400,
              background:tab==='campaigns'?'#fff':'transparent',
              color:tab==='campaigns'?'#0f172a':'#64748b',
              boxShadow:tab==='campaigns'?'0 1px 4px rgba(0,0,0,.08)':'none'}}>
            📣 Campaigns
          </button>
          <button onClick={()=>setTab('branding')}
            style={{flex:1,minWidth:70,padding:'7px 8px',borderRadius:9,border:'none',cursor:'pointer',
              fontSize:10,fontWeight:tab==='branding'?700:400,
              background:tab==='branding'?'#fff':'transparent',
              color:tab==='branding'?'#0f172a':'#64748b',
              boxShadow:tab==='branding'?'0 1px 4px rgba(0,0,0,.08)':'none'}}>
            ⭐ Branding
          </button>
          <button onClick={()=>setTab('social')}
            style={{flex:1,minWidth:70,padding:'7px 8px',borderRadius:9,border:'none',cursor:'pointer',
              fontSize:10,fontWeight:tab==='social'?700:400,
              background:tab==='social'?'#fff':'transparent',
              color:tab==='social'?'#0f172a':'#64748b',
              boxShadow:tab==='social'?'0 1px 4px rgba(0,0,0,.08)':'none'}}>
            📱 Social
          </button>
          <button onClick={()=>setTab('analytics')}
            style={{flex:1,minWidth:70,padding:'7px 8px',borderRadius:9,border:'none',cursor:'pointer',
              fontSize:10,fontWeight:tab==='analytics'?700:400,
              background:tab==='analytics'?'#fff':'transparent',
              color:tab==='analytics'?'#0f172a':'#64748b',
              boxShadow:tab==='analytics'?'0 1px 4px rgba(0,0,0,.08)':'none'}}>
            📊 Analytics
          </button>
      </div>

      {/* Tab Content */}
            {tab==='campaigns'&&(
      
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',overflow:'hidden'}}>
          <div style={{padding:'12px 16px',borderBottom:'1px solid #f1f5f9',fontSize:12,fontWeight:800}}>📣 Active Recruitment Campaigns</div>
          {(data?.campaigns||[]).length===0?(
            <div style={{padding:32,textAlign:'center',color:'#94a3b8'}}>
              <div style={{fontSize:32,marginBottom:8}}>📣</div>
              <div style={{fontSize:13,fontWeight:600,color:'#475569'}}>No active campaigns for {company?.name}</div>
            </div>
          ):(data?.campaigns||[]).map((c,i)=>(
            <div key={i} style={{padding:'12px 16px',borderBottom:'1px solid #f8fafc'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:6,flexWrap:'wrap',gap:8}}>
                <span style={{fontSize:11,fontWeight:700,color:'#0f172a'}}>{c.name||c.title}</span>
                <span style={{fontSize:9,fontWeight:700,color:'#a21caf',background:'#fdf4ff',padding:'2px 8px',borderRadius:20,border:'1px solid #f0abfc'}}>{c.status||'Active'}</span>
              </div>
              <div style={{display:'flex',gap:16,fontSize:10,color:'#64748b'}}>
                <span>👁️ {c.reach||c.impressions||0} reach</span>
                <span>📝 {c.applications||0} applications</span>
                {c.conversion_rate&&<span>🎯 {c.conversion_rate}% conversion</span>}
              </div>
            </div>
          ))}
        </div>
      )}
            {tab==='branding'&&(
      
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',padding:'16px 20px'}}>
          <div style={{fontSize:12,fontWeight:800,marginBottom:14}}>⭐ Employer Brand Metrics</div>
          {(data?.brand_metrics||[]).length===0?(
            <div style={{textAlign:'center',padding:24,color:'#94a3b8',fontSize:11}}>No brand metrics yet for {company?.name}</div>
          ):(data?.brand_metrics||[]).map((m,i)=>(
            <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #f8fafc',fontSize:12}}>
              <span style={{color:'#475569'}}>{m.metric||m.label}</span>
              <span style={{fontWeight:700,color:'#a21caf'}}>{m.value}</span>
            </div>
          ))}
        </div>
      )}
            {tab==='social'&&(
      
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',overflow:'hidden'}}>
          <div style={{padding:'12px 16px',borderBottom:'1px solid #f1f5f9',fontSize:12,fontWeight:800}}>📱 Social Media Performance</div>
          {(data?.social_metrics||[]).length===0?(
            <div style={{padding:32,textAlign:'center',color:'#94a3b8',fontSize:11}}>No social metrics yet</div>
          ):(data?.social_metrics||[]).map((s,i)=>(
            <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 16px',borderBottom:'1px solid #f8fafc'}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <span style={{fontSize:18}}>{s.icon||'📱'}</span>
                <span style={{fontSize:12,fontWeight:600,color:'#0f172a'}}>{s.platform}</span>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:12,fontWeight:700,color:'#a21caf'}}>{s.reach||s.followers}</div>
                <div style={{fontSize:9,color:'#94a3b8'}}>{s.engagement_rate||''}</div>
              </div>
            </div>
          ))}
        </div>
      )}
            {tab==='analytics'&&(
      
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',padding:'16px 20px'}}>
          <div style={{fontSize:12,fontWeight:800,marginBottom:14}}>📊 Campaign Analytics</div>
          {(data?.analytics||[]).length===0?(
            <div style={{textAlign:'center',padding:24,color:'#94a3b8',fontSize:11}}>No analytics data yet</div>
          ):(data?.analytics||[]).map((a,i)=>(
            <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #f8fafc',fontSize:12}}>
              <span style={{color:'#475569'}}>{a.label||a.metric}</span>
              <span style={{fontWeight:700,color:'#0f172a'}}>{a.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Quick Links */}
      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'16px 20px'}}>
        <div style={{fontSize:12,fontWeight:800,marginBottom:10}}>🔗 Quick Links</div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <button onClick={()=>navTo('recruitment-campaign')} style={{padding:'7px 14px',borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#374151',fontSize:10,fontWeight:600,cursor:'pointer'}}>Recruitment Campaign</button>
            <button onClick={()=>navTo('career-page')} style={{padding:'7px 14px',borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#374151',fontSize:10,fontWeight:600,cursor:'pointer'}}>Career Page</button>
            <button onClick={()=>navTo('social-media-branding')} style={{padding:'7px 14px',borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#374151',fontSize:10,fontWeight:600,cursor:'pointer'}}>Social Media Branding</button>
            <button onClick={()=>navTo('culture-showcase')} style={{padding:'7px 14px',borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#374151',fontSize:10,fontWeight:600,cursor:'pointer'}}>Culture Showcase</button>
            <button onClick={()=>navTo('job-board')} style={{padding:'7px 14px',borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#374151',fontSize:10,fontWeight:600,cursor:'pointer'}}>Job Board</button>
        </div>
      </div>
    </div>
  )
}
