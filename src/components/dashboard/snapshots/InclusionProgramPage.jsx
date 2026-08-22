// FILE: InclusionProgramPage.jsx - Inclusion Program
// (Employee Experience & Culture > Diversity, Equity & Inclusion)
// ERG hub, belonging/psychological-safety sentiment heat map (from
// pulse surveys, reuses the same survey_responses pattern as Employee
// Engagement), drag-and-drop mentorship matching.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fdba74 100%)'
const A = '#c2410c'

const ERGS = [
  { id:'e1', name:'Women in Leadership Nepal', members:31, exec_sponsor:'Dipesh Bhattarai (Director)', events_this_quarter:3 },
  { id:'e2', name:'Disability Allyship Network', members:9, exec_sponsor:null, events_this_quarter:0,
    flag_note:'No executive sponsor assigned -- at risk of low engagement and burnout for organizers.' },
  { id:'e3', name:'Janajati & Indigenous Voices', members:18, exec_sponsor:'Anjali Sharma (VP Sales)', events_this_quarter:2 },
]

const BELONGING_HEATMAP = [
  {dept:'IT',score:7.8,c:'#10b981'},{dept:'Sales & Marketing',score:7.2,c:'#10b981'},
  {dept:'Finance',score:5.4,c:'#f59e0b'},{dept:'Operations',score:4.1,c:'#ef4444'},
]

const MENTORSHIP_PAIRS = [
  {mentee:'Bipana Karki',mentor:'Sushila Gurung',status:'active'},{mentee:'Ramesh KC',mentor:null,status:'unmatched'},
]

export default function InclusionProgramPage() {
  const [search, setSearch] = useState('')
  const [ctx, setCtx] = useState(null)

  const filtered = ERGS.filter(e=>!search||e.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🤝" title="Inclusion Program"
        breadcrumb="Employee Experience & Culture > Diversity, Equity & Inclusion"
        gradient={G}
        stats={[
          {icon:'🤝',label:'Active ERGs',  value:ERGS.length},
          {icon:'👥',label:'ERG Members',     value:ERGS.reduce((s,e)=>s+e.members,0)},
          {icon:'💚',label:'Avg Belonging Score', value:'6.1/10'},
          {icon:'🔗',label:'Mentorship Pairs',       value:MENTORSHIP_PAIRS.filter(m=>m.status==='active').length},
        ]}
        onAdd={()=>{}} addLabel="+ Start an ERG"/>

      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#7c2d12',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>💚</span>
        <div style={{flex:1,minWidth:200}}><strong>Belonging, Not Just Headcount:</strong> ERGs without executive sponsorship burn out fast. The heat map below surfaces where psychological safety is genuinely lagging -- so intervention targets the right department, not a generic company-wide nudge.</div>
      </div>

      {/* Belonging heatmap */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'20px',marginBottom:18}}>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:12}}>🌡 Belonging & Psychological Safety -- by Department</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:10}}>
          {BELONGING_HEATMAP.map((d,i)=>(
            <div key={i} style={{background:`${d.c}15`,borderRadius:10,padding:'12px'}}>
              <div style={{fontSize:9,fontWeight:700,color:'#0f172a'}}>{d.dept}</div>
              <div style={{fontSize:18,fontWeight:900,color:d.c,marginTop:4}}>{d.score}/10</div>
            </div>
          ))}
        </div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search ERGs..."/>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:14,marginTop:14,marginBottom:18}}>
        {filtered.map(e=>(
          <div key={e.id}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:e.name,...e,impact_links:['Employee Engagement']}})}}
            style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'16px'}}>
            <div style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{e.name}</div>
            <div style={{display:'flex',justifyContent:'space-between',marginTop:8,fontSize:9,color:'#94a3b8'}}>
              <span>👥 {e.members} members</span><span>{e.events_this_quarter} events/qtr</span>
            </div>
            <div style={{marginTop:6,fontSize:9,color:e.exec_sponsor?'#15803d':'#dc2626'}}>{e.exec_sponsor?`✓ Sponsored by ${e.exec_sponsor}`:'⚠ No executive sponsor'}</div>
            {e.flag_note&&<div style={{marginTop:6,fontSize:8,color:'#b45309'}}>{e.flag_note}</div>}
          </div>
        ))}
      </div>

      {/* Mentorship matching */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px'}}>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:12}}>🔗 Mentorship Matching</div>
        {MENTORSHIP_PAIRS.map((m,i)=>(
          <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:i<MENTORSHIP_PAIRS.length-1?'1px solid #f8fafc':'none'}}>
            <span style={{fontSize:10,color:'#374151'}}>{m.mentee} {m.mentor?`↔ ${m.mentor}`:'(unmatched)'}</span>
            {m.status==='unmatched'?<button style={{padding:'5px 14px',borderRadius:8,border:'none',background:A,color:'#fff',fontSize:9,fontWeight:700,cursor:'pointer'}}>Match Mentor</button>:
             <span style={{background:'#f0fdf4',color:'#15803d',fontSize:9,fontWeight:700,padding:'3px 10px',borderRadius:20}}>Active</span>}
          </div>
        ))}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Belonging scores derive from anonymous pulse surveys -- never traceable to an individual respondent.','ERGs without an executive sponsor for 60+ days auto-flag for HR follow-up.','Mentorship matching weighs shared career interests and complementary skill gaps, never random pairing.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View ERG Detail',key:'view'},{icon:'👤',label:'Assign Sponsor',key:'sponsor'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}
