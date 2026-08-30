// FILE: src/utils/tenantPermissions.js
// eLogix HRMS — Tenant Permission Engine
// ═══════════════════════════════════════════════════════════════════
// ARCHITECTURE:
//   eLogix SuperAdmin assigns modules per tenant via TenantModulePermissionPage
//   Those assignments are stored in localStorage:
//     key: elogix_tenant_permissions:{slug}
//     value: { modules: string[], granted_at: ISO, granted_by: string }
//
//   FLOW:
//     1. eLogix SuperAdmin opens TenantModulePermissionPage
//     2. Selects tenant → toggles modules → saves
//     3. Saved to: elogix_tenant_permissions:{slug}
//     4. Tenant logs in → resolveTenantAccess() reads that key
//     5. Sidebar + App.jsx filter ALL routes through hasAccess()
//     6. Pages with no access show <AccessDenied /> instead
//
// eLogix Technologies · www.elogix.com.np
// ═══════════════════════════════════════════════════════════════════

// ── PLAN → DEFAULT MODULES ────────────────────────────────────────
export const PLAN_DEFAULT_MODULES = {
  trial: [
    'employee','org_setup','attendance','leave','self_service','announcements',
  ],
  starter: [
    'employee','org_setup','attendance','leave','payroll',
    'self_service','documents','reports','announcements',
  ],
  growth: [
    'employee','org_setup','attendance','leave','payroll','self_service','documents',
    'ats','job_portal','interview','onboarding','performance','goals','training',
    'reports','announcements','helpdesk','org_chart','manpower','compliance',
    'permissions','audit_log','billing',
  ],
  business: [
    'employee','org_setup','attendance','leave','payroll','self_service','documents',
    'ats','job_portal','interview','onboarding','candidate_pool','jd_library',
    'performance','goals','360_feedback','pip','training','skill_matrix',
    'finance','compliance','tax','loan','expense',
    'reports','ai_letters','announcements','helpdesk','exit',
    'org_chart','manpower','roster','overtime',
    'biometric','multi_branch',
    'permissions','audit_log','billing','white_label',
  ],
  enterprise: [
    'employee','org_setup','attendance','leave','payroll','self_service','documents',
    'ats','job_portal','interview','onboarding','candidate_pool','jd_library','outsource',
    'performance','goals','360_feedback','pip','training','skill_matrix','career_pathing',
    'finance','compliance','tax','loan','expense',
    'ai_chatbot','ai_bi','reports','ai_letters',
    'announcements','helpdesk','exit',
    'org_chart','manpower','roster','overtime',
    'integrations','biometric','accounting','api_access',
    'multi_branch','sso','white_label',
    'permissions','audit_log','billing',
  ],
}

// ── BUSINESS TYPE AUTO-ADDITIONS ─────────────────────────────────
export const BUSINESS_TYPE_EXTRA_MODULES = {
  recruitment_agency: ['ats','job_portal','interview','candidate_pool','jd_library','outsource','integrations'],
  bank_finance:       ['compliance','tax','audit_log','multi_branch','roster','finance'],
  hospital_health:    ['roster','overtime','compliance','multi_branch','training'],
  ngo_ingo:           ['compliance','expense','documents','finance','loan'],
  it_software:        ['ats','job_portal','interview','performance','goals','skill_matrix','ai_chatbot','api_access'],
  manufacturing:      ['roster','overtime','compliance','multi_branch','biometric','expense'],
  hotel_hospitality:  ['roster','overtime','multi_branch','expense','training'],
  education:          ['training','skill_matrix','documents','compliance','roster'],
  government:         ['compliance','audit_log','documents','finance','org_chart'],
  custom:             [],
}

