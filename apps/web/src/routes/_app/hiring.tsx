import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { z } from 'zod'

import {
  recruitmentCreateApplication,
  recruitmentCreateCandidate,
  recruitmentCreateOffer,
  recruitmentCreateRequisition,
  recruitmentMoveApplication,
  recruitmentOnboardOffer,
  recruitmentOpenRequisition,
  recruitmentSendOffer,
} from '@elogix/api-client'
import {
  orgListPositionsOptions,
  recruitmentGetApplicationOptions,
  recruitmentListApplicationsOptions,
  recruitmentListCandidatesOptions,
  recruitmentListOffersOptions,
  recruitmentListRequisitionsOptions,
  recruitmentListStagesOptions,
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
  Table,
} from '@/components/ui'
import type { PillTone } from '@/components/ui'
import { apiErrorMessage } from '@/lib/errors'
import { invalidate } from '@/lib/queries'

const TABS = ['board', 'requisitions', 'candidates'] as const

const OUTCOME_TONE: Record<string, PillTone> = {
  hired: 'green',
  rejected: 'red',
  withdrawn: 'slate',
}
const REQ_TONE: Record<string, PillTone> = {
  draft: 'slate',
  open: 'green',
  on_hold: 'amber',
  filled: 'blue',
  cancelled: 'slate',
}

const searchSchema = z.object({
  tab: z.enum(TABS).default('board'),
  requisition_id: z.string().uuid().optional(),
  application_id: z.string().uuid().optional(),
})

export const Route = createFileRoute('/_app/hiring')({
  validateSearch: searchSchema,
  component: HiringPage,
})

