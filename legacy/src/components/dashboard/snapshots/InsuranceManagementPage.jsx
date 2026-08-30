// FILE: InsuranceManagementPage.jsx - Insurance Management
// (Employee Experience & Culture > Wellness & Support)
// Digital wallet: deductible progress bars, digital insurance card,
// claim submission. Section 18: employer fully bears accident
// insurance premium; medical insurance is a 50-50 employer-employee
// split. Auto-provisions dependents on life events.

import { useState } from 'react'
import { Field, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#581c87 0%,#7c3aed 60%,#c4b5fd 100%)'
const A = '#7c3aed'

const MY_COVERAGE = {
  medical:{ limit_npr:200000, used_npr:34000, employer_pct:50, employee_pct:50 },
  accident:{ limit_npr:1000000, used_npr:0, employer_pct:100, employee_pct:0 },
}

const CLAIMS = [
  { id:'cl1', type:'Medical', amount_npr:8500, status:'approved', submitted:'2025-06-10', provider:'Norvic International Hospital' },
  { id:'cl2', type:'Medical', amount_npr:2200, status:'under_review', submitted:'2025-06-20', provider:'Grande City Clinic' },
]

const STATUS_CFG = { approved:{c:'#10b981',label:'Approved'},under_review:{c:'#f59e0b',label:'Under Review'},rejected:{c:'#ef4444',label:'Rejected'} }

export default function InsuranceManagementPage() {
  const [search, setSearch] = useState('')
  const [showClaim, setShowClaim] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = CLAIMS.filter(c=>!search||c.provider.toLowerCase().includes(search.toLowerCase()))
  const medicalPct = Math.round(MY_COVERAGE.medical.used_npr/MY_COVERAGE.medical.limit_npr*100)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🛡" title="Insurance Management"
        breadcrumb="Employee Experience & Culture > Wellness & Support"
        gradient={G}
        stats={[
          {icon:'🏥',label:'Medical Limit Used',  value:medicalPct+'%'},
          {icon:'🛡',label:'Accident Coverage',       value:'NPR 1M'},
          {icon:'📋',label:'Active Claims',              value:CLAIMS.filter(c=>c.status==='under_review').length},
          {icon:'⚖',label:'Premium Split',                 value:'50/50 Medical'},
        ]}
        onAdd={()=>setShowClaim(true)} addLabel="Submit Claim"/>

      <div style={{background:'#faf5ff',border:'1px solid #e9d5ff',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#581c87',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>⚖</span>
        <div style={{flex:1,minWidth:200}}><strong>Statutory Coverage, Not Optional:</strong> Per Section 18, your employer fully bears 100% of your accident insurance premium. Medical insurance follows a 50-50 employer-employee split. Adding a dependent through a life event (marriage, birth) auto-provisions coverage -- no separate form needed.</div>
      </div>

      {/* Digital insurance card */}
      <div style={{background:G,borderRadius:18,padding:'22px 26px',marginBottom:18,color:'#fff'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
          <div>
            <div style={{fontSize:9,opacity:.8}}>DIGITAL INSURANCE CARD</div>
            <div style={{fontSize:16,fontWeight:900,marginTop:4}}>Hari Thapa</div>
            <div style={{fontSize:9,opacity:.8,marginTop:2}}>Policy: MED-2025-00482</div>
          </div>
          <div style={{fontSize:24}}>🪪</div>
        </div>
        <div style={{display:'flex',gap:20,marginTop:16}}>
          <div><div style={{fontSize:8,opacity:.7}}>Medical Limit</div><div style={{fontSize:12,fontWeight:700}}>NPR {MY_COVERAGE.medical.limit_npr.toLocaleString()}</div></div>
          <div><div style={{fontSize:8,opacity:.7}}>Accident Limit</div><div style={{fontSize:12,fontWeight:700}}>NPR {MY_COVERAGE.accident.limit_npr.toLocaleString()}</div></div>
        </div>
      </div>

      {/* Deductible progress */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px',marginBottom:18}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:6,fontSize:11}}>
          <span style={{fontWeight:700,color:'#0f172a'}}>Medical Coverage Used</span>
          <span style={{fontWeight:800,color:A}}>NPR {MY_COVERAGE.medical.used_npr.toLocaleString()} / {MY_COVERAGE.medical.limit_npr.toLocaleString()}</span>
        </div>
        <div style={{height:10,background:'#f1f5f9',borderRadius:10,overflow:'hidden'}}><div style={{width:`${medicalPct}%`,height:'100%',background:A,borderRadius:10}}/></div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search claims by provider..."/>

      <div style={{display:'grid',gap:12,marginTop:14}}>
        {filtered.map(c=>{
          const sc = STATUS_CFG[c.status]
          return (
            <div key={c.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:c.provider,...c}})}}
              style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'14px 18px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:'#0f172a'}}>{c.type} -- {c.provider}</div>
                <div style={{fontSize:9,color:'#94a3b8'}}>Submitted {c.submitted}</div>
              </div>
              <div style={{display:'flex',gap:10,alignItems:'center'}}>
                <span style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>NPR {c.amount_npr.toLocaleString()}</span>
                <span style={{background:`${sc.c}15`,color:sc.c,fontSize:9,fontWeight:700,padding:'3px 10px',borderRadius:20}}>{sc.label}</span>
              </div>
            </div>
          )
        })}
      </div>

      {showClaim&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowClaim(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(480px,100%)'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 24px'}}><div style={{fontSize:15,fontWeight:900,color:'#fff'}}>Submit a Claim</div></div>
            <div style={{padding:'22px 24px'}}>
              <Field label="Claim Type" type="select" value="" onChange={()=>{}} accent={A} options={['Medical','Accident']}/>
              <Field label="Provider Name" value="" onChange={()=>{}} accent={A} required/>
              <Field label="Amount (NPR)" type="number" value="" onChange={()=>{}} accent={A} required/>
              <div style={{border:'2px dashed #e9d5ff',borderRadius:12,padding:'24px',textAlign:'center',background:'#faf5ff',marginBottom:14}}>
                <div style={{fontSize:24,marginBottom:6}}>📷</div>
                <div style={{fontSize:10,color:'#581c87'}}>Scan or upload your receipt/medical bill</div>
              </div>
              <button onClick={()=>setShowClaim(false)} style={{width:'100%',padding:13,borderRadius:11,border:'none',background:G,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>Submit Claim</button>
            </div>
          </div>
        </div>
      )}

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Claim photos are auto-scanned (OCR) to extract amount and provider -- minimal manual typing.','Life events (marriage, birth) trigger automatic dependent enrollment -- no separate paperwork.','SSF-integrated employees automatically receive provident fund, gratuity, and accident coverage in one streamlined record.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Claim Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}
