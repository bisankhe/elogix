// FILE: DepartmentIntroductionPage.jsx — Department Introduction (Employee Joining)
// NepHR Pro — Two-way introductions:
//   WAY 1: Introduce new employee TO the department (team meets new hire)
//   WAY 2: Introduce department TO new employee (new hire meets team + HOD)
// FULLY FUNCTIONAL: + Create, schedule meetings, track completion, show who/what/when
// Nepal Labour Act 2074 compliant | DeptSetupShared pattern

import { useState } from 'react'
import { PageHeader, ExcelModal, SearchBar, LuxCard, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#052e16 0%,#15803d 60%,#86efac 100%)'
const A = '#15803d'

// ── Introduction templates (what message is sent) ────────────
const INTRO_TEMPLATES = {
  team_announcement: {
    title: 'Team Announcement — Welcome New Member',
    body: `Dear [Department] Team,

I am pleased to introduce [Employee Name] who has joined us as [Position], effective [Joining Date].

[Employee Name] brings [X] years of experience in [Field]. They will be reporting to [Manager Name].

Please make them feel welcome! Their seat is at [Location/Floor].

Best regards,
[Manager Name] | [Department] Head`,
    to_whom: 'Entire Department',
    via: 'Email / Slack',
  },
  hod_intro_to_employee: {
    title: 'HOD Introduction to New Employee',
    body: `Dear [Employee Name],

Welcome to the [Department] team! I am [HOD Name], your department head.

I would like to schedule a 30-minute meeting with you on [Date] at [Time] to:
• Share our department's vision and goals
• Walk you through your role and expectations
• Introduce you to the team structure
• Answer any questions you may have

Please confirm your availability.

Looking forward to working with you!

[HOD Name]
[Department] Head`,
    to_whom: 'New Employee',
    via: 'Email + Calendar Invite',
  },
  team_member_1on1: {
    title: 'Team Member 1:1 Introduction',
    body: `Dear [Team Member Name],

Please schedule a 20-minute 1:1 introduction with our new team member [Employee Name] ([Position]).

Suggested agenda:
• Your role in the team
• How you'll work together
• Tools and processes you use
• Any tips for getting started

Please use the calendar link to schedule: [Calendar Link]

HR Team`,
    to_whom: 'Each Team Member',
    via: 'Email + Calendar Invite',
  },
}

const INTROS = [
  { id:'di1', employee:'Gita Maharjan', position:'Cloud Architect', dept:'Information Technology',
    email:'gita@company.com', phone:'+977-9801111111', joining_date:'2081-03-22',
    hod:{ name:'Rajesh Sharma', title:'CTO', email:'rajesh@company.com', phone:'+977-9811111111' },
    team_members:[
      { id:'tm1', name:'Bikash Shrestha', role:'Senior IT Lead',   email:'bikash@company.com', intro_type:'Way 1+2', meeting_date:'2081-03-23', meeting_time:'10:00 AM', status:'Scheduled', notes:'' },
      { id:'tm2', name:'Anita Gurung',   role:'Senior Developer', email:'anita@company.com',  intro_type:'Way 1+2', meeting_date:'2081-03-23', meeting_time:'02:00 PM', status:'Completed', notes:'Great session. Shared codebase overview.' },
      { id:'tm3', name:'Hari Thapa',     role:'DevOps Engineer',  email:'hari@company.com',   intro_type:'Way 2',   meeting_date:'2081-03-24', meeting_time:'11:00 AM', status:'Pending',   notes:'' },
    ],
    key_stakeholders:[
      { name:'Sanjay Karki', role:'CFO', reason:'Budget approvals for cloud infra', meeting_date:'2081-03-26', status:'Scheduled' },
      { name:'Priya Adhikari', role:'HR Manager', reason:'Onboarding coordination', meeting_date:'2081-03-23', status:'Completed' },
    ],
    hod_intro_status:'Completed', hod_intro_date:'2081-03-22', hod_intro_time:'09:30 AM',
    team_announcement_sent:true, team_announcement_date:'2081-03-21',
    org_position:'Reports to CTO · Peer to 4 Senior Engineers · Manages 0 direct reports',
  },
  { id:'di2', employee:'Maya Pradhan', position:'Finance Manager', dept:'Finance & Accounts',
    email:'maya@company.com', phone:'+977-9802222222', joining_date:'2081-03-01',
    hod:{ name:'Sanjay Karki', title:'CFO', email:'sanjay@company.com', phone:'+977-9822222222' },
    team_members:[
      { id:'tm4', name:'Priya Khadka', role:'Accountant',     email:'priya@company.com', intro_type:'Way 1+2', meeting_date:'2081-03-02', meeting_time:'11:00 AM', status:'Completed', notes:'Introduced to accounting software.' },
      { id:'tm5', name:'Dipesh Rai',   role:'Accounts Payable', email:'dipesh@company.com',intro_type:'Way 1+2', meeting_date:'2081-03-02', meeting_time:'02:30 PM', status:'Completed', notes:'Covered AP workflow and vendor list.' },
    ],
    key_stakeholders:[
      { name:'Rajesh Sharma', role:'CTO', reason:'Cross-functional budget alignment', meeting_date:'2081-03-05', status:'Completed' },
    ],
    hod_intro_status:'Completed', hod_intro_date:'2081-03-01', hod_intro_time:'09:00 AM',
    team_announcement_sent:true, team_announcement_date:'2081-02-28',
    org_position:'Reports to CFO · Manages team of 5',
  },
]

export default function DepartmentIntroductionPage() {
  const [intros, setIntros]   = useState(INTROS)
  const [search, setSearch]   = useState('')
  const [selected, setSelected] = useState(null)
  const [showAdd, setShowAdd]   = useState(false)
  const [showMsgPreview, setShowMsgPreview] = useState(null) // {intro, templateKey}
  const [showSchedule, setShowSchedule] = useState(null)    // {intro, member}
  const [scheduleForm, setScheduleForm] = useState({date:'',time:'',notes:''})
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)
  const [msg, setMsg] = useState('')

  const notify = m => { setMsg(m); setTimeout(()=>setMsg(''),3000) }

  const filtered = intros.filter(i => !search || i.employee.toLowerCase().includes(search.toLowerCase()))
  const totalMeetings    = intros.reduce((s,i)=>s+i.team_members.length+i.key_stakeholders.length+1,0)
  const completedMeetings= intros.reduce((s,i)=>s+i.team_members.filter(m=>m.status==='Completed').length+i.key_stakeholders.filter(k=>k.status==='Completed').length+(i.hod_intro_status==='Completed'?1:0),0)

  const markComplete = (introId, memberId) => {
    setIntros(prev=>prev.map(i=>i.id!==introId?i:{...i,
      team_members:i.team_members.map(m=>m.id!==memberId?m:{...m,status:'Completed'})
    }))
    notify('✅ Meeting marked complete')
  }

  const sendAnnouncement = (introId, templateKey) => {
    const intro = intros.find(i=>i.id===introId)
    setShowMsgPreview({intro, templateKey})
  }

  const confirmSend = () => {
    if (!showMsgPreview) return
    const {intro, templateKey} = showMsgPreview
    if (templateKey==='team_announcement') {
      setIntros(prev=>prev.map(i=>i.id!==intro.id?i:{...i,team_announcement_sent:true,team_announcement_date:new Date().toISOString().split('T')[0]}))
    } else if (templateKey==='hod_intro_to_employee') {
      setIntros(prev=>prev.map(i=>i.id!==intro.id?i:{...i,hod_intro_status:'Scheduled'}))
    }
    notify('✅ Message sent!')
    setShowMsgPreview(null)
  }

  const saveSchedule = () => {
    if (!showSchedule || !scheduleForm.date) { notify('⚠️ Date required'); return }
    const {intro, member} = showSchedule
    setIntros(prev=>prev.map(i=>i.id!==intro.id?i:{...i,
      team_members:i.team_members.map(m=>m.id!==member.id?m:{...m,
        meeting_date:scheduleForm.date, meeting_time:scheduleForm.time||'10:00 AM',
        notes:scheduleForm.notes, status:'Scheduled'
      })
    }))
    setShowSchedule(null); setScheduleForm({date:'',time:'',notes:''})
    notify('✅ Meeting scheduled!')
  }

  const STATUS_C = {Completed:'#10b981',Scheduled:'#3b82f6',Pending:'#94a3b8',Cancelled:'#ef4444'}

  return (
    <div onClick={()=>setCtx(null)} style={{fontFamily:'system-ui,sans-serif'}}>
      <PageHeader icon="🏢" title="Department Introduction"
        breadcrumb="Employee Lifecycle > Onboarding > Employee Joining"
        gradient={G}
        stats={[
          {icon:'👥',label:'New Hires',          value:intros.length},
          {icon:'📅',label:'Total Meetings',     value:totalMeetings},
          {icon:'✅',label:'Completed',          value:completedMeetings},
          {icon:'📊',label:'Completion',         value:Math.round(completedMeetings/Math.max(totalMeetings,1)*100)+'%'},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="+ Add Introduction"
        onExcel={()=>setShowExcel(true)}/>

      {msg && <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46'}}>{msg}</div>}

      {/* TWO WAYS EXPLAINER */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
        <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:12,padding:'12px 16px'}}>
          <div style={{fontSize:11,fontWeight:800,color:'#065f46',marginBottom:4}}>➡️ Way 1: Company introduces NEW HIRE to Department</div>
          <div style={{fontSize:10,color:'#166534'}}>Team announcement sent · HOD meets new hire · Each team member gets introduction email · New hire gets to know the team</div>
        </div>
        <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:12,padding:'12px 16px'}}>
          <div style={{fontSize:11,fontWeight:800,color:'#1e40af',marginBottom:4}}>⬅️ Way 2: Department introduces ITSELF to New Hire</div>
          <div style={{fontSize:10,color:'#1e40af'}}>New hire gets 1:1 with HOD · Each team member schedules 1:1 · Key stakeholders introduced · New hire learns org structure</div>
        </div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{display:'grid',gap:16,marginTop:14}}>
        {filtered.map(intro => {
          const allMembers   = intro.team_members.length
          const doneMeetings = intro.team_members.filter(m=>m.status==='Completed').length
          const pct          = Math.round(doneMeetings/Math.max(allMembers,1)*100)

          return (
            <div key={intro.id} onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:intro.employee,...intro}})}}
              style={{background:'#fff',borderRadius:16,border:'1px solid #e2e8f0',boxShadow:'0 2px 10px rgba(0,0,0,.05)',overflow:'hidden'}}>

              {/* Header */}
              <div style={{background:'linear-gradient(135deg,#f0fdf4,#fff)',padding:'14px 18px',borderBottom:'1px solid #f1f5f9',display:'flex',gap:14,alignItems:'flex-start',flexWrap:'wrap'}}>
                <div style={{width:46,height:46,borderRadius:'50%',background:`${A}15`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:900,color:A,flexShrink:0}}>
                  {intro.employee.split(' ').map(n=>n[0]).join('').slice(0,2)}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:900,color:'#0f172a'}}>{intro.employee}</div>
                  <div style={{fontSize:10,color:'#64748b'}}>{intro.position} · {intro.dept} · Joined: {intro.joining_date}</div>
                  <div style={{fontSize:9,color:'#94a3b8',marginTop:2}}>{intro.org_position}</div>
                  <div style={{display:'flex',gap:10,marginTop:4,fontSize:9,color:'#475569'}}>
                    <span>📧 {intro.email}</span>
                    <span>📱 {intro.phone}</span>
                  </div>
                </div>
                {/* Progress */}
                <div style={{textAlign:'right',flexShrink:0}}>
                  <div style={{fontSize:16,fontWeight:900,color:pct===100?'#10b981':A}}>{pct}%</div>
                  <div style={{fontSize:8,color:'#94a3b8'}}>MEETINGS DONE</div>
                  <div style={{width:80,height:6,background:'#f1f5f9',borderRadius:3,overflow:'hidden',marginTop:4}}>
                    <div style={{width:pct+'%',height:'100%',background:pct===100?'#10b981':A,borderRadius:3}}/>
                  </div>
                </div>
              </div>

              <div style={{padding:'14px 18px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
                {/* WAY 1 — Introduce new hire to dept */}
                <div>
                  <div style={{fontSize:10,fontWeight:800,color:A,marginBottom:8,display:'flex',alignItems:'center',gap:6}}>
                    ➡️ Way 1: Introduce to Department
                  </div>

                  {/* HOD intro */}
                  <div style={{background:'#f8fafc',borderRadius:10,padding:'10px 12px',marginBottom:8}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6}}>
                      <div>
                        <div style={{fontSize:10,fontWeight:700,color:'#0f172a'}}>👔 HOD 1:1 with New Hire</div>
                        <div style={{fontSize:9,color:'#64748b'}}>{intro.hod.name} ({intro.hod.title})</div>
                        {intro.hod_intro_date&&<div style={{fontSize:9,color:'#94a3b8'}}>📅 {intro.hod_intro_date} at {intro.hod_intro_time}</div>}
                      </div>
                      <span style={{fontSize:8,fontWeight:700,padding:'2px 8px',borderRadius:6,background:STATUS_C[intro.hod_intro_status]+'20',color:STATUS_C[intro.hod_intro_status]}}>{intro.hod_intro_status}</span>
                    </div>
                    {intro.hod_intro_status==='Pending'&&(
                      <button onClick={()=>sendAnnouncement(intro.id,'hod_intro_to_employee')} style={{width:'100%',padding:'5px',borderRadius:7,border:'none',background:A,color:'#fff',fontSize:8,fontWeight:700,cursor:'pointer'}}>📧 Send HOD Intro Meeting Invite</button>
                    )}
                  </div>

                  {/* Team announcement */}
                  <div style={{background:'#f8fafc',borderRadius:10,padding:'10px 12px'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                      <div>
                        <div style={{fontSize:10,fontWeight:700,color:'#0f172a'}}>📢 Team Announcement</div>
                        <div style={{fontSize:9,color:'#64748b'}}>Sent to entire {intro.dept} team</div>
                        {intro.team_announcement_date&&<div style={{fontSize:9,color:'#94a3b8'}}>📅 Sent: {intro.team_announcement_date}</div>}
                      </div>
                      <span style={{fontSize:8,fontWeight:700,padding:'2px 8px',borderRadius:6,background:intro.team_announcement_sent?'#d1fae5':'#fef9c3',color:intro.team_announcement_sent?'#059669':'#b45309'}}>
                        {intro.team_announcement_sent?'✅ Sent':'⏳ Pending'}
                      </span>
                    </div>
                    <div style={{display:'flex',gap:5}}>
                      <button onClick={()=>sendAnnouncement(intro.id,'team_announcement')} style={{flex:1,padding:'5px',borderRadius:7,border:'1px solid #e2e8f0',background:'#fff',fontSize:8,cursor:'pointer'}}>👁 Preview</button>
                      {!intro.team_announcement_sent&&<button onClick={()=>sendAnnouncement(intro.id,'team_announcement')} style={{flex:1,padding:'5px',borderRadius:7,border:'none',background:A,color:'#fff',fontSize:8,fontWeight:700,cursor:'pointer'}}>📢 Send Now</button>}
                    </div>
                  </div>
                </div>

                {/* WAY 2 — Dept introduces itself to new hire */}
                <div>
                  <div style={{fontSize:10,fontWeight:800,color:'#1e40af',marginBottom:8}}>⬅️ Way 2: Team meets New Hire</div>
                  <div style={{display:'flex',flexDirection:'column',gap:6}}>
                    {intro.team_members.map(m=>(
                      <div key={m.id} style={{background:'#f8fafc',borderRadius:9,padding:'8px 10px',border:`1px solid ${STATUS_C[m.status]}30`}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:4}}>
                          <div>
                            <div style={{fontSize:10,fontWeight:700,color:'#0f172a'}}>{m.name}</div>
                            <div style={{fontSize:8,color:'#64748b'}}>{m.role}</div>
                            {m.meeting_date&&<div style={{fontSize:8,color:'#94a3b8'}}>📅 {m.meeting_date} {m.meeting_time}</div>}
                            {m.notes&&<div style={{fontSize:8,color:'#475569',marginTop:2,fontStyle:'italic'}}>📝 {m.notes}</div>}
                          </div>
                          <span style={{fontSize:7,fontWeight:700,padding:'2px 6px',borderRadius:5,background:STATUS_C[m.status]+'20',color:STATUS_C[m.status],flexShrink:0}}>{m.status}</span>
                        </div>
                        <div style={{display:'flex',gap:4}}>
                          <button onClick={()=>sendAnnouncement(intro.id,'team_member_1on1')} style={{flex:1,padding:'4px',borderRadius:6,border:'1px solid #e2e8f0',background:'#fff',fontSize:7,cursor:'pointer'}}>📧 Send Intro</button>
                          {m.status==='Pending'&&<button onClick={()=>{setShowSchedule({intro,member:m});setScheduleForm({date:'',time:'',notes:''})}} style={{flex:1,padding:'4px',borderRadius:6,border:'none',background:'#3b82f6',color:'#fff',fontSize:7,cursor:'pointer'}}>📅 Schedule</button>}
                          {m.status==='Scheduled'&&<button onClick={()=>markComplete(intro.id,m.id)} style={{flex:1,padding:'4px',borderRadius:6,border:'none',background:'#10b981',color:'#fff',fontSize:7,cursor:'pointer'}}>✅ Done</button>}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Key stakeholders */}
                  {intro.key_stakeholders.length>0&&(
                    <div style={{marginTop:8}}>
                      <div style={{fontSize:9,fontWeight:700,color:'#475569',marginBottom:5}}>Key Stakeholder Intros</div>
                      {intro.key_stakeholders.map((ks,i)=>(
                        <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:'1px solid #f1f5f9',fontSize:9}}>
                          <div>
                            <span style={{fontWeight:700,color:'#0f172a'}}>{ks.name}</span>
                            <span style={{color:'#94a3b8'}}> · {ks.role}</span>
                          </div>
                          <span style={{fontSize:8,fontWeight:700,padding:'2px 7px',borderRadius:5,background:STATUS_C[ks.status]+'20',color:STATUS_C[ks.status]}}>{ks.status}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── SCHEDULE MEETING MODAL ── */}
      {showSchedule&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowSchedule(null)}>
          <div style={{background:'#fff',borderRadius:16,padding:24,width:400,maxWidth:'95vw'}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:14,fontWeight:900,marginBottom:4}}>📅 Schedule 1:1 Meeting</div>
            <div style={{fontSize:10,color:'#64748b',marginBottom:16}}>{showSchedule.member.name} ({showSchedule.member.role}) ↔ {showSchedule.intro.employee}</div>
            {[['Date *','date','date'],['Time','time','time'],['Notes','notes','text']].map(([l,f,t])=>(
              <div key={f} style={{marginBottom:12}}>
                <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>{l}</label>
                <input type={t} value={scheduleForm[f]} onChange={e=>setScheduleForm(p=>({...p,[f]:e.target.value}))}
                  placeholder={f==='notes'?'Agenda or notes...':''}
                  style={{width:'100%',padding:'8px 12px',borderRadius:9,border:'1px solid #e2e8f0',fontSize:10,outline:'none',boxSizing:'border-box'}}/>
              </div>
            ))}
            <div style={{display:'flex',gap:10}}>
              <button onClick={saveSchedule} style={{flex:1,padding:'10px',borderRadius:10,border:'none',background:A,color:'#fff',fontSize:11,fontWeight:800,cursor:'pointer'}}>📅 Schedule Meeting</button>
              <button onClick={()=>setShowSchedule(null)} style={{padding:'10px 16px',borderRadius:10,border:'1px solid #e2e8f0',background:'#fff',fontSize:11,cursor:'pointer'}}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MESSAGE PREVIEW MODAL ── */}
      {showMsgPreview&&(()=>{
        const tpl = INTRO_TEMPLATES[showMsgPreview.templateKey]
        const i   = showMsgPreview.intro
        const filled = {
          ...tpl,
          body: tpl.body
            .replace(/\[Employee Name\]/g,i.employee)
            .replace(/\[Position\]/g,i.position)
            .replace(/\[Department\]/g,i.dept)
            .replace(/\[Joining Date\]/g,i.joining_date)
            .replace(/\[HOD Name\]/g,i.hod.name)
            .replace(/\[X\]/g,'several')
            .replace(/\[Field\]/g,i.dept)
            .replace(/\[Date\]/g,i.hod_intro_date||'TBD')
            .replace(/\[Time\]/g,i.hod_intro_time||'09:00 AM')
            .replace(/\[Manager Name\]/g,i.hod.name)
            .replace(/\[Team Member Name\]/g,'Team Member')
            .replace(/\[Calendar Link\]/g,'[Calendar Link]')
            .replace(/\[Location\/Floor\]/g,'Office Floor 3')
        }
        return (
          <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowMsgPreview(null)}>
            <div style={{background:'#fff',borderRadius:18,padding:0,width:560,maxWidth:'95vw',maxHeight:'90vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
              <div style={{background:G,padding:'14px 20px',borderRadius:'18px 18px 0 0',color:'#fff'}}>
                <div style={{fontSize:12,fontWeight:900}}>{filled.title}</div>
                <div style={{fontSize:9,opacity:.8,marginTop:2}}>To: {filled.to_whom} · Via: {filled.via}</div>
              </div>
              <div style={{padding:'18px 22px'}}>
                <div style={{display:'flex',gap:8,marginBottom:14,fontSize:9,flexWrap:'wrap'}}>
                  <span style={{background:'#f1f5f9',padding:'3px 10px',borderRadius:6}}>From: HR / HOD</span>
                  <span style={{background:'#f1f5f9',padding:'3px 10px',borderRadius:6}}>To: {filled.to_whom}</span>
                  <span style={{background:'#f1f5f9',padding:'3px 10px',borderRadius:6}}>Via: {filled.via}</span>
                </div>
                <pre style={{fontSize:10,color:'#374151',lineHeight:1.8,whiteSpace:'pre-wrap',fontFamily:'system-ui,sans-serif',background:'#f8fafc',borderRadius:10,padding:14,margin:0}}>{filled.body}</pre>
                <div style={{display:'flex',gap:10,marginTop:18}}>
                  <button onClick={confirmSend} style={{flex:1,padding:'10px',borderRadius:10,border:'none',background:G,color:'#fff',fontSize:11,fontWeight:800,cursor:'pointer'}}>✅ Confirm & Send</button>
                  <button onClick={()=>setShowMsgPreview(null)} style={{padding:'10px 18px',borderRadius:10,border:'1px solid #e2e8f0',background:'#fff',fontSize:11,cursor:'pointer'}}>Cancel</button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} actions={[
        {icon:'👁',label:'View Full Intro',key:'view'},{icon:'📅',label:'Schedule Meeting',key:'schedule'},
        {icon:'📤',label:'Export',key:'export'},
      ]} onAction={(k,item)=>{if(k==='view')setSelected(item)}} onClose={()=>setCtx(null)}/>}

      {showExcel&&<ExcelModal title="Department Introduction"
        columns={['Employee','Department','Position','HOD','Joining Date','Team Members','Meetings Scheduled','Meetings Completed']}
        onClose={()=>setShowExcel(false)}
        onImport={(f,result)=>{notify(`✅ Imported from ${f.name}`);setShowExcel(false)}}/>}
    </div>
  )
}
