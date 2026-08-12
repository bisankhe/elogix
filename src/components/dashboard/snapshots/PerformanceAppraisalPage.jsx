// FILE: PerformanceAppraisalPage.jsx - Performance Appraisal (Performance & Talent > Goal & Performance > Performance Evaluation)
// Goal-aligned formal appraisal (pulls KRA/KPI/OKR scores), self-assessment
// + manager assessment split, disagreement/appeal right, signed record.

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#581c87 0%,#7c3aed 60%,#c4b5fd 100%)'
const A = '#7c3aed'

const APPRAISALS = [
  { id:'a1', employee:'Gita Maharjan', dept:'IT', cycle:'Annual FY 2082/83', kra_avg:88, kpi_avg:92, okr_avg:75,
    self_rating:4, manager_rating:4, final_rating:4, status:'acknowledged', disagreement:false,
    criteria_communicated_at:'2025-04-01', impact_links:['KRA Management','Bonus Processing'] },
  { id:'a2', employee:'Bikash Rai', dept:'IT', cycle:'Annual FY 2082/83', kra_avg:62, kpi_avg:58, okr_avg:40,
    self_rating:3, manager_rating:2, final_rating:2, status:'disputed', disagreement:true,
    disagreement_note:'Employee believes Q3 sprint delays were due to unstaffed dependencies, not personal performance.',
    criteria_communicated_at:'2025-04-01', impact_links:['Workload Analysis','PIP Management'] },
  { id:'a3', employee:'Maya Pradhan', dept:'Finance', cycle:'Annual FY 2082/83', kra_avg:90, kpi_avg:87, okr_avg:0,
    self_rating:5, manager_rating:4, final_rating:4, status:'pending_manager', disagreement:false,
    criteria_communicated_at:'2025-04-01', impact_links:[] },
]

const STATUS_CFG = {
  pending_manager:{c:'#f59e0b',bg:'#fffbeb',label:'Pending Manager Review'},
  acknowledged:{c:'#10b981',bg:'#f0fdf4',label:'Acknowledged'},
  disputed:{c:'#ef4444',bg:'#fef2f2',label:'Disputed - Review Pending'},
}

export default function PerformanceAppraisalPage() {
  const [search, setSearch] = useState('')
  const [showWizard, setShowWizard] = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = APPRAISALS.filter(a=>!search||a.employee.toLowerCase().includes(search.toLowerCase()))
  const disputedCount = APPRAISALS.filter(a=>a.disagreement).length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📝" title="Performance Appraisal"
        breadcrumb="Performance & Talent Management > Goal & Performance > Performance Evaluation"
        gradient={G}
        stats={[
          {icon:'📝',label:'Active Appraisals',  value:APPRAISALS.length},
          {icon:'✅',label:'Acknowledged',         value:APPRAISALS.filter(a=>a.status==='acknowledged').length},
          {icon:'⚠',label:'Disputed',             value:disputedCount},
          {icon:'📅',label:'Cycle',                value:'Annual'},
        ]}
        onAdd={()=>setShowWizard(true)} addLabel="Start Appraisal"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'#faf5ff',border:'1px solid #e9d5ff',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#581c87',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>⚖</span>
        <div style={{flex:1,minWidth:200}}><strong>Goal-Aligned, Legally Defensible:</strong> Pulls live KRA/KPI/OKR scores rather than relying on manager memory. Criteria must be communicated before the period starts; employees have the right to formally dispute a rating. 3 consecutive unsatisfactory cycles are grounds for termination, with a mandatory 7-day explanation period.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{display:'grid',gap:16,marginTop:14}}>
        {filtered.map(a=>{
          const sc = STATUS_CFG[a.status]
          return (
            <div key={a.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:a.employee,...a}})}}
              style={{background:'#fff',border:`1.5px solid ${sc.c}33`,borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${sc.c}`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',padding:'14px 18px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap',gap:10}}>
                <div style={{flex:1,minWidth:200}}>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:3}}>
                    <span style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{a.employee}</span>
                    <span style={{background:sc.bg,color:sc.c,fontSize:10,fontWeight:700,padding:'2px 10px',borderRadius:20}}>{sc.label}</span>
                  </div>
                  <div style={{fontSize:10,color:'#64748b'}}>{a.dept} . {a.cycle}</div>
                </div>
                <div style={{textAlign:'center',flexShrink:0}}>
                  <div style={{fontSize:20,fontWeight:900,color:A}}>{a.final_rating}/5</div>
                  <div style={{fontSize:8,color:'#94a3b8',fontWeight:700}}>FINAL RATING</div>
                </div>
              </div>
              <div style={{padding:'12px 18px',display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:8}}>
                {[{l:'KRA Avg',v:a.kra_avg+'%',c:'#7c3aed'},{l:'KPI Avg',v:a.kpi_avg+'%',c:'#0284c7'},
                  {l:'OKR Avg',v:a.okr_avg>0?Math.round(a.okr_avg)+'%':'N/A',c:'#c2410c'},
                  {l:'Self Rating',v:a.self_rating+'/5',c:'#64748b'},{l:'Manager Rating',v:a.manager_rating+'/5',c:'#64748b'}].map((s,i)=>(
                  <div key={i} style={{textAlign:'center',background:'#f8fafc',borderRadius:8,padding:'8px 4px'}}>
                    <div style={{fontSize:11,fontWeight:800,color:s.c}}>{s.v}</div>
                    <div style={{fontSize:7,color:'#94a3b8',marginTop:2}}>{s.l}</div>
                  </div>
                ))}
              </div>
              {a.disagreement&&<div style={{padding:'10px 18px',background:'#fef2f2',fontSize:10,color:'#991b1b'}}><strong>⚠ Disagreement noted:</strong> {a.disagreement_note}</div>}
              <div style={{padding:'8px 18px',fontSize:9,color:'#94a3b8'}}>Criteria communicated: {a.criteria_communicated_at}</div>
            </div>
          )
        })}
      </div>

      {showWizard&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowWizard(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(600px,100%)',maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Start Performance Appraisal</div></div>
            <div style={{padding:'22px 28px'}}>
              <Field label="Employee" type="select" value="" onChange={()=>{}} accent={A} options={['Gita Maharjan','Bikash Rai','Maya Pradhan']}/>
              <Field label="Appraisal Cycle" type="select" value="" onChange={()=>{}} accent={A} options={['Annual FY 2082/83','Q3 2026 Mid-Cycle']}/>
              <div style={{background:'#f0fdf4',borderRadius:10,padding:'10px 14px',margin:'8px 0',fontSize:11,color:'#065f46'}}>
                📊 Auto-pulled: KRA avg 88%, KPI avg 92%, OKR avg 75% - review before finalizing.
              </div>
              <Field label="Manager Comments" type="textarea" value="" onChange={()=>{}} accent={A} hint="Voice input supported"/>
              <AIImpact color={A} lines={['Criteria communicated date is auto-stamped now - required before the period starts, per Section 112.','Employee will be notified and has the right to formally dispute the final rating.','Notification sent to the employee and their reporting manager once finalized.']}/>
              <div style={{display:'flex',gap:10,marginTop:8,flexWrap:'wrap'}}>
                <button onClick={()=>setShowWizard(false)} style={{flex:1,minWidth:140,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Initiate Appraisal</button>
                <button onClick={()=>setShowWizard(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Detail',key:'view'},{icon:'✏',label:'Edit Rating',key:'edit'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Performance Appraisal" columns={['Employee','Cycle','KRA Avg','KPI Avg','Self Rating','Manager Rating','Final Rating','Status']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
    </div>
  )
}
