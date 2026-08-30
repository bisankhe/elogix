// FILE: CustomFormBuilderPage.jsx - Custom Form Builder
// (System Administration > System Settings)
import { useState } from 'react'
import { Field, PageHeader, AIImpact, ContextMenu } from './DeptSetupShared.jsx'
const G='linear-gradient(135deg,#0c4a6e 0%,#0284c7 60%,#7dd3fc 100%)'
const A='#0284c7'
const FIELD_TYPES=['Text Input','Number','Date','Dropdown','Checkbox','File Upload','Signature','Rating']
const SAVED_FORMS=[
  {name:'IT Asset Request Form',fields:7,workflow:'IT Head Approval',uses_30d:23},
  {name:'Vendor Onboarding Checklist',fields:12,workflow:'Procurement Head Approval',uses_30d:8},
]
export default function CustomFormBuilderPage(){
  const [canvas,setCanvas]=useState([{type:'Text Input',label:'Full Name',required:true},{type:'Dropdown',label:'Department',required:true}])
  const [ctx,setCtx]=useState(null)
  return(
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📝" title="Custom Form Builder" breadcrumb="System Administration > System Settings" gradient={G}
        stats={[{icon:'📝',label:'Saved Forms',value:SAVED_FORMS.length},{icon:'🧩',label:'Field Types',value:FIELD_TYPES.length},{icon:'⚡',label:'No-Code',value:'100%'},{icon:'🔗',label:'Auto DB Mapping',value:'Yes'}]}
        onAdd={()=>{}} addLabel="New Form"/>
      <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#1e40af',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>⚡</span>
        <div style={{flex:1}}><strong>No IT Ticket, No SQL:</strong> Drag a field onto the canvas, set its validation rule, and it auto-maps to the database -- HR owns the form, start to finish.</div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'160px 1fr',gap:16,marginBottom:18}}>
        <div style={{background:'#f8fafc',borderRadius:12,padding:'12px'}}>
          <div style={{fontSize:9,fontWeight:800,color:'#0f172a',marginBottom:8}}>FIELD TYPES</div>
          {FIELD_TYPES.map((t,i)=><div key={i} style={{fontSize:9,padding:'6px 8px',borderRadius:7,marginBottom:4,background:'#fff',border:'1px solid #e2e8f0',cursor:'grab',color:'#374151'}}>⠿ {t}</div>)}
        </div>
        <div style={{background:'#fff',border:'2px dashed #bfdbfe',borderRadius:14,padding:'16px'}}>
          <div style={{fontSize:10,fontWeight:700,color:'#0f172a',marginBottom:12}}>Form Canvas</div>
          {canvas.map((f,i)=>(
            <div key={i} onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:f.label,...f}})}}
              style={{padding:'10px 12px',border:'1px solid #e2e8f0',borderRadius:9,marginBottom:8,background:'#f8fafc',display:'flex',justifyContent:'space-between'}}>
              <span style={{fontSize:9,fontWeight:700}}>{f.label}</span>
              <span style={{fontSize:8,color:'#94a3b8'}}>{f.type}{f.required&&' *'}</span>
            </div>
          ))}
          <div style={{border:'1px dashed #93c5fd',borderRadius:9,padding:'12px',textAlign:'center',fontSize:8,color:'#93c5fd',cursor:'pointer'}}>Drop field here</div>
        </div>
      </div>
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px'}}>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:12}}>📋 Saved Forms</div>
        {SAVED_FORMS.map((f,i)=>(
          <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:i<SAVED_FORMS.length-1?'1px solid #f8fafc':'none'}}>
            <span style={{fontSize:10,fontWeight:700,color:'#0f172a'}}>{f.name}</span>
            <span style={{fontSize:8,color:'#94a3b8'}}>{f.fields} fields . {f.uses_30d} uses (30d)</span>
          </div>
        ))}
      </div>
      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Every field maps to a database column automatically -- no migration script, no IT review, no data-entry bottleneck.','Conditional logic: show field B only when field A has a specific value -- built by clicking, never coding.','Forms can be assigned an approval workflow right here -- one step to build the form and define what happens after it\'s submitted.']}/>
      </div>
      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={[]} actions={[{icon:'⚙',label:'Edit Field Rules',key:'view'}]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}
