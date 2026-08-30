import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

import { employeesListEmployeesOptions } from '@elogix/api-client/queries'

import { Card, Cell, PageHeader, Pill, Row, Table } from '@/components/ui'
import type { PillTone } from '@/components/ui'

export const Route = createFileRoute('/_app/employees')({ component: Employees })

const STATUS_TONE: Record<string, PillTone> = {
  active: 'green',
  probation: 'amber',
  suspended: 'orange',
  exited: 'slate',
}

function Employees() {
  const employees = useQuery(employeesListEmployeesOptions())

  return (
    <>
      <PageHeader
        title="Employees"
        subtitle={
          employees.data ? `${employees.data.total} on record` : 'Loading…'
        }
      />
      <Card>
        <Table
          columns={['Code', 'Name', 'Email', 'Status', 'Joined']}
          empty={employees.data?.items.length === 0}
        >
          {employees.data?.items.map((e) => (
            <Row key={e.id}>
              <Cell mono>{e.employee_code}</Cell>
              <Cell className="font-medium text-slate-800">{e.full_name}</Cell>
              <Cell>{e.email ?? <span className="text-slate-400">—</span>}</Cell>
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
