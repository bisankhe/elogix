// FILE: PermissionMatrixPage.jsx
// Permission Matrix with submodule-level granularity:
// Role -> expand -> Module -> expand (+) -> Submodule rows
// Each row: View / Edit / Delete / Create / Forward / Approve / Report + Scope
import { resolveTenantAccess, getSessionSlug, getTenantPermissionRecord, getTenantModules } from '../../../utils/tenantPermissions.js'
import AccessDenied from '../../shared/AccessDenied.jsx'
import { useState, useEffect, useCallback } from 'react'
import { PageHeader, AIImpact, SearchBar } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#1e1b4b 0%,#4338ca 60%,#818cf8 100%)'
const A = '#4338ca'

const ACTIONS = [
  { key:'can_view',    label:'View',    color:'#0284c7' },
  { key:'can_edit',    label:'Edit',    color:'#15803d' },
  { key:'can_delete',  label:'Delete',  color:'#dc2626' },
  { key:'can_create',  label:'Create',  color:'#7c3aed' },
  { key:'can_forward', label:'Forward', color:'#c2410c' },
  { key:'can_approve', label:'Approve', color:'#b45309' },
  { key:'can_report',  label:'Report',  color:'#0891b2' },
]
const SCOPES = ['none','own','team','department','branch','all']

