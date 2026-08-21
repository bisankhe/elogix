// FILE: LeaveBalanceRulePage.jsx - Leave Balance Rule (Leave Management)
// Automated accrual matrix: monthly/annual/daily-continuous accrual formulas,
// pro-ration for mid-year hires, carry-forward caps, encashment thresholds,
// use-it-or-lose-it expiration. Nepal LA2074 thresholds pre-loaded.

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fdba74 100%)'
const A = '#c2410c'

const ACCRUAL_METHODS = ['Monthly Accrual','Annual Upfront (Frontload)','Daily Continuous Accrual','Pro-Rata on Joining']

const BALANCE_RULES = [
  { id:'br1', leave_type:'Home/Annual Leave', code:'HL', accrual_method:'Daily Continuous Accrual',
    accrual_formula:'1 day per 20 worked days', monthly_equivalent:1.5,
    max_carry_forward_days:90, encashable_above:90, expiration:'No expiry - accumulates until encashed',
    proration_on_join:true, negative_balance_allowed:false, status:'active',
    impact_links:['Leave Type','Full & Final Settlement'] },
  { id:'br2', leave_type:'Sick Leave', code:'SL', accrual_method:'Annual Upfront (Frontload)',
    accrual_formula:'12 days/year, pro-rata if <1yr', monthly_equivalent:1.0,
    max_carry_forward_days:45, encashable_above:45, expiration:'No expiry - accumulates until encashed',
    proration_on_join:true, negative_balance_allowed:true, status:'active',
    impact_links:['Leave Type'] },
  { id:'br3', leave_type:'Maternity Leave', code:'ML', accrual_method:'Annual Upfront (Frontload)',
    accrual_formula:'98 days per pregnancy (60 paid)', monthly_equivalent:null,
    max_carry_forward_days:0, encashable_above:null, expiration:'Per-event, non-accumulating',
    proration_on_join:false, negative_balance_allowed:false, status:'active',
    impact_links:[] },
  { id:'br4', leave_type:'Casual/Unpaid Leave', code:'UL', accrual_method:'Pro-Rata on Joining',
    accrual_formula:'No statutory entitlement - discretionary', monthly_equivalent:null,
    max_carry_forward_days:0, encashable_above:null, expiration:'No carry forward',
    proration_on_join:false, negative_balance_allowed:true, status:'active',
    impact_links:[] },
]

