import { useMutation } from '@tanstack/react-query'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

import { authLogin } from '@elogix/api-client'

import { isAuthenticated, setAccessToken } from '@/lib/auth'

export const Route = createFileRoute('/login')({
  beforeLoad: () => {
    if (isAuthenticated()) throw redirect({ to: '/employees' })
  },
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const [companySlug, setCompanySlug] = useState('acme')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const login = useMutation({
    mutationFn: async () => {
      const { data, error } = await authLogin({
        body: { company_slug: companySlug, email, password },
      })
      if (error || !data) throw new Error('Invalid credentials')
      return data
    },
    onSuccess: ({ access_token }) => {
      // Only the access token comes back in the body; the refresh token is an httpOnly
      // cookie the browser stores and no script here can see.
      setAccessToken(access_token)
      void navigate({ to: '/employees' })
    },
  })

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-8">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-neutral-500">
          eLogix HRMS
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
      </div>

      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          login.mutate()
        }}
      >
        <Field label="Company" value={companySlug} onChange={setCompanySlug} autoFocus />
        <Field label="Email" type="email" value={email} onChange={setEmail} />
        <Field label="Password" type="password" value={password} onChange={setPassword} />

        {login.isError && (
          <p role="alert" className="text-sm text-red-700">
            Invalid credentials
          </p>
        )}

        <button
          type="submit"
          disabled={login.isPending}
          className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {login.isPending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  autoFocus,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  autoFocus?: boolean
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm text-neutral-600">{label}</span>
      <input
        type={type}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border border-neutral-300 px-3 py-2 text-sm"
        required
      />
    </label>
  )
}