// ── Real modules with their actual submodule pages from sidebarMenu.js ──
const MODULES = [
  { key:'dashboard', label:'Dashboard & Workspace', sensitive:false, submodules:[
    {id:'super-admin-dashboard',label:'Super Admin Dashboard'},
    {id:'executive-dashboard',label:'Executive Dashboard'},
    {id:'hr-dashboard',label:'HR Manager Dashboard'},
    {id:'department-dashboard',label:'Department Head Dashboard'},
    {id:'employee-dashboard',label:'Employee Dashboard (ESS)'},
    {id:'finance-dashboard',label:'Finance Workspace'},
    {id:'it-admin-dashboard',label:'IT Administrator Workspace'},
    {id:'notifications',label:'Notifications & Alerts'},
    {id:'quick-actions',label:'Quick Actions'},
    {id:'ai-insights',label:'AI Insights'},
    {id:'calendar-events',label:'Calendar with Events'},
    {id:'payroll-snapshot',label:'Payroll Snapshot'},
    {id:'attendance-snapshot',label:'Attendance Snapshot'},
    {id:'leave-snapshot',label:'Leave Snapshot'},
    {id:'performance-snapshot',label:'Performance Snapshot'},
    {id:'recruitment-snapshot',label:'Recruitment Snapshot'},
  ]},
  { key:'employee_database', label:'Employee Database', sensitive:true, submodules:[
    {id:'employee-directory',label:'Employee Directory'},
    {id:'employee-profile',label:'Employee Profile'},
    {id:'personal-information',label:'Personal Information'},
    {id:'family-details',label:'Family Details'},
    {id:'emergency-contact',label:'Emergency Contact'},
    {id:'employment-history',label:'Employment History'},
    {id:'document-management',label:'Document Management'},
    {id:'contract-management',label:'Contract Management'},
    {id:'digital-employee-file',label:'Digital Employee File'},
    {id:'employee-timeline',label:'Employee Timeline'},
    {id:'promotion-history',label:'Promotion History'},
    {id:'transfer-history',label:'Transfer History'},
    {id:'disciplinary-records',label:'Disciplinary Records'},
    {id:'ai-hr-letters',label:'AI Driven HR Letters'},
  ]},
  { key:'recruitment', label:'Recruitment & Hiring', sensitive:false, submodules:[
    {id:'ats-dashboard',label:'ATS Dashboard'},
    {id:'manpower-requisition',label:'Manpower Requisition'},
    {id:'vacancy-management',label:'Vacancy Management'},
    {id:'job-posting',label:'Job Posting'},
    {id:'resume-screening',label:'Resume Screening (AI)'},
    {id:'candidate-database',label:'Candidate Database'},
    {id:'interview-scheduling',label:'Interview Scheduling'},
    {id:'interview-management',label:'Interview Management'},
    {id:'offer-management',label:'Offer Management'},
    {id:'background-verification',label:'Background Verification'},
    {id:'talent-pool',label:'Talent Pool'},
    {id:'hiring-approval-workflow',label:'Hiring Approval Workflow'},
    {id:'recruitment-analytics',label:'Recruitment Analytics'},
    {id:'career-portal',label:'Career Portal'},
    {id:'recruitment-campaign',label:'Recruitment Campaign'},
    {id:'campus-hiring',label:'Campus Hiring'},
  ]},
  { key:'attendance', label:'Attendance Management', sensitive:false, submodules:[
    {id:'attendance-policy',label:'Attendance Policy'},
    {id:'shift-management',label:'Shift Management'},
    {id:'roster-management',label:'Roster Management'},
    {id:'live-attendance',label:'Live Attendance'},
    {id:'biometric-attendance',label:'Biometric Attendance'},
    {id:'geo-attendance',label:'Geo Attendance'},
    {id:'web-check-in',label:'Web Check-In & Out'},
    {id:'mobile-attendance-tracking',label:'Mobile Attendance'},
    {id:'missed-punch',label:'Missed Punch Request'},
    {id:'wfh-tracking',label:'Work From Home Tracking'},
    {id:'field-visit-tracking',label:'Field Visit Tracking'},
    {id:'overtime-monitoring-dashboard',label:'Overtime & Monitoring'},
    {id:'late-early-tracking',label:'Late & Early Tracking'},
    {id:'attendance-regularization',label:'Attendance Regularization'},
    {id:'attendance-processing',label:'Attendance Processing'},
    {id:'attendance-approval',label:'Attendance Approval'},
    {id:'attendance-analytics',label:'Attendance Analytics'},
    {id:'attendance-reports',label:'Attendance Reports'},
  ]},
  { key:'leave', label:'Leave Management', sensitive:false, submodules:[
    {id:'leave-setup',label:'Leave Setup'},
    {id:'leave-policy',label:'Leave Policy'},
    {id:'leave-type',label:'Leave Type'},
    {id:'leave-balance-rule',label:'Leave Balance Rule'},
    {id:'leave-request',label:'Leave Request'},
    {id:'leave-approval',label:'Leave Approval'},
    {id:'leave-balance',label:'Leave Balance'},
    {id:'leave-calendar',label:'Leave Calendar'},
    {id:'holiday-management',label:'Holiday Management'},
    {id:'half-day-leave',label:'Half-Day Leave'},
    {id:'leave-adjustment',label:'Leave Adjustment'},
    {id:'leave-encashment',label:'Leave Encashment'},
    {id:'compensatory-leave',label:'Compensatory Leave'},
    {id:'leave-analytics',label:'Leave Analytics'},
    {id:'leave-reports',label:'Leave Reports'},
  ]},
  { key:'payroll', label:'Payroll & Compensation', sensitive:true, submodules:[
    {id:'payroll-setup',label:'Payroll Setup'},
    {id:'salary-structure',label:'Salary Structure'},
    {id:'allowance-setup',label:'Allowance'},
    {id:'deduction-setup',label:'Deduction'},
    {id:'tax-setup',label:'Tax Setup'},
    {id:'automated-payroll',label:'Automated Payroll'},
    {id:'overtime-calculation',label:'Overtime Calculation'},
    {id:'bonus-processing',label:'Bonus Processing'},
    {id:'incentive-processing',label:'Incentive Processing'},
    {id:'loan-management',label:'Loan Management'},
    {id:'advance-salary',label:'Advance Salary'},
    {id:'payroll-approval',label:'Payroll Approval'},
    {id:'payslip-generation',label:'Payslip Generation'},
    {id:'bank-transfer-file',label:'Bank Transfer File'},
    {id:'final-settlement',label:'Final Settlement'},
    {id:'tax-compliance',label:'Tax & Compliance'},
    {id:'compensation-analytics',label:'Compensation Analytics'},
    {id:'payroll-reports',label:'Payroll Reports'},
  ]},
  { key:'performance', label:'Performance & Talent', sensitive:false, submodules:[
    {id:'kra-management',label:'KRA Management'},
    {id:'kpi-management',label:'KPI Management'},
    {id:'okr-management',label:'OKR Management'},
    {id:'goal-assignment',label:'Goal Assignment'},
    {id:'goal-tracking',label:'Goal Tracking'},
    {id:'performance-appraisal',label:'Performance Appraisal'},
    {id:'360-pms',label:'360 Degree PMS'},
    {id:'continuous-feedback',label:'Continuous Feedback'},
    {id:'behaviour-evaluation',label:'Behaviour Evaluation'},
    {id:'performance-review',label:'Performance Review'},
    {id:'pip-management',label:'PIP Management'},
    {id:'reward-program',label:'Reward Program'},
    {id:'promotion-recommendation',label:'Promotion Recommendation'},
    {id:'performance-dashboard',label:'Performance Dashboard'},
    {id:'goal-achievement',label:'Goal Achievement'},
    {id:'productivity-analytics',label:'Productivity Analytics'},
  ]},
  { key:'learning_development', label:'Learning & Development', sensitive:false, submodules:[
    {id:'skill-gap-matrix',label:'Skill Gap Matrix'},
    {id:'training-needs-analysis',label:'Training Needs Analysis'},
    {id:'annual-training-calendar',label:'Training Calendar'},
    {id:'course-management',label:'Course Management'},
    {id:'learning-portal',label:'Learning Portal'},
    {id:'elearning-management',label:'E-Learning Management'},
    {id:'generate-certificate',label:'Generate Certificate'},
    {id:'certification-tracking',label:'Certification Tracking'},
    {id:'training-feedback',label:'Training Feedback'},
    {id:'training-roi',label:'ROI on Training'},
    {id:'assessment-quiz',label:'Assessment & Quiz'},
    {id:'training-participation',label:'Training Participation'},
    {id:'career-pathing',label:'Career Pathing'},
    {id:'leadership-development',label:'Leadership Development'},
    {id:'hipo-employees',label:'HiPo Employees'},
  ]},
  { key:'employee_experience', label:'Employee Experience & Culture', sensitive:false, submodules:[
    {id:'engagement-dashboard',label:'Engagement Dashboard'},
    {id:'announcement-board',label:'Announcement Board'},
    {id:'employee-survey',label:'Employee Survey'},
    {id:'suggestion-box',label:'Suggestion Box'},
    {id:'employee-events',label:'Employee Events'},
    {id:'appreciation-program',label:'Appreciation Program'},
    {id:'grievance-management',label:'Grievance Management'},
    {id:'disciplinary-management',label:'Disciplinary Management'},
    {id:'warning-letter',label:'Warning Letter'},
    {id:'wellness-program',label:'Wellness Program'},
    {id:'mental-health-support',label:'Mental Health Support'},
    {id:'diversity-dashboard',label:'Diversity Dashboard'},
    {id:'dei-training',label:'DEI Training'},
  ]},
  { key:'finance_assets', label:'Finance, Assets & Admin', sensitive:true, submodules:[
    {id:'annual-hr-budget',label:'Annual HR Budget'},
    {id:'department-budget',label:'Department Budget'},
    {id:'budget-forecasting',label:'Budget Forecasting'},
    {id:'budget-variance-analysis',label:'Budget Variance Analysis'},
    {id:'asset-management',label:'Asset Management'},
    {id:'it-inventory',label:'IT Inventory'},
    {id:'asset-allocation-fin',label:'Asset Allocation'},
    {id:'asset-return',label:'Asset Return'},
    {id:'qr-barcode-tracking',label:'QR / Barcode Tracking'},
    {id:'visitor-management',label:'Visitor Management'},
    {id:'meeting-room-booking',label:'Meeting Room Booking'},
    {id:'travel-management',label:'Travel Management'},
    {id:'expense-claims',label:'Expense Claims'},
    {id:'reimbursement',label:'Reimbursement'},
    {id:'petty-cash',label:'Petty Cash Claim'},
    {id:'gate-pass',label:'Gate Pass Management'},
    {id:'facility-management',label:'Facility Management'},
  ]},
  { key:'compliance_risk', label:'Compliance & Risk', sensitive:true, submodules:[
    {id:'hr-policies',label:'HR Policy Library'},
    {id:'labor-compliance',label:'Labor Compliance'},
    {id:'statutory-compliance',label:'Statutory Compliance'},
    {id:'hr-audit-management',label:'HR Audit Management'},
    {id:'annual-labour-audit',label:'Annual Labour Audit'},
    {id:'license-management',label:'License Management'},
    {id:'kri-dashboard',label:'KRI Dashboard'},
    {id:'compliance-risk',label:'Compliance Risk'},
    {id:'payroll-risk',label:'Payroll Risk'},
    {id:'attrition-risk',label:'Attrition Risk'},
    {id:'security-risk',label:'Security Risk'},
    {id:'risk-alerts',label:'Risk Alerts'},
    {id:'legal-case-tracking',label:'Legal Case Tracking'},
    {id:'contract-compliance',label:'Contract Compliance'},
    {id:'ethics-governance',label:'Ethics & Governance'},
  ]},
  { key:'reports_analytics', label:'Reports, Analytics & BI', sensitive:false, submodules:[
    {id:'hr-analytics-page',label:'HR Analytics'},
    {id:'workforce-summary',label:'Workforce Summary'},
    {id:'department-reports',label:'Department Reports'},
    {id:'attendance-reports-page',label:'Attendance Reports'},
    {id:'payroll-reports-std',label:'Payroll Reports'},
    {id:'performance-reports-page',label:'Performance Reports'},
    {id:'leave-reports-page',label:'Leave Reports'},
    {id:'recruitment-reports',label:'Recruitment Reports'},
    {id:'headcount-analysis-page',label:'Headcount Analysis'},
    {id:'attrition-analysis',label:'Attrition Analysis'},
    {id:'cost-analysis',label:'Cost Analysis'},
    {id:'vendor-billing-report',label:'Vendor Billing Report'},
    {id:'compliance-reports',label:'Compliance Reports'},
    {id:'workforce-analytics',label:'Workforce Analytics'},
    {id:'predictive-analytics-page',label:'Predictive Analytics'},
    {id:'bi-dashboard',label:'BI Dashboard'},
    {id:'custom-report-builder',label:'Custom Report Builder'},
    {id:'export-center',label:'Export Center'},
  ]},
  { key:'hr_services', label:'HR Services & Support', sensitive:false, submodules:[
    {id:'hr-ticketing',label:'HR Ticketing System'},
    {id:'employee-queries',label:'Employee Queries'},
    {id:'letter-request',label:'Letter Request'},
    {id:'my-policies',label:'My HR Policies'},
    {id:'my-attendance-ess',label:'My Attendance (ESS)'},
    {id:'my-leave-ess',label:'My Leave (ESS)'},
    {id:'my-payroll-ess',label:'My Payroll (ESS)'},
    {id:'payslip-download',label:'Payslip Download'},
    {id:'my-goals-kpi',label:'My Goals & KPI'},
    {id:'my-training-ess',label:'My Training'},
    {id:'my-requests',label:'My Requests'},
    {id:'my-feedback-ess',label:'My Feedback'},
    {id:'my-resignation',label:'My Resignation'},
    {id:'helpdesk-ticket',label:'Helpdesk & Ticket'},
    {id:'approval-center',label:'Approval Center'},
    {id:'team-attendance',label:'Team Attendance (MSS)'},
    {id:'team-performance-mss',label:'Team Performance (MSS)'},
    {id:'overtime-forward',label:'Overtime Forward (MSS)'},
    {id:'forward-cash-advance',label:'Forward Cash Advance (MSS)'},
  ]},
  { key:'system_admin', label:'System Administration', sensitive:true, submodules:[
    {id:'user-management',label:'User Management'},
    {id:'role-permission',label:'Role & Permission'},
    {id:'permission-matrix',label:'Permission Matrix'},
    {id:'access-control',label:'Access Control'},
    {id:'menu-management',label:'Menu Management'},
    {id:'workflow-builder',label:'Workflow Builder'},
    {id:'approval-matrix',label:'Approval Matrix'},
    {id:'multi-level-approval',label:'Multi-Level Approval'},
    {id:'notification-engine',label:'Notification Engine'},
    {id:'escalation-rules',label:'Escalation Rules'},
    {id:'automation-rules',label:'Automation Rules'},
    {id:'api-integration',label:'API & Third Party Integration'},
    {id:'email-sms-integration',label:'Email & SMS Integration'},
    {id:'security-settings',label:'Security Settings'},
    {id:'audit-logs',label:'Audit Logs'},
    {id:'device-integration',label:'Device Integration'},
    {id:'backup-restore',label:'Backup & Restore'},
    {id:'system-setting',label:'System Setting'},
    {id:'data-migration',label:'Data Migration'},
  ]},
]

