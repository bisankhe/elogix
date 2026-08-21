// FILE: ConflictResolutionPage.jsx - Conflict Resolution
// (Employee Experience & Culture > Employee Relations)
// Kanban/timeline workflow: Submitted -> Assigned -> Under Investigation
// -> Mediation -> Closed. Secure mediation log, immutable audit trail.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fdba74 100%)'
const A = '#c2410c'

const STAGES = ['Submitted','Assigned','Under Investigation','Mediation','Closed']

const CASES = [
  { id:'cr1', parties:'Ramesh KC & Sushila Gurung', issue:'Recurring scheduling disagreement', stage_idx:3, mediator:'HR Manager',
    timeline:[
      {stage:'Submitted',date:'2025-06-10',note:'Initial report filed by team lead.'},
      {stage:'Assigned',date:'2025-06-11',note:'Assigned to HR Manager for mediation.'},
      {stage:'Under Investigation',date:'2025-06-13',note:'Statements collected from both parties.'},
      {stage:'Mediation',date:'2025-06-18',note:'First joint mediation session held -- partial agreement reached.'},
    ], impact_links:['Complaint Management'] },
]

export default function ConflictResolutionPage() {
  const [search, setSearch] = useState('')
  const [selectedCase, setSelectedCase] = useState(null)
  const [ctx, setCtx] = useState(null)

  const filtered = CASES.filter(c=>!search||c.parties.toLowerCase().includes(search.toLowerCase()))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🤝" title="Conflict Resolution"
        breadcrumb="Employee Experience & Culture > Employee Relations"
        gradient={G}
        stats={[
          {icon:'🤝',label:'Active Mediations',  value:CASES.filter(c=>c.stage_idx<4).length},
          {icon:'✅',label:'Closed',                value:CASES.filter(c=>c.stage_idx===4).length},
          {icon:'📋',label:'Audit Entries Logged',    value:CASES.reduce((s,c)=>s+c.timeline.length,0)},
          {icon:'🔒',label:'Confidentiality',           value:'Mediator-Only'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#7c2d12',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>📋</span>
        <div style={{flex:1,minWidth:200}}><strong>An Immutable Case File:</strong> Every mediation session, statement, and action plan is logged chronologically and cannot be edited after the fact -- protecting both the company and the employees involved if the matter ever escalates to the Labour Office.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by parties involved..."/>

      <div style={{display:'grid',gap:16,marginTop:14}}>
        {filtered.map(c=>(
          <div key={c.id} onClick={()=>setSelectedCase(c)}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:c.parties,...c}})}}
            style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${A}`,cursor:'pointer'}}>
            <div style={{padding:'14px 18px',borderBottom:'1px solid #f1f5f9'}}>
              <div style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{c.parties}</div>
              <div style={{fontSize:10,color:'#64748b'}}>{c.issue} . Mediator: {c.mediator}</div>
            </div>
            {/* Stage progress bar */}
            <div style={{padding:'14px 18px',display:'flex',gap:4}}>
              {STAGES.map((s,i)=>(
                <div key={s} style={{flex:1,textAlign:'center'}}>
                  <div style={{height:6,borderRadius:6,background:i<=c.stage_idx?A:'#f1f5f9'}}/>
                  <div style={{fontSize:7,color:i<=c.stage_idx?A:'#94a3b8',fontWeight:i===c.stage_idx?700:400,marginTop:4}}>{s}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {selectedCase&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:5000,display:'flex',justifyContent:'flex-end'}} onClick={()=>setSelectedCase(null)}>
          <div style={{background:'#fff',width:'min(440px,100%)',height:'100%',overflow:'auto',boxShadow:'-4px 0 24px rgba(0,0,0,.15)'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 24px'}}>
              <div style={{fontSize:16,fontWeight:900,color:'#fff'}}>{selectedCase.parties}</div>
              <div style={{fontSize:11,color:'rgba(255,255,255,.8)',marginTop:4}}>{selectedCase.issue}</div>
            </div>
            <div style={{padding:'20px 24px'}}>
              <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:14}}>Case Timeline</div>
              {selectedCase.timeline.map((t,i)=>(
                <div key={i} style={{display:'flex',gap:12,marginBottom:14}}>
                  <div style={{width:10,height:10,borderRadius:10,background:A,marginTop:3,flexShrink:0}}/>
                  <div>
                    <div style={{fontSize:10,fontWeight:700,color:'#0f172a'}}>{t.stage} . {t.date}</div>
                    <div style={{fontSize:10,color:'#374151',marginTop:2}}>{t.note}</div>
                  </div>
                </div>
              ))}
              <button style={{width:'100%',padding:13,borderRadius:10,border:'none',background:G,color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer',marginTop:10}}>+ Log Mediation Update</button>
            </div>
          </div>
        </div>
      )}

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['AI flags recurring conflict patterns by department to enable proactive intervention before formal complaints are filed.','Secure virtual mediation rooms log all communication automatically -- nothing is lost to email threads.','Cases stalled in one stage for 14+ days auto-escalate to senior HR leadership.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Case File',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
