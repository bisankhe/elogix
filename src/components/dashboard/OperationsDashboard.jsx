// FILE: src/components/dashboard/OperationsDashboard.jsx
// PURPOSE: Operations department workspace -- workforce ops,
// attendance, field tasks, route monitoring oversight.
import { useApp } from '../../context/AppContext.jsx'
import { StatCard } from '../shared/StatCard.jsx'
import { Card } from '../shared/Card.jsx'
const FIELD_OPS=[
  {label:'Field Tasks Completed Today',value:'18/24'},
  {label:'Vehicles on Active Route',value:'7'},
  {label:'Outsourced Attendance Rate',value:'94.1%'},
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

export default function OperationsDashboard(){
  const [apiData, setApiData] = useState(null)
  const [apiLoading, setApiLoading] = useState(true)
  const [apiError, setApiError] = useState(null)

  const { navTo } = useApp()
  return(
    <div>
      <h1 style={{fontSize:20,fontWeight:900,color:'#0f172a',marginBottom:4}}>⚙ Operations Workspace</h1>
      <p style={{fontSize:11,color:'#94a3b8',marginBottom:18}}>Field operations, attendance, route, and task oversight</p>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:14,marginBottom:20}}>
        <StatCard icon="✅" label="Field Tasks Today" value="18/24"/>
        <StatCard icon="🗺" label="Active Routes" value="7"/>
        <StatCard icon="📋" label="Outsourced Attendance" value="94.1%"/>
        <StatCard icon="🏭" label="Active Vendors" value="14"/>
        <StatCard icon="⚠" label="Exceptions Flagged" value="2"/>
      </div>
      <Card>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:12}}>📊 Field Operations Snapshot</div>
        {FIELD_OPS.map((f,i)=>(
          <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:i<FIELD_OPS.length-1?'1px solid #f8fafc':'none'}}>
            <span style={{fontSize:9,color:'#374151'}}>{f.label}</span><span style={{fontSize:9,fontWeight:700,color:'#c2410c'}}>{f.value}</span>
          </div>
        ))}
      </Card>
      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <div style={{fontSize:10,fontWeight:800,color:'#0f172a',marginBottom:8}}>🔗 Quick Links</div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {[['Field Task Management','field-task-management'],['Route Monitoring','route-monitoring'],['Outsource Attendance Report','outsource-attendance-rpt'],['GPS Tracking','gps-tracking-config']].map(([label,id])=>
            <button key={id} onClick={()=>navTo(id)} style={{padding:'7px 12px',borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#374151',fontSize:8,fontWeight:600,cursor:'pointer'}}>{label}</button>)}
        </div>
      </div>
    </div>
  )
}
