import { useQuery } from '@tanstack/react-query'

import { metaHealthOptions } from '@elogix/api-client/queries'

/**
 * Scaffold placeholder. Its only job is to prove the contract pipeline works:
 * this component calls a function that was generated from the API's OpenAPI spec,
 * and TypeScript knows the response shape without anyone writing it down twice.
 *
 * Phase 00 replaces this with the real walking skeleton (login, one employee).
 */
export default function App() {
  const { data, isPending, isError } = useQuery(metaHealthOptions())

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 p-8">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-neutral-500">
          eLogix HRMS
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Rebuild scaffold</h1>
      </div>

      <dl className="divide-y divide-neutral-200 border-y border-neutral-200 text-sm">
        <Row label="API">
          {isPending ? 'checking…' : isError ? 'unreachable' : (data?.status ?? 'unknown')}
        </Row>
        <Row label="Database">
          {isPending ? 'checking…' : isError ? 'unknown' : (data?.database ?? 'unknown')}
        </Row>
        <Row label="Environment">
          {isPending ? '…' : isError ? 'unknown' : (data?.environment ?? 'unknown')}
        </Row>
      </dl>

      <p className="text-sm text-neutral-500">
        This page calls <code className="font-mono text-xs">metaHealth</code>, generated
        from <code className="font-mono text-xs">openapi.json</code>. Delete the route on
        the API and this file stops compiling.
      </p>
    </main>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2">
      <dt className="text-neutral-500">{label}</dt>
      <dd className="font-mono">{children}</dd>
    </div>
  )
}
