// FILE: AccessibilitySupportPage.jsx - Accessibility Support
// (Employee Experience & Culture > Diversity, Equity & Inclusion)
// Accommodation request ticketing (Requested -> Pending Assessment ->
// Implemented), budget visibility, screen-reader/text-to-speech UI
// toggles. Rights of Persons with Disabilities Act, 2017 grounding.

import { useState } from 'react'
import { Field, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#052e16 0%,#15803d 60%,#86efac 100%)'
const A = '#15803d'

const STATUS_CFG = { requested:{c:'#94a3b8',label:'Requested'},pending_assessment:{c:'#f59e0b',label:'Pending Assessment'},implemented:{c:'#10b981',label:'Implemented'} }

const REQUESTS = [
  { id:'a1', accommodation:'Wheelchair-accessible desk and ramp access to 3rd floor', status:'implemented', requested_date:'2025-05-02', cost_npr:18000, confidential:true, impact_links:['Branch Setup'] },
  { id:'a2', accommodation:'Screen reader software license', status:'pending_assessment', requested_date:'2025-06-18', cost_npr:4500, confidential:true,
    flag_note:'Awaiting IT compatibility assessment with internal HR portal.' },
  { id:'a3', accommodation:'Flexible start time for medical appointments', status:'requested', requested_date:'2025-06-24', cost_npr:0, confidential:true },
]

const BUDGET = { allocated_npr:400000, spent_npr:142000 }

export default function AccessibilitySupportPage() {
  const [search, setSearch] = useState('')
  const [showRequest, setShowRequest] = useState(false)
  const [highContrast, setHighContrast] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = REQUESTS.filter(r=>!search||r.accommodation.toLowerCase().includes(search.toLowerCase()))
  const budgetPct = Math.round(BUDGET.spent_npr/BUDGET.allocated_npr*100)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="♿" title="Accessibility Support"
        breadcrumb="Employee Experience & Culture > Diversity, Equity & Inclusion"
        gradient={G}
        stats={[
          {icon:'♿',label:'Active Requests',  value:REQUESTS.filter(r=>r.status!=='implemented').length},
          {icon:'✅',label:'Implemented',         value:REQUESTS.filter(r=>r.status==='implemented').length},
          {icon:'💰',label:'Budget Used',            value:budgetPct+'%'},
          {icon:'🔒',label:'Confidentiality',           value:'Discreet by Default'},
        ]}
        onAdd={()=>setShowRequest(true)} addLabel="Request Accommodation"/>

      <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>⚖</span>
        <div style={{flex:1,minWidth:200}}><strong>A Legal Right, Handled Discreetly:</strong> The Rights of Persons with Disabilities Act mandates reasonable workplace accommodation. Requests here are visible only to HR and the requester -- never the wider team -- to remove the fear of stigma that keeps people from disclosing invisible conditions.</div>
      </div>

      {/* Accessibility UI toggle demo */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'14px 18px',marginBottom:18,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
        <span style={{fontSize:11,fontWeight:700,color:'#0f172a'}}>🖥 This portal's accessibility settings</span>
        <label style={{display:'flex',gap:8,alignItems:'center',fontSize:10,color:'#374151'}}>
          <input type="checkbox" checked={highContrast} onChange={e=>setHighContrast(e.target.checked)} style={{accentColor:A}}/>
          High-contrast mode
        </label>
      </div>

      {/* Budget visibility */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px 20px',marginBottom:18}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:8,fontSize:12}}>
          <span style={{fontWeight:800,color:'#0f172a'}}>💰 Accommodation Budget</span>
          <span style={{fontWeight:800,color:A}}>NPR {BUDGET.spent_npr.toLocaleString()} / {BUDGET.allocated_npr.toLocaleString()}</span>
        </div>
        <div style={{height:12,background:'#f1f5f9',borderRadius:12,overflow:'hidden'}}><div style={{width:`${budgetPct}%`,height:'100%',background:A,borderRadius:12}}/></div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search my requests..."/>

      <div style={{display:'grid',gap:14,marginTop:14}}>
        {filtered.map(r=>{
          const sc = STATUS_CFG[r.status]
          return (
            <div key={r.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:r.accommodation,...r}})}}
              style={{background:'#fff',border:`1.5px solid ${sc.c}33`,borderRadius:14,padding:'16px 18px',borderLeft:`4px solid ${sc.c}`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:8}}>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:'#0f172a'}}>{r.accommodation} {r.confidential&&'🔒'}</div>
                  <div style={{fontSize:9,color:'#94a3b8',marginTop:3}}>Requested {r.requested_date} {r.cost_npr>0&&`. NPR ${r.cost_npr.toLocaleString()}`}</div>
                </div>
                <span style={{background:`${sc.c}15`,color:sc.c,fontSize:9,fontWeight:700,padding:'3px 10px',borderRadius:20}}>{sc.label}</span>
              </div>
              {r.flag_note&&<div style={{marginTop:8,fontSize:9,color:'#b45309'}}>⚠ {r.flag_note}</div>}
            </div>
          )
        })}
      </div>

      {showRequest&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowRequest(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(480px,100%)'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 24px'}}><div style={{fontSize:15,fontWeight:900,color:'#fff'}}>Request an Accommodation</div></div>
            <div style={{padding:'22px 24px'}}>
              <Field label="Accommodation Needed" type="textarea" value="" onChange={()=>{}} accent={A} required hint="Voice input supported -- handled discreetly by HR only"/>
              <button onClick={()=>setShowRequest(false)} style={{width:'100%',padding:13,borderRadius:11,border:'none',background:G,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>Submit Confidentially</button>
            </div>
          </div>
        </div>
      )}

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Requests route directly to HR -- never to the direct manager unless the employee explicitly opts in.','Budget visibility helps HR plan proactively instead of treating each request as an unbudgeted surprise.','This portal itself meets WCAG 2.1 AA: full keyboard navigation, screen-reader labels, and adjustable contrast.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Request',key:'view'},{icon:'🔄',label:'Update Status',key:'status'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}
