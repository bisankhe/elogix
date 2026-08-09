// FILE: SevenDayReviewPage.jsx - 7 Days Review (Probation Management)
// Foundation & Compliance Phase: orientation checklist, equipment verification, buddy contact

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, Drawer, SearchBar, LuxCard, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#0c4a6e 0%,#0284c7 60%,#7dd3fc 100%)'
const A = '#0284c7'

const CHECKLIST_ITEMS = [
  {key:'welcome_video',label:'Welcome Video Watched',icon:'🎬'},
  {key:'it_hardware',label:'IT Hardware Provisioned',icon:'💻'},
  {key:'payroll_declaration',label:'Payroll Declaration Filed',icon:'💰'},
  {key:'compliance_signed',label:'Compliance E-signatures Complete',icon:'✍'},
  {key:'policy_reviewed',label:'Company Policy Library Reviewed',icon:'📚'},
  {key:'system_access',label:'System Access Confirmed',icon:'🔐'},
  {key:'role_clarity',label:'Role Clarity Discussion (Manager 1:1)',icon:'💬'},
]

const REVIEWS = [
  { id:'sr1', employee:'Gita Maharjan', position:'Cloud Architect', dept:'IT', join_date:'2025-06-16',
    review_due:'2025-06-23', buddy:'Bikash Shrestha',
    checklist:{welcome_video:true,it_hardware:true,payroll_declaration:true,compliance_signed:true,policy_reviewed:true,system_access:true,role_clarity:false},
    role_clarity_score:null, manager_note:'', status:'in_progress',
    impact_links:['30 Days Review','Account Creation','Asset Allocation'] },
  { id:'sr2', employee:'Sunita Rai', position:'Senior Software Developer', dept:'IT', join_date:'2025-06-18',
    review_due:'2025-06-25', buddy:'Anita Gurung',
    checklist:{welcome_video:false,it_hardware:false,payroll_declaration:false,compliance_signed:false,policy_reviewed:false,system_access:false,role_clarity:false},
    role_clarity_score:null, manager_note:'', status:'not_started',
    impact_links:[] },
  { id:'sr3', employee:'Maya Pradhan', position:'Finance Manager', dept:'Finance', join_date:'2025-06-09',
    review_due:'2025-06-16', buddy:'Sanjay Karki',
    checklist:{welcome_video:true,it_hardware:true,payroll_declaration:true,compliance_signed:true,policy_reviewed:true,system_access:true,role_clarity:true},
    role_clarity_score:5, manager_note:'Excellent first week. Fully oriented, asking smart questions, no blockers. Ready to move forward confidently.', status:'completed',
    impact_links:['30 Days Review'] },
]

const STATUS_CFG = {
  not_started:{c:'#94a3b8',bg:'#f8fafc',icon:'⏳',label:'Not Started'},
  in_progress:{c:'#f59e0b',bg:'#fffbeb',icon:'🔄',label:'In Progress'},
  completed:  {c:'#10b981',bg:'#f0fdf4',icon:'✅',label:'Completed'},
}

