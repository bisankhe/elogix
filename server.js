// FILE: server.js  (project root)
// eLogix HRMS — Node.js Express API Server
// Runs on Yeti Cloud Application Server (Node.js 26.5.1 LTS)
// Serves: React SPA from dist/ + REST API for tenant management
// Data stored in: /data/companies.json (persistent on Yeti Cloud filesystem)
// eLogix Technologies · www.elogix.com.np

const express = require('express')
const fs      = require('fs')
const path    = require('path')

const app  = express()
const PORT = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080

// ── Middleware ─────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// CORS
app.use((req, res, next) => {
  const allowed = [
    'https://elogix.com.np','https://www.elogix.com.np',
    'https://elogix.ktm.yetiappcloud.com','http://localhost:5173','http://localhost:3000',
  ]
  const origin = req.headers.origin
  if (!origin || allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*')
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers',
    'Content-Type,Authorization,X-eLogix-Admin-Key,X-Tenant-Slug')
  if (req.method === 'OPTIONS') return res.status(204).end()
  next()
})

// ── Data storage ───────────────────────────────────────────────────────
// Try multiple paths — Yeti Cloud may have different writable locations
const DATA_DIRS = [
  path.join(__dirname, 'data'),
  path.join(process.env.HOME || '/root', 'elogix_data'),
  '/tmp/elogix_data',
]
let DATA_DIR = null
for (const d of DATA_DIRS) {
  try {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true })
    // Test write access
    fs.writeFileSync(path.join(d, '.test'), 'ok')
    fs.unlinkSync(path.join(d, '.test'))
    DATA_DIR = d
    break
  } catch(_e) {}
}
if (!DATA_DIR) DATA_DIR = '/tmp'
console.log(`[eLogix] Data directory: ${DATA_DIR}`)

function readDB(name) {
  try {
    const fp = path.join(DATA_DIR, `${name}.json`)
    if (!fs.existsSync(fp)) return {}
    return JSON.parse(fs.readFileSync(fp, 'utf8'))
  } catch(_e) { return {} }
}
function writeDB(name, data) {
  try {
    fs.writeFileSync(path.join(DATA_DIR, `${name}.json`), JSON.stringify(data, null, 2))
    return true
  } catch(e) { console.error('[DB write error]', e.message); return false }
}

const ADMIN_KEY = process.env.ELOGIX_ADMIN_KEY
if (!ADMIN_KEY) {
  console.error('[eLogix] FATAL: ELOGIX_ADMIN_KEY environment variable is not set')
  process.exit(1)
}

const isAdmin = req => {
  const key   = req.headers['x-elogix-admin-key'] || ''
  const token = (req.headers['authorization'] || '').replace('Bearer ','')
  return key === ADMIN_KEY || token === ADMIN_KEY
}

// Normalize a company object — fills in missing fields with defaults
const normalizeCompany = (co, i = 0) => ({
  id             : co.id || `c_${co.slug || i}_${Date.now()}`,
  slug           : co.slug || '',
  name           : co.name || co.slug || `Company ${i+1}`,
  plan           : co.plan || 'trial',
  status         : co.status || 'pending',
  business_type  : co.business_type || 'custom',
  industry       : co.industry || co.business_type || '',
  admin_email    : co.admin_email || '',
  admin_name     : co.admin_name || '',
  phone          : co.phone || '',
  country        : co.country || 'Nepal',
  currency       : co.currency || 'NPR',
  employee_count : co.employee_count || 0,
  max_employees  : co.max_employees ||
    ({trial:10,starter:50,growth:250,business:500,enterprise:1000}[co.plan] || 10),
  account_manager: co.account_manager || (co.status === 'pending' ? 'New Signup' : ''),
  support_tier   : co.support_tier || 'standard',
  pending_invoice: co.pending_invoice || 0,
  last_payment   : co.last_payment || null,
  created_at     : co.created_at || new Date().toISOString(),
  updated_at     : co.updated_at || new Date().toISOString(),
  approved_at    : co.approved_at || null,
  approved_by    : co.approved_by || null,
  registered_at  : co.registered_at || co.created_at || new Date().toISOString(),
})

