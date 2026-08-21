// FILE: ELearningManagementPage.jsx - E-Learning Management (Performance &
// Talent > Talent Development > Learning & Development)
// The ADMIN/COMPLIANCE counterpart to Learning Portal - automated
// compliance workflows, SCORM/xAPI/cmi5 content standards, HRIS auto-sync
// audit trail, skill-gap-driven catalog rebalancing. Consumes the SAME
// lms_courses/lms_enrollments/lms_certifications from Course Management.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#1e1b4b 0%,#4338ca 60%,#818cf8 100%)'
const A = '#4338ca'

const COMPLIANCE_WORKFLOWS = [
  { id:'w1', course:'OSH & Fire Safety Refresher', target:'All Employees', escalation_level:'manager_reminder',
    overdue_count:8, total_assigned:298, auto_reminder_days:[30,14,3], impact_links:['Annual Training Calendar','Certification Vault'] },
  { id:'w2', course:'Data Privacy Compliance', target:'IT + Finance', escalation_level:'hr_escalated',
    overdue_count:3, total_assigned:71, auto_reminder_days:[30,14,3],
    flag_note:'3 employees past final reminder - escalated to HR for direct follow-up.', impact_links:['Tax & Compliance'] },
]

const HRIS_SYNC_LOG = [
  {event:'Course completed -> Certification issued',employee:'Sunil Magar',timestamp:'2025-06-21 14:32',status:'synced'},
  {event:'Role change -> Auto-enrolled in 3 onboarding modules',employee:'New Hire (Anjali Sharma)',timestamp:'2025-06-20 09:15',status:'synced'},
  {event:'Certification expired -> Compliance flag raised',employee:'Maya Pradhan',timestamp:'2025-06-19 00:00',status:'synced'},
]

const CONTENT_STANDARDS = [
  {standard:'SCORM 1.2 / 2004',courses_using:18,icon:'📦'},{standard:'xAPI (Tin Can)',courses_using:6,icon:'🔗'},{standard:'cmi5',courses_using:2,icon:'⚙'},
]

const SKILL_GAP_REBALANCE = [
  {gap:'Cloud Architecture',affected_employees:14,catalog_coverage:'Adequate (1 course)',action:'none'},
  {gap:'Data Privacy & GDPR',affected_employees:22,catalog_coverage:'Thin (0 dedicated courses)',action:'suggest_new_course'},
]

