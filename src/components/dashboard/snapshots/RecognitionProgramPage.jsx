// FILE: RecognitionProgramPage.jsx - Recognition Program (Performance & Talent > Goal & Performance)
// Peer-to-peer kudos feed, gamified leaderboard, core-values tagging -
// distinct from Reward Program (this is non-monetary, public recognition).

import { useState } from 'react'
import { Field, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#581c87 0%,#7c3aed 60%,#c4b5fd 100%)'
const A = '#7c3aed'

const CORE_VALUES = ['Customer Obsession','Integrity','Teamwork','Innovation','Excellence']

const KUDOS_FEED = [
  { id:'k1', from:'Sushila Gurung', to:'Bikash Rai', value:'Teamwork', message:'Stayed late to help onboard the new hire - exactly the spirit we need!', points:25, timestamp:'2025-06-21', impact_links:['Continuous Feedback'] },
  { id:'k2', from:'Maya Pradhan', to:'Anjali Sharma', value:'Customer Obsession', message:'Went above and beyond to resolve a client escalation on a Friday evening.', points:30, timestamp:'2025-06-20', impact_links:[] },
  { id:'k3', from:'Dipesh Bhattarai', to:'Gita Maharjan', value:'Innovation', message:'Proposed the automation that saved us 6 hours/week on reconciliation.', points:40, timestamp:'2025-06-19', impact_links:['Performance Appraisal'] },
]

const LEADERBOARD = [
  {employee:'Gita Maharjan',points:340,badges:5},{employee:'Anjali Sharma',points:295,badges:4},
  {employee:'Bikash Rai',points:210,badges:3},
]

export default function RecognitionProgramPage() {
  const [search, setSearch] = useState('')
  const [showCompose, setShowCompose] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = KUDOS_FEED.filter(k=>!search||k.to.toLowerCase().includes(search.toLowerCase())||k.from.toLowerCase().includes(search.toLowerCase()))
  const totalPointsGiven = KUDOS_FEED.reduce((s,k)=>s+k.points,0)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="👏" title="Recognition Program"
        breadcrumb="Performance & Talent Management > Goal & Performance"
        gradient={G}
        stats={[
          {icon:'👏',label:'Kudos This Month', value:KUDOS_FEED.length},
          {icon:'⭐',label:'Points Given',       value:totalPointsGiven},
          {icon:'🏆',label:'Top Performer',      value:LEADERBOARD[0].employee.split(' ')[0]},
          {icon:'💎',label:'Core Values',        value:CORE_VALUES.length},
        ]}
        onAdd={()=>setShowCompose(true)} addLabel="Give Kudos"/>

      <div style={{background:'#faf5ff',border:'1px solid #e9d5ff',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#581c87',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🌟</span>
        <div style={{flex:1,minWidth:200}}><strong>Public, Decentralized, Values-Driven:</strong> Anyone can recognize anyone - not just top-down. Every kudos is tagged to a core company value and publicly visible, building a culture of democratized appreciation rather than rare, manager-only praise.</div>
      </div>

      {/* Leaderboard */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 18px',marginBottom:18}}>
        <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:12}}>🏆 This Month's Leaderboard</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:10}}>
          {LEADERBOARD.map((l,i)=>(
            <div key={i} style={{background:i===0?'#fffbeb':'#f8fafc',border:i===0?'1.5px solid #fde68a':'1px solid #e2e8f0',borderRadius:12,padding:'12px',textAlign:'center'}}>
              <div style={{fontSize:18}}>{i===0?'🥇':i===1?'🥈':'🥉'}</div>
              <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginTop:4}}>{l.employee}</div>
              <div style={{fontSize:14,fontWeight:900,color:A,marginTop:2}}>{l.points} pts</div>
              <div style={{fontSize:8,color:'#94a3b8'}}>{l.badges} badges earned</div>
            </div>
          ))}
        </div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by name..."/>

      <div style={{display:'grid',gap:12,marginTop:14}}>
        {filtered.map(k=>(
          <div key={k.id}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:`${k.from} -> ${k.to}`,...k}})}}
            style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'14px 18px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8,marginBottom:6}}>
              <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
                <span style={{fontSize:11,fontWeight:800,color:'#0f172a'}}>{k.from}</span>
                <span style={{color:'#94a3b8'}}>{'>'}</span>
                <span style={{fontSize:11,fontWeight:800,color:'#0f172a'}}>{k.to}</span>
                <span style={{background:`${A}15`,color:A,fontSize:8,fontWeight:700,padding:'2px 8px',borderRadius:20}}>💎 {k.value}</span>
              </div>
              <span style={{fontSize:11,fontWeight:800,color:'#7c3aed'}}>+{k.points} pts</span>
            </div>
            <div style={{fontSize:10,color:'#374151'}}>{k.message}</div>
            <div style={{fontSize:8,color:'#94a3b8',marginTop:4}}>{k.timestamp}</div>
          </div>
        ))}
      </div>

      {showCompose&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowCompose(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(480px,100%)'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'18px 24px'}}><div style={{fontSize:15,fontWeight:900,color:'#fff'}}>Give Kudos</div></div>
            <div style={{padding:'20px 24px'}}>
              <Field label="To" type="select" value="" onChange={()=>{}} accent={A} options={['Gita Maharjan','Bikash Rai','Anjali Sharma']}/>
              <Field label="Core Value" type="select" value="" onChange={()=>{}} accent={A} options={CORE_VALUES}/>
              <Field label="Message" type="textarea" value="" onChange={()=>{}} accent={A} required hint="Voice input supported"/>
              <div style={{display:'flex',gap:10,marginTop:8}}>
                <button onClick={()=>setShowCompose(false)} style={{flex:1,padding:12,borderRadius:10,border:'none',background:G,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>Send Kudos</button>
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
