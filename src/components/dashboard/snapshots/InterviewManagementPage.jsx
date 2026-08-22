// FILE: InterviewManagementPage.jsx — Interview Management
// HR: scheduling + tracking | Hiring Manager: evaluation + feedback tools
import { useState } from 'react'
import { ExcelModal, PageHeader, SearchBar, ContextMenu, Drawer } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#1e1b4b 0%,#7c3aed 60%,#a78bfa 100%)'
const A = '#7c3aed'

const INTERVIEWS = [
  { id:'im1', candidate:'Rajan Shrestha', position:'Senior SW Dev', dept:'IT',
    round:'Technical', date:'2025-06-18', time:'10:00 AM', duration:60,
    mode:'Video (Google Meet)', panel:['Rajesh Sharma (CTO)','Bikash Shrestha (IT Lead)'],
    status:'completed', hr_notes:'Calendar confirmed. Packet sent.',
    eval_status:'evaluated',
    scorecard:{technical:92,communication:86,problem_solving:90,culture_fit:88,leadership:78},
    feedback:'Strong technical candidate. Excellent React and AWS skills. Minor concern on leadership experience but acceptable for Senior level.',
    recommendation:'Hire', overall_score:87,
    impact_links:['Offer Management','ATS Dashboard','Candidate Database'] },
  { id:'im2', candidate:'Gita Maharjan', position:'Cloud Architect', dept:'IT',
    round:'Panel Interview', date:'2025-06-20', time:'11:00 AM', duration:90,
    mode:'Video (Google Meet)', panel:['Rajesh Sharma (CTO)','CFO','IT Lead'],
    status:'scheduled', hr_notes:'Room booked. Panel invites sent.',
    eval_status:'pending',
    scorecard:{technical:0,communication:0,problem_solving:0,culture_fit:0,leadership:0},
    feedback:'',recommendation:'',overall_score:0,
    impact_links:['Offer Management','ATS Dashboard'] },
  { id:'im3', candidate:'Maya Pradhan', position:'Finance Manager', dept:'Finance',
    round:'Technical', date:'2025-06-17', time:'09:00 AM', duration:60,
    mode:'In-Person (KTM HQ)', panel:['CFO','Finance Head'],
    status:'completed', hr_notes:'Completed on time. Feedback collected.',
    eval_status:'evaluated',
    scorecard:{technical:88,communication:92,problem_solving:85,culture_fit:90,leadership:84},
    feedback:'CA-qualified with strong IFRS knowledge. Excellent communication. Slight concern on ERP experience.',
    recommendation:'Strong Hire', overall_score:88,
    impact_links:['Offer Management','Background Verification'] },
  { id:'im4', candidate:'Priya Tamang', position:'Senior SW Dev', dept:'IT',
    round:'HR Screening', date:'2025-06-22', time:'02:00 PM', duration:45,
    mode:'Video (MS Teams)', panel:['Priya Adhikari (HR Manager)'],
    status:'scheduled', hr_notes:'',eval_status:'pending',
    scorecard:{technical:0,communication:0,problem_solving:0,culture_fit:0,leadership:0},
    feedback:'',recommendation:'',overall_score:0,
    impact_links:['ATS Dashboard'] },
]

const REC_COLOR = {'Hire':'#10b981','Strong Hire':'#059669','On Hold':'#f59e0b','No Hire':'#ef4444','':'#94a3b8'}
const STATUS_CFG = {
  scheduled:{c:'#3b82f6',bg:'#eff6ff',icon:'📅',label:'Scheduled'},
  completed:{c:'#10b981',bg:'#f0fdf4',icon:'✅',label:'Completed'},
  cancelled:{c:'#ef4444',bg:'#fef2f2',icon:'❌',label:'Cancelled'},
  rescheduled:{c:'#f59e0b',bg:'#fffbeb',icon:'🔄',label:'Rescheduled'},
}
const SCORE_CRITERIA = [
  {key:'technical',label:'Technical Skills',weight:30,color:'#3b82f6'},
  {key:'communication',label:'Communication',weight:20,color:'#8b5cf6'},
  {key:'problem_solving',label:'Problem Solving',weight:20,color:'#10b981'},
  {key:'culture_fit',label:'Culture Fit',weight:15,color:'#f59e0b'},
  {key:'leadership',label:'Leadership',weight:15,color:'#ef4444'},
]

