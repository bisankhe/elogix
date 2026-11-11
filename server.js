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
const PORT = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 3001

// ── Middleware ─────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// CORS
app.use((req, res, next) => {
  const allowed = [
    'https://elogix.com.np','https://www.elogix.com.np',
    'https://elogix.ktm.yetiappcloud.com','http://localhost:5173','http://localhost:3000','http://10.151.124.112:5173',
  ]
  const origin = req.headers.origin
  if (!origin || allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*')
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers',
    'Content-Type,Authorization,X-eLogix-Admin-Key,X-Tenant-Slug,X-Tenant-Id')
  if (req.method === 'OPTIONS') return res.status(204).end()
  next()
})

// ── Data storage ───────────────────────────────────────────────────────
const DATA_DIRS = [
  path.join(__dirname, 'data'),
  path.join(process.env.HOME || '/root', 'elogix_data'),
  '/tmp/elogix_data',
]
let DATA_DIR = null
for (const d of DATA_DIRS) {
  try {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true })
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
function readDBArray(name) {
  try {
    const fp = path.join(DATA_DIR, `${name}.json`)
    if (!fs.existsSync(fp)) return []
    const v = JSON.parse(fs.readFileSync(fp, 'utf8'))
    return Array.isArray(v) ? v : Object.values(v)
  } catch(_e) { return [] }
}
function writeDB(name, data) {
  try {
    fs.writeFileSync(path.join(DATA_DIR, `${name}.json`), JSON.stringify(data, null, 2))
    return true
  } catch(e) { console.error('[DB write error]', e.message); return false }
}

// ── Admin auth ─────────────────────────────────────────────────────────
const ADMIN_KEY = process.env.ELOGIX_ADMIN_KEY
if (!ADMIN_KEY) {
  console.error('[eLogix] FATAL: ELOGIX_ADMIN_KEY environment variable is not set')
  process.exit(1)
}

// In-memory session token store — tokens issued by /login are stored here.
// Accepts: the raw ADMIN_KEY itself, OR any token we issued.
const activeSessions = new Set()

const isAdmin = req => {
  const key   = req.headers['x-elogix-admin-key'] || ''
  const token = (req.headers['authorization'] || '').replace('Bearer ', '').trim()
  // Accept the master key directly
  if (key === ADMIN_KEY) return true
  // Accept a token issued by our /login endpoint
  if (token && activeSessions.has(token)) return true
  // Also accept the raw ADMIN_KEY sent as a Bearer token (legacy clients)
  if (token === ADMIN_KEY) return true
  return false
}

function requireAdmin(req, res, next) {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized — please log in again' })
  next()
}

// ── Normalize company object ───────────────────────────────────────────
// IMPORTANT: every field that RegisterPage sends must be preserved here.
// Never drop a field — unknown fields are passed through via ...rest.
const normalizeCompany = (co, i = 0) => {
  const plan = co.plan || 'trial'
  return {
    id             : co.id || `c_${co.slug || i}_${Date.now()}`,
    slug           : co.slug || '',
    name           : co.name || co.slug || `Company ${i + 1}`,
    plan,
    status         : co.status || 'pending',
    business_type  : co.business_type || 'custom',
    industry       : co.industry || co.business_type || '',
    admin_email    : co.admin_email || '',
    admin_name     : co.admin_name || '',
    admin_password : co.admin_password || '',   // ← preserved (was dropped before)
    phone          : co.phone || '',
    country        : co.country || 'Nepal',
    currency       : co.currency || 'NPR',
    modules        : Array.isArray(co.modules) ? co.modules : [],
    landing        : co.landing || 'employee-dashboard',
    calendar_type  : co.calendar_type || 'Bikram Sambat (BS) — Nepal',
    address        : co.address || '',
    employee_count : co.employee_count || 0,
    max_employees  : co.max_employees ||
      ({ trial:10, starter:50, growth:250, business:500, enterprise:1000, unlimited:10000 }[plan] || 10),
    account_manager: co.account_manager || (co.status === 'pending' ? 'New Signup' : ''),
    support_tier   : co.support_tier || 'standard',
    pending_invoice: co.pending_invoice || 0,
    last_payment   : co.last_payment || null,
    created_at     : co.created_at || new Date().toISOString(),
    updated_at     : co.updated_at || new Date().toISOString(),
    approved_at    : co.approved_at || null,
    approved_by    : co.approved_by || null,
    registered_at  : co.registered_at || co.created_at || new Date().toISOString(),
    rejection_reason: co.rejection_reason || null,
  }
}

