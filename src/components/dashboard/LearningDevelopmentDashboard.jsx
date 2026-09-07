// FILE: src/components/dashboard/LearningDevelopmentDashboard.jsx
// PURPOSE: L&D workspace -- training calendar, course management,
// skill gap, certification tracking, training ROI.
import { StatCard } from '../shared/StatCard.jsx'
import { Card } from '../shared/Card.jsx'
const UPCOMING=[
  {module:'OSH Refresher 2025',date:'2025-07-08',enrolled:34},
  {module:'Leadership Essentials -- Cohort 3',date:'2025-07-15',enrolled:12},
]

function _getSession() {
  try {
    return JSON.parse(
      sessionStorage.getItem('elogix_session') ||
      localStorage.getItem('elogix_session') || 'null'
    ) || {}
  } catch (_e) { return {} }
}
function _getCurrency() {
  const s = _getSession()
  const code = s?.company?.currency || 'NPR'
  return { code, symbol: {NPR:'रु',USD:'$',INR:'₹',EUR:'€',GBP:'£'}[code] || code }
}
function _useAppFallback() {
  const s = _getSession(); const cc = _getCurrency()
  return {
    sub:'', persona:s?.user?.role||'employee', lang:'en', currency:cc.code, cc,
    company:s?.company||{}, user:s?.user||{}, t:()=>'',
    navTo:(p)=>window.dispatchEvent(new CustomEvent('elogix:nav',{detail:{page:p}})),
    switchPersona:()=>{}, setShowNotif:()=>{}, setShowAI:()=>{},
    setSidebarOpen:()=>{}, sidebarOpen:true, darkMode:false, setDarkMode:()=>{},
    currentPersona:{id:'employee',icon:'👤',color:'#7c3aed',label:''},
  }
}

export default function LearningDevelopmentDashboard(){
  const { navTo } = _useAppFallback()
  return(
    <div>
      <h1 style={{fontSize:20,fontWeight:900,color:'#0f172a',marginBottom:4}}>🎓 Learning &amp; Development Workspace</h1>
      <p style={{fontSize:11,color:'#94a3b8',marginBottom:18}}>Courses, skill gaps, certifications, and training ROI</p>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:14,marginBottom:20}}>
        <StatCard icon="🎓" label="Completion Rate" value="82%"/>
        <StatCard icon="📋" label="Upcoming Modules" value={UPCOMING.length}/>
        <StatCard icon="🏆" label="Certificates Issued (MTD)" value="9"/>
        <StatCard icon="📐" label="Training ROI" value="+14%"/>
      </div>
      <Card>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:12}}>📅 Upcoming Training Modules</div>
        {UPCOMING.map((m,i)=>(
          <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:i<UPCOMING.length-1?'1px solid #f8fafc':'none'}}>
            <span style={{fontSize:9,color:'#374151'}}>{m.module} . {m.date}</span><span style={{fontSize:8,color:'#94a3b8'}}>{m.enrolled} enrolled</span>
          </div>
        ))}
      </Card>
      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <div style={{fontSize:10,fontWeight:800,color:'#0f172a',marginBottom:8}}>🔗 Quick Links</div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {[['Course Management','course-management'],['Skill Gap Matrix','skill-gap-matrix'],['Certification Tracking','certification-tracking'],['Training ROI','training-roi']].map(([label,id])=>
            <button key={id} onClick={()=>navTo(id)} style={{padding:'7px 12px',borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#374151',fontSize:8,fontWeight:600,cursor:'pointer'}}>{label}</button>)}
        </div>
      </div>
    </div>
  )
}
