// FILE: src/data/rolePersonaMap.js
// eLogix HRMS — Role → Persona & Default Page Mapping
// Maps JWT role string to the correct persona and landing dashboard
// getTenantContext() reads the JWT from localStorage/sessionStorage
// eLogix Technologies · www.elogix.com.np

// ── Role → Persona ID ─────────────────────────────────────────────────
export const ROLE_TO_PERSONA = {
  // eLogix platform admin
  elogix_superadmin   : 'elogix_superadmin',
  platform_admin      : 'elogix_superadmin',

  // Tenant super admin / owner
  super_admin         : 'super-admin',
  owner               : 'super-admin',
  admin               : 'super-admin',

  // Executive tier
  executive           : 'executive',
  ceo                 : 'executive',
  coo                 : 'executive',
  cfo                 : 'executive',
  director            : 'executive',
  md                  : 'executive',

  // HR
  hr_manager          : 'hr',
  hr_head             : 'hr',
  hrbp                : 'hr',
  hr_officer          : 'hr-officer',
  hr_executive        : 'hr-officer',
  hr_assistant        : 'hr-officer',

  // Department
  department_head     : 'department',
  hod                 : 'department',
  dept_manager        : 'department',
  manager             : 'manager',
  team_lead           : 'manager',
  supervisor          : 'manager',

  // Branch
  branch_manager      : 'branch',
  branch_head         : 'branch',

  // Finance / Payroll
  finance_manager     : 'finance',
  finance_officer     : 'finance',
  payroll_officer     : 'finance',
  accountant          : 'finance',

  // Recruitment
  recruiter           : 'recruitment',
  recruitment_manager : 'recruitment',
  talent_acquisition  : 'recruitment',

  // IT
  it_admin            : 'it-admin',
  system_admin        : 'it-admin',
  it_manager          : 'it-admin',

  // Employee (default / catch-all)
  employee            : 'employee',
  staff               : 'employee',
  intern              : 'employee',
}

// ── Role → Default landing page ───────────────────────────────────────
export const ROLE_TO_DEFAULT_PAGE = {
  elogix_superadmin   : 'elogix-admin',
  platform_admin      : 'elogix-admin',

  super_admin         : 'super-admin-dashboard',
  owner               : 'super-admin-dashboard',
  admin               : 'super-admin-dashboard',

  executive           : 'executive-dashboard',
  ceo                 : 'executive-dashboard',
  coo                 : 'executive-dashboard',
  cfo                 : 'executive-dashboard',
  director            : 'executive-dashboard',
  md                  : 'executive-dashboard',

  hr_manager          : 'hr-dashboard',
  hr_head             : 'hr-dashboard',
  hrbp                : 'hr-dashboard',
  hr_officer          : 'hr-officer-dashboard',
  hr_executive        : 'hr-officer-dashboard',
  hr_assistant        : 'hr-officer-dashboard',

  department_head     : 'department-dashboard',
  hod                 : 'department-dashboard',
  dept_manager        : 'department-dashboard',
  manager             : 'department-dashboard',
  team_lead           : 'department-dashboard',
  supervisor          : 'department-dashboard',

  branch_manager      : 'branch-dashboard',
  branch_head         : 'branch-dashboard',

  finance_manager     : 'finance-dashboard',
  finance_officer     : 'finance-dashboard',
  payroll_officer     : 'finance-dashboard',
  accountant          : 'finance-dashboard',

  recruiter           : 'recruitment-dashboard',
  recruitment_manager : 'recruitment-dashboard',
  talent_acquisition  : 'recruitment-dashboard',

  it_admin            : 'it-admin-dashboard',
  system_admin        : 'it-admin-dashboard',
  it_manager          : 'it-admin-dashboard',

  employee            : 'employee-dashboard',
  staff               : 'employee-dashboard',
  intern              : 'employee-dashboard',
}

// ── getTenantContext — reads JWT session for App.jsx ──────────────────
export function getTenantContext() {
  try {
    const sess = JSON.parse(
      sessionStorage.getItem('elogix_session') ||
      localStorage.getItem('elogix_session') ||
      'null'
    ) || {}

    const token = localStorage.getItem('access_token') || sess?.token || ''
    const user  = sess?.user  || {}
    const company = sess?.company || {}

    // Decode JWT payload without verifying signature (frontend only)
    let jwtPayload = {}
    if (token) {
      try {
        const parts = token.split('.')
        if (parts.length === 3) {
          jwtPayload = JSON.parse(atob(parts[1]))
        }
      } catch (_e) {}
    }

    const role = user.role || jwtPayload.role || ''
    const companyId = company.id || jwtPayload.company_id || null
    const slug = company.slug || jwtPayload.slug || localStorage.getItem('elogix_tenant_slug') || ''

    return {
      isAuthenticated : !!token,
      token,
      role,
      userId          : user.id   || jwtPayload.user_id   || null,
      employeeId      : user.employee_id || jwtPayload.employee_id || null,
      fullName        : user.full_name   || '',
      email           : user.email       || '',
      companyId,
      companySlug     : slug,
      companyName     : company.name     || '',
      plan            : company.plan     || 'trial',
      logoUrl         : company.logo     || '',
    }
  } catch (_e) {
    return {
      isAuthenticated: false,
      token: '', role: '', userId: null, employeeId: null,
      fullName: '', email: '', companyId: null,
      companySlug: '', companyName: '', plan: 'trial', logoUrl: '',
    }
  }
}
