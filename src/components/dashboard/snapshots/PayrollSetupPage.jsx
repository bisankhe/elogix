// FILE: PayrollSetupPage.jsx - Payroll Setup (Payroll & Compensation)
// Foundation config: pay cycle, pay groups, rounding rules, absence-redistribution
// policy (team-pool sharing of absent employee's basic salary), night allowance toggle.

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#052e16 0%,#15803d 60%,#86efac 100%)'
const A = '#15803d'

const PAY_CYCLE_CFG = { frequency:'Monthly', pay_day:'Last working day of the month', cutoff_day:'25th', currency:'NPR' }

const PAY_GROUPS = [
  { id:'pg1', name:'Head Office Staff', employee_count:142, pay_frequency:'Monthly', salary_structure:'Standard Tier A', status:'active', impact_links:['Salary Structure','Tax Setup'] },
  { id:'pg2', name:'Branch Outlet Staff', employee_count:68, pay_frequency:'Monthly', salary_structure:'Standard Tier B', status:'active', impact_links:[] },
  { id:'pg3', name:'Field Sales Team', employee_count:24, pay_frequency:'Monthly + Commission', salary_structure:'Variable Tier', status:'active', impact_links:['Allowance'] },
]

export default function PayrollSetupPage() {
  const [payGroups, setPayGroups] = useState(PAY_GROUPS)
  const [search, setSearch] = useState('')
  const [absenceRedistribution, setAbsenceRedistribution] = useState(true)
  const [nightAllowance, setNightAllowance] = useState(true)
  const [showWizard, setShowWizard] = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = payGroups.filter(p=>!search||p.name.toLowerCase().includes(search.toLowerCase()))
  const totalEmployees = payGroups.reduce((s,p)=>s+p.employee_count,0)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="⚙" title="Payroll Setup"
        breadcrumb="Workforce Operations > Payroll & Compensation > Payroll Setup"
        gradient={G}
        stats={[
          {icon:'📅',label:'Pay Cycle',       value:PAY_CYCLE_CFG.frequency},
          {icon:'👥',label:'Pay Groups',       value:payGroups.length},
          {icon:'🧮',label:'Total Employees',  value:totalEmployees},
          {icon:'💱',label:'Currency',         value:PAY_CYCLE_CFG.currency},
        ]}
        onAdd={()=>setShowWizard(true)} addLabel="New Pay Group"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>⚖</span>
        <div style={{flex:1,minWidth:220}}><strong>Nepal Labour Act 2074:</strong> Basic Salary must comprise at least 60% of total monthly remuneration (Rule 77). Minimum wage NPR 19,550/month. Annual grade increment of at least half a day's basic salary is mandatory.</div>
      </div>

      {/* Pay cycle config */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px 20px',marginBottom:16}}>
        <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:12}}>📅 Pay Cycle Configuration</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:10}}>
          {Object.entries(PAY_CYCLE_CFG).map(([k,v])=>(
            <div key={k} style={{background:'#f8fafc',borderRadius:10,padding:'10px 12px'}}>
              <div style={{fontSize:9,color:'#94a3b8',marginBottom:3,textTransform:'capitalize'}}>{k.replace('_',' ')}</div>
              <div style={{fontSize:11,fontWeight:700,color:A}}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Special policy toggles - absence redistribution + night allowance */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:14,marginBottom:16}}>
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'16px 18px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
            <span style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>👥 Absence Salary Redistribution</span>
            <label style={{position:'relative',width:40,height:22,display:'inline-block',cursor:'pointer'}}>
              <input type="checkbox" checked={absenceRedistribution} onChange={()=>setAbsenceRedistribution(!absenceRedistribution)} style={{opacity:0,width:0,height:0}}/>
              <span style={{position:'absolute',inset:0,background:absenceRedistribution?A:'#cbd5e1',borderRadius:22,transition:'.2s'}}/>
              <span style={{position:'absolute',top:2,left:absenceRedistribution?20:2,width:18,height:18,background:'#fff',borderRadius:'50%',transition:'.2s'}}/>
            </label>
          </div>
          <div style={{fontSize:10,color:'#64748b'}}>When enabled, an absent employee's basic salary is pooled and distributed to covering teammates, weighted by their own salary % and grade level - an optional company policy beyond statutory minimums.</div>
        </div>
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'16px 18px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
            <span style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>🌙 Night Allowance</span>
            <label style={{position:'relative',width:40,height:22,display:'inline-block',cursor:'pointer'}}>
              <input type="checkbox" checked={nightAllowance} onChange={()=>setNightAllowance(!nightAllowance)} style={{opacity:0,width:0,height:0}}/>
              <span style={{position:'absolute',inset:0,background:nightAllowance?A:'#cbd5e1',borderRadius:22,transition:'.2s'}}/>
              <span style={{position:'absolute',top:2,left:nightAllowance?20:2,width:18,height:18,background:'#fff',borderRadius:'50%',transition:'.2s'}}/>
            </label>
          </div>
          <div style={{fontSize:10,color:'#64748b'}}>Extra company-policy allowance for night-shift duty, configured per Shift Management - separate from statutory overtime premium.</div>
        </div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search pay groups..."/>

      <div style={{display:'grid',gap:12,marginTop:14}}>
        {filtered.map(p=>(
          <div key={p.id}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:p.name,...p}})}}
            style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'14px 18px',display:'flex',alignItems:'center',gap:14,flexWrap:'wrap',boxShadow:'0 1px 6px rgba(0,0,0,.04)'}}>
            <div style={{flex:1,minWidth:160}}>
              <div style={{fontSize:13,fontWeight:800,color:'#0f172a'}}>{p.name}</div>
              <div style={{fontSize:10,color:'#64748b'}}>{p.salary_structure} . {p.pay_frequency}</div>
            </div>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:16,fontWeight:900,color:A}}>{p.employee_count}</div>
              <div style={{fontSize:8,color:'#94a3b8'}}>EMPLOYEES</div>
            </div>
            <span style={{background:'#f0fdf4',color:'#15803d',fontSize:9,fontWeight:700,padding:'3px 10px',borderRadius:20}}>✓ Active</span>
          </div>
        ))}
      </div>

      {showWizard&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowWizard(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(580px,100%)',maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:18,fontWeight:900,color:'#fff'}}>New Pay Group</div></div>
            <div style={{padding:'22px 28px'}}>
              <Field label="Pay Group Name" value="" onChange={()=>{}} accent={A} required/>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
                <Field label="Pay Frequency" type="select" value="" onChange={()=>{}} accent={A} options={['Monthly','Bi-Weekly','Weekly','Monthly + Commission']}/>
                <Field label="Salary Structure" type="select" value="" onChange={()=>{}} accent={A} options={['Standard Tier A','Standard Tier B','Variable Tier']}/>
              </div>
              <AIImpact color={A} lines={['Auto-syncs with Salary Structure, Tax Setup, and Allowance modules.','Absence redistribution policy applies per-group if enabled.','Pay cycle dates auto-populate the next Automated Payroll run.']}/>
              <div style={{display:'flex',gap:10,marginTop:8,flexWrap:'wrap'}}>
                <button onClick={()=>setShowWizard(false)} style={{flex:1,minWidth:140,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Create Pay Group</button>
                <button onClick={()=>setShowWizard(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Details',key:'view'},{icon:'✏',label:'Edit',key:'edit'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},{icon:'📤',label:'Export',key:'export'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Pay Groups" columns={['Pay Group Name','Employee Count','Pay Frequency','Salary Structure','Status']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
    </div>
  )
}
