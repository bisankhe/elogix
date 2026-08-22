// FILE: DeductionPage.jsx - Deduction (Payroll & Compensation)
// Master deduction catalog: pre-tax/post-tax split, mandatory vs voluntary,
// auto cash-advance recovery (unrecovered after 1 month), 33% statutory cap guard.

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#581c87 0%,#7c3aed 60%,#c4b5fd 100%)'
const A = '#7c3aed'
const MAX_DEDUCTION_PCT = 33

const DEDUCTIONS = [
  { id:'d1', name:'SSF Employee Contribution', code:'SSF', timing:'pre_tax', mandatory:true, calc_value:'11% of basic', impact_links:['Letters - SSF','Compliance Setup'] },
  { id:'d2', name:'TDS (Tax Deducted at Source)', code:'TDS', timing:'pre_tax', mandatory:true, calc_value:'Progressive slab', impact_links:['Tax Setup'] },
  { id:'d3', name:'CIT Voluntary Contribution', code:'CIT', timing:'pre_tax', mandatory:false, calc_value:'Employee elected %', impact_links:['Letters - CIT'] },
  { id:'d4', name:'Cash Advance Recovery', code:'CAR', timing:'post_tax', mandatory:true, calc_value:'Auto-deducted if unrecovered >1 month', impact_links:['Cash Advance'] },
  { id:'d5', name:'Health Insurance Premium', code:'HIP', timing:'pre_tax', mandatory:false, calc_value:'NPR 20,000 cap', impact_links:[] },
  { id:'d6', name:'Loan/Garnishment', code:'LGR', timing:'post_tax', mandatory:false, calc_value:'As per agreement', impact_links:[] },
]
const TIMING_CFG = {pre_tax:{c:'#10b981',label:'Pre-Tax'},post_tax:{c:'#f59e0b',label:'Post-Tax'}}

export default function DeductionPage() {
  const [deductions, setDeductions] = useState(DEDUCTIONS)
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = deductions.filter(d=>!search||d.name.toLowerCase().includes(search.toLowerCase()))
  const mandatoryCount = deductions.filter(d=>d.mandatory).length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="➖" title="Deduction"
        breadcrumb="Workforce Operations > Payroll & Compensation > Payroll Setup"
        gradient={G}
        stats={[
          {icon:'➖',label:'Total Deductions', value:deductions.length},
          {icon:'⚖',label:'Mandatory',          value:mandatoryCount},
          {icon:'🎯',label:'Voluntary',          value:deductions.length-mandatoryCount},
          {icon:'🚧',label:'Statutory Cap',      value:MAX_DEDUCTION_PCT+'%'},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="Add Deduction"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'#faf5ff',border:'1px solid #e9d5ff',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#581c87',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>⚖</span>
        <div style={{flex:1,minWidth:220}}><strong>Nepal LA2074:</strong> Permitted deductions cover TDS, authorized absent days, and SSF - total deductions cannot exceed 33% of gross remuneration unless mutually agreed. <strong>Cash advances auto-recover</strong> from payroll if not cleared within 1 month of disbursement - no manual chase needed.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search deductions..."/>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:14,marginTop:14}}>
        {filtered.map(d=>{
          const tc = TIMING_CFG[d.timing]
          return (
            <div key={d.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:d.name,...d}})}}
              style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'16px 18px',boxShadow:'0 1px 6px rgba(0,0,0,.04)'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                <div>
                  <div style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{d.name}</div>
                  <div style={{fontSize:9,color:'#94a3b8'}}>Code: {d.code}</div>
                </div>
                {d.mandatory&&<span style={{background:'#fef2f2',color:'#dc2626',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>⚖ Mandatory</span>}
              </div>
              <div style={{background:'#f8fafc',borderRadius:8,padding:'8px 10px',marginBottom:8,fontSize:10,color:'#374151'}}><strong>{d.calc_value}</strong></div>
              <span style={{background:`${tc.c}15`,color:tc.c,fontSize:9,fontWeight:600,padding:'2px 8px',borderRadius:20}}>{tc.label}</span>
            </div>
          )
        })}
      </div>

      {showAdd&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowAdd(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(560px,100%)',maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Add Deduction</div></div>
            <div style={{padding:'22px 28px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
                <Field label="Deduction Name" value="" onChange={()=>{}} accent={A} required/>
                <Field label="Code" value="" onChange={()=>{}} accent={A}/>
                <Field label="Timing" type="select" value="" onChange={()=>{}} accent={A} options={['Pre-Tax','Post-Tax']}/>
                <Field label="Value/Formula" value="" onChange={()=>{}} accent={A}/>
              </div>
              <label style={{display:'flex',gap:8,alignItems:'center',margin:'10px 0',fontSize:12,color:'#374151',cursor:'pointer'}}>
                <input type="checkbox" style={{accentColor:A}}/> Mandatory deduction
              </label>
              <AIImpact color={A} lines={['Auto-blocks if total deductions would exceed the 33% statutory cap.','Cash advance deductions auto-trigger after the 1-month grace window.','Pre-tax deductions reduce taxable income before Tax Setup slab calculation.']}/>
              <div style={{display:'flex',gap:10,marginTop:8,flexWrap:'wrap'}}>
                <button onClick={()=>setShowAdd(false)} style={{flex:1,minWidth:140,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Add Deduction</button>
                <button onClick={()=>setShowAdd(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Details',key:'view'},{icon:'✏',label:'Edit',key:'edit'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},{icon:'📤',label:'Export',key:'export'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Deductions" columns={['Name','Code','Timing','Value/Formula','Mandatory']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
    </div>
  )
}