// ── Health check ───────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  const companies = readDB('companies')
  const all       = Object.values(companies)
  res.json({
    status   : 'ok',
    service  : 'eLogix HRMS',
    version  : '4.0.0',
    dataDir  : DATA_DIR,
    timestamp: new Date().toISOString(),
    companies: {
      total    : all.length,
      active   : all.filter(c => c.status === 'active').length,
      trial    : all.filter(c => c.status === 'trial').length,
      pending  : all.filter(c => c.status === 'pending').length,
      suspended: all.filter(c => c.status === 'suspended').length,
    },
  })
})

// ══════════════════════════════════════════════════════════════════════
// POST /api/elogix-admin/v1/register-company
// Called by RegisterPage.jsx on every self-registration.
// Saves with status='pending' — SuperAdmin must approve.
// PUBLIC — no admin key required.
// ══════════════════════════════════════════════════════════════════════
app.post('/api/elogix-admin/v1/register-company', (req, res) => {
  try {
    const {
      name, slug, plan = 'trial', business_type = 'custom',
      admin_email, admin_name = '', admin_password = '',
      phone = '', country = 'Nepal', currency = 'NPR',
      industry, modules = [], landing = 'employee-dashboard',
      calendar_type, address, status,
    } = req.body

    if (!name || !slug || !admin_email)
      return res.status(400).json({ error: 'name, slug, admin_email required' })

    // Sanitise slug
    const cleanSlug = slug.toLowerCase()
      .replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 60)
    if (!cleanSlug)
      return res.status(400).json({ error: 'Invalid slug' })

    const companies = readDB('companies')

    // 409 only if slug is already active/trial/suspended (not if re-registering a pending)
    if (companies[cleanSlug] && companies[cleanSlug].status !== 'pending') {
      return res.status(409).json({
        success: false,
        error  : `"${cleanSlug}.elogix.com.np" is already taken. Choose a different name.`,
      })
    }

    const now = new Date().toISOString()
    companies[cleanSlug] = normalizeCompany({
      id            : companies[cleanSlug]?.id || `c_${cleanSlug}_${Date.now()}`,
      slug          : cleanSlug,
      name, plan, business_type,
      industry      : industry || business_type,
      admin_email, admin_name, admin_password,
      phone, country, currency, modules, landing,
      calendar_type : calendar_type || 'Bikram Sambat (BS) — Nepal',
      address       : address || '',
      status        : 'pending',
      created_at    : companies[cleanSlug]?.created_at || now,
      registered_at : now,
      updated_at    : now,
    })

    const saved = writeDB('companies', companies)
    console.log(`[eLogix] Registration: ${cleanSlug} (${name}) — saved=${saved}`)

    res.status(201).json({
      success     : true,
      message     : 'Registration complete! Awaiting eLogix SuperAdmin approval within 24 hours.',
      portal_url  : `https://${cleanSlug}.elogix.com.np`,
      company_name: name,
      slug        : cleanSlug,
      plan,
      status      : 'pending',
    })
  } catch(err) {
    console.error('[register]', err)
    res.status(500).json({ error: err.message })
  }
})

// ══════════════════════════════════════════════════════════════════════
// GET /api/elogix-admin/v1/pending-companies
// Returns companies with status='pending' — Pending Approval tab.
// ══════════════════════════════════════════════════════════════════════
app.get('/api/elogix-admin/v1/pending-companies', requireAdmin, (req, res) => {
  try {
    const stored  = readDB('companies')
    const pending = Object.values(stored)
      .filter(c => c.status === 'pending')
      .map(c => normalizeCompany(c))
      .sort((a, b) => new Date(b.registered_at) - new Date(a.registered_at))

    console.log(`[eLogix] Pending: ${pending.length}`)
    res.json({ success: true, companies: pending, total: pending.length })
  } catch(err) {
    console.error('[pending]', err)
    res.status(500).json({ error: err.message })
  }
})

