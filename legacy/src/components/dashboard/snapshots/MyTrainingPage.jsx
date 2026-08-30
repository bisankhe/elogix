// FILE: MyTrainingPage.jsx - My Training
// (HR Services & Support > Employee Self Service)
// Netflix-style catalog over the EXISTING v_my_learning_path (Course
// Management session) -- distinct from My Internal Training
// Certificates (already-earned credentials); this is active enrollment
// and the discovery catalog.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#0c4a6e 0%,#0284c7 60%,#7dd3fc 100%)'
const A = '#0284c7'

const CATEGORY_CFG = { mandatory:{c:'#ef4444',label:'Mandatory Compliance'},in_progress:{c:'#f59e0b',label:'In Progress'},recommended:{c:'#7c3aed',label:'Recommended Skills'} }

const MY_TRAINING = [
  { id:'t1', title:'Data Privacy & Security Compliance', category:'mandatory', progress_pct:30, deadline:'2025-07-15', impact_links:['DEI Training'] },
  { id:'t2', title:'AWS Solutions Architect', category:'in_progress', progress_pct:65, deadline:null },
  { id:'t3', title:'Advanced System Design Patterns', category:'recommended', progress_pct:0, deadline:null,
    flag_note:'Recommended based on your Senior Software Engineer career path gap.', impact_links:['Career Pathing'] },
]

export default function MyTrainingPage() {
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('all')
  const [ctx, setCtx] = useState(null)

  const filtered = MY_TRAINING.filter(t=>{
    if (filterCat!=='all'&&t.category!==filterCat) return false
    if (search&&!t.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })
  const overdueRisk = MY_TRAINING.filter(t=>t.category==='mandatory'&&t.progress_pct<50).length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🎓" title="My Training"
        breadcrumb="HR Services & Support > Employee Self Service"
        gradient={G}
        stats={[
          {icon:'🎓',label:'Active Courses',  value:MY_TRAINING.length},
          {icon:'⚠',label:'Compliance Risk',      value:overdueRisk},
          {icon:'🤖',label:'AI Recommended',          value:MY_TRAINING.filter(t=>t.category==='recommended').length},
          {icon:'🔗',label:'Career-Path Linked',         value:MY_TRAINING.filter(t=>t.flag_note).length},
        ]}
        onAdd={()=>{}} addLabel="Browse Catalog"/>

      <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#1e40af',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🎯</span>
        <div style={{flex:1,minWidth:200}}><strong>Personalized, Not Generic:</strong> Recommendations weigh your actual career path and skill gaps -- not a one-size-fits-all assignment list.</div>
      </div>

      <div style={{display:'flex',gap:10,marginBottom:14,flexWrap:'wrap'}}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search my courses..."/>
        <div style={{display:'flex',gap:4,background:'#f1f5f9',padding:3,borderRadius:9,flexWrap:'wrap'}}>
          {['all',...Object.keys(CATEGORY_CFG)].map(c=>(
            <button key={c} onClick={()=>setFilterCat(c)}
              style={{padding:'7px 12px',borderRadius:7,border:'none',cursor:'pointer',fontSize:9,whiteSpace:'nowrap',
                background:filterCat===c?'#fff':'transparent',color:filterCat===c?A:'#64748b',
                fontWeight:filterCat===c?700:400,boxShadow:filterCat===c?'0 1px 3px rgba(0,0,0,.08)':'none'}}>
              {c==='all'?'All':CATEGORY_CFG[c].label}
            </button>
          ))}
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:14}}>
        {filtered.map(t=>{
          const cc = CATEGORY_CFG[t.category]
          return (
            <div key={t.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:t.title,...t}})}}
              style={{background:'#fff',border:`1px solid ${cc.c}33`,borderRadius:14,padding:'16px'}}>
              <span style={{background:`${cc.c}15`,color:cc.c,fontSize:8,fontWeight:700,padding:'2px 9px',borderRadius:20}}>{cc.label}</span>
              <div style={{fontSize:11,fontWeight:700,color:'#0f172a',marginTop:8}}>{t.title}</div>
              <div style={{height:6,background:'#f1f5f9',borderRadius:6,overflow:'hidden',marginTop:8}}><div style={{width:`${t.progress_pct}%`,height:'100%',background:cc.c,borderRadius:6}}/></div>
              {t.deadline&&<div style={{fontSize:8,color:'#94a3b8',marginTop:6}}>Due {t.deadline}</div>}
              {t.flag_note&&<div style={{fontSize:8,color:'#7c3aed',marginTop:6}}>🎯 {t.flag_note}</div>}
            </div>
          )
        })}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Completion auto-syncs to Course Management -- the moment you finish, your certificate generates automatically.','Mandatory courses behind schedule escalate to your manager 14, 7, and 1 day before the deadline.','Browse the full catalog any time -- enrollment never requires HR to manually add you.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'Continue Course',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}
