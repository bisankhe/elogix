// FILE: src/components/dashboard/HROfficerDashboard.jsx
// PURPOSE: HR Officer (operational, sub-manager) workspace --
// distinct from HRManagerDashboard (strategic/compliance-wide
// view). This persona handles day-to-day case-level HR ops:
// onboarding checklist, leave approvals, grievance intake.
import { StatCard } from '../shared/StatCard.jsx'
import { Card } from '../shared/Card.jsx'
const TASKS=[
  {item:'3 new hires need Day-1 paperwork completed',type:'onboarding'},
  {item:'5 leave requests awaiting first-level review',type:'leave'},
  {item:'1 grievance intake form submitted today',type:'grievance'},
]

function _getSession() {
  try {
    return JSON.parse(
      sessionStorage.getItem('elogix_session') ||
      localStorage.getItem('elogix_session') || 'null'
    ) || {}
  } catch (_e) { return {} }
}
function _useAppFallback() {
  const s = _getSession()
  return {
    sub: s?.last_page || '', persona: s?.persona || s?.user?.role || 'employee',
    lang: s?.lang || 'en', currency: s?.currency || 'NPR',
    company: s?.company || {}, user: s?.user || {},
    darkMode: false, setDarkMode: () => {},
    navTo: (p) => window.dispatchEvent(new CustomEvent('elogix:nav', { detail: { page: p } })),
    switchPersona: () => {}, setShowNotif: () => {}, setShowAI: () => {},
    setSidebarOpen: () => {}, sidebarOpen: true,
    currentPersona: { id: s?.persona || 'employee', icon: '👤', color: '#7c3aed', label: '' },
  }
}

export default function HROfficerDashboard(){
  const { navTo } = _useAppFallback()
  return(
    <div>
      <h1 style={{fontSize:20,fontWeight:900,color:'#0f172a',marginBottom:4}}>👥 HR Officer Workspace</h1>
      <p style={{fontSize:11,color:'#94a3b8',marginBottom:18}}>Day-to-day HR operations -- onboarding, leave, and case intake</p>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:14,marginBottom:20}}>
        <StatCard icon="🆕" label="New Hires (Pending Docs)" value="3"/>
        <StatCard icon="🌴" label="Leave Reviews Pending" value="5"/>
        <StatCard icon="📋" label="Open Cases" value="2"/>
        <StatCard icon="📑" label="Letters to Issue" value="4"/>
      </div>
      <Card>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:12}}>📋 Today's Tasks</div>
        {TASKS.map((t,i)=><div key={i} style={{padding:'9px 0',borderBottom:i<TASKS.length-1?'1px solid #f8fafc':'none',fontSize:9,color:'#374151'}}>{t.item}</div>)}
      </Card>
      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <div style={{fontSize:10,fontWeight:800,color:'#0f172a',marginBottom:8}}>🔗 Quick Links</div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {[['Joining Checklist','joining-checklist'],['Leave Approval','leave-approval'],['Grievance Management','grievance-management'],['Letter Request','letter-request']].map(([label,id])=>
            <button key={id} onClick={()=>navTo(id)} style={{padding:'7px 12px',borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#374151',fontSize:8,fontWeight:600,cursor:'pointer'}}>{label}</button>)}
        </div>
      </div>
    </div>
  )
}
