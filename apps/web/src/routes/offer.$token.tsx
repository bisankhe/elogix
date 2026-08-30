import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

import { offerResponseRespond } from '@elogix/api-client'
import { offerResponseViewOfferOptions } from '@elogix/api-client/queries'

import { apiErrorMessage } from '@/lib/errors'
import { invalidate } from '@/lib/queries'

/**
 * The candidate's own page.
 *
 * Outside `_app`, so outside the auth guard: a candidate has no login and no tenant.
 * The token in the path is the whole of their access, and it is the only thing sent —
 * there is no offer id, no candidate id and nothing to substitute.
 *
 * Deliberately plain. It is not the product; it is a page someone opens once, from an
 * email, to answer a question about their own employment.
 */
export const Route = createFileRoute('/offer/$token')({ component: OfferPage })

function npr(value: string | number): string {
  return `NPR ${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
}

function OfferPage() {
  const { token } = Route.useParams()
  const queryClient = useQueryClient()
  const [declining, setDeclining] = useState(false)
  const [reason, setReason] = useState('')

  const offer = useQuery(offerResponseViewOfferOptions({ path: { token } }))

  const respond = useMutation({
    mutationFn: async (accept: boolean) => {
      const { error } = await offerResponseRespond({
        path: { token },
        body: { accept, reason: accept ? null : reason || null },
      })
      if (error) throw new Error(apiErrorMessage(error, 'That could not be recorded'))
    },
    onSuccess: () => {
      invalidate(queryClient, 'offerResponseViewOffer')
      void offer.refetch()
    },
  })

  if (offer.isError) {
    return (
      <Shell>
        <h1 className="text-xl font-bold text-slate-900">This link is not valid</h1>
        <p className="mt-2 text-sm text-slate-600">
          It may have expired, or already been used. Please contact the company that
          sent it to you.
        </p>
      </Shell>
    )
  }

  const o = offer.data
  if (!o) return null

  const answered = o.status === 'accepted' || o.status === 'declined'

  return (
    <Shell>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
        {o.company}
      </p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
        An offer of employment
      </h1>

      <dl className="mt-6 divide-y divide-slate-100 border-y border-slate-100">
        <Line label="Role" value={o.title} />
        <Line label="Basic salary" value={`${npr(o.basic)} per month`} />
        <Line label="Start date" value={o.starts_on} />
        <Line label="Please reply by" value={o.expires_on} />
      </dl>

      {answered && (
        <p
          className={`mt-6 rounded-xl border px-4 py-3 text-sm ${
            o.status === 'accepted'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-slate-200 bg-slate-50 text-slate-700'
          }`}
        >
          {o.status === 'accepted'
            ? 'You have accepted this offer. The company will be in touch about your first day.'
            : 'You have declined this offer. Thank you for letting us know.'}
        </p>
      )}

      {!answered && o.status === 'sent' && (
        <div className="mt-6">
          {!declining ? (
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => respond.mutate(true)}
                disabled={respond.isPending}
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                Accept this offer
              </button>
              <button
                onClick={() => setDeclining(true)}
                className="rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Decline
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-600">
                  If you would like to say why, it helps — but it is optional.
                </span>
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                  placeholder="Accepted another role"
                />
              </label>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => respond.mutate(false)}
                  disabled={respond.isPending}
                  className="rounded-lg bg-slate-800 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-900 disabled:opacity-50"
                >
                  Confirm decline
                </button>
                <button
                  onClick={() => setDeclining(false)}
                  className="rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Back
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {!answered && o.status !== 'sent' && (
        <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          This offer is no longer open for a response. Please contact {o.company} if you
          think that is wrong.
        </p>
      )}

      {respond.isError && (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {respond.error.message}
        </p>
      )}
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-lg rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
        {children}
      </div>
    </div>
  )
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="text-right text-sm font-semibold text-slate-900">{value}</dd>
    </div>
  )
}
