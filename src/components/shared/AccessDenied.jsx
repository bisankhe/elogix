// FILE: src/components/shared/AccessDenied.jsx
// Shown when a tenant tries to access a page/module not granted by eLogix SuperAdmin
import { getSessionSlug } from '../../utils/tenantPermissions.js'

export default function AccessDenied({ moduleName = 'This feature', contactAdmin = true }) {
  const slug = getSessionSlug()
  return (
    <div style={{
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      minHeight:'60vh', padding:'40px 20px', textAlign:'center',
      fontFamily:"'Segoe UI',system-ui,sans-serif",
    }}>
      <div style={{ fontSize:56, marginBottom:16 }}>🔐</div>
      <div style={{ fontSize:20, fontWeight:800, color:'#0f172a', marginBottom:8 }}>
        Access Not Granted
      </div>
      <div style={{ fontSize:14, color:'#64748b', maxWidth:420, lineHeight:1.7, marginBottom:24 }}>
        <strong>{moduleName}</strong> is not included in your current eLogix plan or has not been
        enabled by eLogix SuperAdmin for <strong>{slug ? `${slug}.elogix.com.np` : 'your company'}</strong>.
      </div>

      {contactAdmin && (
        <div style={{ background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:12,
          padding:'16px 24px', maxWidth:420, fontSize:12, color:'#1d4ed8', lineHeight:1.8 }}>
          <div style={{ fontWeight:800, marginBottom:6 }}>How to get access:</div>
          <div>1. Contact <strong>eLogix Support</strong> to upgrade your plan</div>
          <div>2. Email: <strong>support@elogix.com.np</strong></div>
          <div>3. Your SuperAdmin can request module activation</div>
        </div>
      )}

      <div style={{ marginTop:24, display:'flex', gap:10, flexWrap:'wrap', justifyContent:'center' }}>
        <button onClick={() => window.history.back()}
          style={{ padding:'10px 20px', borderRadius:9, border:'1px solid #e2e8f0',
            background:'#fff', color:'#374151', fontSize:12, fontWeight:600, cursor:'pointer' }}>
          ← Go Back
        </button>
        <a href="mailto:support@elogix.com.np"
          style={{ padding:'10px 20px', borderRadius:9, border:'none',
            background:'linear-gradient(135deg,#0369a1,#0ea5e9)', color:'#fff',
            fontSize:12, fontWeight:700, textDecoration:'none' }}>
          📧 Contact Support
        </a>
      </div>
    </div>
  )
}