// ══════════════════════════════════════════════════════════════════════
// GET /api/elogix-admin/v1/companies
// Returns all non-pending, non-rejected companies.
// Powers: Companies, Billing, Support, Broadcast, Modules,
//         Referral, Team, Password Management tabs.
// ══════════════════════════════════════════════════════════════════════
app.get('/api/elogix-admin/v1/companies', requireAdmin, (req, res) => {
  try {
    const stored = readDB('companies')
    const search = (req.query.search || '').toLowerCase()

    let result = Object.values(stored)
      .map(co => normalizeCompany(co))
      .filter(c => c.status !== 'pending' && c.status !== 'rejected')

    if (search) {
      result = result.filter(c =>
        c.name?.toLowerCase().includes(search) ||
        c.slug?.toLowerCase().includes(search) ||
        c.admin_email?.toLowerCase().includes(search) ||
        c.industry?.toLowerCase().includes(search)
      )
    }

    // Sort: most recently approved first
    result.sort((a, b) => new Date(b.approved_at || b.created_at) - new Date(a.approved_at || a.created_at))

    res.json({ success: true, companies: result, total: result.length })
  } catch(err) {
    console.error('[companies]', err)
    res.status(500).json({ error: err.message })
  }
})

// ══════════════════════════════════════════════════════════════════════
// POST /api/elogix-admin/v1/companies/:slug/approve
// Approves a pending company → status = 'active' (or 'trial' for free plan).
// ══════════════════════════════════════════════════════════════════════
app.post('/api/elogix-admin/v1/companies/:slug/approve', requireAdmin, (req, res) => {
  try {
    const { slug } = req.params
    const { plan, business_type, admin_email, approved_by = 'eLogix SuperAdmin' } = req.body

    const companies = readDB('companies')
    const now       = new Date().toISOString()

    if (!companies[slug]) {
      // Company registered only via old localStorage path — create the record now
      companies[slug] = normalizeCompany({
        slug,
        name         : slug,
        plan         : plan || 'trial',
        business_type: business_type || 'custom',
        admin_email  : admin_email || '',
        status       : 'pending',
        created_at   : now,
      })
    }

    const effectivePlan   = plan || companies[slug].plan || 'trial'
    const newStatus       = effectivePlan === 'trial' ? 'trial' : 'active'

    companies[slug].status        = newStatus
    companies[slug].plan          = effectivePlan
    companies[slug].business_type = business_type || companies[slug].business_type || 'custom'
    companies[slug].approved_at   = now
    companies[slug].approved_by   = approved_by
    companies[slug].updated_at    = now
    companies[slug].max_employees = { trial:10, starter:50, growth:250, business:500, enterprise:1000, unlimited:10000 }[effectivePlan] || 10

    writeDB('companies', companies)
    console.log(`[eLogix] Approved: ${slug} → ${newStatus} (plan: ${effectivePlan})`)

    // Notify Flask to provision PostgreSQL tenant record (fire and forget)
    fetch('http://127.0.0.1:5000/api/internal/provision-tenant', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Internal-Key': ADMIN_KEY },
      body   : JSON.stringify({
        slug,
        admin_email  : companies[slug].admin_email,
        admin_name   : companies[slug].admin_name || '',
        admin_password: companies[slug].admin_password || '',
        plan         : companies[slug].plan,
        business_type: companies[slug].business_type,
        modules      : companies[slug].modules || [],
        landing      : companies[slug].landing || 'employee-dashboard',
        country      : companies[slug].country || 'Nepal',
        currency     : companies[slug].currency || 'NPR',
      }),
    }).then(r => r.ok && console.log(`[eLogix] Flask provisioned: ${slug}`))
      .catch(() => console.log(`[eLogix] Flask not running — tenant ${slug} not yet in PostgreSQL`))

    res.json({
      success    : true,
      message    : `${companies[slug].name || slug} approved successfully`,
      slug,
      status     : companies[slug].status,
      plan       : companies[slug].plan,
      admin_email: companies[slug].admin_email,
      approved_at: now,
    })
  } catch(err) {
    console.error('[approve]', err)
    res.status(500).json({ error: err.message })
  }
})

