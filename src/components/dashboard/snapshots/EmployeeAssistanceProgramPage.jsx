// FILE: EmployeeAssistanceProgramPage.jsx - Employee Assistance Program (EAP)
// (Employee Experience & Culture > Wellness & Support)
// Discreet, judgment-free hub for legal/financial/emotional support.
// Addresses the brief's low-utilization pain point with proactive
// milestone nudges, not reactive crisis-only framing. Privacy
// guarantee stated explicitly -- usage never affects reviews.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#1e1b4b 0%,#4338ca 60%,#818cf8 100%)'
const A = '#4338ca'

const SERVICES = [
  { category:'Legal', desc:'Free 30-min consultation on personal legal matters -- contracts, family law, tenancy disputes.', icon:'⚖' },
  { category:'Financial', desc:'Confidential budgeting, debt management, and retirement planning guidance.', icon:'💰' },
  { category:'Emotional', desc:'Short-term counseling for personal or work-related stress, separate from Mental Health Support sessions.', icon:'🫂' },
]

const MY_CASES = [
  { id:'eap1', category:'Financial', status:'scheduled', date:'2025-06-28', confidential:true },
]

export default function EmployeeAssistanceProgramPage() {
  const [search, setSearch] = useState('')
  const [ctx, setCtx] = useState(null)

  const filtered = SERVICES.filter(s=>!search||s.category.toLowerCase().includes(search.toLowerCase()))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🤲" title="Employee Assistance Program"
        breadcrumb="Employee Experience & Culture > Wellness & Support"
        gradient={G}
        stats={[
          {icon:'🤲',label:'Services Available',  value:SERVICES.length},
          {icon:'📅',label:'My Active Cases',         value:MY_CASES.length},
          {icon:'🔒',label:'Confidentiality',            value:'Guaranteed'},
          {icon:'📞',label:'Helpline',                      value:'Toll-Free 24/7'},
        ]}
        onAdd={()=>{}} addLabel="Request Support"/>

      <div style={{background:'#eef2ff',border:'1px solid #c7d2fe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#3730a3',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🔒</span>
        <div style={{flex:1,minWidth:200}}><strong>Your Privacy, Guaranteed:</strong> Using the EAP never appears in your performance reviews, never reaches your manager, and is never visible in your personnel file. This is judgment-free support, not a crisis-only last resort.</div>
      </div>

      {/* One-click toll-free dial */}
      <div style={{background:G,borderRadius:16,padding:'18px 22px',marginBottom:18,color:'#fff',display:'flex',alignItems:'center',gap:16}}>
        <span style={{fontSize:30}}>📞</span>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:900}}>Talk to Someone Now</div>
          <div style={{fontSize:9,opacity:.85,marginTop:2}}>One-tap call to the confidential toll-free EAP helpline</div>
        </div>
        <button style={{padding:'10px 20px',borderRadius:10,border:'none',background:'#fff',color:A,fontSize:11,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap'}}>Call Now</button>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search support services..."/>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:14,marginTop:14,marginBottom:18}}>
        {filtered.map((s,i)=>(
          <div key={i} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'16px',cursor:'pointer'}}>
            <div style={{fontSize:24,marginBottom:8}}>{s.icon}</div>
            <div style={{fontSize:11,fontWeight:800,color:'#0f172a'}}>{s.category} Support</div>
            <div style={{fontSize:9,color:'#64748b',marginTop:4}}>{s.desc}</div>
          </div>
        ))}
      </div>

      {/* My cases */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px'}}>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:12}}>📅 My Scheduled Sessions</div>
        {MY_CASES.length===0?(
          <div style={{fontSize:10,color:'#94a3b8'}}>No active sessions. Request support above whenever you're ready.</div>
        ):MY_CASES.map(c=>(
          <div key={c.id}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:`${c.category} Session`,...c}})}}
            style={{display:'flex',justifyContent:'space-between',padding:'8px 0'}}>
            <span style={{fontSize:10,color:'#374151'}}>{c.category} Support {c.confidential&&'🔒'}</span>
            <span style={{fontSize:9,color:'#94a3b8'}}>{c.date} -- {c.status}</span>
          </div>
        ))}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Proactive nudges surface this page after onboarding or a return from prolonged leave -- not just buried in a handbook.','Usage data is never linked to your employee profile in any report visible to management.','Designed as a first stop for everyday stress, not only a last resort during crisis -- addressing the typical 2-5% utilization problem directly.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} actions={[
        {icon:'👁',label:'View Detail',key:'view'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}
