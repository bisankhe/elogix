// FILE: ContinuousFeedbackPage.jsx - Continuous Feedback (Performance & Talent > Goal & Performance > Performance Evaluation)
// Quick praise/check-in feed, weekly 1:1 notes, social-media-style
// commenting - feeds directly into the annual appraisal record.

import { useState } from 'react'
import { Field, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#0c4a6e 0%,#0284c7 60%,#7dd3fc 100%)'
const A = '#0284c7'

const FEEDBACK_FEED = [
  { id:'f1', type:'praise', from:'Priya Adhikari', to:'Gita Maharjan', message:'Great job closing the Acme deal ahead of schedule!', timestamp:'2025-06-21 10:30 AM', impact_links:['Performance Appraisal'] },
  { id:'f2', type:'checkin', from:'Dipesh Bhattarai', to:'Maya Pradhan', message:'1:1 notes: discussed Q3 budget variance, agreed on weekly sync.', timestamp:'2025-06-20 02:00 PM', impact_links:[] },
  { id:'f3', type:'constructive', from:'Sushila Gurung', to:'Bikash Rai', message:'Sprint commitments have slipped 2x this month - let\'s identify blockers together.', timestamp:'2025-06-19 11:00 AM', impact_links:['Workload Analysis','PIP Management'] },
]

const TYPE_CFG = {
  praise:{c:'#10b981',bg:'#f0fdf4',icon:'👏',label:'Praise'},
  checkin:{c:'#0284c7',bg:'#eff6ff',icon:'💬',label:'1:1 Check-In'},
  constructive:{c:'#f59e0b',bg:'#fffbeb',icon:'🛠',label:'Constructive'},
}

export default function ContinuousFeedbackPage() {
  const [feed, setFeed] = useState(FEEDBACK_FEED)
  const [search, setSearch] = useState('')
  const [showCompose, setShowCompose] = useState(false)
  const [composeType, setComposeType] = useState('praise')
  const [ctx, setCtx] = useState(null)

  const filtered = feed.filter(f=>!search||f.to.toLowerCase().includes(search.toLowerCase())||f.from.toLowerCase().includes(search.toLowerCase()))
  const praiseCount = feed.filter(f=>f.type==='praise').length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="💬" title="Continuous Feedback"
        breadcrumb="Performance & Talent Management > Goal & Performance > Performance Evaluation"
        gradient={G}
        stats={[
          {icon:'💬',label:'Feedback This Month', value:feed.length},
          {icon:'👏',label:'Praise Given',          value:praiseCount},
          {icon:'🛠',label:'Constructive',          value:feed.filter(f=>f.type==='constructive').length},
          {icon:'📥',label:'Feeds Into',            value:'Annual Appraisal'},
        ]}
        onAdd={()=>setShowCompose(true)} addLabel="Give Feedback"/>

      <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#1e40af',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🔄</span>
        <div style={{flex:1,minWidth:200}}><strong>Real-Time, Not Annual:</strong> Quick praise or constructive notes logged the moment they happen - no waiting for a year-end surprise. Every entry here automatically feeds into the formal Performance Appraisal record as supporting evidence.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by name..."/>

      <div style={{display:'grid',gap:12,marginTop:14}}>
        {filtered.map(f=>{
          const tc = TYPE_CFG[f.type]
          return (
            <div key={f.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:`${f.from} -> ${f.to}`,...f}})}}
              style={{background:'#fff',border:`1.5px solid ${tc.c}33`,borderRadius:14,padding:'14px 18px',display:'flex',gap:12,alignItems:'flex-start'}}>
              <span style={{fontSize:20,flexShrink:0}}>{tc.icon}</span>
              <div style={{flex:1}}>
                <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:4}}>
                  <span style={{fontSize:11,fontWeight:800,color:'#0f172a'}}>{f.from}</span>
                  <span style={{color:'#94a3b8',fontSize:10}}>{'>'}</span>
                  <span style={{fontSize:11,fontWeight:800,color:'#0f172a'}}>{f.to}</span>
                  <span style={{background:tc.bg,color:tc.c,fontSize:8,fontWeight:700,padding:'2px 7px',borderRadius:20}}>{tc.label}</span>
                </div>
                <div style={{fontSize:10,color:'#374151'}}>{f.message}</div>
                <div style={{fontSize:8,color:'#94a3b8',marginTop:4}}>{f.timestamp}</div>
              </div>
            </div>
          )
        })}
      </div>

      {showCompose&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowCompose(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(480px,100%)'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'18px 24px'}}><div style={{fontSize:15,fontWeight:900,color:'#fff'}}>Give Feedback</div></div>
            <div style={{padding:'20px 24px'}}>
              <div style={{display:'flex',gap:8,marginBottom:10}}>
                {Object.entries(TYPE_CFG).map(([k,v])=>(
                  <button key={k} onClick={()=>setComposeType(k)} style={{flex:1,padding:'10px',borderRadius:10,border:`1.5px solid ${composeType===k?v.c:'#e2e8f0'}`,background:composeType===k?v.bg:'#fff',color:v.c,fontSize:10,fontWeight:700,cursor:'pointer'}}>{v.icon} {v.label}</button>
                ))}
              </div>
              <Field label="To" type="select" value="" onChange={()=>{}} accent={A} options={['Gita Maharjan','Bikash Rai','Maya Pradhan']}/>
              <Field label="Message" type="textarea" value="" onChange={()=>{}} accent={A} required hint="Voice input supported"/>
              <div style={{display:'flex',gap:10,marginTop:8}}>
                <button onClick={()=>setShowCompose(false)} style={{flex:1,padding:12,borderRadius:10,border:'none',background:G,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>Send</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}
