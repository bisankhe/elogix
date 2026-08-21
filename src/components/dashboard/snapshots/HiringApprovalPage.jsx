// FILE: HiringApprovalPage.jsx — Hiring Approval Workflow
// AI score breakdown by topic, functional Approve & Notify, multi-step workflow
import { useState } from 'react'
import { ExcelModal, PageHeader, SearchBar, LuxCard, ContextMenu, Drawer } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fb923c 100%)'
const A = '#c2410c'

const APPROVALS = [
  { id:'ha1', candidate:'Rajan Shrestha', position:'Senior SW Dev', dept:'IT', req_id:'MR-2025-041',
    date:'2025-06-18', priority:'high', status:'pending_hr',
    ai_score_total:94,
    ai_breakdown:{ technical:96, cultural_fit:92, communication:91, experience:98, leadership:88, education:94 },
    approval_chain:[
      {step:'Dept Head',    by:'Rajesh Sharma',  status:'approved', date:'2025-06-19', note:'Excellent technical skills.'},
      {step:'Finance',      by:'Sanjay Karki',   status:'approved', date:'2025-06-20', note:'Budget approved.'},
      {step:'HR Manager',   by:'Priya Adhikari', status:'pending',  date:null, note:''},
      {step:'CEO',          by:'CEO',            status:'waiting',  date:null, note:''},
    ],
    salary_proposed:'NPR 110,000/mo', grade:'G6', notified:false },

  { id:'ha2', candidate:'Gita Maharjan', position:'Cloud Architect', dept:'IT', req_id:'MR-2025-040',
    date:'2025-06-20', priority:'critical', status:'pending_ceo',
    ai_score_total:97,
    ai_breakdown:{ technical:99, cultural_fit:95, communication:96, experience:98, leadership:97, education:97 },
    approval_chain:[
      {step:'Dept Head',  by:'Rajesh Sharma',  status:'approved', date:'2025-06-21', note:'Must hire.'},
      {step:'Finance',    by:'Sanjay Karki',   status:'approved', date:'2025-06-21', note:'Approved at G7 band.'},
      {step:'HR Manager', by:'Priya Adhikari', status:'approved', date:'2025-06-22', note:'Proceed immediately.'},
      {step:'CEO',        by:'CEO',            status:'pending',  date:null, note:''},
    ],
    salary_proposed:'NPR 185,000/mo', grade:'G7', notified:true },

  { id:'ha3', candidate:'Maya Pradhan', position:'Finance Manager', dept:'Finance', req_id:'MR-2025-038',
    date:'2025-06-17', priority:'high', status:'pending_finance',
    ai_score_total:88,
    ai_breakdown:{ technical:90, cultural_fit:85, communication:88, experience:92, leadership:82, education:90 },
    approval_chain:[
      {step:'Dept Head',  by:'Anil Pandey',    status:'approved', date:'2025-06-18', note:'Good candidate.'},
      {step:'Finance',    by:'Sanjay Karki',   status:'pending',  date:null, note:''},
      {step:'HR Manager', by:'Priya Adhikari', status:'waiting',  date:null, note:''},
      {step:'CEO',        by:'CEO',            status:'waiting',  date:null, note:''},
    ],
    salary_proposed:'NPR 148,000/mo', grade:'G7', notified:false },

  { id:'ha4', candidate:'Sita Khadka', position:'HR Business Partner', dept:'HR', req_id:'MR-2025-039',
    date:'2025-06-19', priority:'medium', status:'approved',
    ai_score_total:83,
    ai_breakdown:{ technical:80, cultural_fit:90, communication:86, experience:82, leadership:78, education:83 },
    approval_chain:[
      {step:'Dept Head',  by:'Priya Adhikari', status:'approved', date:'2025-06-19', note:'Good HR fit.'},
      {step:'Finance',    by:'Sanjay Karki',   status:'approved', date:'2025-06-20', note:'Within budget.'},
      {step:'HR Manager', by:'Priya Adhikari', status:'approved', date:'2025-06-20', note:'Approved.'},
      {step:'CEO',        by:'CEO',            status:'approved', date:'2025-06-21', note:'Proceed with offer.'},
    ],
    salary_proposed:'NPR 95,000/mo', grade:'G5', notified:true },
]

