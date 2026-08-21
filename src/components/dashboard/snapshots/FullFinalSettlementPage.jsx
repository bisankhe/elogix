// FILE: FullFinalSettlementPage.jsx - Full & Final Settlement (Settlement & Documents)
// 3-step wireframe: Clearance -> Computation grid -> Payout. Nepal LA2074: 15-day deadline.

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#052e16 0%,#15803d 60%,#86efac 100%)'
const A = '#15803d'

const SETTLEMENTS = [
  { id:'fnf1', employee:'Dipendra Yadav', position:'Junior Accountant', lwd:'2025-07-10',
    resignation_date:'2025-06-10', deadline:'2025-07-25', days_remaining:34,
    clearance_complete:true,
    earnings:{unpaid_salary:42000,leave_encashment:18500,gratuity:24500,pf_employer:8000,bonus:0,overtime:0},
    deductions:{tds:4200,advance_recovery:0,asset_damage:0,notice_shortfall:0,loan_recovery:0},
    net_payable:88800, payout_method:'bank_transfer', payout_status:'processed', payout_date:'2025-07-12',
    impact_links:['Experience Letter','Relieving Letter','Exit Clearance'] },
  { id:'fnf2', employee:'Anjali Sharma', position:'Sales Executive', lwd:'2025-06-22',
    resignation_date:'2025-06-18', deadline:'2025-07-07', days_remaining:16,
    clearance_complete:false,
    earnings:{unpaid_salary:28000,leave_encashment:6200,gratuity:3100,pf_employer:1850,bonus:0,overtime:1200},
    deductions:{tds:1400,advance_recovery:5000,asset_damage:0,notice_shortfall:5250,loan_recovery:0},
    net_payable:28700, payout_method:'bank_transfer', payout_status:'pending', payout_date:null,
    impact_links:['Exit Clearance','Asset Return'] },
]

