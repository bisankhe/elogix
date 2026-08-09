// FILE: WeekendPolicyPage.jsx - Weekend Policy (Luxury HRIS)
// Day-type rules, hyper-localized workweek, Nepal Labour Act 2074

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, Drawer, LuxCard, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#7c2d12 0%,#ea580c 60%,#f97316 100%)'
const A = '#ea580c'

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const DAYS_NP = ['आइतबार','सोमबार','मंगलबार','बुधबार','बिहिबार','शुक्रबार','शनिबार']
const DAY_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

const POLICIES_INIT = [
  { id:'wp1', name:'Nepal Standard (5-Day)', nepali:'नेपाल मानक (५ दिन)', code:'NPL-STD',
    country:'Nepal', region:'All', work_days:[1,2,3,4,5],
    weekend_days:[0,6], half_day_friday:false,
    assigned_branches:['KTM HQ','Pokhara Office','Biratnagar Office'],
    emp_count:524, is_default:true,
    ot_saturday:1.5, ot_sunday:2.0,
    color:'#1e40af', la_note:'Nepal Labour Act 2074 Section 26: 5-day workweek standard. Weekly rest = Saturday (Sunday optional).',
    impact_links:['Payroll','Attendance','Overtime','Leave Management']},
  { id:'wp2', name:'Gulf Region (Fri-Sat Weekend)', nepali:'खाडी क्षेत्र',  code:'GULF-FRI',
    country:'UAE/Qatar', region:'Gulf', work_days:[0,1,2,3,4],
    weekend_days:[5,6], half_day_friday:false,
    assigned_branches:['Dubai Liaison'],
    emp_count:8, is_default:false,
    ot_saturday:1.5, ot_sunday:1.5,
    color:'#059669', la_note:'Gulf countries: Fri-Sat weekend per local UAE/Qatar Labour Law.',
    impact_links:['Payroll','Attendance','Overtime','Global Compliance']},
  { id:'wp3', name:'6-Day Work Week', nepali:'६ दिन कार्य सप्ताह', code:'6DAY',
    country:'Nepal', region:'Manufacturing/Factory', work_days:[0,1,2,3,4,5],
    weekend_days:[6], half_day_friday:false,
    assigned_branches:['Factory Floor'],
    emp_count:45, is_default:false,
    ot_saturday:1.5, ot_sunday:2.0,
    color:'#7c3aed', la_note:'Max 48 hrs/week per Labour Act 2074 Section 28. Saturday = extra day, OT at 1.5x.',
    impact_links:['Payroll','Overtime','Labour Act 2074','Attendance']},
  { id:'wp4', name:'Nepal 5.5-Day (Half Saturday)', nepali:'साढे ५ दिन', code:'5.5DAY',
    country:'Nepal', region:'Banking/Finance', work_days:[1,2,3,4,5],
    weekend_days:[0,6], half_day_friday:false, half_day_saturday:true,
    assigned_branches:['Finance Department'],
    emp_count:32, is_default:false,
    ot_saturday:1.5, ot_sunday:2.0,
    color:'#0891b2', la_note:'Half-day Saturday. 4 hrs Saturday morning. Compliance with NRB (Nepal Rastra Bank) rules for banking staff.',
    impact_links:['Payroll','Attendance','NRB Compliance']},
]

const CTX_ACTIONS = [
  {icon:'👁',label:'View Policy Details',key:'view'},
  {icon:'✏',label:'Edit Policy',key:'edit'},
  {icon:'👥',label:'Assigned Employees',key:'employees'},
  {icon:'🏢',label:'Assign to Branch',key:'branch'},
  {icon:'💰',label:'OT Rate Configuration',key:'ot'},
  {icon:'⚖',label:'Labour Law Reference',key:'law'},
  {icon:'🔗',label:'Impact Analysis',key:'impact'},
  {icon:'📤',label:'Export Policy',key:'export'},
  {icon:'🗑',label:'Delete Policy',key:'delete',danger:true},
]

