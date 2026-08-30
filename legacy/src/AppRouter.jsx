// FILE: src/AppRouter.jsx
// eLogix HRMS — Root Router
// NOT authenticated → LoginPage
// eLogix Admin       → ELogixAdminPage
// Tenant user        → App (role-based dashboard)
// eLogix Technologies · www.elogix.com.np
import { useState, useEffect } from 'react'
import { useAuth }             from './context/AuthContext.jsx'
import LoginPage               from './pages/auth/LoginPage.jsx'
import RegisterPage            from './pages/auth/RegisterPage.jsx'
import App                     from './App.jsx'
import ELogixAdminPage         from './pages/elogix-admin/ELogixAdminPage.jsx'

export default function AppRouter() {
  const {
    isAuthenticated, isAdmin,
    logout,
    getDashboardPage,
  } = useAuth()

  const [page,        setPage]        = useState(null)
  const [initialPage, setInitialPage] = useState(null)

  // Decide which page to show whenever auth state changes
  useEffect(() => {
    const path = window.location.pathname
    if (path === '/register') { setPage('register'); return }

    if (isAdmin)          { setPage('elogix-admin'); return }
    if (isAuthenticated)  { setInitialPage(getDashboardPage()); setPage('app'); return }

    setPage('login')
  }, [isAuthenticated, isAdmin])

  if (page === null) return null

  // ── Login success ──────────────────────────────────────────
  const handleLoginSuccess = (data) => {
    if (data?.goto === 'elogix-admin' || data?.admin) {
      setPage('elogix-admin')
    } else {
      // data.goto is set by LoginPage.jsx to the ROLE-based landing key
      // from getLandingRoute() in tenantRouting.js.
      // Do NOT fall back to getDashboardPage() here — AuthContext.loginTenant()
      // runs async and getDashboardPage() may still return stale state.
      // data.goto (or data.landing) is always the freshly computed value.
      const landing = data?.goto || data?.landing || 'company-dashboard'
      try { sessionStorage.removeItem('elogix_pending_login') } catch {}
      setInitialPage(landing)
      setPage('app')
    }
  }

  // ── Logout — MUST call AuthContext methods so React state updates ──
  const handleLogout = () => {
    // logout() is the single method from AuthContext — clears all session
    // state, localStorage (elogix_session + all legacy keys), sessionStorage.
    logout()
    setPage('login')
    setInitialPage(null)
  }

  // ── Admin-specific logout ──────────────────────────────────
  const handleAdminLogout = () => {
    // Clear legacy admin keys in case they exist
    ;['elogix_admin_token','elogix_admin_user','elogix_admin_key'].forEach(k => {
      localStorage.removeItem(k)
      sessionStorage.removeItem(k)
    })
    // logout() clears elogix_admin_session (written by AuthContext.loginAdmin)
    // and updates isAdmin → false → triggers useEffect → shows login
    logout()
    setPage('login')
    setInitialPage(null)
  }

  if (page === 'login')        return <LoginPage    onLoginSuccess={handleLoginSuccess} />
  if (page === 'register')     return <RegisterPage onSuccess={() => setPage('login')} />
  if (page === 'elogix-admin') return <ELogixAdminPage onLogout={handleAdminLogout} />
  return <App initialPage={initialPage} onLogout={handleLogout} />
}
