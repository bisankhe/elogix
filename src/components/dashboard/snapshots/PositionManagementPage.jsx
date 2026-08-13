// ============================================================
// FILE: src/components/dashboard/snapshots/DeptTeamSetupPage.jsx
// NOTE: This file replaces the old DeptTeamSetupPage.
//       It now covers ALL of Structure & Hierarchy:
//       1. Business Unit / Dept / Section / Team / Cost Center / Work Location
//       PLUS NEW:
//       2. Designation Setup
//       3. Grade & Level
//       4. Reporting Hierarchy & Org Chart
//       5. Position Management
// ============================================================

// ============================================================
// FILE: src/components/dashboard/snapshots/PositionManagementPage.jsx
// PURPOSE: Designation Setup, Grade & Level, Reporting
//          Hierarchy, Position Management — all 4 modules
//          AI-driven: JD generation, attrition risk,
//          org chart, span-of-control analysis
// ============================================================

import { useState } from 'react'
import { useApp } from '../../../context/AppContext.jsx'

// ── Mock Data ─────────────────────────────────────────────────
const JOB_FAMILIES = [
  { id:'jf-1', code:'IT',    name:'Information Technology', icon:'💻', color:'#3b82f6', desig_count:18, pos_count:24 },
  { id:'jf-2', code:'FIN',   name:'Finance & Accounts',     icon:'💰', color:'#10b981', desig_count:8,  pos_count:12 },
  { id:'jf-3', code:'HR',    name:'Human Resources',        icon:'👥', color:'#8b5cf6', desig_count:10, pos_count:14 },
  { id:'jf-4', code:'SALES', name:'Sales & Marketing',      icon:'📈', color:'#f59e0b', desig_count:7,  pos_count:10 },
  { id:'jf-5', code:'OPS',   name:'Operations',             icon:'⚙️', color:'#ef4444', desig_count:9,  pos_count:15 },
  { id:'jf-6', code:'EXEC',  name:'Executive',              icon:'🎯', color:'#0ea5e9', desig_count:4,  pos_count:5  },
]

const GRADE_LEVELS = [
  // IC Track
  { id:'g1',  code:'L1', name:'Level 1 — Junior',         level:1,  type:'individual', min:15000,  max:25000,  bonus:0,   leave:18, managerial:false, overtime_exempt:false, can_approve:false, can_hire:false, span:0   },
  { id:'g2',  code:'L2', name:'Level 2 — Associate',      level:2,  type:'individual', min:25000,  max:45000,  bonus:5,   leave:18, managerial:false, overtime_exempt:false, can_approve:false, can_hire:false, span:0   },
  { id:'g3',  code:'L3', name:'Level 3 — Senior',         level:3,  type:'individual', min:45000,  max:75000,  bonus:10,  leave:20, managerial:false, overtime_exempt:false, can_approve:false, can_hire:false, span:0   },
  { id:'g4',  code:'L4', name:'Level 4 — Lead',           level:4,  type:'individual', min:75000,  max:120000, bonus:15,  leave:20, managerial:false, overtime_exempt:true,  can_approve:false, can_hire:false, span:0   },
  { id:'g5',  code:'L5', name:'Level 5 — Principal',      level:5,  type:'individual', min:120000, max:200000, bonus:20,  leave:22, managerial:false, overtime_exempt:true,  can_approve:false, can_hire:false, span:0   },
  // Management Track
  { id:'g6',  code:'M1', name:'Manager L1',               level:6,  type:'management', min:80000,  max:150000, bonus:20,  leave:22, managerial:true,  overtime_exempt:true,  can_approve:true,  can_hire:false, span:8   },
  { id:'g7',  code:'M2', name:'Senior Manager',           level:7,  type:'management', min:150000, max:250000, bonus:25,  leave:22, managerial:true,  overtime_exempt:true,  can_approve:true,  can_hire:true,  span:12  },
  { id:'g8',  code:'M3', name:'Director',                 level:8,  type:'management', min:250000, max:450000, bonus:35,  leave:24, managerial:true,  overtime_exempt:true,  can_approve:true,  can_hire:true,  span:15  },
  // Executive Track
  { id:'g9',  code:'E1', name:'VP / Executive',           level:9,  type:'executive',  min:450000, max:800000, bonus:50,  leave:24, managerial:true,  overtime_exempt:true,  can_approve:true,  can_hire:true,  span:20  },
  { id:'g10', code:'E2', name:'C-Suite / CEO-1',          level:10, type:'executive',  min:800000, max:2000000,bonus:100, leave:24, managerial:true,  overtime_exempt:true,  can_approve:true,  can_hire:true,  span:30  },
]

