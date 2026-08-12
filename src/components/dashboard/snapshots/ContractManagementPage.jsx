// FILE: ContractManagementPage.jsx - Contract Management AI-Driven (Employee Documents)
// AI clause flagging, expiry alerts, e-sign tracking, version control

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, LuxCard, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#1e1b4b 0%,#4338ca 60%,#818cf8 100%)'
const A = '#4338ca'

const CONTRACTS = [
  { id:'c1', employee:'Gita Maharjan', position:'Cloud Architect', type:'Regular', version:'v1.0',
    start_date:'2025-06-23', end_date:null, probation_end:'2025-12-23', salary_npr:180000,
    status:'active', esign_status:'signed', signed_date:'2025-06-15',
    ai_clause_flags:[], ai_compliance_score:98,
    impact_links:['Digital Employee File','Employment History'] },
  { id:'c2', employee:'Hari Thapa', position:'DevOps Engineer', type:'Regular', version:'v1.0',
    start_date:'2025-05-20', end_date:null, probation_end:'2025-11-20', salary_npr:95000,
    status:'active', esign_status:'signed', signed_date:'2025-05-18',
    ai_clause_flags:[], ai_compliance_score:96,
    impact_links:['Digital Employee File'] },
  { id:'c3', employee:'Priya Khadka', position:'Sales Executive', type:'Time-Bound', version:'v1.0',
    start_date:'2025-01-05', end_date:'2025-07-05', probation_end:'2025-07-05', salary_npr:55000,
    status:'expiring_soon', esign_status:'signed', signed_date:'2025-01-03',
    ai_clause_flags:['Contract end date in 14 days - renewal decision needed'], ai_compliance_score:92,
    impact_links:['Digital Employee File','Confirmation or Termination'] },
  { id:'c4', employee:'Ramesh Bahadur Shrestha', position:'Security Guard (Vendor)', type:'Vendor-Supplied', version:'v1.0',
    start_date:'2025-07-01', end_date:'2026-06-30', probation_end:null, salary_npr:null,
    status:'draft', esign_status:'pending', signed_date:null,
    ai_clause_flags:['Billing rate clause missing PO reference','Vendor license number not auto-validated'], ai_compliance_score:71,
    impact_links:['Vendor Profile'] },
]

const STATUS_CFG = {
  active:        {c:'#10b981',bg:'#f0fdf4',icon:'✅',label:'Active'},
  expiring_soon: {c:'#f59e0b',bg:'#fffbeb',icon:'⏰',label:'Expiring Soon'},
  draft:         {c:'#94a3b8',bg:'#f8fafc',icon:'📝',label:'Draft'},
  expired:       {c:'#ef4444',bg:'#fef2f2',icon:'🚫',label:'Expired'},
}

