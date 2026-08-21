// FILE: EngagementDashboardPage.jsx - Engagement Dashboard
// (Employee Experience & Culture > Employee Engagement)
// The landing view: eNPS dial, pulse participation, well-being index,
// quick-action grid, unified activity feed across recognition/events/
// feedback. Role-based -- manager sees team trends, employee sees self.

import { useState } from 'react'
import { PageHeader, AIImpact, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#581c87 0%,#7c3aed 60%,#c4b5fd 100%)'
const A = '#7c3aed'

const ACTIVITY_FEED = [
  { id:'f1', type:'recognition', text:'Sunil Magar recognized Bikash Rai for "Going Above and Beyond"', time:'12 min ago', icon:'🏆' },
  { id:'f2', type:'event', text:'Town Hall Q3 starts in 2 hours -- RSVP now', time:'1 hr ago', icon:'📅' },
  { id:'f3', type:'survey', text:'New pulse survey available: "How connected do you feel to your team?"', time:'3 hrs ago', icon:'📊' },
  { id:'f4', type:'milestone', text:'Maya Pradhan celebrates 5 years at the company today!', time:'Today', icon:'🎉' },
]

const QUICK_ACTIONS = [
  {icon:'🏆',label:'Recognize a Peer',target:'appreciation-program'},
  {icon:'📊',label:'Take a Pulse Survey',target:'employee-survey'},
  {icon:'💬',label:'Share Feedback',target:'employee-feedback'},
  {icon:'💡',label:'Submit a Suggestion',target:'suggestion-box'},
]

export default function EngagementDashboardPage() {
  const [ctx, setCtx] = useState(null)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="💗" title="Engagement Dashboard"
        breadcrumb="Employee Experience & Culture > Employee Engagement"
        gradient={G}
        stats={[
          {icon:'📈',label:'eNPS Score',         value:'+42'},
          {icon:'📊',label:'Pulse Participation',  value:'78%'},
          {icon:'💚',label:'Well-Being Index',       value:'7.4/10'},
          {icon:'⚠',label:'At-Risk Teams',            value:'2'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#faf5ff',border:'1px solid #e9d5ff',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#581c87',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🪄</span>
        <div style={{flex:1,minWidth:200}}><strong>Your Bird's-Eye View:</strong> Workforce sentiment, participation, and retention signals -- no analytics training needed. Managers see team trends; you see your own engagement journey.</div>
      </div>

      {/* Quick-action grid */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:12,marginBottom:18}}>
        {QUICK_ACTIONS.map((q,i)=>(
          <div key={i} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'16px',textAlign:'center',cursor:'pointer',transition:'transform .15s'}}>
            <div style={{fontSize:26,marginBottom:8}}>{q.icon}</div>
            <div style={{fontSize:10,fontWeight:700,color:'#0f172a'}}>{q.label}</div>
          </div>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:18}}>
        {/* eNPS gauge */}
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'20px',display:'flex',flexDirection:'column',alignItems:'center'}}>
          <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:10,alignSelf:'flex-start'}}>📈 Employee Net Promoter Score</div>
          <svg width="140" height="80" viewBox="0 0 140 80">
            <path d="M 10 70 A 60 60 0 0 1 130 70" fill="none" stroke="#f1f5f9" strokeWidth="14"/>
            <path d="M 10 70 A 60 60 0 0 1 95 20" fill="none" stroke={A} strokeWidth="14"/>
          </svg>
          <div style={{fontSize:26,fontWeight:900,color:A,marginTop:-10}}>+42</div>
          <div style={{fontSize:9,color:'#94a3b8'}}>Industry avg +30</div>
        </div>

        {/* Pulse participation trend */}
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'20px'}}>
          <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:14}}>📊 Pulse Participation -- Last 6 Cycles</div>
          <div style={{display:'flex',gap:8,alignItems:'flex-end',height:80}}>
            {[62,68,71,75,73,78].map((v,i)=>(
              <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                <div style={{fontSize:8,fontWeight:700,color:A}}>{v}%</div>
                <div style={{width:'100%',background:A,borderRadius:'4px 4px 0 0',height:`${v*0.6}px`}}/>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activity feed */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px'}}>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:12}}>📰 Activity Feed</div>
        {ACTIVITY_FEED.map(f=>(
          <div key={f.id}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:f.text,impact_links:['Appreciation Program','Employee Events','Employee Survey']}})}}
            style={{display:'flex',gap:12,padding:'10px 0',borderBottom:'1px solid #f8fafc'}}>
            <span style={{fontSize:18}}>{f.icon}</span>
            <div style={{flex:1}}>
              <div style={{fontSize:10,color:'#374151'}}>{f.text}</div>
              <div style={{fontSize:8,color:'#94a3b8',marginTop:2}}>{f.time}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['AI flags engagement drops at the team level so managers can intervene before disengagement becomes attrition.','Activity feed personalizes to your role -- managers see team-wide signals, individuals see their own journey.','Well-Being Index aggregates pulse sentiment, leave patterns, and overtime trends -- never a single noisy metric.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
