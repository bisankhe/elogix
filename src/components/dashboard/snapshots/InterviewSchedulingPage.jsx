// FILE: InterviewSchedulingPage.jsx - Interview Scheduling
// Self-scheduling, calendar sync, auto-conflict detection

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#064e3b 0%,#0891b2 60%,#67e8f9 100%)'
const A = '#0891b2'

const DAYS = ['Mon 16','Tue 17','Wed 18','Thu 19','Fri 20']
const HOURS = ['09:00','10:00','11:00','14:00','15:00','16:00']

const INTERVIEWS = [
  {id:'is1',candidate:'Rajan Shrestha',position:'Senior SW Dev',round:'Technical',
   panel:['Rajesh Sharma (CTO)','Bikash Shrestha (IT Lead)'],
   date:'2025-06-18',time:'10:00',duration:60,mode:'Video (Google Meet)',
   link:'meet.google.com/xyz-abc-123',status:'confirmed',
   reminder_sent:true,packet_sent:true,
   impact_links:['Panel Notification','Interview Management','ATS']},
  {id:'is2',candidate:'Priya Tamang',position:'Senior SW Dev',round:'HR Round',
   panel:['Priya Adhikari (HR Manager)'],
   date:'2025-06-19',time:'14:00',duration:45,mode:'In-Person (KTM HQ)',
   link:null,status:'confirmed',reminder_sent:true,packet_sent:false,
   impact_links:['Panel Notification','Interview Management']},
  {id:'is3',candidate:'Gita Maharjan',position:'Cloud Architect',round:'Panel',
   panel:['Rajesh Sharma (CTO)','IT Lead','CFO'],
   date:'2025-06-20',time:'11:00',duration:90,mode:'Video (Google Meet)',
   link:'meet.google.com/abc-def-456',status:'pending_candidate',
   reminder_sent:false,packet_sent:false,
   impact_links:['Panel Notification','Interview Management','ATS']},
  {id:'is4',candidate:'Maya Pradhan',position:'Finance Manager',round:'Technical',
   panel:['CFO','Finance Head'],
   date:'2025-06-17',time:'09:00',duration:60,mode:'In-Person',
   link:null,status:'completed',reminder_sent:true,packet_sent:true,
   impact_links:['Interview Management','ATS']},
]

