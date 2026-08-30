import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'

/**
 * The query client is threaded through router context so route loaders can prefetch
 * with the same cache the components read from. Phase 00 adds the authenticated
 * layout and the redirect-to-login guard here.
 */
export interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => <Outlet />,
})
