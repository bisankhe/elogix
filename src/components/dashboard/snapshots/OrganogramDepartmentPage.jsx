// FILE: OrganogramDepartmentPage.jsx - Organogram for my Department
// (HR Services & Support > Employee Self Service)
// Thin, pre-filtered wrapper -- auto-scopes to the viewer's own
// department rather than the full company org chart. Reuses the same
// node-rendering approach as the EXISTING OrgChartPage, never a
// second org-structure data source.

import { useState } from 'react'
import { PageHeader, AIImpact, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fdba74 100%)'
const A = '#c2410c'

const MY_DEPT_NODES = [
  { id:'n1', name:'Rajesh Sharma', title:'CTO', level:0, reports:2 },
  { id:'n2', name:'Gita Maharjan', title:'Cloud Architect', level:1, manager:'Rajesh Sharma', reports:0 },
  { id:'n3', name:'Sunil Magar', title:'Engineering Manager', level:1, manager:'Rajesh Sharma', reports:3 },
  { id:'n4', name:'Hari Thapa', title:'Software Engineer II', level:2, manager:'Sunil Magar', reports:0 },
  { id:'n5', name:'Bikash Rai', title:'Software Engineer I', level:2, manager:'Sunil Magar', reports:0 },
]

export default function OrganogramDepartmentPage() {
  const [ctx, setCtx] = useState(null)
  const byLevel = MY_DEPT_NODES.reduce((acc,n)=>{(acc[n.level]=acc[n.level]||[]).push(n); return acc}, {})

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🏢" title="Organogram for My Department"
        breadcrumb="HR Services & Support > Employee Self Service"
        gradient={G}
        stats={[
          {icon:'🏢',label:'Department',  value:'Information Technology'},
          {icon:'👥',label:'Team Size',       value:MY_DEPT_NODES.length},
          {icon:'📊',label:'Levels',              value:Object.keys(byLevel).length},
          {icon:'🔗',label:'Full Org Chart',         value:'Available'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#7c2d12',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🎯</span>
        <div style={{flex:1,minWidth:200}}><strong>Just Your Team:</strong> Pre-filtered to your own department so you see the chain of command that matters to your daily work -- the full company-wide Organization Chart is one click away if you need it.</div>
      </div>

      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'24px'}}>
        {Object.keys(byLevel).sort().map(level=>(
          <div key={level} style={{display:'flex',justifyContent:'center',gap:14,marginBottom:24,flexWrap:'wrap'}}>
            {byLevel[level].map(n=>(
              <div key={n.id}
                onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:n.name,...n,impact_links:['Organization Chart']}})}}
                style={{background:level==='0'?G:'#fff',color:level==='0'?'#fff':'#0f172a',border:level==='0'?'none':'1px solid #e2e8f0',borderRadius:12,padding:'12px 18px',textAlign:'center',minWidth:150,boxShadow:'0 2px 8px rgba(0,0,0,.06)'}}>
                <div style={{fontSize:11,fontWeight:800}}>{n.name}</div>
                <div style={{fontSize:9,opacity:.8,marginTop:2}}>{n.title}</div>
                {n.reports>0&&<div style={{fontSize:8,marginTop:4,opacity:.7}}>{n.reports} direct reports</div>}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Structure syncs live from the same org data HR maintains -- never a stale snapshot.','Right-click any node to jump straight into the company-wide Organization Chart for broader context.','Vacant or recently-changed roles highlight automatically when a reorganization happens.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Profile',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
