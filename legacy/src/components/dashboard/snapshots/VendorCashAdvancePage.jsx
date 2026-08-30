// FILE: VendorCashAdvancePage.jsx - Cash Advance (Vendor Employees)
// Finance module with payroll deduction, approval matrix, AI fraud detection

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, Badge, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#713f12 0%,#d97706 60%,#fbbf24 100%)'
const A = '#d97706'

const ADVANCES = [
  { id:'ca1', request_no:'CA-2025-012', emp_id:'VE-001', emp_name:'Ramesh Bahadur Shrestha',
    vendor:'ShieldGuard Nepal', role:'Security Guard',
    amount_requested:10000, amount_approved:8000, monthly_wage:18500,
    purpose:'Medical emergency - hospitalization of family member',
    purpose_category:'medical_emergency',
    disbursement_date:'2025-06-20',
    repayment_months:4, repayment_per_month:2000,
    status:'approved', applied_on:'2025-06-16',
    approval_chain:[
      {role:'Vendor HR',name:'Manisha Shrestha',status:'approved',date:'2025-06-16'},
      {role:'HR Manager',name:'Priya Adhikari',status:'approved',date:'2025-06-17'},
      {role:'Finance',name:'Sanjay Karki',status:'approved',date:'2025-06-17'},
    ],
    ai_risk_score:15, ai_recommendation:'Low risk. Medical emergency verified. Wage-to-advance ratio safe (43%).',
    outstanding_balance:8000, paid_back:0,
    impact_links:['Payroll','Billing','Vendor Profile'] },
  { id:'ca2', request_no:'CA-2025-009', emp_id:'VE-002', emp_name:'Sunita Gurung',
    vendor:'CleanPro Services', role:'Housekeeper',
    amount_requested:5000, amount_approved:5000, monthly_wage:16500,
    purpose:'School fee payment for children',
    purpose_category:'education',
    disbursement_date:'2025-06-05',
    repayment_months:2, repayment_per_month:2500,
    status:'disbursed', applied_on:'2025-06-01',
    approval_chain:[
      {role:'Vendor HR',name:'Nita KC',status:'approved',date:'2025-06-02'},
      {role:'HR Manager',name:'Priya Adhikari',status:'approved',date:'2025-06-03'},
      {role:'Finance',name:'Sanjay Karki',status:'disbursed',date:'2025-06-05'},
    ],
    ai_risk_score:10, ai_recommendation:'Very low risk. Purpose verified. On-time repayment expected.',
    outstanding_balance:2500, paid_back:2500,
    impact_links:['Payroll','Billing'] },
  { id:'ca3', request_no:'CA-2025-014', emp_id:'VE-003', emp_name:'Bikash Tamang',
    vendor:'TechStaff Solutions', role:'IT Helpdesk L1',
    amount_requested:25000, amount_approved:null, monthly_wage:22000,
    purpose:'House construction - roof repair',
    purpose_category:'personal',
    disbursement_date:null,
    repayment_months:null, repayment_per_month:null,
    status:'pending', applied_on:'2025-06-15',
    approval_chain:[
      {role:'Vendor HR',name:'Anil KC',status:'pending',date:null},
      {role:'HR Manager',name:'Priya Adhikari',status:'pending',date:null},
      {role:'Finance',name:'Sanjay Karki',status:'pending',date:null},
    ],
    ai_risk_score:72, ai_recommendation:'HIGH RISK: Amount (NPR 25,000) exceeds 1.5x monthly wage. BGV flagged. Reject or reduce to NPR 15,000 max.',
    outstanding_balance:0, paid_back:0,
    impact_links:['HR Policy','Finance Alert','Vendor Profile'] },
  { id:'ca4', request_no:'CA-2025-007', emp_id:'VE-005', emp_name:'Hari Prasad Rai',
    vendor:'ShieldGuard Nepal', role:'Security Guard',
    amount_requested:7500, amount_approved:7500, monthly_wage:18000,
    purpose:'Festival expenses - Dashain',
    purpose_category:'festival',
    disbursement_date:'2025-09-25',
    repayment_months:3, repayment_per_month:2500,
    status:'pending_disbursement', applied_on:'2025-06-14',
    approval_chain:[
      {role:'Vendor HR',name:'Manisha Shrestha',status:'approved',date:'2025-06-15'},
      {role:'HR Manager',name:'Priya Adhikari',status:'approved',date:'2025-06-16'},
      {role:'Finance',name:'Sanjay Karki',status:'pending',date:null},
    ],
    ai_risk_score:22, ai_recommendation:'Low risk. Festival advance is common practice. Approve.',
    outstanding_balance:7500, paid_back:0,
    impact_links:['Payroll','Billing','Vendor Profile'] },
]

