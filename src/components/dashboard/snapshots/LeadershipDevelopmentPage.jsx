// FILE: LeadershipDevelopmentPage.jsx - Leadership Development
// (Performance & Talent > Talent Development > Career Development)
// Executive talent dashboard: 9-box grid (reuses the EXISTING
// nine_box_grid from Performance Analytics), HiPo identification,
// readiness scores, mentorship pipeline -- democratized, not C-suite-only.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#1e1b4b 0%,#4338ca 60%,#818cf8 100%)'
const A = '#4338ca'

const NINE_BOX = [
  [{employee:'Anjali Sharma',hipo:true},{employee:'Bikash Rai'},null],
  [{employee:'Gita Maharjan',hipo:true},{employee:'Maya Pradhan'},{employee:'Hari Thapa'}],
  [null,{employee:'Ramesh KC'},{employee:'Sushila Gurung'}],
]
const BOX_LABELS = {
  rows:['High Potential','Medium Potential','Developing Potential'],
  cols:['Needs Improvement','Meets Expectations','Exceeds Expectations'],

const HIPO_PIPELINE = [
  { id:'h1', employee:'Anjali Sharma', current_role:'Sales Executive', readiness_score:82, target_role:'Sales Manager',
    mentor:'Dipesh Bhattarai (Director)', democratized_track:'Emerging Leader Program (Year 1 of career)', impact_links:['Career Pathing','Succession Planning'] },
  { id:'h2', employee:'Gita Maharjan', current_role:'Software Engineer III', readiness_score:91, target_role:'Engineering Manager',
    mentor:'Sunil Magar (Cloud Architect)', democratized_track:'Senior IC Leadership Track', impact_links:['360 Degree PMS'] },
]

export default function LeadershipDevelopmentPage() {
  const [search, setSearch] = useState('')
  const [ctx, setCtx] = useState(null)

  const filtered = HIPO_PIPELINE.filter(h=>!search||h.employee.toLowerCase().includes(search.toLowerCase()))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="👑" title="Leadership Development"
        breadcrumb="Performance & Talent Management > Talent Development > Career Development"
        gradient={G}
        stats={[
          {icon:'⭐',label:'High Potential (HiPo)',  value:NINE_BOX.flat().filter(c=>c?.hipo).length},
          {icon:'👑',label:'In Pipeline',               value:HIPO_PIPELINE.length},
          {icon:'📈',label:'Avg Readiness Score',         value:'87%'},
          {icon:'🌱',label:'Democratized Tracks',          value:'Open to All Levels'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#eef2ff',border:'1px solid #c7d2fe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#3730a3',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🌱</span>
        <div style={{flex:1,minWidth:200}}><strong>Democratized, Not C-Suite-Only:</strong> Leadership tracks open to emerging talent early in their careers -- a 1st-year Sales Executive and a 3rd-year Engineer both have a visible path here, not just VPs.</div>
      </div>

      {/* 9-box grid (reuses nine_box_grid from Performance Analytics) */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'20px',marginBottom:18,overflowX:'auto'}}>
        <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:14}}>📊 9-Box Talent Grid (Performance × Potential)</div>
        <div style={{display:'grid',gridTemplateColumns:'90px repeat(3,1fr)',gap:4,minWidth:480}}>
          <div></div>
          {BOX_LABELS.cols.map(c=>(<div key={c} style={{textAlign:'center',fontSize:8,fontWeight:700,color:'#94a3b8',padding:'4px 0'}}>{c}</div>))}
          {NINE_BOX.map((row,ri)=>(
            <>
              <div key={ri} style={{fontSize:8,fontWeight:700,color:'#94a3b8',display:'flex',alignItems:'center'}}>{BOX_LABELS.rows[ri]}</div>
              {row.map((cell,ci)=>(
                <div key={ci}
                  onContextMenu={ev=>{if(cell){ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:cell.employee,impact_links:['Performance Appraisal']}})}}}
                  style={{minHeight:64,borderRadius:8,border:'1px solid #f1f5f9',padding:8,background:cell?.hipo?'#fef9c3':'#fff',display:'flex',alignItems:'center',justifyContent:'center',textAlign:'center'}}>
                  {cell&&<div><div style={{fontSize:9,fontWeight:700,color:'#0f172a'}}>{cell.employee}</div>{cell.hipo&&<div style={{fontSize:14}}>⭐</div>}</div>}
                </div>
              ))}
            </>
          ))}
        </div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search HiPo pipeline by name..."/>

      <div style={{display:'grid',gap:16,marginTop:14}}>
        {filtered.map(h=>(
          <div key={h.id}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:h.employee,...h}})}}
            style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${A}`}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',padding:'14px 18px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap',gap:10}}>
              <div>
                <div style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>⭐ {h.employee}</div>
                <div style={{fontSize:10,color:'#64748b'}}>{h.current_role} {'>'} {h.target_role}</div>
              </div>
              <div style={{textAlign:'center',flexShrink:0}}>
                <div style={{fontSize:18,fontWeight:900,color:A}}>{h.readiness_score}%</div>
                <div style={{fontSize:8,color:'#94a3b8',fontWeight:700}}>READINESS</div>
              </div>
            </div>
            <div style={{padding:'10px 18px',fontSize:10,color:'#374151'}}>👤 Mentor: {h.mentor}</div>
            <div style={{padding:'8px 18px'}}><span style={{background:'#eef2ff',color:'#4338ca',fontSize:9,fontWeight:700,padding:'3px 10px',borderRadius:20}}>🌱 {h.democratized_track}</span></div>
          </div>
        ))}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Readiness score weighs Performance Appraisal history, 360 feedback, and stretch-assignment completion.','Mentor pairing auto-suggests senior leaders with complementary skill profiles.','Predictive flight-risk model flags HiPo employees showing engagement decline before they leave.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Profile',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
