// FILE: server.js  (project root)
// eLogix HRMS — Node.js Express API Server for Yeti Cloud
// Yeti Cloud runs Node.js 26.5.1 LTS — this IS the backend
// Serves: React SPA (dist/) + REST API endpoints for tenant management
// eLogix Technologies · www.elogix.com.np

const express  = require('express')
const fs       = require('fs')
const path     = require('path')
const crypto   = require('crypto')

const app  = express()
const PORT = process.env.PORT || 8080

// ── Middleware ────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// CORS — allow elogix.com.np and yetiappcloud.com
app.use((req, res, next) => {
  const allowed = [
    'https://elogix.com.np',
    'https://www.elogix.com.np',
    'https://elogix.ktm.yetiappcloud.com',
    'http://localhost:5173',
    'http://localhost:3000',
  ]
  const origin = req.headers.origin
  if (allowed.includes(origin) || !origin) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*')
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-eLogix-Admin-Key,X-Tenant-Slug')
  if (req.method === 'OPTIONS') return res.status(204).end()
  next()
})

// ── Data storage (JSON files in /data/ folder) ────────────────────────
// Yeti Cloud Node.js has persistent filesystem access
// In production, use a real DB (PostgreSQL via Extra Services)
// For now: JSON files as simple persistent store
const DATA_DIR = path.join(__dirname, 'data')
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

function readDB(name) {
  try {
    const fp = path.join(DATA_DIR, `${name}.json`)
    if (!fs.existsSync(fp)) return name === 'companies' ? {} : []
    return JSON.parse(fs.readFileSync(fp, 'utf8'))
  } catch(_e) { return name === 'companies' ? {} : [] }
}

function writeDB(name, data) {
  try {
    fs.writeFileSync(
      path.join(DATA_DIR, `${name}.json`),
      JSON.stringify(data, null, 2)
    )
    return true
  } catch(_e) { return false }
}

const ADMIN_KEY = process.env.ELOGIX_ADMIN_KEY || 'elogix-admin-2026'

function isAdmin(req) {
  const key   = req.headers['x-elogix-admin-key'] || ''
  const token = (req.headers['authorization'] || '').replace('Bearer ', '')
  return key === ADMIN_KEY || token === ADMIN_KEY
}

// ── Health check ──────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status   : 'ok',
    service  : 'eLogix HRMS Node API',
    version  : '3.0.0',
    timestamp: new Date().toISOString(),
  })
})

// ══════════════════════════════════════════════════════════════════════
// COMPANY REGISTRATION
// POST /api/elogix-admin/v1/register-company
// Called by: RegisterPage.jsx when a new company signs up
// ══════════════════════════════════════════════════════════════════════
app.post('/api/elogix-admin/v1/register-company', (req, res) => {
  try {
    const {
      name, slug, plan = 'trial', business_type = 'custom',
      admin_email, admin_name = '', phone = '',
      country = 'Nepal', currency = 'NPR',
      industry, modules = [], password,
    } = req.body

    if (!name || !slug || !admin_email) {
      return res.status(400).json({ error: 'name, slug, admin_email required' })
    }

    const companies = readDB('companies')

    // Check slug availability
    if (companies[slug]) {
      return res.status(409).json({
        success: false,
        error  : `"${slug}.elogix.com.np" is already taken. Choose a different company name.`
      })
    }

    const now = new Date().toISOString()
    const company = {
      id           : `c_${slug}_${Date.now()}`,
      slug, name, plan,
      status       : 'pending',
      business_type, admin_email, admin_name, phone,
      country, currency,
      industry     : industry || business_type,
      modules,
      employee_count: 0,
      max_employees : {trial:10,starter:50,growth:250,business:500,enterprise:1000}[plan] || 10,
      account_manager: 'New Signup',
      support_tier : 'standard',
      pending_invoice: 0,
      last_payment : null,
      created_at   : now,
      updated_at   : now,
      approved_at  : null,
      approved_by  : null,
    }

    companies[slug] = company
    writeDB('companies', companies)

    console.log(`[eLogix] New registration: ${slug} (${name}) — pending approval`)

    res.json({
      success    : true,
      message    : 'Registration complete! Awaiting eLogix SuperAdmin approval within 24 hours.',
      portal_url : `https://${slug}.elogix.com.np`,
      company_name: name,
      plan, status: 'pending',
    })
  } catch(err) {
    console.error('[register-company]', err)
    res.status(500).json({ error: err.message })
  }
})

