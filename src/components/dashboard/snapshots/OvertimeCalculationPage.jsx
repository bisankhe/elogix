// FILE: OvertimeCalculationPage.jsx - Overtime Calculation (Payroll Processing)
// Variance calendar: scheduled vs worked hours, auto 1.5x multiplier,
// 4hr/day-24hr/week statutory cap enforcement, one-click batch approval.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#1e1b4b 0%,#4338ca 60%,#818cf8 100%)'
const A = '#4338ca'

const OT_BATCH = [
  { id:'ot1', employee:'Bikash Rai', dept:'IT', scheduled_hrs:48, worked_hrs:52.5, ot_hrs:4.5,
    weekly_cap:24, weekly_used:18, base_rate_npr:312.5, ot_rate_npr:468.75, ot_amount_npr:2109.4,
    status:'within_cap', impact_links:['Overtime Management','Salary Structure'] },
  { id:'ot2', employee:'Sunil Magar', dept:'Customer Service', scheduled_hrs:48, worked_hrs:54, ot_hrs:6,
    weekly_cap:24, weekly_used:25, base_rate_npr:225, ot_rate_npr:337.5, ot_amount_npr:2025,
    status:'exceeds_cap', impact_links:['Overtime & Monitoring'] },
  { id:'ot3', employee:'Maya Pradhan', dept:'Finance', scheduled_hrs:48, worked_hrs:50.1, ot_hrs:2.1,
    weekly_cap:24, weekly_used:8, base_rate_npr:296, ot_rate_npr:444, ot_amount_npr:932.4,
    status:'within_cap', impact_links:[] },
]

const STATUS_CFG = {within_cap:{c:'#10b981',bg:'#f0fdf4',label:'Within Cap'},exceeds_cap:{c:'#ef4444',bg:'#fef2f2',label:'Exceeds 24hr Cap'}}

export default function OvertimeCalculationPage() {
  const [search, setSearch] = useState('')
  const [ctx, setCtx] = useState(null)

  const filtered = OT_BATCH.filter(o=>!search||o.employee.toLowerCase().includes(search.toLowerCase()))
  const totalOTAmount = OT_BATCH.reduce((s,o)=>s+o.ot_amount_npr,0)
  const exceedsCount = OT_BATCH.filter(o=>o.status==='exceeds_cap').length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="⏱" title="Overtime Calculation"
        breadcrumb="Workforce Operations > Payroll & Compensation > Payroll Processing"
        gradient={G}
        stats={[
          {icon:'⏱',label:'OT Records This Run', value:OT_BATCH.length},
          {icon:'💰',label:'Total OT Amount',      value:'NPR '+totalOTAmount.toFixed(0)},
          {icon:'⚠',label:'Exceeds Weekly Cap',    value:exceedsCount},
          {icon:'📊',label:'Multiplier',           value:'1.5×'},
        ]}
        onAdd={()=>{}} addLabel="Recalculate" onExcel={()=>{}}/>

      <div style={{background:'#eef2ff',border:'1px solid #c7d2fe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#3730a3',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>⚖</span>
        <div style={{flex:1,minWidth:200}}><strong>Nepal LA2074:</strong> OT capped at 4hrs/day, 24hrs/week, paid at 150% of regular hourly rate. Records exceeding the weekly cap are flagged for manager review before payroll finalization - never silently paid past the legal limit.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,overflow:'hidden',marginTop:14}}>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
            <thead><tr style={{background:'#f8fafc'}}>
              {['Employee','Scheduled','Worked','OT Hrs','Weekly Used/Cap','Base Rate','OT Rate (1.5×)','OT Amount','Status'].map(h=>(
                <th key={h} style={{padding:'10px 12px',textAlign:'left',fontSize:9,fontWeight:800,color:A,whiteSpace:'nowrap'}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.map(o=>{
                const sc = STATUS_CFG[o.status]
                return (
                  <tr key={o.id} style={{borderBottom:'1px solid #f8fafc'}}
                    onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:o.employee,...o}})}}>
                    <td style={{padding:'9px 12px',fontWeight:700,color:'#0f172a'}}>{o.employee}</td>
                    <td style={{padding:'9px 12px',color:'#94a3b8'}}>{o.scheduled_hrs}h</td>
                    <td style={{padding:'9px 12px',fontWeight:700,color:'#0f172a'}}>{o.worked_hrs}h</td>
                    <td style={{padding:'9px 12px',fontWeight:800,color:A}}>{o.ot_hrs}h</td>
                    <td style={{padding:'9px 12px',color:o.weekly_used>o.weekly_cap?'#ef4444':'#64748b',fontWeight:o.weekly_used>o.weekly_cap?700:400}}>{o.weekly_used}/{o.weekly_cap}h</td>
                    <td style={{padding:'9px 12px',color:'#64748b'}}>NPR {o.base_rate_npr}</td>
                    <td style={{padding:'9px 12px',color:'#7c3aed',fontWeight:700}}>NPR {o.ot_rate_npr}</td>
                    <td style={{padding:'9px 12px',fontWeight:800,color:'#0f172a'}}>NPR {o.ot_amount_npr.toFixed(0)}</td>
                    <td style={{padding:'9px 12px'}}><span style={{background:sc.bg,color:sc.c,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{sc.label}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{marginTop:16,display:'flex',gap:10,flexWrap:'wrap'}}>
        <button style={{flex:1,minWidth:200,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Push Approved OT to Payroll</button>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Daily Breakdown',key:'view'},{icon:'⚠',label:'Cap Override (HR Only)',key:'override'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
