import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { z } from 'zod'

import {
  payrollListRunsOptions,
  reportsHeadcountOptions,
  reportsLeaveBalancesOptions,
  reportsPayrollRegisterOptions,
} from '@elogix/api-client/queries'

import {
  Button,
  Card,
  Cell,
  Field,
  PageHeader,
  Row,
  SectionLabel,
  Select,
  StatCard,
  Table,
} from '@/components/ui'
import { downloadFile } from '@/lib/download'

const REPORTS = ['headcount', 'leave-balances', 'payroll-register'] as const
const GROUPINGS = ['department', 'designation', 'status', 'gender'] as const

const LABELS: Record<(typeof REPORTS)[number], string> = {
  headcount: 'Headcount',
  'leave-balances': 'Leave balances',
  'payroll-register': 'Payroll register',
}

const searchSchema = z.object({
  report: z.enum(REPORTS).default('headcount'),
  group_by: z.enum(GROUPINGS).default('department'),
  run_id: z.string().uuid().optional(),
})

export const Route = createFileRoute('/_app/reports')({
  validateSearch: searchSchema,
  component: ReportsPage,
})

function npr(value: string | number): string {
  return `NPR ${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
}

function ReportsPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const [exportError, setExportError] = useState<string | null>(null)

  const runs = useQuery(payrollListRunsOptions())
  const activeRun = search.run_id ?? runs.data?.[0]?.id

  // The CSV comes from the same endpoint as the table, with ?format=csv — so the
  // export cannot drift from what is on screen.
  const csvUrl = {
    headcount: `/api/v1/reports/headcount?group_by=${search.group_by}&format=csv`,
    'leave-balances': '/api/v1/reports/leave-balances?format=csv',
    'payroll-register': `/api/v1/reports/payroll-register/${activeRun}?format=csv`,
  }[search.report]

  const canExport = search.report !== 'payroll-register' || Boolean(activeRun)

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Every report exports to CSV from the same query that draws the table"
        actions={
          <Button
            disabled={!canExport}
            onClick={() => {
              setExportError(null)
              downloadFile(csvUrl, `${search.report}.csv`).catch((error: Error) =>
                setExportError(error.message),
              )
            }}
          >
            Download CSV
          </Button>
        }
      />

      <div className="mb-5 flex flex-wrap gap-1 border-b border-slate-200">
        {REPORTS.map((report) => (
          <button
            key={report}
            onClick={() => void navigate({ search: (s) => ({ ...s, report }) })}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              search.report === report
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {LABELS[report]}
          </button>
        ))}
      </div>

      {exportError && (
        <p role="alert" className="mb-4 text-sm text-red-700">
          {exportError}
        </p>
      )}

      {search.report === 'headcount' && <HeadcountReport />}
      {search.report === 'leave-balances' && <LeaveBalancesReport />}
      {search.report === 'payroll-register' && <PayrollRegisterReport runId={activeRun} />}
    </>
  )
}

// ── Headcount ─────────────────────────────────────────────────────────

function HeadcountReport() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const report = useQuery(reportsHeadcountOptions({ query: { group_by: search.group_by } }))

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-56">
          <Field label="Group by">
            <Select
              value={search.group_by}
              onChange={(e) =>
                void navigate({
                  search: (s) => ({
                    ...s,
                    group_by: e.target.value as (typeof GROUPINGS)[number],
                  }),
                })
              }
            >
              {GROUPINGS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        {report.data && (
          <p className="pb-2 text-xs text-slate-500">
            {report.data.total_active} on the books as of {report.data.as_of}
          </p>
        )}
      </div>

      <Card>
        <Table
          columns={['Group', 'Active', 'Probation', 'Suspended', 'Exited', 'Total']}
          empty={report.data?.rows.length === 0}
        >
          {report.data?.rows.map((row) => (
            <Row key={row.group}>
              <Cell className="font-medium text-slate-800">{row.group}</Cell>
              <Cell mono>{row.active}</Cell>
              <Cell mono>{row.probation}</Cell>
              <Cell mono className={row.suspended ? 'text-amber-700' : ''}>
                {row.suspended || '—'}
              </Cell>
              <Cell mono className={row.exited ? 'text-slate-400' : ''}>
                {row.exited || '—'}
              </Cell>
              <Cell mono className="font-semibold text-slate-900">
                {row.total}
              </Cell>
            </Row>
          ))}
        </Table>
      </Card>
      <p className="mt-2 px-1 text-[11px] text-slate-400">
        Leavers are counted against the department they left, not filed under
        “Unassigned” — a team that lost four of six engineers is what this exists to show.
      </p>
    </>
  )
}

// ── Leave balances ────────────────────────────────────────────────────

function LeaveBalancesReport() {
  const report = useQuery(reportsLeaveBalancesOptions())

  return (
    <>
      <SectionLabel>What the company owes, per person per type</SectionLabel>
      <Card>
        <Table
          columns={['Employee', 'Name', 'Department', 'Leave type', 'Available days']}
          empty={report.data?.rows.length === 0}
        >
          {report.data?.rows.map((row) => (
            <Row key={`${row.employee_id}-${row.leave_type}`}>
              <Cell mono>{row.employee_code}</Cell>
              <Cell className="font-medium text-slate-800">{row.full_name}</Cell>
              <Cell>{row.org_unit ?? '—'}</Cell>
              <Cell>{row.leave_type}</Cell>
              <Cell mono className="font-semibold text-slate-900">
                {Number(row.available_days).toFixed(2)}
              </Cell>
            </Row>
          ))}
        </Table>
      </Card>
    </>
  )
}

// ── Payroll register ──────────────────────────────────────────────────

function PayrollRegisterReport({ runId }: { runId: string | undefined }) {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const runs = useQuery(payrollListRunsOptions())
  const report = useQuery({
    ...reportsPayrollRegisterOptions({ path: { run_id: runId ?? '' } }),
    enabled: Boolean(runId),
  })

  if (runs.data?.length === 0) {
    return (
      <p className="text-xs text-slate-500">
        No payroll runs yet. A register is a view of one run, so there is nothing to show
        until payroll has been run at least once.
      </p>
    )
  }

  const totals = report.data?.totals

  return (
    <>
      <div className="mb-4 w-80">
        <Field label="Run">
          <Select
            value={search.run_id ?? runId ?? ''}
            onChange={(e) =>
              void navigate({ search: (s) => ({ ...s, run_id: e.target.value }) })
            }
          >
            {runs.data?.map((run) => (
              <option key={run.id} value={run.id}>
                {run.period_start} → {run.period_end} ({run.status})
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {totals && (
        <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Employees" value={totals.employees} hint="on this run" />
          <StatCard label="Gross" value={npr(totals.gross)} />
          <StatCard label="Income tax" value={npr(totals.monthly_tax)} hint="withheld" />
          <StatCard
            label="SSF"
            value={npr(totals.ssf_employee)}
            hint={`plus ${npr(totals.ssf_employer)} employer`}
          />
          <StatCard label="Net payable" value={npr(totals.net_pay)} hint="to disburse" />
        </div>
      )}

      <Card>
        <Table
          columns={[
            'Employee',
            'Name',
            'Days',
            'Basic',
            'Overtime',
            'Gross',
            'SSF',
            'Tax',
            'Net pay',
          ]}
          empty={report.data?.rows.length === 0}
        >
          {report.data?.rows.map((row) => (
            <Row key={row.employee_code}>
              <Cell mono>{row.employee_code}</Cell>
              <Cell className="font-medium text-slate-800">{row.full_name}</Cell>
              <Cell mono>{Number(row.payable_days)}</Cell>
              <Cell mono>{npr(row.basic_earned)}</Cell>
              <Cell mono className={Number(row.overtime_pay) ? 'text-emerald-700' : ''}>
                {Number(row.overtime_pay) ? npr(row.overtime_pay) : '—'}
              </Cell>
              <Cell mono>{npr(row.gross)}</Cell>
              <Cell mono>{npr(row.ssf_employee)}</Cell>
              <Cell mono>{npr(row.monthly_tax)}</Cell>
              <Cell mono className="font-semibold text-slate-900">
                {npr(row.net_pay)}
              </Cell>
            </Row>
          ))}
        </Table>
      </Card>
      <p className="mt-2 px-1 text-[11px] text-slate-400">
        The employer’s SSF contribution is a company cost on top of gross, not a
        deduction from anyone — it is totalled separately so it does not land on the
        wrong side of a return.
      </p>
    </>
  )
}
