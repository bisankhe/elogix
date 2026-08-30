import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { client } from '@elogix/api-client/client'

import './index.css'
import { errorStatus, installAuthInterceptor, restoreSession } from './lib/auth'
import { routeTree } from './routeTree.gen'

// Empty baseUrl: requests go to /api/... on the same origin and Vite proxies them to
// the API in development. In production the built bundle is served by the same host.
client.setConfig({ baseUrl: '', credentials: 'include' })
installAuthInterceptor()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Never retry a refusal. React Query's default is three retries with backoff,
      // which for a 401/403/404 buys nothing — the server will say no again — and
      // costs about seven seconds before the UI can explain itself. Self-service made
      // this visible: an unlinked login sat on a blank screen while the 403 that
      // explains it was retried in the background.
      //
      // 5xx and network failures keep the default, because those genuinely can pass on
      // a second attempt.
      retry: (failureCount, error) => {
        const status = errorStatus(error)
        if (status !== undefined && status >= 400 && status < 500) return false
        return failureCount < 3
      },
    },
  },
})

const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
})

// Makes route paths, params and search params typed everywhere they are referenced.
// A link to a route that does not exist is a compile error, not a 404.
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// The access token lives in memory, so a reload starts signed out. Trading the refresh
// cookie for a new access token *before* the first render keeps route guards from
// bouncing an authenticated user to /login on every refresh.
async function start() {
  await restoreSession()

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  )
}

void start()
