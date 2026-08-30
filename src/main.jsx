// FILE: src/main.jsx
// eLogix HRMS — App entry point
// ADDED: ErrorBoundary + ToastContainer + OfflineBanner + SessionWatcher
// eLogix Technologies · www.elogix.com.np

import { StrictMode }    from 'react'
import { createRoot }    from 'react-dom/client'
import './index.css'
import AppRouter         from './AppRouter.jsx'
import { AuthProvider }  from './context/AuthContext.jsx'
import ErrorBoundary, {
  ToastContainer,
  OfflineBanner,
  SessionWatcher,
} from './components/shared/ErrorBoundary.jsx'

function dismissSplash() {
  const splash = document.getElementById('app-splash')
  if (!splash) return
  splash.classList.add('splash-hide')
  setTimeout(() => splash.remove(), 350)
}

const root = createRoot(document.getElementById('root'))

root.render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        {/* Sad path: offline banner at top of screen */}
        <OfflineBanner />
        {/* Sad path: session expired → redirect to login */}
        <SessionWatcher />
        {/* Main app */}
        <AppRouter />
        {/* Global toast notifications (error/success messages) */}
        <ToastContainer />
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>
)

dismissSplash()
