// FILE: ConfirmationTerminationPage.jsx - Confirmation or Termination (Probation Management)
// Final decision workflow: Confirm/Extend/Terminate, auto-trigger downstream actions

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, Drawer, SearchBar, LuxCard, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#052e16 0%,#15803d 60%,#86efac 100%)'
const A = '#15803d'

const DECISIONS = [
  { id:'cd1', employee:'Maya Pradhan', position:'Finance Manager', dept:'Finance',
    join_date:'2025-06-09', probation_end:'2025-12-09', decision:'confirmed', decided_date:'2025-09-08',
    competency_score:96, decided_by:'Sanjay Karki (CFO)',
    actions:{confirmation_letter:true,status_updated:true,benefits_adjusted:true,payroll_scale_updated:true},
    impact_links:['Payroll','Benefits Enrollment','Performance Management'] },
  { id:'cd2', employee:'Hari Thapa', position:'DevOps Engineer', dept:'IT',
    join_date:'2025-05-20', probation_end:'2025-11-20', decision:'extended', decided_date:'2025-08-19',
    competency_score:58, decided_by:'Bikash Shrestha (IT Lead)', extension_months:2, new_review_date:'2025-10-19',
    actions:{extension_letter:true,new_goals_set:true,pip_active:true},
    impact_links:['Performance Improvement Plan','60 Days Review'] },
  { id:'cd3', employee:'Ramesh KC', position:'Junior Accountant', dept:'Finance',
    join_date:'2025-04-01', probation_end:'2025-10-01', decision:'terminated', decided_date:'2025-07-02',
    competency_score:31, decided_by:'Sanjay Karki (CFO)', termination_reason:'Consistent underperformance despite documented coaching at 30 and 60-day checkpoints. No improvement observed.',
    actions:{access_revoked:true,final_settlement:'pending',asset_recovery:'pending',exit_paperwork:true},
    impact_links:['Offboarding Checklist','IT Asset Recovery','Final Settlement'] },
  { id:'cd4', employee:'Priya Khadka', position:'Sales Executive', dept:'Sales',
    join_date:'2025-07-05', probation_end:'2026-01-05', decision:'pending', decided_date:null,
    competency_score:null, decided_by:null,
    actions:{}, impact_links:[] },
]

const DECISION_CFG = {
  confirmed: {c:'#10b981',bg:'#f0fdf4',icon:'✅',label:'Confirmed - Permanent Staff'},
  extended:  {c:'#f59e0b',bg:'#fffbeb',icon:'⏸',label:'Probation Extended'},
  terminated:{c:'#ef4444',bg:'#fef2f2',icon:'🚫',label:'Terminated'},
  pending:   {c:'#94a3b8',bg:'#f8fafc',icon:'⏳',label:'Decision Pending'},
}

