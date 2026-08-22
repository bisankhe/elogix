// FILE: TaxSetupPage.jsx - Tax Setup (Payroll & Compensation)
// FY 2083/84 progressive slab engine (5 bands, 1%-29%), SSF/CIT/insurance
// deduction caps, multi-jurisdiction toggle for global expansion readiness.

import { useState } from 'react'
import { Field, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fdba74 100%)'
const A = '#c2410c'

const SLABS_NEW = [
  {band:'Up to 10,00,000',rate:'1%',max_tax:'10,000'},
  {band:'10,00,001 - 15,00,000',rate:'10%',max_tax:'50,000'},
  {band:'15,00,001 - 25,00,000',rate:'20%',max_tax:'2,00,000'},
  {band:'25,00,001 - 40,00,000',rate:'27%',max_tax:'4,05,000'},
  {band:'Above 40,00,000',rate:'29%',max_tax:'No upper limit'},
]

const DEDUCTION_CAPS = [
  {name:'SSF / EPF / CIT (combined)',cap:'1/3 of income or NPR 5,00,000, whichever lower'},
  {name:'Life Insurance Premium',cap:'NPR 40,000 max'},
  {name:'Health/Medical Insurance Premium',cap:'NPR 20,000 max'},
]

const JURISDICTIONS = ['Nepal (Active)','India','USA','UK','EU','Australia','Singapore/Asia','UAE/Gulf']

export default function TaxSetupPage() {
  const [search, setSearch] = useState('')
  const [showCalc, setShowCalc] = useState(false)
  const [ctx, setCtx] = useState(null)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📊" title="Tax Setup"
        breadcrumb="Workforce Operations > Payroll & Compensation > Payroll Setup"
        gradient={G}
        stats={[
          {icon:'📊',label:'Active Slabs (FY 2083/84)', value:SLABS_NEW.length},
          {icon:'📉',label:'Top Rate (was 39%)',         value:'29%'},
          {icon:'📈',label:'1% Threshold (was 5L)',      value:'NPR 10L'},
          {icon:'🌍',label:'Jurisdictions Ready',        value:JURISDICTIONS.length},
        ]}
        onAdd={()=>setShowCalc(true)} addLabel="Tax Calculator"/>

      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#7c2d12',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🎉</span>
        <div style={{flex:1,minWidth:220}}><strong>FY 2083/84 Major Overhaul (effective Shrawan 1, 2083 / mid-July 2026):</strong> 1% threshold doubled from NPR 5L to NPR 10L. Top rate cut from 39% to 29%. Slabs reduced 6{'>'}5. Separate male/female categories removed - single unified structure for all individuals.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search jurisdictions..."/>

      {/* Progressive slab table */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px 20px',marginTop:14,marginBottom:16}}>
        <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:12}}>📊 Nepal - Annual Income Tax Slabs FY 2083/84</div>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:11,minWidth:480}}>
            <thead><tr style={{background:'#f8fafc'}}>
              {['Annual Taxable Income (NPR)','Tax Rate','Max Tax in Band'].map(h=>(
                <th key={h} style={{padding:'10px 12px',textAlign:'left',fontSize:9,fontWeight:800,color:A}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {SLABS_NEW.map((s,i)=>(
                <tr key={i} style={{borderBottom:'1px solid #f8fafc'}}>
                  <td style={{padding:'10px 12px',fontWeight:600,color:'#0f172a'}}>{s.band}</td>
                  <td style={{padding:'10px 12px',fontWeight:800,color:A}}>{s.rate}</td>
                  <td style={{padding:'10px 12px',color:'#64748b'}}>NPR {s.max_tax}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{fontSize:9,color:'#94a3b8',marginTop:10}}>Progressive: each rate applies only to the income slice within that band - crossing into a higher slab never increases tax on income already earned in a lower one.</div>
      </div>

      {/* Deduction caps */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px 20px',marginBottom:16}}>
        <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:12}}>🧮 Eligible Deduction Caps (Pre-Tax)</div>
        {DEDUCTION_CAPS.map((d,i)=>(
          <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:i<DEDUCTION_CAPS.length-1?'1px solid #f8fafc':'none',flexWrap:'wrap',gap:6}}>
            <span style={{fontSize:11,fontWeight:600,color:'#374151'}}>{d.name}</span>
            <span style={{fontSize:10,color:A,fontWeight:700}}>{d.cap}</span>
          </div>
        ))}
      </div>

      {/* Jurisdiction readiness */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px 20px'}}>
        <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:12}}>🌍 Multi-Jurisdiction Tax Engine</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:8}}>
          {JURISDICTIONS.filter(j=>!search||j.toLowerCase().includes(search.toLowerCase())).map((j,i)=>(
            <div key={i} style={{background:j.includes('Active')?'#f0fdf4':'#f8fafc',border:`1px solid ${j.includes('Active')?'#bbf7d0':'#e2e8f0'}`,borderRadius:10,padding:'10px 12px',textAlign:'center'}}>
              <div style={{fontSize:10,fontWeight:700,color:j.includes('Active')?'#15803d':'#64748b'}}>{j}</div>
            </div>
          ))}
        </div>
      </div>

      {showCalc&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowCalc(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(520px,100%)',maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Tax Simulation Calculator</div></div>
            <div style={{padding:'22px 28px'}}>
              <Field label="Annual Gross Income (NPR)" type="number" value="" onChange={()=>{}} accent={A} required/>
              <Field label="SSF/EPF/CIT Contribution (NPR)" type="number" value="" onChange={()=>{}} accent={A}/>
              <Field label="Life Insurance Premium (NPR)" type="number" value="" onChange={()=>{}} accent={A} hint="Max 40,000"/>
              <Field label="Health Insurance Premium (NPR)" type="number" value="" onChange={()=>{}} accent={A} hint="Max 20,000"/>
              <AIImpact color={A} lines={['Auto-applies the new FY 2083/84 5-slab structure.','Deduction caps auto-validated against statutory maximums.','Live take-home pay preview updates as you adjust each field.']}/>
              <div style={{display:'flex',gap:10,marginTop:8,flexWrap:'wrap'}}>
                <button onClick={()=>setShowCalc(false)} style={{flex:1,minWidth:140,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Calculate Tax</button>
                <button onClick={()=>setShowCalc(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={[]} actions={[
        {icon:'👁',label:'View Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}
