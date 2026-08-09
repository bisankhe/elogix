// FILE: CompensationAnalyticsPage.jsx - Compensation Analytics (Payroll Analytics)
// Compa-ratio distribution, 9-box performance-to-payout matrix, pay equity
// audit, total rewards breakdown. Strategic compensation intelligence.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#581c87 0%,#7c3aed 60%,#c4b5fd 100%)'
const A = '#7c3aed'

const COMPA_RATIO_DATA = [
  {employee:'Gita Maharjan',dept:'IT',grade:'L4',current_salary_npr:85000,range_midpoint_npr:80000,compa_ratio:1.06,band:'Within Range'},
  {employee:'Bikash Rai',dept:'IT',grade:'L3',current_salary_npr:62000,range_midpoint_npr:70000,compa_ratio:0.89,band:'Below Range'},
  {employee:'Maya Pradhan',dept:'Finance',grade:'L4',current_salary_npr:71000,range_midpoint_npr:78000,compa_ratio:0.91,band:'Below Range'},
  {employee:'Anjali Sharma',dept:'Sales',grade:'L3',current_salary_npr:58000,range_midpoint_npr:55000,compa_ratio:1.05,band:'Within Range'},
]

const NINE_BOX = [
  {perf:'High',potential:'High',count:8,avg_increase_pct:12,color:'#10b981'},
  {perf:'High',potential:'Medium',count:14,avg_increase_pct:8,color:'#3b82f6'},
  {perf:'High',potential:'Low',count:6,avg_increase_pct:6,color:'#3b82f6'},
  {perf:'Medium',potential:'High',count:11,avg_increase_pct:7,color:'#3b82f6'},
  {perf:'Medium',potential:'Medium',count:42,avg_increase_pct:5,color:'#f59e0b'},
  {perf:'Medium',potential:'Low',count:18,avg_increase_pct:3,color:'#f59e0b'},
  {perf:'Low',potential:'High',count:5,avg_increase_pct:2,color:'#f59e0b'},
  {perf:'Low',potential:'Medium',count:9,avg_increase_pct:1,color:'#ef4444'},
  {perf:'Low',potential:'Low',count:4,avg_increase_pct:0,color:'#ef4444'},
]

const PAY_EQUITY = { gender_pay_gap_pct:3.2, departments_audited:6, flagged_disparities:1,
  flagged_detail:'IT department: 1 role-level pair shows >5% unexplained variance - flagged for HR review.' }

const TOTAL_REWARDS = [
  {component:'Base Salary',pct:68,color:'#3b82f6'},{component:'Statutory Benefits (SSF/Gratuity)',pct:14,color:'#10b981'},
  {component:'Bonus & Incentives',pct:10,color:'#f59e0b'},{component:'Allowances',pct:8,color:'#7c3aed'},
]

const BAND_CFG = {'Within Range':{c:'#10b981',bg:'#f0fdf4'},'Below Range':{c:'#f59e0b',bg:'#fffbeb'},'Above Range':{c:'#ef4444',bg:'#fef2f2'}}