const ALL_ROLES = [
  { role_key:'super_admin',          label:'Super Admin',             group:'Administration', sod:true },
  { role_key:'it_admin',             label:'IT Administrator',        group:'Administration', sod:true },
  { role_key:'hr_manager',           label:'HR Manager',              group:'Administration', sod:true },
  { role_key:'hr_officer',           label:'HR Officer',              group:'Administration', sod:false },
  { role_key:'executive',            label:'Executive',               group:'Leadership',     sod:false },
  { role_key:'department_head',      label:'Department Head (MSS)',   group:'Leadership',     sod:false },
  { role_key:'branch_unit',          label:'Branch / Section / Unit', group:'Leadership',     sod:false },
  { role_key:'finance',              label:'Finance',                 group:'Operations',     sod:true },
  { role_key:'procurement',          label:'Procurement',             group:'Operations',     sod:false },
  { role_key:'admin_officer',        label:'Admin Officer',           group:'Operations',     sod:false },
  { role_key:'operations',           label:'Operations',              group:'Operations',     sod:false },
  { role_key:'recruitment_officer',  label:'Recruitment Officer',     group:'Talent',         sod:false },
  { role_key:'recruitment_agency',   label:'Recruitment Agency',      group:'Talent',         sod:false },
  { role_key:'learning_development', label:'Learning & Development',  group:'Talent',         sod:false },
  { role_key:'sales',                label:'Sales',                   group:'Customer-Facing',sod:false },
  { role_key:'customer_service',     label:'Customer Service',        group:'Customer-Facing',sod:false },
  { role_key:'marketing',            label:'Marketing',               group:'Customer-Facing',sod:false },
  { role_key:'legal',                label:'Legal',                   group:'Customer-Facing',sod:false },
  { role_key:'employee',             label:'Employee (ESS)',          group:'Self-Service',   sod:false },
]

