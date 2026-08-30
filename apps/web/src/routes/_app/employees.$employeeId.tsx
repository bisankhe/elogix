import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'

import {
  employeesGetEmployeeOptions,
  employeesListAssignmentsOptions,
  employeesListDocumentsOptions,
  employeesListEventsOptions,
  orgListDesignationsOptions,
  orgListGradeLevelsOptions,
  orgListUnitsOptions,
} from '@elogix/api-client/queries'

import { Card, Cell, PageHeader, Pill, Row, Table } from '@/components/ui'
import { EVENT_TONE, REASON_TONE, STATUS_TONE } from '@/lib/employee'

export const Route = createFileRoute('/_app/employees/$employeeId')({
  component: EmployeeDetail,
})

function EmployeeDetail() {
  const { employeeId } = Route.useParams()
  const path = { path: { employee_id: employeeId } }

  const employee = useQuery(employeesGetEmployeeOptions(path))
  const assignments = useQuery(employeesListAssignmentsOptions(path))
  const events = useQuery(employeesListEventsOptions(path))
  const documents = useQuery(employeesListDocumentsOptions(path))
  const units = useQuery(orgListUnitsOptions())
  const designations = useQuery(orgListDesignationsOptions())
  const grades = useQuery(orgListGradeLevelsOptions())

  const unitName = new Map(units.data?.map((u) => [u.id, u.name]))
  const designationName = new Map(designations.data?.map((d) => [d.id, d.name]))
  const gradeName = new Map(grades.data?.map((g) => [g.id, g.name]))

  if (employee.isPending) return <p className="text-sm text-slate-400">Loading…</p>
  if (employee.isError || !employee.data)
    return (
      <p role="alert" className="text-sm text-red-700">
        Employee not found.
      </p>
    )

  const e = employee.data

  return (
    <>
      <Link to="/employees" className="mb-2 inline-block text-xs text-slate-500 hover:underline">
        ← All employees
      </Link>

      <PageHeader
        title={e.full_name}
        subtitle={`${e.employee_code} · joined ${e.joined_on}`}
        actions={<Pill tone={STATUS_TONE[e.status] ?? 'slate'}>{e.status}</Pill>}
      />

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <div className="flex flex-col gap-4">
          <Card className="p-5">
            <h2 className="mb-3 text-sm font-bold text-slate-800">Profile</h2>
            <dl className="text-sm">
              <Detail label="Work email" value={e.work_email} />
              <Detail label="Personal email" value={e.personal_email} />
              <Detail label="Phone" value={e.phone} />
              <Detail label="Gender" value={e.gender} />
              <Detail label="Marital status" value={e.marital_status} />
              <Detail label="Date of birth" value={e.date_of_birth} />
              <Detail label="Nationality" value={e.nationality} />
              <Detail label="District" value={e.district} />
            </dl>
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-sm font-bold text-slate-800">Statutory</h2>
            <dl className="text-sm">
              <Detail label="Citizenship no." value={e.citizenship_number} mono />
              <Detail label="PAN" value={e.pan_number} mono />
              <Detail label="SSF no." value={e.ssf_number} mono />
              <Detail label="PF no." value={e.provident_fund_number} mono />
              <Detail label="Bank" value={e.bank_name} />
              <Detail label="Account" value={e.bank_account_number} mono />
            </dl>
          </Card>

          {e.status === 'exited' && (
            <Card className="border-red-200 bg-red-50/50 p-5">
              <h2 className="mb-2 text-sm font-bold text-red-800">Exit</h2>
              <p className="text-xs text-red-900">
                Left on {e.exited_on}. {e.exit_reason}
              </p>
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <div className="border-b border-slate-100 px-4 py-3 text-sm font-bold text-slate-800">
              Assignment history
              <span className="ml-2 text-xs font-normal text-slate-400">
                Where this person sat, and when
              </span>
            </div>
            <Table
              columns={['From', 'To', 'Org unit', 'Designation', 'Grade', 'Reason']}
              empty={assignments.data?.length === 0}
            >
              {assignments.data?.map((a) => (
                <Row key={a.id}>
                  <Cell mono>{a.effective_from}</Cell>
                  <Cell mono>
                    {a.effective_to ?? <Pill tone="green">current</Pill>}
                  </Cell>
                  <Cell className="font-medium text-slate-800">
                    {unitName.get(a.org_unit_id) ?? '—'}
                  </Cell>
                  <Cell>
                    {a.designation_id ? (designationName.get(a.designation_id) ?? '—') : '—'}
                  </Cell>
                  <Cell>{a.grade_level_id ? (gradeName.get(a.grade_level_id) ?? '—') : '—'}</Cell>
                  <Cell>
                    <Pill tone={REASON_TONE[a.reason] ?? 'slate'}>{a.reason}</Pill>
                  </Cell>
                </Row>
              ))}
            </Table>
          </Card>

          <Card>
            <div className="border-b border-slate-100 px-4 py-3 text-sm font-bold text-slate-800">
              Timeline
            </div>
            <Table columns={['Date', 'Event', 'Note']} empty={events.data?.length === 0}>
              {events.data?.map((ev) => (
                <Row key={ev.id}>
                  <Cell mono>{ev.occurred_on}</Cell>
                  <Cell>
                    <Pill tone={EVENT_TONE[ev.event_type] ?? 'slate'}>{ev.event_type}</Pill>
                  </Cell>
                  <Cell>{ev.note ?? <span className="text-slate-400">—</span>}</Cell>
                </Row>
              ))}
            </Table>
          </Card>

          <Card>
            <div className="border-b border-slate-100 px-4 py-3 text-sm font-bold text-slate-800">
              Documents
            </div>
            <Table
              columns={['Type', 'Title', 'Issued', 'Expires', 'Verified']}
              empty={documents.data?.length === 0}
            >
              {documents.data?.map((d) => (
                <Row key={d.id}>
                  <Cell>
                    <Pill tone="cyan">{d.document_type.replace(/_/g, ' ')}</Pill>
                  </Cell>
                  <Cell className="font-medium text-slate-800">{d.title}</Cell>
                  <Cell mono>{d.issued_on ?? '—'}</Cell>
                  <Cell mono>{d.expires_on ?? '—'}</Cell>
                  <Cell>
                    <Pill tone={d.is_verified ? 'green' : 'slate'}>
                      {d.is_verified ? 'verified' : 'pending'}
                    </Pill>
                  </Cell>
                </Row>
              ))}
            </Table>
          </Card>
        </div>
      </div>
    </>
  )
}

function Detail({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string | null | undefined
  mono?: boolean
}) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-50 py-1.5 last:border-none">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className={`text-right text-xs ${mono ? 'font-mono' : ''} text-slate-800`}>
        {value || <span className="text-slate-300">—</span>}
      </dd>
    </div>
  )
}
