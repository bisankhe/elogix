// FILE: MentalHealthSupportPage.jsx - Mental Health Support
// (Employee Experience & Culture > Wellness & Support)
// Sensory-neutral, strictly confidential design. Teletherapy booking,
// AI clinician matching, 24/7 anonymous chat. Session counts and
// usage NEVER visible to managers or HR -- only aggregate, anonymized
// department trends. Mental Health Leave reuses the EXISTING
// leave_types (12 fully-paid days/year per Section 18).

import { useState } from 'react'
import { PageHeader, AIImpact, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#0c4a6e 0%,#0284c7 60%,#7dd3fc 100%)'
const A = '#0284c7'

const MY_SUPPORT = { sessions_remaining:6, sessions_total:8, next_session:'2025-06-27 4:00 PM', clinician:'Dr. Pratima Joshi (Counseling Psychologist)' }

const RESOURCES = [
  {title:'24/7 Anonymous Chat Support',desc:'No login required, fully anonymous, available anytime.',icon:'💬'},
  {title:'Find a Clinician',desc:'AI-matched teletherapy in your preferred language.',icon:'🧑‍⚕️'},
  {title:'Mental Health Leave',desc:'12 fully-paid days/year, plus 1 month unpaid if medically recommended.',icon:'📅'},
]

export default function MentalHealthSupportPage() {
  const [showSOS, setShowSOS] = useState(false)
  const [ctx, setCtx] = useState(null)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="💚" title="Mental Health Support"
        breadcrumb="Employee Experience & Culture > Wellness & Support"
        gradient={G}
        stats={[
          {icon:'💚',label:'Sessions Remaining',  value:`${MY_SUPPORT.sessions_remaining}/${MY_SUPPORT.sessions_total}`},
          {icon:'🔒',label:'Confidentiality',         value:'Always Protected'},
          {icon:'🌐',label:'Languages Available',       value:'NP / EN / Multiple'},
          {icon:'🕐',label:'Availability',                value:'24/7'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#1e40af',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🔒</span>
        <div style={{flex:1,minWidth:200}}><strong>Strictly Confidential, Always:</strong> Your manager and HR never see whether you've used this page, how many sessions you've booked, or any session content. Only fully anonymized, department-level trends are ever visible to the organization -- never anything traceable to you.</div>
      </div>

      {/* My care */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'20px',marginBottom:18}}>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:14}}>🗓 Your Care</div>
        <div style={{height:8,background:'#f1f5f9',borderRadius:8,overflow:'hidden',marginBottom:8}}><div style={{width:`${MY_SUPPORT.sessions_remaining/MY_SUPPORT.sessions_total*100}%`,height:'100%',background:A,borderRadius:8}}/></div>
        <div style={{fontSize:10,color:'#94a3b8'}}>{MY_SUPPORT.sessions_remaining} of {MY_SUPPORT.sessions_total} sessions remaining this year</div>
        <div style={{marginTop:12,padding:'12px 14px',background:'#f8fafc',borderRadius:10}}>
          <div style={{fontSize:10,fontWeight:700,color:'#0f172a'}}>Next session: {MY_SUPPORT.next_session}</div>
          <div style={{fontSize:9,color:'#94a3b8',marginTop:3}}>{MY_SUPPORT.clinician}</div>
        </div>
        <button style={{marginTop:12,padding:'10px 20px',borderRadius:10,border:'none',background:A,color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>Book a New Session</button>
      </div>

      {/* Resources grid */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:14,marginBottom:18}}>
        {RESOURCES.map((r,i)=>(
          <div key={i} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'16px',cursor:'pointer'}}>
            <div style={{fontSize:24,marginBottom:8}}>{r.icon}</div>
            <div style={{fontSize:11,fontWeight:800,color:'#0f172a'}}>{r.title}</div>
            <div style={{fontSize:9,color:'#64748b',marginTop:4}}>{r.desc}</div>
          </div>
        ))}
      </div>

      {/* Crisis support */}
      <div onClick={()=>setShowSOS(true)} style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:14,padding:'16px 18px',cursor:'pointer',display:'flex',alignItems:'center',gap:14}}>
        <span style={{fontSize:28}}>🆘</span>
        <div>
          <div style={{fontSize:12,fontWeight:800,color:'#991b1b'}}>Need to talk to someone right now?</div>
          <div style={{fontSize:10,color:'#b91c1c',marginTop:2}}>Immediate crisis support is available, anonymously, 24/7.</div>
        </div>
      </div>

      {showSOS&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',zIndex:6000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowSOS(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(420px,100%)',padding:'30px',textAlign:'center'}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:40,marginBottom:14}}>🆘</div>
            <div style={{fontSize:15,fontWeight:900,color:'#0f172a',marginBottom:10}}>You're not alone</div>
            <div style={{fontSize:11,color:'#64748b',marginBottom:20}}>Connect now with a crisis counselor -- fully anonymous, no identifying information shared.</div>
            <button style={{width:'100%',padding:14,borderRadius:12,border:'none',background:'#dc2626',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',marginBottom:10}}>📞 Connect Now</button>
            <button onClick={()=>setShowSOS(false)} style={{width:'100%',padding:12,borderRadius:10,border:'1px solid #e2e8f0',background:'#fff',color:'#64748b',fontSize:11,cursor:'pointer'}}>Close</button>
          </div>
        </div>
      )}

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['AI clinician matching considers language, specialty, and your stated preferences -- never shared with anyone outside the care platform.','Mental Health Leave requests route through standard leave approval without disclosing the reason to your manager.','Department-level stress signals are aggregated and anonymized below a minimum group size to prevent re-identification.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} actions={[
        {icon:'👁',label:'View Detail',key:'view'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
