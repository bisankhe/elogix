// FILE: VendorInvoicePage.jsx - Vendor Invoice Management
// OCR upload, 3-way match, approval workflow, IRD tax compliance

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, Drawer, SearchBar, Badge, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#064e3b 0%,#047857 60%,#10b981 100%)'
const A = '#047857'

const INVOICES = [
  { id:'i1', inv_no:'INV-SG-2025-06', vendor_code:'VND-001', vendor_name:'ShieldGuard Nepal Pvt. Ltd.',
    service:'Security Services', period:'Jun 2025',
    po_no:'PO-2025-001', invoice_date:'2025-07-01', due_date:'2025-07-05',
    amount_billed:926230, tds_deducted:12461, net_payable:913769,
    ocr_scanned:true, po_matched:true, grn_matched:true, invoice_matched:true,
    status:'approved', ai_validation:'Pass', ai_fraud_risk:5,
    approval_chain:[{role:'HR Manager',status:'approved',by:'Priya Adhikari',date:'2025-07-02'},{role:'Finance',status:'approved',by:'Sanjay Karki',date:'2025-07-03'}],
    payment_date:'2025-07-04', payment_ref:'NABIL-TXN-20250704',
    ai_note:'All 3 checks match. OCR extracted correctly. TDS certificate generated.',
    impact_links:['Vendor Billing','SLA Contract','Finance','Clearance'] },
  { id:'i2', inv_no:'INV-CP-2025-06', vendor_code:'VND-002', vendor_name:'CleanPro Services Nepal',
    service:'Housekeeping', period:'Jun 2025',
    po_no:'PO-2025-003', invoice_date:'2025-07-03', due_date:'2025-07-07',
    amount_billed:330921, tds_deducted:4452, net_payable:326469,
    ocr_scanned:true, po_matched:true, grn_matched:true, invoice_matched:false,
    status:'pending_ap',ai_validation:'Partial', ai_fraud_risk:22,
    approval_chain:[{role:'HR Manager',status:'approved',by:'Priya Adhikari',date:'2025-07-04'},{role:'Finance',status:'pending',by:null,date:null}],
    payment_date:null, payment_ref:null,
    ai_note:'Pending Finance approval. Invoice amount matches PO. Minor formatting issue on invoice.',
    impact_links:['Vendor Billing','Finance'] },
  { id:'i3', inv_no:'INV-TS-2025-06', vendor_code:'VND-003', vendor_name:'TechStaff Solutions Pvt.',
    service:'IT Support Staff', period:'Jun 2025',
    po_no:'PO-2025-005', invoice_date:'2025-07-02', due_date:'2025-07-10',
    amount_billed:294582, tds_deducted:3964, net_payable:290618,
    ocr_scanned:true, po_matched:false, grn_matched:true, invoice_matched:false,
    status:'disputed',ai_validation:'Fail', ai_fraud_risk:71,
    approval_chain:[{role:'HR Manager',status:'flagged',by:'Priya Adhikari',date:'2025-07-03'},{role:'Finance',status:'pending',by:null,date:null}],
    payment_date:null, payment_ref:null,
    ai_note:'MISMATCH: Invoice rate NPR 847/day vs PO rate NPR 820/day. Overbilled by NPR 8,424. DO NOT APPROVE.',
    impact_links:['Dispute','Vendor Billing','Contract Alert','Finance'] },
  { id:'i4', inv_no:'INV-SE-2025-06', vendor_code:'VND-004', vendor_name:'SalaryExpert Payroll Nepal',
    service:'Payroll Processing', period:'Jun 2025',
    po_no:'PO-2024-012', invoice_date:'2025-06-28', due_date:'2025-06-30',
    amount_billed:53520, tds_deducted:720, net_payable:52800,
    ocr_scanned:true, po_matched:true, grn_matched:true, invoice_matched:true,
    status:'paid',ai_validation:'Pass', ai_fraud_risk:3,
    approval_chain:[{role:'HR Manager',status:'approved',by:'Priya Adhikari',date:'2025-06-28'},{role:'Finance',status:'paid',by:'Sanjay Karki',date:'2025-06-30'}],
    payment_date:'2025-06-30', payment_ref:'NABIL-TXN-20250630',
    ai_note:'Perfect match. Retainer invoice. Paid within SLA window.',
    impact_links:['Payroll','Finance'] },
]

