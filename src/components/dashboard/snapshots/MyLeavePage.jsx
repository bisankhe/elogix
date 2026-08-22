// FILE: MyLeavePage.jsx - My Leave
// (HR Services & Support > Employee Self Service)
// ESS-facing balance snapshot, pure UI over the EXISTING
// employee_leave_balances (Leave Setup session) -- never recalculated
// here. Circular progress bars per leave type, statutory entitlement context.

import { useState } from 'react'
import { PageHeader, AIImpact, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#052e16 0%,#15803d 60%,#86efac 100%)'
const A = '#15803d'

const BALANCES = [
  { type:'Annual/Home Leave', current:14, entitled:18, c:'#15803d', legal_note:'1 day per 20 days worked' },
  { type:'Sick Leave', current:9, entitled:12, c:'#0284c7', legal_note:'12 days annually' },
  { type:'Mourning Leave', current:13, entitled:13, c:'#7c3aed', legal_note:'13 days annually' },
]

export default function MyLeavePage() {
  const [ctx, setCtx] = useState(null)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🏖" title="My Leave"
        breadcrumb="HR Services & Support > Employee Self Service"
        gradient={G}
        stats={[
          {icon:'🏖',label:'Annual Remaining',  value:BALANCES[0].current},
          {icon:'🤒',label:'Sick Remaining',       value:BALANCES[1].current},
          {icon:'📅',label:'Used This Year',          value:BALANCES.reduce((s,b)=>s+(b.entitled-b.current),0)},
          {icon:'⚖',label:'Basis',                       value:'Sections 40-49'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>📐</span>
        <div style={{flex:1,minWidth:200}}><strong>Know Before You Apply:</strong> Your exact balance, every time -- calculated live from the same accrual engine HR and payroll use. No guessing, no surprises when you request time off.</div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:16}}>
        {BALANCES.map((b,i)=>{
          const pct = Math.round(b.current/b.entitled*100)
          return (
            <div key={i}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:b.type,...b,impact_links:['Leave Request']}})}}
              style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'20px',textAlign:'center'}}>
              <svg width="100" height="100" viewBox="0 0 36 36" style={{margin:'0 auto'}}>
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="#f1f5f9" strokeWidth="5"/>
                <circle cx="18" cy="18" r="15.5" fill="none" stroke={b.c} strokeWidth="5" strokeDasharray={`${pct} ${100-pct}`} strokeDashoffset="25" transform="rotate(-90 18 18)"/>
              </svg>
              <div style={{fontSize:18,fontWeight:900,color:b.c,marginTop:-66}}>{b.current}</div>
              <div style={{fontSize:8,color:'#94a3b8',marginTop:36}}>of {b.entitled} days</div>
              <div style={{fontSize:11,fontWeight:700,color:'#0f172a',marginTop:8}}>{b.type}</div>
              <div style={{fontSize:8,color:'#94a3b8',marginTop:4}}>{b.legal_note}</div>
            </div>
          )
        })}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Balances update the instant a leave request is approved -- never a stale, manually-refreshed number.','Maternity leave (14 weeks paid) and paternity leave are tracked separately and shown only when applicable.','Low balance warnings appear before you submit a request that would overdraw -- not after rejection.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View History',key:'view'},{icon:'📝',label:'Request This Leave Type',key:'request'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}
