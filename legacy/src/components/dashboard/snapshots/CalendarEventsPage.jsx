// FILE: CalendarEventsPage.jsx
// eLogix HRMS — Full Calendar with Events
// Views: Daily · Weekly · Monthly · Annually
// Right-click any day → Add Event / Add Note / Set Meeting
// eLogix Technologies · www.elogix.com.np
import { useState, useEffect, useRef, useCallback } from 'react'

const A  = '#0369a1'
const G  = 'linear-gradient(135deg,#0c4a6e,#0369a1,#38bdf8)'

const EVENT_TYPES = {
  meeting:   { icon:'📅', label:'Meeting',    color:'#3b82f6', bg:'#eff6ff' },
  holiday:   { icon:'🎉', label:'Holiday',    color:'#8b5cf6', bg:'#f5f3ff' },
  deadline:  { icon:'⏰', label:'Deadline',   color:'#ef4444', bg:'#fef2f2' },
  training:  { icon:'📚', label:'Training',   color:'#10b981', bg:'#f0fdf4' },
  review:    { icon:'📊', label:'Review',     color:'#f59e0b', bg:'#fffbeb' },
  leave:     { icon:'🌴', label:'Leave',      color:'#06b6d4', bg:'#f0f9ff' },
  birthday:  { icon:'🎂', label:'Birthday',   color:'#ec4899', bg:'#fdf4ff' },
  note:      { icon:'📝', label:'Note',       color:'#64748b', bg:'#f8fafc' },
}

const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December']
const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const DAYS_FULL  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const HOURS = ['07:00','08:00','09:00','10:00','11:00','12:00','13:00',
               '14:00','15:00','16:00','17:00','18:00','19:00','20:00']

// Initial events
const INIT_EVENTS = [
  { id:1,  date:'2026-08-05', title:'Leadership Training',   type:'training', time:'09:00', endTime:'12:00', loc:'Conference Room A', dept:'IT Dept',   desc:'Mandatory for all leads', attendees:['Bikram','Ram'] },
  { id:2,  date:'2026-08-10', title:'Q2 Performance Review', type:'review',   time:'14:00', endTime:'16:00', loc:'HR Office',          dept:'All Depts', desc:'Quarterly review', attendees:['Sita','Gita'] },
  { id:3,  date:'2026-08-13', title:'Tax Clearance EXPIRED', type:'deadline', time:'00:00', endTime:'23:59', loc:'',                   dept:'Finance',   desc:'IRD deadline', attendees:[] },
  { id:4,  date:'2026-08-15', title:'Payroll Processing',    type:'meeting',  time:'10:00', endTime:'11:00', loc:'Finance Dept',       dept:'Finance',   desc:'Submit timesheet by Aug 12', attendees:['Hari'] },
  { id:5,  date:'2026-08-20', title:'Independence Day',      type:'holiday',  time:'00:00', endTime:'23:59', loc:'',                   dept:'Company',   desc:'Public Holiday', attendees:[] },
  { id:6,  date:'2026-08-25', title:'Maya Birthday 🎂',      type:'birthday', time:'00:00', endTime:'00:30', loc:'Office',             dept:'IT Dept',   desc:'Birthday celebration', attendees:[] },
  { id:7,  date:'2026-08-11', title:'Board Meeting',         type:'meeting',  time:'11:00', endTime:'13:00', loc:'Boardroom',          dept:'Management',desc:'Monthly BOD meeting', attendees:['CEO','CFO'] },
  { id:8,  date:'2026-08-18', title:'HR Policy Training',    type:'training', time:'09:30', endTime:'11:30', loc:'Training Hall',      dept:'All Depts', desc:'New leave policy', attendees:[] },
]

const BLANK_FORM = { title:'', type:'meeting', date:'', time:'09:00', endTime:'10:00', loc:'', dept:'', desc:'', attendees:[] }

