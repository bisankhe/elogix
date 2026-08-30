import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

import {
  orgListDesignationsOptions,
  orgListPositionsOptions,
  orgListUnitsOptions,
} from '@elogix/api-client/queries'

import { Card, Cell, PageHeader, Pill, Row, Table } from '@/components/ui'

export const Route = createFileRoute('/_app/org/positions')({ component: Positions })

function Positions() {
  const positions = useQuery(orgListPositionsOptions())
  const units = useQuery(orgListUnitsOptions())
  const designations = useQuery(orgListDesignationsOptions())

  const unitName = new Map(units.data?.map((u) => [u.id, u.name]))
  const designationName = new Map(designations.data?.map((d) => [d.id, d.name]))

  return (
    <>
      <PageHeader
        title="Positions"
        subtitle="Headcount slots — a designation, in an org unit, at a location"
      />
      <Card>
        <Table
          columns={['Code', 'Title', 'Org unit', 'Designation', 'Headcount', 'Status']}
          empty={positions.data?.length === 0}
        >
          {positions.data?.map((p) => (
            <Row key={p.id}>
              <Cell mono>{p.code}</Cell>
              <Cell className="font-medium text-slate-800">{p.title}</Cell>
              <Cell>{unitName.get(p.org_unit_id) ?? '—'}</Cell>
              <Cell>
                {p.designation_id ? (designationName.get(p.designation_id) ?? '—') : '—'}
              </Cell>
              <Cell mono>{p.headcount}</Cell>
              <Cell>
                <Pill tone={p.is_active ? 'green' : 'slate'}>
                  {p.is_active ? 'active' : 'inactive'}
                </Pill>
              </Cell>
            </Row>
          ))}
        </Table>
      </Card>
    </>
  )
}
