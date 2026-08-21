// FILE: OrientationProgramPage.jsx - Orientation Program (Employee Joining)
// LMS-style first-week schedule, timezone-aware for remote hires, compliance + culture modules
// Nepal LA2074 Section 68 (safety training mandatory) + Section 108 (bylaws/conduct)

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, LuxCard, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#1e1b4b 0%,#4338ca 60%,#818cf8 100%)'
const A = '#4338ca'

const MODULE_TYPE_CFG = {
  compliance:{c:'#ef4444',icon:'⚖',label:'Compliance'},
  culture:   {c:'#8b5cf6',icon:'🎉',label:'Culture'},
  technical: {c:'#3b82f6',icon:'💻',label:'Technical'},
  oneOnOne:  {c:'#10b981',icon:'👥',label:'1:1 Meeting'},
  safety:    {c:'#f59e0b',icon:'🦺',label:'Safety (LA2074 S.68)'},

const PROGRAMS = [
  { id:'op1', employee:'Gita Maharjan', position:'Cloud Architect', timezone:'Asia/Kathmandu (GMT+5:45)',
    week:'Week 1', overall_pct:20,
    schedule:[
      {day:'Mon 23 Jun',time:'09:00',title:'Welcome & Company Bylaws (LA2074 S.108)',type:'compliance',duration:60,status:'pending'},
      {day:'Mon 23 Jun',time:'10:30',title:'IT Systems Walkthrough',type:'technical',duration:90,status:'pending'},
      {day:'Mon 23 Jun',time:'14:00',title:'1:1 with CTO Rajesh Sharma',type:'oneOnOne',duration:45,status:'pending'},
      {day:'Tue 24 Jun',time:'09:00',title:'Workplace Safety & PPE Briefing (LA2074 S.68)',type:'safety',duration:60,status:'pending'},
      {day:'Tue 24 Jun',time:'11:00',title:'Company Culture Workshop',type:'culture',duration:120,status:'completed'},
      {day:'Wed 25 Jun',time:'10:00',title:'Cloud Architecture Deep-Dive',type:'technical',duration:180,status:'pending'},
      {day:'Thu 26 Jun',time:'09:00',title:'Data Privacy & Security Training',type:'compliance',duration:60,status:'pending'},
      {day:'Fri 27 Jun',time:'15:00',title:'Week 1 Retro with Manager',type:'oneOnOne',duration:30,status:'pending'},
    ],
    impact_links:['Department Introduction','Buddy Assignment'] },
  { id:'op2', employee:'Sunita Rai', position:'Senior Software Developer', timezone:'Asia/Kathmandu (GMT+5:45)',
    week:'Week 1', overall_pct:0,
    schedule:[
      {day:'Mon 25 Jun',time:'09:00',title:'Welcome & Company Bylaws (LA2074 S.108)',type:'compliance',duration:60,status:'pending'},
      {day:'Mon 25 Jun',time:'10:30',title:'IT Systems Walkthrough',type:'technical',duration:90,status:'pending'},
      {day:'Tue 26 Jun',time:'09:00',title:'Workplace Safety Briefing (LA2074 S.68)',type:'safety',duration:60,status:'pending'},
      {day:'Wed 27 Jun',time:'10:00',title:'Codebase Architecture Walkthrough',type:'technical',duration:150,status:'pending'},
    ],
    impact_links:[] },
]

export default function OrientationProgramPage() {
  const [programs, setPrograms] = useState(PROGRAMS)
  const [search, setSearch] = useState('')
  const [activeProgram, setActiveProgram] = useState(programs[0])
  const [showExcel, setShowExcel] = useState(false)
  const [msg, setMsg] = useState('')
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(''),3000) }
  const [ctx, setCtx] = useState(null)

  const filtered = programs.filter(p=>!search||p.employee.toLowerCase().includes(search.toLowerCase()))
  const totalModules = programs.reduce((s,p)=>s+p.schedule.length,0)
  const completedModules = programs.reduce((s,p)=>s+p.schedule.filter(m=>m.status==='completed').length,0)

  const toggleModule = (programId, idx) => {
    setPrograms(prev=>prev.map(p=>{
      if (p.id!==programId) return p
      const schedule = p.schedule.map((m,i)=>i===idx?{...m,status:m.status==='completed'?'pending':'completed'}:m)
      const pct = Math.round(schedule.filter(m=>m.status==='completed').length/schedule.length*100)
      return {...p, schedule, overall_pct:pct}
    }))
    if (activeProgram?.id===programId) {
      setActiveProgram(prev=>{
        return {...prev, schedule, overall_pct:Math.round(schedule.filter(m=>m.status==='completed').length/schedule.length*100)}
      })

  const groupedByDay = activeProgram?.schedule.reduce((acc,m)=>{(acc[m.day]=acc[m.day]||[]).push(m);return acc},{}) || {}

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🎓" title="Orientation Program"
        breadcrumb="Employee Lifecycle > Onboarding > Employee Joining"
        gradient={G}
        stats={[
          {icon:'🎓',label:'Active Programs', value:programs.length},
          {icon:'📋',label:'Total Modules',    value:totalModules},
          {icon:'✅',label:'Completed',         value:completedModules},
          {icon:'📊',label:'Avg Progress',      value:Math.round(programs.reduce((s,p)=>s+p.overall_pct,0)/programs.length)+'%'},
        ]}
        onAdd={()=>notify('📋 Orientation program created — recorded in Employee Timeline')} addLabel="+ New Program" onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'linear-gradient(135deg,#eef2ff,#f5f3ff)',border:'1px solid #c7d2fe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#3730a3',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>⚖</span>
        <div><strong>Nepal Labour Act 2074:</strong> Section 68 mandates workplace safety training and PPE briefing. Section 108 requires orientation covering company bylaws - working hours, leave entitlements, and workplace conduct.</div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'280px 1fr',gap:16}}>
        {/* Left: program list */}
        <div>
          <SearchBar value={search} onChange={setSearch} placeholder="Search new hires..."/>
          <div style={{display:'grid',gap:8,marginTop:10}}>
            {filtered.map(p=>(
              <div key={p.id} onClick={()=>setActiveProgram(p)}
                onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:p.employee,...p}})}}
                style={{padding:'12px 14px',borderRadius:12,cursor:'pointer',
                  border:`1.5px solid ${activeProgram?.id===p.id?A:'#e2e8f0'}`,
                  background:activeProgram?.id===p.id?`${A}08`:'#fff'}}>
                <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:2}}>{p.employee}</div>
                <div style={{fontSize:9,color:'#94a3b8',marginBottom:6}}>{p.position} . {p.week}</div>
                <div style={{fontSize:8,color:'#94a3b8',marginBottom:6}}>🌍 {p.timezone}</div>
                <div style={{height:5,background:'#f1f5f9',borderRadius:5,overflow:'hidden'}}>
                  <div style={{width:`${p.overall_pct}%`,height:'100%',background:p.overall_pct===100?'#10b981':A,borderRadius:5}}/>
                </div>
                <div style={{fontSize:9,color:A,fontWeight:700,marginTop:3}}>{p.overall_pct}% complete</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: LMS-style calendar */}
        {activeProgram && (
          <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,overflow:'hidden'}}>
            <div style={{background:G,padding:'16px 20px',color:'#fff'}}>
              <div style={{fontSize:14,fontWeight:900}}>{activeProgram.employee}'s First Week</div>
              <div style={{fontSize:10,opacity:.8}}>{activeProgram.position} . {activeProgram.timezone}</div>
            </div>
            <div style={{padding:'16px 20px'}}>
              {Object.entries(groupedByDay).map(([day, modules])=>(
                <div key={day} style={{marginBottom:18}}>
                  <div style={{fontSize:11,fontWeight:800,color:A,marginBottom:8,paddingBottom:4,borderBottom:`2px solid ${A}22`}}>{day}</div>
                  {modules.map((m,i)=>{
                    const globalIdx = activeProgram.schedule.indexOf(m)
                    const mc = MODULE_TYPE_CFG[m.type]
                    return (
                      <div key={i} onClick={()=>toggleModule(activeProgram.id, globalIdx)}
                        style={{display:'flex',gap:12,alignItems:'flex-start',padding:'8px 0',cursor:'pointer'}}>
                        <div style={{width:18,height:18,borderRadius:5,border:`2px solid ${m.status==='completed'?'#10b981':'#d1d5db'}`,background:m.status==='completed'?'#10b981':'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,color:'#fff',fontWeight:700,flexShrink:0,marginTop:2}}>{m.status==='completed'?'✓':''}</div>
                        <div style={{width:50,textAlign:'right',flexShrink:0}}>
                          <div style={{fontSize:10,fontWeight:700,color:'#64748b'}}>{m.time}</div>
                        </div>
                        <div style={{flex:1}}>
                          <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}>
                            <span style={{fontSize:11,fontWeight:600,color:m.status==='completed'?'#94a3b8':'#0f172a',textDecoration:m.status==='completed'?'line-through':'none'}}>{m.title}</span>
                            <span style={{background:`${mc.c}15`,color:mc.c,fontSize:8,fontWeight:700,padding:'1px 7px',borderRadius:20}}>{mc.icon} {mc.label}</span>
                          </div>
                          <div style={{fontSize:9,color:'#94a3b8'}}>{m.duration} minutes</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Schedule',key:'view'},{icon:'📅',label:'Reschedule Module',key:'reschedule'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},{icon:'📤',label:'Export',key:'export'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Orientation Program" columns={['Employee','Day','Time','Module','Type','Duration (min)','Status']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
    </div>
  )
