import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

import { payrollApproveRun, payrollComputeRun, payrollCreateRun } from '@elogix/api-client'
import {
  employeesListEmployeesOptions,
  payrollListPayslipsOptions,
  payrollListRunsOptions,
  payrollListRunsQueryKey,
  payrollListTaxScalesOptions,
} from '@elogix/api-client/queries'

import {
  Banner,
  Button,
  Card,
  Cell,
  PageHeader,
  Pill,
  Row,
  SectionLabel,
  StatCard,
  Table,
} from '@/components/ui'
import type { PillTone } from '@/components/ui'
import { apiErrorMessage } from '@/lib/errors'

const STATUS_TONE: Record<string, PillTone> = {
  draft: 'slate',
  computed: 'amber',
  approved: 'green',
  paid: 'blue',
  cancelled: 'red',
}

export const Route = createFileRoute('/_app/payroll')({ component: PayrollPage })

/** NPR, grouped the way money is read here. */
function npr(value: string | number): string {
  return `NPR ${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
}

function PayrollPage() {
  const queryClient = useQueryClient()
  const [selectedRun, setSelectedRun] = useState<string | null>(null)

  const runs = useQuery(payrollListRunsOptions())
  const scales = useQuery(payrollListTaxScalesOptions())
  const employees = useQuery(employeesListEmployeesOptions())

  const activeRun = selectedRun ?? runs.data?.[0]?.id ?? null
  const payslips = useQuery({
    ...payrollListPayslipsOptions({ path: { run_id: activeRun ?? '' } }),
    enabled: Boolean(activeRun),
  })

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: payrollListRunsQueryKey() })
    void queryClient.invalidateQueries({ queryKey: ['payrollListPayslips'] })
  }

  const create = useMutation({
    mutationFn: async () => {
      // Default to last month — payroll is run after the month it pays for.
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const end = new Date(now.getFullYear(), now.getMonth(), 0)
      const iso = (d: Date) => d.toISOString().slice(0, 10)
      const { data, error } = await payrollCreateRun({
        body: { period_start: iso(start), period_end: iso(end) },
      })
      if (error || !data) throw new Error(apiErrorMessage(error, 'Could not create the run'))
      return data
    },
    onSuccess: (run) => {
      setSelectedRun(run.id)
      invalidate()
    },
  })

  const act = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'compute' | 'approve' }) => {
      const call = action === 'compute' ? payrollComputeRun : payrollApproveRun
      const { error } = await call({ path: { run_id: id } })
      if (error) throw new Error(apiErrorMessage(error, `Could not ${action} the run`))
    },
    onSuccess: invalidate,
  })

  const nameOf = new Map(employees.data?.items.map((e) => [e.id, e.full_name]))
  const run = runs.data?.find((r) => r.id === activeRun)
  const unverified = scales.data?.filter((s) => !s.is_verified) ?? []

  const totals = (payslips.data ?? []).reduce(
    (acc, p) => ({
      gross: acc.gross + Number(p.gross),
      tax: acc.tax + Number(p.monthly_tax),
      ssf: acc.ssf + Number(p.ssf_employee) + Number(p.ssf_employer),
      net: acc.net + Number(p.net_pay),
    }),
    { gross: 0, tax: 0, ssf: 0, net: 0 },
  )

  return (
    <>
      <PageHeader
        title="Payroll"
        subtitle="Computed from the attendance register and the salary effective in the period"
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => create.mutate()}
              disabled={create.isPending}
            >
              New run
            </Button>
            {run?.status === 'draft' && (
              <Button
                onClick={() => act.mutate({ id: run.id, action: 'compute' })}
                disabled={act.isPending}
              >
                Compute
              </Button>
            )}
            {run?.status === 'computed' && (
              <Button
                onClick={() => act.mutate({ id: run.id, action: 'approve' })}
                disabled={act.isPending}
              >
                Approve &amp; lock
              </Button>
            )}
          </>
        }
      />

      {/* The single most important thing on this screen. */}
      {unverified.length > 0 && (
        <Banner tone="warning" title="⚠ Tax rates have not been verified">
          {unverified.length} of {scales.data?.length} scales carry defaults that no named
          person has checked against the Finance Act. They are editable, and a verifier
          must be named before they read as verified. Do not pay anyone from these figures
          until someone has signed them off.
        </Banner>
      )}

      {(create.isError || act.isError) && (
        <p role="alert" className="mb-4 text-sm text-red-700">
          {(create.error ?? act.error)?.message}
        </p>
      )}

      <SectionLabel>Runs</SectionLabel>
      <Card className="mb-5">
        <Table
          columns={['Period', 'Fiscal year', 'Status', 'Computed', 'Approved', '']}
          empty={runs.data?.length === 0}
        >
          {runs.data?.map((r) => (
            <Row key={r.id}>
              <Cell mono>
                {r.period_start} → {r.period_end}
              </Cell>
              <Cell mono>{r.fiscal_year}</Cell>
              <Cell>
                <Pill tone={STATUS_TONE[r.status] ?? 'slate'}>{r.status}</Pill>
              </Cell>
              <Cell mono>{r.computed_at?.slice(0, 10) ?? '—'}</Cell>
              <Cell mono>{r.approved_at?.slice(0, 10) ?? '—'}</Cell>
              <Cell>
                <Button
                  variant="secondary"
                  className="px-2 py-1 text-xs"
                  onClick={() => setSelectedRun(r.id)}
                >
                  {r.id === activeRun ? 'Viewing' : 'View'}
                </Button>
              </Cell>
            </Row>
          ))}
        </Table>
      </Card>

      {activeRun && payslips.data && payslips.data.length > 0 && (
        <>
          <SectionLabel>Run totals</SectionLabel>
          <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Gross" value={npr(totals.gross)} hint={`${payslips.data.length} payslips`} />
            <StatCard label="Income tax" value={npr(totals.tax)} hint="Monthly TDS" />
            <StatCard label="SSF" value={npr(totals.ssf)} hint="Employee + employer" />
            <StatCard label="Net payable" value={npr(totals.net)} hint="To disburse" />
          </div>

          <SectionLabel>Payslips</SectionLabel>
          <Card>
            <Table
              columns={[
                'Employee',
                'Payable days',
                'Basic',
                'Overtime',
                'Gross',
                'SSF (11%)',
                'Tax',
                'Net pay',
              ]}
            >
              {payslips.data.map((p) => (
                <Row key={p.id}>
                  <Cell className="font-medium text-slate-800">
                    {nameOf.get(p.employee_id) ?? '—'}
                  </Cell>
                  <Cell mono>{Number(p.payable_days)}</Cell>
                  <Cell mono>{npr(p.basic_earned)}</Cell>
                  <Cell mono className={Number(p.overtime_pay) ? 'text-emerald-700' : ''}>
                    {Number(p.overtime_pay) ? npr(p.overtime_pay) : '—'}
                  </Cell>
                  <Cell mono>{npr(p.gross)}</Cell>
                  <Cell mono>{npr(p.ssf_employee)}</Cell>
                  <Cell mono>{npr(p.monthly_tax)}</Cell>
                  <Cell mono className="font-semibold text-slate-900">
                    {npr(p.net_pay)}
                  </Cell>
                </Row>
              ))}
            </Table>
          </Card>
        </>
      )}

      {activeRun && payslips.data?.length === 0 && (
        <p className="text-xs text-slate-500">
          No payslips yet. Use “Compute” — anyone without a salary set is skipped rather
          than paid zero.
        </p>
      )}

      <SectionLabel>Tax scales</SectionLabel>
      <Card>
        <div className="border-b border-slate-100 px-4 py-3 text-xs text-slate-500">
          Seeded from Income Tax Act defaults and editable per company. The first band is
          the 1% social security tax, which does not apply to SSF contributors.
        </div>
        <Table columns={['Fiscal year', 'Filing status', 'Bands', 'Verified by']}>
          {scales.data?.map((s) => (
            <Row key={s.id}>
              <Cell mono>{s.fiscal_year}</Cell>
              <Cell>{s.is_married ? 'Married' : 'Single'}</Cell>
              <Cell className="text-xs text-slate-600">
                {s.slabs
                  .map(
                    (b) =>
                      `${b.width ? Number(b.width).toLocaleString('en-IN') : 'above'} @ ${
                        Number(b.rate) * 100
                      }%`,
                  )
                  .join(' · ')}
              </Cell>
              <Cell>
                {s.is_verified ? (
                  <Pill tone="green">{s.verified_by}</Pill>
                ) : (
                  <Pill tone="red">unverified</Pill>
                )}
              </Cell>
            </Row>
          ))}
        </Table>
      </Card>
    </>
  )
}
