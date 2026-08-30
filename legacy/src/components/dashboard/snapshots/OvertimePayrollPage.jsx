// FILE: OvertimePayrollPage.jsx - Overtime Payroll (Payroll & Compensation)
// Syncs approved overtime_requests into payroll line items at 1.5x multiplier,
// enforces 4hr/day-24hr/week cap, batch preview before payroll push.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fdba74 100%)'
const A = '#c2410c'

const OT_BATCH = [
  { id:'ot1', employee:'Bikash Rai', dept:'IT', period:'June 2025', total_ot_hours:18.5, base_hourly_npr:312.5,
    multiplier:1.5, ot_amount_npr:8667, weekly_cap_breaches:0, status:'ready', impact_links:['Overtime Management','Payroll Setup'] },
  { id:'ot2', employee:'Sunil Magar', dept:'Customer Service', period:'June 2025', total_ot_hours:22, base_hourly_npr:225,
    multiplier:1.5, ot_amount_npr:7425, weekly_cap_breaches:1, status:'flagged', impact_links:['Overtime & Monitoring'] },
  { id:'ot3', employee:'Maya Pradhan', dept:'Finance', period:'June 2025', total_ot_hours:6.4, base_hourly_npr:250,
    multiplier:1.5, ot_amount_npr:2400, weekly_cap_breaches:0, status:'ready', impact_links:[] },
]

const STATUS_CFG = {ready:{c:'#10b981',bg:'#f0fdf4',label:'Ready for Payroll'},flagged:{c:'#ef4444',bg:'#fef2f2',label:'Cap Breach - Held'}}

export default function OvertimePayrollPage() {
  const [batch, setBatch] = useState(OT_BATCH)
  const [search, setSearch] = useState('')
  const [ctx, setCtx] = useState(null)

  const filtered = batch.filter(b=>!search||b.employee.toLowerCase().includes(search.toLowerCase()))
  const totalOTCost = batch.reduce((s,b)=>s+b.ot_amount_npr,0)
  const readyCount = batch.filter(b=>b.status==='ready').length
  const flaggedCount = batch.filter(b=>b.status==='flagged').length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="⏱" title="Overtime Payroll"
        breadcrumb="Workforce Operations > Payroll & Compensation > Payroll Setup"
        gradient={G}
        stats={[
          {icon:'👥',label:'Employees in Batch', value:batch.length},
          {icon:'✅',label:'Ready',                value:readyCount},
          {icon:'⚠',label:'Cap Breach Held',      value:flaggedCount},
          {icon:'💰',label:'Total OT Cost',         value:'NPR '+totalOTCost.toLocaleString()},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#7c2d12',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>⚖</span>
        <div style={{flex:1,minWidth:220}}><strong>Nepal Labour Act 2074:</strong> OT capped 4hrs/day, 24hrs/week, paid at 150% (1.5×) the regular hourly rate. Any employee breaching the weekly cap is automatically held out of this payroll batch until HR reviews - never silently paid past the legal limit.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{display:'grid',gap:12,marginTop:14}}>
        {filtered.map(b=>{
          const sc = STATUS_CFG[b.status]
          return (
            <div key={b.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:b.employee,...b}})}}
              style={{background:'#fff',border:`1.5px solid ${sc.c}33`,borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${sc.c}`}}>
              <div style={{display:'flex',alignItems:'center',gap:14,padding:'14px 18px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap'}}>
                <div style={{flex:1,minWidth:160}}>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:3}}>
                    <span style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{b.employee}</span>
                    <span style={{background:sc.bg,color:sc.c,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{sc.label}</span>
                  </div>
                  <div style={{fontSize:10,color:'#64748b'}}>{b.dept} . {b.period}</div>
                </div>
                <div style={{textAlign:'center'}}>
                  <div style={{fontSize:16,fontWeight:900,color:A}}>NPR {b.ot_amount_npr.toLocaleString()}</div>
                  <div style={{fontSize:8,color:'#94a3b8',fontWeight:700}}>OT AMOUNT</div>
                </div>
              </div>
              <div style={{padding:'12px 18px',display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(110px,1fr))',gap:8}}>
                {[{l:'Total OT Hours',v:b.total_ot_hours+'h'},{l:'Hourly Rate',v:'NPR '+b.base_hourly_npr},{l:'Multiplier',v:b.multiplier+'×'},{l:'Weekly Breaches',v:b.weekly_cap_breaches}].map((s,i)=>(
                  <div key={i} style={{textAlign:'center',background:'#f8fafc',borderRadius:8,padding:'8px 4px'}}>
                    <div style={{fontSize:12,fontWeight:800,color:s.l==='Weekly Breaches'&&s.v>0?'#ef4444':A}}>{s.v}</div>
                    <div style={{fontSize:8,color:'#94a3b8',marginTop:2}}>{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {flaggedCount>0&&(
        <div style={{marginTop:16,background:'#fff',border:'1px solid #fecaca',borderRadius:16,padding:'16px 20px'}}>
          <AIImpact color={A} lines={[`${flaggedCount} employee(s) held for weekly OT cap breach - review in Overtime & Monitoring before this batch can finalize.`,'Approved OT auto-syncs from the Overtime Management module - no manual re-entry.','Push to payroll instantly updates payslips once all holds are cleared.']}/>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View OT Detail',key:'view'},{icon:'🔍',label:'Review Cap Breach',key:'review'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}
