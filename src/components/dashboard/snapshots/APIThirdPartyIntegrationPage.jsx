// FILE: APIThirdPartyIntegrationPage.jsx - API & Third Party Integration
// (System Administration > Integration & API)
// The connector marketplace + field-mapping layer -- genuinely new, no
// webhook/API-connector configuration existed anywhere in the build.
// Version-drift detection and field-mapping mismatch flags address
// the brief's explicit pain points directly (APIs change without
// warning, employment-status/pay-code mismatches corrupt downstream systems).

import { useState } from 'react'
import { Field, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#1e1b4b 0%,#4338ca 60%,#818cf8 100%)'
const A = '#4338ca'

const STATUS_CFG = { connected:{c:'#10b981',label:'Connected'},error:{c:'#ef4444',label:'Sync Error'},disconnected:{c:'#94a3b8',label:'Disconnected'} }

const INTEGRATIONS = [
  {name:'Slack',category:'Communication',status:'connected',last_sync:'2 min ago',fields_mapped:8},
  {name:'QuickBooks (Accounting)',category:'ERP',status:'connected',last_sync:'1 hour ago',fields_mapped:14},
  {name:'LinkedIn Talent Hub',category:'ATS',status:'error',last_sync:'3 days ago',fields_mapped:6,
   flag_note:'Vendor updated their endpoint schema -- "employment_status" field mapping now returns an unrecognized value. Review required before data corrupts downstream.'},
]

export default function APIThirdPartyIntegrationPage() {
  const [search, setSearch] = useState('')
  const [showConnect, setShowConnect] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = INTEGRATIONS.filter(i=>!search||i.name.toLowerCase().includes(search.toLowerCase()))
  const errorCount = INTEGRATIONS.filter(i=>i.status==='error').length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🔌" title="API &amp; Third Party Integration"
        breadcrumb="System Administration > Integration & API"
        gradient={G}
        stats={[
          {icon:'🔌',label:'Active Connections',  value:INTEGRATIONS.filter(i=>i.status==='connected').length},
          {icon:'⚠',label:'Sync Errors',              value:errorCount},
          {icon:'🧩',label:'Total Fields Mapped',         value:INTEGRATIONS.reduce((s,i)=>s+i.fields_mapped,0)},
          {icon:'📡',label:'Webhooks Active',                 value:'2'},
        ]}
        onAdd={()=>setShowConnect(true)} addLabel="Connect New App"/>

      <div style={{background:'#eef2ff',border:'1px solid #c7d2fe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#3730a3',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🧩</span>
        <div style={{flex:1,minWidth:200}}><strong>Drag, Drop, Map -- No Hand-Coded Pipeline:</strong> Connect a third-party app and map its fields to your HR data visually -- a vendor's "employment_status" can mean something different than yours, and this is where that gets caught before it corrupts a downstream payroll or benefits feed.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search integrations..."/>

      <div style={{display:'grid',gap:16,marginTop:14}}>
        {filtered.map((i,idx)=>{
          const sc = STATUS_CFG[i.status]
          return (
            <div key={idx}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:i.name,...i,impact_links:['Notification Engine']}})}}
              style={{background:'#fff',border:`1px solid ${i.flag_note?'#fecaca':'#e2e8f0'}`,borderRadius:16,padding:'18px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:10}}>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:'#0f172a'}}>{i.name}</div>
                  <div style={{fontSize:9,color:'#94a3b8',marginTop:3}}>{i.category} . {i.fields_mapped} fields mapped . Last sync: {i.last_sync}</div>
                </div>
                <span style={{background:`${sc.c}15`,color:sc.c,fontSize:9,fontWeight:700,padding:'3px 10px',borderRadius:20}}>{sc.label}</span>
              </div>
              {i.flag_note&&<div style={{marginTop:8,fontSize:9,color:'#dc2626'}}>🚨 {i.flag_note}</div>}
            </div>
          )
        })}
      </div>

      {showConnect&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowConnect(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(480px,100%)'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'18px 24px'}}><div style={{fontSize:15,fontWeight:900,color:'#fff'}}>Connect New App</div></div>
            <div style={{padding:'20px 24px'}}>
              <Field label="App / Service Name" value="" onChange={()=>{}} accent={A} required/>
              <Field label="API Key / Webhook URL" value="" onChange={()=>{}} accent={A} required/>
              <Field label="Category" type="select" value="" onChange={()=>{}} accent={A} options={['Communication','ERP','ATS','Payroll','Other']}/>
              <button onClick={()=>setShowConnect(false)} style={{width:'100%',padding:13,borderRadius:11,border:'none',background:G,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>Connect &amp; Map Fields</button>
            </div>
          </div>
        </div>
      )}

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['AI flags a vendor endpoint change the moment a sync starts returning an unrecognized value -- never silently passed through to corrupt a downstream system.','Webhooks push and pull in real time -- never a manual re-entry across two disconnected systems.','Every integration\'s API key is encrypted at rest -- never stored or displayed in plain text after the initial connection.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Field Mapping',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}