const STATUS_CFG = {
  pending_hr:     {c:'#f59e0b',bg:'#fffbeb',b:'#fde68a',icon:'⏳',label:'Pending HR'},
  pending_ceo:    {c:'#8b5cf6',bg:'#f5f3ff',b:'#c4b5fd',icon:'👑',label:'Pending CEO'},
  pending_finance:{c:'#3b82f6',bg:'#eff6ff',b:'#bfdbfe',icon:'💰',label:'Pending Finance'},
  approved:       {c:'#10b981',bg:'#f0fdf4',b:'#bbf7d0',icon:'✅',label:'Fully Approved'},
  rejected:       {c:'#ef4444',bg:'#fef2f2',b:'#fecaca',icon:'❌',label:'Rejected'},

const SCORE_LABELS = {technical:'Technical',cultural_fit:'Cultural Fit',communication:'Communication',experience:'Experience',leadership:'Leadership',education:'Education'}
const SCORE_COLORS = {technical:'#3b82f6',cultural_fit:'#10b981',communication:'#8b5cf6',experience:'#f59e0b',leadership:'#ef4444',education:'#06b6d4'}

export default function HiringApprovalPage() {
  const [items, setItems]   = useState(APPROVALS)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState(null)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx]       = useState(null)
  const [msg, setMsg]       = useState('')
  const [noteModal, setNoteModal] = useState(null) // {item, step}
  const [noteText, setNoteText] = useState('')

  const notify = m => { setMsg(m); setTimeout(()=>setMsg(''),3500) }

  const approveStep = (itemId) => {
    setItems(prev => prev.map(it => {
      if (it.id !== itemId) return it
      const chain = [...it.approval_chain]
      const pendingIdx = chain.findIndex(s => s.status === 'pending')
      if (pendingIdx >= 0) {
        chain[pendingIdx] = {...chain[pendingIdx], status:'approved', date:new Date().toISOString().split('T')[0], note: noteText||'Approved via HRMS'}
        if (pendingIdx+1 < chain.length) chain[pendingIdx+1] = {...chain[pendingIdx+1], status:'pending'}
      const allApproved = chain.every(s => s.status==='approved')
      return {...it, approval_chain:chain, status:allApproved?'approved':it.status, notified:false}
    }))
    setNoteModal(null); setNoteText('')
    notify('✅ Approval recorded — next approver notified automatically')

  const sendNotification = (item) => {
    setItems(prev=>prev.map(it=>it.id===item.id?{...it,notified:true}:it))
    notify(`📧 Notification sent to ${item.candidate} via Email + WhatsApp + HRMS`)

  const filtered = items.filter(it=>{
    if (filter!=='all'&&it.status!==filter) return false
    if (search&&!it.candidate.toLowerCase().includes(search.toLowerCase())&&!it.position.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const pendingCount  = items.filter(i=>i.status!=='approved'&&i.status!=='rejected').length
  const approvedCount = items.filter(i=>i.status==='approved').length
  const avgScore      = Math.round(items.reduce((s,i)=>s+i.ai_score_total,0)/items.length)

  return (
    <div onClick={()=>setCtx(null)} style={{fontFamily:'system-ui,sans-serif'}}>
      <PageHeader icon="✅" title="Hiring Approval Workflow"
        breadcrumb="Employee Lifecycle > Recruitment > Hiring Approval"
        gradient={G}
        stats={[
          {icon:'📋',label:'Total',          value:items.length},
          {icon:'⏳',label:'Pending',         value:pendingCount},
          {icon:'✅',label:'Fully Approved', value:approvedCount},
          {icon:'🤖',label:'Avg AI Score',   value:avgScore+'%'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>setShowExcel(true)}/>

      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:360}}>{msg}</div>}

      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search by candidate or position..."/>
        <div style={{display:'flex',gap:4,background:'#f1f5f9',padding:3,borderRadius:9}}>
          {['all','pending_hr','pending_ceo','pending_finance','approved'].map(s=>(
            <button key={s} onClick={()=>setFilter(s)}
              style={{padding:'7px 10px',borderRadius:7,border:'none',cursor:'pointer',fontSize:9,
                background:filter===s?'#fff':'transparent',color:filter===s?A:'#64748b',
                fontWeight:filter===s?700:400,boxShadow:filter===s?'0 1px 3px rgba(0,0,0,.08)':'none'}}>
              {s==='all'?'All':STATUS_CFG[s]?.label||s}
            </button>
          ))}
        </div>
      </div>

      <div style={{display:'grid',gap:16}}>
        {filtered.map(item=>{
          const sc = STATUS_CFG[item.status]||STATUS_CFG.pending_hr
          const pendingStep = item.approval_chain.find(s=>s.status==='pending')
          const approvedSteps = item.approval_chain.filter(s=>s.status==='approved').length

          return (
            <div key={item.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:item.candidate,...item}})}}
              style={{background:'#fff',borderRadius:16,border:`1px solid ${sc.b}`,boxShadow:'0 2px 12px rgba(0,0,0,.06)',overflow:'hidden',borderLeft:`5px solid ${sc.c}`}}>

              {/* Header */}
              <div style={{padding:'16px 20px',borderBottom:'1px solid #f1f5f9',display:'flex',gap:14,alignItems:'flex-start',flexWrap:'wrap'}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:4}}>
                    <span style={{fontSize:14,fontWeight:900,color:'#0f172a'}}>{item.candidate}</span>
                    <span style={{background:sc.bg,color:sc.c,border:`1px solid ${sc.b}`,fontSize:9,fontWeight:700,padding:'2px 9px',borderRadius:20}}>{sc.icon} {sc.label}</span>
                    <span style={{background:'#fef9c3',color:'#854d0e',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20,textTransform:'uppercase'}}>{item.priority}</span>
                    {item.notified&&<span style={{background:'#f0fdf4',color:'#15803d',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>📧 Notified</span>}
                  </div>
                  <div style={{fontSize:11,color:'#64748b'}}>{item.position} · {item.dept} · {item.req_id} · {item.salary_proposed} · Grade {item.grade}</div>
                </div>
                <div style={{textAlign:'center',flexShrink:0}}>
                  <div style={{fontSize:26,fontWeight:900,color:item.ai_score_total>=90?'#10b981':item.ai_score_total>=80?A:'#f59e0b'}}>{item.ai_score_total}%</div>
                  <div style={{fontSize:8,color:'#94a3b8',fontWeight:700}}>AI SCORE</div>
                </div>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:0}}>
                {/* AI Score Breakdown */}
                <div style={{padding:'14px 18px',borderRight:'1px solid #f1f5f9'}}>
                  <div style={{fontSize:10,fontWeight:800,color:'#374151',marginBottom:10}}>🤖 AI Score Breakdown by Topic</div>
                  {Object.entries(item.ai_breakdown).map(([key,score])=>(
                    <div key={key} style={{marginBottom:7}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:2,fontSize:9}}>
                        <span style={{color:'#475569',fontWeight:600}}>{SCORE_LABELS[key]}</span>
                        <span style={{fontWeight:800,color:SCORE_COLORS[key]}}>{score}%</span>
                      </div>
                      <div style={{height:5,background:'#f1f5f9',borderRadius:3,overflow:'hidden'}}>
                        <div style={{width:score+'%',height:'100%',background:SCORE_COLORS[key],borderRadius:3}}/>
                      </div>
                    </div>
                  ))}
                  <div style={{marginTop:8,background:'#f5f3ff',borderRadius:8,padding:'7px 10px',fontSize:9,color:'#4c1d95',fontStyle:'italic'}}>
                    🤖 {item.ai_recommendation}
                  </div>
                </div>

                {/* Approval Chain */}
                <div style={{padding:'14px 18px'}}>
                  <div style={{fontSize:10,fontWeight:800,color:'#374151',marginBottom:10}}>Approval Chain ({approvedSteps}/{item.approval_chain.length})</div>
                  {item.approval_chain.map((step,i)=>{
                    const stepColor = step.status==='approved'?'#10b981':step.status==='pending'?A:step.status==='rejected'?'#ef4444':'#e2e8f0'
                    const textColor = step.status==='approved'?'#10b981':step.status==='pending'?A:step.status==='waiting'?'#94a3b8':'#374151'
                    return (
                      <div key={i} style={{display:'flex',gap:8,alignItems:'flex-start',marginBottom:8,padding:'7px 10px',borderRadius:9,
                        background:step.status==='pending'?`${A}08`:step.status==='approved'?'#f0fdf4':'#f8fafc',
                        border:`1px solid ${stepColor}30`}}>
                        <div style={{width:22,height:22,borderRadius:'50%',background:stepColor,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,color:'#fff',fontWeight:900,flexShrink:0}}>
                          {step.status==='approved'?'✓':step.status==='rejected'?'✗':i+1}
                        </div>
                        <div style={{flex:1}}>
                          <div style={{fontSize:10,fontWeight:700,color:textColor}}>{step.step} — {step.by}</div>
                          {step.date&&<div style={{fontSize:8,color:'#94a3b8'}}>{step.date}{step.note&&` · "${step.note}"`}</div>}
                          {step.status==='waiting'&&<div style={{fontSize:8,color:'#94a3b8'}}>Waiting for previous step</div>}
                        </div>
                        {step.status==='pending'&&(
                          <button onClick={()=>{setNoteModal({item,step});setNoteText('')}}
                            style={{padding:'4px 10px',borderRadius:7,border:'none',background:A,color:'#fff',fontSize:8,fontWeight:700,cursor:'pointer',flexShrink:0}}>
                            ✅ Approve
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Footer actions */}
              <div style={{padding:'10px 18px',borderTop:'1px solid #f1f5f9',display:'flex',gap:8,justifyContent:'flex-end',flexWrap:'wrap'}}>
                <button onClick={()=>setSelected(item)} style={{padding:'7px 14px',borderRadius:8,border:`1px solid ${A}33`,background:`${A}10`,color:A,fontSize:10,fontWeight:600,cursor:'pointer'}}>👁 Details</button>
                {pendingStep&&(
                  <button onClick={()=>{setNoteModal({item,step:pendingStep});setNoteText('')}}
                    style={{padding:'7px 14px',borderRadius:8,border:'none',background:G,color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>
                    ✅ Approve: {pendingStep.step}
                  </button>
                )}
                {!item.notified&&item.status==='approved'&&(
                  <button onClick={()=>sendNotification(item)}
                    style={{padding:'7px 14px',borderRadius:8,border:'none',background:'#10b981',color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>
                    📧 Notify Candidate
                  </button>
                )}
                {item.status!=='approved'&&(
                  <button onClick={()=>sendNotification(item)}
                    style={{padding:'7px 14px',borderRadius:8,border:'1px solid #e2e8f0',background:'#fff',fontSize:10,fontWeight:600,cursor:'pointer'}}>
                    📧 Send Status
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Approve with note modal */}
      {noteModal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setNoteModal(null)}>
          <div style={{background:'#fff',borderRadius:16,padding:24,width:420,maxWidth:'95vw'}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:14,fontWeight:900,marginBottom:4,color:'#0f172a'}}>✅ Approve: {noteModal.step.step}</div>
            <div style={{fontSize:11,color:'#64748b',marginBottom:14}}>{noteModal.item.candidate} — {noteModal.item.position}</div>
            <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Approval Note (optional)</label>
            <textarea value={noteText} onChange={e=>setNoteText(e.target.value)} rows={3}
              placeholder="Add your approval note or remarks..."
              style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1px solid #e2e8f0',fontSize:11,outline:'none',resize:'vertical',fontFamily:'inherit',boxSizing:'border-box',marginBottom:14}}/>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>approveStep(noteModal.item.id)} style={{flex:1,padding:'11px',borderRadius:10,border:'none',background:G,color:'#fff',fontSize:11,fontWeight:800,cursor:'pointer'}}>✅ Confirm Approval</button>
              <button onClick={()=>setNoteModal(null)} style={{padding:'11px 18px',borderRadius:10,border:'1px solid #e2e8f0',background:'#fff',fontSize:11,cursor:'pointer'}}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} actions={[{icon:'👁',label:'View',key:'view'},{icon:'✅',label:'Approve',key:'approve'},{icon:'📧',label:'Notify',key:'notify'},{icon:'❌',label:'Reject',key:'reject',danger:true}]} onAction={(k,item)=>{if(k==='view')setSelected(item);if(k==='notify')sendNotification(item)}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Hiring Approvals" columns={['Candidate','Position','Dept','Status','AI Score','Technical','Cultural Fit','Communication','Experience','Leadership','Education','Salary Proposed','Grade','Date']} onClose={()=>setShowExcel(false)} onImport={()=>{}}/>}
      <Drawer item={selected} gradient={G} onClose={()=>setSelected(null)} rows={[
        ['Candidate',selected?.candidate],['Position',selected?.position],['Department',selected?.dept],
        ['Status',selected?.status],['AI Score',selected?.ai_score_total+'%'],['Salary Proposed',selected?.salary_proposed],
        ['Grade',selected?.grade],['Date',selected?.date],['Priority',selected?.priority],
        ['AI Recommendation',selected?.ai_recommendation],
      ]}/>
    </div>
  )
