// ATSOnboardingPage.jsx — Employee Onboarding
// New hire welcome · Documents · IT setup · Day-1 checklist
import { useState } from 'react'
import { useApp } from '../../../context/AppContext.jsx'

const TABS = ['Overview', 'Active', 'History', 'Settings']
const STATS = [
  { l:'This Month', v:'24', c:'#059669' },
  { l:'In Progress', v:'8',  c:'#1e40af' },
  { l:'Completed',  v:'16', c:'#059669' },
  { l:'Pending',    v:'3',  c:'#f59e0b' },
]

export default function ATSOnboardingPage() {
  const { navigate } = useApp()
  const [tab, setTab] = useState(0)

  return (
    <div style={{fontFamily:'system-ui,sans-serif'}}>
      {/* Header */}
      <div style={{background:'linear-gradient(135deg,#0f172a,#1e293b,#059669)',borderRadius:14,padding:'16px 20px',marginBottom:14,color:'#fff'}}>
        <div style={{display:'flex',gap:12,alignItems:'center',marginBottom:12}}>
          <div style={{width:44,height:44,borderRadius:11,background:'rgba(255,255,255,.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>🎉</div>
          <div style={{flex:1}}>
            <h2 style={{margin:0,fontSize:18,fontWeight:900}}>Employee Onboarding</h2>
            <p style={{margin:'3px 0 0',fontSize:9,opacity:.75}}>New hire welcome · Documents · IT setup · Day-1 checklist</p>
          </div>
        </div>
        <div style={{display:'flex',gap:14,flexWrap:'wrap'}}>
          {STATS.map((s,i)=>(
            <div key={i} style={{textAlign:'center'}}>
              <div style={{fontSize:20,fontWeight:900,color:s.c}}>{}</div>
              <div style={{fontSize:8,opacity:.7}}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:6,marginBottom:14}}>
        {TABS.map((t,i)=>(
          <button key={t} onClick={()=>setTab(i)}
            style={{padding:'8px 18px',borderRadius:9,border:tab!==i?'1px solid #e2e8f0':'none',background:tab===i?'#059669':'#fff',color:tab===i?'#fff':'#475569',fontSize:10,fontWeight:tab===i?800:400,cursor:'pointer'}}>
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',padding:'32px',textAlign:'center'}}>
        <div style={{fontSize:48,marginBottom:16}}>🎉</div>
        <div style={{fontSize:15,fontWeight:700,color:'#0f172a',marginBottom:8}}>Employee Onboarding</div>
        <div style={{fontSize:10,color:'#64748b',lineHeight:1.8,marginBottom:24,maxWidth:500,margin:'0 auto 24px'}}>New hire welcome · Documents · IT setup · Day-1 checklist</div>
        <div style={{display:'flex',gap:10,justifyContent:'center',flexWrap:'wrap'}}>
          <button onClick={()=>navigate('ats-dashboard')}
            style={{padding:'9px 22px',borderRadius:9,border:'none',background:'#059669',color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>
            🏠 Go to Dashboard
          </button>
          <button style={{padding:'9px 22px',borderRadius:9,border:'1px solid #e2e8f0',background:'#fff',color:'#374151',fontSize:10,cursor:'pointer'}}>
            📖 View Documentation
          </button>
        </div>
        <div style={{marginTop:28,padding:'14px',background:'#f8fafc',borderRadius:10,fontSize:9,color:'#94a3b8',border:'1px solid #f1f5f9'}}>
          Full UI being connected to backend <code style={{color:'#059669'}}>POST /api/v1/ats-onboarding/</code>
        </div>
      </div>
    </div>
  )
}
