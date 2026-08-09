/// FILE: src/components/shared/TenantBanner.jsx
// eLogix HRMS — Tenant Company Banner
// Shows company name, plan, user role on every dashboard page
// Data comes from JWT (elogix_token) stored at login
// eLogix Technologies · www.elogix.com.np
import { getTenantContext } from '../../data/rolePersonaMap.js'

const PLAN_COLORS = {
  trial:     { bg:'#f0fdf4', text:'#065f46', border:'#bbf7d0' },
  starter:   { bg:'#f0f9ff', text:'#0c4a6e', border:'#bae6fd' },
  growth:    { bg:'#eff6ff', text:'#1e40af', border:'#bfdbfe' },
  business:  { bg:'#f5f3ff', text:'#4c1d95', border:'#ddd6fe' },
  enterprise:{ bg:'#fffbeb', text:'#78350f', border:'#fde68a' },
  unlimited: { bg:'#fef2f2', text:'#7f1d1d', border:'#fecaca' },
}

export default function TenantBanner({ className }) {
  const ctx = getTenantContext()
  if (!ctx.isAuthenticated || !ctx.companyName) return null

  const pc = PLAN_COLORS[ctx.plan] || PLAN_COLORS.trial

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '4px 14px',
      background: pc.bg, border: `1px solid ${pc.border}`,
      borderRadius: 8, fontSize: 10, flexWrap: 'wrap',
    }}>
      <span style={{ fontWeight: 800, color: pc.text }}>🏢 {ctx.companyName}</span>
      <span style={{ color: '#94a3b8' }}>·</span>
      <span style={{ color: pc.text, fontWeight: 700, textTransform: 'capitalize' }}>
        {ctx.plan}
      </span>
      <span style={{ color: '#94a3b8' }}>·</span>
      <span style={{ color: '#475569' }}>
        {ctx.userName} ({ctx.role?.replace(/_/g,' ')})
      </span>
      {ctx.tenantSlug && (
        <>
          <span style={{ color: '#94a3b8' }}>·</span>
          <span style={{ color: '#64748b', fontSize: 9 }}>
            {ctx.tenantSlug}.elogix.com.np
          </span>
        </>
      )}
    </div>
  )
}
