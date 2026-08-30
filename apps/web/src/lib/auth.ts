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

/**
 * The HTTP status of a failed request, when the client managed to record one.
 *
 * The generated client throws the parsed error *body* — for FastAPI, `{detail: "..."}`
 * — which carries no status at all. `installAuthInterceptor` stamps it on, because
 * "was this refused or did it fall over?" is a question both the retry policy and the
 * error copy need to answer, and a detail string cannot answer it.
 */
export function errorStatus(error: unknown): number | undefined {
  if (typeof error === 'object' && error !== null && STATUS in error) {
    return (error as Record<typeof STATUS, number>)[STATUS]
  }
  return undefined
}

const STATUS = Symbol.for('elogix.httpStatus')

/** Attach the bearer token to every generated-client request. */
export function installAuthInterceptor(): void {
  client.interceptors.request.use((request) => {
    if (accessToken) request.headers.set('Authorization', `Bearer ${accessToken}`)
    return request
  })

  // A symbol rather than a plain `status` key: the body is the server's, and an API
  // that happens to return its own `status` field must not be silently overwritten.
  client.interceptors.error.use((error, response) => {
    if (response && typeof error === 'object' && error !== null) {
      Object.defineProperty(error, STATUS, {
        value: response.status,
        enumerable: false,
        configurable: true,
      })
    }
    return error
  })
}
