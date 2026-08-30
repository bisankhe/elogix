/**
 * The application shell, matched against the prototype running side by side.
 *
 * The prototype's shell has a specific signature and this reproduces it: a 248px
 * near-black sidebar with an emoji-headed, collapsible module tree; child rows marked by
 * a small dot that turns blue when active; coloured badges; a role pill under the brand;
 * an encryption chip pinned to the foot. Above the content, a white topbar with a search
 * box carrying a Ctrl-K chip, a row of quick actions, a language/currency pill and a
 * notification bell; then a breadcrumb strip showing Nepal Standard Time; then the amber
 * confidentiality bar.
 *
 * Two things are deliberately *not* copied. The prototype's menu is 1,149 hard-coded
 * lines listing every screen whether it exists or not; this one lists what is built and
 * filters it by the server's entitlements. And its persona switcher let anyone become a
 * super admin from a dropdown — the role here is display only.
 */
import { useQuery } from '@tanstack/react-query'
import { Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import { Bell, ChevronDown, ChevronRight, LogOut, Menu, Search } from 'lucide-react'
import { useEffect, useState } from 'react'

import type { ModuleCode } from '@elogix/api-client'
import { authEntitlementsOptions, authMeOptions } from '@elogix/api-client/queries'

import { signOut } from '@/lib/auth'

/** Below this the 248px sidebar takes more room than it earns. */
const WIDE_ENOUGH = '(min-width: 1024px)'

interface NavChild {
  to: string
  label: string
  // Typed against the generated union, so a nav item can only be gated on a module the
  // API actually knows about — a typo becomes a build error rather than a hidden link.
  module: ModuleCode | null
  badge?: { text: string; tone: string }
}

interface NavGroup {
  id: string
  icon: string
  label: string
  children: NavChild[]
}

/**
 * The prototype's own module grouping, kept so the two read as the same product —
 * Organization Management, Employee Lifecycle, Workforce Operations, with its emoji.
 * Only screens that exist appear, and each is gated by the module the server enforces.
 */
const NAV: NavGroup[] = [
  {
    id: 'dashboard',
    icon: '🏠',
    label: 'Dashboard',
    children: [{ to: '/dashboard', label: 'Company Dashboard', module: null }],
  },
  {
    id: 'org-mgmt',
    icon: '🏛️',
    label: 'Organization Management',
    children: [
      { to: '/org/units', label: 'Org Structure', module: 'org' },
      { to: '/org/positions', label: 'Positions', module: 'org' },
      { to: '/org/grades', label: 'Grades & Designations', module: 'org' },
      { to: '/org/locations', label: 'Locations & Categories', module: 'org' },
    ],
  },
  {
    id: 'emp-lifecycle',
    icon: '🔄',
    label: 'Employee Lifecycle',
    children: [
      { to: '/employees', label: 'Employee Database', module: 'employee' },
      { to: '/hiring', label: 'Hiring', module: 'ats' },
    ],
  },
  {
    id: 'workforce-ops',
    icon: '⚙️',
    label: 'Workforce Operations',
    children: [
      {
        to: '/attendance',
        label: 'Attendance Register',
        module: 'attendance',
        badge: { text: 'Live', tone: 'bg-emerald-500/15 text-emerald-400' },
      },
      { to: '/leave', label: 'Leave Management', module: 'leave' },
    ],
  },
  {
    id: 'finance',
    icon: '💰',
    label: 'Payroll & Finance',
    children: [
      { to: '/payroll', label: 'Payroll Runs', module: 'payroll' },
      { to: '/reports', label: 'Reports', module: 'reports' },
      { to: '/settlements', label: 'Final Settlement', module: 'payroll' },
    ],
  },
  {
    id: 'self-service',
    icon: '🙋',
    label: 'Self Service',
    children: [{ to: '/me', label: 'My Workspace', module: 'ess' }],
  },
]

const QUICK_ACTIONS = ['👥', '⏰', '📅', '💰', '📊', '🤖', '📋', '🎯']

export function AppShell() {
  const navigate = useNavigate()
  // Start collapsed on a narrow screen. At 420px an expanded sidebar left about 170px
  // for the actual page, which is not a layout, it is a wall.
  const [open, setOpen] = useState(
    () => typeof window === 'undefined' || window.matchMedia(WIDE_ENOUGH).matches,
  )
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const me = useQuery(authMeOptions())
  const entitlements = useQuery(authEntitlementsOptions())
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  useEffect(() => {
    const query = window.matchMedia(WIDE_ENOUGH)
    const onChange = (e: MediaQueryListEvent) => setOpen(e.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  const modules = new Set(entitlements.data?.modules ?? [])
  const groups = NAV.map((g) => ({
    ...g,
    children: g.children.filter((c) => c.module === null || modules.has(c.module)),
  })).filter((g) => g.children.length > 0)

  const current = groups.flatMap((g) => g.children).find((c) => pathname.startsWith(c.to))
  const role = me.data?.roles[0]?.replace(/_/g, ' ') ?? ''
  const initials = (me.data?.full_name ?? '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const toggleGroup = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      {/* ── Sidebar ───────────────────────────────────────────── */}
      <aside
        className="flex flex-shrink-0 flex-col overflow-hidden bg-shell transition-[width] duration-200"
        style={{ width: open ? 248 : 64 }}
      >
        <div className="flex items-center gap-2.5 px-3 py-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-blue-500 to-violet-500 text-base">
            🏢
          </div>
          {open && (
            <>
              <div className="min-w-0">
                <div className="truncate text-[13px] font-bold text-white">eLogix HRMS</div>
                <div className="truncate text-[9px] tracking-wide text-slate-500">
                  HRIS · HRMS · HRIM
                </div>
              </div>
              <Search size={14} className="ml-auto flex-shrink-0 text-slate-500" />
            </>
          )}
        </div>

        {open && (
          <div className="mx-3 mb-2 flex items-center gap-2 rounded-lg bg-blue-500/10 px-2.5 py-2">
            <span className="h-2 w-2 flex-shrink-0 rounded-full bg-blue-400" />
            <span className="truncate text-xs font-bold capitalize text-blue-200">
              {role || '—'}
            </span>
            <span className="ml-auto text-[10px] capitalize text-slate-500">
              {entitlements.data?.plan_tier ?? ''}
            </span>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto px-2 pb-3">
          {groups.map((group) => {
            const isCollapsed = collapsed.has(group.id)
            return (
              <div key={group.id} className="mb-1">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  title={group.label}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/5"
                >
                  <span className="flex-shrink-0 text-base">{group.icon}</span>
                  {open && (
                    <>
                      <span className="truncate text-[13px] font-semibold text-slate-200">
                        {group.label}
                      </span>
                      <span className="ml-auto flex-shrink-0 text-slate-600">
                        {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                      </span>
                    </>
                  )}
                </button>

                {open && !isCollapsed && (
                  <div className="mt-0.5">
                    {group.children.map((child) => {
                      const active = pathname.startsWith(child.to)
                      return (
                        <Link
                          key={child.to}
                          to={child.to}
                          className="flex items-center gap-2.5 rounded-lg py-[7px] pl-4 pr-2 text-[12.5px] transition-colors"
                          style={{
                            background: active ? 'var(--color-shell-active)' : 'transparent',
                            color: active ? '#ffffff' : '#94a3b8',
                          }}
                        >
                          {/* The prototype's marker dot: slate normally, blue when active. */}
                          <span
                            className="h-[5px] w-[5px] flex-shrink-0 rounded-full transition-colors"
                            style={{ background: active ? '#60a5fa' : '#334155' }}
                          />
                          <span className="truncate">{child.label}</span>
                          {child.badge && (
                            <span
                              className={`ml-auto flex-shrink-0 rounded px-1.5 py-px text-[9px] font-bold ${child.badge.tone}`}
                            >
                              {child.badge.text}
                            </span>
                          )}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {open && (
          <div className="border-t border-white/5 px-3 py-2.5">
            <div className="text-[9px] leading-relaxed text-slate-600">
              eLogix HRMS v3.0 · Multi-Tenant SaaS
              <br />
              Nepal Labour Act 2074 · RBAC · Privacy Act 2018
            </div>
            <span className="mt-1.5 inline-block rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-400">
              🔒 All data encrypted · AES-256
            </span>
          </div>
        )}
      </aside>

      {/* ── Right side ────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex flex-shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-3 py-2">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Collapse sidebar' : 'Expand sidebar'}
            className="flex-shrink-0 rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"
          >
            <Menu size={16} />
          </button>

          <div className="hidden min-w-0 leading-tight sm:block">
            <div className="truncate text-[13px] font-bold text-slate-800">
              {me.data?.full_name ?? '…'}
            </div>
            <div className="truncate text-[10px] capitalize text-slate-400">{role}</div>
          </div>

          <label className="ml-2 hidden flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 md:flex lg:max-w-sm">
            <Search size={13} className="flex-shrink-0 text-slate-400" />
            <input
              placeholder="Search…"
              className="w-full bg-transparent text-xs outline-none placeholder:text-slate-400"
            />
            <kbd className="flex-shrink-0 rounded border border-slate-200 bg-white px-1.5 py-px text-[10px] text-slate-400">
              Ctrl K
            </kbd>
          </label>

          <div className="ml-auto hidden items-center gap-0.5 xl:flex">
            {QUICK_ACTIONS.map((icon) => (
              <span
                key={icon}
                className="cursor-default rounded-lg px-1.5 py-1 text-sm hover:bg-slate-100"
              >
                {icon}
              </span>
            ))}
          </div>

          <div className="ml-auto flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 xl:ml-0">
            🇳🇵 <span>EN</span>
            <span className="text-slate-300">|</span>
            <span>NPR</span>
          </div>

          <span className="relative flex-shrink-0 cursor-default rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <Bell size={16} />
            <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-red-500" />
          </span>

          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-500 text-[11px] font-bold text-white">
            {initials}
          </div>

          <button
            type="button"
            title="Sign out"
            onClick={() => void signOut().then(() => navigate({ to: '/login' }))}
            className="flex-shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
          >
            <LogOut size={16} />
          </button>
        </header>

        {/* Breadcrumb strip, with the timezone the prototype pins to the right. */}
        <div className="flex flex-shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-4 py-1.5">
          <span className="text-xs">🏠</span>
          <span className="text-slate-300">/</span>
          <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600">
            {current?.label ?? 'Dashboard'}
          </span>
          <span className="ml-auto hidden text-[10px] text-slate-400 sm:block">
            🇳🇵 Nepal Standard Time (UTC+5:45)
          </span>
        </div>

        {/* The prototype's confidentiality strip — a real compliance affordance under
            the Nepal Privacy Act 2018, so it is kept rather than tidied away. */}
        <div className="flex flex-shrink-0 items-center gap-2 border-b border-amber-300 bg-amber-50 px-4 py-1">
          <span className="text-[11px] font-semibold text-amber-800">
            🔒 Confidential — Encrypted · RBAC · Nepal Privacy Act 2018
          </span>
          <span className="ml-auto hidden text-[11px] capitalize text-amber-700 sm:block">
            🛡️ {role}
          </span>
        </div>

        <main key={pathname} className="page-enter flex-1 overflow-y-auto px-5 py-4">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
