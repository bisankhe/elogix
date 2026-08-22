// FILE: LeaveEncashmentPage.jsx - Leave Encashment (Leave Settlement)
// Apply wizard: balance verification, payout preview with tax breakdown,
// admin batch-processing grid for annual encashment runs.

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#052e16 0%,#15803d 60%,#86efac 100%)'
const A = '#15803d'

const MY_ELIGIBLE = [
  { leave_type:'Home/Annual Leave', current_balance:94.5, encash_threshold:90, encashable_days:4.5, daily_rate_npr:1083, gross_npr:4874 },
  { leave_type:'Sick Leave', current_balance:47, encash_threshold:45, encashable_days:2, daily_rate_npr:1083, gross_npr:2166 },
]

const ENCASHMENT_REQUESTS = [
  { id:'le1', employee:'Gita Maharjan', leave_type:'Home/Annual Leave', days:4.5, gross_npr:4874, tax_npr:487, net_npr:4387,
    type:'annual_excess', status:'pending', submitted:'2025-06-20',
    impact_links:['Leave Balance','Payroll Setup'] },
  { id:'le2', employee:'Bikash Rai', leave_type:'Home/Annual Leave', days:90, gross_npr:97470, tax_npr:9747, net_npr:87723,
    type:'terminal', status:'approved_finance', submitted:'2025-06-15', approved:'2025-06-17',
    impact_links:['Full & Final Settlement','Exit Management'] },
  { id:'le3', employee:'Maya Pradhan', leave_type:'Sick Leave', days:2, gross_npr:2166, tax_npr:217, net_npr:1949,
    type:'annual_excess', status:'paid', submitted:'2025-06-10', approved:'2025-06-12', paid:'2025-06-21',
    impact_links:[] },
]

const STATUS_CFG = {pending:{c:'#f59e0b',bg:'#fffbeb',icon:'⏳',label:'Pending Approval'},approved_finance:{c:'#3b82f6',bg:'#eff6ff',icon:'👔',label:'Finance Approved'},paid:{c:'#10b981',bg:'#f0fdf4',icon:'💰',label:'Paid'}}
const TYPE_LABELS = {annual_excess:'Annual Excess (Above Cap)',terminal:'Terminal (Exit Payout)'}

