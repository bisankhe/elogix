import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { leaveDecideRequest } from '@elogix/api-client'
import {
  employeesListEmployeesOptions,
  leaveBalancesOptions,
  leaveListRequestsOptions,
  leaveListRequestsQueryKey,
  leaveListTypesOptions,
} from '@elogix/api-client/queries'

import { Button, Card, Cell, PageHeader, Pill, Row, Select, StatCard, Table } from '@/components/ui'
import type { PillTone } from '@/components/ui'

const STATUS_TONE: Record<string, PillTone> = {
  pending: 'amber',
  approved: 'green',
  rejected: 'red',
  cancelled: 'slate',
}

const searchSchema = z.object({
  employee_id: z.string().uuid().optional(),
  status: z.enum(['pending', 'approved', 'rejected', 'cancelled']).optional(),
})

export const Route = createFileRoute('/_app/leave')({
  validateSearch: searchSchema,
  component: LeavePage,
})

function LeavePage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const queryClient = useQueryClient()

  const types = useQuery(leaveListTypesOptions())
  const employees = useQuery(employeesListEmployeesOptions())
  const requests = useQuery(
    leaveListRequestsOptions({
      query: { employee_id: search.employee_id, status: search.status },
    }),
  )

  // Balances are per employee, so they only make sense once one is chosen.
  const balances = useQuery({
    ...leaveBalancesOptions({ path: { employee_id: search.employee_id ?? '' } }),
    enabled: Boolean(search.employee_id),
  })

  const decide = useMutation({
    mutationFn: async ({ id, approve }: { id: string; approve: boolean }) => {
      const { error } = await leaveDecideRequest({
        path: { request_id: id },
        body: { approve },
      })
      if (error) throw new Error('Could not decide')
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: leaveListRequestsQueryKey() })
      void queryClient.invalidateQueries({ queryKey: ['leaveBalances'] })
    },
  })

  const nameOf = new Map(employees.data?.items.map((e) => [e.id, e.full_name]))
  const typeOf = new Map(types.data?.map((t) => [t.id, t]))
  const setFilter = (patch: Partial<typeof search>) =>
    void navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true })

  const pending = requests.data?.filter((r) => r.status === 'pending').length ?? 0

  return (
    <>
      <PageHeader
        title="Leave"
        subtitle="Entitlements accrue from the ledger — every balance is the sum of its movements"
      />

      {search.employee_id && balances.data && (
        <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {balances.data
            .filter((b) => b.is_paid)
            .map((b) => (
              <StatCard
                key={b.leave_type_id}
                label={b.name}
                value={Number(b.available_days)}
                tone={Number(b.available_days) > 0 ? 'green' : 'slate'}
              />
            ))}
        </div>
      )}

      <Card className="mb-4 p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Select
            value={search.employee_id ?? ''}
            onChange={(e) => setFilter({ employee_id: e.target.value || undefined })}
          >
            <option value="">All employees — pick one to see balances</option>
            {employees.data?.items.map((e) => (
              <option key={e.id} value={e.id}>
                {e.full_name}
              </option>
            ))}
          </Select>
          <Select
            value={search.status ?? ''}
            onChange={(e) =>
              setFilter({ status: (e.target.value || undefined) as typeof search.status })
            }
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </Select>
          <div className="flex items-center text-xs text-slate-500">
            {pending > 0 ? (
              <span>
                <b className="text-amber-700">{pending}</b> awaiting a decision
              </span>
            ) : (
              <span>Nothing awaiting a decision</span>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <Table
          columns={['Employee', 'Type', 'From', 'To', 'Days', 'Reason', 'Status', '']}
          empty={requests.data?.length === 0}
        >
          {requests.data?.map((r) => (
            <Row key={r.id}>
              <Cell className="font-medium text-slate-800">
                {nameOf.get(r.employee_id) ?? '—'}
              </Cell>
              <Cell>
                <Pill tone={typeOf.get(r.leave_type_id)?.is_paid ? 'cyan' : 'slate'}>
                  {typeOf.get(r.leave_type_id)?.code ?? '—'}
                </Pill>
              </Cell>
              <Cell mono>{r.start_date}</Cell>
              <Cell mono>{r.end_date}</Cell>
              <Cell mono>{Number(r.days)}</Cell>
              <Cell className="max-w-xs text-xs text-slate-600">{r.reason}</Cell>
              <Cell>
                <Pill tone={STATUS_TONE[r.status] ?? 'slate'}>{r.status}</Pill>
              </Cell>
              <Cell>
                {r.status === 'pending' && (
                  <div className="flex gap-1.5">
                    <Button
                      className="px-2 py-1 text-xs"
                      onClick={() => decide.mutate({ id: r.id, approve: true })}
                      disabled={decide.isPending}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="secondary"
                      className="px-2 py-1 text-xs"
                      onClick={() => decide.mutate({ id: r.id, approve: false })}
                      disabled={decide.isPending}
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </Cell>
            </Row>
          ))}
        </Table>
      </Card>

      {decide.isError && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          Could not decide — the balance may be insufficient, or documentation may be
          required.
        </p>
      )}

      <Card className="mt-4 p-5">
        <h2 className="mb-3 text-sm font-bold text-slate-800">
          Statutory leave types
          <span className="ml-2 font-normal text-xs text-slate-400">
            Labour Act 2074 defaults — editable, and not yet verified against the Act
          </span>
        </h2>
        <Table columns={['Code', 'Name', 'Accrual', 'Per year', 'Accumulates to', 'Paid']}>
          {types.data?.map((t) => (
            <Row key={t.id}>
              <Cell mono>{t.code}</Cell>
              <Cell className="font-medium text-slate-800">
                {t.name}
                {t.nepali_name && (
                  <span className="ml-2 text-xs text-slate-400">{t.nepali_name}</span>
                )}
              </Cell>
              <Cell className="text-xs">
                {t.accrual_method === 'per_days_worked'
                  ? `1 day per ${t.days_worked_per_day_earned} worked`
                  : t.accrual_method.replace(/_/g, ' ')}
              </Cell>
              <Cell mono>{Number(t.days_per_year) || '—'}</Cell>
              <Cell mono>{Number(t.max_accumulation_days) || '—'}</Cell>
              <Cell>
                <Pill tone={t.is_paid ? 'green' : 'slate'}>{t.is_paid ? 'paid' : 'unpaid'}</Pill>
              </Cell>
            </Row>
          ))}
        </Table>
      </Card>
    </>
  )
}
