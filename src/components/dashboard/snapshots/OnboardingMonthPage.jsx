// FILE: OnboardingMonthPage.jsx — Onboarding This Month
// eLogix HRMS | Staff onboarding tracker: name, designation, supervisor, dept, DOJ, employment type
import { useState } from 'react'
import { PageHeader, SearchBar, ExcelModal } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#064e3b 0%,#059669 60%,#6ee7b7 100%)'
const A = '#059669'

const ONBOARDING = [
  { id:'OB001', name:'Gita Maharjan',       designation:'Cloud Architect',       supervisor:'Rajesh Sharma (CTO)',         dept:'Information Technology', doj:'2081-03-22', emp_type:'Permanent',   status:'Day 1',     progress:15 },
  { id:'OB002', name:'Sunita Rai',           designation:'Senior SW Developer',   supervisor:'Bikash Shrestha (IT Lead)',   dept:'Information Technology', doj:'2081-03-25', emp_type:'Permanent',   status:'Pre-joining',progress:0  },
  { id:'OB003', name:'Maya Pradhan',         designation:'Finance Manager',        supervisor:'Sanjay Karki (CFO)',          dept:'Finance & Accounts',     doj:'2081-03-01', emp_type:'Permanent',   status:'Week 2',    progress:65 },
  { id:'OB004', name:'Ramesh B. Shrestha',  designation:'Security Guard',         supervisor:'Maya Gurung (Ops Head)',      dept:'Operations',             doj:'2081-03-20', emp_type:'Outsource',   status:'Complete',  progress:100},
  { id:'OB005', name:'Hari Bahadur Thapa',  designation:'HR Officer',             supervisor:'Priya Adhikari (HR Head)',    dept:'Human Resources',        doj:'2081-03-28', emp_type:'Contract',    status:'Pre-joining',progress:5  },
  { id:'OB006', name:'Anita Gurung',         designation:'Marketing Executive',    supervisor:'Dev Thapa (Mktg Head)',       dept:'Marketing & Sales',      doj:'2081-03-15', emp_type:'Permanent',   status:'Week 3',    progress:80 },
  { id:'OB007', name:'Dipak Tamang',         designation:'DevOps Engineer',        supervisor:'Hari Thapa (DevOps Lead)',    dept:'Information Technology', doj:'2081-03-10', emp_type:'Permanent',   status:'Complete',  progress:100},
  { id:'OB008', name:'Sita Sharma',          designation:'Accountant',             supervisor:'Maya Pradhan (Fin. Mgr)',     dept:'Finance & Accounts',     doj:'2081-03-30', emp_type:'Probation',   status:'Pre-joining',progress:0  },
]

const STATUS_C  = { 'Pre-joining':'#94a3b8', 'Day 1':'#3b82f6', 'Week 2':'#f59e0b', 'Week 3':'#8b5cf6', 'Complete':'#10b981' }
const EMP_C     = { Permanent:'#059669', Contract:'#0891b2', Outsource:'#f59e0b', Probation:'#8b5cf6' }

