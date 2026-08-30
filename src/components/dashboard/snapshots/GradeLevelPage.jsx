// FILE: GradeLevelPage.jsx
// Page 2: Grade & Level - luxury matrix, salary bands, AI benchmarking

import { useState, useEffect } from 'react'
import {
  Field, ContextMenu, ExcelModal, PageHeader,
  AIImpact, Drawer, SearchBar, Badge, LuxCard
} from './DeptSetupShared.jsx'

const T = {
  gradient: 'linear-gradient(135deg,#0ea5e9 0%,#8b5cf6 100%)',
  accent:   '#0ea5e9',
  light:    '#f0f9ff',
}

const MOCK_GRADES = [
  // IC Track
  {id:'g1', code:'L1', name:'Level 1 - Junior',       track:'individual', level_num:1,
   min_npr:15000,  mid_npr:20000,  max_npr:25000,
   bonus_pct:0, leave_annual:18, overtime_exempt:false, managerial:false,
   can_approve_leave:false, can_hire:false, span_max:0,
   approval_limit_npr:0,
   designations_count:3, employees_count:45, status:'active',
   nepal_law:'General Employee - CBA eligible, overtime applicable',
   impact_links:[{icon:'💰',module:'Payroll Band',desc:'Min wage NPR 15K/mo per law'},{icon:'⏰',module:'Overtime',desc:'1.5x rate eligible'}],
  },
  {id:'g2', code:'L2', name:'Level 2 - Associate',    track:'individual', level_num:2,
   min_npr:25000,  mid_npr:35000,  max_npr:45000,
   bonus_pct:5, leave_annual:18, overtime_exempt:false, managerial:false,
   can_approve_leave:false, can_hire:false, span_max:0,
   approval_limit_npr:0,
   designations_count:5, employees_count:120, status:'active',
   nepal_law:'General Employee - CBA eligible',
   impact_links:[{icon:'💰',module:'Payroll Band',desc:'Band NPR 25-45K'},{icon:'⏰',module:'Overtime',desc:'Eligible for overtime'}],
  },
  {id:'g3', code:'L3', name:'Level 3 - Senior',       track:'individual', level_num:3,
   min_npr:45000,  mid_npr:60000,  max_npr:75000,
   bonus_pct:10, leave_annual:20, overtime_exempt:false, managerial:false,
   can_approve_leave:false, can_hire:false, span_max:0,
   approval_limit_npr:0,
   designations_count:8, employees_count:186, status:'active',
   nepal_law:'General Employee - key individual contributor',
   impact_links:[{icon:'💰',module:'Payroll Band',desc:'Band NPR 45-75K'},{icon:'📊',module:'Performance',desc:'Annual bonus 10% target'}],
  },
  {id:'g4', code:'L4', name:'Level 4 - Lead',         track:'individual', level_num:4,
   min_npr:75000,  mid_npr:97500,  max_npr:120000,
   bonus_pct:15, leave_annual:20, overtime_exempt:true, managerial:false,
   can_approve_leave:false, can_hire:false, span_max:0,
   approval_limit_npr:50000,
   designations_count:4, employees_count:42, status:'active',
   nepal_law:'Senior IC - overtime exempt, not managerial category',
   impact_links:[{icon:'💰',module:'Payroll Band',desc:'Band NPR 75-120K'},{icon:'✅',module:'Approvals',desc:'Limited financial approval up to 50K'}],
  },
  {id:'g5', code:'L5', name:'Level 5 - Principal',    track:'individual', level_num:5,
   min_npr:120000, mid_npr:160000, max_npr:200000,
   bonus_pct:20, leave_annual:22, overtime_exempt:true, managerial:false,
   can_approve_leave:false, can_hire:false, span_max:0,
   approval_limit_npr:100000,
   designations_count:2, employees_count:12, status:'active',
   nepal_law:'Principal IC - senior technical or functional expert',
   impact_links:[{icon:'💰',module:'Payroll Band',desc:'Band NPR 120-200K'}],
  },
  // Management Track
  {id:'g6', code:'M1', name:'Manager Level 1',        track:'management', level_num:6,
   min_npr:80000,  mid_npr:115000, max_npr:150000,
   bonus_pct:20, leave_annual:22, overtime_exempt:true, managerial:true,
   can_approve_leave:true, can_hire:false, span_max:8,
   approval_limit_npr:200000,
   designations_count:6, employees_count:28, status:'active',
   nepal_law:'Managerial Category - excluded from CBA per Labour Act 2074 Section 7',
   impact_links:[{icon:'✅',module:'Leave Approvals',desc:'Can approve team leave'},{icon:'💰',module:'Budget',desc:'NPR 2L approval authority'}],
  },
  {id:'g7', code:'M2', name:'Senior Manager',         track:'management', level_num:7,
   min_npr:150000, mid_npr:200000, max_npr:250000,
   bonus_pct:25, leave_annual:22, overtime_exempt:true, managerial:true,
   can_approve_leave:true, can_hire:true, span_max:12,
   approval_limit_npr:500000,
   designations_count:4, employees_count:14, status:'active',
   nepal_law:'Senior Management - can hire up to grade M1 level',
   impact_links:[{icon:'✅',module:'Hiring Authority',desc:'Can approve L1-M1 hires'},{icon:'💰',module:'Budget',desc:'NPR 5L approval authority'}],
  },
  {id:'g8', code:'M3', name:'Director',               track:'management', level_num:8,
   min_npr:250000, mid_npr:350000, max_npr:450000,
   bonus_pct:35, leave_annual:24, overtime_exempt:true, managerial:true,
   can_approve_leave:true, can_hire:true, span_max:15,
   approval_limit_npr:2000000,
   designations_count:3, employees_count:6, status:'active',
   nepal_law:'Director Level - board-delegated authority',
   impact_links:[{icon:'💰',module:'Budget',desc:'NPR 20L approval authority'},{icon:'🏛',module:'Board Reports',desc:'Dept metrics to board'}],
  },
  // Executive Track
  {id:'g9', code:'E1', name:'VP / Executive',         track:'executive',  level_num:9,
   min_npr:450000, mid_npr:625000, max_npr:800000,
   bonus_pct:50, leave_annual:24, overtime_exempt:true, managerial:true,
   can_approve_leave:true, can_hire:true, span_max:20,
   approval_limit_npr:10000000,
   designations_count:3, employees_count:5, status:'active',
   nepal_law:'VP/Executive - board appointed, Managerial Category',
   impact_links:[{icon:'💰',module:'Executive Comp',desc:'ESOPs and variable pay'},{icon:'🏛',module:'Board',desc:'Reports to CEO/Board'}],
  },
  {id:'g10',code:'E2', name:'C-Suite / CEO-1',        track:'executive',  level_num:10,
   min_npr:800000, mid_npr:1400000,max_npr:2000000,
   bonus_pct:100, leave_annual:24, overtime_exempt:true, managerial:true,
   can_approve_leave:true, can_hire:true, span_max:30,
   approval_limit_npr:999999999,
   designations_count:2, employees_count:3, status:'active',
   nepal_law:'C-Suite - board appointed, highest authority tier',
   impact_links:[{icon:'🏛',module:'Board',desc:'Direct board accountability'},{icon:'💰',module:'ESOP',desc:'Equity compensation'}],
  },
]

