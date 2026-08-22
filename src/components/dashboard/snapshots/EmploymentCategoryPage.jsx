// ============================================================
// FILE: src/components/dashboard/snapshots/EmploymentCategoryPage.jsx
// PURPOSE: Employment Category & Classification System
//          Nepal Labour Act 2074 compliant — 11 categories
//          Two-tier taxonomy (Workday/Oracle global standard)
//          AI compliance check, headcount stats, CRUD
// ============================================================

import { useState } from 'react'
import { useApp } from '../../../context/AppContext.jsx'

// ── All 11 Employment Categories (Nepal Labour Act 2074) ──────
const EMPLOYMENT_CATEGORIES = [
  // ── INTERNAL EMPLOYEES (Direct Payroll) ──────────────────
  {
    id: 'cat-001', code: 'REGULAR', name: 'Regular / Permanent',
    name_nepali: 'नियमित / स्थायी', icon: '🏅', color: '#10b981',
    group: 'internal', payroll_type: 'direct',
    tier1: 'Full-Time Regular', tier2: 'Exempt',
    nepal_law: 'Section 10(a)', nepal_law_label: 'Regular Employment',
    is_on_payroll: true, fte_value: 1.00,
    std_hours: 48, max_hours: 48, max_days_month: null,
    probation_months: 6, requires_end_date: false,
    written_contract: true, expiry_alert_days: null,
    benefits: ['Gratuity (8.33%)', 'PF (10%)', 'SSF', 'Medical', 'Annual Leave', 'Sick Leave', 'Maternity', 'Paternity'],
    leave_proration: 100,
    rbac: 'Full Access', counts_headcount: true,
    tds: true, pf: true, ssf: true,
    headcount: 820, expiring_soon: 0,
    ai_risk: 'low', ai_risk_color: '#10b981',
    ai_note: 'Full statutory benefits. Gratuity: 8.33% of basic. No end date. Must confirm probationers in writing.',
    nepal_law_note: 'Continuous employment with no predefined end date. Full statutory benefits including gratuity, PF, SSF, and all leaves.',
    misclassification_risk: null,
  },
  {
    id: 'cat-002', code: 'PROBATION', name: 'Probation',
    name_nepali: 'परीक्षाकाल', icon: '🔄', color: '#f59e0b',
    group: 'internal', payroll_type: 'direct',
    tier1: 'Full-Time Temporary', tier2: 'Non-Exempt',
    nepal_law: 'Section 10', nepal_law_label: 'Probationary Period',
    is_on_payroll: true, fte_value: 1.00,
    std_hours: 48, max_hours: 48, max_days_month: null,
    probation_months: 6, requires_end_date: true,
    written_contract: true, expiry_alert_days: 30,
    benefits: ['PF (10%)', 'SSF', 'Medical', 'Sick Leave'],
    leave_proration: 50,
    rbac: 'Standard Access', counts_headcount: true,
    tds: true, pf: true, ssf: true,
    headcount: 68, expiring_soon: 12,
    ai_risk: 'low', ai_risk_color: '#10b981',
    ai_note: 'Max 6 months per Nepal Labour Act. Auto-trigger performance review at 3 months. Convert to REGULAR on completion.',
    nepal_law_note: 'Maximum 6 months probation. Performance review mandatory. Confirm in writing upon successful completion.',
    misclassification_risk: null,
  },
  {
    id: 'cat-003', code: 'CONTRACT_WB', name: 'Contract – Work-Based',
    name_nepali: 'कार्य-आधारित', icon: '🎯', color: '#8b5cf6',
    group: 'internal', payroll_type: 'direct',
    tier1: 'Full-Time Temporary', tier2: 'Contractor',
    nepal_law: 'Section 10(b)', nepal_law_label: 'Work-Based Employment',
    is_on_payroll: true, fte_value: 1.00,
    std_hours: 48, max_hours: 48, max_days_month: null,
    probation_months: null, requires_end_date: true,
    written_contract: true, expiry_alert_days: 60,
    benefits: ['PF (10%)', 'SSF', 'Medical', 'Annual Leave', 'Sick Leave'],
    leave_proration: 100,
    rbac: 'Standard Access', counts_headcount: true,
    tds: true, pf: true, ssf: true,
    headcount: 45, expiring_soon: 8,
    ai_risk: 'medium', ai_risk_color: '#f59e0b',
    ai_note: 'Ends on project completion. Define deliverables clearly in contract. Misclassification risk if used for ongoing work.',
    nepal_law_note: 'Tied to specific project/task completion (Section 10b). Contract terminates naturally when project completes.',
    misclassification_risk: 'Medium — avoid using for ongoing operational roles.',
  },
  {
    id: 'cat-004', code: 'CONTRACT_TB', name: 'Contract – Time-Bound',
    name_nepali: 'समय-सीमित', icon: '📅', color: '#06b6d4',
    group: 'internal', payroll_type: 'direct',
    tier1: 'Full-Time Temporary', tier2: 'Contractor',
    nepal_law: 'Section 10(c)', nepal_law_label: 'Time-Bound Employment',
    is_on_payroll: true, fte_value: 1.00,
    std_hours: 48, max_hours: 48, max_days_month: null,
    probation_months: null, requires_end_date: true,
    written_contract: true, expiry_alert_days: 60,
    benefits: ['PF (10%)', 'SSF', 'Medical', 'Annual Leave', 'Sick Leave'],
    leave_proration: 100,
    rbac: 'Standard Access', counts_headcount: true,
    tds: true, pf: true, ssf: true,
    headcount: 92, expiring_soon: 15,
    ai_risk: 'medium', ai_risk_color: '#f59e0b',
    ai_note: 'Auto-alert 60 days before expiry. Can extend by mutual agreement. Alert HR for renewal or offboarding.',
    nepal_law_note: 'Fixed duration employment (Section 10c). Terminates at period end. Extendable by mutual agreement.',
    misclassification_risk: 'Medium — ensure genuine fixed-term need.',
  },
  {
    id: 'cat-005', code: 'CASUAL', name: 'Casual Employment',
    name_nepali: 'अनियमित', icon: '🔀', color: '#f97316',
    group: 'internal', payroll_type: 'prorated',
    tier1: 'Part-Time Temporary', tier2: 'Non-Exempt',
    nepal_law: 'Section 10(d)', nepal_law_label: 'Casual Employment',
    is_on_payroll: true, fte_value: 0.25,
    std_hours: null, max_hours: null, max_days_month: 7,
    probation_months: null, requires_end_date: false,
    written_contract: false, expiry_alert_days: null,
    benefits: ['Minimum Wage applies'],
    leave_proration: 0,
    rbac: 'Limited Access', counts_headcount: true,
    tds: true, pf: false, ssf: false,
    headcount: 34, expiring_soon: 0,
    ai_risk: 'medium', ai_risk_color: '#f59e0b',
    ai_note: 'Maximum 7 days per month per Nepal law. NO written contract required. At-will termination. No PF/SSF required.',
    nepal_law_note: 'Max 7 days/month (Section 10d). Only category where written contract is NOT mandatory. Either party can terminate at will.',
    misclassification_risk: 'High if used for more than 7 days/month.',
  },
  {
    id: 'cat-006', code: 'PART_TIME', name: 'Part-Time Employment',
    name_nepali: 'अल्पकालीन', icon: '⏰', color: '#84cc16',
    group: 'internal', payroll_type: 'prorated',
    tier1: 'Part-Time Regular', tier2: 'Non-Exempt',
    nepal_law: 'Section 10(e)', nepal_law_label: 'Part-Time Employment',
    is_on_payroll: true, fte_value: 0.50,
    std_hours: 25, max_hours: 35, max_days_month: null,
    probation_months: 3, requires_end_date: false,
    written_contract: true, expiry_alert_days: null,
    benefits: ['PF (prorated)', 'SSF (prorated)', 'Annual Leave (50%)', 'Sick Leave (50%)'],
    leave_proration: 50,
    rbac: 'Standard Access', counts_headcount: true,
    tds: true, pf: true, ssf: true,
    headcount: 58, expiring_soon: 0,
    ai_risk: 'low', ai_risk_color: '#10b981',
    ai_note: 'Max 35 hrs/week per Nepal law. Proportional benefits. Cannot prohibit from working elsewhere unless in contract.',
    nepal_law_note: '35 hrs/week maximum (Section 10e). Proportional wages and benefits. Cannot restrict secondary employment.',
    misclassification_risk: null,
  },
  // ── CONTINGENT / FLEXIBLE WORKFORCE ──────────────────────
  {
    id: 'cat-007', code: 'INTERN', name: 'Intern',
    name_nepali: 'इन्टर्न', icon: '🎓', color: '#3b82f6',
    group: 'contingent', payroll_type: 'stipend',
    tier1: 'Full-Time Temporary', tier2: 'Intern',
    nepal_law: 'Nepal Law', nepal_law_label: 'Intern (Educational)',
    is_on_payroll: true, fte_value: 1.00,
    std_hours: 48, max_hours: 48, max_days_month: null,
    probation_months: null, requires_end_date: true,
    written_contract: true, expiry_alert_days: 30,
    benefits: ['Basic Medical', 'Basic Safety'],
    leave_proration: 0,
    rbac: 'Limited Access', counts_headcount: true,
    tds: false, pf: false, ssf: false,
    headcount: 28, expiring_soon: 6,
    ai_risk: 'low', ai_risk_color: '#10b981',
    ai_note: 'Educational institution only. Basic safety/medical required. Stipend optional. Academic tasks only — no operational work.',
    nepal_law_note: 'Persons engaging per educational institution syllabus. Basic safety and medical protections. Stipend not mandatory.',
    misclassification_risk: null,
  },
  {
    id: 'cat-008', code: 'TRAINEE', name: 'Trainee',
    name_nepali: 'प्रशिक्षार्थी', icon: '📚', color: '#a855f7',
    group: 'contingent', payroll_type: 'stipend',
    tier1: 'Full-Time Temporary', tier2: 'Trainee',
    nepal_law: 'Nepal Law', nepal_law_label: 'Organizational Trainee',
    is_on_payroll: true, fte_value: 1.00,
    std_hours: 48, max_hours: 48, max_days_month: null,
    probation_months: null, requires_end_date: true,
    written_contract: true, expiry_alert_days: 30,
    benefits: ['Basic Medical', 'Stipend'],
    leave_proration: 0,
    rbac: 'Limited Access', counts_headcount: true,
    tds: false, pf: false, ssf: false,
    headcount: 18, expiring_soon: 3,
    ai_risk: 'low', ai_risk_color: '#10b981',
    ai_note: 'Structured organizational development program. Track skills throughout training. Pipeline for future recruitment.',
    nepal_law_note: 'Structured training program. Map skills for future organizational needs.',
    misclassification_risk: null,
  },
  {
    id: 'cat-009', code: 'DAILY_WAGE', name: 'Daily Wage',
    name_nepali: 'दैनिक ज्यालादारी', icon: '📆', color: '#ef4444',
    group: 'contingent', payroll_type: 'daily',
    tier1: 'Part-Time Temporary', tier2: 'Non-Exempt',
    nepal_law: 'Section 10(d)', nepal_law_label: 'Casual / Daily',
    is_on_payroll: true, fte_value: 0.50,
    std_hours: 8, max_hours: 8, max_days_month: null,
    probation_months: null, requires_end_date: false,
    written_contract: true, expiry_alert_days: null,
    benefits: ['Min Wage (daily rate)'],
    leave_proration: 0,
    rbac: 'Limited Access', counts_headcount: true,
    tds: true, pf: true, ssf: true,
    headcount: 42, expiring_soon: 0,
    ai_risk: 'medium', ai_risk_color: '#f59e0b',
    ai_note: 'Timesheet validation MANDATORY before payroll run. Daily rate × days worked = gross. Minimum wage applies.',
    nepal_law_note: 'Paid per day/shift worked. Timesheet required before payment. Nepal minimum wage applies.',
    misclassification_risk: 'Medium — ensure genuine daily arrangement.',
  },
  // ── EXTERNAL / VENDOR ─────────────────────────────────────
  {
    id: 'cat-010', code: 'OUTSOURCE', name: 'Outsource',
    name_nepali: 'आउटसोर्स', icon: '🏭', color: '#64748b',
    group: 'external', payroll_type: 'vendor_ap',
    tier1: 'Contingent', tier2: 'Vendor',
    nepal_law: 'Labour Act 2074', nepal_law_label: 'Outsourced via Licensed Agency',
    is_on_payroll: false, fte_value: 1.00,
    std_hours: 48, max_hours: 48, max_days_month: null,
    probation_months: null, requires_end_date: true,
    written_contract: true, expiry_alert_days: 60,
    benefits: ['Agency responsibility'],
    leave_proration: 0,
    rbac: 'Project Only', counts_headcount: false,
    tds: false, pf: false, ssf: false,
    headcount: 76, expiring_soon: 4,
    ai_risk: 'medium', ai_risk_color: '#f59e0b',
    ai_note: 'NOT on direct payroll. Via licensed agency only. Cannot perform core business. Agency handles PF/insurance.',
    nepal_law_note: 'Must use licensed labor supplier. Cannot perform core business functions. Agency responsible for compliance.',
    misclassification_risk: 'Medium — ensure agency is licensed and compliant.',
  },
  {
    id: 'cat-011', code: 'CONSULTANT', name: 'Consultant',
    name_nepali: 'परामर्शदाता', icon: '💼', color: '#0ea5e9',
    group: 'external', payroll_type: 'vendor_ap',
    tier1: 'External', tier2: 'Freelance',
    nepal_law: 'Accounts Payable', nepal_law_label: 'Independent Consultant',
    is_on_payroll: false, fte_value: 0.00,
    std_hours: null, max_hours: null, max_days_month: null,
    probation_months: null, requires_end_date: true,
    written_contract: true, expiry_alert_days: 30,
    benefits: ['None — independent provider'],
    leave_proration: 0,
    rbac: 'External Only', counts_headcount: false,
    tds: true, pf: false, ssf: false,
    headcount: 14, expiring_soon: 2,
    ai_risk: 'high', ai_risk_color: '#ef4444',
    ai_note: 'Process via Accounts Payable (Invoice/PO) — NOT HR payroll. Exclude from all statutory benefits. TDS on fees. High misclassification risk.',
    nepal_law_note: 'Independent entity. Invoice-based payment via AP. TDS applicable on consultancy fees. Not an employee.',
    misclassification_risk: '⚠️ HIGH — Genuine autonomy required. Regular/integrated work = misclassification. Consult legal.',
  },
]