export default function CalendarEventsPage() {
  const today = new Date()
  const [view,       setView]       = useState('monthly')   // daily weekly monthly annually
  const [curDate,    setCurDate]    = useState(new Date(today))
  const [events,     setEvents]     = useState(INIT_EVENTS)
  const [selEvent,   setSelEvent]   = useState(null)
  const [showForm,   setShowForm]   = useState(false)
  const [form,       setForm]       = useState({...BLANK_FORM})
  const [ctxMenu,    setCtxMenu]    = useState(null)  // {x,y,date} right-click menu
  const [msg,        setMsg]        = useState('')
  const containerRef = useRef(null)

  const notify = m => { setMsg(m); setTimeout(()=>setMsg(''), 3000) }
  const sf = (k, v) => setForm(p => ({...p, [k]: v}))

  // Close context menu on click outside
  useEffect(() => {
    const close = () => setCtxMenu(null)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [])

  // Date helpers
  const dateStr    = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  const eventsFor  = ds => events.filter(e => e.date === ds)
  const isToday    = d => dateStr(d) === dateStr(today)
  const isWeekend  = d => d.getDay()===0 || d.getDay()===6

  // Navigate
  const navigate = dir => {
    const d = new Date(curDate)
    if (view === 'daily')    d.setDate(d.getDate() + dir)
    if (view === 'weekly')   d.setDate(d.getDate() + dir*7)
    if (view === 'monthly')  d.setMonth(d.getMonth() + dir)
    if (view === 'annually') d.setFullYear(d.getFullYear() + dir)
    setCurDate(d)
  }

  // Save event
  const saveEvent = () => {
    if (!form.title.trim()) { notify('⚠️ Event title required'); return }
    if (!form.date)         { notify('⚠️ Date required');        return }
    if (form.id) {
      setEvents(p => p.map(e => e.id===form.id ? {...form} : e))
      notify('✅ Event updated')
    } else {
      setEvents(p => [...p, {...form, id: Date.now()}])
      notify('✅ Event added')
    }
    setShowForm(false); setSelEvent(null); setForm({...BLANK_FORM})
  }

  const deleteEvent = id => {
    setEvents(p => p.filter(e => e.id !== id))
    setSelEvent(null)
    notify('🗑️ Event deleted')
  }

  // Right-click context menu
  const onDayRightClick = (e, ds) => {
    e.preventDefault()
    e.stopPropagation()
    setCtxMenu({ x: e.clientX, y: e.clientY, date: ds })
  }

  const ctxAction = (action, date) => {
    setCtxMenu(null)
    const newForm = {...BLANK_FORM, date, type: action}
    setForm(newForm)
    setShowForm(true)
  }

  // ── Event Pill ──────────────────────────────────────────────
  const Pill = ({ ev, tiny }) => {
    const t = EVENT_TYPES[ev.type] || EVENT_TYPES.note
    return (
      <div onClick={e=>{e.stopPropagation();setSelEvent(ev)}}
        style={{ background:t.bg, border:`1px solid ${t.color}30`,
          borderLeft:`3px solid ${t.color}`, borderRadius:4,
          padding: tiny?'1px 5px':'4px 8px',
          fontSize: tiny?8:10, fontWeight:600, cursor:'pointer',
          marginBottom:2, whiteSpace:'nowrap', overflow:'hidden',
          textOverflow:'ellipsis', display:'flex', alignItems:'center', gap:3 }}>
        <span>{t.icon}</span>
        <span style={{overflow:'hidden',textOverflow:'ellipsis'}}>{ev.title}</span>
        {!tiny && <span style={{color:'#94a3b8',fontSize:9,marginLeft:'auto',flexShrink:0}}>{ev.time}</span>}
      </div>
    )
  }

  // ── View header label ───────────────────────────────────────
  const headerLabel = () => {
    if (view==='daily')    return `${DAYS_FULL[curDate.getDay()]}, ${curDate.getDate()} ${MONTHS[curDate.getMonth()]} ${curDate.getFullYear()}`
    if (view==='weekly')   { const start=new Date(curDate); start.setDate(start.getDate()-start.getDay()); const end=new Date(start); end.setDate(end.getDate()+6); return `${start.getDate()} – ${end.getDate()} ${MONTHS[curDate.getMonth()]} ${curDate.getFullYear()}` }
    if (view==='monthly')  return `${MONTHS[curDate.getMonth()]} ${curDate.getFullYear()}`
    if (view==='annually') return `${curDate.getFullYear()}`
    return ''
  }

  // ─────────────────────────────────────────────────────────────
  // DAILY VIEW
  // ─────────────────────────────────────────────────────────────
  const DailyView = () => {
    const ds = dateStr(curDate)
    const dayEvs = eventsFor(ds).sort((a,b)=>a.time.localeCompare(b.time))
    return (
      <div style={{display:'grid',gridTemplateColumns:'60px 1fr',gap:0}}>
        {HOURS.map(hr => {
          const evs = dayEvs.filter(e => e.time?.startsWith(hr.split(':')[0]+':'))
          const t = evs[0] ? EVENT_TYPES[evs[0].type]||EVENT_TYPES.note : null
          return (
            <div key={hr} style={{display:'contents'}}>
              <div style={{padding:'8px 10px 8px 0',fontSize:10,color:'#94a3b8',
                textAlign:'right',borderTop:'1px solid #f1f5f9',paddingTop:6}}>{hr}</div>
              <div onContextMenu={e=>onDayRightClick(e,ds)}
                style={{borderTop:'1px solid #f1f5f9',minHeight:56,padding:'4px 8px',
                  background: hr==='08:00'||hr==='09:00'?'#fafff8':
                               hr==='12:00'?'#fffbf0':'#fff'}}>
                {evs.map(ev => <Pill key={ev.id} ev={ev}/>)}
                {evs.length===0 && (
                  <div onDoubleClick={()=>{setForm({...BLANK_FORM,date:ds,time:hr});setShowForm(true)}}
                    style={{height:48,display:'flex',alignItems:'center',color:'#f1f5f9',
                      fontSize:10,cursor:'cell'}}
                    title="Double-click to add event">
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────
  // WEEKLY VIEW
  // ─────────────────────────────────────────────────────────────
  const WeeklyView = () => {
    const weekStart = new Date(curDate)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    const days = Array.from({length:7},(_,i)=>{ const d=new Date(weekStart); d.setDate(d.getDate()+i); return d })
    return (
      <div>
        {/* Day headers */}
        <div style={{display:'grid',gridTemplateColumns:'60px repeat(7,1fr)',borderBottom:'2px solid #e2e8f0',marginBottom:0}}>
          <div/>
          {days.map(d=>(
            <div key={d.getDate()} onClick={()=>{setCurDate(d);setView('daily')}}
              style={{padding:'8px 4px',textAlign:'center',cursor:'pointer',
                background:isToday(d)?A:isWeekend(d)?'#fefce8':'#f8fafc',
                color:isToday(d)?'#fff':isWeekend(d)?'#d97706':'#374151',
                borderLeft:'1px solid #e2e8f0'}}>
              <div style={{fontSize:10,fontWeight:600}}>{DAYS_SHORT[d.getDay()]}</div>
              <div style={{fontSize:16,fontWeight:900}}>{d.getDate()}</div>
              <div style={{fontSize:9,color:isToday(d)?'rgba(255,255,255,.7)':'#94a3b8'}}>{eventsFor(dateStr(d)).length} events</div>
            </div>
          ))}
        </div>
        {/* Time slots */}
        {HOURS.map(hr=>(
          <div key={hr} style={{display:'grid',gridTemplateColumns:'60px repeat(7,1fr)',minHeight:52}}>
            <div style={{fontSize:9,color:'#94a3b8',textAlign:'right',padding:'4px 8px 0 0',borderTop:'1px solid #f1f5f9'}}>{hr}</div>
            {days.map(d=>{
              const ds = dateStr(d)
              const evs = eventsFor(ds).filter(e=>e.time?.startsWith(hr.split(':')[0]+':'))
              return (
                <div key={ds} onContextMenu={e=>onDayRightClick(e,ds)}
                  onDoubleClick={()=>{setForm({...BLANK_FORM,date:ds,time:hr});setShowForm(true)}}
                  style={{borderTop:'1px solid #f1f5f9',borderLeft:'1px solid #f1f5f9',
                    padding:'2px 3px',background:isToday(d)?`${A}06`:isWeekend(d)?'#fffbf0':'#fff',
                    cursor:'cell',minHeight:52}}>
                  {evs.map(ev=><Pill key={ev.id} ev={ev} tiny/>)}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────
  // MONTHLY VIEW
  // ─────────────────────────────────────────────────────────────
  const MonthlyView = () => {
    const year  = curDate.getFullYear()
    const month = curDate.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month+1, 0).getDate()
    const cells = []
    for (let i=0; i<firstDay; i++) cells.push(null)
    for (let d=1; d<=daysInMonth; d++) cells.push(d)
    while (cells.length % 7 !== 0) cells.push(null)
    return (
      <div>
        {/* Day headers */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',borderBottom:'2px solid #e2e8f0'}}>
          {DAYS_SHORT.map(d=>(
            <div key={d} style={{padding:'8px',textAlign:'center',fontSize:11,fontWeight:700,
              color:d==='Sun'||d==='Sat'?'#d97706':'#374151',background:'#f8fafc'}}>{d}</div>
          ))}
        </div>
        {/* Weeks */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)'}}>
          {cells.map((d,i)=>{
            if (!d) return <div key={'e'+i} style={{minHeight:90,background:'#fafafa',borderRight:'1px solid #f1f5f9',borderBottom:'1px solid #f1f5f9'}}/>
            const dd = new Date(year,month,d)
            const ds = dateStr(dd)
            const dayEvs = eventsFor(ds)
            const isTdy  = isToday(dd)
            const isWknd = isWeekend(dd)
            return (
              <div key={d}
                onClick={()=>{setCurDate(dd);setView('daily')}}
                onContextMenu={e=>onDayRightClick(e,ds)}
                style={{minHeight:90,padding:'4px',cursor:'pointer',
                  borderRight:'1px solid #f1f5f9',borderBottom:'1px solid #f1f5f9',
                  background:isTdy?`${A}08`:isWknd?'#fefce8':'#fff',
                  transition:'background .1s'}}
                onMouseEnter={e=>e.currentTarget.style.background=isTdy?`${A}12`:isWknd?'#fef9c3':'#f0f9ff'}
                onMouseLeave={e=>e.currentTarget.style.background=isTdy?`${A}08`:isWknd?'#fefce8':'#fff'}>
                <div style={{width:24,height:24,borderRadius:'50%',
                  background:isTdy?A:'transparent',marginBottom:3,
                  display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <span style={{fontSize:11,fontWeight:isTdy?900:600,
                    color:isTdy?'#fff':isWknd?'#d97706':'#374151'}}>{d}</span>
                </div>
                {dayEvs.slice(0,3).map(ev=><Pill key={ev.id} ev={ev} tiny/>)}
                {dayEvs.length>3&&<div style={{fontSize:8,color:A,fontWeight:700}}>+{dayEvs.length-3} more</div>}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────
  // ANNUAL VIEW — 12 mini months
  // ─────────────────────────────────────────────────────────────
  const AnnualView = () => {
    const year = curDate.getFullYear()
    return (
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16}}>
        {MONTHS.map((mName,mi)=>{
          const firstDay    = new Date(year,mi,1).getDay()
          const daysInMonth = new Date(year,mi+1,0).getDate()
          const cells = []
          for (let i=0;i<firstDay;i++) cells.push(null)
          for (let d=1;d<=daysInMonth;d++) cells.push(d)
          const monthEvs = events.filter(e=>e.date?.startsWith(`${year}-${String(mi+1).padStart(2,'0')}`))
          return (
            <div key={mName} onClick={()=>{setCurDate(new Date(year,mi,1));setView('monthly')}}
              style={{background:'#fff',borderRadius:10,padding:'10px',
                boxShadow:'0 1px 4px rgba(0,0,0,.06)',cursor:'pointer',
                border:`1px solid ${curDate.getMonth()===mi?A:'#e2e8f0'}`,
                transition:'all .15s'}}
              onMouseEnter={e=>e.currentTarget.style.boxShadow='0 4px 16px rgba(3,105,161,.15)'}
              onMouseLeave={e=>e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,.06)'}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                <div style={{fontSize:11,fontWeight:800,color:A}}>{mName}</div>
                {monthEvs.length>0&&<span style={{fontSize:9,background:`${A}15`,color:A,padding:'1px 6px',borderRadius:20,fontWeight:700}}>{monthEvs.length}</span>}
              </div>
              {/* Mini calendar grid */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:1}}>
                {DAYS_SHORT.map(d=>(
                  <div key={d} style={{fontSize:7,textAlign:'center',color:'#94a3b8',fontWeight:700}}>{d[0]}</div>
                ))}
                {cells.map((d,i)=>{
                  if(!d) return <div key={'e'+i}/>
                  const dd  = new Date(year,mi,d)
                  const ds  = dateStr(dd)
                  const evs = eventsFor(ds)
                  const isTdy = isToday(dd)
                  const hasEv = evs.length>0
                  return (
                    <div key={d}
                      onClick={e=>{e.stopPropagation();setCurDate(dd);setView('daily')}}
                      title={hasEv?evs.map(e=>e.title).join(', '):''}
                      style={{width:16,height:16,borderRadius:'50%',display:'flex',
                        alignItems:'center',justifyContent:'center',cursor:hasEv?'pointer':'default',
                        background:isTdy?A:hasEv?`${EVENT_TYPES[evs[0].type]?.color||A}20`:'transparent',
                        fontSize:7,fontWeight:isTdy||hasEv?700:400,
                        color:isTdy?'#fff':hasEv?EVENT_TYPES[evs[0].type]?.color||A:'#64748b'}}>
                      {d}
                    </div>
                  )
                })}
              </div>
              {monthEvs.length>0&&(
                <div style={{marginTop:6,borderTop:'1px solid #f1f5f9',paddingTop:4}}>
                  {monthEvs.slice(0,2).map(ev=>{
                    const t=EVENT_TYPES[ev.type]||EVENT_TYPES.note
                    return (
                      <div key={ev.id} style={{fontSize:8,color:'#64748b',
                        display:'flex',alignItems:'center',gap:3,marginBottom:2}}>
                        <span>{t.icon}</span>
                        <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{ev.title}</span>
                      </div>
                    )
                  })}
                  {monthEvs.length>2&&<div style={{fontSize:8,color:A}}>+{monthEvs.length-2} more</div>}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────
  return (
    <div style={{fontFamily:'system-ui,sans-serif',minHeight:'100vh',background:'#f0f7ff'}}>
      {msg&&<div style={{position:'fixed',bottom:20,right:20,zIndex:9999,
        background:'#f0f9ff',border:'1px solid #bae6fd',borderRadius:10,
        padding:'10px 18px',fontSize:11,color:'#0c4a6e',
        boxShadow:'0 4px 16px rgba(0,0,0,.12)'}}>{msg}</div>}

      {/* ── HEADER ── */}
      <div style={{background:G,padding:'14px 20px',color:'#fff',marginBottom:12,borderRadius:14}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
          <div>
            <div style={{fontSize:18,fontWeight:900}}>📅 Calendar & Events</div>
            <div style={{fontSize:10,opacity:.75,marginTop:1}}>eLogix HRMS · Right-click any day to add events · Double-click time slot to create</div>
          </div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            {/* View switcher */}
            {['daily','weekly','monthly','annually'].map(v=>(
              <button key={v} onClick={()=>setView(v)}
                style={{padding:'6px 14px',borderRadius:20,border:'none',cursor:'pointer',
                  background:view===v?'#fff':'rgba(255,255,255,.15)',
                  color:view===v?A:'#fff',fontSize:11,fontWeight:view===v?800:600,
                  transition:'all .15s',textTransform:'capitalize'}}>
                {v}
              </button>
            ))}
            <button onClick={()=>{setForm({...BLANK_FORM,date:dateStr(curDate)});setShowForm(true)}}
              style={{padding:'6px 14px',borderRadius:20,border:'none',cursor:'pointer',
                background:'#fde68a',color:'#78350f',fontSize:11,fontWeight:800}}>
              + Add Event
            </button>
          </div>
        </div>

        {/* Navigation */}
        <div style={{display:'flex',alignItems:'center',gap:12,marginTop:12}}>
          <button onClick={()=>navigate(-1)}
            style={{width:30,height:30,borderRadius:'50%',border:'1.5px solid rgba(255,255,255,.4)',
              background:'rgba(255,255,255,.15)',color:'#fff',cursor:'pointer',fontSize:14,
              display:'flex',alignItems:'center',justifyContent:'center'}}>‹</button>
          <div style={{fontSize:14,fontWeight:800,flex:1}}>{headerLabel()}</div>
          <button onClick={()=>navigate(1)}
            style={{width:30,height:30,borderRadius:'50%',border:'1.5px solid rgba(255,255,255,.4)',
              background:'rgba(255,255,255,.15)',color:'#fff',cursor:'pointer',fontSize:14,
              display:'flex',alignItems:'center',justifyContent:'center'}}>›</button>
          <button onClick={()=>setCurDate(new Date(today))}
            style={{padding:'5px 12px',borderRadius:20,border:'1px solid rgba(255,255,255,.4)',
              background:'rgba(255,255,255,.15)',color:'#fff',cursor:'pointer',fontSize:10,fontWeight:700}}>
            Today
          </button>
        </div>
      </div>

      {/* ── CALENDAR BODY ── */}
      <div ref={containerRef} style={{background:'#fff',borderRadius:14,
        boxShadow:'0 2px 8px rgba(0,0,0,.06)',overflow:'hidden',marginBottom:12}}>
        {view==='daily'    && <DailyView/>}
        {view==='weekly'   && <WeeklyView/>}
        {view==='monthly'  && <MonthlyView/>}
        {view==='annually' && <div style={{padding:16}}><AnnualView/></div>}
      </div>

      {/* ── RIGHT-CLICK CONTEXT MENU ── */}
      {ctxMenu&&(
        <div onClick={e=>e.stopPropagation()}
          style={{position:'fixed',left:ctxMenu.x,top:ctxMenu.y,zIndex:9999,
            background:'#fff',borderRadius:10,boxShadow:'0 8px 32px rgba(0,0,0,.18)',
            border:'1px solid #e2e8f0',minWidth:200,overflow:'hidden'}}>
          <div style={{padding:'8px 14px',background:'#f8fafc',borderBottom:'1px solid #f1f5f9',
            fontSize:10,fontWeight:700,color:'#64748b'}}>
            📅 {ctxMenu.date}
          </div>
          {[
            {action:'meeting',  label:'📅 Schedule Meeting'},
            {action:'note',     label:'📝 Add Note'},
            {action:'deadline', label:'⏰ Set Deadline'},
            {action:'training', label:'📚 Add Training'},
            {action:'leave',    label:'🌴 Mark Leave'},
            {action:'review',   label:'📊 Add Review'},
            {action:'birthday', label:'🎂 Add Birthday'},
          ].map(({action,label})=>(
            <button key={action}
              onClick={()=>ctxAction(action, ctxMenu.date)}
              style={{width:'100%',padding:'9px 16px',border:'none',background:'transparent',
                textAlign:'left',fontSize:12,cursor:'pointer',color:'#374151',
                display:'flex',alignItems:'center',gap:8,transition:'background .1s'}}
              onMouseEnter={e=>e.currentTarget.style.background='#f0f9ff'}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              {label}
            </button>
          ))}
          <div style={{borderTop:'1px solid #f1f5f9'}}>
            <button
              onClick={()=>{setCurDate(new Date(ctxMenu.date));setView('daily');setCtxMenu(null)}}
              style={{width:'100%',padding:'9px 16px',border:'none',background:'transparent',
                textAlign:'left',fontSize:12,cursor:'pointer',color:A,fontWeight:700,
                display:'flex',alignItems:'center',gap:8}}
              onMouseEnter={e=>e.currentTarget.style.background='#f0f9ff'}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              👁 View Day
            </button>
          </div>
        </div>
      )}

      {/* ── EVENT DETAIL MODAL ── */}
      {selEvent&&(()=>{
        const t = EVENT_TYPES[selEvent.type]||EVENT_TYPES.note
        return (
          <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:1000,
            display:'flex',alignItems:'center',justifyContent:'center',padding:16}}
            onClick={()=>setSelEvent(null)}>
            <div style={{background:'#fff',borderRadius:16,width:480,maxWidth:'96vw',
              boxShadow:'0 24px 60px rgba(0,0,0,.2)'}} onClick={e=>e.stopPropagation()}>
              <div style={{background:`linear-gradient(135deg,${t.color},${t.color}99)`,
                padding:'16px 20px',borderRadius:'16px 16px 0 0',color:'#fff'}}>
                <div style={{fontSize:16,fontWeight:900}}>{t.icon} {selEvent.title}</div>
                <div style={{fontSize:10,opacity:.8,marginTop:2}}>{selEvent.date} · {selEvent.time}–{selEvent.endTime}</div>
              </div>
              <div style={{padding:'18px 20px'}}>
                {[
                  ['📍','Location', selEvent.loc||'—'],
                  ['🏢','Department', selEvent.dept||'—'],
                  ['📝','Description', selEvent.desc||'—'],
                  ['👥','Attendees', selEvent.attendees?.join(', ')||'—'],
                ].map(([ic,lb,v])=>(
                  <div key={lb} style={{display:'flex',gap:10,padding:'7px 0',borderBottom:'1px solid #f1f5f9',fontSize:12}}>
                    <span style={{fontSize:16,width:24,flexShrink:0}}>{ic}</span>
                    <span style={{color:'#64748b',minWidth:90,fontSize:11}}>{lb}</span>
                    <span style={{fontWeight:600,color:'#0f172a'}}>{v}</span>
                  </div>
                ))}
                <div style={{display:'flex',gap:8,marginTop:16}}>
                  <button onClick={()=>{setForm({...selEvent});setSelEvent(null);setShowForm(true)}}
                    style={{flex:1,padding:'9px',borderRadius:9,border:'none',background:G,
                      color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer'}}>
                    ✏️ Edit
                  </button>
                  <button onClick={()=>deleteEvent(selEvent.id)}
                    style={{padding:'9px 16px',borderRadius:9,border:'1px solid #fecaca',
                      background:'#fef2f2',color:'#dc2626',fontSize:12,cursor:'pointer',fontWeight:700}}>
                    🗑️ Delete
                  </button>
                  <button onClick={()=>setSelEvent(null)}
                    style={{padding:'9px 16px',borderRadius:9,border:'1px solid #e2e8f0',
                      background:'#fff',fontSize:12,cursor:'pointer'}}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── ADD / EDIT EVENT FORM ── */}
      {showForm&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:1001,
          display:'flex',alignItems:'center',justifyContent:'center',padding:16}}
          onClick={()=>setShowForm(false)}>
          <div style={{background:'#fff',borderRadius:16,width:520,maxWidth:'96vw',
            maxHeight:'93vh',overflowY:'auto',boxShadow:'0 24px 60px rgba(0,0,0,.2)'}}
            onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'16px 20px',borderRadius:'16px 16px 0 0',color:'#fff'}}>
              <div style={{fontSize:15,fontWeight:900}}>{form.id?'✏️ Edit Event':'+ New Event'}</div>
              <div style={{fontSize:10,opacity:.75,marginTop:2}}>eLogix HRMS Calendar</div>
            </div>
            <div style={{padding:'18px 20px'}}>
              {/* Type selector */}
              <div style={{marginBottom:16}}>
                <label style={{fontSize:11,fontWeight:700,color:'#374151',display:'block',marginBottom:6}}>Event Type</label>
                <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                  {Object.entries(EVENT_TYPES).map(([k,t])=>(
                    <button key={k} type="button" onClick={()=>sf('type',k)}
                      style={{padding:'5px 10px',borderRadius:20,border:`1.5px solid ${form.type===k?t.color:'#e2e8f0'}`,
                        background:form.type===k?t.bg:'#fff',color:form.type===k?t.color:'#64748b',
                        fontSize:10,fontWeight:600,cursor:'pointer'}}>
                      {t.icon} {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fields */}
              {[
                {label:'Title *',      k:'title',    type:'text',     placeholder:'Event title'},
                {label:'Date *',       k:'date',     type:'date',     placeholder:''},
                {label:'Start Time',   k:'time',     type:'time',     placeholder:''},
                {label:'End Time',     k:'endTime',  type:'time',     placeholder:''},
                {label:'Location',     k:'loc',      type:'text',     placeholder:'Conference Room / Online'},
                {label:'Department',   k:'dept',     type:'text',     placeholder:'HR / Finance / All'},
              ].map(({label,k,type,placeholder})=>(
                <div key={k} style={{marginBottom:12}}>
                  <label style={{fontSize:11,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>{label}</label>
                  <input type={type} value={form[k]||''} onChange={e=>sf(k,e.target.value)}
                    placeholder={placeholder}
                    style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',
                      fontSize:12,outline:'none',boxSizing:'border-box',fontFamily:'inherit'}}
                    onFocus={e=>e.target.style.borderColor=A}
                    onBlur={e=>e.target.style.borderColor='#e2e8f0'}/>
                </div>
              ))}
              <div style={{marginBottom:14}}>
                <label style={{fontSize:11,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Notes / Description</label>
                <textarea value={form.desc||''} onChange={e=>sf('desc',e.target.value)}
                  rows={3} placeholder="Add notes or agenda..."
                  style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',
                    fontSize:12,outline:'none',boxSizing:'border-box',fontFamily:'inherit',resize:'vertical'}}
                  onFocus={e=>e.target.style.borderColor=A}
                  onBlur={e=>e.target.style.borderColor='#e2e8f0'}/>
              </div>

              <div style={{display:'flex',gap:8}}>
                <button onClick={saveEvent}
                  style={{flex:1,padding:'11px',borderRadius:10,border:'none',
                    background:G,color:'#fff',fontSize:13,fontWeight:800,cursor:'pointer'}}>
                  💾 {form.id?'Update':'Save'} Event
                </button>
                <button onClick={()=>setShowForm(false)}
                  style={{padding:'11px 18px',borderRadius:10,border:'1px solid #e2e8f0',
                    background:'#fff',fontSize:12,cursor:'pointer'}}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
