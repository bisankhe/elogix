// FILE: src/components/layout/Breadcrumb.jsx
// eLogix HRMS · eLogix Technologies
// Self-contained — no circular imports

export default function Breadcrumb() {
  // Read current page from session directly — no circular App import
  const page = (() => {
    try {
      const s = JSON.parse(
        sessionStorage.getItem('elogix_session') ||
        localStorage.getItem('elogix_session') || 'null'
      ) || {}
      return s?.last_page || ''
    } catch (_e) { return '' }
  })()

  const label = page
    ? page.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    : 'Dashboard'

  return (
    <div style={{ fontSize: 12, color: '#94a3b8', padding: '2px 0' }}>
      Home &rsaquo; {label}
    </div>
  )
}
