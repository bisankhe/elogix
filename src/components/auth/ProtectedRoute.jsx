// FILE: src/components/auth/ProtectedRoute.jsx
// eLogix HRMS — Route Guard
// Guards every page: auth check + role check + plan check
// eLogix Technologies · www.elogix.com.np
import { useEffect, useState } from 'react'
import LoadingScreen from '../shared/LoadingScreen.jsx'
import { useAuth } from '../../context/AuthContext.jsx'

export default function ProtectedRoute({ children, requiredLevel = null, requiredRole = null, module = null }) {
  const { isAuthenticated, level, role, canAccess, company } = useAuth()
  const [checking, setChecking] = useState(true)
  const [denied,   setDenied]   = useState(null)

  useEffect(() => {
    const check = async () => {
      // 1. Not authenticated → login
      if (!isAuthenticated) {
        const token = localStorage.getItem('elogix_token')
        if (!token) { window.location.href = '/login'; return }
        // Try refresh
        try {
          const slug    = localStorage.getItem('elogix_tenant') || ''
          const refresh = localStorage.getItem('elogix_refresh_token')
          const res     = await fetch('/api/v1/auth/refresh', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ refresh_token: refresh })
          })
          if (!res.ok) { window.location.href = '/login'; return }
          const data = await res.json()
          if (data.access_token) localStorage.setItem('elogix_token', data.access_token)
          else { window.location.href = '/login'; return }
        } catch { window.location.href = '/login'; return }
      }

      // 2. Company suspended / cancelled
      if (company && !['active','trial'].includes(company.status)) {
        setDenied({
          icon: '⚠️',
          title: `eLogix Account ${company.status.charAt(0).toUpperCase()+company.status.slice(1)}`,
          message: company.status === 'suspended'
            ? 'Your eLogix account has been suspended. Please contact support@elogix.com.np to reactivate.'
            : 'Your eLogix account has been cancelled.',
          action: 'Contact support@elogix.com.np'
        })
        setChecking(false); return
      }

      // 3. Level check
      if (requiredLevel && level > requiredLevel) {
        setDenied({
          icon: '🔒', title: 'Access Restricted',
          message: `This page requires authority level ${requiredLevel} or above. Your level: ${level}.`,
          action: 'Contact your HR Administrator'
        })
        setChecking(false); return
      }

      // 4. Role check
      if (requiredRole) {
        const allowed = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
        if (!allowed.includes(role)) {
          setDenied({
            icon: '🚫', title: 'Permission Denied',
            message: `This page requires role: ${allowed.join(' or ')}. Your role: ${role}.`,
            action: 'Contact your HR Administrator'
          })
          setChecking(false); return
        }
      }

      // 5. Module access check
      if (module && !canAccess(module)) {
        setDenied({
          icon: '🔐', title: 'Module Access Denied',
          message: `You do not have permission to access the ${module} module.`,
          action: 'Contact your HR Administrator'
        })
        setChecking(false); return
      }

      setChecking(false)
    }
    check()
  }, [isAuthenticated, level, role, company])

  if (checking) return <LoadingScreen message="Verifying eLogix access..." />

  if (denied) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
                   background:'#f8fafc', fontFamily:'system-ui,sans-serif', padding:24 }}>
      <div style={{ textAlign:'center', maxWidth:420 }}>
        <div style={{ fontSize:64, marginBottom:12 }}>{denied.icon}</div>
        <div style={{ fontSize:22, fontWeight:900, color:'#0f172a', marginBottom:8 }}>{denied.title}</div>
        <div style={{ fontSize:13, color:'#64748b', marginBottom:24, lineHeight:1.7 }}>{denied.message}</div>
        <div style={{ fontSize:12, color:'#0369a1', background:'#f0f9ff', padding:'10px 16px',
                       borderRadius:10, marginBottom:20 }}>{denied.action}</div>
        <button onClick={()=>window.history.back()}
          style={{ padding:'10px 24px', borderRadius:9, border:'1.5px solid #e2e8f0',
                    background:'#fff', fontSize:12, cursor:'pointer', marginRight:8 }}>
          ← Go Back
        </button>
        <button onClick={()=>window.location.href='/'}
          style={{ padding:'10px 24px', borderRadius:9, border:'none',
                    background:'linear-gradient(135deg,#0c4a6e,#0369a1)',
                    color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}>
          🏠 Dashboard
        </button>
      </div>
    </div>
  )

  return children
}
