// FILE: TrainingNeedsIdentificationPage.jsx - Training Needs Identification
// (Performance & Talent > Talent Development > Learning & Development)
// The SPOTTING layer: automated skill-gap mapping (current vs required
// competency), self-service flagging, manager pulse surveys. Distinct
// from Training Needs Analysis (the diagnostic/prioritization layer).

import { useState } from 'react'
import { Field, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#0c4a6e 0%,#0284c7 60%,#7dd3fc 100%)'
const A = '#0284c7'

const IDENTIFIED_NEEDS = [
  { id:'n1', employee:'Hari Thapa', dept:'IT', source:'Automated Skill-Gap Mapping',
    competency:'Cloud Architecture', current_level:3, required_level:7, gap:4,
    flagged_by:'System (role profile comparison)', status:'new', impact_links:['Behaviour Evaluation','Skill Gap Matrix'] },
  { id:'n2', employee:'Anjali Sharma', dept:'Sales', source:'Self-Flagged',
    competency:'Strategic Negotiation', current_level:5, required_level:8, gap:3,
    flagged_by:'Self (career goal update)', status:'new', impact_links:[] },
  { id:'n3', employee:'IT Department (Team)', dept:'IT', source:'Manager Pulse Survey',
    competency:'DevOps / CI-CD Practices', current_level:4, required_level:7, gap:3,
    flagged_by:'Sushila Gurung (Ops Lead)', status:'reviewed', impact_links:['Training Needs Analysis'] },
]

const SOURCE_CFG = {
  'Automated Skill-Gap Mapping':{c:'#7c3aed',icon:'🤖'},'Self-Flagged':{c:'#10b981',icon:'🙋'},'Manager Pulse Survey':{c:'#f59e0b',icon:'📋'},
const STATUS_CFG = {new:{c:'#f59e0b',bg:'#fffbeb',label:'New'},reviewed:{c:'#10b981',bg:'#f0fdf4',label:'Reviewed > Sent to TNA'}}

export default function TrainingNeedsIdentificationPage() {
  const [search, setSearch] = useState('')
  const [showWizard, setShowWizard] = useState(false)
  const [showSurvey, setShowSurvey] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = IDENTIFIED_NEEDS.filter(n=>!search||n.employee.toLowerCase().includes(search.toLowerCase()))
  const newCount = IDENTIFIED_NEEDS.filter(n=>n.status==='new').length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🔍" title="Training Needs Identification"
        breadcrumb="Performance & Talent Management > Talent Development > Learning & Development"
        gradient={G}
        stats={[
          {icon:'🔍',label:'Needs Identified',  value:IDENTIFIED_NEEDS.length},
          {icon:'🆕',label:'New This Month',     value:newCount},
          {icon:'🤖',label:'Auto-Detected',       value:IDENTIFIED_NEEDS.filter(n=>n.source==='Automated Skill-Gap Mapping').length},
          {icon:'➡',label:'Sent to TNA',          value:IDENTIFIED_NEEDS.filter(n=>n.status==='reviewed').length},
        ]}
        onAdd={()=>setShowWizard(true)} addLabel="Flag a Need"/>

      <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#1e40af',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>📐</span>
        <div style={{flex:1,minWidth:200}}><strong>Identification, Not Diagnosis:</strong> This page only spots WHERE a gap might exist - automated comparison of current vs. required role competency, self-flagged career goals, or manager pulse surveys. Prioritization and curriculum decisions happen downstream in Training Needs Analysis.</div>
      </div>

      <div style={{display:'flex',gap:10,marginBottom:14,flexWrap:'wrap'}}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search by employee or team name..."/>
        <button onClick={()=>setShowSurvey(true)} style={{padding:'10px 18px',borderRadius:10,border:`1px solid ${A}33`,background:'#eff6ff',color:A,fontSize:11,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap'}}>📋 Launch Pulse Survey</button>
      </div>

      <div style={{display:'grid',gap:14,marginTop:14}}>
        {filtered.map(n=>{
          const sc = SOURCE_CFG[n.source]
          const stc = STATUS_CFG[n.status]
          return (
            <div key={n.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:n.employee,...n}})}}
              style={{background:'#fff',border:`1.5px solid ${stc.c}33`,borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${sc.c}`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',padding:'14px 18px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap',gap:10}}>
                <div>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:3}}>
                    <span style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{n.employee}</span>
                    <span style={{background:`${sc.c}15`,color:sc.c,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{sc.icon} {n.source}</span>
                    <span style={{background:stc.bg,color:stc.c,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{stc.label}</span>
                  </div>
                  <div style={{fontSize:10,color:'#64748b'}}>{n.dept} . {n.competency}</div>
                </div>
                <div style={{textAlign:'center',flexShrink:0}}>
                  <div style={{fontSize:16,fontWeight:900,color:'#ef4444'}}>-{n.gap}</div>
                  <div style={{fontSize:8,color:'#94a3b8',fontWeight:700}}>GAP LEVEL</div>
                </div>
              </div>
              <div style={{padding:'12px 18px'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:5,fontSize:9}}>
                  <span style={{color:'#94a3b8'}}>Current: {n.current_level}/10</span><span style={{color:'#94a3b8'}}>Required: {n.required_level}/10</span>
                </div>
                <div style={{height:8,background:'#f1f5f9',borderRadius:8,overflow:'hidden',position:'relative'}}>
                  <div style={{width:`${n.current_level*10}%`,height:'100%',background:'#94a3b8',borderRadius:8}}/>
                  <div style={{position:'absolute',left:`${n.required_level*10}%`,top:0,bottom:0,width:2,background:'#10b981'}}/>
                </div>
              </div>
              <div style={{padding:'8px 18px',fontSize:9,color:'#94a3b8'}}>Flagged by: {n.flagged_by}</div>
            </div>
          )
        })}
      </div>

      {showWizard&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowWizard(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(560px,100%)',maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Flag a Training Need</div></div>
            <div style={{padding:'22px 28px'}}>
              <Field label="Employee or Team" value="" onChange={()=>{}} accent={A} required/>
              <Field label="Competency / Skill Gap" value="" onChange={()=>{}} accent={A} required/>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
                <Field label="Current Level (1-10)" type="number" value="" onChange={()=>{}} accent={A}/>
                <Field label="Required Level (1-10)" type="number" value="" onChange={()=>{}} accent={A}/>
              </div>
              <Field label="Context / Reason" type="textarea" value="" onChange={()=>{}} accent={A} hint="Voice input supported"/>
              <AIImpact color={A} lines={['This raises objective signal - not a subjective preference survey.','Once reviewed, the need automatically routes to Training Needs Analysis for prioritization.','Notification sent to the employee and their reporting manager once logged.']}/>
              <div style={{display:'flex',gap:10,marginTop:8,flexWrap:'wrap'}}>
                <button onClick={()=>setShowWizard(false)} style={{flex:1,minWidth:140,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Log Need</button>
                <button onClick={()=>setShowWizard(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSurvey&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowSurvey(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(480px,100%)'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'18px 24px'}}><div style={{fontSize:15,fontWeight:900,color:'#fff'}}>Launch Pulse Survey</div></div>
            <div style={{padding:'20px 24px'}}>
              <Field label="Target Team / Department" type="select" value="" onChange={()=>{}} accent={A} options={['IT','Sales & Marketing','Finance','Customer Service']}/>
              <Field label="Question" value="What skill gaps are slowing your team down?" onChange={()=>{}} accent={A}/>
              <div style={{display:'flex',gap:10,marginTop:8}}>
                <button onClick={()=>setShowSurvey(false)} style={{flex:1,padding:12,borderRadius:10,border:'none',background:G,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>Send Survey</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Detail',key:'view'},{icon:'➡',label:'Send to TNA',key:'send'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