const DESIGNATIONS = [
  { id:'d1',  job_code:'IT-SE-L3',  title:'Senior Software Engineer',     family:'IT',    grade:'L3', experience:3, skills:['React','Python','PostgreSQL'], ai_jd:true,  positions:4, managerial:false },
  { id:'d2',  job_code:'IT-TL-L4',  title:'Tech Lead',                   family:'IT',    grade:'L4', experience:5, skills:['Architecture','React','Leadership'], ai_jd:true, positions:2, managerial:false },
  { id:'d3',  job_code:'IT-EM-M1',  title:'Engineering Manager',          family:'IT',    grade:'M1', experience:7, skills:['Team Management','Agile','Budget'], ai_jd:true, positions:2, managerial:true },
  { id:'d4',  job_code:'HR-HRBP-M1',title:'HR Business Partner',         family:'HR',    grade:'M1', experience:5, skills:['HRBP','Labour Law','OD'], ai_jd:false, positions:3, managerial:true },
  { id:'d5',  job_code:'FIN-CA-L3', title:'Chartered Accountant',         family:'FIN',   grade:'L3', experience:3, skills:['ICAN','Tally','Tax'], ai_jd:false, positions:2, managerial:false },
  { id:'d6',  job_code:'IT-CTO-E1', title:'Chief Technology Officer',    family:'IT',    grade:'E1', experience:12,skills:['Strategy','Cloud','AI'], ai_jd:true, positions:1, managerial:true },
  { id:'d7',  job_code:'HR-DIR-M3', title:'HR Director',                  family:'HR',    grade:'M3', experience:10,skills:['HRM','Labour Law','Strategy'], ai_jd:true, positions:1, managerial:true },
  { id:'d8',  job_code:'OPS-PM-L4', title:'Project Manager',              family:'OPS',   grade:'L4', experience:5, skills:['PMP','Agile','Budget'], ai_jd:false, positions:3, managerial:false },
]

const POSITIONS = [
  { id:'p1',  code:'POS-IT-CTO-001',  title:'Chief Technology Officer',   grade:'E1',  family:'IT',    dept:'IT',   status:'filled',  fte:1.00, budget:900000,  incumbent:'Bikram Shrestha',  since:'2022-01-15', level:1, reports_to:null,          dotted_to:null,         attrition:'low',     risk_score:12, succession:true,  direct_reports:4 },
  { id:'p2',  code:'POS-HR-DIR-001',  title:'HR Director',                grade:'M3',  family:'HR',    dept:'HR',   status:'filled',  fte:1.00, budget:400000,  incumbent:'Sita Sharma',      since:'2021-06-01', level:1, reports_to:'CEO',          dotted_to:null,         attrition:'low',     risk_score:18, succession:true,  direct_reports:5 },
  { id:'p3',  code:'POS-IT-EM-001',   title:'Engineering Manager (FE)',   grade:'M1',  family:'IT',    dept:'IT',   status:'filled',  fte:1.00, budget:180000,  incumbent:'Roshan Thapa',     since:'2023-03-10', level:2, reports_to:'CTO',          dotted_to:null,         attrition:'medium',  risk_score:45, succession:false, direct_reports:8 },
  { id:'p4',  code:'POS-IT-EM-002',   title:'Engineering Manager (BE)',   grade:'M1',  family:'IT',    dept:'IT',   status:'filled',  fte:1.00, budget:180000,  incumbent:'Anita Karki',      since:'2022-09-15', level:2, reports_to:'CTO',          dotted_to:null,         attrition:'low',     risk_score:22, succession:true,  direct_reports:6 },
  { id:'p5',  code:'POS-HR-HRBP-001', title:'HR Business Partner — IT',  grade:'M1',  family:'HR',    dept:'HR',   status:'filled',  fte:1.00, budget:120000,  incumbent:'Priya Rai',        since:'2023-07-01', level:2, reports_to:'HR Director',  dotted_to:'CTO',        attrition:'high',    risk_score:72, succession:false, direct_reports:0 },
  { id:'p6',  code:'POS-IT-SE-001',   title:'Senior Software Engineer 1', grade:'L3',  family:'IT',    dept:'IT',   status:'filled',  fte:1.00, budget:70000,   incumbent:'Ram Bista',        since:'2023-01-20', level:3, reports_to:'Eng Mgr FE',   dotted_to:null,         attrition:'medium',  risk_score:55, succession:false, direct_reports:0 },
  { id:'p7',  code:'POS-IT-SE-002',   title:'Senior Software Engineer 2', grade:'L3',  family:'IT',    dept:'IT',   status:'vacant',  fte:1.00, budget:70000,   incumbent:null,               since:null,         level:3, reports_to:'Eng Mgr FE',   dotted_to:null,         attrition:'low',     risk_score:null, succession:false, direct_reports:0 },
  { id:'p8',  code:'POS-IT-SE-003',   title:'Senior Software Engineer 3', grade:'L3',  family:'IT',    dept:'IT',   status:'vacant',  fte:1.00, budget:70000,   incumbent:null,               since:null,         level:3, reports_to:'Eng Mgr FE',   dotted_to:null,         attrition:'low',     risk_score:null, succession:false, direct_reports:0 },
  { id:'p9',  code:'POS-FIN-CA-001',  title:'Chartered Accountant',       grade:'L3',  family:'FIN',   dept:'FIN',  status:'filled',  fte:1.00, budget:65000,   incumbent:'Hari KC',          since:'2021-04-01', level:2, reports_to:'CFO',          dotted_to:null,         attrition:'low',     risk_score:15, succession:false, direct_reports:0 },
  { id:'p10', code:'POS-OPS-PM-001',  title:'Project Manager',            grade:'L4',  family:'OPS',   dept:'OPS',  status:'filled',  fte:1.00, budget:100000,  incumbent:'Dev Poudel',       since:'2022-11-01', level:2, reports_to:'COO',          dotted_to:'CTO',        attrition:'medium',  risk_score:48, succession:false, direct_reports:3 },
  { id:'p11', code:'POS-IT-JE-001',   title:'Junior Engineer',            grade:'L1',  family:'IT',    dept:'IT',   status:'vacant',  fte:1.00, budget:22000,   incumbent:null,               since:null,         level:4, reports_to:'SE 1',         dotted_to:null,         attrition:'low',     risk_score:null, succession:false, direct_reports:0 },
  { id:'p12', code:'POS-IT-JE-002',   title:'Junior Engineer',            grade:'L1',  family:'IT',    dept:'IT',   status:'frozen',  fte:1.00, budget:22000,   incumbent:null,               since:null,         level:4, reports_to:'SE 1',         dotted_to:null,         attrition:'low',     risk_score:null, succession:false, direct_reports:0 },
]

