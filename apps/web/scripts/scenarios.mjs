/**
 * Capture the states the happy path never reaches.
 *
 *   DISPLAY=:99 node scripts/scenarios.mjs
 *
 * `screenshot.mjs` proves each screen renders with good data. This proves the rest:
 * empty states, refusals, edge-case rows, a smaller plan, a collapsed sidebar and a
 * narrow viewport. Those are where the bugs actually live — a table with three tidy
 * rows will look fine long after its empty state renders a blank box.
 *
 * Edge-case data is created through the real API rather than seeded into the database,
 * so the scenarios also exercise the endpoints that produce them.
 */
import { mkdir } from 'node:fs/promises'

import { chromium } from '@playwright/test'

const BASE = process.env.BASE_URL ?? 'http://localhost:5173'
const API = `${BASE}/api/v1`
const OUT = process.env.OUT_DIR ?? '/tmp/elogix-scenarios'

const ACME = { company_slug: 'acme', email: 'admin@acme.com.np', password: 'devpassword123' }
const STARTUP = {
  company_slug: 'startup',
  email: 'admin@startup.com.np',
  password: 'devpassword123',
}

await mkdir(OUT, { recursive: true })

// ── API helpers, used to build the edge cases ─────────────────────────

async function login(creds) {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(creds),
  })
  if (!res.ok) throw new Error(`login failed for ${creds.company_slug}`)
  return (await res.json()).access_token
}

async function api(token, path, { method = 'GET', body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  return { status: res.status, data: text ? JSON.parse(text) : null }
}

/** Build the awkward records: an exited employee, and someone on probation.
 *
 * Idempotent. The first version returned nothing on a second run — the creates 409'd on
 * the existing codes — so two scenarios silently vanished from the gallery rather than
 * failing, which is the worst way for a check to break.
 */
async function buildEdgeCases(token) {
  const { data: units } = await api(token, '/org/units')
  const eng = units.find((u) => u.code === 'ENG') ?? units[0]
  const { data: existing } = await api(token, '/employees?limit=200')
  const byCode = new Map(existing.items.map((e) => [e.employee_code, e.id]))

  const made = {
    exited: byCode.get('EMP-EXIT') ?? null,
    probation: byCode.get('EMP-PROB') ?? null,
  }
  if (made.exited && made.probation) return made

  const exited = made.exited
    ? { status: 200, data: { id: made.exited } }
    : await api(token, '/employees', {
    method: 'POST',
    body: {
      employee_code: 'EMP-EXIT',
      first_name: 'Ramesh',
      last_name: 'Karki',
      joined_on: '2021-02-01',
      placement: { org_unit_id: eng.id },
    },
  })
  if (exited.status === 201) {
    made.exited = exited.data.id
    await api(token, `/employees/${exited.data.id}/assignments`, {
      method: 'POST',
      body: {
        placement: { org_unit_id: eng.id },
        reason: 'promotion',
        effective_from: '2023-07-01',
      },
    })
    await api(token, `/employees/${exited.data.id}/documents`, {
      method: 'POST',
      body: {
        document_type: 'experience_letter',
        title: 'Experience letter',
        issued_on: '2026-02-28',
      },
    })
    await api(token, `/employees/${exited.data.id}/exit`, {
      method: 'POST',
      body: { exited_on: '2026-02-28', reason: 'Resigned — relocating to Pokhara' },
    })
  }

  const probation = made.probation
    ? { status: 200, data: { id: made.probation } }
    : await api(token, '/employees', {
    method: 'POST',
    body: {
      employee_code: 'EMP-PROB',
      first_name: 'Nisha',
      last_name: 'Rai',
      joined_on: '2026-03-02',
      probation_ends_on: '2026-09-02',
      placement: { org_unit_id: eng.id },
    },
  })
  if (probation.status === 201) made.probation = probation.data.id

  return made
}

/** A leave request larger than the balance, so the refusal can be photographed. */
async function buildLeaveRefusal(token) {
  const { data: pending } = await api(token, '/leave/requests?status=pending')
  const already = pending.find((r) => r.reason.startsWith('Extended medical leave'))
  if (already) return already.id

  const { data: types } = await api(token, '/leave/types')
  const sick = types.find((t) => t.code === 'SL')
  const { data: employees } = await api(token, '/employees?limit=200')
  const target = employees.items.find((e) => e.employee_code === 'EMP-002') ?? employees.items[0]

  const created = await api(token, '/leave/requests', {
    method: 'POST',
    body: {
      employee_id: target.id,
      leave_type_id: sick.id,
      start_date: '2026-05-04',
      end_date: '2026-06-30',
      reason: 'Extended medical leave — more days than the balance allows',
      document_key: 'medical-certificate',
    },
  })
  return created.status === 201 ? created.data.id : null
}

// ── Capture ───────────────────────────────────────────────────────────

const browser = await chromium.launch({
  headless: false,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})

const problems = []

// Statuses this gallery provokes deliberately — each one is the subject of a shot, not
// a fault, and the browser logs every one of them as a console error.
//
//   401  the cold-start /auth/refresh probe: no cookie yet, so the login form shows.
//        Also scenario 01, which signs in with a wrong password on purpose.
//   403  scenario 06b opens self-service as a login with no employee record. Being
//        refused is the boundary working.
//   409  scenario 14 approves a leave request that exceeds its balance. The refusal is
//        the screenshot.
//
// Matched on the full phrase rather than the bare number so a message that merely
// contains "409" is not waved through. Any other status is a real failure.
const PROVOKED = [401, 403, 409].map((s) => `status of ${s}`)

function watch(page, label) {
  page.on('console', (m) => {
    if (m.type() !== 'error') return
    if (PROVOKED.some((phrase) => m.text().includes(phrase))) return
    problems.push(`[${label}] console: ${m.text()}`)
  })
  page.on('pageerror', (e) => problems.push(`[${label}] pageerror: ${e.message}`))
}

async function signIn(page, creds) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.getByLabel('Company').fill(creds.company_slug)
  await page.getByLabel('Email').fill(creds.email)
  await page.getByLabel('Password').fill(creds.password)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/dashboard', { timeout: 15000 })
}

