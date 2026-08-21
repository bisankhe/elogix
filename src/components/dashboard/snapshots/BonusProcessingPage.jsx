// FILE: BonusProcessingPage.jsx - Bonus Processing (Payroll Processing)
// Discretionary vs non-discretionary split, mid-cycle proration, Festival
// Allowance statutory tracker (1 month basic/year), wizard-style bonus entry.

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fdba74 100%)'
const A = '#c2410c'

const BONUSES = [
  { id:'b1', employee:'Gita Maharjan', dept:'IT', bonus_type:'Festival Allowance (Dashain)', category:'non_discretionary',
    amount_npr:85000, proration_pct:100, basis:'1 month basic salary (statutory)', status:'approved',
    impact_links:['Allowance','Compliance Setup'] },
  { id:'b2', employee:'Anjali Sharma', dept:'Sales', bonus_type:'Performance Bonus Q2', category:'discretionary',
    amount_npr:25000, proration_pct:75, basis:'Joined mid-quarter - prorated 75% of full bonus', status:'pending',
    impact_links:['Performance Review'] },
  { id:'b3', employee:'Hari Thapa', dept:'IT', bonus_type:'Retention Bonus', category:'discretionary',
    amount_npr:50000, proration_pct:100, basis:'Lump sum, one-time', status:'approved',
    impact_links:[] },
]

const CATEGORY_CFG = {discretionary:{c:'#7c3aed',bg:'#f5f3ff',label:'Discretionary'},non_discretionary:{c:'#10b981',bg:'#f0fdf4',label:'Non-Discretionary'}}
const STATUS_CFG = {pending:{c:'#f59e0b',bg:'#fffbeb',label:'Pending'},approved:{c:'#10b981',bg:'#f0fdf4',label:'Approved'}}

export default function BonusProcessingPage() {
  const [bonuses, setBonuses] = useState(BONUSES)
  const [search, setSearch] = useState('')
  const [showWizard, setShowWizard] = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = bonuses.filter(b=>!search||b.employee.toLowerCase().includes(search.toLowerCase()))
  const totalBonus = bonuses.reduce((s,b)=>s+b.amount_npr*(b.proration_pct/100),0)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🎁" title="Bonus Processing"
        breadcrumb="Workforce Operations > Payroll & Compensation > Payroll Processing"
        gradient={G}
        stats={[
          {icon:'🎁',label:'Total Bonuses',  value:bonuses.length},
          {icon:'⚖',label:'Non-Discretionary',value:bonuses.filter(b=>b.category==='non_discretionary').length},
          {icon:'⏳',label:'Pending',          value:bonuses.filter(b=>b.status==='pending').length},
          {icon:'💰',label:'Total This Run',   value:'NPR '+totalBonus.toLocaleString()},
        ]}
        onAdd={()=>setShowWizard(true)} addLabel="Add Bonus"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#7c2d12',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>⚖</span>
        <div style={{flex:1,minWidth:200}}><strong>Festival Allowance (Statutory):</strong> Nepal LA2074 mandates 1 month's basic salary as festival bonus annually - non-discretionary, must be paid regardless of performance. Discretionary bonuses (performance/retention) do NOT require overtime-rate adjustment; non-discretionary ones legally must factor into the regular rate for OT calculations.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{display:'grid',gap:12,marginTop:14}}>
        {filtered.map(b=>{
          const cc = CATEGORY_CFG[b.category]
          const sc = STATUS_CFG[b.status]
          return (
            <div key={b.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:b.employee,...b}})}}
              style={{background:'#fff',border:`1.5px solid ${cc.c}33`,borderRadius:16,padding:'16px 18px',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${cc.c}`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:8,marginBottom:8}}>
                <div>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:3}}>
                    <span style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{b.employee}</span>
                    <span style={{background:cc.bg,color:cc.c,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{cc.label}</span>
                    <span style={{background:sc.bg,color:sc.c,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{sc.label}</span>
                  </div>
                  <div style={{fontSize:11,color:'#374151',fontWeight:600}}>{b.bonus_type}</div>
                  <div style={{fontSize:10,color:'#64748b'}}>{b.dept}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:16,fontWeight:900,color:A}}>NPR {(b.amount_npr*(b.proration_pct/100)).toLocaleString()}</div>
                  {b.proration_pct<100&&<div style={{fontSize:8,color:'#94a3b8'}}>{b.proration_pct}% of NPR {b.amount_npr.toLocaleString()}</div>}
                </div>
              </div>
              <div style={{fontSize:10,color:'#64748b'}}>{b.basis}</div>
            </div>
          )
        })}
      </div>

      {showWizard&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowWizard(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(580px,100%)',maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Add Bonus</div></div>
            <div style={{padding:'22px 28px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
                <Field label="Employee" value="" onChange={()=>{}} accent={A} required/>
                <Field label="Bonus Type" type="select" value="" onChange={()=>{}} accent={A} options={['Festival Allowance','Performance Bonus','Retention Bonus','Signing Bonus','Other']}/>
                <Field label="Category" type="select" value="" onChange={()=>{}} accent={A} options={['Discretionary','Non-Discretionary']}/>
                <Field label="Amount (NPR)" type="number" value="" onChange={()=>{}} accent={A} required/>
              </div>
              <Field label="Basis / Justification" type="textarea" value="" onChange={()=>{}} accent={A} hint="Voice input supported"/>
              <AIImpact color={A} lines={['Auto-prorates if employee joined mid-cycle, based on active days.','Non-discretionary bonuses auto-factor into the blended OT rate for the period.','Approved bonuses sync directly into the next Automated Payroll run.']}/>
              <div style={{display:'flex',gap:10,marginTop:8,flexWrap:'wrap'}}>
                <button onClick={()=>setShowWizard(false)} style={{flex:1,minWidth:140,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Add Bonus</button>
                <button onClick={()=>setShowWizard(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Detail',key:'view'},{icon:'✅',label:'Approve',key:'approve'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Bonus Processing" columns={['Employee','Department','Bonus Type','Category','Amount NPR','Proration %','Status']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
    </div>
  )
