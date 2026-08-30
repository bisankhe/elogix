import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { z } from 'zod'

import {
  settlementsApproveSettlement,
  settlementsCreateSettlement,
  settlementsMarkPaid,
} from '@elogix/api-client'
import {
  employeesListEmployeesOptions,
  settlementsDueSettlementsOptions,
  settlementsGetSettlementOptions,
  settlementsListSettlementsOptions,
  settlementsListSettlementsQueryKey,
} from '@elogix/api-client/queries'

import {
  Banner,
  Button,
  Card,
  Cell,
  Field,
  Input,
  PageHeader,
  Pill,
  Row,
  SectionLabel,
  Select,
  StatCard,
  Table,
} from '@/components/ui'
import type { PillTone } from '@/components/ui'
import { apiErrorMessage } from '@/lib/errors'
import { invalidate } from '@/lib/queries'

const STATUS_TONE: Record<string, PillTone> = {
  draft: 'slate',
  computed: 'amber',
  approved: 'green',
  paid: 'blue',
  cancelled: 'slate',
}

const searchSchema = z.object({ id: z.string().uuid().optional() })

export const Route = createFileRoute('/_app/settlements')({
  validateSearch: searchSchema,
  component: SettlementsPage,
})

function npr(value: string | number): string {
  return `NPR ${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
}

function SettlementsPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const queryClient = useQueryClient()

  const settlements = useQuery(settlementsListSettlementsOptions())
  const due = useQuery(settlementsDueSettlementsOptions())
  const employees = useQuery(employeesListEmployeesOptions())

  const [form, setForm] = useState({
    employee_id: '',
    last_working_day: '',
    initiator: 'employee' as 'employee' | 'employer' | 'neither',
    notice_days_served: '0',
  })

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: settlementsListSettlementsQueryKey() })
    invalidate(queryClient, 'settlementsDueSettlements', 'settlementsGetSettlement')
  }

  const create = useMutation({
    mutationFn: async () => {
      const { data, error } = await settlementsCreateSettlement({
        body: {
          employee_id: form.employee_id,
          last_working_day: form.last_working_day,
          initiator: form.initiator,
          notice_days_served: Number(form.notice_days_served) || 0,
        },
      })
      // The server says exactly why it refused — "No salary is on record for this
      // employee at their last working day". A guess would send someone hunting.
      if (error || !data) throw new Error(apiErrorMessage(error, 'Could not raise it'))
      return data
    },
    onSuccess: (settlement) => {
      void navigate({ search: { id: settlement.id } })
      refresh()
    },
  })

  const overdue = due.data?.filter((s) => s.is_overdue) ?? []
  const nameOf = new Map(employees.data?.items.map((e) => [e.id, e.full_name]))

  return (
    <>
      <PageHeader
        title="Final settlement"
        subtitle="What is owed when employment ends — statutorily due within 15 days"
      />

      {overdue.length > 0 && (
        <Banner tone="warning" title={`⚠ ${overdue.length} settlement(s) past the statutory deadline`}>
          Final payment is due within 15 days of the last working day.{' '}
          {overdue.map((s) => `${s.employee_name} (${-s.days_remaining} days over)`).join(', ')}.
        </Banner>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <div>
          <SectionLabel>Raise a settlement</SectionLabel>
          <Card className="p-4">
            <div className="grid gap-3">
              <Field label="Employee">
                <Select
                  value={form.employee_id}
                  onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
                >
                  <option value="">Choose…</option>
                  {employees.data?.items.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.employee_code} · {e.full_name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Last working day">
                <Input
                  type="date"
                  value={form.last_working_day}
                  onChange={(e) => setForm({ ...form, last_working_day: e.target.value })}
                />
              </Field>
              <Field label="Ended by">
                <Select
                  value={form.initiator}
                  onChange={(e) =>
                    setForm({ ...form, initiator: e.target.value as typeof form.initiator })
                  }
                >
                  <option value="employee">The employee resigned</option>
                  <option value="employer">The employer terminated</option>
                  <option value="neither">Contract end or retirement</option>
                </Select>
              </Field>
              <Field label="Notice days served">
                <Input
                  type="number"
                  min={0}
                  value={form.notice_days_served}
                  onChange={(e) => setForm({ ...form, notice_days_served: e.target.value })}
                />
              </Field>
              <Button
                onClick={() => create.mutate()}
                disabled={create.isPending || !form.employee_id || !form.last_working_day}
              >
                Raise and compute
              </Button>
              {create.isError && (
                <p role="alert" className="text-xs text-red-700">
                  {create.error.message}
                </p>
              )}
              <p className="text-[11px] text-slate-500">
                Who ended the employment decides which way notice pay flows: an employer
                terminating without notice pays for it, an employee leaving without
                serving it has it recovered.
              </p>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <SectionLabel>Settlements</SectionLabel>
          <Card>
            <Table
              columns={['Employee', 'Last day', 'Due by', 'Status', 'Net payable', '']}
              empty={settlements.data?.length === 0}
            >
              {settlements.data?.map((s) => {
                const clock = due.data?.find((d) => d.id === s.id)
                return (
                  <Row key={s.id}>
                    <Cell className="font-medium text-slate-800">
                      {nameOf.get(s.employee_id) ?? '—'}
                    </Cell>
                    <Cell mono>{s.last_working_day}</Cell>
                    <Cell mono className={clock?.is_overdue ? 'text-red-700' : ''}>
                      {s.deadline}
                      {clock?.is_overdue && ` (${-clock.days_remaining}d over)`}
                    </Cell>
                    <Cell>
                      <Pill tone={STATUS_TONE[s.status] ?? 'slate'}>{s.status}</Pill>
                    </Cell>
                    <Cell mono className="font-semibold text-slate-900">
                      {npr(s.net_payable)}
                    </Cell>
                    <Cell>
                      <Button
                        variant="secondary"
                        className="px-2 py-1 text-xs"
                        onClick={() => void navigate({ search: { id: s.id } })}
                      >
                        {s.id === search.id ? 'Viewing' : 'View'}
                      </Button>
                    </Cell>
                  </Row>
                )
              })}
            </Table>
          </Card>
        </div>
      </div>

      {search.id && <SettlementDetail id={search.id} onChanged={refresh} />}
    </>
  )
}

function SettlementDetail({ id, onChanged }: { id: string; onChanged: () => void }) {
  const detail = useQuery(settlementsGetSettlementOptions({ path: { settlement_id: id } }))
  const [paidOn, setPaidOn] = useState('')

  const act = useMutation({
    mutationFn: async (action: 'approve' | 'pay') => {
      const { error } =
        action === 'approve'
          ? await settlementsApproveSettlement({ path: { settlement_id: id } })
          : await settlementsMarkPaid({
              path: { settlement_id: id },
              body: { paid_on: paidOn },
            })
      if (error) throw new Error(apiErrorMessage(error, `Could not ${action} it`))
    },
    onSuccess: () => {
      void detail.refetch()
      onChanged()
    },
  })

  const s = detail.data
  if (!s) return null

  return (
    <div className="mt-6">
      <SectionLabel>Settlement detail</SectionLabel>

      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Gross" value={npr(s.gross_earnings)} />
        <StatCard label="Deductions" value={npr(s.total_deductions)} />
        <StatCard
          label="Income tax"
          value={npr(s.tax)}
          hint="marginal on the year to date"
        />
        <StatCard label="Net payable" value={npr(s.net_payable)} hint={`due ${s.deadline}`} />
      </div>

      {s.notes && (
        <Banner tone="warning" title="Read before paying">
          {s.notes}
        </Banner>
      )}

      <Card className="mb-4">
        <Table columns={['', 'Line', 'Amount', 'Why this figure']}>
          {(s.lines ?? []).map((line, i) => (
            <Row key={`${line.code}-${i}`}>
              <Cell>
                <Pill tone={line.kind === 'earning' ? 'green' : 'red'}>
                  {line.kind === 'earning' ? '+' : '−'}
                </Pill>
              </Cell>
              <Cell className="font-medium text-slate-800">{line.label}</Cell>
              <Cell mono>{npr(line.amount)}</Cell>
              {/* The basis is the point of the screen: a nil gratuity that explains it
                  was already paid into SSF ends an argument a bare 0.00 would start. */}
              <Cell className="text-xs text-slate-500">{line.basis}</Cell>
            </Row>
          ))}
        </Table>
      </Card>

      <div className="flex flex-wrap items-end gap-3">
        {s.status === 'computed' && (
          <Button onClick={() => act.mutate('approve')} disabled={act.isPending}>
            Approve &amp; encash leave
          </Button>
        )}
        {s.status === 'approved' && (
          <>
            <div className="w-48">
              <Field label="Paid on">
                <Input
                  type="date"
                  value={paidOn}
                  onChange={(e) => setPaidOn(e.target.value)}
                />
              </Field>
            </div>
            <Button onClick={() => act.mutate('pay')} disabled={act.isPending || !paidOn}>
              Mark paid
            </Button>
          </>
        )}
        {act.isError && (
          <p role="alert" className="text-sm text-red-700">
            {act.error.message}
          </p>
        )}
      </div>

      <p className="mt-2 text-[11px] text-slate-400">
        Approving consumes the leave balances this settlement pays out, in the same
        transaction — so the same days cannot be paid twice. Once approved the figures
        are a snapshot and cannot be recomputed.
      </p>
    </div>
  )
}
