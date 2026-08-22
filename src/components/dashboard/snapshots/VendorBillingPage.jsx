// FILE: VendorBillingPage.jsx
// Vendor Billing - Auto rate enforcement, TDS compliance, Nepal IRD
// 3-way match: Contract > Attendance > Bill

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, Drawer, SearchBar, Badge, LuxCard, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#0f172a 0%,#1e3a5f 60%,#1e40af 100%)'
const A = '#1e40af'

const BILLS = [
  { id:'b1', bill_no:'BILL-2025-001', vendor_code:'VND-001', vendor_name:'ShieldGuard Nepal Pvt. Ltd.',
    service:'Security Services', period:'Jun 2025', billing_cycle:'monthly',
    workers:45, days_billed:26, rate_per_day:710, amount_before_tax:830700,
    tds_rate:1.5, tds_amount:12461, vat_rate:13, vat_amount:107991, total_npr:926230,
    contract_rate:710, attendance_verified:true, contract_verified:true, ai_validated:true,
    discrepancy:0, has_discrepancy:false, status:'approved',
    three_way_match:{contract:true,attendance:true,invoice:true},
    ai_risk:8, ai_note:'All 3-way checks passed. TDS 1.5% applied. Auto-approve recommended.',
    due_date:'2025-07-05', impact_links:['Vendor Invoice','SLA Contract','Attendance','Finance'] },
  { id:'b2', bill_no:'BILL-2025-002', vendor_code:'VND-002', vendor_name:'CleanPro Services Nepal',
    service:'Housekeeping', period:'Jun 2025', billing_cycle:'monthly',
    workers:18, days_billed:26, rate_per_day:635, amount_before_tax:296790,
    tds_rate:1.5, tds_amount:4452, vat_rate:13, vat_amount:38583, total_npr:330921,
    contract_rate:635, attendance_verified:true, contract_verified:true, ai_validated:true,
    discrepancy:0, has_discrepancy:false, status:'pending_approval',
    three_way_match:{contract:true,attendance:true,invoice:false},
    ai_risk:24, ai_note:'Invoice not yet received. Attendance verified. Contract rates match.',
    due_date:'2025-07-07', impact_links:['Vendor Invoice','Attendance','Finance'] },
  { id:'b3', bill_no:'BILL-2025-003', vendor_code:'VND-003', vendor_name:'TechStaff Solutions Pvt.',
    service:'IT Support Staff', period:'Jun 2025', billing_cycle:'monthly',
    workers:12, days_billed:26, rate_per_day:847, amount_before_tax:264264,
    tds_rate:1.5, tds_amount:3964, vat_rate:13, vat_amount:34354, total_npr:294582,
    contract_rate:820, attendance_verified:true, contract_verified:true, ai_validated:true,
    discrepancy:27, has_discrepancy:true, status:'disputed',
    three_way_match:{contract:true,attendance:true,invoice:false},
    ai_risk:67, ai_note:'DISCREPANCY: Billed NPR 847/day vs contract NPR 820/day. Overage = NPR 27/worker/day = NPR 8,424 total. Raise dispute.',
    due_date:'2025-07-10', impact_links:['Vendor Invoice','Contract Alert','Finance'] },
  { id:'b4', bill_no:'BILL-2025-004', vendor_code:'VND-004', vendor_name:'SalaryExpert Payroll Nepal',
    service:'Payroll Processing', period:'Jun 2025', billing_cycle:'monthly',
    workers:1, days_billed:30, rate_per_day:null, amount_before_tax:48000,
    tds_rate:1.5, tds_amount:720, vat_rate:13, vat_amount:6240, total_npr:53520,
    contract_rate:null, attendance_verified:false, contract_verified:true, ai_validated:true,
    discrepancy:0, has_discrepancy:false, status:'paid',
    three_way_match:{contract:true,attendance:true,invoice:true},
    ai_risk:5, ai_note:'Monthly retainer. Paid on time. Perfect compliance record.',
    due_date:'2025-06-25', paid_date:'2025-06-24', payment_ref:'NABIL-TXN-20250624',
    impact_links:['Payroll','Finance','Vendor Invoice'] },
]