export default function ContractManagementPage() {
  const [contracts, setContracts] = useState(CONTRACTS)

  const [form, setForm] = useState({})
  const [msg, setMsg] = useState("")
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(""),3000) }
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = contracts.filter(c=>{
    if (filterStatus!=='all'&&c.status!==filterStatus) return false
    if (search&&!c.employee.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const expiringCount = contracts.filter(c=>c.status==='expiring_soon').length
  const flaggedCount = contracts.filter(c=>c.ai_clause_flags.length>0).length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📜" title="Contract Management AI-Driven"
        breadcrumb="Employee Lifecycle > Employee Records > Employee Documents"
        gradient={G}
        stats={[
          {icon:'📜',label:'Total Contracts', value:contracts.length},
          {icon:'✅',label:'Active',           value:contracts.filter(c=>c.status==='active').length},
          {icon:'⏰',label:'Expiring Soon',    value:expiringCount},
          {icon:'⚠',label:'AI Flagged',       value:flaggedCount},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="New Contract"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'linear-gradient(135deg,#eef2ff,#f5f3ff)',border:'1px solid #c7d2fe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#3730a3',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>🤖</span>
        <div><strong>AI Contract Lifecycle Management:</strong> Continuously scans for upcoming expirations, flags non-standard or missing clauses, validates against Nepal Labour Act 2074 mandatory clauses (job title, remuneration, hours, probation ≤6mo). Human review required before finalizing AI-flagged contracts.</div>
      </div>

      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>
        <div style={{display:'flex',gap:4,background:'#f1f5f9',padding:3,borderRadius:9}}>
          {['all','active','expiring_soon','draft','expired'].map(s=>(
            <button key={s} onClick={()=>setFilterStatus(s)}
              style={{padding:'7px 12px',borderRadius:7,border:'none',cursor:'pointer',fontSize:10,
                background:filterStatus===s?'#fff':'transparent',color:filterStatus===s?A:'#64748b',
                fontWeight:filterStatus===s?700:400,boxShadow:filterStatus===s?'0 1px 3px rgba(0,0,0,.08)':'none'}}>
              {s==='all'?'All':STATUS_CFG[s]?.label||s}
            </button>
          ))}
        </div>
      </div>

      <div style={{display:'grid',gap:14}}>
        {filtered.map(c=>{
          const sc = STATUS_CFG[c.status]
          const daysToExpiry = c.end_date ? Math.ceil((new Date(c.end_date)-new Date('2025-06-21'))/(1000*60*60*24)) : null
          return (
            <div key={c.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:c.employee,...c}})}}
              style={{background:'#fff',border:`1.5px solid ${c.ai_clause_flags.length>0?'#fecaca':sc.c+'33'}`,borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${sc.c}`}}>
              <div style={{display:'flex',alignItems:'center',gap:14,padding:'16px 20px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap'}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:3}}>
                    <span style={{fontSize:14,fontWeight:900,color:'#0f172a'}}>{c.employee}</span>
                    <span style={{background:sc.bg,color:sc.c,fontSize:10,fontWeight:700,padding:'2px 10px',borderRadius:20}}>{sc.icon} {sc.label}</span>
                    <span style={{background:'#f5f3ff',color:'#7c3aed',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{c.type}</span>
                  </div>
                  <div style={{fontSize:11,color:'#64748b'}}>{c.position} . {c.version} . Start {c.start_date}{c.end_date?` . End ${c.end_date}`:' . Open-ended'}</div>
                  {daysToExpiry&&daysToExpiry<=30&&<div style={{fontSize:10,color:'#ef4444',fontWeight:700,marginTop:2}}>⏰ Expires in {daysToExpiry} days</div>}
                </div>
                <div style={{textAlign:'center',flexShrink:0}}>
                  <div style={{fontSize:18,fontWeight:900,color:c.ai_compliance_score>=90?'#10b981':c.ai_compliance_score>=75?'#f59e0b':'#ef4444'}}>{c.ai_compliance_score}</div>
                  <div style={{fontSize:8,color:'#94a3b8',fontWeight:700}}>COMPLIANCE</div>
                </div>
              </div>

              <div style={{padding:'10px 20px',display:'flex',gap:16,flexWrap:'wrap',borderBottom:'1px solid #f8fafc'}}>
                <span style={{fontSize:10,color:'#64748b'}}>💰 {c.salary_npr?`NPR ${c.salary_npr.toLocaleString()}/mo`:'See SLA/billing rate'}</span>
                <span style={{fontSize:10,color:'#64748b'}}>{c.probation_end?`Probation until ${c.probation_end}`:'No probation (vendor)'}</span>
                <span style={{fontSize:10}}>
                  <span style={{color:c.esign_status==='signed'?'#10b981':'#f59e0b',fontWeight:700}}>{c.esign_status==='signed'?'✓ e-Signed':'⏳ Pending Signature'}</span>
                  {c.signed_date&&` (${c.signed_date})`}
                </span>
              </div>

              {c.ai_clause_flags.length>0&&(
                <div style={{padding:'10px 20px',background:'#fef2f2'}}>
                  <div style={{fontSize:10,fontWeight:700,color:'#991b1b',marginBottom:4}}>⚠ AI Flagged Issues:</div>
                  {c.ai_clause_flags.map((f,i)=><div key={i} style={{fontSize:10,color:'#991b1b'}}>- {f}</div>)}
                </div>
              )}

              <div style={{padding:'8px 14px',display:'flex',gap:8,justifyContent:'flex-end'}}>
                <button style={{padding:'7px 14px',borderRadius:8,border:`1px solid ${A}33`,background:'#eff6ff',color:A,fontSize:11,fontWeight:600,cursor:'pointer'}}>View Contract</button>
                {c.status==='expiring_soon'&&<button style={{padding:'7px 14px',borderRadius:8,border:'none',background:G,color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>Draft Renewal (AI)</button>}
                {c.esign_status==='pending'&&<button style={{padding:'7px 14px',borderRadius:8,border:'none',background:'#f59e0b',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>Send for e-Sign</button>}
              </div>
            </div>
          )
        })}
      </div>

      {showAdd&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowAdd(false)}>
          <div style={{background:'#fff',borderRadius:20,width:680,maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Generate Contract (AI-Assisted)</div></div>
            <div style={{padding:'22px 28px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
                <div><label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Employee</label><select value={form.employee||''} onChange={e=>setForm(p=>({...p,employee:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',background:'#fff',boxSizing:'border-box'}}>{['Sunita Rai','Priya Khadka'].map(o=><option key={o} value={o}>{o}</option>)}</select></div>
                <div><label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Contract Type</label><select value={form.contract_type||''} onChange={e=>setForm(p=>({...p,contract_type:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',background:'#fff',boxSizing:'border-box'}}>{['Regular','Time-Bound','Work-Based','Part-Time','Casual'].map(o=><option key={o} value={o}>{o}</option>)}</select></div>
                <div><label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Start Date</label><input type="date" value={form.start_date||''} onChange={e=>setForm(p=>({...p,start_date:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/></div>
                <div><label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>End Date (if applicable)</label><input type="date" value={form.end_date_if_applicable||''} onChange={e=>setForm(p=>({...p,end_date_if_applicable:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/></div>
                <div><label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Salary (NPR)</label><input type="number" value={form.salary_npr||''} onChange={e=>setForm(p=>({...p,salary_npr:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/></div>
                <div><label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Language</label><select value={form.language||''} onChange={e=>setForm(p=>({...p,language:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',background:'#fff',boxSizing:'border-box'}}>{['English','Nepali','Both (Bilingual)'].map(o=><option key={o} value={o}>{o}</option>)}</select></div>
              </div>
              <AIImpact color={A} lines={['AI pre-populates mandatory LA2074 clauses (job title, hours, probation, leave).','AI scans for missing/non-standard clauses before finalizing.','e-Signature workflow auto-triggers on approval.','Bilingual generation maintains legal terminology consistency.']}/>
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>setShowAdd(false)} style={{flex:1,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Generate Draft Contract</button>
                <button onClick={()=>setShowAdd(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:400}}>{msg}</div>}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Contract',key:'view'},{icon:'✏',label:'Draft Amendment',key:'amend'},
        {icon:'🔄',label:'Draft Renewal (AI)',key:'renew'},{icon:'📤',label:'Send for e-Sign',key:'esign'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},{icon:'📤',label:'Export',key:'export'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Contracts" columns={['Employee','Position','Type','Start Date','End Date','Salary NPR','Status','e-Sign Status','Compliance Score']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
    </div>
  )
}
