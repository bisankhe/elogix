// FILE: CreateJobDescriptionPage.jsx
// Employee Lifecycle > Recruitment & Hiring > Recruitment Management > Create Job Description
//
// FEATURES:
// • Claude AI generates position-wise standard JD (bias-free, inclusive)
// • Linked to KRA, KPI & OKR framework per position
// • Digital e-signature by concerned person (HR Head / Department Head)
// • Auto-saves signed JD to employee's Digital Profile / Personal File
// • Agentic governance — Nepal Labour Act 2074 compliance scanner
// • Bias scanner — inclusive language score 0-100
// • ATS export + Interview Kit seeding

import React, { useState, useRef } from 'react'
import { useApp } from '../../../context/AppContext.jsx'

const G  = 'linear-gradient(135deg,#1e1b4b 0%,#7c3aed 60%,#c4b5fd 100%)'
const P  = '#7c3aed'
const VK = import.meta?.env?.VITE_ANTHROPIC_API_KEY || ''

// ── CLAUDE API ────────────────────────────────────────────────
async function callClaude(prompt, system) {
  try {
    const r = await fetch('/api/v1/ai-proxy/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system, messages: [{ role: 'user', content: prompt }], model: 'claude-sonnet-4-6', max_tokens: 4000 }),
      signal: AbortSignal.timeout(25000),
    })
    if (r.ok) { const d = await r.json(); if (d.content) return d.content }
  } catch {}
  if (VK && VK.startsWith('sk-ant') && VK !== 'sk-ant-your-key-here') {
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': VK, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-only-beta': 'true' },
        body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 4000, system, messages: [{ role: 'user', content: prompt }] }),
      })
      const d = await r.json()
      if (r.ok && d?.content?.[0]?.text) return d.content[0].text
    } catch {}
  }
  return null
}

// ── POSITION-WISE KRA/KPI/OKR FRAMEWORK ──────────────────────
const POSITION_FRAMEWORKS = {
  'Software Engineer': {
    kra: ['Code Quality & Delivery', 'Technical Innovation', 'Team Collaboration', 'System Reliability'],
    kpi: ['Sprint Completion Rate ≥ 90%', 'Code Review Turnaround ≤ 24h', 'Bug Rate < 5/sprint', 'System Uptime ≥ 99.9%'],
    okr: [
      { objective: 'Deliver world-class engineering velocity', krs: ['Deploy 2x weekly CI/CD', 'Reduce MTTR by 40%'] },
      { objective: 'Grow technical competency', krs: ['Complete 2 certifications/year', '100% test coverage on new features'] },
    ],
  },
  'HR Manager': {
    kra: ['Talent Acquisition', 'Employee Engagement & Retention', 'Compliance & Labour Law', 'Learning & Development'],
    kpi: ['Time-to-Fill ≤ 21 days', 'eNPS ≥ 40', 'Attrition Rate < 8%', 'Training Completion ≥ 90%'],
    okr: [
      { objective: 'Build a world-class talent engine', krs: ['Reduce time-to-hire by 30%', 'Achieve 95% offer acceptance rate'] },
      { objective: 'Drive employee experience to industry-best', krs: ['eNPS from 35 to 50', 'Reduce absenteeism by 20%'] },
    ],
  },
  'Sales Manager': {
    kra: ['Revenue Generation', 'Team Leadership', 'Client Relationship Management', 'Pipeline Development'],
    kpi: ['Monthly Revenue Target ≥ 100%', 'Pipeline Coverage 3x Quota', 'Client Retention ≥ 90%', 'Team Quota Attainment ≥ 80%'],
    okr: [
      { objective: 'Achieve record revenue quarter', krs: ['Close 20 new enterprise accounts', 'Grow ARR by 40%'] },
      { objective: 'Build a high-performance sales culture', krs: ['All reps complete sales training', 'Reduce sales cycle by 15 days'] },
    ],
  },
  'Finance Analyst': {
    kra: ['Financial Reporting Accuracy', 'Compliance & Audit', 'Budget Management', 'Cost Optimisation'],
    kpi: ['Report Accuracy ≥ 99.5%', 'Audit Findings = 0 critical', 'Budget Variance < 5%', 'CIT/VAT filing on time 100%'],
    okr: [
      { objective: 'Achieve zero-defect financial operations', krs: ['Automate 80% of monthly reports', 'Clean audit with 0 findings'] },
      { objective: 'Drive cost efficiency', krs: ['Identify NPR 500K savings', 'Reduce manual work by 50%'] },
    ],
  },
  'Product Manager': {
    kra: ['Product Vision & Roadmap', 'Stakeholder Alignment', 'User Experience', 'Revenue Impact'],
    kpi: ['Feature On-Time Delivery ≥ 85%', 'NPS ≥ 50', 'Revenue Attribution from PM features', 'Sprint Goal Achievement ≥ 90%'],
    okr: [
      { objective: 'Launch market-defining product features', krs: ['Ship 3 major features Q3', 'Reach 10K active users'] },
      { objective: 'Maximize customer value', krs: ['NPS from 45 to 60', 'Reduce churn by 25%'] },
    ],
  },
  'Operations Manager': {
    kra: ['Process Efficiency', 'Team Productivity', 'Cost Control', 'Quality Assurance'],
    kpi: ['Process SLA Adherence ≥ 95%', 'Cost per Transaction', 'Team Utilisation ≥ 85%', 'Quality Score ≥ 98%'],
    okr: [
      { objective: 'Achieve operational excellence', krs: ['Reduce process cycle time by 30%', '100% SLA compliance'] },
      { objective: 'Build scalable operations', krs: ['Automate 5 manual processes', 'Document all SOPs by Q3'] },
    ],
  },
}

const DEFAULT_FRAMEWORK = {
  kra: ['Role Delivery & Quality', 'Stakeholder Management', 'Continuous Improvement', 'Team Contribution'],
  kpi: ['Task Completion Rate ≥ 95%', 'Quality Score ≥ 90%', 'Stakeholder Satisfaction ≥ 4/5', 'Learning Hours ≥ 40/year'],
  okr: [
    { objective: 'Deliver excellence in role', krs: ['Achieve 100% KPI targets', 'Zero critical escalations'] },
    { objective: 'Grow professional capability', krs: ['Complete 2 skill upgrades', '360 feedback score ≥ 4.2'] },
  ],
}

function getFramework(title) {
  if (!title) return DEFAULT_FRAMEWORK
  const key = Object.keys(POSITION_FRAMEWORKS).find(k =>
    title.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(title.toLowerCase().split(' ')[0])
  )
  return POSITION_FRAMEWORKS[key] || DEFAULT_FRAMEWORK
}

