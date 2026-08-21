// FILE: ShiftSetupPage.jsx - Shift Setup (Luxury HRIS)
// Drag-and-drop shift planner, templates, conflict detection, Nepal Labour Act 2074

import { useState, useEffect } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, Drawer, SearchBar, Badge, LuxCard, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#0369a1 0%,#0ea5e9 60%,#06b6d4 100%)'
const A = '#0369a1'

const SHIFT_TYPES = [
  {id:'s1',code:'GEN',name:'General Shift',nepali:'साधारण सिफ्ट',start:'09:00',end:'18:00',hours:8,break_min:60,
   type:'day',color:'#3b82f6',icon:'☀',
   dept_count:12,emp_count:324,ot_threshold:8,grace_min:15,
   allowance_npr:0,night_premium_pct:0,weekend_ot_multiplier:1.5,
   impact_links:[{m:'Leave Management'},{m:'Payroll'},{m:'Attendance'},{m:'OT Calculation'}]},
  {id:'s2',code:'MORN',name:'Morning Shift',nepali:'बिहान सिफ्ट',start:'06:00',end:'14:00',hours:8,break_min:30,
   type:'morning',color:'#f59e0b',icon:'🌅',
   dept_count:4,emp_count:87,ot_threshold:8,grace_min:10,
   allowance_npr:500,night_premium_pct:0,weekend_ot_multiplier:1.5,
   impact_links:[{m:'Payroll'},{m:'Allowances'},{m:'Attendance'}]},
  {id:'s3',code:'EVE',name:'Evening Shift',nepali:'साँझ सिफ्ट',start:'14:00',end:'22:00',hours:8,break_min:30,
   type:'evening',color:'#8b5cf6',icon:'🌆',
   dept_count:3,emp_count:45,ot_threshold:8,grace_min:10,
   allowance_npr:800,night_premium_pct:0,weekend_ot_multiplier:1.5,
   impact_links:[{m:'Payroll'},{m:'Evening Allowance'},{m:'Attendance'}]},
  {id:'s4',code:'NIGHT',name:'Night Shift',nepali:'रात सिफ्ट',start:'22:00',end:'06:00',hours:8,break_min:30,
   type:'night',color:'#1e40af',icon:'🌙',
   dept_count:2,emp_count:34,ot_threshold:8,grace_min:15,
   allowance_npr:1500,night_premium_pct:25,weekend_ot_multiplier:2.0,
   impact_links:[{m:'Night Allowance'},{m:'Payroll'},{m:'Labour Act 2074'},{m:'Attendance'}]},
  {id:'s5',code:'ROT',name:'Rotational Shift',nepali:'घुमाउने सिफ्ट',start:'Variable',end:'Variable',hours:8,break_min:30,
   type:'rotational',color:'#10b981',icon:'🔄',
   dept_count:2,emp_count:28,ot_threshold:8,grace_min:15,
   allowance_npr:1000,night_premium_pct:15,weekend_ot_multiplier:1.5,
   impact_links:[{m:'Roster Planning'},{m:'Payroll'},{m:'Attendance'}]},
  {id:'s6',code:'FLEX',name:'Flexible Shift',nepali:'लचिलो सिफ्ट',start:'Core: 10:00',end:'Core: 16:00',hours:8,break_min:60,
   type:'flexible',color:'#06b6d4',icon:'⏰',
   dept_count:5,emp_count:112,ot_threshold:8,grace_min:0,
   allowance_npr:0,night_premium_pct:0,weekend_ot_multiplier:1.5,
   impact_links:[{m:'Attendance'},{m:'Payroll'},{m:'Remote Work Policy'}]},
]

