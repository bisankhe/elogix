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
    logout, logoutAdmin, logoutAll,
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
      // Use business-type landing page if available
      const landing = data?.landing || data?.goto || getDashboardPage()
      // Clear pending login session
      try { sessionStorage.removeItem('elogix_pending_login') } catch {}
      setInitialPage(landing)
      setPage('app')
    }
  }

  // ── Logout — MUST call AuthContext methods so React state updates ──
  const handleLogout = () => {
    // 1. Call AuthContext logout → clears state + localStorage + sessionStorage
    logoutAll()
    // 2. Force page to login immediately (useEffect will also catch this)
    setPage('login')
    setInitialPage(null)
  }

  // ── Admin-specific logout ──────────────────────────────────
  const handleAdminLogout = () => {
    // Clear admin tokens from both storages
    ;['elogix_admin_token','elogix_admin_user','elogix_admin_key'].forEach(k => {
      localStorage.removeItem(k)
      sessionStorage.removeItem(k)
    })
    // Update AuthContext isAdmin state → triggers useEffect → shows login
    logoutAdmin()
    setPage('login')
    setInitialPage(null)
  }

  if (page === 'login')        return <LoginPage    onLoginSuccess={handleLoginSuccess} />
  if (page === 'register')     return <RegisterPage onSuccess={() => setPage('login')} />
  if (page === 'elogix-admin') return <ELogixAdminPage onLogout={handleAdminLogout} />
  return <App initialPage={initialPage} onLogout={handleLogout} />
}