// ── Group config ──────────────────────────────────────────────
const GROUPS = [
  { id:'all',       label:'All Categories',                          icon:'📊', color:'#3b82f6' },
  { id:'internal',  label:'Internal Employees (Direct Payroll)',      icon:'👥', color:'#10b981' },
  { id:'contingent',label:'Contingent / Flexible Workforce',         icon:'🔄', color:'#f59e0b' },
  { id:'external',  label:'External Providers (Accounts Payable)',   icon:'🌐', color:'#64748b' },
]

// ── Shared UI ─────────────────────────────────────────────────
function Pill({ children, color='blue' }) {
  const m = {
    green: {bg:'#f0fdf4',text:'#15803d',border:'#bbf7d0'},
    blue:  {bg:'#eff6ff',text:'#1d4ed8',border:'#bfdbfe'},
    yellow:{bg:'#fffbeb',text:'#b45309',border:'#fde68a'},
    red:   {bg:'#fef2f2',text:'#dc2626',border:'#fecaca'},
    gray:  {bg:'#f1f5f9',text:'#475569',border:'#e2e8f0'},
    purple:{bg:'#f5f3ff',text:'#6d28d9',border:'#ddd6fe'},
    orange:{bg:'#fff7ed',text:'#c2410c',border:'#fed7aa'},
    cyan:  {bg:'#ecfeff',text:'#0e7490',border:'#a5f3fc'},
  }
  const c = m[color]||m.blue
  return (
    <span style={{background:c.bg,color:c.text,border:`1px solid ${c.border}`,
      padding:'2px 8px',borderRadius:20,fontSize:10,fontWeight:700,
      display:'inline-flex',alignItems:'center',whiteSpace:'nowrap'}}>
      {children}
    </span>
  )
}