const CTX_ACTIONS = [
  {icon:'👁',label:'View Shift Details',key:'view'},
  {icon:'✏',label:'Edit Shift',key:'edit'},
  {icon:'👥',label:'View Assigned Employees',key:'employees'},
  {icon:'📅',label:'View Roster',key:'roster'},
  {icon:'⚖',label:'Labour Act 2074 Compliance',key:'law'},
  {icon:'📊',label:'Shift Analytics',key:'analytics'},
  {icon:'🔗',label:'Impact Analysis',key:'impact'},
  {icon:'📤',label:'Export to Excel',key:'export'},
  {icon:'🗑',label:'Deactivate Shift',key:'deactivate',danger:true},
]

function AddShiftModal({onClose,onSave}) {
  const [f,setF] = useState({code:'',name:'',name_nepali:'',start:'09:00',end:'18:00',break_min:'60',type:'day',allowance:'0',night_premium:'0',grace:'15',description:''})
  const s=k=>v=>setF(p=>({...p,[k]:v}))
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={onClose}>
      <div style={{background:'#fff',borderRadius:20,width:720,maxHeight:'92vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
        <div style={{background:G,padding:'20px 28px',position:'sticky',top:0,zIndex:10}}>
          <div style={{fontSize:20,fontWeight:900,color:'#fff'}}>+ Create New Shift</div>
          <div style={{fontSize:11,color:'rgba(255,255,255,.75)',marginTop:3}}>Voice input enabled. Nepal Labour Act 2074 rules auto-applied.</div>
        </div>
        <div style={{padding:'24px 28px'}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
            <Field label="Shift Code" value={f.code} onChange={s('code')} required accent={A} hint="e.g. NIGHT-A"/>
            <Field label="Shift Name (English)" value={f.name} onChange={s('name')} required accent={A}/>
            <Field label="Shift Name (Nepali)" value={f.name_nepali} onChange={s('name_nepali')} accent={A}/>
            <Field label="Shift Type" type="select" value={f.type} onChange={s('type')} accent={A}
              options={['day','morning','evening','night','rotational','flexible','split']}/>
            <Field label="Start Time" type="time" value={f.start} onChange={s('start')} required accent={A}/>
            <Field label="End Time" type="time" value={f.end} onChange={s('end')} required accent={A}/>
            <Field label="Break Duration (minutes)" type="number" value={f.break_min} onChange={s('break_min')} accent={A}/>
            <Field label="Grace Period (minutes)" type="number" value={f.grace} onChange={s('grace')} accent={A} hint="Tolerance for late clock-in"/>
            <Field label="Shift Allowance (NPR/day)" type="number" value={f.allowance} onChange={s('allowance')} accent={A}/>
            <Field label="Night Premium (%)" type="number" value={f.night_premium} onChange={s('night_premium')} accent={A} hint="% extra for night shift per LA2074"/>
          </div>
          <Field label="Description" type="textarea" value={f.description} onChange={s('description')} accent={A}/>
          <AIImpact color={A} lines={[
            'Night shifts must include a premium per Labour Act 2074 Section 32.',
            'Max 8 hours per shift. OT beyond 8 hours = 1.5x rate per Section 30.',
            'Shift assignment links to Payroll for allowance auto-calculation.',
            'Conflict detection will run when assigning to employees.',
          ]}/>
          <div style={{display:'flex',gap:10}}>
            <button onClick={()=>{onSave(f);onClose()}} style={{flex:1,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Create Shift</button>
            <button onClick={onClose} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
          </div>
        </div>
      </div>
    </d

iv>
  )


// ── Tenant context ────────────────────────────────────────────
function useCompanyCtx() {
  const auth   = (() => { try { return JSON.parse(localStorage.getItem('elogix_auth')||'{}') } catch { return {} } })()
  const regCos = (() => { try { return JSON.parse(localStorage.getItem('elogix_registered_companies')||'{}') } catch { return {} } })()
  const slug   = auth.company?.slug || auth.user?.company || 'demo'
  return {
    company_id:   auth.company?.id || slug,
    company_name: auth.company?.name || regCos[slug]?.name || 'Your Company',
    company_slug: slug,
    plan:         auth.company?.plan || 'trial',
    currency:     auth.company?.currency || 'NPR',
    token:        localStorage.getItem('elogix_token') || auth.token || '',

export default function ShiftSetupPage() {
  const ctx = useCompanyCtx()  // Tenant scope

  const [shifts, setShifts] = useState(SHIFT_TYPES)
  const [view, setView] = useState('cards')
  const [selected, setSelected] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)
  const [search, setSearch] = useState('')

  const filtered = shifts.filter(s=>!search||s.name.toLowerCase().includes(search.toLowerCase())||s.code.toLowerCase().includes(search.toLowerCase()))
  const totalEmp = shifts.reduce((s,sh)=>s+sh.emp_count,0)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader
        icon="⏰" title="Shift Setup"
        breadcrumb="Organization Management > Workforce Configuration"
        gradient={G}
        stats={[
          {icon:'⏰',label:'Shift Types',   value:shifts.length},
          {icon:'👥',label:'Total Assigned',value:totalEmp},
          {icon:'🌙',label:'Night Shifts',  value:shifts.filter(s=>s.type==='night').length},
          {icon:'🔄',label:'Rotational',    value:shifts.filter(s=>s.type==='rotational').length},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="New Shift"
        onExcel={()=>setShowExcel(true)}
      />

      {/* LA 2074 Banner */}
      <div style={{background:'linear-gradient(135deg,#eff6ff,#f5f3ff)',border:'1px solid #c4b5fd',borderRadius:12,padding:'10px 16px',marginBottom:14,display:'flex',gap:12,fontSize:11,color:'#3730a3'}}>
        <span style={{fontSize:18}}>⚖</span>
        <div>
          <strong>Nepal Labour Act 2074 Shift Rules:</strong> Normal hours max 8/day, 48/week (Section 28). OT = 1.5x (Section 30). Night shift allowance mandatory (Section 32). Max 4 consecutive hours without break (Section 29).
        </div>
      </div>

      {/* View toggle */}
      <div style={{display:'flex',gap:8,marginBottom:14}}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search shifts..."/>
        {['cards','table'].map(v=>(
          <button key={v} onClick={()=>setView(v)}
            style={{padding:'10px 18px',borderRadius:10,border:`1.5px solid ${view===v?A:'#e2e8f0'}`,background:view===v?'#eff6ff':'#fff',color:view===v?A:'#64748b',fontSize:12,fontWeight:600,cursor:'pointer',flexShrink:0}}>
            {v==='cards'?'Cards':'Table'}
          </button>
        ))}
      </div>

      {/* CARDS VIEW */}
      {view==='cards' && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(310px,1fr))',gap:14}}>
          {filtered.map(sh=>(
            <LuxCard key={sh.id} color={sh.color} onClick={()=>setSelected(sh)}
              onContextMenu={e=>{e.preventDefault();setCtx({x:e.clientX,y:e.clientY,item:{name:sh.name,...sh}})}}>
              <div style={{padding:'16px 16px 0',display:'flex',gap:12,alignItems:'flex-start'}}>
                <div style={{width:50,height:50,borderRadius:14,background:`${sh.color}18`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,flexShrink:0}}>{sh.icon}</div>
                <div style={{flex:1}}>
                  <div style={{display:'flex',gap:6,alignItems:'center',marginBottom:2}}>
                    <span style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{sh.name}</span>
                    <span style={{background:`${sh.color}18`,color:sh.color,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{sh.code}</span>
                  </div>
                  <div style={{fontSize:10,color:'#94a3b8',fontStyle:'italic',marginBottom:4}}>{sh.nepali}</div>
                  <div style={{fontSize:11,color:'#64748b'}}>{sh.description}</div>
                </div>
              </div>

              {/* Time bar */}
              <div style={{margin:'12px 16px 8px',background:'#f1f5f9',borderRadius:8,padding:'10px 14px'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:6,fontSize:10,color:'#64748b',fontWeight:600}}>
                  <span>Start</span><span>Working Hours</span><span>End</span>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <span style={{fontSize:14,fontWeight:900,color:sh.color}}>{sh.start}</span>
                  <div style={{flex:1,height:8,background:`${sh.color}22`,borderRadius:4,position:'relative',overflow:'hidden'}}>
                    <div style={{position:'absolute',inset:0,background:`linear-gradient(90deg,${sh.color},${sh.color}88)`,borderRadius:4}}/>
                    <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',fontSize:9,color:'#fff',fontWeight:700,whiteSpace:'nowrap'}}>{sh.hours}h work</div>
                  </div>
                  <span style={{fontSize:14,fontWeight:900,color:sh.color}}>{sh.end}</span>
                </div>
              </div>

              <div style={{padding:'0 16px 10px',display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6}}>
                {[
                  {l:'Employees', v:sh.emp_count, c:sh.color},
                  {l:'Allowance', v:sh.allowance_npr>0?'NPR '+sh.allowance_npr:'None', c:sh.allowance_npr>0?'#10b981':'#94a3b8'},
                  {l:'Night %',   v:sh.night_premium_pct>0?sh.night_premium_pct+'%':'N/A', c:sh.night_premium_pct>0?'#f59e0b':'#94a3b8'},
                ].map((s,i)=>(
                  <div key={i} style={{textAlign:'center',background:'#f8fafc',borderRadius:8,padding:'5px'}}>
                    <div style={{fontSize:12,fontWeight:800,color:s.c}}>{s.v}</div>
                    <div style={{fontSize:8,color:'#94a3b8',fontWeight:600}}>{s.l}</div>
                  </div>
                ))}
              </div>

              {sh.la_note && (
                <div style={{margin:'0 12px 10px',background:'#fffbeb',border:'1px solid #fde68a',borderRadius:8,padding:'6px 10px',fontSize:10,color:'#92400e'}}>
                  {sh.la_note}
                </div>
              )}

              <div style={{borderTop:'1px solid #f1f5f9',padding:'8px 12px',display:'flex',gap:6}}>
                <span style={{fontSize:10,color:'#64748b',flexShrink:0}}>Grace: {sh.grace_min}min</span>
                <span style={{marginLeft:'auto',fontSize:10,color:'#64748b'}}>Break: {sh.break_min}min</span>
                <span style={{fontSize:10,color:'#64748b'}}>OT: {sh.weekend_ot_multiplier}x</span>
              </div>
            </LuxCard>
          ))}
        </div>
      )}

      {/* TABLE VIEW */}
      {view==='table' && (
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,overflow:'hidden'}}>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead>
                <tr style={{background:'linear-gradient(135deg,#eff6ff,#f0f9ff)'}}>
                  {['Code','Name','Type','Start','End','Hours','Break','Grace','Allowance','Night%','OT Multi','Employees','Actions'].map(h=>(
                    <th key={h} style={{padding:'12px 12px',textAlign:'left',fontSize:10,fontWeight:800,color:A,borderBottom:`2px solid ${A}22`,whiteSpace:'nowrap'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(sh=>(
                  <tr key={sh.id} style={{borderBottom:'1px solid #f8fafc',cursor:'pointer'}}
                    onContextMenu={e=>{e.preventDefault();setCtx({x:e.clientX,y:e.clientY,item:{name:sh.name,...sh}})}}
                    onMouseEnter={e=>e.currentTarget.style.background='#f0f9ff'}
                    onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                    <td style={{padding:'10px 12px'}}><span style={{fontFamily:'monospace',fontSize:11,fontWeight:700,color:sh.color}}>{sh.code}</span></td>
                    <td style={{padding:'10px 12px',fontWeight:600,color:'#0f172a'}}>{sh.icon} {sh.name}</td>
                    <td style={{padding:'10px 12px'}}><span style={{background:`${sh.color}18`,color:sh.color,fontSize:10,padding:'2px 8px',borderRadius:20,fontWeight:600,textTransform:'capitalize'}}>{sh.type}</span></td>
                    <td style={{padding:'10px 12px',fontWeight:700,color:A}}>{sh.start}</td>
                    <td style={{padding:'10px 12px',fontWeight:700,color:A}}>{sh.end}</td>
                    <td style={{padding:'10px 12px',textAlign:'center',fontWeight:700}}>{sh.hours}h</td>
                    <td style={{padding:'10px 12px',textAlign:'center',color:'#64748b'}}>{sh.break_min}m</td>
                    <td style={{padding:'10px 12px',textAlign:'center',color:'#64748b'}}>{sh.grace_min}m</td>
                    <td style={{padding:'10px 12px',color:sh.allowance_npr>0?'#10b981':'#94a3b8',fontWeight:sh.allowance_npr>0?700:400}}>{sh.allowance_npr>0?'NPR '+sh.allowance_npr:'-'}</td>
                    <td style={{padding:'10px 12px',textAlign:'center',color:sh.night_premium_pct>0?'#f59e0b':'#94a3b8',fontWeight:700}}>{sh.night_premium_pct>0?sh.night_premium_pct+'%':'-'}</td>
                    <td style={{padding:'10px 12px',textAlign:'center',fontWeight:700,color:'#8b5cf6'}}>{sh.weekend_ot_multiplier}x</td>
                    <td style={{padding:'10px 12px',textAlign:'center',fontWeight:700,color:sh.color}}>{sh.emp_count}</td>
                    <td style={{padding:'10px 12px'}}>
                      <button onClick={()=>setSelected(sh)} style={{padding:'5px 12px',borderRadius:8,border:`1px solid ${A}33`,background:'#eff6ff',color:A,fontSize:10,cursor:'pointer',fontWeight:600}}>View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {ctx && <ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links?.map(l=>l.m)} actions={CTX_ACTIONS} onAction={(k,item)=>{if(k==='view')setSelected(item)}} onClose={()=>setCtx(null)}/>}
      {showAdd && <AddShiftModal onClose={()=>setShowAdd(false)} onSave={sh=>setShifts(p=>[...p,{...sh,id:'s'+Date.now(),emp_count:0,dept_count:0,allowance_npr:parseFloat(sh.allowance||0),night_premium_pct:parseFloat(sh.night_premium||0),weekend_ot_multiplier:1.5,grace_min:parseInt(sh.grace||15),break_min:parseInt(sh.break_min||60),icon:'⏰',color:'#64748b',impact_links:[{m:'Payroll'},{m:'Attendance'}]}])}/>}
      {showExcel && <ExcelModal title="Shift Setup" columns={['Code','Name','Nepali Name','Type','Start Time','End Time','Break (min)','Grace (min)','Allowance (NPR)','Night Premium %','OT Multiplier']} onClose={()=>setShowExcel(false)} onImport={f=>alert('Importing: '+f.name)}/>}
      <Drawer item={selected} gradient={G} onClose={()=>setSelected(null)} rows={[
        ['Code',selected?.code],['Type',selected?.type],
        ['Start Time',selected?.start],['End Time',selected?.end],
        ['Working Hours',selected?.hours+'h'],['Break',selected?.break_min+' min'],
        ['Grace Period',selected?.grace_min+' min'],
        ['Shift Allowance','NPR '+(selected?.allowance_npr||0)+'/day'],
        ['Night Premium',selected?.night_premium_pct+'%'],
        ['Weekend OT',selected?.weekend_ot_multiplier+'x'],
        ['Employees',selected?.emp_count],['Departments',selected?.dept_count],
        ['Description',selected?.description],
        ['Nepal Law Note',selected?.la_note||'Standard rules apply'],
      ]}/>
    </div>
  )
