// FILE: LeaveCalendarPage.jsx - Leave Calendar (Leave Operations)
// Color-coded team availability grid: who's off today, overlap warnings,
// monthly view, filter by department.

import { useState } from 'react'
import { PageHeader, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#581c87 0%,#7c3aed 60%,#c4b5fd 100%)'
const A = '#7c3aed'

const TEAM_LEAVES = [
  { id:'tc1', employee:'Sunil Magar', dept:'Customer Service', leave_type:'Home/Annual Leave', color:'#10b981', start:10, end:12 },
  { id:'tc2', employee:'Priya Shah', dept:'Customer Service', leave_type:'Home/Annual Leave', color:'#10b981', start:11, end:11 },
  { id:'tc3', employee:'Bikash Rai', dept:'IT', leave_type:'Sick Leave', color:'#ef4444', start:22, end:22 },
  { id:'tc4', employee:'Maya Pradhan', dept:'Finance', leave_type:'Maternity Leave', color:'#ec4899', start:1, end:30 },
]
const DAYS_IN_MONTH = 31
const DEPTS = ['All','Customer Service','IT','Finance']

export default function LeaveCalendarPage() {
  const [search, setSearch] = useState('')
  const [filterDept, setFilterDept] = useState('All')
  const [ctx, setCtx] = useState(null)

  const filtered = TEAM_LEAVES.filter(t=>{
    if (filterDept!=='All'&&t.dept!==filterDept) return false
    if (search&&!t.employee.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  // Find days with overlap (2+ people off from same dept)
  const overlapDays = {}
  filtered.forEach(t=>{
    for (let d=t.start;d<=t.end;d++){
      if(!overlapDays[d]) overlapDays[d]={}
      overlapDays[d][t.dept]=(overlapDays[d][t.dept]||0)+1
    }
  })

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📅" title="Leave Calendar"
        breadcrumb="Workforce Operations > Leave Management > Leave Operations"
        gradient={G}
        stats={[
          {icon:'📅',label:'On Leave This Month', value:filtered.length},
          {icon:'⚠',label:'Overlap Days',          value:Object.values(overlapDays).filter(d=>Object.values(d).some(c=>c>1)).length},
          {icon:'🏢',label:'Departments',            value:DEPTS.length-1},
          {icon:'🔗',label:'Synced Calendars',        value:'Outlook + Google'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#faf5ff',border:'1px solid #e9d5ff',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#581c87',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>👁</span>
        <div><strong>Team Transparency:</strong> Color-coded by leave type, this calendar lets you check coverage before submitting your own request. Two-color stripes on a date mean overlapping team absences - review before approving more leave on those days.</div>
      </div>

      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>
        <div style={{display:'flex',gap:4,background:'#f1f5f9',padding:3,borderRadius:9}}>
          {DEPTS.map(d=>(
            <button key={d} onClick={()=>setFilterDept(d)}
              style={{padding:'7px 12px',borderRadius:7,border:'none',cursor:'pointer',fontSize:10,
                background:filterDept===d?'#fff':'transparent',color:filterDept===d?A:'#64748b',
                fontWeight:filterDept===d?700:400,boxShadow:filterDept===d?'0 1px 3px rgba(0,0,0,.08)':'none'}}>
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Monthly grid */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px 20px',marginBottom:16,overflowX:'auto'}}>
        <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:12}}>📅 July 2025 - Team Availability</div>
        <div style={{display:'grid',gridTemplateColumns:`80px repeat(${DAYS_IN_MONTH},28px)`,gap:2,minWidth:980}}>
          <div></div>
          {Array.from({length:DAYS_IN_MONTH},(_,i)=>i+1).map(d=>(
            <div key={d} style={{textAlign:'center',fontSize:8,color:Object.values(overlapDays[d]||{}).some(c=>c>1)?'#dc2626':'#94a3b8',fontWeight:Object.values(overlapDays[d]||{}).some(c=>c>1)?800:600}}>{d}</div>
          ))}
          {[...new Set(filtered.map(t=>t.employee))].map(emp=>(
            <>
              <div key={emp} style={{fontSize:9,fontWeight:700,color:'#374151',whiteSpace:'nowrap',paddingRight:6}}>{emp.split(' ')[0]}</div>
              {Array.from({length:DAYS_IN_MONTH},(_,i)=>i+1).map(d=>{
                const leave = filtered.find(t=>t.employee===emp&&d>=t.start&&d<=t.end)
                return <div key={d} style={{height:20,borderRadius:3,background:leave?leave.color:'#f8fafc'}} title={leave?leave.leave_type:''}/>
              })}
            </>
          ))}
        </div>
      </div>

      {/* Today's absence list */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px 20px'}}>
        <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:12}}>👥 On Leave Today</div>
        {filtered.map(t=>(
          <div key={t.id}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:t.employee,impact_links:['Leave Request','Leave Approval']}})}}
            style={{display:'flex',gap:12,alignItems:'center',padding:'8px 0',borderBottom:'1px solid #f8fafc'}}>
            <span style={{width:10,height:10,borderRadius:'50%',background:t.color,flexShrink:0}}/>
            <div style={{flex:1}}>
              <span style={{fontSize:11,fontWeight:700,color:'#0f172a'}}>{t.employee}</span>
              <span style={{fontSize:10,color:'#94a3b8',marginLeft:8}}>{t.dept} . {t.leave_type}</span>
            </div>
          </div>
        ))}
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Leave Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}