export default function ELearningManagementPage() {
  const [activeTab, setActiveTab] = useState('compliance')
  const [search, setSearch] = useState('')
  const [ctx, setCtx] = useState(null)

  const totalOverdue = COMPLIANCE_WORKFLOWS.reduce((s,w)=>s+w.overdue_count,0)
  const filteredWorkflows = COMPLIANCE_WORKFLOWS.filter(w=>!search||w.course.toLowerCase().includes(search.toLowerCase()))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="⚙" title="E-Learning Management"
        breadcrumb="Performance & Talent Management > Talent Development > Learning & Development"
        gradient={G}
        stats={[
          {icon:'⚖',label:'Compliance Workflows', value:COMPLIANCE_WORKFLOWS.length},
          {icon:'⚠',label:'Overdue Learners',       value:totalOverdue},
          {icon:'🔄',label:'HRIS Syncs Today',       value:HRIS_SYNC_LOG.length},
          {icon:'📦',label:'Content Standards',       value:CONTENT_STANDARDS.length},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#eef2ff',border:'1px solid #c7d2fe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#3730a3',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🔗</span>
        <div style={{flex:1,minWidth:200}}><strong>The Back-Office, Not a Separate Platform:</strong> Same course catalog as Learning Portal - this page is purely the admin/compliance/integration lens. Every completion here updates the employee's HR profile automatically; every audit trail entry doubles as labour-inspection-ready documentation per the Labour Act's digital-records requirement.</div>
      </div>

      <div style={{display:'flex',gap:6,marginBottom:16,flexWrap:'wrap',background:'#f1f5f9',padding:6,borderRadius:12}}>
        {[{key:'compliance',label:'⚖ Compliance Workflows'},{key:'sync',label:'🔄 HRIS Sync Audit Trail'},{key:'standards',label:'📦 Content Standards'},{key:'rebalance',label:'🎯 Skill-Gap Rebalancing'}].map(t=>(
          <button key={t.key} onClick={()=>setActiveTab(t.key)}
            style={{padding:'8px 14px',borderRadius:9,border:'none',cursor:'pointer',fontSize:10,whiteSpace:'nowrap',
              background:activeTab===t.key?'#fff':'transparent',color:activeTab===t.key?A:'#64748b',
              fontWeight:activeTab===t.key?700:500,boxShadow:activeTab===t.key?'0 1px 4px rgba(0,0,0,.08)':'none'}}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab==='compliance'&&(<>
        <SearchBar value={search} onChange={setSearch} placeholder="Search by course name..."/>
        <div style={{display:'grid',gap:14,marginTop:14}}>
          {filteredWorkflows.map(w=>{
            const completionPct = Math.round((w.total_assigned-w.overdue_count)/w.total_assigned*100)
            return (
              <div key={w.id}
                onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:w.course,...w}})}}
                style={{background:'#fff',border:`1.5px solid ${w.escalation_level==='hr_escalated'?'#fecaca':'#e2e8f0'}`,borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${w.escalation_level==='hr_escalated'?'#ef4444':'#f59e0b'}`}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',padding:'14px 18px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap',gap:10}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{w.course}</div>
                    <div style={{fontSize:10,color:'#64748b'}}>{w.target} . {w.total_assigned} assigned</div>
                  </div>
                  <div style={{textAlign:'center',flexShrink:0}}>
                    <div style={{fontSize:16,fontWeight:900,color:completionPct>=90?'#10b981':'#f59e0b'}}>{completionPct}%</div>
                    <div style={{fontSize:8,color:'#94a3b8',fontWeight:700}}>COMPLETE</div>
                  </div>
                </div>
                <div style={{padding:'10px 18px',display:'flex',gap:8,flexWrap:'wrap'}}>
                  <span style={{background:'#fef2f2',color:'#dc2626',fontSize:9,fontWeight:700,padding:'2px 9px',borderRadius:20}}>⚠ {w.overdue_count} overdue</span>
                  {w.auto_reminder_days.map((d,i)=>(<span key={i} style={{background:'#eef2ff',color:'#4338ca',fontSize:8,fontWeight:600,padding:'2px 8px',borderRadius:20}}>🔔 {d}d reminder</span>))}
                </div>
                {w.flag_note&&<div style={{padding:'10px 18px',background:'#fef2f2',fontSize:10,color:'#991b1b'}}><strong>⚠ Escalated:</strong> {w.flag_note}</div>}
              </div>
            )
          })}
        </div>
      </>)}

      {activeTab==='sync'&&(
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
            <thead><tr style={{background:'#f8fafc'}}>{['Event','Employee','Timestamp','Status'].map(h=><th key={h} style={{padding:'10px 12px',textAlign:'left',fontSize:9,fontWeight:800,color:A}}>{h}</th>)}</tr></thead>
            <tbody>{HRIS_SYNC_LOG.map((s,i)=>(
              <tr key={i} style={{borderBottom:'1px solid #f8fafc'}}>
                <td style={{padding:'9px 12px',color:'#0f172a'}}>{s.event}</td>
                <td style={{padding:'9px 12px',color:'#64748b'}}>{s.employee}</td>
                <td style={{padding:'9px 12px',color:'#94a3b8',fontSize:9}}>{s.timestamp}</td>
                <td style={{padding:'9px 12px'}}><span style={{color:'#10b981',fontWeight:700,fontSize:9}}>✓ {s.status}</span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {activeTab==='standards'&&(
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:14}}>
          {CONTENT_STANDARDS.map((c,i)=>(
            <div key={i} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'18px',textAlign:'center'}}>
              <div style={{fontSize:24,marginBottom:8}}>{c.icon}</div>
              <div style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{c.standard}</div>
              <div style={{fontSize:18,fontWeight:900,color:A,marginTop:6}}>{c.courses_using}</div>
              <div style={{fontSize:9,color:'#94a3b8'}}>courses using this standard</div>
            </div>
          ))}
        </div>
      )}

      {activeTab==='rebalance'&&(
        <div style={{display:'grid',gap:12}}>
          {SKILL_GAP_REBALANCE.map((s,i)=>(
            <div key={i}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:s.gap,impact_links:['Course Management','Training Needs Analysis']}})}}
              style={{background:'#fff',border:`1px solid ${s.action==='suggest_new_course'?'#fed7aa':'#e2e8f0'}`,borderRadius:14,padding:'14px 18px'}}>
              <div style={{display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
                <div style={{fontSize:11,fontWeight:800,color:'#0f172a'}}>{s.gap}</div>
                <span style={{fontSize:9,color:'#94a3b8'}}>{s.affected_employees} employees affected</span>
              </div>
              <div style={{fontSize:10,color:s.action==='suggest_new_course'?'#b45309':'#15803d',marginTop:6}}>📚 Catalog coverage: {s.catalog_coverage}</div>
              {s.action==='suggest_new_course'&&<button style={{marginTop:8,padding:'6px 14px',borderRadius:8,border:'none',background:A,color:'#fff',fontSize:9,fontWeight:700,cursor:'pointer'}}>+ Suggest New Course to Catalog</button>}
            </div>
          ))}
        </div>
      )}

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Auto-escalates to HR after the final 3-day reminder lapses with no completion.','Every sync event is permanently logged - labour-inspection-ready audit trail per the Labour Act.','Catalog rebalancing suggestions cross-reference live workforce skill gaps, not guesswork.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Detail',key:'view'},{icon:'📧',label:'Send Manual Reminder',key:'remind'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
