// FILE: GatePassManagementPage.jsx - Gate Pass Management
// (Finance, Assets & Administration > Administrative Operations)
// Temporary contractor/visitor gate passes -- reuses the EXISTING
// universal qr_codes registry (extended with a 'gate_pass' qr_type)
// rather than a second QR system. Emergency override fail-safe stated
// explicitly per the legal requirement.

import { useState } from 'react'
import { Field, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#0c4a6e 0%,#0284c7 60%,#7dd3fc 100%)'
const A = '#0284c7'

const ACTIVE_PASSES = [
  {id:'g1',holder:'Rajan Bhattarai (Contractor)',purpose:'Server room maintenance',valid_from:'2025-06-29',valid_until:'2025-07-02',zones:'Floor 3 -- IT Only'},
  {id:'g2',holder:'Cleaning Crew (4 staff)',purpose:'After-hours deep clean',valid_from:'2025-06-29',valid_until:'2025-06-29',zones:'All Floors'},
];

export default function GatePassManagementPage() {
  const [search, setSearch] = useState('')
  const [showIssue, setShowIssue] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = ACTIVE_PASSES.filter(p=>!search||p.holder.toLowerCase().includes(search.toLowerCase()))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🔑" title="Gate Pass Management"
        breadcrumb="Finance, Assets & Administration > Administrative Operations"
        gradient={G}
        stats={[
          {icon:'🔑',label:'Active Passes',  value:ACTIVE_PASSES.length},
          {icon:'⏰',label:'Expiring Today',     value:ACTIVE_PASSES.filter(p=>p.valid_until==='2025-06-29').length},
          {icon:'🚪',label:'Emergency Override',     value:'Fail-Safe Ready'},
          {icon:'⚖',label:'Hour Tracking',               value:'Synced to Attendance'},
        ]}
        onAdd={()=>setShowIssue(true)} addLabel="Issue Gate Pass"/>

      <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#1e40af',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🚨</span>
        <div style={{flex:1,minWidth:200}}><strong>Fail-Safe, Always:</strong> Every digital lock and gate tied to this system immediately unlocks during an industrial accident or health emergency -- security never overrides a safe exit.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by holder name..."/>

      <div style={{display:'grid',gap:14,marginTop:14}}>
        {filtered.map(p=>(
          <div key={p.id}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:p.holder,...p,impact_links:['My Attendance']}})}}
            style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'16px 18px'}}>
            <div style={{fontSize:12,fontWeight:700,color:'#0f172a'}}>{p.holder}</div>
            <div style={{fontSize:9,color:'#94a3b8',marginTop:3}}>{p.purpose} . 📍 {p.zones}</div>
            <div style={{fontSize:9,color:'#0284c7',marginTop:6,fontWeight:600}}>Valid: {p.valid_from} {'>'} {p.valid_until}</div>
          </div>
        ))}
      </div>

      {showIssue&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowIssue(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(460px,100%)'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'18px 24px'}}><div style={{fontSize:15,fontWeight:900,color:'#fff'}}>Issue Gate Pass</div></div>
            <div style={{padding:'20px 24px'}}>
              <Field label="Holder Name" value="" onChange={()=>{}} accent={A} required/>
              <Field label="Purpose" value="" onChange={()=>{}} accent={A} required hint="Voice input supported"/>
              <Field label="Authorized Zones" value="" onChange={()=>{}} accent={A} required/>
              <Field label="Valid Until" type="date" value="" onChange={()=>{}} accent={A}/>
              <button onClick={()=>setShowIssue(false)} style={{width:'100%',padding:13,borderRadius:11,border:'none',background:G,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>Generate QR Pass</button>
            </div>
          </div>
        </div>
      )}

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Gate swipe timestamps sync directly with attendance registers -- the same 8h/day, 48h/week limits apply to anyone tracked here.','Passes auto-expire at the stated date -- never a stale, forgotten access credential.','Zone restrictions are enforced at the lock level, never just a printed note on the badge.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Pass',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}
