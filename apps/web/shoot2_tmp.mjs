/** Sign into the legacy prototype and photograph the shell it renders. */
import { mkdir } from 'node:fs/promises'

import { chromium } from '@playwright/test'

const OUT = '/tmp/legacy-shots'
await mkdir(OUT, { recursive: true })

const browser = await chromium.launch({
  headless: false,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
page.on('pageerror', (e) => console.log('pageerror:', e.message))

await page.goto('http://localhost:5174/', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)

const inputs = page.locator('input')
await inputs.nth(0).fill('admin@demo.com')
await inputs.nth(1).fill('Admin@2083')
await page.getByText(/sign in/i).last().click()
await page.waitForTimeout(3500)

console.log('after login url:', page.url())
await page.screenshot({ path: `${OUT}/01-dashboard.png` })
console.log('captured dashboard')

// The sidebar groups are collapsible; open a few so the structure is visible.
const groups = page.locator('nav button, aside button')
console.log('sidebar buttons:', await groups.count())

await page.screenshot({ path: `${OUT}/02-full.png`, fullPage: true })

const text = await page.evaluate(() => document.body.innerText.slice(0, 900))
console.log('--- visible text ---')
console.log(text)

await browser.close()
