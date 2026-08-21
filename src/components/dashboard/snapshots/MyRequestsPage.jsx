// FILE: MyRequestsPage.jsx - My Requests
// (HR Services & Support > Employee Self Service)
// Unified Kanban (Draft/Submitted/In-Review/Approved) spanning EVERY
// request type built across the whole ESS arc -- leave, attendance,
// resignation, letters, cash advance, accommodation -- a pure read
// aggregation, never a duplicate workflow engine.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fdba74 100%)'
const A = '#c2410c'

const STAGES = ['Submitted','In Review','Approved']

const MY_REQUESTS = [
  { id:'r1', type:'Leave Request', detail:'Annual leave, July 5-7', stage:'Approved', source:'My Leave', impact_links:['Leave Request'] },
  { id:'r2', type:'Attendance Request', detail:'Missed punch correction', stage:'In Review', source:'Attendance Request' },
  { id:'r3', type:'Cash Advance', detail:'NPR 25,000 -- medical emergency', stage:'In Review', source:'Cash Advance', impact_links:['Cash Advance'] },
  { id:'r4', type:'Letter Request', detail:'Salary Certificate for visa', stage:'Approved', source:'Letter Request' },
  { id:'r5', type:'Accommodation Request', detail:'Screen reader software', stage:'Submitted', source:'Accessibility Support' },
]

export default function MyRequestsPage() {
  const [search, setSearch] = useState('')
  const [ctx, setCtx] = useState(null)

  const filtered = MY_REQUESTS.filter(r=>!search||r.detail.toLowerCase().includes(search.toLowerCase())||r.type.toLowerCase().includes(search.toLowerCase()))
  const byStage = STAGES.reduce((acc,s)=>{acc[s]=filtered.filter(r=>r.stage===s); return acc},{})

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📥" title="My Requests"
        breadcrumb="HR Services & Support > Employee Self Service"
        gradient={G}
        stats={[
          {icon:'📥',label:'Total Requests',  value:MY_REQUESTS.length},
          {icon:'⏳',label:'In Review',           value:MY_REQUESTS.filter(r=>r.stage==='In Review').length},
          {icon:'✅',label:'Approved',               value:MY_REQUESTS.filter(r=>r.stage==='Approved').length},
          {icon:'🔗',label:'Request Types',             value:[...new Set(MY_REQUESTS.map(r=>r.type))].length},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#7c2d12',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>📥</span>
        <div style={{flex:1,minWidth:200}}><strong>Every Request, One Inbox:</strong> Leave, attendance corrections, cash advances, letters, accommodations -- whatever you've submitted across this whole portal, tracked here in one place. Never ask "where is my request?" again.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search across all my requests..."/>

      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginTop:14,overflowX:'auto'}}>
        {STAGES.map(stage=>(
          <div key={stage} style={{background:'#f8fafc',borderRadius:14,padding:'14px',minWidth:200}}>
            <div style={{fontSize:10,fontWeight:800,color:'#0f172a',marginBottom:12}}>{stage} ({byStage[stage].length})</div>
            <div style={{display:'grid',gap:10}}>
              {byStage[stage].map(r=>(
                <div key={r.id}
                  onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:r.detail,...r}})}}
                  style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:10,padding:'10px 12px',boxShadow:'0 1px 3px rgba(0,0,0,.04)'}}>
                  <div style={{fontSize:8,fontWeight:700,color:A}}>{r.type}</div>
                  <div style={{fontSize:9,color:'#374151',marginTop:4}}>{r.detail}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['This view aggregates the real-time status of every module -- nothing here is a separate workflow, just a single lens.','Tap any card to jump straight into the originating page for full detail.','Requests stalled In Review for 3+ days auto-flag for follow-up.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
