/**
 * FILE: src/hooks/useAuth.js
 * Authentication hook — wraps AuthContext.
 * Usage: const { user, login, logout, isAuthenticated } = useAuth()
 */
import { useContext } from 'react'
import { AuthContext } from '../context/AuthContext.jsx'

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

export default useAuth
