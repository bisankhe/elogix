// FILE: BehaviourEvaluationPage.jsx - Behaviour Evaluation (Performance & Talent > Goal & Performance > Performance Evaluation)
// Soft-skill / culture-fit competency scoring - assesses HOW work is
// done, distinct from KRA/KPI (WHAT was achieved). Non-discriminatory
// standardized rubric across departments.

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fdba74 100%)'
const A = '#c2410c'

const BEHAVIOUR_DIMENSIONS = ['Communication','Teamwork','Adherence to Core Values','Adaptability','Integrity']

const EVALUATIONS = [
  { id:'b1', employee:'Anjali Sharma', dept:'Sales', cycle:'Q3 2026', scores:{Communication:8,Teamwork:9,'Adherence to Core Values':9,Adaptability:7,Integrity:9},
    overall_avg:8.4, evaluator:'Dipesh Bhattarai (Manager)', evidence_based:true, impact_links:['Performance Appraisal'] },
  { id:'b2', employee:'Hari Thapa', dept:'IT', cycle:'Q3 2026', scores:{Communication:5,Teamwork:6,'Adherence to Core Values':7,Adaptability:6,Integrity:8},
    overall_avg:6.4, evaluator:'Sushila Gurung (Manager)', evidence_based:true,
    impact_links:['Continuous Feedback','PIP Management'] },
]

export default function BehaviourEvaluationPage() {
  const [search, setSearch] = useState('')
  const [showWizard, setShowWizard] = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = EVALUATIONS.filter(e=>!search||e.employee.toLowerCase().includes(search.toLowerCase()))
  const flaggedCount = EVALUATIONS.filter(e=>e.overall_avg<6).length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🧭" title="Behaviour Evaluation"
        breadcrumb="Performance & Talent Management > Goal & Performance > Performance Evaluation"
        gradient={G}
        stats={[
          {icon:'🧭',label:'Evaluations',  value:EVALUATIONS.length},
          {icon:'📐',label:'Dimensions',    value:BEHAVIOUR_DIMENSIONS.length},
          {icon:'⚠',label:'Below Threshold',value:flaggedCount},
          {icon:'⚖',label:'Standard',       value:'Non-Discriminatory'},
        ]}
        onAdd={()=>setShowWizard(true)} addLabel="New Evaluation"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#7c2d12',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🎯</span>
        <div style={{flex:1,minWidth:200}}><strong>HOW, Not WHAT:</strong> Assesses soft skills and cultural alignment, distinct from KRA/KPI's output metrics. Must be evidence-based (specific cited behaviors, not vague impressions) and applied identically across departments - never based on gender, caste, religion, or age, per Nepal Labour Act 2074.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{display:'grid',gap:16,marginTop:14}}>
        {filtered.map(e=>(
          <div key={e.id}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:e.employee,...e}})}}
            style={{background:'#fff',border:`1.5px solid ${e.overall_avg<6?'#fecaca':'#e2e8f0'}`,borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${e.overall_avg<6?'#ef4444':'#10b981'}`}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',padding:'14px 18px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap',gap:10}}>
              <div>
                <div style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{e.employee}</div>
                <div style={{fontSize:10,color:'#64748b'}}>{e.dept} . {e.cycle} . by {e.evaluator}</div>
              </div>
              <div style={{textAlign:'center'}}>
                <div style={{fontSize:18,fontWeight:900,color:e.overall_avg<6?'#ef4444':'#10b981'}}>{e.overall_avg}/10</div>
                <div style={{fontSize:8,color:'#94a3b8',fontWeight:700}}>OVERALL</div>
              </div>
            </div>
            <div style={{padding:'12px 18px',display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(110px,1fr))',gap:8}}>
              {Object.entries(e.scores).map(([dim,score],i)=>(
                <div key={i} style={{textAlign:'center',background:'#f8fafc',borderRadius:8,padding:'8px 4px'}}>
                  <div style={{fontSize:13,fontWeight:800,color:score<6?'#ef4444':'#15803d'}}>{score}/10</div>
                  <div style={{fontSize:7,color:'#94a3b8',marginTop:2}}>{dim}</div>
                </div>
              ))}
            </div>
            {e.flag_note&&<div style={{padding:'10px 18px',background:'#fef2f2',fontSize:10,color:'#991b1b'}}><strong>⚠ Evidence cited:</strong> {e.flag_note}</div>}
          </div>
        ))}
      </div>

      {showWizard&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowWizard(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(560px,100%)',maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:18,fontWeight:900,color:'#fff'}}>New Behaviour Evaluation</div></div>
            <div style={{padding:'22px 28px'}}>
              <Field label="Employee" type="select" value="" onChange={()=>{}} accent={A} options={['Anjali Sharma','Hari Thapa']}/>
              {BEHAVIOUR_DIMENSIONS.map((dim,i)=>(
                <div key={i} style={{marginBottom:8}}>
                  <Field label={`${dim} (1-10)`} type="number" value="" onChange={()=>{}} accent={A}/>
                </div>
              ))}
              <Field label="Specific Evidence / Cited Behaviors" type="textarea" value="" onChange={()=>{}} accent={A} required hint="Required for any score below 6 - voice input supported"/>
              <AIImpact color={A} lines={['Scores below 6.0 require specific cited evidence - vague impressions are blocked.','Same rubric applied across every department for consistency.','Notification sent to the employee and their reporting manager once submitted.']}/>
              <div style={{display:'flex',gap:10,marginTop:8,flexWrap:'wrap'}}>
                <button onClick={()=>setShowWizard(false)} style={{flex:1,minWidth:140,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Submit Evaluation</button>
                <button onClick={()=>setShowWizard(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Behaviour Evaluation" columns={['Employee','Department','Communication','Teamwork','Core Values','Adaptability','Integrity','Overall Avg']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
    </div>
  )