// ── MODULE → SIDEBAR ITEM IDs ─────────────────────────────────────
export const MODULE_TO_SIDEBAR = {
  employee:      ['employee-dir','emp-profile','employee-directory','employee-profile','dept-employee-comparison','digital-employee-file','employee-satisfaction','tenure-chart','age-group','blood-group','contract-expiry'],
  org_setup:     ['company-setup','company-profile','group-company','branch-location-setup','business-unit-setup','section-unit','team-setup','cost-center','work-location','department-setup','designation-setup','employment-category','grade-level','reporting-hierarchy','position-management','process-flow'],
  attendance:    ['attendance-snapshot','my-attendance','team-attendance','attendance-reports-page','attendance-regularization','missed-punch','late-reporting','early-departure','live-attendance','monthly-attendance','geo-attendance','biometric-attendance','no-log-in-report'],
  leave:         ['leave-snapshot','my-leave','leave-approval','leave-balance','leave-setup','leave-policy','leave-reports-page','leave-accrual'],
  payroll:       ['payroll-snapshot','my-payroll','payroll-setup','payroll-reports-std','salary-structure','tax-setup','ssf-information','cit-information','payroll-budget'],
  self_service:  ['ess-attendance-leave','ess-policies-payroll','my-documents','my-dashboard'],
  documents:     ['document-management','employee-documents','hr-policy-library','digital-employee-file'],
  ats:           ['ats-dashboard','ats-job-manager','ats-candidate-pipeline','recruitment-snapshot','recruitment-dashboard','job-posting','ats-reports'],
  job_portal:    ['ats-career-portal','career-portal','employer-branding'],
  interview:     ['ats-interview-panel','interview-scheduling','ats-video-interview'],
  onboarding:    ['ats-onboarding','onboarding-month','onboarding-checklist'],
  jd_library:    ['jd-library','create-job-description'],
  candidate_pool:['ats-talent-pool','candidate-database'],
  outsource:     ['vendor-listing','outsource-employees','vendor-billing','vendor-background'],
  performance:   ['performance-snapshot','performance-dashboard','performance-appraisal','performance-review','probation-management'],
  goals:         ['goal-assignment','goal-tracking','okr-management','kpi-management'],
  '360_feedback':['feedback-360','pms-360'],
  pip:           ['pip'],
  training:      ['training-calendar','my-training','course-management','training-needs','training-reports-page','training-effectiveness'],
  skill_matrix:  ['skill-gap-analysis','skill-matrix'],
  career_pathing:['career-pathing','succession-planning'],
  finance:       ['department-budget','annual-hr-budget'],
  compliance:    ['labour-compliance','statutory-compliance','compliance-reports','social-security-fund'],
  tax:           ['tax-setup','tax-calculator','cit-information','ssf-information'],
  loan:          ['loan-management','cash-advance'],
  expense:       ['expense-claims','reimbursement','travel-management'],
  ai_chatbot:    ['ai-hr-chatbot','minutes-of-meeting','ai-insights','smart-notifications'],
  ai_bi:         ['ai-business-intelligence','bi-dashboard','predictive-analytics','predictive-analytics-page','ai-insights-page'],
  reports:       ['workforce-summary','department-reports','headcount-analysis-page','attrition-analysis','productivity-analysis','cost-analysis','workforce-analytics','annual-hr-audit','custom-report-builder','export-center','ai-insights'],
  ai_letters:    ['ai-hr-letters','ai-policy-assistant','ai-report-generator'],
  manpower:      ['headcount-analysis','headcount-plan','replacement-plan','expansion-plan','resource-allocation','contract-staff-plan','productivity-plan'],
  org_chart:     ['org-chart','organogram-department'],
  roster:        ['roster-details','duty-roster','shift-setup','shift-management','shift-rotation'],
  overtime:      ['overtime-management','overtime-monitoring'],
  announcements: ['calendar-events','notifications','upcoming-events','birthday-anniversary','engagement-snapshot','worklife-balance','emp-satisfaction'],
  helpdesk:      ['hr-helpdesk','employee-queries','grievance-management'],
  exit:          ['exit-management','resignation-management'],
  integrations:  ['api-integration','integration-hub','email-sms-integration'],
  biometric:     ['biometric-setup','biometric-integration'],
  accounting:    ['accounting-integration'],
  api_access:    ['api-integration','integration-hub'],
  permissions:   ['user-management','role-permission','permission-management','permission-matrix','access-control','menu-management'],
  audit_log:     ['audit-logs','audit-management','security-settings'],
  billing:       ['billing','plans'],
  white_label:   ['dashboard-customization'],
  multi_branch:  ['branch-location-setup','business-unit-setup','multi-branch-reports'],
  sso:           ['security-settings'],
}

const PERM_KEY = (slug) => `elogix_tenant_permissions:${slug}`

// ── WRITE ─────────────────────────────────────────────────────────
export function saveTenantModules(slug, modules, grantedBy='elogix_superadmin') {
  if (!slug) throw new Error('slug required')
  const payload = { modules:[...new Set(modules)], granted_at:new Date().toISOString(), granted_by:grantedBy, version:2 }
  localStorage.setItem(PERM_KEY(slug), JSON.stringify(payload))
  return payload
}

// ── READ ──────────────────────────────────────────────────────────
export function getTenantModules(slug) {
  if (!slug) return []
  try { const r=JSON.parse(localStorage.getItem(PERM_KEY(slug))||'null'); return Array.isArray(r?.modules)?r.modules:[] } catch(_e){ return [] }
}
export function getTenantPermissionRecord(slug) {
  if (!slug) return null
  try { return JSON.parse(localStorage.getItem(PERM_KEY(slug))||'null') } catch(_e){ return null }
}

// ── COMPUTE DEFAULTS ──────────────────────────────────────────────
export function computeDefaultModules(plan, businessType) {
  const planMods  = new Set(PLAN_DEFAULT_MODULES[plan]  || PLAN_DEFAULT_MODULES.trial)
  const bizExtras = new Set(BUSINESS_TYPE_EXTRA_MODULES[businessType] || [])
  return [...new Set([...planMods,...bizExtras])]
}

// ── PROVISION (called on approval) ───────────────────────────────
export function provisionTenantPermissions(slug, plan, businessType, grantedBy) {
  const mods = computeDefaultModules(plan, businessType)
  return saveTenantModules(slug, mods, grantedBy)
}

// ── RESOLVE — main access resolver ───────────────────────────────
export function resolveTenantAccess(slug) {
  const modules = getTenantModules(slug)
  if (!modules.length) return { modules:[], hasAny:false, hasAccess:()=>false, canSeeSidebar:()=>false, visibleSidebarItems:()=>new Set() }
  const modSet = new Set(modules)
  return {
    modules,
    hasAny: true,
    hasAccess: (moduleId) => modSet.has(moduleId),
    canSeeSidebar: (sidebarItemId) => {
      for (const [mid, items] of Object.entries(MODULE_TO_SIDEBAR)) {
        if (modSet.has(mid) && items.includes(sidebarItemId)) return true
      }
      return false
    },
    visibleSidebarItems: () => {
      const v = new Set()
      for (const mid of modules) { (MODULE_TO_SIDEBAR[mid]||[]).forEach(id=>v.add(id)) }
      return v
    },
  }
}

// ── GET SLUG FROM SESSION ─────────────────────────────────────────
export function getSessionSlug() {
  try {
    const s = JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')
    return s?.company?.slug || null
  } catch(_e){ return null }
}
