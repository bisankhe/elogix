// FILE: AnnouncementBoardPage.jsx - Announcement Board
// (Employee Experience & Culture > Employee Engagement)
// Hero carousel for pinned company news, segmented channels (Leadership/
// Company Updates/Departmental), targeted by department/location/role,
// reactions + comments. Non-discrimination per Labour Act Section 18.

import { useState } from 'react'
import { Field, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#0c4a6e 0%,#0284c7 60%,#7dd3fc 100%)'
const A = '#0284c7'

const PINNED = { title:'FY 2083/84 Strategic Priorities -- Town Hall Recap', channel:'Leadership', date:'2025-06-20', reactions:42 }

const ANNOUNCEMENTS = [
  { id:'a1', title:'New Parental Leave Policy Effective July 1', channel:'Company Updates', target:'All Employees', date:'2025-06-22', reactions:18, comments:4, impact_links:['HR Policies'] },
  { id:'a2', title:'IT Department: Server Maintenance This Weekend', channel:'Departmental News', target:'IT Department', date:'2025-06-21', reactions:6, comments:1, impact_links:[] },
  { id:'a3', title:'Congratulations to Our Q2 Top Performers', channel:'Leadership', target:'All Employees', date:'2025-06-19', reactions:55, comments:9, impact_links:['Appreciation Program'] },
]

const CHANNEL_CFG = {Leadership:'#7c3aed','Company Updates':'#0284c7','Departmental News':'#f59e0b'}

export default function AnnouncementBoardPage() {
  const [search, setSearch] = useState('')
  const [filterChannel, setFilterChannel] = useState('all')
  const [showCompose, setShowCompose] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = ANNOUNCEMENTS.filter(a=>{
    if (filterChannel!=='all'&&a.channel!==filterChannel) return false
    if (search&&!a.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📌" title="Announcement Board"
        breadcrumb="Employee Experience & Culture > Employee Engagement"
        gradient={G}
        stats={[
          {icon:'📌',label:'Active Announcements',  value:ANNOUNCEMENTS.length+1},
          {icon:'👁',label:'Total Reach',              value:'298 employees'},
          {icon:'💬',label:'Comments This Week',         value:14},
          {icon:'🎯',label:'Channels',                    value:3},
        ]}
        onAdd={()=>setShowCompose(true)} addLabel="New Announcement"/>

      <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#1e40af',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>⚖</span>
        <div style={{flex:1,minWidth:200}}><strong>Equal Access, Always:</strong> Announcements must never discriminate by gender, caste, religion, or political affiliation. Targeting by department or role is for relevance, not exclusion.</div>
      </div>

      {/* Hero/pinned banner */}
      <div style={{background:G,borderRadius:16,padding:'24px 28px',marginBottom:18,color:'#fff'}}>
        <div style={{fontSize:9,opacity:.8,fontWeight:700,marginBottom:6}}>📌 PINNED -- {PINNED.channel}</div>
        <div style={{fontSize:16,fontWeight:900}}>{PINNED.title}</div>
        <div style={{fontSize:9,opacity:.8,marginTop:8}}>{PINNED.date} . ❤️ {PINNED.reactions} reactions</div>
      </div>

      <div style={{display:'flex',gap:10,marginBottom:14,flexWrap:'wrap'}}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search announcements..."/>
        <div style={{display:'flex',gap:4,background:'#f1f5f9',padding:3,borderRadius:9,flexWrap:'wrap'}}>
          {['all','Leadership','Company Updates','Departmental News'].map(c=>(
            <button key={c} onClick={()=>setFilterChannel(c)}
              style={{padding:'7px 12px',borderRadius:7,border:'none',cursor:'pointer',fontSize:9,whiteSpace:'nowrap',
                background:filterChannel===c?'#fff':'transparent',color:filterChannel===c?A:'#64748b',
                fontWeight:filterChannel===c?700:400,boxShadow:filterChannel===c?'0 1px 3px rgba(0,0,0,.08)':'none'}}>
              {c==='all'?'All Channels':c}
            </button>
          ))}
        </div>
      </div>

      <div style={{display:'grid',gap:14}}>
        {filtered.map(a=>(
          <div key={a.id}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:a.title,...a}})}}
            style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'16px 18px',borderLeft:`4px solid ${CHANNEL_CFG[a.channel]}`}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:8}}>
              <div>
                <span style={{background:`${CHANNEL_CFG[a.channel]}15`,color:CHANNEL_CFG[a.channel],fontSize:8,fontWeight:700,padding:'2px 9px',borderRadius:20}}>{a.channel}</span>
                <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginTop:6}}>{a.title}</div>
                <div style={{fontSize:9,color:'#94a3b8',marginTop:3}}>{a.date} . Target: {a.target}</div>
              </div>
            </div>
            <div style={{display:'flex',gap:14,marginTop:10}}>
              <span style={{fontSize:9,color:'#64748b',cursor:'pointer'}}>❤️ {a.reactions}</span>
              <span style={{fontSize:9,color:'#64748b',cursor:'pointer'}}>💬 {a.comments} comments</span>
            </div>
          </div>
        ))}
      </div>

      {showCompose&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowCompose(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(540px,100%)',maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:17,fontWeight:900,color:'#fff'}}>New Announcement</div></div>
            <div style={{padding:'22px 28px'}}>
              <Field label="Title" value="" onChange={()=>{}} accent={A} required/>
              <Field label="Channel" type="select" value="" onChange={()=>{}} accent={A} options={['Leadership','Company Updates','Departmental News']}/>
              <Field label="Target Audience" type="select" value="" onChange={()=>{}} accent={A} options={['All Employees','Specific Department','Specific Location']}/>
              <Field label="Message" type="textarea" value="" onChange={()=>{}} accent={A} required hint="Voice input supported"/>
              <div style={{display:'flex',gap:10,marginTop:8}}>
                <button onClick={()=>setShowCompose(false)} style={{flex:1,padding:13,borderRadius:11,border:'none',background:G,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>Publish</button>
                <button onClick={()=>setShowCompose(false)} style={{padding:'13px 22px',borderRadius:11,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:12,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Targeted delivery routes content only to relevant departments -- never blanket inbox spam.','AI suggests the right channel based on message tone and content.','Translation available for multi-lingual or distributed teams.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Post',key:'view'},{icon:'📌',label:'Pin / Unpin',key:'pin'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}
