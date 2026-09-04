// FILE: src/components/dashboard/CustomerServiceDashboard.jsx
// PURPOSE: Customer Service workspace -- helpdesk tickets, SLA
// tracking. Genuinely distinct from ProcurementDashboard despite
// the brief listing identical Nepali description text for both --
// this persona scopes to HR Helpdesk's own ticketing data.
import { StatCard } from '../shared/StatCard.jsx'
import { Card } from '../shared/Card.jsx'
const TICKETS=[
  {id:'TKT-1042',subject:'Payslip not generated for June',status:'open',sla:'2h remaining'},
  {id:'TKT-1039',subject:'Access request -- new hire onboarding',status:'in_progress',sla:'On track'},
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

export default function CustomerServiceDashboard(){
  const { navTo } = _useAppFallback()
  return(
    <div>
      <h1 style={{fontSize:20,fontWeight:900,color:'#0f172a',marginBottom:4}}>🎧 Customer Service Workspace</h1>
      <p style={{fontSize:11,color:'#94a3b8',marginBottom:18}}>Helpdesk tickets, SLA tracking, and employee query resolution</p>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:14,marginBottom:20}}>
        <StatCard icon="🎫" label="Open Tickets" value="14"/>
        <StatCard icon="⏱" label="Avg Resolution Time" value="4.2h"/>
        <StatCard icon="✅" label="SLA Compliance" value="96%"/>
        <StatCard icon="😊" label="Satisfaction Score" value="4.6/5"/>
      </div>
      <Card>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:12}}>🎫 Active Tickets</div>
        {TICKETS.map((t,i)=>(
          <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:i<TICKETS.length-1?'1px solid #f8fafc':'none',flexWrap:'wrap',gap:8}}>
            <div><div style={{fontSize:9,fontWeight:700,color:'#0f172a'}}>{t.id}</div><div style={{fontSize:8,color:'#94a3b8'}}>{t.subject}</div></div>
            <span style={{fontSize:8,color:'#0284c7'}}>{t.sla}</span>
          </div>
        ))}
      </Card>
      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <div style={{fontSize:10,fontWeight:800,color:'#0f172a',marginBottom:8}}>🔗 Quick Links</div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {[['HR Ticketing System','hr-ticketing'],['Employee Queries','employee-queries'],['Case Tracking','case-tracking']].map(([label,id])=>
            <button key={id} onClick={()=>navTo(id)} style={{padding:'7px 12px',borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#374151',fontSize:8,fontWeight:600,cursor:'pointer'}}>{label}</button>)}
        </div>
      </div>
    </div>
  )
}