// ── Shared components ─────────────────────────────────────────
function Pill({ children, color='blue' }) {
  const m = {
    green:{bg:'#f0fdf4',text:'#15803d',border:'#bbf7d0'},
    blue: {bg:'#eff6ff',text:'#1d4ed8',border:'#bfdbfe'},
    yellow:{bg:'#fffbeb',text:'#b45309',border:'#fde68a'},
    red:  {bg:'#fef2f2',text:'#dc2626',border:'#fecaca'},
    gray: {bg:'#f1f5f9',text:'#475569',border:'#e2e8f0'},
    purple:{bg:'#f5f3ff',text:'#6d28d9',border:'#ddd6fe'},
    orange:{bg:'#fff7ed',text:'#c2410c',border:'#fed7aa'},
    cyan: {bg:'#ecfeff',text:'#0e7490',border:'#a5f3fc'},
  }
  const c = m[color]||m.blue
  return (
    <span style={{background:c.bg,color:c.text,border:`1px solid ${c.border}`,
      padding:'2px 8px',borderRadius:20,fontSize:10,fontWeight:700,
      whiteSpace:'nowrap',display:'inline-flex',alignItems:'center'}}>
      {children}
    </span>
  )
}

function StatCard({ icon, label, value, color='#3b82f6', sub }) {
  return (
    <div style={{background:'#fff',border:`1px solid #e2e8f0`,borderRadius:10,
      padding:'12px 14px',borderLeft:`3px solid ${color}`}}>
      <div style={{fontSize:20,marginBottom:3}}>{icon}</div>
      <div style={{fontSize:20,fontWeight:900,color:'#0f172a'}}>{value}</div>
      <div style={{fontSize:10,color:'#94a3b8',fontWeight:600}}>{label}</div>
      {sub && <div style={{fontSize:10,color:color,marginTop:3,fontWeight:600}}>{sub}</div>}
    </div>
  )
}

