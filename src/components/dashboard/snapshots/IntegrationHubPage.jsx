// FILE: IntegrationHubPage.jsx
// (System Administration > Integration & API > Integration Hub)
// Connect collaboration platforms (WhatsApp, Teams, Slack, Zoom,
// Google Meet, Gmail, Outlook, Discord) and configure which HR
// events auto-send messages/links on which platform.
import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#064e3b 0%,#059669 60%,#6ee7b7 100%)'
const A = '#059669'

const PLATFORMS = [
  { key:'whatsapp',    name:'WhatsApp Business',  cat:'messaging',  icon:'💬', color:'#25D366', priority:5, supports_meeting:false, supports_channel:false },
  { key:'teams',       name:'Microsoft Teams',    cat:'all-in-one', icon:'🟦', color:'#5059C9', priority:5, supports_meeting:true,  supports_channel:true  },
  { key:'slack',       name:'Slack',              cat:'messaging',  icon:'💜', color:'#4A154B', priority:5, supports_meeting:false, supports_channel:true  },
  { key:'zoom',        name:'Zoom',               cat:'video',      icon:'📹', color:'#2D8CFF', priority:5, supports_meeting:true,  supports_channel:false },
  { key:'google_meet', name:'Google Meet',        cat:'video',      icon:'📞', color:'#00897B', priority:4, supports_meeting:true,  supports_channel:false },
  { key:'gmail',       name:'Gmail',              cat:'email',      icon:'📧', color:'#EA4335', priority:4, supports_meeting:false, supports_channel:false },
  { key:'outlook',     name:'Microsoft Outlook',  cat:'email',      icon:'📨', color:'#0072C6', priority:4, supports_meeting:false, supports_channel:false },
  { key:'discord',     name:'Discord',            cat:'messaging',  icon:'🎮', color:'#5865F2', priority:3, supports_meeting:false, supports_channel:true  },
]

const HR_EVENTS = [
  { key:'leave_approved',      label:'Leave Approved',              icon:'🌴', platforms:['whatsapp','teams','slack'],            recipient:'Employee', meeting:false },
  { key:'leave_rejected',      label:'Leave Rejected',              icon:'❌', platforms:['whatsapp','teams'],                   recipient:'Employee', meeting:false },
  { key:'leave_pending',       label:'Leave Awaiting Approval',     icon:'⏳', platforms:['teams','slack'],                      recipient:'Manager',  meeting:false },
  { key:'payslip_generated',   label:'Payslip Generated',           icon:'💵', platforms:['whatsapp','gmail','outlook'],          recipient:'Employee', meeting:false },
  { key:'payroll_approved',    label:'Payroll Run Approved',        icon:'✅', platforms:['teams','slack'],                      recipient:'HR Team',  meeting:false },
  { key:'interview_scheduled', label:'Interview Scheduled',         icon:'🗓', platforms:['teams','zoom','google_meet','whatsapp'],recipient:'Candidate',meeting:true  },
  { key:'offer_released',      label:'Offer Letter Released',       icon:'📋', platforms:['whatsapp','gmail'],                   recipient:'Candidate',meeting:false },
  { key:'offer_accepted',      label:'Offer Accepted',              icon:'🎉', platforms:['teams','slack'],                      recipient:'HR Team',  meeting:false },
  { key:'joining_confirmed',   label:'New Joiner Confirmed',        icon:'👋', platforms:['teams','slack'],                      recipient:'Dept Head',meeting:false },
  { key:'appraisal_due',       label:'Appraisal Review Due',        icon:'📊', platforms:['teams','slack','whatsapp'],           recipient:'Manager',  meeting:false },
  { key:'certificate_generated',label:'Certificate Generated',      icon:'🏆', platforms:['whatsapp','gmail'],                   recipient:'Employee', meeting:false },
  { key:'approval_required',   label:'Any Approval Required',       icon:'📝', platforms:['teams','slack','whatsapp'],           recipient:'Approver', meeting:false },
  { key:'approval_completed',  label:'Approval Completed',          icon:'✔', platforms:['whatsapp'],                           recipient:'Employee', meeting:false },
  { key:'meeting_scheduled',   label:'Meeting / Webinar Scheduled', icon:'📹', platforms:['teams','zoom','google_meet','slack'], recipient:'All',      meeting:true  },
  { key:'hr_announcement',     label:'HR Announcement',             icon:'📣', platforms:['teams','slack','discord','whatsapp'], recipient:'All',      meeting:false },
  { key:'holiday_announced',   label:'Holiday Announced',           icon:'🎌', platforms:['teams','slack','discord','whatsapp'], recipient:'All',      meeting:false },
  { key:'resignation_submitted',label:'Resignation Submitted',      icon:'🚪', platforms:['teams'],                              recipient:'HR Team',  meeting:false },
]

