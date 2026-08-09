// FILE: SOPForDepartmentPage.jsx - SOP for Department
// (HR Services & Support > Employee Self Service)
// Department-scoped Standard Operating Procedure library -- genuinely
// new, no precedent existed. Categorized, searchable, version-tracked.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#0c4a6e 0%,#0284c7 60%,#7dd3fc 100%)'
const A = '#0284c7'

const SOPS = [
  { id:'s1', title:'Code Deployment & Release Procedure', version:'v3.2', updated:'2025-05-10', read_required:true, read_status:true, impact_links:['Process Flow Chart'] },
  { id:'s2', title:'Incident Response Escalation Matrix', version:'v2.0', updated:'2025-06-01', read_required:true, read_status:false },
  { id:'s3', title:'Client Onboarding Checklist', version:'v1.5', updated:'2025-03-20', read_required:false, read_status:true },
]

export default function SOPForDepartmentPage() {
  const [search, setSearch] = useState('')
  const [ctx, setCtx] = useState(null)

  const filtered = SOPS.filter(s=>!search||s.title.toLowerCase().includes(search.toLowerCase()))
  const unreadRequired = SOPS.filter(s=>s.read_required&&!s.read_status).length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📋" title="SOP for Department"
        breadcrumb="HR Services & Support > Employee Self Service"
        gradient={G}
        stats={[
          {icon:'📋',label:'Total SOPs',  value:SOPS.length},
          {icon:'⚠',label:'Unread Required', value:unreadRequired},
          {icon:'✅',label:'Acknowledged',       value:SOPS.filter(s=>s.read_status).length},
          {icon:'🏢',label:'Scope',                value:'Your Department'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#1e40af',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🏢</span>
        <div style={{flex:1,minWidth:200}}><strong>Scoped to Your Team:</strong> Only the procedures relevant to your department appear here -- version-tracked, so you always see the current standard, never an outdated copy floating in someone's inbox.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search department SOPs..."/>

      <div style={{display:'grid',gap:14,marginTop:14}}>
        {filtered.map(s=>(
          <div key={s.id}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:s.title,...s}})}}
            style={{background:'#fff',border:`1px solid ${s.read_required&&!s.read_status?'#fed7aa':'#e2e8f0'}`,borderRadius:14,padding:'16px 18px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
            <div>
              <div style={{fontSize:12,fontWeight:700,color:'#0f172a'}}>{s.title}</div>
              <div style={{fontSize:9,color:'#94a3b8',marginTop:3}}>{s.version} . Updated {s.updated}</div>
            </div>
            {s.read_required?(
              s.read_status?<span style={{background:'#f0fdf4',color:'#15803d',fontSize:9,fontWeight:700,padding:'3px 10px',borderRadius:20}}>✅ Acknowledged</span>:
                <button style={{padding:'7px 16px',borderRadius:9,border:'none',background:A,color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>Read &amp; Acknowledge</button>
            ):<span style={{background:'#f8fafc',color:'#64748b',fontSize:9,fontWeight:600,padding:'3px 10px',borderRadius:20}}>Reference Only</span>}
          </div>
        ))}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['New SOP versions auto-notify everyone in the department -- never a silent update.','AI flags conflicts between SOPs and your Process Flow Chart when a procedure changes.','Mandatory SOPs require acknowledgment, mirroring the same compliance pattern as HR Policies.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full SOP',key:'view'},{icon:'📥',label:'Download PDF',key:'download'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}