const STATUS_CFG = {
  confirmed:         {c:'#10b981',bg:'#f0fdf4',icon:'✅'},
  pending_candidate: {c:'#f59e0b',bg:'#fffbeb',icon:'⏳'},
  completed:         {c:'#64748b',bg:'#f8fafc', icon:'✓'},
  cancelled:         {c:'#ef4444',bg:'#fef2f2',icon:'❌'},

export default function InterviewSchedulingPage() {
  const [interviews, setInterviews] = useState(INTERVIEWS)
  const [view, setView]             = useState('list')
  const [showAdd, setShowAdd]       = useState(false)
  const [showExcel, setShowExcel]   = useState(false)
  const [ctx, setCtx]               = useState(null)
  const [form, setForm]             = useState({candidate:'',round:'Technical',date:'',time:'',duration:'60',mode:'Video (Google Meet)',location:'',link:'',panel_internal:[],panel_external:''})
  const [msg, setMsg]               = useState('')
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(''),3000) }

  const INTERNAL_PANELS = [
    {id:'p1',name:'Rajesh Sharma',  title:'CTO',              dept:'IT',   phone:'+977-9801111111',email:'rajesh@company.com'},
    {id:'p2',name:'Sanjay Karki',   title:'CFO',              dept:'Finance',phone:'+977-9802222222',email:'sanjay@company.com'},
    {id:'p3',name:'Priya Adhikari', title:'HR Manager',       dept:'HR',   phone:'+977-9803333333',email:'priya@company.com'},
    {id:'p4',name:'Bikash Shrestha',title:'IT Lead',          dept:'IT',   phone:'+977-9804444444',email:'bikash@company.com'},
    {id:'p5',name:'Maya Gurung',    title:'Operations Head',  dept:'Ops',  phone:'+977-9805555555',email:'maya@company.com'},
    {id:'p6',name:'Anita Karmacharya',title:'Senior Developer',dept:'IT',  phone:'+977-9806666666',email:'anita@company.com'},
  ]

  const togglePanel = (id) => {
    setForm(p=>({...p,panel_internal:p.panel_internal.includes(id)?p.panel_internal.filter(x=>x!==id):[...p.panel_internal,id]}))

  const confirmed  = interviews.filter(i=>i.status==='confirmed').length
  const pending    = interviews.filter(i=>i.status==='pending_candidate').length
  const today      = interviews.filter(i=>i.date==='2025-06-17').length

  const bookSlot = (day, hour) => {
    alert(`Slot ${hour} on ${day} selected. Self-scheduling link will be sent to candidate.`)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📅" title="Interview Scheduling"
        breadcrumb="Employee Lifecycle > Recruitment > Recruitment Management"
        gradient={G}
        stats={[
          {icon:'📅',label:'Scheduled',     value:interviews.length},
          {icon:'✅',label:'Confirmed',      value:confirmed},
          {icon:'⏳',label:'Pending Confirm',value:pending},
          {icon:'📋',label:'Today',          value:today},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="Schedule Interview"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{display:'flex',gap:4,background:'#f1f5f9',padding:4,borderRadius:10,marginBottom:14,width:'fit-content'}}>
        {['list','calendar'].map(v=>(
          <button key={v} onClick={()=>setView(v)}
            style={{padding:'9px 20px',borderRadius:8,border:'none',cursor:'pointer',background:view===v?'#fff':'transparent',
              color:view===v?A:'#64748b',fontWeight:view===v?700:400,fontSize:12,boxShadow:view===v?'0 1px 4px rgba(0,0,0,.08)':'none'}}>
            {v==='list'?'List View':'Calendar View'}
          </button>
        ))}
      </div>

      {view==='list'&&(
        <div style={{display:'grid',gap:12}}>
          {interviews.map(iv=>{
            const sc = STATUS_CFG[iv.status]||STATUS_CFG.pending_candidate
            return (
              <div key={iv.id}
                onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:iv.candidate,...iv}})}}
                style={{background:'#fff',border:`1.5px solid ${sc.c}33`,borderRadius:14,overflow:'hidden',
                  boxShadow:'0 2px 8px rgba(0,0,0,.04)',borderLeft:`5px solid ${sc.c}`}}>
                <div style={{display:'flex',alignItems:'center',gap:14,padding:'14px 18px',flexWrap:'wrap'}}>
                  <div style={{width:44,height:44,borderRadius:12,background:`${sc.c}18`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>📅</div>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:3}}>
                      <span style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{iv.candidate}</span>
                      <span style={{background:sc.bg,color:sc.c,fontSize:10,fontWeight:700,padding:'2px 10px',borderRadius:20}}>{sc.icon} {iv.status.replace('_',' ').toUpperCase()}</span>
                      <span style={{background:'#f5f3ff',color:'#7c3aed',fontSize:9,padding:'2px 8px',borderRadius:20,fontWeight:600}}>{iv.round}</span>
                    </div>
                    <div style={{fontSize:11,color:'#64748b'}}>{iv.position} . {iv.date} {iv.time} . {iv.duration}min . {iv.mode}</div>
                    <div style={{fontSize:10,color:'#94a3b8',marginTop:2}}>Panel: {iv.panel.join(', ')}</div>
                    {iv.link&&<div style={{fontSize:10,color:A,marginTop:2}}>🔗 {iv.link}</div>}
                  </div>
                  <div style={{display:'flex',gap:5,flexShrink:0}}>
                    <span style={{fontSize:9,padding:'3px 8px',borderRadius:20,background:iv.packet_sent?'#f0fdf4':'#fef2f2',color:iv.packet_sent?'#15803d':'#dc2626',fontWeight:700}}>{iv.packet_sent?'Packet Sent':'Packet Pending'}</span>
                    <span style={{fontSize:9,padding:'3px 8px',borderRadius:20,background:iv.reminder_sent?'#f0fdf4':'#fffbeb',color:iv.reminder_sent?'#15803d':'#f59e0b',fontWeight:700}}>{iv.reminder_sent?'Reminder Sent':'Reminder Pending'}</span>
                  </div>
                </div>
                {iv.status==='pending_candidate'&&(
                  <div style={{padding:'8px 18px 10px',background:'#fffbeb',borderTop:'1px solid #fde68a',display:'flex',gap:8}}>
                    <span style={{fontSize:10,color:'#92400e',flex:1}}>Candidate has not confirmed yet. Send self-scheduling link.</span>
                    <button style={{padding:'5px 14px',borderRadius:8,border:'none',background:'#f59e0b',color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>Resend Link</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {view==='calendar'&&(
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,overflow:'hidden'}}>
          <div style={{display:'grid',gridTemplateColumns:`60px repeat(${DAYS.length},1fr)`,borderBottom:'2px solid #e2e8f0'}}>
            <div style={{padding:'10px',background:'#f8fafc'}}/>
            {DAYS.map(d=>(
              <div key={d} style={{padding:'10px 8px',textAlign:'center',fontSize:11,fontWeight:800,color:A,background:'#f0f9ff',borderLeft:'1px solid #e2e8f0'}}>{d}</div>
            ))}
          </div>
          {HOURS.map(hr=>(
            <div key={hr} style={{display:'grid',gridTemplateColumns:`60px repeat(${DAYS.length},1fr)`,borderBottom:'1px solid #f1f5f9'}}>
              <div style={{padding:'10px 8px',fontSize:10,fontWeight:700,color:'#94a3b8',background:'#f8fafc',textAlign:'right'}}>{hr}</div>
              {DAYS.map(day=>{
                const booked = interviews.find(iv=>iv.time===hr&&iv.date.endsWith(day.split(' ')[1]))
                return (
                  <div key={day} onClick={()=>!booked&&bookSlot(day,hr)}
                    style={{padding:'4px 6px',minHeight:40,borderLeft:'1px solid #f1f5f9',
                      background:booked?`${STATUS_CFG[booked.status]?.c||'#64748b'}12`:'#fff',
                      cursor:booked?'default':'pointer'}}
                    onMouseEnter={e=>!booked&&(e.currentTarget.style.background='#f0f9ff')}
                    onMouseLeave={e=>!booked&&(e.currentTarget.style.background='#fff')}>
                    {booked&&(
                      <div style={{fontSize:9,fontWeight:700,color:STATUS_CFG[booked.status]?.c||'#64748b',lineHeight:1.3}}>
                        {booked.candidate.split(' ')[0]}<br/>{booked.round}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}

      {showAdd&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowAdd(false)}>
          <div style={{background:'#fff',borderRadius:20,width:660,maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Schedule Interview</div></div>
            <div style={{padding:'22px 28px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
                <div>
                  <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Candidate *</label>
                  <select value={form.candidate} onChange={e=>setForm(p=>({...p,candidate:e.target.value}))}
                    style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',background:'#fff',boxSizing:'border-box'}}>
                    <option value="">Select candidate...</option>
                    {['Rajan Shrestha','Priya Tamang','Gita Maharjan','Sita Khadka','Maya Pradhan'].map(o=><option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Interview Round</label>
                  <select value={form.round} onChange={e=>setForm(p=>({...p,round:e.target.value}))}
                    style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',background:'#fff',boxSizing:'border-box'}}>
                    {['HR Screening','Technical','Written Test','Panel Interview','Final Round','Management Round'].map(o=><option key={o}>{o}</option>)}
                  </select>
                </div>
                {[['Date *','date','date'],['Time *','time','time'],['Video/Meet Link','link','text'],['Location (if in-person)','location','text']].map(([l,f,t])=>(
                  <div key={f}>
                    <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>{l}</label>
                    <input type={t} value={form[f]} onChange={e=>setForm(p=>({...p,[f]:e.target.value}))}
                      style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                  </div>
                ))}
                <div>
                  <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Duration</label>
                  <select value={form.duration} onChange={e=>setForm(p=>({...p,duration:e.target.value}))}
                    style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',background:'#fff',boxSizing:'border-box'}}>
                    {['30','45','60','90','120'].map(o=><option key={o}>{o} min</option>)}
                  </select>
                </div>
                <div>
                  <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Mode</label>
                  <select value={form.mode} onChange={e=>setForm(p=>({...p,mode:e.target.value}))}
                    style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',background:'#fff',boxSizing:'border-box'}}>
                    {['Video (Google Meet)','Video (MS Teams)','Video (Zoom)','In-Person','Phone Call'].map(o=><option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              {/* Panel Members — Internal Picker */}
              <div style={{marginBottom:14}}>
                <div style={{fontSize:10,fontWeight:700,color:'#374151',marginBottom:6}}>Panel Members — Select Internal Judges</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:8}}>
                  {INTERNAL_PANELS.map(p=>(
                    <label key={p.id} style={{display:'flex',gap:8,padding:'8px 10px',borderRadius:9,border:`1.5px solid ${form.panel_internal.includes(p.id)?A:'#e2e8f0'}`,background:form.panel_internal.includes(p.id)?`${A}08`:'#fff',cursor:'pointer',alignItems:'center'}}>
                      <input type="checkbox" checked={form.panel_internal.includes(p.id)} onChange={()=>togglePanel(p.id)} style={{accentColor:A}}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:10,fontWeight:700,color:'#0f172a',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</div>
                        <div style={{fontSize:8,color:'#64748b'}}>{p.title} · {p.dept}</div>
                      </div>
                    </label>
                  ))}
                </div>
                <div>
                  <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>External Panel Member (Name, Company)</label>
                  <input value={form.panel_external} onChange={e=>setForm(p=>({...p,panel_external:e.target.value}))}
                    placeholder="e.g. John Doe, TechCorp Nepal (optional)"
                    style={{width:'100%',padding:'8px 12px',borderRadius:9,border:'1px solid #e2e8f0',fontSize:10,outline:'none',boxSizing:'border-box'}}/>
                </div>
                {form.panel_internal.length>0&&(
                  <div style={{marginTop:6,background:'#f0fdf4',borderRadius:8,padding:'6px 10px',fontSize:9,color:'#065f46'}}>
                    ✅ Auto-notification will be sent via Email + WhatsApp + HRMS to {form.panel_internal.length} internal panel member(s) when scheduled.
                  </div>
                )}
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
              </div>
              <AIImpact color={A} lines={['AI checks panel availability and flags conflicts.','Self-scheduling link auto-sent to candidate.','Calendar invites + candidate packet auto-dispatched.','Reminder SMS/email 24hrs before interview.']}/>
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>{
                  if(!form.candidate||!form.date||!form.time){notify('⚠️ Candidate, date and time required');return}
                  const panelNames = INTERNAL_PANELS.filter(p=>form.panel_internal.includes(p.id)).map(p=>p.name+' ('+p.title+')')
                  if(form.panel_external) panelNames.push(form.panel_external+' (External)')
                  setInterviews(p=>[{
                    id:'is'+Date.now(),candidate:form.candidate,position:'Selected Role',round:form.round,
                    panel:panelNames.length?panelNames:['TBD'],date:form.date,time:form.time,
                    duration:parseInt(form.duration),mode:form.mode,
                    link:form.link||null,status:'pending_candidate',reminder_sent:false,packet_sent:false,
                    impact_links:['Panel Notification','Interview Management','ATS']
                  },...p])
                  notify('✅ Interview scheduled — notifications sent to candidate + '+panelNames.length+' panel member(s) via Email, WhatsApp & HRMS')
                  setShowAdd(false)
                  setForm({candidate:'',round:'Technical',date:'',time:'',duration:'60',mode:'Video (Google Meet)',location:'',link:'',panel_internal:[],panel_external:''})
                }}
                  style={{flex:1,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Schedule & Notify</button>
                <button onClick={()=>setShowAdd(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:360}}>{msg}</div>}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[{icon:'👁',label:'View',key:'view'},{icon:'📧',label:'Send Reminder',key:'remind'},{icon:'🔄',label:'Reschedule',key:'reschedule'},{icon:'❌',label:'Cancel',key:'cancel',danger:true}]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Interview Schedule" columns={['Candidate','Position','Round','Date','Time','Duration','Mode','Panel','Status']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
    </div>
  )
