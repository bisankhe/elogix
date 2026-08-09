// FILE: JoiningChecklistPage.jsx - Joining Checklist (Preboarding)
// Kanban progress dashboard, cross-department task dependencies, auto IT/Facilities provisioning

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, Drawer, SearchBar, Badge, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#0c4a6e 0%,#0284c7 60%,#7dd3fc 100%)'
const A = '#0284c7'

const DEPARTMENTS_CFG = {
  hr:        {label:'HR',         icon:'👥', color:'#7c3aed'},
  it:        {label:'IT',         icon:'💻', color:'#0284c7'},
  facilities:{label:'Facilities', icon:'🏢', color:'#f59e0b'},
  finance:   {label:'Finance',    icon:'💰', color:'#10b981'},
  manager:   {label:'Manager',    icon:'👔', color:'#ec4899'},
}

const NEW_HIRES = [
  { id:'jc1', name:'Gita Maharjan', position:'Cloud Architect', department:'IT', branch:'KTM HQ',
    join_date:'2025-06-23', manager:'Rajesh Sharma (CTO)', overall_pct:78,
    tasks:[
      {id:'t1',title:'Offer accepted & e-signed',dept:'hr',done:true,due:'2025-06-12',completed_date:'2025-06-12'},
      {id:'t2',title:'Documents collected & verified',dept:'hr',done:true,due:'2025-06-18',completed_date:'2025-06-17'},
      {id:'t3',title:'Employee ID generated',dept:'hr',done:true,due:'2025-06-18',completed_date:'2025-06-17'},
      {id:'t4',title:'SSF registration initiated',dept:'hr',done:true,due:'2025-06-20',completed_date:'2025-06-19'},
      {id:'t5',title:'Laptop & accessories ordered',dept:'it',done:true,due:'2025-06-20',completed_date:'2025-06-18'},
      {id:'t6',title:'Email & system accounts created',dept:'it',done:true,due:'2025-06-21',completed_date:'2025-06-20'},
      {id:'t7',title:'VPN & software licenses provisioned',dept:'it',done:false,due:'2025-06-22',completed_date:null},
      {id:'t8',title:'Desk & seating arranged',dept:'facilities',done:true,due:'2025-06-21',completed_date:'2025-06-19'},
      {id:'t9',title:'Access card / ID card printed',dept:'facilities',done:false,due:'2025-06-22',completed_date:null},
      {id:'t10',title:'Bank account / salary details verified',dept:'finance',done:false,due:'2025-06-22',completed_date:null},
      {id:'t11',title:'Welcome kit prepared',dept:'facilities',done:false,due:'2025-06-22',completed_date:null},
      {id:'t12',title:'Orientation schedule confirmed',dept:'manager',done:false,due:'2025-06-23',completed_date:null},
      {id:'t13',title:'Buddy assigned',dept:'manager',done:true,due:'2025-06-20',completed_date:'2025-06-19'},
    ],
    ai_note:'On track. 2 IT tasks and 1 Finance task pending before join date. Auto-reminder sent to IT.',
    impact_links:['Employee Onboarding','IT Asset Management','Orientation Program'] },
  { id:'jc2', name:'Sunita Rai', position:'Senior Software Developer', department:'IT', branch:'KTM HQ',
    join_date:'2025-06-25', manager:'Bikash Shrestha (IT Lead)', overall_pct:31,
    tasks:[
      {id:'t1',title:'Offer accepted & e-signed',dept:'hr',done:true,due:'2025-06-15',completed_date:'2025-06-14'},
      {id:'t2',title:'Documents collected & verified',dept:'hr',done:false,due:'2025-06-20',completed_date:null},
      {id:'t3',title:'Employee ID generated',dept:'hr',done:false,due:'2025-06-21',completed_date:null},
      {id:'t4',title:'SSF registration initiated',dept:'hr',done:false,due:'2025-06-23',completed_date:null},
      {id:'t5',title:'Laptop & accessories ordered',dept:'it',done:false,due:'2025-06-22',completed_date:null},
      {id:'t6',title:'Email & system accounts created',dept:'it',done:false,due:'2025-06-23',completed_date:null},
      {id:'t7',title:'Desk & seating arranged',dept:'facilities',done:true,due:'2025-06-22',completed_date:'2025-06-16'},
      {id:'t8',title:'Bank account / salary details verified',dept:'finance',done:false,due:'2025-06-24',completed_date:null},
      {id:'t9',title:'Orientation schedule confirmed',dept:'manager',done:false,due:'2025-06-25',completed_date:null},
    ],
    ai_note:'BEHIND SCHEDULE. Document collection overdue. Escalate to HR - risk of delayed start date.',
    impact_links:['Document Collection','IT Asset Management'] },
  { id:'jc3', name:'Maya Pradhan', position:'Finance Manager', department:'Finance', branch:'KTM HQ',
    join_date:'2025-06-20', manager:'Sanjay Karki (CFO)', overall_pct:100,
    tasks:[
      {id:'t1',title:'Offer accepted & e-signed',dept:'hr',done:true,due:'2025-06-10',completed_date:'2025-06-09'},
      {id:'t2',title:'Documents collected & verified',dept:'hr',done:true,due:'2025-06-14',completed_date:'2025-06-13'},
      {id:'t3',title:'Employee ID generated',dept:'hr',done:true,due:'2025-06-14',completed_date:'2025-06-13'},
      {id:'t4',title:'Laptop & accessories ordered',dept:'it',done:true,due:'2025-06-16',completed_date:'2025-06-15'},
      {id:'t5',title:'Desk & seating arranged',dept:'facilities',done:true,due:'2025-06-17',completed_date:'2025-06-16'},
      {id:'t6',title:'Bank account verified',dept:'finance',done:true,due:'2025-06-18',completed_date:'2025-06-17'},
      {id:'t7',title:'Orientation schedule confirmed',dept:'manager',done:true,due:'2025-06-19',completed_date:'2025-06-18'},
    ],
    ai_note:'100% complete. Ready for smooth Day 1. Excellent cross-department coordination.',
    impact_links:['Orientation Program'] },
]

