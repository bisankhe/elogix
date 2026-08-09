// FILE: ManpowerRequisitionPage.jsx
// Manpower Requisition — Digital wizard, approval chain, budget validation

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, Drawer, SearchBar, Badge, LuxCard, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#1e1b4b 0%,#6d28d9 60%,#a78bfa 100%)'
const A = '#6d28d9'

const REQUISITIONS = [
  {id:'MR-2025-041',role:'Senior Developer',dept:'IT',branch:'KTM HQ',grade:'G6',type:'regular',
   positions:1,budget_npr:120000,approved_budget:120000,status:'active',
   approval:[{role:'Dept Head',name:'Rajan Shrestha',status:'approved',date:'2025-06-01'},
             {role:'Finance',name:'Sanjay Karki',status:'approved',date:'2025-06-02'},
             {role:'HR Manager',name:'Priya Adhikari',status:'approved',date:'2025-06-03'}],
   justification:'Backfill for resignation. Critical for Q3 product release.',
   created_on:'2025-05-30',sla_date:'2025-07-14',
   impact_links:['Vacancy Management','Job Posting','ATS Dashboard','Headcount Planning']},
  {id:'MR-2025-038',role:'Finance Manager',dept:'Finance',branch:'KTM HQ',grade:'G7',type:'regular',
   positions:1,budget_npr:150000,approved_budget:150000,status:'active',
   approval:[{role:'Dept Head',name:'Anil Pandey',status:'approved',date:'2025-06-05'},
             {role:'Finance',name:'Sanjay Karki',status:'approved',date:'2025-06-06'},
             {role:'HR Manager',name:'Priya Adhikari',status:'approved',date:'2025-06-07'}],
   justification:'Expansion — new branch finance function.',
   created_on:'2025-06-04',sla_date:'2025-07-20',
   impact_links:['Vacancy Management','Job Posting','Headcount Planning']},
  {id:'MR-2025-039',role:'Sales Executive x3',dept:'Sales',branch:'Biratnagar',grade:'G3',type:'regular',
   positions:3,budget_npr:55000,approved_budget:55000,status:'pending_finance',
   approval:[{role:'Dept Head',name:'Dipak Tamang',status:'approved',date:'2025-06-08'},
             {role:'Finance',name:'Sanjay Karki',status:'pending',date:null},
             {role:'HR Manager',name:'Priya Adhikari',status:'pending',date:null}],
   justification:'Expansion — new sales territory in Province 1.',
   created_on:'2025-06-07',sla_date:'2025-07-25',
   impact_links:['Expansion Planning','Vacancy Management','Job Posting']},
  {id:'MR-2025-040',role:'Security Guard x5',dept:'Facilities',branch:'Pokhara',grade:'G1',type:'regular',
   positions:5,budget_npr:18000,approved_budget:18000,status:'draft',
   approval:[{role:'Dept Head',name:'Ram Bahadur KC',status:'pending',date:null},
             {role:'Finance',name:'Sanjay Karki',status:'pending',date:null},
             {role:'HR Manager',name:'Priya Adhikari',status:'pending',date:null}],
   justification:'New Pokhara office security team.',
   created_on:'2025-06-10',sla_date:'2025-08-01',
   impact_links:['Vendor Outsource Mapping','Job Posting','Headcount Planning']},
]

const STATUS_CFG = {
  draft:           {c:'#64748b',bg:'#f8fafc',b:'#e2e8f0',label:'Draft',icon:'📝'},
  pending_dept:    {c:'#f59e0b',bg:'#fffbeb',b:'#fde68a',label:'Pending Dept',icon:'⏳'},
  pending_finance: {c:'#3b82f6',bg:'#eff6ff',b:'#bfdbfe',label:'Pending Finance',icon:'💰'},
  pending_hr:      {c:'#8b5cf6',bg:'#f5f3ff',b:'#c4b5fd',label:'Pending HR',icon:'👥'},
  active:          {c:'#10b981',bg:'#f0fdf4',b:'#bbf7d0',label:'Approved',icon:'✅'},
  cancelled:       {c:'#ef4444',bg:'#fef2f2',b:'#fecaca',label:'Cancelled',icon:'❌'},
}
const CTX = [
  {icon:'👁',label:'View Requisition',      key:'view'},
  {icon:'✅',label:'Approve Requisition',    key:'approve'},
  {icon:'📋',label:'Create Job Posting',    key:'post'},
  {icon:'📊',label:'Check Budget Impact',   key:'budget'},
  {icon:'🔗',label:'Impact Analysis',       key:'impact'},
  {icon:'📤',label:'Export',                key:'export'},
  {icon:'❌',label:'Cancel Requisition',    key:'cancel',danger:true},
]

