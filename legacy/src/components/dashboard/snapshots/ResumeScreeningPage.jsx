// FILE: ResumeScreeningPage.jsx - AI Resume Screening
// Blind screening, skills taxonomy, AI ranking, fraud detection

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, LuxCard, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#1e3a5f 0%,#1e40af 60%,#60a5fa 100%)'
const A = '#1e40af'

const CVS = [
  {id:'cv1',code:'APP-001',name:'Rajan Shrestha',    pos:'Senior SW Dev',ai_match:94,cv_score:91,skill_match:88,exp_match:100,edu_match:95,fraud_risk:2,
   skills_matched:['React','Python','AWS','PostgreSQL'],skills_missing:['Kubernetes'],
   exp_yrs:6,edu:'B.Tech CS',blind:false,status:'shortlisted',
   knockout_pass:true,source:'LinkedIn',applied:'2025-06-01',
   ai_reason:'Excellent match. 6/7 required skills. Strong portfolio. Recommend interview.'},
  {id:'cv2',code:'APP-002',name:'Priya Tamang',      pos:'Senior SW Dev',ai_match:88,cv_score:85,skill_match:82,exp_match:100,edu_match:90,fraud_risk:5,
   skills_matched:['Java','Spring Boot','MySQL'],skills_missing:['React','AWS'],
   exp_yrs:5,edu:'M.Sc IT',blind:false,status:'shortlisted',
   knockout_pass:true,source:'Merojob',applied:'2025-06-02',
   ai_reason:'Strong backend. Frontend skills gap. Trainable. Shortlist for technical screening.'},
  {id:'cv3',code:'APP-003',name:'Ram KC',            pos:'Senior SW Dev',ai_match:62,cv_score:58,skill_match:55,exp_match:60,edu_match:70,fraud_risk:18,
   skills_matched:['HTML','CSS'],skills_missing:['React','Python','AWS','PostgreSQL','Kubernetes'],
   exp_yrs:2,edu:'BCA',blind:false,status:'rejected',
   knockout_pass:false,source:'Direct',applied:'2025-06-03',
   ai_reason:'REJECTED: Does not meet 5yr experience minimum (has 2yr). Only 2/7 required skills.'},
  {id:'cv4',code:'APP-004',name:'Gita Maharjan',     pos:'Cloud Architect',ai_match:97,cv_score:96,skill_match:100,exp_match:100,edu_match:95,fraud_risk:3,
   skills_matched:['AWS','GCP','Kubernetes','Terraform','CI/CD'],skills_missing:[],
   exp_yrs:6,edu:'M.Tech',blind:false,status:'shortlisted',
   knockout_pass:true,source:'Direct',applied:'2025-06-10',
   ai_reason:'Perfect match. All 5 required skills verified. Top AI pick for Cloud Architect role.'},
  {id:'cv5',code:'APP-005',name:'Sita K.', pos:'HR Business Partner',ai_match:83,cv_score:80,skill_match:75,exp_match:100,edu_match:85,fraud_risk:7,
   skills_matched:['HRMS','Labour Law','Recruitment'],skills_missing:['Performance Mgmt'],
   exp_yrs:5,edu:'MBA HR',blind:false,status:'review',
   knockout_pass:true,source:'LinkedIn',applied:'2025-06-05',
   ai_reason:'Good match. Labour Law expertise strong. Performance Mgmt gap. Borderline - manual review recommended.'},
  {id:'cv6',code:'APP-006',name:'Anon A.',            pos:'Finance Manager',ai_match:41,cv_score:38,skill_match:35,exp_match:50,edu_match:40,fraud_risk:62,
   skills_matched:['Excel'],skills_missing:['SAP FI','IFRS','Audit','Tax','ERP'],
   exp_yrs:3,edu:'BBS',blind:false,status:'rejected',
   knockout_pass:false,source:'Kumarijob',applied:'2025-06-08',
   ai_reason:'FRAUD ALERT: Employment dates inconsistent. Claimed 10yr experience but resume shows 3yr. Auto-rejected.'},
]

