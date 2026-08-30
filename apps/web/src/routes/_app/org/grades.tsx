import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

import {
  orgListDesignationsOptions,
  orgListGradeLevelsOptions,
} from '@elogix/api-client/queries'

import { Card, Cell, PageHeader, Pill, Row, Table } from '@/components/ui'

export const Route = createFileRoute('/_app/org/grades')({ component: Grades })

function Grades() {
  const grades = useQuery(orgListGradeLevelsOptions())
  const designations = useQuery(orgListDesignationsOptions())

  const gradeName = new Map(grades.data?.map((g) => [g.id, g.name]))

  return (
    <>
      <PageHeader
        title="Grades & Designations"
        subtitle="What the job pays, and what the job is called — deliberately separate"
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="border-b border-slate-100 px-4 py-3 text-sm font-bold text-slate-800">
            Grade levels
          </div>
          {/* Ordered by rank, not code: a pay ladder read alphabetically is meaningless. */}
          <Table columns={['Rank', 'Code', 'Name']} empty={grades.data?.length === 0}>
            {grades.data?.map((g) => (
              <Row key={g.id}>
                <Cell mono>{g.rank}</Cell>
                <Cell mono>{g.code}</Cell>
                <Cell className="font-medium text-slate-800">{g.name}</Cell>
              </Row>
            ))}
          </Table>
        </Card>

        <Card>
          <div className="border-b border-slate-100 px-4 py-3 text-sm font-bold text-slate-800">
            Designations
          </div>
          <Table columns={['Code', 'Title', 'Grade']} empty={designations.data?.length === 0}>
            {designations.data?.map((d) => (
              <Row key={d.id}>
                <Cell mono>{d.code}</Cell>
                <Cell className="font-medium text-slate-800">{d.name}</Cell>
                <Cell>
                  {d.grade_level_id ? (
                    <Pill tone="cyan">{gradeName.get(d.grade_level_id) ?? '—'}</Pill>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </Cell>
              </Row>
            ))}
          </Table>
        </Card>
      </div>
    </>
  )
}