export default function OnboardingMonthPage() {
  const [data]        = useState(ONBOARDING)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('All')
  const [filterStatus, setFilterStatus] = useState('All')
  const [showExcel, setShowExcel] = useState(false)
  const [selected, setSelected] = useState(null)

  const filtered = data.filter(e =>
    (filterType   === 'All' || e.emp_type === filterType) &&
    (filterStatus === 'All' || e.status   === filterStatus) &&
    (!search || e.name.toLowerCase().includes(search.toLowerCase()) || e.dept.toLowerCase().includes(search.toLowerCase()))
  )

  const byStatus = (s) => data.filter(e => e.status === s).length

  return (
    <div style={{fontFamily:'system-ui,sans-serif'}}>
      <PageHeader icon="🎉" title="Onboarding — This Month"
        breadcrumb="Employee Lifecycle > Onboarding"
        gradient={G}
        stats={[
          {icon:'👥', label:'Total Onboarding', value:data.length},
          {icon:'✅', label:'Completed',         value:byStatus('Complete')},
          {icon:'⏳', label:'In Progress',       value:data.filter(e=>e.status!=='Complete'&&e.status!=='Pre-joining').length},
          {icon:'📋', label:'Pre-joining',       value:byStatus('Pre-joining')},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>setShowExcel(true)}/>

      {/* Filters */}
      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search name or department..."/>
        <select value={filterType} onChange={e=>setFilterType(e.target.value)}
          style={{padding:'8px 12px',borderRadius:9,border:'1px solid #e2e8f0',fontSize:10,background:'#fff',outline:'none'}}>
          {['All','Permanent','Contract','Outsource','Probation'].map(t=><option key={t}>{t}</option>)}
        </select>
        <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}
          style={{padding:'8px 12px',borderRadius:9,border:'1px solid #e2e8f0',fontSize:10,background:'#fff',outline:'none'}}>
          {['All','Pre-joining','Day 1','Week 2','Week 3','Complete'].map(s=><option key={s}>{s}</option>)}
        </select>
      </div>

      {/* Progress summary bar */}
      <div style={{background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',padding:'14px 18px',marginBottom:14,display:'flex',gap:16,flexWrap:'wrap'}}>
        {['Pre-joining','Day 1','Week 2','Week 3','Complete'].map(s=>(
          <div key={s} style={{textAlign:'center'}}>
            <div style={{fontSize:18,fontWeight:900,color:STATUS_C[s]}}>{byStatus(s)}</div>
            <div style={{fontSize:8,color:'#64748b',marginTop:2}}>{s}</div>
          </div>
        ))}
        <div style={{flex:1,display:'flex',alignItems:'center',gap:8,minWidth:200}}>
          <div style={{flex:1,height:8,background:'#f1f5f9',borderRadius:4,overflow:'hidden'}}>
            <div style={{width:Math.round(byStatus('Complete')/data.length*100)+'%',height:'100%',background:A,borderRadius:4,transition:'width .4s'}}/>
          </div>
          <span style={{fontSize:10,fontWeight:700,color:A}}>{Math.round(byStatus('Complete')/data.length*100)}% done</span>
        </div>
      </div>

      {/* Main table */}
      <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',overflow:'hidden'}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:10}}>
          <thead>
            <tr style={{background:'#f8fafc',borderBottom:'2px solid #e2e8f0'}}>
              {['#','Staff Name','Designation','Supervisor / Manager','Department','Date of Joining','Employment Type','Status','Progress','Action'].map(h=>(
                <th key={h} style={{padding:'11px 13px',textAlign:'left',fontSize:9,fontWeight:800,color:'#475569',whiteSpace:'nowrap'}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((e, i) => (
              <tr key={e.id} style={{borderBottom:'1px solid #f1f5f9',background:i%2?'#fafafa':'#fff',cursor:'pointer'}} onClick={()=>setSelected(e)}>
                <td style={{padding:'11px 13px',color:'#94a3b8',fontSize:9}}>{i+1}</td>
                <td style={{padding:'11px 13px'}}>
                  <div style={{display:'flex',gap:8,alignItems:'center'}}>
                    <div style={{width:30,height:30,borderRadius:'50%',background:`${A}18`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:900,color:A,flexShrink:0}}>
                      {e.name.split(' ').map(n=>n[0]).join('').slice(0,2)}
                    </div>
                    <div>
                      <div style={{fontWeight:700,color:'#0f172a'}}>{e.name}</div>
                      <div style={{fontSize:8,color:'#64748b'}}>{e.id}</div>
                    </div>
                  </div>
                </td>
                <td style={{padding:'11px 13px',color:'#374151',fontWeight:600}}>{e.designation}</td>
                <td style={{padding:'11px 13px',color:'#475569'}}>{e.supervisor}</td>
                <td style={{padding:'11px 13px',color:'#475569'}}>{e.dept}</td>
                <td style={{padding:'11px 13px',fontWeight:700,color:'#0f172a'}}>{e.doj}</td>
                <td style={{padding:'11px 13px'}}>
                  <span style={{fontSize:8,fontWeight:700,padding:'3px 9px',borderRadius:20,background:EMP_C[e.emp_type]+'18',color:EMP_C[e.emp_type]}}>{e.emp_type}</span>
                </td>
                <td style={{padding:'11px 13px'}}>
                  <span style={{fontSize:8,fontWeight:700,padding:'3px 9px',borderRadius:20,background:STATUS_C[e.status]+'18',color:STATUS_C[e.status]}}>{e.status}</span>
                </td>
                <td style={{padding:'11px 13px',minWidth:100}}>
                  <div style={{display:'flex',alignItems:'center',gap:6}}>
                    <div style={{flex:1,height:5,background:'#f1f5f9',borderRadius:3,overflow:'hidden'}}>
                      <div style={{width:e.progress+'%',height:'100%',background:e.progress===100?'#10b981':A,borderRadius:3}}/>
                    </div>
                    <span style={{fontSize:8,fontWeight:700,color:e.progress===100?'#10b981':A,flexShrink:0}}>{e.progress}%</span>
                  </div>
                </td>
                <td style={{padding:'11px 13px'}}>
                  <div style={{display:'flex',gap:4}}>
                    <button onClick={ev=>{ev.stopPropagation();setSelected(e)}} style={{padding:'4px 10px',borderRadius:7,border:'1px solid #e2e8f0',background:'#fff',fontSize:8,cursor:'pointer'}}>View</button>
                    <button onClick={ev=>ev.stopPropagation()} style={{padding:'4px 10px',borderRadius:7,border:'none',background:A,color:'#fff',fontSize:8,cursor:'pointer'}}>Update</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail panel */}
      {selected && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={()=>setSelected(null)}>
          <div style={{background:'#fff',borderRadius:18,padding:28,width:480,maxWidth:'92vw'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,borderRadius:12,padding:'14px 18px',marginBottom:20,color:'#fff'}}>
              <div style={{fontSize:15,fontWeight:900}}>{selected.name}</div>
              <div style={{fontSize:10,opacity:.8}}>{selected.designation} · {selected.dept}</div>
            </div>
            {[['Employee ID',selected.id],['Department',selected.dept],['Designation',selected.designation],
              ['Supervisor / Manager',selected.supervisor],['Date of Joining',selected.doj],
              ['Employment Type',selected.emp_type],['Onboarding Status',selected.status],
              ['Progress',selected.progress+'%']].map(([k,v])=>(
              <div key={k} style={{display:'flex',padding:'7px 0',borderBottom:'1px solid #f1f5f9',fontSize:10}}>
                <span style={{color:'#64748b',width:160,flexShrink:0}}>{k}</span>
                <span style={{fontWeight:600,color:'#0f172a'}}>{v}</span>
              </div>
            ))}
            <button onClick={()=>setSelected(null)} style={{marginTop:18,width:'100%',padding:'10px',borderRadius:10,border:'none',background:G,color:'#fff',fontSize:11,fontWeight:800,cursor:'pointer'}}>Close</button>
          </div>
        </div>
      )}
      {showExcel&&<ExcelModal title="Onboarding This Month" columns={['Staff Name','Designation','Supervisor','Department','Date of Joining','Employment Type','Status']} onClose={()=>setShowExcel(false)} onImport={()=>setShowExcel(false)}/>}
    </div>
  )
