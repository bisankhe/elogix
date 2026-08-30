// FILE: src/utils/tenantRouting.js
// eLogix HRMS — Tenant Routing, Role-Based Landing & Permission Engine
// ─────────────────────────────────────────────────────────────────────
// Integrates with the following existing project files:
//   src/data/planConfig.js        → plan → module config (source of truth for UI)
//   src/data/rolePersonaMap.js    → role → persona name mapping
//   src/data/sidebarMenu.js       → full sidebar menu tree (filtered by this)
//   src/utils/rbac.js             → RBAC canAccess() / permission helpers
//   src/hooks/usePermissions.jsx  → React hook wrapping permission checks
//   src/hooks/useTenant.js        → tenant company context
//   src/context/AuthContext.jsx   → calls resolveTenantPermissions() after login
//
// CORE RULE:
//   Landing page = ROLE only. business_type never controls landing.
//   business_type controls which sidebar sections are VISIBLE.
//   Plan controls which modules are UNLOCKED.
//   Role controls which modules are ACCESSIBLE within what's unlocked.
//
// eLogix Technologies · www.elogix.com.np

// ══════════════════════════════════════════════════════════════════════
// 1. ROLE → LANDING PAGE KEY
//    Keys must match the route/page identifiers in AppRouter.jsx / App.jsx.
//    Dashboard components live in src/components/dashboard/*.jsx —
//    each role maps to exactly one of those files on first load.
// ══════════════════════════════════════════════════════════════════════

export const ROLE_LANDING = {
  // ── eLogix internal staff (→ src/pages/elogix-admin/ELogixAdminPage.jsx) ──
  elogix_superadmin : 'elogix-admin',
  elogix_sales      : 'elogix-admin',
  elogix_support    : 'elogix-admin',
  elogix_billing    : 'elogix-admin',

  // ── Tenant roles (→ src/components/dashboard/*.jsx) ────────────────
  // Page keys used by App.jsx / AppRouter.jsx to pick the right component

  super_admin         : 'company-dashboard',      // SuperAdminDashboard.jsx
  company_admin       : 'company-dashboard',      // SuperAdminDashboard.jsx
  executive           : 'executive-dashboard',    // ExecutiveDashboard.jsx

  hr_manager          : 'hr-manager-dashboard',   // HRManagerDashboard.jsx
  hr_officer          : 'hr-officer-dashboard',   // HROfficerDashboard.jsx

  payroll_officer     : 'payroll-dashboard',      // (payroll section in SuperAdmin or dedicated)
  payroll_manager     : 'payroll-dashboard',

  hod                 : 'department-dashboard',   // DepartmentDashboard.jsx
  department_head     : 'department-dashboard',
  team_lead           : 'team-dashboard',         // TeamDashboardPage.jsx

  recruitment_manager : 'recruitment-dashboard',  // RecruitmentDashboard.jsx
  recruiter           : 'recruitment-dashboard',  // RecruitmentOfficerDashboard.jsx
  recruitment_officer : 'recruitment-dashboard',

  finance_manager     : 'finance-dashboard',      // FinanceDashboard.jsx
  accounts_officer    : 'finance-dashboard',

  it_administrator    : 'it-admin-dashboard',     // ITAdministratorDashboard.jsx
  learning_development: 'ld-dashboard',           // LearningDevelopmentDashboard.jsx
  legal               : 'legal-dashboard',        // LegalDashboard.jsx
  marketing           : 'marketing-dashboard',    // MarketingDashboard.jsx
  operations          : 'operations-dashboard',   // OperationsDashboard.jsx
  procurement         : 'procurement-dashboard',  // ProcurementDashboard.jsx
  sales               : 'sales-dashboard',        // SalesDashboard.jsx
  customer_service    : 'customer-service-dashboard', // CustomerServiceDashboard.jsx
  branch_manager      : 'branch-dashboard',       // BranchDashboard.jsx

  employee            : 'employee-dashboard',     // EmployeeDashboard.jsx
  intern              : 'employee-dashboard',
  contractual         : 'employee-dashboard',
  vendor_employee     : 'employee-dashboard',
}

