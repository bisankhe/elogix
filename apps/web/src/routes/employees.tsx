import { useQuery } from '@tanstack/react-query'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'

import { authMeOptions, employeesListEmployeesOptions } from '@elogix/api-client/queries'

import { clearTokens, isAuthenticated } from '@/lib/auth'

export const Route = createFileRoute('/employees')({
  beforeLoad: () => {
    if (!isAuthenticated()) throw redirect({ to: '/login' })
  },
  component: EmployeesPage,
})

function EmployeesPage() {
  const navigate = useNavigate()
  const me = useQuery(authMeOptions())
  const employees = useQuery(employeesListEmployeesOptions())

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-8">
      <header className="flex items-baseline justify-between gap-4 border-b border-neutral-200 pb-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-neutral-500">
            eLogix HRMS
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Employees</h1>
        </div>
        <div className="text-right text-sm text-neutral-600">
          <div>{me.data?.full_name ?? '…'}</div>
          <button
            type="button"
            className="text-xs underline"
            onClick={() => {
              clearTokens()
              void navigate({ to: '/login' })
            }}
          >
            Sign out
          </button>
        </div>
      </header>

      {employees.isPending && <p className="text-sm text-neutral-500">Loading…</p>}
      {employees.isError && (
        <p role="alert" className="text-sm text-red-700">
          Could not load employees.
        </p>
      )}

      {employees.data && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left">
                <Th>Code</Th>
                <Th>Name</Th>
                <Th>Status</Th>
                <Th>Joined</Th>
              </tr>
            </thead>
            <tbody>
              {employees.data.items.map((employee) => (
                <tr key={employee.id} className="border-b border-neutral-100">
                  <td className="py-2 pr-4 font-mono text-xs">{employee.employee_code}</td>
                  <td className="py-2 pr-4">{employee.full_name}</td>
                  <td className="py-2 pr-4">{employee.status}</td>
                  <td className="py-2 font-mono text-xs">{employee.joined_on}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="pt-3 text-xs text-neutral-500">{employees.data.total} total</p>
        </div>
      )}
    </main>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="py-2 pr-4 text-xs font-medium uppercase tracking-wide text-neutral-500">
      {children}
    </th>
  )
}
