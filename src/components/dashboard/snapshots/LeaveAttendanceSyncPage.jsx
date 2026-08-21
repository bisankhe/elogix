// FILE: LeaveAttendanceSyncPage.jsx - Leave & Attendance Sync (Leave Reports)
// Bidirectional sync feed: approved leave auto-marks "Excused" on attendance,
// conflict detection (clocked-in while on approved leave), exception resolution.
// Fully responsive: stacks to single-column card feed below 640px.

import { useState } from 'react'
import { PageHeader, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#0c4a6e 0%,#0284c7 60%,#7dd3fc 100%)'
const A = '#0284c7'

const SYNC_FEED = [
  { id:'s1', employee:'Sunil Magar', date:'2025-06-21', leave_status:'Approved (Home Leave)', attendance_status:'Excused',
    sync_state:'matched', detail:'Attendance auto-marked Excused - no payroll deduction.',
    impact_links:['Leave Approval','Payroll Attendance Generation'] },
  { id:'s2', employee:'Bikash Rai', date:'2025-06-21', leave_status:'Approved (Sick Leave)', attendance_status:'Clocked In 09:15 AM',
    sync_state:'conflict', detail:'Employee is on approved leave but has an active clock-in - flagged for resolution.',
    impact_links:['Daily Attendance','Leave Approval'] },
  { id:'s3', employee:'Maya Pradhan', date:'2025-06-20', leave_status:'No Leave on File', attendance_status:'Absent',
    sync_state:'exception', detail:'No pre-approved leave found for an absent day - routed to Attendance Regularization.',
    impact_links:['Attendance Regularization'] },
  { id:'s4', employee:'Anjali Sharma', date:'2025-06-19', leave_status:'Approved (Half-Day, 2nd Half)', attendance_status:'Worked 4.2h then Excused',
    sync_state:'matched', detail:'Half-day correctly split: morning worked, afternoon excused - 0.5 day deducted.',
    impact_links:['Half-Day Leave'] },
]

const SYNC_CFG = {
  matched:{c:'#10b981',bg:'#f0fdf4',icon:'✅',label:'Synced'},
  conflict:{c:'#ef4444',bg:'#fef2f2',icon:'⚠',label:'Conflict'},
  exception:{c:'#f59e0b',bg:'#fffbeb',icon:'🔍',label:'Exception'},

export default function LeaveAttendanceSyncPage() {
  const [feed, setFeed] = useState(SYNC_FEED)
  const [search, setSearch] = useState('')
  const [ctx, setCtx] = useState(null)

  const filtered = feed.filter(f=>!search||f.employee.toLowerCase().includes(search.toLowerCase()))
  const conflictCount = feed.filter(f=>f.sync_state==='conflict').length
  const exceptionCount = feed.filter(f=>f.sync_state==='exception').length

  return (
    <div onClick={()=>setCtx(null)} style={{maxWidth:'100%'}}>
      <PageHeader icon="🔗" title="Leave & Attendance Sync"
        breadcrumb="Workforce Operations > Leave Management > Leave Reports"
        gradient={G}
        stats={[
          {icon:'🔗',label:"Today's Records", value:feed.length},
          {icon:'✅',label:'Synced',            value:feed.filter(f=>f.sync_state==='matched').length},
          {icon:'⚠',label:'Conflicts',         value:conflictCount},
          {icon:'🔍',label:'Exceptions',       value:exceptionCount},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#1e40af',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🔄</span>
        <div style={{flex:1,minWidth:200}}><strong>True Bidirectional Sync:</strong> Approving leave instantly marks attendance "Excused" - never "Absent." Clocking in while on approved leave, or being absent without leave on file, auto-flags as a conflict/exception for same-day resolution, not month-end discovery.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{display:'grid',gap:12,marginTop:14}}>
        {filtered.map(f=>{
          const sc = SYNC_CFG[f.sync_state]
          return (
            <div key={f.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:f.employee,...f}})}}
              style={{background:'#fff',border:`1.5px solid ${sc.c}33`,borderRadius:16,padding:'16px 18px',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${sc.c}`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:8,marginBottom:10}}>
                <div>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:3}}>
                    <span style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{f.employee}</span>
                    <span style={{background:sc.bg,color:sc.c,fontSize:10,fontWeight:700,padding:'2px 10px',borderRadius:20}}>{sc.icon} {sc.label}</span>
                  </div>
                  <div style={{fontSize:10,color:'#64748b'}}>{f.date}</div>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
                <div style={{background:'#f8fafc',borderRadius:8,padding:'8px 10px'}}>
                  <div style={{fontSize:8,color:'#94a3b8'}}>Leave Status</div>
                  <div style={{fontSize:11,fontWeight:700,color:'#0f172a'}}>{f.leave_status}</div>
                </div>
                <div style={{background:'#f8fafc',borderRadius:8,padding:'8px 10px'}}>
                  <div style={{fontSize:8,color:'#94a3b8'}}>Attendance Status</div>
                  <div style={{fontSize:11,fontWeight:700,color:sc.c}}>{f.attendance_status}</div>
                </div>
              </div>
              <div style={{fontSize:10,color:'#374151'}}>{f.detail}</div>
            </div>
          )
        })}
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Detail',key:'view'},{icon:'🔧',label:'Resolve Conflict',key:'resolve'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
