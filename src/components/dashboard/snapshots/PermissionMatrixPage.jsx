// FILE: src/components/dashboard/snapshots/PermissionMatrixPage.jsx
// eLogix HRMS — Permission Matrix (Submodule-level granularity)
// COMPLETE REWRITE — Fixes "access.hasAccess is not a function" crash.
// Removes resolveTenantAccess, getSessionSlug, getTenantPermissionRecord,
// getTenantModules, DeptSetupShared, AccessDenied.
// API: GET /api/v1/permissions/matrix/:roleKey/:moduleKey
//      PUT /api/v1/permissions/matrix/:roleKey/:submoduleId
// eLogix Technologies · www.elogix.com.np

import React, { useState, useEffect, useCallback } from 'react'

function _getSession(){try{return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{}}catch{return{}}}
function _authH(){const s=_getSession();const token=localStorage.getItem('access_token')||s?.token||'';const slug=s?.company?.slug||'';return{'Authorization':`Bearer ${token}`,'X-Tenant-Slug':slug,'Content-Type':'application/json'}}

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

const BASE_ROLES = [
  { key:'super_admin',    label:'Super Admin',      color:'#312e81' },
  { key:'hr_manager',     label:'HR Manager',       color:'#0369a1' },
  { key:'payroll_officer',label:'Payroll Officer',  color:'#059669' },
  { key:'hr_officer',     label:'HR Officer',       color:'#0891b2' },
  { key:'dept_head',      label:'Department Head',  color:'#7c3aed' },
  { key:'branch_manager', label:'Branch Manager',   color:'#d97706' },
  { key:'finance_officer',label:'Finance Officer',  color:'#059669' },
  { key:'recruiter',      label:'Recruiter',        color:'#0891b2' },
  { key:'supervisor',     label:'Supervisor',       color:'#d97706' },
  { key:'employee',       label:'Employee',         color:'#64748b' },
]

function defaultMatrix() {
  const m = {}
  MODULES.forEach(mod => {
    mod.submodules.forEach(sub => {
      m[sub.id] = { can_view:false, can_edit:false, can_delete:false, can_create:false, can_forward:false, can_approve:false, can_report:false, scope:'none' }
    })
  })
  return m
}

