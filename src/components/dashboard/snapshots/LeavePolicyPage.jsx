// FILE: LeavePolicyPage.jsx - Leave Policy (Leave Management)
// Centralized policy builder: blackout dates, notice periods, documentation
// requirements, consecutive-day caps, tenure-based tiering.

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#1e1b4b 0%,#4338ca 60%,#818cf8 100%)'
const A = '#4338ca'

const POLICIES = [
  { id:'lp1', name:'Standard Leave Policy', applies_to:'All Regular Employees',
    min_notice_days:3, max_consecutive_days:15, requires_doc_after_days:3,
    blackout_dates:['2025-10-15 to 2025-10-22 (Dashain peak)','2025-12-28 to 2026-01-02 (Year-end close)'],
    allows_negative_balance:false, applies_during_probation:'Restricted (HR approval only)',
    status:'active', impact_links:['Leave Type','Leave Balance Rule'] },
  { id:'lp2', name:'Sick Leave Policy', applies_to:'All Employees',
    min_notice_days:0, max_consecutive_days:12, requires_doc_after_days:3,
    blackout_dates:[], allows_negative_balance:true, applies_during_probation:'Allowed',
    status:'active', impact_links:['Leave Type'] },
  { id:'lp3', name:'Field Staff Leave Policy', applies_to:'Vendor-Supplied / Field Staff',
    min_notice_days:7, max_consecutive_days:10, requires_doc_after_days:1,
    blackout_dates:['Peak harvest season (varies by site)'], allows_negative_balance:false, applies_during_probation:'Not Applicable',
    status:'draft', impact_links:['Vendor Leave Requests'] },
]

const STATUS_CFG = {active:{c:'#10b981',bg:'#f0fdf4',label:'Active'},draft:{c:'#94a3b8',bg:'#f8fafc',label:'Draft'}}

