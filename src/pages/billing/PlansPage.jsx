// FILE: src/pages/billing/PlansPage.jsx
// eLogix HRMS — Plans & Pricing Page
// Shows all available plans with feature comparison
// eLogix Technologies · www.elogix.com.np

import { useState, useEffect } from 'react'

function _getSession(){try{return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{}}catch{return{}}}
function _authH(){const s=_getSession();const token=localStorage.getItem('access_token')||s?.token||'';const slug=s?.company?.slug||'';return{'Authorization':`Bearer ${token}`,'X-Tenant-Slug':slug,'Content-Type':'application/json'}}


const G = 'linear-gradient(135deg,#0c4a6e 0%,#0369a1 60%,#0ea5e9 100%)'
const A = '#0369a1'

function getSession() {
  try {
    const s = JSON.parse(sessionStorage.getItem('elogix_session') || localStorage.getItem('elogix_session') || 'null')
    if (s?.user) return s
    const a = JSON.parse(localStorage.getItem('access_token') || '{}')
    return { user: a.user || {}, company: a.company || {} }
  } catch(_e) { return { user:{}, company:{} } }
}

const PLANS = [
  {
    id:'trial', label:'Free Trial', color:'#0891b2',
    monthly:0, annual:0, maxEmp:10,
    desc:'Perfect for evaluating eLogix HRMS',
    badge:'14 Days Free',
    features:[
      ['Core HR & Employee Database', true],
      ['Attendance & Leave', true],
      ['Employee Self Service (ESS)', true],
      ['Payroll (Basic)', false],
      ['Recruitment / ATS', false],
      ['Performance Management', false],
      ['Training & Development', false],
      ['Reports & Analytics', false],
      ['AI Insights', false],
      ['API Access', false],
    ],
  },
  {
    id:'starter', label:'Starter', color:'#059669',
    monthly:5000, annual:54000, maxEmp:50,
    desc:'For small companies getting started',
    features:[
      ['Core HR & Employee Database', true],
      ['Attendance & Leave', true],
      ['Employee Self Service (ESS)', true],
      ['Payroll (Basic)', true],
      ['Recruitment / ATS', false],
      ['Performance Management', false],
      ['Training & Development', false],
      ['Reports & Analytics', 'Basic'],
      ['AI Insights', false],
      ['API Access', false],
    ],
  },
  {
    id:'growth', label:'Growth', color:'#7c3aed',
    monthly:12000, annual:130000, maxEmp:200,
    desc:'For growing companies with HR teams',
    popular: true,
    features:[
      ['Core HR & Employee Database', true],
      ['Attendance & Leave', true],
      ['Employee Self Service (ESS)', true],
      ['Payroll (Full)', true],
      ['Recruitment / ATS', true],
      ['Performance Management', true],
      ['Training & Development', true],
      ['Reports & Analytics', 'Advanced'],
      ['AI Insights', false],
      ['API Access', false],
    ],
  },
  {
    id:'business', label:'Business', color:'#d97706',
    monthly:25000, annual:270000, maxEmp:500,
    desc:'For mid-size organizations',
    features:[
      ['Core HR & Employee Database', true],
      ['Attendance & Leave', true],
      ['Employee Self Service (ESS)', true],
      ['Payroll (Full + Tax)', true],
      ['Recruitment / ATS', true],
      ['Performance Management', true],
      ['Training & Development', true],
      ['Reports & Analytics', 'Full'],
      ['AI Insights', 'Basic'],
      ['API Access', false],
    ],
  },
  {
    id:'enterprise', label:'Enterprise', color:'#dc2626',
    monthly:50000, annual:540000, maxEmp:'∞',
    desc:'Unlimited scale with full AI & integrations',
    features:[
      ['Core HR & Employee Database', true],
      ['Attendance & Leave', true],
      ['Employee Self Service (ESS)', true],
      ['Payroll (Full + Tax + SSF/PF)', true],
      ['Recruitment / ATS', true],
      ['Performance Management', true],
      ['Training & Development', true],
      ['Reports & Analytics', 'Full + BI'],
      ['AI Insights', 'Full'],
      ['API Access', true],
    ],
  },
]

