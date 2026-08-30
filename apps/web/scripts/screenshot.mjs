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
]

await mkdir(OUT, { recursive: true })

const browser = await chromium.launch({
  headless: false,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

const problems = []
page.on('console', (m) => {
  if (m.type() === 'error') problems.push(`console: ${m.text()}`)
})
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`))
page.on('response', (r) => {
  if (r.status() >= 400) problems.push(`http ${r.status()} ${r.url()}`)
})

// Sign in once; the session carries through the rest.
await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
await page.screenshot({ path: `${OUT}/login.png` })

await page.getByLabel('Email').fill('admin@acme.com.np')
await page.getByLabel('Password').fill('devpassword123')
await page.getByRole('button', { name: /sign in/i }).click()
await page.waitForURL('**/dashboard', { timeout: 15000 })

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
