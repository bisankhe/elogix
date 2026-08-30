// FILE: AssetReturnFinPage.jsx - Asset Return (Asset & Inventory)
// (Finance, Assets & Administration > Asset & Inventory)
// Distinct from the EXISTING AssetReturnPage (Exit Management,
// offboarding-triggered). This is the ONGOING return hub -- mid-tenure
// returns (replacements, department transfers) AND the unreturned-
// asset-vs-final-settlement deduction link, made explicit per the
// brief's legal note on recovering losses from final salary.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fdba74 100%)'
const A = '#c2410c'

const RETURN_QUEUE = [
  {id:'r1',item:'ThinkPad X1 Carbon',tag:'IT-LT-0019',employee:'Bikash Rai',reason:'Department transfer -- reassigned hardware',status:'pending',due:'2025-07-02'},
  {id:'r2',item:'Standing Desk',tag:'FUR-DK-0067',employee:'Maya Pradhan',reason:'Final settlement -- exited 2025-06-10',status:'overdue',due:'2025-06-17',
   flag_note:'12 days overdue -- value eligible for deduction from final settlement per Labour Act due-process rules.', impact_links:['Final Settlement']},
]

export default function AssetReturnFinPage() {
  const [search, setSearch] = useState('')
  const [ctx, setCtx] = useState(null)

  const filtered = RETURN_QUEUE.filter(r=>!search||r.employee.toLowerCase().includes(search.toLowerCase()))
  const overdueCount = RETURN_QUEUE.filter(r=>r.status==='overdue').length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="↩" title="Asset Return"
        breadcrumb="Finance, Assets & Administration > Asset & Inventory"
        gradient={G}
        stats={[
          {icon:'↩',label:'Pending Returns',  value:RETURN_QUEUE.length},
          {icon:'⚠',label:'Overdue',              value:overdueCount},
          {icon:'⚖',label:'Settlement-Linked',        value:RETURN_QUEUE.filter(r=>r.impact_links).length},
          {icon:'📋',label:'Audit Trail',                 value:'Always Stamped'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#7c2d12',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>⚖</span>
        <div style={{flex:1,minWidth:200}}><strong>Unreturned Has Real Consequences:</strong> Per the Labour Act, unreturned company property may be legally recovered from an employee's final salary -- but only with due process followed. Overdue items here link directly to Final Settlement so nothing gets deducted without a documented trail.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee..."/>

      <div style={{display:'grid',gap:14,marginTop:14}}>
        {filtered.map(r=>(
          <div key={r.id}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:r.item,...r}})}}
            style={{background:'#fff',border:`1.5px solid ${r.status==='overdue'?'#fecaca':'#e2e8f0'}`,borderRadius:14,padding:'16px 18px',borderLeft:`4px solid ${r.status==='overdue'?'#ef4444':'#f59e0b'}`}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:8}}>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:'#0f172a'}}>{r.item}</div>
                <div style={{fontSize:9,color:'#94a3b8',marginTop:3}}>{r.tag} . {r.employee} . {r.reason}</div>
              </div>
              <span style={{background:r.status==='overdue'?'#fef2f2':'#fffbeb',color:r.status==='overdue'?'#dc2626':'#b45309',fontSize:9,fontWeight:700,padding:'3px 10px',borderRadius:20}}>{r.status}</span>
            </div>
            <div style={{marginTop:8,fontSize:9,color:'#94a3b8'}}>Due: {r.due}</div>
            {r.flag_note&&<div style={{marginTop:8,fontSize:9,color:'#dc2626'}}>⚠ {r.flag_note}</div>}
          </div>
        ))}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['QR scan on return auto-confirms the asset back into inventory -- never a manual checklist that gets forgotten.','Overdue items past a final working day route automatically into the Final Settlement deduction review, never silently written off.','Condition photos and a digital sign-off are captured at return, protecting both the company and the employee from later disputes.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Detail',key:'view'},{icon:'📱',label:'Confirm Return via QR',key:'scan'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}
