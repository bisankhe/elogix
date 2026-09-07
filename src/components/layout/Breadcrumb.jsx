// FILE: src/components/layout/Breadcrumb.jsx
// eLogix HRMS · eLogix Technologies

import { useApp } from '../../App.jsx'

export default function Breadcrumb() {
  const { sub } = useApp()
  const page = sub?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Dashboard'
  return (
    <div style={{ fontSize: 12, color: '#94a3b8', padding: '2px 0' }}>
      Home &rsaquo; {page}
    </div>
  )
}
