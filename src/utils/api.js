// FILE: src/utils/api.js
// eLogix HRMS — Universal API Client
// Connects Frontend → Backend → Database
// Handles: auth, tenant isolation, errors, retry, offline detection
// eLogix Technologies · www.elogix.com.np

// ── Base URL ──────────────────────────────────────────────────────────
// In dev: Vite proxy forwards /api → http://localhost:5000
// In prod: nginx forwards /api → gunicorn:5000
const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'

// ── Session helpers ───────────────────────────────────────────────────
function getSession() {
  try {
    return JSON.parse(
      sessionStorage.getItem('elogix_session') ||
      localStorage.getItem('elogix_session') || 'null'
    ) || {}
  } catch { return {} }
}

function getToken() {
  return localStorage.getItem('access_token') ||
         localStorage.getItem('elogix_token') ||
         getSession()?.token || ''
}

function getTenantSlug() {
  return getSession()?.company?.slug ||
         localStorage.getItem('elogix_tenant_slug') || ''
}

// ── Offline detection ─────────────────────────────────────────────────
function isOnline() {
  return navigator.onLine !== false
}

// ── Request counter for retry ─────────────────────────────────────────
const RETRY_CODES = new Set([408, 429, 502, 503, 504])

// ── Core fetch wrapper ────────────────────────────────────────────────
async function apiFetch(endpoint, options = {}, retries = 2) {
  // Sad path: offline
  if (!isOnline()) {
    throw new APIError('No internet connection. Please check your network.', 0, 'OFFLINE')
  }

  const token = getToken()
  const slug  = getTenantSlug()

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(slug  ? { 'X-Tenant-Slug': slug } : {}),
    ...(options.headers || {}),
  }

  const config = {
    ...options,
    headers,
    // Timeout via AbortController
    signal: options.signal || AbortSignal.timeout(30000),
  }

  let lastError
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${BASE_URL}${endpoint}`, config)

      // Sad path: token expired
      if (res.status === 401) {
        localStorage.removeItem('access_token')
        sessionStorage.removeItem('elogix_session')
        window.dispatchEvent(new CustomEvent('elogix:session-expired'))
        throw new APIError('Session expired. Please log in again.', 401, 'UNAUTHORIZED')
      }

      // Sad path: no permission
      if (res.status === 403) {
        throw new APIError('You do not have permission to perform this action.', 403, 'FORBIDDEN')
      }

      // Sad path: not found
      if (res.status === 404) {
        throw new APIError('The requested resource was not found.', 404, 'NOT_FOUND')
      }

      // Sad path: validation error from backend
      if (res.status === 422) {
        const body = await res.json().catch(() => ({}))
        const msg  = body.detail?.[0]?.msg || body.message || 'Validation error'
        throw new APIError(msg, 422, 'VALIDATION_ERROR', body.detail)
      }

      // Sad path: server error — retry if retryable
      if (!res.ok && RETRY_CODES.has(res.status) && attempt < retries) {
        await sleep(500 * Math.pow(2, attempt)) // exponential backoff
        lastError = new APIError(`Server error (${res.status}). Retrying...`, res.status)
        continue
      }

      // Sad path: other server error
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new APIError(
          body.error || body.message || `Request failed (${res.status})`,
          res.status,
          body.code || 'SERVER_ERROR'
        )
      }

      // Happy path
      const contentType = res.headers.get('Content-Type') || ''
      if (contentType.includes('application/json')) {
        return await res.json()
      }
      return await res.text()

    } catch (err) {
      if (err instanceof APIError) throw err
      // Network error
      if (attempt < retries) {
        await sleep(500 * Math.pow(2, attempt))
        lastError = err
        continue
      }
      throw new APIError(
        'Cannot reach the server. Please try again.',
        0,
        'NETWORK_ERROR'
      )
    }
  }
  throw lastError
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

// ── Custom Error class ────────────────────────────────────────────────
export class APIError extends Error {
  constructor(message, status = 0, code = 'ERROR', details = null) {
    super(message)
    this.name    = 'APIError'
    this.status  = status
    this.code    = code
    this.details = details
  }
  get isAuth()       { return this.status === 401 }
  get isForbidden()  { return this.status === 403 }
  get isNotFound()   { return this.status === 404 }
  get isValidation() { return this.status === 422 }
  get isOffline()    { return this.code === 'OFFLINE' || this.code === 'NETWORK_ERROR' }
}

// ── HTTP Methods ──────────────────────────────────────────────────────
export const api = {
  get   : (url, opts = {})        => apiFetch(url, { method: 'GET',    ...opts }),
  post  : (url, data, opts = {})  => apiFetch(url, { method: 'POST',   body: JSON.stringify(data), ...opts }),
  put   : (url, data, opts = {})  => apiFetch(url, { method: 'PUT',    body: JSON.stringify(data), ...opts }),
  patch : (url, data, opts = {})  => apiFetch(url, { method: 'PATCH',  body: JSON.stringify(data), ...opts }),
  delete: (url, opts = {})        => apiFetch(url, { method: 'DELETE', ...opts }),

  // File upload (no Content-Type header — browser sets multipart boundary)
  upload: (url, formData, opts = {}) => apiFetch(url, {
    method : 'POST',
    body   : formData,
    headers: {
      ...(getToken() ? { 'Authorization': `Bearer ${getToken()}` } : {}),
      ...(getTenantSlug() ? { 'X-Tenant-Slug': getTenantSlug() } : {}),
    },
    ...opts,
  }),
}

// ═══════════════════════════════════════════════════════════════════════
// DOMAIN API METHODS
// Each section connects one frontend module to its backend route
// ═══════════════════════════════════════════════════════════════════════

// ── Auth ──────────────────────────────────────────────────────────────
export const authAPI = {
  login    : (email, password) => api.post('/auth/login',   { email, password }),
  logout   : ()                => api.post('/auth/logout',  {}),
  refresh  : ()                => api.post('/auth/refresh', {}),
  me       : ()                => api.get('/auth/me'),
  register : (data)            => api.post('/auth/register', data),
  resetPassword: (email)       => api.post('/auth/reset-password', { email }),
}

// ── Employees ─────────────────────────────────────────────────────────
export const employeeAPI = {
  list     : (params = {})  => api.get(`/employees?${new URLSearchParams(params)}`),
  get      : (id)           => api.get(`/employees/${id}`),
  create   : (data)         => api.post('/employees', data),
  update   : (id, data)     => api.patch(`/employees/${id}`, data),
  delete   : (id)           => api.delete(`/employees/${id}`),
  search   : (q)            => api.get(`/employees?search=${encodeURIComponent(q)}`),
  export   : ()             => api.get('/employees/export'),
  import   : (file)         => {
    const fd = new FormData(); fd.append('file', file)
    return api.upload('/employees/import', fd)
  },
  documents: (id)           => api.get(`/employee-docs/${id}`),
  timeline : (id)           => api.get(`/employees/${id}/timeline`),
}

// ── Attendance ────────────────────────────────────────────────────────
export const attendanceAPI = {
  daily        : (date, params = {})  => api.get(`/attendance?date=${date}&${new URLSearchParams(params)}`),
  punch        : (data)               => api.post('/attendance/punch', data),
  biometric    : ()                   => api.get('/biometric/devices'),
  syncBiometric: (deviceId)           => api.post(`/biometric/devices/${deviceId}/sync`),
  regularize   : (data)               => api.post('/attendance-regularization', data),
  process      : (month, year)        => api.post('/attendance-processing', { month, year }),
  monthly      : (empId, month, year) => api.get(`/attendance?employee_id=${empId}&month=${month}&year=${year}`),
  roster       : (params = {})        => api.get(`/roster?${new URLSearchParams(params)}`),
  updateRoster : (data)               => api.post('/roster', data),
  gps          : (data)               => api.post('/attendance/gps', data),
  overtime     : (params = {})        => api.get(`/overtime?${new URLSearchParams(params)}`),
}

// ── Leave ─────────────────────────────────────────────────────────────
export const leaveAPI = {
  balance  : (params = {}) => api.get(`/leave/balance?${new URLSearchParams(params)}`),
  apply    : (data)        => api.post('/leave', data),
  list     : (params = {}) => api.get(`/leave?${new URLSearchParams(params)}`),
  approve  : (id, data)    => api.patch(`/leave/${id}/approve`, data),
  reject   : (id, data)    => api.patch(`/leave/${id}/reject`, data),
  cancel   : (id)          => api.delete(`/leave/${id}`),
  types    : ()            => api.get('/leave-setup/types'),
  calendar : (month, year) => api.get(`/leave/calendar?month=${month}&year=${year}`),
}

// ── Payroll ───────────────────────────────────────────────────────────
export const payrollAPI = {
  process  : (month, year) => api.post('/payroll', { month, year }),
  list     : (params = {}) => api.get(`/payroll?${new URLSearchParams(params)}`),
  slip     : (id)          => api.get(`/payroll/${id}/slip`),
  finalize : (id)          => api.post(`/payroll-finalization/${id}`),
  tax      : (empId, year) => api.get(`/salary-tax?employee_id=${empId}&year=${year}`),
  structure: ()            => api.get('/payroll-setup/structures'),
}

// ── Recruitment / ATS ─────────────────────────────────────────────────
export const recruitmentAPI = {
  jobs      : (params = {}) => api.get(`/recruitment/jobs?${new URLSearchParams(params)}`),
  createJob : (data)        => api.post('/recruitment/jobs', data),
  applicants: (jobId)       => api.get(`/ats/applicants?job_id=${jobId}`),
  apply     : (data)        => api.post('/ats/applicants', data),
  interview : (data)        => api.post('/ats/interviews', data),
  offer     : (data)        => api.post('/ats/offers', data),
  pipeline  : (jobId)       => api.get(`/ats/pipeline?job_id=${jobId}`),
}

// ── Performance ───────────────────────────────────────────────────────
export const performanceAPI = {
  list       : (params = {}) => api.get(`/performance?${new URLSearchParams(params)}`),
  create     : (data)        => api.post('/performance', data),
  goals      : (empId)       => api.get(`/goals?employee_id=${empId}`),
  kpis       : ()            => api.get('/kpi'),
  360feedback: (empId)       => api.get(`/pms360?employee_id=${empId}`),
}

// ── SaaS Admin ────────────────────────────────────────────────────────
export const elogixAdminAPI = {
  companies      : ()       => api.get('/elogix-admin/v1/companies'),
  pendingCompanies: ()      => api.get('/elogix-admin/v1/pending-companies'),
  register       : (data)   => api.post('/elogix-admin/v1/register-company', data),
  approve        : (slug, d)=> api.post(`/elogix-admin/v1/companies/${slug}/approve`, d),
  reject         : (slug)   => api.post(`/elogix-admin/v1/companies/${slug}/reject`),
  suspend        : (slug)   => api.post(`/elogix-admin/v1/companies/${slug}/suspend`),
  modulePermissions: (slug) => api.get(`/elogix-admin/v1/companies/${slug}/modules`),
  updateModules  : (slug,d) => api.post(`/elogix-admin/v1/companies/${slug}/modules`, d),
}

// ── AI Features ───────────────────────────────────────────────────────
export const aiAPI = {
  chat    : (messages, context = {}) => api.post('/ai/chat', { messages, context }),
  analyze : (type, data)             => api.post('/ai/analyze', { type, data }),
  insights: (module)                 => api.get(`/ai/insights?module=${module}`),
  suggest : (context)                => api.post('/ai/suggest', context),
}

// ── Reports ───────────────────────────────────────────────────────────
export const reportAPI = {
  generate : (type, params = {}) => api.post(`/reports/${type}`, params),
  download : (id)                => api.get(`/reports/${id}/download`),
  list     : ()                  => api.get('/reports'),
  analytics: (module, params={}) => api.get(`/hr-analytics?module=${module}&${new URLSearchParams(params)}`),
}

// ── Health check ──────────────────────────────────────────────────────
export const healthCheck = () =>
  fetch('/api/health').then(r => r.json()).catch(() => ({ status: 'error' }))

// ── Default export ────────────────────────────────────────────────────
export default api
export { apiFetch, getToken, getTenantSlug, getSession }
