// FILE: QuickActionsPage.jsx — Quick Actions Hub (Professional, Fully Functional)
import { useState } from 'react'
import { useApp } from '../../../context/AppContext.jsx'

const G = 'linear-gradient(135deg,#1e1b4b 0%,#4338ca 60%,#818cf8 100%)'
const A = '#4338ca'

const SECTIONS = [
  {
    label:'👥 People & Hiring', color:'#0891b2', icon:'👥',
    actions:[
      {icon:'👤',label:'Enroll Employee',       desc:'Add new hire to HRIS',             page:'account-creation',        color:'#0891b2'},
      {icon:'📋',label:'Job Requisition',       desc:'Submit internal hiring request',   page:'manpower-requisition',    color:'#0891b2'},
      {icon:'📤',label:'Bulk CV Submit',         desc:'Submit CVs to departments',        page:'bulk-cv-submit',          color:'#0891b2'},
      {icon:'🌊',label:'Talent Pool',            desc:'Browse passive candidates',        page:'talent-pool',             color:'#0891b2'},
    ]
  },
  {
    label:'⏰ Leave & Attendance', color:'#059669', icon:'⏰',
    actions:[
      {icon:'✅',label:'Approve Leave',          desc:'Review pending requests',          page:'leave-approval',          color:'#059669'},
      {icon:'📅',label:'Regularize Attendance',  desc:'Fix attendance exceptions',        page:'attendance-regularization',color:'#059669'},
      {icon:'📊',label:'Attendance Snapshot',    desc:'Live attendance view',             page:'attendance-snapshot',     color:'#059669'},
      {icon:'🔄',label:'Roster Management',      desc:'Weekly shift scheduling',          page:'roster-details',          color:'#059669'},
    ]
  },
  {
    label:'💰 Payroll & Finance', color:'#7c3aed', icon:'💰',
    actions:[
      {icon:'💰',label:'Run Payroll',            desc:'Process monthly payroll',          page:'automated-payroll',       color:'#7c3aed'},
      {icon:'💳',label:'Advance Salary',         desc:'Employee advance requests',        page:'advance-salary',          color:'#7c3aed'},
      {icon:'📄',label:'Generate Payslip',       desc:'Download & send payslips',         page:'payslip-generation',      color:'#7c3aed'},
      {icon:'🧾',label:'Finance Claims',         desc:'Expense & claims processing',      page:'finance-claims',          color:'#7c3aed'},
    ]
  },
  {
    label:'📊 Performance & Goals', color:'#f59e0b', icon:'📊',
    actions:[
      {icon:'🎯',label:'Set OKRs / Goals',       desc:'Assign quarterly objectives',      page:'okr-management',          color:'#f59e0b'},
      {icon:'⭐',label:'Performance Review',     desc:'Trigger appraisal cycle',          page:'performance-evaluation',  color:'#f59e0b'},
      {icon:'📈',label:'KPI Management',         desc:'Track & update KPIs',              page:'kpi-management',          color:'#f59e0b'},
      {icon:'🔁',label:'360° Feedback',          desc:'Multi-rater feedback cycle',       page:'pms-360',                 color:'#f59e0b'},
    ]
  },
  {
    label:'📣 Communication & Docs', color:'#dc2626', icon:'📣',
    actions:[
      {icon:'📢',label:'Announcement',           desc:'Post company-wide notice',         page:'announcement-board',      color:'#dc2626'},
      {icon:'📝',label:'Generate Letter',        desc:'Experience / offer / warning',     page:'experience-letter',       color:'#dc2626'},
      {icon:'🏛️',label:'Govt. Letter',          desc:'Labour office / SSF letters',      page:'government-letters',      color:'#dc2626'},
      {icon:'🎙',label:'Minutes of Meeting',     desc:'Record & publish MoM',             page:'minutes-of-meeting',      color:'#dc2626'},
    ]
  },
  {
    label:'🤖 AI & Analytics', color:'#8b5cf6', icon:'🤖',
    actions:[
      {icon:'📊',label:'BI Dashboard',           desc:'AI analytics & insights',          page:'ai-business-intelligence',color:'#8b5cf6'},
      {icon:'🔮',label:'Predict Attrition',      desc:'90-day workforce risk',            page:'ai-attrition-prediction', color:'#8b5cf6'},
      {icon:'✍️',label:'AI Letter Writer',       desc:'Generate HR letters via AI',       page:'ai-hr-letters',           color:'#8b5cf6'},
      {icon:'🧠',label:'AI Policy Assistant',    desc:'Ask HR policy questions',          page:'ai-policy-assistant',     color:'#8b5cf6'},
    ]
  },
]

