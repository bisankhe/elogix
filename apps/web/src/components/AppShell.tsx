/**
 * The application shell, replicating the prototype's layout: a 248px near-black
 * sidebar, a white topbar, the amber confidentiality strip, and a scrolling content
 * area. Same proportions and palette, but the navigation is driven by the server's
 * entitlements rather than a hard-coded 1,149-line menu.
 */
import { useQuery } from '@tanstack/react-query'
import { Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import {
  Building2,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  MapPin,
  Network,
  Users,
  Wallet,
} from 'lucide-react'
import { useState } from 'react'

import { authEntitlementsOptions, authMeOptions } from '@elogix/api-client/queries'

import { signOut } from '@/lib/auth'

/** Nav items carry the module that gates them; the server decides what is enabled. */
const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, module: null },
  { to: '/org/units', label: 'Org Structure', icon: Network, module: 'org' },
  { to: '/org/positions', label: 'Positions', icon: Building2, module: 'org' },
  { to: '/org/grades', label: 'Grades & Designations', icon: Wallet, module: 'org' },
  { to: '/org/locations', label: 'Locations & Categories', icon: MapPin, module: 'org' },
  { to: '/employees', label: 'Employees', icon: Users, module: 'employee' },
  { to: '/attendance', label: 'Attendance', icon: CalendarClock, module: 'attendance' },
] as const

export function AppShell() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(true)
  const me = useQuery(authMeOptions())
  const entitlements = useQuery(authEntitlementsOptions())
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  const modules = new Set(entitlements.data?.modules ?? [])
  const visible = NAV.filter((item) => item.module === null || modules.has(item.module))

  const initials = (me.data?.full_name ?? '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      {/* ── Sidebar ───────────────────────────────────────────── */}
      <aside
        className="flex flex-shrink-0 flex-col overflow-hidden bg-shell text-slate-300 transition-[width] duration-200"
        style={{ width: open ? 248 : 64 }}
      >
        <div className="flex items-center gap-2.5 px-4 py-4">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-blue-500 to-violet-500 text-sm font-black text-white">
            eL
          </div>
          {open && (
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-white">eLogix HRMS</div>
              <div className="truncate text-[10px] text-slate-500">
                {entitlements.data?.plan_tier ?? '…'} plan
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Collapse sidebar' : 'Expand sidebar'}
            className="ml-auto rounded-md p-1 text-slate-500 hover:text-slate-300"
          >
            {open ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 pb-4">
          {visible.map(({ to, label, icon: Icon }) => {
            const active = pathname.startsWith(to)
            return (
              <Link
                key={to}
                to={to}
                title={label}
                className="mb-0.5 flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-colors"
                style={{
                  background: active ? 'var(--color-shell-active)' : 'transparent',
                  color: active ? '#fff' : undefined,
                }}
              >
                <Icon size={16} className="flex-shrink-0" />
                {open && <span className="truncate">{label}</span>}
              </Link>
            )
          })}
        </nav>

        {open && (
          <div className="border-t border-white/5 px-4 py-3 text-[10px] text-slate-600">
            eLogix Technologies
          </div>
        )}
      </aside>

      {/* ── Right side ────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex flex-shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-5 py-2.5">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-800">
              {visible.find((n) => pathname.startsWith(n.to))?.label ?? 'eLogix'}
            </div>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="text-xs font-semibold text-slate-700">
                {me.data?.full_name ?? '…'}
              </div>
              <div className="text-[10px] text-slate-400">
                {me.data?.roles.map((r) => r.replace(/_/g, ' ')).join(', ')}
              </div>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-500 text-xs font-bold text-white">
              {initials}
            </div>
            <button
              type="button"
              title="Sign out"
              onClick={() => void signOut().then(() => navigate({ to: '/login' }))}
              className="rounded-md p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {/* The prototype's confidentiality strip — kept, because it is a real
            compliance affordance under the Nepal Privacy Act 2018. */}
        <div className="flex flex-shrink-0 items-center gap-2 border-b border-amber-300 bg-amber-50 px-5 py-1">
          <span className="text-[11px] font-semibold text-amber-800">
            🔒 Confidential — Encrypted · RBAC · Nepal Privacy Act 2018
          </span>
        </div>

        <main key={pathname} className="page-enter flex-1 overflow-y-auto px-6 py-5">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
