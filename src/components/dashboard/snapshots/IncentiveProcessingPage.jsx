// FILE: IncentiveProcessingPage.jsx - Incentive Processing (Payroll Processing)
// Tier-based commission/KPI engine: CRM-synced sales data, blended-rate OT
// adjustment for taxable incentive pay, real-time earnings tracker (self-service).

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#581c87 0%,#7c3aed 60%,#c4b5fd 100%)'
const A = '#7c3aed'

const INCENTIVE_TIERS = [
  {tier:'Tier 1',target:'0 - 500,000',rate_pct:2,label:'Base Rate'},
  {tier:'Tier 2',target:'500,001 - 1,000,000',rate_pct:3.5,label:'Mid Rate'},
  {tier:'Tier 3',target:'Above 1,000,000',rate_pct:5,label:'Top Rate'},
]

const INCENTIVE_RECORDS = [
  { id:'i1', employee:'Anjali Sharma', dept:'Sales', sales_npr:1250000, tier_hit:'Tier 3', incentive_npr:62500,
    crm_synced:true, taxable:true, status:'calculated', impact_links:['Tax & Compliance'] },
  { id:'i2', employee:'Sunil Magar', dept:'Customer Service', sales_npr:0, tier_hit:'N/A - KPI-based',
    kpi_metric:'CSAT Score 94%', incentive_npr:8000, crm_synced:false, taxable:true, status:'calculated',
    impact_links:[] },
  { id:'i3', employee:'Ramesh KC', dept:'Sales', sales_npr:680000, tier_hit:'Tier 2', incentive_npr:23800,
    crm_synced:true, taxable:true, status:'pending_sync', impact_links:['CRM Integration'] },
]

const STATUS_CFG = {calculated:{c:'#10b981',bg:'#f0fdf4',label:'Calculated'},pending_sync:{c:'#f59e0b',bg:'#fffbeb',label:'Pending CRM Sync'}}

export default function IncentiveProcessingPage() {
  const [search, setSearch] = useState('')
  const [ctx, setCtx] = useState(null)

  const filtered = INCENTIVE_RECORDS.filter(i=>!search||i.employee.toLowerCase().includes(search.toLowerCase()))
  const totalIncentive = INCENTIVE_RECORDS.reduce((s,i)=>s+i.incentive_npr,0)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📈" title="Incentive Processing"
        breadcrumb="Workforce Operations > Payroll & Compensation > Payroll Processing"
        gradient={G}
        stats={[
          {icon:'📈',label:'Active Records',  value:INCENTIVE_RECORDS.length},
          {icon:'💰',label:'Total Incentive',  value:'NPR '+totalIncentive.toLocaleString()},
          {icon:'🔗',label:'CRM Synced',       value:INCENTIVE_RECORDS.filter(i=>i.crm_synced).length},
          {icon:'📊',label:'Tier Structure',    value:'3 Tiers'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#faf5ff',border:'1px solid #e9d5ff',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#581c87',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>📊</span>
        <div style={{flex:1,minWidth:200}}><strong>Transparency First:</strong> Tier structure is visible to every employee on their self-service dashboard so they can track their own potential earnings in real time. Incentives are taxable supplemental income and, where non-discretionary, factor into the blended overtime rate for the pay period.</div>
      </div>

      {/* Tier structure */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12,marginBottom:18}}>
        {INCENTIVE_TIERS.map((t,i)=>(
          <div key={i} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'14px 16px'}}>
            <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:4}}>{t.tier} - {t.label}</div>
            <div style={{fontSize:18,fontWeight:900,color:A}}>{t.rate_pct}%</div>
            <div style={{fontSize:9,color:'#94a3b8',marginTop:4}}>Sales NPR {t.target}</div>
          </div>
        ))}
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{display:'grid',gap:12,marginTop:14}}>
        {filtered.map(i=>{
          const sc = STATUS_CFG[i.status]
          return (
            <div key={i.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:i.employee,...i}})}}
              style={{background:'#fff',border:`1.5px solid ${sc.c}33`,borderRadius:16,padding:'16px 18px',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${sc.c}`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:8}}>
                <div>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:3}}>
                    <span style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{i.employee}</span>
                    <span style={{background:sc.bg,color:sc.c,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{sc.label}</span>
                    {i.crm_synced&&<span style={{background:'#eff6ff',color:'#1d4ed8',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>🔗 CRM Synced</span>}
                  </div>
                  <div style={{fontSize:10,color:'#64748b'}}>{i.dept} . {i.sales_npr>0?`Sales: NPR ${i.sales_npr.toLocaleString()} . ${i.tier_hit}`:i.kpi_metric}</div>
                </div>
                <div style={{fontSize:16,fontWeight:900,color:A}}>NPR {i.incentive_npr.toLocaleString()}</div>
              </div>
            </div>
          )
        })}
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Calculation',key:'view'},{icon:'🔄',label:'Force CRM Sync',key:'sync'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