const STATUS_CFG = {
  shortlisted:{c:'#10b981',bg:'#f0fdf4',b:'#bbf7d0',label:'Shortlisted',icon:'✅'},
  review:     {c:'#f59e0b',bg:'#fffbeb',b:'#fde68a',label:'Review',     icon:'👁'},
  rejected:   {c:'#ef4444',bg:'#fef2f2',b:'#fecaca',label:'Rejected',   icon:'❌'},
}
const CTX = [
  {icon:'👁',label:'View Full CV',         key:'view'},
  {icon:'✅',label:'Shortlist Candidate',  key:'shortlist'},
  {icon:'📊',label:'Detailed AI Analysis',key:'ai'},
  {icon:'📧',label:'Send Status Email',    key:'email'},
  {icon:'🔗',label:'Impact Analysis',     key:'impact'},
  {icon:'❌',label:'Reject',              key:'reject',danger:true},
]

export default function ResumeScreeningPage() {
  const [cvs, setCvs]             = useState(CVS)
  const [search, setSearch]       = useState('')
  const [filterStatus, setFilter] = useState('all')
  const [blindMode, setBlindMode] = useState(false)
  const [selected, setSelected]   = useState(null)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx]             = useState(null)

  const filtered = cvs.filter(c=>{
    if (filterStatus!=='all'&&c.status!==filterStatus) return false
    if (search&&!c.name.toLowerCase().includes(search.toLowerCase())&&!c.pos.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const shortlisted = cvs.filter(c=>c.status==='shortlisted').length
  const rejected    = cvs.filter(c=>c.status==='rejected').length
  const fraudAlerts = cvs.filter(c=>c.fraud_risk>50).length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📄" title="Resume Screening"
        breadcrumb="Employee Lifecycle > Recruitment > Recruitment Management"
        gradient={G}
        stats={[
          {icon:'📄',label:'Total CVs',     value:cvs.length},
          {icon:'✅',label:'Shortlisted',   value:shortlisted},
          {icon:'❌',label:'Rejected',      value:rejected},
          {icon:'⚠',label:'Fraud Alerts',  value:fraudAlerts},
        ]}
        onAdd={()=>setShowExcel(true)} addLabel="Upload CVs"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'linear-gradient(135deg,#f5f3ff,#eff6ff)',border:'1px solid #c4b5fd',borderRadius:12,padding:'10px 16px',marginBottom:14,display:'flex',gap:10,fontSize:11,color:'#3730a3'}}>
        <span style={{fontSize:18}}>🤖</span>
        <div><strong>AI Screening Active:</strong> CVs auto-ranked by skill match (40%) + experience (30%) + education (20%) + portfolio (10%). Blind mode removes name/gender/caste per Nepal LA2074 Section 6 anti-discrimination.</div>
      </div>

      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search CVs by candidate, position..."/>
        <div style={{display:'flex',gap:4,background:'#f1f5f9',padding:3,borderRadius:9}}>
          {['all','shortlisted','review','rejected'].map(s=>(
            <button key={s} onClick={()=>setFilter(s)}
              style={{padding:'7px 12px',borderRadius:7,border:'none',cursor:'pointer',fontSize:10,
                background:filterStatus===s?'#fff':'transparent',color:filterStatus===s?A:'#64748b',
                fontWeight:filterStatus===s?700:400,boxShadow:filterStatus===s?'0 1px 3px rgba(0,0,0,.08)':'none'}}>
              {s==='all'?'All':STATUS_CFG[s]?.label||s}
            </button>
          ))}
        </div>
        <label style={{display:'flex',gap:8,alignItems:'center',cursor:'pointer',padding:'8px 14px',borderRadius:9,border:`1.5px solid ${blindMode?A:'#e2e8f0'}`,background:blindMode?'#eff6ff':'#fff',fontSize:11,fontWeight:600,color:blindMode?A:'#64748b'}}>
          <input type="checkbox" checked={blindMode} onChange={e=>setBlindMode(e.target.checked)} style={{accentColor:A}}/>
          Blind Mode (LA2074)
        </label>
      </div>

      <div style={{display:'grid',gap:12}}>
        {filtered.map(cv=>{
          const sc = STATUS_CFG[cv.status]||STATUS_CFG.review
          return (
            <div key={cv.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:cv.name,...cv}})}}
              style={{background:'#fff',border:`1.5px solid ${cv.fraud_risk>50?'#fecaca':sc.b}`,
                borderRadius:14,overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,.05)',
                borderLeft:`5px solid ${cv.fraud_risk>50?'#ef4444':sc.c}`}}>
              <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr auto',gap:12,padding:'14px 18px',alignItems:'center',flexWrap:'wrap'}}>
                <div>
                  <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:3}}>
                    <span style={{fontFamily:'monospace',fontSize:10,fontWeight:700,color:A}}>{cv.code}</span>
                    <span style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{blindMode?'Candidate '+cv.code.split('-')[1]:cv.name}</span>
                    <span style={{background:sc.bg,color:sc.c,border:`1px solid ${sc.b}`,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{sc.icon} {sc.label}</span>
                    {cv.fraud_risk>50&&<span style={{background:'#fef2f2',color:'#dc2626',fontSize:9,fontWeight:800,padding:'2px 8px',borderRadius:20}}>FRAUD ALERT</span>}
                  </div>
                  <div style={{fontSize:11,color:'#64748b'}}>{cv.pos} . {cv.exp_yrs}yr exp . {blindMode?'***':cv.edu} . {cv.source}</div>
                  <div style={{marginTop:6,display:'flex',gap:4,flexWrap:'wrap'}}>
                    {cv.skills_matched.map((s,i)=><span key={i} style={{background:'#f0fdf4',color:'#15803d',fontSize:9,padding:'2px 7px',borderRadius:20}}>✓ {s}</span>)}
                    {cv.skills_missing.map((s,i)=><span key={i} style={{background:'#fef2f2',color:'#ef4444',fontSize:9,padding:'2px 7px',borderRadius:20}}>✗ {s}</span>)}
                  </div>
                </div>
                {[{l:'AI Match',v:cv.ai_match,c:cv.ai_match>=80?'#10b981':cv.ai_match>=60?'#f59e0b':'#ef4444'},
                  {l:'Skills',  v:cv.skill_match,c:'#8b5cf6'},
                  {l:'Exp',    v:cv.exp_match,c:'#3b82f6'},
                  {l:'Edu',    v:cv.edu_match,c:'#f59e0b'},
                ].map((s,i)=>(
                  <div key={i} style={{textAlign:'center',background:'#f8fafc',borderRadius:10,padding:'8px 4px'}}>
                    <div style={{fontSize:16,fontWeight:900,color:s.c}}>{s.v}%</div>
                    <div style={{fontSize:8,color:'#94a3b8',fontWeight:600}}>{s.l}</div>
                  </div>
                ))}
                <div style={{display:'flex',gap:5}}>
                  {cv.status!=='shortlisted'&&<button onClick={()=>setCvs(p=>p.map(c=>c.id===cv.id?{...c,status:'shortlisted'}:c))} style={{padding:'6px 12px',borderRadius:8,border:'none',background:'#10b981',color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>Shortlist</button>}
                  {cv.status!=='rejected'&&<button onClick={()=>setCvs(p=>p.map(c=>c.id===cv.id?{...c,status:'rejected'}:c))} style={{padding:'6px 12px',borderRadius:8,border:'none',background:'#fef2f2',color:'#ef4444',fontSize:10,fontWeight:600,cursor:'pointer'}}>Reject</button>}
                </div>
              </div>
              <div style={{padding:'6px 18px 10px',background:'#f8fafc',fontSize:10,color:'#64748b',fontStyle:'italic',borderTop:'1px solid #f1f5f9'}}>
                🤖 {cv.ai_reason}
              </div>
            </div>
          )
        })}
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={['ATS Dashboard','Interview Scheduling','Vacancy Management']} actions={CTX} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Resume Screening" columns={['App Code','Name','Position','AI Match%','Skills Match%','Experience Match%','Education Match%','Fraud Risk%','Status','Source','Applied Date']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
    </div>
  )
}
