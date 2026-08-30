// FILE: src/components/shared/ErrorBoundary.jsx
// eLogix HRMS — Global Error Boundary + Toast System
// Catches ALL React errors + shows API error toasts
// Deployment team: "Happy path good but sad path not covered"
// This file covers ALL sad paths at the app level
// eLogix Technologies · www.elogix.com.np

import { Component, useState, useEffect } from 'react'
import { useToast } from '../../hooks/useAPI.js'

// ── Global Toast UI ───────────────────────────────────────────────────
export function ToastContainer() {
  const toasts = useToast()

  if (!toasts.length) return null

  return (
    <div style={{
      position: 'fixed', bottom: 20, right: 20, zIndex: 99999,
      display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 380,
    }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          padding: '12px 16px',
          borderRadius: 10,
          fontSize: 13,
          fontWeight: 600,
          fontFamily: "'Segoe UI', system-ui, sans-serif",
          boxShadow: '0 4px 20px rgba(0,0,0,.15)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
          animation: 'slideIn .2s ease',
          background: {
            error  : '#fef2f2',
            success: '#f0fdf4',
            warning: '#fffbeb',
            info   : '#eff6ff',
          }[t.type] || '#fef2f2',
          color: {
            error  : '#dc2626',
            success: '#16a34a',
            warning: '#d97706',
            info   : '#2563eb',
          }[t.type] || '#dc2626',
          border: `1px solid ${
            { error:'#fecaca', success:'#bbf7d0', warning:'#fde68a', info:'#bfdbfe' }[t.type] || '#fecaca'
          }`,
        }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>
            {t.type === 'success' ? '✅' :
             t.type === 'warning' ? '⚠️' :
             t.type === 'info'    ? 'ℹ️' : '❌'}
          </span>
          <span>{t.message}</span>
        </div>
      ))}
      <style>{`@keyframes slideIn { from { opacity:0; transform:translateX(20px) } to { opacity:1; transform:translateX(0) } }`}</style>
    </div>
  )
}

// ── Offline Banner ────────────────────────────────────────────────────
export function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine)

  useEffect(() => {
    const on  = () => setOffline(false)
    const off = () => setOffline(true)
    window.addEventListener('online',  on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  if (!offline) return null

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 99998,
      background: '#f59e0b', color: '#fff', textAlign: 'center',
      padding: '8px 16px', fontSize: 13, fontWeight: 700,
      fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>
      📡 No internet connection — some features may not work
    </div>
  )
}

// ── Session Expired Handler ───────────────────────────────────────────
export function SessionWatcher() {
  useEffect(() => {
    const handler = () => {
      // Clear auth data
      localStorage.removeItem('access_token')
      localStorage.removeItem('elogix_token')
      sessionStorage.removeItem('elogix_session')
      // Redirect to login
      const current = window.location.pathname
      if (current !== '/login' && current !== '/register') {
        window.location.href = `/login?redirect=${encodeURIComponent(current)}&reason=session_expired`
      }
    }
    window.addEventListener('elogix:session-expired', handler)
    return () => window.removeEventListener('elogix:session-expired', handler)
  }, [])

  return null
}

// ── React Error Boundary (class component — React requirement) ────────
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[eLogix] React Error Boundary caught:', error, errorInfo)
    this.setState({ errorInfo })
    // In production: send to error tracking service
    if (typeof window !== 'undefined' && window.ELOGIX_ERROR_TRACKING) {
      window.ELOGIX_ERROR_TRACKING.capture(error, errorInfo)
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#f8fafc',
          fontFamily: "'Segoe UI', system-ui, sans-serif",
          padding: 20,
        }}>
          <div style={{
            maxWidth: 520, width: '100%',
            background: '#fff', borderRadius: 16,
            padding: 40, textAlign: 'center',
            boxShadow: '0 4px 32px rgba(0,0,0,.1)',
            border: '1px solid #fee2e2',
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <h2 style={{ color: '#dc2626', marginBottom: 8, fontSize: 20 }}>
              Something went wrong
            </h2>
            <p style={{ color: '#64748b', marginBottom: 24, lineHeight: 1.6 }}>
              An unexpected error occurred. Please refresh the page.
              If the problem continues, contact{' '}
              <a href="mailto:support@elogix.com.np" style={{ color: '#7c3aed' }}>
                support@elogix.com.np
              </a>
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '10px 24px', borderRadius: 8, border: 'none',
                  background: 'linear-gradient(135deg,#4c1d95,#7c3aed)',
                  color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                }}
              >
                🔄 Refresh Page
              </button>
              <button
                onClick={() => window.location.href = '/'}
                style={{
                  padding: '10px 24px', borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  background: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                }}
              >
                🏠 Go Home
              </button>
            </div>
            {import.meta.env.DEV && this.state.error && (
              <details style={{ marginTop: 24, textAlign: 'left' }}>
                <summary style={{ cursor: 'pointer', color: '#94a3b8', fontSize: 12 }}>
                  Error details (dev only)
                </summary>
                <pre style={{
                  marginTop: 8, padding: 12, background: '#f8fafc',
                  borderRadius: 8, fontSize: 11, overflowX: 'auto',
                  color: '#dc2626', border: '1px solid #fee2e2',
                }}>
                  {this.state.error?.toString()}{'\n\n'}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ── Module Error Boundary (for individual pages) ──────────────────────
export function PageErrorBoundary({ children, pageName = 'This page' }) {
  return (
    <ErrorBoundary
      fallback={
        <div style={{
          padding: 40, textAlign: 'center',
          fontFamily: "'Segoe UI', system-ui, sans-serif",
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>😕</div>
          <h3 style={{ color: '#dc2626' }}>{pageName} failed to load</h3>
          <p style={{ color: '#64748b' }}>Please refresh or contact support.</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 16, padding: '8px 20px', borderRadius: 8,
              border: 'none', background: '#7c3aed', color: '#fff',
              cursor: 'pointer', fontWeight: 700,
            }}
          >
            Refresh
          </button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}

export default ErrorBoundary
