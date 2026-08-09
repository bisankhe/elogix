// FILE: src/components/dashboard/AdminWorkspaceDashboard.jsx
// PURPOSE: Admin Officer workspace -- general administrative ops
// (visitor mgmt, meeting rooms, travel, gate pass, facilities).
import { useApp } from '../../context/AppContext.jsx'
import { StatCard } from '../shared/StatCard.jsx'
import { Card } from '../shared/Card.jsx'
const TODAY=[
  {item:'3 visitor appointments scheduled today',type:'visitor'},
  {item:'Conference Room B booked 2 PM - 4 PM, Quarterly Review',type:'room'},
  {item:'2 gate pass requests awaiting approval',type:'gatepass'},
]
export default function AdminWorkspaceDashboard(){
  const { navTo } = useApp()
  return(
    <div>
      <h1 style={{fontSize:20,fontWeight:900,color:'#0f172a',marginBottom:4}}>🗂 Admin Workspace</h1>
      <p style={{fontSize:11,color:'#94a3b8',marginBottom:18}}>Visitors, facilities, travel, and general administrative operations</p>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:14,marginBottom:20}}>
        <StatCard icon="👋" label="Visitors Today" value="3"/>
        <StatCard icon="🏢" label="Room Bookings" value="6"/>
        <StatCard icon="🪪" label="Gate Pass Pending" value="2"/>
        <StatCard icon="✈" label="Travel Requests" value="4"/>
        <StatCard icon="🔧" label="Facility Tickets" value="1"/>
      </div>
      <Card>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:12}}>📋 Today's Activity</div>
        {TODAY.map((t,i)=><div key={i} style={{padding:'9px 0',borderBottom:i<TODAY.length-1?'1px solid #f8fafc':'none',fontSize:9,color:'#374151'}}>{t.item}</div>)}
      </Card>
      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <div style={{fontSize:10,fontWeight:800,color:'#0f172a',marginBottom:8}}>🔗 Quick Links</div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {[['Visitor Management','visitor-management'],['Meeting Room Booking','meeting-room-booking'],['Travel Management','travel-management'],['Gate Pass','gate-pass'],['Facility Management','facility-management']].map(([label,id])=>
            <button key={id} onClick={()=>navTo(id)} style={{padding:'7px 12px',borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#374151',fontSize:8,fontWeight:600,cursor:'pointer'}}>{label}</button>)}
        </div>
      </div>
    </div>
  )
}
