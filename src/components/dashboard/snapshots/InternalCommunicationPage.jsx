// FILE: InternalCommunicationPage.jsx - Internal Communication
// (Employee Experience & Culture > Employee Engagement)
// Social-intranet hub: searchable knowledge base, transparent OKR/
// performance updates, dedicated team-discussion threads -- distinct
// from the broadcast-only Announcement Board.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#0c4a6e 0%,#0284c7 60%,#7dd3fc 100%)'
const A = '#0284c7'

const THREADS = [
  { id:'t1', title:'Engineering Team: Q3 Sprint Retrospective Notes', replies:14, last_active:'1 hr ago', pinned:true },
  { id:'t2', title:'Company-wide: Sharing our FY 2083/84 Revenue Targets', replies:28, last_active:'3 hrs ago', pinned:true, impact_links:['OKR Management'] },
  { id:'t3', title:'Sales Team: New CRM Onboarding Questions', replies:6, last_active:'1 day ago' },
]

const KNOWLEDGE_ARTICLES = [
  {title:'How to submit a leave request',category:'HR Policies'},
  {title:'VPN setup guide for remote work',category:'IT'},
  {title:'Expense reimbursement process',category:'Finance'},
]

export default function InternalCommunicationPage() {
  const [search, setSearch] = useState('')
  const [ctx, setCtx] = useState(null)

  const filtered = THREADS.filter(t=>!search||t.title.toLowerCase().includes(search.toLowerCase()))
  const filteredKB = KNOWLEDGE_ARTICLES.filter(k=>!search||k.title.toLowerCase().includes(search.toLowerCase()))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="💻" title="Internal Communication"
        breadcrumb="Employee Experience & Culture > Employee Engagement"
        gradient={G}
        stats={[
          {icon:'💬',label:'Active Threads',  value:THREADS.length},
          {icon:'📌',label:'Pinned',             value:THREADS.filter(t=>t.pinned).length},
          {icon:'📚',label:'KB Articles',          value:KNOWLEDGE_ARTICLES.length},
          {icon:'🔍',label:'Searchable',             value:'Always'},
        ]}
        onAdd={()=>{}} addLabel="+ Start a Thread"/>

      <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#1e40af',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🔍</span>
        <div style={{flex:1,minWidth:200}}><strong>A Searchable Knowledge Base, Not Just Chat:</strong> Past updates, OKRs, and company guidelines stay discoverable -- transparency on strategy and performance, not just team chit-chat.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search threads and knowledge base..."/>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginTop:14}}>
        {/* Discussion threads */}
        <div>
          <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:10}}>💬 Discussion Threads</div>
          <div style={{display:'grid',gap:10}}>
            {filtered.map(t=>(
              <div key={t.id}
                onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:t.title,...t}})}}
                style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:'12px 14px'}}>
                <div style={{fontSize:10,fontWeight:700,color:'#0f172a'}}>{t.pinned&&'📌 '}{t.title}</div>
                <div style={{fontSize:8,color:'#94a3b8',marginTop:5}}>💬 {t.replies} replies . {t.last_active}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Knowledge base */}
        <div>
          <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:10}}>📚 Knowledge Base</div>
          <div style={{display:'grid',gap:10}}>
            {filteredKB.map((k,i)=>(
              <div key={i} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:'12px 14px',cursor:'pointer'}}>
                <div style={{fontSize:10,fontWeight:700,color:'#0f172a'}}>{k.title}</div>
                <span style={{background:'#eff6ff',color:'#1e40af',fontSize:7,fontWeight:600,padding:'2px 8px',borderRadius:20,marginTop:5,display:'inline-block'}}>{k.category}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Search indexes every thread and article -- nothing gets buried after a week.','AI suggests the right knowledge base article before you even post a question.','Sensitive performance/OKR updates respect role-based access -- shared transparently, never indiscriminately.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'Open Thread',key:'view'},{icon:'📌',label:'Pin / Unpin',key:'pin'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
