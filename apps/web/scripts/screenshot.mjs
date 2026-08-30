/**
 * Drive the real app in a headed Chromium and capture each screen.
 *
 *   DISPLAY=:99 node scripts/screenshot.mjs
 *
 * Headed, not headless: it renders through the same compositor path a user's browser
 * does, so what lands in the PNG is what a person would actually see. Xvfb provides the
 * display in this container; point DISPLAY at a real one to watch it live.
 */
import { mkdir } from 'node:fs/promises'

import { chromium } from '@playwright/test'

const BASE = process.env.BASE_URL ?? 'http://localhost:5173'
const OUT = process.env.OUT_DIR ?? '/tmp/elogix-shots'

const PAGES = [
  ['login', '/login'],
  ['leave', '/leave'],
  ['attendance', '/attendance?start_date=2026-03-01&end_date=2026-03-31'],
  ['dashboard', '/dashboard'],
  ['org-units', '/org/units'],
  ['org-positions', '/org/positions'],
  ['org-grades', '/org/grades'],
  ['org-locations', '/org/locations'],
  ['employees', '/employees'],
  ['payroll', '/payroll'],
  ['me-profile', '/me?tab=profile'],
  ['me-attendance', '/me?tab=attendance&year=2026&month=3'],
  ['me-leave', '/me?tab=leave'],
  ['me-pay', '/me?tab=pay'],
  ['me-documents', '/me?tab=documents'],
]

await mkdir(OUT, { recursive: true })

const browser = await chromium.launch({
  headless: false,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

const problems = []

// A cold start asks /auth/refresh whether there is a session, and with no cookie yet
// the honest answer is 401. That is the documented design in `lib/auth.ts`, not a
// fault — so it is exempt, but only until sign-in succeeds. A 401 *after* that is a
// real failure and still fails the run. Scoped this way rather than by ignoring every
// 401, which would hide exactly the regressions this script exists to catch.
let signedIn = false
const expected = (status, url) =>
  !signedIn && status === 401 && url.includes('/api/v1/auth/refresh')

page.on('console', (m) => {
  if (m.type() !== 'error') return
  if (!signedIn && m.text().includes('status of 401')) return
  problems.push(`console: ${m.text()}`)
})
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`))
page.on('response', (r) => {
  if (r.status() >= 400 && !expected(r.status(), r.url())) {
    problems.push(`http ${r.status()} ${r.url()}`)
  }
})

// Sign in once; the session carries through the rest.
await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
await page.screenshot({ path: `${OUT}/login.png` })

await page.getByLabel('Email').fill('admin@acme.com.np')
await page.getByLabel('Password').fill('devpassword123')
await page.getByRole('button', { name: /sign in/i }).click()
await page.waitForURL('**/dashboard', { timeout: 15000 })
signedIn = true

for (const [name, path] of PAGES) {
  if (name === 'login') continue
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400) // let the fade-in settle
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true })
  console.log(`captured ${name}`)
}

// The employee detail page needs a real id, so follow the first row through.
await page.goto(`${BASE}/employees`, { waitUntil: 'networkidle' })
const firstEmployee = page.locator('table tbody tr a').first()
if (await firstEmployee.count()) {
  await firstEmployee.click()
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${OUT}/employee-detail.png`, fullPage: true })
  console.log('captured employee-detail')
}

await browser.close()

if (problems.length) {
  console.log('\nPROBLEMS')
  for (const p of [...new Set(problems)]) console.log(`  ${p}`)
  process.exitCode = 1
} else {
  console.log('\nNo console errors, page errors or 4xx/5xx responses.')
}
