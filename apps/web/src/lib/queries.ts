import type { QueryClient } from '@tanstack/react-query'

/**
 * Invalidate generated queries by operation name.
 *
 * The generated client builds keys as `[{ _id: 'opName', baseUrl, path, query }]` — an
 * array containing an *object*, not the bare string. So
 * `invalidateQueries({ queryKey: ['opName'] })` matches nothing at all, and it fails
 * silently: the mutation succeeds, nothing refetches, and the screen shows stale data
 * until someone reloads. That is what it looked like when onboarding a candidate worked
 * on the server while the button stayed on "Onboard as employee".
 *
 * TanStack Query matches keys by *partial deep* comparison, so `[{ _id: 'opName' }]`
 * matches every variant of that operation whatever its path and query parameters —
 * which is what you want after a write that could have changed any of them.
 *
 * Use the generated `xxxQueryKey()` helper instead when you mean one exact variant.
 */
export function invalidate(client: QueryClient, ...operationIds: string[]): void {
  for (const id of operationIds) {
    void client.invalidateQueries({ queryKey: [{ _id: id }] })
  }
}