async function shot(page, name, path, { full = true, settle = 500 } = {}) {
  if (path) await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(settle)
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full })
  console.log(`captured ${name}`)
}

const acmeToken = await login(ACME)
const edge = await buildEdgeCases(acmeToken)
const refusalId = await buildLeaveRefusal(acmeToken)
// The new hires need attendance rows before they appear in the register.
await api(acmeToken, '/attendance/process', {
  method: 'POST',
  body: { start_date: '2026-03-01', end_date: '2026-03-31' },
})

// ── 1. Signed out: a failed login ─────────────────────────────────────
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  watch(page, 'login-error')
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.getByLabel('Company').fill('acme')
  await page.getByLabel('Email').fill('admin@acme.com.np')
  await page.getByLabel('Password').fill('definitely-not-the-password')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.getByRole('alert').waitFor({ timeout: 5000 })
  await shot(page, '01-login-invalid-credentials', null, { full: false })
  // Signup: the only unauthenticated write, and the first screen a new customer sees.
  await shot(page, '01b-register-company', '/register', { full: false })
  await page.close()
}

// ── 2. A brand-new tenant: every empty state, and a smaller nav ───────
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  watch(page, 'startup')
  await signIn(page, STARTUP)
  await shot(page, '02-trial-dashboard-empty', '/dashboard')
  await shot(page, '03-trial-org-empty', '/org/units')
  await shot(page, '04-trial-employees-empty', '/employees')
  await shot(page, '05-trial-attendance-empty', '/attendance')
  await shot(page, '06-trial-leave-empty', '/leave')

  // The startup tenant's admin has no employee record, so self-service refuses them.
  // A 403 here is the boundary working; the shot is of the explanation, which is the
  // part that decides whether people think the app is broken or think it is correct.
  await shot(page, '06b-trial-self-service-unlinked', '/me')
  await page.close()
}

// ── 3. Acme: the awkward records ──────────────────────────────────────
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  watch(page, 'acme')
  await signIn(page, ACME)

  await shot(page, '07-employees-all', '/employees')
  await shot(page, '08-employees-filtered-probation', '/employees?status=probation')
  await shot(page, '09-employees-search-no-results', '/employees?q=zzzznobody')
  if (edge.exited) await shot(page, '10-employee-exited', `/employees/${edge.exited}`)

  await shot(
    page,
    '11-attendance-absent-days',
    '/attendance?start_date=2026-03-01&end_date=2026-03-31',
  )
  await shot(page, '12-leave-queue', '/leave')

  // Balances appear only once an employee is chosen.
  const { data: employees } = await api(acmeToken, '/employees?limit=200')
  const withBalance = employees.items.find((e) => e.employee_code === 'EMP-001')
  if (withBalance) {
    await shot(page, '13-leave-balances', `/leave?employee_id=${withBalance.id}`)
  }

  // A refusal: more days requested than the balance holds. The row is found by its
  // reason text rather than by position — an index would silently approve whichever
  // request happened to sort first, which is exactly what it did the first time.
  if (refusalId) {
    await page.goto(`${BASE}/leave?status=pending`, { waitUntil: 'networkidle' })
    const row = page.getByRole('row').filter({ hasText: 'Extended medical leave' })
    await row.getByRole('button', { name: 'Approve' }).click()
    await page.getByRole('alert').waitFor({ timeout: 5000 })
    await shot(page, '14-leave-approval-refused', null)
  }

  // Self-service, as the person themselves. Sita is linked to the acme admin login by
  // the seed, so these are her own rows and nobody else's — the boundary that
  // `tests/test_ess.py` proves, seen from the browser.
  await shot(page, '14b-my-profile', '/me?tab=profile')
  await shot(page, '14c-my-attendance', '/me?tab=attendance&year=2026&month=3')
  await shot(page, '14d-my-leave', '/me?tab=leave')
  await shot(page, '14e-my-pay', '/me?tab=pay')

  // Chrome collapsed, and a phone-width viewport.
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /collapse sidebar/i }).click()
  await shot(page, '15-sidebar-collapsed', null, { full: false })

  await page.setViewportSize({ width: 420, height: 900 })
  await shot(page, '16-narrow-dashboard', '/dashboard')
  await shot(page, '17-narrow-employees', '/employees')
  await page.close()
}

await browser.close()

if (problems.length) {
  console.log('\nPROBLEMS')
  for (const p of [...new Set(problems)]) console.log(`  ${p}`)
  process.exitCode = 1
} else {
  console.log('\nNo console or page errors across any scenario.')
}
