// FILE: src/AppRouter.jsx
// eLogix HRMS — Root Router
// Decides which page to show based on auth state
// NOT authenticated → LoginPage
// eLogix Admin token → ELogixAdminPage
// Tenant token → App (role-based dashboard)
// eLogix Technologies · www.elogix.com.np
import { useState, useEffect } from 'react'
import { useAuth } from './context/AuthContext.jsx'
import LoginPage       from './pages/auth/LoginPage.jsx'
import RegisterPage    from './pages/auth/RegisterPage.jsx'
import App             from './App.jsx'
import ELogixAdminPage from './pages/elogix-admin/ELogixAdminPage.jsx'

export default function AppRouter() {
  const { isAuthenticated, isAdmin, getDashboardPage } = useAuth()
  const [page,        setPage]        = useState(null)   // null = deciding
  const [initialPage, setInitialPage] = useState(null)

  useEffect(() => {
    // Determine which page to show
    const path = window.location.pathname

    if (path === '/register') { setPage('register'); return }

    // eLogix SuperAdmin
    if (isAdmin) { setPage('elogix-admin'); return }

    // Tenant user authenticated
    if (isAuthenticated) {
      setInitialPage(getDashboardPage())
      setPage('app')
      return
    }

    // Not authenticated → always show login
    setPage('login')
  }, [isAuthenticated, isAdmin])

  // ── Still deciding (very brief, no splash screen needed) ──
  if (page === null) return null

  const handleLoginSuccess = (data) => {
    if (data?.goto === 'elogix-admin' || data?.admin) {
      setPage('elogix-admin')
    } else {
      setInitialPage(data?.goto || getDashboardPage())
      setPage('app')
    }
  }

  const handleLogout = () => {
    setPage('login')
    setInitialPage(null)
  }

  if (page === 'login')        return <LoginPage    onLoginSuccess={handleLoginSuccess} />
  if (page === 'register')     return <RegisterPage onSuccess={() => setPage('login')} />
  if (page === 'elogix-admin') return <ELogixAdminPage onLogout={handleLogout} />
  return <App initialPage={initialPage} onLogout={handleLogout} />
}