// ── Health check ────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status:'ok', service:'eLogix HRMS', version:'3.0.0',
    dataDir: DATA_DIR, timestamp: new Date().toISOString() })
})

// ══════════════════════════════════════════════════════════════════════
// POST /api/elogix-admin/v1/register-company
// Called by RegisterPage.jsx on every registration
// ══════════════════════════════════════════════════════════════════════
app.post('/api/elogix-admin/v1/register-company', (req, res) => {
  try {
    const { name, slug, plan='trial', business_type='custom', admin_email,
            admin_name='', phone='', country='Nepal', currency='NPR',
            industry, modules=[] } = req.body

    if (!name || !slug || !admin_email)
      return res.status(400).json({ error: 'name, slug, admin_email required' })

    const companies = readDB('companies')

    // 409 if slug taken (and not just a pending one)
    if (companies[slug] && companies[slug].status !== 'pending')
      return res.status(409).json({
        success: false,
        error: `"${slug}.elogix.com.np" is already taken. Choose a different name.`
      })

    const now = new Date().toISOString()
    companies[slug] = normalizeCompany({
      id: companies[slug]?.id || `c_${slug}_${Date.now()}`,
      slug, name, plan, business_type,
      industry: industry || business_type,
      admin_email, admin_name, phone, country, currency, modules,
      status: 'pending',
      created_at: companies[slug]?.created_at || now,
      updated_at: now,
      registered_at: now,
    })

    const saved = writeDB('companies', companies)
    console.log(`[eLogix] Registration: ${slug} (${name}) — saved=${saved}, dir=${DATA_DIR}`)

    res.json({
      success: true,
      message: 'Registration complete! Awaiting eLogix SuperAdmin approval within 24 hours.',
      portal_url: `https://${slug}.elogix.com.np`,
      company_name: name, plan, status: 'pending',
    })
  } catch(err) {
    console.error('[register]', err)
    res.status(500).json({ error: err.message })
  }
})

// ══════════════════════════════════════════════════════════════════════
// GET /api/elogix-admin/v1/companies
// Returns active/approved companies — visible in Companies tab
// ══════════════════════════════════════════════════════════════════════
app.get('/api/elogix-admin/v1/companies', (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(401).json({ error: 'Admin key required' })

    const stored = readDB('companies')

    const statusFilter = req.query.status || ''
    let result = Object.values(stored)
      .map(co => normalizeCompany(co))
      .filter(c => c.status !== 'pending' && c.status !== 'rejected')

    if (statusFilter) result = result.filter(c => c.status === statusFilter)

    res.json({ success: true, companies: result, total: result.length })
  } catch(err) {
    console.error('[companies]', err)
    res.status(500).json({ error: err.message })
  }
})

// ══════════════════════════════════════════════════════════════════════
// GET /api/elogix-admin/v1/pending-companies
// Returns pending registrations — visible in Pending Approval tab
// ══════════════════════════════════════════════════════════════════════
app.get('/api/elogix-admin/v1/pending-companies', (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(401).json({ error: 'Admin key required' })

    const stored = readDB('companies')
    const pending = Object.values(stored)
      .filter(c => c.status === 'pending')
      .map(c => normalizeCompany(c))
      .sort((a, b) => new Date(b.registered_at) - new Date(a.registered_at))

    console.log(`[eLogix] Pending companies: ${pending.length}`)
    res.json({ success: true, companies: pending, total: pending.length })
  } catch(err) {
    console.error('[pending]', err)
    res.status(500).json({ error: err.message })
  }
})

