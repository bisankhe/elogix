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

const ADMIN_KEY = process.env.ELOGIX_ADMIN_KEY || 'elogix-admin-2026'
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
  account_manager: co.account_manager || (co.status === 'pending' ? 'New Signup' : 'eLogix Team'),
  support_tier   : co.support_tier || 'standard',
  pending_invoice: co.pending_invoice || 0,
  last_payment   : co.last_payment || null,
  created_at     : co.created_at || new Date().toISOString(),
  updated_at     : co.updated_at || new Date().toISOString(),
  approved_at    : co.approved_at || null,
  approved_by    : co.approved_by || null,
  registered_at  : co.registered_at || co.created_at || new Date().toISOString(),
})

// Mock companies (always shown when no others exist)
const MOCK_COMPANIES = {
  abasarnepal    : normalizeCompany({id:'c1',slug:'abasarnepal',    name:'Abasar Nepal',              plan:'starter', status:'active', business_type:'recruitment_agency', industry:'HR / Manpower',       admin_email:'admin@abasarnepal.com',   account_manager:'eLogix Team', approved_at:'2083-05-04T00:00:00Z'}),
  subisu         : normalizeCompany({id:'c2',slug:'subisu',         name:'Subisu Cablenet Pvt. Ltd.', plan:'growth',  status:'active', business_type:'it_software',         industry:'Telecom / ISP',       admin_email:'hr@subisu.net.np',        account_manager:'eLogix Team', max_employees:250, approved_at:'2083-05-05T00:00:00Z'}),
  mainawatisteels: normalizeCompany({id:'c3',slug:'mainawatisteels',name:'Mainawati Steels',           plan:'starter', status:'active', business_type:'manufacturing',        industry:'Manufacturing / Steel',admin_email:'admin@mainawati.com',    account_manager:'eLogix Team', approved_at:'2083-05-05T00:00:00Z'}),
  hrhub          : normalizeCompany({id:'c4',slug:'hrhub',          name:'HR Hub',                    plan:'trial',   status:'trial',  business_type:'custom',               industry:'HR Consulting',       admin_email:'admin@hrhub.com.np',     account_manager:'eLogix Team', max_employees:10,  approved_at:'2083-05-05T00:00:00Z'}),
}

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
    const all = { ...MOCK_COMPANIES }

    // Merge stored companies (override mocks if slug matches)
    for (const [slug, co] of Object.entries(stored)) {
      all[slug] = normalizeCompany(co)
    }

    const statusFilter = req.query.status || ''
    let result = Object.values(all)
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

    companies[slug].status      = plan === 'trial' ? 'trial' : 'active'
    companies[slug].plan        = plan
    companies[slug].business_type = business_type || companies[slug].business_type || 'custom'
    companies[slug].approved_at = now
    companies[slug].approved_by = approved_by
    companies[slug].updated_at  = now
    companies[slug].account_manager = 'eLogix Team'
    companies[slug].max_employees = {trial:10,starter:50,growth:250,business:500,enterprise:1000}[plan] || 10

    writeDB('companies', companies)
    console.log(`[eLogix] Approved: ${slug} → ${companies[slug].status}`)

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

// REJECT / SUSPEND
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

app.post('/api/elogix-admin/v1/companies/:slug/suspend', (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(401).json({ error: 'Admin key required' })
    const companies = readDB('companies')
    if (companies[req.params.slug]) {
      companies[req.params.slug].status = 'suspended'
      companies[req.params.slug].updated_at = new Date().toISOString()
      writeDB('companies', companies)
    }
    res.json({ success: true })
  } catch(err) { res.status(500).json({ error: err.message }) }
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
