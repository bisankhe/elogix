// FILE: VendorBGVPage.jsx - Vendor Background Verification
// AI-driven BGV, blockchain credential tracking, Nepal LA2074 compliance

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, Badge, LuxCard, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#064e3b 0%,#059669 60%,#34d399 100%)'
const A = '#059669'

const BGV_RECORDS = [
  { id:'b1', vendor_code:'REC-001', vendor_name:'MidPoint Staffing Nepal', vendor_type:'Recruitment Agency',
    initiated_date:'2025-01-10', completed_date:'2025-01-18', status:'cleared',
    checks:{
      identity:    {status:'passed', method:'NID + Citizenship', verified_by:'SecureCheck Nepal', date:'2025-01-12'},
      criminal:    {status:'passed', method:'Nepal Police Clearance', verified_by:'Nepal Police',    date:'2025-01-14'},
      financial:   {status:'passed', method:'CIBIL + Bank Reference', verified_by:'NRB Auth',       date:'2025-01-15'},
      litigation:  {status:'passed', method:'Court Record Search',    verified_by:'Judiciary Nepal', date:'2025-01-15'},
      license:     {status:'passed', method:'DOL License Verification',verified_by:'DOL Nepal',      date:'2025-01-11'},
      director_bg: {status:'passed', method:'Director Background',     verified_by:'SecureCheck Nepal',date:'2025-01-16'},
      tax:         {status:'passed', method:'PAN + Tax Clearance',    verified_by:'IRD Nepal',       date:'2025-01-13'},
      reference:   {status:'passed', method:'3 Client References',    verified_by:'Internal HR',     date:'2025-01-17'},
    },
    overall_risk:'low', ai_score:94, blockchain_hash:'0x8f3a...e21c',
    next_renewal:'2026-01-10', expiry_alert:false,
    notes:'All checks cleared. Recommended for Preferred tier.',
    impact_links:['Vendor Profile','Agreement','SLA','Billing'] },
  { id:'b2', vendor_code:'REC-003', vendor_name:'Executive Hunt Nepal', vendor_type:'Executive Search',
    initiated_date:'2025-03-05', completed_date:'2025-03-14', status:'cleared_with_flags',
    checks:{
      identity:    {status:'passed', method:'Passport Verification',   verified_by:'SecureCheck Nepal', date:'2025-03-07'},
      criminal:    {status:'passed', method:'Nepal Police Clearance',  verified_by:'Nepal Police',      date:'2025-03-09'},
      financial:   {status:'flagged',method:'CIBIL Check',            verified_by:'NRB Auth',          date:'2025-03-10', note:'Minor default in 2019 - resolved'},
      litigation:  {status:'passed', method:'Court Record Search',    verified_by:'Judiciary Nepal',   date:'2025-03-11'},
      license:     {status:'passed', method:'DOL License Verification',verified_by:'DOL Nepal',        date:'2025-03-06'},
      director_bg: {status:'passed', method:'Director Background',    verified_by:'SecureCheck Nepal', date:'2025-03-12'},
      tax:         {status:'passed', method:'PAN + Tax Clearance',    verified_by:'IRD Nepal',         date:'2025-03-08'},
      reference:   {status:'passed', method:'2 Client References',    verified_by:'Internal HR',       date:'2025-03-13'},
    },
    overall_risk:'medium', ai_score:78, blockchain_hash:'0x3d1b...f90a',
    next_renewal:'2026-03-05', expiry_alert:false,
    notes:'Financial flag noted but resolved. Monitor for next renewal.',
    impact_links:['Vendor Profile','Compliance Alert'] },
  { id:'b3', vendor_code:'REC-004', vendor_name:'QuickHire Outsource Pvt.', vendor_type:'Outsource Staffing',
    initiated_date:'2025-04-01', completed_date:null, status:'in_progress',
    checks:{
      identity:    {status:'passed', method:'NID Verification',       verified_by:'SecureCheck Nepal', date:'2025-04-03'},
      criminal:    {status:'in_progress',method:'Nepal Police Clearance',verified_by:null,             date:null},
      financial:   {status:'pending', method:'CIBIL + Bank Reference',verified_by:null,               date:null},
      litigation:  {status:'pending', method:'Court Record Search',   verified_by:null,               date:null},
      license:     {status:'passed', method:'DOL License Verification',verified_by:'DOL Nepal',       date:'2025-04-02'},
      director_bg: {status:'pending', method:'Director Background',   verified_by:null,               date:null},
      tax:         {status:'flagged', method:'PAN + Tax Clearance',   verified_by:'IRD Nepal',        date:'2025-04-04', note:'Outstanding tax dues NPR 45,000'},
      reference:   {status:'pending', method:'Client References',     verified_by:null,               date:null},
    },
    overall_risk:'high', ai_score:42, blockchain_hash:null,
    next_renewal:'2026-04-01', expiry_alert:false,
    notes:'Tax dues outstanding. Criminal check pending. Do NOT engage until cleared.',
    impact_links:['Compliance Alert','Labour Act 2074','Vendor Profile'] },
]

