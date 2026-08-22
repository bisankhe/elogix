// FILE: LearningPortalPage.jsx - Learning Portal (Performance & Talent >
// Talent Development > Learning & Development)
// The CONSUMER-GRADE self-service front-end consuming the EXISTING
// lms_courses catalog and lms_enrollments (built in Course Management
// last session) - never duplicates course data. Netflix/Spotify-style
// discovery, embedded Learning Player with notes/discussion sidebar.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#581c87 0%,#7c3aed 60%,#c4b5fd 100%)'
const A = '#7c3aed'

const HERO_STATUS = { compliance_pct:87, upcoming_deadline:'OSH Fire Safety Refresher - due in 9 days' }

const MY_LEARNING_PATH = [
  {course:'AWS Solutions Architect',progress:65,mandatory:false},
  {course:'OSH & Fire Safety Refresher',progress:40,mandatory:true},
]

const RECOMMENDED = [
  {course:'Strategic Planning for Managers',reason:'Based on your 360 feedback blind spot',duration:'4h',badge:'🎯'},
  {course:'Advanced Excel for Finance',reason:'Matches your career goal: Senior Analyst',duration:'3h',badge:'📈'},
  {course:'CI/CD Pipeline Mastery',reason:'Closes your team\'s top skill gap',duration:'6h',badge:'⚙'},
]

const PLAYER_SIDEBAR = {
  outline:['Module 1: Foundations','Module 2: Networking','Module 3: Security','Module 4: Hands-On Lab'],
  notes:'Remember: VPC peering does NOT support transitive routing.',
  discussion:[{from:'Bikash Rai',message:'Anyone else stuck on the Lab 3 IAM policy?'},{from:'Instructor',message:'Check the troubleshooting doc - common typo in the resource ARN.'}],
}

export default function LearningPortalPage() {
  const [search, setSearch] = useState('')
  const [activePlayer, setActivePlayer] = useState(null)
  const [ctx, setCtx] = useState(null)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🎓" title="Learning Portal"
        breadcrumb="Performance & Talent Management > Talent Development > Learning & Development"
        gradient={G}
        stats={[
          {icon:'✅',label:'Compliance Status', value:HERO_STATUS.compliance_pct+'%'},
          {icon:'📚',label:'In Progress',          value:MY_LEARNING_PATH.length},
          {icon:'🎯',label:'Recommended for You',   value:RECOMMENDED.length},
          {icon:'🏆',label:'Badges Earned',          value:5},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      {/* Hero section */}
      <div style={{background:'#faf5ff',border:'1px solid #e9d5ff',borderRadius:16,padding:'16px 20px',marginBottom:18,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
        <div>
          <div style={{fontSize:12,fontWeight:800,color:'#581c87'}}>⚠ Upcoming Deadline</div>
          <div style={{fontSize:11,color:'#7c3aed',marginTop:2}}>{HERO_STATUS.upcoming_deadline}</div>
        </div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <button style={{padding:'8px 16px',borderRadius:10,border:`1px solid ${A}33`,background:'#fff',color:A,fontSize:10,fontWeight:700,cursor:'pointer'}}>📜 My Transcript</button>
          <button style={{padding:'8px 16px',borderRadius:10,border:`1px solid ${A}33`,background:'#fff',color:A,fontSize:10,fontWeight:700,cursor:'pointer'}}>🔖 Saved Courses</button>
        </div>
      </div>

      {/* My Learning Path */}
      <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:10}}>📈 My Learning Path</div>
      <div style={{display:'grid',gap:12,marginBottom:20}}>
        {MY_LEARNING_PATH.map((c,i)=>(
          <div key={i} onClick={()=>setActivePlayer(c)}
            style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'14px 18px',cursor:'pointer'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
              <span style={{fontSize:11,fontWeight:700,color:'#0f172a'}}>{c.course} {c.mandatory&&<span style={{background:'#fef2f2',color:'#dc2626',fontSize:8,fontWeight:700,padding:'1px 7px',borderRadius:20,marginLeft:6}}>Mandatory</span>}</span>
              <span style={{fontSize:11,fontWeight:800,color:A}}>{c.progress}%</span>
            </div>
            <div style={{height:7,background:'#f1f5f9',borderRadius:7,overflow:'hidden'}}><div style={{width:`${c.progress}%`,height:'100%',background:A,borderRadius:7}}/></div>
          </div>
        ))}
      </div>

      {/* Discovery / Course Catalog */}
      <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:10}}>🤖 Recommended for You</div>
      <SearchBar value={search} onChange={setSearch} placeholder="Search the course catalog..."/>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:14,marginTop:14}}>
        {RECOMMENDED.filter(r=>!search||r.course.toLowerCase().includes(search.toLowerCase())).map((r,i)=>(
          <div key={i}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:r.course,impact_links:['Course Management']}})}}
            style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px',cursor:'pointer'}}
            onClick={()=>setActivePlayer({course:r.course,progress:0,mandatory:false})}>
            <div style={{fontSize:24,marginBottom:8}}>{r.badge}</div>
            <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:4}}>{r.course}</div>
            <div style={{fontSize:9,color:'#7c3aed',marginBottom:8}}>{r.reason}</div>
            <div style={{fontSize:9,color:'#94a3b8'}}>⏱ {r.duration}</div>
          </div>
        ))}
      </div>

      {/* Learning Player */}
      {activePlayer&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setActivePlayer(null)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(900px,100%)',maxHeight:'90vh',overflow:'auto',display:'flex',flexWrap:'wrap'}} onClick={e=>e.stopPropagation()}>
            <div style={{flex:'2 1 400px',background:'#0f172a',minHeight:300,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:13}}>
              ▶ {activePlayer.course} - Video Player
            </div>
            <div style={{flex:'1 1 260px',padding:'18px',borderLeft:'1px solid #f1f5f9'}}>
              <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:10}}>📋 Course Outline</div>
              {PLAYER_SIDEBAR.outline.map((m,i)=>(<div key={i} style={{fontSize:10,color:'#64748b',padding:'5px 0',borderBottom:'1px solid #f8fafc'}}>{m}</div>))}
              <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginTop:14,marginBottom:8}}>📝 My Notes</div>
              <div style={{background:'#fffbeb',borderRadius:8,padding:'8px 10px',fontSize:9,color:'#92400e'}}>{PLAYER_SIDEBAR.notes}</div>
              <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginTop:14,marginBottom:8}}>💬 Discussion</div>
              {PLAYER_SIDEBAR.discussion.map((d,i)=>(
                <div key={i} style={{fontSize:9,marginBottom:6}}><strong style={{color:'#0f172a'}}>{d.from}:</strong> <span style={{color:'#64748b'}}>{d.message}</span></div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Course completion auto-syncs to your HR profile - no separate certification step.','Recommendations refresh weekly based on performance reviews and stated career goals.','Single sign-on means you never log into a separate LMS - everything lives here.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Course Detail',key:'view'},{icon:'🔖',label:'Save for Later',key:'save'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}
