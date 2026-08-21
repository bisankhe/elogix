// FILE: EmployeeEngagementPage.jsx - Employee Engagement
// (Employee Experience & Culture > Employee Engagement)
// The umbrella hub: community spaces, interest groups, mobile-first
// access for deskless/field workers, integration tie-ins to recognition
// and performance -- distinct from the metrics-only Engagement Dashboard.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fdba74 100%)'
const A = '#c2410c'

const COMMUNITY_GROUPS = [
  { id:'g1', name:'Women in Tech Nepal', members:24, posts_this_week:8, category:'Affinity Group' },
  { id:'g2', name:'Trail Running Club', members:16, posts_this_week:3, category:'Interest Group' },
  { id:'g3', name:'New Parents Circle', members:11, posts_this_week:5, category:'Affinity Group' },
]

const ENGAGEMENT_ACTIONS = [
  { id:'e1', employee:'Hari Thapa', action:'Joined Trail Running Club', time:'2 hrs ago' },
  { id:'e2', employee:'Sushila Gurung', action:'Posted in Women in Tech Nepal', time:'4 hrs ago' },
]

export default function EmployeeEngagementPage() {
  const [search, setSearch] = useState('')
  const [ctx, setCtx] = useState(null)

  const filtered = COMMUNITY_GROUPS.filter(g=>!search||g.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🤝" title="Employee Engagement"
        breadcrumb="Employee Experience & Culture > Employee Engagement"
        gradient={G}
        stats={[
          {icon:'🤝',label:'Community Groups',  value:COMMUNITY_GROUPS.length},
          {icon:'👥',label:'Members Engaged',     value:COMMUNITY_GROUPS.reduce((s,g)=>s+g.members,0)},
          {icon:'📱',label:'Mobile Access',          value:'100%'},
          {icon:'🔗',label:'Synced Modules',           value:'Recognition + Performance'},
        ]}
        onAdd={()=>{}} addLabel="+ Start a Group"/>

      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#7c2d12',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>📱</span>
        <div style={{flex:1,minWidth:200}}><strong>Mobile-First, Always:</strong> Field staff and deskless employees get the exact same access to community spaces, recognition, and feedback as office-based teams -- not a stripped-down version.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search community groups..."/>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:14,marginTop:14,marginBottom:18}}>
        {filtered.map(g=>(
          <div key={g.id}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:g.name,...g,impact_links:['Internal Communication']}})}}
            style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'16px'}}>
            <span style={{background:'#fff7ed',color:'#b45309',fontSize:8,fontWeight:700,padding:'2px 9px',borderRadius:20}}>{g.category}</span>
            <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginTop:8}}>{g.name}</div>
            <div style={{display:'flex',justifyContent:'space-between',marginTop:8,fontSize:9,color:'#94a3b8'}}>
              <span>👥 {g.members} members</span><span>{g.posts_this_week} posts this week</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px'}}>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:12}}>📰 Recent Engagement Activity</div>
        {ENGAGEMENT_ACTIONS.map(e=>(
          <div key={e.id} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #f8fafc'}}>
            <span style={{fontSize:10,color:'#374151'}}><strong>{e.employee}</strong> {e.action}</span>
            <span style={{fontSize:8,color:'#94a3b8'}}>{e.time}</span>
          </div>
        ))}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Engagement is treated as a shared leadership responsibility, not solely an HR task -- managers get team-level nudges too.','Positive engagement signals feed into Performance Management and Rewards -- never siloed from career growth.','Group recommendations weighted toward genuine shared interests, never algorithmic noise.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Group',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
