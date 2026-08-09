// FILE: src/main.jsx
// eLogix HRMS — App entry point
// 1. Mounts React
// 2. Dismisses the #app-splash HTML overlay immediately
// eLogix Technologies · www.elogix.com.np
import { StrictMode } from 'react'
import { createRoot }  from 'react-dom/client'
import './index.css'
import AppRouter        from './AppRouter.jsx'
import { AuthProvider } from './context/AuthContext.jsx'

// ── Dismiss the HTML splash screen immediately after React mounts ──
function dismissSplash() {
  const splash = document.getElementById('app-splash')
  if (splash) {
    splash.classList.add('splash-hide')
    // Remove from DOM after CSS transition (0.5s)
    setTimeout(() => {
      if (splash.parentNode) splash.parentNode.removeChild(splash)
    }, 600)
  }
}

const root = createRoot(document.getElementById('root'))

root.render(
  <StrictMode>
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  </StrictMode>
)

// Dismiss splash right after React renders
dismissSplash()
