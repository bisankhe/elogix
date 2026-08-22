// FILE: StaffQuotaDarbadiPage.jsx - Existed Staff Quota (Darbadi)
// Approved sanctioned position registry, Nepal Labour Act 2074

import { useState } from 'react'
import { DEPARTMENTS, POSITIONS, WFP_THEME, TOTAL_QUOTA, TOTAL_FILLED, TOTAL_VACANT, FISCAL_YEAR } from '../../../data/wfpData.js'
import { Field, ExcelModal, PageHeader, AIImpact, Drawer, SearchBar, LuxCard, ContextMenu } from './DeptSetupShared.jsx'

const { G, A } = WFP_THEME.quota

const STATUS_CFG = {
  filled:   { c:'#10b981', bg:'#f0fdf4', b:'#bbf7d0', label:'Filled'   },
  vacant:   { c:'#ef4444', bg:'#fef2f2', b:'#fecaca', label:'Vacant'   },
  onhold:   { c:'#f59e0b', bg:'#fffbeb', b:'#fde68a', label:'On Hold'  },
  planned:  { c:'#8b5cf6', bg:'#f5f3ff', b:'#c4b5fd', label:'Planned'  },
}

const CTX = [
  {icon:'👁',label:'View Position Details',     key:'view'},
  {icon:'✅',label:'Assign Incumbent',           key:'assign'},
  {icon:'📋',label:'Create Job Requisition',    key:'jrf'},
  {icon:'📊',label:'View Quota History',        key:'history'},
  {icon:'⚖',label:'Nepal Law Check (LA2074)',  key:'law'},
  {icon:'🔗',label:'Impact Analysis',           key:'impact'},
  {icon:'📤',label:'Export Position List',      key:'export'},
  {icon:'🗑',label:'Deactivate Position',        key:'deactivate', danger:true},
]

