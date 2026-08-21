// FILE: LetterRequestPage.jsx - Letter Request
// (HR Services & Support > Employee Self Service)
// Internal HR letter catalog (NOC, salary certificate, employment
// verification) -- distinct from government_letters_routes (SSF/CIT/
// tax/labour-dept submissions to external authorities). One-click
// generation + status tracking.

import { useState } from 'react'
import { Field, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fdba74 100%)'
const A = '#c2410c'

const LETTER_CATALOG = [
  {type:'Salary Certificate',icon:'💰',auto_generate:true},{type:'Employment Verification Letter',icon:'✅',auto_generate:true},
  {type:'No Objection Certificate (NOC)',icon:'📜',auto_generate:false},{type:'Experience Letter',icon:'🏆',auto_generate:false},
  {type:'Bank Reference Letter',icon:'🏦',auto_generate:true},
]

const MY_LETTER_REQUESTS = [
  { id:'l1', type:'Salary Certificate', purpose:'Visa application', status:'ready', requested:'2025-06-20', impact_links:[] },
  { id:'l2', type:'No Objection Certificate (NOC)', purpose:'Higher studies abroad', status:'pending_approval', requested:'2025-06-22',
    flag_note:'Routed through Department Head -- NOC requires manual review.' },
]

const STATUS_CFG = { pending_approval:{c:'#f59e0b',label:'Pending Approval'},ready:{c:'#10b981',label:'Ready to Download'} }

export default function LetterRequestPage() {
  const [search, setSearch] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = MY_LETTER_REQUESTS.filter(l=>!search||l.type.toLowerCase().includes(search.toLowerCase()))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📄" title="Letter Request"
        breadcrumb="HR Services & Support > Employee Self Service"
        gradient={G}
        stats={[
          {icon:'📄',label:'Letter Types Available',  value:LETTER_CATALOG.length},
          {icon:'⏳',label:'Pending',                     value:MY_LETTER_REQUESTS.filter(l=>l.status==='pending_approval').length},
          {icon:'✅',label:'Ready to Download',              value:MY_LETTER_REQUESTS.filter(l=>l.status==='ready').length},
          {icon:'⚡',label:'Auto-Generated',                    value:LETTER_CATALOG.filter(l=>l.auto_generate).length},
        ]}
        onAdd={()=>setShowNew(true)} addLabel="Request a Letter"/>

      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#7c2d12',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>⚡</span>
        <div style={{flex:1,minWidth:200}}><strong>One Click, No Waiting on Email:</strong> Salary certificates, employment verification, and bank reference letters auto-generate from your existing HR record instantly. NOC and Experience Letters route for a quick HR review first.</div>
      </div>

      {/* Letter catalog tiles */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:12,marginBottom:18}}>
        {LETTER_CATALOG.map((l,i)=>(
          <div key={i} onClick={()=>setShowNew(true)} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'16px',textAlign:'center',cursor:'pointer'}}>
            <div style={{fontSize:24,marginBottom:8}}>{l.icon}</div>
            <div style={{fontSize:10,fontWeight:700,color:'#0f172a'}}>{l.type}</div>
            {l.auto_generate&&<div style={{fontSize:7,color:'#15803d',marginTop:4,fontWeight:700}}>⚡ Instant</div>}
          </div>
        ))}
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search my letter requests..."/>

      <div style={{display:'grid',gap:14,marginTop:14}}>
        {filtered.map(l=>{
          const sc = STATUS_CFG[l.status]
          return (
            <div key={l.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:l.type,...l}})}}
              style={{background:'#fff',border:`1.5px solid ${sc.c}33`,borderRadius:14,padding:'16px 18px',borderLeft:`4px solid ${sc.c}`,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:'#0f172a'}}>{l.type}</div>
                <div style={{fontSize:9,color:'#94a3b8',marginTop:2}}>Purpose: {l.purpose} . Requested {l.requested}</div>
                {l.flag_note&&<div style={{marginTop:6,fontSize:9,color:'#b45309'}}>↪ {l.flag_note}</div>}
              </div>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <span style={{background:`${sc.c}15`,color:sc.c,fontSize:9,fontWeight:700,padding:'3px 10px',borderRadius:20}}>{sc.label}</span>
                {l.status==='ready'&&<button style={{padding:'6px 14px',borderRadius:8,border:'none',background:sc.c,color:'#fff',fontSize:9,fontWeight:700,cursor:'pointer'}}>📥 Download</button>}
              </div>
            </div>
          )
        })}
      </div>

      {showNew&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowNew(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(480px,100%)'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'18px 24px'}}><div style={{fontSize:15,fontWeight:900,color:'#fff'}}>Request a Letter</div></div>
            <div style={{padding:'20px 24px'}}>
              <Field label="Letter Type" type="select" value="" onChange={()=>{}} accent={A} options={LETTER_CATALOG.map(l=>l.type)}/>
              <Field label="Purpose" value="" onChange={()=>{}} accent={A} required hint="e.g. Visa application, bank loan, higher studies"/>
              <button onClick={()=>setShowNew(false)} style={{width:'100%',padding:13,borderRadius:11,border:'none',background:G,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>Submit Request</button>
            </div>
          </div>
        </div>
      )}

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Auto-generated letters pull your current designation, tenure, and salary directly from your HR record -- never manually retyped.','Approval-routed letters notify you the moment HR signs off, with the document ready to download immediately after.','Status tracking means you never have to email HR asking "where is my letter?"']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Detail',key:'view'},{icon:'📥',label:'Download',key:'download'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