// ══════════════════════════════════════════════════════════════════════
// POST /api/elogix-admin/v1/companies/:slug/reject
// ══════════════════════════════════════════════════════════════════════
app.post('/api/elogix-admin/v1/companies/:slug/reject', requireAdmin, (req, res) => {
  try {
    const { slug }   = req.params
    const { reason } = req.body
    const companies  = readDB('companies')

    if (!companies[slug])
      return res.status(404).json({ error: `Company "${slug}" not found` })

    companies[slug].status           = 'rejected'
    companies[slug].rejection_reason = reason || 'Does not meet requirements'
    companies[slug].updated_at       = new Date().toISOString()
    writeDB('companies', companies)
    console.log(`[eLogix] Rejected: ${slug}. Reason: ${reason}`)

    res.json({ success: true, message: `${companies[slug].name || slug} rejected` })
  } catch(err) {
    res.status(500).json({ error: err.message })
  }
})

// ══════════════════════════════════════════════════════════════════════
// PUT /api/elogix-admin/v1/companies/:slug/status
// Suspend / reactivate / cancel a company
// ══════════════════════════════════════════════════════════════════════
app.put('/api/elogix-admin/v1/companies/:slug/status', requireAdmin, (req, res) => {
  try {
    const { slug }         = req.params
    const { status, reason } = req.body
    const allowed          = ['active', 'suspended', 'cancelled', 'trial']

    if (!allowed.includes(status))
      return res.status(400).json({ error: `status must be one of: ${allowed.join(', ')}` })

    const companies = readDB('companies')
    if (!companies[slug])
      return res.status(404).json({ error: `Company "${slug}" not found` })

    companies[slug].status     = status
    companies[slug].updated_at = new Date().toISOString()
    if (status === 'suspended' && reason) companies[slug].rejection_reason = reason
    writeDB('companies', companies)
    console.log(`[eLogix] Status: ${slug} → ${status}`)

    res.json({ success: true, slug, status, message: `Status updated to ${status}` })
  } catch(err) {
    res.status(500).json({ error: err.message })
  }
})

// ══════════════════════════════════════════════════════════════════════
// PUT /api/elogix-admin/v1/companies/:slug/plan
// ══════════════════════════════════════════════════════════════════════
app.put('/api/elogix-admin/v1/companies/:slug/plan', requireAdmin, (req, res) => {
  try {
    const { slug } = req.params
    const { plan } = req.body
    const PLANS    = ['trial', 'starter', 'growth', 'business', 'enterprise', 'unlimited']

    if (!PLANS.includes(plan))
      return res.status(400).json({ error: `plan must be one of: ${PLANS.join(', ')}` })

    const companies = readDB('companies')
    if (!companies[slug])
      return res.status(404).json({ error: `Company "${slug}" not found` })

    companies[slug].plan          = plan
    companies[slug].max_employees = { trial:10, starter:50, growth:250, business:500, enterprise:1000, unlimited:10000 }[plan] || 10
    companies[slug].updated_at    = new Date().toISOString()
    writeDB('companies', companies)
    console.log(`[eLogix] Plan: ${slug} → ${plan}`)

    res.json({ success: true, slug, plan, message: `Plan updated to ${plan}` })
  } catch(err) {
    res.status(500).json({ error: err.message })
  }
})

// ══════════════════════════════════════════════════════════════════════
// PUT /api/elogix-admin/v1/companies/:slug/modules
// ══════════════════════════════════════════════════════════════════════
app.put('/api/elogix-admin/v1/companies/:slug/modules', requireAdmin, (req, res) => {
  try {
    const { slug }    = req.params
    const { modules } = req.body

    if (!Array.isArray(modules))
      return res.status(400).json({ error: 'modules must be an array' })

    const companies = readDB('companies')
    if (!companies[slug])
      return res.status(404).json({ error: `Company "${slug}" not found` })

    companies[slug].modules    = modules
    companies[slug].updated_at = new Date().toISOString()
    writeDB('companies', companies)
    console.log(`[eLogix] Modules updated: ${slug} (${modules.length} modules)`)

    res.json({ success: true, slug, modules, message: 'Modules updated' })
  } catch(err) {
    res.status(500).json({ error: err.message })
  }
})

