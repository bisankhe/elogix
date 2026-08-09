// FILE: PayslipGenerationPage.jsx - Payslip Generation (Payroll Finalization)
// Auto-generated immutable payslips post-approval, bulk-publish to ESS,
// YTD summary widget, itemized gross-to-net breakdown preview.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#1e1b4b 0%,#4338ca 60%,#818cf8 100%)'
const A = '#4338ca'

const PAYSLIPS = [
  { id:'ps1', employee:'Gita Maharjan', dept:'IT', gross_npr:85000, ssf_npr:9350, tds_npr:5200, other_deductions_npr:3870,
    net_npr:66580, ytd_gross_npr:510000, published:true, impact_links:['Automated Payroll','Tax Setup'] },
  { id:'ps2', employee:'Bikash Rai', dept:'IT', gross_npr:62000, ssf_npr:6820, tds_npr:3100, other_deductions_npr:21540,
    net_npr:30540, ytd_gross_npr:372000, published:false, impact_links:['Loan Management'] },
  { id:'ps3', employee:'Maya Pradhan', dept:'Finance', gross_npr:71000, ssf_npr:7810, tds_npr:4400, other_deductions_npr:3520,
    net_npr:55270, ytd_gross_npr:426000, published:true, impact_links:[] },
]

export default function PayslipGenerationPage() {
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [ctx, setCtx] = useState(null)

  const filtered = PAYSLIPS.filter(p=>!search||p.employee.toLowerCase().includes(search.toLowerCase()))
  const publishedCount = PAYSLIPS.filter(p=>p.published).length
  const totalNet = PAYSLIPS.reduce((s,p)=>s+p.net_npr,0)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🧾" title="Payslip Generation"
        breadcrumb="Workforce Operations > Payroll & Compensation > Payroll Finalization"
        gradient={G}
        stats={[
          {icon:'🧾',label:'Total Payslips',  value:PAYSLIPS.length},
          {icon:'✅',label:'Published',         value:publishedCount},
          {icon:'⏳',label:'Pending Publish',   value:PAYSLIPS.length-publishedCount},
          {icon:'💰',label:'Total Net Payout',  value:'NPR '+(totalNet/1000).toFixed(0)+'K'},
        ]}
        onAdd={()=>{}} addLabel="Bulk Publish All" onExcel={()=>{}}/>

      <div style={{background:'#eef2ff',border:'1px solid #c7d2fe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#3730a3',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🔒</span>
        <div style={{flex:1,minWidth:200}}><strong>Immutable Post-Approval:</strong> Generated only after Payroll Approval locks the data - never editable afterward. Per Nepal LA2074 Section 37, every payslip must itemize basic remuneration, allowances, overtime, and deductions (SSF, tax). Delivered via encrypted ESS portal, never plain email.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{display:'grid',gap:12,marginTop:14}}>
        {filtered.map(p=>(
          <div key={p.id}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:p.employee,...p}})}}
            style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)'}}>
            <div onClick={()=>setExpanded(expanded===p.id?null:p.id)} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 18px',cursor:'pointer',flexWrap:'wrap',gap:8}}>
              <div>
                <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:3}}>
                  <span style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{p.employee}</span>
                  <span style={{background:p.published?'#f0fdf4':'#fffbeb',color:p.published?'#15803d':'#b45309',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{p.published?'✅ Published':'⏳ Draft'}</span>
                </div>
                <div style={{fontSize:10,color:'#64748b'}}>{p.dept} . June 2025</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:16,fontWeight:900,color:A}}>NPR {p.net_npr.toLocaleString()}</div>
                <div style={{fontSize:8,color:'#94a3b8',fontWeight:700}}>NET PAY {expanded===p.id?'▲':'▼'}</div>
              </div>
            </div>
            {expanded===p.id&&(
              <div style={{padding:'0 18px 16px',borderTop:'1px solid #f1f5f9'}}>
                <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8,marginTop:12}}>
                  {[{l:'Gross Pay',v:p.gross_npr,c:'#3b82f6'},{l:'SSF (Employee 11%)',v:-p.ssf_npr,c:'#ef4444'},
                    {l:'TDS (Tax)',v:-p.tds_npr,c:'#ef4444'},{l:'Other Deductions',v:-p.other_deductions_npr,c:'#ef4444'}].map((s,i)=>(
                    <div key={i} style={{display:'flex',justifyContent:'space-between',background:'#f8fafc',borderRadius:8,padding:'8px 12px'}}>
                      <span style={{fontSize:10,color:'#64748b'}}>{s.l}</span>
                      <span style={{fontSize:11,fontWeight:700,color:s.c}}>{s.v<0?'-':''}NPR {Math.abs(s.v).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <div style={{display:'flex',justifyContent:'space-between',background:'#f0fdf4',borderRadius:8,padding:'10px 12px',marginTop:8}}>
                  <span style={{fontSize:11,fontWeight:800,color:'#065f46'}}>YTD Gross</span>
                  <span style={{fontSize:11,fontWeight:800,color:'#065f46'}}>NPR {p.ytd_gross_npr.toLocaleString()}</span>
                </div>
                <div style={{display:'flex',gap:8,marginTop:10}}>
                  <button style={{flex:1,padding:'8px',borderRadius:8,border:'none',background:`${A}12`,color:A,fontSize:10,fontWeight:700,cursor:'pointer'}}>📥 Download PDF</button>
                  {!p.published&&<button style={{flex:1,padding:'8px',borderRadius:8,border:'none',background:'#f0fdf4',color:'#15803d',fontSize:10,fontWeight:700,cursor:'pointer'}}>Publish to ESS</button>}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Payslip',key:'view'},{icon:'📥',label:'Download PDF',key:'download'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}