// ══════════════════════════════════════════════════════════════════════
// POST /api/elogix-admin/v1/companies/:slug/approve
// Approves a pending company — moves to Companies + Module Permissions
// ══════════════════════════════════════════════════════════════════════
app.post('/api/elogix-admin/v1/companies/:slug/approve', (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(401).json({ error: 'Admin key required' })

    const { slug } = req.params
    const { plan='trial', business_type, approved_by='eLogix SuperAdmin' } = req.body

    const companies = readDB('companies')
    const now = new Date().toISOString()

    if (!companies[slug]) {
      // Company was only in client localStorage — create server record now
      companies[slug] = normalizeCompany({
        slug, name: slug, plan,
        business_type: business_type || 'custom',
        status: plan === 'trial' ? 'trial' : 'active',
        created_at: now,
      })
    }

    companies[slug].status        = plan === 'trial' ? 'trial' : 'active'
    companies[slug].plan          = plan
    companies[slug].business_type = business_type || companies[slug].business_type || 'custom'
    companies[slug].approved_at   = now
    companies[slug].approved_by   = approved_by
    companies[slug].updated_at    = now
    companies[slug].max_employees = {trial:10,starter:50,growth:250,business:500,enterprise:1000}[plan] || 10

    writeDB('companies', companies)
    console.log(`[eLogix] Approved: ${slug} → ${companies[slug].status}`)

    // Notify Flask to create PostgreSQL user record (fire and forget)
    fetch('http://127.0.0.1:5000/api/internal/provision-tenant', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Internal-Key': ADMIN_KEY },
      body   : JSON.stringify({
        slug,
        admin_email  : companies[slug].admin_email,
        admin_name   : companies[slug].admin_name || '',
        plan         : companies[slug].plan,
        business_type: companies[slug].business_type,
      }),
    }).then(r => r.ok && console.log(`[eLogix] DB provisioned: ${slug}`))
      .catch(() => console.log(`[eLogix] Flask not running — DB user not created yet for ${slug}`))

    res.json({
      success: true,
      message: `${companies[slug].name || slug} approved successfully`,
      slug, status: companies[slug].status,
      plan: companies[slug].plan,
      admin_email: companies[slug].admin_email,
      approved_at: now,
    })
  } catch(err) {
    console.error('[approve]', err)
    res.status(500).json({ error: err.message })
  }
})

// ══════════════════════════════════════════════════════════════════════
// PUT /api/elogix-admin/v1/companies/:slug/status
// Suspend / reactivate / cancel a company
// ══════════════════════════════════════════════════════════════════════
app.put('/api/elogix-admin/v1/companies/:slug/status', (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(401).json({ error: 'Admin key required' })
    const { slug } = req.params
    const { status } = req.body
    const allowed = ['active','suspended','cancelled','trial']
    if (!allowed.includes(status))
      return res.status(400).json({ error: `status must be one of: ${allowed.join(', ')}` })

    const companies = readDB('companies')
    if (!companies[slug])
      return res.status(404).json({ error: `Company "${slug}" not found` })

    companies[slug].status     = status
    companies[slug].updated_at = new Date().toISOString()
    writeDB('companies', companies)
    console.log(`[eLogix] Status change: ${slug} → ${status}`)
    res.json({ success: true, slug, status })
  } catch(err) {
    console.error('[status]', err)
    res.status(500).json({ error: err.message })
  }
})

// REJECT
app.post('/api/elogix-admin/v1/companies/:slug/reject', (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(401).json({ error: 'Admin key required' })
    const companies = readDB('companies')
    if (companies[req.params.slug]) {
      companies[req.params.slug].status = 'rejected'
      companies[req.params.slug].updated_at = new Date().toISOString()
      writeDB('companies', companies)
    }
    res.json({ success: true })
  } catch(err) { res.status(500).json({ error: err.message }) }
})