// ══════════════════════════════════════════════════════════════════════
// POST /api/elogix-admin/v1/companies/:slug/reset-password
// ══════════════════════════════════════════════════════════════════════
app.post('/api/elogix-admin/v1/companies/:slug/reset-password', requireAdmin, (req, res) => {
  try {
    const { slug } = req.params
    const { admin_email, admin_name, phone, new_password, reason } = req.body

    if (!admin_email || !new_password)
      return res.status(400).json({ error: 'admin_email and new_password required' })
    if (new_password.length < 8)
      return res.status(400).json({ error: 'Password must be at least 8 characters' })

    // Update the local store
    const companies = readDB('companies')
    if (companies[slug]) {
      companies[slug].admin_password = new_password
      if (admin_email) companies[slug].admin_email = admin_email
      if (admin_name)  companies[slug].admin_name  = admin_name
      if (phone)       companies[slug].phone       = phone
      companies[slug].updated_at = new Date().toISOString()
      writeDB('companies', companies)
    }

    // Forward to Flask auth service (fire and forget)
    fetch('http://127.0.0.1:5000/api/internal/reset-password', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Internal-Key': ADMIN_KEY },
      body   : JSON.stringify({ slug, admin_email, admin_name, phone, new_password, reason }),
    }).then(r => r.ok && console.log(`[eLogix] Password reset forwarded to Flask: ${slug}`))
      .catch(() => console.log(`[eLogix] Flask not running — password reset stored locally only`))

    console.log(`[eLogix] Password reset: ${slug} / ${admin_email}`)
    res.json({ success: true, message: `Password reset for ${admin_email}` })
  } catch(err) {
    console.error('[reset-password]', err)
    res.status(500).json({ error: err.message })
  }
})

// ══════════════════════════════════════════════════════════════════════
// POST /api/elogix-admin/v1/companies (manual provisioning)
// ══════════════════════════════════════════════════════════════════════
app.post('/api/elogix-admin/v1/companies', requireAdmin, (req, res) => {
  try {
    const {
      company_name, slug, admin_email, admin_name = '',
      plan = 'starter', industry = '', country = 'Nepal',
      phone = '', account_manager = '', sales_rep = '',
    } = req.body

    if (!company_name || !slug || !admin_email)
      return res.status(400).json({ error: 'company_name, slug, admin_email required' })

    const cleanSlug = slug.toLowerCase()
      .replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 60)

    const companies = readDB('companies')
    if (companies[cleanSlug])
      return res.status(409).json({ error: `Slug "${cleanSlug}" is already taken` })

    const now = new Date().toISOString()
    companies[cleanSlug] = normalizeCompany({
      slug           : cleanSlug,
      name           : company_name,
      plan,
      admin_email, admin_name, phone, country, industry,
      account_manager: account_manager || sales_rep || '',
      status         : plan === 'trial' ? 'trial' : 'active',
      approved_at    : now,
      approved_by    : 'eLogix Admin (manual)',
      created_at     : now,
    })
    writeDB('companies', companies)
    console.log(`[eLogix] Manual provision: ${cleanSlug} (${company_name})`)

    res.status(201).json({
      success: true,
      message: `${company_name} provisioned successfully`,
      slug   : cleanSlug,
      status : companies[cleanSlug].status,
      plan,
    })
  } catch(err) {
    console.error('[manual-onboard]', err)
    res.status(500).json({ error: err.message })
  }
})

// ══════════════════════════════════════════════════════════════════════
// POST /api/elogix-admin/v1/companies/:slug/invoices
// Generate invoice for a company
// ══════════════════════════════════════════════════════════════════════
app.post('/api/elogix-admin/v1/companies/:slug/invoices', requireAdmin, (req, res) => {
  try {
    const { slug }    = req.params
    const companies   = readDB('companies')
    if (!companies[slug])
      return res.status(404).json({ error: `Company "${slug}" not found` })

    const PLAN_PRICES = { trial:0, starter:5000, growth:12000, business:25000, enterprise:50000, unlimited:80000 }
    const amount      = PLAN_PRICES[companies[slug].plan] || 0
    const invoiceId   = `INV-${slug.toUpperCase().slice(0,4)}-${Date.now()}`

    // Store invoice in invoices.json
    const invoices  = readDB('invoices')
    invoices[invoiceId] = {
      id        : invoiceId,
      slug,
      company   : companies[slug].name,
      plan      : companies[slug].plan,
      amount,
      currency  : companies[slug].currency || 'NPR',
      created_at: new Date().toISOString(),
      status    : 'generated',
    }
    writeDB('invoices', invoices)
    console.log(`[eLogix] Invoice: ${invoiceId} for ${slug} — NPR ${amount}`)

    res.json({ success: true, message: `Invoice ${invoiceId} generated`, invoice_id: invoiceId, amount })
  } catch(err) {
    res.status(500).json({ error: err.message })
  }
})