/**
 * Returns the landing page key for a user after login.
 * Consumed by AuthContext.getDashboardPage() and LoginPage.handleLogin().
 * NEVER uses business_type — role is the only input for landing.
 *
 * @param {object}  user    - { role, level, ... }
 * @param {boolean} isAdmin - true for eLogix internal staff
 * @returns {string} page key for App.jsx / AppRouter.jsx
 */
export function getLandingRoute(user, isAdmin = false) {
  if (isAdmin) return ROLE_LANDING[user?.role] || 'elogix-admin'
  const route = ROLE_LANDING[user?.role]
  if (!route) {
    console.warn(`[eLogix] Unknown role "${user?.role}" → defaulting to employee-dashboard`)
    return 'employee-dashboard'
  }
  return route
}


// ══════════════════════════════════════════════════════════════════════
// 2. PLAN → MODULE KEYS
//    Mirrors src/data/planConfig.js — keep in sync when adding plans.
//    Module keys here must match sidebar section IDs in sidebarMenu.js
//    so the filtering in useSidebarMenu / usePermissions works correctly.
// ══════════════════════════════════════════════════════════════════════

export const PLAN_MODULES = {
  trial: [
    'core_hr', 'attendance', 'leave', 'ess',
  ],
  starter: [
    'core_hr', 'attendance', 'leave', 'ess',
    'payroll', 'document_management',
  ],
  growth: [
    'core_hr', 'attendance', 'leave', 'ess',
    'payroll', 'document_management',
    'recruitment', 'performance', 'onboarding',
    'reports_standard', 'org_setup',
  ],
  business: [
    'core_hr', 'attendance', 'leave', 'ess',
    'payroll', 'document_management',
    'recruitment', 'recruitment_ats', 'performance',
    'onboarding', 'reports_standard', 'reports_advanced',
    'training', 'travel_expense', 'shift_roster',
    'multi_branch', 'contract_management', 'exit_management',
    'workforce_planning', 'org_setup', 'compliance',
    'employee_engagement', 'hr_helpdesk', 'asset_management',
  ],
  enterprise: [
    'core_hr', 'attendance', 'leave', 'ess',
    'payroll', 'document_management',
    'recruitment', 'recruitment_ats', 'performance',
    'onboarding', 'reports_standard', 'reports_advanced',
    'training', 'travel_expense', 'shift_roster',
    'multi_branch', 'contract_management', 'exit_management',
    'workforce_planning', 'org_setup', 'compliance',
    'employee_engagement', 'hr_helpdesk', 'asset_management',
    // Enterprise extras
    'ai_insights', 'ai_analytics', 'ai_letters', 'mom',
    'api_access', 'custom_workflows', 'audit_trail',
    'succession_planning', 'dei', 'okr', 'kpi', 'kra',
    'vendor_management', 'legal_management', 'risk_management',
    'employer_branding', 'career_portal',
    'mobile_app', 'biometric_integration',
    'insource_outsource', 'field_visit', 'wfh_tracking',
  ],
}


// ══════════════════════════════════════════════════════════════════════
// 3. BUSINESS TYPE → SIDEBAR MODULE PRIORITY
//    Determines which modules are VISIBLE in the sidebar for a given
//    company's business activity. Does NOT control landing.
//    Aligns with business_type values in src/data/mockData.js.
// ══════════════════════════════════════════════════════════════════════

