// FILE: BuddyAssignmentPage.jsx - Buddy Assignment (Employee Joining)
// Peer mentorship pairing (not manager), profile tile with chat quick-action

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, LuxCard, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#831843 0%,#db2777 60%,#f9a8d4 100%)'
const A = '#db2777'

const PAIRINGS = [
  { id:'bp1', newHire:'Gita Maharjan', newHireRole:'Cloud Architect', newHireDept:'IT',
    buddy:'Bikash Shrestha', buddyRole:'Senior IT Lead', buddyTenure:'4 years', buddyDept:'IT',
    matched_on:['Same Department','Similar Tech Stack','Available Capacity'], match_score:94,
    status:'active', coffee_chat_scheduled:'2025-06-24 11:00', notified:true,
    impact_links:['Department Introduction','Orientation Program'] },
  { id:'bp2', newHire:'Sunita Rai', newHireRole:'Senior Software Developer', newHireDept:'IT',
    buddy:'Anita Gurung', buddyRole:'Senior Developer', buddyTenure:'3 years', buddyDept:'IT',
    matched_on:['Same Department','Similar Role Level'], match_score:88,
    status:'pending_response', coffee_chat_scheduled:null, notified:true,
    impact_links:[] },
  { id:'bp3', newHire:'Maya Pradhan', newHireRole:'Finance Manager', newHireDept:'Finance',
    buddy:'Sanjay Karki', buddyRole:'CFO', buddyTenure:'8 years', buddyDept:'Finance',
    matched_on:['Department Leadership Pairing'], match_score:79,
    status:'active', coffee_chat_scheduled:'2025-06-20 15:00', notified:true,
    impact_links:['Department Introduction'] },
]

const STATUS_CFG = {
  active:{c:'#10b981',bg:'#f0fdf4',icon:'✅',label:'Active'},
  pending_response:{c:'#f59e0b',bg:'#fffbeb',icon:'⏳',label:'Awaiting Buddy Response'},
}

