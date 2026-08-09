// FILE: VendorClearancePage.jsx - Vendor Clearance
// Contract-end workflow, wage clearance, access revocation, asset return

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, Badge, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#1c1917 0%,#78350f 60%,#d97706 100%)'
const A = '#78350f'

const CLEARANCES = [
  { id:'cl1', clearance_no:'CLR-2025-001', vendor_code:'VND-004_old', vendor_name:'FastCatering Nepal',
    service:'Cafeteria Services', contract_end:'2025-03-31',
    workers:8, status:'completed',
    initiated_on:'2025-03-20', completed_on:'2025-04-05',
    checklist:{
      final_invoice_cleared:    {done:true,  date:'2025-04-01', by:'Finance'},
      wages_verified_paid:      {done:true,  date:'2025-03-31', by:'HR Manager'},
      ssf_deposits_cleared:     {done:true,  date:'2025-04-01', by:'HR Manager'},
      insurance_closed:         {done:true,  date:'2025-04-02', by:'HR Manager'},
      assets_returned:          {done:true,  date:'2025-04-02', by:'Admin'},
      badges_revoked:           {done:true,  date:'2025-03-31', by:'IT/Security'},
      system_access_revoked:    {done:true,  date:'2025-03-31', by:'IT'},
      nda_confirmed:            {done:true,  date:'2025-04-03', by:'Legal'},
      labour_office_reported:   {done:true,  date:'2025-04-04', by:'HR Manager'},
      no_discrimination_cert:   {done:true,  date:'2025-04-05', by:'HR Manager'},
    },
    outstanding_amount:0, penalty_deducted:0, final_payment:0,
    labour_office_report:true, la2074_compliant:true,
    ai_note:'All clearance items completed. Nepal LA2074 obligations fully met. Safe to close.',
    impact_links:['Vendor Billing','Vendor Invoice','Labour Act 2074'] },
  { id:'cl2', clearance_no:'CLR-2025-002', vendor_code:'VND-003', vendor_name:'TechStaff Solutions Pvt.',
    service:'IT Support Staff', contract_end:'2025-12-31',
    workers:12, status:'in_progress',
    initiated_on:'2025-06-10', completed_on:null,
    checklist:{
      final_invoice_cleared:    {done:false, date:null,          by:null},
      wages_verified_paid:      {done:false, date:null,          by:null},
      ssf_deposits_cleared:     {done:false, date:null,          by:null},
      insurance_closed:         {done:false, date:null,          by:null},
      assets_returned:          {done:true,  date:'2025-06-12', by:'Admin'},
      badges_revoked:           {done:true,  date:'2025-06-10', by:'IT/Security'},
      system_access_revoked:    {done:true,  date:'2025-06-10', by:'IT'},
      nda_confirmed:            {done:false, date:null,          by:null},
      labour_office_reported:   {done:false, date:null,          by:null},
      no_discrimination_cert:   {done:false, date:null,          by:null},
    },
    outstanding_amount:8424, penalty_deducted:8424, final_payment:0,
    labour_office_report:false, la2074_compliant:false,
    ai_note:'BILLING DISPUTE PENDING. Overpayment of NPR 8,424 to be recovered before final clearance. Labour Office report required.',
    impact_links:['Dispute Alert','Labour Act 2074','Finance','HR Manager'] },
  { id:'cl3', clearance_no:'CLR-2025-003', vendor_code:'VND-OPT', vendor_name:'DrivePro Transport Services',
    service:'Driver & Transport', contract_end:'2025-06-30',
    workers:5, status:'pending',
    initiated_on:null, completed_on:null,
    checklist:{
      final_invoice_cleared:    {done:false, date:null, by:null},
      wages_verified_paid:      {done:false, date:null, by:null},
      ssf_deposits_cleared:     {done:false, date:null, by:null},
      insurance_closed:         {done:false, date:null, by:null},
      assets_returned:          {done:false, date:null, by:null},
      badges_revoked:           {done:false, date:null, by:null},
      system_access_revoked:    {done:false, date:null, by:null},
      nda_confirmed:            {done:false, date:null, by:null},
      labour_office_reported:   {done:false, date:null, by:null},
      no_discrimination_cert:   {done:false, date:null, by:null},
    },
    outstanding_amount:0, penalty_deducted:0, final_payment:0,
    labour_office_report:false, la2074_compliant:false,
    ai_note:'Contract ending Jun 30. Clearance not yet initiated. Initiate now to meet 7-day clearance window.',
    impact_links:['Labour Act 2074','Vendor Billing','HR Manager'] },
]