const EMPTY_CELL = { can_view:false, can_edit:false, can_delete:false, can_create:false, can_forward:false, can_approve:false, can_report:false, scope:'none' }

// Default posture per role (module-level) -- submodules inherit unless overridden
const ROLE_DEFAULTS = {
  super_admin:          { can_view:true, can_edit:true, can_delete:true, can_create:true, can_forward:true, can_approve:true, can_report:true, scope:'all' },
  it_admin:             { can_view:true, can_edit:true, can_delete:false, can_create:true, can_forward:false, can_approve:false, can_report:true, scope:'all' },
  hr_manager:           { can_view:true, can_edit:true, can_delete:false, can_create:true, can_forward:true, can_approve:true, can_report:true, scope:'all' },
  hr_officer:           { can_view:true, can_edit:true, can_delete:false, can_create:true, can_forward:false, can_approve:false, can_report:false, scope:'all' },
  executive:            { can_view:true, can_edit:false, can_delete:false, can_create:false, can_forward:false, can_approve:false, can_report:true, scope:'all' },
  department_head:      { can_view:true, can_edit:false, can_delete:false, can_create:false, can_forward:true, can_approve:true, can_report:false, scope:'department' },
  branch_unit:          { can_view:true, can_edit:false, can_delete:false, can_create:false, can_forward:false, can_approve:false, can_report:false, scope:'branch' },
  finance:              { can_view:true, can_edit:true, can_delete:false, can_create:true, can_forward:true, can_approve:true, can_report:true, scope:'all' },
  procurement:          { can_view:true, can_edit:true, can_delete:false, can_create:true, can_forward:false, can_approve:false, can_report:false, scope:'all' },
  admin_officer:        { can_view:true, can_edit:true, can_delete:false, can_create:true, can_forward:false, can_approve:false, can_report:false, scope:'all' },
  operations:           { can_view:true, can_edit:false, can_delete:false, can_create:false, can_forward:true, can_approve:false, can_report:false, scope:'all' },
  recruitment_officer:  { can_view:true, can_edit:true, can_delete:false, can_create:true, can_forward:false, can_approve:true, can_report:false, scope:'all' },
  recruitment_agency:   { can_view:true, can_edit:true, can_delete:false, can_create:false, can_forward:false, can_approve:false, can_report:false, scope:'own' },
  learning_development: { can_view:true, can_edit:true, can_delete:false, can_create:true, can_forward:false, can_approve:false, can_report:false, scope:'all' },
  sales:                { can_view:true, can_edit:false, can_delete:false, can_create:false, can_forward:false, can_approve:false, can_report:false, scope:'team' },
  customer_service:     { can_view:true, can_edit:true, can_delete:false, can_create:false, can_forward:false, can_approve:false, can_report:false, scope:'all' },
  marketing:            { can_view:true, can_edit:true, can_delete:false, can_create:true, can_forward:false, can_approve:false, can_report:false, scope:'none' },
  legal:                { can_view:true, can_edit:true, can_delete:false, can_create:false, can_forward:true, can_approve:true, can_report:false, scope:'all' },
  employee:             { can_view:true, can_edit:false, can_delete:false, can_create:false, can_forward:false, can_approve:false, can_report:false, scope:'own' },
}
const BLOCKED = { ...EMPTY_CELL }
const PAYROLL_BLOCKED = ['employee','sales','customer_service','marketing','legal','operations','procurement','admin_officer','recruitment_officer','recruitment_agency','it_admin']
const SYS_BLOCKED = ['employee','sales','customer_service','marketing','legal','operations','finance','procurement','admin_officer','recruitment_officer','recruitment_agency','learning_development','department_head','branch_unit','hr_officer','executive']