export default function CompensationAnalyticsPage() {
  const [search, setSearch] = useState('')
  const [ctx, setCtx] = useState(null)

  const filtered = COMPA_RATIO_DATA.filter(c=>!search||c.employee.toLowerCase().includes(search.toLowerCase()))
  const belowRangeCount = COMPA_RATIO_DATA.filter(c=>c.band==='Below Range').length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📈" title="Compensation Analytics"
        breadcrumb="Workforce Operations > Payroll & Compensation > Payroll Analytics"
        gradient={G}
        stats={[
          {icon:'📊',label:'Avg Compa-Ratio',   value:'0.98'},
          {icon:'⚠',label:'Below Range',        value:belowRangeCount},
          {icon:'⚖',label:'Pay Gap',            value:PAY_EQUITY.gender_pay_gap_pct+'%'},
          {icon:'🚨',label:'Flagged Disparities', value:PAY_EQUITY.flagged_disparities},
        ]}
        onAdd={()=>{}} addLabel="Run Pay Equity Audit" onExcel={()=>{}}/>

      <div style={{background:'#faf5ff',border:'1px solid #e9d5ff',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#581c87',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>📈</span>
        <div style={{flex:1,minWidth:200}}><strong>Strategic, Not Just Administrative:</strong> Compa-Ratio measures salary positioning against the range midpoint (1.0 = at midpoint). Total Rewards looks beyond base pay to the full cost of employment. Pay equity audits run automatically to flag unexplained variance by role and level.</div>
      </div>

      {/* Compa-Ratio table */}
      <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:10}}>📊 Compa-Ratio Analysis</div>
      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,overflow:'hidden',marginTop:10,marginBottom:20}}>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
            <thead><tr style={{background:'#f8fafc'}}>{['Employee','Dept','Grade','Current Salary','Range Midpoint','Compa-Ratio','Band'].map(h=><th key={h} style={{padding:'10px 12px',textAlign:'left',fontSize:9,fontWeight:800,color:A,whiteSpace:'nowrap'}}>{h}</th>)}</tr></thead>
            <tbody>{filtered.map((c,i)=>{
              const bc = BAND_CFG[c.band]
              return (
                <tr key={i} style={{borderBottom:'1px solid #f8fafc'}}
                  onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:c.employee,...c,impact_links:['Salary Structure']}})}}>
                  <td style={{padding:'9px 12px',fontWeight:700,color:'#0f172a'}}>{c.employee}</td>
                  <td style={{padding:'9px 12px',color:'#64748b'}}>{c.dept}</td>
                  <td style={{padding:'9px 12px',color:'#94a3b8'}}>{c.grade}</td>
                  <td style={{padding:'9px 12px',color:'#3b82f6'}}>NPR {c.current_salary_npr.toLocaleString()}</td>
                  <td style={{padding:'9px 12px',color:'#94a3b8'}}>NPR {c.range_midpoint_npr.toLocaleString()}</td>
                  <td style={{padding:'9px 12px',fontWeight:800,color:bc.c}}>{c.compa_ratio.toFixed(2)}</td>
                  <td style={{padding:'9px 12px'}}><span style={{background:bc.bg,color:bc.c,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{c.band}</span></td>
                </tr>
              )
            })}</tbody>
          </table>
        </div>
      </div>

      {/* 9-box performance-to-payout matrix */}
      <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:10}}>🎯 9-Box Performance-to-Payout Matrix</div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:20}}>
        {NINE_BOX.map((b,i)=>(
          <div key={i}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:`${b.perf} Perf / ${b.potential} Potential`,impact_links:['Performance Review','Bonus Processing']}})}}
            style={{background:`${b.color}10`,border:`1.5px solid ${b.color}33`,borderRadius:12,padding:'14px',textAlign:'center'}}>
            <div style={{fontSize:9,color:'#64748b',marginBottom:4}}>{b.perf} Perf / {b.potential} Potential</div>
            <div style={{fontSize:20,fontWeight:900,color:b.color}}>{b.count}</div>
            <div style={{fontSize:9,color:'#94a3b8',marginTop:4}}>Avg increase: {b.avg_increase_pct}%</div>
          </div>
        ))}
      </div>

      {/* Pay equity + Total rewards side by side */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:14}}>
        <div style={{background:'#fff',border:'1px solid #fecaca',borderRadius:16,padding:'18px 20px'}}>
          <div style={{fontSize:12,fontWeight:800,color:'#991b1b',marginBottom:10}}>⚖ Pay Equity Audit</div>
          <div style={{fontSize:22,fontWeight:900,color:'#ef4444'}}>{PAY_EQUITY.gender_pay_gap_pct}%</div>
          <div style={{fontSize:9,color:'#94a3b8',marginBottom:10}}>Overall gender pay gap . {PAY_EQUITY.departments_audited} departments audited</div>
          <div style={{background:'#fef2f2',borderRadius:8,padding:'8px 12px',fontSize:10,color:'#991b1b'}}>{PAY_EQUITY.flagged_detail}</div>
        </div>
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px 20px'}}>
          <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:10}}>💰 Total Rewards Breakdown</div>
          {TOTAL_REWARDS.map((r,i)=>(
            <div key={i} style={{marginBottom:8}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:10,marginBottom:3}}>
                <span style={{color:'#64748b'}}>{r.component}</span><span style={{fontWeight:700,color:r.color}}>{r.pct}%</span>
              </div>
              <div style={{height:6,background:'#f1f5f9',borderRadius:6,overflow:'hidden'}}><div style={{width:`${r.pct}%`,height:'100%',background:r.color,borderRadius:6}}/></div>
            </div>
          ))}
        </div>
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Compa-ratios below 0.90 auto-flagged for compensation review during the next cycle.','9-box increases auto-link to Bonus Processing for the upcoming pay run.','Pay equity audit runs automatically each quarter, flagging unexplained variance by role and level.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Detail',key:'view'},{icon:'📤',label:'Export',key:'export'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}