export default function SevenDayReviewPage() {
  const [reviews, setReviews] = useState(REVIEWS)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [showExcel, setShowExcel] = useState(false)
  const [msg, setMsg] = useState('')
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(''),3000) }
  const [ctx, setCtx] = useState(null)

  const filtered = reviews.filter(r=>!search||r.employee.toLowerCase().includes(search.toLowerCase()))
  const completedCount = reviews.filter(r=>r.status==='completed').length
  const avgPct = Math.round(reviews.reduce((s,r)=>s+Object.values(r.checklist).filter(Boolean).length/CHECKLIST_ITEMS.length*100,0)/reviews.length)

  const toggleItem = (reviewId, key) => {
    setReviews(prev=>prev.map(r=>{
      if (r.id!==reviewId) return r
      const checklist = {...r.checklist,[key]:!r.checklist[key]}
      const allDone = Object.values(checklist).every(Boolean)
      const anyDone = Object.values(checklist).some(Boolean)
      return {...r, checklist, status: allDone?'completed':anyDone?'in_progress':'not_started'}
    }))
  }

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📅" title="7 Days Review"
        breadcrumb="Employee Lifecycle > Onboarding > Probation Management"
        gradient={G}
        stats={[
          {icon:'👥',label:'In Probation Week 1', value:reviews.length},
          {icon:'✅',label:'Completed',            value:completedCount},
          {icon:'📊',label:'Avg Checklist',        value:avgPct+'%'},
          {icon:'⏰',label:'Probation Cap',        value:'6 months'},
        ]}
        onAdd={()=>notify('📋 7 Days review created')} addLabel="+ New Review" onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#1e40af',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>⚖</span>
        <div><strong>Nepal Labour Act 2074 Section 13:</strong> Probation max 6 months. During this period the employee is fully entitled to minimum wage, SSF contributions, and standard hours. Internal 7/30/60/90-day checkpoints are best-practice, not statutory - but recommended for documentation and legal defensibility.</div>
      </div>

      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:380}}>{msg}</div>}
      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(360px,1fr))',gap:14,marginTop:14}}>
        {filtered.map(r=>{
          const sc = STATUS_CFG[r.status]||STATUS_CFG.not_started
          const doneCount = Object.values(r.checklist).filter(Boolean).length
          const pct = Math.round(doneCount/CHECKLIST_ITEMS.length*100)
          return (
            <LuxCard key={r.id} color={sc.c} onClick={()=>setSelected(r)}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:r.employee,...r}})}}>
              <div style={{padding:'14px 16px 10px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{r.employee}</div>
                    <div style={{fontSize:10,color:'#64748b'}}>{r.position} . {r.dept}</div>
                  </div>
                  <span style={{background:sc.bg,color:sc.c,fontSize:9,fontWeight:700,padding:'3px 9px',borderRadius:20,flexShrink:0}}>{sc.icon} {sc.label}</span>
                </div>
                <div style={{fontSize:10,color:'#94a3b8',marginBottom:8}}>Joined {r.join_date} . Review due {r.review_due}</div>

                <div style={{position:'relative',width:54,height:54,margin:'0 auto 10px'}}>
                  <svg width="54" height="54" style={{transform:'rotate(-90deg)'}}>
                    <circle cx="27" cy="27" r="23" fill="none" stroke="#f1f5f9" strokeWidth="5"/>
                    <circle cx="27" cy="27" r="23" fill="none" stroke={sc.c} strokeWidth="5"
                      strokeDasharray={`${2*Math.PI*23}`} strokeDashoffset={`${2*Math.PI*23*(1-pct/100)}`} strokeLinecap="round"/>
                  </svg>
                  <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:900,color:sc.c}}>{pct}%</div>
                </div>

                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4}}>
                  {CHECKLIST_ITEMS.map(item=>(
                    <div key={item.key} onClick={ev=>{ev.stopPropagation();toggleItem(r.id,item.key)}}
                      style={{display:'flex',gap:5,alignItems:'center',padding:'3px 6px',borderRadius:6,cursor:'pointer',background:r.checklist[item.key]?'#f0fdf4':'transparent'}}>
                      <span style={{fontSize:9,color:r.checklist[item.key]?'#10b981':'#cbd5e1'}}>{r.checklist[item.key]?'✓':'○'}</span>
                      <span style={{fontSize:9,color:r.checklist[item.key]?'#065f46':'#94a3b8',lineHeight:1.2}}>{item.label}</span>
                    </div>
                  ))}
                </div>

                <div style={{marginTop:8,background:'#f8fafc',borderRadius:8,padding:'6px 10px',fontSize:9,color:'#64748b'}}>
                  🤝 Buddy: <strong>{r.buddy}</strong>
                </div>
              </div>
            </LuxCard>
          )
        })}
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Review',key:'view'},{icon:'📧',label:'Notify IT/Finance',key:'notify'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},{icon:'📤',label:'Export',key:'export'},
      ]} onAction={(k,item)=>{if(k==='view')setSelected(item)}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="7 Days Review" columns={['Employee','Position','Department','Join Date','Review Due','Buddy','Checklist %','Status']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[NepHR Import]", f.name, result); }}/>}
      <Drawer item={selected} gradient={G} onClose={()=>setSelected(null)} rows={[
        ['Employee',selected?.employee],['Position',selected?.position],['Department',selected?.dept],
        ['Join Date',selected?.join_date],['Review Due',selected?.review_due],['Buddy',selected?.buddy],
        ['Status',selected?.status],['Manager Note',selected?.manager_note||'None yet'],
      ]}/>
    </div>
  )
}
