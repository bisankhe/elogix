// FILE: OutsourceBillingPage.jsx - Page 4: Billing & Invoice
import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, Drawer, SearchBar, Badge, LuxCard, ContextMenu } from './DeptSetupShared.jsx'

const T = { gradient:'linear-gradient(135deg,#d97706 0%,#f59e0b 100%)', accent:'#d97706', light:'#fffbeb' }

const MOCK_INVOICES = [
  {id:'inv1', invoice_no:'INV-SG-2026-06', vendor:'ShieldGuard Nepal',
   period:'June 2026', issue_date:'2026-06-05', due_date:'2026-06-20',
   workers:45, days:26, rate_per_day:6923, amount_npr:225000,
   timesheet_approved:true, attendance_verified:true,
   status:'pending_approval', discrepancy:false, discrepancy_amt:0,
   ai_validation:'All timesheets match. 45 workers x 26 days x NPR 6,923 = NPR 225,007. Minor rounding difference of NPR 7 acceptable.',
   icon:'🔐', color:'#ef4444',
   impact_links:[{icon:'💰',module:'Finance AP',desc:'Pending CFO approval'},{icon:'📅',module:'Attendance',desc:'Timesheet cross-matched'},{icon:'⚖',module:'SLA',desc:'Within contract value'}],
  },
  {id:'inv2', invoice_no:'INV-CP-2026-06', vendor:'CleanPro Services Nepal',
   period:'June 2026', issue_date:'2026-06-04', due_date:'2026-06-19',
   workers:18, days:26, rate_per_day:3077, amount_npr:72000,
   timesheet_approved:true, attendance_verified:true,
   status:'approved', discrepancy:false, discrepancy_amt:0,
   ai_validation:'Invoice validated. 18 workers x 26 days x NPR 3,077 = NPR 72,006. Accepted within tolerance.',
   icon:'🧹', color:'#10b981',
   impact_links:[{icon:'💰',module:'Finance AP',desc:'Approved - processing'},{icon:'📅',module:'Attendance',desc:'Verified 91% attendance'}],
  },
  {id:'inv3', invoice_no:'INV-TS-2026-06', vendor:'TechStaff Solutions',
   period:'June 2026', issue_date:'2026-06-06', due_date:'2026-06-21',
   workers:12, days:26, rate_per_day:8654, amount_npr:195000,
   timesheet_approved:false, attendance_verified:true,
   status:'disputed', discrepancy:true, discrepancy_amt:15000,
   ai_validation:'DISCREPANCY DETECTED: Invoice NPR 195,000 but timesheet data shows NPR 180,000. 1 worker billed for extra 13 days not in attendance records. Reject partial payment.',
   icon:'💻', color:'#3b82f6',
   impact_links:[{icon:'⚠',module:'Billing Dispute',desc:'NPR 15K over-billing detected'},{icon:'📅',module:'Attendance',desc:'Timesheet mismatch found'}],
  },
  {id:'inv4', invoice_no:'INV-SG-2026-05', vendor:'ShieldGuard Nepal',
   period:'May 2026', issue_date:'2026-05-05', due_date:'2026-05-20',
   workers:45, days:25, rate_per_day:6923, amount_npr:216200,
   timesheet_approved:true, attendance_verified:true,
   status:'paid', discrepancy:false, discrepancy_amt:0,
   ai_validation:'Invoice paid. All records matched.',
   icon:'🔐', color:'#ef4444',
   impact_links:[{icon:'💰',module:'Finance',desc:'Payment completed'},{icon:'📊',module:'Audit Trail',desc:'Records stored'}],
  },
]

const STATUS_CFG = {
  pending_approval: {bg:'#fffbeb',color:'#b45309',border:'#fde68a',label:'Pending Approval'},
  approved:         {bg:'#eff6ff',color:'#1d4ed8',border:'#bfdbfe',label:'Approved'},
  paid:             {bg:'#f0fdf4',color:'#15803d',border:'#bbf7d0',label:'Paid'},
  disputed:         {bg:'#fef2f2',color:'#dc2626',border:'#fecaca',label:'Disputed'},
}

