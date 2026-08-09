// FILE: src/pages/billing/PlansPage.jsx
// Public pricing page — shown to new visitors
const G = 'linear-gradient(135deg,#1e1b4b 0%,#7c3aed 60%,#c4b5fd 100%)'
const P = '#7c3aed'

const PLANS = [
  { id:'starter', name:'Starter', price:150, color:'#0ea5e9', employees:'Up to 50',
    features:['Attendance & Leave','Payroll Processing','Employee Self-Service','Basic Reports','Email Support'] },
  { id:'professional', name:'Professional', price:300, color:P, employees:'Up to 500', popular:true,
    features:['Everything in Starter','Performance Management','Recruitment (ATS)','AI HR Analytics','Predictive Attrition','HR Co-Pilot AI','Priority Support'] },
  { id:'enterprise', name:'Enterprise', price:500, color:'#f59e0b', employees:'Unlimited',
    features:['Everything in Professional','Custom Workflows','White Label Option','API Access','Dedicated Account Manager','SLA 99.9% Uptime','24/7 Phone Support'] },
]

export default function PlansPage() {
  return (
    <div style={{minHeight:'100vh',background:'#f8fafc',fontFamily:'system-ui,sans-serif'}}>
      {/* Hero */}
      <div style={{background:G,padding:'60px 24px 80px',textAlign:'center'}}>
        <div style={{fontSize:36,fontWeight:900,color:'#fff',marginBottom:8}}>Simple, Transparent Pricing</div>
        <div style={{fontSize:14,color:'rgba(255,255,255,.75)',marginBottom:24}}>Per employee, per month · No setup fees · Cancel anytime</div>
        <div style={{display:'inline-flex',background:'rgba(255,255,255,.15)',borderRadius:20,padding:'4px 16px',fontSize:11,color:'rgba(255,255,255,.8)'}}>
          🇳🇵 Designed for Nepal · Nepal Labour Act 2074 Compliant · NPR Billing
        </div>
      </div>

      {/* Plans */}
      <div style={{maxWidth:1000,margin:'-40px auto 60px',padding:'0 24px',display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:20}}>
        {PLANS.map(pl=>(
          <div key={pl.id} style={{background:'#fff',borderRadius:20,padding:28,border:`2px solid ${pl.popular?pl.color:'#e2e8f0'}`,boxShadow:pl.popular?`0 8px 40px ${pl.color}25`:'0 2px 8px rgba(0,0,0,.06)',position:'relative'}}>
            {pl.popular&&<div style={{position:'absolute',top:-14,left:'50%',transform:'translateX(-50%)',background:G,color:'#fff',fontSize:10,fontWeight:800,padding:'4px 16px',borderRadius:20}}>⭐ MOST POPULAR</div>}
            <div style={{fontSize:14,fontWeight:800,color:pl.color,marginBottom:6}}>{pl.name}</div>
            <div style={{fontSize:36,fontWeight:900,color:'#0f172a',lineHeight:1}}>NPR {pl.price}</div>
            <div style={{fontSize:11,color:'#94a3b8',marginBottom:4}}>/employee/month</div>
            <div style={{fontSize:11,color:'#64748b',marginBottom:20,padding:'6px 12px',background:'#f8fafc',borderRadius:8}}>{pl.employees} employees</div>
            <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:24}}>
              {pl.features.map((f,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:8,fontSize:11,color:'#374151'}}>
                  <span style={{color:pl.color,fontWeight:700}}>✓</span>{f}
                </div>
              ))}
            </div>
            <a href="/register" style={{display:'block',textAlign:'center',padding:'11px',borderRadius:10,background:pl.popular?G:`${pl.color}15`,color:pl.popular?'#fff':pl.color,fontSize:12,fontWeight:800,textDecoration:'none'}}>
              Start Free Trial
            </a>
          </div>
        ))}
      </div>

      {/* Free trial banner */}
      <div style={{background:G,margin:'0 auto 40px',maxWidth:700,borderRadius:16,padding:'24px 32px',textAlign:'center',marginLeft:'auto',marginRight:'auto'}}>
        <div style={{fontSize:18,fontWeight:900,color:'#fff',marginBottom:6}}>🎉 Start with a 30-Day Free Trial</div>
        <div style={{fontSize:12,color:'rgba(255,255,255,.8)',marginBottom:16}}>Full Professional features · No credit card · Cancel anytime</div>
        <a href="/register" style={{display:'inline-block',padding:'12px 32px',borderRadius:10,background:'#fff',color:P,fontSize:13,fontWeight:800,textDecoration:'none'}}>Get Started Free →</a>
      </div>
    </div>
  )
}
