import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { z } from 'zod'

import { essApplyForLeave, essWithdrawLeaveRequest } from '@elogix/api-client'
import {
  essMyAttendanceOptions,
  essMyBalancesOptions,
  essMyDocumentsOptions,
  essMyLeaveRequestsOptions,
  essMyLeaveRequestsQueryKey,
  essMyPayslipsOptions,
  essMyProfileOptions,
  leaveListTypesOptions,
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

const TABS = ['profile', 'attendance', 'leave', 'pay', 'documents'] as const

const STATUS_TONE: Record<string, PillTone> = {
  present: 'green',
  half_day: 'amber',
  absent: 'red',
  leave: 'blue',
  holiday: 'violet',
  weekly_off: 'slate',
  pending: 'amber',
  approved: 'green',
  rejected: 'red',
  cancelled: 'slate',
}

const searchSchema = z.object({
  tab: z.enum(TABS).default('profile'),
  year: z.number().int().min(2000).max(2100).optional(),
  month: z.number().int().min(1).max(12).optional(),
})

export const Route = createFileRoute('/_app/me')({
  validateSearch: searchSchema,
  component: SelfServicePage,
})

function npr(value: string | number): string {
  return `NPR ${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
}

function hhmm(minutes: number): string {
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`
}

function SelfServicePage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  const profile = useQuery(essMyProfileOptions())

  // A login with no employee record gets a 403 from every route here. That is the
  // server being right, not an error to bury — say what it means.
  if (profile.isError) {
    return (
      <>
        <PageHeader title="My workspace" />
        {/* The title says what the reader can do about it; the body is the server's
            own reason, verbatim. Repeating the reason as the title would waste the one
            line people actually read. */}
        <Banner tone="warning" title="Self-service is not open on this login">
          {apiErrorMessage(profile.error, 'Self-service is unavailable for this account.')}{' '}
          Ask HR to link it to your employee record.
        </Banner>
      </>
    )
  }

  const me = profile.data

  return (
    <>
      <PageHeader
        title={me ? me.full_name : 'My workspace'}
        subtitle={
          me
            ? [me.employee_code, me.designation, me.org_unit].filter(Boolean).join(' · ')
            : undefined
        }
      />

      <div className="mb-5 flex flex-wrap gap-1 border-b border-slate-200">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => void navigate({ search: (s) => ({ ...s, tab }) })}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium capitalize transition-colors ${
              search.tab === tab
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {search.tab === 'profile' && <ProfileTab />}
      {search.tab === 'attendance' && <AttendanceTab />}
      {search.tab === 'leave' && <LeaveTab />}
      {search.tab === 'pay' && <PayTab />}
      {search.tab === 'documents' && <DocumentsTab />}
    </>
  )
}

// ── Profile ───────────────────────────────────────────────────────────

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="border-b border-slate-100 px-4 py-2.5 last:border-none">
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className="mt-0.5 text-sm text-slate-800">{value || '—'}</div>
    </div>
  )
}

function ProfileTab() {
  const me = useQuery(essMyProfileOptions()).data
  if (!me) return null

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div>
        <SectionLabel>Me</SectionLabel>
        <Card>
          <Detail label="Employee code" value={me.employee_code} />
          <Detail label="Name" value={me.full_name} />
          <Detail label="Name (Nepali)" value={me.full_name_nepali} />
          <Detail label="Date of birth" value={me.date_of_birth} />
          <Detail label="Status" value={me.status} />
        </Card>
      </div>

      <div>
        <SectionLabel>Where I sit</SectionLabel>
        <Card>
          <Detail label="Department" value={me.org_unit} />
          <Detail label="Designation" value={me.designation} />
          <Detail label="Grade" value={me.grade_level} />
          <Detail label="Location" value={me.work_location} />
          <Detail label="Reports to" value={me.manager_name} />
        </Card>

        <SectionLabel>Service</SectionLabel>
        <Card>
          <Detail label="Joined" value={me.joined_on} />
          <Detail label="Probation ends" value={me.probation_ends_on} />
          <Detail label="Confirmed" value={me.confirmed_on} />
        </Card>
      </div>

      <div>
        <SectionLabel>Statutory and pay</SectionLabel>
        <Card>
          <Detail label="PAN" value={me.pan_number} />
          <Detail label="SSF number" value={me.ssf_number} />
          <Detail label="Provident fund" value={me.provident_fund_number} />
          <Detail label="Citizenship" value={me.citizenship_number} />
          <Detail label="Bank" value={me.bank_name} />
          <Detail label="Account" value={me.bank_account_number} />
        </Card>
        <p className="mt-2 px-1 text-[11px] text-slate-400">
          Something wrong here? These are HR-maintained fields — ask HR to correct them
          rather than working around it.
        </p>
      </div>
    </div>
  )
}

