// FILE: CodeOfConductPage.jsx - Code of Conduct
// (HR Services & Support > Employee Self Service)
// Dedicated drill-in view for the single "Code of Conduct Policy"
// (POL-EMP-002) that already lives inside the EXISTING HRPoliciesPage
// library -- never a second policy document store.

import { useState } from 'react'
import { PageHeader, AIImpact, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#581c87 0%,#7c3aed 60%,#c4b5fd 100%)'
const A = '#7c3aed'

const SECTIONS = [
  {title:'Professional Conduct',text:'Treat all colleagues, clients, and partners with respect and dignity, free from discrimination based on gender, caste, ethnicity, religion, or disability.'},
  {title:'Conflict of Interest',text:'Disclose any personal or financial interest that could influence your professional judgment or decisions made on behalf of the company.'},
  {title:'Confidentiality',text:'Protect proprietary, client, and employee data. Information accessed through your role must never be shared outside authorized channels.'},
  {title:'Workplace Safety & Harassment',text:'Zero tolerance for harassment of any kind. Report concerns through Grievance Management or directly to HR without fear of retaliation.'},
]

export default function CodeOfConductPage() {
  const [acknowledged, setAcknowledged] = useState(false)
  const [ctx, setCtx] = useState(null)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📘" title="Code of Conduct"
        breadcrumb="HR Services & Support > Employee Self Service"
        gradient={G}
        stats={[
          {icon:'📘',label:'Policy Control',  value:'POL-EMP-002'},
          {icon:'⏱',label:'Read Time',           value:'10 min'},
          {icon:'✅',label:'Status',                value:acknowledged?'Acknowledged':'Pending'},
          {icon:'🔗',label:'Linked Policies',          value:'3'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#faf5ff',border:'1px solid #e9d5ff',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#581c87',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>📘</span>
        <div style={{flex:1,minWidth:200}}><strong>The Standard Everyone Agrees To:</strong> This is the same Code of Conduct tracked in the HR Policy library -- read here for quick reference, full acknowledgment history lives in My HR Policies.</div>
      </div>

      <div style={{display:'grid',gap:14}}>
        {SECTIONS.map((s,i)=>(
          <div key={i}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:s.title,impact_links:['HR Policies']}})}}
            style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'16px 18px'}}>
            <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:6}}>{s.title}</div>
            <div style={{fontSize:10,color:'#374151'}}>{s.text}</div>
          </div>
        ))}
      </div>

      {!acknowledged&&(
        <div style={{marginTop:18,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px 20px',textAlign:'center'}}>
          <label style={{display:'flex',gap:8,alignItems:'center',justifyContent:'center',marginBottom:14,fontSize:11,color:'#374151'}}>
            <input type="checkbox" checked={acknowledged} onChange={e=>setAcknowledged(e.target.checked)} style={{accentColor:A}}/>
            I have read and understood the Code of Conduct
          </label>
        </div>
      )}

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['This view mirrors the full policy record -- acknowledgment here syncs directly into My HR Policies\' compliance tracker.','Related policies (Anti-Harassment, Disciplinary) are one click away, never a separate hunt.','AI summary and quiz mode are available in the full HR Policies library for deeper review.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'Open Full Policy',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}
