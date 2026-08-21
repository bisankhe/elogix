// FILE: InsourceOutsourceCostReportPage.jsx - Insource vs Outsource Cost Report
// (Reports, Analytics & BI > HR Analytics)
// Pure aggregation comparing EXISTING payslips/recruitment_budget_lines
// (in-house cost) against vendor_master/vendor_employees_extended
// (outsourced cost) -- never a third calculation engine. The brief's
// explicit legal framing: this report is also the audit trail proving
// outsourced workers aren't quietly performing core functions.

import { useState } from 'react'
import { PageHeader, AIImpact, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#052e16 0%,#15803d 60%,#86efac 100%)'
const A = '#15803d'

const COST_BREAKDOWN = [
  {function:'Payroll Processing',insource_cost_npr:420000,outsource_cost_npr:380000,winner:'outsource'},
  {function:'Recruitment',insource_cost_npr:680000,outsource_cost_npr:910000,winner:'insource'},
  {function:'Facilities & Security',insource_cost_npr:0,outsource_cost_npr:660000,winner:'outsource',
   note:'No insourced baseline -- always outsourced (non-core, appropriately so).'},
  {function:'Software Development',insource_cost_npr:9600000,outsource_cost_npr:5904000,winner:'outsource',
   flag_note:'Outsourced dev cost appears lower, but this function is core to the business -- the savings comparison itself is a compliance red flag, not a win.'},
]

export default function InsourceOutsourceCostReportPage() {
  const [ctx, setCtx] = useState(null)
  const totalInsource = COST_BREAKDOWN.reduce((s,c)=>s+c.insource_cost_npr,0)
  const totalOutsource = COST_BREAKDOWN.reduce((s,c)=>s+c.outsource_cost_npr,0)
  const totalHeadcount = 312
  const costPerEmployee = Math.round((totalInsource+totalOutsource)/totalHeadcount)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="⚖" title="Insource vs Outsource Cost Report"
        breadcrumb="Reports, Analytics & BI > HR Analytics"
        gradient={G}
        stats={[
          {icon:'👤',label:'Total HR Cost / Employee',  value:'NPR '+costPerEmployee.toLocaleString()},
          {icon:'🏢',label:'Total In-House Cost',           value:'NPR '+(totalInsource/1000000).toFixed(1)+'M'},
          {icon:'🏭',label:'Total Outsourced Cost',             value:'NPR '+(totalOutsource/1000000).toFixed(1)+'M'},
          {icon:'⚠',label:'Compliance Flags',                      value:COST_BREAKDOWN.filter(c=>c.flag_note).length},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>⚖</span>
        <div style={{flex:1,minWidth:200}}><strong>Not Just a Savings Calculator:</strong> A function costing less outsourced isn't automatically a win -- if that function is core to the business, the comparison itself is the evidence a labour audit would look for. This report is the liability check as much as the cost check.</div>
      </div>

      <div style={{display:'grid',gap:16}}>
        {COST_BREAKDOWN.map((c,i)=>{
          const maxCost = Math.max(c.insource_cost_npr,c.outsource_cost_npr,1)
          return (
            <div key={i}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:c.function,...c,impact_links:['Vendor Billing Report']}})}}
              style={{background:'#fff',border:`1px solid ${c.flag_note?'#fed7aa':'#e2e8f0'}`,borderRadius:16,padding:'18px'}}>
              <div style={{fontSize:12,fontWeight:700,color:'#0f172a',marginBottom:10}}>{c.function}</div>
              <div style={{display:'grid',gap:8}}>
                <div>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:9,marginBottom:3}}>
                    <span style={{color:'#374151'}}>In-House</span><span style={{fontWeight:700,color:'#0284c7'}}>NPR {c.insource_cost_npr.toLocaleString()}</span>
                  </div>
                  <div style={{height:8,background:'#f1f5f9',borderRadius:8,overflow:'hidden'}}><div style={{width:`${c.insource_cost_npr/maxCost*100}%`,height:'100%',background:'#0284c7',borderRadius:8}}/></div>
                </div>
                <div>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:9,marginBottom:3}}>
                    <span style={{color:'#374151'}}>Outsourced</span><span style={{fontWeight:700,color:A}}>NPR {c.outsource_cost_npr.toLocaleString()}</span>
                  </div>
                  <div style={{height:8,background:'#f1f5f9',borderRadius:8,overflow:'hidden'}}><div style={{width:`${c.outsource_cost_npr/maxCost*100}%`,height:'100%',background:A,borderRadius:8}}/></div>
                </div>
              </div>
              {c.note&&<div style={{marginTop:8,fontSize:8,color:'#94a3b8'}}>ℹ {c.note}</div>}
              {c.flag_note&&<div style={{marginTop:8,fontSize:9,color:'#dc2626',fontWeight:600}}>🚨 {c.flag_note}</div>}
            </div>
          )
        })}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['In-house cost includes the true loaded total -- salary, recruitment, training, and system overhead -- never just a bare baseline salary comparison.','A core-business function showing as outsourced here cross-checks directly against the core-work flag in Vendor-wise Headcount.','This report is the documentation a Labour Office audit would request first -- kept current here, never assembled retroactively under pressure.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Breakdown',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