const STATUS_CFG = {
  pending_ap: {c:'#f59e0b',bg:'#fffbeb',b:'#fde68a',icon:'⏳',label:'Pending AP'},
  approved:   {c:'#3b82f6',bg:'#eff6ff',b:'#bfdbfe',icon:'✅',label:'Approved'},
  disputed:   {c:'#ef4444',bg:'#fef2f2',b:'#fecaca',icon:'⚠',label:'Disputed'},
  paid:       {c:'#10b981',bg:'#f0fdf4',b:'#bbf7d0',icon:'💰',label:'Paid'},
}
const CTX = [
  {icon:'👁',label:'View Invoice',          key:'view'},
  {icon:'🔍',label:'OCR Re-scan',           key:'ocr'},
  {icon:'✅',label:'Approve Invoice',        key:'approve'},
  {icon:'⚠',label:'Raise Dispute',          key:'dispute'},
  {icon:'💰',label:'Process Payment',        key:'pay'},
  {icon:'🧾',label:'Generate TDS Certificate',key:'tds'},
  {icon:'🔗',label:'Impact Analysis',        key:'impact'},
  {icon:'📤',label:'Export',                 key:'export'},
]

export default function VendorInvoicePage() {
  const [invoices, setInvoices] = useState(INVOICES)
  const [search,   setSearch]   = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selected, setSelected] = useState(null)
  const [showUpload, setShowUpload] = useState(false)
  const [msg, setMsg] = useState('')
  const [followUps, setFollowUps] = useState({})
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(''),3000) }
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = invoices.filter(i=>{
    if (filterStatus!=='all'&&i.status!==filterStatus) return false
    if (search&&!i.vendor_name.toLowerCase().includes(search.toLowerCase())&&!i.inv_no.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const totalPayable = invoices.reduce((s,i)=>s+i.net_payable,0)
  const paid         = invoices.filter(i=>i.status==='paid').length
  const disputed     = invoices.filter(i=>i.status==='disputed').length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🧾" title="Vendor Invoice Management"
        breadcrumb="Organization Management > Vendor / Outsource Management"
        gradient={G}
        stats={[
          {icon:'🧾',label:'Total Invoices',  value:invoices.length},
          {icon:'💰',label:'Net Payable',      value:'NPR '+(totalPayable/100000).toFixed(1)+'L'},
          {icon:'✅',label:'Paid',              value:paid},
          {icon:'⚠',label:'Disputed',          value:disputed},
        ]}
        onAdd={()=>setShowUpload(true)} addLabel="Upload Invoice"
        onExcel={()=>setShowExcel(true)}/>

      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:999,boxShadow:'0 4px 16px rgba(0,0,0,.1)'}}>{msg}</div>}

      <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:12,padding:'10px 16px',marginBottom:14,display:'flex',gap:10,fontSize:11,color:'#065f46'}}>
        <span style={{fontSize:18}}>🤖</span>
        <div><strong>OCR + AI 3-Way Match:</strong> Upload PDF invoice for automatic data extraction and validation against PO + Goods/Services Receipt + Contract rates. Target: under 3.5-day cycle time per global standard.</div>
      </div>

      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search by invoice no, vendor..."/>
        <div style={{display:'flex',gap:4,background:'#f1f5f9',padding:3,borderRadius:9}}>
          {['all','pending_ap','approved','disputed','paid'].map(s=>(
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
        {filtered.map(inv=>{
          const sc = STATUS_CFG[inv.status]||STATUS_CFG.pending_ap
          const allMatch = inv.po_matched&&inv.grn_matched&&inv.invoice_matched
          return (
            <div key={inv.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:inv.vendor_name,...inv}})}}
              style={{background:'#fff',border:`1.5px solid ${inv.status==='disputed'?'#fecaca':sc.b}`,
                borderRadius:16,overflow:'hidden',boxShadow:'0 2px 12px rgba(0,0,0,.05)',
                borderLeft:`5px solid ${sc.c}`}}>

              <div style={{display:'flex',alignItems:'center',gap:14,padding:'16px 20px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap'}}>
                <div style={{width:48,height:48,borderRadius:14,background:`${sc.c}18`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>🧾</div>
                <div style={{flex:1}}>
                  <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:3,alignItems:'center'}}>
                    <span style={{fontSize:14,fontWeight:900,color:'#0f172a'}}>{inv.vendor_name}</span>
                    <span style={{background:sc.bg,color:sc.c,border:`1px solid ${sc.b}`,fontSize:10,fontWeight:700,padding:'2px 10px',borderRadius:20}}>{sc.icon} {sc.label}</span>
                    {inv.ocr_scanned&&<span style={{background:'#f0fdf4',color:'#15803d',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>OCR Scanned</span>}
                    {inv.ai_fraud_risk>60&&<span style={{background:'#fef2f2',color:'#dc2626',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>Fraud Risk: {inv.ai_fraud_risk}%</span>}
                  </div>
                  <div style={{fontSize:11,color:'#64748b'}}>{inv.inv_no} . PO: {inv.po_no} . {inv.period} . Due {inv.due_date}</div>
                </div>
                <div style={{textAlign:'right',flexShrink:0}}>
                  <div style={{fontSize:20,fontWeight:900,color:A}}>NPR {(inv.net_payable/1000).toFixed(0)}K</div>
                  <div style={{fontSize:9,color:'#94a3b8'}}>NET PAYABLE</div>
                  <div style={{fontSize:10,color:'#64748b'}}>TDS: NPR {(inv.tds_deducted/1000).toFixed(1)}K</div>
                </div>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:0,borderBottom:'1px solid #f1f5f9'}}>
                {/* 3-way match */}
                <div style={{padding:'12px 16px',borderRight:'1px solid #f1f5f9'}}>
                  <div style={{fontSize:11,fontWeight:700,color:'#334155',marginBottom:6}}>3-Way Match</div>
                  {[['Purchase Order',inv.po_matched],['Goods/Service Receipt',inv.grn_matched],['Invoice Amount',inv.invoice_matched]].map(([l,ok])=>(
                    <div key={l} style={{display:'flex',justifyContent:'space-between',marginBottom:3,fontSize:10}}>
                      <span style={{color:'#64748b'}}>{l}</span>
                      <span style={{color:ok?'#10b981':'#ef4444',fontWeight:700}}>{ok?'MATCH':'FAIL'}</span>
                    </div>
                  ))}
                  <div style={{marginTop:6,textAlign:'center',fontSize:10,fontWeight:800,padding:'4px 8px',borderRadius:8,
                    background:allMatch?'#f0fdf4':'#fef2f2',color:allMatch?'#15803d':'#dc2626'}}>
                    {allMatch?'3/3 CLEARED':'ACTION NEEDED'}
                  </div>
                </div>

                {/* Approval chain */}
                <div style={{padding:'12px 16px',borderRight:'1px solid #f1f5f9'}}>
                  <div style={{fontSize:11,fontWeight:700,color:'#334155',marginBottom:6}}>Approval Chain</div>
                  {inv.approval_chain.map((step,i)=>(
                    <div key={i} style={{marginBottom:5}}>
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:10}}>
                        <span style={{color:'#475569',fontWeight:600}}>{step.role}</span>
                        <span style={{color:step.status==='approved'||step.status==='paid'?'#10b981':step.status==='flagged'?'#ef4444':'#f59e0b',fontWeight:700,textTransform:'capitalize'}}>{step.status}</span>
                      </div>
                      {step.by&&<div style={{fontSize:9,color:'#94a3b8'}}>{step.by} . {step.date}</div>}
                    </div>
                  ))}
                </div>

                {/* AI assessment */}
                <div style={{padding:'12px 16px'}}>
                  <div style={{fontSize:11,fontWeight:700,color:'#334155',marginBottom:6}}>AI Validation</div>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                    <div style={{flex:1,height:6,background:'#e2e8f0',borderRadius:6,overflow:'hidden'}}>
                      <div style={{width:`${inv.ai_fraud_risk}%`,height:'100%',background:inv.ai_fraud_risk>60?'#ef4444':inv.ai_fraud_risk>30?'#f59e0b':'#10b981',borderRadius:6}}/>
                    </div>
                    <span style={{fontSize:11,fontWeight:800,color:inv.ai_fraud_risk>60?'#ef4444':inv.ai_fraud_risk>30?'#f59e0b':'#10b981',flexShrink:0}}>{inv.ai_fraud_risk}%</span>
                  </div>
                  <div style={{fontSize:9,color:'#64748b',fontStyle:'italic',lineHeight:1.4}}>{inv.ai_note}</div>
                </div>
              </div>

              {inv.payment_ref&&(
                <div style={{padding:'8px 20px',background:'#f0fdf4',fontSize:10,color:'#15803d'}}>
                  Paid: <strong>{inv.payment_date}</strong> . Ref: {inv.payment_ref}
                </div>
              )}

              <div style={{padding:'8px 14px',display:'flex',gap:6,justifyContent:'flex-end',flexWrap:'wrap'}}>
                <button onClick={()=>setSelected(inv)} style={{padding:'7px 12px',borderRadius:8,border:`1px solid ${A}33`,background:'#f0fdf4',color:A,fontSize:10,fontWeight:600,cursor:'pointer'}}>👁 View</button>
                <button onClick={()=>notify('🖨️ Printing: '+inv.inv_no)} style={{padding:'7px 10px',borderRadius:8,border:'1px solid #e2e8f0',background:'#fff',fontSize:10,cursor:'pointer'}}>🖨️ Print</button>
                <button onClick={()=>notify('📤 Exported: '+inv.inv_no+'.xlsx')} style={{padding:'7px 10px',borderRadius:8,border:'1px solid #e2e8f0',background:'#fff',fontSize:10,cursor:'pointer'}}>📤 Export</button>
                <button onClick={()=>{setFollowUps(p=>({...p,[inv.id]:(p[inv.id]||0)+1}));notify('📞 Follow-up reminder sent to Finance for '+inv.inv_no+' — attempt '+(((followUps[inv.id]||0)+1)))}}
                  style={{padding:'7px 10px',borderRadius:8,border:'none',background:'#f59e0b',color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>
                  🔔 Follow Up {followUps[inv.id]?'('+followUps[inv.id]+'x)':''}
                </button>
                {inv.status==='pending_ap'&&<button onClick={()=>setInvoices(p=>p.map(i=>i.id===inv.id?{...i,status:'approved'}:i))} style={{padding:'7px 12px',borderRadius:8,border:'none',background:G,color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>✅ Approve</button>}
                <button onClick={()=>notify('📧 Invoice '+inv.inv_no+' re-sent to company Finance')} style={{padding:'7px 10px',borderRadius:8,border:'none',background:'#3b82f6',color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>📧 Resend</button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Upload Invoice Modal */}
      {showUpload&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowUpload(false)}>
          <div style={{background:'#fff',borderRadius:20,width:640,maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Upload Vendor Invoice (OCR)</div></div>
            <div style={{padding:'22px 28px'}}>
              <div style={{border:'2px dashed #bbf7d0',borderRadius:14,padding:'30px',textAlign:'center',marginBottom:16,cursor:'pointer',background:'#f0fdf4'}}>
                <div style={{fontSize:32,marginBottom:8}}>📄</div>
                <div style={{fontSize:13,fontWeight:700,color:'#065f46',marginBottom:4}}>Drag & Drop Invoice PDF/Image</div>
                <div style={{fontSize:11,color:'#64748b'}}>or click to upload. AI OCR will extract data automatically.</div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
                <Field label="Vendor" type="select" value="" onChange={()=>{}} accent={A} options={['ShieldGuard Nepal','CleanPro Services','TechStaff Solutions']}/>
                <Field label="PO Number" value="" onChange={()=>{}} accent={A}/>
              </div>
              <AIImpact color={A} lines={['OCR reads PDF to extract amounts, dates, and tax codes.','3-way match auto-runs on upload.','TDS certificate generated on approval.','Cycle time target: under 3.5 days.']}/>
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>setShowUpload(false)} style={{flex:1,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Upload & OCR Scan</button>
                <button onClick={()=>setShowUpload(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={CTX} onAction={(k,item)=>{if(k==='view')setSelected(item)}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Vendor Invoices" columns={['Invoice No','Vendor Code','Vendor Name','PO No','Period','Invoice Date','Due Date','Amount NPR','TDS NPR','Net Payable','Status','Payment Date','Payment Ref']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
      <Drawer item={selected} gradient={G} onClose={()=>setSelected(null)} rows={[
        ['Invoice No',selected?.inv_no],['Vendor',selected?.vendor_name],['PO No',selected?.po_no],
        ['Period',selected?.period],['Invoice Date',selected?.invoice_date],['Due Date',selected?.due_date],
        ['Amount Billed','NPR '+(selected?.amount_billed||0)],['TDS Deducted','NPR '+(selected?.tds_deducted||0)],
        ['Net Payable','NPR '+(selected?.net_payable||0)],
        ['PO Match',selected?.po_matched?'YES':'NO'],['GRN Match',selected?.grn_matched?'YES':'NO'],
        ['Invoice Match',selected?.invoice_matched?'YES':'NO'],
        ['Fraud Risk',selected?.ai_fraud_risk+'%'],['AI Note',selected?.ai_note],
        ['Status',selected?.status],['Payment Date',selected?.payment_date||'Pending'],
        ['Payment Ref',selected?.payment_ref||'N/A'],
      ]}/>
    </div>
  )
}