function DayGrid({workDays,weekendDays,halfDays=[],onToggle}) {
  return (
    <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:4}}>
      {DAYS.map((day,i)=>{
        const isWork    = workDays.includes(i)
        const isWeekend = weekendDays.includes(i)
        const isHalf    = halfDays.includes(i)
        return (
          <div key={i} onClick={()=>onToggle&&onToggle(i)}
            style={{
              borderRadius:10,padding:'8px 4px',textAlign:'center',cursor:onToggle?'pointer':'default',
              background: isHalf?'#fef3c7': isWork?'#dbeafe': isWeekend?'#fee2e2':'#f8fafc',
              border:`2px solid ${isHalf?'#fbbf24':isWork?'#3b82f6':isWeekend?'#ef4444':'#e2e8f0'}`,
              transition:'all .15s ease',
            }}>
            <div style={{fontSize:10,fontWeight:700,color:isHalf?'#92400e':isWork?'#1d4ed8':isWeekend?'#dc2626':'#94a3b8'}}>{DAY_SHORT[i]}</div>
            <div style={{fontSize:8,color:'#94a3b8',marginTop:2}}>{isHalf?'Half':isWork?'Work':isWeekend?'Off':'Off'}</div>
          </div>
        )
      })}
    </div>
  )
}

function AddPolicyModal({onClose,onSave}) {
  const [f,setF] = useState({name:'',nepali:'',code:'',country:'Nepal',region:'',
    work_days:[1,2,3,4,5],weekend_days:[0,6],
    ot_saturday:1.5,ot_sunday:2.0,half_day_saturday:false,color:'#1e40af'})
  const toggleDay = (i)=>{
    const inWork = f.work_days.includes(i)
    const inWeekend = f.weekend_days.includes(i)
    if(inWork) setF(p=>({...p,work_days:p.work_days.filter(d=>d!==i),weekend_days:[...p.weekend_days,i]}))
    else       setF(p=>({...p,work_days:[...p.work_days,i],weekend_days:p.weekend_days.filter(d=>d!==i)}))
  }
  const s=k=>v=>setF(p=>({...p,[k]:v}))
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={onClose}>
      <div style={{background:'#fff',borderRadius:20,width:720,maxHeight:'92vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
        <div style={{background:G,padding:'20px 28px',position:'sticky',top:0,zIndex:10}}>
          <div style={{fontSize:20,fontWeight:900,color:'#fff'}}>+ Create Weekend Policy</div>
          <div style={{fontSize:11,color:'rgba(255,255,255,.75)',marginTop:3}}>Click days to toggle Work/Weekend. Voice input supported.</div>
        </div>
        <div style={{padding:'24px 28px'}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px',marginBottom:16}}>
            <Field label="Policy Code" value={f.code} onChange={s('code')} required accent={A} hint="e.g. NPL-STD"/>
            <Field label="Policy Name" value={f.name} onChange={s('name')} required accent={A}/>
            <Field label="Name (Nepali)" value={f.nepali} onChange={s('nepali')} accent={A}/>
            <Field label="Country / Region" value={f.country} onChange={s('country')} accent={A}/>
            <Field label="OT Rate - Saturday" type="number" value={f.ot_saturday} onChange={s('ot_saturday')} accent={A} hint="Multiplier e.g. 1.5"/>
            <Field label="OT Rate - Sunday" type="number" value={f.ot_sunday} onChange={s('ot_sunday')} accent={A} hint="Multiplier e.g. 2.0"/>
          </div>

          <div style={{marginBottom:16}}>
            <div style={{fontSize:12,fontWeight:700,color:'#334155',marginBottom:10}}>Work Schedule - Click to toggle</div>
            <DayGrid workDays={f.work_days} weekendDays={f.weekend_days} onToggle={toggleDay}/>
            <div style={{display:'flex',gap:12,marginTop:8,fontSize:11,color:'#64748b'}}>
              <div style={{display:'flex',gap:4,alignItems:'center'}}><div style={{width:10,height:10,borderRadius:2,background:'#dbeafe',border:'2px solid #3b82f6'}}/>Work Day</div>
              <div style={{display:'flex',gap:4,alignItems:'center'}}><div style={{width:10,height:10,borderRadius:2,background:'#fee2e2',border:'2px solid #ef4444'}}/>Weekend/Off</div>
            </div>
          </div>

          <AIImpact color={A} lines={[
            'Weekend policy links to Attendance - auto-marks working days vs off days.',
            'OT multipliers auto-apply to Payroll when weekend work is logged.',
            'Nepal LA 2074 Section 26: minimum one rest day per week mandatory.',
            'Policy can be assigned at Branch, Department, or Employee level.',
          ]}/>
          <div style={{display:'flex',gap:10}}>
            <button onClick={()=>{onSave(f);onClose()}} style={{flex:1,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Create Policy</button>
            <button onClick={onClose} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function WeekendPolicyPage() {
  const [policies, setPolicies] = useState(POLICIES_INIT)
  const [selected, setSelected] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)

  const totalEmp = policies.reduce((s,p)=>s+p.emp_count,0)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader
        icon="📆" title="Weekend Policy"
        breadcrumb="Organization Management > Workforce Configuration"
        gradient={G}
        stats={[
          {icon:'📆',label:'Policies Active',value:policies.length},
          {icon:'👥',label:'Employees Covered',value:totalEmp},
          {icon:'🌍',label:'Countries',value:[...new Set(policies.map(p=>p.country))].length},
          {icon:'🏢',label:'Branches Assigned',value:policies.reduce((s,p)=>s+p.assigned_branches.length,0)},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="New Policy"
        onExcel={()=>setShowExcel(true)}
      />

      {/* Nepal Law Banner */}
      <div style={{background:'linear-gradient(135deg,#fff7ed,#fef3c7)',border:'1px solid #fde68a',borderRadius:12,padding:'10px 16px',marginBottom:14}}>
        <div style={{fontSize:12,fontWeight:800,color:'#92400e',marginBottom:4}}>Nepal Labour Act 2074 - Weekend & Working Hours</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,fontSize:11,color:'#78350f'}}>
          <div>Section 26: <strong>Min. 1 rest day per week</strong> mandatory</div>
          <div>Section 28: <strong>Max 48 hrs/week</strong> standard hours</div>
          <div>Section 30: Weekend OT = <strong>1.5x minimum</strong></div>
        </div>
      </div>

      {/* Policy Cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))',gap:14}}>
        {policies.map(pol=>(
          <LuxCard key={pol.id} color={pol.color} onClick={()=>setSelected(pol)}
            onContextMenu={e=>{e.preventDefault();setCtx({x:e.clientX,y:e.clientY,item:{name:pol.name,...pol}})}}>
            {pol.is_default&&(
              <div style={{background:'linear-gradient(90deg,#fef9c3,transparent)',padding:'5px 14px',borderBottom:'1px solid #fde68a',fontSize:10,color:'#854d0e',fontWeight:700}}>
                DEFAULT POLICY
              </div>
            )}
            <div style={{padding:'14px 16px 10px',display:'flex',gap:12,alignItems:'flex-start'}}>
              <div style={{width:46,height:46,borderRadius:14,background:`${pol.color}18`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>📆</div>
              <div style={{flex:1}}>
                <div style={{display:'flex',gap:6,alignItems:'center',marginBottom:2}}>
                  <span style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{pol.name}</span>
                  <span style={{background:`${pol.color}18`,color:pol.color,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{pol.code}</span>
                </div>
                <div style={{fontSize:10,color:'#94a3b8',fontStyle:'italic',marginBottom:3}}>{pol.nepali}</div>
                <div style={{fontSize:10,color:'#64748b'}}>{pol.country} &bull; {pol.region||'All Regions'}</div>
              </div>
            </div>

            {/* Day Grid (read-only) */}
            <div style={{padding:'0 14px 10px'}}>
              <DayGrid workDays={pol.work_days} weekendDays={pol.weekend_days} halfDays={pol.half_day_saturday?[6]:[]}/>
            </div>

            {/* Stats */}
            <div style={{padding:'0 14px 12px',display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6}}>
              {[
                {l:'Work Days',  v:pol.work_days.length+'/7',c:pol.color},
                {l:'OT Sat',    v:pol.ot_saturday+'x',c:'#f59e0b'},
                {l:'OT Sun',    v:pol.ot_sunday+'x',  c:'#ef4444'},
              ].map((s,i)=>(
                <div key={i} style={{textAlign:'center',background:'#f8fafc',borderRadius:8,padding:'5px'}}>
                  <div style={{fontSize:13,fontWeight:900,color:s.c}}>{s.v}</div>
                  <div style={{fontSize:8,color:'#94a3b8',fontWeight:600}}>{s.l}</div>
                </div>
              ))}
            </div>

            <div style={{borderTop:'1px solid #f1f5f9',padding:'8px 14px',fontSize:10,color:'#64748b',display:'flex',justifyContent:'space-between'}}>
              <span>👥 {pol.emp_count} employees</span>
              <span>🏢 {pol.assigned_branches.length} branches</span>
            </div>

            <div style={{padding:'4px 12px 10px'}}>
              <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:8,padding:'5px 8px',fontSize:9,color:'#c2410c'}}>{pol.la_note}</div>
            </div>
          </LuxCard>
        ))}
      </div>

      {/* Summary: Global Weekend Comparison */}
      <div style={{marginTop:20,background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'18px 20px'}}>
        <div style={{fontSize:13,fontWeight:800,color:'#0f172a',marginBottom:14}}>Global Weekend Policy Comparison</div>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
            <thead>
              <tr style={{background:'#f8fafc'}}>
                {['Region/Country','Work Days','Weekend Days','Std Hours/Week','Sat OT','Sun OT','Employees'].map(h=>(
                  <th key={h} style={{padding:'10px 12px',textAlign:'left',fontSize:10,fontWeight:700,color:'#475569',borderBottom:'2px solid #e2e8f0'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {policies.map(p=>(
                <tr key={p.id} style={{borderBottom:'1px solid #f1f5f9'}}>
                  <td style={{padding:'10px 12px'}}>
                    <div style={{fontWeight:700,color:'#0f172a'}}>{p.name}</div>
                    <div style={{fontSize:9,color:'#94a3b8'}}>{p.country}</div>
                  </td>
                  <td style={{padding:'10px 12px'}}>
                    <div style={{display:'flex',gap:2}}>
                      {p.work_days.map(d=><span key={d} style={{background:'#dbeafe',color:'#1d4ed8',fontSize:9,fontWeight:700,padding:'1px 5px',borderRadius:4}}>{DAY_SHORT[d]}</span>)}
                    </div>
                  </td>
                  <td style={{padding:'10px 12px'}}>
                    <div style={{display:'flex',gap:2}}>
                      {p.weekend_days.map(d=><span key={d} style={{background:'#fee2e2',color:'#dc2626',fontSize:9,fontWeight:700,padding:'1px 5px',borderRadius:4}}>{DAY_SHORT[d]}</span>)}
                    </div>
                  </td>
                  <td style={{padding:'10px 12px',fontWeight:700,color:'#0f172a'}}>{p.work_days.length*8}h</td>
                  <td style={{padding:'10px 12px',fontWeight:700,color:'#f59e0b'}}>{p.ot_saturday}x</td>
                  <td style={{padding:'10px 12px',fontWeight:700,color:'#ef4444'}}>{p.ot_sunday}x</td>
                  <td style={{padding:'10px 12px',fontWeight:700,color:p.color}}>{p.emp_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {ctx && <ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={CTX_ACTIONS} onAction={(k,item)=>{if(k==='view')setSelected(item)}} onClose={()=>setCtx(null)}/>}
      {showAdd && <AddPolicyModal onClose={()=>setShowAdd(false)} onSave={p=>setPolicies(pr=>[...pr,{...p,id:'wp'+Date.now(),emp_count:0,assigned_branches:[],is_default:false,impact_links:['Payroll','Attendance','Overtime'],la_note:'Policy created. Verify Labour Act 2074 compliance before assigning.'}])}/>}
      {showExcel && <ExcelModal title="Weekend Policy" columns={['Policy Code','Name','Country','Work Days','Weekend Days','OT Sat Rate','OT Sun Rate','Branches']} onClose={()=>setShowExcel(false)} onImport={f=>alert('Importing: '+f.name)}/>}
      <Drawer item={selected} gradient={G} onClose={()=>setSelected(null)} rows={[
        ['Code',selected?.code],['Country',selected?.country],
        ['Work Days',selected?.work_days?.map(d=>DAY_SHORT[d]).join(', ')],
        ['Weekend',selected?.weekend_days?.map(d=>DAY_SHORT[d]).join(', ')],
        ['Employees',selected?.emp_count],['Branches',selected?.assigned_branches?.join(', ')],
        ['OT Saturday',selected?.ot_saturday+'x'],['OT Sunday',selected?.ot_sunday+'x'],
        ['Nepal Law',selected?.la_note],
      ]}/>
    </div>
  )
}
