// FILE: src/utils/auth.js
// JWT token management — store, retrieve, refresh, validate
// Used across the app for API calls and route protection

const ACCESS_KEY  = 'elogix_access_token'
const REFRESH_KEY = 'elogix_refresh_token'
const USER_KEY    = 'elogix_user'

export const auth = {
  // Store tokens after login
  setTokens(accessToken, refreshToken) {
    localStorage.setItem(ACCESS_KEY, accessToken)
    if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken)
  },

  // Get current access token
  getToken() {
    return localStorage.getItem(ACCESS_KEY)
  },

  // Get refresh token
  getRefreshToken() {
    return localStorage.getItem(REFRESH_KEY)
  },

  // Store user profile
  setUser(user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  },

  // Get stored user
  getUser() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || 'null')
    } catch {
      return null
    }
  },

  // Check if token is expired (decode JWT payload)
  isTokenExpired(token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      return payload.exp * 1000 < Date.now()
    } catch {
      return true
    }
  },

  // Check if user is logged in with valid token
  isAuthenticated() {
    const token = this.getToken()
    if (!token) return false
    return !this.isTokenExpired(token)
  },

  // Get auth headers for API calls
  getHeaders() {
    const token = this.getToken()
    return token ? { 'Authorization': `Bearer ${token}` } : {}
  },

  // Refresh access token using refresh token
  async refresh() {
    const refreshToken = this.getRefreshToken()
    if (!refreshToken) throw new Error('No refresh token')
    const res = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
    if (!res.ok) { this.logout(); throw new Error('Refresh failed') }
    const data = await res.json()
    this.setTokens(data.access_token, data.refresh_token)
    return data.access_token
  },

  // Clear all auth data
  logout() {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
    localStorage.removeItem(USER_KEY)
    window.location.href = '/'
  },

  // Get company_id from token
  getCompanyId() {
    const token = this.getToken()
    if (!token) return null
    try {
      return JSON.parse(atob(token.split('.')[1])).company_id
    } catch { return null }
  },

  // Get role from token
  getRole() {
    const token = this.getToken()
    if (!token) return null
    try {
      return JSON.parse(atob(token.split('.')[1])).role
    } catch { return null }
  },
}

// API call helper — auto-attaches token, auto-refreshes if expired
export async function apiCall(url, options = {}) {
  if (auth.isAuthenticated()) {
    const token = auth.getToken()
    if (auth.isTokenExpired(token)) {
      await auth.refresh()
    }
  }
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...auth.getHeaders(), ...options.headers },
  })
  if (res.status === 401) { auth.logout(); return }
  return res
}

export default auth