const CONTEXT_ACTIONS = [
  {icon:'👁', label:'View Invoice',          key:'view'},
  {icon:'✅', label:'Approve Invoice',       key:'approve'},
  {icon:'❌', label:'Raise Dispute',         key:'dispute'},
  {icon:'💰', label:'Process Payment',       key:'pay'},
  {icon:'📄', label:'Download PDF',          key:'pdf'},
  {icon:'🔗', label:'Impact Analysis',       key:'impact'},
  {icon:'📤', label:'Export Excel',          key:'export'},
]

export default function OutsourceBillingPage() {
  const [invoices,  setInvoices]  = useState(MOCK_INVOICES)
  const [ctx,       setCtx]       = useState(null)
  const [showExcel, setShowExcel] = useState(false)
  const [selected,  setSelected]  = useState(null)
  const [search,    setSearch]    = useState('')
  const [filter,    setFilter]    = useState('all')

  const [msg, setMsg] = useState('')
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(''),3000) }

  const filtered = invoices.filter(i =>
    (filter==='all'||i.status===filter) &&
    (!search||i.vendor.toLowerCase().includes(search.toLowerCase())||i.invoice_no.toLowerCase().includes(search.toLowerCase()))
  )

  const totalBilled   = invoices.reduce((s,i)=>s+i.amount_npr,0)
  const totalPaid     = invoices.filter(i=>i.status==='paid').reduce((s,i)=>s+i.amount_npr,0)
  const totalDisputed = invoices.filter(i=>i.discrepancy).reduce((s,i)=>s+i.discrepancy_amt,0)
  const pending       = invoices.filter(i=>i.status==='pending_approval'||i.status==='approved')

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader
        icon="💰" title="Billing & Invoice"
        breadcrumb="Organization Management > Workforce Configuration > Employment Type > Outsource"
        gradient={T.gradient}
        stats={[
          {icon:'📄',label:'Total Invoices',    value:invoices.length},
          {icon:'💰',label:'Total Billed',      value:'NPR '+(totalBilled/1000).toFixed(0)+'K'},
          {icon:'✅',label:'Total Paid',         value:'NPR '+(totalPaid/1000).toFixed(0)+'K'},
          {icon:'⚠', label:'Disputed Amount',   value:'NPR '+(totalDisputed/1000).toFixed(0)+'K'},
        ]}
        onAdd={()=>{}} addLabel="Create Invoice"
        onExcel={()=>setShowExcel(true)}
      />

      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:999,boxShadow:'0 4px 16px rgba(0,0,0,.1)'}}>{msg}</div>}

      {/* AI Validation Banner */}
      <div style={{background:'linear-gradient(135deg,#f5f3ff,#fffbeb)',border:'1px solid #ddd6fe',
        borderRadius:12,padding:'12px 16px',marginBottom:16}}>
        <div style={{fontSize:12,fontWeight:800,color:'#1e1b4b',marginBottom:6}}>
          AI Invoice Validation - Auto Cross-Check Against Timesheets
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,fontSize:11}}>
          <div style={{color:'#15803d'}}><strong>3/4 invoices</strong> matched timesheet data automatically</div>
          <div style={{color:'#dc2626'}}><strong>NPR 15,000 over-billing detected</strong> in TechStaff June invoice</div>
          <div style={{color:'#1d4ed8'}}>AI saved <strong>4+ hours</strong> of manual invoice verification this month</div>
        </div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search invoices..."
        extra={
          <div style={{display:'flex',gap:5}}>
            {['all','pending_approval','disputed','paid'].map(f=>(
              <button key={f} onClick={()=>setFilter(f)}
                style={{padding:'7px 12px',borderRadius:20,border:`1.5px solid ${filter===f?T.accent:'#e2e8f0'}`,
                  background:filter===f?T.light:'#fff',color:filter===f?T.accent:'#64748b',
                  fontSize:10,fontWeight:600,cursor:'pointer'}}>
                {f==='all'?'All':f==='pending_approval'?'Pending':f.charAt(0).toUpperCase()+f.slice(1)}
              </button>
            ))}
          </div>
        }/>

      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        {filtered.map(inv=>{
          const sc = STATUS_CFG[inv.status]||STATUS_CFG.pending_approval
          return (
            <div key={inv.id}
              onContextMenu={e=>{e.preventDefault();setCtx({x:e.clientX,y:e.clientY,item:{name:inv.vendor,...inv}})}}
              style={{background:'#fff',borderRadius:16,border:`1px solid ${inv.discrepancy?'#fecaca':'#e2e8f0'}`,
                boxShadow:'0 2px 8px rgba(0,0,0,.05)',overflow:'hidden',
                borderLeft:`4px solid ${inv.discrepancy?'#ef4444':inv.color}`}}>
              <div style={{padding:'14px 18px',display:'flex',gap:14,alignItems:'center'}}>
                <div style={{width:44,height:44,borderRadius:12,background:`${inv.color}18`,
                  display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>
                  {inv.icon}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:2}}>
                    <span style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{inv.invoice_no}</span>
                    <span style={{background:sc.bg,color:sc.color,border:`1px solid ${sc.border}`,
                      fontSize:10,fontWeight:700,padding:'2px 9px',borderRadius:20}}>{sc.label}</span>
                    {inv.discrepancy && (
                      <span style={{background:'#fef2f2',color:'#dc2626',fontSize:10,fontWeight:700,padding:'2px 9px',borderRadius:20}}>
                        Overbilled NPR {inv.discrepancy_amt.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <div style={{fontSize:11,color:'#64748b'}}>
                    {inv.vendor} &bull; {inv.period} &bull; {inv.workers} workers &bull; {inv.days} days
                  </div>
                  <div style={{fontSize:10,color:'#94a3b8',marginTop:1}}>
                    Issued: {inv.issue_date} &bull; Due: {inv.due_date}
                  </div>
                </div>
                <div style={{display:'flex',gap:10,flexShrink:0,alignItems:'center'}}>
                  <div style={{display:'flex',gap:8}}>
                    <span style={{background:inv.timesheet_approved?'#f0fdf4':'#fef2f2',
                      color:inv.timesheet_approved?'#15803d':'#dc2626',
                      fontSize:9,fontWeight:700,padding:'3px 8px',borderRadius:20}}>
                      {inv.timesheet_approved?'TS Approved':'TS Pending'}
                    </span>
                    <span style={{background:inv.attendance_verified?'#f0fdf4':'#fef2f2',
                      color:inv.attendance_verified?'#15803d':'#dc2626',
                      fontSize:9,fontWeight:700,padding:'3px 8px',borderRadius:20}}>
                      {inv.attendance_verified?'Att Verified':'Att Pending'}
                    </span>
                  </div>
                  <div style={{textAlign:'center',padding:'8px 16px',background:'#f8fafc',borderRadius:10}}>
                    <div style={{fontSize:18,fontWeight:900,color:inv.discrepancy?'#dc2626':T.accent}}>
                      NPR {(inv.amount_npr/1000).toFixed(0)}K
                    </div>
                    <div style={{fontSize:9,color:'#94a3b8'}}>Invoice Amount</div>
                  </div>
                </div>
              </div>
              {/* AI Validation */}
              <div style={{borderTop:'1px solid #f1f5f9',padding:'8px 18px',
                background:inv.discrepancy?'#fef2f2':'#f5f3ff',
                fontSize:11,color:inv.discrepancy?'#991b1b':'#4c1d95',
                display:'flex',gap:8,alignItems:'flex-start'}}>
                <span style={{flexShrink:0}}>🤖</span>
                <span>{inv.ai_validation}</span>
              </div>
              {/* Actions — always visible */}
              <div style={{borderTop:'1px solid #f1f5f9',padding:'8px 18px',display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
                <span style={{fontSize:10,color:'#94a3b8',marginRight:4}}>Status: <strong style={{color:inv.status==='paid'?'#10b981':inv.status==='disputed'?'#ef4444':'#f59e0b'}}>{inv.status.replace('_',' ').toUpperCase()}</strong></span>
                <button onClick={()=>notify('🖨️ Printing: '+inv.invoice_no)} style={{padding:'5px 10px',borderRadius:7,border:'1px solid #e2e8f0',background:'#fff',fontSize:9,cursor:'pointer'}}>🖨️ Print</button>
                <button onClick={()=>notify('📤 Exported: '+inv.invoice_no+'.xlsx')} style={{padding:'5px 10px',borderRadius:7,border:'1px solid #e2e8f0',background:'#fff',fontSize:9,cursor:'pointer'}}>📤 Export</button>
                <button onClick={()=>notify('📄 PDF generated: '+inv.invoice_no+'.pdf')} style={{padding:'5px 10px',borderRadius:7,border:'1px solid #e2e8f0',background:'#fff',fontSize:9,cursor:'pointer'}}>📄 PDF</button>
                {inv.status==='pending_approval' && (
                  <>
                    <button onClick={()=>{setInvoices(p=>p.map(i=>i.id===inv.id?{...i,status:'approved'}:i));notify('✅ Invoice approved: '+inv.invoice_no)}}
                      style={{padding:'5px 12px',borderRadius:7,border:'none',background:'#10b981',color:'#fff',fontSize:9,fontWeight:700,cursor:'pointer'}}>✅ Approve</button>
                    <button onClick={()=>{setInvoices(p=>p.map(i=>i.id===inv.id?{...i,status:'disputed',discrepancy:true}:i));notify('⚠️ Dispute raised: '+inv.invoice_no)}}
                      style={{padding:'5px 12px',borderRadius:7,border:'none',background:'#ef4444',color:'#fff',fontSize:9,fontWeight:700,cursor:'pointer'}}>⚠️ Dispute</button>
                  </>
                )}
                {inv.status==='approved' && (
                  <button onClick={()=>{setInvoices(p=>p.map(i=>i.id===inv.id?{...i,status:'paid'}:i));notify('💰 Payment processed: '+inv.invoice_no)}}
                    style={{padding:'5px 12px',borderRadius:7,border:'none',background:'#3b82f6',color:'#fff',fontSize:9,fontWeight:700,cursor:'pointer'}}>💰 Mark Paid</button>
                )}
                {inv.status==='disputed' && (
                  <button onClick={()=>notify('📧 Dispute notice sent to agency for '+inv.invoice_no)} style={{padding:'5px 12px',borderRadius:7,border:'none',background:'#f59e0b',color:'#fff',fontSize:9,fontWeight:700,cursor:'pointer'}}>📧 Send Dispute Notice</button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {ctx && <ContextMenu x={ctx.x} y={ctx.y} item={ctx.item}
        impactLinks={ctx.item?.impact_links?.map(l=>l.module)}
        actions={CONTEXT_ACTIONS}
        onAction={(k,item)=>{if(k==='view')setSelected(item)}}
        onClose={()=>setCtx(null)} />}
      {showExcel && <ExcelModal title="Billing & Invoice"
        columns={['Invoice No','Vendor','Period','Workers','Days','Rate/Day','Amount (NPR)','TS Approved','Att Verified','Status','Discrepancy']}
        onClose={()=>setShowExcel(false)} onImport={f=>alert('Importing: '+f.name)} />}
      <Drawer item={selected} gradient={T.gradient} onClose={()=>setSelected(null)}
        rows={[
          ['Invoice No',   selected?.invoice_no],
          ['Vendor',       selected?.vendor],
          ['Period',       selected?.period],
          ['Workers',      selected?.workers],
          ['Days Billed',  selected?.days],
          ['Rate/Day',     selected ? 'NPR '+selected.rate_per_day.toLocaleString() : null],
          ['Amount',       selected ? 'NPR '+selected.amount_npr.toLocaleString() : null],
          ['Issue Date',   selected?.issue_date],
          ['Due Date',     selected?.due_date],
          ['TS Approved',  selected?.timesheet_approved?'Yes':'Pending'],
          ['Att Verified', selected?.attendance_verified?'Yes':'Pending'],
          ['Discrepancy',  selected?.discrepancy ? 'NPR '+(selected.discrepancy_amt||0).toLocaleString() : 'None'],
          ['AI Note',      selected?.ai_validation],
        ]}/>
    </div>
  )
}