const STATUS_CFG = {
  pending:              {c:'#f59e0b',bg:'#fffbeb',b:'#fde68a',icon:'⏳',label:'Pending'},
  approved:             {c:'#3b82f6',bg:'#eff6ff',b:'#bfdbfe',icon:'✅',label:'Approved'},
  pending_disbursement: {c:'#8b5cf6',bg:'#f5f3ff',b:'#c4b5fd',icon:'💸',label:'Pending Disbursal'},
  disbursed:            {c:'#10b981',bg:'#f0fdf4',b:'#bbf7d0',icon:'💰',label:'Disbursed'},
  rejected:             {c:'#ef4444',bg:'#fef2f2',b:'#fecaca',icon:'❌',label:'Rejected'},
  fully_repaid:         {c:'#64748b',bg:'#f8fafc',b:'#e2e8f0',icon:'✓',label:'Fully Repaid'},
}
const CHAIN_STATUS = {
  approved:   {c:'#10b981',icon:'✓'},
  pending:    {c:'#f59e0b',icon:'⏳'},
  rejected:   {c:'#ef4444',icon:'✗'},
  disbursed:  {c:'#3b82f6',icon:'💸'},
}
const CTX_ACTIONS = [
  {icon:'✅',label:'Approve Advance',      key:'approve'},
  {icon:'💸',label:'Mark as Disbursed',    key:'disburse'},
  {icon:'📊',label:'View Repayment Plan',  key:'repayment'},
  {icon:'📋',label:'View Policy Limits',   key:'policy'},
  {icon:'🔗',label:'Impact Analysis',      key:'impact'},
  {icon:'📤',label:'Export',               key:'export'},
  {icon:'❌',label:'Reject Advance',       key:'reject', danger:true},
]