export default function StaffQuotaDarbadiPage() {
  const [positions, setPositions] = useState(POSITIONS)
  const [search, setSearch] = useState('')
  const [filterDept, setFilterDept] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [view, setView] = useState('table')
  const [selected, setSelected] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = positions.filter(p=>{
    if (filterDept!=='all'&&p.dept!==filterDept) return false
    if (filterStatus!=='all'&&p.status!==filterStatus) return false
    if (filterType!=='all'&&p.type!==filterType) return false
    if (search&&!p.title.toLowerCase().includes(search.toLowerCase())&&!p.code.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const depts = [...new Set(positions.map(p=>p.dept))]

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📋" title="Existed Staff Quota (Darbadi)"
        breadcrumb="Employee Lifecycle > Recruitment > Workforce Planning"
        gradient={G}
        stats={[
          {icon:'📋',label:'Total Quota',     value:TOTAL_QUOTA},
          {icon:'✅',label:'Filled',           value:TOTAL_FILLED},
          {icon:'🔴',label:'Vacant',           value:TOTAL_VACANT},
          {icon:'📅',label:'FY',              value:FISCAL_YEAR},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="Add Position"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'linear-gradient(135deg,#f5f3ff,#eff6ff)',border:'1px solid #c4b5fd',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#3730a3',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>⚖</span>
        <div><strong>Nepal Labour Act 2074:</strong> All sanctioned positions (Darbadi) must have employment classification (Regular/Time-Bound/Work-Based/Casual). Vacancies must be advertised in national newspapers and MoLESS portal per Section 11. Probation: 6 months.</div>
      </div>

      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search by position title, code..."/>
        <select value={filterDept} onChange={e=>setFilterDept(e.target.value)}
          style={{padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,color:'#475569',cursor:'pointer'}}>
          <option value="all">All Depts</option>
          {depts.map(d=><option key={d} value={d}>{d}</option>)}
        </select>
        <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}
          style={{padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,color:'#475569',cursor:'pointer'}}>
          <option value="all">All Status</option>
          <option value="filled">Filled</option>
          <option value="vacant">Vacant</option>
          <option value="onhold">On Hold</option>
          <option value="planned">Planned</option>
        </select>
        <select value={filterType} onChange={e=>setFilterType(e.target.value)}
          style={{padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,color:'#475569',cursor:'pointer'}}>
          <option value="all">All Types</option>
          <option value="regular">Regular</option>
          <option value="time_bound">Time-Bound</option>
          <option value="expansion">Expansion</option>
        </select>
        {['table','cards'].map(v=>(
          <button key={v} onClick={()=>setView(v)}
            style={{padding:'9px 14px',borderRadius:9,border:`1.5px solid ${view===v?A:'#e2e8f0'}`,background:view===v?'#ede9fe':'#fff',color:view===v?A:'#64748b',fontSize:11,fontWeight:600,cursor:'pointer',flexShrink:0}}>
            {v==='table'?'Table':'Cards'}
          </button>
        ))}
      </div>

      {/* Department summary bar */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:8,marginBottom:14}}>
        {DEPARTMENTS.map(d=>{
          const pct = Math.round(d.filled/d.quota*100)
          return (
            <div key={d.id} onClick={()=>setFilterDept(d.name.split(' ')[0])}
              style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:10,padding:'8px 12px',cursor:'pointer',
                borderTop:`3px solid ${pct>=90?'#10b981':pct>=75?'#f59e0b':'#ef4444'}`}}>
              <div style={{fontSize:11,fontWeight:700,color:'#0f172a',marginBottom:3}}>{d.name.split(' ').slice(0,2).join(' ')}</div>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:4,fontSize:10}}>
                <span style={{color:'#64748b'}}>{d.filled}/{d.quota}</span>
                <span style={{fontWeight:700,color:pct>=90?'#10b981':pct>=75?'#f59e0b':'#ef4444'}}>{pct}%</span>
              </div>
              <div style={{height:4,background:'#f1f5f9',borderRadius:4,overflow:'hidden'}}>
                <div style={{width:`${pct}%`,height:'100%',background:pct>=90?'#10b981':pct>=75?'#f59e0b':'#ef4444',borderRadius:4}}/>
              </div>
            </div>
          )
        })}
      </div>

      {view==='table' && (
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,overflow:'hidden'}}>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead>
                <tr style={{background:'linear-gradient(135deg,#f5f3ff,#eff6ff)'}}>
                  {['Pos Code','Position Title','Dept','Grade','Type','Status','Incumbent','Salary (NPR)','Action'].map(h=>(
                    <th key={h} style={{padding:'12px 12px',textAlign:'left',fontSize:10,fontWeight:800,color:A,borderBottom:`2px solid ${A}22`,whiteSpace:'nowrap'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(p=>{
                  const sc = STATUS_CFG[p.status]||STATUS_CFG.vacant
                  return (
                    <tr key={p.id}
                      onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:p.title,...p}})}}
                      style={{borderBottom:'1px solid #f8fafc',cursor:'pointer'}}
                      onClick={()=>setSelected(p)}
                      onMouseEnter={e=>e.currentTarget.style.background='#f5f3ff'}
                      onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                      <td style={{padding:'10px 12px',fontFamily:'monospace',fontSize:10,fontWeight:700,color:A}}>{p.code}</td>
                      <td style={{padding:'10px 12px',fontWeight:700,color:'#0f172a'}}>{p.title}</td>
                      <td style={{padding:'10px 12px'}}><span style={{background:`${A}12`,color:A,fontSize:9,padding:'2px 8px',borderRadius:20,fontWeight:600}}>{p.dept}</span></td>
                      <td style={{padding:'10px 12px',textAlign:'center',fontWeight:700,color:'#64748b'}}>{p.grade}</td>
                      <td style={{padding:'10px 12px'}}><span style={{fontSize:9,color:'#475569',textTransform:'capitalize'}}>{p.type.replace('_',' ')}</span></td>
                      <td style={{padding:'10px 12px'}}><span style={{background:sc.bg,color:sc.c,border:`1px solid ${sc.b}`,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{sc.label}</span></td>
                      <td style={{padding:'10px 12px',fontSize:11,color:'#475569'}}>{p.filled_by||<span style={{color:'#94a3b8',fontStyle:'italic'}}>Vacant</span>}</td>
                      <td style={{padding:'10px 12px',fontWeight:700,color:'#10b981'}}>NPR {(p.salary_npr/1000).toFixed(0)}K</td>
                      <td style={{padding:'10px 12px'}}>
                        <button onClick={ev=>{ev.stopPropagation();setSelected(p)}} style={{padding:'5px 10px',borderRadius:7,border:`1px solid ${A}33`,background:`${A}10`,color:A,fontSize:10,cursor:'pointer',fontWeight:600}}>View</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr style={{background:'#f8fafc'}}>
                  <td colSpan={3} style={{padding:'10px 12px',fontWeight:800,fontSize:11,color:A}}>TOTALS</td>
                  <td colSpan={3}/>
                  <td style={{padding:'10px 12px',fontWeight:800,color:'#0f172a'}}>{filtered.filter(p=>p.status==='filled').length} / {filtered.length}</td>
                  <td style={{padding:'10px 12px',fontWeight:800,color:'#10b981'}}>NPR {(filtered.reduce((s,p)=>s+p.salary_npr,0)/100000).toFixed(1)}L</td>
                  <td/>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {view==='cards' && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:12}}>
          {filtered.map(p=>{
            return (
              <LuxCard key={p.id} color={sc.c} onClick={()=>setSelected(p)}
                onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:p.title,...p}})}}>
                <div style={{padding:'14px 16px 8px'}}>
                  <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:4}}>
                    <span style={{fontFamily:'monospace',fontSize:10,fontWeight:700,color:A}}>{p.code}</span>
                    <span style={{background:sc.bg,color:sc.c,border:`1px solid ${sc.b}`,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{sc.label}</span>
                    <span style={{background:`${A}12`,color:A,fontSize:9,padding:'2px 7px',borderRadius:20,fontWeight:600}}>{p.grade}</span>
                  </div>
                  <div style={{fontSize:13,fontWeight:900,color:'#0f172a',marginBottom:2}}>{p.title}</div>
                  <div style={{fontSize:10,color:'#64748b'}}>{p.dept} . {p.type.replace('_',' ')}</div>
                  <div style={{fontSize:11,fontWeight:700,color:'#10b981',marginTop:6}}>NPR {(p.salary_npr/1000).toFixed(0)}K/mo</div>
                  {p.filled_by && <div style={{fontSize:10,color:'#475569',marginTop:2}}>Incumbent: {p.filled_by}</div>}
                </div>
              </LuxCard>
            )
          })}
        </div>
      )}

      {showAdd && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowAdd(false)}>
          <div style={{background:'#fff',borderRadius:20,width:680,maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Create New Darbadi Position</div></div>
            <div style={{padding:'22px 28px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
                <Field label="Position Code" value="" onChange={()=>{}} required accent={A} hint="e.g. POS-016"/>
                <Field label="Position Title" value="" onChange={()=>{}} required accent={A}/>
                <Field label="Department" type="select" value="" onChange={()=>{}} accent={A}
                  options={DEPARTMENTS.map(d=>d.name)}/>
                <Field label="Grade Level" type="select" value="" onChange={()=>{}} accent={A}
                  options={['G1','G2','G3','G4','G5','G6','G7','G8','G9']}/>
                <Field label="Employment Type" type="select" value="" onChange={()=>{}} accent={A}
                  options={['regular','time_bound','work_based','casual','expansion']}/>
                <Field label="Monthly Salary (NPR)" type="number" value="" onChange={()=>{}} accent={A}/>
                <Field label="Branch" type="select" value="" onChange={()=>{}} accent={A}
                  options={['KTM HQ','Pokhara Office','Biratnagar Office','Birgunj Liaison']}/>
                <Field label="Justification" value="" onChange={()=>{}} accent={A} hint="Voice input"/>
              </div>
              <AIImpact color={A} lines={['Position added to Darbadi registry. Requires Finance sign-off.','Vacancy auto-listed in Vacancy Planning module.','Nepal LA2074: Vacancy must be published in national newspaper.','Grade and salary auto-validated against approved band.']}/>
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>setShowAdd(false)} style={{flex:1,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Create Position</button>
                <button onClick={()=>setShowAdd(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={['Vacancy Planning','Headcount Planning','Payroll Budget','Annual Manpower Plan']} actions={CTX} onAction={(k,item)=>{if(k==='view')setSelected(item)}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Staff Quota Darbadi" columns={['Position Code','Title','Department','Grade','Type','Status','Incumbent','Monthly Salary NPR','Branch']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
      <Drawer item={selected} gradient={G} onClose={()=>setSelected(null)} rows={[
        ['Position Code',selected?.code],['Title',selected?.title],
        ['Department',selected?.dept],['Grade',selected?.grade],
        ['Employment Type',selected?.type?.replace('_',' ')],['Status',selected?.status],
        ['Incumbent',selected?.filled_by||'Vacant'],['Monthly Salary','NPR '+(selected?.salary_npr||0)],
      ]}/>
    </div>
  )
}
