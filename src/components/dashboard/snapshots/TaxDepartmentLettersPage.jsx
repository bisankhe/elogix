// FILE: TaxDepartmentLettersPage.jsx - Tax Department (IRD) Letters (Workforce Operations > Letters)
// Tax clearance, deadline extension, revision/correction, refund, dispute appeals

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#1e1b4b 0%,#4338ca 60%,#818cf8 100%)'
const A = '#4338ca'

const LETTER_TYPES = [
  {key:'tax_clearance',label:'Tax Clearance Certificate',icon:'✅',color:'#10b981'},
  {key:'deadline_extension',label:'Filing Deadline Extension',icon:'⏰',color:'#f59e0b'},
  {key:'revision_correction',label:'Revision / Error Correction',icon:'✏',color:'#3b82f6'},
  {key:'refund_request',label:'Refund / Adjustment Request',icon:'💰',color:'#15803d'},
  {key:'dispute_appeal',label:'Administrative Review / Appeal',icon:'⚖',color:'#ef4444'},
  {key:'closure_deregistration',label:'Company Closure / Deregistration',icon:'🚫',color:'#7c2d12'},
]

const LETTERS = [
  { id:'t1', type:'tax_clearance', subject:'Tax Clearance Certificate Request - Bank Loan Application',
    fiscal_year:'2024-25', submitted_date:'2025-06-08', status:'issued', reference_no:'IRD-TCC-88231',
    deadline:null, amount_npr:null,
    notes:'All TDS, VAT, and corporate tax confirmed paid for FY 2024-25.',
    impact_links:['Full & Final Settlement'] },
  { id:'t2', type:'refund_request', subject:'Advance Tax Refund Request - Overpaid TDS Q3',
    fiscal_year:'2024-25', submitted_date:'2025-06-12', status:'under_review', reference_no:'IRD-REF-44102',
    deadline:null, amount_npr:142500,
    notes:'Overpayment identified during quarterly reconciliation - requesting refund or carry-forward credit.',
    impact_links:['Payroll Setup'] },
  { id:'t3', type:'revision_correction', subject:'VAT Return Correction - May 2025 Filing',
    fiscal_year:'2024-25', submitted_date:null, status:'drafting', reference_no:null,
    deadline:'2025-06-30', amount_npr:null,
    notes:'Accounting error in input VAT claim - requesting correction to previously submitted return.',
    impact_links:[] },
  { id:'t4', type:'deadline_extension', subject:'Annual Income Tax Return Extension Request - FY 2024-25',
    fiscal_year:'2024-25', submitted_date:null, status:'pending', reference_no:null,
    deadline:'2025-07-15', amount_npr:null,
    notes:'Annual audit delayed due to system migration - requesting 30-day filing extension.',
    impact_links:[] },
]

const STATUS_CFG = {
  issued:{c:'#10b981',bg:'#f0fdf4',icon:'✅',label:'Issued'},
  under_review:{c:'#3b82f6',bg:'#eff6ff',icon:'🔍',label:'Under Review'},
  drafting:{c:'#f59e0b',bg:'#fffbeb',icon:'✏',label:'Drafting'},
  pending:{c:'#94a3b8',bg:'#f8fafc',icon:'⏳',label:'Pending'},
}

