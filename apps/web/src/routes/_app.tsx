import { createFileRoute, redirect } from '@tanstack/react-router'

import { AppShell } from '@/components/AppShell'
import { isAuthenticated } from '@/lib/auth'

/**
 * Pathless layout for everything behind a login. The guard lives here rather than on
 * each page, so a new authenticated route cannot forget it.
 */
export const Route = createFileRoute('/_app')({
  beforeLoad: ({ location }) => {
    if (!isAuthenticated()) {
      throw redirect({ to: '/login', search: { redirect: location.href } })
    }
  },
  component: AppShell,
})
