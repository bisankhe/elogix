// FILE: TeamSetupPage.jsx - Page 4: Team Setup
import { useState, useEffect } from 'react'


function _getSession(){try{return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{}}catch{return{}}}
function _authH(){const s=_getSession();const token=localStorage.getItem('access_token')||s?.token||'';const slug=s?.company?.slug||'';return{'Authorization':`Bearer ${token}`,'X-Tenant-Slug':slug,'Content-Type':'application/json'}}

// Inline theme — replaces missing DeptSetupShared THEMES.team
const T = {
  gradient: 'linear-gradient(135deg,#10b981 0%,#0ea5e9 100%)',
}




const MOCK_TEAMS = [
  { id:'t1', code:'TEAM-FE-WEB', name:'Web Frontend Team', short:'Web FE',
    section:'Frontend Engineering', department:'IT', head:'Ram Bista', deputy:'Prabesh Tamang',
    members:8, max_members:10, status:'active', icon:'🌐', color:'#0ea5e9',
    team_type:'Permanent', work_mode:'Hybrid', sprint_cycle:'2 weeks',
    tools:'Jira, Figma, GitHub', slack_channel:'#team-web-fe',
    cba_eligible:false, safety_committee:false,
    impact_links:[{icon:'📅',module:'Leave',desc:'Team coverage min 3'},{icon:'🎯',module:'Sprints',desc:'2-week sprint tracking'},{icon:'💰',module:'Payroll',desc:'Team grouping'}],
  },
  { id:'t2', code:'TEAM-BE-API', name:'API & Backend Team', short:'Backend',
    section:'Backend Engineering', department:'IT', head:'Anita Karki', deputy:'Dev Poudel',
    members:7, max_members:10, status:'active', icon:'🔧', color:'#8b5cf6',
    team_type:'Permanent', work_mode:'Remote-First', sprint_cycle:'2 weeks',
    tools:'Jira, GitHub, Postman', slack_channel:'#team-backend',
    cba_eligible:false, safety_committee:false,
    impact_links:[{icon:'📅',module:'Leave',desc:'Backend coverage policy'},{icon:'🔐',module:'Server Access',desc:'AWS/DB permissions'}],
  },
  { id:'t3', code:'TEAM-SALES-ENT', name:'Enterprise Sales Team', short:'Ent Sales',
    section:'Enterprise Sales', department:'Sales', head:'Bikram Thapa', deputy:'Sushila Gurung',
    members:10, max_members:12, status:'active', icon:'💼', color:'#f59e0b',
    team_type:'Permanent', work_mode:'Field + Office', sprint_cycle:'Monthly',
    tools:'Salesforce, HubSpot, LinkedIn Sales', slack_channel:'#team-ent-sales',
    cba_eligible:true, safety_committee:false,
    cba_note:'CBA eligible: 10+ employees per Labour Act 2074',
    impact_links:[{icon:'💰',module:'Commission',desc:'Sales incentive payroll'},{icon:'🎯',module:'Targets',desc:'Monthly quota tracking'}],
  },
  { id:'t4', code:'TEAM-HR-HRBP', name:'HR Business Partners', short:'HRBPs',
    section:'HR Operations', department:'Human Resources', head:'Sita Sharma', deputy:'Priya Rai',
    members:5, max_members:8, status:'active', icon:'🤝', color:'#10b981',
    team_type:'Permanent', work_mode:'Office', sprint_cycle:'Monthly',
    tools:'eLogix HRMS, MS Teams', slack_channel:'#team-hrbp',
    cba_eligible:false, safety_committee:false,
    impact_links:[{icon:'📋',module:'HR Policies',desc:'HRBPs enforce all policies'},{icon:'🎯',module:'Grievance',desc:'First point of contact'}],
  },
  { id:'t5', code:'TEAM-OPS-FAC', name:'Facilities & Safety Team', short:'Facilities',
    section:'Operations', department:'Operations', head:'Suresh Karki', deputy:'Admin Officer',
    members:22, max_members:25, status:'active', icon:'🏢', color:'#ef4444',
    team_type:'Permanent', work_mode:'On-Site', sprint_cycle:'Monthly',
    tools:'Asset Tracker, Maintenance Portal', slack_channel:'#team-facilities',
    cba_eligible:true, safety_committee:true,
    cba_note:'CBA eligible (22 emp > 10). Safety Committee mandatory (22 emp > 20) per Labour Act 2074',
    impact_links:[{icon:'🛡️',module:'Safety',desc:'EHS & fire safety'},{icon:'🏢',module:'Assets',desc:'Facility asset mgmt'}],
  },
]

