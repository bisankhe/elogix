// FILE: SuggestionBoxPage.jsx - Suggestion Box
// (Employee Experience & Culture > Employee Engagement)
// Anonymous-by-default idea submission, Kanban-style HR tracking board
// (New -> Reviewing -> Implementing -> Implemented), public resolution
// for transparency -- distinct from the personal-issue Employee Feedback page.

import { useState } from 'react'
import { Field, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fdba74 100%)'
const A = '#c2410c'

const SUGGESTIONS = [
  { id:'sb1', idea:'Add a quiet room for focused work on the 3rd floor', votes:34, status:'implementing', anonymous:true, impact_links:['Branch Setup'] },
  { id:'sb2', idea:'Switch team lunch vendor -- current one has limited vegetarian options', votes:21, status:'implemented', anonymous:false,
    resolution_note:'New vendor "Green Leaf Catering" onboarded from July 1.' },
  { id:'sb3', idea:'Allow flexible start times between 8-10 AM', votes:58, status:'new', anonymous:true, impact_links:['HR Policies'] },
]

const STATUS_CFG = { new:{c:'#94a3b8',label:'New'},reviewing:{c:'#0284c7',label:'Reviewing'},implementing:{c:'#f59e0b',label:'Implementing'},implemented:{c:'#10b981',label:'Implemented'} }

export default function SuggestionBoxPage() {
  const [search, setSearch] = useState('')
  const [showSubmit, setShowSubmit] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = SUGGESTIONS.filter(s=>!search||s.idea.toLowerCase().includes(search.toLowerCase()))
  const sortedByVotes = [...filtered].sort((a,b)=>b.votes-a.votes)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="💡" title="Suggestion Box"
        breadcrumb="Employee Experience & Culture > Employee Engagement"
        gradient={G}
        stats={[
          {icon:'💡',label:'Total Ideas',  value:SUGGESTIONS.length},
          {icon:'✅',label:'Implemented',     value:SUGGESTIONS.filter(s=>s.status==='implemented').length},
          {icon:'🚧',label:'In Progress',       value:SUGGESTIONS.filter(s=>s.status==='implementing').length},
          {icon:'🔒',label:'Anonymous',           value:SUGGESTIONS.filter(s=>s.anonymous).length},
        ]}
        onAdd={()=>setShowSubmit(true)} addLabel="Submit an Idea"/>

      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#7c2d12',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🗳</span>
        <div style={{flex:1,minWidth:200}}><strong>Tracked Like a Ticket, Resolved in Public:</strong> Anonymous by default. Every idea moves visibly through New &gt; Reviewing &gt; Implementing &gt; Implemented -- so the whole company sees follow-through, not just HR.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search suggestions..."/>

      <div style={{display:'grid',gap:14,marginTop:14}}>
        {sortedByVotes.map(s=>{
          const sc = STATUS_CFG[s.status]
          return (
            <div key={s.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:s.idea,...s}})}}
              style={{background:'#fff',border:`1.5px solid ${sc.c}33`,borderRadius:14,padding:'16px 18px',display:'flex',gap:14,borderLeft:`4px solid ${sc.c}`}}>
              <div style={{textAlign:'center',minWidth:50}}>
                <div style={{fontSize:18,fontWeight:900,color:A}}>▲</div>
                <div style={{fontSize:13,fontWeight:800,color:'#0f172a'}}>{s.votes}</div>
                <div style={{fontSize:7,color:'#94a3b8'}}>votes</div>
              </div>
              <div style={{flex:1}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8,flexWrap:'wrap'}}>
                  <div style={{fontSize:12,fontWeight:700,color:'#0f172a'}}>{s.idea} {s.anonymous&&'🔒'}</div>
                  <span style={{background:`${sc.c}15`,color:sc.c,fontSize:9,fontWeight:700,padding:'3px 10px',borderRadius:20}}>{sc.label}</span>
                </div>
                {s.resolution_note&&<div style={{marginTop:8,fontSize:10,color:'#15803d',background:'#f0fdf4',borderRadius:8,padding:'8px 10px'}}>✅ {s.resolution_note}</div>}
              </div>
            </div>
          )
        })}
      </div>

      {showSubmit&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowSubmit(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(480px,100%)'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 24px'}}><div style={{fontSize:15,fontWeight:900,color:'#fff'}}>Submit an Idea</div></div>
            <div style={{padding:'22px 24px'}}>
              <Field label="Your Idea" type="textarea" value="" onChange={()=>{}} accent={A} required hint="Voice input supported -- anonymous unless you say otherwise"/>
              <button onClick={()=>setShowSubmit(false)} style={{width:'100%',padding:13,borderRadius:11,border:'none',background:G,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>Submit Anonymously</button>
            </div>
          </div>
        </div>
      )}

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Votes surface the ideas employees care about most -- never just the loudest voice in the room.','AI groups duplicate or similar suggestions automatically before HR review.','Public resolution notes build trust -- ideas are never silently dropped.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Detail',key:'view'},{icon:'🔄',label:'Move Status',key:'move'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}
