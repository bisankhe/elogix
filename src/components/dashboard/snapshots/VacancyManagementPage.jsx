// FILE: VacancyManagementPage.jsx - Vacancy Management
// Agile vacancy tracking, JRF links, time-to-fill, Nepal LA2074 compliance

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, Drawer, SearchBar, Badge, LuxCard, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#065f46 0%,#047857 60%,#34d399 100%)'
const A = '#047857'

const VACANCIES = [
  { id:'v1', req_id:'JRF-2025-001', title:'Senior Software Developer',
    dept:'Information Technology', branch:'KTM HQ', grade:'G6', type:'regular',
    salary_range:'NPR 80K-130K', approved_by:'CEO', approved_date:'2025-05-15',
    target_date:'2025-07-31', days_open:34, time_to_fill_target:45,
    applications:47, shortlisted:8, interviewed:4, status:'active',
    priority:'high', source_of_hire:null, jrf_no:'JRF-2025-001',
    la_advertised:true, moless_posted:true, ai_score:82,
    ai_note:'47 applicants. Top match: 3 candidates from IT background. On track for Jul 31 close.',
    impact_links:['Manpower Requisition','Job Posting','ATS Dashboard','Headcount Planning']
  },
  { id:'v2', req_id:'JRF-2025-002', title:'HR Business Partner',
    dept:'Human Resources', branch:'KTM HQ', grade:'G6', type:'regular',
    salary_range:'NPR 90K-120K', approved_by:'CFO', approved_date:'2025-05-20',
    target_date:'2025-08-15', days_open:29, time_to_fill_target:60,
    applications:22, shortlisted:5, interviewed:2, status:'active',
    priority:'medium', source_of_hire:null, jrf_no:'JRF-2025-002',
    la_advertised:true, moless_posted:true, ai_score:74,
    ai_note:'Behind schedule. Only 2 interviews completed. Recommend expanding sourcing channels.',
    impact_links:['Manpower Requisition','ATS Dashboard']
  },
  { id:'v3', req_id:'JRF-2025-003', title:'Finance Manager',
    dept:'Finance & Accounts', branch:'KTM HQ', grade:'G7', type:'regular',
    salary_range:'NPR 130K-160K', approved_by:'CEO', approved_date:'2025-04-10',
    target_date:'2025-06-30', days_open:79, time_to_fill_target:45,
    applications:18, shortlisted:4, interviewed:3, status:'overdue',
    priority:'critical', source_of_hire:null, jrf_no:'JRF-2025-003',
    la_advertised:true, moless_posted:true, ai_score:45,
    ai_note:'OVERDUE by 34 days. Salary band may be below market. Recommend revision.',
    impact_links:['Manpower Requisition','ATS Dashboard','Headcount Planning','Finance']
  },
  { id:'v4', req_id:'JRF-2025-004', title:'Customer Service Representative',
    dept:'Customer Service', branch:'Pokhara', grade:'G2', type:'regular',
    salary_range:'NPR 35K-50K', approved_by:'HR Manager', approved_date:'2025-06-01',
    target_date:'2025-07-15', days_open:16, time_to_fill_target:30,
    applications:63, shortlisted:12, interviewed:0, status:'active',
    priority:'medium', source_of_hire:null, jrf_no:'JRF-2025-004',
    la_advertised:true, moless_posted:false, ai_score:61,
    ai_note:'High volume. MoLESS portal posting pending. Start shortlisting immediately.',
    impact_links:['Job Posting','ATS Dashboard']
  },
  { id:'v5', req_id:'JRF-2025-005', title:'Cloud Architect',
    dept:'Information Technology', branch:'KTM HQ', grade:'G7', type:'regular',
    salary_range:'NPR 160K-200K', approved_by:'CEO', approved_date:'2025-06-10',
    target_date:'2025-09-30', days_open:7, time_to_fill_target:90,
    applications:5, shortlisted:0, interviewed:0, status:'new',
    priority:'high', source_of_hire:null, jrf_no:'JRF-2025-005',
    la_advertised:false, moless_posted:false, ai_score:30,
    ai_note:'NEW. Job posting not live yet. Advertise immediately per Nepal LA2074 Section 11.',
    impact_links:['Job Posting','Expansion Planning','ATS Dashboard']
  },
]

