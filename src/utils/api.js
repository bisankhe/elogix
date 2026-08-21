/**
 * FILE: src/utils/api.js
 * eLogix HRMS — Tenant-aware API client
 * eLogix Technologies · www.elogix.com.np
 */

// Auto-detect: use relative /api in production (nginx proxies it)
// Use VITE_API_URL env var to override for external API
const IS_DEV     = import.meta.env.DEV
const ELOGIX_API = import.meta.env.VITE_API_URL ||
  (IS_DEV ? 'http://localhost:5000/api/v1' : '/api/v1')
const ELOGIX_ADMIN = import.meta.env.VITE_ADMIN_URL || 'https://www.elogix.com.np/api/elogix-admin/v1'

// ── Tenant detection (subdomain → localStorage → null) ────────
export function getTenantSlug() {
  const host  = window.location.hostname
  const parts = host.split('.')
  const SKIP  = ['www','app','admin','api','elogix','localhost']
  if (parts.length >= 3 && !SKIP.includes(parts[0])) return parts[0]
  return localStorage.getItem('elogix_tenant') || null
}

export function isELogixAdminDomain() {
  const host = window.location.hostname
  return host === 'admin.elogix.com.np' || host === 'localhost' && window.location.pathname.startsWith('/elogix-admin')
}

// ── Auth headers ───────────────────────────────────────────────
function eLogixHeaders(extra = {}, useAdminKey = false) {
  const h = { 'Content-Type': 'application/json', 'X-App': 'eLogix' }
  const token  = localStorage.getItem(useAdminKey ? 'elogix_admin_token' : 'elogix_token')
  const tenant = getTenantSlug()
  if (token)  h['Authorization'] = `Bearer ${token}`
  if (tenant) h['X-Tenant-Id']   = tenant
  if (useAdminKey) {
    const adminKey = localStorage.getItem('elogix_admin_key')
    if (adminKey) h['X-eLogix-Admin-Key'] = adminKey
  }
  return { ...h, ...extra }
}

// ── Refresh token ──────────────────────────────────────────────
async function refreshToken() {
  const refresh = localStorage.getItem('elogix_refresh_token')
  if (!refresh) return false
  try {
    const res = await fetch(`${ELOGIX_API}/auth/refresh`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refresh }),
    })
    if (!res.ok) return false
    const data = await res.json()
    if (data.access_token) {
      localStorage.setItem('elogix_token', data.access_token)
      return true
    }
  } catch { return false }
  return false
}

// ── Core fetch ─────────────────────────────────────────────────
async function eLogixFetch(endpoint, options = {}, admin = false) {
  const base    = admin ? ELOGIX_ADMIN : ELOGIX_API
  const url     = `${base}${endpoint}`
  const headers = eLogixHeaders(options.headers || {}, admin)
  try {
    const res = await fetch(url, { ...options, headers })
    if (res.status === 401 && !admin) {
      const ok = await refreshToken()
      if (ok) {
        headers['Authorization'] = `Bearer ${localStorage.getItem('elogix_token')}`
        const retry = await fetch(url, { ...options, headers })
        return retry.json()
      }
      localStorage.clear()
      window.location.href = '/login'
      return
    }
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || `eLogix API error ${res.status}`)
    return data
  } catch (err) {
    // Offline / dev mode — return mock success
    if (import.meta.env.DEV) {
      console.warn('[eLogix DEV] API offline, returning mock:', endpoint)
      return { success: true, mock: true }
    }
    throw err
  }
}

// ── Exported API surface ───────────────────────────────────────
export const eLogixAPI = {
  // Auth
  login:           (body)  => eLogixFetch('/auth/login', { method:'POST', body:JSON.stringify(body) }),
  adminLogin:      (body)  => eLogixFetch('/auth/admin-login', { method:'POST', body:JSON.stringify(body) }, true),
  logout:          ()      => eLogixFetch('/auth/logout', { method:'POST' }),
  me:              ()      => eLogixFetch('/auth/me'),
  refreshToken,

  // Tenant management (eLogix SuperAdmin)
  createCompany:   (body)  => eLogixFetch('/auth/register-company', { method:'POST', body:JSON.stringify(body) }),
  listCompanies:   (q='')  => eLogixFetch(`/companies${q}`, {}, true),
  getCompany:      (slug)  => eLogixFetch(`/companies/${slug}`, {}, true),
  updateCompanyPlan:(slug,b)=> eLogixFetch(`/companies/${slug}/plan`, { method:'PUT', body:JSON.stringify(b) }, true),
  setCompanyStatus:(slug,b) => eLogixFetch(`/companies/${slug}/status`, { method:'PUT', body:JSON.stringify(b) }, true),
  generateInvoice: (slug,b) => eLogixFetch(`/companies/${slug}/invoices`, { method:'POST', body:JSON.stringify(b) }, true),
  notifyCompany:   (slug,b) => eLogixFetch(`/companies/${slug}/notify`, { method:'POST', body:JSON.stringify(b) }, true),
  broadcastAll:    (b)     => eLogixFetch('/notify-all', { method:'POST', body:JSON.stringify(b) }, true),
  adminDashboard:  ()      => eLogixFetch('/dashboard', {}, true),

  // Company users
  getUsers:        (q='')  => eLogixFetch(`/users${q}`),
  createUser:      (b)     => eLogixFetch('/users', { method:'POST', body:JSON.stringify(b) }),
  updateUser:      (id,b)  => eLogixFetch(`/users/${id}`, { method:'PUT', body:JSON.stringify(b) }),

  // Billing
  getPlan:         ()      => eLogixFetch('/billing/plan'),
  getInvoices:     ()      => eLogixFetch('/billing/invoices'),
  getNotifications:()      => eLogixFetch('/billing/notifications'),
  createTicket:    (b)     => eLogixFetch('/billing/tickets', { method:'POST', body:JSON.stringify(b) }),

  // Salary & Tax
  calculateSalary: (b)     => eLogixFetch('/salary/calculate', { method:'POST', body:JSON.stringify(b) }),
  getTaxSlabs:     ()      => eLogixFetch('/tax/slabs'),
}

export { eLogixFetch }
