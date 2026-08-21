// FILE: src/components/dashboard/snapshots/ATSAPIIntegrationsPage.jsx
// eLogix HRMS — Multi-Platform Recruitment Integration Hub
// Per-tenant credential management: each user has their own API keys/logins
// Platforms: Career Portal, LinkedIn, Facebook, WhatsApp, Viber, Email,
//            Instagram, X/Twitter, Indeed, Glassdoor, MeroJob, Merorojgari,
//            JobAxle, Naukri, Slicejob, Internal Portal
// Auto-post jobs, import candidates, one-click sign-in after setup
// eLogix Technologies · www.elogix.com.np
import { useState, useEffect } from 'react'
import { useApp } from '../../../context/AppContext.jsx'

const A = '#0369a1'
const G = 'linear-gradient(135deg,#0c4a6e,#0369a1,#38bdf8)'

// ── ALL 19 PLATFORMS ──────────────────────────────────────────
const PLATFORMS = [
  // ── Company Portals ─────────────────────────────────────────
  {
    id:'career-portal', group:'Company Portals', name:'Company Career Portal',
    icon:'🏢', color:'#0369a1', bg:'#eff6ff',
    authType:'builtin',  // no external login needed — managed by eLogix
    fields:[
      { k:'portal_url',   l:'Career Page URL',    ph:'https://careers.yourcompany.com.np', type:'text' },
      { k:'banner_text',  l:'Welcome Banner Text', ph:'Join our amazing team!', type:'text' },
      { k:'brand_color',  l:'Brand Color (hex)',   ph:'#0369a1', type:'text' },
    ],
    caps:['Branded job listing page','SEO-optimised URLs','Apply Now form','Auto-post all published jobs','CV collection into eLogix ATS'],
    auto:['All published jobs auto-appear on career page','Applications auto-import into ATS'],
    stats:{ jobs:18, applications:234, hires:12, views:'4.2K' },
    setupUrl:'https://careers.elogix.com.np/setup',
    signInUrl:'https://careers.elogix.com.np/admin',
  },
  {
    id:'internal-portal', group:'Company Portals', name:'Internal Career Portal',
    icon:'👥', color:'#7c3aed', bg:'#f5f3ff',
    authType:'builtin',
    fields:[
      { k:'allow_referral', l:'Enable Referral Bonus', ph:'NPR 10,000 per successful hire', type:'text' },
      { k:'notify_all',     l:'Notify All Employees',  ph:'yes / no', type:'text' },
    ],
    caps:['Internal job board','Employee self-referral','Promotion & transfer postings','Notify employees by email/Viber','Track internal hires separately'],
    auto:['Auto-notify employees on new internal opening','Track referral bonus eligibility'],
    stats:{ jobs:6, applications:28, hires:5, views:'890' },
    setupUrl:'',
    signInUrl:'',
  },

  // ── Social Media ─────────────────────────────────────────────
  {
    id:'linkedin-jobs', group:'Social Media', name:'LinkedIn Jobs',
    icon:'🔗', color:'#0077b5', bg:'#eff6ff',
    authType:'oauth',
    oauthUrl:'https://www.linkedin.com/oauth/v2/authorization',
    fields:[
      { k:'access_token', l:'Access Token',    ph:'Bearer eyJ0eXAiOiJKV1Q...', type:'password' },
      { k:'org_id',       l:'Organization ID', ph:'123456789', type:'text' },
      { k:'client_id',    l:'Client ID',       ph:'77abc123def456', type:'text' },
      { k:'client_secret',l:'Client Secret',   ph:'sk_live_***', type:'password' },
    ],
    caps:['Auto-post jobs to LinkedIn','Easy Apply integration','Import candidate CVs','InMail outreach templates','Company Page sync','Sponsored job ads'],
    auto:['Auto-post on job publish','Import applications every 15 min','Notify candidates on status change'],
    stats:{ jobs:12, applications:284, hires:8, views:'12K' },
    setupUrl:'https://developer.linkedin.com',
    signInUrl:'https://www.linkedin.com/jobs/post',
  },
  {
    id:'linkedin-groups', group:'Social Media', name:'LinkedIn Groups',
    icon:'🔗', color:'#005582', bg:'#eff6ff',
    authType:'oauth',
    oauthUrl:'https://www.linkedin.com/oauth/v2/authorization',
    fields:[
      { k:'access_token', l:'Access Token',  ph:'Bearer eyJ0...', type:'password' },
      { k:'group_ids',    l:'Group IDs (comma-separated)', ph:'12345, 67890, 11111', type:'text' },
    ],
    caps:['Post to multiple LinkedIn Groups','Schedule posts','Track engagement','Auto-include apply link'],
    auto:['Auto-share new jobs to specified groups','Weekly job digest to groups'],
    stats:{ jobs:12, applications:67, hires:2, views:'3.4K' },
    setupUrl:'https://developer.linkedin.com',
    signInUrl:'https://www.linkedin.com/groups',
  },
  {
    id:'facebook-jobs', group:'Social Media', name:'Facebook Jobs',
    icon:'📘', color:'#1877f2', bg:'#eff6ff',
    authType:'oauth',
    oauthUrl:'https://www.facebook.com/dialog/oauth',
    fields:[
      { k:'page_access_token', l:'Page Access Token', ph:'EAAb***', type:'password' },
      { k:'page_id',           l:'Facebook Page ID',  ph:'1234567890', type:'text' },
      { k:'app_id',            l:'App ID',             ph:'987654321', type:'text' },
    ],
    caps:['Post to Facebook Jobs','Company page job tab','Boost/sponsored posts','Import applications','Messenger auto-reply'],
    auto:['Auto-post jobs to Facebook page','Import FB job applications into ATS'],
    stats:{ jobs:10, applications:156, hires:6, views:'8.9K' },
    setupUrl:'https://developers.facebook.com',
    signInUrl:'https://business.facebook.com/jobs',
  },
  {
    id:'facebook-groups', group:'Social Media', name:'Facebook Groups',
    icon:'📘', color:'#0862b4', bg:'#eff6ff',
    authType:'oauth',
    oauthUrl:'https://www.facebook.com/dialog/oauth',
    fields:[
      { k:'page_access_token', l:'Page Access Token', ph:'EAAb***', type:'password' },
      { k:'group_ids',         l:'Group IDs (comma-separated)', ph:'123456, 789012', type:'text' },
    ],
    caps:['Post to multiple FB Groups','Schedule group posts','Track reach','Nepal job groups auto-targeting'],
    auto:['Auto-share new jobs to all configured groups','Track group engagement'],
    stats:{ jobs:10, applications:89, hires:3, views:'5.2K' },
    setupUrl:'https://developers.facebook.com',
    signInUrl:'https://www.facebook.com/groups',
  },
  {
    id:'instagram', group:'Social Media', name:'Instagram Story/Post',
    icon:'📸', color:'#e1306c', bg:'#fdf2f8',
    authType:'oauth',
    oauthUrl:'https://api.instagram.com/oauth/authorize',
    fields:[
      { k:'access_token', l:'Access Token',      ph:'IGQVJXb...', type:'password' },
      { k:'ig_user_id',   l:'Instagram User ID', ph:'17841400', type:'text' },
      { k:'fb_page_id',   l:'Connected FB Page ID', ph:'1234567', type:'text' },
    ],
    caps:['Post job stories (24hr)','Feed post with apply link','Reel job highlights','Bio link update','DM auto-reply with job link'],
    auto:['Auto-story on new job publish','Weekly job carousel posts'],
    stats:{ jobs:8, applications:34, hires:1, views:'11K' },
    setupUrl:'https://developers.facebook.com/docs/instagram-api',
    signInUrl:'https://www.instagram.com',
  },
  {
    id:'x-twitter', group:'Social Media', name:'X (Twitter)',
    icon:'🐦', color:'#000000', bg:'#f0f0f0',
    authType:'oauth',
    oauthUrl:'https://twitter.com/i/oauth2/authorize',
    fields:[
      { k:'api_key',        l:'API Key',           ph:'Ax1b***', type:'password' },
      { k:'api_secret',     l:'API Secret',        ph:'BcDef***', type:'password' },
      { k:'access_token',   l:'Access Token',      ph:'1234567-Ab***', type:'password' },
      { k:'access_secret',  l:'Access Token Secret',ph:'XyZ***', type:'password' },
    ],
    caps:['Auto-tweet new jobs','Job thread with details','Hashtag targeting (#NepalJobs)','Candidate engagement','Twitter Ads job promotion'],
    auto:['Auto-tweet on job publish with hashtags','Daily job digest tweet'],
    stats:{ jobs:10, applications:22, hires:1, views:'6.7K' },
    setupUrl:'https://developer.twitter.com',
    signInUrl:'https://twitter.com/compose/tweet',
  },

  // ── Messaging ────────────────────────────────────────────────
  {
    id:'whatsapp', group:'Messaging', name:'WhatsApp Business',
    icon:'📘', color:'#25d366', bg:'#f0fdf4',
    authType:'apikey',
    fields:[
      { k:'phone_number_id', l:'Phone Number ID',    ph:'1234567890123', type:'text' },
      { k:'access_token',    l:'WhatsApp Access Token', ph:'EAAb***', type:'password' },
      { k:'waba_id',         l:'WhatsApp Business Account ID', ph:'987654321', type:'text' },
    ],
    caps:['Send job alerts to candidates','Application status updates','Interview reminders','Auto-reply with job details','Bulk job broadcast'],
    auto:['Auto-send job alert to opted-in candidates','Interview reminder 24 hrs before','Offer letter via WhatsApp'],
    stats:{ jobs:15, applications:45, hires:4, views:'2.1K' },
    setupUrl:'https://developers.facebook.com/docs/whatsapp',
    signInUrl:'https://business.whatsapp.com',
  },
  {
    id:'whatsapp-groups', group:'Messaging', name:'WhatsApp Groups',
    icon:'📘', color:'#128c7e', bg:'#f0fdf4',
    authType:'apikey',
    fields:[
      { k:'phone_number_id', l:'Phone Number ID',  ph:'1234567890123', type:'text' },
      { k:'access_token',    l:'Access Token',     ph:'EAAb***', type:'password' },
      { k:'group_ids',       l:'Group Chat IDs (comma-separated)', ph:'120363xxx, 120364xxx', type:'text' },
    ],
    caps:['Broadcast to WhatsApp groups','Nepal HR group targeting','Auto-format job message','Track delivery status'],
    auto:['Auto-broadcast new jobs to all groups','Weekly job digest message'],
    stats:{ jobs:15, applications:67, hires:3, views:'3.8K' },
    setupUrl:'https://developers.facebook.com/docs/whatsapp',
    signInUrl:'https://web.whatsapp.com',
  },
  {
    id:'viber', group:'Messaging', name:'Viber',
    icon:'📘', color:'#7360f2', bg:'#faf5ff',
    authType:'apikey',
    fields:[
      { k:'auth_token',  l:'Viber Bot Auth Token', ph:'Abc123***-def456***', type:'password' },
      { k:'bot_name',    l:'Bot Name',              ph:'eLogix Jobs', type:'text' },
      { k:'sender_name', l:'Sender Name',           ph:'HR Team', type:'text' },
    ],
    caps:['Send job alerts via Viber','Viber Community job posting','Rich media job cards','Keyboard quick-apply button','Broadcast to Viber subscribers'],
    auto:['Auto-send new job alerts to Viber subscribers','Interview confirmation via Viber'],
    stats:{ jobs:12, applications:38, hires:2, views:'1.9K' },
    setupUrl:'https://developers.viber.com',
    signInUrl:'https://partners.viber.com',
  },
  {
    id:'email', group:'Messaging', name:'Email (SMTP / SendGrid)',
    icon:'📧', color:'#ea4335', bg:'#fef2f2',
    authType:'smtp',
    fields:[
      { k:'smtp_host',     l:'SMTP Host',     ph:'smtp.gmail.com / smtp.sendgrid.net', type:'text' },
      { k:'smtp_port',     l:'SMTP Port',     ph:'587', type:'text' },
      { k:'smtp_user',     l:'Email Address', ph:'hr@yourcompany.com', type:'text' },
      { k:'smtp_password', l:'Password / API Key', ph:'App password or SendGrid key', type:'password' },
      { k:'from_name',     l:'From Name',     ph:'HR Team - Your Company', type:'text' },
    ],
    caps:['Job alert emails to candidates','Application confirmation auto-email','Interview invitation template','Offer letter email','Rejection email','SSF/CIT documents email'],
    auto:['Auto-confirm every application','Auto-send interview invite when scheduled','Auto-email offer letter on approval'],
    stats:{ jobs:18, applications:412, hires:18, views:'18K' },
    setupUrl:'https://sendgrid.com/docs',
    signInUrl:'',
  },

  // ── Nepal Job Portals ────────────────────────────────────────
  {
    id:'merojob', group:'Nepal Job Portals', name:'MeroJob Nepal',
    icon:'⚙️', color:'#c0392b', bg:'#fef2f2',
    desc:"Nepal's #1 job portal — largest CV database in Nepal",
    authType:'apikey',
    fields:[
      { k:'api_key',     l:'MeroJob API Key', ph:'mj_live_***', type:'password' },
      { k:'employer_id', l:'Employer ID',     ph:'emp-XXXX', type:'text' },
      { k:'username',    l:'MeroJob Username/Email', ph:'hr@company.com', type:'text' },
      { k:'password',    l:'MeroJob Password', ph:'Your MeroJob password', type:'password' },
    ],
    caps:['Post jobs to MeroJob','CV bank access','Featured listings','SMS alerts to candidates','Application tracking','Daily application digest'],
    auto:['Auto-post jobs on publish','Auto-import applications every 30 min','SMS alert to matching candidates'],
    stats:{ jobs:15, applications:89, hires:4, views:'7.3K' },
    setupUrl:'https://merojob.com/employer/register',
    signInUrl:'https://merojob.com/employer/login',
  },
  {
    id:'merorojgari', group:'Nepal Job Portals', name:'Merorojgari',
    icon:'⚙️', color:'#e67e22', bg:'#fffbeb',
    authType:'credentials',
    fields:[
      { k:'username', l:'Merorojgari Username', ph:'hr@company.com', type:'text' },
      { k:'password', l:'Merorojgari Password', ph:'Your password', type:'password' },
      { k:'emp_id',   l:'Employer ID (if any)', ph:'EMP-12345', type:'text' },
    ],
    caps:['Job posting','CV database access','Application management','Government sector reach','NGO/INGO job board'],
    auto:['Auto-post jobs','Daily application import'],
    stats:{ jobs:10, applications:45, hires:2, views:'3.1K' },
    setupUrl:'https://merorojgari.com/register',
    signInUrl:'https://merorojgari.com/login',
  },
  {
    id:'jobaxle', group:'Nepal Job Portals', name:'JobAxle Nepal',
    icon:'⚙️', color:'#27ae60', bg:'#f0fdf4',
    authType:'apikey',
    fields:[
      { k:'api_key',  l:'JobAxle API Key', ph:'ja_***', type:'password' },
      { k:'username', l:'Employer Email',  ph:'hr@company.com', type:'text' },
      { k:'password', l:'JobAxle Password',ph:'Your password', type:'password' },
    ],
    caps:['Job posting','IT talent search','Skill-based matching','Application tracking','Tech role specialisation'],
    auto:['Auto-post tech jobs','Import applications daily'],
    stats:{ jobs:8, applications:34, hires:3, views:'2.4K' },
    setupUrl:'https://jobaxle.com/employer/register',
    signInUrl:'https://jobaxle.com/employer/login',
  },
  {
    id:'slicejob', group:'Nepal Job Portals', name:'Slicejob',
    icon:'📋', color:'#8e44ad', bg:'#faf5ff',
    authType:'credentials',
    fields:[
      { k:'username', l:'Slicejob Email',   ph:'hr@company.com', type:'text' },
      { k:'password', l:'Slicejob Password',ph:'Your password', type:'password' },
    ],
    caps:['Job posting','Fresh graduate reach','Campus recruitment','Application management','Nepal & India reach'],
    auto:['Auto-post jobs','Daily application sync'],
    stats:{ jobs:6, applications:28, hires:1, views:'1.8K' },
    setupUrl:'https://slicejob.com/register',
    signInUrl:'https://slicejob.com/login',
  },

  // ── Global Job Portals ────────────────────────────────────────
  {
    id:'indeed', group:'Global Job Portals', name:'Indeed',
    icon:'🔍', color:'#2164f3', bg:'#eff6ff',
    desc:"World's #1 job site — massive reach for Nepal companies hiring globally",
    authType:'apikey',
    fields:[
      { k:'publisher_id', l:'Publisher ID', ph:'pub-1234567890abcdef', type:'text' },
      { k:'api_token',    l:'API Token',    ph:'ind_***', type:'password' },
      { k:'email',        l:'Indeed Account Email', ph:'hr@company.com', type:'text' },
    ],
    caps:['Job feed posting','Sponsored job ads','Resume search','Webhook for applications','Analytics dashboard','Employer branding'],
    auto:['Auto-post on publish','Import applications every 30 min','Sponsored promotion on high-priority roles'],
    stats:{ jobs:10, applications:196, hires:5, views:'24K' },
    setupUrl:'https://ads.indeed.com/jobroll/xmlfeed',
    signInUrl:'https://employers.indeed.com',
  },
  {
    id:'glassdoor', group:'Global Job Portals', name:'Glassdoor',
    icon:'🪟', color:'#0caa41', bg:'#f0fdf4',
    authType:'apikey',
    fields:[
      { k:'partner_id', l:'Partner ID',     ph:'123456', type:'text' },
      { k:'api_key',    l:'API Key',         ph:'gd_***', type:'password' },
      { k:'email',      l:'Glassdoor Email', ph:'hr@company.com', type:'text' },
    ],
    caps:['Job posting','Employer reviews monitoring','Company Q&A management','Salary data insights','Employer branding tools'],
    auto:['Auto-post jobs','Review alert notifications','Weekly employer brand report'],
    stats:{ jobs:8, applications:78, hires:3, views:'9.1K' },
    setupUrl:'https://www.glassdoor.com/employer/job-listing-api.htm',
    signInUrl:'https://www.glassdoor.com/employer/overview.htm',
  },
  {
    id:'naukri', group:'Global Job Portals', name:'Naukri.com',
    icon:'📋', color:'#4a90e2', bg:'#eff6ff',
    authType:'apikey',
    fields:[
      { k:'api_key',    l:'Naukri API Key', ph:'naukri_***', type:'password' },
      { k:'client_id',  l:'Client ID',      ph:'your-client-id', type:'text' },
      { k:'username',   l:'Naukri Username',ph:'hr@company.com', type:'text' },
      { k:'password',   l:'Naukri Password',ph:'Your password', type:'password' },
    ],
    caps:['Post jobs India/Nepal','Resdex CV database','Recruiter tools','Application tracking','Featured job slots','Candidate search'],
    auto:['Auto-post jobs','Resdex CV import based on keywords','Application daily sync'],
    stats:{ jobs:8, applications:142, hires:3, views:'14K' },
    setupUrl:'https://developer.naukri.com',
    signInUrl:'https://www.naukri.com/nlogin/recruiter-login',
  },
]

