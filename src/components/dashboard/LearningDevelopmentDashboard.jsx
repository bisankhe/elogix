// FILE: src/components/dashboard/LearningDevelopmentDashboard.jsx
// eLogix HRMS — Learning & Development Workspace
// COMPLETE REWRITE — Zero mock data. Real tenant API.
// API: GET /api/v1/ld-dashboard/summary
// eLogix Technologies · www.elogix.com.np

import { useState, useEffect } from 'react'
import { useApp } from '../../context/AppContext.jsx'


function _getSession(){try{return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{}}catch{return{}}}
function _authH(){const s=_getSession();const token=localStorage.getItem('access_token')||s?.token||'';const slug=s?.company?.slug||'';return{'Authorization':`Bearer ${token}`,'X-Tenant-Slug':slug,'Content-Type':'application/json'}}

export default function LearningDevelopmentDashboard() {
  const { navTo } = useApp()
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [tab,     setTab]     = useState('upcoming')

  const s = _getSession(); const company = s?.company || {}

  useEffect(() => {
    const token = localStorage.getItem('access_token') || s?.token || ''
    const slug  = s?.company?.slug || ''
    if (!token || !slug) { setLoading(false); return }
    fetch('/api/v1/ld-dashboard/summary', { headers: _authH() })
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
    <div style={{textAlign:'center',padding:60,color:'#0f766e',fontFamily:'system-ui'}}>
      <div style={{fontSize:30,marginBottom:10}}>⟳</div>
      <div style={{fontSize:12,fontWeight:600}}>Loading for {company?.name}...</div>
    </div>
  )

  return (
    <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif",color:'#0f172a'}}>

      {/* Header */}
      <div style={{background:'linear-gradient(135deg,#134e4a 0%,#0f766e 60%,#5eead4 100%)',borderRadius:16,padding:'18px 22px',marginBottom:20,
        boxShadow:'0 4px 20px rgba(0,0,0,.15)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <span style={{fontSize:22}}>{'🎓'}</span>
          <div>
            <div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Learning & Development Workspace</div>
            <div style={{fontSize:11,color:'rgba(255,255,255,.75)',marginTop:2}}>
              {company?.name} · Courses, skill gaps, certifications & training ROI
            </div>
          </div>
        </div>
      </div>

      {error&&<div style={{padding:'10px 16px',background:'#fffbeb',border:'1px solid #fde68a',
        borderRadius:10,fontSize:12,color:'#92400e',marginBottom:14}}>⚠️ {error}</div>}

      {/* KPI Cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(110px,1fr))',gap:12,marginBottom:20}}>
        <div style={{background:'#fff',borderRadius:14,padding:14,textAlign:'center',boxShadow:'0 2px 8px rgba(0,0,0,.05)',border:'1px solid #f1f5f9'}}>
          <div style={{fontSize:24,marginBottom:5}}>{'🎓'}</div>
          <div style={{fontSize:15,fontWeight:900,color:'#0f766e'}}>{data?.kpis?.completion_rate ?? '—'}</div>
          <div style={{fontSize:9,color:'#64748b',marginTop:3}}>Completion Rate</div>
        </div>
        <div style={{background:'#fff',borderRadius:14,padding:14,textAlign:'center',boxShadow:'0 2px 8px rgba(0,0,0,.05)',border:'1px solid #f1f5f9'}}>
          <div style={{fontSize:24,marginBottom:5}}>{'📅'}</div>
          <div style={{fontSize:15,fontWeight:900,color:'#0f766e'}}>{data?.kpis?.upcoming_count ?? '—'}</div>
          <div style={{fontSize:9,color:'#64748b',marginTop:3}}>Upcoming Modules</div>
        </div>
        <div style={{background:'#fff',borderRadius:14,padding:14,textAlign:'center',boxShadow:'0 2px 8px rgba(0,0,0,.05)',border:'1px solid #f1f5f9'}}>
          <div style={{fontSize:24,marginBottom:5}}>{'🏆'}</div>
          <div style={{fontSize:15,fontWeight:900,color:'#0f766e'}}>{data?.kpis?.certificates_mtd ?? '—'}</div>
          <div style={{fontSize:9,color:'#64748b',marginTop:3}}>Certificates (MTD)</div>
        </div>
        <div style={{background:'#fff',borderRadius:14,padding:14,textAlign:'center',boxShadow:'0 2px 8px rgba(0,0,0,.05)',border:'1px solid #f1f5f9'}}>
          <div style={{fontSize:24,marginBottom:5}}>{'📐'}</div>
          <div style={{fontSize:15,fontWeight:900,color:'#0f766e'}}>{data?.kpis?.training_roi ?? '—'}</div>
          <div style={{fontSize:9,color:'#64748b',marginTop:3}}>Training ROI</div>
        </div>
        <div style={{background:'#fff',borderRadius:14,padding:14,textAlign:'center',boxShadow:'0 2px 8px rgba(0,0,0,.05)',border:'1px solid #f1f5f9'}}>
          <div style={{fontSize:24,marginBottom:5}}>{'👥'}</div>
          <div style={{fontSize:15,fontWeight:900,color:'#0f766e'}}>{data?.kpis?.enrolled_employees ?? '—'}</div>
          <div style={{fontSize:9,color:'#64748b',marginTop:3}}>Enrolled Employees</div>
        </div>
        <div style={{background:'#fff',borderRadius:14,padding:14,textAlign:'center',boxShadow:'0 2px 8px rgba(0,0,0,.05)',border:'1px solid #f1f5f9'}}>
          <div style={{fontSize:24,marginBottom:5}}>{'⚠️'}</div>
          <div style={{fontSize:15,fontWeight:900,color:'#0f766e'}}>{data?.kpis?.overdue_trainings ?? '—'}</div>
          <div style={{fontSize:9,color:'#64748b',marginTop:3}}>Overdue Trainings</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:4,background:'#f1f5f9',padding:3,borderRadius:10,marginBottom:14,flexWrap:'wrap'}}>
          <button onClick={()=>setTab('upcoming')}
            style={{flex:1,minWidth:70,padding:'7px 8px',borderRadius:9,border:'none',cursor:'pointer',
              fontSize:10,fontWeight:tab==='upcoming'?700:400,
              background:tab==='upcoming'?'#fff':'transparent',
              color:tab==='upcoming'?'#0f172a':'#64748b',
              boxShadow:tab==='upcoming'?'0 1px 4px rgba(0,0,0,.08)':'none'}}>
            📅 Upcoming
          </button>
          <button onClick={()=>setTab('progress')}
            style={{flex:1,minWidth:70,padding:'7px 8px',borderRadius:9,border:'none',cursor:'pointer',
              fontSize:10,fontWeight:tab==='progress'?700:400,
              background:tab==='progress'?'#fff':'transparent',
              color:tab==='progress'?'#0f172a':'#64748b',
              boxShadow:tab==='progress'?'0 1px 4px rgba(0,0,0,.08)':'none'}}>
            📊 Progress
          </button>
          <button onClick={()=>setTab('certs')}
            style={{flex:1,minWidth:70,padding:'7px 8px',borderRadius:9,border:'none',cursor:'pointer',
              fontSize:10,fontWeight:tab==='certs'?700:400,
              background:tab==='certs'?'#fff':'transparent',
              color:tab==='certs'?'#0f172a':'#64748b',
              boxShadow:tab==='certs'?'0 1px 4px rgba(0,0,0,.08)':'none'}}>
            🏆 Certifications
          </button>
          <button onClick={()=>setTab('gaps')}
            style={{flex:1,minWidth:70,padding:'7px 8px',borderRadius:9,border:'none',cursor:'pointer',
              fontSize:10,fontWeight:tab==='gaps'?700:400,
              background:tab==='gaps'?'#fff':'transparent',
              color:tab==='gaps'?'#0f172a':'#64748b',
              boxShadow:tab==='gaps'?'0 1px 4px rgba(0,0,0,.08)':'none'}}>
            🧩 Skill Gaps
          </button>
      </div>

      {/* Tab Content */}
            {tab==='upcoming'&&(
      
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',overflow:'hidden'}}>
          <div style={{padding:'12px 16px',borderBottom:'1px solid #f1f5f9',fontSize:12,fontWeight:800}}>📅 Upcoming Training Modules</div>
          {(data?.upcoming||[]).length===0?(
            <div style={{padding:32,textAlign:'center',color:'#94a3b8'}}>
              <div style={{fontSize:32,marginBottom:8}}>📅</div>
              <div style={{fontSize:13,fontWeight:600,color:'#475569'}}>No upcoming modules for {company?.name}</div>
            </div>
          ):(data?.upcoming||[]).map((m,i)=>(
            <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',padding:'12px 16px',borderBottom:'1px solid #f8fafc',flexWrap:'wrap',gap:8}}>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:'#0f172a'}}>{m.module||m.title}</div>
                <div style={{fontSize:9,color:'#94a3b8',marginTop:2}}>{m.date} · {m.trainer||m.facilitator||''}</div>
              </div>
              <span style={{fontSize:9,color:'#0f766e',fontWeight:700,background:'#f0fdfa',padding:'2px 10px',borderRadius:20,border:'1px solid #99f6e4'}}>{m.enrolled} enrolled</span>
            </div>
          ))}
        </div>
      )}
            {tab==='progress'&&(
      
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',padding:'16px 20px'}}>
          <div style={{fontSize:12,fontWeight:800,marginBottom:14}}>📊 Training Progress by Department</div>
          {(data?.dept_progress||[]).length===0?(
            <div style={{textAlign:'center',padding:24,color:'#94a3b8',fontSize:11}}>No progress data yet for {company?.name}</div>
          ):(data?.dept_progress||[]).map((d,i)=>(
            <div key={i} style={{marginBottom:14}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:11,marginBottom:5}}>
                <span style={{color:'#475569',fontWeight:600}}>{d.dept||d.department}</span>
                <span style={{fontWeight:700,color:'#0f766e'}}>{d.completion_pct||d.pct}%</span>
              </div>
              <div style={{height:6,background:'#f1f5f9',borderRadius:6,overflow:'hidden'}}>
                <div style={{height:'100%',width:`${Math.min(100,d.completion_pct||d.pct||0)}%`,background:'#0f766e',borderRadius:6,transition:'width .5s'}}/>
              </div>
            </div>
          ))}
        </div>
      )}
            {tab==='certs'&&(
      
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',overflow:'hidden'}}>
          <div style={{padding:'12px 16px',borderBottom:'1px solid #f1f5f9',fontSize:12,fontWeight:800}}>🏆 Recent Certifications</div>
          {(data?.certifications||[]).length===0?(
            <div style={{padding:32,textAlign:'center',color:'#94a3b8',fontSize:11}}>No certifications issued yet for {company?.name}</div>
          ):(data?.certifications||[]).map((c,i)=>(
            <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 16px',borderBottom:'1px solid #f8fafc'}}>
              <div>
                <div style={{fontSize:11,fontWeight:700}}>{c.employee||c.name}</div>
                <div style={{fontSize:9,color:'#94a3b8'}}>{c.cert||c.course} · {c.date}</div>
              </div>
              <span style={{fontSize:9,color:'#7c3aed',background:'#f5f3ff',padding:'2px 8px',borderRadius:20}}>🏆 Certified</span>
            </div>
          ))}
        </div>
      )}
            {tab==='gaps'&&(
      
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',padding:'16px 20px'}}>
          <div style={{fontSize:12,fontWeight:800,marginBottom:14}}>🧩 Skill Gap Analysis</div>
          {(data?.skill_gaps||[]).length===0?(
            <div style={{textAlign:'center',padding:24,color:'#94a3b8',fontSize:11}}>No skill gap data — run the assessment from Skill Gap Matrix</div>
          ):(data?.skill_gaps||[]).map((g,i)=>(
            <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #f8fafc',fontSize:12}}>
              <span style={{color:'#475569'}}>{g.skill}</span>
              <div>
                <span style={{fontWeight:700,color:(g.gap_pct||0)>30?'#ef4444':(g.gap_pct||0)>15?'#f59e0b':'#10b981'}}>{g.gap_pct}% gap</span>
                <span style={{fontSize:9,color:'#94a3b8',marginLeft:8}}>{g.employees_affected} affected</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Links */}
      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'16px 20px'}}>
        <div style={{fontSize:12,fontWeight:800,marginBottom:10}}>🔗 Quick Links</div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <button onClick={()=>navTo('course-management')} style={{padding:'7px 14px',borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#374151',fontSize:10,fontWeight:600,cursor:'pointer'}}>Course Management</button>
            <button onClick={()=>navTo('skill-gap-matrix')} style={{padding:'7px 14px',borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#374151',fontSize:10,fontWeight:600,cursor:'pointer'}}>Skill Gap Matrix</button>
            <button onClick={()=>navTo('certification-tracking')} style={{padding:'7px 14px',borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#374151',fontSize:10,fontWeight:600,cursor:'pointer'}}>Certification Tracking</button>
            <button onClick={()=>navTo('training-roi')} style={{padding:'7px 14px',borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#374151',fontSize:10,fontWeight:600,cursor:'pointer'}}>Training ROI</button>
            <button onClick={()=>navTo('osh-compliance')} style={{padding:'7px 14px',borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#374151',fontSize:10,fontWeight:600,cursor:'pointer'}}>OSH Compliance</button>
        </div>
      </div>
    </div>
  )
}
