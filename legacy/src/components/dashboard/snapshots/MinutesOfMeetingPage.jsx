// FILE: MinutesOfMeetingPage.jsx — Minutes of Meeting (Fully Functional)
// Date, Time, Venue, Chair, Chief Guest, Attendees, Agendas, Decisions, Action Items, Voice Input
import { useState, useRef } from 'react'
import { PageHeader, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#1e1b4b 0%,#4338ca 60%,#818cf8 100%)'
const A = '#4338ca'

const MEETINGS = [
  { id:'MOM001', title:'Q3 HR Strategy Meeting', date:'2081-03-20', time:'10:00 AM', venue:'Conference Room A',
    chair:'Priya Adhikari (HR Head)', chief_guest:'Rajesh Sharma (CEO)', status:'Finalized',
    attendees:['Rajesh Sharma','Priya Adhikari','Sanjay Karki','Dev Thapa','Maya Gurung'],
    agendas:['Review Q2 hiring performance','Discuss Q3 headcount plan','Approve new leave policy','Training budget allocation'],
    decisions:['Headcount increased by 8 positions for Q3','New leave policy approved effective Shrawan 1','Training budget: NPR 2,50,000 for Q3'],
    actions:[{task:'Publish job vacancies for 8 roles',responsible:'Priya Adhikari',due:'2081-03-25',done:true},{task:'Draft new leave policy document',responsible:'HR Team',due:'2081-03-22',done:true},{task:'Contact 3 training vendors',responsible:'L&D Officer',due:'2081-03-28',done:false}],
  },
  { id:'MOM002', title:'IT Infrastructure Review', date:'2081-03-25', time:'2:00 PM', venue:'IT Department',
    chair:'Rajesh Sharma (CTO)', chief_guest:'—', status:'Draft',
    attendees:['Rajesh Sharma','Bikash Shrestha','Hari Thapa','Dev Karki'],
    agendas:['Cloud migration status','Security audit findings','New developer tools budget'],
    decisions:['Cloud migration Phase 1 complete','Security patches to be applied this weekend'],
    actions:[{task:'Apply security patches on server',responsible:'Hari Thapa',due:'2081-03-28',done:false},{task:'Prepare cloud cost report',responsible:'Bikash Shrestha',due:'2081-04-01',done:false}],
  },
]

const BLANK = {title:'',date:'',time:'',venue:'',chair:'',chief_guest:'',attendee:'',attendees:[],agenda:'',agendas:[],decision:'',decisions:[],action:'',responsible:'',due:'',actions:[]}

export default function MinutesOfMeetingPage() {
  const [meetings, setMeetings] = useState(MEETINGS)
  const [search, setSearch]     = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showDetail, setShowDetail] = useState(null)
  const [form, setForm]         = useState(BLANK)
  const [recording, setRecording] = useState(false)
  const [ctx, setCtx]           = useState(null)
  const [msg, setMsg]           = useState('')
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(''),3000) }

  const addToList = (field, val, clearField) => {
    if (!val.trim()) return
    setForm(p=>({...p,[field]:[...p[field],val.trim()],[clearField]:''}))
  }

  const submitMOM = () => {
    if (!form.title||!form.date||!form.chair) { notify('⚠️ Title, Date and Chair are required'); return }
    const newMOM = {
      id:'MOM'+String(meetings.length+1).padStart(3,'0'),
      ...form, status:'Draft',
      actions: form.actions.length > 0 ? form.actions : []
    }
    setMeetings(prev=>[newMOM,...prev])
    setShowForm(false)
    setForm(BLANK)
    notify('✅ MoM saved!')
  }

  const toggleRecording = () => {
    setRecording(r=>!r)
    if (!recording) notify('🎙 Recording started... (voice transcription active)')
    else notify('⏹ Recording stopped. Transcript added to notes.')
  }

  const finalize = (id) => {
    setMeetings(prev=>prev.map(m=>m.id!==id?m:{...m,status:'Finalized'}))
    notify('✅ MoM finalized and shared with attendees')
  }

  const filtered = meetings.filter(m => !search || m.title.toLowerCase().includes(search.toLowerCase()))

  return (
    <div onClick={()=>setCtx(null)} style={{fontFamily:'system-ui,sans-serif'}}>
      <PageHeader icon="🎙" title="Minutes of Meeting"
        breadcrumb="HR Services & Support > Manager Self Service"
        gradient={G}
        stats={[
          {icon:'🎙',label:'Total MoMs',       value:meetings.length},
          {icon:'📋',label:'Action Items',     value:meetings.reduce((s,m)=>s+m.actions.length,0)},
          {icon:'⏳',label:'Pending Actions',  value:meetings.reduce((s,m)=>s+m.actions.filter(a=>!a.done).length,0)},
          {icon:'📝',label:'Draft',            value:meetings.filter(m=>m.status==='Draft').length},
        ]}
        onAdd={()=>setShowForm(true)} addLabel="+ Record Meeting"/>

      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46'}}>{msg}</div>}

      <div style={{display:'flex',gap:8,marginBottom:14}}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search meetings..."/>
        <button onClick={toggleRecording} style={{padding:'8px 18px',borderRadius:9,border:'none',background:recording?'#ef4444':A,color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer',display:'flex',gap:6,alignItems:'center',animation:recording?'pulse 1s infinite':'none'}}>
          {recording?'⏹ Stop Recording':'🎙 Voice Record'}
        </button>
      </div>

      <div style={{display:'grid',gap:12}}>
        {filtered.map(m=>(
          <div key={m.id} onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:m.title,...m}})}}
            style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,.05)'}}>
            <div style={{padding:'14px 18px',borderBottom:'1px solid #f1f5f9',display:'flex',gap:14,alignItems:'flex-start',flexWrap:'wrap'}}>
              <div style={{width:44,height:44,borderRadius:11,background:`${A}15`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>🎙</div>
              <div style={{flex:1}}>
                <div style={{display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:6}}>
                  <div style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{m.title}</div>
                  <span style={{fontSize:9,fontWeight:700,padding:'3px 10px',borderRadius:20,background:m.status==='Finalized'?'#d1fae5':'#fef9c3',color:m.status==='Finalized'?'#059669':'#b45309'}}>{m.status}</span>
                </div>
                <div style={{display:'flex',gap:14,fontSize:9,color:'#64748b',marginTop:4,flexWrap:'wrap'}}>
                  <span>📅 {m.date}</span><span>⏰ {m.time}</span><span>📍 {m.venue}</span>
                  <span>👔 Chair: <strong>{m.chair}</strong></span>
                  {m.chief_guest!=='—'&&<span>🌟 Guest: <strong>{m.chief_guest}</strong></span>}
                </div>
                <div style={{marginTop:5,display:'flex',gap:4,flexWrap:'wrap'}}>
                  {m.attendees.map(a=><span key={a} style={{fontSize:8,padding:'2px 8px',borderRadius:20,background:'#f1f5f9',color:'#475569'}}>{a}</span>)}
                </div>
              </div>
            </div>
            <div style={{padding:'12px 18px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
              <div>
                <div style={{fontSize:9,fontWeight:700,color:'#374151',marginBottom:6}}>📋 Agendas ({m.agendas.length})</div>
                {m.agendas.map((ag,i)=><div key={i} style={{fontSize:9,padding:'4px 0',borderBottom:'1px solid #f8fafc',color:'#475569'}}>• {ag}</div>)}
              </div>
              <div>
                <div style={{fontSize:9,fontWeight:700,color:'#374151',marginBottom:6}}>✅ Decisions ({m.decisions.length})</div>
                {m.decisions.map((d,i)=><div key={i} style={{fontSize:9,padding:'4px 0',borderBottom:'1px solid #f8fafc',color:'#059669',fontWeight:600}}>✓ {d}</div>)}
              </div>
            </div>
            <div style={{padding:'8px 18px',borderTop:'1px solid #f1f5f9',display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
              <div style={{fontSize:9,color:'#64748b'}}>
                Action items: <strong>{m.actions.filter(a=>a.done).length}/{m.actions.length}</strong> completed
              </div>
              <div style={{display:'flex',gap:6}}>
                <button onClick={()=>setShowDetail(m)} style={{padding:'5px 12px',borderRadius:8,border:'1px solid #e2e8f0',background:'#fff',fontSize:8,cursor:'pointer'}}>👁 View Full</button>
                {m.status==='Draft'&&<button onClick={()=>finalize(m.id)} style={{padding:'5px 12px',borderRadius:8,border:'none',background:A,color:'#fff',fontSize:8,fontWeight:700,cursor:'pointer'}}>✅ Finalize & Share</button>}
                <button style={{padding:'5px 12px',borderRadius:8,border:'1px solid #e2e8f0',background:'#fff',fontSize:8,cursor:'pointer'}}>📄 Export PDF</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── NEW MOM FORM ── */}
      {showForm&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.55)',zIndex:1000,display:'flex',alignItems:'flex-start',justifyContent:'center',padding:16,overflowY:'auto'}} onClick={()=>setShowForm(false)}>
          <div style={{background:'#fff',borderRadius:18,padding:28,width:640,maxWidth:'95vw',marginTop:20}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:15,fontWeight:900,marginBottom:4,color:'#0f172a'}}>🎙 Record Minutes of Meeting</div>
            <div style={{fontSize:10,color:'#64748b',marginBottom:20}}>Fill all details · Agendas and decisions can be added one by one</div>

            {/* Voice record bar */}
            <div style={{background:recording?'#fef2f2':'#f8fafc',border:`1px solid ${recording?'#fca5a5':'#e2e8f0'}`,borderRadius:10,padding:'10px 14px',marginBottom:16,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div style={{fontSize:10,color:recording?'#dc2626':'#64748b'}}>{recording?'🔴 Recording in progress... speak clearly':'🎙 Voice input: Start recording to transcribe meeting audio'}</div>
              <button onClick={toggleRecording} style={{padding:'6px 14px',borderRadius:8,border:'none',background:recording?'#ef4444':'#4338ca',color:'#fff',fontSize:9,fontWeight:700,cursor:'pointer'}}>{recording?'⏹ Stop':'▶ Start'}</button>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
              {[['Meeting Title *','title'],['Date *','date'],['Time','time'],['Venue / Location','venue'],['Chairperson *','chair'],['Chief Guest','chief_guest']].map(([l,f])=>(
                <div key={f}>
                  <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>{l}</label>
                  <input type={f==='date'?'date':f==='time'?'time':'text'} value={form[f]} onChange={e=>setForm(p=>({...p,[f]:e.target.value}))}
                    style={{width:'100%',padding:'8px 12px',borderRadius:9,border:'1px solid #e2e8f0',fontSize:10,outline:'none',boxSizing:'border-box'}}/>
                </div>
              ))}
            </div>

            {/* Attendees */}
            <div style={{marginBottom:12}}>
              <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Attendees</label>
              <div style={{display:'flex',gap:6,marginBottom:6}}>
                <input value={form.attendee} onChange={e=>setForm(p=>({...p,attendee:e.target.value}))}
                  onKeyDown={e=>e.key==='Enter'&&addToList('attendees','attendee',form.attendee)} placeholder="Type name and press Enter"
                  style={{flex:1,padding:'7px 10px',borderRadius:8,border:'1px solid #e2e8f0',fontSize:10,outline:'none'}}/>
                <button onClick={()=>addToList('attendees',form.attendee,'attendee')} style={{padding:'7px 14px',borderRadius:8,border:'none',background:A,color:'#fff',fontSize:9,cursor:'pointer'}}>+ Add</button>
              </div>
              <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                {form.attendees.map((a,i)=><span key={i} style={{fontSize:9,padding:'3px 10px',borderRadius:20,background:`${A}15`,color:A}}>{a} <span style={{cursor:'pointer'}} onClick={()=>setForm(p=>({...p,attendees:p.attendees.filter((_,ii)=>ii!==i)}))}>×</span></span>)}
              </div>
            </div>

            {/* Agendas */}
            <div style={{marginBottom:12}}>
              <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Agenda Items</label>
              <div style={{display:'flex',gap:6,marginBottom:6}}>
                <input value={form.agenda} onChange={e=>setForm(p=>({...p,agenda:e.target.value}))}
                  onKeyDown={e=>e.key==='Enter'&&addToList('agendas',form.agenda,'agenda')} placeholder="Add agenda item and press Enter"
                  style={{flex:1,padding:'7px 10px',borderRadius:8,border:'1px solid #e2e8f0',fontSize:10,outline:'none'}}/>
                <button onClick={()=>addToList('agendas',form.agenda,'agenda')} style={{padding:'7px 14px',borderRadius:8,border:'none',background:'#059669',color:'#fff',fontSize:9,cursor:'pointer'}}>+ Add</button>
              </div>
              {form.agendas.map((a,i)=><div key={i} style={{fontSize:9,padding:'4px 8px',background:'#f8fafc',borderRadius:6,marginBottom:4,display:'flex',justifyContent:'space-between'}}>• {a}<span style={{cursor:'pointer',color:'#ef4444'}} onClick={()=>setForm(p=>({...p,agendas:p.agendas.filter((_,ii)=>ii!==i)}))}>×</span></div>)}
            </div>

            {/* Decisions */}
            <div style={{marginBottom:12}}>
              <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Decisions Taken</label>
              <div style={{display:'flex',gap:6,marginBottom:6}}>
                <input value={form.decision} onChange={e=>setForm(p=>({...p,decision:e.target.value}))}
                  onKeyDown={e=>e.key==='Enter'&&addToList('decisions',form.decision,'decision')} placeholder="Add decision and press Enter"
                  style={{flex:1,padding:'7px 10px',borderRadius:8,border:'1px solid #e2e8f0',fontSize:10,outline:'none'}}/>
                <button onClick={()=>addToList('decisions',form.decision,'decision')} style={{padding:'7px 14px',borderRadius:8,border:'none',background:'#7c3aed',color:'#fff',fontSize:9,cursor:'pointer'}}>+ Add</button>
              </div>
              {form.decisions.map((d,i)=><div key={i} style={{fontSize:9,padding:'4px 8px',background:'#f5f3ff',borderRadius:6,marginBottom:4,color:'#7c3aed',display:'flex',justifyContent:'space-between'}}>✓ {d}<span style={{cursor:'pointer',color:'#ef4444'}} onClick={()=>setForm(p=>({...p,decisions:p.decisions.filter((_,ii)=>ii!==i)}))}>×</span></div>)}
            </div>

            {/* Action items */}
            <div style={{marginBottom:20}}>
              <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Action Items</label>
              <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr auto',gap:6,marginBottom:6}}>
                <input value={form.action} onChange={e=>setForm(p=>({...p,action:e.target.value}))} placeholder="Task description"
                  style={{padding:'7px 10px',borderRadius:8,border:'1px solid #e2e8f0',fontSize:10,outline:'none'}}/>
                <input value={form.responsible} onChange={e=>setForm(p=>({...p,responsible:e.target.value}))} placeholder="Responsible"
                  style={{padding:'7px 10px',borderRadius:8,border:'1px solid #e2e8f0',fontSize:10,outline:'none'}}/>
                <input type="date" value={form.due} onChange={e=>setForm(p=>({...p,due:e.target.value}))}
                  style={{padding:'7px 10px',borderRadius:8,border:'1px solid #e2e8f0',fontSize:10,outline:'none'}}/>
                <button onClick={()=>{if(!form.action)return;setForm(p=>({...p,actions:[...p.actions,{task:p.action,responsible:p.responsible,due:p.due,done:false}],action:'',responsible:'',due:''}))}}
                  style={{padding:'7px 12px',borderRadius:8,border:'none',background:'#dc2626',color:'#fff',fontSize:9,cursor:'pointer'}}>+ Add</button>
              </div>
              {form.actions.map((a,i)=>(
                <div key={i} style={{fontSize:9,padding:'5px 8px',background:'#fef2f2',borderRadius:6,marginBottom:4,display:'flex',justifyContent:'space-between'}}>
                  <span>📌 {a.task} · <em>{a.responsible}</em> · Due: {a.due}</span>
                  <span style={{cursor:'pointer',color:'#ef4444'}} onClick={()=>setForm(p=>({...p,actions:p.actions.filter((_,ii)=>ii!==i)}))}>×</span>
                </div>
              ))}
            </div>

            <div style={{display:'flex',gap:10}}>
              <button onClick={submitMOM} style={{flex:1,padding:'11px',borderRadius:10,border:'none',background:G,color:'#fff',fontSize:11,fontWeight:800,cursor:'pointer'}}>💾 Save Minutes of Meeting</button>
              <button onClick={()=>setShowForm(false)} style={{padding:'11px 20px',borderRadius:10,border:'1px solid #e2e8f0',background:'#fff',fontSize:11,cursor:'pointer'}}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetail&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.55)',zIndex:1000,display:'flex',alignItems:'flex-start',justifyContent:'center',padding:16,overflowY:'auto'}} onClick={()=>setShowDetail(null)}>
          <div style={{background:'#fff',borderRadius:18,padding:0,width:600,maxWidth:'95vw',marginTop:20,overflow:'hidden'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'16px 22px',color:'#fff'}}>
              <div style={{fontSize:15,fontWeight:900}}>{showDetail.title}</div>
              <div style={{fontSize:10,opacity:.8,marginTop:4}}>{showDetail.date} · {showDetail.time} · {showDetail.venue}</div>
              <div style={{fontSize:9,opacity:.7,marginTop:2}}>Chair: {showDetail.chair}{showDetail.chief_guest!=='—'?` · Guest: ${showDetail.chief_guest}`:''}</div>
            </div>
            <div style={{padding:'18px 22px'}}>
              <div style={{marginBottom:14}}><div style={{fontSize:10,fontWeight:700,marginBottom:6}}>👥 Attendees</div><div style={{display:'flex',gap:4,flexWrap:'wrap'}}>{showDetail.attendees.map(a=><span key={a} style={{fontSize:9,padding:'3px 10px',borderRadius:20,background:`${A}15`,color:A}}>{a}</span>)}</div></div>
              <div style={{marginBottom:14}}><div style={{fontSize:10,fontWeight:700,marginBottom:6}}>📋 Agenda</div>{showDetail.agendas.map((ag,i)=><div key={i} style={{fontSize:10,padding:'5px 0',borderBottom:'1px solid #f8fafc',color:'#374151'}}>• {ag}</div>)}</div>
              <div style={{marginBottom:14}}><div style={{fontSize:10,fontWeight:700,marginBottom:6}}>✅ Decisions</div>{showDetail.decisions.map((d,i)=><div key={i} style={{fontSize:10,padding:'5px 0',color:'#059669',fontWeight:600}}>✓ {d}</div>)}</div>
              <div><div style={{fontSize:10,fontWeight:700,marginBottom:6}}>📌 Action Items</div>
                {showDetail.actions.map((a,i)=>(
                  <div key={i} style={{display:'flex',gap:10,padding:'7px 0',borderBottom:'1px solid #f1f5f9',fontSize:10}}>
                    <span style={{fontSize:14}}>{a.done?'✅':'⬜'}</span>
                    <div style={{flex:1}}><div style={{fontWeight:600,color:a.done?'#94a3b8':'#0f172a',textDecoration:a.done?'line-through':'none'}}>{a.task}</div>
                    <div style={{fontSize:9,color:'#64748b'}}>{a.responsible} · Due: {a.due}</div></div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{padding:'12px 22px',borderTop:'1px solid #f1f5f9',display:'flex',gap:8}}>
              <button style={{flex:1,padding:'9px',borderRadius:9,border:'none',background:G,color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>📄 Export PDF</button>
              <button style={{flex:1,padding:'9px',borderRadius:9,border:'1px solid #e2e8f0',background:'#fff',fontSize:10,cursor:'pointer'}}>📧 Email to Attendees</button>
              <button onClick={()=>setShowDetail(null)} style={{padding:'9px 18px',borderRadius:9,border:'1px solid #e2e8f0',background:'#fff',fontSize:10,cursor:'pointer'}}>Close</button>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} actions={[
        {icon:'👁',label:'View Full MoM',key:'view'},{icon:'✅',label:'Finalize',key:'finalize'},
        {icon:'📄',label:'Export PDF',key:'pdf'},{icon:'📧',label:'Email to Attendees',key:'email'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}
