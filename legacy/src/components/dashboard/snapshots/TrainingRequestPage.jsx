// FILE: TrainingRequestPage.jsx - Training Request
// (Performance & Talent > Talent Development > Learning & Development)
// Page 3: self-service workflow closing the Matrix -> Analysis pipeline.
// Pre-populated form, Manager -> Dept Head -> L&D/Budget approval chain,
// real-time budget/seat visibility, auto-dispatch to LMS on approval.

import { useState } from 'react'
import { Field, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fdba74 100%)'
const A = '#c2410c'

const REQUESTS = [
  { id:'r1', employee:'Hari Thapa', skill_gap:'Cloud Architecture (gap of 4)', proposed_course:'AWS Solutions Architect',
    justification:'Will let our team reduce reliance on the external AWS consultant for Module 3 infrastructure work.',
    approval_chain:[{role:'Manager',status:'approved'},{role:'Dept Head',status:'approved'},{role:'L&D / Budget',status:'pending'}],
    estimated_cost_npr:45000, impact_links:['Skill Gap Analysis','Course Management'] },
  { id:'r2', employee:'Bikash Rai', skill_gap:'Leadership (gap of 4)', proposed_course:'New Manager Leadership Bootcamp',
    justification:'Preparing for the Senior Engineer track; addresses the 360 feedback blind spot directly.',
    approval_chain:[{role:'Manager',status:'approved'},{role:'Dept Head',status:'pending'},{role:'L&D / Budget',status:'not_started'}],
    estimated_cost_npr:28000, impact_links:['360 Degree Feedback'] },
]

const BUDGET_WIDGET = { allocated_npr:2400000, committed_npr:1820000, available_npr:580000 }

const STAGE_CFG = {approved:{c:'#10b981',icon:'✅'},pending:{c:'#f59e0b',icon:'⏳'},not_started:{c:'#cbd5e1',icon:'○'}}

export default function TrainingRequestPage() {
  const [search, setSearch] = useState('')
  const [showWizard, setShowWizard] = useState(false)
  const [ctx, setCtx] = useState(null)
  const budgetPct = Math.round(BUDGET_WIDGET.committed_npr/BUDGET_WIDGET.allocated_npr*100)

  const filtered = REQUESTS.filter(r=>!search||r.employee.toLowerCase().includes(search.toLowerCase()))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📝" title="Training Request"
        breadcrumb="Performance & Talent Management > Talent Development > Learning & Development"
        gradient={G}
        stats={[
          {icon:'📝',label:'Active Requests',  value:REQUESTS.length},
          {icon:'💰',label:'Budget Available',  value:'NPR '+BUDGET_WIDGET.available_npr.toLocaleString()},
          {icon:'⏳',label:'Pending Approval',   value:REQUESTS.filter(r=>r.approval_chain.some(a=>a.status==='pending')).length},
          {icon:'📊',label:'Budget Committed',    value:budgetPct+'%'},
        ]}
        onAdd={()=>setShowWizard(true)} addLabel="New Training Request"/>

      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#7c2d12',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>⚖</span>
        <div style={{flex:1,minWidth:200}}><strong>Audit-Ready Workflow:</strong> Per Nepal Labour Act, enterprises must formulate an annual training plan and document capacity-building spend. Every request here is traceable end-to-end - Manager {'>'} Dept Head {'>'} L&D/Budget - giving a statutory-compliance audit trail automatically.</div>
      </div>

      {/* Budget widget */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px',marginBottom:18}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:8,fontSize:12}}>
          <span style={{fontWeight:800,color:'#0f172a'}}>💰 L&D Budget Visibility</span>
          <span style={{fontWeight:800,color:A}}>NPR {BUDGET_WIDGET.committed_npr.toLocaleString()} / {BUDGET_WIDGET.allocated_npr.toLocaleString()}</span>
        </div>
        <div style={{height:12,background:'#f1f5f9',borderRadius:12,overflow:'hidden'}}><div style={{width:`${budgetPct}%`,height:'100%',background:budgetPct>90?'#ef4444':A,borderRadius:12}}/></div>
        <div style={{fontSize:9,color:'#94a3b8',marginTop:4}}>NPR {BUDGET_WIDGET.available_npr.toLocaleString()} available for new requests this fiscal year</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{display:'grid',gap:16,marginTop:14}}>
        {filtered.map(r=>(
          <div key={r.id}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:r.employee,...r}})}}
            style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${A}`}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',padding:'14px 18px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap',gap:10}}>
              <div>
                <div style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{r.employee}</div>
                <div style={{fontSize:10,color:'#64748b'}}>Gap: {r.skill_gap}</div>
              </div>
              <div style={{fontSize:14,fontWeight:900,color:A}}>NPR {r.estimated_cost_npr.toLocaleString()}</div>
            </div>
            <div style={{padding:'10px 18px',fontSize:11,fontWeight:700,color:'#0f172a'}}>📚 {r.proposed_course}</div>
            <div style={{padding:'4px 18px 10px',fontSize:10,color:'#374151'}}>{r.justification}</div>

            {/* Approval pipeline */}
            <div style={{padding:'10px 18px',display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}>
              {r.approval_chain.map((a,i)=>{
                const sc = STAGE_CFG[a.status]
                return (
                  <div key={i} style={{display:'flex',gap:6,alignItems:'center'}}>
                    <span style={{background:`${sc.c}15`,color:sc.c,fontSize:9,fontWeight:700,padding:'3px 10px',borderRadius:20}}>{sc.icon} {a.role}</span>
                    {i<r.approval_chain.length-1&&<span style={{color:'#cbd5e1'}}>{'>'}</span>}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {showWizard&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowWizard(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(600px,100%)',maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Submit Training Request</div></div>
            <div style={{padding:'22px 28px'}}>
              <div style={{background:'#f8fafc',borderRadius:10,padding:'10px 14px',marginBottom:10,fontSize:10,color:'#374151'}}>
                <strong>Auto-Populated:</strong> Employee: Hari Thapa . Role: Software Engineer . Dept: IT
              </div>
              <Field label="Identified Skill Gap" type="select" value="" onChange={()=>{}} accent={A} options={['Cloud Architecture (gap of 4)','Leadership (gap of 4)']} hint="Pulled from Skill Gap Analysis"/>
              <Field label="Proposed Training" type="select" value="" onChange={()=>{}} accent={A} options={['AWS Solutions Architect (Internal LMS)','Coursera: Cloud Engineering','LinkedIn Learning: AWS Fundamentals']}/>
              <Field label="Business Justification" type="textarea" value="" onChange={()=>{}} accent={A} required hint="Explain expected organizational impact - voice input supported"/>
              <Field label="Estimated Cost (NPR)" type="number" value="" onChange={()=>{}} accent={A}/>
              <AIImpact color={A} lines={['Budget availability checked automatically before submission.','Routes through Manager > Dept Head > L&D/Budget for sequential approval.','Approved requests auto-enroll the employee via Course Management - no separate LMS login step.']}/>
              <div style={{display:'flex',gap:10,marginTop:8,flexWrap:'wrap'}}>
                <button onClick={()=>setShowWizard(false)} style={{flex:1,minWidth:140,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Submit Request</button>
                <button onClick={()=>setShowWizard(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Detail',key:'view'},{icon:'✅',label:'Approve Next Stage',key:'approve'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}
