// FILE: src/main.jsx
// eLogix HRMS — App entry point
// Splash dismissed IMMEDIATELY after React renders — no artificial delay
// eLogix Technologies · www.elogix.com.np
import { StrictMode }    from 'react'
import { createRoot }    from 'react-dom/client'
import './index.css'
import AppRouter         from './AppRouter.jsx'
import { AuthProvider }  from './context/AuthContext.jsx'

function dismissSplash() {
  const splash = document.getElementById('app-splash')
  if (!splash) return
  splash.classList.add('splash-hide')       // CSS opacity:0 in 0.3s
  setTimeout(() => splash.remove(), 350)    // Remove from DOM after fade
}

const root = createRoot(document.getElementById('root'))

root.render(
  <StrictMode>
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  </StrictMode>
)

// Dismiss immediately — no setTimeout delay at all
dismissSplash()