function buildMatrix(){
  const m = {}
  ALL_ROLES.forEach(r => {
    MODULES.forEach(mod => {
      const base = { ...(ROLE_DEFAULTS[r.role_key] || EMPTY_CELL) }
      // Module-level block overrides
      if (mod.key==='payroll' && PAYROLL_BLOCKED.includes(r.role_key)) Object.assign(base, BLOCKED)
      if (mod.key==='system_admin' && SYS_BLOCKED.includes(r.role_key)) Object.assign(base, BLOCKED)
      if (mod.key==='finance_assets' && ['employee','sales','customer_service','marketing'].includes(r.role_key)) Object.assign(base, BLOCKED)
      if (mod.key==='employee_database' && ['sales','customer_service','marketing'].includes(r.role_key)) Object.assign(base, BLOCKED)
      m[`${r.role_key}::${mod.key}`] = base
      // Submodule level -- inherit from module by default
      mod.submodules.forEach(sub => {
        m[`${r.role_key}::${mod.key}::${sub.id}`] = { ...base }
      })
    })
  })
  return m
}

// ── Permission Row ──
function PermRow({ label, cellKey, matrix, onToggle, onScope, isEditor, isSub }){
  const cell = matrix[cellKey] || { ...EMPTY_CELL }
  return(
    <tr style={{borderBottom:'1px solid #f8fafc', background: isSub ? '#fafafa' : '#fff'}}>
      <td style={{padding: isSub ? '6px 8px 6px 28px' : '8px 10px', fontWeight: isSub ? 400 : 600, color: isSub ? '#475569' : '#0f172a', fontSize: isSub ? 9 : 10, whiteSpace:'nowrap', maxWidth:240, overflow:'hidden', textOverflow:'ellipsis'}}>
        {isSub && <span style={{color:'#cbd5e1',marginRight:6}}>└</span>}{label}
      </td>
      {ACTIONS.map(a=>(
        <td key={a.key} style={{padding:'6px 4px',textAlign:'center'}}>
          <input type="checkbox" checked={!!cell[a.key]}
            onChange={()=>onToggle(cellKey, a.key)}
            disabled={!isEditor}
            title={`${a.label}: ${label}`}
            style={{width:15,height:15,accentColor:a.color,cursor:isEditor?'pointer':'default'}}/>
        </td>
      ))}
      <td style={{padding:'6px 8px'}}>
        <select value={cell.scope||'none'}
          onChange={e=>onScope(cellKey, e.target.value)}
          disabled={!isEditor}
          style={{fontSize:8,padding:'2px 4px',borderRadius:5,border:'1px solid #e2e8f0',color:'#475569',background:'#fff',width:82}}>
          {SCOPES.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
      </td>
    </tr>
  )
}

export default function PermissionMatrixPage(){
  // ── Tenant permission gate ─────────────────────────────────────
  const slug   = getSessionSlug()
  const access = resolveTenantAccess(slug)
  if (!access.hasAccess('permissions')) {
    return <AccessDenied moduleName="Permission Matrix" />
  }
  const sess    = (() => { try { return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{} } catch(_e){return{}} })()
  const company = sess.company || {}
  const plan    = (company.plan||'trial').toLowerCase()
  const grantedMods = new Set(access.modules)
  const permRec = getTenantPermissionRecord(slug)

  // Only show modules that eLogix SuperAdmin has activated
  // Map tenantPermissions module keys to MODULES keys
  const MOD_KEY_MAP = {
    employee:'employee_database', org_setup:'dashboard', attendance:'attendance',
    leave:'leave', payroll:'payroll', ats:'recruitment', performance:'performance',
    training:'learning_development', announcements:'employee_experience',
    finance:'finance_assets', compliance:'compliance_risk', reports:'reports_analytics',
    self_service:'hr_services', permissions:'system_admin', ai_chatbot:'dashboard',
  }
  const grantedModuleKeys = new Set(
    access.modules.flatMap(m => [m, MOD_KEY_MAP[m]].filter(Boolean))
  )

  const [matrix, setMatrix] = useState(() => buildMatrix())
  const [expandedRole, setExpandedRole] = useState(null)
  const [expandedModules, setExpandedModules] = useState({}) // `${roleKey}::${moduleKey}` -> bool
  const [dirty, setDirty] = useState({})
  const [saving, setSaving] = useState(null)
  const [msg, setMsg] = useState('')
  const [search, setSearch] = useState('')
  const isEditor = true

  const toggle = useCallback((cellKey, actionKey) => {
    if (!isEditor) return
    setMatrix(prev => {
      const cur = prev[cellKey] || { ...EMPTY_CELL }
      return { ...prev, [cellKey]: { ...cur, [actionKey]: !cur[actionKey] } }
    })
    const roleKey = cellKey.split('::')[0]
    setDirty(prev => ({ ...prev, [roleKey]: true }))
  }, [])

  const setScope = useCallback((cellKey, scope) => {
    if (!isEditor) return
    const roleKey = cellKey.split('::')[0]
    setMatrix(prev => {
      const cur = prev[cellKey] || { ...EMPTY_CELL }
      return { ...prev, [cellKey]: { ...cur, scope } }
    })
    setDirty(prev => ({ ...prev, [roleKey]: true }))
  }, [])

  const toggleMod = useCallback((rk, mk) => {
    const k = `${rk}::${mk}`
    setExpandedModules(prev => ({ ...prev, [k]: !prev[k] }))
  }, [])

  const saveRole = useCallback(async (roleKey) => {
    setSaving(roleKey)
    try {
      const token = localStorage.getItem('access_token')
      const headers = { 'Content-Type':'application/json', ...(token ? { Authorization:`Bearer ${token}` } : {}) }
      const calls = []
      MODULES.forEach(mod => {
        const modBody = matrix[`${roleKey}::${mod.key}`] || EMPTY_CELL
        calls.push(fetch(`/api/v1/permissions/matrix/${roleKey}/${mod.key}`, { method:'PUT', headers, body:JSON.stringify(modBody) }))
        mod.submodules.forEach(sub => {
          const subBody = matrix[`${roleKey}::${mod.key}::${sub.id}`] || EMPTY_CELL
          calls.push(fetch(`/api/v1/permissions/matrix/${roleKey}/${sub.id}`, { method:'PUT', headers, body:JSON.stringify(subBody) }))
        })
      })
      const results = await Promise.all(calls)
      const ok = results.every(r => r.ok)
      setMsg(ok ? 'Saved -- effective immediately' : 'Partial save -- check connection')
      if (ok) setDirty(prev => { const n={...prev}; delete n[roleKey]; return n })
    } catch(_e) { setMsg('Save failed -- backend not reachable in preview') }
    setSaving(null)
    setTimeout(() => setMsg(''), 3000)
  }, [matrix])

  const grouped = ALL_ROLES.reduce((acc, r) => { (acc[r.group]||=[]).push(r); return acc }, {})
  const filteredModules = search
    ? MODULES.filter(m => m.label.toLowerCase().includes(search.toLowerCase()) ||
        m.submodules.some(s => s.label.toLowerCase().includes(search.toLowerCase())))
    : MODULES

  return(
    <div>
      <PageHeader icon="🛡" title="Permission Matrix" breadcrumb="System Administration > User & Access" gradient={G}
        stats={[
          {icon:'👥',label:'Roles', value:ALL_ROLES.length},
          {icon:'🧩',label:'Modules', value:MODULES.length},
          {icon:'📋',label:'Total Submodules', value:MODULES.reduce((a,m)=>a+m.submodules.length,0)},
          {icon:'✅',label:'Actions per Row', value:ACTIONS.length},
        ]}
        onAdd={()=>{}} addLabel=""/>

      <div style={{background:'#fefce8',border:'1px solid #fde68a',borderRadius:10,padding:'10px 14px',marginBottom:10,fontSize:10,color:'#92400e',display:'flex',gap:8,alignItems:'center'}}>
        <span>📦</span>
        <span><strong>{plan.charAt(0).toUpperCase()+plan.slice(1)} Plan</strong> · {access.modules.length} modules activated by eLogix SuperAdmin.
        Modules not in your plan are shown locked (🔒) and cannot have permissions assigned.</span>
        {permRec && <span style={{marginLeft:'auto',fontSize:9,color:'#b45309'}}>Updated: {new Date(permRec.granted_at).toLocaleDateString()}</span>}
      </div>

      <div style={{background:'#eef2ff',border:'1px solid #c7d2fe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#3730a3',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🛡</span>
        <div style={{flex:1,minWidth:200}}><strong>Click a role to open it. Click + on any module to expand its subpages.</strong> Each row has View / Edit / Delete / Create / Forward / Approve / Report tick boxes plus a Scope dropdown. Submodule permissions let you grant access to one page inside a module without opening the whole module to that role.</div>
      </div>

      <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap',alignItems:'center'}}>
        <div style={{flex:1,minWidth:200}}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search modules or submodules..."/>
        </div>
        {msg && <span style={{fontSize:9,fontWeight:700,color:msg.startsWith('Saved')?'#15803d':'#dc2626'}}>{msg}</span>}
      </div>

      {Object.entries(grouped).map(([grp, roles]) => (
        <div key={grp} style={{marginBottom:20}}>
          <div style={{fontSize:9,fontWeight:800,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:6,paddingLeft:2}}>{grp}</div>
          {roles.map(role => {
            const isOpen = expandedRole === role.role_key
            const isDirty = !!dirty[role.role_key]
            return (
              <div key={role.role_key} style={{background:'#fff',border:`1.5px solid ${isDirty?'#fbbf24':isOpen?A+'44':'#e2e8f0'}`,borderRadius:12,marginBottom:8,overflow:'hidden'}}>
                {/* Role header */}
                <button onClick={()=>setExpandedRole(isOpen ? null : role.role_key)}
                  style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',border:'none',background:isOpen?'#f0f4ff':'#fff',cursor:'pointer',textAlign:'left'}}>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <span style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{role.label}</span>
                    {role.sod && <span style={{fontSize:8,color:'#dc2626',fontWeight:700,background:'#fef2f2',padding:'1px 7px',borderRadius:20}}>⚠ SoD</span>}
                    {isDirty && <span style={{fontSize:8,color:'#b45309',background:'#fffbeb',padding:'1px 7px',borderRadius:20,fontWeight:700}}>Unsaved</span>}
                  </div>
                  <div style={{display:'flex',gap:8,alignItems:'center'}}>
                    {isOpen && (
                      <button onClick={e=>{e.stopPropagation(); saveRole(role.role_key)}}
                        disabled={saving===role.role_key}
                        style={{padding:'5px 14px',borderRadius:7,border:'none',background:A,color:'#fff',fontSize:9,fontWeight:700,cursor:'pointer',opacity:saving===role.role_key?0.6:1}}>
                        {saving===role.role_key ? 'Saving...' : `Save ${role.label}`}
                      </button>
                    )}
                    <span style={{fontSize:9,color:'#94a3b8'}}>{isOpen ? '▲' : '▼'}</span>
                  </div>
                </button>

                {isOpen && (
                  <div style={{overflowX:'auto'}}>
                    {/* Column headers */}
                    <table style={{width:'100%',borderCollapse:'collapse',fontSize:9,minWidth:820}}>
                      <thead>
                        <tr style={{background:'#f8fafc',borderBottom:'2px solid #e2e8f0'}}>
                          <th style={{padding:'7px 10px',textAlign:'left',fontSize:8,fontWeight:800,color:A,minWidth:200}}>Module / Submodule</th>
                          {ACTIONS.map(a=><th key={a.key} style={{padding:'7px 4px',textAlign:'center',fontSize:8,fontWeight:800,color:a.color,minWidth:56}}>{a.label}</th>)}
                          <th style={{padding:'7px 8px',textAlign:'left',fontSize:8,fontWeight:800,color:A,minWidth:90}}>Scope</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredModules.map(mod => {
                          const modKey = `${role.role_key}::${mod.key}`
                          const isModOpen = !!expandedModules[modKey]
                          const filteredSubs = search
                            ? mod.submodules.filter(s => s.label.toLowerCase().includes(search.toLowerCase()) || mod.label.toLowerCase().includes(search.toLowerCase()))
                            : mod.submodules
                          return (
                            <>
                              {/* Module row with + toggle */}
                              <tr key={mod.key} style={{borderBottom:'1px solid #e2e8f0',background:'#f8fafc'}}>
                                <td style={{padding:'8px 10px'}}>
                                  <div style={{display:'flex',alignItems:'center',gap:6}}>
                                    <button onClick={()=>toggleMod(role.role_key, mod.key)}
                                      style={{width:18,height:18,borderRadius:4,border:`1px solid ${A}44`,background:isModOpen?A:'#fff',color:isModOpen?'#fff':A,fontSize:11,fontWeight:900,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,lineHeight:1}}>
                                      {isModOpen ? '−' : '+'}
                                    </button>
                                    <span style={{fontWeight:700,color:'#0f172a',fontSize:10}}>
                                      {mod.label}{mod.sensitive && <span style={{marginLeft:4,fontSize:9}}>🔒</span>}
                                    </span>
                                    <span style={{fontSize:8,color:'#94a3b8'}}>({mod.submodules.length} pages)</span>
                                  </div>
                                </td>
                                {ACTIONS.map(a=>(
                                  <td key={a.key} style={{padding:'7px 4px',textAlign:'center'}}>
                                    <input type="checkbox" checked={!!(matrix[modKey]||{})[a.key]}
                                      onChange={()=>toggle(modKey, a.key)}
                                      disabled={!isEditor}
                                      title={`${a.label}: all of ${mod.label}`}
                                      style={{width:15,height:15,accentColor:a.color,cursor:isEditor?'pointer':'default'}}/>
                                  </td>
                                ))}
                                <td style={{padding:'7px 8px'}}>
                                  <select value={(matrix[modKey]||{}).scope||'none'}
                                    onChange={e=>setScope(modKey, e.target.value)}
                                    disabled={!isEditor}
                                    style={{fontSize:8,padding:'2px 4px',borderRadius:5,border:'1px solid #e2e8f0',color:'#475569',background:'#fff',width:82}}>
                                    {SCOPES.map(s=><option key={s} value={s}>{s}</option>)}
                                  </select>
                                </td>
                              </tr>
                              {/* Submodule rows -- only shown when module is expanded */}
                              {isModOpen && filteredSubs.map(sub => (
                                <PermRow key={sub.id}
                                  label={sub.label}
                                  cellKey={`${role.role_key}::${mod.key}::${sub.id}`}
                                  matrix={matrix}
                                  onToggle={toggle}
                                  onScope={setScope}
                                  isEditor={isEditor}
                                  isSub={true}/>
                              ))}
                            </>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ))}

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={[
          'Click + next to any module to expand its individual pages. You can give a role access to Payroll Approval without opening all of Payroll & Compensation.',
          'Forward lets a role pass a task or request to the next level -- useful for MSS/Department Head who can forward leave requests or overtime but never finally approve them.',
          'Scope narrows what the ticked boxes actually reach. A role with Edit+scope=department can never touch another department\'s records even with Edit on.',
          'Every save writes to Audit Logs as a high-severity event. Only super_admin can save; hr_manager can view the matrix but never grant itself new access.',
        ]}/>
      </div>
    </div>
  )
}
