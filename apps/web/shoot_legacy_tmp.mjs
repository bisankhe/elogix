/** Photograph the legacy prototype so the rebuild can be matched against it. */
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
await page.waitForTimeout(2500)
await page.screenshot({ path: `${OUT}/00-landing.png` })
console.log('landing url:', page.url())
console.log('title:', await page.title())

// Whatever it lands on, capture the visible text so the next step can be chosen.
const text = await page.evaluate(() => document.body.innerText.slice(0, 1200))
console.log('--- visible text ---')
console.log(text)

await browser.close()
