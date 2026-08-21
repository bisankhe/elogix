// FILE: WellnessProgramPage.jsx - Wellness Program
// (Employee Experience & Culture > Wellness & Support)
// Personalized dashboard: daily goals, fitness challenges, wearable
// sync, lifestyle-spending reward claims. Syncs with the EXISTING
// recognition_points_ledger (Appreciation Program session) for rewards.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#052e16 0%,#15803d 60%,#86efac 100%)'
const A = '#15803d'

const MY_WELLNESS = { steps_today:7240, steps_goal:10000, wearable_synced:true, lifestyle_balance_npr:4500 }

const CHALLENGES = [
  { id:'ch1', title:'June Step Challenge', participants:48, my_progress_pct:72, ends:'2025-06-30', reward_points:100 },
  { id:'ch2', title:'Mindful Monday Streak', participants:22, my_progress_pct:45, ends:'ongoing', reward_points:20 },
]

const REWARD_CATALOG = [
  {item:'Gym Membership Reimbursement',cost_npr:3000},{item:'Yoga Class Pack',cost_npr:1500},{item:'Fitness Tracker Discount',cost_npr:2000},
]

export default function WellnessProgramPage() {
  const [search, setSearch] = useState('')
  const [ctx, setCtx] = useState(null)

  const filtered = CHALLENGES.filter(c=>!search||c.title.toLowerCase().includes(search.toLowerCase()))
  const stepPct = Math.round(MY_WELLNESS.steps_today/MY_WELLNESS.steps_goal*100)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🌱" title="Wellness Program"
        breadcrumb="Employee Experience & Culture > Wellness & Support"
        gradient={G}
        stats={[
          {icon:'👟',label:"Today's Steps",  value:MY_WELLNESS.steps_today.toLocaleString()},
          {icon:'🏆',label:'Active Challenges', value:CHALLENGES.length},
          {icon:'💰',label:'Lifestyle Balance',   value:'NPR '+MY_WELLNESS.lifestyle_balance_npr.toLocaleString()},
          {icon:'⌚',label:'Wearable',               value:MY_WELLNESS.wearable_synced?'Synced':'Not Synced'},
        ]}
        onAdd={()=>{}} addLabel="+ Join a Challenge"/>

      <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🎯</span>
        <div style={{flex:1,minWidth:200}}><strong>Bite-Sized, Not Overwhelming:</strong> Daily goals and team challenges keep wellness approachable -- claim lifestyle-spending rewards with a single tap, no paperwork required.</div>
      </div>

      {/* Daily goal ring */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'20px',marginBottom:18,display:'flex',gap:20,alignItems:'center',flexWrap:'wrap'}}>
        <svg width="100" height="100" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="15.5" fill="none" stroke="#f1f5f9" strokeWidth="5"/>
          <circle cx="18" cy="18" r="15.5" fill="none" stroke={A} strokeWidth="5" strokeDasharray={`${stepPct} 100`} strokeDashoffset="25" transform="rotate(-90 18 18)"/>
        </svg>
        <div style={{flex:1,minWidth:200}}>
          <div style={{fontSize:18,fontWeight:900,color:A}}>{stepPct}% of daily goal</div>
          <div style={{fontSize:10,color:'#94a3b8',marginTop:4}}>{MY_WELLNESS.steps_today.toLocaleString()} / {MY_WELLNESS.steps_goal.toLocaleString()} steps -- synced automatically from your wearable</div>
        </div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search challenges..."/>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:14,marginTop:14,marginBottom:18}}>
        {filtered.map(c=>(
          <div key={c.id}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:c.title,...c,impact_links:['Appreciation Program']}})}}
            style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'16px'}}>
            <div style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{c.title}</div>
            <div style={{height:7,background:'#f1f5f9',borderRadius:7,overflow:'hidden',marginTop:10}}><div style={{width:`${c.my_progress_pct}%`,height:'100%',background:A,borderRadius:7}}/></div>
            <div style={{display:'flex',justifyContent:'space-between',marginTop:6,fontSize:8,color:'#94a3b8'}}>
              <span>👥 {c.participants} joined</span><span>+{c.reward_points} pts</span>
            </div>
          </div>
        ))}
      </div>

      {/* Reward catalog */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px'}}>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:12}}>🎁 Lifestyle Spending Rewards</div>
        {REWARD_CATALOG.map((r,i)=>(
          <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:i<REWARD_CATALOG.length-1?'1px solid #f8fafc':'none'}}>
            <span style={{fontSize:10,color:'#374151'}}>{r.item}</span>
            <button style={{padding:'4px 14px',borderRadius:8,border:'none',background:A,color:'#fff',fontSize:9,fontWeight:700,cursor:'pointer'}}>NPR {r.cost_npr.toLocaleString()} -- Claim</button>
          </div>
        ))}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Wearable data syncs automatically -- no manual step entry required.','Challenge participation feeds the existing Recognition Points Ledger -- one balance, not a separate wellness currency.','Anonymized utilization trends help HR spot burnout risk by department without ever exposing individual data.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
