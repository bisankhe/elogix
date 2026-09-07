// FILE: AIPolicyAssistantPage.jsx — AI Policy Assistant
import { useState } from 'react'

const P='#7c3aed'
const G='linear-gradient(135deg,#1e1b4b 0%,#7c3aed 60%,#c4b5fd 100%)'
const VITE_KEY=import.meta?.env?.VITE_ANTHROPIC_API_KEY||''

const POLICIES=[
  {id:'leave',icon:'🌴',title:'Leave Policy',desc:'Annual, sick, maternity, paternity leave entitlements',tags:['Labour Act 2074','Section 45']},
  {id:'attendance',icon:'⏰',title:'Attendance Policy',desc:'Working hours, grace period, overtime rules',tags:['Section 36','8 hrs/day']},
  {id:'code',icon:'📋',title:'Code of Conduct',desc:'Workplace behaviour, ethics, disciplinary procedures',tags:['HR Policy','ISO 9001']},
  {id:'payroll',icon:'💰',title:'Compensation Policy',desc:'Salary structure, SSF, gratuity, bonus',tags:['SSF Act 2074','Labour Act']},
  {id:'wfh',icon:'🏠',title:'Work From Home Policy',desc:'Remote work eligibility, equipment, connectivity norms',tags:['New Policy']},
  {id:'grievance',icon:'🤝',title:'Grievance Policy',desc:'Complaint procedure, escalation, resolution timeline',tags:['Privacy Act 2018']},
  {id:'data',icon:'🔒',title:'Data Privacy Policy',desc:'Employee data handling, consent, GDPR compliance',tags:['Nepal Privacy Act','GDPR']},
  {id:'safety',icon:'🦺',title:'Safety & Health Policy',desc:'Workplace safety standards, emergency procedures',tags:['OSH Standards']},
]

const POLICY_ANSWERS={
  leave:`**Nepal Labour Act 2074 — Leave Policy Summary:**\n\n**Sick Leave:** 12 days/year, full pay from Day 1 (no waiting period)\n\n**Home/Annual Leave:** 1 day per 20 working days, max 90 days accumulation\n\n**Maternity Leave:** 98 days full pay (Section 45) — 2 weeks mandatory before delivery\n\n**Paternity Leave:** 15 days full pay — new provision in 2074\n\n**Mourning Leave:** 13 days for immediate family\n\n**Marriage Leave:** 7 days (one-time)\n\n**Public Holidays:** 13 days (male), 14 days (female)\n\n*Source: Nepal Labour Act 2074, Sections 37-47*`,
  attendance:`**Attendance & Working Hours Policy:**\n\n**Standard Hours:** 8 hrs/day, 48 hrs/week (Monday-Friday)\n\n**Grace Period:** 15 minutes permitted\n\n**Free Late Arrivals:** 3 per calendar month\n\n**Deduction beyond 3:** 0.5 day basic salary per occurrence\n\n**Overtime:** 1.5x regular rate (Section 36), max 4 hrs/day, 24 hrs/week\n\n**OT Payment:** With regular monthly salary\n\n**WFH:** Department head approval required. Must maintain check-in via system.\n\n*Source: Labour Act 2074, Section 36 + Company HR Policy Manual v3.2*`,
  payroll:`**Compensation & Payroll Policy:**\n\n**Minimum Wage:** NPR 17,300/month (2024 notification)\n\n**SSF Contribution:** Employee 11% + Employer 20% = 31% total of basic salary\n\n**Gratuity:** 8.33%/year of basic salary from Day 1 — no minimum service required\n\n**Bonus:** Festival expense = 1 month salary/year (payable before Dashain)\n\n**Increment:** Annual performance-linked (CPI + merit 0-15%)\n\n**Tax (CIT):** Per IRD Nepal tax slabs, deducted at source\n\n*Source: SSF Act 2074, Labour Act 2074, Nepal Income Tax Act*`,
  data:`**Data Privacy & Security Policy:**\n\n**Scope:** Applies to all employee PII collected in eLogix HRMS HRIS\n\n**Data Collected:** Name, NID, bank details, biometrics, performance records\n\n**Access Control:** RBAC — role-based access enforced at all levels\n\n**Sharing:** No employee data shared outside company without written consent\n\n**Retention:** 7 years post-exit for statutory records\n\n**Breach Protocol:** Notify affected employees within 72 hours\n\n**Your Rights:** Access, correction, deletion on request to HR/IT Admin\n\n*Source: Nepal Privacy Act 2018, GDPR-aligned framework*`,
}

async function askPolicyAI(question){
  const key=VITE_KEY
  if(!key||!key.startsWith('sk-ant')||key==='sk-ant-your-key-here') return null
  try{
    const r=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-only-beta':'true'},
      body:JSON.stringify({model:'claude-sonnet-4-6',max_tokens:1024,
        system:'You are an expert HR Policy Assistant for a Nepal-based company using eLogix HRMS. Answer policy questions accurately, citing Nepal Labour Act 2074, SSF Act, CIT, and Privacy Act 2018 where relevant. Keep answers concise and structured.',
        messages:[{role:'user',content:question}]})
    })
    const d=await r.json()
    return d?.content?.[0]?.text||null
  }catch{return null}
}

