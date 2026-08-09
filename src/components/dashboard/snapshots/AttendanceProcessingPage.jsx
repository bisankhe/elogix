// FILE: AttendanceProcessingPage.jsx - Attendance Processing (Attendance Management)
// Calendar-based consolidation hub: drag-drop shift mapping, exception isolation
// (late/missed/early), grace-period & rounding-rule engine, multi-source ingest status.

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#0c4a6e 0%,#0284c7 60%,#7dd3fc 100%)'
const A = '#0284c7'

const SOURCE_CFG = {biometric:{c:'#10b981',icon:'👆'},gps:{c:'#3b82f6',icon:'📍'},web:{c:'#7c3aed',icon:'💻'},qr:{c:'#f59e0b',icon:'📱'}}

const TODAY_RECORDS = [
  { id:'p1', employee:'Gita Maharjan', dept:'IT', source:'biometric', login:'09:02 AM', logout:'06:15 PM',
    total_hrs:8.5, break_min:32, exception:null, processed:true,
    impact_links:['Employee Movement','Payroll Setup'] },
  { id:'p2', employee:'Bikash Rai', dept:'IT', source:'web', login:'08:58 AM', logout:null,
    total_hrs:null, break_min:0, exception:'missed_checkout', processed:false,
    impact_links:['Missed Log In/Out Request'] },
  { id:'p3', employee:'Anjali Sharma', dept:'Sales', source:'gps', login:'10:18 AM', logout:'05:00 PM',
    total_hrs:6.7, break_min:30, exception:'late_arrival', processed:true,
    impact_links:['Late & Early Tracking'] },
  { id:'p4', employee:'Sunita Rai', dept:'HR', source:'qr', login:'09:01 AM', logout:'06:05 PM',
    total_hrs:8.5, break_min:30, exception:null, processed:true,
    impact_links:[] },
]

const EXCEPTION_CFG = {missed_checkout:{c:'#ef4444',label:'Missed Checkout'},late_arrival:{c:'#f59e0b',label:'Late Arrival'},early_departure:{c:'#f59e0b',label:'Early Departure'}}

export default function AttendanceProcessingPage() {
  const [records, setRecords] = useState(TODAY_RECORDS)
  const [search, setSearch] = useState('')
  const [showExcel, setShowExcel] = useState(false)
  const [_pm, _spm] = useState('')
  const [processing, setProcessing] = useState(false)
  const notify = m => { _spm(m); setTimeout(()=>_spm(''),3500) }
  const [ctx, setCtx] = useState(null)

  const filtered = records.filter(r=>!search||r.employee.toLowerCase().includes(search.toLowerCase()))
  const exceptionCount = records.filter(r=>r.exception).length
  const processedCount = records.filter(r=>r.processed).length
  const sourceBreakdown = Object.keys(SOURCE_CFG).map(s=>({source:s,count:records.filter(r=>r.source===s).length}))

  return (
    <div onClick={()=>setCtx(null)}>
      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:9999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:400}}>{msg}</div>}
      <PageHeader icon="⚙" title="Attendance Processing"
        breadcrumb="Workforce Operations > Attendance Management"
        gradient={G}
        stats={[
          {icon:'📋',label:"Today's Records", value:records.length},
          {icon:'✅',label:'Processed',        value:processedCount},
          {icon:'⚠',label:'Exceptions',       value:exceptionCount},
          {icon:'🔄',label:'Capture Sources',  value:Object.keys(SOURCE_CFG).length},
        ]}
        onAdd={()=>{}} addLabel="Run Processing" onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#1e40af',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>⚙</span>
        <div><strong>Straight-Through Processing:</strong> Raw swipes from biometric/GPS/web/QR sources are consolidated, validated against shift schedules, and grace-period/rounding rules applied automatically. Exceptions (late-ins, missed punches, early-outs) are isolated for review without blocking the rest of the batch.</div>
      </div>

      {/* Multi-source ingest summary */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:16}}>
        {sourceBreakdown.map(s=>{
          const sc = SOURCE_CFG[s.source]
          return (
            <div key={s.source} style={{background:'#fff',border:`1.5px solid ${sc.c}33`,borderRadius:12,padding:'12px',textAlign:'center'}}>
              <div style={{fontSize:20,marginBottom:4}}>{sc.icon}</div>
              <div style={{fontSize:16,fontWeight:900,color:sc.c}}>{s.count}</div>
              <div style={{fontSize:9,color:'#94a3b8',fontWeight:600,textTransform:'capitalize'}}>{s.source}</div>
            </div>
          )
        })}
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,overflow:'hidden',marginTop:14}}>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
            <thead><tr style={{background:'#f8fafc'}}>
              {['Employee','Dept','Source','Login','Logout','Total Hrs','Break','Exception','Status'].map(h=>(
                <th key={h} style={{padding:'10px 12px',textAlign:'left',fontSize:9,fontWeight:800,color:A,whiteSpace:'nowrap'}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.map(r=>{
                const ec = r.exception?EXCEPTION_CFG[r.exception]:null
                return (
                  <tr key={r.id} style={{borderBottom:'1px solid #f8fafc'}}
                    onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:r.employee,...r}})}}>
                    <td style={{padding:'9px 12px',fontWeight:700,color:'#0f172a'}}>{r.employee}</td>
                    <td style={{padding:'9px 12px',color:'#64748b',fontSize:10}}>{r.dept}</td>
                    <td style={{padding:'9px 12px',fontSize:14}}>{sc.icon}</td>
                    <td style={{padding:'9px 12px',color:'#10b981',fontWeight:600}}>{r.login}</td>
                    <td style={{padding:'9px 12px',color:r.logout?'#ef4444':'#94a3b8',fontWeight:600}}>{r.logout||'-'}</td>
                    <td style={{padding:'9px 12px',fontWeight:800,color:A}}>{r.total_hrs?r.total_hrs+'h':'-'}</td>
                    <td style={{padding:'9px 12px',color:'#64748b'}}>{r.break_min}min</td>
                    <td style={{padding:'9px 12px'}}>{ec&&<span style={{background:`${ec.c}15`,color:ec.c,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{ec.label}</span>}</td>
                    <td style={{padding:'9px 12px'}}><span style={{fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20,background:r.processed?'#f0fdf4':'#fffbeb',color:r.processed?'#15803d':'#b45309'}}>{r.processed?'✓ Processed':'⏳ Held for Review'}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:10}}>🛠 Rules Engine Configuration</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14}}>
          <Field label="Grace Period (minutes)" type="number" value="10" onChange={()=>{}} accent={A}/>
          <Field label="Rounding Rule" type="select" value="" onChange={()=>{}} accent={A} options={['Nearest 15 min','Nearest 30 min','No rounding']}/>
          <Field label="Mandatory Break Deduction" type="select" value="" onChange={()=>{}} accent={A} options={['30 min after 5hrs','Custom']}/>
        </div>
        <AIImpact color={A} lines={['Exceptions auto-isolated, never block the rest of the daily batch.','Missed checkouts route to Missed Log In/Out Request workflow automatically.','Rules apply uniformly across all capture sources for policy consistency.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Raw Log',key:'view'},{icon:'✏',label:'Manual Override',key:'edit'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},{icon:'📤',label:'Export',key:'export'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Attendance Processing" columns={['Employee','Department','Source','Login','Logout','Total Hours','Break Min','Exception','Processed']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[NepHR Import]", f.name, result); }}/>}
    </div>
  )
}