const CONTEXT_ACTIONS = [
  {icon:'👁️',label:'View Team',        key:'view'},
  {icon:'✏️',label:'Edit Team',        key:'edit'},
  {icon:'👥',label:'View Members',     key:'members'},
  {icon:'📅',label:'Leave Schedule',   key:'leave'},
  {icon:'🎯',label:'Sprint Board',     key:'sprint'},
  {icon:'📋',label:'Impact Analysis',  key:'impact'},
  {icon:'📤',label:'Export Excel',     key:'export'},
  {icon:'🗑️',label:'Dissolve Team',   key:'dissolve', danger:true},
]


// ── Inline shared components (replaces missing DeptSetupShared.jsx) ───────────

function PageHeader({ icon, title, breadcrumb, gradient, stats, onAdd, addLabel, onExcel }) {
  const _s2 = _getSession(); const _co = _s2?.company||{}
  return (
    <div style={{background:gradient,borderRadius:16,padding:'18px 22px',marginBottom:16,boxShadow:'0 4px 20px rgba(0,0,0,.1)'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:10}}>
        <div>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
            <span style={{fontSize:22}}>{icon}</span>
            <div style={{fontSize:18,fontWeight:900,color:'#fff'}}>{title}</div>
          </div>
          <div style={{fontSize:10,color:'rgba(255,255,255,.7)',marginBottom:10}}>{breadcrumb} · {_co?.name}</div>
          <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
            {(stats||[]).map((s,i)=>(
              <div key={i} style={{background:'rgba(255,255,255,.15)',borderRadius:10,padding:'5px 12px'}}>
                <span style={{fontSize:11}}>{s.icon}</span>
                <span style={{fontSize:14,fontWeight:800,color:'#fff',marginLeft:5}}>{s.value}</span>
                <span style={{fontSize:9,color:'rgba(255,255,255,.7)',marginLeft:3}}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{display:'flex',gap:8}}>
          {onAdd&&<button onClick={onAdd} style={{padding:'8px 16px',borderRadius:10,border:'1.5px solid rgba(255,255,255,.4)',background:'rgba(255,255,255,.15)',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>+ {addLabel||'Add'}</button>}
          {onExcel&&<button onClick={onExcel} style={{padding:'8px 14px',borderRadius:10,border:'1.5px solid rgba(255,255,255,.3)',background:'rgba(255,255,255,.1)',color:'#fff',fontSize:11,cursor:'pointer'}}>📊 Excel</button>}
        </div>
      </div>
    </div>
  )
}
function Field({ label, value, onChange, type='text', options, required, placeholder='' }) {
  return (
    <div style={{marginBottom:12}}>
      <label style={{display:'block',fontSize:11,fontWeight:700,color:'#374151',marginBottom:4}}>{label}{required&&<span style={{color:'#ef4444'}}> *</span>}</label>
      {type==='select'
        ?<select value={value||''} onChange={e=>onChange(e.target.value)} style={{width:'100%',padding:'8px 12px',borderRadius:8,border:'1.5px solid #e2e8f0',fontSize:12,outline:'none',appearance:'none',background:'#fff',boxSizing:'border-box'}}>
          <option value=''>Select...</option>{(options||[]).map(o=><option key={o} value={o}>{o}</option>)}
        </select>
        :<input type={type} value={value||''} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={{width:'100%',padding:'8px 12px',borderRadius:8,border:'1.5px solid #e2e8f0',fontSize:12,outline:'none',boxSizing:'border-box'}}/>
      }
    </div>
  )
}
function SearchBar({ value, onChange, placeholder }) {
  return <input value={value||''} onChange={e=>onChange(e.target.value)} placeholder={placeholder||'🔍 Search...'} style={{padding:'8px 14px',borderRadius:10,border:'1.5px solid #e2e8f0',fontSize:12,outline:'none',background:'#fff',minWidth:200}}/>
}
function Badge({ label, color='#64748b' }) {
  return <span style={{background:`${color}15`,color,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{label}</span>
}
function LuxCard({ children, onClick, selected, accentColor='#7c3aed' }) {
  return (
    <div onClick={onClick}
      style={{background:'#fff',borderRadius:14,border:`1.5px solid ${selected?accentColor:'#e2e8f0'}`,padding:16,cursor:'pointer',boxShadow:`0 2px 8px rgba(0,0,0,.05)`,transition:'all .15s'}}
      onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-1px)';e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,.1)'}}
      onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,.05)'}}>
      {children}
    </div>
  )
}
function ContextMenu({ ctx, actions, onClose }) {
  if(!ctx) return null
  return (
    <div onClick={e=>e.stopPropagation()} style={{position:'fixed',zIndex:9999,left:ctx.x,top:ctx.y,background:'#fff',borderRadius:12,width:190,boxShadow:'0 20px 60px rgba(0,0,0,.2)',border:'1px solid #e2e8f0',overflow:'hidden'}}>
      {(actions||[]).map((a,i)=>(
        <button key={i} onClick={()=>{a.fn();onClose?.()}}
          style={{width:'100%',padding:'9px 14px',border:'none',background:'transparent',textAlign:'left',fontSize:12,cursor:'pointer',color:a.danger?'#ef4444':'#334155',borderBottom:i<(actions.length-1)?'1px solid #f8fafc':'none'}}
          onMouseEnter={e=>e.currentTarget.style.background=a.danger?'#fef2f2':'#f8fafc'}
          onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
          {a.icon} {a.label}
        </button>
      ))}
    </div>
  )
}
function Drawer({ show, onClose, title, children }) {
  if(!show) return null
  return (
    <>
      <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.4)',zIndex:3999}}/>
      <div style={{position:'fixed',right:0,top:0,bottom:0,width:420,background:'#fff',zIndex:4000,overflowY:'auto',boxShadow:'-20px 0 60px rgba(0,0,0,.15)'}}>
        <div style={{padding:'16px 20px',borderBottom:'1px solid #f1f5f9',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{fontSize:14,fontWeight:700,color:'#0f172a'}}>{title}</div>
          <button onClick={onClose} style={{background:'none',border:'none',fontSize:20,cursor:'pointer',color:'#94a3b8'}}>×</button>
        </div>
        <div style={{padding:'20px'}}>{children}</div>
      </div>
    </>
  )
}
function ExcelModal({ show, onClose }) {
  if(!show) return null
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={onClose}>
      <div style={{background:'#fff',borderRadius:14,padding:24,maxWidth:400,width:'90%'}} onClick={e=>e.stopPropagation()}>
        <div style={{fontSize:14,fontWeight:700,marginBottom:12}}>📊 Excel Import / Export</div>
        <p style={{fontSize:12,color:'#64748b',marginBottom:16}}>Upload an Excel file to bulk-import data, or export the current list to Excel.</p>
        <button onClick={onClose} style={{padding:'8px 20px',borderRadius:8,border:'none',background:'#64748b',color:'#fff',cursor:'pointer',fontSize:12}}>Close</button>
      </div>
    </div>
  )
}
function AIImpact({ links }) { return null }
// ─────────────────────────────────────────────────────────────────────────────


export default function TeamSetupPage() {

  // Load real tenant data
  const _s = _getSession()
  const _company = _s?.company || {}

  useEffect(() => {
    const token = localStorage.getItem('access_token') || _s?.token || ''
    const slug  = _s?.company?.slug || ''
    if (!token || !slug) return
    fetch('/api/v1/teams', { headers: _authH() })
      .then(r => { if(r.status===401){window.dispatchEvent(new CustomEvent('elogix:session-expired'));return null}; return r.ok ? r.json() : null })
      .then(d => d && setTeams(d.data?.teams || d.teams || d.data || []))
      .catch(() => {})
  }, [])
  const [teams,     setTeams]     = useState([])
  const [search,    setSearch]    = useState('')
  const [ctx,       setCtx]       = useState(null)
  const [showAdd,   setShowAdd]   = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [selected,  setSelected]  = useState(null)

  const filtered = teams.filter(t =>
    !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.code.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader
        icon="🤝" title="Team Setup"
        breadcrumb="Organization Management > Department & Team Setup"
        gradient={T.gradient}
        stats={[
          {icon:'🤝',label:'Teams',     value:teams.length},
          {icon:'👥',label:'Members',   value:teams.reduce((s,t)=>s+t.members,0)},
          {icon:'⚠️',label:'CBA Teams', value:teams.filter(t=>t.cba_eligible).length},
          {icon:'🛡️',label:'Safety Comm',value:teams.filter(t=>t.safety_committee).length},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="New Team"
        onExcel={()=>setShowExcel(true)}
      />

      <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10,marginBottom:16}}>
        <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:10,padding:'10px 14px',fontSize:11,color:'#991b1b'}}>
          <strong>Nepal Labour Act 2074 Alert:</strong> Teams with 10+ employees require a Collective Bargaining Committee (CBA). Teams with 20+ employees require a Safety &amp; Health Committee.
        </div>
        <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 14px',fontSize:11,color:'#166534'}}>
          <strong>Right-click Tip:</strong> Right-click any team card for SAP-style impact analysis showing all modules this team affects.
        </div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search teams..." />

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:14}}>
        {filtered.map(team => {
          const fillPct = Math.round(team.members / team.max_members * 100)
          return (
            <LuxCard key={team.id} color={team.color}
              onClick={()=>setSelected(team)}
              onContextMenu={e=>{e.preventDefault();setCtx({x:e.clientX,y:e.clientY,item:team})}}>
              <div style={{padding:'16px 16px 12px',display:'flex',gap:12,alignItems:'flex-start'}}>
                <div style={{width:46,height:46,borderRadius:12,background:`${team.color}18`,
                  display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>
                  {team.icon}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:2}}>
                    <span style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{team.name}</span>
                    <Badge status={team.status}/>
                  </div>
                  <div style={{fontSize:10,color:'#94a3b8'}}>{team.code} &bull; {team.section}</div>
                  <div style={{fontSize:11,color:'#64748b',marginTop:3}}>
                    Lead: <strong style={{color:'#334155'}}>{team.head}</strong>
                  </div>
                </div>
              </div>
              {/* Nepal Law flags */}
              {(team.cba_eligible || team.safety_committee) && (
                <div style={{margin:'0 16px 10px',padding:'8px 10px',
                  background:'#fef2f2',borderRadius:8,border:'1px solid #fecaca',fontSize:10,color:'#991b1b'}}>
                  ⚖️ {team.cba_note}
                </div>
              )}
              {/* Capacity bar */}
              <div style={{padding:'0 16px 12px'}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:10,marginBottom:4,color:'#64748b'}}>
                  <span>Team Capacity</span>
                  <span style={{fontWeight:700,color:fillPct>90?'#ef4444':fillPct>75?'#f59e0b':'#10b981'}}>
                    {team.members}/{team.max_members} ({fillPct}%)
                  </span>
                </div>
                <div style={{height:6,background:'#f1f5f9',borderRadius:6,overflow:'hidden'}}>
                  <div style={{width:`${fillPct}%`,height:'100%',borderRadius:6,
                    background:fillPct>90?'#ef4444':fillPct>75?'#f59e0b':'#10b981',transition:'width .5s'}}/>
                </div>
              </div>
              <div style={{borderTop:'1px solid #f1f5f9',padding:'8px 16px',display:'flex',
                justifyContent:'space-between',fontSize:10,color:'#94a3b8'}}>
                <span>{team.work_mode}</span>
                <span>{team.sprint_cycle} cycle</span>
              </div>
            </LuxCard>
          )
        })}
        <div onClick={()=>setShowAdd(true)}
          style={{border:'2px dashed #a7f3d0',borderRadius:16,minHeight:180,display:'flex',
            flexDirection:'column',alignItems:'center',justifyContent:'center',
            cursor:'pointer',color:'#94a3b8',gap:8,transition:'all .2s'}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor='#10b981';e.currentTarget.style.color='#10b981'}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor='#a7f3d0';e.currentTarget.style.color='#94a3b8'}}>
          <span style={{fontSize:32}}>+</span>
          <span style={{fontSize:12,fontWeight:700}}>Create New Team</span>
        </div>
      </div>

      {ctx && (
        <ContextMenu x={ctx.x} y={ctx.y} item={ctx.item}
          impactLinks={ctx.item?.impact_links?.map(l=>l.module)}
          actions={CONTEXT_ACTIONS}
          onAction={(k,item)=>{if(k==='view') setSelected(item)}}
          onClose={()=>setCtx(null)} />
      )}
      {showExcel && <ExcelModal title="Team Setup"
        columns={['Team Code','Name','Section','Department','Team Head','Work Mode','Sprint Cycle','Max Members']}
        onClose={()=>setShowExcel(false)} onImport={f=>alert('Processing: '+f.name)} />}
      {showAdd && <AddTeamModal T={T} onClose={()=>setShowAdd(false)}
        onSave={t=>setTeams(p=>[...p,{...t,id:'t'+Date.now(),status:'active',icon:'🤝',color:'#10b981',members:0,cba_eligible:false,safety_committee:false,impact_links:[]}])} />}
      <Drawer item={selected} gradient={T.gradient} onClose={()=>setSelected(null)}
        rows={[
          ['Code',       selected?.code],
          ['Section',    selected?.section],
          ['Department', selected?.department],
          ['Team Lead',  selected?.head],
          ['Deputy',     selected?.deputy],
          ['Members',    selected?.members+' / '+(selected?.max_members)+' max'],
          ['Work Mode',  selected?.work_mode],
          ['Sprint',     selected?.sprint_cycle],
          ['Slack',      selected?.slack_channel],
          ['Tools',      selected?.tools],
        ]}/>
    </div>
  )
}