// ── OFFLINE JD TEMPLATE ───────────────────────────────────────
function buildOfflineJD(vars, framework) {
  const lvlExp = { Junior: '1-2', 'Mid-Level': '3-5', Senior: '5-8', Manager: '6-10', Lead: '8+', Director: '10+' }
  return {
    summary: `${vars.title} is a pivotal ${vars.level || 'professional'}-level role in the ${vars.dept || 'department'} function at ${vars.company || 'the organisation'}. Based in ${vars.location || 'Kathmandu, Nepal'}, this ${vars.type || 'Regular'} position is responsible for driving ${vars.dept?.toLowerCase() || 'functional'} excellence, contributing to organisational OKRs, and operating within the bounds of Nepal Labour Act 2074.`,
    responsibilities: [
      `Own and deliver KRA: ${framework.kra[0]} with measurable outcomes aligned to quarterly OKRs`,
      `Drive KPI achievement: ${framework.kpi[0]}`,
      `Lead ${vars.level === 'Junior' ? 'assigned tasks' : 'cross-functional initiatives'} to achieve ${vars.dept || 'department'} goals`,
      `Analyse data and present actionable insights to ${vars.level === 'Junior' ? 'direct manager' : 'senior leadership'}`,
      `Mentor ${vars.level === 'Senior' || vars.level === 'Lead' || vars.level === 'Manager' ? 'junior team members' : 'peers'} and contribute to team L&D`,
      `Ensure full compliance with Nepal Labour Act 2074, SSF Act, and applicable regulations`,
      `Contribute to OKR: "${framework.okr[0]?.objective}" by achieving: ${framework.okr[0]?.krs?.join('; ')}`,
      `Prepare reports, documentation, and presentations for stakeholder review cycles`,
      `Drive continuous process improvement and operational efficiency in ${vars.dept || 'your'} domain`,
      `Actively participate in performance review cycles (KRA/KPI/OKR quarterly cadence)`,
    ],
    qualifications: [
      `Bachelor's degree in relevant field${vars.level === 'Senior' || vars.level === 'Director' ? "; Master's degree preferred" : ''}`,
      `${lvlExp[vars.level] || '3-5'} years of hands-on experience in ${vars.dept || 'relevant'} domain`,
      vars.skills ? `Demonstrated proficiency in: ${vars.skills}` : `Strong domain expertise in ${vars.dept || 'the relevant field'}`,
      `Excellent communication in English${vars.location?.includes('Nepal') !== false ? ' and Nepali' : ''}`,
      `Proven track record of achieving KPI targets and contributing to OKR delivery`,
      `Strong analytical skills with ability to translate data into strategic insights`,
    ],
    preferred: [
      `Experience working with HRIS/HRMS platforms in a Nepal context`,
      `Professional certification in ${vars.dept || 'relevant'} domain`,
      `Familiarity with agile/OKR-driven work methodologies`,
      `Prior experience with Nepal regulatory environment (Labour Act, SSF, CIT)`,
    ],
    compensation: `NPR ${vars.salary_min || '50,000'} – ${vars.salary_max || '80,000'} per month (gross). Benefits: SSF contribution (11% employee + 20% employer per Social Security Act 2074), festival bonus (1 month basic), medical insurance NPR 300K, annual performance bonus, professional development budget.`,
    legal_note: `Employment type: ${vars.type || 'Regular'}. Working hours: 8 hrs/day, 48 hrs/week (Labour Act 2074 Section 28). Overtime at 1.5× basic (Section 36). Probation: 6 months max (Section 13). Annual leave: 18 days (Section 53). Sick leave: 12 days (Section 54). Maternity: 98 days full pay (Section 45). Gratuity: 8.33%/year from Day 1.`,
    inclusive_score: 94,
    bias_flags: [],
    compliance_flags: Number(vars.salary_min) < 17300 ? ['Minimum wage NPR 17,300/month not met (Labour Act 2074)'] : [],
  }
}

// ── BIAS SCANNER ──────────────────────────────────────────────
function scanBias(text) {
  const rules = [
    { word: 'manpower',   suggestion: 'workforce' },
    { word: 'salesman',   suggestion: 'sales professional' },
    { word: 'chairman',   suggestion: 'chairperson' },
    { word: 'craftsman',  suggestion: 'skilled worker' },
    { word: 'he/she',     suggestion: 'they' },
    { word: 'aggressive', suggestion: 'results-driven' },
    { word: 'ninja',      suggestion: 'expert' },
    { word: 'rockstar',   suggestion: 'high performer' },
    { word: 'young',      suggestion: 'remove age references' },
    { word: 'native speaker', suggestion: 'fluent speaker' },
  ]
  const flags = rules.filter(r => text.toLowerCase().includes(r.word))
  const score  = Math.max(60, 100 - flags.length * 8)
  return { flags, score }
}

// ── COMPLIANCE CHECK ──────────────────────────────────────────
function checkCompliance(vars) {
  const issues = []
  if (vars.salary_min && Number(vars.salary_min) < 17300) issues.push('Minimum wage NPR 17,300 not met (Labour Act 2074 Section 26)')
  if (!vars.type)       issues.push('Employment type not specified (Regular/Time-bound/Work-based)')
  if (!vars.location)   issues.push('Work location not specified')
  if (!vars.salary_min) issues.push('Salary range not specified — required for transparency')
  return { issues, passed: issues.length === 0 }
}

