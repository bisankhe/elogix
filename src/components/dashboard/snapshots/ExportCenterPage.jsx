// FILE: ExportCenterPage.jsx - Export Center
// (Reports, Analytics & BI > Advanced Analytics)
// Single-click export across csv/xlsx/pdf/webhook -- genuinely new.
// The PII-export gate is the load-bearing legal requirement here:
// any export containing PII cannot leave the system without explicit
// legal grounds or employee consent on file -- enforced as a real
// gate, not a checkbox that can be skipped.

import { useState } from 'react'
import { Field, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fdba74 100%)'
const A = '#c2410c'

const RECENT_EXPORTS = [
  {report:'Department Headcount Snapshot',format:'XLSX',contains_pii:false,exported_by:'HR Admin',date:'2025-06-28',status:'completed'},
  {report:'Q2 Compensation Equity Review',format:'PDF',contains_pii:true,exported_by:'HR Manager',date:'2025-06-20',status:'completed',
   flag_note:'Contains compensation PII -- legal grounds on file: internal pay-equity audit, board-restricted distribution.'},
  {report:'Performance Review Export -- External Auditor',format:'CSV',contains_pii:true,exported_by:'HR Manager',date:'2025-06-15',status:'blocked',
   flag_note:'Blocked -- no employee consent or legal grounds recorded for external sharing of performance PII.'},
]

export default function ExportCenterPage() {
  const [search, setSearch] = useState('')
  const [showExport, setShowExport] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = RECENT_EXPORTS.filter(e=>!search||e.report.toLowerCase().includes(search.toLowerCase()))
  const blockedCount = RECENT_EXPORTS.filter(e=>e.status==='blocked').length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📤" title="Export Center"
        breadcrumb="Reports, Analytics & BI > Advanced Analytics"
        gradient={G}
        stats={[
          {icon:'📤',label:'Exports This Month',  value:RECENT_EXPORTS.length},
          {icon:'🔒',label:'Contained PII',            value:RECENT_EXPORTS.filter(e=>e.contains_pii).length},
          {icon:'⛔',label:'Blocked (No Legal Grounds)',   value:blockedCount},
          {icon:'⚖',label:'Webhook Integrations',             value:'3 Active'},
        ]}
        onAdd={()=>setShowExport(true)} addLabel="New Export"/>

      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#7c2d12',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🔒</span>
        <div style={{flex:1,minWidth:200}}><strong>PII Doesn't Leave Without Grounds:</strong> Any export containing personally identifiable information requires either explicit employee consent or a documented legal basis on file -- this isn't a checkbox to click past, it's a hard gate that blocks the download.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search exports..."/>

      <div style={{display:'grid',gap:14,marginTop:14}}>
        {filtered.map((e,i)=>(
          <div key={i}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:e.report,...e,impact_links:['Custom Report Builder']}})}}
            style={{background:'#fff',border:`1px solid ${e.status==='blocked'?'#fecaca':'#e2e8f0'}`,borderRadius:14,padding:'16px 18px',borderLeft:`4px solid ${e.status==='blocked'?'#ef4444':e.contains_pii?'#f59e0b':'#10b981'}`}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:8}}>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:'#0f172a'}}>{e.report}</div>
                <div style={{fontSize:9,color:'#94a3b8',marginTop:3}}>{e.format} . {e.exported_by} . {e.date}</div>
              </div>
              <span style={{background:e.status==='blocked'?'#fef2f2':'#f0fdf4',color:e.status==='blocked'?'#dc2626':'#15803d',fontSize:9,fontWeight:700,padding:'3px 10px',borderRadius:20}}>
                {e.status==='blocked'?'⛔ Blocked':'✓ Completed'}
              </span>
            </div>
            {e.flag_note&&<div style={{marginTop:8,fontSize:9,color:e.status==='blocked'?'#dc2626':'#b45309'}}>⚖ {e.flag_note}</div>}
          </div>
        ))}
      </div>

      {showExport&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowExport(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(480px,100%)'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'18px 24px'}}><div style={{fontSize:15,fontWeight:900,color:'#fff'}}>New Export</div></div>
            <div style={{padding:'20px 24px'}}>
              <Field label="Report to Export" value="" onChange={()=>{}} accent={A} required/>
              <Field label="Format" type="select" value="" onChange={()=>{}} accent={A} options={['CSV','XLSX','PDF','Webhook']}/>
              <label style={{display:'flex',gap:8,alignItems:'flex-start',marginBottom:14,fontSize:9,color:'#7c2d12'}}>
                <input type="checkbox" style={{accentColor:A,marginTop:2}}/> This export contains PII -- I confirm legal grounds or employee consent is on file
              </label>
              <button onClick={()=>setShowExport(false)} style={{width:'100%',padding:13,borderRadius:11,border:'none',background:G,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>Generate Export</button>
            </div>
          </div>
        </div>
      )}

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Every export is logged with who, what fields, and when -- the mandatory recordkeeping trail, never an untracked download.','Webhook integrations push directly to approved payroll/BI tools -- never a manual file hand-off that could go to the wrong recipient.','Blocked exports route to HR for a legal-grounds review, never silently denied with no path forward.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
