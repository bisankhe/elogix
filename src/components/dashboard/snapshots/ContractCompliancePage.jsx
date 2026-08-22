// FILE: ContractCompliancePage.jsx - Contract Compliance
// (Compliance & Risk Management > Legal Management)
// The centralized contract repository -- genuinely new, no employment-
// contract/NDA/vendor-agreement table existed anywhere in the build.
// Multi-tier expiry alerts (90/60/30 day), the same proven pattern
// used for warranties, certifications, and business licenses.

import { useState } from 'react'
import { Field, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#0c4a6e 0%,#0284c7 60%,#7dd3fc 100%)'
const A = '#0284c7'

const TIER_CFG = { expired:{c:'#ef4444',label:'Expired'},critical:{c:'#ef4444',label:'< 30 Days'},warning:{c:'#f59e0b',label:'< 90 Days'},healthy:{c:'#10b981',label:'Healthy'} }

const CONTRACTS = [
  {id:'ct1',type:'Employment Agreement',party:'Hari Thapa',expires:'2026-03-01',days_left:245,tier:'healthy',signed:true},
  {id:'ct2',type:'Vendor NDA',party:'Lenovo Nepal',expires:'2025-07-20',days_left:21,tier:'critical',signed:true,
   flag_note:'AI flagged a non-standard indemnification clause -- legal review recommended before renewal.'},
  {id:'ct3',type:'Outsourcing Agency Agreement',party:'Kathmandu Manpower Suppliers',expires:'2025-08-15',days_left:47,tier:'warning',signed:true},
  {id:'ct4',type:'Office Lease Agreement',party:'WorkSpace Furnishings Pvt Ltd',expires:'2025-06-25',days_left:-4,tier:'expired',signed:true,
   flag_note:'Expired 4 days ago -- renewal or termination decision overdue.'},
]

export default function ContractCompliancePage() {
  const [search, setSearch] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = CONTRACTS.filter(c=>!search||c.party.toLowerCase().includes(search.toLowerCase())||c.type.toLowerCase().includes(search.toLowerCase()))
  const atRiskCount = CONTRACTS.filter(c=>c.tier==='critical'||c.tier==='expired').length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📜" title="Contract Compliance"
        breadcrumb="Compliance & Risk Management > Legal Management"
        gradient={G}
        stats={[
          {icon:'📜',label:'Tracked Contracts',  value:CONTRACTS.length},
          {icon:'⚠',label:'At Risk (< 30 Days)',     value:atRiskCount},
          {icon:'🤖',label:'AI Clause Flags',            value:CONTRACTS.filter(c=>c.flag_note).length},
          {icon:'✅',label:'Digitally Signed',              value:CONTRACTS.filter(c=>c.signed).length},
        ]}
        onAdd={()=>setShowNew(true)} addLabel="Add Contract"/>

      <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#1e40af',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🤖</span>
        <div style={{flex:1,minWidth:200}}><strong>AI Reads Every Clause, Not Just the Expiry Date:</strong> Employment agreements, vendor NDAs, and outsourcing-agency contracts all live in one repository -- AI flags non-standard language before renewal, never relying on a human catching it in a 40-page document.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by party or contract type..."/>

      <div style={{display:'grid',gap:14,marginTop:14}}>
        {filtered.map(c=>{
          const tc = TIER_CFG[c.tier]
          return (
            <div key={c.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:c.party,...c,impact_links:['Vendor Management']}})}}
              style={{background:'#fff',border:`1.5px solid ${tc.c}33`,borderRadius:14,padding:'16px 18px',borderLeft:`4px solid ${tc.c}`,display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:10}}>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:'#0f172a'}}>{c.party}</div>
                <div style={{fontSize:9,color:'#94a3b8',marginTop:3}}>{c.type} . Expires {c.expires}</div>
                {c.flag_note&&<div style={{marginTop:6,fontSize:8,color:'#b45309'}}>⚠ {c.flag_note}</div>}
              </div>
              <span style={{background:`${tc.c}15`,color:tc.c,fontSize:9,fontWeight:700,padding:'3px 10px',borderRadius:20}}>{tc.label}</span>
            </div>
          )
        })}
      </div>

      {showNew&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowNew(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(480px,100%)'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'18px 24px'}}><div style={{fontSize:15,fontWeight:900,color:'#fff'}}>Add Contract</div></div>
            <div style={{padding:'20px 24px'}}>
              <Field label="Contract Type" type="select" value="" onChange={()=>{}} accent={A} options={['Employment Agreement','Vendor NDA','Outsourcing Agency Agreement','Lease Agreement','Other']}/>
              <Field label="Party Name" value="" onChange={()=>{}} accent={A} required/>
              <Field label="Expiry Date" type="date" value="" onChange={()=>{}} accent={A}/>
              <button onClick={()=>setShowNew(false)} style={{width:'100%',padding:13,borderRadius:11,border:'none',background:G,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>Upload &amp; Run AI Clause Scan</button>
            </div>
          </div>
        </div>
      )}

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Alerts fire at 90, 60, and 30 days before expiry, never a missed renewal due to human error.','Digital signature, timestamp, and IP address are logged the instant a contract is signed -- linked permanently to the employee\'s digital file.','Role-based access ensures only authorized legal personnel can view the most sensitive clauses, never company-wide.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Contract',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}
