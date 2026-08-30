import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

import {
  orgListCostCentresOptions,
  orgListEmploymentCategoriesOptions,
  orgListWorkLocationsOptions,
} from '@elogix/api-client/queries'

import { Card, Cell, PageHeader, Pill, Row, Table } from '@/components/ui'

export const Route = createFileRoute('/_app/org/locations')({ component: Locations })

function Locations() {
  const locations = useQuery(orgListWorkLocationsOptions())
  const costCentres = useQuery(orgListCostCentresOptions())
  const categories = useQuery(orgListEmploymentCategoriesOptions())

  return (
    <>
      <PageHeader
        title="Locations & Categories"
        subtitle="Where work happens, where spend lands, and on what terms people are engaged"
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="border-b border-slate-100 px-4 py-3 text-sm font-bold text-slate-800">
            Work locations
          </div>
          <Table columns={['Code', 'Name', 'District']} empty={locations.data?.length === 0}>
            {locations.data?.map((l) => (
              <Row key={l.id}>
                <Cell mono>{l.code}</Cell>
                <Cell className="font-medium text-slate-800">{l.name}</Cell>
                <Cell>{l.district ?? <span className="text-slate-400">—</span>}</Cell>
              </Row>
            ))}
          </Table>
        </Card>

        <Card>
          <div className="border-b border-slate-100 px-4 py-3 text-sm font-bold text-slate-800">
            Cost centres
          </div>
          <Table columns={['Code', 'Name']} empty={costCentres.data?.length === 0}>
            {costCentres.data?.map((c) => (
              <Row key={c.id}>
                <Cell mono>{c.code}</Cell>
                <Cell className="font-medium text-slate-800">{c.name}</Cell>
              </Row>
            ))}
          </Table>
        </Card>

        <Card className="lg:col-span-2">
          <div className="border-b border-slate-100 px-4 py-3 text-sm font-bold text-slate-800">
            Employment categories
            <span className="ml-2 font-normal text-xs text-slate-400">
              Probation is capped at six months by the Labour Act 2074
            </span>
          </div>
          <Table
            columns={['Code', 'Name', 'Statutory type', 'Probation', 'Notice', 'Overtime']}
            empty={categories.data?.length === 0}
          >
            {categories.data?.map((c) => (
              <Row key={c.id}>
                <Cell mono>{c.code}</Cell>
                <Cell className="font-medium text-slate-800">{c.name}</Cell>
                <Cell>
                  <Pill tone="violet">{c.employment_type.replace(/_/g, ' ')}</Pill>
                </Cell>
                <Cell mono>{c.probation_months ? `${c.probation_months} mo` : '—'}</Cell>
                <Cell mono>{c.notice_days ? `${c.notice_days} d` : '—'}</Cell>
                <Cell>
                  <Pill tone={c.is_overtime_eligible ? 'green' : 'slate'}>
                    {c.is_overtime_eligible ? 'eligible' : 'exempt'}
                  </Pill>
                </Cell>
              </Row>
            ))}
          </Table>
        </Card>
      </div>
    </>
  )
}