// ══════════════════════════════════════════════════════════════════════
// GET ALL COMPANIES (active/approved)
// GET /api/elogix-admin/v1/companies
// Called by: ELogixAdminPage.jsx → Companies tab
// ══════════════════════════════════════════════════════════════════════
app.get('/api/elogix-admin/v1/companies', (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(401).json({ error: 'Admin key required' })

    const companies = readDB('companies')
    const statusFilter = req.query.status || ''

    const MOCK = [
      { id:'c1', slug:'abasarnepal',    name:'Abasar Nepal',             plan:'starter', status:'active', business_type:'recruitment_agency', admin_email:'admin@abasarnepal.com',   country:'Nepal', currency:'NPR', employee_count:0, created_at:'2083-05-04', approved_at:'2083-05-04' },
      { id:'c2', slug:'subisu',         name:'Subisu Cablenet Pvt. Ltd.', plan:'growth',  status:'active', business_type:'it_software',         admin_email:'hr@subisu.net.np',        country:'Nepal', currency:'NPR', employee_count:0, created_at:'2083-05-05', approved_at:'2083-05-05' },
      { id:'c3', slug:'mainawatisteels',name:'Mainawati Steels',          plan:'starter', status:'active', business_type:'manufacturing',        admin_email:'admin@mainawati.com',     country:'Nepal', currency:'NPR', employee_count:0, created_at:'2083-05-05', approved_at:'2083-05-05' },
      { id:'c4', slug:'hrhub',          name:'HR Hub',                   plan:'trial',   status:'trial',  business_type:'custom',               admin_email:'admin@hrhub.com.np',     country:'Nepal', currency:'NPR', employee_count:0, created_at:'2083-05-05', approved_at:'2083-05-05' },
    ]

    // Merge stored companies with mock companies
    const stored = Object.values(companies)
    const allMap = {}
    for (const c of [...MOCK, ...stored]) allMap[c.slug] = c

    let all = Object.values(allMap)
      .filter(c => c.status !== 'pending' && c.status !== 'rejected')

    if (statusFilter) all = all.filter(c => c.status === statusFilter)

    res.json({ success: true, companies: all, total: all.length })
  } catch(err) {
    console.error('[get-companies]', err)
    res.status(500).json({ error: err.message })
  }
})

// ══════════════════════════════════════════════════════════════════════
// GET PENDING COMPANIES
// GET /api/elogix-admin/v1/pending-companies
// Called by: ELogixAdminPage.jsx → Pending Approval tab
// ══════════════════════════════════════════════════════════════════════
app.get('/api/elogix-admin/v1/pending-companies', (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(401).json({ error: 'Admin key required' })

    const companies = readDB('companies')
    const pending = Object.values(companies)
      .filter(c => c.status === 'pending')
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    res.json({ success: true, companies: pending, total: pending.length })
  } catch(err) {
    console.error('[pending-companies]', err)
    res.status(500).json({ error: err.message })
  }
})

// ══════════════════════════════════════════════════════════════════════
// APPROVE COMPANY
// POST /api/elogix-admin/v1/companies/:slug/approve
// Called by: ELogixAdminPage.jsx when admin clicks Approve
// ══════════════════════════════════════════════════════════════════════
app.post('/api/elogix-admin/v1/companies/:slug/approve', (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(401).json({ error: 'Admin key required' })

    const { slug }   = req.params
    const { plan = 'trial', business_type, approved_by = 'eLogix SuperAdmin' } = req.body

    const companies = readDB('companies')

    if (!companies[slug]) {
      // Company registered via localStorage only (different browser)
      // Create it now so it's in the server DB
      companies[slug] = {
        id: `c_${slug}_${Date.now()}`,
        slug, name: slug, plan,
        status: plan === 'trial' ? 'trial' : 'active',
        business_type: business_type || 'custom',
        created_at: new Date().toISOString(),
      }
    }

    const now = new Date().toISOString()
    companies[slug].status      = plan === 'trial' ? 'trial' : 'active'
    companies[slug].plan        = plan
    companies[slug].business_type = business_type || companies[slug].business_type
    companies[slug].approved_at = now
    companies[slug].approved_by = approved_by
    companies[slug].updated_at  = now

    writeDB('companies', companies)

    console.log(`[eLogix] Approved: ${slug} → ${companies[slug].status}`)

    res.json({
      success     : true,
      message     : `${companies[slug].name || slug} approved`,
      slug,
      status      : companies[slug].status,
      plan        : companies[slug].plan,
      admin_email : companies[slug].admin_email,
      approved_at : now,
    })
  } catch(err) {
    console.error('[approve]', err)
    res.status(500).json({ error: err.message })
  }
})

// ══════════════════════════════════════════════════════════════════════
// REJECT COMPANY
// POST /api/elogix-admin/v1/companies/:slug/reject
// ══════════════════════════════════════════════════════════════════════
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
  } catch(err) {
    res.status(500).json({ error: err.message })
  }
})

// ══════════════════════════════════════════════════════════════════════
// SUSPEND COMPANY
// POST /api/elogix-admin/v1/companies/:slug/suspend
// ══════════════════════════════════════════════════════════════════════
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
  } catch(err) {
    res.status(500).json({ error: err.message })
  }
})

// ══════════════════════════════════════════════════════════════════════
// SERVE REACT SPA
// All non-API routes return index.html (client-side routing)
// ══════════════════════════════════════════════════════════════════════
const DIST_DIR = path.join(__dirname, 'dist')

// Serve static assets (JS, CSS, images) with long cache
app.use('/assets', express.static(path.join(DIST_DIR, 'assets'), {
  maxAge: '1y',
  immutable: true,
}))

// Serve other static files
app.use(express.static(DIST_DIR, { maxAge: '0' }))

// SPA fallback — all unmatched routes return index.html
app.get('*', (req, res) => {
  const indexPath = path.join(DIST_DIR, 'index.html')
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath)
  } else {
    res.status(404).json({ error: 'Frontend not built. Run: npm run build' })
  }
})

// ── Start server ──────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ eLogix HRMS Node API running on port ${PORT}`)
  console.log(`   API: http://localhost:${PORT}/api/health`)
  console.log(`   SPA: http://localhost:${PORT}/`)
  console.log(`   Data dir: ${DATA_DIR}`)
})

module.exports = app