export default function LeaveBalanceRulePage() {
  const [rules, setRules] = useState(BALANCE_RULES)
  const [search, setSearch] = useState('')
  const [showWizard, setShowWizard] = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)
  const [form, setForm] = useState({})

  const filtered = rules.filter(r=>!search||r.leave_type.toLowerCase().includes(search.toLowerCase()))
  const accumulatingCount = rules.filter(r=>r.max_carry_forward_days>0).length
  const encashableCount = rules.filter(r=>r.encashable_above).length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🧮" title="Leave Balance Rule"
        breadcrumb="Workforce Operations > Leave Management > Leave Setup"
        gradient={G}
        stats={[
          {icon:'🧮',label:'Balance Rules',      value:rules.length},
          {icon:'📈',label:'Accumulating Types', value:accumulatingCount},
          {icon:'💰',label:'Encashable Types',   value:encashableCount},
          {icon:'⚖',label:'LA2074 Aligned',     value:'Yes'},
        ]}
        onAdd={()=>setShowWizard(true)} addLabel="Add Balance Rule"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#7c2d12',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>⚖</span>
        <div><strong>Nepal Labour Act 2074:</strong> Home Leave accumulates up to 90 days, Sick Leave up to 45 days - both encashable above these thresholds, and fully paid out as a lump sum upon resignation/retirement regardless of accumulation cap. Accrual formula: <code>Annual Grant ÷ Total Working Days × Days Elapsed</code>.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by leave type..."/>

      <div style={{display:'grid',gap:14,marginTop:14}}>
        {filtered.map(r=>(
          <div key={r.id}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:r.leave_type,...r}})}}
            style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)'}}>
            <div style={{display:'flex',alignItems:'center',gap:14,padding:'14px 18px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap'}}>
              <div style={{flex:1}}>
                <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:2}}>
                  <span style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{r.leave_type}</span>
                  <span style={{background:`${A}15`,color:A,fontSize:9,fontWeight:700,padding:'1px 8px',borderRadius:20}}>{r.code}</span>
                  <span style={{background:'#f0fdf4',color:'#15803d',fontSize:9,fontWeight:700,padding:'1px 8px',borderRadius:20}}>{r.accrual_method}</span>
                </div>
                <div style={{fontSize:10,color:'#64748b'}}>{r.accrual_formula}</div>
              </div>
              {r.monthly_equivalent&&(
                <div style={{textAlign:'center',flexShrink:0}}>
                  <div style={{fontSize:16,fontWeight:900,color:A}}>{r.monthly_equivalent}</div>
                  <div style={{fontSize:8,color:'#94a3b8',fontWeight:700}}>DAYS/MONTH</div>
                </div>
              )}
            </div>

            <div style={{padding:'12px 18px',display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,borderBottom:'1px solid #f8fafc'}}>
              {[{l:'Max Carry Forward',v:r.max_carry_forward_days?r.max_carry_forward_days+' days':'None',c:r.max_carry_forward_days?'#10b981':'#94a3b8'},
                {l:'Encashable Above',v:r.encashable_above?r.encashable_above+' days':'N/A',c:r.encashable_above?'#f59e0b':'#94a3b8'},
                {l:'Pro-Rated on Join',v:r.proration_on_join?'Yes':'No',c:r.proration_on_join?'#10b981':'#94a3b8'},
                {l:'Negative Balance',v:r.negative_balance_allowed?'Allowed':'Blocked',c:r.negative_balance_allowed?'#f59e0b':'#ef4444'}].map((s,i)=>(
                <div key={i} style={{textAlign:'center',background:'#f8fafc',borderRadius:8,padding:'8px 4px'}}>
                  <div style={{fontSize:11,fontWeight:800,color:s.c}}>{s.v}</div>
                  <div style={{fontSize:8,color:'#94a3b8',fontWeight:600,marginTop:2}}>{s.l}</div>
                </div>
              ))}
            </div>

            <div style={{padding:'10px 18px',fontSize:10,color:'#64748b'}}>
              <strong>Expiration:</strong> {r.expiration}
            </div>
          </div>
        ))}
      </div>

      {showWizard&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowWizard(false)}>
          <div style={{background:'#fff',borderRadius:20,width:600,maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Add Leave Balance Rule</div></div>
            <div style={{padding:'22px 28px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Leave Type</label>
                <select value={form.leaveType||"Home/Annual Leave"} onChange={e=>setForm(p=>({...p,leaveType:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',background:'#fff',boxSizing:'border-box'}}><option key="Home/Annual Leave" value="Home/Annual Leave">Home/Annual Leave</option><option key="Sick Leave" value="Sick Leave">Sick Leave</option><option key="Maternity Leave" value="Maternity Leave">Maternity Leave</option><option key="Paternity Leave" value="Paternity Leave">Paternity Leave</option><option key="Mourning Leave" value="Mourning Leave">Mourning Leave</option><option key="Casual/Unpaid Leave" value="Casual/Unpaid Leave">Casual/Unpaid Leave</option></select>
                </div>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Accrual Method</label>
                <input type="text" value={form.accrualMethod||""} onChange={e=>setForm(p=>({...p,accrualMethod:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                </div>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Annual Grant (days)</label>
                <input type="number" value={form.annualGrantDays||""} onChange={e=>setForm(p=>({...p,annualGrantDays:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                </div>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Max Carry Forward (days)</label>
                <input type="number" value={form.maxCarryForwardDays||""} onChange={e=>setForm(p=>({...p,maxCarryForwardDays:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                </div>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Encashable Above (days)</label>
                <input type="number" value={form.encashableAboveDays||""} onChange={e=>setForm(p=>({...p,encashableAboveDays:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                </div>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Pro-Rate on Mid-Year Join</label>
                <select value={form.prorateOnMidyearJoin||"Yes"} onChange={e=>setForm(p=>({...p,prorateOnMidyearJoin:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',background:'#fff',boxSizing:'border-box'}}><option key="Yes" value="Yes">Yes</option><option key="No" value="No">No</option></select>
                </div>
              </div>
              <label style={{display:'flex',gap:8,alignItems:'center',margin:'10px 0',fontSize:12,color:'#374151',cursor:'pointer'}}>
                <input type="checkbox" style={{accentColor:A}}/> Allow negative balance (advance against future accrual)
              </label>
              <AIImpact color={A} lines={['Auto-calculates daily accrual: Annual Grant ÷ Working Days × Days Elapsed.','Mid-year joiners automatically pro-rated from their join date.','Use-it-or-lose-it expiration auto-flags balances nearing cutoff.','Encashment auto-triggers Full & Final Settlement calculations on exit.']}/>
              <div style={{display:'flex',gap:10,marginTop:8}}>
                <button onClick={()=>setShowWizard(false)} style={{flex:1,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Save Rule</button>
                <button onClick={()=>setShowWizard(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Accrual History',key:'view'},{icon:'✏',label:'Edit Rule',key:'edit'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},{icon:'📤',label:'Export',key:'export'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Leave Balance Rules" columns={['Leave Type','Accrual Method','Annual Grant','Max Carry Forward','Encashable Above','Pro-Rated','Negative Balance Allowed']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
    </div>
  )