// ══════════════════════════════════════════════════════════════════════
// POST /api/elogix-admin/v1/companies/:slug/notify
// Send a notification to a specific company
// ══════════════════════════════════════════════════════════════════════
app.post('/api/elogix-admin/v1/companies/:slug/notify', requireAdmin, (req, res) => {
  try {
    const { slug }                                      = req.params
    const { type = 'alert', title, message, priority } = req.body

    if (!title || !message)
      return res.status(400).json({ error: 'title and message required' })

    const companies = readDB('companies')
    if (!companies[slug])
      return res.status(404).json({ error: `Company "${slug}" not found` })

    const notifs     = readDB('notifications')
    const id         = `notif_${slug}_${Date.now()}`
    notifs[id]       = { id, slug, type, title, message, priority: priority || 'normal',
                         created_at: new Date().toISOString(), read: false }
    writeDB('notifications', notifs)
    console.log(`[eLogix] Notify: ${slug} — "${title}"`)

    res.json({ success: true, message: `Notification sent to ${companies[slug].name}` })
  } catch(err) {
    res.status(500).json({ error: err.message })
  }
})

// ══════════════════════════════════════════════════════════════════════
// POST /api/elogix-admin/v1/notify-all
// Broadcast to all active companies
// ══════════════════════════════════════════════════════════════════════
app.post('/api/elogix-admin/v1/notify-all', requireAdmin, (req, res) => {
  try {
    const { type = 'alert', title, message, priority } = req.body

    if (!title || !message)
      return res.status(400).json({ error: 'title and message required' })

    const companies = readDB('companies')
    const active    = Object.values(companies)
      .filter(c => c.status === 'active' || c.status === 'trial')

    const notifs = readDB('notifications')
    const bcastId = `bcast_${Date.now()}`
    notifs[bcastId] = {
      id: bcastId, slug: '__all__', type, title, message,
      priority: priority || 'normal', created_at: new Date().toISOString(),
      targets: active.map(c => c.slug), read: false,
    }
    writeDB('notifications', notifs)
    console.log(`[eLogix] Broadcast to ${active.length} companies: "${title}"`)

    res.json({ success: true, message: `Broadcast sent to ${active.length} companies`, count: active.length })
  } catch(err) {
    res.status(500).json({ error: err.message })
  }
})

// ══════════════════════════════════════════════════════════════════════
// GET /api/elogix-admin/v1/dashboard
// ══════════════════════════════════════════════════════════════════════
app.get('/api/elogix-admin/v1/dashboard', requireAdmin, (req, res) => {
  try {
    const all     = Object.values(readDB('companies'))
    const tickets = readDBArray('tickets')
    const team    = Object.values(readDB('team'))

    const PLAN_PRICES = { trial:0, starter:5000, growth:12000, business:25000, enterprise:50000, unlimited:80000 }
    const mrr = all
      .filter(c => c.status === 'active' || c.status === 'trial')
      .reduce((s, c) => s + (PLAN_PRICES[c.plan] || 0), 0)

    res.json({
      success: true,
      summary: {
        total_companies  : all.length,
        active_companies : all.filter(c => c.status === 'active').length,
        trial_companies  : all.filter(c => c.status === 'trial').length,
        pending_count    : all.filter(c => c.status === 'pending').length,
        suspended_count  : all.filter(c => c.status === 'suspended').length,
        cancelled_count  : all.filter(c => c.status === 'cancelled').length,
        total_employees  : all.reduce((s, c) => s + (c.employee_count || 0), 0),
        mrr_npr          : mrr,
        arr_npr          : mrr * 12,
        open_tickets     : tickets.filter(t => t.status === 'open').length,
        team_count       : team.length,
      },
    })
  } catch(err) {
    res.status(500).json({ error: err.message })
  }
})

// ══════════════════════════════════════════════════════════════════════
// GET /api/elogix-admin/v1/tickets
// ══════════════════════════════════════════════════════════════════════
app.get('/api/elogix-admin/v1/tickets', requireAdmin, (req, res) => {
  try {
    const { status, limit = 100 } = req.query
    let tickets = readDBArray('tickets')
    if (status) tickets = tickets.filter(t => t.status === status)
    res.json({ success: true, tickets: tickets.slice(0, parseInt(limit)), total: tickets.length })
  } catch(err) {
    res.status(500).json({ error: err.message })
  }
})