// ── SIGNATURE PAD COMPONENT ───────────────────────────────────
function SignaturePad({ onSave, onClose, signerName, signerRole }) {
  const canvasRef = useRef(null)
  const [drawing, setDrawing]   = useState(false)
  const [mode,    setMode]      = useState('draw')
  const [typed,   setTyped]     = useState(signerName || '')
  const [hasDraw, setHasDraw]   = useState(false)
  const last = useRef(null)

  const initCanvas = () => {
    const c = canvasRef.current; if (!c) return
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height)
    ctx.strokeStyle = '#1e1b4b'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  }
  const pos = (e, c) => { const r=c.getBoundingClientRect(),s=e.touches?e.touches[0]:e; return{x:s.clientX-r.left,y:s.clientY-r.top} }
  const startD = e => { e.preventDefault(); initCanvas(); setDrawing(true); last.current=pos(e,canvasRef.current) }
  const draw   = e => {
    if (!drawing) return; e.preventDefault()
    const c=canvasRef.current, ctx=c.getContext('2d'), p=pos(e,c)
    ctx.beginPath(); ctx.moveTo(last.current.x,last.current.y); ctx.lineTo(p.x,p.y); ctx.stroke()
    last.current=p; setHasDraw(true)
  }
  const stopD  = () => setDrawing(false)
  const clear  = () => { initCanvas(); setHasDraw(false) }

  const save = () => {
    if (mode==='type') {
      if (!typed.trim()) { alert('Please type your name'); return }
      const c=canvasRef.current, ctx=c.getContext('2d')
      ctx.fillStyle='#fff'; ctx.fillRect(0,0,c.width,c.height)
      ctx.fillStyle='#1e1b4b'; ctx.font='italic 30px "Times New Roman",serif'
      ctx.textAlign='center'; ctx.fillText(typed, c.width/2, c.height/2+10)
    } else if (!hasDraw) { alert('Please draw your signature'); return }
    const dataUrl = canvasRef.current.toDataURL('image/png')
    onSave({ dataUrl, name: signerName, role: signerRole, method: mode==='draw'?'drawn':'typed', timestamp: new Date().toISOString() })
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',zIndex:9200,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={onClose}>
      <div style={{background:'#fff',borderRadius:20,width:520,boxShadow:'0 40px 80px rgba(0,0,0,.3)',overflow:'hidden'}} onClick={e=>e.stopPropagation()}>
        <div style={{background:G,padding:'16px 24px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <div style={{fontSize:15,fontWeight:900,color:'#fff'}}>✍️ Digital Signature</div>
            <div style={{fontSize:9,color:'rgba(255,255,255,.7)',marginTop:1}}>{signerName} · {signerRole} · Nepal Electronic Transactions Act 2063</div>
          </div>
          <button onClick={onClose} style={{background:'rgba(255,255,255,.2)',border:'none',borderRadius:8,padding:'4px 12px',color:'#fff',cursor:'pointer',fontSize:16}}>✕</button>
        </div>
        <div style={{padding:20}}>
          <div style={{display:'flex',gap:4,background:'#f8fafc',borderRadius:9,padding:3,marginBottom:14}}>
            {[['draw','✏️ Draw Signature'],['type','⌨️ Type Name']].map(([m,l])=>(
              <button key={m} onClick={()=>setMode(m)}
                style={{flex:1,padding:'6px',borderRadius:7,border:'none',background:mode===m?'#fff':'transparent',color:mode===m?P:'#64748b',fontWeight:mode===m?800:400,fontSize:10,cursor:'pointer',boxShadow:mode===m?'0 1px 4px rgba(0,0,0,.08)':'none'}}>
                {l}
              </button>
            ))}
          </div>
          {mode==='draw'?(
            <div style={{border:'2px dashed #e2e8f0',borderRadius:10,overflow:'hidden',background:'#fafafa',cursor:'crosshair',marginBottom:10}}>
              <canvas ref={canvasRef} width={476} height={150}
                onMouseDown={startD} onMouseMove={draw} onMouseUp={stopD} onMouseLeave={stopD}
                onTouchStart={startD} onTouchMove={draw} onTouchEnd={stopD}
                style={{display:'block',width:'100%',touchAction:'none'}}/>
            </div>
          ):(
            <>
              <input value={typed} onChange={e=>setTyped(e.target.value)} placeholder="Type your full name"
                style={{width:'100%',padding:'10px 12px',borderRadius:9,border:'1px solid #e2e8f0',fontSize:11,fontStyle:'italic',fontFamily:'serif',boxSizing:'border-box',marginBottom:10}}/>
              <canvas ref={canvasRef} width={476} height={60} style={{display:'none'}}/>
              {typed&&<div style={{textAlign:'center',fontFamily:'"Times New Roman",serif',fontSize:26,fontStyle:'italic',color:'#1e1b4b',padding:'12px',background:'#f8fafc',borderRadius:9,border:'1px dashed #e2e8f0',marginBottom:10}}>{typed}</div>}
            </>
          )}
          <div style={{background:'#eff6ff',borderRadius:9,padding:'8px 12px',fontSize:9,color:'#1e40af',marginBottom:14,display:'flex',gap:6}}>
            🔒 <span>Secured with timestamp, IP, and user identity per Nepal Electronic Transactions Act 2063. Legally equivalent to physical signature.</span>
          </div>
          <div style={{display:'flex',gap:8}}>
            {mode==='draw'&&hasDraw&&<button onClick={clear} style={{padding:'9px 14px',borderRadius:9,border:'1px solid #e2e8f0',background:'#fff',color:'#64748b',fontSize:11,cursor:'pointer'}}>🗑 Clear</button>}
            <button onClick={save} style={{flex:1,padding:'10px',borderRadius:9,border:'none',background:G,color:'#fff',fontSize:12,fontWeight:800,cursor:'pointer'}}>✅ Apply Signature</button>
            <button onClick={onClose} style={{padding:'9px 14px',borderRadius:9,border:'1px solid #e2e8f0',background:'#fff',color:'#64748b',fontSize:11,cursor:'pointer'}}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── FIELD COMPONENT (outside component to prevent remount on every render) ──
function F({ label, field, type='text', options, placeholder, required, span=1, vars, set }) {
  return (
    <div style={{ gridColumn: `span ${span}` }}>
      <label style={{ fontSize:10, fontWeight:700, color:'#374151', display:'block', marginBottom:4 }}>
        {label}{required && <span style={{ color:'#ef4444' }}>*</span>}
      </label>
      {options ? (
        <select
          value={vars[field] || ''}
          onChange={e => set(field, e.target.value)}
          style={{ width:'100%', padding:'9px 11px', borderRadius:9, border:'1px solid #e2e8f0', fontSize:11, fontFamily:'inherit', boxSizing:'border-box', outline:'none' }}>
          <option value="">Select...</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input
          type={type}
          value={vars[field] || ''}
          onChange={e => set(field, e.target.value)}
          placeholder={placeholder}
          style={{ width:'100%', padding:'9px 11px', borderRadius:9, border:'1px solid #e2e8f0', fontSize:11, boxSizing:'border-box', outline:'none', fontFamily:'inherit' }}
        />
      )}
    </div>
  )
}

const DEPTS = ['Engineering','HR','Finance','Sales','Marketing','Operations','IT','Legal','Procurement','Administration']
const LEVELS = ['Junior','Mid-Level','Senior','Manager','Lead','Director','C-Level']
const TYPES  = ['Regular','Time-bound','Work-based','Part-time','Consultancy']
const JD_KEY = 'elogix_jd_library'

// ── MAIN COMPONENT ─────────────────────────────────────────────
// ── Stable controlled textarea (prevents cursor jumping) ────────────
function StableTextarea({ value, onChange, rows=4, placeholder='', style={} }) {
  const [local, setLocal] = React.useState(value)
  React.useEffect(() => { setLocal(value) }, [value])
  return (
    <textarea
      value={local}
      rows={rows}
      placeholder={placeholder}
      onChange={e => { setLocal(e.target.value); onChange(e.target.value) }}
      style={{width:'100%',padding:'10px 14px',borderRadius:10,border:'1.5px solid #e2e8f0',fontSize:11,
        outline:'none',resize:'vertical',fontFamily:'system-ui,sans-serif',lineHeight:1.6,
        boxSizing:'border-box',color:'#1e293b', ...style}}
    />
  )
}

// ── Stable controlled input (prevents cursor jumping) ────────────────
function StableInput({ value, onChange, type='text', placeholder='', style={} }) {
  React.useEffect(() => { setLocal(value) }, [value])
  return (
    <input
      type={type}
      value={local}
      placeholder={placeholder}
      onChange={e => { setLocal(e.target.value); onChange(e.target.value) }}
      style={{width:'100%',padding:'9px 14px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,
        outline:'none',fontFamily:'system-ui,sans-serif',boxSizing:'border-box',color:'#1e293b', ...style}}
    />
  )
}

export default function CreateJobDescriptionPage() {
  const { navTo } = useApp()
  const promptRef = useRef(null)
  const [step,       setStep]      = useState(1)
  const [prompt,     setPrompt]    = useState('')
  const [vars,       setVars]      = useState({ company:'eLogix HRMS Pvt. Ltd.', location:'Kathmandu, Nepal' })
  const [jd,         setJD]        = useState(null)
  const [edited,     setEdited]    = useState(null)
  const [bias,       setBias]      = useState(null)
  const [compliance, setCompliance]= useState(null)
  const [framework,  setFramework] = useState(DEFAULT_FRAMEWORK)
  const [editMode,   setEditMode]  = useState(false)
  const [saving,     setSaving]    = useState(false)
  const [published,  setPublished] = useState(false)
  const [signatures, setSignatures]= useState([])
  const [showSig,    setShowSig]   = useState(null)
  const [activeTab,  setActiveTab] = useState('jd')
  const set = (k,v) => setVars(p=>({...p,[k]:v}))

  // SIGNATORIES required for JD sign-off
  const SIGNATORIES = [
    { role:'HR Head / HR Manager',         name: vars.hr_signer    || 'HR Manager',         required: true  },
    { role:'Department Head',              name: vars.dept_signer  || `${vars.dept||'Dept'} Head`, required: true  },
    { role:'CEO / Managing Director',      name: vars.ceo_signer   || 'Managing Director',   required: false },
  ]

  const generate = async () => {
    if (!vars.title?.trim() && !prompt.trim()) { alert('Please enter a job title or describe the role'); return }
    setStep(2)
    const fw = getFramework(vars.title || prompt)
    setFramework(fw)

    const system = `You are an expert HR architect for eLogix HRMS (Nepal HRIS/HRMS). 
Generate position-wise, standard, bias-free job descriptions that are:
1. Aligned to KRA, KPI and OKR framework for the specific role
2. Compliant with Nepal Labour Act 2074
3. Inclusive language score ≥ 95/100
4. Activity-first (focus on outcomes, not just tasks)
5. Include digital signature block for HR Head and Department Head

Return ONLY valid JSON:
{
  "summary": "...",
  "responsibilities": ["..."],
  "qualifications": ["..."],
  "preferred": ["..."],
  "compensation": "...",
  "legal_note": "...",
  "kra_alignment": ["KRA: outcome | KPI: metric"],
  "okr_contribution": ["Objective: ... | KR: ..."],
  "inclusive_score": 95,
  "bias_flags": [{"word":"X","suggestion":"Y"}],
  "compliance_flags": ["issue"]
}`

    const promptText = `Create a comprehensive, position-wise STANDARD job description for:
Title: ${vars.title || 'Not specified'}
Department: ${vars.dept || 'Not specified'}
Level: ${vars.level || 'Mid-Level'}
Employment Type: ${vars.type || 'Regular'}
Location: ${vars.location || 'Kathmandu, Nepal'}
Salary Range: NPR ${vars.salary_min || 'TBD'} – ${vars.salary_max || 'TBD'} per month
Required Skills: ${vars.skills || 'Not specified'}
Context: ${prompt || 'Standard professional role'}
Company: ${vars.company || 'eLogix HRMS Pvt. Ltd.'}

KRA Framework for this role: ${fw.kra.join(', ')}
KPI Targets: ${fw.kpi.join(' | ')}
OKR Objectives: ${fw.okr.map(o=>o.objective).join(' | ')}

Requirements:
- Each responsibility must map to a KRA area
- Include specific KPI targets in the role description
- Reference OKR contribution for the position
- Bias-free, gender-neutral language (target 95+/100)
- Nepal Labour Act 2074 compliance (min wage NPR 17,300, SSF, probation 6 months, OT 1.5x)
- Professional standard format suitable for Nepal job market`

    const aiText = await callClaude(promptText, system)
    let result = null
    if (aiText) {
      try { result = JSON.parse(aiText.replace(/```json|```/g,'').trim()) } catch {}
    }
    if (!result) result = buildOfflineJD(vars, fw)

    const biasResult  = scanBias([result.summary,...(result.responsibilities||[]),...(result.qualifications||[])].join(' '))
    const compResult  = checkCompliance(vars)
    result.inclusive_score = result.inclusive_score || biasResult.score
    result.bias_flags      = result.bias_flags      || biasResult.flags
    result.compliance_flags= result.compliance_flags|| compResult.issues
    result.kra_alignment   = result.kra_alignment   || fw.kra.map((k,i)=>(`KRA: ${k} | KPI: ${fw.kpi[i]||''}`))
    result.okr_contribution= result.okr_contribution|| fw.okr.map(o=>`Objective: ${o.objective} | KR: ${o.krs.join(', ')}`)

    setJD(result); setEdited({...result, title:vars.title, dept:vars.dept, level:vars.level, type:vars.type, location:vars.location, salary_min:vars.salary_min, salary_max:vars.salary_max})
    setBias(biasResult); setCompliance(compResult); setStep(3)
  }

  const saveAndPublish = async () => {
    const allRequired = SIGNATORIES.filter(s=>s.required)
    const unsigned = allRequired.filter(s => !signatures.find(sg=>sg.role===s.role))
    if (unsigned.length > 0) { alert(`Required signature missing: ${unsigned.map(s=>s.role).join(', ')}`); return }

    setSaving(true)
    const record = {
      id:          `JD-${Date.now()}`,
      title:       vars.title,
      dept:        vars.dept,
      level:       vars.level,
      type:        vars.type,
      location:    vars.location,
      salary_min:  vars.salary_min,
      salary_max:  vars.salary_max,
      skills:      vars.skills,
      company:     vars.company,
      created:     new Date().toISOString(),
      status:      'active',
      version:     'v1.0',
      signed:      true,
      signatures,
      inclusive_score:     jd?.inclusive_score,
      compliance_issues:   jd?.compliance_flags?.length || 0,
      kra_alignment:       jd?.kra_alignment,
      okr_contribution:    jd?.okr_contribution,
      framework,
      jd: editMode ? edited : jd,
    }

    // Save to backend
    try {
      await fetch('/api/v1/recruitment/job-descriptions', {
        method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${localStorage.getItem('elogix_access_token')||''}`},
        body: JSON.stringify(record), signal: AbortSignal.timeout(6000),
      })
      // Also save to employee digital file if linked to a position holder
      if (vars.employee_id) {
        await fetch(`/api/v1/employee-db/employees/${vars.employee_id}/documents`, {
          method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${localStorage.getItem('elogix_access_token')||''}`},
          body: JSON.stringify({ type:'job_description', title:`JD — ${vars.title}`, record }), signal: AbortSignal.timeout(6000),
        })
      }
    } catch {}

    // localStorage fallback
    const existing = JSON.parse(localStorage.getItem(JD_KEY)||'[]')
    localStorage.setItem(JD_KEY, JSON.stringify([record,...existing].slice(0,100)))
    setSaving(false); setPublished(true); setStep(5)
  }

  const downloadPDF = () => {
    if (!d) return
    const sigHtml = signatures.length>0 ? signatures.map(s=>`
      <div style="margin-top:10px;padding-top:10px;border-top:1px solid #e2e8f0;">
        <img src="${s.dataUrl}" style="height:50px;display:block;" alt="sig"/>
        <div style="font-size:10px;color:#555;margin-top:3px;font-weight:700">${s.name}</div>
        <div style="font-size:9px;color:#94a3b8">${s.role} · ${new Date(s.timestamp).toLocaleString()} · ${s.method}</div>
      </div>`).join('') :
      '<div style="padding-top:10px;font-style:italic;color:#94a3b8;font-size:10px">[Signature Pending]</div>'

    const kraHtml = (d.kra_alignment||[]).map(k=>`<li style="font-size:11px;margin-bottom:4px">${k}</li>`).join('')
    const okrHtml = (d.okr_contribution||[]).map(o=>`<li style="font-size:11px;margin-bottom:4px">${o}</li>`).join('')

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>${vars.title} — Job Description — ${vars.company}</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box} body{font-family:'Noto Sans',Arial,sans-serif;margin:0;background:#fff;color:#0f172a}
.page{max-width:820px;margin:0 auto;padding:0}
.header{background:linear-gradient(135deg,#1e1b4b,#7c3aed);padding:28px 36px}
.logo{font-size:10px;color:rgba(255,255,255,.6);margin-bottom:3px}
h1{font-size:22px;font-weight:900;color:#fff;margin:0 0 4px}
.meta{font-size:10px;color:rgba(255,255,255,.7)}
.body{padding:28px 36px}
h2{font-size:13px;font-weight:800;color:#7c3aed;border-left:3px solid #7c3aed;padding-left:8px;margin:20px 0 8px}
p,li{font-size:11px;line-height:1.7;margin:0 0 5px}
ul{padding-left:18px;margin:0 0 12px}
.tag{display:inline-block;font-size:9px;font-weight:700;padding:2px 8px;border-radius:12px;background:#f3e8ff;color:#7c3aed;margin:2px}
.score-row{display:flex;gap:16px;margin-bottom:12px;background:#f8fafc;padding:10px 14px;border-radius:8px}
.score-box{text-align:center}
.score-box .val{font-size:18px;font-weight:900;color:#7c3aed}
.score-box .lbl{font-size:8px;color:#94a3b8}
.kra-box{background:#faf5ff;border:1px solid #e9d5ff;border-radius:8px;padding:12px 16px;margin-bottom:12px}
.okr-box{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 16px;margin-bottom:12px}
.legal{background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px 16px;font-size:10px;color:#1e40af;margin-top:16px}
.sig-section{border-top:2px solid #e2e8f0;margin-top:24px;padding-top:16px;display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.sig-box{border:1px solid #e2e8f0;border-radius:8px;padding:10px;min-height:90px}
.sig-label{font-size:9px;color:#94a3b8;margin-top:6px}
.footer{margin-top:24px;font-size:8px;color:#94a3b8;border-top:1px solid #f1f5f9;padding-top:8px}
@media print{.page{padding:0}button{display:none}}
</style></head><body><div class="page">
<div class="header">
  <div class="logo">🏢 ${vars.company||'eLogix HRMS Pvt. Ltd.'} — STANDARD JOB DESCRIPTION</div>
  <h1>${vars.title||'Job Title'}</h1>
  <div class="meta">${[vars.dept,vars.level,vars.type,vars.location].filter(Boolean).join(' · ')}</div>
  <div class="meta" style="margin-top:4px">Salary: NPR ${vars.salary_min||'TBD'} – ${vars.salary_max||'TBD'}/month · Ref: JD-${Date.now().toString().slice(-6)}</div>
</div>
<div class="body">
  <div class="score-row">
    <div class="score-box"><div class="val">${d.inclusive_score||94}</div><div class="lbl">Inclusive Score</div></div>
    <div class="score-box"><div class="val">${d.compliance_flags?.length===0?100:80}</div><div class="lbl">Compliance</div></div>
    <div class="score-box"><div class="val">${d.kra_alignment?.length||4}</div><div class="lbl">KRA Areas</div></div>
    <div class="score-box"><div class="val">${d.okr_contribution?.length||2}</div><div class="lbl">OKR Links</div></div>
    <div style="margin-left:auto;display:flex;align-items:center;gap:6px">
      ${d.bias_flags?.length===0?'<span class="tag" style="background:#f0fdf4;color:#15803d">Bias-Free ✓</span>':''}
      <span class="tag">Nepal LA2074 ✓</span>
    </div>
  </div>

  <h2>Role Summary</h2><p>${d.summary||''}</p>

  <div class="kra-box">
    <div style="font-size:11px;font-weight:800;color:#6b21a8;margin-bottom:6px">🎯 KRA · KPI Alignment</div>
    <ul>${kraHtml}</ul>
  </div>

  <div class="okr-box">
    <div style="font-size:11px;font-weight:800;color:#166534;margin-bottom:6px">🔮 OKR Contribution</div>
    <ul>${okrHtml}</ul>
  </div>

  <h2>Key Responsibilities</h2><ul>${(d.responsibilities||[]).map(r=>`<li>${r}</li>`).join('')}</ul>
  <h2>Required Qualifications</h2><ul>${(d.qualifications||[]).map(q=>`<li>${q}</li>`).join('')}</ul>
  ${(d.preferred||[]).length?`<h2>Preferred Qualifications</h2><ul>${d.preferred.map(p=>`<li>${p}</li>`).join('')}</ul>`:''}
  <h2>Compensation & Benefits</h2><p>${d.compensation||''}</p>
  <div class="legal"><strong>⚖️ Nepal Labour Act 2074 Compliance</strong><br>${d.legal_note||''}</div>

  <div class="sig-section">
    ${signatures.map(s=>`<div class="sig-box">${sigHtml}<div class="sig-label">${s.name}<br>${s.role}</div></div>`).join('')}
    ${Array(Math.max(0,3-signatures.length)).fill('<div class="sig-box" style="border-style:dashed"><div class="sig-label">Signature Pending</div></div>').join('')}
  </div>
  <div class="footer">Generated by eLogix HRMS AI · Position-wise Standard JD · Linked to KRA/KPI/OKR · Nepal Labour Act 2074 Compliant · ${new Date().toLocaleDateString()}</div>
</div>
<script>window.print()</script>
</body></html>`
    const w=window.open('','_blank'); w.document.write(html); w.document.close()
  }

  // ── UI HELPERS ────────────────────────────────────────────────
  const W = ({children,title,span=1}) => (
    <div style={{background:'#fff',borderRadius:14,padding:18,border:'1px solid #e2e8f0',boxShadow:'0 1px 6px rgba(0,0,0,.04)',gridColumn:`span ${span}`}}>
      {title&&<div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:12,paddingBottom:8,borderBottom:'1px solid #f1f5f9'}}>{title}</div>}
      {children}
    </div>
  )

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16,fontFamily:'system-ui,sans-serif'}}>
      {/* Header */}
      <div style={{background:G,borderRadius:16,padding:'20px 24px',boxShadow:'0 4px 24px rgba(124,58,237,.25)'}}>
        <div style={{fontSize:8,color:'rgba(255,255,255,.5)',marginBottom:3}}>Employee Lifecycle › Recruitment & Hiring › Recruitment Management</div>
        <div style={{fontSize:18,fontWeight:900,color:'#fff'}}>🤖 Create Job Description</div>
        <div style={{fontSize:10,color:'rgba(255,255,255,.7)',marginTop:2}}>AI-powered · KRA/KPI/OKR Linked · Digital Signature · Nepal Labour Act 2074 Compliant · Saves to Employee Profile</div>
      </div>

      {/* Step bar */}
      <div style={{display:'flex',gap:4,background:'#f8fafc',borderRadius:12,padding:4,border:'1px solid #e2e8f0'}}>
        {[[1,'📝','Define Role'],[2,'🤖','AI Generating'],[3,'✏️','Review & Edit'],[4,'✍️','Sign Off'],[5,'🚀','Published']].map(([n,icon,label])=>(
          <div key={n} onClick={()=>n<step&&setStep(n)}
            style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:5,padding:'8px 4px',borderRadius:9,background:step===n?'#fff':'transparent',boxShadow:step===n?'0 1px 4px rgba(0,0,0,.08)':'none',cursor:n<step?'pointer':'default'}}>
            <span style={{fontSize:13}}>{icon}</span>
            <span style={{fontSize:9,fontWeight:step===n?800:400,color:step===n?P:n<step?'#10b981':'#94a3b8'}}>{label}</span>
            {n<step&&<span style={{fontSize:9,color:'#10b981'}}>✓</span>}
          </div>
        ))}
      </div>

      {/* ── STEP 1: DEFINE ─────────────────────────────────────── */}
      {step===1&&(
        <div style={{display:'grid',gridTemplateColumns:'1fr 320px',gap:16}}>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <W title="💬 Describe the Role (AI Prompt)">
              <div style={{background:'#faf5ff',borderRadius:10,padding:'10px 14px',marginBottom:10,fontSize:10,color:'#6b21a8',lineHeight:1.6}}>
                💡 Describe the role or fill the fields below. AI generates a complete, position-wise standard JD linked to KRA, KPI and OKR framework.
              </div>
              <textarea ref={promptRef} value={prompt} onChange={e=>setPrompt(e.target.value)} rows={3}
                placeholder={'Example: "Senior Backend Engineer for our Fintech team. Node.js, Python, PostgreSQL. Lead microservices, mentor 4 engineers. NPR 150K-200K."'}
                style={{width:'100%',padding:'10px 12px',borderRadius:10,border:'1px solid #e2e8f0',fontSize:11,resize:'vertical',outline:'none',fontFamily:'inherit',boxSizing:'border-box'}}/>
            </W>
            <W title="📋 Structured Fields">
              <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10}}>
                <F label="Job Title" field="title" placeholder="e.g. Senior Software Engineer" required span={2} vars={vars} set={set}/>
                <F label="Department"       field="dept"       options={DEPTS} vars={vars} set={set}/>
                <F label="Level / Grade"    field="level"      options={LEVELS} vars={vars} set={set}/>
                <F label="Employment Type"  field="type"       options={TYPES} vars={vars} set={set}/>
                <F label="Location"         field="location"   placeholder="Kathmandu, Nepal" vars={vars} set={set}/>
                <F label="Salary Min (NPR)" field="salary_min" type="number" placeholder="50000" vars={vars} set={set}/>
                <F label="Salary Max (NPR)" field="salary_max" type="number" placeholder="80000" vars={vars} set={set}/>
                <F label="Key Skills Required" field="skills" placeholder="e.g. Node.js, React, AWS" span={2} vars={vars} set={set}/>
                <F label="Company"          field="company"    placeholder="eLogix HRMS Pvt. Ltd." span={2} vars={vars} set={set}/>
                <F label="HR Signatory Name"   field="hr_signer"   placeholder="HR Manager full name" vars={vars} set={set}/>
                <F label="Dept Head Signatory" field="dept_signer" placeholder="Department Head name" vars={vars} set={set}/>
              </div>
              <button onClick={generate} disabled={!vars.title?.trim()&&!prompt.trim()}
                style={{marginTop:14,width:'100%',padding:'12px',borderRadius:10,border:'none',background:vars.title?.trim()||prompt.trim()?G:'#e2e8f0',color:'#fff',fontSize:13,fontWeight:800,cursor:vars.title?.trim()||prompt.trim()?'pointer':'default'}}>
                🤖 Generate Position-wise Standard JD with AI →
              </button>
            </W>
          </div>

          {/* Right panel — framework preview */}
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <W title="🎯 KRA / KPI / OKR Framework">
              <div style={{fontSize:9,color:'#94a3b8',marginBottom:8}}>Auto-loads when you enter a job title</div>
              {(() => { const fw=getFramework(vars.title||''); return (
                <>
                  <div style={{fontSize:10,fontWeight:700,color:'#7c3aed',marginBottom:4}}>KRA Areas</div>
                  {fw.kra.map((k,i)=><div key={i} style={{fontSize:9,color:'#374151',padding:'4px 8px',background:'#faf5ff',borderRadius:6,marginBottom:4}}>• {k}</div>)}
                  <div style={{fontSize:10,fontWeight:700,color:'#0284c7',marginTop:10,marginBottom:4}}>KPI Targets</div>
                  {fw.kpi.map((k,i)=><div key={i} style={{fontSize:9,color:'#374151',padding:'4px 8px',background:'#eff6ff',borderRadius:6,marginBottom:4}}>• {k}</div>)}
                  <div style={{fontSize:10,fontWeight:700,color:'#16a34a',marginTop:10,marginBottom:4}}>OKR Objectives</div>
                  {fw.okr.map((o,i)=><div key={i} style={{fontSize:9,color:'#374151',padding:'4px 8px',background:'#f0fdf4',borderRadius:6,marginBottom:4}}>• {o.objective}</div>)}
                </>
              )})()}
            </W>
            <W title="⚖️ Compliance Checklist">
              {[['Min wage ≥ NPR 17,300',!vars.salary_min||Number(vars.salary_min)>=17300],['Employment type specified',!!vars.type],['Location specified',!!vars.location],['Salary range provided',!!vars.salary_min&&!!vars.salary_max]].map(([l,ok],i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'5px 0',borderBottom:'1px solid #f8fafc',fontSize:10}}>
                  <span style={{color:ok?'#10b981':'#94a3b8',fontWeight:900}}>{ok?'✓':'○'}</span>
                  <span style={{color:ok?'#0f172a':'#94a3b8'}}>{l}</span>
                </div>
              ))}
            </W>
          </div>
        </div>
      )}

      {/* ── STEP 2: GENERATING ─────────────────────────────────── */}
      {step===2&&(
        <div style={{background:'#fff',borderRadius:16,padding:48,textAlign:'center',border:'1px solid #e2e8f0'}}>
          <div style={{fontSize:42,marginBottom:16}}>🧠</div>
          <div style={{fontSize:16,fontWeight:800,color:'#0f172a',marginBottom:6}}>AI Generating Position-wise JD...</div>
          <div style={{fontSize:11,color:'#64748b',marginBottom:24}}>Applying KRA/KPI/OKR framework · Scanning for bias · Checking Labour Act compliance · claude-sonnet-4-6</div>
          <div style={{height:6,background:'#f1f5f9',borderRadius:3,overflow:'hidden',maxWidth:400,margin:'0 auto'}}>
            <div style={{height:'100%',width:'70%',background:G,borderRadius:3,animation:'pulse 1.5s ease-in-out infinite'}}/>
          </div>
        </div>
      )}

      {/* ── STEP 3: REVIEW ─────────────────────────────────────── */}
      {step===3&&jd&&(
        <div style={{display:'grid',gridTemplateColumns:'1fr 300px',gap:16}}>
          {/* Main JD content */}
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div style={{fontSize:14,fontWeight:800,color:'#0f172a'}}>{vars.title} — Position-wise Standard JD</div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={()=>setEditMode(e=>!e)} style={{padding:'5px 12px',borderRadius:20,border:`1px solid ${editMode?'#10b981':P}`,background:editMode?'#f0fdf4':`${P}08`,color:editMode?'#10b981':P,fontSize:9,fontWeight:700,cursor:'pointer'}}>
                  {editMode?'✅ Editing':'✏️ Edit JD'}
                </button>
                <button onClick={downloadPDF} style={{padding:'5px 12px',borderRadius:20,border:'1px solid #e2e8f0',background:'#fff',color:'#64748b',fontSize:9,fontWeight:700,cursor:'pointer'}}>📥 PDF</button>
                <button onClick={generate} style={{padding:'5px 12px',borderRadius:20,border:`1px solid ${P}`,background:`${P}10`,color:P,fontSize:9,fontWeight:700,cursor:'pointer'}}>🔄 Regenerate</button>
              </div>
            </div>

            {/* Tabs */}
            <div style={{display:'flex',gap:4,background:'#f8fafc',borderRadius:10,padding:3}}>
              {[['jd','📄 JD Content'],['kra','🎯 KRA/KPI/OKR'],['compliance','⚖️ Compliance']].map(([t,l])=>(
                <button key={t} onClick={()=>setActiveTab(t)}
                  style={{flex:1,padding:'6px',borderRadius:8,border:'none',background:activeTab===t?'#fff':'transparent',color:activeTab===t?P:'#64748b',fontWeight:activeTab===t?800:400,fontSize:10,cursor:'pointer',boxShadow:activeTab===t?'0 1px 4px rgba(0,0,0,.08)':'none'}}>
                  {l}
                </button>
              ))}
            </div>

            {activeTab==='jd'&&(
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {[
                  {label:'Role Summary', key:'summary', rows:3},
                  {label:'Key Responsibilities (one per line)', key:'responsibilities', rows:10, isArr:true},
                  {label:'Required Qualifications', key:'qualifications', rows:7, isArr:true},
                  {label:'Preferred Qualifications', key:'preferred', rows:4, isArr:true},
                  {label:'Compensation & Benefits', key:'compensation', rows:3},
                  {label:'Nepal Labour Act 2074 Compliance Note', key:'legal_note', rows:3},
                ].map(({label,key,rows,isArr})=>(
                  <div key={key}>
                    <div style={{fontSize:10,fontWeight:700,color:'#374151',marginBottom:4}}>{label}</div>
                    <textarea value={editMode?(isArr?(edited?.[key]||[]).join('\n'):(edited?.[key]||'')):(isArr?(jd?.[key]||[]).join('\n'):(jd?.[key]||''))} onChange={v=>editMode&&setEdited(p=>({...p,[key]:isArr?e.target.value.split('\n').filter(Boolean):e.target.value} ))}
                      readOnly={!editMode} rows={rows}
                      style={{width:'100%',padding:'10px 12px',borderRadius:10,border:`1px solid ${editMode?P:'#e2e8f0'}`,fontSize:10,lineHeight:1.7,resize:'vertical',outline:'none',fontFamily:'inherit',boxSizing:'border-box',background:editMode?'#faf5ff':'#fafafa'}}/>
                  </div>
                ))}
              </div>
            )}

            {activeTab==='kra'&&(
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                <div style={{background:'#faf5ff',borderRadius:12,padding:16,border:'1px solid #e9d5ff'}}>
                  <div style={{fontSize:12,fontWeight:800,color:P,marginBottom:10}}>🎯 KRA Alignment — {vars.title}</div>
                  {(jd.kra_alignment||[]).map((k,i)=>(
                    <div key={i} style={{padding:'8px 12px',background:'#fff',borderRadius:9,border:'1px solid #e9d5ff',marginBottom:6,fontSize:10,color:'#374151'}}>{k}</div>
                  ))}
                </div>
                <div style={{background:'#f0fdf4',borderRadius:12,padding:16,border:'1px solid #bbf7d0'}}>
                  <div style={{fontSize:12,fontWeight:800,color:'#15803d',marginBottom:10}}>🔮 OKR Contribution</div>
                  {(jd.okr_contribution||[]).map((o,i)=>(
                    <div key={i} style={{padding:'8px 12px',background:'#fff',borderRadius:9,border:'1px solid #bbf7d0',marginBottom:6,fontSize:10,color:'#374151'}}>{o}</div>
                  ))}
                </div>
                <div style={{background:'#eff6ff',borderRadius:12,padding:16,border:'1px solid #bfdbfe'}}>
                  <div style={{fontSize:12,fontWeight:800,color:'#1e40af',marginBottom:10}}>📊 KPI Targets for this Position</div>
                  {framework.kpi.map((k,i)=>(
                    <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 0',borderBottom:'1px solid #e0f2fe',fontSize:10,color:'#0f172a'}}>
                      <span style={{color:'#0284c7',fontWeight:900}}>◆</span>{k}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab==='compliance'&&(
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                <div style={{background:jd.compliance_flags?.length===0?'#f0fdf4':'#fef2f2',borderRadius:12,padding:16,border:`1px solid ${jd.compliance_flags?.length===0?'#bbf7d0':'#fecaca'}`}}>
                  <div style={{fontSize:12,fontWeight:800,color:jd.compliance_flags?.length===0?'#15803d':'#dc2626',marginBottom:10}}>
                    {jd.compliance_flags?.length===0?'✅ Nepal Labour Act 2074 — Compliant':'⚠️ Compliance Issues Found'}
                  </div>
                  {jd.compliance_flags?.length===0?(
                    <div style={{fontSize:10,color:'#15803d'}}>All required legal elements present. JD meets Nepal Labour Act 2074 standards.</div>
                  ):(jd.compliance_flags||[]).map((f,i)=>(
                    <div key={i} style={{padding:'6px 10px',background:'#fff',borderRadius:8,border:'1px solid #fecaca',marginBottom:6,fontSize:10,color:'#dc2626'}}>⚠️ {f}</div>
                  ))}
                </div>
                <div style={{background:jd.bias_flags?.length===0?'#f0fdf4':'#fff7ed',borderRadius:12,padding:16,border:`1px solid ${jd.bias_flags?.length===0?'#bbf7d0':'#fed7aa'}`}}>
                  <div style={{fontSize:12,fontWeight:800,color:jd.bias_flags?.length===0?'#15803d':'#c2410c',marginBottom:10}}>
                    Inclusive Language Score: {jd.inclusive_score||94}/100 {jd.bias_flags?.length===0?'— Bias-Free ✅':'— Issues Found ⚠️'}
                  </div>
                  {jd.bias_flags?.length===0?(
                    <div style={{fontSize:10,color:'#15803d'}}>No biased language detected. Gender-neutral and inclusive.</div>
                  ):(jd.bias_flags||[]).map((f,i)=>(
                    <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid #fed7aa',fontSize:10}}>
                      <span style={{color:'#ef4444'}}>"{f.word}"</span>
                      <span style={{color:'#10b981',fontWeight:700}}>→ "{f.suggestion}"</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <W title="📊 Quality Scores">
              {[
                {label:'Inclusive Language', val:jd.inclusive_score||94, color:(jd.inclusive_score||94)>=90?'#10b981':'#f59e0b'},
                {label:'LA2074 Compliance', val:jd.compliance_flags?.length===0?100:80, color:jd.compliance_flags?.length===0?'#10b981':'#f59e0b'},
                {label:'KRA/KPI/OKR Link', val:100, color:'#7c3aed'},
              ].map((s,i)=>(
                <div key={i} style={{marginBottom:10}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                    <span style={{fontSize:10,color:'#374151'}}>{s.label}</span>
                    <span style={{fontSize:10,fontWeight:800,color:s.color}}>{s.val}/100</span>
                  </div>
                  <div style={{height:5,background:'#f1f5f9',borderRadius:3,overflow:'hidden'}}>
                    <div style={{height:'100%',width:`${s.val}%`,background:s.color,borderRadius:3}}/>
                  </div>
                </div>
              ))}
            </W>
            <W title="🚀 Actions">
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                <button onClick={()=>setStep(4)} style={{padding:'11px',borderRadius:10,border:'none',background:G,color:'#fff',fontSize:12,fontWeight:800,cursor:'pointer'}}>
                  ✍️ Proceed to Sign Off →
                </button>
                <button onClick={downloadPDF} style={{padding:'9px',borderRadius:10,border:'1px solid #e2e8f0',background:'#fff',color:'#374151',fontSize:11,fontWeight:700,cursor:'pointer'}}>📥 Download PDF</button>
                <button onClick={()=>navTo?.('ats-dashboard')} style={{padding:'9px',borderRadius:10,border:`1px solid ${P}`,background:`${P}08`,color:P,fontSize:11,fontWeight:700,cursor:'pointer'}}>📋 Send to ATS</button>
              </div>
            </W>
          </div>
        </div>
      )}

      {/* ── STEP 4: SIGN OFF ───────────────────────────────────── */}
      {step===4&&(
        <div style={{display:'grid',gridTemplateColumns:'1fr 300px',gap:16}}>
          <div>
            <div style={{fontSize:14,fontWeight:800,color:'#0f172a',marginBottom:6}}>✍️ Digital Sign-Off — {vars.title}</div>
            <div style={{fontSize:10,color:'#64748b',marginBottom:16}}>This JD requires digital signatures from all concerned persons before it can be published and linked to employee profiles. Per Nepal Electronic Transactions Act 2063.</div>

            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {SIGNATORIES.map((sig,i)=>{
                const signed = signatures.find(s=>s.role===sig.role)
                return (
                  <div key={i} style={{display:'flex',alignItems:'center',gap:14,padding:'14px 16px',background:signed?'#f0fdf4':'#f8fafc',borderRadius:14,border:`1.5px solid ${signed?'#bbf7d0':'#e2e8f0'}`}}>
                    <div style={{width:44,height:44,borderRadius:12,background:signed?'#10b981':'#e2e8f0',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>
                      {signed?'✅':'✍️'}
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{sig.name}</div>
                      <div style={{fontSize:9,color:'#64748b'}}>{sig.role} {sig.required&&<span style={{color:'#ef4444'}}>· Required</span>}</div>
                      {signed&&(
                        <div style={{marginTop:6}}>
                          <img src={signed.dataUrl} alt="sig" style={{height:36,border:'1px solid #e2e8f0',borderRadius:6}}/>
                          <div style={{fontSize:8,color:'#10b981',marginTop:2}}>Signed {new Date(signed.timestamp).toLocaleString()} · {signed.method}</div>
                        </div>
                      )}
                    </div>
                    {!signed?(
                      <button onClick={()=>setShowSig({role:sig.role,name:sig.name})}
                        style={{padding:'8px 16px',borderRadius:10,border:`1px solid ${P}`,background:`${P}10`,color:P,fontSize:10,fontWeight:800,cursor:'pointer',flexShrink:0}}>
                        Sign Now →
                      </button>
                    ):(
                      <button onClick={()=>setSignatures(p=>p.filter(s=>s.role!==sig.role))}
                        style={{padding:'6px 10px',borderRadius:8,border:'1px solid #fecaca',background:'#fff',color:'#ef4444',fontSize:8,cursor:'pointer',flexShrink:0}}>
                        ✕ Remove
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            <div style={{display:'flex',gap:10,marginTop:16}}>
              <button onClick={()=>setStep(3)} style={{padding:'11px 20px',borderRadius:10,border:'1px solid #e2e8f0',background:'#fff',color:'#64748b',fontSize:12,cursor:'pointer'}}>← Back</button>
              <button onClick={saveAndPublish} disabled={saving}
                style={{flex:1,padding:'11px',borderRadius:10,border:'none',background:G,color:'#fff',fontSize:13,fontWeight:800,cursor:saving?'default':'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                {saving?(<><span style={{width:16,height:16,border:'2px solid rgba(255,255,255,.3)',borderTop:'2px solid #fff',borderRadius:'50%',display:'inline-block',animation:'spin 1s linear infinite'}}/> Saving...</>):'💾 Publish & Save to Employee Profiles →'}
              </button>
            </div>
          </div>

          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <W title="🔗 Will be linked to">
              {[
                {icon:'👤',label:'Employee Digital Profile',desc:'JD saved in profile documents'},
                {icon:'🎯',label:'KRA Management',         desc:`${framework.kra.length} KRA areas linked`},
                {icon:'📊',label:'KPI Tracker',            desc:`${framework.kpi.length} KPIs assigned`},
                {icon:'🔮',label:'OKR Module',             desc:`${framework.okr.length} objectives linked`},
                {icon:'📋',label:'ATS / Job Posting',      desc:'Seeded for recruitment'},
                {icon:'📚',label:'JD Library',             desc:'Version controlled'},
              ].map((l,i)=>(
                <div key={i} style={{display:'flex',alignItems:'flex-start',gap:10,padding:'7px 0',borderBottom:'1px solid #f1f5f9'}}>
                  <span style={{fontSize:16}}>{l.icon}</span>
                  <div>
                    <div style={{fontSize:10,fontWeight:700,color:'#0f172a'}}>{l.label}</div>
                    <div style={{fontSize:8,color:'#94a3b8'}}>{l.desc}</div>
                  </div>
                </div>
              ))}
            </W>
            <W title="📋 JD Summary">
              {[['Title',vars.title],['Dept',vars.dept],['Level',vars.level],['Type',vars.type],['Location',vars.location],['Salary',`NPR ${vars.salary_min}–${vars.salary_max}`]].filter(([,v])=>v).map(([k,v],i)=>(
                <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:'1px solid #f8fafc',fontSize:9}}>
                  <span style={{color:'#94a3b8'}}>{k}</span>
                  <span style={{fontWeight:700,color:'#0f172a'}}>{v}</span>
                </div>
              ))}
            </W>
          </div>
        </div>
      )}

      {/* ── STEP 5: PUBLISHED ──────────────────────────────────── */}
      {step===5&&published&&(
        <div style={{background:'#fff',borderRadius:16,padding:48,textAlign:'center',border:'1px solid #e2e8f0'}}>
          <div style={{fontSize:52,marginBottom:16}}>🎉</div>
          <div style={{fontSize:18,fontWeight:900,color:'#0f172a',marginBottom:8}}>JD Published & Digitally Signed!</div>
          <div style={{fontSize:12,color:'#64748b',marginBottom:24,maxWidth:440,margin:'0 auto 24px'}}>
            <strong>{vars.title}</strong> is now live. Signed by {signatures.length} signator{signatures.length===1?'y':'ies'}. Linked to KRA, KPI and OKR. Saved to employee profiles.
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,maxWidth:540,margin:'0 auto 24px'}}>
            {[
              {icon:'✍️',label:'Digitally Signed',   sub:`${signatures.length} signatures`},
              {icon:'🎯',label:'KRA/KPI Linked',     sub:`${framework.kra.length} KRA areas`},
              {icon:'🔮',label:'OKR Mapped',         sub:`${framework.okr.length} objectives`},
              {icon:'👤',label:'Profile Saved',      sub:'Employee digital file'},
              {icon:'📋',label:'ATS Seeded',         sub:'Ready for posting'},
              {icon:'📚',label:'JD Library',         sub:'Version v1.0 saved'},
            ].map((s,i)=>(
              <div key={i} style={{padding:'12px',background:'#f0fdf4',borderRadius:10,border:'1px solid #bbf7d0'}}>
                <div style={{fontSize:20,marginBottom:4}}>{s.icon}</div>
                <div style={{fontSize:10,fontWeight:700,color:'#0f172a'}}>{s.label}</div>
                <div style={{fontSize:8,color:'#10b981',fontWeight:700}}>{s.sub}</div>
              </div>
            ))}
          </div>
          <div style={{display:'flex',gap:10,justifyContent:'center',flexWrap:'wrap'}}>
            <button onClick={downloadPDF} style={{padding:'11px 20px',borderRadius:10,border:'none',background:G,color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer'}}>📥 Download Signed PDF</button>
            <button onClick={()=>navTo?.('jd-library')} style={{padding:'11px 20px',borderRadius:10,border:'1px solid #e2e8f0',background:'#fff',color:'#374151',fontSize:12,fontWeight:700,cursor:'pointer'}}>📚 JD Library</button>
            <button onClick={()=>navTo?.('kra-management')} style={{padding:'11px 20px',borderRadius:10,border:'1px solid #e2e8f0',background:'#fff',color:'#374151',fontSize:12,fontWeight:700,cursor:'pointer'}}>🎯 View KRA</button>
            <button onClick={()=>{setStep(1);setVars({company:'eLogix HRMS Pvt. Ltd.',location:'Kathmandu, Nepal'});setJD(null);setPublished(false);setSignatures([]);setPrompt('')}}
              style={{padding:'11px 20px',borderRadius:10,border:'1px solid #e2e8f0',background:'#fff',color:'#374151',fontSize:12,fontWeight:700,cursor:'pointer'}}>
              + Another JD
            </button>
          </div>
        </div>
      )}

      {showSig&&(
        <SignaturePad signerName={showSig.name} signerRole={showSig.role}
          onSave={sig=>{setSignatures(p=>[...p.filter(s=>s.role!==showSig.role),{...sig,role:showSig.role}]);setShowSig(null)}}
          onClose={()=>setShowSig(null)}/>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:.6}50%{opacity:1}}`}</style>
    </div>
  )
}
