// FILE: CustomReportBuilderPage.jsx - Custom Report Builder
// (Reports, Analytics & BI > Advanced Analytics)
// Drag-and-drop field selector over a pre-mapped data dictionary --
// genuinely new (no generic cross-module report builder existed; only
// module-specific report_template tables like leave_report_templates).
// Section 139 safeguard: any report touching performance/disciplinary
// fields gets flagged as evidence-grade, never silently treated as
// equivalent to a routine headcount export.

import { useState } from 'react'
import { Field, PageHeader, AIImpact, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#1e1b4b 0%,#4338ca 60%,#818cf8 100%)'
const A = '#4338ca'

const FIELD_CATEGORIES = [
  {category:'Employee Profile',fields:['Name','Department','Designation','Tenure'],sensitive:false},
  {category:'Compensation',fields:['Base Salary','Bonus','SSF Contribution'],sensitive:true},
  {category:'Performance',fields:['Rating','Goal Completion','Disciplinary Flags'],sensitive:true,
   legal_note:'Reports built from these fields are flagged evidence-grade -- an employee can contest an AI/BI-informed decision under Section 139, and this report must be defensible with verifiable human input attached.'},
  {category:'Attendance',fields:['Overtime Hours','Absences','Late Arrivals'],sensitive:false},
]

const SAVED_REPORTS = [
  {name:'Q2 Compensation Equity Review',fields:5,last_run:'2025-06-20',sensitive:true},
  {name:'Department Headcount Snapshot',fields:3,last_run:'2025-06-28',sensitive:false},
]

export default function CustomReportBuilderPage() {
  const [selectedFields, setSelectedFields] = useState([])
  const [ctx, setCtx] = useState(null)

  const toggleField = (field) => setSelectedFields(p=>p.includes(field)?p.filter(f=>f!==field):[...p,field])
  const touchesSensitive = FIELD_CATEGORIES.some(c=>c.sensitive&&c.fields.some(f=>selectedFields.includes(f)))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🧰" title="Custom Report Builder"
        breadcrumb="Reports, Analytics & BI > Advanced Analytics"
        gradient={G}
        stats={[
          {icon:'🧰',label:'Fields Selected',  value:selectedFields.length},
          {icon:'📋',label:'Saved Reports',        value:SAVED_REPORTS.length},
          {icon:'⚖',label:'Evidence-Grade Mode',       value:touchesSensitive?'Active':'Off'},
          {icon:'🔒',label:'Access Logged',                value:'Always'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#eef2ff',border:'1px solid #c7d2fe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#3730a3',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>⚖</span>
        <div style={{flex:1,minWidth:200}}><strong>No SQL, No IT Ticket -- Drag, Drop, Build:</strong> Pick fields from a pre-mapped dictionary and get a report in minutes. Reports touching performance or disciplinary data are flagged evidence-grade automatically, since an algorithm-based decision can be formally contested in Labour Court.</div>
      </div>

      <div style={{display:'grid',gap:16,marginBottom:18}}>
        {FIELD_CATEGORIES.map((c,i)=>(
          <div key={i}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:c.category,...c}})}}
            style={{background:'#fff',border:`1px solid ${c.legal_note?'#fed7aa':'#e2e8f0'}`,borderRadius:14,padding:'16px 18px'}}>
            <div style={{fontSize:11,fontWeight:700,color:'#0f172a',marginBottom:10}}>{c.category} {c.sensitive&&'🔒'}</div>
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
              {c.fields.map((f,j)=>(
                <button key={j} onClick={()=>toggleField(f)}
                  style={{padding:'6px 12px',borderRadius:8,border:selectedFields.includes(f)?'none':'1px solid #e2e8f0',cursor:'pointer',fontSize:9,fontWeight:700,
                    background:selectedFields.includes(f)?A:'#fff',color:selectedFields.includes(f)?'#fff':'#64748b'}}>
                  {f}
                </button>
              ))}
            </div>
            {c.legal_note&&<div style={{marginTop:10,fontSize:8,color:'#b45309'}}>⚖ {c.legal_note}</div>}
          </div>
        ))}
      </div>

      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px'}}>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:12}}>📋 Saved Reports</div>
        {SAVED_REPORTS.map((r,i)=>(
          <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:i<SAVED_REPORTS.length-1?'1px solid #f8fafc':'none'}}>
            <span style={{fontSize:10,color:'#374151'}}>{r.name} {r.sensitive&&'🔒'}</span>
            <span style={{fontSize:9,color:'#94a3b8'}}>{r.fields} fields . Last run {r.last_run}</span>
          </div>
        ))}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Evidence-grade reports require a human sign-off field before they can be exported -- never a purely algorithmic decision with no verifiable human review attached.','Every field combination saves as a reusable template -- never rebuild the same report from scratch next quarter.','Access to compensation and performance fields is logged per user, satisfying the mandatory accurate-recordkeeping requirement.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Field Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