export const BUSINESS_SIDEBAR_PRIORITY = {
  it_software: [
    'recruitment', 'recruitment_ats', 'core_hr', 'performance',
    'attendance', 'leave', 'payroll', 'training', 'onboarding',
    'ai_insights', 'reports_advanced', 'ess', 'mom', 'wfh_tracking',
  ],
  recruitment_agency: [
    'recruitment', 'recruitment_ats', 'core_hr', 'onboarding',
    'attendance', 'leave', 'payroll', 'document_management',
    'reports_standard', 'contract_management', 'career_portal',
    'employer_branding', 'ess',
  ],
  bank_finance: [
    'core_hr', 'attendance', 'leave', 'payroll',
    'performance', 'training', 'shift_roster', 'multi_branch',
    'reports_advanced', 'audit_trail', 'compliance', 'ess',
    'asset_management',
  ],
  hospital_health: [
    'core_hr', 'attendance', 'leave', 'payroll',
    'shift_roster', 'training', 'performance',
    'recruitment', 'multi_branch', 'reports_advanced', 'ess',
  ],
  ngo_ingo: [
    'core_hr', 'attendance', 'leave', 'payroll',
    'travel_expense', 'document_management', 'reports_advanced',
    'training', 'contract_management', 'compliance', 'ess',
    'field_visit',
  ],
  manufacturing: [
    'core_hr', 'attendance', 'leave', 'payroll',
    'shift_roster', 'training', 'performance', 'multi_branch',
    'exit_management', 'reports_advanced', 'workforce_planning',
    'vendor_management', 'ess', 'asset_management',
    'insource_outsource',
  ],
  hotel_hospitality: [
    'core_hr', 'attendance', 'leave', 'payroll',
    'shift_roster', 'training', 'performance', 'multi_branch',
    'reports_advanced', 'travel_expense', 'ess',
  ],
  education: [
    'core_hr', 'attendance', 'leave', 'payroll',
    'training', 'performance', 'recruitment',
    'document_management', 'reports_standard', 'ess',
  ],
  government: [
    'core_hr', 'attendance', 'leave', 'payroll',
    'performance', 'training', 'reports_advanced',
    'audit_trail', 'document_management', 'compliance', 'ess',
  ],
  custom: [
    'core_hr', 'attendance', 'leave', 'payroll',
    'recruitment', 'performance', 'reports_standard', 'ess',
  ],
}


// ══════════════════════════════════════════════════════════════════════
// 4. ROLE → MODULE ACCESS
//    '*' = full access to whatever plan + biz unlocks.
//    Array = specific module keys this role can access.
//    Aligns with src/utils/rbac.js and src/hooks/usePermissions.jsx.
// ══════════════════════════════════════════════════════════════════════

export const ROLE_MODULE_ACCESS = {
  super_admin         : '*',
  company_admin       : '*',
  executive           : [
    'core_hr', 'reports_advanced', 'reports_standard',
    'ai_analytics', 'workforce_planning', 'performance', 'payroll',
    'succession_planning', 'okr',
  ],

  hr_manager          : [
    'core_hr', 'recruitment', 'recruitment_ats', 'onboarding',
    'attendance', 'leave', 'performance', 'training',
    'exit_management', 'document_management', 'reports_standard',
    'reports_advanced', 'contract_management', 'shift_roster',
    'employee_engagement', 'hr_helpdesk', 'compliance',
    'dei', 'succession_planning', 'workforce_planning',
    'org_setup', 'mom', 'kpi', 'kra', 'okr',
    'ai_insights', 'ai_letters',
  ],
  hr_officer          : [
    'core_hr', 'attendance', 'leave', 'onboarding',
    'document_management', 'recruitment', 'employee_engagement',
    'hr_helpdesk', 'ess',
  ],

  payroll_officer     : [
    'payroll', 'core_hr', 'attendance', 'leave',
    'reports_standard', 'ess',
  ],
  payroll_manager     : [
    'payroll', 'core_hr', 'attendance', 'leave',
    'reports_advanced', 'document_management', 'travel_expense',
    'compliance',
  ],

  hod                 : [
    'core_hr', 'attendance', 'leave', 'performance',
    'training', 'reports_standard', 'shift_roster', 'ess',
    'workforce_planning',
  ],
  department_head     : [
    'core_hr', 'attendance', 'leave', 'performance',
    'training', 'reports_standard', 'shift_roster', 'ess',
  ],
  team_lead           : ['core_hr', 'attendance', 'leave', 'performance', 'ess'],

  recruitment_manager : [
    'recruitment', 'recruitment_ats', 'onboarding',
    'reports_standard', 'employer_branding', 'career_portal',
  ],
  recruiter           : ['recruitment', 'recruitment_ats', 'onboarding'],
  recruitment_officer : ['recruitment', 'onboarding'],

  finance_manager     : ['payroll', 'travel_expense', 'reports_advanced', 'asset_management', 'compliance'],
  accounts_officer    : ['payroll', 'travel_expense'],

  it_administrator    : [
    'core_hr', 'api_access', 'mobile_app',
    'biometric_integration', 'audit_trail', 'custom_workflows',
  ],
  learning_development: ['training', 'performance', 'succession_planning', 'reports_standard', 'mom'],
  legal               : ['legal_management', 'compliance', 'contract_management', 'document_management'],
  marketing           : ['employer_branding', 'career_portal', 'employee_engagement'],
  operations          : ['core_hr', 'attendance', 'shift_roster', 'workforce_planning', 'vendor_management', 'field_visit'],
  procurement         : ['vendor_management', 'asset_management', 'travel_expense'],
  sales               : ['core_hr', 'performance', 'reports_standard'],
  customer_service    : ['core_hr', 'attendance', 'leave', 'ess', 'hr_helpdesk'],
  branch_manager      : ['core_hr', 'attendance', 'leave', 'payroll', 'reports_standard', 'shift_roster', 'multi_branch'],

  employee            : ['ess', 'leave', 'attendance'],
  intern              : ['ess', 'leave'],
  contractual         : ['ess', 'leave', 'attendance'],
  vendor_employee     : ['ess', 'leave'],
}


