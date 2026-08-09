// FILE: CalendarEventsPage.jsx — Professional HR Calendar
// 5 views: Daily · Weekly · Monthly · Quarterly · Annual
// Color-coded events, click for details, filters, attractive design
import { useState } from 'react'

const G = 'linear-gradient(135deg,#1e1b4b 0%,#4338ca 60%,#818cf8 100%)'
const A = '#4338ca'

const TYPE_META = {
  payroll:    { color:'#7c3aed', bg:'#f5f3ff', icon:'💰', label:'Payroll'    },
  compliance: { color:'#ef4444', bg:'#fef2f2', icon:'⚠️',  label:'Compliance' },
  training:   { color:'#0891b2', bg:'#f0f9ff', icon:'🎓',  label:'Training'   },
  holiday:    { color:'#f59e0b', bg:'#fffbeb', icon:'🏖️',  label:'Holiday'    },
  onboard:    { color:'#10b981', bg:'#f0fdf4', icon:'🎉',  label:'Onboarding' },
  meeting:    { color:'#374151', bg:'#f9fafb', icon:'📋',  label:'Meeting'    },
  review:     { color:'#8b5cf6', bg:'#faf5ff', icon:'📊',  label:'Review'     },
  social:     { color:'#f97316', bg:'#fff7ed', icon:'🎊',  label:'Social'     },
  birthday:   { color:'#ec4899', bg:'#fdf4ff', icon:'🎂',  label:'Birthday'   },
  anniversary:{ color:'#059669', bg:'#f0fdf4', icon:'🥂',  label:'Anniversary'},
}

const EVENTS = [
  { id:1,  date:'2026-07-01', title:'Q3 HR Planning',            type:'meeting',     time:'10:00 AM', loc:'Conf. Room A',  dept:'HR' },
  { id:2,  date:'2026-07-05', title:'Birthday: Sita Adhikari',   type:'birthday',    time:'All Day',   loc:'Office',        dept:'Finance' },
  { id:3,  date:'2026-07-07', title:'Performance Review Q2',     type:'review',      time:'09:00 AM', loc:'HR Office',     dept:'All' },
  { id:4,  date:'2026-07-10', title:'New Joiner: Priya Sharma',  type:'onboard',     time:'09:00 AM', loc:'Reception',     dept:'HR' },
  { id:5,  date:'2026-07-12', title:'SSF Filing Deadline',       type:'compliance',  time:'5:00 PM',  loc:'Finance',       dept:'Finance' },
  { id:6,  date:'2026-07-15', title:'HR Strategy Workshop',      type:'training',    time:'10:00 AM', loc:'Training Hall', dept:'HR' },
  { id:7,  date:'2026-07-18', title:'Team Lunch — Sales',        type:'social',      time:'12:30 PM', loc:'Restro Cafe',   dept:'Sales' },
  { id:8,  date:'2026-07-22', title:'Payroll Processing',        type:'payroll',     time:'09:00 AM', loc:'Finance Dept',  dept:'Finance' },
  { id:9,  date:'2026-07-25', title:'Safety Drill',              type:'compliance',  time:'02:00 PM', loc:'Whole Office',  dept:'All' },
  { id:10, date:'2026-07-28', title:'Board Meeting',             type:'meeting',     time:'10:00 AM', loc:'Board Room',    dept:'Executive' },
  { id:11, date:'2026-07-29', title:'Anniversary: Ram Sah 5yr',  type:'anniversary', time:'All Day',   loc:'Office',        dept:'Ops' },
  { id:12, date:'2026-07-31', title:'Month-end Attendance Lock', type:'payroll',     time:'6:00 PM',  loc:'Finance',       dept:'Finance' },
  { id:13, date:'2026-08-01', title:'New Joiner Orientation',    type:'onboard',     time:'09:00 AM', loc:'Training Hall', dept:'HR' },
  { id:14, date:'2026-08-05', title:'AWS Cloud Training',        type:'training',    time:'10:00 AM', loc:'Training Hall', dept:'IT' },
  { id:15, date:'2026-08-07', title:'Q2 Review Deadline',        type:'review',      time:'EOD',      loc:'—',             dept:'All' },
  { id:16, date:'2026-08-10', title:'Contract Expiry: R. Koirala',type:'compliance', time:'—',        loc:'—',             dept:'Sales' },
  { id:17, date:'2026-08-14', title:'Janai Purnima — Holiday',   type:'holiday',     time:'All Day',   loc:'—',             dept:'All' },
  { id:18, date:'2026-08-22', title:'Payroll Processing — Aug',  type:'payroll',     time:'09:00 AM', loc:'Finance',       dept:'Finance' },
  { id:19, date:'2026-09-01', title:'Labour Audit Preparation',  type:'compliance',  time:'10:00 AM', loc:'HR Office',     dept:'HR' },
  { id:20, date:'2026-09-15', title:'Company Anniversary Day',   type:'social',      time:'All Day',   loc:'Banquet Hall',  dept:'All' },
  { id:21, date:'2026-10-10', title:'Q4 Budget Planning',        type:'meeting',     time:'10:00 AM', loc:'Conf. Room',    dept:'Finance' },
  { id:22, date:'2026-10-23', title:'Dashain Holiday Start',     type:'holiday',     time:'All Day',   loc:'—',             dept:'All' },
  { id:23, date:'2026-11-01', title:'Q3 Appraisal Cycle',        type:'review',      time:'09:00 AM', loc:'HR Office',     dept:'All' },
  { id:24, date:'2026-12-25', title:'Christmas / Year End',      type:'holiday',     time:'All Day',   loc:'—',             dept:'All' },
  { id:25, date:'2026-12-31', title:'Annual Review & Close',     type:'review',      time:'09:00 AM', loc:'HR Office',     dept:'All' },
]

