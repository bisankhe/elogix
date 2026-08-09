// FILE: SalaryStructurePage.jsx - Salary Structure (Payroll & Compensation)
// Drag-drop-style component builder: Basic/Allowances/Deductions tree, live
// 60% basic-salary compliance gauge, gross-to-net preview.

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#1e1b4b 0%,#4338ca 60%,#818cf8 100%)'
const A = '#4338ca'

const STRUCTURES = [
  { id:'ss1', name:'Standard Tier A', applies_to:'Head Office Staff', basic_pct:62, components:[
      {name:'Basic Salary',type:'earning',calc:'62% of gross',amount_npr:37200},
      {name:'House Rent Allowance',type:'earning',calc:'20% of basic',amount_npr:7440},
      {name:'Dearness Allowance',type:'earning',calc:'Flat',amount_npr:5000},
      {name:'Festival Allowance (annual)',type:'earning',calc:'1 month basic / 12',amount_npr:3100},
      {name:'SSF Employee Contribution',type:'deduction',calc:'11% of basic',amount_npr:-4092},
      {name:'TDS (estimated)',type:'deduction',calc:'Progressive slab',amount_npr:-2100},
    ], gross_npr:60000, net_npr:46708, status:'active', impact_links:['Allowance','Deduction','Tax Setup'] },
  { id:'ss2', name:'Standard Tier B', applies_to:'Branch Outlet Staff', basic_pct:60, components:[
      {name:'Basic Salary',type:'earning',calc:'60% of gross',amount_npr:18000},
      {name:'Transport Allowance',type:'earning',calc:'Flat',amount_npr:2000},
      {name:'SSF Employee Contribution',type:'deduction',calc:'11% of basic',amount_npr:-1980},
    ], gross_npr:30000, net_npr:25770, status:'active', impact_links:[] },
]

export default function SalaryStructurePage() {
  const [structures, setStructures] = useState(STRUCTURES)
  const [search, setSearch] = useState('')
  const [showBuilder, setShowBuilder] = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = structures.filter(s=>!search||s.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🧱" title="Salary Structure"
        breadcrumb="Workforce Operations > Payroll & Compensation > Payroll Setup"
        gradient={G}
        stats={[
          {icon:'🧱',label:'Structures',       value:structures.length},
          {icon:'⚖',label:'Basic % Compliant', value:structures.filter(s=>s.basic_pct>=60).length+'/'+structures.length},
          {icon:'🔒',label:'Access Level',       value:'Restricted'},
          {icon:'💰',label:'Avg Gross',          value:'NPR '+Math.round(structures.reduce((s,x)=>s+x.gross_npr,0)/structures.length).toLocaleString()},
        ]}
        onAdd={()=>setShowBuilder(true)} addLabel="Build Structure"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'#eef2ff',border:'1px solid #c7d2fe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#3730a3',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🔒</span>
        <div style={{flex:1,minWidth:220}}><strong>Restricted Access:</strong> Salary structure data is visible only to HR Admin and Finance roles. Rule 77, Nepal Labour Rules 2075: Basic Salary must be ≥60% of total monthly remuneration - the gauge below auto-validates every structure against this floor.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search structures..."/>

      <div style={{display:'grid',gap:16,marginTop:14}}>
        {filtered.map(s=>{
          const compliant = s.basic_pct >= 60
          return (
            <div key={s.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:s.name,...s}})}}
              style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'16px 20px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap',gap:10}}>
                <div>
                  <div style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{s.name}</div>
                  <div style={{fontSize:10,color:'#64748b'}}>{s.applies_to}</div>
                </div>
                <div style={{display:'flex',gap:14,alignItems:'center'}}>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:9,color:'#94a3b8'}}>Basic % Compliance</div>
                    <div style={{display:'flex',alignItems:'center',gap:6}}>
                      <div style={{width:60,height:8,background:'#f1f5f9',borderRadius:8,overflow:'hidden'}}>
                        <div style={{width:`${Math.min(s.basic_pct,100)}%`,height:'100%',background:compliant?'#10b981':'#ef4444',borderRadius:8}}/>
                      </div>
                      <span style={{fontSize:12,fontWeight:800,color:compliant?'#10b981':'#ef4444'}}>{s.basic_pct}%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{padding:'14px 20px'}}>
                {s.components.map((c,i)=>(
                  <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 0',borderBottom:i<s.components.length-1?'1px solid #f8fafc':'none',flexWrap:'wrap',gap:6}}>
                    <div style={{display:'flex',gap:8,alignItems:'center',minWidth:160}}>
                      <span style={{width:6,height:6,borderRadius:'50%',background:c.type==='earning'?'#10b981':'#ef4444',flexShrink:0}}/>
                      <span style={{fontSize:11,color:'#374151'}}>{c.name}</span>
                    </div>
                    <span style={{fontSize:9,color:'#94a3b8'}}>{c.calc}</span>
                    <span style={{fontSize:11,fontWeight:700,color:c.type==='earning'?'#10b981':'#ef4444'}}>{c.amount_npr>=0?'+':''}{c.amount_npr.toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <div style={{display:'flex',justifyContent:'space-between',padding:'12px 20px',background:'#f8fafc',flexWrap:'wrap',gap:10}}>
                <div><span style={{fontSize:9,color:'#94a3b8'}}>GROSS</span><div style={{fontSize:15,fontWeight:900,color:'#0f172a'}}>NPR {s.gross_npr.toLocaleString()}</div></div>
                <div><span style={{fontSize:9,color:'#94a3b8'}}>NET PAY</span><div style={{fontSize:15,fontWeight:900,color:A}}>NPR {s.net_npr.toLocaleString()}</div></div>
              </div>
            </div>
          )
        })}
      </div>

      {showBuilder&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowBuilder(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(620px,100%)',maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Salary Structure Builder</div></div>
            <div style={{padding:'22px 28px'}}>
              <Field label="Structure Name" value="" onChange={()=>{}} accent={A} required/>
              <Field label="Applies To Pay Group" type="select" value="" onChange={()=>{}} accent={A} options={['Head Office Staff','Branch Outlet Staff','Field Sales Team']}/>
              <div style={{background:'#f8fafc',borderRadius:10,padding:'12px 14px',margin:'10px 0',fontSize:10,color:'#64748b'}}>
                Drag components below or use + Add Component. Basic Salary auto-locks at ≥60% of gross.
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
                <Field label="Basic Salary %" type="number" value="60" onChange={()=>{}} accent={A}/>
                <Field label="Gross Monthly (NPR)" type="number" value="" onChange={()=>{}} accent={A}/>
              </div>
              <AIImpact color={A} lines={['Auto-blocks saving if Basic Salary falls below the 60% statutory floor.','Live gross-to-net preview updates as you add/remove components.','Syncs instantly to Tax Setup for accurate TDS calculation.']}/>
              <div style={{display:'flex',gap:10,marginTop:8,flexWrap:'wrap'}}>
                <button onClick={()=>setShowBuilder(false)} style={{flex:1,minWidth:140,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Save Structure</button>
                <button onClick={()=>setShowBuilder(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Breakdown',key:'view'},{icon:'✏',label:'Edit',key:'edit'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},{icon:'📤',label:'Export',key:'export'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Salary Structures" columns={['Structure Name','Applies To','Basic %','Gross NPR','Net NPR','Status']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[NepHR Import]", f.name, result); }}/>}
    </div>
  )
}
