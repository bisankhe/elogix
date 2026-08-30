import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { attendanceProcess } from '@elogix/api-client'
import {
  attendanceGetPolicyOptions,
  attendanceListDaysOptions,
  attendanceListDaysQueryKey,
  employeesListEmployeesOptions,
} from '@elogix/api-client/queries'

import { Button, Card, Cell, Input, PageHeader, Pill, Row, Select, Table } from '@/components/ui'
import type { PillTone } from '@/components/ui'

const STATUS_TONE: Record<string, PillTone> = {
  present: 'green',
  half_day: 'amber',
  absent: 'red',
  weekly_off: 'slate',
  holiday: 'violet',
  leave: 'cyan',
}

/** The register is a filtered table, so its filters belong in the URL. */
const searchSchema = z.object({
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  employee_id: z.string().uuid().optional(),
})

export const Route = createFileRoute('/_app/attendance')({
  validateSearch: searchSchema,
  component: AttendanceRegister,
})

/** Minutes read as hours everywhere a person looks at them. */
function hhmm(minutes: number): string {
  if (!minutes) return '—'
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`
}

function monthBounds(): [string, string] {
  const now = new Date()
  const first = new Date(now.getFullYear(), now.getMonth(), 1)
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  return [iso(first), iso(last)]
}

function AttendanceRegister() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const queryClient = useQueryClient()

  const [defaultStart, defaultEnd] = monthBounds()
  const start = search.start_date ?? defaultStart
  const end = search.end_date ?? defaultEnd

  const policy = useQuery(attendanceGetPolicyOptions())
  const employees = useQuery(employeesListEmployeesOptions())
  const days = useQuery(
    attendanceListDaysOptions({
      query: { start_date: start, end_date: end, employee_id: search.employee_id },
    }),
  )

  const process = useMutation({
    mutationFn: async () => {
      const { error } = await attendanceProcess({
        body: { start_date: start, end_date: end, employee_id: search.employee_id ?? null },
      })
      if (error) throw new Error('Could not process')
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: attendanceListDaysQueryKey({
          query: { start_date: start, end_date: end, employee_id: search.employee_id },
        }),
      }),
  })

  const nameOf = new Map(employees.data?.items.map((e) => [e.id, e.full_name]))
  const setFilter = (patch: Partial<typeof search>) =>
    void navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true })

  const totals = (days.data ?? []).reduce(
    (acc, d) => ({
      worked: acc.worked + d.worked_minutes,
      overtime: acc.overtime + d.overtime_minutes,
      late: acc.late + d.late_minutes,
      absent: acc.absent + (d.status === 'absent' ? 1 : 0),
    }),
    { worked: 0, overtime: 0, late: 0, absent: 0 },
  )

  return (
    <>
      <PageHeader
        title="Attendance"
        subtitle={
          policy.data
            ? `${policy.data.standard_daily_minutes / 60}h day · overtime capped at ${
                policy.data.max_overtime_minutes_per_day / 60
              }h · ${policy.data.grace_minutes} min grace`
            : 'Daily register'
        }
        actions={
          <Button onClick={() => process.mutate()} disabled={process.isPending}>
            {process.isPending ? 'Processing…' : 'Recompute range'}
          </Button>
        }
      />

      <Card className="mb-4 p-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <Input
            type="date"
            value={start}
            onChange={(e) => setFilter({ start_date: e.target.value })}
          />
          <Input
            type="date"
            value={end}
            onChange={(e) => setFilter({ end_date: e.target.value })}
          />
          <Select
            value={search.employee_id ?? ''}
            onChange={(e) => setFilter({ employee_id: e.target.value || undefined })}
          >
            <option value="">All employees</option>
            {employees.data?.items.map((e) => (
              <option key={e.id} value={e.id}>
                {e.full_name}
              </option>
            ))}
          </Select>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>
              worked <b className="text-slate-800">{hhmm(totals.worked)}</b>
            </span>
            <span>
              OT <b className="text-emerald-700">{hhmm(totals.overtime)}</b>
            </span>
            {totals.absent > 0 && (
              <span>
                absent <b className="text-red-600">{totals.absent}</b>
              </span>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <Table
          columns={['Date', 'Employee', 'Status', 'In', 'Out', 'Worked', 'Late', 'Overtime', 'Remarks']}
          empty={days.data?.length === 0}
        >
          {days.data?.map((d) => (
            <Row key={d.id}>
              <Cell mono>{d.work_date}</Cell>
              <Cell className="font-medium text-slate-800">
                {nameOf.get(d.employee_id) ?? '—'}
              </Cell>
              <Cell>
                <Pill tone={STATUS_TONE[d.status] ?? 'slate'}>
                  {d.status.replace(/_/g, ' ')}
                </Pill>
              </Cell>
              <Cell mono>{d.first_in ? d.first_in.slice(11, 16) : '—'}</Cell>
              <Cell mono>{d.last_out ? d.last_out.slice(11, 16) : '—'}</Cell>
              <Cell mono>{hhmm(d.worked_minutes)}</Cell>
              <Cell mono className={d.late_minutes ? 'text-red-600' : ''}>
                {hhmm(d.late_minutes)}
              </Cell>
              <Cell mono className={d.overtime_minutes ? 'text-emerald-700' : ''}>
                {hhmm(d.overtime_minutes)}
              </Cell>
              <Cell className="max-w-xs text-xs text-amber-700">{d.remarks ?? ''}</Cell>
            </Row>
          ))}
        </Table>
      </Card>

      {days.data?.length === 0 && (
        <p className="mt-3 text-xs text-slate-500">
          Assign a roster, record punches, then use “Recompute range”. The register is
          derived from punches, so it is always safe to rebuild.
        </p>
      )}
    </>
  )
}