const TRACK_CONFIG = {
  individual: {label:'IC Track', color:'#3b82f6', codes:['L1','L2','L3','L4','L5']},
  management: {label:'Management Track', color:'#f59e0b', codes:['M1','M2','M3']},
  executive:  {label:'Executive Track', color:'#ef4444', codes:['E1','E2']},
}

const CONTEXT_ACTIONS = [
  {icon:'👁',  label:'View Grade Details',   key:'view'},
  {icon:'✏',  label:'Edit Grade',           key:'edit'},
  {icon:'💰', label:'Salary Band Analysis', key:'salary'},
  {icon:'👥', label:'View Employees',       key:'employees'},
  {icon:'📊', label:'Market Benchmark',     key:'benchmark'},
  {icon:'📋', label:'Impact Analysis',      key:'impact'},
  {icon:'📤', label:'Export Excel',         key:'export'},
]

const EXCEL_COLS = ['Grade Code','Grade Name','Track','Min Salary (NPR)','Mid Salary (NPR)',
  'Max Salary (NPR)','Bonus %','Leave Days','Overtime Exempt','Managerial Category',
  'Can Approve Leave','Can Hire','Span of Control Max','Approval Limit (NPR)']


function _getSlug() {
  try {
    const s = JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{}
    return s?.company?.slug || s?.tenant || localStorage.getItem('elogix_tenant_slug') || ''
  } catch(_e) { return '' }
}

