// FILE: DataMigrationPage.jsx - Data Migration
// (System Administration > Operations)
// GENUINELY DIFFERENT FROM EVERY OTHER PAGE IN THIS BUILD: every prior
// page operates WITHIN one tenant's already-existing company_id. This
// page operates BEFORE a tenant fully exists -- it's platform-operator
// (super_admin) tooling for pulling a NEW client's entire HRIS dataset
// out of a competitor system and into a staging area here, reviewed
// and corrected by a human, before a single row ever touches a live
// company's data. Builds on the EXISTING parse_excel_upload AI column-
// mapping utility (excel_import.py, "used by every frontend page") --
// never a second mapping engine, just applied at tenant-onboarding scale
// across many modules instead of one.

import { useState } from 'react'
import { Field, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#1e1b4b 0%,#4338ca 60%,#818cf8 100%)'
const A = '#4338ca'

const STAGE_CFG = { staged:{c:'#0284c7',label:'Staged -- Awaiting Review'},validated:{c:'#f59e0b',label:'Validated -- Awaiting Approval'},promoted:{c:'#10b981',label:'Promoted to Live'},failed:{c:'#ef4444',label:'Failed Validation'} }

const MIGRATION_JOBS = [
  {client:'Himalayan Textiles Pvt Ltd',source_system:'BambooHR Export',module:'Employee Master',rows_total:284,rows_clean:271,rows_flagged:13,stage:'validated'},
  {client:'Himalayan Textiles Pvt Ltd',source_system:'BambooHR Export',module:'Payroll History (12mo)',rows_total:3408,rows_clean:3408,rows_flagged:0,stage:'promoted'},
  {client:'Kathmandu Logistics Group',source_system:'Generic CSV Export',module:'Employee Master',rows_total:96,rows_clean:58,rows_flagged:38,stage:'staged',
   flag_note:'38 rows flagged: 22 with inconsistent date formats, 11 with duplicate employee IDs, 5 missing department mapping. Resolve before validation can proceed.'},
];

const FIELD_MAPPING_PREVIEW = [
  {source_field:'emp_id',target_field:'employee_code',confidence:'high'},
  {source_field:'DOJ',target_field:'hire_date',confidence:'high'},
  {source_field:'desig',target_field:'designation',confidence:'medium'},
  {source_field:'dept_code',target_field:'department_id',confidence:'low',
   flag_note:'Source uses numeric department codes with no lookup table provided -- manual mapping required before this field can auto-populate.'},
]

export default function DataMigrationPage() {
  const [search, setSearch] = useState('')
  const [showNewJob, setShowNewJob] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = MIGRATION_JOBS.filter(j=>!search||j.client.toLowerCase().includes(search.toLowerCase()))
  const totalFlagged = MIGRATION_JOBS.reduce((s,j)=>s+j.rows_flagged,0)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🛬" title="Data Migration"
        breadcrumb="System Administration > Operations"
        gradient={G}
        stats={[
          {icon:'🛬',label:'Active Migration Jobs',  value:MIGRATION_JOBS.length},
          {icon:'⚠',label:'Rows Flagged for Review',     value:totalFlagged},
          {icon:'✅',label:'Promoted to Live',               value:MIGRATION_JOBS.filter(j=>j.stage==='promoted').length},
          {icon:'🔒',label:'PII Tokenized in Transit',           value:'Always'},
        ]}
        onAdd={()=>setShowNewJob(true)} addLabel="New Migration Job"/>

      <div style={{background:'#eef2ff',border:'1px solid #c7d2fe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#3730a3',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🔒</span>
        <div style={{flex:1,minWidth:200}}><strong>Nothing Touches a Live System Without Review:</strong> Every import lands in a staging area first -- mapped, validated, and flagged -- where a human signs off before a single row is promoted into the new client's actual tenant. Payroll continuity for existing clients is never put at risk by someone else's onboarding.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by client name..."/>

      <div style={{display:'grid',gap:16,marginTop:14,marginBottom:18}}>
        {filtered.map((j,i)=>{
          const sc = STAGE_CFG[j.stage]
          const cleanPct = Math.round(j.rows_clean/j.rows_total*100)
          return (
            <div key={i}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:j.client,...j,impact_links:['User Management']}})}}
              style={{background:'#fff',border:`1.5px solid ${j.flag_note?'#fed7aa':'#e2e8f0'}`,borderRadius:16,padding:'18px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:10}}>
                <div>
                  <div style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{j.client}</div>
                  <div style={{fontSize:9,color:'#94a3b8',marginTop:3}}>{j.module} · Source: {j.source_system}</div>
                </div>
                <span style={{background:`${sc.c}15`,color:sc.c,fontSize:9,fontWeight:700,padding:'3px 10px',borderRadius:20}}>{sc.label}</span>
              </div>
              <div style={{height:8,background:'#f1f5f9',borderRadius:8,overflow:'hidden',marginTop:12}}><div style={{width:`${cleanPct}%`,height:'100%',background:j.rows_flagged>0?'#f59e0b':'#10b981',borderRadius:8}}/></div>
              <div style={{fontSize:8,color:'#94a3b8',marginTop:6}}>{j.rows_clean}/{j.rows_total} rows clean{j.rows_flagged>0&&` · ${j.rows_flagged} flagged`}</div>
              {j.flag_note&&<div style={{marginTop:10,fontSize:9,color:'#b45309'}}>⚠ {j.flag_note}</div>}
            </div>
          )
        })}
      </div>

      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px'}}>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:12}}>🧩 Field Mapping Preview -- Kathmandu Logistics Group</div>
        {FIELD_MAPPING_PREVIEW.map((m,i)=>(
          <div key={i} style={{padding:'9px 0',borderBottom:i<FIELD_MAPPING_PREVIEW.length-1?'1px solid #f8fafc':'none'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
              <span style={{fontSize:10,fontFamily:'monospace',color:'#374151'}}>{m.source_field} → {m.target_field}</span>
              <span style={{fontSize:8,fontWeight:700,color:m.confidence==='high'?'#15803d':m.confidence==='medium'?'#b45309':'#dc2626'}}>{m.confidence} confidence</span>
            </div>
            {m.flag_note&&<div style={{marginTop:5,fontSize:8,color:'#b45309'}}>⚠ {m.flag_note}</div>}
          </div>
        ))}
      </div>

      {showNewJob&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowNewJob(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(520px,100%)'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:16,fontWeight:900,color:'#fff'}}>New Migration Job</div></div>
            <div style={{padding:'22px 28px'}}>
              <Field label="New Client Name" value="" onChange={()=>{}} accent={A} required/>
              <Field label="Source System" type="select" value="" onChange={()=>{}} accent={A} options={['BambooHR Export','Workday Export','SAP SuccessFactors Export','Generic CSV/Excel']}/>
              <Field label="Module" type="select" value="" onChange={()=>{}} accent={A} options={['Employee Master','Payroll History','Leave Balances','Documents & Records']}/>
              <div style={{border:'2px dashed #c7d2fe',borderRadius:12,padding:'24px',textAlign:'center',background:'#eef2ff',marginBottom:14}}>
                <div style={{fontSize:22,marginBottom:6}}>📤</div>
                <div style={{fontSize:10,color:'#3730a3'}}>Drag and drop the export file -- AI maps columns automatically</div>
              </div>
              <button onClick={()=>setShowNewJob(false)} style={{width:'100%',padding:13,borderRadius:11,border:'none',background:G,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>Upload &amp; Stage for Review</button>
            </div>
          </div>
        </div>
      )}

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Column mapping reuses the same AI engine every existing Excel upload in this system already relies on -- never a second, separately-trained mapping model.','Duplicate employee IDs, inconsistent date formats, and missing department links are flagged before promotion, never discovered after the client\'s first payroll run.','Sensitive fields (salary, banking, national ID) are tokenized in transit and only decrypted once data lands in the new tenant\'s own encrypted storage.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Staging Detail',key:'view'},{icon:'✅',label:'Approve & Promote',key:'promote'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