export default function ManpowerRequisitionPage() {
  const [reqs, setReqs] = useState(REQUISITIONS)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selected, setSelected] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({role:'',dept:'',branch:'',grade:'G3',type:'regular',positions:'1',budget:'',justification:''})
  const [jdForm, setJdForm] = useState({summary:'',responsibilities:'',requirements:'',qualifications:'',skills:'',preferred:'',kra:''})
  const [aiJdLoading, setAiJdLoading] = useState(false)
  const [aiJdGenerated, setAiJdGenerated] = useState(false)

  const filtered = reqs.filter(r=>{
    if (filterStatus!=='all'&&r.status!==filterStatus) return false
    if (search&&!r.role.toLowerCase().includes(search.toLowerCase())&&!r.id.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const active = reqs.filter(r=>r.status==='active').length
  const pending = reqs.filter(r=>r.status.startsWith('pending')).length
  const totalPositions = reqs.reduce((s,r)=>s+r.positions,0)
  const totalBudget = reqs.reduce((s,r)=>s+(r.budget_npr*r.positions),0)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📋" title="Manpower Requisition"
        breadcrumb="Employee Lifecycle > Recruitment & Hiring > Recruitment Management"
        gradient={G}
        stats={[
          {icon:'📋',label:'Total MRFs',       value:reqs.length},
          {icon:'✅',label:'Approved',          value:active},
          {icon:'⏳',label:'Pending Approval',  value:pending},
          {icon:'💰',label:'Total Budget',      value:'NPR '+(totalBudget/100000).toFixed(1)+'L/mo'},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="New Requisition"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#92400e',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>⚖</span>
        <div><strong>Nepal Labour Act 2074:</strong> All new positions must be advertised in a national newspaper AND on the MoLESS Job Portal. Approval workflow: Department Head {'>'} Finance {'>'} HR Manager. Priority to Nepali citizens.</div>
      </div>

      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search requisitions by role, ID..."/>
        <div style={{display:'flex',gap:4,background:'#f1f5f9',padding:3,borderRadius:9}}>
          {['all','draft','pending_finance','pending_hr','active'].map(s=>(
            <button key={s} onClick={()=>setFilterStatus(s)}
              style={{padding:'7px 12px',borderRadius:7,border:'none',cursor:'pointer',fontSize:10,
                background:filterStatus===s?'#fff':'transparent',color:filterStatus===s?A:'#64748b',
                fontWeight:filterStatus===s?700:400,boxShadow:filterStatus===s?'0 1px 3px rgba(0,0,0,.08)':'none'}}>
              {s==='all'?'All':STATUS_CFG[s]?.label||s}
            </button>
          ))}
        </div>
      </div>

      <div style={{display:'grid',gap:12}}>
        {filtered.map(r=>{
          const sc = STATUS_CFG[r.status]||STATUS_CFG.draft
          const doneApprovals = r.approval.filter(a=>a.status==='approved').length
          return (
            <div key={r.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:r.role,...r}})}}
              style={{background:'#fff',border:`1.5px solid ${sc.b}`,borderRadius:14,overflow:'hidden',
                boxShadow:'0 2px 8px rgba(0,0,0,.05)',borderLeft:`5px solid ${sc.c}`}}>
              <div style={{display:'flex',alignItems:'center',gap:14,padding:'14px 18px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap'}}>
                <div style={{width:44,height:44,borderRadius:12,background:`${sc.c}18`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>📋</div>
                <div style={{flex:1}}>
                  <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:3,alignItems:'center'}}>
                    <span style={{fontSize:14,fontWeight:900,color:'#0f172a'}}>{r.role}</span>
                    <span style={{background:sc.bg,color:sc.c,border:`1px solid ${sc.b}`,fontSize:10,fontWeight:700,padding:'2px 10px',borderRadius:20}}>{sc.icon} {sc.label}</span>
                    <span style={{fontFamily:'monospace',fontSize:10,color:'#94a3b8'}}>{r.id}</span>
                  </div>
                  <div style={{fontSize:11,color:'#64748b'}}>{r.dept} · {r.branch} · {r.positions} position(s) · Grade {r.grade} · {r.type}</div>
                </div>
                <div style={{textAlign:'right',flexShrink:0}}>
                  <div style={{fontSize:16,fontWeight:900,color:A}}>NPR {(r.budget_npr/1000).toFixed(0)}K<span style={{fontSize:10,color:'#94a3b8',fontWeight:400}}>/mo each</span></div>
                  <div style={{fontSize:10,color:'#64748b'}}>SLA: {r.sla_date}</div>
                </div>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:0}}>
                <div style={{padding:'10px 18px'}}>
                  <div style={{fontSize:10,color:'#94a3b8',marginBottom:3}}>Justification</div>
                  <div style={{fontSize:11,color:'#475569'}}>{r.justification}</div>
                </div>
                <div style={{padding:'10px 18px',borderLeft:'1px solid #f1f5f9'}}>
                  <div style={{fontSize:10,color:'#94a3b8',marginBottom:6}}>Approval Progress ({doneApprovals}/{r.approval.length})</div>
                  {r.approval.map((a,i)=>(
                    <div key={i} style={{display:'flex',gap:6,alignItems:'center',marginBottom:4,fontSize:10}}>
                      <span style={{color:a.status==='approved'?'#10b981':'#f59e0b',fontWeight:800,fontSize:12}}>{a.status==='approved'?'✓':'○'}</span>
                      <span style={{color:'#475569'}}>{a.role}</span>
                      {a.date&&<span style={{color:'#94a3b8'}}>· {a.date}</span>}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{padding:'8px 14px',display:'flex',gap:8,justifyContent:'flex-end',borderTop:'1px solid #f8fafc'}}>
                <button onClick={()=>setSelected(r)} style={{padding:'6px 14px',borderRadius:8,border:`1px solid ${A}33`,background:`${A}10`,color:A,fontSize:11,fontWeight:600,cursor:'pointer'}}>View</button>
                {r.status==='active'&&<button style={{padding:'6px 14px',borderRadius:8,border:'none',background:G,color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>Create Job Post</button>}
                {r.status.startsWith('pending')&&<button style={{padding:'6px 14px',borderRadius:8,border:'none',background:'#10b981',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>Approve</button>}
              </div>
            </div>
          )
        })}
      </div>

      {/* New MRF Wizard */}
      {showAdd&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>{setShowAdd(false);setStep(1)}}>
          <div style={{background:'#fff',borderRadius:20,width:720,maxHeight:'92vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px',position:'sticky',top:0,zIndex:10}}>
              <div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Create Manpower Requisition — Step {step}/4</div>
              <div style={{display:'flex',gap:3,marginTop:10}}>
                {[1,2,3,4].map(s=>(
                  <div key={s} style={{flex:1,height:4,borderRadius:4,background:step>=s?'rgba(255,255,255,.9)':'rgba(255,255,255,.3)'}}/>
                ))}
              </div>
            </div>
            <div style={{padding:'22px 28px'}}>
              {step===1&&(
                <>
                  <div style={{fontSize:12,fontWeight:700,color:'#334155',marginBottom:12}}>Step 1: Position Details</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
                    <Field label="Role / Position Title" value={form.role} onChange={v=>setForm(p=>({...p,role:v}))} required accent={A} hint="Voice input enabled"/>
                    <Field label="Department" type="select" value={form.dept} onChange={v=>setForm(p=>({...p,dept:v}))} accent={A} required options={['IT','Finance','HR','Sales','Operations','Facilities','Legal']}/>
                    <Field label="Branch" type="select" value={form.branch} onChange={v=>setForm(p=>({...p,branch:v}))} accent={A} options={['KTM HQ','Pokhara Office','Biratnagar Office','Birgunj Liaison']}/>
                    <Field label="Grade Level" type="select" value={form.grade} onChange={v=>setForm(p=>({...p,grade:v}))} accent={A} options={['G1','G2','G3','G4','G5','G6','G7','G8']}/>
                    <Field label="Employment Type" type="select" value={form.type} onChange={v=>setForm(p=>({...p,type:v}))} accent={A} options={['regular','time_bound','work_based','casual']}/>
                    <Field label="No. of Positions" type="number" value={form.positions} onChange={v=>setForm(p=>({...p,positions:v}))} accent={A}/>
                  </div>
                </>
              )}
              {step===2&&(
                <>
                  <div style={{fontSize:12,fontWeight:700,color:'#334155',marginBottom:12}}>Step 2: Budget & Justification</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
                    <Field label="Monthly Salary Budget (NPR)" type="number" value={form.budget} onChange={v=>setForm(p=>({...p,budget:v}))} accent={A} hint="Min NPR 15,000"/>
                    <Field label="Hiring Target Date" type="date" value={form.target_date||''} onChange={v=>setForm(p=>({...p,target_date:v}))} accent={A}/>
                  </div>
                  <Field label="Justification (Voice input supported)" value={form.justification} onChange={v=>setForm(p=>({...p,justification:v}))} accent={A}/>
                  {form.budget&&parseFloat(form.budget)<15000&&<div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:8,padding:'8px 12px',fontSize:11,color:'#dc2626',marginTop:8}}>Minimum wage NPR 15,000 per Nepal LA2074</div>}
                </>
              )}
              {step===3&&(
                <>
                  <div style={{fontSize:12,fontWeight:700,color:'#334155',marginBottom:12}}>Step 3: Job Description (AI-Assisted)</div>
                  <div style={{background:'linear-gradient(135deg,#f5f3ff,#ede9fe)',border:'1px solid #c4b5fd',borderRadius:12,padding:'12px 14px',marginBottom:12}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                      <div style={{fontSize:11,fontWeight:700,color:'#3730a3'}}>🤖 AI JD Assistant</div>
                      <button onClick={()=>{
                        setAiJdLoading(true)
                        setTimeout(()=>{
                          setJdForm({
                            summary:`We are looking for an experienced ${form.role||'professional'} to join our ${form.dept||'team'} at ${form.branch||'our office'}. The ideal candidate will have ${form.grade==='G6'||form.grade==='G7'?'5+ years':'3-5 years'} of relevant experience.`,
                            responsibilities:`• Lead and manage ${form.dept||'department'} operations and projects
• Collaborate with cross-functional teams to achieve organizational objectives
• Prepare reports and presentations for senior management
• Mentor and guide junior team members
• Ensure compliance with Nepal Labour Act 2074`,
                            requirements:`• ${form.grade==='G6'||form.grade==='G7'?'5+ years':'3-5 years'} of experience in ${form.dept||'the relevant field'}
• Bachelor's degree or higher in a related discipline
• Strong analytical and problem-solving skills
• Excellent communication in English and Nepali
• Proficiency in relevant tools and software`,
                            qualifications:`Minimum: Bachelor's degree in ${form.dept||'relevant field'}
Preferred: Master's degree or professional certification`,
                            skills:`Communication, Leadership, Teamwork, Problem Solving, ${form.dept||'Domain'} expertise`,
                            preferred:`Experience with Nepal Labour Act 2074, HRIS systems, bilingual (English/Nepali)`,
                            kra:`KRA 1: ${form.dept||'Dept'} performance targets
KRA 2: Team productivity and efficiency
KRA 3: Compliance and reporting
KPI: Monthly performance metrics as defined by HOD`
                          })
                          setAiJdLoading(false)
                          setAiJdGenerated(true)
                        },1800)
                      }} style={{padding:'7px 16px',borderRadius:8,border:'none',background:'#7c3aed',color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>
                        {aiJdLoading?'Generating...':'🤖 Generate JD from JRF'}
                      </button>
                    </div>
                    <div style={{fontSize:10,color:'#4c1d95'}}>AI will use the role, department, and grade from Step 1 to suggest a JD. You can edit all fields. This JD will be linked to KRA/KPI and OCR for screening.</div>
                    {aiJdGenerated&&<div style={{marginTop:6,fontSize:9,color:'#10b981',fontWeight:700}}>✅ AI JD generated from existing JD library — editing enabled</div>}
                  </div>
                  <div style={{display:'grid',gap:12}}>
                    {[['Role Summary','summary',3],['Responsibilities','responsibilities',4],['Requirements','requirements',4],['Qualifications','qualifications',2],['Key Skills (comma-separated)','skills',2],['Preferred Qualifications','preferred',2],['KRA / KPI Link','kra',3]].map(([l,f,rows])=>(
                      <div key={f}>
                        <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>{l}</label>
                        <textarea value={jdForm[f]} onChange={e=>setJdForm(p=>({...p,[f]:e.target.value}))} rows={rows}
                          placeholder={`Enter ${l.toLowerCase()}...`}
                          style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:10,outline:'none',resize:'vertical',fontFamily:'inherit',boxSizing:'border-box'}}/>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {step===4&&(
                <>
                  <div style={{fontSize:12,fontWeight:700,color:'#334155',marginBottom:12}}>Step 4: Review & Submit</div>
                  <div style={{background:'#f8fafc',borderRadius:12,padding:'14px 16px',marginBottom:12}}>
                    <div style={{fontSize:12,fontWeight:700,color:'#0f172a',marginBottom:10}}>Review Summary</div>
                    {[['Role',form.role],['Dept',form.dept],['Positions',form.positions],['Grade',form.grade],['Type',form.type],['Budget/mo','NPR '+form.budget]].map(([l,v])=>(
                      <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'4px 0',borderBottom:'1px solid #f1f5f9',fontSize:11}}>
                        <span style={{color:'#64748b'}}>{l}</span><span style={{fontWeight:700,color:'#0f172a'}}>{v}</span>
                      </div>
                    ))}
                  </div>
                  <AIImpact color={A} lines={['MRF routed to Dept Head > Finance > HR Manager for approval.','Vacancy auto-created on approval. Job posting triggered.','Nepal LA2074: Vacancy must be published on national newspaper + MoLESS portal.','AI will generate JD and screening criteria automatically.']}/>
                </>
              )}
              <div style={{display:'flex',gap:10,marginTop:8}}>
                {step>1&&<button onClick={()=>setStep(s=>s-1)} style={{padding:'12px 20px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Back</button>}
                {step<4
                  ? <button onClick={()=>setStep(s=>s+1)} style={{flex:1,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Next Step</button>
                  : <button onClick={()=>{setShowAdd(false);setStep(1)}} style={{flex:1,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Submit Requisition</button>
                }
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={CTX} onAction={(k,item)=>{if(k==='view')setSelected(item)}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Manpower Requisitions" columns={['MRF ID','Role','Dept','Branch','Grade','Type','Positions','Budget NPR','Status','Created On','SLA Date']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[NepHR Import]", f.name, result); }}/>}
      <Drawer item={selected} gradient={G} onClose={()=>setSelected(null)} rows={[
        ['MRF ID',selected?.id],['Role',selected?.role],['Department',selected?.dept],
        ['Branch',selected?.branch],['Grade',selected?.grade],['Type',selected?.type],
        ['Positions',selected?.positions],['Budget/mo','NPR '+(selected?.budget_npr||0)],
        ['Status',selected?.status],['Created',selected?.created_on],['SLA',selected?.sla_date],
        ['Justification',selected?.justification],
      ]}/>
    </div>
  )
}
