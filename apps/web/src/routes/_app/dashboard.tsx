import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

import {
  authEntitlementsOptions,
  employeesListEmployeesOptions,
  orgListUnitsOptions,
  orgListPositionsOptions,
} from '@elogix/api-client/queries'

import { Card, PageHeader, Pill, StatCard } from '@/components/ui'

export const Route = createFileRoute('/_app/dashboard')({ component: Dashboard })

function Dashboard() {
  const employees = useQuery(employeesListEmployeesOptions())
  const units = useQuery(orgListUnitsOptions())
  const positions = useQuery(orgListPositionsOptions())
  const entitlements = useQuery(authEntitlementsOptions())

  const headcount = positions.data?.reduce((sum, p) => sum + p.headcount, 0)
  const filled = employees.data?.total ?? 0
  // A real zero is information; only a not-yet-loaded value should read as blank.
  const stat = (v: number | undefined) => (v === undefined ? '—' : v)

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Organization at a glance" />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Employees" value={stat(employees.data?.total)} tone="blue" />
        <StatCard label="Org units" value={stat(units.data?.length)} tone="violet" />
        <StatCard label="Positions" value={stat(positions.data?.length)} tone="cyan" />
        <StatCard
          label="Budgeted headcount"
          value={
            headcount === undefined ? '—' : `${filled} / ${headcount}`
          }
          tone={headcount !== undefined && filled > headcount ? 'red' : 'green'}
        />
      </div>

      <Card className="p-5">
        <h2 className="mb-3 text-sm font-bold text-slate-800">Enabled modules</h2>
        <div className="flex flex-wrap gap-1.5">
          {entitlements.data?.modules.map((m) => (
            <Pill key={m} tone="blue">
              {m}
            </Pill>
          )) ?? <span className="text-sm text-slate-400">Loading…</span>}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Decided server-side from the company's plan and overrides. Hiding a module here
          is a convenience — the API refuses it regardless.
        </p>
      </Card>
    </>
  )
}