export default function TaxDepartmentLettersPage() {
  const [letters, setLetters] = useState(LETTERS)
  const [search, setSearch] = useState('')
  const [showWizard, setShowWizard] = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = letters.filter(l=>!search||l.subject.toLowerCase().includes(search.toLowerCase()))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🧾" title="Tax Department Letters"
        breadcrumb="Workforce Operations > Letters"
        gradient={G}
        stats={[
          {icon:'📨',label:'Total Letters',  value:letters.length},
          {icon:'✅',label:'Issued',          value:letters.filter(l=>l.status==='issued').length},
          {icon:'🔍',label:'Under Review',   value:letters.filter(l=>l.status==='under_review').length},
          {icon:'🏛',label:'Authority',      value:'IRD'},
        ]}
        onAdd={()=>setShowWizard(true)} addLabel="Draft New Letter (AI)"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'#eef2ff',border:'1px solid #c7d2fe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#3730a3',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>⚖</span>
        <div><strong>Nepal IRD Requirements:</strong> Annual returns due within 3 months of fiscal year end. Disputes/appeals must be filed within 30 days of assessment. Tax Clearance Certificates required for govt contracts, bank loans, license renewals. Closures/complex disputes still require physical stamped letterhead - not fully digital yet.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search letters..."/>

      <div style={{display:'grid',gap:14,marginTop:14}}>
        {filtered.map(l=>{
          const sc = STATUS_CFG[l.status]
          const lt = LETTER_TYPES.find(t=>t.key===l.type)
          return (
            <div key={l.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:l.subject,...l}})}}
              style={{background:'#fff',border:`1.5px solid ${sc.c}33`,borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${lt?.color}`}}>
              <div style={{display:'flex',alignItems:'center',gap:14,padding:'16px 20px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap'}}>
                <div style={{width:42,height:42,borderRadius:12,background:`${lt?.color}15`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>{lt?.icon}</div>
                <div style={{flex:1}}>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:3}}>
                    <span style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{l.subject}</span>
                    <span style={{background:sc.bg,color:sc.c,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{sc.icon} {sc.label}</span>
                  </div>
                  <div style={{fontSize:10,color:'#64748b'}}>{lt?.label} . FY {l.fiscal_year}</div>
                  {l.reference_no&&<div style={{fontSize:9,color:'#94a3b8',marginTop:2}}>Ref: {l.reference_no}</div>}
                </div>
                {l.amount_npr&&(
                  <div style={{textAlign:'center',flexShrink:0}}>
                    <div style={{fontSize:14,fontWeight:900,color:A}}>NPR {l.amount_npr.toLocaleString()}</div>
                    <div style={{fontSize:8,color:'#94a3b8',fontWeight:700}}>AMOUNT</div>
                  </div>
                )}
              </div>
              <div style={{padding:'10px 20px',fontSize:10,color:'#64748b',fontStyle:'italic'}}>{l.notes}</div>
              {l.deadline&&<div style={{padding:'0 20px 8px',fontSize:10,color:'#ef4444',fontWeight:700}}>⏰ Deadline: {l.deadline}</div>}
              <div style={{padding:'10px 20px',display:'flex',gap:8,justifyContent:'flex-end',borderTop:'1px solid #f8fafc'}}>
                <button style={{padding:'6px 14px',borderRadius:8,border:`1px solid ${A}33`,background:'#eef2ff',color:A,fontSize:11,fontWeight:600,cursor:'pointer'}}>View Letter</button>
                {l.status!=='issued'&&<button style={{padding:'6px 14px',borderRadius:8,border:'none',background:G,color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>{l.status==='drafting'?'Finalize & Submit':'Draft Now (AI)'}</button>}
              </div>
            </div>
          )
        })}
      </div>

      {showWizard&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowWizard(false)}>
          <div style={{background:'#fff',borderRadius:20,width:640,maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Draft Tax Department Letter (AI)</div></div>
            <div style={{padding:'22px 28px'}}>
              <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8,marginBottom:16}}>
                {LETTER_TYPES.map(t=>(
                  <div key={t.key} style={{padding:'12px',borderRadius:10,border:`1.5px solid ${t.color}33`,cursor:'pointer',display:'flex',gap:8,alignItems:'center'}}>
                    <span style={{fontSize:16}}>{t.icon}</span><span style={{fontSize:10,fontWeight:700,color:t.color}}>{t.label}</span>
                  </div>
                ))}
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
                <Field label="Fiscal Year" type="select" value="" onChange={()=>{}} accent={A} options={['2024-25','2023-24','2025-26']}/>
                <Field label="Amount (NPR, if applicable)" type="number" value="" onChange={()=>{}} accent={A}/>
              </div>
              <Field label="Subject / Context" value="" onChange={()=>{}} accent={A}/>
              <Field label="Additional Details" type="textarea" value="" onChange={()=>{}} accent={A} hint="Voice input - AI drafts in IRD-compliant legal language"/>
              <AIImpact color={A} lines={['AI drafts using exact terminology required by IRD/IRO.','Auto-flags 30-day appeal deadline if disputing an assessment.','Pulls PAN/VAT and prior filing data automatically from company profile.']}/>
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>setShowWizard(false)} style={{flex:1,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Generate Draft Letter</button>
                <button onClick={()=>setShowWizard(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Letter',key:'view'},{icon:'📤',label:'Mark Submitted',key:'submit'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},{icon:'📥',label:'Download PDF',key:'download'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Tax Department Letters" columns={['Subject','Type','Fiscal Year','Submitted Date','Reference No','Amount NPR','Deadline','Status']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
    </div>
  )
}