const STATUS_CFG = {
  pending_approval:{c:'#f59e0b',bg:'#fffbeb',b:'#fde68a',icon:'⏳',label:'Pending'},
  approved:        {c:'#3b82f6',bg:'#eff6ff',b:'#bfdbfe',icon:'✅',label:'Approved'},
  disputed:        {c:'#ef4444',bg:'#fef2f2',b:'#fecaca',icon:'⚠',label:'Disputed'},
  paid:            {c:'#10b981',bg:'#f0fdf4',b:'#bbf7d0',icon:'💰',label:'Paid'},
  rejected:        {c:'#dc2626',bg:'#fef2f2',b:'#fca5a5',icon:'❌',label:'Rejected'},
}

const CTX = [
  {icon:'👁',label:'View Bill Details',      key:'view'},
  {icon:'✅',label:'Approve Billing',         key:'approve'},
  {icon:'⚠',label:'Raise Dispute',           key:'dispute'},
  {icon:'💰',label:'Mark as Paid',            key:'pay'},
  {icon:'📋',label:'View SLA Contract',       key:'contract'},
  {icon:'📊',label:'3-Way Match Report',      key:'match'},
  {icon:'🔗',label:'Impact Analysis',         key:'impact'},
  {icon:'📤',label:'Export to Excel',         key:'export'},
]

