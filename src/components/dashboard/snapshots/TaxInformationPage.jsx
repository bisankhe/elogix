// FILE: TaxInformationPage.jsx - TAX (Payroll & Compensation > Information)
// YTD taxable income widget, FY2083/84 progressive slab breakdown, deduction
// exemptions applied (SSF/CIT/insurance), interactive tax simulator preview.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fdba74 100%)'
const A = '#c2410c'

const FY2083_SLABS = [
  {band:'Up to NPR 10,00,000',rate:1},
  {band:'NPR 10,00,001 - 15,00,000',rate:10},
  {band:'NPR 15,00,001 - 25,00,000',rate:20},
  {band:'NPR 25,00,001 - 40,00,000',rate:27},
  {band:'Above NPR 40,00,000',rate:29},
]

const TAX_LEDGER = [
  { id:'t1', employee:'Gita Maharjan', pan:'301-554-892', annual_gross_npr:612000,
    ssf_deduction_npr:67320, cit_deduction_npr:30600, insurance_deduction_npr:20000,
    taxable_income_npr:494080, ytd_tax_paid_npr:4941, effective_rate_pct:1.0,
    tds_status:'deposited', deposit_date:'2025-06-25', impact_links:['Tax Setup','SSF Information'] },
  { id:'t2', employee:'Maya Pradhan', pan:'301-554-893', annual_gross_npr:576000,
    ssf_deduction_npr:63360, cit_deduction_npr:57600, insurance_deduction_npr:40000,
    taxable_income_npr:415040, ytd_tax_paid_npr:4150, effective_rate_pct:1.0,
    tds_status:'deposited', deposit_date:'2025-06-25', impact_links:['CIT Information'] },
  { id:'t3', employee:'Ramesh KC', pan:null, annual_gross_npr:480000,
    ssf_deduction_npr:0, cit_deduction_npr:0, insurance_deduction_npr:0,
    taxable_income_npr:480000, ytd_tax_paid_npr:0, effective_rate_pct:0,
    tds_status:'blocked', deposit_date:null, flag_note:'PAN number missing - payroll cannot process TDS without a valid PAN.',
    impact_links:['Tax & Compliance'] },
]

const STATUS_CFG = {deposited:{c:'#10b981',bg:'#f0fdf4',label:'TDS Deposited'},blocked:{c:'#ef4444',bg:'#fef2f2',label:'Blocked - Missing PAN'}}

export default function TaxInformationPage() {
  const [search, setSearch] = useState('')
  const [ctx, setCtx] = useState(null)

  const filtered = TAX_LEDGER.filter(t=>!search||t.employee.toLowerCase().includes(search.toLowerCase()))
  const totalTax = TAX_LEDGER.reduce((s,t)=>s+t.ytd_tax_paid_npr,0)
  const blockedCount = TAX_LEDGER.filter(t=>t.tds_status==='blocked').length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📋" title="TAX"
        breadcrumb="Workforce Operations > Payroll & Compensation > Information"
        gradient={G}
        stats={[
          {icon:'📋',label:'FY 2083/84 Slabs',  value:FY2083_SLABS.length},
          {icon:'💰',label:'YTD Tax Collected',  value:'NPR '+totalTax.toLocaleString()},
          {icon:'🚫',label:'Blocked (No PAN)',   value:blockedCount},
          {icon:'📤',label:'IRD Deadline',        value:'25th Monthly'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#7c2d12',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>⚖</span>
        <div style={{flex:1,minWidth:200}}><strong>FY 2083/84 Reform (effective Shrawan 1, 2083):</strong> 5 slabs, 1%-29%, threshold doubled to NPR 10,00,000. Eligible deductions (SSF, CIT, insurance) reduce taxable income before slabs apply. TDS deposited to IRD by the 25th of the following month - requires valid PAN.</div>
      </div>

      {/* Slab reference table */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px 20px',marginBottom:16}}>
        <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:12}}>📊 FY 2083/84 Progressive Slabs</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:10}}>
          {FY2083_SLABS.map((s,i)=>(
            <div key={i} style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:10,padding:'10px 12px',textAlign:'center'}}>
              <div style={{fontSize:18,fontWeight:900,color:A}}>{s.rate}%</div>
              <div style={{fontSize:9,color:'#7c2d12',marginTop:3}}>{s.band}</div>
            </div>
          ))}
        </div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{display:'grid',gap:14,marginTop:14}}>
        {filtered.map(t=>{
          const sc = STATUS_CFG[t.tds_status]
          return (
            <div key={t.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:t.employee,...t}})}}
              style={{background:'#fff',border:`1.5px solid ${sc.c}33`,borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${sc.c}`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',padding:'14px 18px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap',gap:8}}>
                <div>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:3}}>
                    <span style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{t.employee}</span>
                    <span style={{background:sc.bg,color:sc.c,fontSize:10,fontWeight:700,padding:'2px 10px',borderRadius:20}}>{sc.label}</span>
                  </div>
                  <div style={{fontSize:10,color:'#64748b'}}>PAN: {t.pan||'Not on file'}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:16,fontWeight:900,color:A}}>NPR {t.ytd_tax_paid_npr.toLocaleString()}</div>
                  <div style={{fontSize:8,color:'#94a3b8',fontWeight:700}}>YTD TAX PAID</div>
                </div>
              </div>
              <div style={{padding:'12px 18px',display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
                {[{l:'Annual Gross',v:'NPR '+t.annual_gross_npr.toLocaleString(),c:'#3b82f6'},
                  {l:'Total Deductions',v:'NPR '+(t.ssf_deduction_npr+t.cit_deduction_npr+t.insurance_deduction_npr).toLocaleString(),c:'#10b981'},
                  {l:'Taxable Income',v:'NPR '+t.taxable_income_npr.toLocaleString(),c:'#7c3aed'},
                  {l:'Effective Rate',v:t.effective_rate_pct+'%',c:A}].map((x,i)=>(
                  <div key={i} style={{textAlign:'center',background:'#f8fafc',borderRadius:8,padding:'8px 4px'}}>
                    <div style={{fontSize:11,fontWeight:800,color:x.c}}>{x.v}</div>
                    <div style={{fontSize:8,color:'#94a3b8',marginTop:2}}>{x.l}</div>
                  </div>
                ))}
              </div>
              {t.flag_note&&<div style={{padding:'10px 18px',background:'#fef2f2',fontSize:10,color:'#991b1b'}}><strong>⚠</strong> {t.flag_note}</div>}
            </div>
          )
        })}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:10}}>🧮 Self-Service Tax Simulator</div>
        <AIImpact color={A} lines={['Employees can simulate take-home pay changes before adjusting CIT/insurance contributions.','YTD tax summary visible in real time - no waiting for year-end statements.','Investment proof uploads (insurance, donations) auto-apply to the next payroll cycle once approved.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Tax History',key:'view'},{icon:'📥',label:'Download Tax Report',key:'export'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}
