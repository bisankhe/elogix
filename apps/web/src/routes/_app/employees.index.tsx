import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { z } from 'zod'

import {
  employeesListEmployeesOptions,
  orgListUnitsOptions,
} from '@elogix/api-client/queries'

import { Card, Cell, Input, PageHeader, Pill, Row, Select, Table } from '@/components/ui'
import { STATUS_TONE } from '@/lib/employee'

/**
 * Filter state lives in the URL, not component state — the screens are filtered tables,
 * and a filtered view should be shareable, bookmarkable and correct on back-button.
 */
const searchSchema = z.object({
  q: z.string().optional(),
  status: z.enum(['probation', 'active', 'suspended', 'exited']).optional(),
  org_unit_id: z.string().uuid().optional(),
})

export const Route = createFileRoute('/_app/employees/')({
  validateSearch: searchSchema,
  component: EmployeeList,
})

function EmployeeList() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const units = useQuery(orgListUnitsOptions())
  const employees = useQuery(
    employeesListEmployeesOptions({
      query: {
        q: search.q || undefined,
        status: search.status,
        org_unit_id: search.org_unit_id,
      },
    }),
  )

  const setFilter = (patch: Partial<typeof search>) =>
    void navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true })

  return (
    <>
      <PageHeader
        title="Employees"
        subtitle={employees.data ? `${employees.data.total} on record` : 'Loading…'}
      />

      <Card className="mb-4 p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Input
            placeholder="Search name or code…"
            defaultValue={search.q ?? ''}
            onChange={(e) => setFilter({ q: e.target.value || undefined })}
          />
          <Select
            value={search.status ?? ''}
            onChange={(e) =>
              setFilter({ status: (e.target.value || undefined) as typeof search.status })
            }
          >
            <option value="">All statuses</option>
            <option value="probation">Probation</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="exited">Exited</option>
          </Select>
          <Select
            value={search.org_unit_id ?? ''}
            onChange={(e) => setFilter({ org_unit_id: e.target.value || undefined })}
          >
            <option value="">All org units</option>
            {units.data?.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      <Card>
        <Table
          columns={['Code', 'Name', 'Work email', 'Status', 'Joined']}
          empty={employees.data?.items.length === 0}
        >
          {employees.data?.items.map((e) => (
            <Row key={e.id}>
              <Cell mono>{e.employee_code}</Cell>
              <Cell>
                <Link
                  to="/employees/$employeeId"
                  params={{ employeeId: e.id }}
                  className="font-medium text-blue-700 hover:underline"
                >
                  {e.full_name}
                </Link>
              </Cell>
              <Cell>{e.work_email ?? <span className="text-slate-400">—</span>}</Cell>
              <Cell>
                <Pill tone={STATUS_TONE[e.status] ?? 'slate'}>{e.status}</Pill>
              </Cell>
              <Cell mono>{e.joined_on}</Cell>
            </Row>
          ))}
        </Table>
      </Card>
    </>
  )
}
