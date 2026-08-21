// FILE: UpcomingEventsPage.jsx — Upcoming Events (was showing nothing)
import { useState } from 'react'

const G = 'linear-gradient(135deg,#0c4a6e 0%,#0891b2 60%,#38bdf8 100%)'
const A = '#0891b2'
const TYPE_META = {
  payroll:    {color:'#7c3aed',bg:'#f5f3ff',icon:'💰'},
  compliance: {color:'#ef4444',bg:'#fef2f2',icon:'⚠️'},
  training:   {color:'#0891b2',bg:'#f0f9ff',icon:'🎓'},
  holiday:    {color:'#f59e0b',bg:'#fffbeb',icon:'🏖️'},
  onboard:    {color:'#10b981',bg:'#f0fdf4',icon:'🎉'},
  meeting:    {color:'#374151',bg:'#f9fafb',icon:'📋'},
  review:     {color:'#8b5cf6',bg:'#faf5ff',icon:'📊'},
  social:     {color:'#f97316',bg:'#fff7ed',icon:'🎊'},
  birthday:   {color:'#ec4899',bg:'#fdf4ff',icon:'🎂'},
  anniversary:{color:'#10b981',bg:'#f0fdf4',icon:'🥂'},

const UPCOMING = [
  { id:1,  days:0,  date:'Today',   title:'Payroll Lock — July 2081',          type:'payroll',     time:'6:00 PM',   dept:'Finance',    priority:'high',   desc:'Monthly attendance lock before payroll run' },
  { id:2,  days:1,  date:'Aug 1',   title:'New Joiners Orientation',           type:'onboard',     time:'09:00 AM',  dept:'HR',         priority:'high',   desc:'3 new hires reporting — Gita, Sunita, Ram' },
  { id:3,  days:2,  date:'Aug 2',   title:'SSF Contribution Deadline',         type:'compliance',  time:'5:00 PM',   dept:'Finance',    priority:'critical',desc:'Monthly SSF submission to Employees Provident Fund' },
  { id:4,  days:3,  date:'Aug 3',   title:'Birthday: Priya Maharjan',          type:'birthday',    time:'All Day',   dept:'Finance',    priority:'normal', desc:'Finance Manager celebrates birthday' },
  { id:5,  days:5,  date:'Aug 5',   title:'AWS Cloud Training — Batch 2',      type:'training',    time:'10:00 AM',  dept:'IT',         priority:'normal', desc:'12 IT staff enrolled, Conf Room B' },
  { id:6,  days:7,  date:'Aug 7',   title:'Q2 Performance Review Deadline',    type:'review',      time:'EOD',       dept:'All',        priority:'high',   desc:'All managers must submit reviews by end of day' },
  { id:7,  days:8,  date:'Aug 8',   title:'Work Anniversary: Ram Sah (5 yrs)',type:'anniversary', time:'All Day',   dept:'Operations', priority:'normal', desc:'5 years of dedicated service — celebrate!' },
  { id:8,  days:10, date:'Aug 10',  title:'Contract Expiry: Ramesh Koirala',   type:'compliance',  time:'—',         dept:'Sales',      priority:'critical',desc:'Contract ends — renew or conclude by Aug 10' },
  { id:9,  days:12, date:'Aug 12',  title:'Board of Directors Meeting',        type:'meeting',     time:'10:00 AM',  dept:'Executive',  priority:'high',   desc:'Q2 results presentation + Q3 planning' },
  { id:10, days:14, date:'Aug 14',  title:'National Holiday — Janai Purnima', type:'holiday',     time:'All Day',   dept:'All',        priority:'normal', desc:'Office closed — mandatory leave' },
  { id:11, days:18, date:'Aug 18',  title:'HR Policy Review Workshop',         type:'meeting',     time:'2:00 PM',   dept:'HR',         priority:'normal', desc:'Annual policy update session for all HODs' },
  { id:12, days:22, date:'Aug 22',  title:'Payroll Processing — August',       type:'payroll',     time:'09:00 AM',  dept:'Finance',    priority:'high',   desc:'Monthly salary disbursement' },
  { id:13, days:28, date:'Aug 28',  title:'Company Picnic — Team Outing',      type:'social',      time:'7:00 AM',   dept:'All',        priority:'normal', desc:'Annual team-building at Nagarkot' },
  { id:14, days:32, date:'Sep 2',   title:'Labour Audit — Dept. of Labour',    type:'compliance',  time:'10:00 AM',  dept:'HR',         priority:'critical',desc:'Annual inspection — documents must be ready' },
]

const PRIORITY_C = { critical:'#ef4444', high:'#f59e0b', normal:'#10b981' }

export default function UpcomingEventsPage() {
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  const filtered = UPCOMING.filter(e =>
    (filter==='all'||e.type===filter||e.priority===filter) &&
    (!search||e.title.toLowerCase().includes(search.toLowerCase())||e.dept.toLowerCase().includes(search.toLowerCase()))
  )

  const critical = UPCOMING.filter(e=>e.priority==='critical').length
  const thisWeek = UPCOMING.filter(e=>e.days<=7).length

  return (
    <div style={{fontFamily:'system-ui,sans-serif'}}>
      <div style={{background:G,borderRadius:14,padding:'16px 22px',marginBottom:14,color:'#fff'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
          <div>
            <h2 style={{margin:0,fontSize:20,fontWeight:900}}>🔔 Upcoming Events</h2>
            <p style={{margin:'3px 0 0',fontSize:10,opacity:.8}}>Deadlines · Holidays · Meetings · Birthdays · Compliance · Training</p>
          </div>
          <div style={{display:'flex',gap:12}}>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:22,fontWeight:900,color:'#fbbf24'}}>{critical}</div>
              <div style={{fontSize:8,opacity:.8}}>Critical</div>
            </div>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:22,fontWeight:900}}>{thisWeek}</div>
              <div style={{fontSize:8,opacity:.8}}>This Week</div>
            </div>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:22,fontWeight:900}}>{UPCOMING.length}</div>
              <div style={{fontSize:8,opacity:.8}}>Total</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{display:'flex',gap:6,marginBottom:14,flexWrap:'wrap'}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search events..."
          style={{flex:1,minWidth:160,padding:'8px 12px',borderRadius:9,border:'1px solid #e2e8f0',fontSize:10,outline:'none'}}/>
        {['all','critical','high','compliance','payroll','training','holiday','birthday'].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{padding:'7px 14px',borderRadius:20,border:filter!==f?'1px solid #e2e8f0':'none',background:filter===f?A:'#fff',color:filter===f?'#fff':'#475569',fontSize:9,fontWeight:700,cursor:'pointer',textTransform:'capitalize'}}>{f}</button>
        ))}
      </div>

      <div style={{display:'grid',gap:8}}>
        {filtered.map(ev=>{
          const m = TYPE_META[ev.type]||TYPE_META.meeting
          const isToday = ev.days===0
          const isUrgent = ev.days<=3
          return (
            <div key={ev.id} style={{background:'#fff',borderRadius:13,border:`1px solid ${isToday?A:m.color}30`,padding:'14px 16px',display:'flex',gap:14,alignItems:'flex-start',position:'relative',overflow:'hidden'}}>
              {isToday&&<div style={{position:'absolute',top:0,left:0,right:0,height:3,background:G}}/>}
              {/* Days badge */}
              <div style={{width:54,height:54,borderRadius:12,background:isToday?A:isUrgent?`${m.color}15`:m.bg,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',flexShrink:0,border:`2px solid ${isToday?'#fff':m.color}30`}}>
                <div style={{fontSize:isToday?11:16,fontWeight:900,color:isToday?'#fff':m.color}}>{isToday?'TODAY':ev.days}</div>
                {!isToday&&<div style={{fontSize:7,color:m.color}}>days</div>}
              </div>
              <div style={{flex:1}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:6,marginBottom:4}}>
                  <div style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{ev.title}</div>
                  <div style={{display:'flex',gap:5}}>
                    {ev.priority!=='normal'&&<span style={{fontSize:8,fontWeight:700,padding:'2px 8px',borderRadius:20,background:PRIORITY_C[ev.priority]+'20',color:PRIORITY_C[ev.priority]}}>{ev.priority.toUpperCase()}</span>}
                    <span style={{fontSize:8,fontWeight:700,padding:'2px 8px',borderRadius:20,background:m.bg,color:m.color}}>{m.icon} {ev.type}</span>
                  </div>
                </div>
                <div style={{fontSize:9,color:'#64748b',marginBottom:4}}>{ev.desc}</div>
                <div style={{display:'flex',gap:12,fontSize:9,color:'#94a3b8'}}>
                  <span>📅 {ev.date}</span>
                  <span>⏰ {ev.time}</span>
                  <span>🏢 {ev.dept}</span>
                </div>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:4,flexShrink:0}}>
                <button style={{padding:'5px 12px',borderRadius:8,border:'none',background:A,color:'#fff',fontSize:8,fontWeight:700,cursor:'pointer'}}>Details</button>
                {ev.priority==='critical'&&<button style={{padding:'5px 12px',borderRadius:8,border:'1px solid #ef4444',background:'#fff',color:'#ef4444',fontSize:8,cursor:'pointer'}}>⚡ Act Now</button>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
