import { useMutation } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

import { authLogin, authRegisterCompany } from '@elogix/api-client'

import { setAccessToken } from '@/lib/auth'
import { apiErrorMessage } from '@/lib/errors'

/**
 * Company signup.
 *
 * Outside `_app`, so outside the auth guard — the whole point is that the person has
 * no account yet. It creates a trial tenant: the plan is not a field on the request,
 * so nothing sent from here can grant a paid tier.
 *
 * The slug is the login identifier every colleague will type, so it gets the most
 * attention on the page: derived from the company name, editable, and shown as the
 * thing it will become.
 */
export const Route = createFileRoute('/register')({ component: RegisterPage })

/** A company name is not a slug. Lowercase, strip, collapse, trim to the bounds. */
function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63)
}

function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    company_name: '',
    slug: '',
    admin_name: '',
    admin_email: '',
    password: '',
  })
  // Once the slug is edited by hand it stops following the name, so a deliberate
  // choice is never overwritten by a later typo fix in the company name.
  const [slugEdited, setSlugEdited] = useState(false)

  const slug = slugEdited ? form.slug : toSlug(form.company_name)
  const tooShort = form.password.length > 0 && form.password.length < 12

  const register = useMutation({
    mutationFn: async () => {
      const { error } = await authRegisterCompany({ body: { ...form, slug } })
      // The server says exactly why — a reserved slug, one already taken, or too many
      // attempts from this address. Any of those is worth reading verbatim.
      if (error) throw new Error(apiErrorMessage(error, 'Could not create the company'))

      // Straight in. Asking someone to type the password they just chose, on the next
      // screen, is a step that exists only because the form was easier to build.
      const { data } = await authLogin({
        body: {
          company_slug: slug,
          email: form.admin_email,
          password: form.password,
        },
      })
      return data?.access_token ?? null
    },
    onSuccess: (token) => {
      if (token) {
        setAccessToken(token)
        void navigate({ to: '/org/company' })
      } else {
        void navigate({ to: '/login' })
      }
    },
  })

  const ready =
    form.company_name.trim().length >= 2 &&
    slug.length >= 3 &&
    form.admin_name.trim() &&
    form.admin_email.includes('@') &&
    form.password.length >= 12

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
          eLogix HRMS
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
          Set up your company
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          A 14-day trial with org structure, employees, attendance and leave. Payroll
          and hiring come with a paid plan.
        </p>

        <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <Field label="Company name">
            <input
              className={inputClass}
              value={form.company_name}
              onChange={(e) => setForm({ ...form, company_name: e.target.value })}
              placeholder="Himalayan Bank Limited"
              autoFocus
            />
          </Field>

          <Field
            label="Company URL"
            hint="Everyone at your company types this to sign in. It cannot be changed later."
          >
            <div className="flex items-center gap-1">
              <input
                className={inputClass}
                value={slug}
                onChange={(e) => {
                  setSlugEdited(true)
                  setForm({ ...form, slug: toSlug(e.target.value) })
                }}
                placeholder="himalayan"
              />
            </div>
          </Field>

          <div className="h-px bg-slate-100" />

          <Field label="Your name">
            <input
              className={inputClass}
              value={form.admin_name}
              onChange={(e) => setForm({ ...form, admin_name: e.target.value })}
              placeholder="Sita Sharma"
            />
          </Field>

          <Field label="Your work email" hint="This becomes the first administrator.">
            <input
              type="email"
              className={inputClass}
              value={form.admin_email}
              onChange={(e) => setForm({ ...form, admin_email: e.target.value })}
              placeholder="hr@himalayan.com.np"
            />
          </Field>

          <Field
            label="Password"
            hint={tooShort ? undefined : 'At least 12 characters.'}
            error={tooShort ? `${12 - form.password.length} more character(s) needed.` : undefined}
          >
            <input
              type="password"
              className={inputClass}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </Field>

          <button
            onClick={() => register.mutate()}
            disabled={register.isPending || !ready}
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {register.isPending ? 'Setting up…' : 'Create company'}
          </button>

          {register.isError && (
            <p role="alert" className="text-sm text-red-700">
              {register.error.message}
            </p>
          )}
        </div>

        <p className="mt-4 text-center text-sm text-slate-500">
          Already have a company?{' '}
          <Link to="/login" className="font-medium text-blue-700 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

const inputClass =
  'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition-colors focus:border-blue-400'

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      {children}
      {error ? (
        <span className="text-[11px] text-red-700">{error}</span>
      ) : (
        hint && <span className="text-[11px] text-slate-400">{hint}</span>
      )}
    </label>
  )
}