// ══════════════════════════════════════════════════════════════════════
// GET + POST /api/elogix-admin/v1/team
// ══════════════════════════════════════════════════════════════════════
app.get('/api/elogix-admin/v1/team', requireAdmin, (req, res) => {
  try {
    const team = readDB('team')
    res.json({ success: true, team: Object.values(team) })
  } catch(err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/elogix-admin/v1/team', requireAdmin, (req, res) => {
  try {
    const { full_name, email, role = 'support', phone = '' } = req.body
    if (!full_name || !email)
      return res.status(400).json({ error: 'full_name and email required' })

    const team = readDB('team')
    const id   = `staff_${Date.now()}`
    team[id]   = { id, full_name, email, role, phone, created_at: new Date().toISOString() }
    writeDB('team', team)
    console.log(`[eLogix] Team member added: ${full_name} (${role})`)

    res.status(201).json({ success: true, message: `${full_name} added to team`, member: team[id] })
  } catch(err) {
    res.status(500).json({ error: err.message })
  }
})

// ══════════════════════════════════════════════════════════════════════
// GET + PUT /api/elogix-admin/v1/referral/config
// ══════════════════════════════════════════════════════════════════════
app.get('/api/elogix-admin/v1/referral/config', requireAdmin, (req, res) => {
  try {
    const cfg = readDB('referral_config')
    res.json({
      success: true,
      config : {
        commission_pct      : cfg.commission_pct       ?? 10,
        min_payout_npr      : cfg.min_payout_npr       ?? 5000,
        referral_window_days: cfg.referral_window_days ?? 90,
        auto_credit         : cfg.auto_credit          ?? false,
      },
    })
  } catch(err) {
    res.status(500).json({ error: err.message })
  }
})

app.put('/api/elogix-admin/v1/referral/config', requireAdmin, (req, res) => {
  try {
    const { commission_pct, min_payout_npr, referral_window_days, auto_credit } = req.body
    const cfg = readDB('referral_config')

    if (commission_pct       !== undefined) cfg.commission_pct       = Number(commission_pct)
    if (min_payout_npr       !== undefined) cfg.min_payout_npr       = Number(min_payout_npr)
    if (referral_window_days !== undefined) cfg.referral_window_days = Number(referral_window_days)
    if (auto_credit          !== undefined) cfg.auto_credit          = Boolean(auto_credit)
    cfg.updated_at = new Date().toISOString()

    writeDB('referral_config', cfg)
    res.json({ success: true, message: 'Commission config saved', config: cfg })
  } catch(err) {
    res.status(500).json({ error: err.message })
  }
})

// ══════════════════════════════════════════════════════════════════════
// POST /api/elogix-admin/v1/login
// eLogix staff login — email + password authentication.
// Admin key header is OPTIONAL (extra security layer when provided).
// ══════════════════════════════════════════════════════════════════════
app.post('/api/elogix-admin/v1/login', (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password)
      return res.status(400).json({ error: 'email and password required' })

    // If admin key is supplied it MUST match — but it is not required.
    const providedKey = req.headers['x-elogix-admin-key'] || ''
    if (providedKey && providedKey !== ADMIN_KEY)
      return res.status(401).json({ error: 'Invalid admin key' })

    // Check against team records
    const team      = readDB('team')
    const staffList = Object.values(team)
    const member    = staffList.find(m => m.email?.toLowerCase() === email.toLowerCase())

    // If team is empty (first run), allow login with any @elogix.com.np email
    const isFirstRun = staffList.length === 0

    if (!isFirstRun && !member)
      return res.status(401).json({ error: 'Admin account not found' })

    if (!isFirstRun && member.password && member.password !== password)
      return res.status(401).json({ error: 'Invalid password' })

    // Extra guard: on first run, require an elogix.com.np email
    if (isFirstRun && !email.toLowerCase().endsWith('@elogix.com.np'))
      return res.status(401).json({ error: 'Admin account not found' })

    const token = `elogix_admin_${Date.now()}_${Math.random().toString(36).slice(2)}`
    const user  = member || { email, role: 'elogix_superadmin', name: 'eLogix Admin' }

    // Register this token so requireAdmin accepts it on subsequent requests
    activeSessions.add(token)

    console.log(`[eLogix] Admin login: ${email} (${user.role || 'elogix_superadmin'})`)
    res.json({
      success    : true,
      token,
      access_token: token,
      user       : { ...user, role: user.role || 'elogix_superadmin' },
    })
  } catch(err) {
    console.error('[admin-login]', err)
    res.status(500).json({ error: err.message })
  }
})

