// FILE: EmployeeDirectoryPage.jsx - Employee Directory (Employee Database)
// Global searchable directory, filter by dept/location/skill, org-chart shortcut

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, LuxCard, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#0f172a 0%,#1e3a5f 60%,#3b82f6 100%)'
const A = '#1e3a5f'

const EMPLOYEES = [
  { id:'e1', code:'EMP-0041', name:'Gita Maharjan', position:'Cloud Architect', dept:'Information Technology',
    branch:'KTM HQ', manager:'Rajesh Sharma', email:'gita.m@nephr.com.np', phone:'980-1111111',
    skills:['AWS','Kubernetes','Terraform'], status:'active', join_date:'2025-06-16', avatar_color:'#3b82f6',
    impact_links:['Employee Profile','Department Introduction'] },
  { id:'e2', code:'EMP-0038', name:'Maya Pradhan', position:'Finance Manager', dept:'Finance & Accounts',
    branch:'KTM HQ', manager:'Sanjay Karki', email:'maya.p@nephr.com.np', phone:'980-2222222',
    skills:['IFRS','SAP FI','Tax'], status:'active', join_date:'2025-06-09', avatar_color:'#10b981',
    impact_links:['Employee Profile'] },
  { id:'e3', code:'EMP-0012', name:'Rajesh Sharma', position:'CTO', dept:'Information Technology',
    branch:'KTM HQ', manager:'CEO', email:'rajesh.s@nephr.com.np', phone:'980-3333333',
    skills:['Architecture','Leadership','Strategy'], status:'active', join_date:'2020-03-01', avatar_color:'#7c3aed',
    impact_links:['Employee Profile'] },
  { id:'e4', code:'EMP-0029', name:'Bikash Shrestha', position:'Senior IT Lead', dept:'Information Technology',
    branch:'KTM HQ', manager:'Rajesh Sharma', email:'bikash.s@nephr.com.np', phone:'980-4444444',
    skills:['React','Node.js','DevOps'], status:'active', join_date:'2022-08-15', avatar_color:'#f59e0b',
    impact_links:['Employee Profile'] },
  { id:'e5', code:'EMP-0044', name:'Hari Thapa', position:'DevOps Engineer', dept:'Information Technology',
    branch:'KTM HQ', manager:'Bikash Shrestha', email:'hari.t@nephr.com.np', phone:'980-5555555',
    skills:['CI/CD','Docker','Linux'], status:'probation', join_date:'2025-05-20', avatar_color:'#ec4899',
    impact_links:['Employee Profile','60 Days Review'] },
  { id:'e6', code:'EMP-0033', name:'Sanjay Karki', position:'CFO', dept:'Finance & Accounts',
    branch:'KTM HQ', manager:'CEO', email:'sanjay.k@nephr.com.np', phone:'980-6666666',
    skills:['Financial Planning','Audit','Compliance'], status:'active', join_date:'2019-11-10', avatar_color:'#06b6d4',
    impact_links:['Employee Profile'] },
]

const STATUS_CFG = {active:{c:'#10b981',label:'Active'},probation:{c:'#f59e0b',label:'Probation'},on_leave:{c:'#3b82f6',label:'On Leave'}}
const CTX = [
  {icon:'👁',label:'View Profile',       key:'view'},
  {icon:'💬',label:'Send Message',        key:'message'},
  {icon:'🌳',label:'View Org Chart',      key:'orgchart'},
  {icon:'🔗',label:'Impact Analysis',     key:'impact'},
  {icon:'📤',label:'Export',              key:'export'},
]

