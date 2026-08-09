// FILE: PromotionHistoryPage.jsx - Promotion & History (Employee Movement)
// Objective competency-based criteria, wizard-driven workflow, org-chart auto-update

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, LuxCard, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#052e16 0%,#15803d 60%,#86efac 100%)'
const A = '#15803d'

const PROMOTIONS = [
  { id:'p1', employee:'Bikash Shrestha', from_title:'IT Lead', to_title:'Senior IT Lead', dept:'Information Technology',
    effective_date:'2025-06-01', old_salary:120000, new_salary:150000,
    competencies:[{name:'Technical Leadership',score:5},{name:'Team Management',score:5},{name:'Strategic Thinking',score:4}],
    rationale:'Consistently exceeded KPIs for 3 consecutive quarters. Led successful cloud migration project. Strong mentor to junior engineers.',
    approved_by:'Rajesh Sharma (CTO)', digital_signoff:true, status:'completed', ai_bias_check:'passed',
    impact_links:['Employee Timeline','Employment History','Org Chart'] },
  { id:'p2', employee:'Anita Gurung', from_title:'Developer', to_title:'Senior Developer', dept:'Information Technology',
    effective_date:'2025-07-01', old_salary:75000, new_salary:95000,
    competencies:[{name:'Code Quality',score:5},{name:'Problem Solving',score:4},{name:'Collaboration',score:5}],
    rationale:'Top performer in Q1-Q2 2025 reviews. Successfully led 2 major feature releases with zero production incidents.',
    approved_by:'Bikash Shrestha (Senior IT Lead)', digital_signoff:false, status:'pending_approval', ai_bias_check:'passed',
    impact_links:['Employee Timeline'] },
  { id:'p3', employee:'Sandeep Tamang', from_title:'Junior Accountant', to_title:'Accountant', dept:'Finance & Accounts',
    effective_date:'2025-05-15', old_salary:40000, new_salary:52000,
    competencies:[{name:'Accuracy',score:5},{name:'Reporting',score:4},{name:'Compliance Knowledge',score:5}],
    rationale:'Completed CA Articleship. Demonstrated strong ownership of monthly close process.',
    approved_by:'Sanjay Karki (CFO)', digital_signoff:true, status:'completed', ai_bias_check:'passed',
    impact_links:['Employee Timeline','Employment History'] },
]

const STATUS_CFG = {
  completed:{c:'#10b981',bg:'#f0fdf4',icon:'✅',label:'Completed'},
  pending_approval:{c:'#f59e0b',bg:'#fffbeb',icon:'⏳',label:'Pending Approval'},
}

