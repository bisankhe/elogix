// FILE: src/context/AuthContext.jsx
// eLogix HRMS — Auth Context (SaaS Multi-tenant)
// THREE session types:
//   1. eLogix SuperAdmin  (elogix_admin_token)
//   2. Tenant Company staff (elogix_token + elogix_tenant)
// eLogix Technologies · www.elogix.com.np
import { createContext, useContext, useState, useCallback, useEffect } from 'react'

const AuthContext = createContext(null)

export const LEVEL_PERMISSIONS = {
  1:  { label:'Super Admin',   canViewAll:true,  canEdit:true,  canDelete:true,  canApprove:true,  canExport:true,  canManageUsers:true,  canViewPayroll:true, scope:'all' },
  2:  { label:'Executive',     canViewAll:true,  canEdit:false, canDelete:false, canApprove:true,  canExport:true,  canManageUsers:false, canViewPayroll:true, scope:'all' },
  3:  { label:'HR Manager',    canViewAll:true,  canEdit:true,  canDelete:false, canApprove:true,  canExport:true,  canManageUsers:true,  canViewPayroll:true, scope:'all' },
  4:  { label:'HOD/Dept Head', canViewAll:false, canEdit:false, canDelete:false, canApprove:true,  canExport:true,  canManageUsers:false, canViewPayroll:false,scope:'own_dept' },
  5:  { label:'Officer/Lead',  canViewAll:false, canEdit:false, canDelete:false, canApprove:false, canExport:false, canManageUsers:false, canViewPayroll:false,scope:'own_team' },
  6:  { label:'Supervisor',    canViewAll:false, canEdit:false, canDelete:false, canApprove:false, canExport:false, canManageUsers:false, canViewPayroll:false,scope:'own_team' },
  10: { label:'Employee',      canViewAll:false, canEdit:false, canDelete:false, canApprove:false, canExport:false, canManageUsers:false, canViewPayroll:false,scope:'self_only' },
}

export const ROLE_DASHBOARD = {
  super_admin:     'employee-dashboard',  // new tenants see main dashboard first
  executive:       'executive-dashboard',
  hr_manager:      'hr-dashboard',
  hr_admin:        'hr-dashboard',
  payroll_officer: 'finance-dashboard',
  finance_officer: 'finance-dashboard',
  hod:             'department-dashboard',
  department_head: 'department-dashboard',
  branch_manager:  'branch-dashboard',
  hr_officer:      'hr-dashboard',
  team_lead:       'department-dashboard',
  supervisor:      'department-dashboard',
  manager:         'department-dashboard',
  recruiter:       'recruitment-dashboard',
  employee:        'employee-dashboard',
}

const load = (key, fallback = null) => {
  try {
    // Check sessionStorage first (current session), then localStorage (remembered)
    const val = sessionStorage.getItem(key) || localStorage.getItem(key)
    return JSON.parse(val || 'null') ?? fallback
  } catch { return fallback }
}