export default function LeavePolicyPage() {
  const [policies, setPolicies] = useState(POLICIES)
  const [search, setSearch] = useState('')
  const [showBuilder, setShowBuilder] = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)
  const [form, setForm] = useState({})

  const filtered = policies.filter(p=>!search||p.name.toLowerCase().includes(search.toLowerCase()))
  const activeCount = policies.filter(p=>p.status==='active').length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📜" title="Leave Policy"
        breadcrumb="Workforce Operations > Leave Management > Leave Setup"
        gradient={G}
        stats={[
          {icon:'📜',label:'Total Policies',  value:policies.length},
          {icon:'✅',label:'Active',           value:activeCount},
          {icon:'🚫',label:'With Blackouts',   value:policies.filter(p=>p.blackout_dates.length>0).length},
          {icon:'⚖',label:'Statutory Base',   value:'LA2074'},
        ]}
        onAdd={()=>setShowBuilder(true)} addLabel="Build Policy"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'#eef2ff',border:'1px solid #c7d2fe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#3730a3',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>⚖</span>
        <div><strong>Nepal Labour Act 2074:</strong> Leave usage is a statutory right and cannot be deducted from compensation. Except for sick, mourning, and maternity leave, the employer may approve, adjust, or decline based on operational requirements. Every organization must define its own policy and approval hierarchy in internal bylaws.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search policies..."/>

      <div style={{display:'grid',gap:14,marginTop:14}}>
        {filtered.map(p=>{
          const sc = STATUS_CFG[p.status]
          return (
            <div key={p.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:p.name,...p}})}}
              style={{background:'#fff',border:`1.5px solid ${sc.c}33`,borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${sc.c}`}}>
              <div style={{display:'flex',alignItems:'center',gap:14,padding:'16px 20px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap'}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:4}}>
                    <span style={{fontSize:14,fontWeight:900,color:'#0f172a'}}>{p.name}</span>
                    <span style={{background:sc.bg,color:sc.c,fontSize:10,fontWeight:700,padding:'2px 10px',borderRadius:20}}>{sc.label}</span>
                  </div>
                  <div style={{fontSize:11,color:'#64748b'}}>{p.applies_to}</div>
                </div>
              </div>

              <div style={{padding:'12px 20px',display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,borderBottom:'1px solid #f8fafc'}}>
                {[{l:'Min Notice',v:p.min_notice_days+'d',c:A},{l:'Max Consecutive',v:p.max_consecutive_days+'d',c:'#f59e0b'},
                  {l:'Doc Required After',v:p.requires_doc_after_days+'d',c:'#7c3aed'},{l:'Negative Balance',v:p.allows_negative_balance?'Allowed':'Blocked',c:p.allows_negative_balance?'#f59e0b':'#10b981'}].map((s,i)=>(
                  <div key={i} style={{textAlign:'center',background:'#f8fafc',borderRadius:8,padding:'8px 4px'}}>
                    <div style={{fontSize:12,fontWeight:800,color:s.c}}>{s.v}</div>
                    <div style={{fontSize:8,color:'#94a3b8',fontWeight:600,marginTop:2}}>{s.l}</div>
                  </div>
                ))}
              </div>

              <div style={{padding:'10px 20px',fontSize:10,color:'#64748b'}}>
                <strong>Probation:</strong> {p.applies_during_probation}
              </div>
              {p.blackout_dates.length>0&&(
                <div style={{padding:'10px 20px',background:'#fff7ed',fontSize:10,color:'#9a3412'}}>
                  <strong>🚫 Blackout Dates:</strong> {p.blackout_dates.join(' . ')}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {showBuilder&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowBuilder(false)}>
          <div style={{background:'#fff',borderRadius:20,width:620,maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Policy Builder</div></div>
            <div style={{padding:'22px 28px'}}>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Policy Name *</label>
                <input type="text" value={form.policyName||""} onChange={e=>setForm(p=>({...p,policyName:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                </div>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Applies To</label>
                <select value={form.appliesTo||"All Regular Employees"} onChange={e=>setForm(p=>({...p,appliesTo:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',background:'#fff',boxSizing:'border-box'}}><option key="All Regular Employees" value="All Regular Employees">All Regular Employees</option><option key="Vendor-Supplied Staff" value="Vendor-Supplied Staff">Vendor-Supplied Staff</option><option key="Department-Specific" value="Department-Specific">Department-Specific</option><option key="Tenure-Tiered" value="Tenure-Tiered">Tenure-Tiered</option></select>
                </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Minimum Notice (days)</label>
                <input type="number" value={form.minimumNoticeDays||""} onChange={e=>setForm(p=>({...p,minimumNoticeDays:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                </div>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Max Consecutive Days</label>
                <input type="number" value={form.maxConsecutiveDays||""} onChange={e=>setForm(p=>({...p,maxConsecutiveDays:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                </div>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Documentation Required After (days)</label>
                <input type="number" value={form.documentationRequire||""} onChange={e=>setForm(p=>({...p,documentationRequire:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                </div>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Blackout Dates</label>
                <input type="text" value={form.blackoutDates||""} placeholder="e.g. Dashain period" onChange={e=>setForm(p=>({...p,blackoutDates:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                </div>
              </div>
              <label style={{display:'flex',gap:8,alignItems:'center',margin:'10px 0',fontSize:12,color:'#374151',cursor:'pointer'}}>
                <input type="checkbox" style={{accentColor:A}}/> Allow negative leave balance (advance against future accrual)
              </label>
              <AIImpact color={A} lines={['Policy rules enforced automatically at request-submission time.','Blackout dates auto-block leave requests during configured windows.','Tenure-tiered policies adjust entitlements as employment status changes.']}/>
              <div style={{display:'flex',gap:10,marginTop:8}}>
                <button onClick={()=>setShowBuilder(false)} style={{flex:1,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Save Policy</button>
                <button onClick={()=>setShowBuilder(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Policy',key:'view'},{icon:'✏',label:'Edit',key:'edit'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},{icon:'📤',label:'Export',key:'export'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Leave Policies" columns={['Policy Name','Applies To','Min Notice Days','Max Consecutive Days','Doc Required After','Blackout Dates','Status']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[NepHR Import]", f.name, result); }}/>}
    </div>
  )
}