const STATUS_CFG = {
  new:      {c:'#8b5cf6',bg:'#f5f3ff',b:'#c4b5fd',icon:'🆕',label:'New'},
  active:   {c:'#3b82f6',bg:'#eff6ff',b:'#bfdbfe',icon:'🔄',label:'Active'},
  overdue:  {c:'#ef4444',bg:'#fef2f2',b:'#fecaca',icon:'⏰',label:'Overdue'},
  filled:   {c:'#10b981',bg:'#f0fdf4',b:'#bbf7d0',icon:'✅',label:'Filled'},
  onhold:   {c:'#f59e0b',bg:'#fffbeb',b:'#fde68a',icon:'⏸',label:'On Hold'},
}
const PRIORITY_CFG = {
  critical:{c:'#dc2626',bg:'#fef2f2'},
  high:    {c:'#f59e0b',bg:'#fffbeb'},
  medium:  {c:'#3b82f6',bg:'#eff6ff'},
  low:     {c:'#64748b',bg:'#f8fafc'},
}
const CTX = [
  {icon:'👁',label:'View Vacancy Detail',     key:'view'},
  {icon:'📋',label:'View JRF',                key:'jrf'},
  {icon:'📢',label:'Push to Job Board',        key:'post'},
  {icon:'🤖',label:'AI Candidate Matching',   key:'ai'},
  {icon:'📊',label:'View Pipeline (ATS)',      key:'ats'},
  {icon:'⏸',label:'Put on Hold',              key:'hold'},
  {icon:'🔗',label:'Impact Analysis',         key:'impact'},
  {icon:'📤',label:'Export',                  key:'export'},
  {icon:'✅',label:'Mark as Filled',           key:'fill', danger:false},
]