export default function ConfirmationTerminationPage() {
  const [decisions, setDecisions] = useState(DECISIONS)
  const [search, setSearch] = useState('')
  const [filterDecision, setFilterDecision] = useState('all')
  const [selected, setSelected] = useState(null)
  const [showExcel, setShowExcel] = useState(false)
  const [msg, setMsg] = useState('')
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(''),3000) }
  const [ctx, setCtx] = useState(null)

  const filtered = decisions.filter(d=>{
    if (filterDecision!=='all'&&d.decision!==filterDecision) return false
    if (search&&!d.employee.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const confirmedCount = decisions.filter(d=>d.decision==='confirmed').length
  const extendedCount = decisions.filter(d=>d.decision==='extended').length
  const terminatedCount = decisions.filter(d=>d.decision==='terminated').length
  const pendingCount = decisions.filter(d=>d.decision==='pending').length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="⚖" title="Confirmation or Termination"
        breadcrumb="Employee Lifecycle > Onboarding > Probation Management"
        gradient={G}
        stats={[
          {icon:'✅',label:'Confirmed',  value:confirmedCount},
          {icon:'⏸',label:'Extended',    value:extendedCount},
          {icon:'🚫',label:'Terminated', value:terminatedCount},
          {icon:'⏳',label:'Pending',    value:pendingCount},
        ]}
        onAdd={()=>notify('📋 Confirmation/Termination record created')} addLabel="+ New Decision" onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>⚖</span>
        <div><strong>Nepal Labour Act 2074 Section 13:</strong> "After the end of the probation period for a labourer for whom the employment contract has not been terminated, the employment relation shall ipso facto be deemed valid." - i.e. automatic confirmation by law if no action is taken by the 6-month deadline. During probation, termination requires no prior notice if performance is unsatisfactory.</div>
      </div>

      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>
        <div style={{display:'flex',gap:4,background:'#f1f5f9',padding:3,borderRadius:9}}>
          {['all','pending','confirmed','extended','terminated'].map(d=>(
            <button key={d} onClick={()=>setFilterDecision(d)}
              style={{padding:'7px 12px',borderRadius:7,border:'none',cursor:'pointer',fontSize:10,
                background:filterDecision===d?'#fff':'transparent',color:filterDecision===d?A:'#64748b',
                fontWeight:filterDecision===d?700:400,boxShadow:filterDecision===d?'0 1px 3px rgba(0,0,0,.08)':'none'}}>
              {d==='all'?'All':DECISION_CFG[d]?.label.split(' ')[0]||d}
            </button>
          ))}
        </div>
      </div>

      <div style={{display:'grid',gap:14}}>
        {filtered.map(d=>{
          const dc = DECISION_CFG[d.decision]
          return (
            <div key={d.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:d.employee,...d}})}}
              style={{background:'#fff',border:`1.5px solid ${dc.c}33`,borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${dc.c}`}}>
              <div style={{display:'flex',alignItems:'center',gap:14,padding:'16px 20px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap'}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:3}}>
                    <span style={{fontSize:14,fontWeight:900,color:'#0f172a'}}>{d.employee}</span>
                    <span style={{background:dc.bg,color:dc.c,fontSize:10,fontWeight:700,padding:'2px 10px',borderRadius:20}}>{dc.icon} {dc.label}</span>
                  </div>
                  <div style={{fontSize:11,color:'#64748b'}}>{d.position} . {d.dept} . Joined {d.join_date} . Probation ends {d.probation_end}</div>
                  {d.decided_date&&<div style={{fontSize:10,color:'#94a3b8',marginTop:2}}>Decided {d.decided_date} by {d.decided_by}</div>}
                </div>
                {d.competency_score&&(
                  <div style={{textAlign:'center',flexShrink:0}}>
                    <div style={{fontSize:20,fontWeight:900,color:d.competency_score>=80?'#10b981':d.competency_score>=60?'#f59e0b':'#ef4444'}}>{d.competency_score}</div>
                    <div style={{fontSize:8,color:'#94a3b8'}}>90-DAY SCORE</div>
                  </div>
                )}
              </div>

              {d.decision==='confirmed'&&(
                <div style={{padding:'12px 20px',display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
                  {[['Confirmation Letter',d.actions.confirmation_letter],['Status: Permanent',d.actions.status_updated],['Benefits Adjusted',d.actions.benefits_adjusted],['Payroll Scale Updated',d.actions.payroll_scale_updated]].map(([l,ok],i)=>(
                    <div key={i} style={{background:ok?'#f0fdf4':'#fef2f2',borderRadius:8,padding:'8px',textAlign:'center'}}>
                      <div style={{fontSize:12,color:ok?'#10b981':'#ef4444',fontWeight:700}}>{ok?'✓':'⏳'}</div>
                      <div style={{fontSize:9,color:'#64748b',marginTop:2}}>{l}</div>
                    </div>
                  ))}
                </div>
              )}
              {d.decision==='extended'&&(
                <div style={{padding:'12px 20px'}}>
                  <div style={{background:'#fffbeb',borderRadius:10,padding:'10px 14px',fontSize:11,color:'#92400e',marginBottom:8}}>
                    Probation extended by <strong>{d.extension_months} months</strong>. New review scheduled: <strong>{d.new_review_date}</strong>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
                    {[['Extension Letter',d.actions.extension_letter],['New Goals Set',d.actions.new_goals_set],['PIP Active',d.actions.pip_active]].map(([l,ok],i)=>(
                      <div key={i} style={{background:ok?'#f0fdf4':'#fef2f2',borderRadius:8,padding:'8px',textAlign:'center'}}>
                        <div style={{fontSize:12,color:ok?'#10b981':'#ef4444',fontWeight:700}}>{ok?'✓':'⏳'}</div>
                        <div style={{fontSize:9,color:'#64748b',marginTop:2}}>{l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {d.decision==='terminated'&&(
                <div style={{padding:'12px 20px'}}>
                  <div style={{background:'#fef2f2',borderRadius:10,padding:'10px 14px',fontSize:11,color:'#991b1b',marginBottom:8}}>
                    <strong>Reason:</strong> {d.termination_reason}
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
                    {[['IT Access Revoked',d.actions.access_revoked],['Final Settlement',d.actions.final_settlement],['Asset Recovery',d.actions.asset_recovery],['Exit Paperwork',d.actions.exit_paperwork]].map(([l,status],i)=>(
                      <div key={i} style={{background:status===true?'#f0fdf4':status==='pending'?'#fffbeb':'#fef2f2',borderRadius:8,padding:'8px',textAlign:'center'}}>
                        <div style={{fontSize:11,color:status===true?'#10b981':status==='pending'?'#f59e0b':'#ef4444',fontWeight:700}}>{status===true?'✓':status==='pending'?'⏳':'⏳'}</div>
                        <div style={{fontSize:9,color:'#64748b',marginTop:2}}>{l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {d.decision==='pending'&&(
                <div style={{padding:'12px 20px',display:'flex',gap:8}}>
                  <button style={{flex:1,padding:'10px',borderRadius:10,border:'none',background:'#10b981',color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer'}}>✅ Confirm Employment</button>
                  <button style={{flex:1,padding:'10px',borderRadius:10,border:'none',background:'#f59e0b',color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer'}}>⏸ Extend Probation</button>
                  <button style={{flex:1,padding:'10px',borderRadius:10,border:'none',background:'#ef4444',color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer'}}>🚫 Terminate</button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Decision',key:'view'},{icon:'📄',label:'Download Letter',key:'letter'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},{icon:'📤',label:'Export',key:'export'},
      ]} onAction={(k,item)=>{if(k==='view')setSelected(item)}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Confirmation or Termination" columns={['Employee','Position','Department','Join Date','Probation End','Decision','Decided Date','Decided By','Competency Score']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
    </div>
  )
}