export default function VendorCashAdvancePage() {
  const [advances, setAdvances] = useState(ADVANCES)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)
  const [form, setForm] = useState({emp_id:'',amount:'',purpose:'',purpose_category:'medical_emergency',disbursement_date:'',repayment_months:'3'})

  const filtered = advances.filter(a=>{
    if (filterStatus!=='all'&&a.status!==filterStatus) return false
    if (search&&!a.emp_name.toLowerCase().includes(search.toLowerCase())&&!a.request_no.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const totalOutstanding = advances.reduce((s,a)=>s+a.outstanding_balance,0)
  const pendingApproval = advances.filter(a=>a.status==='pending').length
  const highRisk = advances.filter(a=>a.ai_risk_score>60).length

  const doApprove = (id) => setAdvances(p=>p.map(a=>a.id===id?{...a,status:'approved',amount_approved:a.amount_requested}:a))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="💰" title="Cash Advance (Vendor Employees)"
        breadcrumb="Organization Management > Vendor / Outsource Employee Management"
        gradient={G}
        stats={[
          {icon:'⏳',label:'Pending',          value:pendingApproval},
          {icon:'💰',label:'Outstanding',       value:'NPR '+(totalOutstanding/1000).toFixed(0)+'K'},
          {icon:'⚠',label:'High Risk',          value:highRisk},
          {icon:'📋',label:'Total Requests',    value:advances.length},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="New Request"
        onExcel={()=>setShowExcel(true)}/>

      {/* Policy bar */}
      <div style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:12,padding:'10px 16px',marginBottom:14,display:'flex',gap:10,fontSize:11,color:'#92400e'}}>
        <span style={{fontSize:18}}>📋</span>
        <div>
          <strong>Cash Advance Policy:</strong> Max 1.5x monthly wage . Must be repaid within 6 months via payroll deduction . Emergency/Medical: auto-fast-track . Festival advance: available 60 days before festival . Approval: Vendor HR {'>'}HR Manager {'>'} Finance
        </div>
      </div>

      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search by name, request no..."/>
        <div style={{display:'flex',gap:4,background:'#f1f5f9',padding:3,borderRadius:9}}>
          {['all','pending','approved','pending_disbursement','disbursed','rejected'].map(s=>(
            <button key={s} onClick={()=>setFilterStatus(s)}
              style={{padding:'7px 11px',borderRadius:7,border:'none',cursor:'pointer',fontSize:10,
                background:filterStatus===s?'#fff':'transparent',color:filterStatus===s?A:'#64748b',
                fontWeight:filterStatus===s?700:400,boxShadow:filterStatus===s?'0 1px 3px rgba(0,0,0,.08)':'none'}}>
              {s==='all'?'All':STATUS_CFG[s]?.icon+' '+STATUS_CFG[s]?.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{display:'grid',gap:14}}>
        {filtered.map(ca=>{
          const sc = STATUS_CFG[ca.status]||STATUS_CFG.pending
          const wageRatio = Math.round(ca.amount_requested/ca.monthly_wage*100)
          return (
            <div key={ca.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:ca.emp_name,...ca}})}}
              style={{background:'#fff',border:`1px solid ${sc.b}`,borderRadius:16,overflow:'hidden',
                boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${sc.c}`}}>

              <div style={{display:'flex',alignItems:'center',gap:14,padding:'14px 20px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap'}}>
                <div style={{width:44,height:44,borderRadius:12,background:`${sc.c}18`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>💰</div>
                <div style={{flex:1,minWidth:200}}>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:2}}>
                    <span style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{ca.emp_name}</span>
                    <span style={{background:sc.bg,color:sc.c,border:`1px solid ${sc.b}`,fontSize:10,fontWeight:700,padding:'2px 10px',borderRadius:20}}>{sc.icon} {sc.label}</span>
                    {ca.ai_risk_score>60 && <span style={{background:'#fef2f2',color:'#dc2626',border:'1px solid #fecaca',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>AI Risk: {ca.ai_risk_score}%</span>}
                  </div>
                  <div style={{fontSize:11,color:'#64748b'}}>{ca.request_no} · {ca.emp_id} · {ca.vendor}</div>
                  <div style={{fontSize:10,color:'#94a3b8'}}>Role: {ca.role} · Applied: {ca.applied_on}</div>
                </div>
                <div style={{textAlign:'right',flexShrink:0}}>
                  <div style={{fontSize:20,fontWeight:900,color:A}}>NPR {(ca.amount_requested/1000).toFixed(1)}K</div>
                  <div style={{fontSize:10,color:'#94a3b8'}}>Requested . {wageRatio}% of wage</div>
                  <div style={{fontSize:11,fontWeight:700,color:wageRatio>150?'#ef4444':wageRatio>100?'#f59e0b':'#10b981'}}>
                    {ca.amount_approved?`Approved: NPR ${(ca.amount_approved/1000).toFixed(1)}K`:'Pending'}
                  </div>
                </div>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr',gap:0}}>
                <div style={{padding:'10px 20px',borderRight:'1px solid #f8fafc'}}>
                  <div style={{fontSize:11,fontWeight:700,color:'#334155',marginBottom:3}}>Purpose</div>
                  <div style={{fontSize:11,color:'#64748b'}}>{ca.purpose}</div>
                  <div style={{fontSize:10,color:'#94a3b8',marginTop:4}}>Applied: {ca.applied_on} . Disburse: {ca.disbursement_date||'TBD'}</div>
                  {ca.repayment_per_month && (
                    <div style={{marginTop:6,background:'#f8fafc',borderRadius:8,padding:'6px 10px',fontSize:10,color:'#475569'}}>
                      Repayment: NPR {ca.repayment_per_month}/month x {ca.repayment_months} months via payroll deduction
                    </div>
                  )}
                </div>
                <div style={{padding:'10px 14px',borderRight:'1px solid #f8fafc'}}>
                  <div style={{fontSize:10,fontWeight:700,color:'#334155',marginBottom:6}}>📋 Request → Review → Approve</div>
                  {/* Requester */}
                  <div style={{background:'#f8fafc',borderRadius:7,padding:'6px 8px',marginBottom:6,fontSize:9}}>
                    <div style={{fontWeight:700,color:'#0f172a'}}>📤 Requester</div>
                    <div style={{color:'#64748b',marginTop:1}}>{ca.emp_name} ({ca.emp_id})</div>
                    <div style={{color:'#94a3b8',fontSize:8}}>Applied: {ca.applied_on}</div>
                  </div>
                  {ca.approval_chain.map((step,i)=>{
                    const cs = CHAIN_STATUS[step.status]||CHAIN_STATUS.pending
                    const icons = ['🔍 Review','✅ Approve','💸 Disburse']
                    return (
                      <div key={i} style={{display:'flex',gap:6,alignItems:'flex-start',marginBottom:5,padding:'5px 7px',borderRadius:7,
                        background:step.status==='approved'||step.status==='disbursed'?`${cs.c}10`:step.status==='pending'?'#fff':'#fef2f2',
                        border:`1px solid ${step.status==='approved'||step.status==='disbursed'?cs.c+'30':'#f1f5f9'}`}}>
                        <span style={{color:cs.c,fontWeight:900,fontSize:12,flexShrink:0}}>{cs.icon}</span>
                        <div style={{flex:1}}>
                          <div style={{fontSize:9,fontWeight:700,color:'#374151'}}>{icons[i]||step.role} — {step.role}</div>
                          {step.by&&<div style={{fontSize:8,color:'#64748b'}}>{step.by}{step.date?' · '+step.date:''}</div>}
                          {!step.by&&<div style={{fontSize:8,color:'#94a3b8'}}>Awaiting action</div>}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div style={{padding:'10px 14px'}}>
                  <div style={{fontSize:10,color:'#94a3b8',marginBottom:4}}>AI Assessment</div>
                  <div style={{marginBottom:6}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:3,fontSize:10}}>
                      <span>Risk</span><span style={{color:ca.ai_risk_score>60?'#ef4444':ca.ai_risk_score>30?'#f59e0b':'#10b981',fontWeight:700}}>{ca.ai_risk_score}%</span>
                    </div>
                    <div style={{height:5,background:'#e2e8f0',borderRadius:5,overflow:'hidden'}}>
                      <div style={{width:`${ca.ai_risk_score}%`,height:'100%',background:ca.ai_risk_score>60?'#ef4444':ca.ai_risk_score>30?'#f59e0b':'#10b981',borderRadius:5}}/>
                    </div>
                  </div>
                  <div style={{fontSize:9,color:'#64748b',fontStyle:'italic',lineHeight:1.4}}>{ca.ai_recommendation}</div>
                </div>
              </div>

              {/* Outstanding */}
              {ca.outstanding_balance > 0 && (
                <div style={{padding:'8px 20px',background:'#fffbeb',borderTop:'1px solid #fde68a',display:'flex',justifyContent:'space-between',fontSize:10,color:'#92400e'}}>
                  <span>Outstanding Balance: <strong>NPR {ca.outstanding_balance.toLocaleString()}</strong></span>
                  <span>Repaid: NPR {ca.paid_back.toLocaleString()}</span>
                  <span>Recovery Progress: {Math.round(ca.paid_back/(ca.outstanding_balance+ca.paid_back||1)*100)}%</span>
                </div>
              )}

              {ca.status==='pending' && (
                <div style={{padding:'10px 16px',display:'flex',gap:8,borderTop:'1px solid #f1f5f9'}}>
                  <button onClick={()=>doApprove(ca.id)} style={{flex:1,padding:'8px',borderRadius:8,border:'none',background:'#10b981',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>Approve NPR {ca.amount_requested.toLocaleString()}</button>
                  <button style={{flex:1,padding:'8px',borderRadius:8,border:'none',background:'#f59e0b',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>Partial Approve</button>
                  <button onClick={()=>setAdvances(p=>p.map(a=>a.id===ca.id?{...a,status:'rejected'}:a))} style={{flex:1,padding:'8px',borderRadius:8,border:'none',background:'#ef4444',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>Reject</button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {showAdd && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowAdd(false)}>
          <div style={{background:'#fff',borderRadius:20,width:660,maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}>
              <div style={{fontSize:18,fontWeight:900,color:'#fff'}}>+ New Cash Advance Request</div>
              <div style={{fontSize:11,color:'rgba(255,255,255,.75)',marginTop:2}}>Voice input supported. AI risk check runs automatically.</div>
            </div>
            <div style={{padding:'22px 28px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
                <Field label="Employee" type="select" value={form.emp_id} onChange={v=>setForm(p=>({...p,emp_id:v}))} accent={A}
                  options={['VE-001 Ramesh Shrestha','VE-002 Sunita Gurung','VE-003 Bikash Tamang','VE-005 Hari Rai']}/>
                <Field label="Amount (NPR)" type="number" value={form.amount} onChange={v=>setForm(p=>({...p,amount:v}))} accent={A} hint="Max 1.5x monthly wage"/>
                <Field label="Purpose Category" type="select" value={form.purpose_category} onChange={v=>setForm(p=>({...p,purpose_category:v}))} accent={A}
                  options={['medical_emergency','education','festival','personal','housing','other']}/>
                <Field label="Preferred Disbursement Date" type="date" value={form.disbursement_date} onChange={v=>setForm(p=>({...p,disbursement_date:v}))} accent={A}/>
                <Field label="Repayment Months" type="select" value={form.repayment_months} onChange={v=>setForm(p=>({...p,repayment_months:v}))} accent={A}
                  options={['1','2','3','4','5','6']}/>
                <Field label="Purpose Description" value={form.purpose} onChange={v=>setForm(p=>({...p,purpose:v}))} accent={A} hint="Voice input"/>
              </div>
              <AIImpact color={A} lines={[
                'AI risk score computed based on wage ratio, repayment history, and purpose.',
                'Medical emergency: auto fast-track to Finance. Festival: 60-day window.',
                'Repayment auto-deducted from monthly billing to vendor agency.',
                'Max 1 active advance per employee at a time.',
              ]}/>
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>setShowAdd(false)} style={{flex:1,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Submit Request</button>
                <button onClick={()=>setShowAdd(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx && <ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={CTX_ACTIONS} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel && <ExcelModal title="Cash Advances" columns={['Request No','Employee ID','Name','Vendor','Amount NPR','Purpose','Status','Applied On','Disbursement Date','Repayment Months','Outstanding']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
    </div>
  )
}