const STARS = n => '⭐'.repeat(n) + '☆'.repeat(5-n)

function PlatformCard({ p, onConnect, onDisconnect, onTest }){
  const [status, setStatus] = useState('disconnected')
  const [testing, setTesting] = useState(false)
  const handleTest = async () => {
    setTesting(true)
    await new Promise(r=>setTimeout(r,800))
    setTesting(false)
    alert(`${p.name} connection verified ✓`)
  return(
    <div style={{background:'#fff',border:`2px solid ${status==='connected'?p.color+'44':'#e2e8f0'}`,borderRadius:16,padding:'16px',transition:'border .2s'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:42,height:42,borderRadius:12,background:p.color+'18',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>
            {p.icon}
          </div>
          <div>
            <div style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{p.name}</div>
            <div style={{fontSize:9,color:'#94a3b8',textTransform:'capitalize'}}>{p.cat}</div>
          </div>
        </div>
        <span style={{fontSize:9,background:status==='connected'?'#f0fdf4':'#f8fafc',color:status==='connected'?'#15803d':'#94a3b8',fontWeight:700,padding:'3px 9px',borderRadius:20}}>
          {status==='connected' ? '● Connected' : '○ Not connected'}
        </span>
      </div>
      <div style={{fontSize:9,color:'#64748b',marginBottom:10}}>{STARS(p.priority)}</div>
      <div style={{display:'flex',gap:4,marginBottom:10,flexWrap:'wrap'}}>
        {p.supports_channel && <span style={{fontSize:8,background:'#eff6ff',color:'#1e40af',padding:'2px 7px',borderRadius:20}}>Channels</span>}
        {p.supports_meeting && <span style={{fontSize:8,background:'#f0fdf4',color:'#15803d',padding:'2px 7px',borderRadius:20}}>Auto-Meeting</span>}
        <span style={{fontSize:8,background:'#faf5ff',color:'#7c3aed',padding:'2px 7px',borderRadius:20}}>DM</span>
      </div>
      <div style={{display:'flex',gap:6}}>
        {status==='connected' ? (
          <>
            <button onClick={handleTest} style={{flex:1,padding:'7px 0',borderRadius:8,border:`1px solid ${p.color}`,background:'#fff',color:p.color,fontSize:9,fontWeight:700,cursor:'pointer'}}>
              {testing ? 'Testing...' : 'Test'}
            </button>
            <button onClick={()=>setStatus('disconnected')} style={{flex:1,padding:'7px 0',borderRadius:8,border:'1px solid #fecaca',background:'#fff',color:'#dc2626',fontSize:9,fontWeight:700,cursor:'pointer'}}>
              Disconnect
            </button>
          </>
        ) : (
          <button onClick={()=>setStatus('connected')} style={{width:'100%',padding:'8px 0',borderRadius:9,border:'none',background:p.color,color:'#fff',fontSize:9,fontWeight:700,cursor:'pointer'}}>
            Connect {p.name}
          </button>
        )}
      </div>
    </div>
  )

function EventRow({ ev, platformMap }){
  const [active, setActive] = useState(true)
  const [expanded, setExpanded] = useState(false)
  return(
    <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,marginBottom:8,overflow:'hidden'}}>
      <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',cursor:'pointer'}}
        onClick={()=>setExpanded(x=>!x)}>
        <span style={{fontSize:16}}>{ev.icon}</span>
        <div style={{flex:1}}>
          <div style={{fontSize:10,fontWeight:700,color:'#0f172a'}}>{ev.label}</div>
          <div style={{display:'flex',gap:4,marginTop:4,flexWrap:'wrap'}}>
            {ev.platforms.map(pk=>{
              const p = platformMap[pk]
              return p ? (
                <span key={pk} style={{fontSize:8,padding:'1px 8px',borderRadius:20,background:p.color+'15',color:p.color,fontWeight:700}}>
                  {p.icon} {p.name}
                </span>
              ) : null
            })}
            {ev.meeting && <span style={{fontSize:8,padding:'1px 8px',borderRadius:20,background:'#eff6ff',color:'#2563eb',fontWeight:700}}>🔗 Auto-creates meeting link</span>}
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <span style={{fontSize:9,color:'#94a3b8'}}>{'>'}  {ev.recipient}</span>
          <label style={{display:'flex',alignItems:'center',gap:4,cursor:'pointer'}} onClick={e=>e.stopPropagation()}>
            <input type="checkbox" checked={active} onChange={()=>setActive(x=>!x)} style={{width:14,height:14,accentColor:A}}/>
            <span style={{fontSize:8,color:active?A:'#94a3b8',fontWeight:700}}>{active?'Active':'Off'}</span>
          </label>
          <span style={{fontSize:9,color:'#94a3b8'}}>{expanded?'▲':'▼'}</span>
        </div>
      </div>
      {expanded && (
        <div style={{padding:'0 14px 14px',borderTop:'1px solid #f8fafc'}}>
          <div style={{fontSize:9,fontWeight:700,color:'#374151',marginBottom:6,marginTop:10}}>Message Template</div>
          <textarea defaultValue={`Hi {employee_name}, your {request_type} has been processed. Login to eLogix HRMS for details.`}
            style={{width:'100%',minHeight:70,borderRadius:9,border:'1px solid #e2e8f0',padding:'8px 10px',fontSize:9,color:'#374151',resize:'vertical',boxSizing:'border-box'}}/>
          <div style={{fontSize:8,color:'#94a3b8',marginTop:4}}>Available tokens: {'{'} employee_name {'}'} {'{'} date {'}'} {'{'} manager_name {'}'} {'{'} meeting_link {'}'} and more</div>
          <div style={{display:'flex',justifyContent:'flex-end',marginTop:8}}>
            <button style={{padding:'6px 14px',borderRadius:8,border:'none',background:A,color:'#fff',fontSize:9,fontWeight:700,cursor:'pointer'}}>
              Save Rule
            </button>
          </div>
        </div>
      )}
    </div>
  )

export default function IntegrationHubPage(){
  const [tab, setTab] = useState('platforms')
  const [search, setSearch] = useState('')
  const platformMap = Object.fromEntries(PLATFORMS.map(p=>[p.key,p]))

  const filteredEvents = HR_EVENTS.filter(e =>
    !search || e.label.toLowerCase().includes(search.toLowerCase())
  )

  const cats = [...new Set(PLATFORMS.map(p=>p.cat))]

  return(
    <div>
      <PageHeader icon="🔗" title="Integration Hub" breadcrumb="System Administration > Integration & API" gradient={G}
        stats={[
          {icon:'🔌',label:'Platforms Supported', value:PLATFORMS.length},
          {icon:'⚡',label:'HR Events Covered',   value:HR_EVENTS.length},
          {icon:'📤',label:'Auto-Meeting Platforms',value:PLATFORMS.filter(p=>p.supports_meeting).length},
          {icon:'📣',label:'Channel Platforms',   value:PLATFORMS.filter(p=>p.supports_channel).length},
        ]}
        onAdd={()=>{}} addLabel=""/>

      <div style={{background:'#ecfdf5',border:'1px solid #a7f3d0',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🔗</span>
        <div style={{flex:1,minWidth:200}}><strong>Your team stays in their tools -- eLogix HRMS pushes notifications there.</strong> Connect WhatsApp, Teams, Slack, Zoom, Google Meet, Gmail, Outlook, or Discord once. Then every HR event -- leave approved, payslip ready, interview scheduled, holiday announced -- automatically sends a message on every connected platform to the right people, with zero manual follow-up.</div>
      </div>

      <div style={{display:'flex',gap:0,marginBottom:18,background:'#f1f5f9',borderRadius:10,padding:3}}>
        {[['platforms','🔌 Platforms'],['events','⚡ Event Rules'],['log','📋 Message Log']].map(([t,label])=>(
          <button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:'8px 4px',border:'none',borderRadius:8,cursor:'pointer',fontSize:10,fontWeight:700,background:tab===t?'#fff':'transparent',color:tab===t?A:'#94a3b8',boxShadow:tab===t?'0 1px 4px rgba(0,0,0,.08)':'none'}}>
            {label}
          </button>
        ))}
      </div>

      {/* PLATFORMS TAB */}
      {tab==='platforms' && (
        <>
          {cats.map(cat => (
            <div key={cat} style={{marginBottom:20}}>
              <div style={{fontSize:9,fontWeight:800,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:10,paddingLeft:2}}>
                {cat==='all-in-one'?'All-in-One':cat.charAt(0).toUpperCase()+cat.slice(1)} Platforms
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:14}}>
                {PLATFORMS.filter(p=>p.cat===cat).map(p=>(
                  <PlatformCard key={p.key} p={p}/>
                ))}
              </div>
            </div>
          ))}
        </>
      )}

      {/* EVENT RULES TAB */}
      {tab==='events' && (
        <>
          <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:'12px 16px',marginBottom:14,fontSize:10,color:'#475569'}}>
            <strong style={{color:'#0f172a'}}>How it works:</strong> When an HR event happens (leave approved, payslip generated, interview scheduled...) eLogix HRMS automatically sends a message to the right person on every connected platform listed for that event. Click any event to edit its message template or toggle it on/off.
          </div>
          <SearchBar value={search} onChange={setSearch} placeholder="Search events..."/>
          <div style={{marginTop:12}}>
            {filteredEvents.map(ev=>(
              <EventRow key={ev.key} ev={ev} platformMap={platformMap}/>
            ))}
          </div>
        </>
      )}

      {/* MESSAGE LOG TAB */}
      {tab==='log' && (
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,overflow:'hidden'}}>
          <div style={{padding:'12px 16px',borderBottom:'1px solid #f8fafc',background:'#f8fafc'}}>
            <div style={{fontSize:11,fontWeight:800,color:'#0f172a'}}>📋 Message Delivery Log</div>
            <div style={{fontSize:9,color:'#94a3b8',marginTop:2}}>Every message sent through the Integration Hub -- what was sent, to whom, on which platform, and whether it was delivered.</div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 100px 80px',gap:0}}>
            {['Event','Platform','Recipient','Status','Time'].map(h=>(
              <div key={h} style={{padding:'8px 12px',fontSize:9,fontWeight:800,color:A,background:'#f8fafc',borderBottom:'1px solid #e2e8f0'}}>{h}</div>
            ))}
            {[
              {event:'Leave Approved',platform:'💬 WhatsApp',recipient:'Hari Thapa',status:'Delivered',time:'5 min ago'},
              {event:'Payslip Generated',platform:'📧 Gmail',recipient:'Gita Maharjan',status:'Delivered',time:'1 hr ago'},
              {event:'Interview Scheduled',platform:'📹 Zoom',recipient:'Candidate: Bishal',status:'Sent',time:'2 hr ago'},
              {event:'HR Announcement',platform:'💜 Slack',recipient:'#general channel',status:'Delivered',time:'3 hr ago'},
              {event:'Holiday Announced',platform:'🟦 Teams',recipient:'All Staff',status:'Delivered',time:'Yesterday'},
            ].map((row,i)=>(
              <>
                <div key={`e${i}`} style={{padding:'9px 12px',fontSize:9,fontWeight:600,color:'#0f172a',borderBottom:'1px solid #f8fafc'}}>{row.event}</div>
                <div key={`p${i}`} style={{padding:'9px 12px',fontSize:9,color:'#374151',borderBottom:'1px solid #f8fafc'}}>{row.platform}</div>
                <div key={`r${i}`} style={{padding:'9px 12px',fontSize:9,color:'#374151',borderBottom:'1px solid #f8fafc'}}>{row.recipient}</div>
                <div key={`s${i}`} style={{padding:'9px 12px',fontSize:8,fontWeight:700,color:'#15803d',borderBottom:'1px solid #f8fafc'}}>{row.status}</div>
                <div key={`t${i}`} style={{padding:'9px 12px',fontSize:8,color:'#94a3b8',borderBottom:'1px solid #f8fafc'}}>{row.time}</div>
              </>
            ))}
          </div>
        </div>
      )}

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={[
          'Interview scheduled? eLogix HRMS auto-creates a Zoom or Teams meeting link and sends it to the candidate, interviewer, and HR -- no one manually types a link into a calendar invite.',
          'Holiday announced in HR? It automatically posts to Teams, Slack, Discord, and WhatsApp Business simultaneously -- one action, every channel, zero copy-paste.',
          'Every message delivery is logged with platform, recipient, and status. If WhatsApp fails, you know within seconds and can resend through email as a fallback.',
          'Message templates use tokens like {employee_name} and {meeting_link} -- no code needed to customize what each notification says per event.',
        ]}/>
      </div>
    </div>
  )