const STATUS_CFG = {
  pending:     {c:'#f59e0b',bg:'#fffbeb',b:'#fde68a',icon:'⏳',label:'Pending'},
  in_progress: {c:'#3b82f6',bg:'#eff6ff',b:'#bfdbfe',icon:'🔄',label:'In Progress'},
  completed:   {c:'#10b981',bg:'#f0fdf4',b:'#bbf7d0',icon:'✅',label:'Completed'},
}

const CHECKLIST_LABELS = {
  final_invoice_cleared:    'Final Invoice Cleared',
  wages_verified_paid:      'Wages Verified & Paid (LA2074 S.64)',
  ssf_deposits_cleared:     'SSF Deposits Cleared',
  insurance_closed:         'Insurance Policies Closed',
  assets_returned:          'All Assets Returned',
  badges_revoked:           'Access Badges Revoked',
  system_access_revoked:    'System Access Revoked',
  nda_confirmed:            'NDA Compliance Confirmed',
  labour_office_reported:   'Labour Office Report Filed (LA2074)',
  no_discrimination_cert:   'No-Discrimination Certificate Issued',
}

const CTX = [
  {icon:'✅',label:'Complete Checklist Item', key:'complete'},
  {icon:'🏛',label:'File Labour Office Report',key:'report'},
  {icon:'💰',label:'Process Final Payment',    key:'pay'},
  {icon:'📋',label:'View Full Clearance',      key:'view'},
  {icon:'🔗',label:'Impact Analysis',          key:'impact'},
  {icon:'📤',label:'Export Clearance Doc',     key:'export'},
]

