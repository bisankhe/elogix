import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

import { orgCreateUnit } from '@elogix/api-client'
import type { OrgUnitNode } from '@elogix/api-client'
import { orgListUnitsQueryKey, orgOrgTreeOptions } from '@elogix/api-client/queries'

import { Button, Card, Field, Input, PageHeader, Pill, Select } from '@/components/ui'
import type { PillTone } from '@/components/ui'

export const Route = createFileRoute('/_app/org/units')({ component: OrgUnits })

const KINDS = [
  'group',
  'company',
  'branch',
  'business_unit',
  'division',
  'department',
  'section',
  'team',
] as const

const KIND_TONE: Record<string, PillTone> = {
  group: 'violet',
  company: 'violet',
  branch: 'blue',
  business_unit: 'cyan',
  division: 'cyan',
  department: 'green',
  section: 'amber',
  team: 'slate',
}

function OrgUnits() {
  const queryClient = useQueryClient()
  const tree = useQuery(orgOrgTreeOptions())
  const [form, setForm] = useState({ code: '', name: '', kind: 'department', parent_id: '' })

  const create = useMutation({
    mutationFn: async () => {
      const { data, error } = await orgCreateUnit({
        body: {
          code: form.code,
          name: form.name,
          kind: form.kind as (typeof KINDS)[number],
          parent_id: form.parent_id || null,
        },
      })
      if (error || !data) throw new Error('Could not create unit')
      return data
    },
    onSuccess: () => {
      setForm({ code: '', name: '', kind: 'department', parent_id: '' })
      void queryClient.invalidateQueries({ queryKey: orgOrgTreeOptions().queryKey })
      void queryClient.invalidateQueries({ queryKey: orgListUnitsQueryKey() })
    },
  })

  const flat = flatten(tree.data ?? [])

  return (
    <>
      <PageHeader
        title="Org Structure"
        subtitle="One tree from group down to team — eight levels, one table"
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="p-5">
          {tree.isPending && <p className="text-sm text-slate-400">Loading…</p>}
          {tree.data?.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-400">
              No org units yet. Create the first one to start the chart.
            </p>
          )}
          <ul>
            {flat.map(({ node, depth }) => (
              <li
                key={node.id}
                className="flex items-center gap-2.5 border-b border-slate-100 py-2 last:border-none"
                style={{ paddingLeft: depth * 22 }}
              >
                {depth > 0 && <span className="text-slate-300">└</span>}
                <span className="text-sm font-medium text-slate-800">{node.name}</span>
                <span className="font-mono text-[11px] text-slate-400">{node.code}</span>
                <span className="ml-auto">
                  <Pill tone={KIND_TONE[node.kind] ?? 'slate'}>
                    {node.kind.replace(/_/g, ' ')}
                  </Pill>
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="h-fit p-5">
          <h2 className="mb-3 text-sm font-bold text-slate-800">Add a unit</h2>
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              create.mutate()
            }}
          >
            <Field label="Code">
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="ENG"
                required
              />
            </Field>
            <Field label="Name">
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Engineering"
                required
              />
            </Field>
            <Field label="Kind">
              <Select
                value={form.kind}
                onChange={(e) => setForm({ ...form, kind: e.target.value })}
              >
                {KINDS.map((k) => (
                  <option key={k} value={k}>
                    {k.replace(/_/g, ' ')}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Parent">
              <Select
                value={form.parent_id}
                onChange={(e) => setForm({ ...form, parent_id: e.target.value })}
              >
                <option value="">— top level —</option>
                {flat.map(({ node, depth }) => (
                  <option key={node.id} value={node.id}>
                    {' '.repeat(depth * 2)}
                    {node.name}
                  </option>
                ))}
              </Select>
            </Field>

            {create.isError && (
              <p role="alert" className="text-xs text-red-700">
                Could not create — the code may already be in use.
              </p>
            )}

            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? 'Adding…' : 'Add unit'}
            </Button>
          </form>
        </Card>
      </div>
    </>
  )
}

/** Depth-first flatten, so the nested tree renders as an indented list. */
function flatten(nodes: OrgUnitNode[], depth = 0): { node: OrgUnitNode; depth: number }[] {
  return nodes.flatMap((node) => [
    { node, depth },
    ...flatten(node.children ?? [], depth + 1),
  ])
}