function npr(value: string | number): string {
  return `NPR ${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
}

function HiringPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  return (
    <>
      <PageHeader
        title="Hiring"
        subtitle="Requisitions draw against budgeted headcount; every stage move is recorded"
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

      {search.tab === 'board' && <BoardTab />}
      {search.tab === 'requisitions' && <RequisitionsTab />}
      {search.tab === 'candidates' && <CandidatesTab />}
    </>
  )
}

// ── The board ─────────────────────────────────────────────────────────

function BoardTab() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const queryClient = useQueryClient()

  const stages = useQuery(recruitmentListStagesOptions())
  const requisitions = useQuery(recruitmentListRequisitionsOptions())
  const candidates = useQuery(recruitmentListCandidatesOptions())
  const applications = useQuery(
    recruitmentListApplicationsOptions({
      query: search.requisition_id ? { requisition_id: search.requisition_id } : {},
    }),
  )

  const nameOf = new Map(candidates.data?.map((c) => [c.id, c.full_name]))
  const stageOf = new Map(stages.data?.map((s) => [s.id, s]))
  const live = stages.data?.filter((s) => !s.is_terminal) ?? []
  const refresh = () => {
    invalidate(queryClient, 'recruitmentListApplications', 'recruitmentGetApplication')
  }

  return (
    <>
      <div className="mb-4 w-80">
        <Field label="Requisition">
          <Select
            value={search.requisition_id ?? ''}
            onChange={(e) =>
              void navigate({
                search: (s) => ({ ...s, requisition_id: e.target.value || undefined }),
              })
            }
          >
            <option value="">All requisitions</option>
            {requisitions.data?.map((r) => (
              <option key={r.id} value={r.id}>
                {r.code} · {r.title} ({r.status})
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {live.length > 0 && (
        <>
          <SectionLabel>Pipeline</SectionLabel>
          <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {live.map((stage) => {
              const inStage =
                applications.data?.filter((a) => a.stage_id === stage.id) ?? []
              return (
                <Card key={stage.id} className="p-3">
                  <div className="mb-2 flex items-baseline justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      {stage.name}
                    </span>
                    <span className="text-sm font-bold tabular-nums text-slate-900">
                      {inStage.length}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    {inStage.map((a) => (
                      <button
                        key={a.id}
                        onClick={() =>
                          void navigate({ search: (s) => ({ ...s, application_id: a.id }) })
                        }
                        className={`rounded-lg border px-2 py-1.5 text-left text-xs transition-colors ${
                          a.id === search.application_id
                            ? 'border-blue-300 bg-blue-50 text-blue-900'
                            : 'border-slate-100 bg-white hover:bg-slate-50'
                        }`}
                      >
                        {nameOf.get(a.candidate_id) ?? '—'}
                      </button>
                    ))}
                    {inStage.length === 0 && (
                      <span className="px-1 py-2 text-xs text-slate-400">Nobody here</span>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        </>
      )}

      <SectionLabel>Applications</SectionLabel>
      <Card>
        <Table
          columns={['Candidate', 'Applied', 'Stage', 'Outcome', '']}
          empty={applications.data?.length === 0}
        >
          {applications.data?.map((a) => (
            <Row key={a.id}>
              <Cell className="font-medium text-slate-800">
                {nameOf.get(a.candidate_id) ?? '—'}
              </Cell>
              <Cell mono>{a.applied_on}</Cell>
              <Cell>{stageOf.get(a.stage_id)?.name ?? '—'}</Cell>
              <Cell>
                {a.outcome ? (
                  <Pill tone={OUTCOME_TONE[a.outcome] ?? 'slate'}>{a.outcome}</Pill>
                ) : (
                  <span className="text-xs text-slate-400">live</span>
                )}
              </Cell>
              <Cell>
                <Button
                  variant="secondary"
                  className="px-2 py-1 text-xs"
                  onClick={() =>
                    void navigate({ search: (s) => ({ ...s, application_id: a.id }) })
                  }
                >
                  {a.id === search.application_id ? 'Viewing' : 'Open'}
                </Button>
              </Cell>
            </Row>
          ))}
        </Table>
      </Card>

      {search.application_id && (
        <ApplicationDetail id={search.application_id} onChanged={refresh} />
      )}
    </>
  )
}

function ApplicationDetail({ id, onChanged }: { id: string; onChanged: () => void }) {
  const queryClient = useQueryClient()
  const detail = useQuery(
    recruitmentGetApplicationOptions({ path: { app_id: id } }),
  )
  const stages = useQuery(recruitmentListStagesOptions())
  const offers = useQuery(recruitmentListOffersOptions())

  const [move, setMove] = useState({ to_stage_id: '', note: '' })
  const [offer, setOffer] = useState({ basic: '', starts_on: '', expires_on: '' })
  const [employeeCode, setEmployeeCode] = useState('')
  const [link, setLink] = useState<string | null>(null)

  const refresh = () => {
    void detail.refetch()
    invalidate(queryClient, 'recruitmentListOffers')
    onChanged()
  }

  const stageOf = new Map(stages.data?.map((s) => [s.id, s]))
  const mine = offers.data?.find((o) => o.application_id === id)
  const target = stageOf.get(move.to_stage_id)
  const needsReason = target?.outcome === 'rejected'

  const doMove = useMutation({
    mutationFn: async () => {
      const { error } = await recruitmentMoveApplication({
        path: { app_id: id },
        body: { to_stage_id: move.to_stage_id, note: move.note || null },
      })
      if (error) throw new Error(apiErrorMessage(error, 'Could not move it'))
    },
    onSuccess: () => {
      setMove({ to_stage_id: '', note: '' })
      refresh()
    },
  })

  const makeOffer = useMutation({
    mutationFn: async () => {
      const { error } = await recruitmentCreateOffer({
        path: { app_id: id },
        body: {
          basic: offer.basic,
          starts_on: offer.starts_on,
          expires_on: offer.expires_on,
        },
      })
      if (error) throw new Error(apiErrorMessage(error, 'Could not draft the offer'))
    },
    onSuccess: () => refresh(),
  })

  const send = useMutation({
    mutationFn: async (offerId: string) => {
      const { data, error } = await recruitmentSendOffer({ path: { offer_id: offerId } })
      if (error || !data) throw new Error(apiErrorMessage(error, 'Could not send it'))
      return data.response_token
    },
    onSuccess: (token) => {
      setLink(`${window.location.origin}/offer/${token}`)
      refresh()
    },
  })

  const onboard = useMutation({
    mutationFn: async (offerId: string) => {
      const { error } = await recruitmentOnboardOffer({
        path: { offer_id: offerId },
        body: { employee_code: employeeCode },
      })
      if (error) throw new Error(apiErrorMessage(error, 'Could not onboard them'))
    },
    onSuccess: refresh,
  })

  const a = detail.data
  if (!a) return null

  return (
    <div className="mt-6">
      <SectionLabel>
        {a.candidate_name} · {a.requisition_code}
      </SectionLabel>

      {link && (
        <Banner tone="info" title="The candidate's response link">
          Send this to {a.candidate_email}. It is shown once and is the only way to
          answer the offer — the link is the credential, so treat it like one.
          <div className="mt-1 break-all font-mono text-[11px]">{link}</div>
        </Banner>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <div>
          <Card className="mb-4">
            <div className="border-b border-slate-100 px-4 py-3">
              <div className="text-[11px] text-slate-500">Currently</div>
              <div className="text-sm font-semibold text-slate-900">{a.stage_name}</div>
            </div>
            <div className="grid gap-3 p-4">
              <Field label="Move to">
                <Select
                  value={move.to_stage_id}
                  onChange={(e) => setMove({ ...move, to_stage_id: e.target.value })}
                >
                  <option value="">Choose…</option>
                  {stages.data
                    ?.filter((s) => s.id !== a.stage_id && s.is_active)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </Select>
              </Field>
              <Field label={needsReason ? 'Reason (required)' : 'Note'}>
                <Input
                  value={move.note}
                  onChange={(e) => setMove({ ...move, note: e.target.value })}
                  placeholder={
                    needsReason ? 'Why they were not taken forward' : 'Optional'
                  }
                />
              </Field>
              {/* The server refuses a rejection with no reason; saying so here means
                  nobody meets that refusal by surprise. */}
              {needsReason && (
                <p className="text-[11px] text-amber-700">
                  A rejection needs a reason — it is the decision most likely to be
                  asked about later.
                </p>
              )}
              <Button
                onClick={() => doMove.mutate()}
                disabled={
                  doMove.isPending ||
                  !move.to_stage_id ||
                  (needsReason && !move.note.trim())
                }
              >
                Move
              </Button>
              {doMove.isError && (
                <p role="alert" className="text-xs text-red-700">
                  {doMove.error.message}
                </p>
              )}
            </div>
          </Card>

          {!mine && (
            <>
              <SectionLabel>Offer</SectionLabel>
              <Card className="p-4">
                <div className="grid gap-3">
                  <Field label="Basic salary">
                    <Input
                      type="number"
                      value={offer.basic}
                      onChange={(e) => setOffer({ ...offer, basic: e.target.value })}
                      placeholder="60000.00"
                    />
                  </Field>
                  <Field label="Starts on">
                    <Input
                      type="date"
                      value={offer.starts_on}
                      onChange={(e) => setOffer({ ...offer, starts_on: e.target.value })}
                    />
                  </Field>
                  <Field label="Reply by">
                    <Input
                      type="date"
                      value={offer.expires_on}
                      onChange={(e) => setOffer({ ...offer, expires_on: e.target.value })}
                    />
                  </Field>
                  <Button
                    onClick={() => makeOffer.mutate()}
                    disabled={
                      makeOffer.isPending ||
                      !offer.basic ||
                      !offer.starts_on ||
                      !offer.expires_on
                    }
                  >
                    Draft offer
                  </Button>
                  {makeOffer.isError && (
                    <p role="alert" className="text-xs text-red-700">
                      {makeOffer.error.message}
                    </p>
                  )}
                </div>
              </Card>
            </>
          )}

          {mine && (
            <>
              <SectionLabel>Offer</SectionLabel>
              <Card className="p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <div className="text-lg font-bold text-slate-900">
                      {npr(mine.basic)}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      starts {mine.starts_on} · reply by {mine.expires_on}
                    </div>
                  </div>
                  <Pill tone={mine.status === 'accepted' ? 'green' : 'amber'}>
                    {mine.status}
                  </Pill>
                </div>

                {mine.status === 'draft' && (
                  <Button onClick={() => send.mutate(mine.id)} disabled={send.isPending}>
                    Send to candidate
                  </Button>
                )}
                {mine.status === 'accepted' && !mine.employee_id && (
                  <div className="grid gap-3">
                    <Field label="Employee code">
                      <Input
                        value={employeeCode}
                        onChange={(e) => setEmployeeCode(e.target.value)}
                        placeholder="EMP-010"
                      />
                    </Field>
                    <Button
                      onClick={() => onboard.mutate(mine.id)}
                      disabled={onboard.isPending || !employeeCode}
                    >
                      Onboard as employee
                    </Button>
                    <p className="text-[11px] text-slate-500">
                      Creates the employee, copies their placement from the
                      requisition’s position, and records {npr(mine.basic)} as their
                      salary — the figure they accepted, not a retyped one.
                    </p>
                  </div>
                )}
                {mine.employee_id && (
                  <p className="text-xs text-emerald-700">
                    Onboarded. They are on the employee register.
                  </p>
                )}
                {(send.isError || onboard.isError) && (
                  <p role="alert" className="mt-2 text-xs text-red-700">
                    {(send.error ?? onboard.error)?.message}
                  </p>
                )}
              </Card>
            </>
          )}
        </div>

        <div>
          <SectionLabel>History</SectionLabel>
          <Card>
            {/* Append-only. Every move, who made it and what they wrote — the column
                that answers a rejection challenged six months later. */}
            <ol className="divide-y divide-slate-100">
              {(a.events ?? []).map((e) => (
                <li key={e.id} className="px-4 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-medium text-slate-800">
                      {stageOf.get(e.from_stage_id ?? '')?.name
                        ? `${stageOf.get(e.from_stage_id ?? '')?.name} → `
                        : ''}
                      {stageOf.get(e.to_stage_id)?.name ?? '—'}
                    </span>
                    <span className="whitespace-nowrap font-mono text-[11px] text-slate-400">
                      {e.occurred_at.slice(0, 16).replace('T', ' ')}
                    </span>
                  </div>
                  {e.note && <p className="mt-0.5 text-xs text-slate-500">{e.note}</p>}
                  {!e.moved_by && (
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      By the candidate, through their own link
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </div>
  )
}

// ── Requisitions ──────────────────────────────────────────────────────

function RequisitionsTab() {
  const queryClient = useQueryClient()
  const requisitions = useQuery(recruitmentListRequisitionsOptions())
  const positions = useQuery(orgListPositionsOptions())
  const [form, setForm] = useState({ code: '', position_id: '', title: '', openings: '1' })

  const refresh = () =>
    invalidate(queryClient, 'recruitmentListRequisitions')

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await recruitmentCreateRequisition({
        body: {
          code: form.code,
          position_id: form.position_id,
          title: form.title,
          openings: Number(form.openings) || 1,
        },
      })
      // The server explains the budget precisely — "budgeted for 2: 1 filled and 1
      // already requisitioned, leaving 0". Never replace that with a guess.
      if (error) throw new Error(apiErrorMessage(error, 'Could not raise it'))
    },
    onSuccess: () => {
      setForm({ code: '', position_id: '', title: '', openings: '1' })
      refresh()
    },
  })

  const open = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await recruitmentOpenRequisition({ path: { req_id: id } })
      if (error) throw new Error(apiErrorMessage(error, 'Could not open it'))
    },
    onSuccess: refresh,
  })

  const titleOf = new Map(positions.data?.map((p) => [p.id, p.title]))

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div>
        <SectionLabel>Raise a requisition</SectionLabel>
        <Card className="p-4">
          <div className="grid gap-3">
            <Field label="Code">
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="REQ-001"
              />
            </Field>
            <Field label="Position">
              <Select
                value={form.position_id}
                onChange={(e) =>
                  setForm({
                    ...form,
                    position_id: e.target.value,
                    title: form.title || (titleOf.get(e.target.value) ?? ''),
                  })
                }
              >
                <option value="">Choose…</option>
                {positions.data?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} · {p.title} ({p.headcount} budgeted)
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Title">
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </Field>
            <Field label="Openings">
              <Input
                type="number"
                min={1}
                value={form.openings}
                onChange={(e) => setForm({ ...form, openings: e.target.value })}
              />
            </Field>
            <Button
              onClick={() => create.mutate()}
              disabled={create.isPending || !form.code || !form.position_id || !form.title}
            >
              Raise
            </Button>
            {create.isError && (
              <p role="alert" className="text-xs text-red-700">
                {create.error.message}
              </p>
            )}
            <p className="text-[11px] text-slate-500">
              A requisition draws against its position’s budgeted headcount, so this is
              refused if it would hire past the budget.
            </p>
          </div>
        </Card>
      </div>

      <div className="lg:col-span-2">
        <SectionLabel>Requisitions</SectionLabel>
        <Card>
          <Table
            columns={['Code', 'Title', 'Openings', 'Status', '']}
            empty={requisitions.data?.length === 0}
          >
            {requisitions.data?.map((r) => (
              <Row key={r.id}>
                <Cell mono>{r.code}</Cell>
                <Cell className="font-medium text-slate-800">{r.title}</Cell>
                <Cell mono>{r.openings}</Cell>
                <Cell>
                  <Pill tone={REQ_TONE[r.status] ?? 'slate'}>{r.status}</Pill>
                </Cell>
                <Cell>
                  {(r.status === 'draft' || r.status === 'on_hold') && (
                    <Button
                      variant="secondary"
                      className="px-2 py-1 text-xs"
                      onClick={() => open.mutate(r.id)}
                      disabled={open.isPending}
                    >
                      Open
                    </Button>
                  )}
                </Cell>
              </Row>
            ))}
          </Table>
        </Card>
      </div>
    </div>
  )
}

// ── Candidates ────────────────────────────────────────────────────────

function CandidatesTab() {
  const queryClient = useQueryClient()
  const candidates = useQuery(recruitmentListCandidatesOptions())
  const requisitions = useQuery(recruitmentListRequisitionsOptions())
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', source: '' })
  const [applyTo, setApplyTo] = useState<Record<string, string>>({})

  const refresh = () => {
    invalidate(queryClient, 'recruitmentListCandidates', 'recruitmentListApplications')
  }

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await recruitmentCreateCandidate({
        body: {
          full_name: form.full_name,
          email: form.email,
          phone: form.phone || null,
          source: form.source || null,
        },
      })
      if (error) throw new Error(apiErrorMessage(error, 'Could not add them'))
    },
    onSuccess: () => {
      setForm({ full_name: '', email: '', phone: '', source: '' })
      refresh()
    },
  })

  const apply = useMutation({
    mutationFn: async (candidateId: string) => {
      const { error } = await recruitmentCreateApplication({
        body: {
          candidate_id: candidateId,
          requisition_id: applyTo[candidateId],
        },
      })
      if (error) throw new Error(apiErrorMessage(error, 'Could not apply them'))
    },
    onSuccess: refresh,
  })

  const openReqs = requisitions.data?.filter((r) => r.status === 'open') ?? []

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div>
        <SectionLabel>Add a candidate</SectionLabel>
        <Card className="p-4">
          <div className="grid gap-3">
            <Field label="Full name">
              <Input
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
            <Field label="Phone">
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </Field>
            <Field label="Source">
              <Input
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
                placeholder="Referral"
              />
            </Field>
            <Button
              onClick={() => create.mutate()}
              disabled={create.isPending || !form.full_name || !form.email}
            >
              Add
            </Button>
            {create.isError && (
              <p role="alert" className="text-xs text-red-700">
                {create.error.message}
              </p>
            )}
          </div>
        </Card>
      </div>

      <div className="lg:col-span-2">
        <SectionLabel>Candidates</SectionLabel>
        <Card>
          <Table
            columns={['Name', 'Email', 'Source', 'Apply to']}
            empty={candidates.data?.length === 0}
          >
            {candidates.data?.map((c) => (
              <Row key={c.id}>
                <Cell className="font-medium text-slate-800">{c.full_name}</Cell>
                <Cell mono>{c.email}</Cell>
                <Cell>{c.source ?? '—'}</Cell>
                <Cell>
                  <div className="flex items-center gap-2">
                    <Select
                      value={applyTo[c.id] ?? ''}
                      onChange={(e) => setApplyTo({ ...applyTo, [c.id]: e.target.value })}
                      className="max-w-48"
                    >
                      <option value="">Choose…</option>
                      {openReqs.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.code}
                        </option>
                      ))}
                    </Select>
                    <Button
                      variant="secondary"
                      className="whitespace-nowrap px-2 py-1 text-xs"
                      onClick={() => apply.mutate(c.id)}
                      disabled={apply.isPending || !applyTo[c.id]}
                    >
                      Apply
                    </Button>
                  </div>
                </Cell>
              </Row>
            ))}
          </Table>
        </Card>
        {apply.isError && (
          <p role="alert" className="mt-2 text-xs text-red-700">
            {apply.error.message}
          </p>
        )}
      </div>
    </div>
  )
}