export default function GradeLevelPage() {
  const [_apiLoading, _setApiLoading] = useState(false)
  const [grades,     setGrades]     = useState(MOCK_GRADES)
  const [search,     setSearch]     = useState('')
  const [trackFilter,setTrackFilter]= useState('all')
  const [ctx,        setCtx]        = useState(null)
  const [showAdd,    setShowAdd]    = useState(false)
  const [showExcel,  setShowExcel]  = useState(false)
  const [selected,   setSelected]   = useState(null)
  const [viewMode,   setViewMode]   = useState('matrix') // matrix | cards

  const filtered = grades.filter(g =>
    (trackFilter==='all' || g.track===trackFilter) &&
    (!search || g.name.toLowerCase().includes(search.toLowerCase()) || g.code.toLowerCase().includes(search.toLowerCase()))
  )


  // SaaS DB — load real tenant data (fallback to mock if no token/API down)
  useEffect(() => {
    const _token = localStorage.getItem('access_token')
    const _slug  = _getSlug()
    if (!_token) return
    _setApiLoading(true)
    fetch('/api/v1/org/grades', {
      headers: {
        'Authorization': `Bearer ${_token}`,
        'X-Tenant-Slug': _slug,
        'Content-Type': 'application/json',
      }
    })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => {
        const items = d.grades || d.data || d.items || []
        if (items.length > 0) setGrades(items)
      })
      .catch(() => {/* keep mock */})
      .finally(() => _setApiLoading(false))
  }, [])

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader
        icon="📊" title="Grade & Level"
        breadcrumb="Organization Management > Structure & Hierarchy"
        gradient={T.gradient}
        stats={[
          {icon:'📊', label:'Grade Levels',  value:grades.length},
          {icon:'👥', label:'Total Staff',   value:grades.reduce((s,g)=>s+g.employees_count,0)},
          {icon:'👔', label:'Managerial',    value:grades.filter(g=>g.managerial).length+' grades'},
          {icon:'💰', label:'Top Band',      value:'NPR '+((grades.find(g=>g.code==='E2')?.max_npr||0)/1e5).toFixed(1)+'L'},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="New Grade"
        onExcel={()=>setShowExcel(true)}
      />

      <SearchBar value={search} onChange={setSearch}
        placeholder="Search grades..."
        extra={
          <div style={{display:'flex',gap:6,alignItems:'center'}}>
            <div style={{display:'flex',gap:4,background:'#f1f5f9',borderRadius:10,padding:3}}>
              {[{id:'all',l:'All'},
                {id:'individual',l:'IC Track'},
                {id:'management',l:'Management'},
                {id:'executive', l:'Executive'}].map(t=>(
                <button key={t.id} onClick={()=>setTrackFilter(t.id)}
                  style={{padding:'6px 12px',borderRadius:8,border:'none',fontSize:11,fontWeight:600,cursor:'pointer',
                    background:trackFilter===t.id?'#fff':'transparent',
                    color:trackFilter===t.id?'#0f172a':'#64748b',
                    boxShadow:trackFilter===t.id?'0 1px 4px rgba(0,0,0,.08)':'none'}}>
                  {t.l}
                </button>
              ))}
            </div>
            <button onClick={()=>setViewMode(v=>v==='matrix'?'cards':'matrix')}
              style={{padding:'8px 14px',borderRadius:10,border:'1.5px solid #e2e8f0',
                background:'#fff',fontSize:11,fontWeight:600,cursor:'pointer',color:'#64748b'}}>
              {viewMode==='matrix'?'Cards View':'Matrix View'}
            </button>
          </div>
        }
      />

      {/* Salary Band Visual */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,
        padding:'18px 20px',marginBottom:16}}>
        <div style={{fontSize:13,fontWeight:800,color:'#0f172a',marginBottom:14}}>
          Salary Band Overview (NPR/month) - All Grade Levels
        </div>
        <div style={{overflowX:'auto'}}>
          {Object.entries(TRACK_CONFIG).map(([track,tc])=>(
            <div key={track} style={{marginBottom:14}}>
              <div style={{fontSize:11,fontWeight:700,color:tc.color,marginBottom:8,
                textTransform:'uppercase',letterSpacing:'0.05em'}}>{tc.label}</div>
              {grades.filter(g=>g.track===track).map(g=>{
                const maxBand = 2000000
                const minPct  = Math.round(g.min_npr/maxBand*100)
                const midPct  = Math.round(g.mid_npr/maxBand*100)
                const maxPct  = Math.round(g.max_npr/maxBand*100)
                return (
                  <div key={g.id} style={{display:'flex',alignItems:'center',gap:12,
                    padding:'6px 0',borderBottom:'1px solid #f8fafc',cursor:'pointer'}}
                    onClick={()=>setSelected(g)}>
                    <span style={{width:32,fontSize:12,fontWeight:800,color:tc.color,flexShrink:0}}>{g.code}</span>
                    <span style={{width:180,fontSize:11,color:'#334155',flexShrink:0,
                      overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{g.name}</span>
                    <div style={{flex:1,position:'relative',height:20,background:'#f8fafc',borderRadius:10}}>
                      {/* Band range bar */}
                      <div style={{position:'absolute',left:`${minPct}%`,
                        width:`${maxPct-minPct}%`,height:'100%',
                        background:`${tc.color}30`,borderRadius:10}}/>
                      {/* Mid point */}
                      <div style={{position:'absolute',left:`${midPct}%`,top:2,bottom:2,
                        width:3,background:tc.color,borderRadius:2}}/>
                    </div>
                    <div style={{width:180,display:'flex',gap:6,fontSize:10,color:'#64748b',flexShrink:0,justifyContent:'flex-end'}}>
                      <span>{(g.min_npr/1000).toFixed(0)}K</span>
                      <span style={{color:tc.color,fontWeight:700}}>{(g.mid_npr/1000).toFixed(0)}K</span>
                      <span>{(g.max_npr/1000).toFixed(0)}K</span>
                    </div>
                    <span style={{width:24,fontSize:11,color:'#94a3b8',flexShrink:0}}>{g.employees_count}</span>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Matrix view */}
      {viewMode === 'matrix' && (
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
            <thead>
              <tr style={{background:'linear-gradient(135deg,#f0f9ff,#f5f3ff)'}}>
                {['Grade','Name','Track','Salary Band (NPR/mo)','Bonus','Leave','Span','Approve Leave','Can Hire','OT Exempt','Nepal Law'].map((h,i)=>(
                  <th key={i} style={{padding:'12px 12px',textAlign:'left',fontSize:10,fontWeight:700,
                    color:'#0ea5e9',borderBottom:'2px solid #e0e7ff',whiteSpace:'nowrap'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((g,i)=>{
                const tc = TRACK_CONFIG[g.track]
                return (
                  <tr key={g.id}
                    onClick={()=>setSelected(g)}
                    onContextMenu={e=>{e.preventDefault();setCtx({x:e.clientX,y:e.clientY,item:g})}}
                    style={{borderBottom:'1px solid #f8fafc',cursor:'pointer'}}
                    onMouseEnter={e=>e.currentTarget.style.background=`${tc.color}08`}
                    onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                    <td style={{padding:'11px 12px'}}>
                      <span style={{background:`${tc.color}20`,color:tc.color,fontWeight:800,
                        padding:'3px 10px',borderRadius:8,fontSize:12}}>{g.code}</span>
                    </td>
                    <td style={{padding:'11px 12px',fontWeight:600,color:'#0f172a'}}>{g.name}</td>
                    <td style={{padding:'11px 12px'}}>
                      <span style={{fontSize:10,color:tc.color,fontWeight:700}}>{tc.label}</span>
                    </td>
                    <td style={{padding:'11px 12px',whiteSpace:'nowrap',color:'#334155'}}>
                      <span style={{color:'#94a3b8'}}>{(g.min_npr/1000).toFixed(0)}K</span>
                      <span style={{color:tc.color,fontWeight:700,margin:'0 4px'}}>{(g.mid_npr/1000).toFixed(0)}K</span>
                      <span style={{color:'#94a3b8'}}>{(g.max_npr/1000).toFixed(0)}K</span>
                    </td>
                    <td style={{padding:'11px 12px',color:'#10b981',fontWeight:700}}>{g.bonus_pct}%</td>
                    <td style={{padding:'11px 12px',textAlign:'center'}}>{g.leave_annual}d</td>
                    <td style={{padding:'11px 12px',textAlign:'center',color:g.span_max>0?'#334155':'#94a3b8'}}>
                      {g.span_max>0?g.span_max:'-'}
                    </td>
                    <td style={{padding:'11px 12px',textAlign:'center'}}>{g.can_approve_leave?'✅':'-'}</td>
                    <td style={{padding:'11px 12px',textAlign:'center'}}>{g.can_hire?'✅':'-'}</td>
                    <td style={{padding:'11px 12px',textAlign:'center'}}>
                      {g.overtime_exempt
                        ?<span style={{fontSize:9,background:'#f0fdf4',color:'#15803d',padding:'2px 6px',borderRadius:8,fontWeight:700}}>Exempt</span>
                        :<span style={{fontSize:9,background:'#fef2f2',color:'#dc2626',padding:'2px 6px',borderRadius:8,fontWeight:700}}>Eligible</span>}
                    </td>
                    <td style={{padding:'11px 12px'}}>
                      {g.managerial
                        ?<span style={{fontSize:9,background:'#fff7ed',color:'#c2410c',padding:'2px 7px',borderRadius:8,fontWeight:700}}>Managerial</span>
                        :<span style={{fontSize:9,color:'#94a3b8'}}>General</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {viewMode === 'cards' && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:14}}>
          {filtered.map(g=>{
            return (
              <LuxCard key={g.id} color={tc.color}
                onClick={()=>setSelected(g)}
                onContextMenu={e=>{e.preventDefault();setCtx({x:e.clientX,y:e.clientY,item:g})}}>
                <div style={{padding:'16px 16px 10px'}}>
                  <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:8}}>
                    <div>
                      <span style={{background:`${tc.color}20`,color:tc.color,fontWeight:900,
                        fontSize:18,padding:'4px 14px',borderRadius:10}}>{g.code}</span>
                    </div>
                    <Badge status={g.status}/>
                  </div>
                  <div style={{fontSize:13,fontWeight:800,color:'#0f172a',marginBottom:3}}>{g.name}</div>
                  <div style={{fontSize:10,color:'#94a3b8',marginBottom:10}}>{tc.label}</div>
                  {/* Salary band */}
                  <div style={{background:`${tc.color}10`,borderRadius:10,padding:'10px 12px',marginBottom:10}}>
                    <div style={{fontSize:10,color:'#64748b',marginBottom:4}}>Salary Band (NPR/month)</div>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline'}}>
                      <span style={{fontSize:11,color:'#64748b'}}>{(g.min_npr/1000).toFixed(0)}K</span>
                      <span style={{fontSize:16,fontWeight:900,color:tc.color}}>{(g.mid_npr/1000).toFixed(0)}K</span>
                      <span style={{fontSize:11,color:'#64748b'}}>{(g.max_npr/1000).toFixed(0)}K</span>
                    </div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                    {[
                      {l:'Bonus',    v:g.bonus_pct+'%',  c:'#10b981'},
                      {l:'Leave',    v:g.leave_annual+'d',c:'#3b82f6'},
                      {l:'Employees',v:g.employees_count,  c:tc.color},
                      {l:'Approval', v:g.approval_limit_npr>0?'NPR '+(g.approval_limit_npr/1000).toFixed(0)+'K':'-', c:'#f59e0b'},
                    ].map((s,i)=>(
                      <div key={i} style={{background:'#f8fafc',borderRadius:8,padding:'6px 8px',textAlign:'center'}}>
                        <div style={{fontSize:13,fontWeight:800,color:s.c}}>{s.v}</div>
                        <div style={{fontSize:9,color:'#94a3b8'}}>{s.l}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{borderTop:'1px solid #f1f5f9',padding:'8px 16px',display:'flex',gap:6,flexWrap:'wrap'}}>
                  {g.managerial&&<span style={{fontSize:9,background:'#fff7ed',color:'#c2410c',fontWeight:700,padding:'2px 7px',borderRadius:8}}>Managerial</span>}
                  {g.can_approve_leave&&<span style={{fontSize:9,background:'#f0fdf4',color:'#15803d',fontWeight:700,padding:'2px 7px',borderRadius:8}}>Leave Approver</span>}
                  {g.can_hire&&<span style={{fontSize:9,background:'#eff6ff',color:'#1d4ed8',fontWeight:700,padding:'2px 7px',borderRadius:8}}>Can Hire</span>}
                  {g.overtime_exempt&&<span style={{fontSize:9,background:'#f5f3ff',color:'#6d28d9',fontWeight:700,padding:'2px 7px',borderRadius:8}}>OT Exempt</span>}
                </div>
              </LuxCard>
            )
          })}
          <div onClick={()=>setShowAdd(true)}
            style={{border:'2px dashed #bae6fd',borderRadius:16,minHeight:160,display:'flex',
              flexDirection:'column',alignItems:'center',justifyContent:'center',
              cursor:'pointer',color:'#94a3b8',gap:8,transition:'all .2s'}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor='#0ea5e9';e.currentTarget.style.color='#0ea5e9'}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor='#bae6fd';e.currentTarget.style.color='#94a3b8'}}>
            <span style={{fontSize:32}}>+</span>
            <span style={{fontSize:12,fontWeight:700}}>Add Grade Level</span>
          </div>
        </div>
      )}

      {ctx && <ContextMenu x={ctx.x} y={ctx.y} item={ctx.item}
        impactLinks={ctx.item?.impact_links?.map(l=>l.module)}
        actions={CONTEXT_ACTIONS}
        onAction={(k,item)=>{if(k==='view')setSelected(item)}}
        onClose={()=>setCtx(null)} />}
      {showExcel && <ExcelModal title="Grade & Level" columns={EXCEL_COLS}
        onClose={()=>setShowExcel(false)} onImport={f=>alert('Processing: '+f.name)} />}
      {showAdd && <AddGradeModal onClose={()=>setShowAdd(false)}
        onSave={g=>setGrades(p=>[...p,{...g,id:'g'+Date.now(),status:'active',designations_count:0,employees_count:0,impact_links:[]}])} />}
      <Drawer item={selected} gradient={T.gradient} onClose={()=>setSelected(null)}
        rows={[
          ['Track',           selected ? TRACK_CONFIG[selected.track]?.label : null],
          ['Salary Band Min', selected ? 'NPR '+(selected.min_npr/1000).toFixed(0)+'K/mo' : null],
          ['Salary Band Mid', selected ? 'NPR '+(selected.mid_npr/1000).toFixed(0)+'K/mo' : null],
          ['Salary Band Max', selected ? 'NPR '+(selected.max_npr/1000).toFixed(0)+'K/mo' : null],
          ['Bonus Target',    selected ? selected.bonus_pct+'% of annual salary' : null],
          ['Annual Leave',    selected ? selected.leave_annual+' days' : null],
          ['Span of Control', selected?.span_max > 0 ? `Max ${selected.span_max} direct reports` : 'Not a manager'],
          ['Approval Limit',  selected?.approval_limit_npr > 0 ? 'NPR '+(selected.approval_limit_npr/1000).toFixed(0)+'K' : 'None'],
          ['Can Approve Leave',selected?.can_approve_leave ? 'Yes' : 'No'],
          ['Can Hire',        selected?.can_hire ? 'Yes' : 'No'],
          ['OT Exempt',       selected?.overtime_exempt ? 'Yes (exempt)' : 'No (eligible for OT pay)'],
          ['Managerial',      selected?.managerial ? 'Yes - excluded from CBA (Labour Act 2074)' : 'No - CBA eligible'],
          ['Nepal Law Note',  selected?.nepal_law],
        ]}/>
    </div>
  )
}

function AddGradeModal({ onClose, onSave }) {
  const [f,setF] = useState({code:'',name:'',track:'individual',level_num:'',
    min_npr:'',mid_npr:'',max_npr:'',bonus_pct:'',leave_annual:'18',
    overtime_exempt:false,managerial:false,can_approve_leave:false,can_hire:false,
    span_max:'',approval_limit_npr:'',nepal_law:''})
  const s = k => v => setF(p=>({...p,[k]:v}))
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={onClose}>
      <div style={{background:'#fff',borderRadius:20,width:700,maxHeight:'92vh',overflow:'auto',boxShadow:'0 40px 80px rgba(0,0,0,.3)'}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:'20px 28px',background:T.gradient,position:'sticky',top:0,zIndex:10}}>
          <div style={{fontSize:20,fontWeight:900,color:'#fff'}}>+ New Grade Level</div>
        </div>
        <div style={{padding:'24px 28px'}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
            <Field label="Grade Code" value={f.code} onChange={s('code')} required accent={T.accent} hint="e.g. L6, M4, E3"/>
            <Field label="Grade Name" value={f.name} onChange={s('name')} required accent={T.accent}/>
            <Field label="Track" type="select" value={f.track} onChange={s('track')} accent={T.accent}
              options={[{value:'individual',label:'Individual Contributor (IC)'},{value:'management',label:'Management'},{value:'executive',label:'Executive'}]}/>
            <Field label="Level Number" type="number" value={f.level_num} onChange={s('level_num')} accent={T.accent} hint="Determines sort order"/>
            <Field label="Min Salary (NPR/mo)" type="number" value={f.min_npr} onChange={s('min_npr')} required accent={T.accent}/>
            <Field label="Mid Salary (NPR/mo)" type="number" value={f.mid_npr} onChange={s('mid_npr')} required accent={T.accent}/>
            <Field label="Max Salary (NPR/mo)" type="number" value={f.max_npr} onChange={s('max_npr')} required accent={T.accent}/>
            <Field label="Bonus Target (%)" type="number" value={f.bonus_pct} onChange={s('bonus_pct')} accent={T.accent}/>
            <Field label="Annual Leave Days" type="number" value={f.leave_annual} onChange={s('leave_annual')} accent={T.accent}/>
            <Field label="Span of Control Max" type="number" value={f.span_max} onChange={s('span_max')} accent={T.accent} hint="Max direct reports (0 = not a manager)"/>
            <Field label="Financial Approval Limit (NPR)" type="number" value={f.approval_limit_npr} onChange={s('approval_limit_npr')} accent={T.accent}/>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:16}}>
            {[
              {k:'overtime_exempt',  l:'Overtime Exempt'},
              {k:'managerial',       l:'Managerial Category (excl. CBA)'},
              {k:'can_approve_leave',l:'Can Approve Leave'},
              {k:'can_hire',         l:'Can Hire Staff'},
            ].map(opt=>(
              <label key={opt.k} style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',
                padding:'9px 10px',borderRadius:10,border:`1.5px solid ${f[opt.k]?T.accent:'#e2e8f0'}`,
                background:f[opt.k]?T.light:'#fff',fontSize:11,fontWeight:600}}>
                <input type="checkbox" checked={f[opt.k]}
                  onChange={e=>s(opt.k)(e.target.checked)} style={{accentColor:T.accent}}/>
                {opt.l}
              </label>
            ))}
          </div>
          <Field label="Nepal Law Note" type="textarea" value={f.nepal_law} onChange={s('nepal_law')} accent={T.accent} rows={2}
            hint="e.g. Labour Act 2074 classification and overtime rules"/>
          <AIImpact color={T.accent} lines={[
            'Grade level automatically sets salary band for all linked designations.',
            'Managerial flag determines CBA exclusion per Nepal Labour Act 2074 Section 7.',
            'Leave approval and hire authority flow from this grade setting to all employees at this level.',
            'Overtime exempt status determines payroll OT calculation for this grade.',
          ]}/>
          <div style={{display:'flex',gap:10}}>
            <button onClick={()=>{onSave(f);onClose()}}
              style={{flex:1,padding:'14px',borderRadius:12,border:'none',background:T.gradient,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>
              Create Grade Level
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
