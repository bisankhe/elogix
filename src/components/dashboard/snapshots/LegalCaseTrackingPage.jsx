// FILE: LegalCaseTrackingPage.jsx - Legal Case Tracking
// (Compliance & Risk Management > Legal Management)
// The litigation-stage continuation of grievances/complaints once they
// escalate past internal HR -- reuses the EXISTING grievances
// (labour_office_deadline/labour_court_deadline already computed) and
// complaints tables directly. Never a second intake system; this is
// the legal team's defensible case-file view for matters already at
// the Labour Office or Labour Court.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#1e1b4b 0%,#4338ca 60%,#818cf8 100%)'
const A = '#4338ca'

const STAGE_CFG = { labour_office:{c:'#f59e0b',label:'Labour Office'},labour_court:{c:'#ef4444',label:'Labour Court'},resolved:{c:'#10b981',label:'Resolved'} }

const LEGAL_CASES = [
  { id:'lc1', case_no:'LC-2025-003', source:'Grievance', employee:'Anjali Sharma', matter:'Unfair treatment in territory reassignment', stage:'labour_office',
    appeal_deadline:'2025-07-15', days_remaining:16, counsel:'External -- Pradhan & Associates', impact_links:['Grievance Management'] },
  { id:'lc2', case_no:'LC-2025-001', source:'Complaint', employee:'Confidential', matter:'Workplace harassment investigation outcome disputed', stage:'labour_court',
    appeal_deadline:'2025-08-01', days_remaining:33, counsel:'In-house Legal',
    flag_note:'Litigation hold active -- exiting-employee data freeze in effect per e-discovery protocol.', impact_links:['Complaint Management'] },
]

export default function LegalCaseTrackingPage() {
  const [search, setSearch] = useState('')
  const [ctx, setCtx] = useState(null)

  const filtered = LEGAL_CASES.filter(c=>!search||c.matter.toLowerCase().includes(search.toLowerCase())||c.case_no.toLowerCase().includes(search.toLowerCase()))
  const courtStage = LEGAL_CASES.filter(c=>c.stage==='labour_court').length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="⚖" title="Legal Case Tracking"
        breadcrumb="Compliance & Risk Management > Legal Management"
        gradient={G}
        stats={[
          {icon:'⚖',label:'Active Legal Cases',  value:LEGAL_CASES.length},
          {icon:'🏛',label:'At Labour Court',         value:courtStage},
          {icon:'🔒',label:'Litigation Holds Active',     value:LEGAL_CASES.filter(c=>c.flag_note).length},
          {icon:'⏰',label:'Next Appeal Deadline',            value:'16 days'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#eef2ff',border:'1px solid #c7d2fe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#3730a3',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🔗</span>
        <div style={{flex:1,minWidth:200}}><strong>The Litigation Continuation, Not a New Intake:</strong> Every case here started as a Grievance or Complaint -- this view exists for matters that escalated past internal HR resolution into the Labour Office or Labour Court, where legal counsel and a defensible case file matter most.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by case number or matter..."/>

      <div style={{display:'grid',gap:16,marginTop:14}}>
        {filtered.map(c=>{
          const sc = STAGE_CFG[c.stage]
          return (
            <div key={c.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:c.matter,...c}})}}
              style={{background:'#fff',border:`1.5px solid ${sc.c}33`,borderRadius:16,overflow:'hidden',borderLeft:`5px solid ${sc.c}`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',padding:'14px 18px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap',gap:10}}>
                <div>
                  <div style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{c.case_no}</div>
                  <div style={{fontSize:10,color:'#64748b'}}>{c.matter}</div>
                </div>
                <span style={{background:`${sc.c}15`,color:sc.c,fontSize:9,fontWeight:700,padding:'4px 12px',borderRadius:20}}>{sc.label}</span>
              </div>
              <div style={{padding:'12px 18px'}}>
                <div style={{fontSize:10,color:'#374151'}}>👤 {c.employee} . Originated as: {c.source}</div>
                <div style={{fontSize:10,color:'#374151',marginTop:4}}>⚖ Counsel: {c.counsel}</div>
                <div style={{marginTop:8,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontSize:9,color:'#94a3b8'}}>Appeal deadline: {c.appeal_deadline}</span>
                  <span style={{fontSize:9,fontWeight:700,color:c.days_remaining<=14?'#ef4444':'#10b981'}}>{c.days_remaining} days remaining</span>
                </div>
                {c.flag_note&&<div style={{marginTop:8,fontSize:9,color:'#dc2626',fontWeight:700}}>🔒 {c.flag_note}</div>}
              </div>
            </div>
          )
        })}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Drag and drop case files, timeline notes, and email communications directly into the secure, defensible case profile.','A litigation hold here automatically freezes the deletion of an involved employee\'s digital records, even mid-offboarding.','Access is filtered by role -- a legal executive sees the full case file, while broader HR sees only the status, never the underlying PII.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Case File',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