const STATUS_CFG = {
  settled:{c:'#10b981',bg:'#f0fdf4',icon:'✅',label:'Settled'},
  awaiting_clearance:{c:'#f59e0b',bg:'#fffbeb',icon:'⏳',label:'Awaiting Clearance'},
  overdue:{c:'#ef4444',bg:'#fef2f2',icon:'🚨',label:'Overdue (15-Day Breach)'},
const EARNING_LABELS = {unpaid_salary:'Unpaid Salary',leave_encashment:'Leave Encashment',gratuity:'Gratuity',pf_employer:'PF (Employer)',bonus:'Bonus',overtime:'Overtime'}
const DEDUCTION_LABELS = {tds:'TDS (Tax)',advance_recovery:'Advance Recovery',asset_damage:'Asset Damage',notice_shortfall:'Notice Shortfall',loan_recovery:'Loan Recovery'}

export default function FullFinalSettlementPage() {
  const [settlements, setSettlements] = useState(SETTLEMENTS)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)

  const [showAdd, setShowAdd] = useState(false)
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState({employee:'',position:'',lwd:'',resignation_date:'',unpaid_salary:'',leave_enc:'',gratuity:'',pf:'',advance:'',notice_short:'',tds:''})
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(''),3000) }
  const filtered = settlements.filter(s=>!search||s.employee.toLowerCase().includes(search.toLowerCase()))
  const overdueCount = settlements.filter(s=>s.days_remaining<0).length
  const totalPending = settlements.filter(s=>s.payout_status==='pending').reduce((s,x)=>s+x.net_payable,0)

  const totalEarnings = (e) => Object.values(e).reduce((s,v)=>s+v,0)
  const totalDeductions = (d) => Object.values(d).reduce((s,v)=>s+v,0)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="💰" title="Full & Final Settlement"
        breadcrumb="Employee Lifecycle > Offboarding > Settlement & Documents"
        gradient={G}
        stats={[
          {icon:'💰',label:'In Process',       value:settlements.length},
          {icon:'✅',label:'Settled',           value:settlements.filter(s=>s.status==='settled').length},
          {icon:'🚨',label:'Overdue (15-Day)',  value:overdueCount},
          {icon:'⏳',label:'Pending Payout',    value:'NPR '+totalPending.toLocaleString()},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="+ Create F&F" onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>⚖</span>
        <div><strong>Nepal Labour Act 2074 - 15-Day Deadline:</strong> Total Pay = Unpaid Salary + Leave Encashment + Gratuity + PF − Deductions (Tax/Assets). All dues must be paid within 15 days of resignation/termination date. Penalty: failure to settle means employer must continue paying remuneration as if still employed until cleared.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{display:'grid',gap:16,marginTop:14}}>
        {filtered.map(s=>{
          const sc = s.days_remaining<0 ? STATUS_CFG.overdue : STATUS_CFG[s.status]
          const earnTotal = totalEarnings(s.earnings)
          const dedTotal = totalDeductions(s.deductions)
          return (
            <div key={s.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:s.employee,...s}})}}
              style={{background:'#fff',border:`1.5px solid ${sc.c}33`,borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${sc.c}`}}>
              <div style={{display:'flex',alignItems:'center',gap:14,padding:'16px 20px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap'}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:4}}>
                    <span style={{fontSize:14,fontWeight:900,color:'#0f172a'}}>{s.employee}</span>
                    <span style={{background:sc.bg,color:sc.c,fontSize:10,fontWeight:700,padding:'2px 10px',borderRadius:20}}>{sc.icon} {sc.label}</span>
                    {!s.clearance_complete&&<span style={{background:'#fef2f2',color:'#dc2626',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>Clearance Incomplete</span>}
                  </div>
                  <div style={{fontSize:11,color:'#64748b'}}>{s.position} . LWD {s.lwd}</div>
                  <div style={{fontSize:10,color:s.days_remaining<=5?'#ef4444':'#94a3b8',marginTop:2,fontWeight:s.days_remaining<=5?700:400}}>
                    ⏰ {s.days_remaining>=0?`${s.days_remaining} days until 15-day deadline (${s.deadline})`:`${Math.abs(s.days_remaining)} days OVERDUE`}
                  </div>
                </div>
                <div style={{textAlign:'center',flexShrink:0}}>
                  <div style={{fontSize:20,fontWeight:900,color:A}}>NPR {s.net_payable.toLocaleString()}</div>
                  <div style={{fontSize:8,color:'#94a3b8',fontWeight:700}}>NET PAYABLE</div>
                </div>
              </div>

              {/* Step 2: Computation Grid */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:0,borderBottom:'1px solid #f8fafc'}}>
                <div style={{padding:'12px 18px',borderRight:'1px solid #f8fafc'}}>
                  <div style={{fontSize:10,fontWeight:700,color:'#15803d',marginBottom:6}}>EARNINGS (+)</div>
                  {Object.entries(s.earnings).map(([k,v])=>v>0&&(
                    <div key={k} style={{display:'flex',justifyContent:'space-between',fontSize:10,padding:'3px 0'}}>
                      <span style={{color:'#64748b'}}>{EARNING_LABELS[k]}</span>
                      <span style={{fontWeight:600,color:'#0f172a'}}>NPR {v.toLocaleString()}</span>
                    </div>
                  ))}
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:10,padding:'4px 0',marginTop:4,borderTop:'1px solid #f1f5f9',fontWeight:800,color:'#15803d'}}>
                    <span>Total Earnings</span><span>NPR {earnTotal.toLocaleString()}</span>
                  </div>
                </div>
                <div style={{padding:'12px 18px'}}>
                  <div style={{fontSize:10,fontWeight:700,color:'#dc2626',marginBottom:6}}>DEDUCTIONS (−)</div>
                  {Object.entries(s.deductions).map(([k,v])=>v>0&&(
                    <div key={k} style={{display:'flex',justifyContent:'space-between',fontSize:10,padding:'3px 0'}}>
                      <span style={{color:'#64748b'}}>{DEDUCTION_LABELS[k]}</span>
                      <span style={{fontWeight:600,color:'#0f172a'}}>NPR {v.toLocaleString()}</span>
                    </div>
                  ))}
                  {dedTotal===0&&<div style={{fontSize:10,color:'#94a3b8'}}>No deductions</div>}
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:10,padding:'4px 0',marginTop:4,borderTop:'1px solid #f1f5f9',fontWeight:800,color:'#dc2626'}}>
                    <span>Total Deductions</span><span>NPR {dedTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Step 3: Payout */}
              <div style={{padding:'10px 20px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span style={{fontSize:10,color:'#64748b'}}>
                  Payout: <strong>{s.payout_method==='bank_transfer'?'Bank Transfer (NEFT)':s.payout_method}</strong>
                  {s.payout_date&&` . Paid ${s.payout_date}`}
                </span>
                <div style={{display:'flex',gap:6}}>
                  <button style={{padding:'6px 14px',borderRadius:8,border:`1px solid ${A}33`,background:'#f0fdf4',color:A,fontSize:11,fontWeight:600,cursor:'pointer'}}>View Statement</button>
                  {s.status==='awaiting_clearance'?(
                    <button disabled style={{padding:'6px 14px',borderRadius:8,border:'none',background:'#e2e8f0',color:'#94a3b8',fontSize:11,fontWeight:700,cursor:'not-allowed'}}>Process Payout (Clearance Pending)</button>
                  ):s.payout_status==='pending'?(
                    <button style={{padding:'6px 14px',borderRadius:8,border:'none',background:G,color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>Process Payout</button>
                  ):(
                    <button onClick={()=>setSelected(s)} style={{padding:'6px 14px',borderRadius:8,border:'none',background:'#eff6ff',color:'#1d4ed8',fontSize:11,fontWeight:700,cursor:'pointer'}}>Generate Letters</button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:360}}>{msg}</div>}

      {showAdd&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.55)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowAdd(false)}>
          <div style={{background:'#fff',borderRadius:18,padding:0,width:560,maxWidth:'95vw',maxHeight:'90vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'16px 22px',borderRadius:'18px 18px 0 0',color:'#fff'}}>
              <div style={{fontSize:14,fontWeight:900}}>💰 Create Full & Final Settlement</div>
              <div style={{fontSize:10,opacity:.8,marginTop:2}}>Nepal LA2074: All dues must be cleared within 15 days of LWD</div>
            </div>
            <div style={{padding:'20px 24px'}}>
              <div style={{background:'#fef9c3',border:'1px solid #fde68a',borderRadius:10,padding:'10px 14px',marginBottom:14,fontSize:10,color:'#92400e'}}>
                ⚠️ <strong>F&F Gate:</strong> Exit Interview must be completed before processing Full & Final Settlement.
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                {[['Employee Name *','employee','text'],['Position','position','text'],
                  ['Last Working Day *','lwd','date'],['Resignation Date','resignation_date','date'],
                  ['Unpaid Salary (NPR)','unpaid_salary','number'],['Leave Encashment (NPR)','leave_enc','number'],
                  ['Gratuity (NPR)','gratuity','number'],['PF Employer Contribution (NPR)','pf','number'],
                  ['Advance Recovery (NPR)','advance','number'],['Notice Shortfall Deduction (NPR)','notice_short','number'],
                  ['TDS Deduction (NPR)','tds','number'],
                ].map(([l,f,t])=>(
                  <div key={f}>
                    <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>{l}</label>
                    <input type={t} value={form[f]} onChange={e=>setForm(p=>({...p,[f]:e.target.value}))}
                      style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1px solid #e2e8f0',fontSize:10,outline:'none',boxSizing:'border-box'}}/>
                  </div>
                ))}
              </div>
              {(form.unpaid_salary||form.leave_enc||form.gratuity)&&(
                <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 14px',marginBottom:14,fontSize:11,color:'#065f46'}}>
                  💰 <strong>Net Payable:</strong> NPR {(
                    (parseInt(form.unpaid_salary)||0)+(parseInt(form.leave_enc)||0)+(parseInt(form.gratuity)||0)+(parseInt(form.pf)||0)
                    -(parseInt(form.advance)||0)-(parseInt(form.notice_short)||0)-(parseInt(form.tds)||0)
                  ).toLocaleString()}
                </div>
              )}
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>{
                  if(!form.employee||!form.lwd){notify('⚠️ Employee and LWD required');return}
                  const earn={unpaid_salary:parseInt(form.unpaid_salary)||0,leave_encashment:parseInt(form.leave_enc)||0,gratuity:parseInt(form.gratuity)||0,pf_employer:parseInt(form.pf)||0,bonus:0,overtime:0}
                  const ded={tds:parseInt(form.tds)||0,advance_recovery:parseInt(form.advance)||0,asset_damage:0,notice_shortfall:parseInt(form.notice_short)||0,loan_recovery:0}
                  const net = Object.values(earn).reduce((s,v)=>s+v,0)-Object.values(ded).reduce((s,v)=>s+v,0)
                  setSettlements(prev=>[...prev,{id:'fnf'+Date.now(),employee:form.employee,position:form.position||'Staff',lwd:form.lwd,resignation_date:form.resignation_date||form.lwd,deadline:'TBD',days_remaining:15,clearance_complete:false,earnings:earn,deductions:ded,net_payable:net,payout_method:'bank_transfer',payout_status:'pending',payout_date:null,status:'awaiting_clearance',impact_links:['Experience Letter','Relieving Letter']}])
                  notify('✅ F&F created for '+form.employee+' — Net Payable: NPR '+net.toLocaleString())
                  setShowAdd(false)
                }} style={{flex:1,padding:'11px',borderRadius:10,border:'none',background:G,color:'#fff',fontSize:11,fontWeight:800,cursor:'pointer'}}>💰 Create F&F Settlement</button>
                <button onClick={()=>setShowAdd(false)} style={{padding:'11px 18px',borderRadius:10,border:'1px solid #e2e8f0',background:'#fff',fontSize:11,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Statement',key:'view'},{icon:'💳',label:'Process Payout',key:'payout'},
        {icon:'📄',label:'Generate Letters',key:'letters'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Full & Final Settlement" columns={['Employee','Position','LWD','Total Earnings','Total Deductions','Net Payable','Payout Status','Status']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
    </div>
  )
