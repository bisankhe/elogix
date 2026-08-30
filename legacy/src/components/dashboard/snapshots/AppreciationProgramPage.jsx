// FILE: AppreciationProgramPage.jsx - Appreciation Program
// (Employee Experience & Culture > Employee Engagement)
// Peer-to-peer recognition wall, badges tied to company values (never
// generic), reward points convertible to tangible rewards. Tenure
// anniversaries auto-surfaced.

import { useState } from 'react'
import { Field, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fdba74 100%)'
const A = '#c2410c'

const RECOGNITION_WALL = [
  { id:'r1', from:'Sunil Magar', to:'Bikash Rai', value_tag:'Going Above and Beyond', message:'Stayed late three nights to unblock the client launch -- pure team-first attitude.', points:50, time:'12 min ago', impact_links:['Rewards & Recognition'] },
  { id:'r2', from:'Anjali Sharma', to:'Ramesh KC', value_tag:'Customer Obsession', message:'Turned an angry client call into a 5-star review. Incredible composure.', points:30, time:'2 hrs ago' },
]

const MY_POINTS = { balance:240, redeemable_at:500 }
const ANNIVERSARIES = [{employee:'Maya Pradhan',years:5,date:'Today'}]

export default function AppreciationProgramPage() {
  const [search, setSearch] = useState('')
  const [showRecognize, setShowRecognize] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = RECOGNITION_WALL.filter(r=>!search||r.to.toLowerCase().includes(search.toLowerCase())||r.from.toLowerCase().includes(search.toLowerCase()))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🏆" title="Appreciation Program"
        breadcrumb="Employee Experience & Culture > Employee Engagement"
        gradient={G}
        stats={[
          {icon:'🏆',label:'Recognitions This Month',  value:RECOGNITION_WALL.length+34},
          {icon:'💰',label:'My Points Balance',           value:MY_POINTS.balance},
          {icon:'🎂',label:"Today's Anniversaries",         value:ANNIVERSARIES.length},
          {icon:'🎯',label:'Points to Next Reward',           value:MY_POINTS.redeemable_at-MY_POINTS.balance},
        ]}
        onAdd={()=>setShowRecognize(true)} addLabel="Recognize a Peer"/>

      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#7c2d12',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🎯</span>
        <div style={{flex:1,minWidth:200}}><strong>Specific, Never Generic:</strong> Every recognition ties to a real company value and a real moment -- "great job" alone can demotivate. Points convert to tangible rewards, not just a feel-good badge.</div>
      </div>

      {ANNIVERSARIES.length>0&&(
        <div style={{background:G,borderRadius:14,padding:'14px 18px',marginBottom:18,color:'#fff',display:'flex',gap:10,alignItems:'center'}}>
          <span style={{fontSize:22}}>🎂</span>
          <div style={{fontSize:11,fontWeight:700}}>{ANNIVERSARIES[0].employee} celebrates {ANNIVERSARIES[0].years} years today! 🎉</div>
        </div>
      )}

      <SearchBar value={search} onChange={setSearch} placeholder="Search recognitions..."/>

      <div style={{display:'grid',gap:14,marginTop:14}}>
        {filtered.map(r=>(
          <div key={r.id}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:`${r.from} to ${r.to}`,...r}})}}
            style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'16px 18px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:8}}>
              <div style={{fontSize:11,color:'#374151'}}><strong>{r.from}</strong> recognized <strong>{r.to}</strong></div>
              <span style={{background:'#fff7ed',color:'#b45309',fontSize:8,fontWeight:700,padding:'2px 9px',borderRadius:20}}>{r.value_tag}</span>
            </div>
            <div style={{fontSize:10,color:'#374151',marginTop:8}}>"{r.message}"</div>
            <div style={{display:'flex',justifyContent:'space-between',marginTop:10}}>
              <span style={{fontSize:9,color:'#94a3b8'}}>{r.time}</span>
              <span style={{fontSize:10,fontWeight:700,color:A}}>+{r.points} pts</span>
            </div>
          </div>
        ))}
      </div>

      {showRecognize&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowRecognize(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(480px,100%)'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 24px'}}><div style={{fontSize:15,fontWeight:900,color:'#fff'}}>Recognize a Peer</div></div>
            <div style={{padding:'22px 24px'}}>
              <Field label="Recognize" value="" onChange={()=>{}} accent={A} required hint="Type a name"/>
              <Field label="Company Value" type="select" value="" onChange={()=>{}} accent={A} options={['Going Above and Beyond','Customer Obsession','Team-First Attitude','Innovation']}/>
              <Field label="Your Message" type="textarea" value="" onChange={()=>{}} accent={A} required hint="Be specific -- voice input supported"/>
              <button onClick={()=>setShowRecognize(false)} style={{width:'100%',padding:13,borderRadius:11,border:'none',background:G,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>Send Recognition</button>
            </div>
          </div>
        </div>
      )}

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['AI nudges managers when a team member hasn\'t been recognized in 60+ days.','Recognition feeds directly into Rewards & Recognition for promotion and bonus context.','Tenure milestones auto-surface company-wide -- no manual tracking by HR.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Detail',key:'view'},{icon:'❤️',label:'Add a Like',key:'like'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}
