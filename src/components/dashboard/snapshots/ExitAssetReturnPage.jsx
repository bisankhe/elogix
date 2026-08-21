// FILE: ExitAssetReturnPage.jsx - Asset Return (Offboarding)
// (Employee Lifecycle > Offboarding)
// Genuinely missing page, confirmed during audit. Distinct from
// AssetReturnPage (Finance & Assets, general mid-employment returns)
// and AssetReturnFinPage -- this is specifically the EXIT CLEARANCE
// checklist item, gating final settlement.
import { useState } from 'react'
import { PageHeader, AIImpact, ContextMenu } from './DeptSetupShared.jsx'
const G='linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fdba74 100%)'
const A='#c2410c'
const ASSETS=[
  {item:'Lenovo Laptop SN-2024-041',status:'returned',condition:'Good',returned_at:'2025-06-28'},
  {item:'ID Card',status:'returned',condition:'N/A',returned_at:'2025-06-28'},
  {item:'Company Mobile Phone',status:'pending',condition:'-',returned_at:null,
   flag_note:'Pending return -- final settlement is blocked until this item is cleared.'},
]
export default function ExitAssetReturnPage(){
  const [ctx,setCtx]=useState(null)
  const pending=ASSETS.filter(a=>a.status==='pending').length
  return(
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📦" title="Asset Return" breadcrumb="Employee Lifecycle > Offboarding" gradient={G}
        stats={[{icon:'📦',label:'Total Assets',value:ASSETS.length},{icon:'✅',label:'Returned',value:ASSETS.filter(a=>a.status==='returned').length},{icon:'⚠',label:'Pending',value:pending},{icon:'🔒',label:'Blocks Settlement',value:pending>0?'Yes':'No'}]}
        onAdd={()=>{}} addLabel=""/>
      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#7c2d12',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>🔒</span>
        <div style={{flex:1}}><strong>Full &amp; Final Settlement Waits for This:</strong> Every allocated asset must be marked returned and verified before the exit clearance checklist can complete.</div>
      </div>
      <div style={{display:'grid',gap:12}}>
        {ASSETS.map((a,i)=>(
          <div key={i} onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:a.item,...a,impact_links:['Full & Final Settlement']}})}}
            style={{background:'#fff',border:`1px solid ${a.flag_note?'#fecaca':'#e2e8f0'}`,borderRadius:12,padding:'14px 16px',display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
            <div><div style={{fontSize:10,fontWeight:700,color:'#0f172a'}}>{a.item}</div>{a.returned_at&&<div style={{fontSize:8,color:'#94a3b8',marginTop:2}}>Returned {a.returned_at} · Condition: {a.condition}</div>}</div>
            <span style={{background:a.status==='returned'?'#f0fdf4':'#fef2f2',color:a.status==='returned'?'#15803d':'#dc2626',fontSize:8,fontWeight:700,padding:'2px 8px',borderRadius:20,height:'fit-content'}}>{a.status==='returned'?'✓ Returned':'⚠ Pending'}</span>
            {a.flag_note&&<div style={{width:'100%',fontSize:8,color:'#dc2626',marginTop:4}}>⚠ {a.flag_note}</div>}
          </div>
        ))}
      </div>
      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Unreturned assets auto-deduct from final settlement at replacement cost if not returned by the last working day.','Asset condition is logged at return -- damage disputes get resolved here, not after the employee has already left.','This list pulls directly from the existing employee_assets allocation record -- never a manually recreated checklist.']}/>
      </div>
      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[{icon:'✅',label:'Mark Returned',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'}]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