const STATUS_CFG = {
  cleared:             {c:'#10b981',bg:'#f0fdf4',b:'#bbf7d0',label:'Cleared',icon:'✅'},
  cleared_with_flags:  {c:'#f59e0b',bg:'#fffbeb',b:'#fde68a',label:'Cleared w/ Flags',icon:'⚠'},
  in_progress:         {c:'#3b82f6',bg:'#eff6ff',b:'#bfdbfe',label:'In Progress',icon:'🔄'},
  failed:              {c:'#ef4444',bg:'#fef2f2',b:'#fecaca',label:'Failed',icon:'❌'},
  expired:             {c:'#94a3b8',bg:'#f8fafc',b:'#e2e8f0',label:'Expired',icon:'⏰'},
}
const CHECK_STATUS_CFG = {
  passed:      {c:'#10b981',icon:'✓'},
  flagged:     {c:'#f59e0b',icon:'!'},
  failed:      {c:'#ef4444',icon:'✗'},
  in_progress: {c:'#3b82f6',icon:'...'},
  pending:     {c:'#94a3b8',icon:'-'},
}
const CHECK_LABELS = {
  identity:'Identity','criminal':'Criminal','financial':'Financial',
  litigation:'Litigation','license':'DOL License','director_bg':'Director BG',
  tax:'Tax Status','reference':'References',
}

const CTX_ACTIONS = [
  {icon:'👁',label:'View Full BGV Report',   key:'view'},
  {icon:'🔄',label:'Initiate Re-verification',key:'reverify'},
  {icon:'📋',label:'Download BGV Certificate',key:'download'},
  {icon:'⛓',label:'View Blockchain Hash',    key:'blockchain'},
  {icon:'⚠',label:'Raise Flag',              key:'flag',danger:true},
]