export default function EmployeeDirectoryPage() {
  const [employees] = useState(EMPLOYEES)
  const [search, setSearch] = useState('')
  const [filterDept, setFilterDept] = useState('all')
  const [view, setView] = useState('cards')
  const [showExcel, setShowExcel] = useState(false)
  const [msg, setMsg] = useState('')
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(''),3000) }
  const [ctx, setCtx] = useState(null)

  const depts = [...new Set(employees.map(e=>e.dept))]
  const filtered = employees.filter(e=>{
    if (filterDept!=='all'&&e.dept!==filterDept) return false
    if (search) {
      const s = search.toLowerCase()
      return e.name.toLowerCase().includes(s)||e.position.toLowerCase().includes(s)||e.skills.some(sk=>sk.toLowerCase().includes(s))
    }
    return true
  })

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📇" title="Employee Directory"
        breadcrumb="Employee Lifecycle > Employee Records > Employee Database"
        gradient={G}
        stats={[
          {icon:'👥',label:'Total Employees', value:employees.length},
          {icon:'🟢',label:'Active',           value:employees.filter(e=>e.status==='active').length},
          {icon:'🏢',label:'Departments',      value:depts.length},
          {icon:'📍',label:'Branches',         value:[...new Set(employees.map(e=>e.branch))].length},
        ]}
        onAdd={()=>notify('👤 Navigate to Employee Enrollment to create new employee record')} addLabel="+ Add Employee" onExcel={()=>setShowExcel(true)}/>

      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:380}}>{msg}</div>}

      <SearchBar value={search} onChange={setSearch} placeholder="Search by name, position, or skill..."/>
        <select value={filterDept} onChange={e=>setFilterDept(e.target.value)}
          style={{padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,color:'#475569',cursor:'pointer'}}>
          <option value="all">All Departments</option>
          {depts.map(d=><option key={d} value={d}>{d}</option>)}
        </select>
        {['cards','table'].map(v=>(
          <button key={v} onClick={()=>setView(v)}
            style={{padding:'9px 14px',borderRadius:9,border:`1.5px solid ${view===v?A:'#e2e8f0'}`,background:view===v?'#eff6ff':'#fff',color:view===v?A:'#64748b',fontSize:11,fontWeight:600,cursor:'pointer',flexShrink:0}}>
            {v==='cards'?'Cards':'Table'}
          </button>
        ))}
      </div>

      {view==='cards'&&(
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:14}}>
          {filtered.map(e=>{
            const sc = STATUS_CFG[e.status]
            return (
              <LuxCard key={e.id} color={A} onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:e.name,...e}})}}>
                <div style={{padding:'16px 16px 10px',display:'flex',gap:12,alignItems:'flex-start'}}>
                  <div style={{width:46,height:46,borderRadius:'50%',background:`${e.avatar_color}18`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:900,color:e.avatar_color,flexShrink:0}}>
                    {e.name.split(' ').map(n=>n[0]).join('').slice(0,2)}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{e.name}</div>
                    <div style={{fontSize:10,color:'#64748b'}}>{e.position}</div>
                    <span style={{background:`${sc.c}15`,color:sc.c,fontSize:8,fontWeight:700,padding:'1px 7px',borderRadius:20,marginTop:3,display:'inline-block'}}>{sc.label}</span>
                  </div>
                </div>
                <div style={{padding:'0 16px 8px',fontSize:10,color:'#64748b'}}>
                  <div>{e.code} . {e.dept}</div>
                  <div>📍 {e.branch} . 👔 {e.manager}</div>
                </div>
                <div style={{padding:'0 16px 10px',display:'flex',gap:4,flexWrap:'wrap'}}>
                  {e.skills.map((s,i)=><span key={i} style={{background:'#f8fafc',color:'#475569',fontSize:9,padding:'2px 7px',borderRadius:20,border:'1px solid #e2e8f0'}}>{s}</span>)}
                </div>
                <div style={{borderTop:'1px solid #f1f5f9',padding:'8px 12px',display:'flex',gap:6}}>
                  <button style={{flex:1,padding:'7px',borderRadius:8,border:'none',background:`${A}12`,color:A,fontSize:10,fontWeight:700,cursor:'pointer'}}>View Profile</button>
                  <button style={{flex:1,padding:'7px',borderRadius:8,border:'none',background:'#f0fdf4',color:'#15803d',fontSize:10,fontWeight:700,cursor:'pointer'}}>Message</button>
                </div>
              </LuxCard>
            )
          })}
        </div>
      )}

      {view==='table'&&(
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,overflow:'hidden'}}>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead><tr style={{background:'#f8fafc'}}>
                {['Code','Name','Position','Department','Branch','Manager','Status'].map(h=>(
                  <th key={h} style={{padding:'11px 12px',textAlign:'left',fontSize:10,fontWeight:800,color:A,borderBottom:`2px solid ${A}22`}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filtered.map(e=>(
                  <tr key={e.id} style={{borderBottom:'1px solid #f8fafc'}} onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:e.name,...e}})}}>
                    <td style={{padding:'10px 12px',fontFamily:'monospace',fontSize:10,color:A,fontWeight:700}}>{e.code}</td>
                    <td style={{padding:'10px 12px',fontWeight:700,color:'#0f172a'}}>{e.name}</td>
                    <td style={{padding:'10px 12px',color:'#64748b'}}>{e.position}</td>
                    <td style={{padding:'10px 12px',color:'#64748b',fontSize:10}}>{e.dept}</td>
                    <td style={{padding:'10px 12px',color:'#94a3b8',fontSize:10}}>{e.branch}</td>
                    <td style={{padding:'10px 12px',color:'#64748b',fontSize:10}}>{e.manager}</td>
                    <td style={{padding:'10px 12px'}}><span style={{color:STATUS_CFG[e.status]?.c,fontWeight:700,fontSize:9}}>{STATUS_CFG[e.status]?.label}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={CTX} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Employee Directory" columns={['Code','Name','Position','Department','Branch','Manager','Email','Phone','Status']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[NepHR Import]", f.name, result); }}/>}
    </div>
  )
}