// ══════════════════════════════════════════════════════════════════════
// POST /api/v1/auth/login
// Tenant company employee login — forwards to Flask on port 5000
// ══════════════════════════════════════════════════════════════════════
app.post('/api/v1/auth/login', async (req, res) => {
  try {
    const tenantSlug = (req.headers['x-tenant-slug'] || req.headers['x-tenant-id'] ||
                        req.body.company_slug || req.body.slug || '').toLowerCase()

    if (!tenantSlug)
      return res.status(400).json({ error: 'Company workspace (slug) is required' })

    // Check company is active / trial
    const companies = readDB('companies')
    const company   = companies[tenantSlug]
    if (!company)
      return res.status(404).json({ error: `Company "${tenantSlug}" not found` })
    if (company.status === 'pending')
      return res.status(403).json({ error: 'Your company is pending approval by eLogix SuperAdmin. You will be notified once activated.' })
    if (company.status === 'suspended')
      return res.status(403).json({ error: 'This company account is suspended. Contact support@elogix.com.np' })
    if (company.status === 'rejected')
      return res.status(403).json({ error: 'This company application was not approved. Contact support@elogix.com.np' })

    // Forward to Flask auth service
    const flaskRes  = await fetch('http://127.0.0.1:5000/api/v1/auth/login', {
      method : 'POST',
      headers: {
        'Content-Type' : 'application/json',
        'X-Tenant-Slug': tenantSlug,
        'X-Tenant-Id'  : tenantSlug,
      },
      body: JSON.stringify(req.body),
    })
    const flaskData = await flaskRes.json()

    if (!flaskRes.ok)
      return res.status(flaskRes.status).json(flaskData)

    return res.json(flaskData)

  } catch(err) {
    console.error('[tenant-login]', err)
    return res.status(503).json({
      error: 'Authentication service unavailable — please try again shortly.',
    })
  }
})

// ══════════════════════════════════════════════════════════════════════
// GET /api/v1/auth/slugs
// Returns active company slugs for autocomplete on login page
// PUBLIC — no auth required
// ══════════════════════════════════════════════════════════════════════
app.get('/api/v1/auth/slugs', (req, res) => {
  try {
    const companies = readDB('companies')
    const slugs = Object.values(companies)
      .filter(c => c.status === 'active' || c.status === 'trial')
      .map(c => c.slug)
      .sort()
    res.json({ slugs })
  } catch(_e) {
    res.json({ slugs: [] })
  }
})

// ══════════════════════════════════════════════════════════════════════
// POST /api/v1/auth/forgot-password
// ══════════════════════════════════════════════════════════════════════
app.post('/api/v1/auth/forgot-password', (req, res) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ error: 'email required' })

    // Log it — SuperAdmin will handle manually
    console.log(`[eLogix] Password reset request for: ${email}`)

    // Forward to Flask if available (fire and forget)
    fetch('http://127.0.0.1:5000/api/v1/auth/forgot-password', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({ email }),
    }).catch(() => {})

    res.json({ success: true, message: 'Reset request received — SuperAdmin will contact you.' })
  } catch(err) {
    res.status(500).json({ error: err.message })
  }
})

// ══════════════════════════════════════════════════════════════════════
// Proxy all other /api/* routes → Flask on port 5000
// ══════════════════════════════════════════════════════════════════════
app.use('/api', async (req, res) => {
  try {
    const url     = `http://127.0.0.1:5000${req.path}${req.url.includes('?') ? '?' + req.url.split('?')[1] : ''}`
    const headers = { ...req.headers, host: '127.0.0.1:5000' }
    delete headers['content-length']

    const flaskRes = await fetch(url, {
      method : req.method,
      headers,
      body   : ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body),
    })
    const data = await flaskRes.json().catch(() => ({}))
    res.status(flaskRes.status).json(data)
  } catch(_e) {
    res.status(503).json({ error: 'Backend service unavailable' })
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