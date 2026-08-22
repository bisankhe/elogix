// FILE: CITLettersPage.jsx - Citizen Investment Trust (CIT) Letters (Workforce Operations > Letters)
// Account enrollment, fund contributions, loan endorsement, claim/withdrawal, detail updates

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#1e1b4b 0%,#4338ca 60%,#818cf8 100%)'
const A = '#4338ca'

const LETTER_TYPES = [
  {key:'account_enrollment',label:'Account Enrollment',icon:'🏦',color:'#4338ca'},
  {key:'fund_contribution',label:'Fund Contribution',icon:'💰',color:'#10b981'},
  {key:'loan_endorsement',label:'Loan Endorsement',icon:'🏠',color:'#f59e0b'},
  {key:'claim_withdrawal',label:'Claim / Withdrawal',icon:'📤',color:'#ef4444'},
  {key:'detail_update',label:'Detail Update',icon:'✏',color:'#7c3aed'},
]

const LETTERS = [
  { id:'c1', type:'fund_contribution', subject:'Monthly Provident Fund Contribution Statement - June 2025',
    employee:'All Employees (Batch)', reference_no:'CIT-CTB-2025-06', date_sent:'2025-07-02',
    amount_npr:842000, status:'acknowledged', cit_account:'Company Master A/C',
    impact_links:['Payroll Setup'] },
  { id:'c2', type:'loan_endorsement', subject:'Housing Loan Endorsement - Maya Pradhan',
    employee:'Maya Pradhan', reference_no:'CIT-LOAN-2025-0034', date_sent:'2025-06-15',
    amount_npr:850000, status:'submitted', cit_account:'CIT-IND-2019-44521',
    impact_links:['Employee Profile'] },
  { id:'c3', type:'claim_withdrawal', subject:'Fund Withdrawal Verification - Dipendra Yadav',
    employee:'Dipendra Yadav', reference_no:'CIT-WD-2025-0019', date_sent:'2025-07-11',
    amount_npr:286400, status:'acknowledged', cit_account:'CIT-IND-2024-88701',
    impact_links:['Full & Final Settlement','Exit Clearance'] },
]

const STATUS_CFG = {
  draft:{c:'#94a3b8',bg:'#f8fafc',icon:'📝',label:'Draft'},
  submitted:{c:'#3b82f6',bg:'#eff6ff',icon:'📤',label:'Submitted'},
  acknowledged:{c:'#10b981',bg:'#f0fdf4',icon:'✅',label:'Acknowledged'},
}

export default function CITLettersPage() {
  const [letters, setLetters] = useState(LETTERS)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = letters.filter(l=>{
    if (filterType!=='all'&&l.type!==filterType) return false
    if (search&&!l.employee.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })
  const totalContributions = letters.filter(l=>l.type==='fund_contribution').reduce((s,l)=>s+l.amount_npr,0)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🏦" title="Citizen Investment Trust (CIT) Letters"
        breadcrumb="Workforce Operations > Letters"
        gradient={G}
        stats={[
          {icon:'📋',label:'Total Letters',     value:letters.length},
          {icon:'💰',label:'Contributions YTD',  value:'NPR '+(totalContributions/1000).toFixed(0)+'K'},
          {icon:'🏠',label:'Loan Endorsements',  value:letters.filter(l=>l.type==='loan_endorsement').length},
          {icon:'✅',label:'Acknowledged',        value:letters.filter(l=>l.status==='acknowledged').length},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="Draft New Letter"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'#eef2ff',border:'1px solid #c7d2fe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#3730a3',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>🏦</span>
        <div><strong>Nagarik Lagani Kosh (CIT):</strong> Since CIT accounts are institutional, individual transactions, loan claims, and withdrawals require formal company endorsement. Letters ensure fund management remains compliant with Inland Revenue Department regulations and the Income Tax Act.</div>
      </div>

      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>
        <select value={filterType} onChange={e=>setFilterType(e.target.value)}
          style={{padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,color:'#475569',cursor:'pointer'}}>
          <option value="all">All Letter Types</option>
          {LETTER_TYPES.map(t=><option key={t.key} value={t.key}>{t.label}</option>)}
        </select>
      </div>

      <div style={{display:'grid',gap:12}}>
        {filtered.map(l=>{
          const sc = STATUS_CFG[l.status]
          const tc = LETTER_TYPES.find(t=>t.key===l.type)
          return (
            <div key={l.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:l.subject,...l}})}}
              style={{background:'#fff',border:`1.5px solid ${sc.c}33`,borderRadius:14,overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,.04)',borderLeft:`5px solid ${tc?.color}`}}>
              <div style={{display:'flex',alignItems:'center',gap:14,padding:'14px 18px',flexWrap:'wrap'}}>
                <div style={{width:42,height:42,borderRadius:12,background:`${tc?.color}15`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>{tc?.icon}</div>
                <div style={{flex:1}}>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:2}}>
                    <span style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{l.subject}</span>
                    <span style={{background:sc.bg,color:sc.c,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{sc.icon} {sc.label}</span>
                  </div>
                  <div style={{fontSize:10,color:'#64748b'}}>Ref: {l.reference_no} . A/C: {l.cit_account} . Sent {l.date_sent}</div>
                  {l.amount_npr&&<div style={{fontSize:9,color:A,marginTop:2,fontWeight:700}}>NPR {l.amount_npr.toLocaleString()}</div>}
                </div>
                <button style={{padding:'7px 14px',borderRadius:8,border:`1px solid ${A}33`,background:'#eef2ff',color:A,fontSize:11,fontWeight:600,cursor:'pointer',flexShrink:0}}>View / Download</button>
              </div>
            </div>
          )
        })}
      </div>

      {showAdd&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowAdd(false)}>
          <div style={{background:'#fff',borderRadius:20,width:640,maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Draft CIT Letter (AI-Assisted)</div></div>
            <div style={{padding:'22px 28px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
                <Field label="Letter Type" type="select" value="" onChange={()=>{}} accent={A} options={LETTER_TYPES.map(t=>t.label)}/>
                <Field label="Employee" type="select" value="" onChange={()=>{}} accent={A} options={['Sunita Rai','Hari Thapa']}/>
                <Field label="CIT Account Number" value="" onChange={()=>{}} accent={A}/>
                <Field label="Amount (NPR, if applicable)" type="number" value="" onChange={()=>{}} accent={A}/>
              </div>
              <Field label="Additional Notes" type="textarea" value="" onChange={()=>{}} accent={A} hint="Voice input supported"/>
              <AIImpact color={A} lines={['AI drafts using official CIT correspondence templates.','Loan endorsements auto-verify against accumulated balance records.','Withdrawal letters auto-confirm employment separation status.']}/>
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>setShowAdd(false)} style={{flex:1,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Generate Letter</button>
                <button onClick={()=>setShowAdd(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Letter',key:'view'},{icon:'📥',label:'Download PDF',key:'download'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},{icon:'📤',label:'Export',key:'export'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="CIT Letters" columns={['Subject','Type','Employee','CIT Account','Reference No','Amount NPR','Date Sent','Status']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
    </div>
  )
}