// ── Category Detail Modal ─────────────────────────────────────
function CategoryDetailModal({ cat, onClose }) {
  const [tab, setTab] = useState('overview')

  const riskColorMap = { low:'green', medium:'yellow', high:'red' }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.55)',zIndex:3000,
      display:'flex',alignItems:'center',justifyContent:'center',padding:16}}
      onClick={onClose}>
      <div style={{background:'#fff',borderRadius:18,width:680,maxHeight:'88vh',
        display:'flex',flexDirection:'column',boxShadow:'0 24px 64px rgba(0,0,0,.25)',
        overflow:'hidden'}}
        onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div style={{padding:'16px 20px',flexShrink:0,
          background:`linear-gradient(135deg,${cat.color}dd,${cat.color})`,
          display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:50,height:50,borderRadius:14,background:'rgba(255,255,255,.2)',
            display:'flex',alignItems:'center',justifyContent:'center',fontSize:26}}>
            {cat.icon}
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:16,fontWeight:900,color:'#fff'}}>{cat.name}</div>
            <div style={{fontSize:11,color:'rgba(255,255,255,.8)'}}>
              {cat.name_nepali} · {cat.code} · {cat.nepal_law}
            </div>
          </div>
          <button onClick={onClose} style={{background:'rgba(255,255,255,.2)',border:'none',
            borderRadius:8,width:30,height:30,cursor:'pointer',color:'#fff',fontSize:16}}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{display:'flex',borderBottom:'1px solid #f1f5f9',padding:'0 18px',
          background:'#f8fafc',flexShrink:0,overflowX:'auto',scrollbarWidth:'none'}}>
          {[
            {id:'overview',   label:'📊 Overview'},
            {id:'benefits',   label:'🎁 Benefits'},
            {id:'compliance', label:'⚖️ Nepal Law'},
            {id:'ai',         label:'🧠 AI Analysis'},
          ].map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{padding:'10px 14px',border:'none',background:'transparent',
                color:tab===t.id?'#2563eb':'#64748b',
                fontWeight:tab===t.id?700:400,fontSize:12,cursor:'pointer',
                borderBottom:`2px solid ${tab===t.id?'#2563eb':'transparent'}`,
                whiteSpace:'nowrap'}}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{flex:1,overflowY:'auto',padding:'18px 20px'}}>

          {tab==='overview' && (
            <div>
              {/* Stats */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:16}}>
                {[
                  {label:'Headcount',     value:cat.headcount,                   icon:'👥', color:'#3b82f6'},
                  {label:'FTE Value',     value:cat.fte_value.toFixed(2),        icon:'📊', color:'#10b981'},
                  {label:'Leave Prorate', value:`${cat.leave_proration}%`,       icon:'🏖️', color:'#f59e0b'},
                  {label:'Expiring Soon', value:cat.expiring_soon,               icon:'⚠️', color: cat.expiring_soon>0?'#ef4444':'#10b981'},
                ].map((s,i)=>(
                  <div key={i} style={{background:'#f8fafc',borderRadius:10,
                    padding:'10px 12px',borderLeft:`3px solid ${s.color}`}}>
                    <div style={{fontSize:18,marginBottom:3}}>{s.icon}</div>
                    <div style={{fontSize:18,fontWeight:800,color:'#0f172a'}}>{s.value}</div>
                    <div style={{fontSize:10,color:'#94a3b8',fontWeight:600}}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Two-tier taxonomy */}
              <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:10,
                padding:'12px 14px',marginBottom:14}}>
                <div style={{fontSize:11,fontWeight:700,color:'#1e40af',marginBottom:8}}>
                  📐 Two-Tier Taxonomy (Workday/Oracle Global Standard)
                </div>
                <div style={{display:'flex',gap:12}}>
                  <div style={{flex:1,background:'#fff',borderRadius:8,padding:'8px 12px'}}>
                    <div style={{fontSize:10,color:'#94a3b8'}}>Tier 1 — Work Schedule</div>
                    <div style={{fontSize:12,fontWeight:700,color:'#0f172a',marginTop:2}}>{cat.tier1}</div>
                  </div>
                  <div style={{flex:1,background:'#fff',borderRadius:8,padding:'8px 12px'}}>
                    <div style={{fontSize:10,color:'#94a3b8'}}>Tier 2 — Legal Classification</div>
                    <div style={{fontSize:12,fontWeight:700,color:'#0f172a',marginTop:2}}>{cat.tier2}</div>
                  </div>
                </div>
              </div>

              {/* Key fields */}
              {[
                ['Payroll Type',          cat.payroll_type,                                   null],
                ['On Company Payroll',    cat.is_on_payroll?'✅ Yes':'❌ No (Vendor/AP)',     null],
                ['Standard Hours/Week',   cat.std_hours?`${cat.std_hours} hrs`:'-',            null],
                ['Max Hours/Week',        cat.max_hours?`${cat.max_hours} hrs`:'Ad-hoc',       null],
                ['Max Days/Month',        cat.max_days_month?`${cat.max_days_month} days`:'No limit', null],
                ['Probation Period',      cat.probation_months?`${cat.probation_months} months (max)`:'Not applicable', null],
                ['Requires End Date',     cat.requires_end_date?`Yes — Alert ${cat.expiry_alert_days} days prior`:'No', null],
                ['Written Contract',      cat.written_contract?'✅ Required':'❌ Not required (Casual only)', null],
                ['RBAC Profile',          cat.rbac,                                           null],
                ['Headcount Count',       cat.counts_headcount?'✅ Yes':'❌ No',               null],
              ].map(([label, value], i)=>(
                <div key={i} style={{display:'flex',justifyContent:'space-between',
                  padding:'7px 0',borderBottom:'1px solid #f8fafc',fontSize:12}}>
                  <span style={{color:'#64748b'}}>{label}</span>
                  <span style={{fontWeight:700,color:'#0f172a'}}>{value}</span>
                </div>
              ))}
            </div>
          )}

          {tab==='benefits' && (
            <div>
              <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',
                borderRadius:10,padding:'12px 14px',marginBottom:14}}>
                <div style={{fontSize:11,fontWeight:700,color:'#15803d',marginBottom:6}}>
                  🎁 Benefit Eligibility — {cat.name}
                </div>
                {cat.benefits.map((b,i)=>(
                  <div key={i} style={{display:'flex',alignItems:'center',gap:6,
                    padding:'4px 0',fontSize:12,color:'#166534'}}>
                    <span>✓</span><span>{b}</span>
                  </div>
                ))}
              </div>

              {/* Tax/statutory summary */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
                {[
                  {label:'TDS Applicable',    yes:cat.tds,  note:'Income tax deduction'},
                  {label:'Provident Fund (PF)',yes:cat.pf,   note:'10% employer + 10% employee'},
                  {label:'Social Security (SSF)',yes:cat.ssf,note:'Labour Act 2074 Section 102'},
                  {label:'Gratuity',           yes:cat.benefits.some(b=>b.includes('Gratuity')), note:'8.33% of basic salary'},
                ].map((s,i)=>(
                  <div key={i} style={{background:s.yes?'#f0fdf4':'#fef2f2',
                    border:`1px solid ${s.yes?'#bbf7d0':'#fecaca'}`,
                    borderRadius:9,padding:'10px 12px'}}>
                    <div style={{fontSize:11,fontWeight:700,color:s.yes?'#15803d':'#dc2626'}}>
                      {s.yes?'✅':'❌'} {s.label}
                    </div>
                    <div style={{fontSize:10,color:'#64748b',marginTop:2}}>{s.note}</div>
                  </div>
                ))}
              </div>

              {/* Misclassification risk */}
              {cat.misclassification_risk && (
                <div style={{background:'#fef2f2',border:'1px solid #fecaca',
                  borderRadius:9,padding:'12px 14px'}}>
                  <div style={{fontSize:11,fontWeight:700,color:'#dc2626',marginBottom:4}}>
                    ⚠️ Misclassification Risk
                  </div>
                  <div style={{fontSize:11,color:'#991b1b'}}>{cat.misclassification_risk}</div>
                </div>
              )}
            </div>
          )}

          {tab==='compliance' && (
            <div>
              <div style={{background:'#fffbeb',border:'1px solid #fde68a',
                borderRadius:10,padding:'12px 14px',marginBottom:14}}>
                <div style={{fontSize:12,fontWeight:800,color:'#92400e',marginBottom:6}}>
                  ⚖️ Nepal Labour Act 2074 — {cat.nepal_law}
                </div>
                <div style={{fontSize:12,color:'#78350f',lineHeight:1.7}}>
                  {cat.nepal_law_note}
                </div>
              </div>

              {/* Key compliance points */}
              {cat.code==='CASUAL' && (
                <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:9,padding:'12px 14px',marginBottom:12}}>
                  <div style={{fontSize:11,fontWeight:700,color:'#dc2626'}}>
                    🚨 Casual Employment — Critical Compliance Points
                  </div>
                  <div style={{marginTop:8,fontSize:11,color:'#991b1b',lineHeight:1.7}}>
                    • Maximum 7 days per month — exceeding this converts to other category<br/>
                    • Written contract NOT required (only category)<br/>
                    • Either party can terminate at will<br/>
                    • PF and SSF NOT required<br/>
                    • Minimum wage MUST apply
                  </div>
                </div>
              )}
              {cat.code==='PART_TIME' && (
                <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:9,padding:'12px 14px',marginBottom:12}}>
                  <div style={{fontSize:11,fontWeight:700,color:'#1e40af'}}>
                    📋 Part-Time — Nepal Specific Rules
                  </div>
                  <div style={{marginTop:8,fontSize:11,color:'#1e40af',lineHeight:1.7}}>
                    • Max 35 hours per week (Section 10e)<br/>
                    • Proportional wages and benefits<br/>
                    • CANNOT be legally prohibited from other employment<br/>
                    • PF/SSF required (prorated)
                  </div>
                </div>
              )}
              {cat.code==='CONSULTANT' && (
                <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:9,padding:'12px 14px',marginBottom:12}}>
                  <div style={{fontSize:11,fontWeight:700,color:'#dc2626'}}>
                    ⚠️ Consultant — Process via Accounts Payable, NOT HR Payroll
                  </div>
                  <div style={{marginTop:8,fontSize:11,color:'#991b1b',lineHeight:1.7}}>
                    • Invoice/Purchase Order basis only<br/>
                    • TDS deduction on consultancy fees<br/>
                    • Zero statutory benefits<br/>
                    • HIGH misclassification risk — consult legal if in doubt
                  </div>
                </div>
              )}
              {cat.code==='OUTSOURCE' && (
                <div style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:9,padding:'12px 14px',marginBottom:12}}>
                  <div style={{fontSize:11,fontWeight:700,color:'#92400e'}}>
                    📋 Outsource — Nepal Labour Act Requirements
                  </div>
                  <div style={{marginTop:8,fontSize:11,color:'#78350f',lineHeight:1.7}}>
                    • Must use licensed labor supplier ONLY<br/>
                    • Cannot perform core business functions<br/>
                    • Agency is responsible for PF, insurance, wages<br/>
                    • Track operational access only — not on company headcount
                  </div>
                </div>
              )}

              <div style={{fontSize:11,color:'#94a3b8',marginTop:12,
                background:'#f8fafc',borderRadius:8,padding:'8px 12px'}}>
                📖 Reference: Nepal Labour Act 2074 (2017) · Labour Rules 2075 (2018)
              </div>
            </div>
          )}

          {tab==='ai' && (
            <div>
              <div style={{background:'linear-gradient(135deg,#f5f3ff,#eff6ff)',
                border:'1px solid #c4b5fd',borderRadius:12,padding:'14px 16px',marginBottom:14}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                  <span style={{fontSize:16}}>🧠</span>
                  <span style={{fontSize:13,fontWeight:800,color:'#1e1b4b'}}>AI Compliance Analysis</span>
                  <Pill color={riskColorMap[cat.ai_risk]}>
                    {cat.ai_risk.toUpperCase()} RISK
                  </Pill>
                </div>
                <div style={{fontSize:12,color:'#4c1d95',lineHeight:1.65}}>
                  {cat.ai_note}
                </div>
              </div>

              {cat.misclassification_risk && (
                <div style={{background:'#fef2f2',border:'1px solid #fecaca',
                  borderRadius:10,padding:'12px 14px',marginBottom:14}}>
                  <div style={{fontSize:12,fontWeight:800,color:'#dc2626',marginBottom:6}}>
                    ⚠️ Misclassification Risk
                  </div>
                  <div style={{fontSize:12,color:'#991b1b',lineHeight:1.6}}>
                    {cat.misclassification_risk}
                  </div>
                </div>
              )}

              {/* Auto-triggers */}
              <div style={{fontSize:12,fontWeight:700,color:'#334155',marginBottom:10}}>
                🤖 Automated System Triggers
              </div>
              {[
                cat.has_probation!==false && cat.probation_months && {
                  trigger: `Probation Review at ${Math.floor(cat.probation_months/2)} months`,
                  action: 'Create performance review task for HR and Manager'
                },
                cat.has_probation!==false && cat.probation_months && {
                  trigger: `Probation End at ${cat.probation_months} months`,
                  action: 'Auto-convert to REGULAR or flag for extension/termination'
                },
                cat.requires_end_date && cat.expiry_alert_days && {
                  trigger: `Contract Expiry Alert — ${cat.expiry_alert_days} days before`,
                  action: 'Notify HR Manager + Department Head for renewal/offboarding decision'
                },
                cat.requires_end_date && {
                  trigger: 'Contract End Date reached',
                  action: cat.code==='OUTSOURCE'||cat.code==='CONSULTANT'
                    ? 'Close vendor access, archive PO/invoice records'
                    : 'Trigger offboarding workflow or renewal process'
                },
                cat.code==='DAILY_WAGE' && {
                  trigger: 'Payroll Run',
                  action: 'Validate timesheet before processing daily rate × days worked'
                },
              ].filter(Boolean).map((t,i)=>(
                <div key={i} style={{display:'flex',gap:10,padding:'9px 0',
                  borderBottom:'1px solid #f8fafc'}}>
                  <span style={{fontSize:16,flexShrink:0}}>⚡</span>
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:'#334155'}}>{t.trigger}</div>
                    <div style={{fontSize:11,color:'#64748b',marginTop:2}}>{t.action}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────
export default function EmploymentCategoryPage() {
  const { navTo } = useApp()

  const [activeGroup, setActiveGroup] = useState('all')
  const [selectedCat, setSelectedCat] = useState(null)
  const [search,      setSearch]      = useState('')
  const [activeTab,   setActiveTab]   = useState('categories')

  const filtered = EMPLOYMENT_CATEGORIES.filter(c => {
    const matchGroup  = activeGroup==='all' || c.group===activeGroup
    const matchSearch = !search
      || c.name.toLowerCase().includes(search.toLowerCase())
      || c.code.toLowerCase().includes(search.toLowerCase())
      || c.nepal_law.toLowerCase().includes(search.toLowerCase())
    return matchGroup && matchSearch
  })

  // Stats
  const totalHeadcount = EMPLOYMENT_CATEGORIES.reduce((s,c)=>s+c.headcount, 0)
  const onPayroll      = EMPLOYMENT_CATEGORIES.filter(c=>c.is_on_payroll).reduce((s,c)=>s+c.headcount,0)
  const totalFTE       = EMPLOYMENT_CATEGORIES.reduce((s,c)=>s+(c.fte_value*c.headcount),0)
  const expiringTotal  = EMPLOYMENT_CATEGORIES.reduce((s,c)=>s+c.expiring_soon,0)

  return (
    <div>
      {/* Page Header */}
      <div style={{marginBottom:20}}>
        <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
          <h2 style={{fontSize:22,fontWeight:900,color:'#0f172a',margin:0}}>
            Employment Category
          </h2>
          <Pill color="blue">11 Categories</Pill>
          <Pill color="green">Nepal Labour Act 2074 Compliant</Pill>
          <Pill color="purple">🧠 AI-Driven</Pill>
          {expiringTotal>0 && (
            <span style={{background:'#fef2f2',color:'#dc2626',fontSize:11,fontWeight:700,
              padding:'3px 10px',borderRadius:20,border:'1px solid #fecaca',
              animation:'pulse 2s infinite'}}>
              ⚠️ {expiringTotal} Contracts Expiring
            </span>
          )}
        </div>
        <p style={{fontSize:12,color:'#94a3b8',margin:'5px 0 0'}}>
          Two-tier taxonomy · Labour Act 2074 Section 10 · Global best practice (Workday/Oracle standard)
        </p>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:2,background:'#f1f5f9',padding:4,
        borderRadius:12,marginBottom:20,border:'1px solid #e2e8f0'}}>
        {[
          {id:'categories',  label:'📋 Categories'},
          {id:'headcount',   label:'👥 Headcount'},
          {id:'nepal_law',   label:'⚖️ Nepal Law'},
        ].map(t=>(
          <button key={t.id} onClick={()=>setActiveTab(t.id)}
            style={{flex:1,padding:'8px',borderRadius:9,border:'none',
              background:activeTab===t.id?'#fff':'transparent',
              color:activeTab===t.id?'#0f172a':'#64748b',
              fontWeight:activeTab===t.id?700:400,fontSize:12,cursor:'pointer',
              boxShadow:activeTab===t.id?'0 1px 4px rgba(0,0,0,.08)':'none'}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── CATEGORIES TAB ── */}
      {activeTab==='categories' && (
        <div>
          {/* Summary stats */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:16}}>
            {[
              {icon:'👥', label:'Total Headcount', value:totalHeadcount.toLocaleString(), color:'#3b82f6'},
              {icon:'💼', label:'On Payroll',       value:onPayroll.toLocaleString(),     color:'#10b981'},
              {icon:'📊', label:'Total FTE',        value:totalFTE.toFixed(1),            color:'#8b5cf6'},
              {icon:'⚠️', label:'Expiring ≤60d',    value:expiringTotal,                  color: expiringTotal>0?'#ef4444':'#10b981'},
            ].map((s,i)=>(
              <div key={i} style={{background:'#fff',border:`1px solid #e2e8f0`,
                borderRadius:10,padding:'12px 14px',borderLeft:`3px solid ${s.color}`}}>
                <div style={{fontSize:20,marginBottom:3}}>{s.icon}</div>
                <div style={{fontSize:20,fontWeight:900,color:'#0f172a'}}>{s.value}</div>
                <div style={{fontSize:10,color:'#94a3b8',fontWeight:600}}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Group filter */}
          <div style={{display:'flex',gap:6,marginBottom:14,flexWrap:'wrap'}}>
            {GROUPS.map(g=>(
              <button key={g.id} onClick={()=>setActiveGroup(g.id)}
                style={{padding:'6px 14px',borderRadius:20,fontSize:11,fontWeight:600,
                  border:`1px solid ${activeGroup===g.id?g.color:'#e2e8f0'}`,
                  background:activeGroup===g.id?`${g.color}15`:'#fff',
                  color:activeGroup===g.id?g.color:'#64748b',cursor:'pointer'}}>
                {g.icon} {g.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div style={{position:'relative',marginBottom:14}}>
            <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',
              fontSize:14,color:'#94a3b8'}}>🔍</span>
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Search categories..."
              style={{width:'100%',padding:'9px 14px 9px 36px',borderRadius:9,
                border:'1px solid #e2e8f0',fontSize:12,outline:'none',
                boxSizing:'border-box'}}/>
          </div>

          {/* Category cards */}
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {filtered.map(cat=>(
              <div key={cat.id}
                style={{background:'#fff',border:`1px solid ${cat.expiring_soon>0?'#fecaca':'#e2e8f0'}`,
                  borderRadius:12,padding:'14px 16px',cursor:'pointer',
                  borderLeft:`4px solid ${cat.color}`,
                  boxShadow:cat.expiring_soon>0?'0 0 0 2px rgba(239,68,68,.08)':'none',
                  transition:'all .2s'}}
                onClick={()=>setSelectedCat(cat)}
                onMouseEnter={e=>e.currentTarget.style.boxShadow='0 6px 18px rgba(0,0,0,.09)'}
                onMouseLeave={e=>e.currentTarget.style.boxShadow=cat.expiring_soon>0?'0 0 0 2px rgba(239,68,68,.08)':'none'}>
                <div style={{display:'flex',alignItems:'center',gap:12}}>
                  {/* Icon */}
                  <div style={{width:46,height:46,borderRadius:12,
                    background:`${cat.color}18`,
                    display:'flex',alignItems:'center',justifyContent:'center',
                    fontSize:22,flexShrink:0,border:`1px solid ${cat.color}30`}}>
                    {cat.icon}
                  </div>

                  {/* Info */}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap',marginBottom:3}}>
                      <span style={{fontSize:13,fontWeight:800,color:'#0f172a'}}>{cat.name}</span>
                      <span style={{fontSize:11,color:'#94a3b8'}}>({cat.name_nepali})</span>
                      <Pill color={cat.group==='internal'?'green':cat.group==='contingent'?'yellow':'gray'}>
                        {cat.group}
                      </Pill>
                      <Pill color={cat.ai_risk==='low'?'green':cat.ai_risk==='medium'?'yellow':'red'}>
                        {cat.ai_risk} risk
                      </Pill>
                    </div>
                    <div style={{fontSize:11,color:'#64748b'}}>
                      {cat.code} · {cat.nepal_law} · {cat.tier1} · {cat.payroll_type} payroll
                    </div>
                    <div style={{display:'flex',gap:8,marginTop:5,flexWrap:'wrap'}}>
                      <span style={{fontSize:10,color:'#94a3b8'}}>
                        FTE: <strong>{cat.fte_value.toFixed(2)}</strong>
                      </span>
                      {cat.std_hours && (
                        <span style={{fontSize:10,color:'#94a3b8'}}>
                          {cat.std_hours}hrs/wk
                        </span>
                      )}
                      {cat.max_days_month && (
                        <span style={{fontSize:10,color:'#d97706'}}>
                          Max {cat.max_days_month} days/month
                        </span>
                      )}
                      {cat.probation_months && (
                        <span style={{fontSize:10,color:'#6d28d9'}}>
                          Probation: {cat.probation_months}mo
                        </span>
                      )}
                      {!cat.is_on_payroll && (
                        <Pill color="orange">Via Accounts Payable</Pill>
                      )}
                      {!cat.written_contract && (
                        <Pill color="yellow">No Written Contract Required</Pill>
                      )}
                    </div>
                  </div>

                  {/* Right stats */}
                  <div style={{display:'flex',flexDirection:'column',
                    alignItems:'flex-end',gap:5,flexShrink:0}}>
                    <div style={{fontSize:20,fontWeight:800,color:cat.color}}>
                      {cat.headcount}
                    </div>
                    <div style={{fontSize:10,color:'#94a3b8'}}>employees</div>
                    {cat.expiring_soon>0 && (
                      <span style={{background:'#fef2f2',color:'#dc2626',
                        border:'1px solid #fecaca',padding:'2px 8px',
                        borderRadius:20,fontSize:10,fontWeight:700}}>
                        ⚠️ {cat.expiring_soon} expiring
                      </span>
                    )}
                    <span style={{fontSize:11,color:'#94a3b8'}}>→</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── HEADCOUNT TAB ── */}
      {activeTab==='headcount' && (
        <div>
          <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,
            padding:'16px 18px',marginBottom:16}}>
            <div style={{fontSize:13,fontWeight:800,color:'#0f172a',marginBottom:14}}>
              👥 Headcount by Employment Category — {totalHeadcount.toLocaleString()} Total
            </div>
            {EMPLOYMENT_CATEGORIES.sort((a,b)=>b.headcount-a.headcount).map((cat,i)=>(
              <div key={i} style={{marginBottom:12}}>
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:4}}>
                  <span style={{fontSize:16,flexShrink:0}}>{cat.icon}</span>
                  <span style={{flex:1,fontSize:12,fontWeight:600,color:'#334155'}}>
                    {cat.name}
                  </span>
                  <span style={{fontSize:12,fontWeight:800,color:cat.color}}>
                    {cat.headcount}
                  </span>
                  <span style={{fontSize:10,color:'#94a3b8',width:35,textAlign:'right'}}>
                    {Math.round(cat.headcount*100/totalHeadcount)}%
                  </span>
                </div>
                <div style={{height:8,background:'#f1f5f9',borderRadius:8,overflow:'hidden'}}>
                  <div style={{width:`${cat.headcount*100/totalHeadcount}%`,
                    height:'100%',background:cat.color,borderRadius:8,transition:'width .5s'}}/>
                </div>
              </div>
            ))}
          </div>

          {/* FTE summary */}
          <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,
            padding:'16px 18px'}}>
            <div style={{fontSize:13,fontWeight:800,color:'#0f172a',marginBottom:12}}>
              📊 FTE Report — Total FTE: {totalFTE.toFixed(1)}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
              {EMPLOYMENT_CATEGORIES.filter(c=>c.counts_headcount).map((cat,i)=>(
                <div key={i} style={{background:'#f8fafc',borderRadius:8,padding:'8px 10px',
                  borderLeft:`3px solid ${cat.color}`}}>
                  <div style={{fontSize:11,color:'#64748b'}}>{cat.name}</div>
                  <div style={{fontSize:14,fontWeight:800,color:cat.color,marginTop:2}}>
                    {(cat.fte_value * cat.headcount).toFixed(1)} FTE
                  </div>
                  <div style={{fontSize:10,color:'#94a3b8'}}>
                    {cat.headcount} × {cat.fte_value.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── NEPAL LAW TAB ── */}
      {activeTab==='nepal_law' && (
        <div>
          <div style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:12,
            padding:'14px 16px',marginBottom:16}}>
            <div style={{fontSize:14,fontWeight:800,color:'#92400e',marginBottom:8}}>
              ⚖️ Nepal Labour Act 2074 (2017) — Employment Category Reference
            </div>
            <div style={{fontSize:12,color:'#78350f',lineHeight:1.6}}>
              Under Section 10 of the Nepal Labour Act 2074, employers may engage workers
              in any of 5 legal employment categories. All categories (except casual) require
              a written contract. The Act also regulates probation (max 6 months),
              minimum wage (NPR 15,000/month), working hours (max 48/week), and
              overtime (max 24 hrs/week at 1.5x rate).
            </div>
          </div>

          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {[
              {section:'10(a)', category:'Regular Employment', nepali:'नियमित', max_hours:'48/week', max_days:null, written:true, pf:true, gratuity:true, color:'#10b981',
               desc:'Continuous, open-ended employment with no predefined end date. Full statutory benefits including gratuity (8.33%), PF (10%), SSF, medical, and all leave entitlements.'},
              {section:'10(b)', category:'Work-Based Employment', nepali:'कार्य-आधारित', max_hours:'48/week', max_days:null, written:true, pf:true, gratuity:false, color:'#8b5cf6',
               desc:'Employment tied to a specific task, project, or service. Contract terminates naturally on completion of the assigned work.'},
              {section:'10(c)', category:'Time-Bound Employment', nepali:'समय-सीमित', max_hours:'48/week', max_days:null, written:true, pf:true, gratuity:false, color:'#06b6d4',
               desc:'Fixed duration employment for a defined period. Ends automatically at period expiry. Can be extended by mutual agreement.'},
              {section:'10(d)', category:'Casual Employment', nepali:'अनियमित', max_hours:'Ad-hoc', max_days:7, written:false, pf:false, gratuity:false, color:'#f97316',
               desc:'Workers hired for 7 days or fewer per month. Only category where written contract is NOT required. Either party can terminate at will. No PF/SSF required.'},
              {section:'10(e)', category:'Part-Time Employment', nepali:'अल्पकालीन', max_hours:'35/week MAX', max_days:null, written:true, pf:true, gratuity:false, color:'#84cc16',
               desc:'Workers engaged for 35 hours or less per week. Entitled to proportional wages and social security benefits. Cannot be prohibited from secondary employment unless agreed in writing.'},
              {section:'Probation', category:'Probationary Period', nepali:'परीक्षाकाल', max_hours:'48/week', max_days:null, written:true, pf:true, gratuity:false, color:'#f59e0b',
               desc:'Maximum 6 months probation for new employees. If unsatisfactory, employer can terminate during probation. Must confirm in writing upon successful completion.'},
              {section:'Intern', category:'Interns (Educational)', nepali:'इन्टर्न', max_hours:'Per syllabus', max_days:null, written:true, pf:false, gratuity:false, color:'#3b82f6',
               desc:'Students on approved educational institution programs. Basic safety and medical protections apply. Not subject to full employment benefits provided they stick to academic tasks.'},
            ].map((law,i)=>(
              <div key={i} style={{background:'#fff',border:`1px solid ${law.color}30`,
                borderRadius:11,padding:'14px 16px',borderLeft:`4px solid ${law.color}`}}>
                <div style={{display:'flex',alignItems:'flex-start',gap:10}}>
                  <div style={{flexShrink:0,textAlign:'center'}}>
                    <div style={{background:`${law.color}18`,color:law.color,
                      fontSize:10,fontWeight:800,padding:'3px 8px',borderRadius:8,
                      border:`1px solid ${law.color}40`,whiteSpace:'nowrap'}}>
                      {law.section}
                    </div>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:800,color:'#0f172a',marginBottom:2}}>
                      {law.category} <span style={{fontSize:11,color:'#94a3b8',fontWeight:400}}>({law.nepali})</span>
                    </div>
                    <div style={{fontSize:11,color:'#64748b',lineHeight:1.65,marginBottom:8}}>
                      {law.desc}
                    </div>
                    <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                      <Pill color="gray">⏰ {law.max_hours}</Pill>
                      {law.max_days && <Pill color="orange">Max {law.max_days} days/month</Pill>}
                      <Pill color={law.written?'blue':'yellow'}>
                        {law.written?'✍️ Written Contract Required':'📝 No Contract Required'}
                      </Pill>
                      <Pill color={law.pf?'green':'red'}>{law.pf?'✓ PF Required':'✗ No PF'}</Pill>
                      <Pill color={law.gratuity?'green':'gray'}>{law.gratuity?'✓ Gratuity':'✗ No Gratuity'}</Pill>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:12,
            padding:'14px 16px',marginTop:16}}>
            <div style={{fontSize:12,fontWeight:800,color:'#15803d',marginBottom:8}}>
              📋 Key Nepal Labour Act 2074 Numbers
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              {[
                ['Minimum Wage (2081 BS)',    'NPR 15,000 / month'],
                ['Max Working Hours',         '48 hours / week'],
                ['Max Overtime',              '24 hours / week at 1.5x'],
                ['Max Probation Period',      '6 months'],
                ['Max Casual Days',           '7 days / month'],
                ['Max Part-Time Hours',       '35 hours / week'],
                ['Foreign Worker Quota',      'Max 5% of workforce'],
                ['PF Contribution',           '10% employer + 10% employee'],
              ].map(([label, value],i)=>(
                <div key={i} style={{background:'#fff',borderRadius:8,padding:'8px 10px',
                  display:'flex',justifyContent:'space-between',fontSize:11}}>
                  <span style={{color:'#64748b'}}>{label}</span>
                  <span style={{fontWeight:700,color:'#15803d'}}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedCat && (
        <CategoryDetailModal
          cat={selectedCat}
          onClose={()=>setSelectedCat(null)}
        />
      )}

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.7}}`}</style>
    </div>
  )
}
