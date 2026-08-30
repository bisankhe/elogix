import { client } from '@elogix/api-client/client'

/**
 * Token storage and the request interceptor that attaches it.
 *
 * localStorage is a phase 00 placeholder. Phase 01 moves the refresh token to an
 * httpOnly cookie and keeps only the short-lived access token in memory — a token
 * readable by any script on the page is not where this ends up.
 */
const ACCESS_KEY = 'elogix.access_token'
const REFRESH_KEY = 'elogix.refresh_token'

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function getAccessToken(): string | null {
  return read(ACCESS_KEY)
}

export function isAuthenticated(): boolean {
  return getAccessToken() !== null
}

export function storeTokens(tokens: { access_token: string; refresh_token: string }): void {
  try {
    localStorage.setItem(ACCESS_KEY, tokens.access_token)
    localStorage.setItem(REFRESH_KEY, tokens.refresh_token)
  } catch {
    /* private mode — the session simply will not persist across reloads */
  }
}

export function clearTokens(): void {
  try {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
  } catch {
    /* nothing to clear */
  }
}

/** Attach the bearer token to every generated-client request. */
export function installAuthInterceptor(): void {
  client.interceptors.request.use((request) => {
    const token = getAccessToken()
    if (token) request.headers.set('Authorization', `Bearer ${token}`)
    return request
  })
}