export function AuthProvider({ children }) {
  // ── Tenant user ────────────────────────────────────────────
  const [user,        setUser]        = useState(() => load('elogix_user'))
  const [company,     setCompany]     = useState(() => load('elogix_company'))
  const [permissions, setPermissions] = useState(() => load('elogix_permissions', {}))
  const [tenant,      setTenant]      = useState(() => localStorage.getItem('elogix_tenant') || '')

  // ── eLogix SuperAdmin ──────────────────────────────────────
  const [adminUser,   setAdminUser]   = useState(() => load('elogix_admin_user'))
  const [isAdmin,     setIsAdmin]     = useState(() => !!localStorage.getItem('elogix_admin_token'))

  const isAuthenticated  = !!user && !!(sessionStorage.getItem('elogix_token') || localStorage.getItem('elogix_token'))
  const role             = user?.role  || 'employee'
  const level            = user?.level || 10
  const deptId           = user?.department_id || null
  const branchId         = user?.branch_id     || null
  const levelPerms       = LEVEL_PERMISSIONS[level] || LEVEL_PERMISSIONS[10]
  const isSuperAdmin     = level === 1 && role === 'super_admin'
  const companyName      = company?.name || ''
  const companyPlan      = company?.plan || 'trial'
  const companyStatus    = company?.status || 'trial'

  // ── Permission check ───────────────────────────────────────
  const can = useCallback((module, action = 'view') => {
    if (level === 1) return true
    const mp = permissions[module]
    if (mp) return !!mp[action]
    const actionMap = {
      view: levelPerms.canViewAll, create: levelPerms.canEdit,
      edit: levelPerms.canEdit,    delete: levelPerms.canDelete,
      approve: levelPerms.canApprove, export: levelPerms.canExport,
    }
    return !!actionMap[action]
  }, [level, permissions, levelPerms])

  const canAccess = useCallback((module) => can(module, 'view'), [can])

  // ── Tenant user login (company staff) ─────────────────────
  const loginTenant = useCallback((data, rememberMe = false) => {
    // If "Keep me signed in" → localStorage (persists across browser close)
    // Otherwise              → sessionStorage (clears when browser/tab closes)
    const store = rememberMe ? localStorage : sessionStorage
    store.setItem('elogix_token',         data.access_token)
    if (data.refresh_token) store.setItem('elogix_refresh_token', data.refresh_token)
    // User & company info always in sessionStorage (privacy)
    sessionStorage.setItem('elogix_user',        JSON.stringify(data.user))
    sessionStorage.setItem('elogix_company',     JSON.stringify(data.company))
    sessionStorage.setItem('elogix_permissions', JSON.stringify(data.permissions || {}))
    sessionStorage.setItem('elogix_tenant',      data.company.slug)
    // Remember preference in localStorage
    if (rememberMe) {
      localStorage.setItem('elogix_user',        JSON.stringify(data.user))
      localStorage.setItem('elogix_company',     JSON.stringify(data.company))
      localStorage.setItem('elogix_permissions', JSON.stringify(data.permissions || {}))
      localStorage.setItem('elogix_tenant',      data.company.slug)
      localStorage.setItem('elogix_remember',    'true')
    }
    setUser(data.user)
    setCompany(data.company)
    setPermissions(data.permissions || {})
    setTenant(data.company.slug)
  }, [])

  // ── eLogix SuperAdmin login ────────────────────────────────
  const loginAdmin = useCallback((adminData, adminKeyValue) => {
    localStorage.setItem('elogix_admin_token', adminData.access_token)
    localStorage.setItem('elogix_admin_user',  JSON.stringify(adminData.admin))
    if (adminKeyValue) localStorage.setItem('elogix_admin_key', adminKeyValue)
    setAdminUser(adminData.admin)
    setIsAdmin(true)
  }, [])

  // ── Logout ─────────────────────────────────────────────────
  const logout = useCallback(() => {
    const keys = ['elogix_token','elogix_refresh_token','elogix_user','elogix_company',
                  'elogix_permissions','elogix_tenant','elogix_remember']
    keys.forEach(k => { localStorage.removeItem(k); sessionStorage.removeItem(k) })
    sessionStorage.clear()
    setUser(null); setCompany(null); setPermissions({}); setTenant('')
  }, [])

  const logoutAdmin = useCallback(() => {
    // Clear from BOTH storages + reset React state
    ;['elogix_admin_token','elogix_admin_user','elogix_admin_key'].forEach(k => {
      localStorage.removeItem(k)
      sessionStorage.removeItem(k)
    })
    setAdminUser(null)
    setIsAdmin(false)    // ← this triggers useEffect in AppRouter → shows login
  }, [])

  const logoutAll = useCallback(() => {
    logout()
    logoutAdmin()
  }, [logout, logoutAdmin])

  // ── Dashboard route for current role ──────────────────────
  const getDashboardPage = useCallback(() => ROLE_DASHBOARD[role] || 'employee-dashboard', [role])

  return (
    <AuthContext.Provider value={{
      // Tenant user
      user, company, permissions, tenant,
      isAuthenticated, role, level, deptId, branchId,
      levelPerms, isSuperAdmin, companyName, companyPlan, companyStatus,
      can, canAccess, loginTenant, logout, getDashboardPage,
      // eLogix SuperAdmin
      adminUser, isAdmin, loginAdmin, logoutAdmin, logoutAll,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

export default AuthContext