export default function BuddyAssignmentPage() {
  const [pairings, setPairings] = useState(PAIRINGS)

  const [form, setForm] = useState({})
  const [msg, setMsg] = useState("")
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(""),3000) }
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = pairings.filter(p=>!search||p.newHire.toLowerCase().includes(search.toLowerCase()))
  const activeCount = pairings.filter(p=>p.status==='active').length
  const avgMatch = Math.round(pairings.reduce((s,p)=>s+p.match_score,0)/pairings.length)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🤝" title="Buddy Assignment"
        breadcrumb="Employee Lifecycle > Onboarding > Employee Joining"
        gradient={G}
        stats={[
          {icon:'🤝',label:'Total Pairings', value:pairings.length},
          {icon:'✅',label:'Active',          value:activeCount},
          {icon:'🤖',label:'Avg AI Match',    value:avgMatch+'%'},
          {icon:'☕',label:'Coffee Chats Set',value:pairings.filter(p=>p.coffee_chat_scheduled).length},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="Assign Buddy"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'linear-gradient(135deg,#fdf2f8,#fce7f3)',border:'1px solid #fbcfe8',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#831843',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>💡</span>
        <div><strong>Peer Mentorship - not the manager:</strong> AI matches based on department, tech stack, role level, and buddy capacity. Buddy is auto-notified 1-2 weeks before start date to informally reach out. Helps assess fit during the mandatory 6-month probation period.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by new hire name..."/>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(360px,1fr))',gap:14,marginTop:14}}>
        {filtered.map(p=>{
          const sc = STATUS_CFG[p.status]||STATUS_CFG.pending_response
          return (
            <LuxCard key={p.id} color={sc.c}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:p.newHire,...p}})}}>
              <div style={{padding:'16px 16px 10px'}}>
                <span style={{background:sc.bg,color:sc.c,fontSize:9,fontWeight:700,padding:'2px 10px',borderRadius:20}}>{sc.icon} {sc.label}</span>

                {/* Pairing visualization */}
                <div style={{display:'flex',alignItems:'center',gap:10,margin:'12px 0'}}>
                  <div style={{flex:1,textAlign:'center'}}>
                    <div style={{width:48,height:48,borderRadius:'50%',background:`${A}18`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:900,color:A,margin:'0 auto 6px'}}>
                      {p.newHire.split(' ').map(n=>n[0]).join('')}
                    </div>
                    <div style={{fontSize:11,fontWeight:800,color:'#0f172a'}}>{p.newHire}</div>
                    <div style={{fontSize:9,color:'#94a3b8'}}>New Hire</div>
                  </div>
                  <div style={{fontSize:20,color:A}}>🔗</div>
                  <div style={{flex:1,textAlign:'center'}}>
                    <div style={{width:48,height:48,borderRadius:'50%',background:'#f0fdf4',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:900,color:'#15803d',margin:'0 auto 6px'}}>
                      {p.buddy.split(' ').map(n=>n[0]).join('')}
                    </div>
                    <div style={{fontSize:11,fontWeight:800,color:'#0f172a'}}>{p.buddy}</div>
                    <div style={{fontSize:9,color:'#94a3b8'}}>Buddy</div>
                  </div>
                </div>

                <div style={{background:'#f8fafc',borderRadius:10,padding:'8px 12px',marginBottom:8}}>
                  <div style={{fontSize:10,color:'#64748b'}}>{p.buddyRole} . {p.buddyDept} . {p.buddyTenure} tenure</div>
                </div>

                <div style={{display:'flex',justifyContent:'space-between',marginBottom:6,fontSize:10}}>
                  <span style={{color:'#64748b'}}>AI Match Score</span>
                  <span style={{fontWeight:800,color:p.match_score>=85?'#10b981':'#f59e0b'}}>{p.match_score}%</span>
                </div>
                <div style={{height:6,background:'#f1f5f9',borderRadius:6,overflow:'hidden',marginBottom:8}}>
                  <div style={{width:`${p.match_score}%`,height:'100%',background:p.match_score>=85?'#10b981':'#f59e0b',borderRadius:6}}/>
                </div>

                <div style={{display:'flex',gap:4,flexWrap:'wrap',marginBottom:8}}>
                  {p.matched_on.map((m,i)=><span key={i} style={{background:`${A}10`,color:A,fontSize:9,padding:'2px 8px',borderRadius:20}}>{m}</span>)}
                </div>

                {p.coffee_chat_scheduled&&<div style={{fontSize:10,color:'#10b981',fontWeight:600}}>☕ Coffee chat: {p.coffee_chat_scheduled}</div>}
              </div>
              <div style={{borderTop:'1px solid #f1f5f9',padding:'8px 12px',display:'flex',gap:6}}>
                <button onClick={ev=>ev.stopPropagation()} style={{flex:1,padding:'7px',borderRadius:8,border:'none',background:`${A}12`,color:A,fontSize:10,fontWeight:700,cursor:'pointer'}}>💬 Ping on Chat</button>
                <button onClick={ev=>ev.stopPropagation()} style={{flex:1,padding:'7px',borderRadius:8,border:'none',background:'#f0fdf4',color:'#15803d',fontSize:10,fontWeight:700,cursor:'pointer'}}>View Buddy Bio</button>
              </div>
            </LuxCard>
          )
        })}
      </div>

      {showAdd&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowAdd(false)}>
          <div style={{background:'#fff',borderRadius:20,width:600,maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Assign Buddy</div></div>
            <div style={{padding:'22px 28px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
                <div><label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>New Hire</label><select value={form.new_hire||''} onChange={e=>setForm(p=>({...p,new_hire:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',background:'#fff',boxSizing:'border-box'}}>{['Sunita Rai','Priya Khadka'].map(o=><option key={o} value={o}>{o}</option>)}</select></div>
                <div><label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Suggested Buddy (AI-Matched)</label><select value={form.suggested_buddy_aimatched||''} onChange={e=>setForm(p=>({...p,suggested_buddy_aimatched:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',background:'#fff',boxSizing:'border-box'}}>{['Anita Gurung (88% match)','Bikash Shrestha (76% match)'].map(o=><option key={o} value={o}>{o}</option>)}</select></div>
                <div><label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Coffee Chat Date</label><input type="date" value={form.coffee_chat_date||''} onChange={e=>setForm(p=>({...p,coffee_chat_date:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/></div>
                <div><label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Coffee Chat Time</label><input type="time" value={form.coffee_chat_time||''} onChange={e=>setForm(p=>({...p,coffee_chat_time:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/></div>
              </div>
              <AIImpact color={A} lines={['AI matches by department, tech stack, role level, and buddy availability.','Buddy auto-notified to schedule an informal welcome chat for Week 1.','Buddy is a peer, never the direct manager - encourages candid questions.']}/>
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>setShowAdd(false)} style={{flex:1,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Assign & Notify Buddy</button>
                <button onClick={()=>setShowAdd(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:400}}>{msg}</div>}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Pairing',key:'view'},{icon:'💬',label:'Message Buddy',key:'message'},
        {icon:'🔄',label:'Reassign Buddy',key:'reassign'},{icon:'📤',label:'Export',key:'export'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Buddy Assignment" columns={['New Hire','Department','Buddy','Buddy Role','Match Score','Status','Coffee Chat Date']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[NepHR Import]", f.name, result); }}/>}
    </div>
  )
}