const DAYS_IN_JULY = 31
const JULY_START_DOW = 2 // July 1 2026 = Wednesday

// Weekly view: week of Jul 28 – Aug 3
const WEEK_DATES = ['2026-07-27','2026-07-28','2026-07-29','2026-07-30','2026-07-31','2026-08-01','2026-08-02']
const WEEK_LABELS = ['Mon 27','Tue 28','Wed 29','Thu 30','Fri 31','Sat Aug 1','Sun Aug 2']

export default function CalendarEventsPage() {
  const [view, setView]       = useState('monthly')
  const [selType, setSelType] = useState('all')
  const [selDay, setSelDay]   = useState(null)
  const [selEvent, setSelEvent] = useState(null)

  const julyEvents = EVENTS.filter(e => e.date.startsWith('2026-07'))
  const filteredAll = selType === 'all' ? EVENTS : EVENTS.filter(e => e.type === selType)

  const evForDay = d => julyEvents.filter(e => parseInt(e.date.split('-')[2]) === d)
  const evForDate = date => EVENTS.filter(e => e.date === date)
  const quarter = q => {
    const ranges = { Q1:['01','02','03'], Q2:['04','05','06'], Q3:['07','08','09'], Q4:['10','11','12'] }
    return filteredAll.filter(e => ranges[q].includes(e.date.split('-')[1]))
  }

  const EventPill = ({ev, tiny}) => {
    const m = TYPE_META[ev.type] || TYPE_META.meeting
    return (
      <div onClick={e=>{e.stopPropagation();setSelEvent(ev)}}
        style={{fontSize:tiny?7:8,padding:tiny?'1px 4px':'3px 6px',borderRadius:4,background:m.color,color:'#fff',marginBottom:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',cursor:'pointer',display:'flex',gap:3,alignItems:'center'}}>
        <span>{m.icon}</span><span style={{overflow:'hidden',textOverflow:'ellipsis'}}>{ev.title}</span>
      </div>
    )
  }

  return (
    <div style={{fontFamily:'system-ui,sans-serif'}}>
      {/* Header */}
      <div style={{background:G,borderRadius:14,padding:'16px 22px',marginBottom:14,color:'#fff'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
          <div>
            <h2 style={{margin:0,fontSize:20,fontWeight:900}}>📅 HR Calendar</h2>
            <p style={{margin:'3px 0 0',fontSize:10,opacity:.8}}>Daily · Weekly · Monthly · Quarterly · Annual — All HR events, deadlines & milestones</p>
          </div>
          <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
            {['daily','weekly','monthly','quarterly','annual'].map(v=>(
              <button key={v} onClick={()=>setView(v)} style={{padding:'7px 16px',borderRadius:8,border:'none',cursor:'pointer',fontSize:9,fontWeight:700,
                background:view===v?'rgba(255,255,255,.95)':'rgba(255,255,255,.15)',
                color:view===v?A:'#fff',boxShadow:view===v?'0 2px 8px rgba(0,0,0,.15)':'none'}}>
                {v[0].toUpperCase()+v.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Type filter pills */}
      <div style={{display:'flex',gap:5,marginBottom:14,flexWrap:'wrap'}}>
        <button onClick={()=>setSelType('all')} style={{padding:'5px 14px',borderRadius:20,border:selType==='all'?'none':'1px solid #e2e8f0',background:selType==='all'?A:'#fff',color:selType==='all'?'#fff':'#475569',fontSize:9,fontWeight:700,cursor:'pointer'}}>All</button>
        {Object.entries(TYPE_META).map(([k,m])=>(
          <button key={k} onClick={()=>setSelType(k)} style={{padding:'5px 12px',borderRadius:20,border:selType===k?'none':`1px solid ${m.color}40`,background:selType===k?m.color:m.bg,color:selType===k?'#fff':m.color,fontSize:9,fontWeight:700,cursor:'pointer'}}>
            {m.icon} {m.label}
          </button>
        ))}
      </div>

      {/* ── DAILY VIEW ── */}
      {view==='daily' && (() => {
        const todayEvs = EVENTS.filter(e => e.date === '2026-07-31')
        return (
          <div>
            <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',padding:'18px',marginBottom:14}}>
              <div style={{fontSize:14,fontWeight:900,color:'#0f172a',marginBottom:4}}>📅 Thursday, July 31, 2026</div>
              <div style={{fontSize:10,color:'#64748b',marginBottom:16}}>{todayEvs.length} events today</div>
              {/* Time slots */}
              {['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00'].map(t => {
                const ev = todayEvs.find(e => e.time?.startsWith(t.replace(':00','')) || (t==='18:00' && e.time==='6:00 PM'))
                return (
                  <div key={t} style={{display:'flex',gap:12,minHeight:44,borderBottom:'1px solid #f1f5f9'}}>
                    <div style={{width:50,fontSize:9,color:'#94a3b8',paddingTop:4,flexShrink:0}}>{t}</div>
                    <div style={{flex:1,padding:'4px 0'}}>
                      {ev && m && (
                        <div onClick={()=>setSelEvent(ev)} style={{background:m.bg,border:`1px solid ${m.color}30`,borderLeft:`3px solid ${m.color}`,borderRadius:8,padding:'6px 12px',cursor:'pointer'}}>
                          <div style={{fontSize:11,fontWeight:700,color:'#0f172a'}}>{m.icon} {ev.title}</div>
                          <div style={{fontSize:9,color:'#64748b'}}>{ev.time} · {ev.loc} · {ev.dept}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* ── WEEKLY VIEW ── */}
      {view==='weekly' && (
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',overflow:'hidden'}}>
          <div style={{background:'#f8fafc',padding:'12px 16px',borderBottom:'1px solid #e2e8f0',fontSize:12,fontWeight:900,color:'#0f172a'}}>
            Week of Jul 27 — Aug 2, 2026
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',borderBottom:'1px solid #e2e8f0'}}>
            {WEEK_LABELS.map(d=>(
              <div key={d} style={{padding:'10px 6px',textAlign:'center',fontSize:9,fontWeight:700,color:'#64748b',borderRight:'1px solid #f1f5f9'}}>{d}</div>
            ))}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)'}}>
            {WEEK_DATES.map((date,i) => {
              const evs = evForDate(date)
              const isSat = i >= 5
              return (
                <div key={date} style={{minHeight:120,padding:'6px 4px',borderRight:'1px solid #f1f5f9',background:isSat?'#fafafa':'#fff'}}>
                  {evs.map(ev=><EventPill key={ev.id} ev={ev} tiny={false}/>)}
                  {evs.length===0 && <div style={{fontSize:8,color:'#e2e8f0',textAlign:'center',marginTop:20}}>—</div>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── MONTHLY VIEW ── */}
      {view==='monthly' && (
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',overflow:'hidden'}}>
          <div style={{background:'#f8fafc',padding:'12px 16px',borderBottom:'1px solid #e2e8f0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{fontSize:14,fontWeight:900,color:'#0f172a'}}>📅 July 2026</div>
            <div style={{display:'flex',gap:16,fontSize:10,color:'#64748b'}}>
              <span>🟣 {julyEvents.length} events this month</span>
              <span>⚠️ {julyEvents.filter(e=>e.type==='compliance').length} compliance</span>
              <span>💰 {julyEvents.filter(e=>e.type==='payroll').length} payroll</span>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',borderBottom:'1px solid #e2e8f0'}}>
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=>(
              <div key={d} style={{padding:'9px 4px',textAlign:'center',fontSize:9,fontWeight:800,color:'#64748b',borderRight:'1px solid #f1f5f9',background:'#f8fafc'}}>{d}</div>
            ))}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)'}}>
            {Array(JULY_START_DOW).fill(null).map((_,i)=>(
              <div key={'e'+i} style={{minHeight:90,background:'#fafafa',borderRight:'1px solid #f1f5f9',borderBottom:'1px solid #f1f5f9'}}/>
            ))}
            {Array(DAYS_IN_JULY).fill(null).map((_,i)=>{
              const d = i+1
              const isToday = d===31
              const col = (d + JULY_START_DOW - 1) % 7
              const isSun = col===0, isSat = col===6
              return (
                <div key={d} onClick={()=>setSelDay(selDay===d?null:d)} style={{minHeight:90,padding:'4px',borderRight:'1px solid #f1f5f9',borderBottom:'1px solid #f1f5f9',
                  background:isToday?`${A}08`:isSat||isSun?'#fefce8':'#fff',cursor:evs.length?'pointer':'default'}}>
                  <div style={{width:24,height:24,borderRadius:'50%',background:isToday?A:'transparent',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:4}}>
                    <span style={{fontSize:10,fontWeight:isToday?900:600,color:isToday?'#fff':isSat||isSun?'#d97706':'#374151'}}>{d}</span>
                  </div>
                  {evs.slice(0,3).map((ev,ei)=><EventPill key={ei} ev={ev} tiny={true}/>)}
                  {evs.length>3&&<div style={{fontSize:7,color:A,fontWeight:700}}>+{evs.length-3} more</div>}
                </div>
              )
            })}
          </div>
          {selDay && evForDay(selDay).length>0 && (
            <div style={{padding:'14px 18px',borderTop:'2px solid '+A+'30',background:'#f8fafc'}}>
              <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:10}}>📅 July {selDay} — {evForDay(selDay).length} event(s)</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:8}}>
                {evForDay(selDay).map(ev=>{
                  return (
                    <div key={ev.id} onClick={()=>setSelEvent(ev)} style={{background:'#fff',borderRadius:10,padding:'10px 14px',border:`1px solid ${m.color}30`,display:'flex',gap:10,cursor:'pointer',boxShadow:'0 2px 6px rgba(0,0,0,.04)'}}>
                      <div style={{width:38,height:38,borderRadius:9,background:m.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>{m.icon}</div>
                      <div>
                        <div style={{fontSize:11,fontWeight:700,color:'#0f172a'}}>{ev.title}</div>
                        <div style={{fontSize:9,color:'#64748b'}}>{ev.time} · {ev.loc}</div>
                        <span style={{fontSize:8,fontWeight:700,padding:'1px 7px',borderRadius:10,background:m.bg,color:m.color}}>{m.label}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── QUARTERLY VIEW ── */}
      {view==='quarterly' && (
        <div style={{display:'grid',gap:14}}>
          {['Q3','Q4'].map(q => {
            return (
              <div key={q} style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',overflow:'hidden'}}>
                <div style={{background:`${A}10`,padding:'10px 16px',borderBottom:'1px solid #e2e8f0',display:'flex',justifyContent:'space-between'}}>
                  <div style={{fontSize:12,fontWeight:900,color:A}}>{q} 2026</div>
                  <div style={{fontSize:10,color:'#64748b'}}>{evs.length} events</div>
                </div>
                <div style={{display:'grid',gap:6,padding:'12px'}}>
                  {evs.map(ev => {
                    return (
                      <div key={ev.id} onClick={()=>setSelEvent(ev)} style={{display:'flex',gap:12,padding:'8px 12px',borderRadius:10,border:`1px solid ${m.color}20`,background:m.bg+'80',cursor:'pointer',alignItems:'center'}}>
                        <div style={{width:32,height:32,borderRadius:8,background:m.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>{m.icon}</div>
                        <div style={{flex:1}}>
                          <div style={{fontSize:11,fontWeight:700,color:'#0f172a'}}>{ev.title}</div>
                          <div style={{fontSize:9,color:'#64748b'}}>{ev.date} · {ev.time} · {ev.loc}</div>
                        </div>
                        <span style={{fontSize:8,fontWeight:700,padding:'3px 10px',borderRadius:20,background:m.bg,color:m.color,flexShrink:0}}>{m.label}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── ANNUAL VIEW ── */}
      {view==='annual' && (
        <div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:12,marginBottom:14}}>
            {['Q1 (Jan-Mar)','Q2 (Apr-Jun)','Q3 (Jul-Sep)','Q4 (Oct-Dec)'].map((label,qi) => {
              const months = [['01','02','03'],['04','05','06'],['07','08','09'],['10','11','12']][qi]
              const count = filteredAll.filter(e=>months.includes(e.date.split('-')[1])).length
              const colors = ['#3b82f6','#10b981','#7c3aed','#f59e0b']
              return (
                <div key={label} style={{background:'#fff',borderRadius:12,border:`1px solid ${colors[qi]}30`,padding:'16px',textAlign:'center'}}>
                  <div style={{fontSize:28,fontWeight:900,color:colors[qi]}}>{count}</div>
                  <div style={{fontSize:11,fontWeight:700,color:'#374151'}}>{label}</div>
                  <div style={{fontSize:9,color:'#94a3b8',marginTop:2}}>events & deadlines</div>
                </div>
              )
            })}
          </div>
          <div style={{display:'grid',gap:6}}>
            {filteredAll.map(ev => {
              return (
                <div key={ev.id} onClick={()=>setSelEvent(ev)} style={{background:'#fff',borderRadius:12,border:`1px solid ${m.color}20`,padding:'10px 16px',display:'flex',gap:14,alignItems:'center',cursor:'pointer'}}>
                  <div style={{width:42,height:42,borderRadius:10,background:m.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>{m.icon}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:11,fontWeight:700,color:'#0f172a'}}>{ev.title}</div>
                    <div style={{fontSize:9,color:'#64748b'}}>{ev.date} · {ev.time} · {ev.loc} · {ev.dept}</div>
                  </div>
                  <span style={{fontSize:9,fontWeight:700,padding:'4px 12px',borderRadius:20,background:m.bg,color:m.color,flexShrink:0}}>{m.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── EVENT DETAIL MODAL ── */}
      {selEvent && (() => {
        return (
          <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setSelEvent(null)}>
            <div style={{background:'#fff',borderRadius:18,padding:0,width:420,maxWidth:'95vw'}} onClick={e=>e.stopPropagation()}>
              <div style={{background:`linear-gradient(135deg,${m.color},${m.color}cc)`,padding:'16px 22px',borderRadius:'18px 18px 0 0',color:'#fff',display:'flex',gap:14,alignItems:'center'}}>
                <div style={{fontSize:36}}>{m.icon}</div>
                <div>
                  <div style={{fontSize:14,fontWeight:900}}>{selEvent.title}</div>
                  <div style={{fontSize:10,opacity:.85,marginTop:2}}>{m.label} · {selEvent.dept}</div>
                </div>
              </div>
              <div style={{padding:'20px 24px'}}>
                {[['📅 Date',selEvent.date],['⏰ Time',selEvent.time],['📍 Location',selEvent.loc],['🏢 Department',selEvent.dept],['🏷️ Type',m.label]].map(([k,v])=>(
                  <div key={k} style={{display:'flex',padding:'8px 0',borderBottom:'1px solid #f1f5f9',fontSize:10}}>
                    <span style={{color:'#64748b',width:110,flexShrink:0}}>{k}</span>
                    <span style={{fontWeight:700,color:'#0f172a'}}>{v}</span>
                  </div>
                ))}
                <div style={{display:'flex',gap:10,marginTop:18}}>
                  <button style={{flex:1,padding:'10px',borderRadius:10,border:'none',background:m.color,color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>📅 Add to Calendar</button>
                  <button style={{flex:1,padding:'10px',borderRadius:10,border:'none',background:'#f1f5f9',color:'#374151',fontSize:10,fontWeight:700,cursor:'pointer'}}>📧 Share</button>
                  <button onClick={()=>setSelEvent(null)} style={{padding:'10px 16px',borderRadius:10,border:'1px solid #e2e8f0',background:'#fff',fontSize:10,cursor:'pointer'}}>Close</button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