export default function InterviewManagementPage() {
  const [interviews, setInterviews] = useState(INTERVIEWS)
  const [search, setSearch]   = useState('')
  const [filter, setFilter]   = useState('all')
  const [roleView, setRoleView] = useState('hr')
  const [showEval, setShowEval] = useState(null)  // interview being evaluated
  const [evalCard, setEvalCard] = useState({technical:0,communication:0,problem_solving:0,culture_fit:0,leadership:0})
  const [evalFeedback, setEvalFeedback] = useState('')
  const [evalRec, setEvalRec] = useState('Hire')
  const [showExcel, setShowExcel] = useState(false)
  const [selected, setSelected] = useState(null)
  const [ctx, setCtx]           = useState(null)
  const [msg, setMsg]           = useState('')
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(''),3000) }

  const filtered = interviews.filter(i=>{
    if (filter!=='all'&&i.status!==filter) return false
    if (search&&!i.candidate.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const openEval = (interview) => {
    setShowEval(interview)
    setEvalCard({...interview.scorecard})
    setEvalFeedback(interview.feedback)
    setEvalRec(interview.recommendation||'Hire')
  }

  const saveEval = () => {
    const weighted = SCORE_CRITERIA.reduce((s,c)=>s+(evalCard[c.key]||0)*c.weight/100,0)
    setInterviews(prev=>prev.map(i=>i.id===showEval.id?{
      ...i, eval_status:'evaluated',
      scorecard:evalCard, feedback:evalFeedback, recommendation:evalRec,
      overall_score:Math.round(weighted)
    }:i))
    notify('✅ Evaluation saved for '+showEval.candidate+' — Overall: '+Math.round(weighted)+'%')
    setShowEval(null)
  }

  const scheduled = interviews.filter(i=>i.status==='scheduled').length
  const completed  = interviews.filter(i=>i.status==='completed').length
  const evaluated  = interviews.filter(i=>i.eval_status==='evaluated').length

  return (
    <div onClick={()=>setCtx(null)} style={{fontFamily:'system-ui,sans-serif'}}>
      <PageHeader icon="👥" title="Interview Management"
        breadcrumb="Employee Lifecycle > Recruitment > Interview Management"
        gradient={G}
        stats={[
          {icon:'📅',label:'Scheduled',    value:scheduled},
          {icon:'✅',label:'Completed',     value:completed},
          {icon:'📊',label:'Evaluated',    value:evaluated},
          {icon:'🎯',label:'Hire Rate',    value:Math.round(interviews.filter(i=>i.recommendation==='Hire'||i.recommendation==='Strong Hire').length/Math.max(evaluated,1)*100)+'%'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>setShowExcel(true)}/>

      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:360}}>{msg}</div>}

      {/* Role view switcher */}
      <div style={{display:'flex',gap:2,background:'#f1f5f9',padding:4,borderRadius:12,marginBottom:14,width:'fit-content'}}>
        {[['hr','👤 HR — Schedule & Track'],['hiring_mgr','👔 Hiring Manager — Evaluate & Feedback']].map(([k,l])=>(
          <button key={k} onClick={()=>setRoleView(k)}
            style={{padding:'9px 20px',borderRadius:9,border:'none',cursor:'pointer',fontSize:10,
              background:roleView===k?'#fff':'transparent',color:roleView===k?A:'#64748b',
              fontWeight:roleView===k?700:400,boxShadow:roleView===k?'0 1px 4px rgba(0,0,0,.1)':'none'}}>{l}</button>
        ))}
      </div>

      <div style={{background:`${A}08`,border:`1px solid ${A}22`,borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#3730a3'}}>
        {roleView==='hr'
          ? '👤 HR Mode: Confirm schedules, send reminders, manage logistics, track completion status, coordinate with panel members, send candidate packets.'
          : '👔 Hiring Manager Mode: Submit competency-based evaluation scorecards, write feedback, give hire/no-hire recommendation. All data feeds into offer management.'}
      </div>

      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search by candidate..."/>
        <div style={{display:'flex',gap:4,background:'#f1f5f9',padding:3,borderRadius:9}}>
          {['all','scheduled','completed','cancelled'].map(s=>(
            <button key={s} onClick={()=>setFilter(s)}
              style={{padding:'7px 10px',borderRadius:7,border:'none',cursor:'pointer',fontSize:9,
                background:filter===s?'#fff':'transparent',color:filter===s?A:'#64748b',
                fontWeight:filter===s?700:400}}>
              {s==='all'?'All':STATUS_CFG[s]?.label||s}
            </button>
          ))}
        </div>
      </div>

      <div style={{display:'grid',gap:12}}>
        {filtered.map(iv=>{
          const sc = STATUS_CFG[iv.status]||STATUS_CFG.scheduled
          return (
            <div key={iv.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:iv.candidate,...iv}})}}
              style={{background:'#fff',borderRadius:14,border:`1px solid ${sc.c}30`,boxShadow:'0 2px 8px rgba(0,0,0,.04)',borderLeft:`5px solid ${sc.c}`}}>
              <div style={{padding:'14px 18px',borderBottom:'1px solid #f1f5f9',display:'flex',gap:14,alignItems:'center',flexWrap:'wrap'}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:3}}>
                    <span style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{iv.candidate}</span>
                    <span style={{background:sc.bg,color:sc.c,fontSize:9,fontWeight:700,padding:'2px 9px',borderRadius:20}}>{sc.icon} {sc.label}</span>
                    <span style={{background:`${A}10`,color:A,fontSize:9,padding:'2px 9px',borderRadius:20}}>{iv.round}</span>
                    {iv.eval_status==='evaluated'&&<span style={{background:'#f0fdf4',color:'#15803d',fontSize:9,fontWeight:700,padding:'2px 9px',borderRadius:20}}>📊 Evaluated</span>}
                  </div>
                  <div style={{fontSize:11,color:'#64748b'}}>{iv.position} · {iv.dept} · {iv.date} at {iv.time} · {iv.duration} min · {iv.mode}</div>
                  <div style={{fontSize:10,color:'#94a3b8',marginTop:2}}>Panel: {iv.panel.join(', ')}</div>
                </div>
                {iv.eval_status==='evaluated'&&(
                  <div style={{textAlign:'center',flexShrink:0}}>
                    <div style={{fontSize:22,fontWeight:900,color:iv.overall_score>=85?'#10b981':iv.overall_score>=70?A:'#f59e0b'}}>{iv.overall_score}%</div>
                    <div style={{fontSize:8,color:'#94a3b8'}}>OVERALL</div>
                    <div style={{fontSize:9,fontWeight:700,color:REC_COLOR[iv.recommendation]||'#94a3b8',marginTop:2}}>{iv.recommendation||'Pending'}</div>
                  </div>
                )}
              </div>

              {/* HR View details */}
              {roleView==='hr'&&(
                <div style={{padding:'10px 18px',borderBottom:'1px solid #f8fafc'}}>
                  <div style={{display:'flex',gap:12,fontSize:10,flexWrap:'wrap'}}>
                    {[['📦 Packet Sent','Yes'],['⏰ Reminder','Sent 24h prior'],['📅 Calendar','Confirmed'],['📝 HR Notes',iv.hr_notes||'None']].map(([k,v])=>(
                      <div key={k} style={{display:'flex',gap:4}}><span style={{color:'#94a3b8'}}>{k}:</span><span style={{fontWeight:600,color:'#374151'}}>{v}</span></div>
                    ))}
                  </div>
                </div>
              )}

              {/* Hiring Manager: show scorecard if evaluated */}
              {roleView==='hiring_mgr'&&iv.eval_status==='evaluated'&&(
                <div style={{padding:'10px 18px',borderBottom:'1px solid #f8fafc'}}>
                  <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:6}}>
                    {SCORE_CRITERIA.map(c=>(
                      <div key={c.key} style={{background:`${c.color}10`,borderRadius:8,padding:'4px 10px',fontSize:9,textAlign:'center'}}>
                        <div style={{fontWeight:700,color:c.color}}>{iv.scorecard[c.key]}%</div>
                        <div style={{color:'#64748b'}}>{c.label}</div>
                      </div>
                    ))}
                  </div>
                  {iv.feedback&&<div style={{fontSize:10,color:'#475569',fontStyle:'italic',padding:'6px 10px',background:'#f8fafc',borderRadius:8}}>💬 {iv.feedback}</div>}
                </div>
              )}

              <div style={{padding:'8px 14px',display:'flex',gap:6,justifyContent:'flex-end',flexWrap:'wrap'}}>
                <button onClick={()=>setSelected(iv)} style={{padding:'6px 12px',borderRadius:7,border:`1px solid ${A}33`,background:`${A}10`,color:A,fontSize:10,fontWeight:600,cursor:'pointer'}}>👁 View</button>
                {roleView==='hr'&&iv.status==='scheduled'&&(
                  <>
                    <button onClick={()=>notify('📧 Reminder sent to '+iv.candidate+' and '+iv.panel.length+' panel member(s)')} style={{padding:'6px 12px',borderRadius:7,border:'1px solid #e2e8f0',background:'#fff',fontSize:10,cursor:'pointer'}}>📧 Send Reminder</button>
                    <button onClick={()=>{setInterviews(prev=>prev.map(i=>i.id===iv.id?{...i,status:'completed'}:i));notify('✅ '+iv.candidate+' interview marked complete')}} style={{padding:'6px 12px',borderRadius:7,border:'none',background:G,color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>✅ Mark Complete</button>
                  </>
                )}
                {roleView==='hiring_mgr'&&iv.status==='completed'&&(
                  <button onClick={()=>openEval(iv)} style={{padding:'6px 14px',borderRadius:7,border:'none',background:G,color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>
                    {iv.eval_status==='evaluated'?'✏️ Update Evaluation':'📊 Submit Evaluation'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Evaluation Scorecard Modal */}
      {showEval&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.55)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowEval(null)}>
          <div style={{background:'#fff',borderRadius:18,padding:0,width:580,maxWidth:'95vw',maxHeight:'90vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'16px 22px',borderRadius:'18px 18px 0 0',color:'#fff'}}>
              <div style={{fontSize:14,fontWeight:900}}>📊 Competency Evaluation — {showEval.candidate}</div>
              <div style={{fontSize:10,opacity:.8,marginTop:2}}>{showEval.round} · {showEval.position} · {showEval.dept}</div>
            </div>
            <div style={{padding:'20px 24px'}}>
              <div style={{display:'grid',gap:14,marginBottom:16}}>
                {SCORE_CRITERIA.map(c=>{
                  return (
                    <div key={c.key}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:4,fontSize:11}}>
                        <span style={{fontWeight:700,color:'#374151'}}>{c.label} <span style={{fontSize:9,color:'#94a3b8'}}>({c.weight}% weight)</span></span>
                        <div style={{display:'flex',gap:8,alignItems:'center'}}>
                          <span style={{fontWeight:900,color:c.color}}>{evalCard[c.key]||0}/100</span>
                          <span style={{fontSize:9,color:'#94a3b8'}}>→ {weighted.toFixed(1)} pts</span>
                        </div>
                      </div>
                      <input type="range" min={0} max={100} value={evalCard[c.key]||0}
                        onChange={e=>setEvalCard(p=>({...p,[c.key]:+e.target.value}))}
                        style={{width:'100%',accentColor:c.color}}/>
                      <div style={{height:4,background:'#f1f5f9',borderRadius:2,marginTop:4,overflow:'hidden'}}>
                        <div style={{width:(evalCard[c.key]||0)+'%',height:'100%',background:c.color,borderRadius:2}}/>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div style={{background:'#f5f3ff',borderRadius:10,padding:'10px 14px',marginBottom:14,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div style={{fontSize:11,fontWeight:700,color:'#4c1d95'}}>Weighted Total Score</div>
                <div style={{fontSize:24,fontWeight:900,color:A}}>{Math.round(SCORE_CRITERIA.reduce((s,c)=>s+(evalCard[c.key]||0)*c.weight/100,0))}%</div>
              </div>
              <div style={{marginBottom:14}}>
                <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Qualitative Feedback</label>
                <textarea value={evalFeedback} onChange={e=>setEvalFeedback(e.target.value)} rows={4}
                  placeholder="Share your detailed feedback on the candidate's interview performance..."
                  style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1px solid #e2e8f0',fontSize:11,outline:'none',resize:'vertical',fontFamily:'inherit',boxSizing:'border-box'}}/>
              </div>
              <div style={{marginBottom:16}}>
                <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>Final Recommendation</label>
                <div style={{display:'flex',gap:6}}>
                  {['Strong Hire','Hire','On Hold','No Hire'].map(r=>(
                    <button key={r} onClick={()=>setEvalRec(r)}
                      style={{flex:1,padding:'9px 6px',borderRadius:9,border:`2px solid ${evalRec===r?REC_COLOR[r]:'#e2e8f0'}`,background:evalRec===r?`${REC_COLOR[r]}12`:'#fff',color:evalRec===r?REC_COLOR[r]:'#64748b',fontSize:10,fontWeight:evalRec===r?800:400,cursor:'pointer'}}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{display:'flex',gap:10}}>
                <button onClick={saveEval} style={{flex:1,padding:'11px',borderRadius:10,border:'none',background:G,color:'#fff',fontSize:11,fontWeight:800,cursor:'pointer'}}>📊 Save Evaluation</button>
                <button onClick={()=>setShowEval(null)} style={{padding:'11px 18px',borderRadius:10,border:'1px solid #e2e8f0',background:'#fff',fontSize:11,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} actions={[{icon:'👁',label:'View',key:'view'},{icon:'📊',label:'Evaluate',key:'eval'},{icon:'📧',label:'Send Reminder',key:'remind'},{icon:'✅',label:'Mark Complete',key:'complete'}]} onAction={(k,item)=>{if(k==='view')setSelected(item);if(k==='eval')openEval(item)}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Interview Management" columns={['Candidate','Position','Dept','Round','Date','Time','Mode','Panel','Status','Overall Score','Recommendation']} onClose={()=>setShowExcel(false)} onImport={()=>{}}/>}
      <Drawer item={selected} gradient={G} onClose={()=>setSelected(null)} rows={[
        ['Candidate',selected?.candidate],['Position',selected?.position],['Department',selected?.dept],
        ['Round',selected?.round],['Date',selected?.date+' '+selected?.time],
        ['Mode',selected?.mode],['Duration',selected?.duration+'min'],
        ['Status',selected?.status],['Evaluated',selected?.eval_status],
        ['Overall Score',selected?.overall_score?selected.overall_score+'%':'Pending'],
        ['Recommendation',selected?.recommendation||'Pending'],
        ['Feedback',selected?.feedback||'None'],
        ['Panel',selected?.panel?.join(', ')],
      ]}/>
    </div>
  )
}