const CTX = [
  {icon:'👁',label:'View Full Checklist',  key:'view'},
  {icon:'✅',label:'Mark Task Complete',    key:'complete'},
  {icon:'🔔',label:'Send Reminder',         key:'remind'},
  {icon:'📋',label:'View IT Provisioning',  key:'it'},
  {icon:'🔗',label:'Impact Analysis',       key:'impact'},
  {icon:'📤',label:'Export',                key:'export'},
]

export default function JoiningChecklistPage() {
  const [hires, setHires]         = useState(NEW_HIRES)
  const [search, setSearch]       = useState('')
  const [selected, setSelected]   = useState(null)
  const [showExcel, setShowExcel] = useState(false)
  const [msg, setMsg] = useState('')
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(''),3000) }
  const [ctx, setCtx]             = useState(null)

  const filtered = hires.filter(h=>!search||h.name.toLowerCase().includes(search.toLowerCase()))

  const onTrack = hires.filter(h=>h.overall_pct>=70).length
  const atRisk  = hires.filter(h=>h.overall_pct<50).length
  const avgPct  = Math.round(hires.reduce((s,h)=>s+h.overall_pct,0)/hires.length)

  const toggleTask = (hireId, taskId) => {
    setHires(prev=>prev.map(h=>{
      if (h.id!==hireId) return h
      const newTasks = h.tasks.map(t=>t.id===taskId?{...t,done:!t.done,completed_date:!t.done?new Date().toISOString().split('T')[0]:null}:t)
      const pct = Math.round(newTasks.filter(t=>t.done).length/newTasks.length*100)
      return {...h, tasks:newTasks, overall_pct:pct}
    }))
  }

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📋" title="Joining Checklist"
        breadcrumb="Employee Lifecycle > Onboarding > Preboarding"
        gradient={G}
        stats={[
          {icon:'📋',label:'New Hires',    value:hires.length},
          {icon:'✅',label:'On Track',      value:onTrack},
          {icon:'⚠',label:'At Risk',       value:atRisk},
          {icon:'📊',label:'Avg Progress', value:avgPct+'%'},
        ]}
        onAdd={()=>notify('📋 New joining checklist created and assigned')} addLabel="+ New Checklist" onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#1e40af',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>🤖</span>
        <div><strong>Cross-Department Auto-Provisioning:</strong> Task completion triggers downstream workflows - IT account creation, Facilities desk setup, Finance bank verification. AI flags at-risk hires below 50% with &lt;5 days to join date.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search new hires..."/>

      <div style={{display:'grid',gap:16,marginTop:14}}>
        {filtered.map(h=>{
          const color = h.overall_pct>=70?'#10b981':h.overall_pct>=50?'#f59e0b':'#ef4444'
          const daysToJoin = Math.ceil((new Date(h.join_date)-new Date('2025-06-17'))/(1000*60*60*24))
          const byDept = Object.keys(DEPARTMENTS_CFG).map(d=>({
            dept:d, tasks:h.tasks.filter(t=>t.dept===d)
          })).filter(g=>g.tasks.length>0)

          return (
            <div key={h.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:h.name,...h}})}}
              style={{background:'#fff',border:`1.5px solid ${color}33`,borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${color}`}}>

              <div style={{display:'flex',alignItems:'center',gap:14,padding:'16px 20px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap'}}>
                <div style={{width:48,height:48,borderRadius:'50%',background:`${color}18`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:900,color,flexShrink:0}}>
                  {h.name.split(' ').map(n=>n[0]).join('')}
                </div>
                <div style={{flex:1}}>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:3}}>
                    <span style={{fontSize:14,fontWeight:900,color:'#0f172a'}}>{h.name}</span>
                    <span style={{background:`${color}15`,color,fontSize:10,fontWeight:700,padding:'2px 10px',borderRadius:20}}>
                      {h.overall_pct>=70?'On Track':h.overall_pct>=50?'Watch':'At Risk'}
                    </span>
                  </div>
                  <div style={{fontSize:11,color:'#64748b'}}>{h.position} . {h.department} . Manager: {h.manager}</div>
                  <div style={{fontSize:10,color:daysToJoin<=3?'#ef4444':'#94a3b8',marginTop:2,fontWeight:daysToJoin<=3?700:400}}>
                    📅 Joins {h.join_date} ({daysToJoin} {daysToJoin===1?'day':'days'} away)
                  </div>
                </div>
                <div style={{textAlign:'center',flexShrink:0}}>
                  <div style={{position:'relative',width:60,height:60}}>
                    <svg width="60" height="60" style={{transform:'rotate(-90deg)'}}>
                      <circle cx="30" cy="30" r="26" fill="none" stroke="#f1f5f9" strokeWidth="6"/>
                      <circle cx="30" cy="30" r="26" fill="none" stroke={color} strokeWidth="6"
                        strokeDasharray={`${2*Math.PI*26}`}
                        strokeDashoffset={`${2*Math.PI*26*(1-h.overall_pct/100)}`}
                        strokeLinecap="round"/>
                    </svg>
                    <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:900,color}}>{h.overall_pct}%</div>
                  </div>
                </div>
              </div>

              {/* Department task groups */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:0}}>
                {byDept.map(({dept,tasks})=>{
                  const dc = DEPARTMENTS_CFG[dept]
                  const doneCount = tasks.filter(t=>t.done).length
                  return (
                    <div key={dept} style={{padding:'12px 16px',borderRight:'1px solid #f8fafc',borderBottom:'1px solid #f8fafc'}}>
                      <div style={{display:'flex',gap:6,alignItems:'center',marginBottom:8}}>
                        <span style={{fontSize:14}}>{dc.icon}</span>
                        <span style={{fontSize:11,fontWeight:800,color:dc.color}}>{dc.label}</span>
                        <span style={{fontSize:9,color:'#94a3b8',marginLeft:'auto'}}>{doneCount}/{tasks.length}</span>
                      </div>
                      {tasks.map(t=>(
                        <div key={t.id} onClick={()=>toggleTask(h.id,t.id)}
                          style={{display:'flex',gap:7,alignItems:'flex-start',padding:'4px 0',cursor:'pointer'}}>
                          <div style={{width:15,height:15,borderRadius:4,border:`2px solid ${t.done?'#10b981':'#d1d5db'}`,background:t.done?'#10b981':'#fff',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:9,color:'#fff',fontWeight:700,marginTop:1}}>{t.done?'✓':''}</div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:10,color:t.done?'#94a3b8':'#374151',textDecoration:t.done?'line-through':'none',lineHeight:1.3}}>{t.title}</div>
                            <div style={{fontSize:8,color:t.done?'#10b981':'#f59e0b'}}>{t.done?`✓ ${t.completed_date}`:`Due: ${t.due}`}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>

              <div style={{padding:'8px 20px',background:'#f8fafc',fontSize:10,color:'#64748b',fontStyle:'italic',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span>🤖 {h.ai_note}</span>
                <button onClick={()=>setSelected(h)} style={{padding:'6px 14px',borderRadius:8,border:`1px solid ${A}33`,background:'#eff6ff',color:A,fontSize:11,fontWeight:600,cursor:'pointer',flexShrink:0}}>Full View</button>
              </div>
            </div>
          )
        })}
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={CTX} onAction={(k,item)=>{if(k==='view')setSelected(item)}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Joining Checklist" columns={['Name','Position','Department','Join Date','Manager','Overall %','Pending Tasks']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[NepHR Import]", f.name, result); }}/>}
      <Drawer item={selected} gradient={G} onClose={()=>setSelected(null)} rows={[
        ['Name',selected?.name],['Position',selected?.position],['Department',selected?.department],
        ['Join Date',selected?.join_date],['Manager',selected?.manager],
        ['Overall Progress',selected?.overall_pct+'%'],
        ['Total Tasks',selected?.tasks?.length],
        ['Completed',selected?.tasks?.filter(t=>t.done).length],
        ['Pending',selected?.tasks?.filter(t=>!t.done).length],
        ['AI Note',selected?.ai_note],
      ]}/>
    </div>
  )
}