export default function VendorBillingPage() {
  const [bills, setBills] = useState(BILLS)
  const [msg, setMsg] = useState('')
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(''),3000) }
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selected, setSelected] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = bills.filter(b=>{
    if (filterStatus!=='all'&&b.status!==filterStatus) return false
    if (search&&!b.vendor_name.toLowerCase().includes(search.toLowerCase())&&!b.bill_no.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const totalBilled  = bills.reduce((s,b)=>s+b.total_npr,0)
  const totalTDS     = bills.reduce((s,b)=>s+b.tds_amount,0)
  const disputed     = bills.filter(b=>b.status==='disputed').length
  const pending      = bills.filter(b=>b.status==='pending_approval').length

  const approveBill = id => setBills(p=>p.map(b=>b.id===id?{...b,status:'approved'}:b))
  const disputeBill = id => setBills(p=>p.map(b=>b.id===id?{...b,status:'disputed'}:b))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="💳" title="Vendor Billing"
        breadcrumb="Organization Management > Vendor / Outsource Management"
        gradient={G}
        stats={[
          {icon:'💳',label:'Total Billed',   value:'NPR '+(totalBilled/100000).toFixed(1)+'L'},
          {icon:'🏛',label:'TDS Deducted',   value:'NPR '+(totalTDS/1000).toFixed(0)+'K'},
          {icon:'⏳',label:'Pending',          value:pending},
          {icon:'⚠',label:'Disputed',         value:disputed},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="🧾 Generate Invoice"
        onExcel={()=>setShowExcel(true)}/>

      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:999,boxShadow:'0 4px 16px rgba(0,0,0,.1)'}}>{msg}</div>}

      <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#1e40af',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>🇳🇵</span>
        <div><strong>Nepal IRD Compliance:</strong> TDS 1.5% deducted on all service invoices. VAT 13% where applicable. 3-way match: Contract Rate vs Attendance vs Invoice mandatory before payment.</div>
      </div>

      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search bills by vendor, bill no..."/>
        <div style={{display:'flex',gap:4,background:'#f1f5f9',padding:3,borderRadius:9}}>
          {['all','pending_approval','approved','disputed','paid'].map(s=>(
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
        {filtered.map(b=>{
          const sc = STATUS_CFG[b.status]||STATUS_CFG.pending_approval
          const allMatch = b.three_way_match.contract&&b.three_way_match.attendance&&b.three_way_match.invoice
          return (
            <div key={b.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:b.vendor_name,...b}})}}
              style={{background:'#fff',border:`1.5px solid ${b.has_discrepancy?'#fecaca':sc.b}`,
                borderRadius:16,overflow:'hidden',boxShadow:'0 2px 12px rgba(0,0,0,.05)',
                borderLeft:`5px solid ${b.has_discrepancy?'#ef4444':sc.c}`}}>

              <div style={{display:'flex',alignItems:'center',gap:14,padding:'16px 20px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap'}}>
                <div style={{width:48,height:48,borderRadius:14,background:`${sc.c}18`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>💳</div>
                <div style={{flex:1}}>
                  <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:3,alignItems:'center'}}>
                    <span style={{fontSize:14,fontWeight:900,color:'#0f172a'}}>{b.vendor_name}</span>
                    <span style={{background:sc.bg,color:sc.c,border:`1px solid ${sc.b}`,fontSize:10,fontWeight:700,padding:'2px 10px',borderRadius:20}}>{sc.icon} {sc.label}</span>
                    {b.has_discrepancy&&<span style={{background:'#fef2f2',color:'#dc2626',border:'1px solid #fecaca',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>RATE DISCREPANCY: NPR {b.discrepancy}/day</span>}
                  </div>
                  <div style={{fontSize:11,color:'#64748b'}}>{b.bill_no} . {b.service} . {b.period} . Due {b.due_date}</div>
                </div>
                <div style={{textAlign:'right',flexShrink:0}}>
                  <div style={{fontSize:20,fontWeight:900,color:A}}>NPR {(b.total_npr/1000).toFixed(0)}K</div>
                  <div style={{fontSize:9,color:'#94a3b8'}}>TOTAL PAYABLE</div>
                  <div style={{fontSize:10,color:'#64748b',marginTop:2}}>{b.workers} workers × {b.days_billed} days</div>
                </div>
              </div>

              {/* Financials breakdown + 3-way match */}
              <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:0}}>
                <div style={{padding:'12px 20px',borderRight:'1px solid #f1f5f9'}}>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
                    {[
                      {l:'Gross Amount',  v:'NPR '+(b.amount_before_tax/1000).toFixed(0)+'K', c:'#0f172a'},
                      {l:'TDS 1.5%',      v:'NPR '+(b.tds_amount/1000).toFixed(1)+'K',      c:'#dc2626'},
                      {l:'VAT 13%',       v:'NPR '+(b.vat_amount/1000).toFixed(0)+'K',       c:'#f59e0b'},
                      {l:'Net Payable',   v:'NPR '+(b.total_npr/1000).toFixed(0)+'K',        c:A},
                    ].map((s,i)=>(
                      <div key={i} style={{background:'#f8fafc',borderRadius:10,padding:'8px 10px',textAlign:'center'}}>
                        <div style={{fontSize:12,fontWeight:800,color:s.c}}>{s.v}</div>
                        <div style={{fontSize:9,color:'#94a3b8',fontWeight:600}}>{s.l}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3-way match */}
                <div style={{padding:'12px 20px'}}>
                  <div style={{fontSize:11,fontWeight:700,color:'#334155',marginBottom:8}}>3-Way Match</div>
                  {[['Contract',b.three_way_match.contract],['Attendance',b.three_way_match.attendance],['Invoice',b.three_way_match.invoice]].map(([l,ok])=>(
                    <div key={l} style={{display:'flex',justifyContent:'space-between',marginBottom:4,fontSize:11}}>
                      <span style={{color:'#64748b'}}>{l}</span>
                      <span style={{color:ok?'#10b981':'#ef4444',fontWeight:700}}>{ok?'MATCH':'PENDING'}</span>
                    </div>
                  ))}
                  <div style={{marginTop:6,padding:'4px 8px',borderRadius:8,
                    background:allMatch?'#f0fdf4':'#fef2f2',
                    color:allMatch?'#15803d':'#dc2626',fontSize:10,fontWeight:700,textAlign:'center'}}>
                    {allMatch?'CLEARED':'ACTION REQUIRED'}
                  </div>
                </div>
              </div>

              {/* AI assessment */}
              <div style={{padding:'8px 20px',background:'#f8fafc',borderTop:'1px solid #f1f5f9',fontSize:10,color:'#64748b',fontStyle:'italic',display:'flex',justifyContent:'space-between',alignItems:'center',gap:10}}>
                <span>AI: {b.ai_note}</span>
                <div style={{display:'flex',gap:8,flexShrink:0}}>
                  {b.status==='pending_approval'&&(
                    <>
                      <button onClick={()=>approveBill(b.id)} style={{padding:'6px 14px',borderRadius:8,border:'none',background:'#3b82f6',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>✅ Approve</button>
                      <button onClick={()=>disputeBill(b.id)} style={{padding:'6px 14px',borderRadius:8,border:'none',background:'#ef4444',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>⚠️ Dispute</button>
                    </>
                  )}
                  <button onClick={()=>setSelected(b)} style={{padding:'6px 14px',borderRadius:8,border:`1px solid ${A}33`,background:'#eff6ff',color:A,fontSize:11,fontWeight:600,cursor:'pointer'}}>👁 Details</button>
                  <button onClick={()=>notify('🖨️ Printing bill: '+b.bill_no)} style={{padding:'6px 12px',borderRadius:8,border:'1px solid #e2e8f0',background:'#fff',fontSize:11,cursor:'pointer'}}>🖨️ Print</button>
                  <button onClick={()=>notify('📤 Exported: '+b.bill_no+'.xlsx')} style={{padding:'6px 12px',borderRadius:8,border:'1px solid #e2e8f0',background:'#fff',fontSize:11,cursor:'pointer'}}>📤 Export</button>
                  <button onClick={()=>notify('📧 Invoice sent to company Finance — '+b.bill_no)} style={{padding:'6px 12px',borderRadius:8,border:'none',background:'#10b981',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>📧 Send to Company</button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {showAdd&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowAdd(false)}>
          <div style={{background:'#fff',borderRadius:20,width:680,maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Generate Vendor Bill</div></div>
            <div style={{padding:'22px 28px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
                <Field label="Vendor" type="select" value="" onChange={()=>{}} accent={A} options={['ShieldGuard Nepal','CleanPro Services','TechStaff Solutions']}/>
                <Field label="Billing Period" type="select" value="" onChange={()=>{}} accent={A} options={['Jun 2025','Jul 2025','Aug 2025']}/>
                <Field label="Workers Deployed" type="number" value="" onChange={()=>{}} accent={A}/>
                <Field label="Days Billed" type="number" value="" onChange={()=>{}} accent={A}/>
                <Field label="Rate/Day (NPR)" type="number" value="" onChange={()=>{}} accent={A} hint="From contract"/>
                <Field label="TDS Rate (%)" value="1.5" onChange={()=>{}} accent={A} hint="Nepal IRD standard"/>
              </div>
              <AIImpact color={A} lines={['AI validates against contract rate before bill generation.','TDS 1.5% auto-deducted per Nepal IRD guidelines.','3-way match triggers before approval routing.','Discrepancy alert if rate differs from contract.']}/>
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>setShowAdd(false)} style={{flex:1,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Generate Bill</button>
                <button onClick={()=>setShowAdd(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={CTX} onAction={(k,item)=>{if(k==='view')setSelected(item)}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Vendor Billing" columns={['Bill No','Vendor Code','Vendor Name','Service','Period','Workers','Days','Rate/Day','Gross NPR','TDS NPR','VAT NPR','Total NPR','Status']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
      <Drawer item={selected} gradient={G} onClose={()=>setSelected(null)} rows={[
        ['Bill No',selected?.bill_no],['Vendor',selected?.vendor_name],['Service',selected?.service],
        ['Period',selected?.period],['Workers',selected?.workers],['Days Billed',selected?.days_billed],
        ['Rate/Day','NPR '+(selected?.rate_per_day||0)],['Contract Rate','NPR '+(selected?.contract_rate||0)],
        ['Gross','NPR '+(selected?.amount_before_tax||0)],['TDS (1.5%)','NPR '+(selected?.tds_amount||0)],
        ['VAT (13%)','NPR '+(selected?.vat_amount||0)],['Total Payable','NPR '+(selected?.total_npr||0)],
        ['Status',selected?.status],['AI Risk',selected?.ai_risk+'/100'],['AI Note',selected?.ai_note],
        ['Due Date',selected?.due_date],['Paid Date',selected?.paid_date||'N/A'],
      ]}/>
    </div>
  )
}
