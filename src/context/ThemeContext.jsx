// ============================================================
// FILE: src/context/ThemeContext.jsx
// PURPOSE: Dark/Light mode + custom theme colors per tenant
// ============================================================

import { createContext, useContext, useState, useEffect, useCallback } from 'react'

// ── Default Theme Colors ─────────────────────────────────────
const DEFAULT_THEME = {
  primary:    '#2563eb',
  secondary:  '#7c3aed',
  success:    '#10b981',
  warning:    '#f59e0b',
  danger:     '#ef4444',
  info:       '#06b6d4',
  sidebarBg:  '#0f172a',
  cardBg:     '#ffffff',
  pageBg:     '#f0f4f8',
  textPrimary:'#0f172a',
  textSecond: '#475569',
  textMuted:  '#94a3b8',
  border:     '#e2e8f0',
}

const DARK_THEME = {
  primary:    '#60a5fa',
  secondary:  '#a78bfa',
  success:    '#34d399',
  warning:    '#fbbf24',
  danger:     '#f87171',
  info:       '#22d3ee',
  sidebarBg:  '#020617',
  cardBg:     '#1e293b',
  pageBg:     '#0a0f1e',
  textPrimary:'#f1f5f9',
  textSecond: '#94a3b8',
  textMuted:  '#475569',
  border:     '#334155',
}

// ── Context ──────────────────────────────────────────────────
export const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [mode,   setMode]   = useState('light') // 'light' | 'dark'
  const [colors, setColors] = useState(DEFAULT_THEME)
  const [fontSize, setFontSize] = useState('normal') // 'small' | 'normal' | 'large'
  const [fontFamily, setFontFamily] = useState('dm-sans')
  const [sidebarWidth, setSidebarWidth] = useState(248)
  const [compactMode, setCompactMode] = useState(false)

  const isDark = mode === 'dark'

  // ── Toggle dark/light ──
  const toggleMode = useCallback(() => {
    setMode(prev => {
      const next = prev === 'light' ? 'dark' : 'light'
      setColors(next === 'dark' ? DARK_THEME : DEFAULT_THEME)
      return next
    })
  }, [])

  // ── Apply to document ──
  useEffect(() => {
    const root = document.documentElement
    Object.entries(colors).forEach(([key, val]) => {
      root.style.setProperty(`--color-${key}`, val)
    })
    if (isDark) {
      document.body.classList.add('dark')
      document.body.style.background = colors.pageBg
      document.body.style.color = colors.textPrimary
    } else {
      document.body.classList.remove('dark')
      document.body.style.background = colors.pageBg
      document.body.style.color = colors.textPrimary
    }
  }, [colors, isDark])

  // ── Font size map ──
  const fontSizeMap = {
    small:  '13px',
    normal: '14px',
    large:  '15px',
  }

  // ── Font family map ──
  const fontFamilyMap = {
    'dm-sans':  "'DM Sans', 'Segoe UI', sans-serif",
    'inter':    "'Inter', 'Segoe UI', sans-serif",
    'poppins':  "'Poppins', sans-serif",
    'roboto':   "'Roboto', sans-serif",
    'system':   "system-ui, sans-serif",
  }

  // ── Custom tenant theme (for white-label SaaS) ──
  const applyTenantTheme = useCallback((tenantColors) => {
    setColors(prev => ({ ...prev, ...tenantColors }))
  }, [])

  // ── Reset to default ──
  const resetTheme = useCallback(() => {
    setColors(mode === 'dark' ? DARK_THEME : DEFAULT_THEME)
  }, [mode])

  const value = {
    mode,
    isDark,
    toggleMode,
    colors,
    setColors,
    applyTenantTheme,
    resetTheme,
    fontSize,
    setFontSize,
    fontSizeValue: fontSizeMap[fontSize],
    fontFamily,
    setFontFamily,
    fontFamilyValue: fontFamilyMap[fontFamily],
    sidebarWidth,
    setSidebarWidth,
    compactMode,
    setCompactMode,
  }

  return (
    <ThemeContext.Provider value={value}>
      <div
        style={{
          fontSize: fontSizeMap[fontSize],
          fontFamily: fontFamilyMap[fontFamily],
        }}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  )
}

// ── Custom Hook ──────────────────────────────────────────────
export const useTheme = () => {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>')
  return ctx
}

export default ThemeContext