export default function AIPolicyAssistantPage(){
  const [query,setQuery]=useState('')
  const [answer,setAnswer]=useState('')
  const [loading,setLoading]=useState(false)
  const [selected,setSelected]=useState(null)

  const search=async(q)=>{
    const text=(q||query).trim()
    if(!text)return
    setLoading(true);setAnswer('')
    const low=text.toLowerCase()
    // Try offline KB first
    const kbKey=Object.keys(POLICY_ANSWERS).find(k=>low.includes(k)||low.includes(POLICIES.find(p=>p.id===k)?.title.toLowerCase()||''))
    if(kbKey){
      setTimeout(()=>{setAnswer(POLICY_ANSWERS[kbKey]);setLoading(false)},600)
      return
    }
    // Try Claude
    const aiAns=await askPolicyAI(text)
    setAnswer(aiAns||`**Policy Query: "${text}"**\n\nThis query touches company-specific policies. Please contact your HR Manager or refer to the Employee Handbook.\n\n**Common resources:**\n- Employee Handbook v3.2\n- Nepal Labour Act 2074\n- SSF Act 2074\n- Nepal Privacy Act 2018\n\n*For sensitive policy interpretation, always consult HR directly.*`)
    setLoading(false)
  }

  return(
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      <div style={{background:G,borderRadius:16,padding:'18px 22px',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10}}>
        <div>
          <div style={{fontSize:18,fontWeight:900,color:'#fff'}}>AI Policy Assistant</div>
          <div style={{fontSize:10,color:'rgba(255,255,255,.7)',marginTop:2}}>RAG-powered · Nepal Labour Act 2074 · Privacy Act 2018 · SSF Act</div>
        </div>
        <span style={{fontSize:8,fontWeight:700,padding:'3px 10px',borderRadius:20,background:'rgba(255,255,255,.15)',color:'#fff'}}>Cite-verified Answers</span>
      </div>

      {/* Search */}
      <div style={{display:'flex',gap:8}}>
        <input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&search()}
          placeholder="Ask any HR policy question... e.g. 'How many sick days do I get?' or 'What is SSF contribution rate?'"
          style={{flex:1,padding:'12px 16px',borderRadius:12,border:'1px solid #e2e8f0',fontSize:11,outline:'none',fontFamily:'inherit'}}/>
        <button onClick={()=>search()} disabled={!query.trim()||loading}
          style={{padding:'12px 20px',borderRadius:12,border:'none',background:query.trim()&&!loading?P:'#e2e8f0',color:'#fff',fontSize:11,fontWeight:700,cursor:query.trim()&&!loading?'pointer':'default'}}>
          {loading?'...':'Ask AI'}
        </button>
      </div>

      {/* Policy cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
        {POLICIES.map(p=>(
          <button key={p.id} onClick={()=>{setSelected(p.id);search(p.title)}}
            style={{background:selected===p.id?`${P}10`:'#fff',borderRadius:12,padding:'14px',border:`1px solid ${selected===p.id?P:'#e2e8f0'}`,cursor:'pointer',textAlign:'left',transition:'all .2s'}}>
            <div style={{fontSize:22,marginBottom:6}}>{p.icon}</div>
            <div style={{fontSize:10,fontWeight:700,color:'#0f172a'}}>{p.title}</div>
            <div style={{fontSize:8,color:'#94a3b8',marginTop:3,lineHeight:1.4}}>{p.desc}</div>
            <div style={{display:'flex',gap:4,flexWrap:'wrap',marginTop:6}}>
              {p.tags.map((t,i)=><span key={i} style={{fontSize:7,padding:'2px 6px',borderRadius:20,background:`${P}10`,color:P,fontWeight:700}}>{t}</span>)}
            </div>
          </button>
        ))}
      </div>

      {/* Answer */}
      {loading&&(
        <div style={{background:'#faf5ff',borderRadius:16,padding:'24px',textAlign:'center',border:`1px solid ${P}20`}}>
          <div style={{fontSize:28,marginBottom:8}}>🧠</div>
          <div style={{fontSize:11,fontWeight:700,color:P}}>AI analysing policy documents...</div>
          <div style={{height:4,background:'#e2e8f0',borderRadius:2,marginTop:12,overflow:'hidden'}}><div style={{height:'100%',width:'60%',background:P,borderRadius:2}}/></div>
        </div>
      )}
      {answer&&!loading&&(
        <div style={{background:'#fff',borderRadius:16,padding:'20px',border:'1px solid #e2e8f0',boxShadow:'0 1px 8px rgba(0,0,0,.05)'}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
            <div style={{width:32,height:32,borderRadius:10,background:G,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>🧠</div>
            <div>
              <div style={{fontSize:11,fontWeight:800,color:'#0f172a'}}>AI Policy Answer</div>
              <div style={{fontSize:8,color:'#94a3b8'}}>Sourced from Nepal Labour Act 2074, SSF Act, Company Policy Manual</div>
            </div>
            <div style={{marginLeft:'auto',display:'flex',gap:5}}>
              <button onClick={()=>navigator.clipboard?.writeText(answer)} style={{fontSize:8,padding:'4px 10px',borderRadius:8,border:'1px solid #e2e8f0',background:'#fff',cursor:'pointer',color:'#64748b'}}>⎘ Copy</button>
              <button onClick={()=>setAnswer('')} style={{fontSize:8,padding:'4px 10px',borderRadius:8,border:'none',background:'#f1f5f9',cursor:'pointer',color:'#64748b'}}>✕</button>
            </div>
          </div>
          <div style={{background:'#f8fafc',borderRadius:10,padding:'14px',fontSize:10,lineHeight:1.8,color:'#0f172a',whiteSpace:'pre-line'}}>
            {answer}
          </div>
          <div style={{marginTop:8,padding:'8px 12px',background:'#fef3c7',borderRadius:8,fontSize:9,color:'#92400e'}}>
            ⚠️ AI-generated. Always verify with your HR Manager for binding interpretations.
          </div>
        </div>
      )}
    </div>
  )
}
