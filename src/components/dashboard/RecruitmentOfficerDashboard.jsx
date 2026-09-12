// FILE: src/components/dashboard/RecruitmentOfficerDashboard.jsx
// eLogix HRMS — Recruitment Officer Workspace
// COMPLETE REWRITE — Zero mock data. Real tenant API. No bad imports.
// API: GET /api/v1/recruitment-officer/summary
// eLogix Technologies · www.elogix.com.np

import { useState, useEffect } from 'react'
import { useApp } from '../../context/AppContext.jsx'


function _getSession(){try{return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{}}catch{return{}}}
function _authH(){const s=_getSession();const token=localStorage.getItem('access_token')||s?.token||'';const slug=s?.company?.slug||'';return{'Authorization':`Bearer ${token}`,'X-Tenant-Slug':slug,'Content-Type':'application/json'}}

function PBar({value=0,color='#3b82f6',height=6}){
  return<div style={{height,background:'#f1f5f9',borderRadius:height,overflow:'hidden'}}><div style={{height:'100%',width:`${Math.min(100,value)}%`,background:color,borderRadius:height,transition:'width .5s'}}/></div>
}

export default function RecruitmentOfficerDashboard() {
  const { navTo } = useApp()
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [tab,     setTab]     = useState('pipeline')

  const s = _getSession(); const company = s?.company || {}

  useEffect(() => {
    const token = localStorage.getItem('access_token') || s?.token || ''
    const slug  = s?.company?.slug || ''
    if (!token || !slug) { setLoading(false); return }
    fetch('/api/v1/recruitment-officer/summary', { headers: _authH() })
      .then(r => {
        if(r.status===401){window.dispatchEvent(new CustomEvent('elogix:session-expired'));throw new Error('Session expired')}
        if(!r.ok) throw new Error(`Error ${r.status}`)
        return r.json()
      })
      .then(d => setData(d.data || d))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{textAlign:'center',padding:60,color:'#ea580c',fontFamily:'system-ui'}}><div style={{fontSize:30,marginBottom:10}}>⟳</div><div style={{fontSize:12,fontWeight:600}}>Loading for {company?.name}...</div></div>

  return (
    <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif",color:'#0f172a'}}>
      <div style={{background:'linear-gradient(135deg,#ea580c 0%,#f97316 60%,#fdba74 100%)',borderRadius:16,padding:'18px 22px',marginBottom:20,boxShadow:'0 4px 20px rgba(0,0,0,.15)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <span style={{fontSize:22}}>{'🎯'}</span>
          <div>
            <div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Recruitment Officer Workspace</div>
            <div style={{fontSize:11,color:'rgba(255,255,255,.75)',marginTop:2}}>{company?.name} · Pipeline, interviews, offers & AI-ranked candidates — internal hiring</div>
          </div>
        </div>
      </div>
      {error&&<div style={{padding:'10px 16px',background:'#fffbeb',border:'1px solid #fde68a',borderRadius:10,fontSize:12,color:'#92400e',marginBottom:14}}>⚠️ {error}</div>}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(110px,1fr))',gap:12,marginBottom:20}}>
        <div style={{background:'#fff',borderRadius:14,padding:14,textAlign:'center',boxShadow:'0 2px 8px rgba(0,0,0,.04)',border:'1px solid #f1f5f9'}}>
          <div style={{fontSize:24,marginBottom:5}}>{'📋'}</div>
          <div style={{fontSize:15,fontWeight:900,color:'#ea580c'}}>{data?.kpis?.open_requisitions ?? '—'}</div>
          <div style={{fontSize:9,color:'#64748b',marginTop:3}}>Open Requisitions</div>
        </div>
        <div style={{background:'#fff',borderRadius:14,padding:14,textAlign:'center',boxShadow:'0 2px 8px rgba(0,0,0,.04)',border:'1px solid #f1f5f9'}}>
          <div style={{fontSize:24,marginBottom:5}}>{'👥'}</div>
          <div style={{fontSize:15,fontWeight:900,color:'#ea580c'}}>{data?.kpis?.active_candidates ?? '—'}</div>
          <div style={{fontSize:9,color:'#64748b',marginTop:3}}>Active Candidates</div>
        </div>
        <div style={{background:'#fff',borderRadius:14,padding:14,textAlign:'center',boxShadow:'0 2px 8px rgba(0,0,0,.04)',border:'1px solid #f1f5f9'}}>
          <div style={{fontSize:24,marginBottom:5}}>{'🗓️'}</div>
          <div style={{fontSize:15,fontWeight:900,color:'#ea580c'}}>{data?.kpis?.interviews_this_week ?? '—'}</div>
          <div style={{fontSize:9,color:'#64748b',marginTop:3}}>Interviews This Week</div>
        </div>
        <div style={{background:'#fff',borderRadius:14,padding:14,textAlign:'center',boxShadow:'0 2px 8px rgba(0,0,0,.04)',border:'1px solid #f1f5f9'}}>
          <div style={{fontSize:24,marginBottom:5}}>{'✉️'}</div>
          <div style={{fontSize:15,fontWeight:900,color:'#ea580c'}}>{data?.kpis?.offers_pending ?? '—'}</div>
          <div style={{fontSize:9,color:'#64748b',marginTop:3}}>Offers Pending</div>
        </div>
        <div style={{background:'#fff',borderRadius:14,padding:14,textAlign:'center',boxShadow:'0 2px 8px rgba(0,0,0,.04)',border:'1px solid #f1f5f9'}}>
          <div style={{fontSize:24,marginBottom:5}}>{'⏱️'}</div>
          <div style={{fontSize:15,fontWeight:900,color:'#ea580c'}}>{data?.kpis?.avg_time_to_fill ?? '—'}</div>
          <div style={{fontSize:9,color:'#64748b',marginTop:3}}>Avg Time-to-Fill</div>
        </div>
        <div style={{background:'#fff',borderRadius:14,padding:14,textAlign:'center',boxShadow:'0 2px 8px rgba(0,0,0,.04)',border:'1px solid #f1f5f9'}}>
          <div style={{fontSize:24,marginBottom:5}}>{'🤖'}</div>
          <div style={{fontSize:15,fontWeight:900,color:'#ea580c'}}>{data?.kpis?.ai_top_ranked ?? '—'}</div>
          <div style={{fontSize:9,color:'#64748b',marginTop:3}}>AI Top-Ranked</div>
        </div>
      </div>
      <div style={{display:'flex',gap:4,background:'#f1f5f9',padding:3,borderRadius:10,marginBottom:14,flexWrap:'wrap'}}>
          <button onClick={()=>setTab('pipeline')}
            style={{flex:1,minWidth:70,padding:'7px 8px',borderRadius:9,border:'none',cursor:'pointer',
              fontSize:10,fontWeight:tab==='pipeline'?700:400,
              background:tab==='pipeline'?'#fff':'transparent',
              color:tab==='pipeline'?'#0f172a':'#64748b',
              boxShadow:tab==='pipeline'?'0 1px 4px rgba(0,0,0,.08)':'none'}}>
            🪜 Pipeline
          </button>
          <button onClick={()=>setTab('interviews')}
            style={{flex:1,minWidth:70,padding:'7px 8px',borderRadius:9,border:'none',cursor:'pointer',
              fontSize:10,fontWeight:tab==='interviews'?700:400,
              background:tab==='interviews'?'#fff':'transparent',
              color:tab==='interviews'?'#0f172a':'#64748b',
              boxShadow:tab==='interviews'?'0 1px 4px rgba(0,0,0,.08)':'none'}}>
            🗓️ Interviews
          </button>
          <button onClick={()=>setTab('offers')}
            style={{flex:1,minWidth:70,padding:'7px 8px',borderRadius:9,border:'none',cursor:'pointer',
              fontSize:10,fontWeight:tab==='offers'?700:400,
              background:tab==='offers'?'#fff':'transparent',
              color:tab==='offers'?'#0f172a':'#64748b',
              boxShadow:tab==='offers'?'0 1px 4px rgba(0,0,0,.08)':'none'}}>
            ✉️ Offers
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
      {tab==='pipeline'&&(
      
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',padding:'16px 20px'}}>
          <div style={{fontSize:12,fontWeight:800,marginBottom:14}}>🪜 Candidate Pipeline</div>
          {(data?.pipeline||[]).length===0?(
            <div style={{textAlign:'center',padding:32,color:'#94a3b8'}}>
              <div style={{fontSize:32,marginBottom:8}}>🪜</div>
              <div style={{fontSize:13,fontWeight:600,color:'#475569'}}>No pipeline data yet for {company?.name}</div>
            </div>
          ):(()=>{
            const maxC=Math.max(...(data.pipeline||[]).map(p=>p.count||0),1)
            return(
              <div style={{display:'flex',gap:10,alignItems:'flex-end',height:100,marginBottom:12}}>
                {(data.pipeline||[]).map((p,i)=>(
                  <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                    <div style={{fontSize:10,fontWeight:700,color:'#ea580c'}}>{p.count}</div>
                    <div style={{width:'100%',background:'#ea580c',borderRadius:'4px 4px 0 0',height:`${(p.count/maxC)*70}px`,minHeight:4}}/>
                    <div style={{fontSize:8,color:'#94a3b8',textAlign:'center'}}>{p.stage}</div>
                  </div>
                ))}
              </div>
            )
          })()}
          {(data?.top_candidates||[]).length>0&&(
            <div style={{marginTop:14}}>
              <div style={{fontSize:11,fontWeight:700,marginBottom:8,color:'#0f172a'}}>🤖 AI Top-Ranked Candidates</div>
              {(data.top_candidates||[]).map((c,i)=>(
                <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid #f8fafc',fontSize:12}}>
                  <div>
                    <div style={{fontWeight:700,color:'#0f172a'}}>{c.name}</div>
                    <div style={{fontSize:9,color:'#94a3b8'}}>{c.pos||c.position} · {c.stage}</div>
                  </div>
                  <span style={{fontSize:10,fontWeight:700,color:'#ea580c',background:'#fff7ed',padding:'2px 8px',borderRadius:20,border:'1px solid #fed7aa'}}>{c.score}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {tab==='interviews'&&(
      
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',overflow:'hidden'}}>
          <div style={{padding:'12px 16px',borderBottom:'1px solid #f1f5f9',fontSize:12,fontWeight:800}}>🗓️ Upcoming Interviews</div>
          {(data?.interviews||[]).length===0?(
            <div style={{padding:32,textAlign:'center',color:'#94a3b8',fontSize:11}}>No interviews scheduled yet</div>
          ):(data?.interviews||[]).map((iv,i)=>(
            <div key={i} style={{padding:'12px 16px',borderBottom:'1px solid #f8fafc'}}>
              <div style={{display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
                <div>
                  <div style={{fontSize:11,fontWeight:700,color:'#0f172a'}}>{iv.candidate}</div>
                  <div style={{fontSize:10,color:'#64748b'}}>{iv.pos||iv.position} · {iv.date}</div>
                  {iv.interviewer&&<div style={{fontSize:9,color:'#94a3b8'}}>Interviewer: {iv.interviewer}</div>}
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:4,alignItems:'flex-end'}}>
                  <span style={{fontSize:9,fontWeight:700,color:'#0369a1',background:'#eff6ff',padding:'2px 8px',borderRadius:20}}>{iv.type}</span>
                  <span style={{fontSize:9,color:iv.status==='Confirmed'?'#15803d':'#b45309'}}>{iv.status}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {tab==='offers'&&(
      
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',overflow:'hidden'}}>
          <div style={{padding:'12px 16px',borderBottom:'1px solid #f1f5f9',fontSize:12,fontWeight:800}}>✉️ Offers Awaiting Approval</div>
          {(data?.pending_offers||[]).length===0?(
            <div style={{padding:32,textAlign:'center',color:'#94a3b8',fontSize:11}}>✅ No pending offers</div>
          ):(data?.pending_offers||[]).map((o,i)=>(
            <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'12px 16px',borderBottom:'1px solid #f8fafc',flexWrap:'wrap',gap:8}}>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:'#0f172a'}}>{o.candidate}</div>
                <div style={{fontSize:9,color:'#94a3b8'}}>{o.role||o.position}</div>
              </div>
              <span style={{fontSize:9,color:'#b45309',fontWeight:600}}>{o.awaiting||o.approval_stage}</span>
            </div>
          ))}
        </div>
      )}
      {tab==='analytics'&&(
      
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',padding:'16px 20px'}}>
          <div style={{fontSize:12,fontWeight:800,marginBottom:14}}>📊 Recruitment Metrics</div>
          {(data?.analytics||[]).length===0?(
            <div style={{textAlign:'center',padding:24,color:'#94a3b8',fontSize:11}}>No analytics yet</div>
          ):(data?.analytics||[]).map((m,i)=>(
            <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #f8fafc',fontSize:12}}>
              <span style={{color:'#475569'}}>{m.label||m.metric}</span>
              <span style={{fontWeight:700,color:'#0f172a'}}>{m.value}</span>
            </div>
          ))}
        </div>
      )}
      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'16px 20px'}}>
        <div style={{fontSize:12,fontWeight:800,marginBottom:10}}>🔗 Quick Links</div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <button onClick={()=>navTo('ats-dashboard')} style={{padding:'7px 14px',borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#374151',fontSize:10,fontWeight:600,cursor:'pointer'}}>ATS Dashboard</button>
            <button onClick={()=>navTo('interview-scheduling')} style={{padding:'7px 14px',borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#374151',fontSize:10,fontWeight:600,cursor:'pointer'}}>Interview Scheduling</button>
            <button onClick={()=>navTo('offer-management')} style={{padding:'7px 14px',borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#374151',fontSize:10,fontWeight:600,cursor:'pointer'}}>Offer Management</button>
            <button onClick={()=>navTo('resume-screening')} style={{padding:'7px 14px',borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#374151',fontSize:10,fontWeight:600,cursor:'pointer'}}>Resume Screening (AI)</button>
            <button onClick={()=>navTo('recruitment-analytics')} style={{padding:'7px 14px',borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#374151',fontSize:10,fontWeight:600,cursor:'pointer'}}>Recruitment Analytics</button>
            <button onClick={()=>navTo('job-postings')} style={{padding:'7px 14px',borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#374151',fontSize:10,fontWeight:600,cursor:'pointer'}}>Job Postings</button>
        </div>
      </div>
    </div>
  )
}
