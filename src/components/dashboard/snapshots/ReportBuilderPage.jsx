// FILE: ReportBuilderPage.jsx - Report Builder (System Settings)
// Sysadmin-level report template management -- distinct from
// CustomReportBuilderPage (Advanced Analytics, HR-data field picker
// for HR users). This page is where IT/admin saves and schedules
// system-wide report templates, sets distribution, and configures
// the NLP query interface.
import { useState } from 'react'
import { Field, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'
const G='linear-gradient(135deg,#052e16 0%,#15803d 60%,#86efac 100%)'
const A='#15803d'
const TEMPLATES=[
  {name:'Monthly Payroll Summary',data_source:'Payroll',schedule:'Monthly . 1st',last_run:'2025-06-01',recipients:3},
  {name:'Leave Balance Report',data_source:'Leave',schedule:'Weekly . Monday',last_run:'2025-06-23',recipients:5},
  {name:'Compliance Audit Pack',data_source:'Compliance',schedule:'Annual . Poush end',last_run:'2025-01-15',recipients:2},
]
const STEPS=['Select Data Source','Choose Columns & Filters','Visualization','Schedule & Distribute']
export default function ReportBuilderPage(){
  const [step,setStep]=useState(0)
  const [search,setSearch]=useState('')
  const [ctx,setCtx]=useState(null)
  const filtered=TEMPLATES.filter(t=>!search||t.name.toLowerCase().includes(search.toLowerCase()))
  return(
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📊" title="Report Builder" breadcrumb="System Administration > System Settings" gradient={G}
        stats={[{icon:'📊',label:'Saved Templates',value:TEMPLATES.length},{icon:'📅',label:'Scheduled Reports',value:TEMPLATES.filter(t=>t.schedule).length},{icon:'🤖',label:'NLP Query',value:'Enabled'},{icon:'📤',label:'Auto-Distribute',value:'Yes'}]}
        onAdd={()=>setStep(0)} addLabel="Build New Report"/>
      <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>🤖</span>
        <div style={{flex:1}}><strong>Ask in Plain English:</strong> Type "Show turnover rate by department last quarter" and the system builds the report -- no SQL, no BI tool, no waiting for IT.</div>
      </div>
      <div style={{display:'flex',gap:0,marginBottom:16,background:'#f1f5f9',borderRadius:10,padding:3}}>
        {STEPS.map((s,i)=><button key={i} onClick={()=>setStep(i)} style={{flex:1,padding:'7px 4px',border:'none',borderRadius:8,cursor:'pointer',fontSize:8,fontWeight:700,background:step===i?'#fff':' transparent',color:step===i?A:'#94a3b8',boxShadow:step===i?'0 1px 3px rgba(0,0,0,.08)':'none'}}>{i+1}. {s}</button>)}
      </div>
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'16px',marginBottom:18,minHeight:80,fontSize:10,color:'#64748b',textAlign:'center'}}>
        Step {step+1}: {STEPS[step]} -- configure here
      </div>
      <SearchBar value={search} onChange={setSearch} placeholder="Search report templates..."/>
      <div style={{display:'grid',gap:12,marginTop:14}}>
        {filtered.map((t,i)=>(
          <div key={i} onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:t.name,...t,impact_links:['Export Center']}})}}
            style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:'14px 16px',display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
            <div><div style={{fontSize:10,fontWeight:700,color:'#0f172a'}}>{t.name}</div><div style={{fontSize:8,color:'#94a3b8',marginTop:3}}>{t.data_source} . {t.schedule} . {t.recipients} recipients</div></div>
            <span style={{fontSize:8,color:'#94a3b8'}}>Last: {t.last_run}</span>
          </div>
        ))}
      </div>
      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Templates saved here auto-populate in the Custom Report Builder for HR users -- one source of truth, two different audiences.','Scheduled reports distribute automatically to configured recipients -- nobody has to remember to run the monthly pack.','NLP query builder cross-references the field dictionary from Advanced Analytics -- never a separately-trained language model.']}/>
      </div>
      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[{icon:'👁',label:'View Template',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'}]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
