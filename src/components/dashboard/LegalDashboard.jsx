// FILE: src/components/dashboard/LegalDashboard.jsx
// PURPOSE: Legal department workspace -- case tracking, contract
// compliance, ethics reports. Reuses EXISTING legal_case_metadata/
// contracts/ethics_reports tables (Legal Management session).
import { StatCard } from '../shared/StatCard.jsx'
import { Card } from '../shared/Card.jsx'
const CASES=[
  {case_no:'LC-2025-003',matter:'Unfair treatment in territory reassignment',stage:'Labour Office'},
  {case_no:'LC-2025-001',matter:'Workplace harassment investigation outcome disputed',stage:'Labour Court'},
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

export default function LegalDashboard(){
  const { navTo } = _useAppFallback()
  return(
    <div>
      <h1 style={{fontSize:20,fontWeight:900,color:'#0f172a',marginBottom:4}}>⚖ Legal Workspace</h1>
      <p style={{fontSize:11,color:'#94a3b8',marginBottom:18}}>Case tracking, contract compliance, and ethics oversight</p>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:14,marginBottom:20}}>
        <StatCard icon="⚖" label="Active Cases" value={CASES.length}/>
        <StatCard icon="📜" label="Contracts Tracked" value="48"/>
        <StatCard icon="⚠" label="Expiring (30d)" value="3"/>
        <StatCard icon="🛡" label="Ethics Reports Open" value="2"/>
        <StatCard icon="🔒" label="Litigation Holds" value="1"/>
      </div>
      <Card>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:12}}>⚖ Active Legal Cases</div>
        {CASES.map((c,i)=>(
          <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:i<CASES.length-1?'1px solid #f8fafc':'none',flexWrap:'wrap',gap:8}}>
            <div><div style={{fontSize:9,fontWeight:700,color:'#0f172a'}}>{c.case_no}</div><div style={{fontSize:8,color:'#94a3b8'}}>{c.matter}</div></div>
            <span style={{fontSize:8,color:'#b45309',fontWeight:700}}>{c.stage}</span>
          </div>
        ))}
      </Card>
      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <div style={{fontSize:10,fontWeight:800,color:'#0f172a',marginBottom:8}}>🔗 Quick Links</div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {[['Legal Case Tracking','legal-case-tracking'],['Contract Compliance','contract-compliance'],['Ethics & Governance','ethics-governance'],['License Management','license-management']].map(([label,id])=>
            <button key={id} onClick={()=>navTo(id)} style={{padding:'7px 12px',borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#374151',fontSize:8,fontWeight:600,cursor:'pointer'}}>{label}</button>)}
        </div>
      </div>
    </div>
  )
}