const RECENT = [
  {action:'Approved leave',    who:'Anita Gurung',     time:'5 min ago',   icon:'✅', color:'#059669'},
  {action:'Enrolled new hire', who:'Gita Maharjan',    time:'2 hrs ago',   icon:'👤', color:'#0891b2'},
  {action:'Ran payroll',       who:'June 2081',        time:'Yesterday',   icon:'💰', color:'#7c3aed'},
  {action:'Posted vacancy',    who:'Senior Developer', time:'2 days ago',  icon:'📋', color:'#f59e0b'},
  {action:'Generated letter',  who:'Ram Bhandari',     time:'3 days ago',  icon:'📄', color:'#dc2626'},
]

export default function QuickActionsPage() {
  const { navigate } = useApp()
  const [search, setSearch]   = useState('')
  const [hovSec, setHovSec]   = useState(null)
  const [msg, setMsg]         = useState('')

  const notify = (label) => { setMsg(`⚡ Opening: ${label}...`); setTimeout(()=>setMsg(''),2500) }

  const allActions = SECTIONS.flatMap(s=>s.actions.map(a=>({...a,section:s.label})))
  const searchResults = search ? allActions.filter(a =>
    a.label.toLowerCase().includes(search.toLowerCase()) ||
    a.desc.toLowerCase().includes(search.toLowerCase())
  ) : []

  const handleClick = (a) => {
    notify(a.label)
    if (navigate) navigate(a.page)

  const totalActions = SECTIONS.reduce((s,sec)=>s+sec.actions.length,0)

  return (
    <div style={{fontFamily:'system-ui,sans-serif'}}>
      {/* Header */}
      <div style={{background:G,borderRadius:14,padding:'18px 24px',marginBottom:16,color:'#fff'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
          <div>
            <h2 style={{margin:0,fontSize:22,fontWeight:900}}>⚡ Quick Actions</h2>
            <p style={{margin:'4px 0 0',fontSize:10,opacity:.8}}>{totalActions} actions across {SECTIONS.length} HR modules — one click access</p>
          </div>
          <div style={{display:'flex',gap:12}}>
            {SECTIONS.map(s=>(
              <div key={s.label} style={{textAlign:'center',cursor:'pointer'}} onClick={()=>setHovSec(hovSec===s.label?null:s.label)}>
                <div style={{fontSize:18}}>{s.icon}</div>
                <div style={{fontSize:7,opacity:.7,marginTop:2}}>{s.label.split(' ')[1]}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Live search */}
      <div style={{position:'relative',marginBottom:14}}>
        <div style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',fontSize:14,color:'#94a3b8'}}>🔍</div>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search any action... (payroll, leave, letter, roster...)"
          style={{width:'100%',padding:'12px 16px 12px 42px',borderRadius:12,border:'2px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box',transition:'border .2s'}}
          onFocus={e=>e.target.style.borderColor=A} onBlur={e=>e.target.style.borderColor='#e2e8f0'}/>
        {search && (
          <div style={{position:'absolute',top:'calc(100% + 4px)',left:0,right:0,background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',boxShadow:'0 8px 32px rgba(0,0,0,.12)',zIndex:100,maxHeight:300,overflowY:'auto'}}>
            {searchResults.length===0 ? (
              <div style={{padding:'16px',textAlign:'center',color:'#94a3b8',fontSize:10}}>No actions found for "{search}"</div>
            ) : searchResults.map((a,i)=>(
              <div key={i} onClick={()=>{handleClick(a);setSearch('')}}
                style={{display:'flex',gap:12,padding:'12px 16px',cursor:'pointer',borderBottom:'1px solid #f1f5f9',alignItems:'center',transition:'background .1s'}}
                onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'}
                onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                <div style={{width:36,height:36,borderRadius:9,background:`${a.color}15`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>{a.icon}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:11,fontWeight:700,color:'#0f172a'}}>{a.label}</div>
                  <div style={{fontSize:9,color:'#64748b'}}>{a.desc} · {a.section}</div>
                </div>
                <div style={{fontSize:9,color:a.color,fontWeight:700}}>→ Go</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {msg && <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',display:'flex',gap:8,alignItems:'center'}}><span style={{fontSize:16}}>✅</span>{msg}</div>}

      {/* Action sections */}
      <div style={{display:'grid',gap:14}}>
        {SECTIONS.map(sec=>(
          <div key={sec.label}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8,paddingBottom:6,borderBottom:`2px solid ${sec.color}25`}}>
              <div style={{width:28,height:28,borderRadius:8,background:`${sec.color}18`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>{sec.icon}</div>
              <span style={{fontSize:11,fontWeight:800,color:'#374151'}}>{sec.label}</span>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(210px,1fr))',gap:8}}>
              {sec.actions.map((a,i)=>(
                <button key={i} onClick={()=>handleClick(a)}
                  style={{display:'flex',alignItems:'center',gap:12,padding:'14px 16px',borderRadius:12,border:`1px solid ${a.color}20`,background:`${a.color}06`,cursor:'pointer',textAlign:'left',transition:'all .15s',outline:'none'}}
                  onMouseEnter={e=>{e.currentTarget.style.background=`${a.color}14`;e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow=`0 6px 16px ${a.color}22`}}
                  onMouseLeave={e=>{e.currentTarget.style.background=`${a.color}06`;e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='none'}}>
                  <div style={{width:42,height:42,borderRadius:11,background:`${a.color}18`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>{a.icon}</div>
                  <div style={{minWidth:0,flex:1}}>
                    <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:2}}>{a.label}</div>
                    <div style={{fontSize:8,color:'#94a3b8',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.desc}</div>
                  </div>
                  <div style={{fontSize:14,color:`${a.color}60`,flexShrink:0}}>›</div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Recent activity + Stats */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginTop:14}}>
        <div style={{background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',padding:'16px 18px'}}>
          <div style={{fontSize:11,fontWeight:800,color:'#374151',marginBottom:12}}>🕐 Recent Actions</div>
          <div style={{display:'grid',gap:8}}>
            {RECENT.map((r,i)=>(
              <div key={i} style={{display:'flex',gap:10,alignItems:'center',fontSize:10,padding:'6px 0',borderBottom:i<RECENT.length-1?'1px solid #f8fafc':'none'}}>
                <div style={{width:28,height:28,borderRadius:8,background:`${r.color}15`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,flexShrink:0}}>{r.icon}</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,color:'#0f172a'}}>{r.action}</div>
                  <div style={{fontSize:9,color:'#64748b'}}>{r.who} · {r.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',padding:'16px 18px'}}>
          <div style={{fontSize:11,fontWeight:800,color:'#374151',marginBottom:12}}>📊 Today's HR Stats</div>
          {[
            ['⏳ Pending Leave Approvals','3','#f59e0b'],
            ['👥 Active Onboarding','5','#0891b2'],
            ['📄 Contracts Expiring Soon','2','#ef4444'],
            ['🎂 Birthdays This Week','1','#ec4899'],
            ['📋 Open Positions','8','#7c3aed'],
            ['⚠️ Compliance Deadlines','1','#ef4444'],
          ].map(([label,val,color])=>(
            <div key={label} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',borderBottom:'1px solid #f8fafc',fontSize:10}}>
              <span style={{color:'#475569'}}>{label}</span>
              <span style={{fontWeight:900,color,fontSize:14}}>{val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