// ══════════════════════════════════════════════════════════════════════
// 5. PERMISSION RESOLVER
//    Called by AuthContext.loginTenant() on every login.
//    Result stored in AuthContext and used by:
//      - src/components/layout/Sidebar.jsx (menu filtering)
//      - src/components/auth/ProtectedRoute.jsx (route guarding)
//      - src/hooks/usePermissions.jsx (component-level checks)
//      - src/utils/rbac.js (canAccess helper)
// ══════════════════════════════════════════════════════════════════════

/**
 * @param {object} user    - { role, level, business_type }
 * @param {object} company - { plan, business_type, modules[] }
 * @returns {{ modules: string[], landing: string, plan, bizType, role }}
 */
export function resolveTenantPermissions(user, company) {
  const plan    = company?.plan             || 'trial'
  const bizType = company?.business_type    || user?.business_type || 'custom'
  const role    = user?.role                || 'employee'

  const planMods   = new Set(PLAN_MODULES[plan]                              || PLAN_MODULES.trial)
  const bizMods    = new Set(BUSINESS_SIDEBAR_PRIORITY[bizType]              || BUSINESS_SIDEBAR_PRIORITY.custom)
  const roleAccess = ROLE_MODULE_ACCESS[role]
  const roleMods   = roleAccess === '*' ? null : new Set(roleAccess || ['ess'])

  // Admin override modules (granted by eLogix SuperAdmin outside of plan)
  const adminOverride = company?.modules?.length > 0 ? new Set(company.modules) : null

  // plan ∩ biz → role filter → union admin overrides
  let allowed = [...planMods].filter(m => bizMods.has(m))
  if (roleMods) allowed = allowed.filter(m => roleMods.has(m))
  if (adminOverride) allowed = [...new Set([...allowed, ...adminOverride])]

  return {
    modules : allowed,
    landing : getLandingRoute(user, false),
    plan,
    bizType,
    role,
  }
}


// ══════════════════════════════════════════════════════════════════════
// 6. TENANT STORAGE HELPERS
//    Namespaces all client-side storage per tenant slug.
//    Server-side isolation is enforced by:
//      backend/middleware/tenant.py          (request-level)
//      database/migrations/tenant_rls_policies.sql  (DB row-level security)
//    These helpers only prevent accidental cross-tenant reads in browser.
// ══════════════════════════════════════════════════════════════════════

export const tenantKey     = (slug, key)   => `elogix_tenant:${slug}:${key}`
export const tenantGet     = (slug, key)   => { try { const r = localStorage.getItem(tenantKey(slug,key)); return r ? JSON.parse(r) : null } catch { return null } }
export const tenantSet     = (slug, key, v)=> { try { localStorage.setItem(tenantKey(slug,key), JSON.stringify(v)); return true } catch { return false } }
export const tenantClearAll= (slug)        => {
  const prefix = `elogix_tenant:${slug}:`
  const keys   = []
  for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k?.startsWith(prefix)) keys.push(k) }
  keys.forEach(k => localStorage.removeItem(k))
}
