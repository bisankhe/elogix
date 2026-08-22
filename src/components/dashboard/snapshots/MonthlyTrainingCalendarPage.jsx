// FILE: MonthlyTrainingCalendarPage.jsx - Monthly Training Calendar
// (Performance & Talent > Talent Development > Learning & Development)
// Color-coded month grid (Soft Skills=Blue, Technical=Green, Compliance=
// Red), self-nomination with manager approval, dept/location/trainer filters.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#0c4a6e 0%,#0284c7 60%,#7dd3fc 100%)'
const A = '#0284c7'

const CATEGORY_CFG = {Technical:{c:'#10b981'},'Soft Skills':{c:'#3b82f6'},Compliance:{c:'#ef4444'},Leadership:{c:'#7c3aed'}}
const DAYS_IN_MONTH = 30

const MONTH_SESSIONS = [
  {day:5,course:'OSH & Fire Safety Refresher',category:'Compliance',seats_total:30,seats_filled:24,trainer:'Internal Safety Officer',dept:'All'},
  {day:12,course:'AWS Cloud Fundamentals',category:'Technical',seats_total:15,seats_filled:15,trainer:'External - AWS Certified',dept:'IT'},
  {day:18,course:'Effective Stakeholder Communication',category:'Soft Skills',seats_total:20,seats_filled:8,trainer:'Priya Adhikari (HR)',dept:'All'},
  {day:24,course:'New Manager Leadership Bootcamp',category:'Leadership',seats_total:12,seats_filled:10,trainer:'External Coach',dept:'Management'},
]

export default function MonthlyTrainingCalendarPage() {
  const [search, setSearch] = useState('')
  const [selectedDay, setSelectedDay] = useState(null)
  const [filterDept, setFilterDept] = useState('all')
  const [ctx, setCtx] = useState(null)

  const filtered = MONTH_SESSIONS.filter(s=>{
    if (filterDept!=='all'&&s.dept!=='All'&&s.dept!==filterDept) return false
    if (search&&!s.course.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })
  const sessionsByDay = {}
  filtered.forEach(s=>{ sessionsByDay[s.day]=s })

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📅" title="Monthly Training Calendar"
        breadcrumb="Performance & Talent Management > Talent Development > Learning & Development"
        gradient={G}
        stats={[
          {icon:'📅',label:'Sessions This Month', value:MONTH_SESSIONS.length},
          {icon:'🪑',label:'Total Seats',           value:MONTH_SESSIONS.reduce((s,m)=>s+m.seats_total,0)},
          {icon:'✅',label:'Avg Fill Rate',          value:Math.round(MONTH_SESSIONS.reduce((s,m)=>s+m.seats_filled/m.seats_total,0)/MONTH_SESSIONS.length*100)+'%'},
          {icon:'📂',label:'Categories',              value:Object.keys(CATEGORY_CFG).length},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#1e40af',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🎨</span>
        <div style={{flex:1,minWidth:200}}><strong>Color-Coded Tactical View:</strong> Blue = Soft Skills, Green = Technical, Red = Compliance, Purple = Leadership. Click any day to self-nominate - your manager gets a one-click approval notification in the same portal, no email chains.</div>
      </div>

      <div style={{display:'flex',gap:10,marginBottom:14,flexWrap:'wrap'}}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search by course name..."/>
        <div style={{display:'flex',gap:4,background:'#f1f5f9',padding:3,borderRadius:9,flexWrap:'wrap'}}>
          {['all','IT','Management'].map(d=>(
            <button key={d} onClick={()=>setFilterDept(d)}
              style={{padding:'7px 12px',borderRadius:7,border:'none',cursor:'pointer',fontSize:10,
                background:filterDept===d?'#fff':'transparent',color:filterDept===d?A:'#64748b',
                fontWeight:filterDept===d?700:400,boxShadow:filterDept===d?'0 1px 3px rgba(0,0,0,.08)':'none'}}>
              {d==='all'?'All Depts':d}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar grid */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'20px',marginBottom:18}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:6}}>
          {Array.from({length:DAYS_IN_MONTH},(_,i)=>i+1).map(day=>{
            const session = sessionsByDay[day]
            const cc = session ? CATEGORY_CFG[session.category] : null
            return (
              <div key={day} onClick={()=>session&&setSelectedDay(session)}
                onContextMenu={ev=>{if(session){ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:session.course,impact_links:['Training Recommendation']}})}}}
                style={{minHeight:60,borderRadius:8,padding:6,border:'1px solid #f1f5f9',cursor:session?'pointer':'default',
                  background:session?`${cc.c}10`:'#fff'}}>
                <div style={{fontSize:9,color:'#94a3b8',fontWeight:700}}>{day}</div>
                {session&&(
                  <div style={{marginTop:4,background:cc.c,color:'#fff',fontSize:8,fontWeight:700,padding:'3px 5px',borderRadius:5,lineHeight:1.3}}>
                    {session.course.length>18?session.course.slice(0,16)+'…':session.course}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Details modal */}
      {selectedDay&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setSelectedDay(null)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(460px,100%)'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'18px 24px'}}>
              <div style={{fontSize:15,fontWeight:900,color:'#fff'}}>{selectedDay.course}</div>
              <span style={{background:'rgba(255,255,255,.2)',color:'#fff',fontSize:9,fontWeight:700,padding:'2px 9px',borderRadius:20}}>{selectedDay.category}</span>
            </div>
            <div style={{padding:'20px 24px'}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:11,marginBottom:10}}>
                <span style={{color:'#64748b'}}>Trainer</span><span style={{fontWeight:700,color:'#0f172a'}}>{selectedDay.trainer}</span>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:11,marginBottom:14}}>
                <span style={{color:'#64748b'}}>Seats Available</span><span style={{fontWeight:700,color:selectedDay.seats_filled>=selectedDay.seats_total?'#ef4444':'#10b981'}}>{selectedDay.seats_total-selectedDay.seats_filled} of {selectedDay.seats_total}</span>
              </div>
              <button disabled={selectedDay.seats_filled>=selectedDay.seats_total} style={{width:'100%',padding:12,borderRadius:10,border:'none',background:selectedDay.seats_filled>=selectedDay.seats_total?'#e2e8f0':G,color:selectedDay.seats_filled>=selectedDay.seats_total?'#94a3b8':'#fff',fontSize:13,fontWeight:700,cursor:selectedDay.seats_filled>=selectedDay.seats_total?'not-allowed':'pointer'}}>{selectedDay.seats_filled>=selectedDay.seats_total?'Fully Booked':'Self-Nominate for This Session'}</button>
            </div>
          </div>
        </div>
      )}

      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Fill-rate dropping below 60% three days before a session auto-triggers a reminder nudge to eligible employees.','Manager approval routes instantly to the same self-nomination flow - no separate email.','30-day post-training follow-up auto-scheduled to check skill application.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Session Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}