function AddTeamModal({ T, onClose, onSave }) {
  const [f,setF] = useState({code:'',name:'',short:'',section:'',department:'',head:'',deputy:'',max_members:'',team_type:'Permanent',work_mode:'Office',sprint_cycle:'Monthly',tools:'',slack_channel:''})
  const s = k => v => setF(p=>({...p,[k]:v}))
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={onClose}>
      <div style={{background:'#fff',borderRadius:20,width:660,maxHeight:'90vh',overflow:'auto',boxShadow:'0 40px 80px rgba(0,0,0,.3)'}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:'20px 28px',background:T.gradient,position:'sticky',top:0,zIndex:10}}>
          <div style={{fontSize:20,fontWeight:900,color:'#fff'}}>+ Create New Team</div>
        </div>
        <div style={{padding:'24px 28px'}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
            <Field label="Team Code" value={f.code} onChange={s('code')} required accent={T.accent}/>
            <Field label="Team Name" value={f.name} onChange={s('name')} required accent={T.accent}/>
            <Field label="Section / Unit" value={f.section} onChange={s('section')} accent={T.accent}/>
            <Field label="Department" type="select" value={f.department} onChange={s('department')} accent={T.accent}
              options={['Information Technology','Human Resources','Finance & Accounts','Sales','Marketing','Operations','Legal']}/>
            <Field label="Team Lead" value={f.head} onChange={s('head')} accent={T.accent}/>
            <Field label="Deputy Lead" value={f.deputy} onChange={s('deputy')} accent={T.accent}/>
            <Field label="Max Members" type="number" value={f.max_members} onChange={s('max_members')} accent={T.accent}
              hint="CBA required if 10+. Safety Committee if 20+ (Labour Act 2074)"/>
            <Field label="Team Type" type="select" value={f.team_type} onChange={s('team_type')} accent={T.accent}
              options={['Permanent','Project-Based','Virtual','Cross-Functional','Tiger Team']}/>
            <Field label="Work Mode" type="select" value={f.work_mode} onChange={s('work_mode')} accent={T.accent}
              options={['Office','Remote-First','Hybrid','Field + Office','On-Site']}/>
            <Field label="Sprint / Review Cycle" type="select" value={f.sprint_cycle} onChange={s('sprint_cycle')} accent={T.accent}
              options={['Weekly','2 weeks','Monthly','Quarterly']}/>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
            <Field label="Tools Used" value={f.tools} onChange={s('tools')} accent={T.accent} placeholder="Jira, GitHub, Figma..."/>
            <Field label="Slack Channel" value={f.slack_channel} onChange={s('slack_channel')} accent={T.accent} placeholder="#team-name"/>
          </div>
          <AIImpact color={T.accent} lines={[
            'Team creation links to: Leave policy (coverage rules), Sprint tracking, Payroll grouping.',
            'Nepal Labour Act 2074: If max members >= 10, CBA flag auto-set. If >= 20, Safety Committee required.',
            'Team lead will receive delegation for leave approval and performance review.',
          ]}/>
          <div style={{display:'flex',gap:10}}>
            <button onClick={()=>{onSave(f);onClose()}}
              style={{flex:1,padding:'14px',borderRadius:12,border:'none',background:T.gradient,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>
              Create Team
            </button>
            <button onClick={onClose}
              style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
