import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

import {
  authEntitlementsOptions,
  authMeOptions,
  employeesListEmployeesOptions,
  orgListPositionsOptions,
  orgListUnitsOptions,
} from '@elogix/api-client/queries'

import { Banner, Card, Pill, SectionLabel, StatCard } from '@/components/ui'

export const Route = createFileRoute('/_app/dashboard')({ component: Dashboard })

function Dashboard() {
  const employees = useQuery(employeesListEmployeesOptions())
  const units = useQuery(orgListUnitsOptions())
  const positions = useQuery(orgListPositionsOptions())
  const entitlements = useQuery(authEntitlementsOptions())
  const me = useQuery(authMeOptions())

  const headcount = positions.data?.reduce((sum, p) => sum + p.headcount, 0)
  const filled = employees.data?.total ?? 0
  // A real zero is information; only a not-yet-loaded value should read as blank.
  const stat = (v: number | undefined) => (v === undefined ? '—' : v)

  const nothingYet = units.data?.length === 0 && employees.data?.total === 0

  return (
    <>
      {/* The prototype opens with a company identity card carrying status pills. */}
      <Card className="mb-4 flex items-center gap-4 p-5">
        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100 text-2xl">
          🏢
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold tracking-tight text-slate-900">
            {me.data ? 'Acme Nepal Pvt. Ltd.' : '…'}
          </h1>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {me.data?.full_name} · <span className="capitalize">
              {me.data?.roles[0]?.replace(/_/g, ' ')}
            </span> · {me.data?.email}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Pill tone="violet">
              <span className="capitalize">{entitlements.data?.plan_tier ?? '…'} plan</span>
            </Pill>
            <Pill tone="green">Account active</Pill>
            <Pill tone="blue">Nepal Labour Act 2074</Pill>
            <Pill tone="slate">{entitlements.data?.modules.length ?? 0} modules</Pill>
          </div>
        </div>
      </Card>

      {nothingYet && (
        <Banner tone="warning" title="Nothing set up yet">
          Start with the organization structure — departments and teams — then add
          employees. Attendance and leave both hang off those.
        </Banner>
      )}

      <SectionLabel>Company at a glance</SectionLabel>
      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Employees" value={stat(employees.data?.total)} hint="On record" />
        <StatCard label="Org units" value={stat(units.data?.length)} hint="Across the tree" />
        <StatCard label="Positions" value={stat(positions.data?.length)} hint="Headcount slots" />
        <StatCard
          label="Budgeted headcount"
          value={headcount === undefined ? '—' : `${filled} / ${headcount}`}
          hint={
            headcount !== undefined && filled > headcount ? 'Over budget' : 'Filled / budgeted'
          }
        />
      </div>

      <SectionLabel>Enabled modules</SectionLabel>
      <Card className="p-5">
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