// ── Attendance ────────────────────────────────────────────────────────

function AttendanceTab() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const now = new Date()
  const year = search.year ?? now.getFullYear()
  const month = search.month ?? now.getMonth() + 1

  const register = useQuery(essMyAttendanceOptions({ query: { year, month } }))
  const data = register.data

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Field label="Month">
          <Input
            type="month"
            value={`${year}-${String(month).padStart(2, '0')}`}
            onChange={(e) => {
              const [y, m] = e.target.value.split('-').map(Number)
              if (y && m) void navigate({ search: (s) => ({ ...s, year: y, month: m }) })
            }}
          />
        </Field>
      </div>

      {data && (
        <>
          <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Present" value={data.present_days} hint="days" />
            <StatCard label="On leave" value={data.leave_days} hint="days" />
            <StatCard label="Absent" value={data.absent_days} hint="days" />
            <StatCard
              label="Worked"
              value={hhmm(data.worked_minutes)}
              hint={
                data.overtime_minutes
                  ? `${hhmm(data.overtime_minutes)} overtime`
                  : 'no overtime'
              }
            />
          </div>

          <SectionLabel>My register</SectionLabel>
          <Card>
            <Table
              columns={['Date', 'In', 'Out', 'Worked', 'Late', 'Overtime', 'Status']}
              empty={data.days.length === 0}
            >
              {data.days.map((day) => (
                <Row key={day.work_date}>
                  <Cell mono>{day.work_date}</Cell>
                  <Cell mono>{day.first_in?.slice(11, 16) ?? '—'}</Cell>
                  <Cell mono>{day.last_out?.slice(11, 16) ?? '—'}</Cell>
                  <Cell mono>{day.worked_minutes ? hhmm(day.worked_minutes) : '—'}</Cell>
                  <Cell mono className={day.late_minutes ? 'text-amber-700' : ''}>
                    {day.late_minutes ? `${day.late_minutes}m` : '—'}
                  </Cell>
                  <Cell mono className={day.overtime_minutes ? 'text-emerald-700' : ''}>
                    {day.overtime_minutes ? hhmm(day.overtime_minutes) : '—'}
                  </Cell>
                  <Cell>
                    <Pill tone={STATUS_TONE[day.status] ?? 'slate'}>
                      {day.status.replace('_', ' ')}
                    </Pill>
                  </Cell>
                </Row>
              ))}
            </Table>
          </Card>
          <p className="mt-2 px-1 text-[11px] text-slate-400">
            This register is derived from device punches and is never edited directly. A
            correction is a regularisation request, so the original reading survives.
          </p>
        </>
      )}
    </>
  )
}

// ── Leave ─────────────────────────────────────────────────────────────