export default function VacancyManagementPage() {
  const [vacancies, setVacancies] = useState(VACANCIES)
  const [search, setSearch]       = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')
  const [selected, setSelected]   = useState(null)
  const [showAdd, setShowAdd]     = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx]             = useState(null)
  const [form, setForm]           = useState({jrf:'',title:'',dept:'IT',branch:'KTM HQ',target_date:'',priority:'high',salary:''})

  const filtered = vacancies.filter(v=>{
    if (filterStatus!=='all'&&v.status!==filterStatus) return false
    if (filterPriority!=='all'&&v.priority!==filterPriority) return false
    if (search&&!v.title.toLowerCase().includes(search.toLowerCase())&&!v.dept.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const totalApps    = vacancies.reduce((s,v)=>s+v.applications,0)
  const overdue      = vacancies.filter(v=>v.status==='overdue').length
  const avgDaysOpen  = Math.round(vacancies.reduce((s,v)=>s+v.days_open,0)/vacancies.length)
  const critical     = vacancies.filter(v=>v.priority==='critical').length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🎯" title="Vacancy Management"
        breadcrumb="Employee Lifecycle > Recruitment > Recruitment Management"
        gradient={G}
        stats={[
          {icon:'🎯',label:'Open Vacancies',   value:vacancies.filter(v=>v.status!=='filled').length},
          {icon:'📩',label:'Total Applications',value:totalApps},
          {icon:'⏰',label:'Overdue',           value:overdue},
          {icon:'📅',label:'Avg Days Open',     value:avgDaysOpen+'d'},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="New Vacancy"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:12,padding:'10px 16px',marginBottom:14,display:'flex',gap:10,fontSize:11,color:'#991b1b'}}>
        <span style={{fontSize:18}}>⚖</span>
        <div><strong>Nepal Labour Act 2074 Section 11:</strong> All vacancies must be advertised in a national newspaper AND posted on MoLESS job portal. Priority given to qualified Nepali citizens. Merit-based selection mandatory per Section 22(3).</div>
      </div>

      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search vacancies by title, department..."/>
        <div style={{display:'flex',gap:4,background:'#f1f5f9',padding:3,borderRadius:9}}>
          {['all','new','active','overdue','filled','onhold'].map(s=>(
            <button key={s} onClick={()=>setFilterStatus(s)}
              style={{padding:'7px 12px',borderRadius:7,border:'none',cursor:'pointer',fontSize:10,
                background:filterStatus===s?'#fff':'transparent',color:filterStatus===s?A:'#64748b',
                fontWeight:filterStatus===s?700:400,boxShadow:filterStatus===s?'0 1px 3px rgba(0,0,0,.08)':'none'}}>
              {s==='all'?'All':STATUS_CFG[s]?.label||s}
            </button>
          ))}
        </div>
        <div style={{display:'flex',gap:4,background:'#f1f5f9',padding:3,borderRadius:9}}>
          {['all','critical','high','medium','low'].map(p=>(
            <button key={p} onClick={()=>setFilterPriority(p)}
              style={{padding:'7px 12px',borderRadius:7,border:'none',cursor:'pointer',fontSize:10,
                background:filterPriority===p?'#fff':'transparent',color:filterPriority===p?A:'#64748b',
                fontWeight:filterPriority===p?700:400,boxShadow:filterPriority===p?'0 1px 3px rgba(0,0,0,.08)':'none'}}>
              {p.charAt(0).toUpperCase()+p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div style={{display:'grid',gap:14}}>
        {filtered.map(v=>{
          const sc = STATUS_CFG[v.status]||STATUS_CFG.active
          const pc = PRIORITY_CFG[v.priority]||PRIORITY_CFG.medium
          const ttf_pct = Math.min(Math.round(v.days_open/v.time_to_fill_target*100),100)
          const ttf_color = ttf_pct>=100?'#ef4444':ttf_pct>=80?'#f59e0b':'#10b981'
          return (
            <div key={v.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:v.title,...v}})}}
              style={{background:'#fff',border:`1.5px solid ${v.status==='overdue'?'#fecaca':v.status==='new'?'#c4b5fd':'#e2e8f0'}`,
                borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',
                borderLeft:`5px solid ${sc.c}`}}>
              <div style={{display:'flex',alignItems:'center',gap:14,padding:'16px 20px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap'}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:3,alignItems:'center'}}>
                    <span style={{fontSize:14,fontWeight:900,color:'#0f172a'}}>{v.title}</span>
                    <span style={{background:sc.bg,color:sc.c,border:`1px solid ${sc.b}`,fontSize:10,fontWeight:700,padding:'2px 10px',borderRadius:20}}>{sc.icon} {sc.label}</span>
                    <span style={{background:pc.bg,color:pc.c,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20,textTransform:'uppercase'}}>{v.priority}</span>
                  </div>
                  <div style={{fontSize:11,color:'#64748b'}}>{v.jrf_no} . {v.dept} . {v.branch} . {v.grade} . {v.salary_range}</div>
                  <div style={{display:'flex',gap:8,marginTop:4,fontSize:10,color:'#94a3b8'}}>
                    <span>📅 {v.days_open} days open</span>
                    <span>🎯 Target: {v.target_date}</span>
                    {!v.la_advertised&&<span style={{color:'#dc2626',fontWeight:700}}>⚠ LA2074: Not advertised!</span>}
                    {!v.moless_posted&&<span style={{color:'#f59e0b',fontWeight:700}}>⚠ MoLESS pending</span>}
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,60px)',gap:8,flexShrink:0}}>
                  {[{l:'Applied',v:v.applications,c:'#3b82f6'},{l:'Short',v:v.shortlisted,c:'#8b5cf6'},{l:'Interviewed',v:v.interviewed,c:'#f59e0b'}].map((s,i)=>(
                    <div key={i} style={{textAlign:'center',background:'#f8fafc',borderRadius:10,padding:'6px 4px'}}>
                      <div style={{fontSize:16,fontWeight:900,color:s.c}}>{s.v}</div>
                      <div style={{fontSize:8,color:'#94a3b8',fontWeight:600}}>{s.l}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{padding:'10px 20px',borderBottom:'1px solid #f8fafc'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:4,fontSize:10}}>
                  <span style={{color:'#64748b'}}>Time-to-Fill Progress</span>
                  <span style={{fontWeight:700,color:ttf_color}}>{v.days_open}/{v.time_to_fill_target} days ({ttf_pct}%)</span>
                </div>
                <div style={{height:8,background:'#f1f5f9',borderRadius:8,overflow:'hidden'}}>
                  <div style={{width:`${ttf_pct}%`,height:'100%',background:`linear-gradient(90deg,${ttf_color},${ttf_color}88)`,borderRadius:8,transition:'width .6s ease'}}/>
                </div>
                <div style={{marginTop:6,fontSize:10,color:'#64748b',fontStyle:'italic'}}>
                  🤖 AI: {v.ai_note} <span style={{color:v.ai_score>=70?'#10b981':v.ai_score>=50?'#f59e0b':'#ef4444',fontWeight:700}}>Score: {v.ai_score}/100</span>
                </div>
              </div>

              <div style={{padding:'8px 14px',display:'flex',gap:8,justifyContent:'flex-end'}}>
                <button onClick={()=>setSelected(v)} style={{padding:'7px 14px',borderRadius:8,border:`1px solid ${A}33`,background:'#f0fdf4',color:A,fontSize:11,fontWeight:600,cursor:'pointer'}}>Details</button>
                <button style={{padding:'7px 14px',borderRadius:8,border:'none',background:G,color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>View Pipeline</button>
                {!v.la_advertised&&<button style={{padding:'7px 14px',borderRadius:8,border:'none',background:'#ef4444',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>Advertise Now</button>}
              </div>
            </div>
          )
        })}
      </div>

      {showAdd&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowAdd(false)}>
          <div style={{background:'#fff',borderRadius:20,width:680,maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Create New Vacancy</div></div>
            <div style={{padding:'22px 28px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
                {[['JRF Number','jrf','text'],['Position Title *','title','text'],['Salary Range (NPR)','salary','text'],['Target Fill Date','target_date','date']].map(([l,f,t])=>(
                  <div key={f}>
                    <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>{l}</label>
                    <input type={t} value={form[f]} onChange={e=>setForm(p=>({...p,[f]:e.target.value}))}
                      style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                  </div>
                ))}
                {[['Department','dept',['IT','Finance','HR','Operations','Sales','Customer Service','Facilities']],
                  ['Branch','branch',['KTM HQ','Pokhara Office','Biratnagar Office','Birgunj Liaison']],
                  ['Priority','priority',['critical','high','medium','low']]].map(([l,f,opts])=>(
                  <div key={f}>
                    <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>{l}</label>
                    <select value={form[f]} onChange={e=>setForm(p=>({...p,[f]:e.target.value}))}
                      style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',background:'#fff',boxSizing:'border-box'}}>
                      {opts.map(o=><option key={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <AIImpact color={A} lines={['LA2074: National newspaper ad + MoLESS portal required before recruitment.','AI will auto-rank applications as they arrive.','Links to ATS pipeline on creation.','Overdue alert fires if target date missed.']}/>
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>{
                  if(!form.title){alert('Position title required');return}
                  setVacancies(prev=>[...prev,{
                    id:'v'+Date.now(),req_id:form.jrf||'JRF-NEW',title:form.title,
                    dept:form.dept,branch:form.branch,grade:'G3',type:'regular',
                    salary_range:form.salary||'TBD',approved_by:'HR Manager',approved_date:new Date().toISOString().split('T')[0],
                    target_date:form.target_date||'TBD',days_open:0,time_to_fill_target:45,
                    applications:0,shortlisted:0,interviewed:0,status:'new',
                    priority:form.priority,source_of_hire:null,jrf_no:form.jrf||'JRF-NEW',
                    la_advertised:false,moless_posted:false,ai_score:0,
                    ai_note:'Newly created. Post to MoLESS and newspaper immediately.',
                    impact_links:['Job Posting','ATS Dashboard','Manpower Requisition']
                  }])
                  setShowAdd(false)
                  setForm({jrf:'',title:'',dept:'IT',branch:'KTM HQ',target_date:'',priority:'high',salary:''})
                }} style={{flex:1,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>🎯 Create Vacancy</button>
                <button onClick={()=>setShowAdd(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={CTX} onAction={(k,item)=>{if(k==='view')setSelected(item)}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Vacancy Management" columns={['JRF No','Position Title','Department','Branch','Grade','Salary Range','Status','Priority','Target Date','Applications','Shortlisted','LA Advertised','MoLESS Posted']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[NepHR Import]", f.name, result); }}/>}
      <Drawer item={selected} gradient={G} onClose={()=>setSelected(null)} rows={[
        ['JRF No',selected?.jrf_no],['Position',selected?.title],['Department',selected?.dept],
        ['Branch',selected?.branch],['Grade',selected?.grade],['Type',selected?.type],
        ['Salary Range',selected?.salary_range],['Priority',selected?.priority],
        ['Days Open',selected?.days_open],['Target Date',selected?.target_date],
        ['Applications',selected?.applications],['Shortlisted',selected?.shortlisted],
        ['Interviewed',selected?.interviewed],['Status',selected?.status],
        ['LA Advertised',selected?.la_advertised?'Yes':'NO - ACTION REQUIRED'],
        ['MoLESS Posted',selected?.moless_posted?'Yes':'NO - ACTION REQUIRED'],
        ['AI Score',selected?.ai_score+'/100'],['AI Note',selected?.ai_note],
      ]}/>
    </div>
  )
}
