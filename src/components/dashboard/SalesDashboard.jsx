// FILE: src/components/dashboard/SalesDashboard.jsx
// PURPOSE: Sales department workspace -- team performance, field
// visits (TA/DA), commission/incentive tracking.
import { StatCard } from '../shared/StatCard.jsx'
import { Card } from '../shared/Card.jsx'
const TEAM=[
  {name:'Sunil Magar',visits_mtd:14,status:'On Track'},
  {name:'Maya Pradhan',visits_mtd:9,status:'Behind Target'},
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

export default function SalesDashboard(){
  const { navTo } = _useAppFallback()
  return(
    <div>
      <h1 style={{fontSize:20,fontWeight:900,color:'#0f172a',marginBottom:4}}>📈 Sales Workspace</h1>
      <p style={{fontSize:11,color:'#94a3b8',marginBottom:18}}>Team field visits, performance, and incentive tracking</p>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:14,marginBottom:20}}>
        <StatCard icon="👥" label="Sales Team Size" value="12"/>
        <StatCard icon="🚗" label="Field Visits (MTD)" value="86"/>
        <StatCard icon="💰" label="Incentives Pending" value="NPR 240K"/>
        <StatCard icon="🎯" label="Target Achievement" value="78%"/>
      </div>
      <Card>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:12}}>👥 Team Field Activity</div>
        {TEAM.map((t,i)=>(
          <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:i<TEAM.length-1?'1px solid #f8fafc':'none'}}>
            <span style={{fontSize:9,fontWeight:700,color:'#0f172a'}}>{t.name}</span>
            <span style={{fontSize:8,color:t.status==='On Track'?'#15803d':'#b45309'}}>{t.visits_mtd} visits . {t.status}</span>
          </div>
        ))}
      </Card>
      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <div style={{fontSize:10,fontWeight:800,color:'#0f172a',marginBottom:8}}>🔗 Quick Links</div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {[['Field Visit Tracking','field-visit-tracking-cfg'],['Incentive Processing','incentive-processing'],['Team Performance','team-performance-mss']].map(([label,id])=>
            <button key={id} onClick={()=>navTo(id)} style={{padding:'7px 12px',borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#374151',fontSize:8,fontWeight:600,cursor:'pointer'}}>{label}</button>)}
        </div>
      </div>
    </div>
  )
}
