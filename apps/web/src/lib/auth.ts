import { client } from '@elogix/api-client/client'

/**
 * Access token handling.
 *
 * The access token is held **in memory only**. The refresh token is an httpOnly cookie
 * the browser sends to /api/v1/auth/* and no script can read — including a script
 * injected into the page. Phase 00 kept both in localStorage, which meant any XSS handed
 * an attacker a 30-day credential.
 *
 * The cost of in-memory is that a page reload loses the access token, so the app asks
 * /auth/refresh for a new one on startup. That request succeeds only if the cookie is
 * still valid, which is exactly the property we want.
 */
let accessToken: string | null = null

export function getAccessToken(): string | null {
  return accessToken
}

export function setAccessToken(token: string | null): void {
  accessToken = token
}

/** Synchronous, so route guards can read it in `beforeLoad` without flickering. */
export function isAuthenticated(): boolean {
  return accessToken !== null
}

/** Exchange the refresh cookie for a fresh access token. Returns false if not signed in. */
export async function restoreSession(): Promise<boolean> {
  try {
    const response = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    })
    if (!response.ok) return false
    const body = (await response.json()) as { access_token: string }
    accessToken = body.access_token
    return true
  } catch {
    return false
  }
}

export async function signOut(): Promise<void> {
  accessToken = null
  try {
    await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include' })
  } catch {
    /* the token is already discarded locally; server-side revocation is best effort */
  }
}

/** Attach the bearer token to every generated-client request. */
export function installAuthInterceptor(): void {
  client.interceptors.request.use((request) => {
    if (accessToken) request.headers.set('Authorization', `Bearer ${accessToken}`)
    return request
  })
}