export default function PlansPage() {

  const [company, setCompany] = useState({})
  useEffect(() => {
    const s = _getSession()
    setCompany(s?.company || {})
  }, [])
  const current  = company.plan || 'trial'
  const [yearly, setYearly]  = useState(false)
  const [toast,  setToast]   = useState('')

  const notify = m => { setToast(m); setTimeout(() => setToast(''), 3500) }

  function renderFeature(val) {
    if (val === true)  return <span style={{ color:'#16a34a', fontWeight:700 }}>✓</span>
    if (val === false) return <span style={{ color:'#d1d5db' }}>—</span>
    return <span style={{ fontSize:10, color:'#7c3aed', fontWeight:700, background:'#f3e8ff',
      padding:'2px 7px', borderRadius:10 }}>{val}</span>
  }

  return (
    <div style={{
      position:'fixed', inset:0,
      fontFamily:"'Segoe UI',system-ui,sans-serif",
      background:'#f0f9ff',
      overflowY:'scroll',
      overflowX:'hidden',
      WebkitOverflowScrolling:'touch',
      scrollbarWidth:'thin',
      scrollbarColor:'#0369a1 #dbeafe',
      zIndex:10,
    }}>

      {toast && (
        <div style={{ position:'fixed', bottom:20, right:20, zIndex:9999,
          background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:10,
          padding:'10px 18px', fontSize:12, color:'#065f46',
          boxShadow:'0 4px 16px rgba(0,0,0,.12)' }}>{toast}</div>
      )}

      {/* Header */}
      <div style={{ background:G, padding:'32px 24px 40px', color:'#fff', textAlign:'center' }}>
        <div style={{ fontSize:28, fontWeight:900, marginBottom:8 }}>📦 eLogix HRMS Plans</div>
        <div style={{ fontSize:14, opacity:.85, marginBottom:24 }}>
          Nepal Labour Act 2074 compliant · Multi-tenant · AI-powered
        </div>

        {/* Billing toggle */}
        <div style={{ display:'inline-flex', alignItems:'center', gap:12,
          background:'rgba(255,255,255,.15)', borderRadius:30, padding:'6px 16px' }}>
          <span style={{ fontSize:12, fontWeight: !yearly ? 800 : 400 }}>Monthly</span>
          <div onClick={() => setYearly(y => !y)}
            style={{ width:44, height:24, borderRadius:12, cursor:'pointer',
              background: yearly ? '#fff' : 'rgba(255,255,255,.3)',
              position:'relative', transition:'background .2s' }}>
            <div style={{
              position:'absolute', top:3, transition:'left .2s',
              left: yearly ? 22 : 3,
              width:18, height:18, borderRadius:'50%',
              background: yearly ? A : '#fff',
            }}/>
          </div>
          <span style={{ fontSize:12, fontWeight: yearly ? 800 : 400 }}>
            Annual <span style={{ background:'#fde68a', color:'#92400e',
              padding:'1px 7px', borderRadius:20, fontSize:10, fontWeight:700,
              marginLeft:4 }}>Save 10%</span>
          </span>
        </div>
      </div>

      <div style={{ padding:'32px 20px 60px', maxWidth:1200, margin:'0 auto' }}>

        {/* Plan cards */}
        <div style={{ display:'grid',
          gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',
          gap:16, marginBottom:40 }}>
          {PLANS.map(plan => (
            <div key={plan.id} style={{
              background:'#fff', borderRadius:16,
              border: plan.id===current ? `2px solid ${plan.color}` : '1.5px solid #e2e8f0',
              padding:'24px 20px', position:'relative',
              boxShadow: plan.popular ? `0 8px 24px ${plan.color}25` :
                         plan.id===current ? `0 0 0 4px ${plan.color}15` :
                         '0 2px 8px rgba(0,0,0,.05)',
              transform: plan.popular ? 'scale(1.02)' : 'scale(1)',
            }}>
              {plan.popular && (
                <div style={{ position:'absolute', top:-12, left:'50%', transform:'translateX(-50%)',
                  background:plan.color, color:'#fff', fontSize:10, fontWeight:800,
                  padding:'4px 14px', borderRadius:20, whiteSpace:'nowrap' }}>
                  ⭐ Most Popular
                </div>
              )}
              {plan.id===current && (
                <div style={{ position:'absolute', top:-12, right:12,
                  background:'#0369a1', color:'#fff', fontSize:10, fontWeight:700,
                  padding:'3px 12px', borderRadius:20 }}>Your Plan</div>
              )}
              {plan.badge && (
                <div style={{ position:'absolute', top:-12, right:12,
                  background:'#f59e0b', color:'#fff', fontSize:10, fontWeight:700,
                  padding:'3px 12px', borderRadius:20 }}>{plan.badge}</div>
              )}

              <div style={{ fontSize:18, fontWeight:900, color:plan.color, marginBottom:4 }}>
                {plan.label}
              </div>
              <div style={{ fontSize:11, color:'#64748b', marginBottom:16 }}>{plan.desc}</div>

              <div style={{ marginBottom:4 }}>
                <span style={{ fontSize:28, fontWeight:900, color:'#0f172a' }}>
                  {plan.monthly === 0 ? 'Free' : `NPR ${(yearly ? Math.round(plan.annual/12) : plan.monthly).toLocaleString()}`}
                </span>
                {plan.monthly > 0 && (
                  <span style={{ fontSize:11, color:'#94a3b8' }}>/mo</span>
                )}
              </div>
              {yearly && plan.annual > 0 && (
                <div style={{ fontSize:10, color:'#16a34a', fontWeight:700, marginBottom:12 }}>
                  NPR {plan.annual.toLocaleString()}/year (billed annually)
                </div>
              )}
              <div style={{ fontSize:11, color:'#94a3b8', marginBottom:16 }}>
                Up to <strong>{plan.maxEmp}</strong> employees
              </div>

              <div style={{ borderTop:'1px solid #f1f5f9', paddingTop:14, marginBottom:14 }}>
                {plan.features.map(([feat, val], i) => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between',
                    alignItems:'center', padding:'5px 0', fontSize:11 }}>
                    <span style={{ color: val ? '#374151' : '#94a3b8' }}>{feat}</span>
                    {renderFeature(val)}
                  </div>
                ))}
              </div>

              <button
                onClick={() => {
                  if (plan.id === current) { notify('This is your current plan'); return }
                  notify(`Contact sales@elogix.com.np to upgrade to ${plan.label}`)
                }}
                style={{ width:'100%', padding:'11px', borderRadius:10, border:'none',
                  background: plan.id===current ? '#f1f5f9' : plan.color,
                  color: plan.id===current ? '#94a3b8' : '#fff',
                  fontSize:12, fontWeight:700, cursor: plan.id===current ? 'default' : 'pointer',
                  transition:'opacity .15s' }}>
                {plan.id===current ? '✅ Current Plan' :
                 plan.id==='trial' ? 'Downgrade' : '⬆️ Upgrade'}
              </button>
            </div>
          ))}
        </div>

        {/* Feature comparison table */}
        <div style={{ background:'#fff', borderRadius:14, padding:'24px',
          boxShadow:'0 2px 10px rgba(0,0,0,.06)', overflowX:'auto' }}>
          <div style={{ fontSize:16, fontWeight:800, marginBottom:20 }}>
            📋 Full Feature Comparison
          </div>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, minWidth:700 }}>
            <thead>
              <tr style={{ background:'#f8fafc' }}>
                <th style={{ padding:'10px 14px', textAlign:'left', width:200, fontWeight:700, color:'#374151' }}>
                  Feature
                </th>
                {PLANS.map(p => (
                  <th key={p.id} style={{ padding:'10px 14px', textAlign:'center',
                    color: p.id===current ? A : '#374151', fontWeight:700,
                    borderBottom: p.id===current ? `2px solid ${A}` : '2px solid #e2e8f0' }}>
                    {p.label}
                    {p.id===current && <div style={{ fontSize:9, color:A, fontWeight:600 }}>◀ You</div>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PLANS[4].features.map(([feat], fi) => (
                <tr key={fi} style={{ borderBottom:'1px solid #f8fafc',
                  background: fi%2===0 ? '#fff' : '#fafafa' }}>
                  <td style={{ padding:'9px 14px', fontWeight:600, color:'#374151' }}>{feat}</td>
                  {PLANS.map(p => (
                    <td key={p.id} style={{ padding:'9px 14px', textAlign:'center' }}>
                      {renderFeature(p.features[fi]?.[1] ?? false)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Contact */}
        <div style={{ marginTop:24, background:'linear-gradient(135deg,#eff6ff,#dbeafe)',
          border:'1px solid #bfdbfe', borderRadius:14, padding:'20px 24px', textAlign:'center' }}>
          <div style={{ fontSize:15, fontWeight:800, color:'#1e40af', marginBottom:8 }}>
            Need a custom plan?
          </div>
          <div style={{ fontSize:12, color:'#3b82f6', marginBottom:14 }}>
            For large enterprises or custom requirements, contact our sales team.
          </div>
          <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
            <a href="mailto:sales@elogix.com.np"
              style={{ padding:'10px 20px', borderRadius:9, background:A, color:'#fff',
                fontSize:12, fontWeight:700, textDecoration:'none' }}>
              📧 sales@elogix.com.np
            </a>
            <a href="tel:+97714567890"
              style={{ padding:'10px 20px', borderRadius:9, border:`1px solid ${A}`,
                background:'#fff', color:A, fontSize:12, fontWeight:700, textDecoration:'none' }}>
              📞 +977-1-XXXXXXX
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
