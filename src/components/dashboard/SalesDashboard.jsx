// FILE: src/components/dashboard/SalesDashboard.jsx
// PURPOSE: Sales department workspace -- team performance, field
// visits (TA/DA), commission/incentive tracking.
import { useApp } from '../../context/AppContext.jsx'
import { StatCard } from '../shared/StatCard.jsx'
import { Card } from '../shared/Card.jsx'
const TEAM=[
  {name:'Sunil Magar',visits_mtd:14,status:'On Track'},
  {name:'Maya Pradhan',visits_mtd:9,status:'Behind Target'},
]

// ── Tenant session helper ──────────────────────────────────────────────
function _getSession() {
  try { return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{} }
  catch(_e) { return {} }
}
function _getTenantHeaders() {
  const sess  = _getSession()
  const token = localStorage.getItem('access_token') || sess?.token || ''
  const slug  = sess?.company?.slug || localStorage.getItem('elogix_tenant_slug') || ''
  return { token, slug, valid: !!(token && slug) }
}

export default function SalesDashboard(){
  const [apiData, setApiData] = useState(null)
  const [apiLoading, setApiLoading] = useState(true)
  const [apiError, setApiError] = useState(null)

  const { navTo } = useApp()
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
