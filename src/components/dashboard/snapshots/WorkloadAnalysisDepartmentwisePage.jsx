// FILE: WorkloadAnalysisDepartmentwisePage.jsx - Workload Analysis (Departmentwise)
// (Performance & Talent > Work & Performance)
// Workforce heatmap, resource allocation matrix (required hrs vs FTE),
// trend analysis. Aggregated from daily_attendance_records + departments.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fdba74 100%)'
const A = '#c2410c'

const DEPT_WORKLOAD = [
  { id:'d1', dept:'Customer Service', headcount:18, required_hrs_week:864, available_hrs_week:792,
    fte_gap:-1.8, avg_overtime_hrs:14.2, intensity:'over', impact_links:['Overtime & Monitoring'] },
  { id:'d2', dept:'IT', headcount:47, required_hrs_week:2256, available_hrs_week:2280,
    fte_gap:0.6, avg_overtime_hrs:6.4, intensity:'balanced', impact_links:[] },
  { id:'d3', dept:'Sales & Marketing', headcount:42, required_hrs_week:1890, available_hrs_week:2016,
    fte_gap:3.2, avg_overtime_hrs:2.1, intensity:'under', impact_links:['Workforce Planning'] },
  { id:'d4', dept:'Finance', headcount:24, required_hrs_week:1080, available_hrs_week:1152,
    fte_gap:1.8, avg_overtime_hrs:1.2, intensity:'balanced', impact_links:[] },
]

const INTENSITY_CFG = {
  over:{c:'#ef4444',bg:'#fef2f2',label:'Over-Resourced Demand'},
  balanced:{c:'#10b981',bg:'#f0fdf4',label:'Balanced'},
  under:{c:'#3b82f6',bg:'#eff6ff',label:'Under-Utilized'},
}

export default function WorkloadAnalysisDepartmentwisePage() {
  const [search, setSearch] = useState('')
  const [ctx, setCtx] = useState(null)

  const filtered = DEPT_WORKLOAD.filter(d=>!search||d.dept.toLowerCase().includes(search.toLowerCase()))
  const overResourcedCount = DEPT_WORKLOAD.filter(d=>d.intensity==='over').length
  const totalGap = DEPT_WORKLOAD.reduce((s,d)=>s+d.fte_gap,0)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🏢" title="Workload Analysis - Departmentwise"
        breadcrumb="Performance & Talent Management > Work & Performance > Workload Analysis"
        gradient={G}
        stats={[
          {icon:'🏢',label:'Departments',          value:DEPT_WORKLOAD.length},
          {icon:'🔴',label:'Over-Resourced',        value:overResourcedCount},
          {icon:'📊',label:'Net FTE Gap',           value:(totalGap>=0?'+':'')+totalGap.toFixed(1)},
          {icon:'⏱',label:'Total Avg OT',          value:DEPT_WORKLOAD.reduce((s,d)=>s+d.avg_overtime_hrs,0).toFixed(1)+'h'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#7c2d12',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🔥</span>
        <div style={{flex:1,minWidth:200}}><strong>Resource Allocation Matrix:</strong> Maps required project hours against available FTE capacity per department. Negative FTE gap signals over-burdened teams relying on overtime; positive gap signals capacity to absorb new initiatives without new hires.</div>
      </div>

      {/* Workforce heatmap */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:12,marginBottom:18}}>
        {DEPT_WORKLOAD.map(d=>{
          const ic = INTENSITY_CFG[d.intensity]
          return (
            <div key={d.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:d.dept,...d}})}}
              style={{background:`${ic.c}10`,border:`2px solid ${ic.c}33`,borderRadius:14,padding:'16px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
                <div style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{d.dept}</div>
                <span style={{background:ic.bg,color:ic.c,fontSize:8,fontWeight:700,padding:'2px 7px',borderRadius:20}}>{ic.label}</span>
              </div>
              <div style={{fontSize:20,fontWeight:900,color:ic.c}}>{d.fte_gap>0?'+':''}{d.fte_gap.toFixed(1)} FTE</div>
              <div style={{fontSize:9,color:'#94a3b8',marginTop:2}}>{d.headcount} headcount . {d.avg_overtime_hrs}h avg OT/employee</div>
            </div>
          )
        })}
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by department name..."/>

      {/* Resource allocation matrix table */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,overflow:'hidden',marginTop:14}}>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
            <thead><tr style={{background:'#f8fafc'}}>
              {['Department','Headcount','Required Hrs/Wk','Available Hrs/Wk','FTE Gap','Avg OT/Employee','Intensity'].map(h=>(
                <th key={h} style={{padding:'10px 12px',textAlign:'left',fontSize:9,fontWeight:800,color:A,whiteSpace:'nowrap'}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.map(d=>{
                return (
                  <tr key={d.id} style={{borderBottom:'1px solid #f8fafc'}}
                    onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:d.dept,...d}})}}>
                    <td style={{padding:'9px 12px',fontWeight:700,color:'#0f172a'}}>{d.dept}</td>
                    <td style={{padding:'9px 12px',color:'#64748b'}}>{d.headcount}</td>
                    <td style={{padding:'9px 12px',color:'#3b82f6'}}>{d.required_hrs_week}h</td>
                    <td style={{padding:'9px 12px',color:'#10b981'}}>{d.available_hrs_week}h</td>
                    <td style={{padding:'9px 12px',fontWeight:800,color:ic.c}}>{d.fte_gap>0?'+':''}{d.fte_gap.toFixed(1)}</td>
                    <td style={{padding:'9px 12px',color:d.avg_overtime_hrs>10?'#ef4444':'#64748b'}}>{d.avg_overtime_hrs}h</td>
                    <td style={{padding:'9px 12px'}}><span style={{background:ic.bg,color:ic.c,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{ic.label}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Departments showing >10h avg OT/employee are flagged for staffing review.','Positive FTE gaps suggest capacity to absorb new projects without hiring.','Seasonal forecasting toggle (coming soon) will project workload spikes ahead of peak periods.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'Drill Into Employees',key:'drill'},{icon:'📤',label:'Export',key:'export'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}
