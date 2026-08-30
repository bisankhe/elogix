// FILE: src/hooks/useAPI.js
// eLogix HRMS — Universal React Hook for API calls
// Handles: loading states, error messages, retry, toast notifications
// Every page uses this instead of direct fetch() calls
// eLogix Technologies · www.elogix.com.np

import { useState, useEffect, useCallback, useRef } from 'react'
import { APIError } from '../utils/api.js'

// ── Toast notification system (global) ───────────────────────────────
const toastListeners = new Set()
export function showToast(message, type = 'error') {
  toastListeners.forEach(fn => fn({ message, type, id: Date.now() }))
}

// ── Main hook: useAPI ─────────────────────────────────────────────────
/**
 * useAPI - makes an API call, handles all sad paths
 *
 * @param {Function} apiFn  - async function that calls api.*
 * @param {Object}   opts
 *   immediate: boolean  - call on mount (default: true)
 *   deps: array         - re-fetch when these change
 *   onSuccess: fn       - callback on success
 *   onError: fn         - callback on error (overrides default toast)
 *   toast: boolean      - show error toast (default: true)
 *
 * @returns { data, loading, error, refetch, mutate }
 *
 * Usage:
 *   const { data, loading, error } = useAPI(() => employeeAPI.list(), { deps: [slug] })
 */
export function useAPI(apiFn, opts = {}) {
  const {
    immediate = true,
    deps      = [],
    onSuccess = null,
    onError   = null,
    toast     = true,
  } = opts

  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(immediate)
  const [error,   setError]   = useState(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const execute = useCallback(async (...args) => {
    if (!mountedRef.current) return
    setLoading(true)
    setError(null)

    try {
      const result = await apiFn(...args)
      if (!mountedRef.current) return

      setData(result)
      setLoading(false)
      if (onSuccess) onSuccess(result)
      return result

    } catch (err) {
      if (!mountedRef.current) return
      setLoading(false)

      const msg = err instanceof APIError
        ? err.message
        : 'Something went wrong. Please try again.'

      setError(msg)

      if (onError) {
        onError(err, msg)
      } else if (toast) {
        showToast(msg, 'error')
      }

      // Session expired → redirect to login
      if (err instanceof APIError && err.isAuth) {
        window.dispatchEvent(new CustomEvent('elogix:session-expired'))
      }

      return null
    }
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-execute on mount or dep change
  useEffect(() => {
    if (immediate) execute()
  }, [execute, immediate]) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    data,
    loading,
    error,
    refetch : execute,
    mutate  : setData, // for optimistic updates
  }
}

// ── Mutation hook: useMutation ────────────────────────────────────────
/**
 * useMutation - for POST/PUT/PATCH/DELETE operations
 * Does NOT auto-execute — you call `mutate(data)` manually
 *
 * Usage:
 *   const { mutate, loading, error } = useMutation(
 *     (data) => employeeAPI.create(data),
 *     { onSuccess: () => refetchList() }
 *   )
 *   <button onClick={() => mutate(formData)}>Save</button>
 */
export function useMutation(apiFn, opts = {}) {
  const {
    onSuccess    = null,
    onError      = null,
    successMsg   = null,
    toast        = true,
  } = opts

  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [data,    setData]    = useState(null)

  const mutate = useCallback(async (...args) => {
    setLoading(true)
    setError(null)

    try {
      const result = await apiFn(...args)
      setData(result)
      setLoading(false)

      if (successMsg && toast) showToast(successMsg, 'success')
      if (onSuccess) onSuccess(result)
      return result

    } catch (err) {
      setLoading(false)
      const msg = err instanceof APIError ? err.message : 'Operation failed. Please try again.'
      setError(msg)

      if (onError) {
        onError(err)
      } else if (toast) {
        showToast(msg, 'error')
      }
      return null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { mutate, loading, error, data }
}

// ── Paginated data hook ───────────────────────────────────────────────
/**
 * usePaginatedAPI - handles paginated API responses
 *
 * Usage:
 *   const { items, page, totalPages, nextPage, prevPage } =
 *     usePaginatedAPI((p) => employeeAPI.list({ page: p, per_page: 20 }))
 */
export function usePaginatedAPI(apiFn, opts = {}) {
  const { initialPage = 1, perPage = 20 } = opts
  const [page,       setPage]       = useState(initialPage)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)

  const { data, loading, error, refetch } = useAPI(
    () => apiFn(page, perPage),
    { deps: [page], ...opts }
  )

  useEffect(() => {
    if (data?.total_pages) setTotalPages(data.total_pages)
    if (data?.total)       setTotalItems(data.total)
  }, [data])

  return {
    items      : data?.items || data?.data || [],
    page,
    totalPages,
    totalItems,
    loading,
    error,
    nextPage   : () => setPage(p => Math.min(p + 1, totalPages)),
    prevPage   : () => setPage(p => Math.max(p - 1, 1)),
    goToPage   : setPage,
    refetch,
  }
}

// ── Global toast component ────────────────────────────────────────────
export function useToast() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    const listener = (toast) => {
      setToasts(prev => [...prev, toast])
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toast.id))
      }, 4000)
    }
    toastListeners.add(listener)
    return () => toastListeners.delete(listener)
  }, [])

  return toasts
}

// ── Error boundary helper ─────────────────────────────────────────────
export function useErrorHandler() {
  return useCallback((error, context = '') => {
    console.error(`[eLogix Error] ${context}:`, error)
    const msg = error instanceof APIError
      ? error.message
      : `Unexpected error${context ? ` in ${context}` : ''}. Please refresh the page.`
    showToast(msg, 'error')
  }, [])
}
