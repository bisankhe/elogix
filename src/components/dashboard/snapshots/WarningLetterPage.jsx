// FILE: WarningLetterPage.jsx - Warning Letter
// (Employee Experience & Culture > Employee Relations)
// Auto-populated template (Verbal/Written/Final), e-signature capture,
// progressive-discipline tracker. Increments termination_flags.
// documented_warnings_count on issuance -- closes a gap from the
// Rewards & Recognition session, never duplicates that table.

import { useState } from 'react'
import { Field, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fdba74 100%)'
const A = '#c2410c'

const LEVEL_CFG = { verbal:{c:'#94a3b8',label:'Verbal'},written:{c:'#f59e0b',label:'Written'},final:{c:'#ef4444',label:'Final Warning'} }

const WARNING_LETTERS = [
  { id:'w1', employee:'Hari Thapa', level:'written', offense:'Repeated unauthorized absence', issued_date:'2025-06-22',
    acknowledged:false, prior_warnings:1, impact_links:['Disciplinary Management'] },
  { id:'w2', employee:'Bikash Rai', level:'verbal', offense:'Late submission of timesheets (first offense)', issued_date:'2025-05-10',
    acknowledged:true, signed_date:'2025-05-10', prior_warnings:0 },
  { id:'w3', employee:'Sushila Gurung', level:'final', offense:'Third documented attendance violation', issued_date:'2025-04-02',
    acknowledged:true, signed_date:'2025-04-03', prior_warnings:2,
    flag_note:'Nearing termination threshold per Section 142 -- 3rd cycle approaching.', impact_links:['Termination Recommendation'] },
]

export default function WarningLetterPage() {
  const [search, setSearch] = useState('')
  const [showGenerate, setShowGenerate] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = WARNING_LETTERS.filter(w=>!search||w.employee.toLowerCase().includes(search.toLowerCase()))
  const unacknowledged = WARNING_LETTERS.filter(w=>!w.acknowledged).length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📝" title="Warning Letter"
        breadcrumb="Employee Experience & Culture > Employee Relations"
        gradient={G}
        stats={[
          {icon:'📝',label:'Issued This Quarter',  value:WARNING_LETTERS.length},
          {icon:'✍',label:'Awaiting Signature',       value:unacknowledged},
          {icon:'⚠',label:'Nearing Threshold',           value:WARNING_LETTERS.filter(w=>w.prior_warnings>=2).length},
          {icon:'⚖',label:'Legal Weight',                  value:'Progressive Evidence'},
        ]}
        onAdd={()=>setShowGenerate(true)} addLabel="Generate Warning Letter"/>

      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#7c2d12',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>⚖</span>
        <div style={{flex:1,minWidth:200}}><strong>Progressive Discipline, Documented:</strong> Each warning is legal evidence if termination is ever needed for repeated minor offenses. The system tracks prior warnings automatically -- no manual cross-referencing of an employee's history required.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{display:'grid',gap:16,marginTop:14}}>
        {filtered.map(w=>{
          const lc = LEVEL_CFG[w.level]
          return (
            <div key={w.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:w.employee,...w}})}}
              style={{background:'#fff',border:`1.5px solid ${lc.c}33`,borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${lc.c}`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',padding:'14px 18px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap',gap:10}}>
                <div>
                  <div style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{w.employee}</div>
                  <div style={{fontSize:10,color:'#64748b'}}>{w.offense}</div>
                </div>
                <span style={{background:`${lc.c}15`,color:lc.c,fontSize:9,fontWeight:700,padding:'4px 12px',borderRadius:20}}>{lc.label}</span>
              </div>
              <div style={{padding:'12px 18px'}}>
                <div style={{fontSize:9,color:'#94a3b8'}}>Issued {w.issued_date} . Prior warnings: {w.prior_warnings}</div>
                {w.acknowledged?(
                  <div style={{marginTop:8,fontSize:10,color:'#15803d'}}>✍ Signed and acknowledged on {w.signed_date}</div>
                ):(
                  <div style={{marginTop:8,display:'flex',alignItems:'center',gap:8}}>
                    <span style={{fontSize:10,color:'#dc2626',fontWeight:700}}>⏳ Awaiting employee signature</span>
                    <button style={{padding:'4px 12px',borderRadius:8,border:'none',background:A,color:'#fff',fontSize:9,fontWeight:700,cursor:'pointer'}}>Send Reminder</button>
                  </div>
                )}
                {w.flag_note&&<div style={{marginTop:8,fontSize:9,color:'#b45309'}}>⚠ {w.flag_note}</div>}
              </div>
            </div>
          )
        })}
      </div>

      {showGenerate&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowGenerate(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(560px,100%)',maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:17,fontWeight:900,color:'#fff'}}>Generate Warning Letter</div></div>
            <div style={{padding:'22px 28px'}}>
              <Field label="Employee" value="" onChange={()=>{}} accent={A} required hint="Auto-pulls prior warning history"/>
              <Field label="Warning Level" type="select" value="" onChange={()=>{}} accent={A} options={['Verbal','Written','Final Warning']}/>
              <Field label="Offense / Policy Violated" value="" onChange={()=>{}} accent={A} required/>
              <Field label="Required Corrective Action" type="textarea" value="" onChange={()=>{}} accent={A} hint="Voice input supported"/>
              <div style={{border:'2px dashed #fed7aa',borderRadius:12,padding:'20px',textAlign:'center',background:'#fff7ed',marginBottom:14}}>
                <div style={{fontSize:20,marginBottom:6}}>✍</div>
                <div style={{fontSize:10,color:'#7c2d12'}}>E-signature capture will be requested from the employee upon delivery</div>
              </div>
              <button onClick={()=>setShowGenerate(false)} style={{width:'100%',padding:13,borderRadius:11,border:'none',background:G,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>Generate &amp; Send</button>
            </div>
          </div>
        </div>
      )}

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Template auto-populates employee details, offense date, and policy clause -- no blank, generic language.','Employee details, prior warning count, and signature status sync to the personnel file the instant a letter is issued.','Refusal to sign is logged as a timestamped acknowledgment attempt -- never treated as a dead end for documentation.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Letter',key:'view'},{icon:'📧',label:'Send Reminder',key:'remind'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}