// ── Tab 1: Grade & Level (Grade Matrix) ──────────────────────
function GradeMatrix() {
  const [selected, setSelected] = useState(null)
  const typeColor = { individual:'#3b82f6', management:'#8b5cf6', executive:'#ef4444' }
  const typeIcon  = { individual:'👤', management:'👔', executive:'⭐' }

  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:16}}>
        <StatCard icon="📊" label="Total Grades"       value={GRADE_LEVELS.length}             color="#3b82f6" />
        <StatCard icon="👤" label="IC Track (L1-L5)"   value={GRADE_LEVELS.filter(g=>g.type==='individual').length} color="#10b981" />
        <StatCard icon="👔" label="Mgmt/Exec Track"    value={GRADE_LEVELS.filter(g=>g.type!=='individual').length} color="#8b5cf6" />
      </div>

      {/* Grade Matrix table */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,overflow:'hidden',marginBottom:16}}>
        <div style={{padding:'12px 16px',background:'#f8fafc',borderBottom:'1px solid #e2e8f0',
          display:'flex',gap:8,alignItems:'center'}}>
          <span style={{fontSize:14,fontWeight:800,color:'#0f172a'}}>Grade & Level Matrix</span>
          <Pill color="blue">Nepal Labour Act 2074 Compliant</Pill>
        </div>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead>
              <tr style={{background:'#f8fafc'}}>
                {['Grade','Name','Track','Salary Band (NPR/mo)','Bonus %','Leave Days','Span','Approve Leave','Can Hire','Overtime Exempt','Nepal Law'].map((h,i)=>(
                  <th key={i} style={{padding:'10px 12px',textAlign:'left',fontSize:10,
                    fontWeight:700,color:'#64748b',borderBottom:'1px solid #e2e8f0',
                    whiteSpace:'nowrap'}}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {GRADE_LEVELS.map((g,i)=>(
                <tr key={g.id}
                  style={{background:selected===g.id?'#eff6ff':'#fff',cursor:'pointer',
                    borderBottom:'1px solid #f8fafc'}}
                  onClick={()=>setSelected(selected===g.id?null:g.id)}>
                  <td style={{padding:'10px 12px'}}>
                    <span style={{background:`${typeColor[g.type]}20`,color:typeColor[g.type],
                      fontWeight:800,padding:'3px 10px',borderRadius:8,fontSize:12}}>
                      {g.code}
                    </span>
                  </td>
                  <td style={{padding:'10px 12px',fontWeight:600,color:'#0f172a'}}>{g.name}</td>
                  <td style={{padding:'10px 12px'}}>
                    <span style={{fontSize:14}}>{typeIcon[g.type]}</span>
                    <span style={{fontSize:10,color:'#64748b',marginLeft:4}}>{g.type}</span>
                  </td>
                  <td style={{padding:'10px 12px',color:'#0f172a',whiteSpace:'nowrap'}}>
                    {g.min.toLocaleString()} – {g.max.toLocaleString()}
                  </td>
                  <td style={{padding:'10px 12px'}}>
                    <span style={{color: g.bonus>0?'#10b981':'#94a3b8',fontWeight:700}}>
                      {g.bonus}%
                    </span>
                  </td>
                  <td style={{padding:'10px 12px',textAlign:'center'}}>{g.leave}</td>
                  <td style={{padding:'10px 12px',textAlign:'center',color:'#64748b'}}>
                    {g.span||'—'}
                  </td>
                  <td style={{padding:'10px 12px',textAlign:'center'}}>
                    {g.can_approve?'✅':'—'}
                  </td>
                  <td style={{padding:'10px 12px',textAlign:'center'}}>
                    {g.can_hire?'✅':'—'}
                  </td>
                  <td style={{padding:'10px 12px',textAlign:'center'}}>
                    {g.overtime_exempt?'✅ Exempt':'—'}
                  </td>
                  <td style={{padding:'10px 12px'}}>
                    {g.managerial
                      ? <Pill color="orange">Managerial — excl. union</Pill>
                      : <Pill color="gray">General</Pill>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:9,
        padding:'10px 14px',fontSize:11,color:'#92400e'}}>
        ⚖️ <strong>Nepal Labour Act 2074:</strong> Managerial category employees (M1+) are
        excluded from collective bargaining per Labour Act. Max working hours: 48/week for
        all grades. Overtime exempt grades (L4+) may not qualify for overtime pay.
      </div>
    </div>
  )
}

// ── Tab 2: Designation Setup ──────────────────────────────────
function DesignationSetup() {
  const [selectedDesig, setSelectedDesig] = useState(null)
  const [genLoading,    setGenLoading]    = useState(false)
  const [showAddForm,   setShowAddForm]   = useState(false)
  const [form, setForm] = useState({job_code:'',title:'',family:'IT',grade:'L3',experience:3})

  const gradeColor = {
    L1:'#94a3b8',L2:'#64748b',L3:'#3b82f6',L4:'#8b5cf6',L5:'#6d28d9',
    M1:'#f59e0b',M2:'#ef4444',M3:'#dc2626',E1:'#0ea5e9',E2:'#0369a1'
  }

  const fam = JOB_FAMILIES.reduce((acc,f)=>{acc[f.code]=f; return acc},{})

  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:16}}>
        <StatCard icon="📋" label="Designations"       value={DESIGNATIONS.length}                          color="#3b82f6" />
        <StatCard icon="🤖" label="AI-Generated JDs"   value={DESIGNATIONS.filter(d=>d.ai_jd).length}      color="#8b5cf6" />
        <StatCard icon="👔" label="Managerial"          value={DESIGNATIONS.filter(d=>d.managerial).length} color="#f59e0b" />
        <StatCard icon="💼" label="Job Families"        value={JOB_FAMILIES.length}                         color="#10b981" />
      </div>

      {/* Job Family chips */}
      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        {JOB_FAMILIES.map(f=>(
          <div key={f.id} style={{display:'flex',alignItems:'center',gap:6,
            padding:'6px 14px',borderRadius:20,border:`1px solid ${f.color}40`,
            background:`${f.color}10`,cursor:'default'}}>
            <span>{f.icon}</span>
            <span style={{fontSize:12,fontWeight:600,color:f.color}}>{f.name}</span>
            <span style={{fontSize:10,color:'#94a3b8'}}>({f.desig_count})</span>
          </div>
        ))}
      </div>

      {/* Designation cards */}
      <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:14}}>
        {DESIGNATIONS.map(d=>{
          const ff = fam[d.family]
          const gc = gradeColor[d.grade] || '#3b82f6'
          const isOpen = selectedDesig===d.id
          return (
            <div key={d.id}
              style={{background:'#fff',border:`1px solid ${isOpen?ff?.color||'#3b82f6':'#e2e8f0'}`,
                borderRadius:11,overflow:'hidden',cursor:'pointer',
                borderLeft:`4px solid ${ff?.color||'#3b82f6'}`}}
              onClick={()=>setSelectedDesig(isOpen?null:d.id)}>
              <div style={{padding:'12px 14px',display:'flex',alignItems:'center',gap:12}}>
                <div style={{width:40,height:40,borderRadius:10,
                  background:`${ff?.color}18`,display:'flex',alignItems:'center',
                  justifyContent:'center',fontSize:20,flexShrink:0}}>
                  {ff?.icon||'💼'}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap',marginBottom:3}}>
                    <span style={{fontSize:13,fontWeight:800,color:'#0f172a'}}>{d.title}</span>
                    {d.managerial && <Pill color="orange">Managerial</Pill>}
                    {d.ai_jd && <Pill color="purple">🤖 AI JD</Pill>}
                  </div>
                  <div style={{fontSize:11,color:'#64748b'}}>
                    {d.job_code} · {d.family} · {d.experience}yr exp
                  </div>
                  <div style={{display:'flex',gap:6,marginTop:4,flexWrap:'wrap'}}>
                    {d.skills.slice(0,3).map((s,i)=>(
                      <span key={i} style={{background:'#f8fafc',border:'1px solid #e2e8f0',
                        padding:'2px 8px',borderRadius:8,fontSize:10,color:'#475569'}}>
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{display:'flex',flexDirection:'column',
                  alignItems:'flex-end',gap:6,flexShrink:0}}>
                  <span style={{background:`${gc}20`,color:gc,fontWeight:800,
                    padding:'3px 10px',borderRadius:8,fontSize:12}}>{d.grade}</span>
                  <span style={{fontSize:10,color:'#94a3b8'}}>{d.positions} positions</span>
                  <span style={{fontSize:12,color:'#94a3b8'}}>{isOpen?'▲':'▼'}</span>
                </div>
              </div>

              {isOpen && (
                <div style={{padding:'0 14px 14px',borderTop:'1px solid #f8fafc'}}>
                  <div style={{display:'flex',gap:8,marginTop:12}}>
                    <button
                      onClick={e=>{e.stopPropagation();setGenLoading(true);
                        setTimeout(()=>setGenLoading(false),2000)}}
                      style={{padding:'7px 14px',borderRadius:8,border:'none',
                        background:'#f5f3ff',color:'#6d28d9',fontSize:11,fontWeight:700,
                        cursor:'pointer',display:'flex',alignItems:'center',gap:4}}>
                      {genLoading?'⏳ Generating...':'🤖 Generate AI Job Description'}
                    </button>
                    <button onClick={e=>e.stopPropagation()}
                      style={{padding:'7px 14px',borderRadius:8,border:'1px solid #e2e8f0',
                        background:'#fff',color:'#475569',fontSize:11,cursor:'pointer'}}>
                      ✏️ Edit
                    </button>
                  </div>
                  {d.ai_jd && (
                    <div style={{background:'#f5f3ff',border:'1px solid #ddd6fe',
                      borderRadius:8,padding:'10px 12px',marginTop:10}}>
                      <div style={{fontSize:11,fontWeight:700,color:'#6d28d9',marginBottom:4}}>
                        🤖 AI-Generated Summary
                      </div>
                      <div style={{fontSize:11,color:'#4c1d95',lineHeight:1.6}}>
                        As a {d.title}, you will lead technical initiatives and collaborate
                        cross-functionally to deliver high-quality software solutions.
                        Requires {d.experience}+ years of experience and proficiency
                        in {d.skills.join(', ')}.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <button onClick={()=>setShowAddForm(!showAddForm)}
        style={{width:'100%',padding:'11px',borderRadius:10,
          border:'1px dashed #3b82f6',background:'#eff6ff',
          color:'#1d4ed8',fontSize:12,fontWeight:700,cursor:'pointer'}}>
        + Add New Designation
      </button>

      {showAddForm && (
        <div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:12,
          padding:'16px',marginTop:10}}>
          <div style={{fontSize:13,fontWeight:800,color:'#0f172a',marginBottom:14}}>
            New Designation
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            {[
              {label:'Job Code *',  key:'job_code',   ph:'e.g. IT-SE-L3-002'},
              {label:'Title *',     key:'title',      ph:'e.g. Senior Software Engineer'},
              {label:'Experience (years)', key:'experience', ph:'3', type:'number'},
            ].map(f=>(
              <div key={f.key}>
                <label style={{fontSize:11,fontWeight:700,color:'#334155',display:'block',marginBottom:4}}>
                  {f.label}
                </label>
                <input value={form[f.key]} type={f.type||'text'}
                  onChange={e=>setForm(prev=>({...prev,[f.key]:e.target.value}))}
                  placeholder={f.ph}
                  style={{width:'100%',padding:'8px 12px',borderRadius:8,
                    border:'1px solid #e2e8f0',fontSize:12,outline:'none',
                    boxSizing:'border-box'}}/>
              </div>
            ))}
            <div>
              <label style={{fontSize:11,fontWeight:700,color:'#334155',display:'block',marginBottom:4}}>
                Job Family
              </label>
              <select value={form.family}
                onChange={e=>setForm(prev=>({...prev,family:e.target.value}))}
                style={{width:'100%',padding:'8px 12px',borderRadius:8,
                  border:'1px solid #e2e8f0',fontSize:12,background:'#fff'}}>
                {JOB_FAMILIES.map(f=><option key={f.code} value={f.code}>{f.icon} {f.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{fontSize:11,fontWeight:700,color:'#334155',display:'block',marginBottom:4}}>
                Grade Level
              </label>
              <select value={form.grade}
                onChange={e=>setForm(prev=>({...prev,grade:e.target.value}))}
                style={{width:'100%',padding:'8px 12px',borderRadius:8,
                  border:'1px solid #e2e8f0',fontSize:12,background:'#fff'}}>
                {GRADE_LEVELS.map(g=><option key={g.code} value={g.code}>{g.code} — {g.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{display:'flex',gap:8,marginTop:14}}>
            <button style={{padding:'9px 24px',borderRadius:9,border:'none',
              background:'#3b82f6',color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer'}}>
              💾 Save Designation
            </button>
            <button onClick={()=>setShowAddForm(false)}
              style={{padding:'9px 18px',borderRadius:9,border:'1px solid #e2e8f0',
                background:'#fff',color:'#64748b',fontSize:12,cursor:'pointer'}}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Tab 3: Position Management ────────────────────────────────
function PositionManagement() {
  const [filter,   setFilter]   = useState('all')

  const filtered = POSITIONS.filter(p =>
    filter === 'all' || p.status === filter
  )

  const filled  = POSITIONS.filter(p=>p.status==='filled').length
  const vacant  = POSITIONS.filter(p=>p.status==='vacant').length
  const frozen  = POSITIONS.filter(p=>p.status==='frozen').length
  const total   = POSITIONS.length
  const fillPct = Math.round(filled*100/total)

  const highRisk = POSITIONS.filter(p=>p.attrition_risk==='high'||p.attrition_risk==='critical')

  const statusCfg = {
    filled:  {bg:'#f0fdf4',border:'#bbf7d0',text:'#15803d',label:'✓ Filled'},
    vacant:  {bg:'#fff',   border:'#e2e8f0',text:'#475569',label:'○ Vacant'},
    frozen:  {bg:'#f1f5f9',border:'#cbd5e1',text:'#64748b',label:'❄ Frozen'},
    pending_approval:{bg:'#fffbeb',border:'#fde68a',text:'#b45309',label:'⏳ Pending'},
  }

  const riskCfg = {
    low:     {color:'#10b981',bg:'#f0fdf4',border:'#bbf7d0'},
    medium:  {color:'#f59e0b',bg:'#fffbeb',border:'#fde68a'},
    high:    {color:'#ef4444',bg:'#fef2f2',border:'#fecaca'},
    critical:{color:'#dc2626',bg:'#fef2f2',border:'#fecaca'},
  }

  return (
    <div>
      {/* KPI cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10,marginBottom:16}}>
        <StatCard icon="📋" label="Total Positions" value={total}   color="#3b82f6" />
        <StatCard icon="✅" label="Filled"           value={filled}  color="#10b981" sub={`${fillPct}% fill rate`} />
        <StatCard icon="○"  label="Vacant"           value={vacant}  color="#f59e0b" />
        <StatCard icon="❄️" label="Frozen"           value={frozen}  color="#64748b" />
        <StatCard icon="⚠️" label="High Attrition"   value={highRisk.length} color="#ef4444" />
      </div>

      {/* Fill rate progress */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:10,
        padding:'12px 16px',marginBottom:16}}>
        <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:6}}>
          <span style={{fontWeight:700,color:'#0f172a'}}>Position Fill Rate</span>
          <span style={{fontWeight:800,color:fillPct>=80?'#10b981':'#f59e0b'}}>{fillPct}%</span>
        </div>
        <div style={{height:8,background:'#f1f5f9',borderRadius:8,overflow:'hidden'}}>
          <div style={{width:`${fillPct}%`,height:'100%',
            background:fillPct>=80?'#10b981':'#f59e0b',borderRadius:8,transition:'width .5s'}}/>
        </div>
        <div style={{fontSize:11,color:'#94a3b8',marginTop:6}}>
          {filled} filled · {vacant} vacant · {frozen} frozen of {total} total budgeted positions
        </div>
      </div>

      {/* Attrition warning banner */}
      {highRisk.length > 0 && (
        <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:10,
          padding:'12px 14px',marginBottom:14}}>
          <div style={{fontSize:12,fontWeight:800,color:'#dc2626',marginBottom:8}}>
            🧠 AI Attrition Risk — {highRisk.length} High-Risk Position{highRisk.length>1?'s':''}
          </div>
          {highRisk.map((p,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:8,
              fontSize:11,padding:'5px 0',
              borderBottom:i<highRisk.length-1?'1px solid #fecaca':'none'}}>
              <span style={{color:riskCfg[p.attrition_risk].color,fontWeight:800}}>
                {p.risk_score}%
              </span>
              <span style={{flex:1,color:'#991b1b'}}>{p.title}</span>
              <span style={{color:'#64748b'}}>{p.incumbent||'Vacant'}</span>
              <Pill color={p.succession?'green':'red'}>
                {p.succession?'✓ Successor':'No Backup'}
              </Pill>
            </div>
          ))}
        </div>
      )}

      {/* Filter */}
      <div style={{display:'flex',gap:6,marginBottom:12,flexWrap:'wrap'}}>
        {[
          {id:'all',    label:`All (${total})`},
          {id:'filled', label:`Filled (${filled})`},
          {id:'vacant', label:`Vacant (${vacant})`},
          {id:'frozen', label:`Frozen (${frozen})`},
        ].map(f=>(
          <button key={f.id} onClick={()=>setFilter(f.id)}
            style={{padding:'6px 14px',borderRadius:20,fontSize:11,fontWeight:600,
              border:`1px solid ${filter===f.id?'#3b82f6':'#e2e8f0'}`,
              background:filter===f.id?'#eff6ff':'#fff',
              color:filter===f.id?'#1d4ed8':'#64748b',cursor:'pointer'}}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Position cards */}
      <div style={{display:'flex',flexDirection:'column',gap:7}}>
        {filtered.map(pos=>{
          const st  = statusCfg[pos.status] || statusCfg.vacant
          const rc  = riskCfg[pos.attrition_risk] || riskCfg.low
          return (
            <div key={pos.id}
              style={{background:st.bg,border:`1px solid ${selected===pos.id?'#3b82f6':st.border}`,
                borderRadius:10,overflow:'hidden',cursor:'pointer',
                borderLeft:`4px solid ${pos.status==='filled'?'#10b981':pos.status==='frozen'?'#94a3b8':'#f59e0b'}`}}
              onClick={()=>setSelected(selected===pos.id?null:pos.id)}>
              <div style={{padding:'12px 14px',display:'flex',alignItems:'center',gap:12}}>
                {/* Status indicator */}
                <div style={{width:40,height:40,borderRadius:10,
                  background:pos.status==='filled'?'#f0fdf4':'#f8fafc',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontSize:18,flexShrink:0}}>
                  {pos.status==='filled'?'👤':pos.status==='frozen'?'❄️':'○'}
                </div>

                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap',marginBottom:3}}>
                    <span style={{fontSize:13,fontWeight:800,color:'#0f172a'}}>{pos.title}</span>
                    <span style={{fontSize:10,background:st.bg,color:st.text,
                      border:`1px solid ${st.border}`,padding:'2px 8px',borderRadius:20,fontWeight:700}}>
                      {st.label}
                    </span>
                    {pos.status==='filled' && pos.risk_score && (
                      <span style={{background:rc.bg,color:rc.color,border:`1px solid ${rc.border}`,
                        padding:'2px 8px',borderRadius:20,fontSize:10,fontWeight:700}}>
                        🧠 Risk: {pos.risk_score}%
                      </span>
                    )}
                  </div>
                  <div style={{fontSize:11,color:'#64748b'}}>
                    {pos.code} · Grade: <strong>{pos.grade}</strong>
                    {pos.incumbent && ` · 👤 ${pos.incumbent}`}
                    {pos.since && ` since ${pos.since}`}
                    {pos.reports_to && ` · Reports to: ${pos.reports_to}`}
                    {pos.dotted_to && ` ··· ${pos.dotted_to} (dotted)`}
                  </div>
                  {pos.status==='filled' && (
                    <div style={{display:'flex',gap:6,marginTop:4}}>
                      <Pill color={pos.succession?'green':'red'}>
                        {pos.succession?'✓ Succession':'No Succession Plan'}
                      </Pill>
                      {pos.direct_reports>0 && (
                        <Pill color="blue">{pos.direct_reports} direct reports</Pill>
                      )}
                    </div>
                  )}
                </div>

                <div style={{display:'flex',flexDirection:'column',
                  alignItems:'flex-end',gap:5,flexShrink:0}}>
                  <div style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>
                    L{pos.level}
                  </div>
                  <div style={{fontSize:10,color:'#94a3b8'}}>
                    NPR {(pos.budget/1000).toFixed(0)}K/mo
                  </div>
                  <span style={{fontSize:12,color:'#94a3b8'}}>{isOpen?'▲':'▼'}</span>
                </div>
              </div>

              {isOpen && (
                <div style={{padding:'0 14px 14px',borderTop:'1px solid #f1f5f9'}}>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginTop:10,marginBottom:12}}>
                    {[
                      {label:'FTE',         value:pos.fte.toFixed(2)},
                      {label:'Budget/yr',   value:`NPR ${(pos.budget*12/100000).toFixed(1)}L`},
                      {label:'Hierarchy',   value:`Level ${pos.level}`},
                      {label:'Type',        value:pos.status},
                    ].map((m,i)=>(
                      <div key={i} style={{background:'#f8fafc',borderRadius:8,padding:'7px 10px'}}>
                        <div style={{fontSize:9,color:'#94a3b8'}}>{m.label}</div>
                        <div style={{fontSize:12,fontWeight:700,color:'#0f172a'}}>{m.value}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{display:'flex',gap:8}}>
                    {pos.status==='vacant' && (
                      <button style={{padding:'7px 14px',borderRadius:8,border:'none',
                        background:'#10b981',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>
                        👤 Assign Incumbent
                      </button>
                    )}
                    {pos.status==='filled' && (
                      <button style={{padding:'7px 14px',borderRadius:8,border:'none',
                        background:'#f5f3ff',color:'#6d28d9',fontSize:11,fontWeight:700,cursor:'pointer'}}>
                        🧠 Run AI Risk Analysis
                      </button>
                    )}
                    <button style={{padding:'7px 14px',borderRadius:8,
                      border:'1px solid #e2e8f0',background:'#fff',
                      color:'#475569',fontSize:11,cursor:'pointer'}}>
                      ✏️ Edit Position
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Tab 4: Reporting Hierarchy / Org Chart ────────────────────
function ReportingHierarchy() {
  // Simple static org chart representation
  const OrgNode = ({ pos, depth=0 }) => {
    const [expanded, setExpanded] = useState(depth < 2)
    const statusColor = {
      filled:'#10b981',vacant:'#f59e0b',frozen:'#94a3b8'
    }
    const riskColor = {
      low:'#10b981',medium:'#f59e0b',high:'#ef4444',critical:'#dc2626'
    }

    // Find direct reports
    const children = POSITIONS.filter(p => {
      const reportsTo = p.reports_to
      if (!reportsTo) return false
      return pos.title.includes(reportsTo) || reportsTo.includes(pos.title.split(' ')[0])
    })

    return (
      <div style={{marginLeft: depth * 24, marginTop: depth > 0 ? 8 : 0, position:'relative'}}>
        {depth > 0 && (
          <div style={{position:'absolute',left:-20,top:20,
            width:16,height:2,background:'#e2e8f0'}}/>
        )}
        {depth > 0 && (
          <div style={{position:'absolute',left:-20,top:0,bottom:'calc(50% + 2px)',
            width:2,background:'#e2e8f0'}}/>
        )}
        <div style={{background:'#fff',border:`2px solid ${statusColor[pos.status]||'#e2e8f0'}`,
          borderRadius:10,padding:'10px 14px',display:'flex',alignItems:'center',gap:10,
          boxShadow:'0 1px 6px rgba(0,0,0,.06)',minWidth:220,maxWidth:320}}>
          <div style={{width:36,height:36,borderRadius:9,
            background:pos.status==='filled'?'#f0fdf4':'#f8fafc',
            display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>
            {pos.status==='filled'?'👤':'○'}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:12,fontWeight:800,color:'#0f172a',
              overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
              {pos.title}
            </div>
            <div style={{fontSize:10,color:'#64748b'}}>
              {pos.grade} · {pos.incumbent||'Vacant'}
            </div>
            {pos.status==='filled' && pos.risk_score && (
              <div style={{fontSize:9,color:riskColor[pos.attrition_risk],fontWeight:700,marginTop:1}}>
                🧠 Risk: {pos.risk_score}%
              </div>
            )}
          </div>
          {children.length > 0 && (
            <button onClick={()=>setExpanded(!expanded)}
              style={{width:24,height:24,borderRadius:6,border:'1px solid #e2e8f0',
                background:'#f8fafc',fontSize:12,cursor:'pointer',flexShrink:0}}>
              {expanded?'−':'+'}
            </button>
          )}
        </div>
        {expanded && children.map((child,i)=>(
          <OrgNode key={i} pos={child} depth={depth+1}/>
        ))}
      </div>
    )
  }

  const roots = POSITIONS.filter(p=>!p.reports_to||p.level===1)
  const spans = POSITIONS.filter(p=>p.status==='filled'&&p.direct_reports>0)

  return (
    <div>
      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:16}}>
        <StatCard icon="📊" label="Total Positions"    value={POSITIONS.length}         color="#3b82f6" />
        <StatCard icon="👔" label="With Direct Reports" value={spans.length}             color="#8b5cf6" />
        <StatCard icon="🔀" label="Matrix Reports"     value={POSITIONS.filter(p=>p.dotted_to).length} color="#f59e0b" />
        <StatCard icon="⚠️" label="Span > 8 Reports"   value={POSITIONS.filter(p=>p.direct_reports>8).length} color="#ef4444" />
      </div>

      {/* Span of control analysis */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,
        padding:'14px 16px',marginBottom:16}}>
        <div style={{fontSize:13,fontWeight:800,color:'#0f172a',marginBottom:10}}>
          🧠 AI Span-of-Control Analysis (Global Best Practice: 5–8 direct reports)
        </div>
        {POSITIONS.filter(p=>p.status==='filled'&&p.direct_reports>0).map((p,i)=>{
          const ok      = p.direct_reports<=8
          const color   = p.direct_reports<=8?'#10b981':p.direct_reports<=12?'#f59e0b':'#ef4444'
          const label   = p.direct_reports<=8?'Optimal':p.direct_reports<=12?'Stretched':'⚠ Overloaded'
          return (
            <div key={i} style={{display:'flex',alignItems:'center',gap:10,
              padding:'8px 0',borderBottom:'1px solid #f8fafc',fontSize:12}}>
              <span style={{width:120,overflow:'hidden',textOverflow:'ellipsis',
                whiteSpace:'nowrap',color:'#334155',fontWeight:600}}>{p.incumbent}</span>
              <span style={{width:180,overflow:'hidden',textOverflow:'ellipsis',
                whiteSpace:'nowrap',color:'#64748b',fontSize:11}}>{p.title}</span>
              <div style={{flex:1,height:8,background:'#f1f5f9',borderRadius:8,overflow:'hidden'}}>
                <div style={{width:`${Math.min(p.direct_reports*8,100)}%`,
                  height:'100%',background:color,borderRadius:8}}/>
              </div>
              <span style={{color,fontWeight:800,width:24,textAlign:'right'}}>{p.direct_reports}</span>
              <span style={{color,fontSize:10,fontWeight:700,width:80}}>{label}</span>
            </div>
          )
        })}
      </div>

      {/* Org chart */}
      <div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:12,
        padding:'16px',overflowX:'auto',overflowY:'auto',maxHeight:500}}>
        <div style={{fontSize:12,fontWeight:700,color:'#334155',marginBottom:12}}>
          📐 Reporting Hierarchy — Click nodes to expand/collapse
        </div>
        {roots.map((r,i)=>(
          <OrgNode key={i} pos={r} depth={0}/>
        ))}
      </div>

      <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:9,
        padding:'10px 14px',marginTop:12,fontSize:11,color:'#1e40af'}}>
        💡 <strong>Global Best Practice:</strong> Build hierarchy based on <strong>Positions</strong>,
        not specific people. When an employee leaves, reporting lines stay intact — the next hire
        inherits the position's structure automatically.
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────
export default function PositionManagementPage() {
  const [activeTab, setActiveTab] = useState('positions')

  const TABS = [
    { id:'grades',    icon:'📊', label:'Grade & Level'         },
    { id:'desig',     icon:'💼', label:'Designation Setup'     },
    { id:'positions', icon:'📋', label:'Position Management'   },
    { id:'hierarchy', icon:'🗂️', label:'Reporting Hierarchy'  },
  ]

  return (
    <div>
      <div style={{marginBottom:20}}>
        <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
          <h2 style={{fontSize:22,fontWeight:900,color:'#0f172a',margin:0}}>
            Structure & Hierarchy
          </h2>
          <Pill color="blue">Position-Based</Pill>
          <Pill color="purple">🧠 AI-Driven</Pill>
          <Pill color="green">Nepal Labour Act 2074</Pill>
        </div>
        <p style={{fontSize:12,color:'#94a3b8',margin:'5px 0 0'}}>
          Designation · Grade & Level · Position Management · Reporting Hierarchy
          — Global best practice (Workday/Oracle HCM standard)
        </p>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:2,background:'#f1f5f9',padding:4,
        borderRadius:12,marginBottom:20,border:'1px solid #e2e8f0'}}>
        {TABS.map(tab=>(
          <button key={tab.id} onClick={()=>setActiveTab(tab.id)}
            style={{flex:1,padding:'9px',borderRadius:9,border:'none',
              background:activeTab===tab.id?'#fff':'transparent',
              color:activeTab===tab.id?'#0f172a':'#64748b',
              fontWeight:activeTab===tab.id?700:400,fontSize:12,cursor:'pointer',
              boxShadow:activeTab===tab.id?'0 1px 4px rgba(0,0,0,.08)':'none',
              display:'flex',alignItems:'center',justifyContent:'center',gap:5}}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {activeTab==='grades'    && <GradeMatrix/>}
      {activeTab==='desig'     && <DesignationSetup/>}
      {activeTab==='positions' && <PositionManagement/>}
      {activeTab==='hierarchy' && <ReportingHierarchy/>}
    </div>
  )
}