export default function VendorBGVPage() {
  const [records, setRecords] = useState(BGV_RECORDS)
  const [selected, setSelected] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)
  const [search, setSearch] = useState('')

  const filtered = records.filter(r=>!search||r.vendor_name.toLowerCase().includes(search.toLowerCase())||r.vendor_code.toLowerCase().includes(search.toLowerCase()))
  const cleared = records.filter(r=>r.status==='cleared').length
  const inProgress = records.filter(r=>r.status==='in_progress').length
  const withFlags = records.filter(r=>r.status==='cleared_with_flags').length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🔍" title="Vendor Background Verification"
        breadcrumb="Organization Management > Vendor / Outsource Management"
        gradient={G}
        stats={[
          {icon:'✅',label:'Cleared',      value:cleared},
          {icon:'⚠',label:'With Flags',   value:withFlags},
          {icon:'🔄',label:'In Progress',  value:inProgress},
          {icon:'⛓',label:'Blockchain Verified',value:records.filter(r=>r.blockchain_hash).length},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="Initiate BGV"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'linear-gradient(135deg,#f0fdf4,#eff6ff)',border:'1px solid #bbf7d0',borderRadius:12,padding:'10px 16px',marginBottom:14,display:'flex',gap:10,fontSize:11,color:'#065f46'}}>
        <span style={{fontSize:18}}>⛓</span>
        <div><strong>Blockchain-backed verification:</strong> All cleared BGV records are hashed on-chain for tamper-proof audit. Nepal Labour Act 2074 Section 64: Main employer must verify vendor has valid DOL license before engagement.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search vendor BGV records..."/>

      <div style={{display:'grid',gap:16,marginTop:12}}>
        {filtered.map(r=>{
          const sc = STATUS_CFG[r.status]||STATUS_CFG.in_progress
          const checksArr = Object.entries(r.checks)
          const passedCount = checksArr.filter(([,v])=>v.status==='passed').length
          const totalChecks = checksArr.length
          return (
            <div key={r.id}
              onContextMenu={e=>{e.preventDefault();setCtx({x:e.clientX,y:e.clientY,item:{name:r.vendor_name,...r}})}}
              style={{background:'#fff',border:`1px solid ${sc.b}`,borderRadius:16,overflow:'hidden',
                boxShadow:'0 2px 12px rgba(0,0,0,.05)',borderLeft:`5px solid ${sc.c}`}}>
              {/* Header */}
              <div style={{display:'flex',alignItems:'center',gap:14,padding:'16px 20px',borderBottom:'1px solid #f1f5f9'}}>
                <div style={{width:48,height:48,borderRadius:14,background:`${sc.c}18`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>🔍</div>
                <div style={{flex:1}}>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:3}}>
                    <span style={{fontSize:14,fontWeight:900,color:'#0f172a'}}>{r.vendor_name}</span>
                    <span style={{background:sc.bg,color:sc.c,border:`1px solid ${sc.b}`,fontSize:10,fontWeight:700,padding:'3px 10px',borderRadius:20}}>{sc.icon} {sc.label}</span>
                    {r.blockchain_hash && <span style={{background:'#f0fdf4',color:'#065f46',border:'1px solid #bbf7d0',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>⛓ Blockchain Verified</span>}
                  </div>
                  <div style={{fontSize:11,color:'#64748b'}}>{r.vendor_code} . {r.vendor_type} . Initiated {r.initiated_date}</div>
                  {r.blockchain_hash && <div style={{fontSize:9,color:'#94a3b8',fontFamily:'monospace',marginTop:2}}>Hash: {r.blockchain_hash}</div>}
                </div>
                <div style={{textAlign:'center',flexShrink:0}}>
                  <div style={{fontSize:24,fontWeight:900,color:r.ai_score>=80?'#10b981':r.ai_score>=60?'#f59e0b':'#ef4444'}}>{r.ai_score}</div>
                  <div style={{fontSize:9,color:'#94a3b8',fontWeight:700}}>AI RISK SCORE</div>
                  <div style={{fontSize:10,fontWeight:700,color:r.overall_risk==='low'?'#10b981':r.overall_risk==='medium'?'#f59e0b':'#ef4444'}}>{r.overall_risk.toUpperCase()}</div>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{padding:'10px 20px',background:'#f8fafc',borderBottom:'1px solid #f1f5f9'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:5,fontSize:10,color:'#64748b'}}>
                  <span>Verification Progress</span>
                  <span style={{fontWeight:700}}>{passedCount}/{totalChecks} Checks Passed</span>
                </div>
                <div style={{height:6,background:'#e2e8f0',borderRadius:6,overflow:'hidden'}}>
                  <div style={{width:`${passedCount/totalChecks*100}%`,height:'100%',background:sc.c,borderRadius:6,transition:'width .6s ease'}}/>
                </div>
              </div>

              {/* Checks grid */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:8,padding:'14px 20px'}}>
                {checksArr.map(([key,check])=>{
                  const cc = CHECK_STATUS_CFG[check.status]||CHECK_STATUS_CFG.pending
                  return (
                    <div key={key} style={{background:'#f8fafc',borderRadius:10,padding:'8px 12px',border:`1px solid ${check.status==='flagged'?'#fde68a':check.status==='passed'?'#bbf7d0':'#e2e8f0'}`}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                        <span style={{fontSize:11,fontWeight:700,color:'#0f172a'}}>{CHECK_LABELS[key]||key}</span>
                        <span style={{fontSize:13,color:cc.c,fontWeight:800}}>{cc.icon}</span>
                      </div>
                      <div style={{fontSize:9,color:'#64748b'}}>{check.method}</div>
                      {check.verified_by && <div style={{fontSize:9,color:'#94a3b8'}}>{check.verified_by}</div>}
                      {check.date && <div style={{fontSize:9,color:A,fontWeight:600}}>{check.date}</div>}
                      {check.note && <div style={{fontSize:9,color:'#f59e0b',fontWeight:700,marginTop:2}}>{check.note}</div>}
                    </div>
                  )
                })}
              </div>

              {/* Footer */}
              <div style={{borderTop:'1px solid #f1f5f9',padding:'10px 20px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div style={{fontSize:10,color:'#64748b'}}>
                  <strong>Next Renewal:</strong> {r.next_renewal} &bull; <em style={{color:'#64748b'}}>{r.notes}</em>
                </div>
                <div style={{display:'flex',gap:8}}>
                  <button onClick={()=>setSelected(r)}
                    style={{padding:'7px 14px',borderRadius:8,border:`1px solid ${A}33`,background:'#f0fdf4',color:A,fontSize:11,fontWeight:600,cursor:'pointer'}}>
                    Full Report
                  </button>
                  <button style={{padding:'7px 14px',borderRadius:8,border:'none',background:G,color:'#fff',fontSize:11,fontWeight:600,cursor:'pointer'}}>
                    Re-Verify
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Add BGV Modal */}
      {showAdd && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowAdd(false)}>
          <div style={{background:'#fff',borderRadius:20,width:640,overflow:'auto',maxHeight:'90vh'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px',position:'sticky',top:0,zIndex:10}}>
              <div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Initiate Background Verification</div>
              <div style={{fontSize:11,color:'rgba(255,255,255,.75)',marginTop:2}}>Automated multi-check BGV with AI risk scoring.</div>
            </div>
            <div style={{padding:'22px 28px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
                <Field label="Vendor / Agency" type="select" value="" onChange={()=>{}} accent={A}
                  options={['MidPoint Staffing Nepal','Executive Hunt Nepal','QuickHire Outsource','TalentBridge HR']}/>
                <Field label="BGV Package" type="select" value="" onChange={()=>{}} accent={A}
                  options={['Standard (5 checks)','Enhanced (8 checks)','Executive (10 checks)','Quick (3 checks)']}/>
                <Field label="Priority" type="select" value="" onChange={()=>{}} accent={A}
                  options={['Normal (7-10 days)','Priority (3-5 days)','Express (24 hrs)']}/>
                <Field label="External Provider" type="select" value="" onChange={()=>{}} accent={A}
                  options={['SecureCheck Nepal','Nepal Police Online','IRD Verification','Internal']}/>
              </div>
              <div style={{margin:'12px 0'}}>
                <div style={{fontSize:12,fontWeight:700,color:'#334155',marginBottom:8}}>Checks to Perform</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:6}}>
                  {Object.entries(CHECK_LABELS).map(([k,l])=>(
                    <label key={k} style={{display:'flex',gap:8,alignItems:'center',cursor:'pointer',fontSize:12,color:'#334155',padding:'6px 10px',borderRadius:8,border:'1px solid #e2e8f0'}}>
                      <input type="checkbox" defaultChecked style={{accentColor:A}}/> {l}
                    </label>
                  ))}
                </div>
              </div>
              <AIImpact color={A} lines={[
                'AI will score overall risk level based on all check outcomes.',
                'Blockchain hash generated upon completion - tamper-proof audit trail.',
                'Nepal LA2074 Section 64: License verification is mandatory before engagement.',
                'Alerts sent to HR Compliance if any check fails or flags arise.',
              ]}/>
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>setShowAdd(false)} style={{flex:1,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Initiate BGV</button>
                <button onClick={()=>setShowAdd(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx && <ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={CTX_ACTIONS} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel && <ExcelModal title="Vendor BGV Records" columns={['Vendor Code','Vendor Name','Initiated Date','Status','Identity','Criminal','Financial','Litigation','License','Tax','AI Score']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[NepHR Import]", f.name, result); }}/>}
    </div>
  )
}