// ══════════════════════════════════════════════════════════════════════
// POST /api/elogix-admin/v1/companies/:slug/reset-password
// Set / reset the admin password for a tenant
// ══════════════════════════════════════════════════════════════════════
app.post('/api/elogix-admin/v1/companies/:slug/reset-password', (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(401).json({ error: 'Admin key required' })
    const { slug } = req.params
    const { admin_email, admin_name, phone, new_password, reason } = req.body

    if (!admin_email || !new_password)
      return res.status(400).json({ error: 'admin_email and new_password required' })
    if (new_password.length < 8)
      return res.status(400).json({ error: 'Password must be at least 8 characters' })

    // Forward to Flask auth service
    fetch('http://127.0.0.1:5000/api/internal/reset-password', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Internal-Key': ADMIN_KEY },
      body   : JSON.stringify({ slug, admin_email, admin_name, phone, new_password, reason }),
    }).then(r => r.ok && console.log(`[eLogix] Password reset forwarded: ${slug}`))
      .catch(() => console.log(`[eLogix] Flask not running — password reset not persisted for ${slug}`))

    console.log(`[eLogix] Password reset: ${slug} / ${admin_email}`)
    res.json({ success: true, message: `Password reset for ${admin_email}` })
  } catch(err) {
    console.error('[reset-password]', err)
    res.status(500).json({ error: err.message })
  }
})

// ══════════════════════════════════════════════════════════════════════
// POST /api/elogix-admin/v1/companies
// Manually onboard a new client (admin creates directly)
// ══════════════════════════════════════════════════════════════════════
app.post('/api/elogix-admin/v1/companies', (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(401).json({ error: 'Admin key required' })

    const { company_name, slug, admin_email, admin_name='', plan='starter',
            industry='', country='Nepal', phone='', account_manager='', sales_rep='' } = req.body

    if (!company_name || !slug || !admin_email)
      return res.status(400).json({ error: 'company_name, slug, admin_email required' })

    const companies = readDB('companies')
    if (companies[slug])
      return res.status(409).json({ error: `Slug "${slug}" is already taken` })

    const now = new Date().toISOString()
    companies[slug] = normalizeCompany({
      slug, name: company_name, plan,
      admin_email, admin_name, phone, country, industry,
      account_manager, sales_rep,
      status: plan === 'trial' ? 'trial' : 'active',
      approved_at: now,
      approved_by: 'eLogix Admin (manual)',
      created_at: now,
    })
    writeDB('companies', companies)
    console.log(`[eLogix] Manual onboard: ${slug} (${company_name})`)

    res.json({
      success: true,
      message: `${company_name} provisioned successfully`,
      slug, status: companies[slug].status, plan,
    })
  } catch(err) {
    console.error('[manual-onboard]', err)
    res.status(500).json({ error: err.message })
  }
})

// ══════════════════════════════════════════════════════════════════════
// GET /api/elogix-admin/v1/team
// Returns eLogix internal staff list
// ══════════════════════════════════════════════════════════════════════
app.get('/api/elogix-admin/v1/team', (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(401).json({ error: 'Admin key required' })
    const team = readDB('team')
    res.json({ success: true, team: Object.values(team) })
  } catch(err) {
    console.error('[team]', err)
    res.status(500).json({ error: err.message })
  }
})

// ── Serve React SPA ────────────────────────────────────────────────────
const DIST = path.join(__dirname, 'dist')
if (fs.existsSync(DIST)) {
  app.use('/assets', express.static(path.join(DIST, 'assets'), { maxAge: '1y' }))
  app.use(express.static(DIST, { maxAge: 0 }))
  app.get('*', (req, res) => {
    const idx = path.join(DIST, 'index.html')
    if (fs.existsSync(idx)) res.sendFile(idx)
    else res.status(404).json({ error: 'Frontend not built. Run: npm run build' })
  })
} else {
  console.warn('[eLogix] dist/ not found — run npm run build first')
  app.get('*', (req, res) => res.status(503).json({ error: 'Frontend not built' }))
}

// ── Start ──────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ eLogix HRMS running on port ${PORT}`)
  console.log(`   API: http://localhost:${PORT}/api/health`)
  console.log(`   Data: ${DATA_DIR}`)
})

module.exports = app