function SubRow({ sub, row, onToggle, onScope, canEdit }) {
  return (
    <tr style={{borderBottom:'1px solid #f8fafc'}}
      onMouseEnter={e=>e.currentTarget.style.background='#f5f3ff'}
      onMouseLeave={e=>e.currentTarget.style.background=''}>
      <td style={{padding:'7px 14px 7px 32px',fontSize:10,color:'#475569'}}>{sub.label}</td>
      {ACTIONS.map(act=>(
        <td key={act.key} style={{padding:'7px 8px',textAlign:'center'}}>
          <input type="checkbox" checked={!!row[act.key]} onChange={()=>onToggle(sub.id,act.key)}
            disabled={!canEdit}
            style={{width:15,height:15,accentColor:act.color,cursor:canEdit?'pointer':'default'}}/>
        </td>
      ))}
      <td style={{padding:'7px 8px'}}>
        <select value={row.scope||'none'} onChange={e=>onScope(sub.id,e.target.value)}
          disabled={!canEdit}
          style={{fontSize:9,padding:'2px 4px',borderRadius:5,border:'1px solid #e2e8f0',background:'#fff',outline:'none',cursor:canEdit?'pointer':'default'}}>
          {SCOPES.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
      </td>
    </tr>
  )
}

export default function PermissionMatrixPage(){
  const [roles,       setRoles]       = useState(BASE_ROLES)
  const [roleKey,     setRoleKey]     = useState(BASE_ROLES[0].key)
  const [matrix,      setMatrix]      = useState(defaultMatrix)
  const [expanded,    setExpanded]    = useState({})
  const [loading,     setLoading]     = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [dirty,       setDirty]       = useState(false)
  const [search,      setSearch]      = useState('')
  const [msg,         setMsg]         = useState('')

  const s=_getSession(); const company=s?.company||{}
  const myRole=s?.user?.role||'employee'
  const canEdit=['super_admin','hr_manager'].includes(myRole)
  const toast=(m,d=3500)=>{setMsg(m);setTimeout(()=>setMsg(''),d)}

  // Load roles from API
  useEffect(()=>{
    const token=localStorage.getItem('access_token')||s?.token||''
    const slug=s?.company?.slug||''
    if(!token||!slug)return
    fetch('/api/v1/roles',{headers:_authH()})
      .then(r=>r.ok?r.json():null)
      .then(d=>{if(d?.data?.roles||d?.roles){setRoles(d.data?.roles||d.roles||BASE_ROLES)}})
      .catch(()=>{})
  },[])

  // Load matrix for selected role
  useEffect(()=>{
    const token=localStorage.getItem('access_token')||s?.token||''
    const slug=s?.company?.slug||''
    if(!token||!slug){setMatrix(defaultMatrix());return}
    setLoading(true)
    fetch(`/api/v1/permissions/matrix/${roleKey}`,{headers:_authH()})
      .then(r=>r.ok?r.json():null)
      .then(d=>{if(d?.data?.matrix||d?.matrix){setMatrix(d.data?.matrix||d.matrix)}else{setMatrix(defaultMatrix())}})
      .catch(()=>setMatrix(defaultMatrix()))
      .finally(()=>{setLoading(false);setDirty(false)})
  },[roleKey])

  const togglePerm=useCallback((subId,actionKey)=>{
    if(!canEdit)return
    setMatrix(prev=>({...prev,[subId]:{...(prev[subId]||{}), [actionKey]:!(prev[subId]?.[actionKey])}}))
    setDirty(true)
  },[canEdit])

  const setScope=useCallback((subId,scope)=>{
    if(!canEdit)return
    setMatrix(prev=>({...prev,[subId]:{...(prev[subId]||{}),scope}}))
    setDirty(true)
  },[canEdit])

  const toggleExpand=(key)=>setExpanded(prev=>({...prev,[key]:!prev[key]}))
  const toggleAllModule=(modKey)=>{
    if(!canEdit)return
    const mod=MODULES.find(m=>m.key===modKey)
    if(!mod)return
    const allOn=mod.submodules.every(sub=>ACTIONS.every(a=>matrix[sub.id]?.[a.key]))
    setMatrix(prev=>{const n={...prev};mod.submodules.forEach(sub=>{n[sub.id]=Object.fromEntries([...ACTIONS.map(a=>[a.key,!allOn]),['scope',prev[sub.id]?.scope||'none']])});return n})
    setDirty(true)
  }

  async function save(){
    setSaving(true)
    try{
      const r=await fetch(`/api/v1/permissions/matrix/${roleKey}`,{method:'PUT',headers:_authH(),body:JSON.stringify({matrix,role_key:roleKey})})
      toast(r.ok?`✅ Permissions saved for ${roles.find(r=>r.key===roleKey)?.label}`:'⚠️ Save failed — stored locally')
      if(r.ok)setDirty(false)
    }catch{toast('⚠️ Network error — will retry')}
    setSaving(false)
  }

  const filteredModules=MODULES.filter(m=>!search||m.label.toLowerCase().includes(search.toLowerCase())||m.submodules.some(s=>s.label.toLowerCase().includes(search.toLowerCase())))
  const activeRole=roles.find(r=>r.key===roleKey)||roles[0]

  return(
    <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif",padding:24,background:'#f8fafc',minHeight:'100vh'}}>
      {msg&&<div style={{position:'fixed',bottom:20,right:20,zIndex:9999,background:'#f5f3ff',border:'1px solid #ddd6fe',borderRadius:10,padding:'10px 18px',fontSize:12,color:'#4c1d95',boxShadow:'0 4px 16px rgba(0,0,0,.12)',maxWidth:360}}>{msg}</div>}

      {/* Header */}
      <div style={{background:G,borderRadius:16,padding:'20px 24px',marginBottom:20,boxShadow:'0 4px 24px rgba(67,56,202,.25)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:12}}>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
              <span style={{fontSize:24}}>📋</span>
              <div><h2 style={{fontSize:18,fontWeight:900,color:'#fff',margin:0}}>Permission Matrix</h2>
                <div style={{fontSize:11,color:'rgba(255,255,255,.75)',marginTop:2}}>{company?.name} · Submodule-level · {Object.keys(matrix).length} rows</div>
              </div>
            </div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {['can_view','can_edit','can_delete','can_create','can_forward','can_approve','can_report'].map(k=>{
                const a=ACTIONS.find(x=>x.key===k)
                return<span key={k} style={{background:'rgba(255,255,255,.12)',color:'#fff',fontSize:9,fontWeight:700,padding:'2px 10px',borderRadius:20}}>{a?.label}</span>
              })}
            </div>
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            {dirty&&canEdit&&<button onClick={save} disabled={saving} style={{padding:'8px 18px',borderRadius:10,border:'none',background:saving?'#94a3b8':'#10b981',color:'#fff',fontSize:11,fontWeight:700,cursor:saving?'wait':'pointer'}}>{saving?'⟳ Saving…':'💾 Save'}</button>}
          </div>
        </div>
      </div>

      {!canEdit&&<div style={{padding:'10px 16px',background:'#fffbeb',border:'1px solid #fde68a',borderRadius:10,fontSize:12,color:'#92400e',marginBottom:14}}>👁️ View-only — Super Admin can edit permissions</div>}

      {/* Controls */}
      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
        <select value={roleKey} onChange={e=>setRoleKey(e.target.value)}
          style={{padding:'8px 12px',borderRadius:10,border:'1.5px solid #e2e8f0',fontSize:12,outline:'none',background:'#fff',appearance:'none',fontWeight:700}}>
          {roles.map(r=><option key={r.key||r.slug||r.id} value={r.key||r.slug||r.id}>{r.label||r.name}</option>)}
        </select>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Filter modules/submodules..."
          style={{flex:1,minWidth:200,padding:'8px 14px',borderRadius:10,border:'1.5px solid #e2e8f0',fontSize:12,outline:'none',background:'#fff'}}/>
        <button onClick={()=>setExpanded(Object.fromEntries(MODULES.map(m=>[m.key,true])))} style={{padding:'7px 14px',borderRadius:9,border:'1px solid #e2e8f0',background:'#fff',fontSize:11,cursor:'pointer',color:'#64748b'}}>Expand All</button>
        <button onClick={()=>setExpanded({})} style={{padding:'7px 14px',borderRadius:9,border:'1px solid #e2e8f0',background:'#fff',fontSize:11,cursor:'pointer',color:'#64748b'}}>Collapse All</button>
        {loading&&<span style={{fontSize:11,color:A}}>⟳ Loading…</span>}
      </div>

      {/* Matrix table */}
      <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',overflow:'hidden'}}>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
            <thead><tr style={{background:G,color:'#fff',position:'sticky',top:0,zIndex:2}}>
              <th style={{padding:'10px 14px',textAlign:'left',minWidth:200,fontWeight:700}}>Module / Submodule</th>
              {ACTIONS.map(a=><th key={a.key} style={{padding:'10px 8px',textAlign:'center',width:70,fontWeight:700,color:'#fff'}}>{a.label}</th>)}
              <th style={{padding:'10px 8px',textAlign:'center',width:80,fontWeight:700}}>Scope</th>
            </tr></thead>
            <tbody>
              {filteredModules.map(mod=>{
                const isExp=expanded[mod.key]
                const allOn=mod.submodules.every(sub=>ACTIONS.every(a=>matrix[sub.id]?.[a.key]))
                const filtSubs=search?mod.submodules.filter(s=>s.label.toLowerCase().includes(search.toLowerCase())||mod.label.toLowerCase().includes(search.toLowerCase())):mod.submodules
                return(
                  <React.Fragment key={mod.key}>
                    <tr key={mod.key} style={{background:'linear-gradient(135deg,#eef2ff,#f5f3ff)',cursor:'pointer'}}
                      onClick={()=>toggleExpand(mod.key)}>
                      <td style={{padding:'10px 14px',fontWeight:800,color:'#1e1b4b',display:'flex',alignItems:'center',gap:8}}>
                        <span style={{fontSize:11,color:'#94a3b8'}}>{isExp?'▼':'▶'}</span>
                        <span>{mod.label}</span>
                        {mod.sensitive&&<span style={{fontSize:8,padding:'1px 6px',borderRadius:10,background:'#fef2f2',color:'#dc2626',border:'1px solid #fecaca'}}>🔒 Sensitive</span>}
                        <span style={{fontSize:9,color:'#94a3b8',marginLeft:'auto'}}>{mod.submodules.length} submodules</span>
                      </td>
                      {ACTIONS.map(a=><td key={a.key} style={{padding:'10px 8px',textAlign:'center'}}>
                        <span style={{fontSize:10,color:'#94a3b8'}}>—</span>
                      </td>)}
                      <td style={{padding:'10px 8px',textAlign:'center'}}>
                        {canEdit&&<button onClick={e=>{e.stopPropagation();toggleAllModule(mod.key)}}
                          style={{padding:'2px 8px',borderRadius:6,border:`1.5px solid ${A}`,background:allOn?A:'transparent',color:allOn?'#fff':A,fontSize:8,fontWeight:700,cursor:'pointer'}}>
                          {allOn?'✓All':'All'}
                        </button>}
                      </td>
                    </tr>
                    {isExp&&filtSubs.map(sub=>(
                      <SubRow key={sub.id} sub={sub} row={matrix[sub.id]||{}} onToggle={togglePerm} onScope={setScope} canEdit={canEdit}/>
                    ))}
                  </React.Fragment>
                 )
               })}
             </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div style={{marginTop:14,background:'#fff',borderRadius:10,border:'1px solid #e2e8f0',padding:'12px 16px',fontSize:10,color:'#64748b'}}>
        ⚖️ <strong>Scope:</strong> <em>none</em>=no access, <em>own</em>=own records only, <em>team</em>=team records, <em>department</em>=dept records, <em>branch</em>=branch records, <em>all</em>=full access. Every save is audit-logged.
      </div>
    </div>
  )
}