// FILE: DashboardCustomizationPage.jsx - Dashboard Customization
// (System Administration > System Settings)
import { useState } from 'react'
import { PageHeader, AIImpact, ContextMenu } from './DeptSetupShared.jsx'
const G='linear-gradient(135deg,#581c87 0%,#7c3aed 60%,#c4b5fd 100%)'
const A='#7c3aed'
const WIDGETS=[
  {id:'w1',label:'Headcount KPI',type:'kpi',persona:['super-admin','hr'],pinned:true},
  {id:'w2',label:'Attrition Trend',type:'chart',persona:['executive','hr'],pinned:true},
  {id:'w3',label:'Payroll Snapshot',type:'kpi',persona:['super-admin'],pinned:false},
  {id:'w4',label:'Leave Calendar',type:'calendar',persona:['employee','department'],pinned:true},
]
const PERSONAS=['super-admin','executive','hr','department','employee']
export default function DashboardCustomizationPage(){
  const [selected,setSelected]=useState('hr')
  const [ctx,setCtx]=useState(null)
  const visible=WIDGETS.filter(w=>w.persona.includes(selected))
  return(
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🎨" title="Dashboard Customization" breadcrumb="System Administration > System Settings" gradient={G}
        stats={[{icon:'🧩',label:'Total Widgets',value:WIDGETS.length},{icon:'👤',label:'Personas',value:PERSONAS.length},{icon:'📌',label:'Pinned',value:WIDGETS.filter(w=>w.pinned).length},{icon:'🌙',label:'Dark Mode',value:'Available'}]}
        onAdd={()=>{}} addLabel="Add Widget"/>
      <div style={{background:'#faf5ff',border:'1px solid #e9d5ff',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#581c87',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>🎨</span>
        <div style={{flex:1}}><strong>Every Role Sees What It Needs:</strong> Drag widgets into position for each persona -- an employee never sees executive KPIs, an HR admin never has to scroll past irrelevant tools.</div>
      </div>
      <div style={{display:'flex',gap:6,marginBottom:16,flexWrap:'wrap'}}>
        {PERSONAS.map(p=><button key={p} onClick={()=>setSelected(p)} style={{padding:'7px 14px',borderRadius:8,border:selected===p?'none':'1px solid #e2e8f0',cursor:'pointer',fontSize:9,fontWeight:700,background:selected===p?A:'#fff',color:selected===p?'#fff':'#64748b'}}>{p}</button>)}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:14}}>
        {visible.map((w,i)=>(
          <div key={i} onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:w.label,...w,impact_links:['Menu Management']}})}}
            style={{background:'#fff',border:`1px solid ${w.pinned?A+'44':'#e2e8f0'}`,borderRadius:14,padding:'16px',cursor:'grab',textAlign:'center'}}>
            <div style={{fontSize:9,fontWeight:700,color:'#0f172a'}}>{w.label}</div>
            <div style={{fontSize:8,color:'#94a3b8',marginTop:4}}>{w.type}{w.pinned&&' . 📌'}</div>
          </div>
        ))}
        <div style={{border:'2px dashed #e9d5ff',borderRadius:14,padding:'16px',textAlign:'center',color:'#c4b5fd',fontSize:9,cursor:'pointer'}}>+ Drag new widget here</div>
      </div>
      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['AI suggests widgets based on which KPIs the current user clicks most -- a dashboard that self-optimizes over time.','Widget visibility per persona updates immediately -- no redeployment cycle, no IT ticket.','Dark mode toggle respects the OS preference by default, with a manual override per user.']}/>
      </div>
      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[{icon:'👁',label:'Configure Widget',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'}]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
