// FILE: TrainingParticipationListPage.jsx - Employee Training Participation List
// (Performance & Talent > Talent Development > Learning & Development)
// The operational data-grid view over the EXISTING lms_enrollments --
// never duplicates enrollment data. Manager/HR view with filters, bulk
// actions (Reassign/Remind/View Certificate), audit-ready for Labour
// Inspector review.

import { useState } from 'react'
import { ExcelModal, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#0c4a6e 0%,#0284c7 60%,#7dd3fc 100%)'
const A = '#0284c7'

const PARTICIPATION_LIST = [
  { id:'p1', employee:'Hari Thapa', role:'Software Engineer', dept:'IT', course:'AWS Solutions Architect', tag:'Skill Development',
    start_date:'2025-06-01', status:'in_progress', progress_pct:65, expiry:null, impact_links:['Course Management'] },
  { id:'p2', employee:'Maya Pradhan', role:'Finance Officer', dept:'Finance', course:'OSH & Fire Safety Refresher', tag:'Compliance',
    start_date:'2025-05-20', status:'overdue', progress_pct:20, expiry:'2025-06-20', flag_note:'Overdue -- mandatory compliance deadline passed.', impact_links:['Certification Tracking'] },
  { id:'p3', employee:'Sunil Magar', role:'Cloud Architect', dept:'IT', course:'AWS Solutions Architect', tag:'Skill Development',
    start_date:'2025-04-10', status:'completed', progress_pct:100, expiry:'2028-09-10', impact_links:['Generate Certificate'] },
  { id:'p4', employee:'Bipana Karki', role:'HR Trainee', dept:'HR', course:'OSH & Fire Safety Refresher', tag:'Compliance',
    start_date:'2025-06-10', status:'not_started', progress_pct:0, expiry:null,
    flag_note:'Trainee Labour record -- Section 17 1-year training agreement on file.', impact_links:['Employee Documents'] },
]

const STATUS_CFG = {
  not_started:{c:'#94a3b8',bg:'#f8fafc',label:'Not Started'},in_progress:{c:'#0284c7',bg:'#eff6ff',label:'In Progress'},
  completed:{c:'#10b981',bg:'#f0fdf4',label:'Completed'},overdue:{c:'#ef4444',bg:'#fef2f2',label:'Overdue'},
}
const TAG_CFG = {Compliance:'#ef4444','Skill Development':'#0284c7',Leadership:'#7c3aed'}

export default function TrainingParticipationListPage() {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterDept, setFilterDept] = useState('all')
  const [selected, setSelected] = useState([])
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = PARTICIPATION_LIST.filter(p=>{
    if (filterStatus!=='all'&&p.status!==filterStatus) return false
    if (filterDept!=='all'&&p.dept!==filterDept) return false
    if (search&&!p.employee.toLowerCase().includes(search.toLowerCase())&&!p.course.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const toggleSelect = (id) => setSelected(selected.includes(id)?selected.filter(s=>s!==id):[...selected,id])

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📋" title="Employee Training Participation List"
        breadcrumb="Performance & Talent Management > Talent Development > Learning & Development"
        gradient={G}
        stats={[
          {icon:'📋',label:'Total Enrollments',  value:PARTICIPATION_LIST.length},
          {icon:'✅',label:'Completed',             value:PARTICIPATION_LIST.filter(p=>p.status==='completed').length},
          {icon:'⚠',label:'Overdue',                 value:PARTICIPATION_LIST.filter(p=>p.status==='overdue').length},
          {icon:'⏳',label:'In Progress',              value:PARTICIPATION_LIST.filter(p=>p.status==='in_progress').length},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#1e40af',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>⚖</span>
        <div style={{flex:1,minWidth:200}}><strong>Audit-Ready by Design:</strong> Every row here is presentable to a Labour Inspector on request -- trainee/intern records, OSH training logs, and compliance participation are all timestamped and version-controlled, satisfying the Labour Act's record-keeping mandate.</div>
      </div>

      <div style={{display:'flex',gap:10,marginBottom:14,flexWrap:'wrap'}}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search by employee or course name..."/>
        <div style={{display:'flex',gap:4,background:'#f1f5f9',padding:3,borderRadius:9,flexWrap:'wrap'}}>
          {['all','not_started','in_progress','completed','overdue'].map(s=>(
            <button key={s} onClick={()=>setFilterStatus(s)}
              style={{padding:'7px 12px',borderRadius:7,border:'none',cursor:'pointer',fontSize:10,whiteSpace:'nowrap',
                background:filterStatus===s?'#fff':'transparent',color:filterStatus===s?A:'#64748b',
                fontWeight:filterStatus===s?700:400,boxShadow:filterStatus===s?'0 1px 3px rgba(0,0,0,.08)':'none'}}>
              {s==='all'?'All Status':STATUS_CFG[s].label}
            </button>
          ))}
        </div>
        <div style={{display:'flex',gap:4,background:'#f1f5f9',padding:3,borderRadius:9,flexWrap:'wrap'}}>
          {['all','IT','Finance','HR'].map(d=>(
            <button key={d} onClick={()=>setFilterDept(d)}
              style={{padding:'7px 12px',borderRadius:7,border:'none',cursor:'pointer',fontSize:10,
                background:filterDept===d?'#fff':'transparent',color:filterDept===d?A:'#64748b',
                fontWeight:filterDept===d?700:400,boxShadow:filterDept===d?'0 1px 3px rgba(0,0,0,.08)':'none'}}>
              {d==='all'?'All Depts':d}
            </button>
          ))}
        </div>
      </div>

      {selected.length>0&&(
        <div style={{background:'#fff',border:`1px solid ${A}33`,borderRadius:12,padding:'10px 16px',marginBottom:14,display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
          <span style={{fontSize:10,fontWeight:700,color:A}}>{selected.length} selected:</span>
          <button style={{padding:'6px 14px',borderRadius:8,border:'none',background:A,color:'#fff',fontSize:9,fontWeight:700,cursor:'pointer'}}>🔄 Reassign Course</button>
          <button style={{padding:'6px 14px',borderRadius:8,border:`1px solid ${A}33`,background:'#eff6ff',color:A,fontSize:9,fontWeight:600,cursor:'pointer'}}>📧 Send Reminder</button>
        </div>
      )}

      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,overflow:'hidden',overflowX:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:11,minWidth:700}}>
          <thead><tr style={{background:'#f8fafc'}}>
            <th style={{padding:'10px 8px'}}></th>
            {['Employee','Role / Dept','Course','Tag','Start Date','Progress','Status','Action'].map(h=><th key={h} style={{padding:'10px 12px',textAlign:'left',fontSize:9,fontWeight:800,color:A}}>{h}</th>)}
          </tr></thead>
          <tbody>
            {filtered.map(p=>{
              const sc = STATUS_CFG[p.status]
              return (
                <tr key={p.id} style={{borderBottom:'1px solid #f8fafc'}}
                  onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:p.employee,...p}})}}>
                  <td style={{padding:'9px 8px'}}><input type="checkbox" checked={selected.includes(p.id)} onChange={()=>toggleSelect(p.id)} style={{accentColor:A}}/></td>
                  <td style={{padding:'9px 12px',fontWeight:700,color:'#0f172a'}}>{p.employee}</td>
                  <td style={{padding:'9px 12px',color:'#64748b'}}>{p.role}<div style={{fontSize:8,color:'#94a3b8'}}>{p.dept}</div></td>
                  <td style={{padding:'9px 12px',color:'#0f172a'}}>{p.course}</td>
                  <td style={{padding:'9px 12px'}}><span style={{background:`${TAG_CFG[p.tag]}15`,color:TAG_CFG[p.tag],fontSize:8,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{p.tag}</span></td>
                  <td style={{padding:'9px 12px',color:'#94a3b8',fontSize:9}}>{p.start_date}</td>
                  <td style={{padding:'9px 12px'}}>
                    <div style={{height:6,width:60,background:'#f1f5f9',borderRadius:6,overflow:'hidden'}}><div style={{width:`${p.progress_pct}%`,height:'100%',background:sc.c,borderRadius:6}}/></div>
                  </td>
                  <td style={{padding:'9px 12px'}}><span style={{background:sc.bg,color:sc.c,fontSize:9,fontWeight:700,padding:'2px 9px',borderRadius:20}}>{sc.label}</span></td>
                  <td style={{padding:'9px 12px'}}>
                    {p.status==='completed'?<button style={{fontSize:9,color:A,background:'none',border:'none',fontWeight:700,cursor:'pointer'}}>🏆 Cert</button>:
                     <button style={{fontSize:9,color:'#f59e0b',background:'none',border:'none',fontWeight:700,cursor:'pointer'}}>📧 Remind</button>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Manager view auto-filters to direct reports the moment they open this page.','Overdue rows auto-flag and a reminder email queues without HR lifting a finger.','One click on any row opens past certificates, skill gaps, and the compliance checklist.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Profile',key:'view'},{icon:'🔄',label:'Reassign Course',key:'reassign'},
        {icon:'📧',label:'Send Reminder',key:'remind'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Training Participation" columns={['Employee','Role','Department','Course','Tag','Start Date','Status','Progress %']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
    </div>
  )
}