export default function PromotionHistoryPage() {
  const [promotions, setPromotions] = useState(PROMOTIONS)

  const [form, setForm] = useState({})
  const [msg, setMsg] = useState("")
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(""),3000) }
  const [search, setSearch] = useState('')
  const [showWizard, setShowWizard] = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)
  const [selected, setSelected] = useState(null)
  const [wizStep, setWizStep] = useState(1)

  const filtered = promotions.filter(p=>!search||p.employee.toLowerCase().includes(search.toLowerCase()))
  const avgRaise = Math.round(promotions.reduce((s,p)=>s+((p.new_salary-p.old_salary)/p.old_salary*100),0)/promotions.length)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📈" title="Promotion & History"
        breadcrumb="Employee Lifecycle > Employee Records > Employee Movement"
        gradient={G}
        stats={[
          {icon:'📈',label:'Total Promotions', value:promotions.length},
          {icon:'✅',label:'Completed',         value:promotions.filter(p=>p.status==='completed').length},
          {icon:'⏳',label:'Pending Approval',  value:promotions.filter(p=>p.status==='pending_approval').length},
          {icon:'💰',label:'Avg Salary Raise',  value:avgRaise+'%'},
        ]}
        onAdd={()=>{setShowWizard(true);setWizStep(1)}} addLabel="New Promotion"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>⚖</span>
        <div><strong>Nepal Labour Act 2074:</strong> Promotions must be based on performance, capacity, educational qualification, and seniority. AI bias-check screens for patterns suggesting favoritism over objective competency data before approval.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{display:'grid',gap:14,marginTop:14}}>
        {filtered.map(p=>{
          const sc = STATUS_CFG[p.status]
          const raisePct = Math.round((p.new_salary-p.old_salary)/p.old_salary*100)
          return (
            <div key={p.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:p.employee,...p}})}}
              style={{background:'#fff',border:`1.5px solid ${sc.c}33`,borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${sc.c}`}}>
              <div style={{display:'flex',alignItems:'center',gap:14,padding:'16px 20px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap'}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:4}}>
                    <span style={{fontSize:14,fontWeight:900,color:'#0f172a'}}>{p.employee}</span>
                    <span style={{background:sc.bg,color:sc.c,fontSize:10,fontWeight:700,padding:'2px 10px',borderRadius:20}}>{sc.icon} {sc.label}</span>
                    <span style={{background:'#f0fdf4',color:'#15803d',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>✓ AI Bias Check Passed</span>
                  </div>
                  <div style={{fontSize:12,color:'#334155',fontWeight:600}}>{p.from_title} {'>'} {p.to_title}</div>
                  <div style={{fontSize:10,color:'#64748b',marginTop:2}}>{p.dept} . Effective {p.effective_date}</div>
                </div>
                <div style={{textAlign:'center',flexShrink:0}}>
                  <div style={{fontSize:18,fontWeight:900,color:'#10b981'}}>+{raisePct}%</div>
                  <div style={{fontSize:8,color:'#94a3b8',fontWeight:700}}>SALARY RAISE</div>
                </div>
              </div>

              <div style={{padding:'12px 20px',display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,borderBottom:'1px solid #f8fafc'}}>
                {p.competencies.map((c,i)=>(
                  <div key={i} style={{textAlign:'center',background:'#f8fafc',borderRadius:8,padding:'8px 4px'}}>
                    <div style={{fontSize:14,fontWeight:900,color:c.score>=4?'#10b981':'#f59e0b'}}>{c.score}/5</div>
                    <div style={{fontSize:8,color:'#94a3b8',fontWeight:600}}>{c.name}</div>
                  </div>
                ))}
              </div>

              <div style={{padding:'10px 20px',fontSize:10,color:'#64748b',fontStyle:'italic',borderBottom:'1px solid #f8fafc'}}>
                <strong>Rationale:</strong> {p.rationale}
              </div>

              <div style={{padding:'10px 20px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span style={{fontSize:10,color:'#64748b'}}>Approved by: <strong>{p.approved_by}</strong> {p.digital_signoff?'. ✓ Digitally signed':'. Awaiting signature'}</span>
                <button onClick={()=>setSelected(p)} style={{padding:'6px 14px',borderRadius:8,border:`1px solid ${A}33`,background:'#f0fdf4',color:A,fontSize:11,fontWeight:600,cursor:'pointer'}}>Full Details</button>
              </div>
            </div>
          )
        })}
      </div>

      {showWizard&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowWizard(false)}>
          <div style={{background:'#fff',borderRadius:20,width:680,maxHeight:'92vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}>
              <div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Promotion Wizard</div>
              <div style={{display:'flex',gap:4,marginTop:10}}>{[1,2,3].map(s=><div key={s} style={{flex:1,height:4,borderRadius:4,background:s<=wizStep?'rgba(255,255,255,.9)':'rgba(255,255,255,.3)'}}/>)}</div>
              <div style={{fontSize:11,color:'rgba(255,255,255,.7)',marginTop:4}}>Step {wizStep} of 3: {['Role & Compensation','Competency Scoring','Review & Approve'][wizStep-1]}</div>
            </div>
            <div style={{padding:'22px 28px'}}>
              {wizStep===1&&(
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
                  <div><label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Employee</label><select value={form.employee||''} onChange={e=>setForm(p=>({...p,employee:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',background:'#fff',boxSizing:'border-box'}}>{['Anita Gurung','Sandeep Tamang'].map(o=><option key={o} value={o}>{o}</option>)}</select></div>
                  <div><label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>New Title</label><input type="text" value={form.new_title||''} onChange={e=>setForm(p=>({...p,new_title:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/></div>
                  <div><label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Effective Date</label><input type="date" value={form.effective_date||''} onChange={e=>setForm(p=>({...p,effective_date:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/></div>
                  <div><label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>New Salary (NPR)</label><input type="number" value={form.new_salary_npr||''} onChange={e=>setForm(p=>({...p,new_salary_npr:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/></div>
                </div>
              )}
              {wizStep===2&&(
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:'#334155',marginBottom:10}}>Score Objective Competencies (1-5) - avoids subjective bias</div>
                  {['Technical/Functional Skill','Leadership/Initiative','Performance vs KPIs'].map(c=>(
                    <div><label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Field</label><input type="text" value={form.field||''} onChange={e=>setForm(p=>({...p,field:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/></div>
                  ))}
                  <div><label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Rationale</label><textarea value={form.rationale||''} onChange={e=>setForm(p=>({...p,rationale:e.target.value}))} rows={3} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',resize:'vertical',fontFamily:'inherit',boxSizing:'border-box'}}/></div>
                </div>
              )}
              {wizStep===3&&(
                <div>
                  <div style={{background:'#f0fdf4',borderRadius:12,padding:'16px',marginBottom:14}}>
                    <div style={{fontSize:12,fontWeight:700,color:'#065f46',marginBottom:6}}>🤖 AI Bias Check</div>
                    <div style={{fontSize:11,color:'#374151'}}>Scanned for: gender/demographic correlation, tenure-only bias, missing performance data. Result: <strong style={{color:'#10b981'}}>No bias indicators detected.</strong></div>
                  </div>
                  <AIImpact color={A} lines={['Org chart auto-updates with new title/reporting line.','Salary change syncs to Payroll module.','Permanently logged in Employee Timeline.']}/>
                </div>
              )}
              <div style={{display:'flex',gap:10,marginTop:16}}>
                {wizStep>1&&<button onClick={()=>setWizStep(s=>s-1)} style={{padding:'13px 20px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Back</button>}
                <button onClick={()=>wizStep<3?setWizStep(s=>s+1):setShowWizard(false)} style={{flex:1,padding:13,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>
                  {wizStep<3?'Continue':'Submit for Approval'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:400}}>{msg}</div>}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Details',key:'view'},{icon:'✍',label:'Digital Sign-off',key:'sign'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},{icon:'📤',label:'Export',key:'export'},
      ]} onAction={(k,item)=>{if(k==='view')setSelected(item)}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Promotion History" columns={['Employee','From Title','To Title','Department','Effective Date','Old Salary','New Salary','Approved By','Status']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[NepHR Import]", f.name, result); }}/>}
    </div>
  )
}