function LeaveTab() {
  const queryClient = useQueryClient()
  const balances = useQuery(essMyBalancesOptions())
  const requests = useQuery(essMyLeaveRequestsOptions())
  const types = useQuery(leaveListTypesOptions())

  const [form, setForm] = useState({
    leave_type_id: '',
    start_date: '',
    end_date: '',
    reason: '',
  })

  const invalidate = () =>
    void queryClient.invalidateQueries({ queryKey: essMyLeaveRequestsQueryKey() })

  const apply = useMutation({
    mutationFn: async () => {
      const { error } = await essApplyForLeave({ body: form })
      // The server computes the exact refusal — "Only 7.00 day(s) of Sick Leave
      // available; 50.00 requested". Showing a guess instead teaches people the app
      // does not know why it said no.
      if (error) throw new Error(apiErrorMessage(error, 'Could not submit the request'))
    },
    onSuccess: () => {
      setForm({ leave_type_id: '', start_date: '', end_date: '', reason: '' })
      invalidate()
    },
  })

  const withdraw = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await essWithdrawLeaveRequest({ path: { request_id: id } })
      if (error) throw new Error(apiErrorMessage(error, 'Could not withdraw the request'))
    },
    onSuccess: invalidate,
  })

  const nameOf = new Map(types.data?.map((t) => [t.id, t.name]))

  return (
    <>
      <SectionLabel>My balances</SectionLabel>
      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {balances.data?.map((b) => (
          <StatCard
            key={b.leave_type_id}
            label={b.name}
            value={Number(b.available_days).toFixed(2)}
            hint={b.is_paid ? `days · ${b.leave_year}` : `unpaid · ${b.leave_year}`}
          />
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div>
          <SectionLabel>Apply</SectionLabel>
          <Card className="p-4">
            <div className="grid gap-3">
              <Field label="Leave type">
                <Select
                  value={form.leave_type_id}
                  onChange={(e) => setForm({ ...form, leave_type_id: e.target.value })}
                >
                  <option value="">Choose…</option>
                  {types.data?.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="From">
                <Input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                />
              </Field>
              <Field label="To">
                <Input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                />
              </Field>
              <Field label="Reason">
                <Input
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  placeholder="Family function"
                />
              </Field>
              <Button
                onClick={() => apply.mutate()}
                disabled={
                  apply.isPending ||
                  !form.leave_type_id ||
                  !form.start_date ||
                  !form.end_date ||
                  !form.reason
                }
              >
                Submit request
              </Button>
              {apply.isError && (
                <p role="alert" className="text-xs text-red-700">
                  {apply.error.message}
                </p>
              )}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <SectionLabel>My requests</SectionLabel>
          <Card>
            <Table
              columns={['Type', 'From', 'To', 'Days', 'Status', '']}
              empty={requests.data?.length === 0}
            >
              {requests.data?.map((r) => (
                <Row key={r.id}>
                  <Cell>{nameOf.get(r.leave_type_id) ?? '—'}</Cell>
                  <Cell mono>{r.start_date}</Cell>
                  <Cell mono>{r.end_date}</Cell>
                  <Cell mono>{Number(r.days)}</Cell>
                  <Cell>
                    <Pill tone={STATUS_TONE[r.status] ?? 'slate'}>{r.status}</Pill>
                  </Cell>
                  <Cell>
                    {r.status === 'pending' && (
                      <Button
                        variant="secondary"
                        className="px-2 py-1 text-xs"
                        onClick={() => withdraw.mutate(r.id)}
                        disabled={withdraw.isPending}
                      >
                        Withdraw
                      </Button>
                    )}
                  </Cell>
                </Row>
              ))}
            </Table>
          </Card>
          {withdraw.isError && (
            <p role="alert" className="mt-2 text-xs text-red-700">
              {withdraw.error.message}
            </p>
          )}
        </div>
      </div>
    </>
  )
}

// ── Pay ───────────────────────────────────────────────────────────────

function PayTab() {
  const payslips = useQuery(essMyPayslipsOptions())

  return (
    <>
      <SectionLabel>My payslips</SectionLabel>
      <Card>
        <Table
          columns={['Period', 'Fiscal year', 'Payable days', 'Gross', 'Deductions', 'Net pay']}
          empty={payslips.data?.length === 0}
        >
          {payslips.data?.map((p) => (
            <Row key={p.id}>
              <Cell mono>
                {p.period_start} → {p.period_end}
              </Cell>
              <Cell mono>{p.fiscal_year}</Cell>
              <Cell mono>{Number(p.payable_days)}</Cell>
              <Cell mono>{npr(p.gross)}</Cell>
              <Cell mono>{npr(p.total_deductions)}</Cell>
              <Cell mono className="font-semibold text-slate-900">
                {npr(p.net_pay)}
              </Cell>
            </Row>
          ))}
        </Table>
      </Card>
      <p className="mt-2 px-1 text-[11px] text-slate-400">
        Only approved runs appear here. A payroll run that is still being computed is a
        working draft, and its figures can still move.
      </p>
    </>
  )
}

// ── Documents ─────────────────────────────────────────────────────────

function DocumentsTab() {
  const documents = useQuery(essMyDocumentsOptions())

  return (
    <>
      <SectionLabel>My documents</SectionLabel>
      <Card>
        <Table
          columns={['Type', 'Title', 'Issued', 'Expires', 'Verified']}
          empty={documents.data?.length === 0}
        >
          {documents.data?.map((d) => (
            <Row key={d.id}>
              <Cell>{d.document_type.replace('_', ' ')}</Cell>
              <Cell className="font-medium text-slate-800">{d.title}</Cell>
              <Cell mono>{d.issued_on ?? '—'}</Cell>
              <Cell mono>{d.expires_on ?? '—'}</Cell>
              <Cell>
                {d.is_verified ? (
                  <Pill tone="green">verified</Pill>
                ) : (
                  <Pill tone="amber">pending</Pill>
                )}
              </Cell>
            </Row>
          ))}
        </Table>
      </Card>
    </>
  )
}
