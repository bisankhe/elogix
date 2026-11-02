// FILE: src/context/AppContext.jsx
// eLogix HRMS — App-wide context (language, currency, persona, nav)
// Snapshot pages import useApp() from here.
// App.jsx imports AppContext from here and provides the value.
// eLogix Technologies · www.elogix.com.np

import { createContext, useContext } from 'react'

// ── Default / fallback context values ─────────────────────────
// Used when a component renders outside <App> (unit tests, Storybook,
// or if App.jsx hasn't provided the context yet).
const DEFAULT_CC = {
  code:   'NPR',
  symbol: 'Rs.',
  locale: 'en-NP',
  name:   'Nepalese Rupee',
}

const DEFAULT_CTX = {
  persona:        'super-admin',
  switchPersona:  () => {},
  currentPersona: null,
  sub:            '',
  navTo:          () => {},
  sidebarOpen:    true,
  setSidebarOpen: () => {},
  expanded:       null,
  toggleExpanded: () => {},
  language:       'en',
  setLanguage:    () => {},
  t:              (k) => k,      // identity translation fallback
  dir:            'ltr',
  currency:       'NPR',
  setCurrency:    () => {},
  cc:             DEFAULT_CC,
  darkMode:       false,
  setDarkMode:    () => {},
  showLangModal:  false,
  setShowLangModal: () => {},
  showNotif:      false,
  setShowNotif:   () => {},
  showAI:         false,
  setShowAI:      () => {},
}

// ── Create context ─────────────────────────────────────────────
export const AppContext = createContext(DEFAULT_CTX)

/**
 * useApp() — access the App-wide context from any component.
 *
 * Safe to call outside <App>: returns DEFAULT_CTX so pages
 * can still render (with fallback currency / translation) instead
 * of crashing with "useApp must be used inside <App />".
 *
 * Usage:
 *   const { t, cc, persona } = useApp()
 */
export function useApp() {
  const ctx = useContext(AppContext)
  // Return whatever we have — the default is a valid fallback
  return ctx || DEFAULT_CTX
}

export default AppContext