// ── GROUP ORDER ───────────────────────────────────────────────
const GROUP_ORDER = [
  'Company Portals',
  'Social Media',
  'Messaging',
  'Nepal Job Portals',
  'Global Job Portals',
]

const GROUP_ICONS = {
  'Company Portals':    '🏢',
  'Social Media':       '📱',
  'Messaging':          '💬',
  'Nepal Job Portals':  '🇳🇵',
  'Global Job Portals': '🌍',

// ── STORAGE HELPERS ───────────────────────────────────────────
// In production these go to backend /api/v1/integrations
// For demo we use sessionStorage keyed by user+platform
function storageKey(userId, platformId) { return `elogix_int_${userId}_${platformId}` }
function loadCreds(userId, platformId) {
  try { return JSON.parse(localStorage.getItem(storageKey(userId, platformId)) || '{}') }
  catch { return {} }
function saveCreds(userId, platformId, data) {
  try { localStorage.setItem(storageKey(userId, platformId), JSON.stringify(data)) }
  catch {}
function loadStatus(userId, platformId) {
  try { return localStorage.getItem(`${storageKey(userId, platformId)}_status`) || 'not_connected' }
  catch { return 'not_connected' }
function saveStatus(userId, platformId, status) {
  try { localStorage.setItem(`${storageKey(userId, platformId)}_status`, status) }
  catch {}

// ── STATUS BADGE ─────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = {
    connected:     { bg:'#f0fdf4', color:'#16a34a', label:'✓ Connected',    dot:'#22c55e' },
    not_connected: { bg:'#f8fafc', color:'#94a3b8', label:'Not Connected',  dot:'#cbd5e1' },
    error:         { bg:'#fef2f2', color:'#dc2626', label:'⚠ Error',        dot:'#ef4444' },
    testing:       { bg:'#fffbeb', color:'#d97706', label:'⏳ Testing...',   dot:'#f59e0b' },
  const c = cfg[status] || cfg.not_connected
  return (
    <span style={{ fontSize:9, fontWeight:700, padding:'2px 8px', borderRadius:10,
      background:c.bg, color:c.color, display:'inline-flex', alignItems:'center', gap:4, whiteSpace:'nowrap' }}>
      <span style={{ width:5, height:5, borderRadius:'50%', background:c.dot, flexShrink:0 }}/>
      {c.label}
    </span>
  )

// ── PLATFORM CARD ─────────────────────────────────────────────
function PlatformCard({ platform, userId, onToast }) {
  const stored  = loadCreds(userId, platform.id)
  const [creds, setCreds]   = useState(stored)
  const [status, setStatus] = useState(loadStatus(userId, platform.id))
  const [open, setOpen]     = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [showPwd, setShowPwd] = useState({})

  const isConnected = status === 'connected'

  const handleSave = async () => {
    setSaving(true)
    // Validate required fields
    const required = platform.fields.filter(f => !f.optional)
    const missing  = required.filter(f => !creds[f.k])
    if (missing.length && platform.authType !== 'builtin') {
      onToast(`⚠️ Please fill: ${missing.map(f=>f.l).join(', ')}`)
      setSaving(false); return
    // In production: POST /api/v1/integrations/{platform.id}/credentials
    saveCreds(userId, platform.id, creds)
    setTimeout(() => {
      setSaving(false)
      setStatus('connected')
      saveStatus(userId, platform.id, 'connected')
      onToast(`✅ ${platform.name} connected successfully!`)
    }, 800)

  const handleTest = async () => {
    setTesting(true)
    setStatus('testing')
    // In production: POST /api/v1/integrations/{platform.id}/test
    setTimeout(() => {
      setTesting(false)
      const ok = Object.values(creds).some(v=>v)
      setStatus(ok ? 'connected' : 'error')
      saveStatus(userId, platform.id, ok ? 'connected' : 'error')
      onToast(ok ? `✅ ${platform.name} connection test passed!` : `❌ ${platform.name} test failed — check credentials`)
    }, 1500)

  const handleSignIn = () => {
    if (platform.signInUrl) window.open(platform.signInUrl, '_blank')
    else onToast('✅ You are already signed in via eLogix — no external login needed.')

  const handleDisconnect = () => {
    saveCreds(userId, platform.id, {})
    saveStatus(userId, platform.id, 'not_connected')
    setCreds({}); setStatus('not_connected')
    onToast(`🔌 ${platform.name} disconnected.`)

  return (
    <div style={{ background:'#fff', borderRadius:14, overflow:'hidden',
      boxShadow:'0 2px 10px rgba(0,0,0,.06)',
      border:`2px solid ${isConnected ? platform.color+'40' : '#f1f5f9'}`,
      transition:'all .2s' }}>

      {/* Card header */}
      <div style={{ padding:'14px 16px', display:'flex', alignItems:'center', gap:12,
        background:isConnected ? `${platform.color}08` : '#fafafa',
        borderBottom:`1px solid ${isConnected ? platform.color+'20' : '#f1f5f9'}` }}>
        <div style={{ width:42, height:42, borderRadius:10, background:platform.bg,
          border:`1.5px solid ${platform.color}30`,
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>
          {platform.icon}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:800, color:'#0f172a',
            whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{platform.name}</div>
          <div style={{ fontSize:9, color:'#64748b', marginTop:1, lineHeight:1.3 }}>{platform.desc}</div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:4, alignItems:'flex-end', flexShrink:0 }}>
          <StatusBadge status={status}/>
          <button onClick={()=>setOpen(x=>!x)}
            style={{ padding:'3px 10px', borderRadius:8, border:'1px solid #e2e8f0',
              background:'#f8fafc', cursor:'pointer', fontSize:9, fontWeight:700, color:'#374151' }}>
            {open ? '▲ Collapse' : '▼ Configure'}
          </button>
        </div>
      </div>

      {/* Stats bar — only if connected */}
      {isConnected && platform.stats && (
        <div style={{ display:'flex', borderBottom:'1px solid #f1f5f9' }}>
          {[
            { l:'Jobs',  v:platform.stats.jobs },
            { l:'Leads', v:platform.stats.applications },
            { l:'Hires', v:platform.stats.hires },
            { l:'Views', v:platform.stats.views },
          ].map(s=>(
            <div key={s.l} style={{ flex:1, padding:'7px 4px', textAlign:'center', borderRight:'1px solid #f1f5f9' }}>
              <div style={{ fontSize:13, fontWeight:900, color:platform.color }}>{s.v}</div>
              <div style={{ fontSize:8, color:'#94a3b8' }}>{s.l}</div>
            </div>
          ))}
        </div>
      )}

      {/* Expanded config */}
      {open && (
        <div style={{ padding:'14px 16px' }}>
          {/* Auth type note */}
          <div style={{ fontSize:9, color:'#64748b', background:'#f8fafc', borderRadius:8,
            padding:'6px 10px', marginBottom:12, lineHeight:1.5 }}>
            {platform.authType==='builtin' && '🔒 This is built into eLogix — no external credentials needed. Configure display settings below.'}
            {platform.authType==='oauth'   && '🔐 Uses OAuth — after saving Client ID/Secret, click "Sign In" to authorize via their website.'}
            {platform.authType==='apikey'  && '🔑 Uses API key — get this from your developer/API settings on their platform.'}
            {platform.authType==='credentials' && '👤 Uses your existing account — enter your regular login email and password.'}
            {platform.authType==='smtp'    && '📧 Uses SMTP or SendGrid — enter your email server details or API key.'}
          </div>

          {/* Credential fields */}
          {platform.fields.length > 0 && (
            <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:14 }}>
              {platform.fields.map(field => (
                <div key={field.k}>
                  <label style={{ fontSize:10, fontWeight:700, color:'#374151', display:'block', marginBottom:4 }}>
                    {field.l}
                    {field.optional && <span style={{ color:'#94a3b8', fontWeight:400 }}> (optional)</span>}
                  </label>
                  <div style={{ position:'relative' }}>
                    <input
                      type={field.type==='password' && !showPwd[field.k] ? 'password' : 'text'}
                      value={creds[field.k]||''}
                      onChange={e=>setCreds(p=>({...p,[field.k]:e.target.value}))}
                      placeholder={field.ph}
                      style={{ width:'100%', padding:'8px 36px 8px 10px', borderRadius:8,
                        border:'1.5px solid #e2e8f0', fontSize:11, outline:'none',
                        fontFamily:'monospace', boxSizing:'border-box' }}
                      onFocus={e=>e.target.style.borderColor=platform.color}
                      onBlur={e=>e.target.style.borderColor='#e2e8f0'}
                    />
                    {field.type==='password' && (
                      <button onClick={()=>setShowPwd(p=>({...p,[field.k]:!p[field.k]}))}
                        style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)',
                          background:'none', border:'none', cursor:'pointer', fontSize:13, color:'#94a3b8' }}>
                        {showPwd[field.k] ? '🙈' : '👁'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Capabilities */}
          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:9, fontWeight:700, color:'#374151', marginBottom:5 }}>✅ Capabilities</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
              {platform.caps.map(c=>(
                <span key={c} style={{ fontSize:9, padding:'2px 8px', borderRadius:10,
                  background:platform.bg, color:platform.color, fontWeight:600 }}>{c}</span>
              ))}
            </div>
          </div>

          {/* Auto features */}
          <div style={{ background:'#f8fafc', borderRadius:8, padding:'8px 10px', marginBottom:14 }}>
            <div style={{ fontSize:9, fontWeight:700, color:'#374151', marginBottom:5 }}>⚡ Auto-Actions When Connected</div>
            {platform.auto.map(a=>(
              <div key={a} style={{ fontSize:9, color:'#059669', display:'flex', gap:5, marginBottom:2 }}>
                <span>→</span><span>{a}</span>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            <button onClick={handleSave} disabled={saving}
              style={{ flex:1, padding:'8px', borderRadius:9, border:'none',
                background:saving?'#94a3b8':G,
                color:'#fff', fontSize:11, fontWeight:800, cursor:saving?'default':'pointer', minWidth:80 }}>
              {saving ? '⏳ Saving...' : isConnected ? '💾 Update' : '🔗 Connect'}
            </button>
            {isConnected && (
              <>
                <button onClick={handleTest} disabled={testing}
                  style={{ padding:'8px 14px', borderRadius:9, border:'1px solid #e2e8f0',
                    background:'#f8fafc', fontSize:11, fontWeight:700, cursor:'pointer', color:'#374151' }}>
                  {testing ? '⏳' : '🧪 Test'}
                </button>
                {platform.signInUrl && (
                  <button onClick={handleSignIn}
                    style={{ padding:'8px 14px', borderRadius:9, border:`1px solid ${platform.color}40`,
                      background:platform.bg, fontSize:11, fontWeight:700,
                      cursor:'pointer', color:platform.color }}>
                    🚀 Open Portal
                  </button>
                )}
                <button onClick={handleDisconnect}
                  style={{ padding:'8px 12px', borderRadius:9, border:'1px solid #fecaca',
                    background:'#fef2f2', fontSize:11, fontWeight:700, cursor:'pointer', color:'#dc2626' }}>
                  ✕
                </button>
              </>
            )}
          </div>

          {/* Docs link */}
          {platform.docs && (
            <div style={{ marginTop:8, fontSize:9, color:'#94a3b8', textAlign:'center' }}>
              📖 <a href={platform.docs} target="_blank" rel="noopener noreferrer"
                style={{ color:'#0369a1', textDecoration:'none' }}>Developer Docs</a>
              {platform.setupUrl && <> · <a href={platform.setupUrl} target="_blank" rel="noopener noreferrer"
                style={{ color:'#0369a1', textDecoration:'none' }}>Setup Guide</a></>}
            </div>
          )}
        </div>
      )}
    </div>
  )

// ── MAIN PAGE ─────────────────────────────────────────────────
export default function ATSAPIIntegrationsPage() {
  const { currentPersona } = useApp()

  // Get current user info (per-user credential isolation)
  const userInfo = (() => {
    try {
      const u = JSON.parse(sessionStorage.getItem('elogix_user')||localStorage.getItem('elogix_user')||'{}')
      return { id: u.id||u.user_id||'demo-user', name: u.full_name||u.name||'User', role: u.role||'employee' }
    } catch { return { id:'demo-user', name:'User', role:'employee' } }
  })()

  const [activeGroup, setActiveGroup] = useState('All')
  const [search,      setSearch]      = useState('')
  const [toast,       setToast]       = useState('')
  const [connectedOnly, setConnectedOnly] = useState(false)

  const showToast = m => { setToast(m); setTimeout(()=>setToast(''), 3500) }

  // Filter platforms
  const filtered = PLATFORMS.filter(p => {
    const groupOk   = activeGroup==='All' || p.group===activeGroup
    const searchOk  = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.desc.toLowerCase().includes(search.toLowerCase())
    const statusOk  = !connectedOnly || loadStatus(userInfo.id, p.id)==='connected'
    return groupOk && searchOk && statusOk
  })

  // Count connected per group
  const connectedCount = (group) => PLATFORMS
    .filter(p=>group==='All'||p.group===group)
    .filter(p=>loadStatus(userInfo.id, p.id)==='connected').length

  const totalConnected = PLATFORMS.filter(p=>loadStatus(userInfo.id, p.id)==='connected').length

  return (
    <div style={{ fontFamily:'system-ui,sans-serif', minHeight:'100vh', background:'#f0f7ff', paddingBottom:32 }}>

      {/* Toast */}
      {toast && (
        <div style={{ position:'fixed', bottom:20, right:20, zIndex:9999,
          background:'#f0f9ff', border:'1px solid #bae6fd', borderRadius:10,
          padding:'10px 18px', fontSize:11, color:'#0c4a6e',
          boxShadow:'0 4px 16px rgba(0,0,0,.12)', fontWeight:600, maxWidth:400 }}>
          {toast}
        </div>
      )}

      {/* ── HEADER ── */}
      <div style={{ background:G, padding:'16px 24px', borderRadius:'0 0 16px 16px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
          <div>
            <div style={{ fontSize:18, fontWeight:900, color:'#fff' }}>🔗 Recruitment Integration Hub</div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,.7)', marginTop:2 }}>
              Per-user credentials · {userInfo.name} · {PLATFORMS.length} platforms · {totalConnected} connected
            </div>
          </div>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            {[
              { l:'Total Platforms', v:PLATFORMS.length, icon:'🔗' },
              { l:'Connected',       v:totalConnected,   icon:'✅' },
              { l:'Pending Setup',   v:PLATFORMS.length-totalConnected, icon:'⏳' },
            ].map(s=>(
              <div key={s.l} style={{ background:'rgba(255,255,255,.15)', borderRadius:10, padding:'8px 16px', textAlign:'center', minWidth:90 }}>
                <div style={{ fontSize:16, fontWeight:900, color:'#e0f2fe' }}>{s.icon} {s.v}</div>
                <div style={{ fontSize:8, color:'rgba(255,255,255,.65)' }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* User isolation notice */}
        <div style={{ marginTop:12, background:'rgba(255,255,255,.12)', borderRadius:10,
          padding:'8px 14px', fontSize:10, color:'rgba(255,255,255,.85)',
          display:'flex', alignItems:'center', gap:8 }}>
          🔐 <span>Your credentials are stored privately — other team members cannot see or use your API keys.
          Each user manages their own platform connections independently.</span>
        </div>
      </div>

      <div style={{ padding:'16px 20px' }}>
        {/* Search + Filter bar */}
        <div style={{ display:'flex', gap:10, marginBottom:14, flexWrap:'wrap', alignItems:'center' }}>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search platforms..."
            style={{ flex:1, minWidth:200, padding:'8px 14px', borderRadius:10,
              border:'1.5px solid #e2e8f0', fontSize:12, outline:'none' }}
            onFocus={e=>e.target.style.borderColor=A}
            onBlur={e=>e.target.style.borderColor='#e2e8f0'}/>
          <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:11,
            color:'#374151', cursor:'pointer', userSelect:'none' }}>
            <input type="checkbox" checked={connectedOnly}
              onChange={e=>setConnectedOnly(e.target.checked)} style={{ cursor:'pointer' }}/>
            Connected only
          </label>
        </div>

        {/* Group tabs */}
        <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap' }}>
          {['All', ...GROUP_ORDER].map(g=>{
            const cnt = connectedCount(g)
            const isActive = activeGroup===g
            return (
              <button key={g} onClick={()=>setActiveGroup(g)}
                style={{ padding:'7px 16px', borderRadius:20, border:'none', cursor:'pointer',
                  fontSize:11, fontWeight:700, transition:'all .15s',
                  background:isActive?A:'#fff',
                  color:isActive?'#fff':'#374151',
                  boxShadow:isActive?'0 2px 8px rgba(3,105,161,.3)':'0 1px 4px rgba(0,0,0,.06)',
                  display:'flex', alignItems:'center', gap:6 }}>
                {GROUP_ICONS[g]||'🌐'} {g==='All'?'All Platforms':g}
                {cnt>0 && (
                  <span style={{ fontSize:9, padding:'1px 6px', borderRadius:10,
                    background:isActive?'rgba(255,255,255,.25)':'#f0fdf4',
                    color:isActive?'#fff':'#16a34a', fontWeight:800 }}>
                    {cnt}✓
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Platform grid */}
        {filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:'40px', color:'#94a3b8', fontSize:13 }}>
            No platforms found for "{search}"
          </div>
        ) : (
          <>
            {/* Render by group */}
            {GROUP_ORDER.map(group => {
              const groupPlatforms = filtered.filter(p=>p.group===group)
              if (groupPlatforms.length===0) return null
              if (activeGroup!=='All' && activeGroup!==group) return null
              return (
                <div key={group} style={{ marginBottom:24 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                    <span style={{ fontSize:16 }}>{GROUP_ICONS[group]}</span>
                    <span style={{ fontSize:13, fontWeight:900, color:'#0f172a' }}>{group}</span>
                    <span style={{ fontSize:10, color:'#94a3b8', fontWeight:600 }}>
                      {groupPlatforms.length} platforms · {connectedCount(group)} connected
                    </span>
                    <div style={{ flex:1, height:1, background:'#e2e8f0', marginLeft:8 }}/>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))', gap:12 }}>
                    {groupPlatforms.map(p=>(
                      <PlatformCard
                        key={p.id}
                        platform={p}
                        userId={userInfo.id}
                        onToast={showToast}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </>
        )}

        {/* Bottom help */}
        <div style={{ background:'#fff', borderRadius:12, padding:'16px 20px',
          boxShadow:'0 2px 8px rgba(0,0,0,.06)', marginTop:16 }}>
          <div style={{ fontSize:12, fontWeight:800, color:'#374151', marginBottom:10 }}>
            💡 How Integrations Work
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:10 }}>
            {[
              { icon:'1️⃣', title:'Enter Credentials', desc:'Each user enters their own API keys or login details' },
              { icon:'2️⃣', title:'Click Connect',      desc:'eLogix securely stores and encrypts your credentials' },
              { icon:'3️⃣', title:'Auto-Posting',       desc:'New jobs auto-post to all connected platforms on publish' },
              { icon:'4️⃣', title:'Import Candidates',  desc:'Applications auto-import into ATS from all sources' },
              { icon:'5️⃣', title:'One-Click Sign In',  desc:"Click 'Open Portal' to go directly to your platform dashboard" },
              { icon:'6️⃣', title:'Private & Secure',   desc:'Your credentials are visible only to you — not other team members' },
            ].map(s=>(
              <div key={s.title} style={{ padding:'10px', background:'#f8fafc', borderRadius:9 }}>
                <div style={{ fontSize:16, marginBottom:4 }}>{s.icon}</div>
                <div style={{ fontSize:11, fontWeight:700, color:'#0f172a', marginBottom:3 }}>{s.title}</div>
                <div style={{ fontSize:9, color:'#64748b', lineHeight:1.4 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