export default function VendorClearancePage() {
  const [clears, setClears] = useState(CLEARANCES)
  const [msg, setMsg] = useState('')
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(''),3000) }
  const [showSettlement, setShowSettlement] = useState(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)
  const [showInit, setShowInit] = useState(false)

  const filtered = clears.filter(c=>{
    if (filterStatus!=='all'&&c.status!==filterStatus) return false
    if (search&&!c.vendor_name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const pending  = clears.filter(c=>c.status==='pending').length
  const inProg   = clears.filter(c=>c.status==='in_progress').length
  const done     = clears.filter(c=>c.status==='completed').length

  const toggleCheck = (clearId, key) => {
    setClears(p=>p.map(c=>{
      if (c.id!==clearId) return c
      const newChecklist = {...c.checklist, [key]:{...c.checklist[key], done:!c.checklist[key].done, date:new Date().toISOString().split('T')[0], by:'HR Manager'}}
      const allDone = Object.values(newChecklist).every(v=>v.done)
      return {...c, checklist:newChecklist, status:allDone?'completed':c.status==='pending'?'in_progress':c.status, completed_on:allDone?new Date().toISOString().split('T')[0]:null}
    }))
  }

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="✅" title="Vendor Clearance"
        breadcrumb="Organization Management > Vendor / Outsource Management"
        gradient={G}
        stats={[
          {icon:'⏳',label:'Pending',      value:pending},
          {icon:'🔄',label:'In Progress',  value:inProg},
          {icon:'✅',label:'Completed',     value:done},
          {icon:'📋',label:'Total',        value:clears.length},
        ]}
        onAdd={()=>setShowInit(true)} addLabel="Initiate Clearance"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#92400e',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>⚖</span>
        <div><strong>Nepal Labour Act 2074, Sections 52-64:</strong> Main employer must clear all wages, SSF, insurance BEFORE final clearance. Labour Office report mandatory. No discrimination in final settlement between direct and outsourced workers.</div>
      </div>

      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search clearances..."/>
        <div style={{display:'flex',gap:4,background:'#f1f5f9',padding:3,borderRadius:9}}>
          {['all','pending','in_progress','completed'].map(s=>(
            <button key={s} onClick={()=>setFilterStatus(s)}
              style={{padding:'7px 12px',borderRadius:7,border:'none',cursor:'pointer',fontSize:10,
                background:filterStatus===s?'#fff':'transparent',color:filterStatus===s?A:'#64748b',
                fontWeight:filterStatus===s?700:400,boxShadow:filterStatus===s?'0 1px 3px rgba(0,0,0,.08)':'none'}}>
              {s==='all'?'All':STATUS_CFG[s]?.label||s}
            </button>
          ))}
        </div>
      </div>

      <div style={{display:'grid',gap:16}}>
        {filtered.map(cl=>{
          const sc = STATUS_CFG[cl.status]||STATUS_CFG.pending
          const checklist = cl.checklist
          const doneCount = Object.values(checklist).filter(v=>v.done).length
          const total     = Object.keys(checklist).length
          const pct       = Math.round(doneCount/total*100)

          return (
            <div key={cl.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:cl.vendor_name,...cl}})}}
              style={{background:'#fff',border:`1.5px solid ${sc.b}`,borderRadius:16,overflow:'hidden',boxShadow:'0 2px 12px rgba(0,0,0,.05)',borderLeft:`5px solid ${sc.c}`}}>

              <div style={{display:'flex',alignItems:'center',gap:14,padding:'16px 20px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap'}}>
                <div style={{width:48,height:48,borderRadius:14,background:`${sc.c}18`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>✅</div>
                <div style={{flex:1}}>
                  <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:3,alignItems:'center'}}>
                    <span style={{fontSize:14,fontWeight:900,color:'#0f172a'}}>{cl.vendor_name}</span>
                    <span style={{background:sc.bg,color:sc.c,border:`1px solid ${sc.b}`,fontSize:10,fontWeight:700,padding:'2px 10px',borderRadius:20}}>{sc.icon} {sc.label}</span>
                    {!cl.la2074_compliant&&<span style={{background:'#fef2f2',color:'#dc2626',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>LA2074 Pending</span>}
                  </div>
                  <div style={{fontSize:11,color:'#64748b'}}>{cl.clearance_no} . {cl.service} . Contract End: {cl.contract_end} . {cl.workers} workers</div>
                </div>
                <div style={{textAlign:'center',flexShrink:0}}>
                  <div style={{fontSize:24,fontWeight:900,color:pct===100?'#10b981':pct>=50?A:'#f59e0b'}}>{pct}%</div>
                  <div style={{fontSize:9,color:'#94a3b8'}}>{doneCount}/{total} DONE</div>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{height:6,background:'#f1f5f9'}}>
                <div style={{width:`${pct}%`,height:'100%',background:pct===100?'#10b981':A,transition:'width .6s ease'}}/>
              </div>

              {/* Checklist */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0',padding:'12px 20px'}}>
                {Object.entries(checklist).map(([key,item])=>(
                  <div key={key} onClick={()=>toggleCheck(cl.id,key)}
                    style={{display:'flex',gap:8,alignItems:'center',padding:'6px 8px',cursor:'pointer',borderRadius:8,
                      background:item.done?'#f0fdf4':'transparent',
                      border:'1px solid transparent',
                      borderColor:item.done?'#bbf7d0':'transparent'}}>
                    <div style={{width:18,height:18,borderRadius:4,border:`2px solid ${item.done?'#10b981':'#d1d5db'}`,background:item.done?'#10b981':'#fff',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:10,color:'#fff',fontWeight:700}}>{item.done?'✓':''}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:10,fontWeight:600,color:item.done?'#065f46':'#374151',lineHeight:1.3}}>{CHECKLIST_LABELS[key]}</div>
                      {item.done&&<div style={{fontSize:9,color:'#94a3b8'}}>{item.by} . {item.date}</div>}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{padding:'8px 20px',background:'#f8fafc',borderTop:'1px solid #f1f5f9',fontSize:10,color:'#64748b',fontStyle:'italic',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
                <span style={{flex:1}}>{cl.ai_note}</span>
                {cl.outstanding_amount>0&&<span style={{color:'#dc2626',fontWeight:700,flexShrink:0}}>Outstanding: NPR {cl.outstanding_amount.toLocaleString()}</span>}
                <button onClick={()=>setShowSettlement(cl)} style={{padding:'6px 14px',borderRadius:8,border:'none',background:'linear-gradient(135deg,#1c1917,#78350f)',color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer',flexShrink:0}}>
                  💰 Full & Final Settlement
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {showInit&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowInit(false)}>
          <div style={{background:'#fff',borderRadius:20,width:620,maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Initiate Vendor Clearance</div></div>
            <div style={{padding:'22px 28px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
                <Field label="Vendor" type="select" value="" onChange={()=>{}} accent={A} options={['Select vendor...']}/>
                <Field label="Contract End Date" type="date" value="" onChange={()=>{}} accent={A}/>
                <Field label="Reason" type="select" value="" onChange={()=>{}} accent={A} options={['Contract End','Mutual Termination','Performance Breach','Vendor Initiated']}/>
                <Field label="Outstanding Amount (NPR)" type="number" value="" onChange={()=>{}} accent={A}/>
              </div>
              <AIImpact color={A} lines={['10-point LA2074 checklist auto-generated.','Wage and SSF clearance verified before final payment.','Labour Office report auto-filed after completion.','Access revocation triggered immediately on initiation.']}/>
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>setShowInit(false)} style={{flex:1,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Initiate Clearance</button>
                <button onClick={()=>setShowInit(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:999,boxShadow:'0 4px 16px rgba(0,0,0,.1)'}}>{msg}</div>}

      {/* FULL & FINAL SETTLEMENT MODAL */}
      {showSettlement && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowSettlement(null)}>
          <div style={{background:'#fff',borderRadius:18,padding:0,width:540,maxWidth:'95vw',maxHeight:'90vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:'linear-gradient(135deg,#1c1917,#78350f,#d97706)',padding:'16px 22px',borderRadius:'18px 18px 0 0',color:'#fff'}}>
              <div style={{fontSize:14,fontWeight:900}}>💰 Full & Final Settlement</div>
              <div style={{fontSize:10,opacity:.8,marginTop:2}}>{showSettlement.vendor_name} · {showSettlement.workers} workers · Contract end: {showSettlement.contract_end}</div>
            </div>
            <div style={{padding:'20px 24px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
                {[
                  ['Vendor / Agency',showSettlement.vendor_name],
                  ['Service',showSettlement.service],
                  ['Workers',showSettlement.workers],
                  ['Contract End',showSettlement.contract_end],
                  ['Outstanding Amount','NPR '+(showSettlement.outstanding_amount||0).toLocaleString()],
                  ['Penalty Deducted','NPR '+(showSettlement.penalty_deducted||0).toLocaleString()],
                  ['Final Net Payable','NPR '+Math.max(0,(showSettlement.outstanding_amount||0)-(showSettlement.penalty_deducted||0)).toLocaleString()],
                  ['Clearance Status',showSettlement.status],
                ].map(([k,v])=>(
                  <div key={k} style={{background:'#f8fafc',borderRadius:8,padding:'8px 12px'}}>
                    <div style={{fontSize:8,color:'#94a3b8',fontWeight:700,marginBottom:2}}>{k}</div>
                    <div style={{fontSize:12,fontWeight:700,color:'#0f172a'}}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:10,padding:'12px',marginBottom:16,fontSize:10,color:'#92400e'}}>
                ⚖️ <strong>Nepal Labour Act 2074, Section 64:</strong> All wages, SSF contributions, gratuity, and outstanding amounts must be cleared within 7 days of contract termination. Labour Office report mandatory.
              </div>
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>{notify('✅ Full & Final Settlement processed for '+showSettlement.vendor_name+'. Finance notified.');setShowSettlement(null)}}
                  style={{flex:1,padding:'11px',borderRadius:10,border:'none',background:'linear-gradient(135deg,#1c1917,#78350f)',color:'#fff',fontSize:11,fontWeight:800,cursor:'pointer'}}>💰 Process Settlement</button>
                <button onClick={()=>{notify('📄 Settlement document generated for '+showSettlement.vendor_name);setShowSettlement(null)}} style={{padding:'11px 16px',borderRadius:10,border:'1px solid #e2e8f0',background:'#fff',fontSize:11,cursor:'pointer'}}>📄 Generate Doc</button>
                <button onClick={()=>setShowSettlement(null)} style={{padding:'11px 14px',borderRadius:10,border:'1px solid #e2e8f0',background:'#fff',fontSize:11,cursor:'pointer'}}>✕</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={CTX} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Vendor Clearances" columns={['Clearance No','Vendor','Service','Workers','Contract End','Status','Final Invoice','Wages Cleared','SSF Cleared','Assets Returned','Labour Office Report']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[NepHR Import]", f.name, result); }}/>}
    </div>
  )
}
