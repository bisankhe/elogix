// FILE: DisciplinaryRecordsPage.jsx — Disciplinary Records (Employee Movement)
// 4 action types: Warning, Salary Deduction, Increment Withheld, Dismissal
// Full Case File functional, date inputs fixed
import { useState } from 'react'
import { ExcelModal, PageHeader, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#1c1917 0%,#7f1d1d 60%,#fca5a5 100%)'
const A = '#7f1d1d'

const PROGRESSIVE_STEPS = [
  {key:'warning',         label:'Warning',                        color:'#3b82f6', icon:'⚠️', num:1},
  {key:'salary_deduction',label:'Salary Deduction (1 day)',       color:'#f59e0b', icon:'💰', num:2},
  {key:'increment_withhold',label:'Increment/Promotion Withheld (1yr)',color:'#f97316',icon:'🚫',num:3},
  {key:'dismissal',       label:'Dismissal',                      color:'#dc2626', icon:'❌', num:4},
]

const RECORDS_INIT = [
  { id:'dr1', employee:'Sunil Magar', emp_id:'EMP-0042', position:'Sales Officer',
    action_type:'warning', incident_date:'2025-04-15', issued_date:'2025-04-18',
    show_cause_issued:true, employee_statement:'Acknowledged. Cited transportation issues and committed to improvement.',
    employee_signed:true, witness:'Dipak Tamang (Sales Head)', status:'closed',
    confidentiality:'hr_manager_only', deduction_days:0, withhold_months:0,
    impact_links:['Employee Timeline'] },
  { id:'dr2', employee:'Ram Bahadur Thapa', emp_id:'EMP-0067', position:'Driver',
    action_type:'salary_deduction', incident_date:'2025-06-02', issued_date:'2025-06-10',
    investigated_by:'Priya Adhikari (HR Manager)', deduction_days:1,
    show_cause_issued:true, employee_statement:'Disputed — claims verbal permission was given by prior supervisor (unverifiable).',
    employee_signed:false, witness:'Security Guard (CCTV evidence)', status:'under_review', withhold_months:0,
    confidentiality:'hr_manager_only', impact_links:['Employee Timeline'] },
  { id:'dr3', employee:'Dipendra Yadav', emp_id:'EMP-0091', position:'Junior Accountant',
    action_type:'dismissal', incident_date:'2025-05-20', issued_date:'2025-05-28',
    show_cause_issued:true, employee_statement:'No statement provided — employee did not respond within 7-day notice period.',
    employee_signed:false, witness:'Sanjay Karki (CFO)', status:'closed', withhold_months:0, deduction_days:0,
    confidentiality:'executive_only', impact_links:['Employee Timeline','Full & Final Settlement'] },
]

const STATUS_CFG = {
  closed:       {c:'#10b981',bg:'#f0fdf4',label:'Closed'},
  under_review: {c:'#f59e0b',bg:'#fffbeb',label:'Under Review'},
  appealed:     {c:'#3b82f6',bg:'#eff6ff',label:'Appealed'},

export default function DisciplinaryRecordsPage() {
  const [records, setRecords] = useState(RECORDS_INIT)
  const [search, setSearch]   = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [filterType, setFilterType] = useState('all')
  const [showAdd, setShowAdd]   = useState(false)
  const [showCase, setShowCase] = useState(null)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx]           = useState(null)
  const [msg, setMsg]           = useState('')
  const [form, setForm] = useState({
    employee:'',emp_id:'',position:'',action_type:'warning',incident_date:'',issued_date:'',
    infraction:'',investigated_by:'',employee_statement:'',witness:'',
    deduction_days:'1',withhold_months:'12',confidentiality:'hr_manager_only',
  })
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(''),3000) }

  if (!unlocked) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:400,fontFamily:'system-ui,sans-serif'}}>
      <div style={{background:'#fff',border:'2px solid #fecaca',borderRadius:20,padding:'40px 48px',textAlign:'center',maxWidth:440}}>
        <div style={{fontSize:42,marginBottom:14}}>🔒</div>
        <div style={{fontSize:16,fontWeight:900,color:'#0f172a',marginBottom:8}}>Restricted Access</div>
        <div style={{fontSize:12,color:'#64748b',marginBottom:20,lineHeight:1.6}}>Disciplinary records are confidential and accessible only to HR Admins and authorized management. Your access attempt will be logged.</div>
        <button onClick={()=>setUnlocked(true)} style={{padding:'12px 28px',borderRadius:12,border:'none',background:G,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>Verify HR Admin Access</button>
      </div>
    </div>
  )

  const filtered = records.filter(r=>{
    if (filterType!=='all'&&r.action_type!==filterType) return false
    if (search&&!r.employee.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const submitRecord = () => {
    if (!form.employee||!form.incident_date||!form.infraction) {
      notify('⚠️ Employee, incident date and infraction required'); return
    setRecords(prev=>[...prev,{
      id:'dr'+Date.now(),...form,
      deduction_days:parseInt(form.deduction_days)||1,
      withhold_months:parseInt(form.withhold_months)||12,
      show_cause_issued:true, employee_signed:false, status:'under_review',
      impact_links:['Employee Timeline']
    }])
    notify('✅ Disciplinary record created for '+form.employee+' — routed to HR Admin')
    setShowAdd(false)
    setForm({employee:'',emp_id:'',position:'',action_type:'warning',incident_date:'',issued_date:'',infraction:'',investigated_by:'',employee_statement:'',witness:'',deduction_days:'1',withhold_months:'12',confidentiality:'hr_manager_only'})

  return (
    <div onClick={()=>setCtx(null)} style={{fontFamily:'system-ui,sans-serif'}}>
      <PageHeader icon="🔐" title="Disciplinary Records"
        breadcrumb="Employee Lifecycle > Employee Records > Employee Movement"
        gradient={G}
        stats={[
          {icon:'📁',label:'Total Records', value:records.length},
          {icon:'✅',label:'Closed',         value:records.filter(r=>r.status==='closed').length},
          {icon:'⏳',label:'Under Review',  value:records.filter(r=>r.status==='under_review').length},
          {icon:'❌',label:'Dismissals',    value:records.filter(r=>r.action_type==='dismissal').length},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="+ New Record"
        onExcel={()=>setShowExcel(true)}/>

      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:360}}>{msg}</div>}

      <div style={{background:'#1c1917',color:'#fecaca',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,display:'flex',gap:10}}>
        <span style={{fontSize:18}}>⚖️</span>
        <div><strong>Nepal Labour Act 2074:</strong> Progressive discipline must follow: Written Warning → Salary Deduction (1 day) → Increment/Promotion Withheld (up to 1yr) → Dismissal. Show-cause notice mandatory. Employee must be given 7 days to respond. All records restricted to HR Admin.</div>
      </div>

      {/* Progressive discipline legend */}
      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        {PROGRESSIVE_STEPS.map(s=>(
          <button key={s.key} onClick={()=>setFilterType(filterType===s.key?'all':s.key)}
            style={{display:'flex',gap:6,alignItems:'center',padding:'6px 14px',borderRadius:20,cursor:'pointer',
              border:`2px solid ${filterType===s.key?s.color:s.color+'44'}`,
              background:filterType===s.key?`${s.color}15`:'#f8fafc'}}>
            <span style={{width:20,height:20,borderRadius:'50%',background:s.color,color:'#fff',fontSize:9,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center'}}>{s.num}</span>
            <span style={{fontSize:9,fontWeight:600,color:s.color}}>{s.label}</span>
          </button>
        ))}
        {filterType!=='all'&&<button onClick={()=>setFilterType('all')} style={{padding:'6px 14px',borderRadius:20,border:'1px solid #e2e8f0',background:'#fff',fontSize:9,cursor:'pointer',color:'#64748b'}}>✕ Clear Filter</button>}
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{display:'grid',gap:12,marginTop:14}}>
        {filtered.map(r=>{
          const sc = STATUS_CFG[r.status]||STATUS_CFG.under_review
          const step = PROGRESSIVE_STEPS.find(s=>s.key===r.action_type)
          return (
            <div key={r.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:r.employee,...r}})}}
              style={{background:'#fff',border:`1.5px solid ${step?.color}33`,borderRadius:14,overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,.04)',borderLeft:`5px solid ${step?.color}`}}>
              <div style={{display:'flex',alignItems:'flex-start',gap:14,padding:'14px 18px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap'}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:3}}>
                    <span style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{r.employee}</span>
                    <span style={{fontSize:10,color:'#94a3b8'}}>{r.emp_id}</span>
                    <span style={{background:sc.bg,color:sc.c,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{sc.label}</span>
                    <span style={{background:`${step?.color}15`,color:step?.color,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{step?.icon} {step?.label}</span>
                    {r.confidentiality==='executive_only'&&<span style={{background:'#1c1917',color:'#fca5a5',fontSize:8,fontWeight:700,padding:'2px 8px',borderRadius:20}}>🔒 Executive Only</span>}
                  </div>
                  <div style={{fontSize:10,color:'#64748b'}}>{r.position} · Incident: {r.incident_date} · Issued: {r.issued_date}</div>
                </div>
              </div>

              <div style={{padding:'10px 18px',fontSize:11,color:'#374151',borderBottom:'1px solid #f8fafc'}}>
                <strong>Infraction:</strong> {r.infraction}
              </div>

              {/* Action-specific details */}
              {r.action_type==='salary_deduction'&&r.deduction_days>0&&(
                <div style={{padding:'8px 18px',background:'#fffbeb',fontSize:10,color:'#92400e',borderBottom:'1px solid #f8fafc'}}>
                  💰 <strong>Salary Deduction:</strong> {r.deduction_days} working day(s) deducted from next payroll. Recorded in payroll system.
                </div>
              )}
              {r.action_type==='increment_withhold'&&(
                <div style={{padding:'8px 18px',background:'#fff7ed',fontSize:10,color:'#9a3412',borderBottom:'1px solid #f8fafc'}}>
                  🚫 <strong>Increment/Promotion Withheld:</strong> Annual increment and promotion eligibility suspended for {r.withhold_months||12} months from issued date.
                </div>
              )}
              {r.action_type==='dismissal'&&(
                <div style={{padding:'8px 18px',background:'#fef2f2',fontSize:10,color:'#991b1b',borderBottom:'1px solid #f8fafc'}}>
                  ❌ <strong>Dismissal:</strong> Employment terminated. Final settlement withheld pending legal review. Labour Office notification may be required.
                </div>
              )}

              <div style={{padding:'10px 18px',fontSize:10,color:'#64748b',borderBottom:'1px solid #f8fafc'}}>
                <div><strong>Investigated by:</strong> {r.investigated_by}</div>
                {r.witness&&<div style={{marginTop:2}}><strong>Witness:</strong> {r.witness}</div>}
                <div style={{marginTop:4,fontStyle:'italic'}}><strong>Employee Statement:</strong> {r.employee_statement}</div>
              </div>

              <div style={{padding:'10px 18px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span style={{fontSize:10}}>
                  {r.employee_signed
                    ? <span style={{color:'#10b981',fontWeight:700}}>✍️ Employee Acknowledged & Signed</span>
                    : <span style={{color:'#ef4444',fontWeight:700}}>✗ Signature Pending / Refused</span>}
                </span>
                <div style={{display:'flex',gap:6}}>
                  <button onClick={()=>setShowCase(r)} style={{padding:'6px 14px',borderRadius:8,border:`1px solid ${step?.color}33`,background:`${step?.color}10`,color:step?.color,fontSize:10,fontWeight:700,cursor:'pointer'}}>
                    📁 Full Case File
                  </button>
                  {!r.employee_signed&&<button onClick={()=>{setRecords(prev=>prev.map(x=>x.id===r.id?{...x,employee_signed:true}:x));notify('✅ Signature recorded for '+r.employee)}} style={{padding:'6px 14px',borderRadius:8,border:'none',background:A,color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>✍️ Record Signature</button>}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Full Case File Modal */}
      {showCase&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowCase(null)}>
          <div style={{background:'#fff',borderRadius:18,padding:0,width:600,maxWidth:'95vw',maxHeight:'90vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'16px 22px',borderRadius:'18px 18px 0 0',color:'#fff',display:'flex',justifyContent:'space-between'}}>
              <div>
                <div style={{fontSize:13,fontWeight:900}}>📁 Full Case File — {showCase.employee}</div>
                <div style={{fontSize:10,opacity:.8,marginTop:2}}>{PROGRESSIVE_STEPS.find(s=>s.key===showCase.action_type)?.label}</div>
              </div>
              <button onClick={()=>setShowCase(null)} style={{background:'rgba(255,255,255,.2)',border:'none',color:'#fff',borderRadius:8,padding:'4px 10px',cursor:'pointer'}}>✕</button>
            </div>
            <div style={{padding:'20px 24px'}}>
              {[
                ['Employee',showCase.employee+' ('+showCase.emp_id+')'],
                ['Position',showCase.position],
                ['Action Type',PROGRESSIVE_STEPS.find(s=>s.key===showCase.action_type)?.label],
                ['Incident Date',showCase.incident_date],
                ['Show Cause Issued',showCase.show_cause_issued?'Yes — 7-day response period given':'No'],
                ['Issued Date',showCase.issued_date],
                ['Investigated By',showCase.investigated_by],
                ['Witness',showCase.witness||'None recorded'],
                ['Confidentiality Level',showCase.confidentiality==='executive_only'?'Executive Only':'HR Manager Only'],
                ['Signature Status',showCase.employee_signed?'✅ Signed':'❌ Not Signed'],
                ['Status',showCase.status],
              ].map(([k,v])=>(
                <div key={k} style={{display:'flex',padding:'7px 0',borderBottom:'1px solid #f1f5f9',fontSize:10}}>
                  <span style={{color:'#64748b',width:160,flexShrink:0,fontWeight:600}}>{k}</span>
                  <span style={{fontWeight:700,color:'#0f172a'}}>{v}</span>
                </div>
              ))}
              <div style={{margin:'14px 0',background:'#f8fafc',borderRadius:10,padding:'12px 14px',fontSize:10,color:'#374151'}}>
                <div style={{fontWeight:700,marginBottom:6}}>Infraction Detail</div>
                {showCase.infraction}
              </div>
              <div style={{background:'#f5f3ff',borderRadius:10,padding:'12px 14px',fontSize:10,color:'#4c1d95',marginBottom:14}}>
                <div style={{fontWeight:700,marginBottom:6}}>Employee Statement</div>
                {showCase.employee_statement||'No statement provided.'}
              </div>
              {showCase.action_type==='salary_deduction'&&<div style={{background:'#fffbeb',borderRadius:10,padding:'10px 14px',fontSize:10,color:'#92400e',marginBottom:14}}>💰 Salary deduction of {showCase.deduction_days} day(s) to be processed in next payroll cycle per Nepal LA2074.</div>}
              {showCase.action_type==='increment_withhold'&&<div style={{background:'#fff7ed',borderRadius:10,padding:'10px 14px',fontSize:10,color:'#9a3412',marginBottom:14}}>🚫 Increment and promotion withheld for {showCase.withhold_months||12} months. Annual review cycle updated.</div>}
              {showCase.action_type==='dismissal'&&<div style={{background:'#fef2f2',borderRadius:10,padding:'10px 14px',fontSize:10,color:'#991b1b',marginBottom:14}}>❌ Employment terminated per Nepal LA2074 Section 52(e). Labour Office notification filed. Full & final settlement on hold pending review.</div>}
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>notify('📥 Case file downloaded as PDF')} style={{flex:1,padding:'10px',borderRadius:10,border:'none',background:G,color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>📥 Download Case File PDF</button>
                <button onClick={()=>setShowCase(null)} style={{padding:'10px 18px',borderRadius:10,border:'1px solid #e2e8f0',background:'#fff',fontSize:11,cursor:'pointer'}}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Record Modal */}
      {showAdd&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowAdd(false)}>
          <div style={{background:'#fff',borderRadius:20,width:680,maxHeight:'92vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px',borderRadius:'20px 20px 0 0'}}>
              <div style={{fontSize:17,fontWeight:900,color:'#fff'}}>New Disciplinary Record</div>
            </div>
            <div style={{padding:'22px 28px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
                {[['Employee Name *','employee','text'],['Employee ID','emp_id','text'],
                  ['Position','position','text'],['Incident Date *','incident_date','date'],
                  ['Issued Date','issued_date','date'],['Investigated By','investigated_by','text'],
                  ['Witness','witness','text'],
                ].map(([l,f,t])=>(
                  <div key={f}>
                    <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>{l}</label>
                    <input type={t} value={form[f]} onChange={e=>setForm(p=>({...p,[f]:e.target.value}))}
                      style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                  </div>
                ))}
                <div>
                  <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Confidentiality Level</label>
                  <select value={form.confidentiality} onChange={e=>setForm(p=>({...p,confidentiality:e.target.value}))}
                    style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',background:'#fff',boxSizing:'border-box'}}>
                    <option value="hr_manager_only">HR Manager Only</option>
                    <option value="executive_only">Executive Only</option>
                  </select>
                </div>
              </div>

              {/* Action type with visual selector */}
              <div style={{marginBottom:16}}>
                <div style={{fontSize:10,fontWeight:700,color:'#374151',marginBottom:8}}>Action Type (Progressive Discipline)</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
                  {PROGRESSIVE_STEPS.map(s=>(
                    <div key={s.key} onClick={()=>setForm(p=>({...p,action_type:s.key}))}
                      style={{padding:'10px 8px',borderRadius:10,border:`2px solid ${form.action_type===s.key?s.color:'#e2e8f0'}`,
                        background:form.action_type===s.key?`${s.color}12`:'#fff',cursor:'pointer',textAlign:'center'}}>
                      <div style={{fontSize:18,marginBottom:4}}>{s.icon}</div>
                      <div style={{fontSize:8,fontWeight:700,color:form.action_type===s.key?s.color:'#64748b',lineHeight:1.3}}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {form.action_type==='salary_deduction'&&(
                <div style={{marginBottom:12}}>
                  <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Deduction Days</label>
                  <input type="number" min="1" max="3" value={form.deduction_days} onChange={e=>setForm(p=>({...p,deduction_days:e.target.value}))}
                    style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                </div>
              )}
              {form.action_type==='increment_withhold'&&(
                <div style={{marginBottom:12}}>
                  <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Withhold Period (months)</label>
                  <select value={form.withhold_months} onChange={e=>setForm(p=>({...p,withhold_months:e.target.value}))}
                    style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',background:'#fff',boxSizing:'border-box'}}>
                    {['6','12','18','24'].map(m=><option key={m} value={m}>{m} months</option>)}
                  </select>
                </div>
              )}

              {[['Infraction Description *','infraction',4],['Investigation Notes / Evidence','investigated_by_notes',3],['Employee Statement / Rebuttal','employee_statement',3]].map(([l,f,rows])=>(
                <div key={f} style={{marginBottom:12}}>
                  <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>{l}</label>
                  <textarea value={form[f]||''} onChange={e=>setForm(p=>({...p,[f]:e.target.value}))} rows={rows}
                    style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:10,outline:'none',resize:'vertical',fontFamily:'inherit',boxSizing:'border-box'}}/>
                </div>
              ))}

              <div style={{display:'flex',gap:10}}>
                <button onClick={submitRecord} style={{flex:1,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>📁 Create Disciplinary Record</button>
                <button onClick={()=>setShowAdd(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',fontSize:12,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'📁',label:'Full Case File',key:'case'},{icon:'✍️',label:'Record Signature',key:'sign'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},{icon:'📤',label:'Export',key:'export'},
      ]} onAction={(k,item)=>{if(k==='case')setShowCase(item)}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Disciplinary Records" columns={['Employee','Emp ID','Position','Action Type','Incident Date','Issued Date','Status','Signed']} onClose={()=>setShowExcel(false)} onImport={()=>{}}/>}
    </div>
  )