export default function LeaveEncashmentPage() {
  const [requests, setRequests] = useState(ENCASHMENT_REQUESTS)
  const [search, setSearch] = useState('')
  const [showApply, setShowApply] = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = requests.filter(r=>!search||r.employee.toLowerCase().includes(search.toLowerCase()))
  const totalPending = requests.filter(r=>r.status==='pending').reduce((s,r)=>s+r.net_npr,0)
  const totalPaidYTD = requests.filter(r=>r.status==='paid').reduce((s,r)=>s+r.net_npr,0)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="💰" title="Leave Encashment"
        breadcrumb="Workforce Operations > Leave Management > Leave Settlement"
        gradient={G}
        stats={[
          {icon:'📋',label:'Total Requests',  value:requests.length},
          {icon:'⏳',label:'Pending',          value:requests.filter(r=>r.status==='pending').length},
          {icon:'💰',label:'Pending Payout',   value:'NPR '+totalPending.toLocaleString()},
          {icon:'✅',label:'Paid YTD',          value:'NPR '+totalPaidYTD.toLocaleString()},
        ]}
        onAdd={()=>setShowApply(true)} addLabel="Apply for Encashment"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>⚖</span>
        <div><strong>Nepal Labour Act 2074, Section 49:</strong> Home Leave above 90 days and Sick Leave above 45 days must be compensated annually at current basic salary rate. Terminal encashment (full payout of all accumulated leave) is mandatory upon resignation, retirement, or death.</div>
      </div>

      {/* My eligible balances */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px 20px',marginBottom:16}}>
        <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:12}}>✅ Your Eligible Balances</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:12}}>
          {MY_ELIGIBLE.map((e,i)=>(
            <div key={i} style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:12,padding:'14px 16px'}}>
              <div style={{fontSize:11,fontWeight:700,color:'#0f172a',marginBottom:8}}>{e.leave_type}</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8}}>
                <div><div style={{fontSize:9,color:'#94a3b8'}}>Current Balance</div><div style={{fontSize:13,fontWeight:800,color:'#0f172a'}}>{e.current_balance}d</div></div>
                <div><div style={{fontSize:9,color:'#94a3b8'}}>Cap</div><div style={{fontSize:13,fontWeight:800,color:'#94a3b8'}}>{e.encash_threshold}d</div></div>
                <div><div style={{fontSize:9,color:'#94a3b8'}}>Encashable</div><div style={{fontSize:13,fontWeight:800,color:'#10b981'}}>{e.encashable_days}d</div></div>
                <div><div style={{fontSize:9,color:'#94a3b8'}}>Gross Payout</div><div style={{fontSize:13,fontWeight:800,color:A}}>NPR {e.gross_npr.toLocaleString()}</div></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{display:'grid',gap:12,marginTop:14}}>
        {filtered.map(r=>{
          const sc = STATUS_CFG[r.status]
          return (
            <div key={r.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:r.employee,...r}})}}
              style={{background:'#fff',border:`1.5px solid ${sc.c}33`,borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${sc.c}`}}>
              <div style={{display:'flex',alignItems:'center',gap:14,padding:'16px 20px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap'}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:4}}>
                    <span style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{r.employee}</span>
                    <span style={{background:sc.bg,color:sc.c,fontSize:10,fontWeight:700,padding:'2px 10px',borderRadius:20}}>{sc.icon} {sc.label}</span>
                    <span style={{background:'#f5f3ff',color:'#7c3aed',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{TYPE_LABELS[r.type]}</span>
                  </div>
                  <div style={{fontSize:11,color:'#64748b'}}>{r.leave_type} . {r.days} days</div>
                </div>
              </div>
              <div style={{padding:'12px 20px',display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,borderBottom:'1px solid #f8fafc'}}>
                {[{l:'Gross Payout',v:'NPR '+r.gross_npr.toLocaleString(),c:A},{l:'Tax Deduction',v:'NPR '+r.tax_npr.toLocaleString(),c:'#ef4444'},{l:'Net Payout',v:'NPR '+r.net_npr.toLocaleString(),c:'#10b981'}].map((s,i)=>(
                  <div key={i} style={{textAlign:'center',background:'#f8fafc',borderRadius:8,padding:'8px 4px'}}>
                    <div style={{fontSize:13,fontWeight:800,color:s.c}}>{s.v}</div>
                    <div style={{fontSize:8,color:'#94a3b8',fontWeight:600,marginTop:2}}>{s.l}</div>
                  </div>
                ))}
              </div>
              <div style={{padding:'8px 20px',fontSize:9,color:'#94a3b8'}}>Submitted {r.submitted}{r.paid?` . Paid ${r.paid}`:r.approved?` . Approved ${r.approved}`:''}</div>
            </div>
          )
        })}
      </div>

      {showApply&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowApply(false)}>
          <div style={{background:'#fff',borderRadius:20,width:580,maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Apply for Leave Encashment</div></div>
            <div style={{padding:'22px 28px'}}>
              <Field label="Leave Type" type="select" value="" onChange={()=>{}} accent={A} options={['Home/Annual Leave (4.5d eligible)','Sick Leave (2d eligible)']}/>
              <Field label="Days to Encash" type="number" value="" onChange={()=>{}} accent={A} required hint="Max: balance above statutory cap"/>
              <div style={{background:'#f0fdf4',borderRadius:10,padding:'12px 14px',margin:'10px 0',fontSize:11,color:'#065f46'}}>
                💰 Estimated payout: <strong>NPR 4,874 gross</strong> {'>'} <strong>NPR 4,387 net</strong> (after 10% tax withholding)
              </div>
              <AIImpact color={A} lines={['Only days above your statutory accumulation cap are eligible.','Routes to HR then Finance for dual approval before payroll sync.','Tax auto-calculated per current Income Tax Act slabs.','Approved encashment reduces your balance and credits next payroll cycle.']}/>
              <div style={{display:'flex',gap:10,marginTop:8}}>
                <button onClick={()=>setShowApply(false)} style={{flex:1,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Submit Application</button>
                <button onClick={()=>setShowApply(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Calculation',key:'view'},{icon:'✅',label:'Approve',key:'approve'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},{icon:'📤',label:'Export',key:'export'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Leave Encashment Batch" columns={['Employee','Leave Type','Days','Gross NPR','Tax NPR','Net NPR','Type','Status']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
    </div>
  )
}
